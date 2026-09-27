import Anthropic from "@anthropic-ai/sdk";
import { validateFlow } from "@/lib/schema/validate";
import { normalizeFlowStructure } from "@/lib/schema/normalize";
import { normalizeFlowRails } from "./rails";
import { buildViewEvent } from "./view";
import { truncationCaveat } from "./caveat";
import { claudeHeavyModel, claudeLightModel } from "./models";
import { applyOp, emptyFlow, parseOp, type FlowOp } from "@/lib/schema/ops";
import type { FlowOfFunds } from "@/lib/schema/flow";
import { FLOW_TOOLS } from "./tools";
import { fillFallbackMetadata } from "./openai";
import { SYSTEM_PROMPT, buildRepairTurn, buildUserTurn } from "./prompt";
import type { AgentRequest, Emit, RunAccounting } from "./types";

/**
 * Model tiering — "use AI efficiently":
 *  - Opus 4.8 builds and edits flows and runs critiques (domain accuracy matters).
 *  - Haiku 4.5 handles explain turns (cheap prose over context already in hand).
 * Both are overridable via env without code changes — set AI_MODEL to swap the
 * heavy tier (e.g. claude-sonnet-4-6 to cut cost ~80%).
 */
const HEAVY_MODEL = claudeHeavyModel();
const LIGHT_MODEL = claudeLightModel();

const MAX_HISTORY_TURNS = 8;

/**
 * Per-model capabilities. `thinking` toggles adaptive extended thinking, which
 * lifts multi-step payments reasoning on the models that support it. This was a
 * substring check (model.includes("fable"|"opus"|"sonnet-4-6")) — brittle: a
 * rename like "opus" → "claude-4-9-omega" would SILENTLY drop thinking and
 * degrade payments accuracy with no error. An explicit map fails LOUD instead:
 * any model not listed gets the documented default (see modelCaps).
 */
type ModelCaps = { thinking: boolean };

const MODEL_CAPS: Record<string, ModelCaps> = {
  "claude-opus-4-8": { thinking: true },
  "claude-opus-4-7": { thinking: true },
  "claude-opus-4-6": { thinking: true },
  "claude-fable-5": { thinking: true },
  "claude-sonnet-4-6": { thinking: true },
  // Haiku omits thinking — it handles cheap explain prose, not domain reasoning.
  "claude-haiku-4-5": { thinking: false },
};

// Default for an unrecognized model name (a fresh release or an env override not
// yet in the map): enable thinking. Erring toward thinking keeps reasoning
// quality high — the cost of a wrong "on" is a few extra tokens; the cost of a
// wrong "off" is silently degraded payments accuracy. A genuinely unsupported
// model surfaces a clear API error rather than quietly losing reasoning.
function modelCaps(model: string): ModelCaps {
  return MODEL_CAPS[model] ?? { thinking: true };
}

/** Stop reasons that mean the model's output was cut off, not finished. */
const CUT_SHORT_STOPS = new Set(["max_tokens", "model_context_window_exceeded", "refusal"]);

