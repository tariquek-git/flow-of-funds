import { validateFlow } from "../schema/validate";
import { fofRpc, supabaseEnabled } from "../supabase";
import { adminSecret } from "../admin";
import { openaiLightModel } from "./models";

/**
 * Daily pressure-test: re-checks the last 24h of real, successful generations
 * (fof.conversations) against two things a live user never sees checked —
 * schema validity and payments-mechanics accuracy — and logs anything worth
 * a look to fof.daily_audits for the /admin "Daily Audit" tab.
 *
 * Two tiers, cheapest first:
 *   1. Schema validation (validateFlow) — free, deterministic. Catches
 *      structurally broken flows (dangling refs, missing required fields).
 *   2. AI critique — one light-model call per flow that PASSED schema,
 *      checking the same things the app's own interactive "Critique flow"
 *      capability looks for (missing settlement legs, money routed through a
 *      scheme node instead of bank-to-bank, vague/wrong rails, unrealistic
 *      timing, missing exception paths) — but as a structured CLEAN/FLAGGED
 *      verdict instead of open-ended prose, so results can be counted and
 *      skimmed. A dedicated prompt (not the interactive one) uses the light
 *      model; any provider failure is counted as unknown, never as CLEAN.
 *
 * Triggered by Vercel Cron (see src/app/api/cron/daily-audit/route.ts). Reuses
 * the admin secret to read via fof_admin_list (server-side env var, not a
 * request cookie) and writes findings through fof_log_daily_audit, an
 * anon-executable insert-only RPC (same posture as fof_log_query/
 * fof_log_event — no secret needed for a pure log write).
 */

type ConversationRow = {
  id: string;
  created_at: string;
  payload?: { flow?: unknown; capability?: string; prompt?: string };
};

const AUDIT_SYSTEM = `You are a payments-accuracy auditor for Flow of Funds. You will be shown a flow-of-funds diagram (JSON) generated for a real user. Check it against real payments mechanics: missing parties or legs (especially settlement), vague or wrong rail names, currency/jurisdiction mismatches, unrealistic timing, mislabeled roles (e.g. a fintech described as issuer or deposit-holder), a settlement/money leg routed THROUGH a card scheme or network node instead of bank-to-bank, interchange drawn as a separate transfer instead of netted within settlement, and a clearly-missing exception path (refund/chargeback) for a flow that obviously needs one.

Be conservative — only flag a CLEAR, SPECIFIC problem a payments professional would catch on sight, never a stylistic preference or something merely simplified for readability.

Reply with EXACTLY one line:
"CLEAN" — no real issues, or
"FLAGGED: <the specific issue, under 20 words>"`;

export type AuditCritique = {
  completed: boolean;
  flagged: boolean;
  reason: string;
};

export function parseAuditCritique(text: string): AuditCritique {
  const value = text.trim();
  if (/^clean$/i.test(value)) return { completed: true, flagged: false, reason: "" };
  if (!/^flagged:/i.test(value)) return { completed: false, flagged: false, reason: "" };
  const reason = value.replace(/^flagged:?\s*/i, "").slice(0, 200);
  if (!reason) return { completed: false, flagged: false, reason: "" };
  return { completed: true, flagged: true, reason };
}

async function critiqueFlow(
  flow: unknown,
): Promise<AuditCritique> {
  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) return { completed: false, flagged: false, reason: "" };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: openaiLightModel(),
        max_tokens: 80,
        temperature: 0,
        messages: [
          { role: "system", content: AUDIT_SYSTEM },
          { role: "user", content: JSON.stringify(flow).slice(0, 12000) },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { completed: false, flagged: false, reason: "" };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseAuditCritique(json.choices?.[0]?.message?.content ?? "");
  } catch {
    return { completed: false, flagged: false, reason: "" };
  }
}

