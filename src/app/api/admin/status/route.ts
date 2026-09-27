import { NextResponse } from "next/server";
import { adminConfigured, adminSecret, isAdmin } from "@/lib/admin";
import { activeFallbackProvider, activeProvider } from "@/lib/agent/run";
import {
  CAP_HEADROOM_USD,
  dailyCapUsd,
  getDailySpend,
  requireSharedStore,
  sharedStoreConfigured,
} from "@/lib/budget";
import { deepSeekLowBalanceUsd, deepSeekSpendCapUsd, getDeepSeekBalance } from "@/lib/deepseekBalance";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Owner-only system + cost status for the /admin portal. Admin-cookie gated; 401
 * otherwise. Surfaces the operational picture the owner cares about: which
 * provider/models are live, which distributed stores + the access gate are wired,
 * today's AI spend against the daily kill-switch cap, whether that cap is globally
 * enforced (a shared store is wired, not a per-instance tally), and whether live
 * generation is being refused right now (headroom exhausted or shared-store missing).
 *
 * Read-only and side-effect-free. getDailySpend() reads the same distributed
 * tally the spend cap enforces, so the number here is the real one.
 */
export async function GET(): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Single-source the store check through budget.sharedStoreConfigured() — the
  // SAME predicate the agent route gates on — so this dashboard can't disagree
  // with the gate (raw env presence would report a store as wired even if the
  // Upstash client failed to construct, masking a per-instance cap).
  const hasSharedStore = sharedStoreConfigured();
  const store = supabaseEnabled() ? "supabase" : hasSharedStore ? "upstash" : "in-memory";

  const cap = dailyCapUsd();
  let spendToday = 0;
  try {
    spendToday = await getDailySpend();
  } catch {
    // tally unavailable — report 0 rather than failing the status read
  }
  const pctOfCap = cap > 0 ? Math.min(100, Math.round((spendToday / cap) * 100)) : 0;
  const headroomUsd = Math.max(0, cap - spendToday);
  // Whether the cap + per-IP limits are enforced ACROSS instances. Without a shared
  // store they degrade to a per-lambda tally, so the "global" cap is soft — this is
  // the single most important thing to verify for the public deploy.
  const capGloballyEnforced = hasSharedStore;
  const mustHaveSharedStore = requireSharedStore();
  // The real gate the agent route applies: refuse once headroom hits the reserve,
  // or (opt-in) when a shared store is required but missing.
  const refusing = headroomUsd <= CAP_HEADROOM_USD || (mustHaveSharedStore && !capGloballyEnforced);

  // Report the models for the ACTIVE provider. OpenAI is the default live path,
  // but Claude can still be forced with AI_PROVIDER=claude. Defaults mirror
  // claude.ts/openai.ts (single-sourcing them is the eng-6/agent-core-4 follow-up).
  const provider = activeProvider();
  const fallbackProvider = activeFallbackProvider();
  const modelHeavy =
    provider === "claude"
      ? (process.env.AI_MODEL ?? "claude-opus-4-8")
      : provider === "openai"
        ? (process.env.OPENAI_MODEL ?? "gpt-4o")
        : null;
  const modelLight =
    provider === "claude"
      ? (process.env.AI_MODEL_LIGHT ?? "claude-haiku-4-5")
      : provider === "openai"
        ? (process.env.OPENAI_MODEL_LIGHT ?? "gpt-4o-mini")
        : null;
  const fallbackModelHeavy = fallbackProvider === "deepseek" ? (process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro") : null;
  const fallbackModelLight = fallbackProvider === "deepseek" ? (process.env.DEEPSEEK_MODEL_LIGHT ?? "deepseek-v4-flash") : null;
  const deepSeekBalance = await getDeepSeekBalance();

  // Loud guard for the silent failure that blanked this panel before: the admin
  // DATA routes gate on sha256(FOF_ADMIN_SECRET) matching fof.admin_config.
  // secret_sha256. If those diverge, every panel returns empty with NO signal.
  // fof_admin_stats returns {} ONLY on a secret mismatch (a correct secret returns
  // a populated object even with zero rows), so we can distinguish "out of sync"
  // from "no data". null = can't tell (no Supabase, or a transient RPC error) —
  // we never raise a false alarm.
  //
  // `p_since` is always passed (even as null) even though this probe doesn't
  // window anything: Postgres/PostgREST has two live `fof_admin_stats` overloads
  // (the original 1-arg signature and the 2-arg date-range one added later), and
  // a call naming only `p_secret` is ambiguous between them — PostgREST can't
  // pick a "best candidate" once a default parameter is in play, so it 400s and
  // `fofRpc` swallows that as `null`, making this guard permanently report
  // "can't tell" even when the secret IS in sync. Naming `p_since` explicitly
  // pins the call to the 2-arg overload, same as the /admin/stats route already
  // does, and resolves the ambiguity.
  let dataSecretInSync: boolean | null = null;
  if (supabaseEnabled() && adminSecret()) {
    const probe = await fofRpc<Record<string, unknown>>("fof_admin_stats", {
      p_secret: adminSecret(),
      p_since: null,
    });
    if (probe && typeof probe === "object") dataSecretInSync = Object.keys(probe).length > 0;
  }

  return NextResponse.json({
    provider,
    fallbackProvider,
    modelHeavy,
    modelLight,
    fallbackModelHeavy,
    fallbackModelLight,
    hasAiKey: !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.OPENAI_API_KEY ||
      process.env.DEEPSEEK_API_KEY
    ),
    hasGate: !!process.env.FOF_GATE_SECRET,
    // Trim via adminConfigured()/adminSecret() so this matches the gate exactly:
    // a pasted env value that is only whitespace would make the raw env check
    // report admin as configured while isAdmin() (trimmed) keeps it disabled.
    hasAdmin: adminConfigured(),
    store, // "supabase" | "upstash" | "in-memory"
    capGloballyEnforced, // false => cap is per-instance only; set a shared store
    requireSharedStore: mustHaveSharedStore, // opt-in hard refuse when no shared store
    dailyCapUsd: cap,
    spendTodayUsd: spendToday,
    headroomUsd, // dollars left under the cap before the route refuses
    pctOfCap,
    overCap: spendToday >= cap, // literally at/over the cap
    refusing, // the route's actual decision: is live generation blocked right now?
    deepSeekSpendCapUsd: deepSeekSpendCapUsd(),
    deepSeekLowBalanceUsd: deepSeekLowBalanceUsd(),
    deepSeekBalance,
    dataSecretInSync, // false => the panels will read empty; re-seed the stored hash
  });
}
