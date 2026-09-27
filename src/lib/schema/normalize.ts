import type { FlowOfFunds } from "./flow";

/**
 * Structural normalization: the determinism pass that runs on every flow the
 * moment it enters the app (generation finalize, seed load, import, share).
 * Two jobs, both about ORIENTATION — the same scenario must land on the same
 * stage every time, no matter how the model happened to phrase its ops:
 *
 *  1. Swimlane order is remapped onto a CANONICAL top-to-bottom role order
 *     (customer → counterparty → network/fintech → banking/settlement) by
 *     keyword-matching each lane's label/id. Model-assigned `order` values are
 *     only a tie-break within the same role. Unrecognized lanes keep their
 *     declared relative order, after the recognized ones. Two generations of
 *     the same scenario can no longer swap their vertical ordering.
 *
 *  2. Edge ordinals are renumbered DENSE 1..n (sorted by declared ordinal,
 *     ties by declared edge order). The model's ordinals are treated as a
 *     sequence hint, never as display truth — gaps, duplicates, and missing
 *     ordinals all come out clean.
 *
 * Immutable; returns the SAME object reference when nothing changed (matches
 * the normalizeFlowRails contract so call sites can chain them cheaply).
 */

/** Canonical lane roles, top to bottom on the canvas. Match order runs most
 *  specific first (banking before customer) so "Customer's bank" lands in
 *  banking, not the customer row. */
const LANE_ROLES: { rank: number; pattern: RegExp }[] = [
  // 3: where money actually settles — banks, treasury, clearing, issuer/acquirer.
  { rank: 3, pattern: /bank|settle|treasur|clearing|central|issuer|acquir|custodi|reserve/ },
  // 2: the middle — networks, schemes, processors, fintech platforms, wallets.
  { rank: 2, pattern: /network|scheme|switch|\brail|processor|gateway|psp|fintech|intermediar|platform|wallet|operator/ },
  // 1: the counterparty being paid — merchant, payee, recipient, biller.
  { rank: 1, pattern: /merchant|business|payee|recipient|receiver|seller|biller|vendor|employee|beneficiar/ },
  // 0: the paying side — customer, consumer, sender, cardholder.
  { rank: 0, pattern: /customer|consumer|payer|sender|cardholder|buyer|shopper|individual|\buser|people|employer/ },
];

const UNMATCHED_RANK = 4;

function laneRank(label: string, id: string): number {
  const hay = `${label} ${id}`.toLowerCase();
  for (const { rank, pattern } of LANE_ROLES) {
    if (pattern.test(hay)) return rank;
  }
  return UNMATCHED_RANK;
}

export function normalizeFlowStructure(flow: FlowOfFunds): FlowOfFunds {
  let changed = false;

  // --- 1. Canonical lane order ---------------------------------------------
  let swimlanes = flow.swimlanes;
  if (swimlanes && swimlanes.length > 1) {
    const ranked = swimlanes.map((lane, i) => ({
      lane,
      rank: laneRank(lane.label ?? "", lane.id),
      declared: lane.order ?? i,
      i,
    }));
    ranked.sort((a, b) => a.rank - b.rank || a.declared - b.declared || a.i - b.i);
    const next = ranked.map(({ lane }, i) =>
      lane.order === i + 1 ? lane : { ...lane, order: i + 1 },
    );
    if (next.some((lane, i) => lane !== swimlanes![i])) {
      changed = true;
      swimlanes = next;
    }
  }

  // --- 2. Dense ordinals ----------------------------------------------------
  let edges = flow.edges;
  if (edges.length) {
    const order = edges
      .map((e, i) => ({ e, i }))
      .sort(
        (a, b) =>
          (a.e.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.e.ordinal ?? Number.MAX_SAFE_INTEGER) ||
          a.i - b.i,
      );
    const dense = new Map(order.map(({ e }, pos) => [e.id, pos + 1]));
    const next = edges.map((e) => {
      const ord = dense.get(e.id)!;
      return e.ordinal === ord ? e : { ...e, ordinal: ord };
    });
    if (next.some((e, i) => e !== edges[i])) {
      changed = true;
      edges = next;
    }
  }

  if (!changed) return flow;
  return { ...flow, swimlanes, edges };
}
