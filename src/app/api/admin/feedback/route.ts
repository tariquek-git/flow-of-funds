import { NextRequest, NextResponse } from "next/server";
import { adminSecret, isAdmin } from "@/lib/admin";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

type FeedbackRow = { id: string; created_at: string; payload: unknown };

/**
 * Owner-only feedback feed for /admin. Admin-cookie gated (its OWN gate, not the
 * tester gate); 401 otherwise. Reads via the SECURITY DEFINER `fof_admin_feedback`
 * RPC. Returns `{ feedback: [], pending: true }` when the store isn't wired so the
 * UI shows a calm empty state.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  if (!supabaseEnabled()) {
    return NextResponse.json({ feedback: [], pending: true, limit, offset });
  }

  const rows = await fofRpc<FeedbackRow[]>("fof_admin_feedback", {
    p_secret: adminSecret(),
    p_limit: limit,
    p_offset: offset,
  });

  if (!Array.isArray(rows)) {
    return NextResponse.json({ feedback: [], pending: true, limit, offset });
  }

  return NextResponse.json({ feedback: rows, pending: false, limit, offset, hasMore: rows.length === limit });
}
