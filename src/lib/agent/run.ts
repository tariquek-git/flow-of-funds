import type { AgentRequest, Emit, RunAccounting } from "./types";
import { newRunAccounting } from "./types";
import { runFixture } from "./fixture";

export type Provider = "claude" | "openai" | "fixture";
export type FallbackProvider = "deepseek";

export function activeProvider(): Provider {
  if (process.env.AI_PROVIDER === "fixture") return "fixture";
  // Belt and suspenders with the middleware's fail-closed 503: a Vercel
  // deployment without the access gate must never spend ANY key, even if a
  // request somehow reaches the route.
  if (process.env.VERCEL && !process.env.FOF_GATE_SECRET) return "fixture";
  // Explicit selection wins.
  if (process.env.AI_PROVIDER === "claude") return "claude";
  if (process.env.AI_PROVIDER === "openai") return "openai";
  // Auto-detect: OpenAI is the standing live default. Keep Claude available as
  // an explicit/provider-fallback path, but never let a stale Anthropic key win
  // over a configured OPENAI_API_KEY — that is how prod drifted back onto the
  // exhausted Anthropic workspace and showed a raw usage-limit failure.
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "claude";
  return "fixture";
}

export function activeFallbackProvider(): FallbackProvider | null {
  // Fallback is deliberately explicit: a DeepSeek key sitting in Vercel should
  // not silently change runtime behavior unless the operator opts in.
  if (activeProvider() !== "openai") return null;
  if (process.env.AI_FALLBACK_PROVIDER !== "deepseek") return null;
  if (!process.env.DEEPSEEK_API_KEY) return null;
  return "deepseek";
}

function fallbackSafeToRetry(acct: RunAccounting, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  if (activeFallbackProvider() !== "deepseek") return false;
  // Retry only before anything user-visible or chargeable streamed. This catches
  // quota/auth/outage cases that fail before the SSE body without duplicating
  // prose/ops or mixing usage from two providers in one run.
  return (
    !acct.anyOpsEmitted &&
    !acct.responseText.trim() &&
    !acct.flow &&
    acct.usage.input === 0 &&
    acct.usage.output === 0 &&
    acct.usage.cacheRead === 0 &&
    acct.usage.cacheWrite === 0
  );
}

export async function runAgent(
  req: AgentRequest,
  emit: Emit,
  signal?: AbortSignal,
  // Optional run accounting the route fills so it can record spend + log the
  // conversation even on abort/error (see RunAccounting). Defaults are no-ops
  // for callers (e.g. eval) that don't need it.
  acct?: RunAccounting,
): Promise<void> {
  // Scope guardrail: Flow of Funds is purpose-built, not a free-for-all chatbot.
  // Every path to the heavy model (generate/edit/critique) is classified first —
  // off-topic, code-execution, unrelated-task, and jailbreak prompts get a polite
  // refusal with no heavy-model spend. A FLOW-LESS explain is the one remaining
  // soft channel into the (cheap) model with no deterministic gate — the path a
  // public abuser would use as a free chat proxy — so it is classified too. An
  // explain ABOUT an on-canvas flow is grounded and skips the extra call.
  // Run accounting charges the daily cap and records spend even on abort/error.
  // Synthesized here (throwaway for eval/CLI callers that pass none) BEFORE the
  // scope block so the classifier's own light-model tokens can be threaded in and
  // counted — otherwise they were invisible to the cap.
  const runAcct = acct ?? newRunAccounting();

  if (
    req.capability === "generate" ||
    req.capability === "edit" ||
    req.capability === "critique" ||
    (req.capability === "explain" && !req.currentFlow)
  ) {
    const { classifyScope, scopeRefusal, moderateContent } = await import("./scope");
    // Scope (topic) and moderation (hateful/harassing/violent content) are
    // different concerns checked in parallel — neither adds to the other's
    // latency. Scope asks "is this about payments?"; moderation is the
    // content-safety net for a prompt that LOOKS on-topic but carries abuse
    // (this app is a public, unauthenticated API, so that net matters).
    const [verdict, moderation] = await Promise.all([
      classifyScope(req.prompt, { capability: req.capability, hasFlow: !!req.currentFlow }, runAcct),
      moderateContent(req.prompt),
    ]);
    if (!verdict.inScope || moderation.flagged) {
      const refusal = scopeRefusal();
      // Capture the refusal prose for the conversation log. The scope classifier
      // spent a few light-model tokens (now folded into runAcct by classifyScope,
      // so they DO count toward the daily cap); moderation is free, nothing to
      // fold in. Report the refusal prose honestly either way.
      if (acct) acct.responseText += refusal;
      await emit({ type: "text", delta: refusal });
      await emit({
        type: "done",
        provider: activeProvider(),
        model: runAcct.model ?? undefined,
        usage: {
          input: runAcct.usage.input,
          output: runAcct.usage.output,
          cacheRead: runAcct.usage.cacheRead,
          cacheWrite: runAcct.usage.cacheWrite,
        },
        diagnostics: {
          droppedOps: 0,
          stopReason: moderation.flagged
            ? `refused: moderation (${moderation.categories.join(", ") || "flagged"})`
            : `refused: ${verdict.reason || "out of scope"}`,
        },
      });
      return;
    }
  }

  // Lazy imports keep each provider's deps out of the bundle when unused.
  // The signal stops the upstream stream when the client goes away — a
  // stopped demo must not keep spending tokens server-side.
  switch (activeProvider()) {
    case "claude": {
      const { runClaude } = await import("./claude");
      await runClaude(req, emit, signal, runAcct);
      break;
    }
    case "openai": {
      const { runOpenAI, deepSeekConfig } = await import("./openai");
      try {
        await runOpenAI(req, emit, signal, runAcct);
      } catch (error) {
        if (!fallbackSafeToRetry(runAcct, signal)) throw error;
        await emit({ type: "status", message: "OpenAI is unavailable — trying DeepSeek fallback…" });
        await runOpenAI(req, emit, signal, runAcct, deepSeekConfig());
      }
      break;
    }
    default:
      await runFixture(req, emit);
  }
}
