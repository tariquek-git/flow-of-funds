import { Redis } from "@upstash/redis";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

/**
 * App-level daily spend ceiling — a hard kill-switch independent of per-IP rate
 * limits and of how widely the link spreads. Spend is estimated per run (see
 * cost.ts) and accumulated per UTC day; once the day's total crosses the cap,
 * the paid (heavy) capabilities refuse until the next day, while templates and
 * cheap explain turns keep working.
 *
 * Distributed store so the tally is accurate ACROSS serverless instances (the
 * whole point of a global cap), in priority order:
 *   1. Supabase RPCs (fof_spend_add / fof_spend_peek) when SUPABASE_URL + an
 *      anon/publishable key are set — the preferred global tally, atomic in
 *      Postgres. Uses the PUBLISHABLE/anon key only (no service_role secret):
 *      the RPCs are SECURITY DEFINER over an RLS-locked `fof` schema, so the
 *      anon key can call exactly these functions and touch nothing else.
 *   2. Upstash/Vercel-KV REST when those vars are set.
 *   3. Otherwise a per-instance in-memory tally (a real backstop for a
 *      low-traffic beta).
 * The Anthropic console workspace limit is still the true ceiling — this just
 * stops a runaway early and loudly. A failing distributed call degrades to the
 * next tier rather than dropping the cap.
 */

// Default for a public-but-gated beta — a runaway link is throttled to ~$25/day
// of AI spend before the heavy capabilities pause. Override with FOF_DAILY_USD_CAP
// (prod sets it to 25); the provider console workspace limit is the true ceiling.
// Kept in sync with .env.example so an unset env can't silently drop the cap.
const DEFAULT_CAP_USD = 25;

export function dailyCapUsd(): number {
  const v = Number(process.env.FOF_DAILY_USD_CAP);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_CAP_USD;
}

// The route refuses a new run once the day's remaining budget drops below this —
// reserving a small slice so near-simultaneous pre-run checks can't collectively
// overshoot the cap. A negligible fraction of a ~$25/day cap. Single source of
// truth, shared by the agent route (the gate) and /admin/status (observability).
export const CAP_HEADROOM_USD = 0.1;

function redisFromEnv(): Redis | null {
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

function dayStamp(): string {
  // UTC day — a simple, predictable reset boundary for a soft daily cap.
  return new Date().toISOString().slice(0, 10);
}
function dayKey(): string {
  return `fofbudget:${dayStamp()}`;
}

let mem = { day: "", usd: 0 };
function memToday() {
  const day = dayStamp();
  if (mem.day !== day) mem = { day, usd: 0 };
  return mem;
}

export async function getDailySpend(): Promise<number> {
  // Tier 1: Supabase distributed tally.
  if (supabaseEnabled()) {
    const v = await fofRpc<number | string>("fof_spend_peek", { p_day: dayStamp() });
    if (v !== null) {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    // null => Supabase unavailable; fall through to the next tier.
  }
  // Tier 2: Upstash/Vercel-KV.
  if (redis) {
    try {
      const v = await redis.get<number | string>(dayKey());
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    } catch {
      // fall through to in-memory
    }
  }
  // Tier 3: per-instance in-memory.
  return memToday().usd;
}

export async function addSpend(usd: number): Promise<void> {
  if (!usd || usd <= 0) return;
  // Tier 1: Supabase distributed tally (atomic upsert).
  if (supabaseEnabled()) {
    const total = await fofRpc<number | string>("fof_spend_add", {
      p_day: dayStamp(),
      p_usd: usd,
    });
    if (total !== null) return;
    // null => Supabase unavailable; fall through to the next tier. The charge
    // lands in a tier that getDailySpend() (Supabase-first) will NOT see, so the
    // authoritative daily tally silently under-counts — log loudly so the drift
    // is at least observable in the function logs.
    console.error(
      `[budget] SPEND DRIFT: Supabase spend write failed; $${usd.toFixed(4)} falls back to ${redis ? "Upstash/KV" : "per-instance memory"} and is invisible to the Supabase-first daily tally.`,
    );
  }
  // Tier 2: Upstash/Vercel-KV.
  if (redis) {
    try {
      const key = dayKey();
      await redis.incrbyfloat(key, usd);
      await redis.expire(key, 60 * 60 * 48); // auto-clear after 2 days
      return;
    } catch {
      // fall through to in-memory
    }
  }
  // Tier 3: per-instance in-memory.
  memToday().usd += usd;
}

/**
 * Dollars left under today's cap (never negative). The route refuses a run when
 * there isn't at least a small slice of budget left, rather than only at the
 * exact cap — narrowing the window where near-simultaneous runs each pass the
 * pre-run check and collectively overshoot. Costs the same single tally read as
 * the old exact-cap check.
 */
export async function capHeadroomUsd(): Promise<number> {
  return Math.max(0, dailyCapUsd() - (await getDailySpend()));
}

/** True when a cross-instance tally backs the cap (Supabase or Upstash/KV). When
 *  false, the cap + per-IP limits are per-lambda only and NOT globally enforced. */
export function sharedStoreConfigured(): boolean {
  return supabaseEnabled() || redis !== null;
}

/** Refuse paid runs when no shared store is configured, so a prod deploy can't
 *  silently fall back to a per-instance (ineffective) cap. Explicit
 *  FOF_REQUIRE_SHARED_CAP wins; otherwise Vercel live-key deploys require the
 *  shared cap by default. Fixture mode and local dev still work without a store. */
export function requireSharedStore(): boolean {
  if (process.env.FOF_REQUIRE_SHARED_CAP === "1") return true;
  if (process.env.FOF_REQUIRE_SHARED_CAP === "0") return false;
  const hasLiveKey = !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.DEEPSEEK_API_KEY
  );
  return !!process.env.VERCEL && hasLiveKey && process.env.AI_PROVIDER !== "fixture";
}

let warnedNoStore = false;
/** One-time loud warning when the cap has no cross-instance backing — the single
 *  most likely prod misconfiguration that quietly defeats the global cap. */
export function warnIfNoSharedStore(): void {
  if (warnedNoStore || sharedStoreConfigured()) return;
  warnedNoStore = true;
  console.warn(
    "[budget] No shared store (Supabase or Upstash/KV) configured: the daily $ cap and per-IP rate limits are PER-INSTANCE only and are NOT globally enforced on serverless. Set SUPABASE_URL + anon key, or UPSTASH_REDIS_REST_URL + token, in production.",
  );
}
