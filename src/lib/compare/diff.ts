import type { FlowOfFunds, FoFEdge } from "@/lib/schema/flow";

/**
 * Derive the side-by-side DIFF for two flows ENTIRELY from their existing,
 * audited structure (metadata + nodes + edges). No new curated facts: every
 * value here is read off a seed the content team already verified. The /compare
 * route highlights the rows where the two sides differ, which is the v1 value.
 */

export type DiffAttr = {
  /** Stable key for React + tests. */
  key: string;
  /** Row label. */
  label: string;
  /** The two derived values (already humanized strings). */
  a: string;
  b: string;
  /** True when the two sides differ (drives the highlight). */
  differs: boolean;
};

const MIDDOT = "·"; // we join with middot, never an em dash (brand rule)

/** Humanize an empty list to a calm placeholder, else join with middot. */
function show(xs: string[]): string {
  return xs.length ? xs.join(` ${MIDDOT} `) : "n/a";
}

/** The treasury node is the settlement venue; report its label(s). */
function settlementVenues(flow: FlowOfFunds): string[] {
  const venues = flow.nodes.filter((n) => n.type === "treasury").map((n) => n.label);
  return [...new Set(venues)];
}

/**
 * Settlement / funding timings, in the order the legs run. We read the `timing`
 * off the legs whose type actually moves or finalizes value (settlement +
 * funding), de-duplicated, so the row reads as the rail's real settlement story
 * rather than a wall of repeats.
 */
function settlementTimings(flow: FlowOfFunds): string[] {
  const moneyLegs = flow.edges.filter(
    (e: FoFEdge) => e.type === "settlement" || e.type === "funding",
  );
  const timings = moneyLegs
    .map((e) => e.timing)
    .filter((t): t is string => Boolean(t && t.trim()));
  return [...new Set(timings)];
}

/** Message standards present on any leg (e.g. ISO 20022, Nacha). */
function messageStandards(flow: FlowOfFunds): string[] {
  const stds = flow.edges
    .map((e) => e.messageStandard)
    .filter((s): s is string => Boolean(s && s.trim()));
  return [...new Set(stds)];
}

/** Distinct rails actually used across the legs (the lived rail set). */
function railsUsed(flow: FlowOfFunds): string[] {
  return [...new Set(flow.edges.map((e) => e.rail).filter(Boolean))];
}

/** Count only real parties (treasury venues + endpoints + institutions), not bands. */
function partyCount(flow: FlowOfFunds): number {
  return flow.nodes.length;
}

/**
 * The full diff table for two flows. Same row order regardless of inputs so the
 * two columns always align. `differs` is a string-equality check on the rendered
 * value, which is exactly what the highlight should key on (a reader sees the two
 * cells differ).
 */
export function buildDiff(a: FlowOfFunds, b: FlowOfFunds): DiffAttr[] {
  const rows: Omit<DiffAttr, "differs">[] = [
    {
      key: "jurisdiction",
      label: "Jurisdiction",
      a: show(a.metadata.jurisdiction),
      b: show(b.metadata.jurisdiction),
    },
    {
      key: "primaryRails",
      label: "Primary rails",
      a: show(a.metadata.primaryRails),
      b: show(b.metadata.primaryRails),
    },
    {
      key: "railsUsed",
      label: "Rails on the legs",
      a: show(railsUsed(a)),
      b: show(railsUsed(b)),
    },
    {
      key: "currency",
      label: "Currency",
      a: show(a.metadata.currencies),
      b: show(b.metadata.currencies),
    },
    {
      key: "parties",
      label: "Number of parties",
      a: String(partyCount(a)),
      b: String(partyCount(b)),
    },
    {
      key: "settlementVenue",
      label: "Settlement venue",
      a: show(settlementVenues(a)),
      b: show(settlementVenues(b)),
    },
    {
      key: "settlementTiming",
      label: "Settlement timing",
      a: show(settlementTimings(a)),
      b: show(settlementTimings(b)),
    },
    {
      key: "messageStandard",
      label: "Message standard",
      a: show(messageStandards(a)),
      b: show(messageStandards(b)),
    },
  ];
  return rows.map((r) => ({ ...r, differs: r.a !== r.b }));
}

/**
 * An ordered, plain walk of a flow's legs for the COMPACT static render (no React
 * Flow). Each step restates one leg from the seed: its ordinal, who -> whom, the
 * label, rail, timing, and a money/message/exception kind for the warm coding.
 * Ordered by `ordinal` so it reads as the real sequence.
 */
export type FlowStep = {
  n: number;
  from: string;
  to: string;
  label: string;
  rail: string;
  timing?: string;
  kind: "money" | "message" | "exception";
};

function legKind(e: FoFEdge): FlowStep["kind"] {
  const layers = e.layers ?? [];
  if (layers.includes("exception")) return "exception";
  if (layers.includes("money")) return "money";
  if (layers.length) return "message";
  // Fallback from type when a leg carries no explicit layers.
  switch (e.type) {
    case "settlement":
    case "funding":
    case "fee":
    case "interchange":
    case "transfer":
      return "money";
    case "refund":
    case "chargeback":
      return "exception";
    default:
      return "message";
  }
}

export function flowSteps(flow: FlowOfFunds): FlowStep[] {
  const labelById = new Map(flow.nodes.map((n) => [n.id, n.label]));
  const ordered = [...flow.edges].sort(
    (x, y) => (x.ordinal ?? Number.MAX_SAFE_INTEGER) - (y.ordinal ?? Number.MAX_SAFE_INTEGER),
  );
  return ordered.map((e, i) => ({
    n: e.ordinal ?? i + 1,
    from: labelById.get(e.source) ?? e.source,
    to: labelById.get(e.target) ?? e.target,
    label: e.label ?? e.type,
    rail: e.rail,
    timing: e.timing,
    kind: legKind(e),
  }));
}
