import { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { clientGeo } from "@/lib/geo";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { isBotRequest, resolveVisitorOrg } from "@/lib/visitor";

export const runtime = "nodejs";

/**
 * Content-free interaction events (clicks) for owner analytics — mirrors the
 * named PostHog/GA events into our own store so they show in /admin. NO AI spend
 * (just a tiny DB insert), so it's on the middleware public allow-list and can
 * fire from any page. Hardened anyway:
 *  - per-IP rate limit (these write to the DB),
 *  - an explicit event-name allow-list (no arbitrary event spam),
 *  - props coerced to a small flat, content-free object (never raw prompt text).
 */
// Derived from the single analytics-events source so this allow-list can't drift
// from what the client actually sends (it had — funnel events were being 400'd).
const ALLOWED_EVENTS = new Set<string>(ANALYTICS_EVENTS);

export async function POST(req: NextRequest): Promise<Response> {
  // Events are tiny but still write to the DB — cap per IP so a loop can't flood.
  const ip = clientIp(req);
  const rl = await rateLimit("event", ip, 120, 60); // 120 / min
  if (!rl.ok) return Response.json({ ok: false }, { status: 429 });

  // No store configured → accept-and-drop so the client never sees an error.
  if (!supabaseEnabled()) return Response.json({ ok: true });

  let body: { event?: unknown; props?: unknown; sessionId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (!ALLOWED_EVENTS.has(event)) return Response.json({ ok: false }, { status: 400 });

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.length <= 100 ? body.sessionId : null;

  // Props: small, flat, content-free. Strings capped hard so nothing resembling
  // a prompt can ride in. Cap key count too.
  const props: Record<string, string | number | boolean> = {};
  if (body.props && typeof body.props === "object") {
    let n = 0;
    for (const [k, v] of Object.entries(body.props as Record<string, unknown>)) {
      if (n++ >= 12) break;
      const key = k.slice(0, 40);
      if (typeof v === "string") props[key] = v.slice(0, 80);
      else if (typeof v === "number" || typeof v === "boolean") props[key] = v;
    }
  }

  const geo = clientGeo(req);
  // Resolve-then-discard: the IP is used only to ask the lookup provider which
  // org it belongs to, then dropped — never stored (see /privacy). Skipped for
  // bots so they don't burn lookup-provider quota.
  const isBot = isBotRequest(req);
  const { org, asn } = isBot ? { org: null, asn: null } : await resolveVisitorOrg(ip);
  const visitor = { org, asn, isBot };
  // Awaited (not in any stream path) so the write is durable before we return.
  await fofRpc("fof_log_event", {
    p_payload: { event, props, sessionId, geo, visitor, ts: new Date().toISOString() },
  });

  return Response.json({ ok: true });
}