type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export async function runClaude(
  req: AgentRequest,
  emit: Emit,
  signal: AbortSignal | undefined,
  // Run accounting shared with the route so spend + the conversation log capture
  // whatever was consumed even if this throws or is aborted mid-stream (RED-1).
  // REQUIRED (not optional): the daily-$ cap is only enforced when the provider
  // populates this, so the type system forces every caller to pass it — the
  // exact wiring that was silently missing on this path before (sec-1/cost-1).
  acct: RunAccounting,
): Promise<void> {
  const client = new Anthropic();
  const usesTools = req.capability === "generate" || req.capability === "edit";
  const model =
    req.capability === "explain" ? LIGHT_MODEL : HEAVY_MODEL;
  // Record the model on the shared accounting up front so the route can price
  // consumed tokens (and log the run) even if the very first request throws.
  acct.model = model;

  // Kill the dead air. Extended thinking can run many seconds before any
  // op or token streams — a first-time tester reads a frozen screen. Emit an
  // immediate phase signal so the UI shows "Thinking…" the instant the run
  // starts, ahead of the wall-clock heartbeat below (which only fires after
  // 10s of silence). The map of phase → copy lives client-side; the server
  // just names the phase. usesTools paths build a diagram; explain/critique
  // are prose.
  await emit({
    type: "status",
    message: usesTools
      ? "Thinking through the payments mechanics…"
      : "Thinking…",
  });

  // Generate always starts from an empty draft — mirroring the client
  // (store.ts send). Seeding from currentFlow here stitched the old canvas's
  // nodes into every fresh generation the moment the final flow event landed.
  let draft: FlowOfFunds =
    req.capability === "generate" || !req.currentFlow
      ? emptyFlow(`flow-${Date.now().toString(36)}`)
      : structuredClone(req.currentFlow);

  // History is forwarded ONLY for explain (light, conversational, Haiku). The
  // heavy paths (generate/edit/critique) build from currentFlow + the prompt, so
  // dropping history there closes an unclassified channel into the model: the
  // scope gate sees only the prompt, and an off-topic/jailbreak payload could
  // otherwise ride in client-supplied history straight to Opus. Also trims tokens.
  // The windowed slice can START on an assistant turn (loadFlow appends a lone
  // assistant note), and the Anthropic API rejects assistant-first messages —
  // drop leading assistant turns so the history opens on a user turn.
  const historyWindow = req.history.slice(-MAX_HISTORY_TURNS);
  const firstUserTurn = historyWindow.findIndex((t) => t.role === "user");
  const history =
    req.capability === "explain" && firstUserTurn !== -1
      ? historyWindow.slice(firstUserTurn).map((t) => ({ role: t.role, content: t.text }))
      : [];

  // Alias the shared accounting's usage object so every token tally below is
  // visible to the route's `finally` — that's what charges the daily cap and
  // records spend even on abort/error, not just on the clean `done` event
  // (RED-1). Mirrors the OpenAI path.
  const usage: Usage = acct.usage;
  // One-shot guard so the "Drawing the flow…" status fires on the first op of
  // the run, not once per agentic round.
  let announcedDrawing = false;
  // Honesty accounting: a dropped op or a max_tokens stop means the diagram
  // on screen is NOT what the model intended — it must never render as a
  // clean, complete exhibit.
  const diagnostics = { droppedOps: 0, stopReason: null as string | null };

  const runStream = async (
    convo: Anthropic.Messages.MessageParam[],
    toolChoice: "auto" | "none",
  ) => {
    const ops: FlowOp[] = [];
    const stream = client.messages.stream(
      {
        model,
        // Thinking tokens count against max_tokens; 16k starved complex flows
        // into mid-tool-call truncation. Streaming, so a high cap is safe.
        max_tokens: usesTools ? 32000 : 3000,
        // Adaptive thinking lifts multi-step domain reasoning on the models that
        // support it (Fable 5, Opus 4.6+, Sonnet 4.6); Haiku omits it. Driven by
        // the explicit MODEL_CAPS map (not a substring check) so a rename can't
        // silently disable it; swapping the heavy tier to Sonnet keeps thinking.
        ...(modelCaps(model).thinking ? { thinking: { type: "adaptive" as const } } : {}),
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        // Tools are always present for heavy-model calls so the cached
        // tools+system prefix is identical across generate/edit/critique.
        ...(model === HEAVY_MODEL
          ? { tools: FLOW_TOOLS, tool_choice: { type: toolChoice } }
          : {}),
        messages: convo,
      },
      signal ? { signal } : undefined,
    );

    let tool: { name: string; json: string } | null = null;
    // Cumulative output tokens seen via message_delta this round (the field is
    // cumulative per message, so we add only the increment — never double-count).
    let roundOutput = 0;
    // Adaptive thinking can run 30-90s+ emitting nothing user-visible (its
    // deltas are omitted by default on Fable), and the client kills streams
    // silent for 45s. Heartbeat on wall clock, never on delta cadence.
    let lastActivity = Date.now();
    const heartbeat = setInterval(() => {
      if (Date.now() - lastActivity > 10_000) {
        lastActivity = Date.now();
        // Still alive, just thinking hard. Phrase it so a long silent stretch
        // reads as deliberate reasoning, never as a hung request.
        void emit({
          type: "status",
          message: announcedDrawing
            ? "Working through the remaining legs…"
            : "Still thinking through the payments mechanics…",
        });
      }
    }, 5_000);

    try {
      for await (const event of stream) {
        if (event.type === "message_start") {
          // Usage arrives on the stream itself, not only finalMessage() — capture
          // it live so an aborted/errored run still records what it consumed.
          const u = event.message.usage;
          usage.input += u.input_tokens ?? 0;
          usage.cacheRead += u.cache_read_input_tokens ?? 0;
          usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
          usage.output += u.output_tokens ?? 0;
          roundOutput = u.output_tokens ?? 0;
          continue;
        }
        if (event.type === "message_delta") {
          const out = event.usage?.output_tokens ?? roundOutput;
          usage.output += out - roundOutput;
          roundOutput = out;
          continue;
        }
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            tool = { name: event.content_block.name, json: "" };
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            lastActivity = Date.now();
            // Capture prose for the conversation log as it streams, so a run that
            // errors/aborts mid-prose still logs what the user saw.
            acct.responseText += event.delta.text;
            await emit({ type: "text", delta: event.delta.text });
          } else if (event.delta.type === "input_json_delta" && tool) {
            tool.json += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop" && tool) {
          // set_view is a VIEW control, not a flow op: it changes what the canvas
          // shows (detail dial + legend focus) without touching the diagram. Emit
          // a `view` event and skip the op path — it must NOT count as a dropped
          // op or trigger "Drawing the flow…". The tool_use block is still acked
          // uniformly via `toolUses` below, so the agentic loop stays valid.
          if (tool.name === "set_view") {
            await emit(buildViewEvent(tool.json));
            tool = null;
            continue;
          }
          let input: unknown = {};
          try {
            input = tool.json.trim() ? JSON.parse(tool.json) : {};
          } catch {
            input = null;
          }
          const op = input === null ? null : parseOp(tool.name, input);
          if (op) {
            // First op of the whole run = the thinking phase is over and the
            // diagram is now assembling. Flip the status copy once, so the
            // overlay stops saying "Thinking…" the moment legs start landing.
            if (!announcedDrawing) {
              announcedDrawing = true;
              void emit({ type: "status", message: "Drawing the flow…" });
            }
            ops.push(op);
            draft = applyOp(draft, op);
            lastActivity = Date.now();
            acct.anyOpsEmitted = true;
            await emit({ type: "op", op });
          } else {
            diagnostics.droppedOps += 1;
          }
          tool = null;
        }
      }
    } finally {
      clearInterval(heartbeat);
    }

    const final = await stream.finalMessage();
    // Usage is captured live from message_start/message_delta above (so an
    // aborted run still records spend); finalMessage() is used only for the stop
    // reason and the assistant content blocks that drive the agentic loop.
    // A cut-short stop on any pass outranks whatever the last pass reported.
    if (!CUT_SHORT_STOPS.has(diagnostics.stopReason ?? "")) diagnostics.stopReason = final.stop_reason;
    return { final, ops };
  };

  // Agentic loop: the model emits a batch of tool calls and pauses (normal
  // tool-use behavior — stop_reason "tool_use"). We acknowledge the ops and let
  // it continue, so a full flow (parties → every edge → annotations →
  // suggest_followups) gets built over however many steps it takes. A single
  // response stops after the first batch, which is why generation produced
  // parties but no edges before this loop existed.
  const convo: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: "user", content: buildUserTurn(req) },
  ];
  const MAX_ROUNDS = 8;
  // exhausted = the loop hit its round cap while the model still wanted to emit
  // tools, so the flow was never finished. Treated as cut-short so an unfinished
  // diagram is vetoed, never shown as a clean, complete exhibit.
  let exhausted = false;
  const cutShort = () =>
    CUT_SHORT_STOPS.has(diagnostics.stopReason ?? "") || diagnostics.droppedOps > 0 || exhausted;
  let anyOps = false;
  // Did the model stream any real prose this run? A deliberate conversational
  // reply — an in-voice refusal, a charming redirect, or a clarifying question —
  // ends with zero ops but IS a complete answer. Tracking this lets the finalize
  // step tell "the model chose to talk" (no error) from "the model shipped
  // nothing at all" (honest error). Mirrors the OpenAI-path guard.
  let anyText = false;
  let repaired = false;
  // Consecutive rounds with zero ops — the model is producing tool calls that
  // all fail validation, or emitting prose without building anything. After N
  // such rounds the loop is spinning and must abort before burning the full
  // budget. Mirrors the OpenAI-path guard.
  let consecutiveNoProgress = 0;
  const MAX_NO_PROGRESS_ROUNDS = 3;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { final, ops } = await runStream(convo, usesTools ? "auto" : "none");
    if (ops.length) anyOps = true;
    if (final.content.some((b) => b.type === "text" && b.text.trim())) anyText = true;

    // explain/critique are prose-only — one pass, no tools, no validation.
    if (!usesTools) break;

    const toolUses = final.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );

    // Model paused mid-build: ack every tool call and let it keep going.
    if (final.stop_reason === "tool_use" && toolUses.length > 0) {
      // No-progress guard: a round that applied no new ops (model re-emitted
      // already-applied calls or dribbled invalid tool calls) is the loop
      // spinning toward the cap. Track consecutive no-progress rounds and abort
      // early when the model is stuck, regardless of whether real structure was
      // ever produced.
      const handledViews = toolUses.filter((t) => t.name === "set_view").length;
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
      // Last allowed round and the model still wants tools → the flow is
      // unfinished. Mark it cut-short so it's vetoed below, not shown complete.
      if (round === MAX_ROUNDS - 1) exhausted = true;
      convo.push({ role: "assistant", content: final.content });
      convo.push({
        role: "user",
        content: toolUses.map((t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id,
          content: "applied",
        })),
      });
      continue;
    }

    // Model ended its turn. Schema-valid is not enough: a flow that lost ops or
    // hit the token cap can pass validation while silently missing a settlement
    // leg — so a cut-short draft is vetoed below, not repaired. Otherwise, on a
    // presentable-but-invalid flow, inject ONE repair round and continue.
    if (anyOps && !repaired && !cutShort()) {
      const result = validateFlow(draft);
      if (!result.ok) {
        repaired = true;
        await emit({ type: "status", message: "Validating and repairing the flow…" });
        convo.push({ role: "assistant", content: final.content });
        convo.push({ role: "user", content: buildRepairTurn(JSON.stringify(draft), result.errors) });
        continue;
      }
    }
    break;
  }

  if (usesTools && anyOps) {
    // Graceful degradation — MIRRORS the OpenAI path so both providers behave the
    // same on a dropped node: dropped ops or a cut-short build must NOT throw away
    // an otherwise-valid flow. Previously this path hard-errored on ANY cut-short
    // (cutShort() includes droppedOps > 0), so a single dropped add_node whose
    // add_edge survived killed the WHOLE flow where OpenAI would show the rest.
    //
    // First prune dangling legs (an edge whose endpoint node never made it in),
    // then SHOW what validates with real structure (>= 2 parties) — with an honest
    // caveat when it's incomplete — and hard-error only when nothing is presentable.
    const liveIds = new Set(draft.nodes.map((n) => n.id));
    const keptEdges = draft.edges.filter((e) => liveIds.has(e.source) && liveIds.has(e.target));
    const danglingPruned = draft.edges.length - keptEdges.length;
    if (danglingPruned > 0) {
      draft = { ...draft, edges: keptEdges };
      diagnostics.droppedOps = Math.max(diagnostics.droppedOps, danglingPruned);
    }
    draft = fillFallbackMetadata(draft, req);
    draft = normalizeFlowRails(draft);
    // Determinism pass: canonical lane order + dense 1..n ordinals, so the same
    // scenario lands on the same stage no matter how the model phrased its ops.
    draft = normalizeFlowStructure(draft);
    const result = validateFlow(draft);
    const presentable = result.ok && result.flow.nodes.length >= 2;
    if (presentable) {
      // Record the (possibly partial) flow for the conversation log.
      acct.flow = result.flow;
      await emit({ type: "flow", flow: result.flow });
      // Honest caveat for a presentable-but-partial flow — shared with the OpenAI
      // path via truncationCaveat() so the two finalize paths can't drift. (They DID:
      // this path used to fold the hard-cut stop-reason into cutShort(), silently
      // presenting a max_tokens-truncated whole flow as clean — caught in review.)
      // Stop reasons are provider-specific, so pass our own CUT_SHORT_STOPS.has(...).
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
                : `The flow failed validation after a repair pass: ${result.errors.join("; ")}`,
      });
    }
  } else if (usesTools && cutShort()) {
    // A build run where NOTHING applied — every tool call failed parseOp, or the
    // stream was cut off before any op landed. Ending silently here reads as a
    // clean success in the client; surface the same honest error the
    // nothing-presentable path uses. Mirrors the OpenAI path.
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
  // blank canvas. Gated on !anyText so an intentional conversational reply (in-
  // voice refusal, redirect, clarifying question) isn't mislabeled as a parse
  // failure. Mirrors the OpenAI-path guard.
  if (usesTools && !anyOps && !anyText) {
    await emit({
      type: "error",
      message:
        "The model didn't produce any diagram operations. This can happen when the AI can't parse the request into a flow — try rephrasing or adding more detail about the parties, amounts, and how money moves.",
    });
  }
  // else: prose answer (refusal / clarification / "already in the flow") — the
  // text already streamed; validating an untouched draft would fabricate a flow.

  await emit({ type: "done", provider: "claude", model, usage, diagnostics });
}
