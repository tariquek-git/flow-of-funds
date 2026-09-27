/**
 * Server-side admin-cookie verification, shared by the admin page and the admin
 * data route. Kept separate from the tester gate so the owner-only review
 * surface is gated by its OWN secret + cookie.
 *
 * Fail-closed: if `FOF_ADMIN_SECRET` is unset, admin is DISABLED — no cookie can
 * ever be valid, so the review surface stays dark rather than open.
 */

import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken, constantTimeEqual } from "@/lib/gate";

/**
 * The admin secret exactly as EVERY consumer must use it: trimmed.
 *
 * A secret pasted into a host's env dashboard (Vercel) often carries a trailing
 * newline/space. The cookie check, /api/admin-unlock, AND the SECURITY DEFINER
 * data RPCs all compare against the CLEAN password — the RPC's stored hash is
 * `sha256(trim(password))` (see supabase/README.md). So any consumer that sends
 * the raw env value would mismatch and the RPC would silently return empty
 * (login still works, but the panel shows no data). Routing every read through
 * this one accessor keeps them in lockstep and stops that drift from recurring.
 *
 * Returns undefined when unset so callers fail closed.
 */
export function adminSecret(): string | undefined {
  return process.env.FOF_ADMIN_SECRET?.trim() || undefined;
}

/** True only when an `fof_admin` cookie matching the configured secret is
 *  present. Returns false (locked) whenever `FOF_ADMIN_SECRET` is unset. */
export async function isAdmin(): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false; // admin disabled — fail closed
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return constantTimeEqual(cookie, await adminToken(secret));
}

/** True when the admin gate is configured at all (secret present). Lets the
 *  page distinguish "wrong/no cookie" from "admin not set up on this deploy". */
export function adminConfigured(): boolean {
  return !!adminSecret();
}
