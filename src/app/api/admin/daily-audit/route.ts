import { NextResponse } from "next/server";
import { adminSecret, isAdmin } from "@/lib/admin";
import { fofRpc } from "@/lib/supabase";

export const runtime = "nodejs";

/** One row from fof.daily_audits — either a run summary or a flagged finding
 *  (see src/lib/agent/dailyAudit.ts for the payload shapes). */
type AuditRow = { id: string; created_at: string; payload: Record<string, unknown> };

/**
 * Owner-only feed for the /admin "Daily Audit" tab. Same auth + calm-pending
 * posture as the other admin routes: 401 without a valid admin cookie, and a
 * `{ audits: [], pending: true }` empty state (not an error) when the backing
 * RPC/store isn't ready yet — the cron job may simply not have run yet on a
 * fresh deploy.
 */
export async function GET(): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await fofRpc<AuditRow[]>("fof_admin_daily_audits", {
    p_secret: adminSecret(),
    p_limit: 200,
  });

  if (!Array.isArray(rows)) {
    return NextResponse.json({ audits: [], pending: true });
  }

  return NextResponse.json({ audits: rows, pending: false });
}
