/**
 * Coarse request geolocation for owner analytics — country / region / city only,
 * never the IP. Vercel's edge sets these headers on every request from its geo
 * database; we read them verbatim and never store (or derive a fingerprint from)
 * the IP itself. This matches the privacy page: we keep a coarse region alongside
 * the query log, but not your IP.
 *
 * Returns null when nothing usable is present (local dev, or a request that
 * didn't traverse Vercel's edge) so callers omit the field rather than store a
 * row of empty strings.
 */
export type ClientGeo = {
  country?: string; // ISO-3166-1 alpha-2, e.g. "CA"
  region?: string; // subdivision code, e.g. "ON"
  city?: string; // decoded city name, e.g. "Toronto"
};

export function clientGeo(req: Request): ClientGeo | null {
  const country = req.headers.get("x-vercel-ip-country")?.trim() || undefined;
  const region = req.headers.get("x-vercel-ip-country-region")?.trim() || undefined;
  // Vercel URL-encodes the city header (e.g. "San%20Francisco").
  const rawCity = req.headers.get("x-vercel-ip-city")?.trim();
  let city: string | undefined;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity) || undefined;
    } catch {
      city = rawCity || undefined;
    }
  }
  if (!country && !region && !city) return null;
  return { country, region, city };
}

// The regions the tool grounds flows for (see the knowledge base). Map a
// viewer's connection country to a friendly region name so the agent can default
// to it when a request doesn't name one ("looks like you're in Canada, so…").
// Returns null outside the covered set, so we never claim a region the tool
// can't actually ground.
const COVERED: Record<string, string> = {
  CA: "Canada",
  US: "the United States",
  GB: "the United Kingdom",
  IN: "India",
  BR: "Brazil",
};
const EU_SEPA = new Set([
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PT", "SK", "SI", "ES",
]);

export function regionHint(geo: ClientGeo | null): string | null {
  const c = geo?.country?.toUpperCase();
  if (!c) return null;
  if (COVERED[c]) return COVERED[c];
  if (EU_SEPA.has(c)) return "the euro area (SEPA)";
  return null;
}