export type DailyAuditResult = {
  ran: boolean;
  checked: number;
  schemaFailures: number;
  flagged: number;
  /** Valid flows whose lightweight model critique did not complete. A failed
   *  critique is unknown, not a clean payments-mechanics verdict. */
  critiqueErrors: number;
  /** True only when the final summary row was accepted by Supabase. */
  summaryPersisted: boolean;
  /** True when the run stopped early because it was approaching the cron
   *  route's maxDuration, before checking every eligible conversation. */
  truncated?: boolean;
  /** How many conversations were eligible for this run, vs. `checked` which
   *  is how many actually got processed before a truncation (if any). */
  totalEligible?: number;
};

// The cron route (src/app/api/cron/daily-audit/route.ts) sets maxDuration =
// 120s. Each row can cost up to critiqueFlow's 15s AI-call timeout plus a
// fofRpc write, so a full 200-row run can exceed that budget on any day with
// meaningfully more successful generations than the API route's timeout can
// serially get through — a Vercel timeout mid-loop would previously kill the
// run before the summary row was written, and the /admin panel would then
// silently show a stale older run with no indication anything was cut short.
// Stop with enough margin left for the current row's in-flight write plus the
// final summary write, rather than let the platform kill the whole invocation.
const TIME_BUDGET_MS = 95_000;

export async function runDailyAudit(): Promise<DailyAuditResult> {
  const unavailable = {
    ran: false,
    checked: 0,
    schemaFailures: 0,
    flagged: 0,
    critiqueErrors: 0,
    summaryPersisted: false,
  } satisfies DailyAuditResult;

  if (!supabaseEnabled()) return unavailable;
  const secret = adminSecret();
  if (!secret) return unavailable;

  const rows = await fofRpc<ConversationRow[]>(
    "fof_admin_list",
    { p_secret: secret, p_limit: 200, p_offset: 0, p_outcome: "success" },
    8000,
  );
  if (!Array.isArray(rows)) return unavailable;

  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = rows.filter(
    (r) => new Date(r.created_at).getTime() >= since && r.payload?.flow != null,
  );

  const date = new Date().toISOString().slice(0, 10);
  const startedAt = Date.now();
  let schemaFailures = 0;
  let flagged = 0;
  let critiqueErrors = 0;
  let checked = 0;
  let truncated = false;

  for (const row of recent) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      truncated = true;
      break;
    }
    checked++;
    const schemaResult = validateFlow(row.payload!.flow);
    if (!schemaResult.ok) {
      schemaFailures++;
      await fofRpc("fof_log_daily_audit", {
        p_payload: {
          kind: "finding",
          checkKind: "schema",
          date,
          conversationId: row.id,
          reason: schemaResult.errors.slice(0, 3).join("; ").slice(0, 300),
          prompt: (row.payload?.prompt ?? "").slice(0, 200),
        },
      }).catch(() => null);
      continue;
    }
    const critique = await critiqueFlow(schemaResult.flow);
    if (!critique.completed) {
      critiqueErrors++;
      continue;
    }
    if (critique.flagged) {
      flagged++;
      await fofRpc("fof_log_daily_audit", {
        p_payload: {
          kind: "finding",
          checkKind: "critique",
          date,
          conversationId: row.id,
          reason: critique.reason,
          prompt: (row.payload?.prompt ?? "").slice(0, 200),
          flowTitle:
            (schemaResult.flow as { metadata?: { title?: string } })?.metadata?.title ?? null,
        },
      }).catch(() => null);
    }
  }

  const summaryId = await fofRpc<unknown>("fof_log_daily_audit", {
    p_payload: {
      kind: "summary",
      date,
      checked,
      schemaFailures,
      flagged,
      critiqueErrors,
      truncated,
      totalEligible: recent.length,
    },
  });
  const summaryPersisted = summaryId !== null;

  return {
    ran: summaryPersisted,
    checked,
    schemaFailures,
    flagged,
    critiqueErrors,
    summaryPersisted,
    truncated,
    totalEligible: recent.length,
  };
}
