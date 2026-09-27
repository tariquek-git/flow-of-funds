"use client";

/**
 * Client-side Turnstile glue. DORMANT: every export is a no-op when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so the widget never loads and
 * getTurnstileToken() resolves to null (the server is also dormant in that
 * case, so a null token is fine). Uses the "managed" widget TYPE (chosen in the
 * Cloudflare dashboard) for invisible-to-most-humans behavior.
 *
 * The widget is mounted ONCE at a stable, always-present location (Studio.tsx's
 * always-rendered <main>), NOT inside a conditionally-rendered component — so a
 * token is available for the very first message of a session (including the
 * landing ?q= handoff) and every message after.
 */

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const turnstileClientEnabled = !!TURNSTILE_SITE_KEY;

// Minimal shape of the global injected by api.js. We only touch what we use.
type TurnstileApi = {
  render: (
    container: string | HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      retry?: "auto" | "never";
      theme?: "auto" | "light" | "dark";
    },
  ) => string;
  getResponse: (widgetId: string) => string | undefined;
  isExpired: (widgetId: string) => boolean;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    // api.js calls this onload hook once the global is ready.
    __fofTurnstileOnload?: () => void;
  }
}

let widgetId: string | null = null;
let lastToken: string | null = null;

/** Called by the widget's render callback (and re-render on reset). */
function onToken(token: string) {
  lastToken = token;
}

/**
 * Mount the managed widget once. Safe to call from a useEffect; idempotent.
 * No-op when dormant or when api.js hasn't injected window.turnstile yet (the
 * onload hook will retry). Renders an invisible managed widget into `el`.
 */
export function mountTurnstile(el: HTMLElement): void {
  if (!turnstileClientEnabled) return;
  if (widgetId) return;
  const t = window.turnstile;
  if (!t) {
    // api.js not ready yet — let the onload hook drive the first mount.
    window.__fofTurnstileOnload = () => mountTurnstile(el);
    return;
  }
  widgetId = t.render(el, {
    sitekey: TURNSTILE_SITE_KEY as string,
    appearance: "interaction-only", // invisible unless a challenge is needed
    retry: "auto",
    callback: onToken,
    "expired-callback": () => {
      lastToken = null;
    },
    "error-callback": () => {
      lastToken = null;
    },
  });
}

/**
 * Tear the widget down and clear module state. Call from the mount effect's
 * cleanup so a later remount renders a FRESH widget instead of holding a stale
 * widgetId whose DOM node was removed (which would make getTurnstileToken()
 * operate on a dead widget and return null).
 */
export function unmountTurnstile(): void {
  const t = window.turnstile;
  if (t && widgetId) {
    try {
      t.remove(widgetId);
    } catch {
      // already gone — nothing to remove
    }
  }
  widgetId = null;
  lastToken = null;
}

/**
 * Resolve a FRESH single-use token for one /api/agent submit.
 *  - Dormant → null (server is dormant too; route skips verification).
 *  - Enabled → returns a current (non-expired) token, refreshing it first.
 * Tokens are single-use, so we reset() the widget after handing one out to
 * force a brand-new token for the next message. Bounded wait so a never-arriving
 * token can't hang Send forever (the server will 403 on a null token, which the
 * UI surfaces as a calm "refresh and retry").
 */
export async function getTurnstileToken(): Promise<string | null> {
  if (!turnstileClientEnabled) return null;
  const t = window.turnstile;
  if (!t || !widgetId) return null;

  // If the held token is stale/used/expired, force a fresh challenge.
  if (!lastToken || t.isExpired(widgetId)) {
    lastToken = null;
    t.reset(widgetId); // triggers a new managed challenge → callback sets lastToken
  }

  // Wait briefly for the callback to deliver a token (managed mode is usually
  // instant for humans). Poll up to ~4s.
  const deadline = Date.now() + 4_000;
  while (!lastToken && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
    // Some flows expose the token via getResponse before the callback fires.
    const current = t.getResponse(widgetId);
    if (current) lastToken = current;
  }

  const token = lastToken;
  // Consume it: single-use, so reset so the NEXT message gets its own token.
  lastToken = null;
  if (token) t.reset(widgetId);
  return token;
}
