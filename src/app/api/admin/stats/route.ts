import { NextRequest, NextResponse } from "next/server";
import { adminSecret, isAdmin } from "@/lib/admin";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Owner-only usage stats for the /admin dashboard.
 *
 * Auth: requires a valid `fof_admin` cookie (its OWN gate, not the tester gate);
 * 401 otherwise. This route is on the middleware public allow-list so it bypasses
 * the tester gate and MUST enforce admin itself.
 *
 * Data: one aggregate object from the SECURITY DEFINER RPC `fof_admin_stats`,
 * passing the admin secret so Postgres can read the RLS-locked `fof` tables. The
 * RPC returns `{}` on a bad/absent secret and `fofRpc` returns null when the RPC
 * is missing/errors/times out — both surface as `{ stats: null, pending: true }`
 * so the UI shows a calm empty state instead of erroring.
 *
 * Accepts optional ?since=ISO_TIMESTAMP to window the stats to a date range.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseEnabled()) {
    return NextResponse.json({ stats: null, pending: true });
  }

  const since = (req.nextUrl.searchParams.get("since") || "").trim() || null;

  const stats = await fofRpc<Record<string, unknown>>("fof_admin_stats", {
    p_secret: adminSecret(),
    p_since: since,
  });

  if (!stats || typeof stats !== "object" || Object.keys(stats).length === 0) {
    return NextResponse.json({ stats: null, pending: true });
  }

  return NextResponse.json({ stats, pending: false });
}
