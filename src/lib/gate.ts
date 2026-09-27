/**
 * Access gate primitives, shared by the edge middleware and the unlock route.
 * The deployed app fronts a paid Anthropic key, so every page and API call
 * requires a cookie proving the shared secret was entered once at /unlock.
 *
 * Cookie value = hex(HMAC-SHA256(secret, TAG)): deterministic, so the edge
 * middleware can verify it statelessly, and rotating FOF_GATE_SECRET
 * invalidates every issued cookie at once. Web Crypto only — must stay
 * edge-runtime safe.
 */

export const GATE_COOKIE = "fof_gate";
const TAG = "fof-native-unlock-v1";

/**
 * Owner-only admin gate. Deliberately SEPARATE from the tester gate above:
 *  - its own cookie (`fof_admin`) so an admin session is distinct from a tester
 *    session and neither one grants the other,
 *  - its own HMAC tag so a `fof_gate` token can never be replayed as a valid
 *    `fof_admin` token (different domain-separation string ⇒ different digest),
 *  - keyed off `FOF_ADMIN_SECRET`, not `FOF_GATE_SECRET`.
 * The admin gate protects the conversation-review surface, which exposes logged
 * prompts/replies — a higher bar than the tester passphrase.
 */
export const ADMIN_COOKIE = "fof_admin";
const ADMIN_TAG = "fof-native-admin-v1";

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function gateToken(secret: string): Promise<string> {
  return hmacHex(secret, TAG);
}

/** Admin cookie token — same construction as `gateToken` but a distinct tag, so
 *  the two token spaces never overlap and one cookie can't authenticate as the
 *  other. */
export function adminToken(secret: string): Promise<string> {
  return hmacHex(secret, ADMIN_TAG);
}

export function constantTimeEqual(a: string, b: string): boolean {
  // Compare full length even on mismatch — no early exit for timing.
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
