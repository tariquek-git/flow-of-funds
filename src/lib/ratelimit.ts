import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

/**
 * Rate limiting for the public API surface (unlock brute-force + agent spend).
 *
 * Three-tier by design so it protects from day one with zero infra, in priority
 * order — each tier is correct across all serverless instances down to the last:
 *  - DISTRIBUTED (Supabase): if SUPABASE_URL + an anon/publishable key are set,
 *    use an atomic fixed-window counter in Postgres via the `fof_rate_hit` RPC.
 *    Shared across every instance; the preferred global limiter.
 *  - DISTRIBUTED (Upstash/Vercel-KV): else if those REST env vars are present,
 *    use a sliding window in Redis — also correct across instances.
 *  - IN-MEMORY FALLBACK: otherwise, a per-instance fixed window. Imperfect under
 *    horizontal scale (each lambda has its own counter), but a genuine speed
 *    bump for a low-traffic beta and a safe default that needs no setup.
 *
 * If a configured distributed call throws (network blip), we degrade to the next
 * tier rather than dropping the limit entirely.
 */

export type RateResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

function redisFromEnv(): Redis | null {
  // Auto-detect a distributed store. PREFER the Upstash-native vars when present
  // (the documented setup once provisioned via the Vercel Marketplace), and fall
  // back to the Vercel-KV-integration aliases — then to in-memory if neither is
  // set. No flag to flip: dropping the env vars in switches on the real limiter.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

const redis = redisFromEnv();
const limiters = new Map<string, Ratelimit>();

function distributedLimiter(bucket: string, limit: number, windowSec: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${bucket}:${limit}:${windowSec}`;
  let rl = limiters.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `fofrl:${bucket}`,
      analytics: false,
    });
    limiters.set(cacheKey, rl);
  }
  return rl;
}

type RateHitRow = { allowed: boolean; remaining: number; reset_at: number };

/**
 * Distributed fixed-window limit via the Supabase `fof_rate_hit` RPC. Returns
 * `null` when Supabase isn't configured or the call fails, so callers fall
 * through to the next tier. Preserves the same limit/window semantics as the
 * other tiers — one token per call, keyed by `bucket:id`.
 */
async function supabaseLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult | null> {
  if (!supabaseEnabled()) return null;
  const rows = await fofRpc<RateHitRow[]>("fof_rate_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSec,
  });
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  const ok = !!row.allowed;
  return {
    ok,
    limit,
    remaining: Math.max(0, Number(row.remaining) || 0),
    retryAfterSec: ok ? 0 : Math.max(1, Math.ceil(Number(row.reset_at) - Date.now() / 1000)),
  };
}

type Bucket = { count: number; resetAt: number };
const mem = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  let b = mem.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowSec * 1000 };
    mem.set(key, b);
  }
  b.count += 1;
  if (mem.size > 5_000) {
    // Opportunistic cleanup so a long-lived warm instance can't grow unbounded.
    for (const [k, v] of mem) if (v.resetAt <= now) mem.delete(k);
  }
  const ok = b.count <= limit;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - b.count),
    retryAfterSec: ok ? 0 : Math.ceil((b.resetAt - now) / 1000),
  };
}

/**
 * Consume one token for `id` (typically a client IP) in `bucket`.
 * Returns `{ ok: false, retryAfterSec }` when the window is exhausted.
 */
export async function rateLimit(
  bucket: string,
  id: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const key = `${bucket}:${id}`;

  // Tier 1: Supabase distributed counter (preferred global limiter).
  const sb = await supabaseLimit(key, limit, windowSec);
  if (sb) return sb;

  // Tier 2: Upstash/Vercel-KV sliding window.
  const rl = distributedLimiter(bucket, limit, windowSec);
  if (rl) {
    try {
      const r = await rl.limit(id);
      return {
        ok: r.success,
        limit: r.limit,
        remaining: r.remaining,
        retryAfterSec: r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
      };
    } catch {
      // Upstash unreachable — fall through to in-memory rather than fail-open.
    }
  }

  // Tier 3: per-instance in-memory fixed window.
  return memoryLimit(key, limit, windowSec);
}

/**
 * Best-effort client IP for keying per-IP limits — hardened against
 * X-Forwarded-For spoofing.
 *
 * The classic mistake is trusting the LEFTMOST X-Forwarded-For entry. That field
 * is appended to by each proxy, so the leftmost value is fully client-controlled:
 * an attacker can send `X-Forwarded-For: 1.2.3.4` to forge a fresh "IP" per
 * request and sail past per-IP rate limits and the unlock brute-force gate.
 *
 * Trust only what the platform edge sets:
 *  1. `x-vercel-forwarded-for` — Vercel's own, set by the edge and not
 *     overwritable by the client; the correct source on this deployment.
 *  2. `x-real-ip` — Vercel also sets this to the connecting peer.
 *  3. As a last resort, the RIGHTMOST `x-forwarded-for` entry — the hop nearest
 *     our trusted proxy, rather than the leftmost client-supplied one. Still
 *     spoof-resistant on a single-proxy edge like Vercel.
 *
 * Returns "unknown" if nothing usable is present — callers then share one bucket,
 * which fails safe (over-limits) rather than open.
 */
export function clientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    // Rightmost = nearest the trusted edge; never the leftmost client value.
    const rightmost = parts[parts.length - 1];
    if (rightmost) return rightmost;
  }
  return "unknown";
}
