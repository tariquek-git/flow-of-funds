// Validation for GlossaryTerm.seeIt ("See it move") deep links. Pure and
// dependency-light so scripts/check-content.ts (the hard content gate) and
// scripts/test.ts can share one implementation instead of drifting copies.
import type { FlowOfFunds } from "@/lib/schema/flow";
import type { SeeItMove } from "./types";

/**
 * Hard-fail problems for a seeIt link, as human-readable strings (empty = ok):
 *   - seedId must be a real catalog id;
 *   - the seed must be the audited tier (metadata.source === "seed"), so the
 *     link always lands on a flow that earns the verified provenance seal;
 *   - select.id must name a node/edge that actually exists in that seed.
 */
export function seeItProblems(
  seeIt: SeeItMove,
  catalog: Record<string, FlowOfFunds>,
): string[] {
  const seed = catalog[seeIt.seedId];
  if (!seed) return [`seeIt → unknown FLOW_CATALOG id "${seeIt.seedId}"`];
  const problems: string[] = [];
  if (seed.metadata.source !== "seed")
    problems.push(`seeIt → seed "${seeIt.seedId}" is not audited (source "${seed.metadata.source}")`);
  if (seeIt.select) {
    const { kind, id } = seeIt.select;
    const exists =
      kind === "node"
        ? seed.nodes.some((n) => n.id === id)
        : seed.edges.some((e) => e.id === id);
    if (!exists) problems.push(`seeIt → ${kind} "${id}" not in seed "${seeIt.seedId}"`);
  }
  return problems;
}
