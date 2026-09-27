import { NextRequest, NextResponse } from "next/server";
import { runDailyAudit } from "@/lib/agent/dailyAudit";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron-triggered daily pressure test. Vercel Cron calls this once a day (see
 * vercel.json) and sends `Authorization: Bearer $CRON_SECRET` automatically
 * when a `CRON_SECRET` env var is set on the project — that's the ONLY auth
 * this route checks. Without `CRON_SECRET` set, the route stays locked (fails
 * closed, matching this app's other "unset secret → disabled" postures)
 * rather than running unauthenticated for anyone who finds the URL.
 *
 * The actual work (runDailyAudit) already no-ops cleanly if Supabase or the
 * admin secret isn't configured, so this route just needs to gate access and
 * report what happened.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyAudit();
  return NextResponse.json(result);
}
