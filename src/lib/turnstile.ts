const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile bot check for /api/agent. DORMANT + FAIL-OPEN by design:
 * the feature only exists when BOTH the public site key and the server secret
 * are set. With either unset, `turnstileEnabled()` is false and the route skips
 * verification entirely — the tool behaves exactly as it did before Turnstile
 * shipped, so this code can deploy before the owner provisions keys.
 *
 * Server-safe: the secret is read from TURNSTILE_SECRET_KEY (no NEXT_PUBLIC_
 * prefix, so it is never bundled to the browser) and this module is only
 * imported by the server route.
 *
 * When enabled, a fresh single-use token (<=300s TTL) must accompany each POST
 * and is verified here BEFORE any model spend (right after the same-origin
 * guard). Re-sending a used token returns Cloudflare error `timeout-or-duplicate`.
 */
export function turnstileEnabled(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!process.env.TURNSTILE_SECRET_KEY
  );
}

/** Successful siteverify response (only the fields we read). */
type SiteverifyResult = {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
  challenge_ts?: string;
  action?: string;
};

/**
 * Verify a client token against Cloudflare siteverify.
 *
 *  - Returns { ok: true } when Turnstile is DORMANT (no-op) or the token is valid.
 *  - Returns { ok: false, reason } when enabled and the token is missing/invalid.
 *
 * NETWORK FAILURE POLICY: a *configured* Turnstile is a deliberate gate, so if
 * Cloudflare itself is unreachable we FAIL CLOSED (reject) rather than wave bot
 * traffic through onto a paid key. This is intentionally stricter than the
 * dormant fail-open above: dormant = "feature off"; enabled-but-down = "gate is
 * on, can't confirm, so deny". The existing rate limits + daily $ cap remain the
 * backstop either way. (To prefer availability on a Cloudflare outage, change
 * the catch below to `return { ok: true }`.)
 */
export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Dormant: no keys → no-op, behave exactly as today.
  if (!turnstileEnabled()) return { ok: true };

  const secret = process.env.TURNSTILE_SECRET_KEY as string;

  // Cheap rejects before spending a network round-trip on an obviously bad call.
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: "missing-token" };
  }

  // Don't let a slow/unreachable Cloudflare hang the request path.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5_000);
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, reason: `siteverify-http-${res.status}` };

    const data = (await res.json()) as SiteverifyResult;
    if (data.success) return { ok: true };
    return { ok: false, reason: (data["error-codes"] ?? ["verify-failed"]).join(",") };
  } catch {
    // Enabled but Cloudflare unreachable/timed out → fail closed (see policy above).
    return { ok: false, reason: "siteverify-unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
