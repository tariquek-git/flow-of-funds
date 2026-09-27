import type { FlowOfFunds } from "@/lib/schema/flow";
import type { FlowOp } from "@/lib/schema/ops";

/**
 * Convert a complete flow into the op stream that would build it.
 * Powers the fixture provider (seed replay) and the round-trip eval.
 */
export function flowToOps(flow: FlowOfFunds): FlowOp[] {
  const ops: FlowOp[] = [];
  const m = flow.metadata;
  ops.push({
    op: "set_metadata",
    title: m.title,
    description: m.description,
    narrative: m.narrative,
    jurisdiction: m.jurisdiction,
    primaryRails: m.primaryRails,
    currencies: m.currencies,
    tags: m.tags,
  });
  for (const lane of flow.swimlanes ?? []) {
    ops.push({ op: "add_swimlane", ...lane });
  }
  for (const node of flow.nodes) {
    const { position: _p, metadata: _m, ...rest } = node;
    ops.push({ op: "add_node", ...rest });
  }
  for (const edge of flow.edges) {
    const { metadata: _m, ...rest } = edge;
    ops.push({ op: "add_edge", ...rest });
  }
  for (const ann of flow.annotations ?? []) {
    ops.push({ op: "add_annotation", ...ann });
  }
  if (flow.suggestedFollowups?.length) {
    ops.push({
      op: "suggest_followups",
      followups: flow.suggestedFollowups.slice(0, 4).map((f) => ({
        prompt: f.prompt,
        rationale: f.rationale,
      })),
    });
  }
  return ops;
}
