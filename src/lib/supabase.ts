/**
 * Server-only Supabase RPC client for the distributed store.
 *
 * Why this exists: the rate limit and daily spend cap MUST be shared across all
 * serverless instances, otherwise the real ceiling on Vercel is N× the intended
 * value (one counter per warm lambda). This module talks to a small set of
 * SECURITY DEFINER RPCs in the user's Supabase project — the ONLY surface that
 * touches the underlying `fof` schema (which is RLS-locked with no policies, so
 * the anon key can reach it through these functions and nothing else).
 *
 * Least privilege: we use the PUBLISHABLE / anon key, never the service_role
 * secret. The anon key is safe to ship to the server — it can call exactly the
 * `public.fof_*` RPCs (EXECUTE-granted to anon; see supabase/migrations) and
 * read/write nothing else.
 *
 * No dependency: we POST to PostgREST's `/rest/v1/rpc/<fn>` directly with fetch
 * rather than pull in @supabase/supabase-js (a heavy client we'd use for one
 * narrow call path). Callers stay lazy — config is read per-call so dropping the
 * env vars in turns the tier on with no rebuild, mirroring the Upstash branch.
 */

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  // Accept either the modern publishable key name or the legacy anon name.
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** True when a distributed Supabase backend is configured. */
export function supabaseEnabled(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Call a `public.fof_*` RPC and return its parsed JSON result, or `null` if
 * Supabase isn't configured or the call fails. Callers MUST treat `null` as
 * "backend unavailable" and fall through to the next tier — this never throws,
 * so a Supabase blip degrades gracefully rather than failing the request.
 *
 * Timeout-guarded so a hung network call can't stall an API route.
 */
export async function fofRpc<T>(
  fn: string,
  args: Record<string, unknown>,
  timeoutMs = 2500,
): Promise<T | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify(args),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    // RPCs returning a scalar come back as a bare JSON value; SETOF/TABLE RPCs
    // come back as a JSON array of rows. Callers normalize per RPC.
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
