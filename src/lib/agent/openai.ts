import { validateFlow } from "@/lib/schema/validate";
import { normalizeFlowStructure } from "@/lib/schema/normalize";
import { normalizeFlowRails } from "./rails";
import { buildViewEvent } from "./view";
import { truncationCaveat } from "./caveat";
import {
  openaiHeavyModel,
  openaiLightModel,
  deepseekHeavyModel,
  deepseekLightModel,
} from "./models";
import { applyOp, emptyFlow, parseOp, type FlowOp } from "@/lib/schema/ops";
import type { FlowOfFunds } from "@/lib/schema/flow";
import { FLOW_TOOLS } from "./tools";
import { SYSTEM_PROMPT, buildRepairTurn, buildUserTurn } from "./prompt";
import type { AgentRequest, Emit, RunAccounting } from "./types";

/**
 * OpenAI provider — the sole live AI provider.
 *
 * Speaks OpenAI /chat/completions with function calling. Although the adapter
 * is written against the OpenAI wire format (so it also works with any
 * OpenAI-compatible vendor by pointing OPENAI_BASE_URL at it — DeepSeek,
 * OpenRouter, Groq, Ollama, vLLM…), the product runs on OpenAI. The model is
 * env-configured: both the live/dev config (.env.local) and the code default
 * (when OPENAI_MODEL / OPENAI_MODEL_LIGHT are unset) are gpt-4.1-mini for BOTH
 * tiers. It is a NON-reasoning model (no hidden reasoning tokens, no
 * reasoning_effort) — which is what the MAX_ROUNDS / MAX_COMPLETION_TOKENS sizing
 * below is tuned for; gpt-5 / o-series reasoning models are the secondary "if you
 * swap" case (and a 2026-07 smoke found gpt-5-mini regresses on this tuned loop).
 *
 * Model tiering — "use AI efficiently", not the flagship for everything:
 *   - HEAVY (OPENAI_MODEL; default gpt-4.1-mini) builds/edits.
 *   - LIGHT (OPENAI_MODEL_LIGHT; default gpt-4.1-mini) handles explain/critique
 *     prose (cheap text over context already in hand) and the scope classifier
 *     (see scope.ts). Both overridable via env without code changes.
 *
 * Assembly: it runs an agentic loop like the Claude path — the model emits a
 * batch of tool calls (function calls), we apply them to the canvas as they
 * finalize, ack them as tool results, and let it continue until the flow is
 * complete (or MAX_ROUNDS). The system/KB prefix is sent FIRST and kept byte
 * stable across rounds so OpenAI's automatic prompt caching serves it at the
 * discounted cached-input rate on every round after the first. Intro prose
 * streams live; ops finalize per round (the OpenAI stream has no clean
 * per-tool-call boundary mid-message, so a round's ops apply at its end —
 * acceptable, and the funny wait copy covers the gap).
 */

export type OpenAICompatProvider = "openai" | "deepseek";

export type OpenAICompatConfig = {
  provider: OpenAICompatProvider;
  baseUrl: string;
  apiKey: string;
  heavyModel: string;
  lightModel: string;
  reasoningEffort: string;
  maxTokenField: "max_completion_tokens" | "max_tokens";
};

const cleanBaseUrl = (url: string) => url.replace(/\/+$/, "");

