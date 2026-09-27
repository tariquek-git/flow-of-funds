import { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Feedback sink. Behind the gate (middleware covers /api/* except unlock),
 * rate-limited, and logged as one structured line per submission so it's
 * greppable in the Vercel runtime logs (`evt":"feedback"`). For owner review we
 * capture the FULL context: the note, sentiment, the flow snapshot, the session
 * id, AND the generation prompt that produced the flow — so each item is
 * reviewable on its own ("what they asked → what they got → what they said"). No
 * name/email/account is requested; everything is length-capped. The in-app copy
 * already tells users their last prompt is sent as context.
 *
 * Durable storage: when Supabase is configured we also persist each entry via
 * the `fof_feedback_add` RPC (the same length-capped payload). The console.log
 * line is kept as a backup sink so feedback is never lost if the DB write fails
 * or Supabase isn't set.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const rl = await rateLimit("feedback", clientIp(req), 5, 300); // 5 / 5 min
  if (!rl.ok) {
    return Response.json(
      { error: "Thanks. You've sent a few already. Try again in a little while." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max).trim() : "");
  const message = str(body.message, 2000);
  if (!message) return Response.json({ error: "Feedback can't be empty" }, { status: 400 });

  // The diagram the feedback is about, stored so /admin can show exactly what the
  // visitor was looking at — even when no conversation row exists for it. Derived,
  // illustrative data (no PII); size-guarded so a payload can't be abused to bloat
  // the store. Anything malformed or oversized degrades to null, never throws.
  const flowSnapshot = (v: unknown): unknown => {
    if (!v || typeof v !== "object") return null;
    try {
      return JSON.stringify(v).length <= 40000 ? v : null;
    } catch {
      return null;
    }
  };

  const entry = {
    evt: "feedback",
    at: new Date().toISOString(),
    sentiment: str(body.sentiment, 20) || null, // "wrong" | "confusing" | "love" | ...
    message,
    flowTitle: str(body.flowTitle, 200) || null,
    flowId: str(body.flowId, 100) || null,
    // Join key to the conversation log so feedback ↔ a session's runs can be
    // cross-linked in /admin (see fof.conversations.payload.sessionId).
    sessionId: str(body.sessionId, 100) || null,
    // The exact diagram snapshot (the "what is happening where" link).
    flow: flowSnapshot(body.flow),
    // The generation prompt that produced this flow — stored so the owner has
    // the full "what they asked" context when reviewing the feedback.
    lastPrompt: str(body.lastPrompt, 2000) || null,
    detail: str(body.detail, 20) || null,
    path: str(body.path, 300) || null,
  };
  console.log(JSON.stringify(entry)); // backup sink — always written

  // Durable storage (best-effort): persist the same length-capped entry. Awaited
  // so the write is durable before we return — serverless can freeze right after
  // the response, so fire-and-forget would risk dropping it. fofRpc never throws
  // and is timeout-capped (~2.5s); the console.log above is the backstop.
  if (supabaseEnabled()) {
    await fofRpc("fof_feedback_add", { p_payload: entry });
  }

  return Response.json({ ok: true });
}
