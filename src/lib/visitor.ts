/**
 * Best-effort visitor classification for owner analytics: which organization a
 * request came from, and whether it looks like a bot/crawler. Resolve-then-discard
 * by design — the IP is read transiently to call the lookup provider and is never
 * stored, matching the privacy page's "no IP address stored" promise. Everything
 * here is fail-open: a missing token, a timeout, or a lookup error all just yield
 * `null`/`false` rather than throwing, since visitor classification must never
 * break logging or the response path.
 */

export type VisitorInfo = {
  /** Resolved organization/ISP name for the request IP, e.g. "Royal Bank of
   *  Canada" or "Rogers Communications" — null if unresolved or the token isn't
   *  configured. Never the IP itself. */
  org: string | null;
  /** ASN, e.g. "AS812" — same null rules as `org`. */
  asn: string | null;
  isBot: boolean;
};

// Deliberately conservative: known crawler/monitoring/scripting UAs, not every
// possible automation signature. False negatives (a bot slips through unflagged)
// are fine — a human just sees it as an extra row. False positives (a real
// visitor flagged as a bot) are worse, since that's the thing being filtered out.
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|phantomjs|curl\/|wget\/|python-requests|python-urllib|go-http-client|axios\/|node-fetch|postmanruntime|vercel-favicon|uptimerobot|pingdom|monitor/i;

export function isBotUA(ua: string | null): boolean {
  if (!ua) return true; // a real browser always sends one; a bare script often doesn't
  return BOT_UA.test(ua);
}

export function isBotRequest(req: Request): boolean {
  return isBotUA(req.headers.get("user-agent"));
}

// IPinfo free tier is generous for this volume but still a network call on
// someone else's uptime — bounded hard so a slow/dead lookup can never stall a
// request. 800ms comfortably covers IPinfo's typical response time.
const LOOKUP_TIMEOUT_MS = 800;

const PRIVATE_IP = /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|127\.|::1$|fc00:|fe80:)/;

export async function resolveVisitorOrg(ip: string): Promise<{ org: string | null; asn: string | null }> {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === "unknown" || PRIVATE_IP.test(ip)) return { org: null, asn: null };

  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return { org: null, asn: null };
    const data = (await res.json()) as { org?: string };
    // IPinfo's `org` field is "AS812 Rogers Communications Canada Inc." — split
    // off the ASN prefix so callers get both pieces separately.
    const raw = typeof data.org === "string" ? data.org.trim() : "";
    const match = raw.match(/^(AS\d+)\s+(.*)$/);
    if (match) return { asn: match[1], org: match[2] || null };
    return { org: raw || null, asn: null };
  } catch {
    return { org: null, asn: null };
  }
}
