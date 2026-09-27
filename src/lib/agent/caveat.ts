/**
 * The "this flow may be incomplete" caveat shown beneath a PRESENTABLE-but-partial
 * flow — single source shared by both providers so the OpenAI and Claude finalize
 * paths cannot drift.
 *
 * They DID drift: when claude.ts was rewritten to mirror openai.ts's graceful-
 * degrade, the hard-cut stop-reason check got folded into cutShort() (which is
 * gated by !structurallyComplete), so a hard `max_tokens` truncation on a
 * structurally-whole flow was silently presented as clean on the Claude path only —
 * the exact dishonest-success case the degrade logic exists to prevent. An
 * adversarial verification pass caught it. Extracting the decision here (the same
 * move that deduped set_view into view.ts) makes that class of drift impossible and
 * gives the logic the unit test it never had.
 *
 * Stop reasons are provider-specific (OpenAI: length/content_filter; Anthropic:
 * max_tokens/…), and each provider's CUT_SHORT_STOPS also gates its repair loop. So
 * the caller passes a precomputed `stopReasonCutShort` (its own
 * CUT_SHORT_STOPS.has(stopReason)) and its own `cutShort`; this helper owns only the
 * COMBINATION + the wording, never the per-provider stop-reason vocabulary.
 */

export type CaveatInput = {
  /** Ops dropped from the flow (failed validation + dangling-edge prune). */
  droppedOps: number;
  /** True when the provider's stop reason is one of ITS cut-short reasons. */
  stopReasonCutShort: boolean;
  /** The agentic loop hit its round cap with the model still wanting to build. */
  exhausted: boolean;
  /** Provider-computed cutShort(): a stop-reason cut OR droppedOps>0 OR exhausted. */
  cutShort: boolean;
  /** The presentable flow's structure. */
  nodes: number;
  edges: number;
};

/**
 * The caveat to append beneath a presentable-but-possibly-incomplete flow, or null
 * when none is warranted.
 *
 * A HARD cut (dropped ops, or a cut-short stop reason) ALWAYS caveats — even on a
 * structurally-whole flow — because it's the strongest "this is truncated" signal,
 * and a `max_tokens` cut sets neither droppedOps nor exhausted. The SOFT signal
 * (mere round exhaustion) is suppressed once the flow is structurally whole (>=4
 * nodes AND >=4 edges) so a complete flow that merely dribbled past its build budget
 * (a heavy reasoner adding polish it never finished) isn't flagged and doesn't scare
 * users off normal flows.
 */
export function truncationCaveat(i: CaveatInput): string | null {
  const structurallyComplete = i.nodes >= 4 && i.edges >= 4;
  const hardCut = i.droppedOps > 0 || i.stopReasonCutShort;
  if (!(hardCut || (i.cutShort && !structurallyComplete))) return null;
  if (i.droppedOps > 0) {
    return `⚠ ${i.droppedOps} leg${i.droppedOps === 1 ? "" : "s"} couldn't be drawn, so this flow may be incomplete — re-run or narrow the scope for the full picture.`;
  }
  if (i.exhausted) {
    return "⚠ This is a large flow and hit the build limit, so a few legs may be missing — re-run or narrow the scope to complete it.";
  }
  return "⚠ The build stopped early, so this flow may be incomplete — re-run for the full picture.";
}