export function openAIConfig(): OpenAICompatConfig {
  return {
    provider: "openai",
    baseUrl: cleanBaseUrl(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
    apiKey: process.env.OPENAI_API_KEY ?? "",
    heavyModel: openaiHeavyModel(),
    lightModel: openaiLightModel(),
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT ?? "low",
    maxTokenField: "max_completion_tokens",
  };
}

export function deepSeekConfig(): OpenAICompatConfig {
  return {
    provider: "deepseek",
    baseUrl: cleanBaseUrl(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"),
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    // DeepSeek Pro is the intended fallback for build/edit/critique quality;
    // Flash handles explain/scope-like cheap prose if a fallback explain is used.
    heavyModel: deepseekHeavyModel(),
    lightModel: deepseekLightModel(),
    reasoningEffort: process.env.DEEPSEEK_REASONING_EFFORT ?? "low",
    // DeepSeek's OpenAI-compatible examples/documentation use max_tokens.
    maxTokenField: "max_tokens",
  };
}
const MAX_HISTORY_TURNS = 8;
// Agentic build budget: the model emits a batch of ops, we ack, it continues.
// The prompt drives the build into a fixed ~3-turn shape (parties → edges →
// suggest_followups + set_view, then stop), and the loop reinforces it: each ack
// reports progress, the penultimate round injects a "finish now" nudge, and a
// no-progress round breaks early. A full flow lands in ~3 rounds.
//
// Why 14 for the LIVE/default model (gpt-4.1-mini, NON-reasoning): it emits ops
// with no hidden reasoning and
// usually converge well under the cap, exiting early via the no-progress break.
// But the OpenAI stream only finalizes a round's tool calls at message end, so a
// genuinely big flow (Canada EFT/ACSS, mortgage PAD, cross-border card) can still
// spread its ops across many rounds; 14 is comfortable headroom so a large flow
// reaches a clean stop instead of being guillotined mid-build and falsely flagged
// "incomplete" (it was 9, which clipped a normal Canadian PAD/mortgage flow).
//
// Secondary — if OPENAI_MODEL is a REASONING model (gpt-5 full / o-series):
// those deliberate per round and emit even fewer ops/round (~3), so they need
// the MOST rounds. The two caps below are model-aware for exactly this reason:
// the tuned NON-reasoning default (gpt-4.1-mini) emits fat batches and converges
// in ~3 rounds, so an 8-round cap with an EARLY finish deadline forces it to
// batch instead of dribbling (production data showed real generations spending
// far more rounds than needed); a reasoning model keeps the old 14-round
// headroom so a complex flow still completes on it. The daily spend cap +
// per-IP rate limits stay the real backstop against a runaway.
const MAX_ROUNDS_TUNED = 8; // gpt-4.1-mini and other non-reasoning models
const MAX_ROUNDS_REASONING = 14; // gpt-5 / o-series
// Per-round output cap. For the live/default NON-reasoning models (gpt-4.1-mini,
// gpt-4o) it only needs to be big enough that a fat node/edge batch is never
// truncated to finish_reason "length" (which CUT_SHORT_STOPS would then veto);
// 20k is ample for a round of tool-call JSON. It uses the `max_completion_tokens`
// field (NOT `max_tokens`) because the gpt-5 / o-series family rejects max_tokens
// with a 400; gpt-4o / gpt-4.1 accept max_completion_tokens too, so it's set
// unconditionally.
// Secondary — on a gpt-5 / o-series reasoning model this same cap ALSO bounds the
// hidden reasoning tokens per round; 20k leaves headroom for reasoning + the
// batch. The high cap is free on non-reasoning models (you only pay for tokens
// actually used).
const MAX_COMPLETION_TOKENS = 20000;
// Reasoning depth for providers/models that accept reasoning_effort. "low" is
// the tuned default (fast, and accurate enough for this heavily-structured task).
// Dialable per provider via env, no deploy. Ignored by models that reject
// reasoning_effort (gated on the model/provider at the call site).

/** Stop reasons that mean the output was cut off, not finished. */
const CUT_SHORT_STOPS = new Set(["length", "content_filter"]);

type ToolDef = { name: string; description?: string; input_schema: unknown };
// Translate our Anthropic-format tool defs to OpenAI function-calling shape
// once. We deliberately omit `strict` — our schemas mark some fields optional,
// which OpenAI strict mode forbids; parseOp (Zod) is the validation backstop.
const OPENAI_TOOLS = (FLOW_TOOLS as unknown as ToolDef[]).map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.input_schema },
}));

type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

