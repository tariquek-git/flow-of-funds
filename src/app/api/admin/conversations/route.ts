import { NextRequest, NextResponse } from "next/server";
import { adminSecret, isAdmin } from "@/lib/admin";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

/** One stored conversation row, as returned by the `fof_admin_list` RPC. */
type ConversationRow = {
  id: string;
  created_at: string;
  payload: unknown;
};

/**
 * Owner-only conversation feed for the /admin review UI.
 *
 * Auth: requires a valid `fof_admin` cookie (its OWN gate, not the tester gate).
 * 401 otherwise — this route is on the middleware public allow-list so it bypasses
 * the tester gate, and MUST enforce admin itself.
 *
 * Data: reads recent rows via the SECURITY DEFINER RPC `fof_admin_list`, passing
 * the admin secret so Postgres can authorize the read against the RLS-locked
 * `fof.conversations` table (the anon key alone can't see it). The RPC does not
 * exist yet — until the orchestrator creates it, `fofRpc` returns null and we
 * report a calm `{ conversations: [], pending: true }` instead of erroring.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clamp pagination — limit 1..200 (default 50), offset >= 0.
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  // Optional outcome filter (e.g. ?outcome=error,refused for the "what's failing"
  // view). Whitelist values so only known outcomes ever reach the RPC.
  const OUTCOMES = new Set(["success", "error", "refused", "aborted"]);
  const outcomeList = (sp.get("outcome") || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OUTCOMES.has(s));
  const outcome = outcomeList.length ? outcomeList.join(",") : null;

  // Optional session cross-link (?session=…): return that ONE session's full run
  // history instead of the paginated global feed. Powers the feedback → "view
  // this session's runs" deep-link.
  const session = (sp.get("session") || "").trim() || null;

  // No store wired up at all → pending (not an error). The UI shows the calm
  // "connecting to the store" empty state.
  if (!supabaseEnabled()) {
    return NextResponse.json({ conversations: [], pending: true, limit, offset });
  }

  // Session mode uses the dedicated SECURITY DEFINER RPC (server-side filter,
  // unbounded by the global window); otherwise the paginated feed. Both gate on
  // the admin secret inside Postgres.
  const rows = session
    ? await fofRpc<ConversationRow[]>("fof_admin_session_list", {
        p_secret: adminSecret(),
        p_session: session,
        p_limit: 500,
      })
    : await fofRpc<ConversationRow[]>("fof_admin_list", {
        p_secret: adminSecret(),
        p_limit: limit,
        p_offset: offset,
        p_outcome: outcome,
      });

  // fofRpc returns null when the RPC is missing / errors / times out, and the
  // RPC itself returns a JSON array. Treat null OR non-array as "store not ready
  // yet" rather than a hard failure.
  if (!Array.isArray(rows)) {
    return NextResponse.json({ conversations: [], pending: true, limit, offset });
  }

  return NextResponse.json({
    conversations: rows,
    pending: false,
    limit,
    offset,
    // Session mode returns the complete set; the global feed paginates.
    hasMore: session ? false : rows.length === limit,
  });
}
