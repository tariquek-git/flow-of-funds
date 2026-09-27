import { NextRequest, NextResponse } from "next/server";
import { adminSecret, isAdmin } from "@/lib/admin";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Owner-only interaction-event (clicks) aggregate for /admin. Admin-cookie gated;
 * 401 otherwise. Reads via the SECURITY DEFINER `fof_admin_events` RPC (totals,
 * by-event counts, recent). `{ stats: null, pending: true }` when not wired.
 *
 * Accepts optional ?since=ISO_TIMESTAMP and ?event=EVENT_NAME filters.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseEnabled()) {
    return NextResponse.json({ stats: null, pending: true });
  }

  const since = (req.nextUrl.searchParams.get("since") || "").trim() || null;
  const eventFilter = (req.nextUrl.searchParams.get("event") || "").trim() || null;

  const stats = await fofRpc<Record<string, unknown>>("fof_admin_events", {
    p_secret: adminSecret(),
    p_since: since,
    p_event: eventFilter,
  });

  if (!stats || typeof stats !== "object" || Object.keys(stats).length === 0) {
    return NextResponse.json({ stats: null, pending: true });
  }

  return NextResponse.json({ stats, pending: false });
}