// OpenAI chat message shapes we build across the agentic loop. Loosely typed —
// the wire accepts these and our request body is JSON.stringified.
type ChatMsg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export function fallbackTitleFromPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.?!]+$/g, "")
    .trim();
  if (!cleaned) return "Flow of funds";
  const capped = cleaned.length > 80 ? `${cleaned.slice(0, 77).trim()}…` : cleaned;
  return capped
    .split(" ")
    .map((word) => {
      if (/^(ach|rtp|eft|sepa|upi|pix|swift|fx|fbo|usdc|cad|usd|eur|gbp|inr|brl)$/i.test(word)) {
        return word.toUpperCase();
      }
      if (/^(to|with|via|and|or|for|from|of|the|a|an)$/i.test(word)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function fillFallbackMetadata(flow: FlowOfFunds, req: AgentRequest): FlowOfFunds {
  const title = flow.metadata.title?.trim();
  if (title && !/^untitled flow$/i.test(title)) return flow;
  return {
    ...flow,
    metadata: {
      ...flow.metadata,
      title: fallbackTitleFromPrompt(req.prompt),
    },
  };
}

export async function runOpenAI(
  req: AgentRequest,
  emit: Emit,
  signal: AbortSignal | undefined,
  // Run accounting shared with the route so spend + the conversation log capture
  // whatever was consumed even if this throws or is aborted mid-stream (RED-1).
  // REQUIRED so the type system forces every caller to pass it (sec-1/cost-1).
  acct: RunAccounting,
  config: OpenAICompatConfig = openAIConfig(),
): Promise<void> {
  const usesTools = req.capability === "generate" || req.capability === "edit";
  // Model tiering: generate/edit build structured diagrams and use HEAVY.
  // Explain/critique are prose-only over context already in hand, so LIGHT is
  // enough and avoids paying flagship rates for advisory text.
  const model = req.capability === "explain" || req.capability === "critique" ? config.lightModel : config.heavyModel;
  // Record the model on the shared accounting up front so the route can price
  // consumed tokens (and log the run) even if the very first request throws.
  acct.model = model;

  // Model-aware loop sizing (see MAX_ROUNDS_* above). A reasoning model gets the
  // headroom; the tuned non-reasoning default gets the tight cap + an early
  // finish deadline so it batches instead of dribbling toward the ceiling. Same
  // family test the reasoning_effort gate uses.
  const isReasoningModel = /^(gpt-5|o[0-9])/i.test(model);
  const maxRounds = isReasoningModel ? MAX_ROUNDS_REASONING : MAX_ROUNDS_TUNED;
  // How many rounds from the end the hard "emit everything now" deadline fires.
  // Tuned path: 3 (fires ~round 4 of 8) — the single highest-leverage lever, it
  // stops the model dribbling one op per round. Reasoning path: 2 (near the old
  // behavior, since it genuinely needs the rounds to emit its ops).
  const finishDeadlineRoundsLeft = isReasoningModel ? 2 : 3;

  let draft: FlowOfFunds =
    req.capability === "generate" || !req.currentFlow
      ? emptyFlow(`flow-${Date.now().toString(36)}`)
      : structuredClone(req.currentFlow);

  // See claude.ts: history forwarded only for explain; the heavy paths drop it to
  // close the unclassified-channel bypass of the scope gate.
  const history =
    req.capability === "explain"
      ? req.history.slice(-MAX_HISTORY_TURNS).map((t) => ({
          role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: t.text,
        }))
      : [];

  // Alias the required shared accounting usage object so every token tally below
  // is visible to the route's finally — that's what lets spend record on
  // abort/error, not just on the clean `done` event (RED-1).
  const usage: Usage = acct.usage;
  const diagnostics = { droppedOps: 0, stopReason: null as string | null };
  // One-shot guard so "Drawing the flow…" fires on the first op of the run.
  let announcedDrawing = false;
  // Across agentic rounds the model emits a fresh prose segment each round; with
  // no break, round N's text jams onto round N-1's ("…lanes first.I've mapped…").
  // Track the last streamed prose char so a new round's first chunk gets a gap.
  let lastProseChar = "";

  // Streams one model turn over the supplied conversation. Applies any ops it
  // emits to the canvas and returns them PLUS the raw tool_calls + assistant
  // text, so the caller can ack them and continue the agentic loop. The
  // system/KB prefix is always messages[0] and byte-stable, so OpenAI's
  // automatic prompt caching serves it discounted on every round after the first.
  const runStream = async (messages: ChatMsg[], toolChoice: "auto" | "none") => {
    const ops: FlowOp[] = [];
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages,
        // Bound output (and, on gpt-5, hidden reasoning) per round. NOTE: this is
        // the gpt-5-family field name; do NOT use `max_tokens`, which that family
        // rejects with a 400. gpt-4o accepts it too, so it's set unconditionally.
        [config.maxTokenField]: MAX_COMPLETION_TOKENS,
        // Push reasoning models to emit tool calls sooner and cheaper instead of
        // deliberating silently — directly counters the dribble/round-exhaustion.
        // ONLY sent to gpt-5 / o-series: non-reasoning models (gpt-4.1, gpt-4o)
        // REJECT reasoning_effort with a 400, so gate it on the model family —
        // this keeps the code safe whichever model OPENAI_MODEL points at.
        ...(usesTools && /^(gpt-5|o[0-9])/i.test(model) ? { reasoning_effort: config.reasoningEffort } : {}),
        ...(usesTools && config.provider === "deepseek" ? { reasoning_effort: config.reasoningEffort } : {}),
        ...(usesTools ? { tools: OPENAI_TOOLS, tool_choice: toolChoice } : {}),
      }),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAI-compatible request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // Tool-call argument fragments accumulate per index across the stream. The
    // id arrives on the first fragment per index — kept so we can emit matching
    // tool_result messages to continue the agentic loop.
    const calls = new Map<number, { id: string; name: string; args: string }>();
    // Assistant prose for this turn — replayed back into the conversation so a
    // subsequent round has the model's own reasoning/intro in context.
    let assistantText = "";

    // Reasoning models (o-series, deepseek-reasoner) stream silently while
    // thinking — heartbeat on wall clock so the client watchdog doesn't kill
    // a healthy run.
    let lastActivity = Date.now();
    const heartbeat = setInterval(() => {
      if (Date.now() - lastActivity > 10_000) {
        lastActivity = Date.now();
        void emit({ type: "status", message: "Working — composing the flow…" });
      }
    }, 5_000);

    // Incremental op emit: flush each op the MOMENT its tool_call arguments
    // finish decoding mid-stream, instead of waiting for the round-end finalize.
    // The first party node then paints a few seconds into the stream rather than
    // after the entire first round (the blank-canvas wait that makes users bail).
    // Same parseOp/applyOp/validation — only emitted sooner. The round-end
    // finalize skips indices already flushed here, and still owns set_view, the
    // tool_result acks, and any late/invalid calls.
    const emitted = new Set<number>();
    const flushOp = async (idx: number) => {
      if (emitted.has(idx)) return;
      const c = calls.get(idx);
      // set_view is a view control, not a flow op — leave it to the finalize.
      if (!c || !c.name || c.name === "set_view" || !c.args.trim()) return;
      let input: unknown;
      try {
        // Throws until the argument JSON is complete; that's the "op is ready"
        // signal (a partial object never parses).
        input = JSON.parse(c.args);
      } catch {
        return;
      }
      const op = parseOp(c.name, input);
      // Invalid op: don't mark emitted — the finalize counts it as dropped once.
      if (!op) return;
      emitted.add(idx);
      if (!announcedDrawing) {
        announcedDrawing = true;
        void emit({ type: "status", message: "Drawing the flow…" });
      }
      ops.push(op);
      draft = applyOp(draft, op);
      acct.anyOpsEmitted = true;
      lastActivity = Date.now();
      await emit({ type: "op", op });
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let chunk: {
            choices?: { delta?: { content?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
          };
          try {
            chunk = JSON.parse(data);
          } catch {
            continue;
          }
          if (chunk.usage) {
            usage.input += chunk.usage.prompt_tokens ?? 0;
            usage.output += chunk.usage.completion_tokens ?? 0;
            usage.cacheRead += chunk.usage.prompt_tokens_details?.cached_tokens ?? 0;
          }
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta ?? {};
          if (typeof delta.content === "string" && delta.content) {
            lastActivity = Date.now();
            // This round's first prose chunk, following a prior round's prose that
            // didn't end in whitespace → inject a paragraph break so commentary and
            // summary don't run together. Mirror it to acct so the log matches.
            if (assistantText === "" && lastProseChar && !/\s/.test(lastProseChar)) {
              acct.responseText += "\n\n";
              await emit({ type: "text", delta: "\n\n" });
            }
            assistantText += delta.content;
            // Capture prose for the conversation log as it streams, so a run that
            // errors/aborts mid-prose still logs what the user saw.
            acct.responseText += delta.content;
            await emit({ type: "text", delta: delta.content });
            lastProseChar = delta.content.slice(-1);
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!calls.has(idx)) calls.set(idx, { id: "", name: "", args: "" });
              const c = calls.get(idx)!;
              if (tc.id) c.id = tc.id;
              if (tc.function?.name) c.name = tc.function.name;
              if (tc.function?.arguments) c.args += tc.function.arguments;
              await flushOp(idx);
            }
          }
          if (choice.finish_reason) diagnostics.stopReason = choice.finish_reason;
        }
      }
    } finally {
      clearInterval(heartbeat);
    }

    // Finalize accumulated tool calls in narrative (index) order. Each valid
    // op applies to the canvas; every call (valid or not) still needs a matching
    // tool_result message or the next round's request is malformed, so we track
    // ids separately from ops.
    const orderedCalls: ToolCall[] = [];
    for (const idx of [...calls.keys()].sort((a, b) => a - b)) {
      const c = calls.get(idx)!;
      // OpenAI requires a non-empty id on every tool_call we echo back.
      const id = c.id || `call_${idx}`;
      orderedCalls.push({ id, type: "function", function: { name: c.name, arguments: c.args } });
      // set_view is a VIEW control, not a flow op: it changes what the canvas
      // shows (detail dial + legend focus) without touching the diagram. Emit a
      // `view` event and skip the op path entirely — it must NOT count as a
      // dropped op, push to `ops`, or trigger "Drawing the flow…". It still needs
      // its matching tool_result (orderedCalls push above) to keep the loop valid.
      if (c.name === "set_view") {
        await emit(buildViewEvent(c.args));
        continue;
      }
      // Already flushed mid-stream by flushOp — acked above, don't re-apply.
      if (emitted.has(idx)) continue;
      let input: unknown = null;
      try {
        input = c.args.trim() ? JSON.parse(c.args) : {};
      } catch {
        input = null;
      }
      const op = input === null ? null : parseOp(c.name, input);
      if (op) {
        if (!announcedDrawing) {
          announcedDrawing = true;
          void emit({ type: "status", message: "Drawing the flow…" });
        }
        ops.push(op);
        draft = applyOp(draft, op);
        acct.anyOpsEmitted = true;
        await emit({ type: "op", op });
      } else {
        diagnostics.droppedOps += 1;
      }
    }
    return { ops, calls: orderedCalls, assistantText };
  };

  // Agentic loop, mirroring the Claude path. The model emits a batch of tool
  // calls and stops with finish_reason "tool_calls"; we ack each with a
  // tool_result message and let it continue until it ends its turn (no more
  // tool calls) or MAX_ROUNDS. The system/KB prefix stays messages[0] and
  // byte-stable across rounds, so OpenAI's automatic prompt caching kicks in.
  const convo: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: buildUserTurn(req) },
  ];

  // exhausted = the loop hit its round cap while the model still wanted tools,
  // so the flow was never finished. Treated as cut-short (vetoed, not shown).
  let exhausted = false;
  const cutShort = () =>
    CUT_SHORT_STOPS.has(diagnostics.stopReason ?? "") || diagnostics.droppedOps > 0 || exhausted;
  let anyOps = false;
  // Did the model stream any real prose this run? A deliberate conversational
  // reply — an in-voice refusal ("I map legitimate flows, not laundering"), a
  // charming redirect ("no Galactic Federation rail, but a wire to Mars…"), or a
  // clarifying question — ends with zero ops but IS a complete answer. Tracking
  // this lets the finalize step tell "the model chose to talk" (no error) apart
  // from "the model shipped nothing at all" (honest error). Without it, the tool's
  // most personable declines get a scary "couldn't parse the request" banner
  // slapped under them — they look broken precisely when they're behaving best.
  let anyText = false;
  let repaired = false;
  // Consecutive rounds with zero ops — the model is producing tool calls that
  // all fail validation, or emitting prose without building anything. After N
  // such rounds the loop is spinning and must abort before burning the full
  // budget. Gated on consecutive (not cumulative) so a single valid round resets
  // the counter — once the model builds real structure, it can have an off round.
  let consecutiveNoProgress = 0;
  const MAX_NO_PROGRESS_ROUNDS = 3;

  // Latency instrumentation (server logs only). Total wall-clock is dominated by
  // the number of SEQUENTIAL rounds; log it so the round-count reduction can be
  // measured against real percentiles instead of guessed.
  const startedAt = Date.now();
  let roundsUsed = 0;
  // The hard finish-now deadline is injected ONCE (when it first fires), not
  // re-pushed every remaining round — repeating it bloats the cached request and
  // reads as nagging.
  let deadlineInjected = false;

  for (let round = 0; round < maxRounds; round++) {
    roundsUsed = round + 1;
    const { ops, calls, assistantText } = await runStream(convo, usesTools ? "auto" : "none");
    if (ops.length) anyOps = true;
    if (assistantText.trim()) anyText = true;

    // explain/critique are prose-only — one pass, no tools, no validation.
    if (!usesTools) break;

    // Model paused mid-build (it emitted tool calls): record its turn, ack each
    // call, and let it keep going to finish the flow.
    if (diagnostics.stopReason === "tool_calls" && calls.length > 0) {
      // No-progress guard: a round that applied no new ops (model re-emitted
      // already-applied calls, dribbled invalid tool calls, or produced prose
      // with misnamed functions) is the loop spinning toward the cap. Track
      // consecutive no-progress rounds and abort early when the model is stuck,
      // regardless of whether real structure was ever produced (the old guard
      // only fired AFTER anyOps was true, so a model that never produced a
      // single valid op spun through all MAX_ROUNDS burning tokens).
      // set_view is excluded from ops by design but IS real handled work — a
      // set_view-only round must be acked and continued, not treated as spinning.
      const handledViews = calls.filter((c) => c.function.name === "set_view").length;
      const madeProgress = ops.length > 0 || handledViews > 0;
      if (!madeProgress) {
        consecutiveNoProgress++;
        if (consecutiveNoProgress >= MAX_NO_PROGRESS_ROUNDS) {
          exhausted = true;
          break;
        }
      } else {
        consecutiveNoProgress = 0;
      }
      convo.push({ role: "assistant", content: assistantText || null, tool_calls: calls });
      // Ack each call. The FIRST ack carries progress + a finish nudge so the
      // model knows where it is and that the next turn should finish or batch —
      // counteracting the bare-"applied" treadmill that trains one-op-per-turn.
      // The rest stay terse to avoid bloating the cached request.
      calls.forEach((c, i) => {
        convo.push({
          role: "tool",
          tool_call_id: c.id,
          content:
            i === 0
              ? `applied (flow now has ${draft.nodes.length} node${draft.nodes.length === 1 ? "" : "s"}, ${draft.edges.length} edge${draft.edges.length === 1 ? "" : "s"}; round ${round + 1}/${maxRounds}). If the flow is complete, end your turn with no tool calls. Otherwise emit ALL remaining ops in THIS next turn — every missing node and edge in one batch, not one per turn. You are meant to finish in about 3 turns.`
              : "applied",
        });
      });
      // The true last round always marks exhaustion (a stop the graceful-partial
      // path handles), independent of the deadline nudge below.
      if (round === maxRounds - 1) exhausted = true;
      // Approaching the cap: inject a hard deadline ONCE so the model finishes in
      // its remaining turn(s) instead of idling another step. Fired earlier than
      // before (finishDeadlineRoundsLeft) because production data showed the model
      // dribbling one op per round for many rounds when the only exit was it
      // volunteering to stop — which is exactly what fails on a broad prompt.
      const roundsLeft = maxRounds - 1 - round;
      if (roundsLeft <= finishDeadlineRoundsLeft && !deadlineInjected) {
        deadlineInjected = true;
        convo.push({
          role: "user",
          content:
            "Finish the flow in THIS turn. Emit every remaining op in one batch — all missing nodes and edges, then suggest_followups and set_view — then END YOUR TURN with one closing sentence and no tool calls. Do not add one op and stop; a coarse but complete flow now beats a detailed one that never finishes.",
        });
      }
      continue;
    }

    // Model ended its turn. A cut-short draft (dropped ops / cut off) is vetoed
    // below, never repaired. Otherwise, on a presentable-but-invalid flow, inject
    // ONE repair round and continue.
    if (anyOps && !repaired && !cutShort()) {
      const result = validateFlow(draft);
      if (!result.ok) {
        repaired = true;
        await emit({ type: "status", message: "Validating and repairing the flow…" });
        convo.push({ role: "user", content: buildRepairTurn(JSON.stringify(draft), result.errors) });
        continue;
      }
    }
    break;
  }

  acct.rounds = roundsUsed;
  if (usesTools) {
    console.log(
      `[agent] generate: ${roundsUsed} round(s), ${draft.nodes.length}n/${draft.edges.length}e, ${Date.now() - startedAt}ms wall, dropped=${diagnostics.droppedOps}`,
    );
  }

  if (usesTools && anyOps) {
    // Graceful degradation: dropped ops or a build-cap stop should NOT throw away
    // an otherwise-valid flow. If what we built validates and has real structure
    // (>= 2 parties), SHOW it — with an honest caveat when it's incomplete —
    // instead of erroring out and charging for nothing. Only hard-error when
    // there is genuinely nothing presentable. (The daily spend cap + per-IP rate
    // limits remain the backstop; this just stops the all-or-nothing veto.)
    //
    // First prune dangling legs: an edge whose endpoint node never made it in (a
    // dropped add_node leaves its add_edge stranded) would otherwise fail
    // validation for the WHOLE flow. Dropping a couple legs should degrade to a
    // valid partial diagram, not kill it. Surface the count so the caveat is honest.
    const nodeIds = new Set(draft.nodes.map((n) => n.id));
    const keptEdges = draft.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    const danglingPruned = draft.edges.length - keptEdges.length;
    if (danglingPruned > 0) {
      draft.edges = keptEdges;
      diagnostics.droppedOps = Math.max(diagnostics.droppedOps, danglingPruned);
    }
    draft = fillFallbackMetadata(draft, req);
    draft = normalizeFlowRails(draft);
    // Determinism pass: canonical lane order + dense 1..n ordinals, so the same
    // scenario lands on the same stage no matter how the model phrased its ops.
    draft = normalizeFlowStructure(draft);
    const result = validateFlow(draft);
    const presentable = result.ok && result.flow.nodes.length >= 2 && result.flow.edges.length >= 1;
    if (presentable) {
      // Record the (possibly partial) flow for the conversation log.
      acct.flow = result.flow;
      await emit({ type: "flow", flow: result.flow });
      // Honest caveat for a presentable-but-partial flow — shared with the Claude
      // path via truncationCaveat() so the two finalize paths can't drift (they did,
      // on exactly this logic). Stop reasons are provider-specific, so pass our own
      // CUT_SHORT_STOPS.has(...) result; the helper owns the combination + wording.
      const caveat = truncationCaveat({
        droppedOps: diagnostics.droppedOps,
        stopReasonCutShort: CUT_SHORT_STOPS.has(diagnostics.stopReason ?? ""),
        exhausted,
        cutShort: cutShort(),
        nodes: result.flow.nodes.length,
        edges: result.flow.edges.length,
      });
      if (caveat) await emit({ type: "text", delta: `\n\n${caveat}` });
      if (result.flow.suggestedFollowups?.length) {
        await emit({ type: "followups", followups: result.flow.suggestedFollowups });
      }
    } else {
      // Genuinely nothing usable — keep the honest error.
      await emit({
        type: "error",
        message:
          diagnostics.droppedOps > 0
            ? `${diagnostics.droppedOps} drawing operation${diagnostics.droppedOps === 1 ? "" : "s"} failed and the flow couldn't be assembled — re-run, or ask for a narrower scope.`
            : exhausted
              ? "This flow needed more build steps than allowed and couldn't be assembled — re-run, or ask for a narrower scope."
              : result.ok
                ? "The flow came out too sparse to show — re-run, or add a bit more detail."
                : `The flow failed validation: ${result.errors.join("; ")}`,
      });
    }
  } else if (usesTools && cutShort()) {
    // A build run where NOTHING applied — every tool call failed parseOp, or the
    // stream was cut off before any op landed. Ending silently here reads as a
    // clean success in the client; surface the same honest error the
    // nothing-presentable path uses.
    await emit({
      type: "error",
      message:
        diagnostics.droppedOps > 0
          ? `${diagnostics.droppedOps} drawing operation${diagnostics.droppedOps === 1 ? "" : "s"} failed and the flow couldn't be assembled — re-run, or ask for a narrower scope.`
          : "The run was cut short before the flow could be drawn — re-run, or ask for a narrower scope.",
    });
  }
  // Silent-failure fix: when the model produced NOTHING usable — zero ops AND no
  // prose — emit a visible error so the client shows an explanation instead of a
  // blank canvas with no context. This is the P0 fix from the 2026-07-03 Claude
  // review: "no excuse for shipping nothing silently."
  //
  // Critically gated on !anyText: a zero-op run that DID stream prose is an
  // intentional conversational reply (in-voice refusal, redirect, or clarifying
  // question) — that prose is the answer, so slapping a "couldn't parse the
  // request, try rephrasing" error under it is wrong and makes a graceful decline
  // read as a crash. Only the truly silent run (no ops, no words) is an error.
  if (usesTools && !anyOps && !anyText) {
    await emit({
      type: "error",
      message:
        "The model didn't produce any diagram operations. This can happen when the AI can't parse the request into a flow — try rephrasing or adding more detail about the parties, amounts, and how money moves.",
    });
  }
  // else: prose answer (refusal / clarification / explain) — text already streamed.

  await emit({ type: "done", provider: config.provider, model, usage, diagnostics });
}
