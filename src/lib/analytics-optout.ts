// "Don't track this browser" — lets the owner (and any dev/test session) keep
// their own visits out of EVERY analytics sink: Vercel Web Analytics + Speed
// Insights (via beforeSend), PostHog incl. session replay (never inits), Google
// Analytics (the ga-disable kill switch), the first-party /api/event store (the
// track() bridge short-circuits), and the server conversation log (an
// `x-fof-notrack` header on the agent request).
//
// Toggle it by visiting any page with `?notrack=1` (opt out) or `?notrack=0`
// (opt back in). The choice persists per-browser in localStorage, so you set it
// once on each device/browser you use. SSR-safe — always false on the server.

export const OPTOUT_KEY = "fof-native-notrack";

export function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPTOUT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Read `?notrack` from the URL, persist the choice, strip the param from the
 * address bar, and return the resulting opt-out state. Call once on the client
 * (AnalyticsProvider). Idempotent and safe when the param is absent.
 */
export function syncOptOutFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("notrack");
    if (v === "1" || v === "true") {
      window.localStorage.setItem(OPTOUT_KEY, "1");
      console.info("[Flow of Funds] Analytics opt-out is ON for this browser.");
    } else if (v === "0" || v === "false") {
      window.localStorage.removeItem(OPTOUT_KEY);
      console.info("[Flow of Funds] Analytics opt-out is OFF for this browser.");
    }
    // Don't leave ?notrack lingering in the URL / history / share links.
    if (url.searchParams.has("notrack")) {
      url.searchParams.delete("notrack");
      const qs = url.searchParams.toString();
      window.history.replaceState(null, "", url.pathname + (qs ? `?${qs}` : "") + url.hash);
    }
  } catch {
    // ignore — URL or localStorage unavailable
  }
  return isOptedOut();
}
