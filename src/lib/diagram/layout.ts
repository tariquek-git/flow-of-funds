import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { EdgeLayer, FlowOfFunds, FoFEdge, FoFNode } from "@/lib/schema/flow";
import type { DetailLevel } from "@/lib/state/store";

const BAND_PAD_R = 28;

/** Node footprint per detail level — the dial changes density, not just text.
    Exported so the canvas can build node-box rects for chip collision-avoidance.
    No overview row: Simple is the StoryStrip component, never a canvas layout. */
export const DIMS: Partial<Record<DetailLevel, { w: number; h: number; ranksep: number; lanePad: number }>> &
  Record<"standard" | "full", { w: number; h: number; ranksep: number; lanePad: number }> = {
  standard: { w: 224, h: 96, ranksep: 80, lanePad: 92 },
  full: { w: 230, h: 118, ranksep: 80, lanePad: 96 },
};

export function isMessageEdge(type: string): boolean {
  return type === "notification" || type === "reconciliation";
}

/**
 * The legend bucket an edge type belongs to — the unit the on-canvas legend
 * filter isolates. One of five stable keys (auth, settlement, fee, refund,
 * message). `auth` is the fallback so an unrecognized type still resolves to a
 * real bucket (matching edgeColor's blue/grey split logic). Keep in lockstep
 * with edgeColor() and EDGE_LEGEND's `key`s.
 */
export function legendCategory(edgeType: string): string {
  if (edgeType === "settlement" || edgeType === "funding") return "settlement";
  if (edgeType === "fee" || edgeType === "interchange") return "fee";
  if (edgeType === "chargeback" || edgeType === "refund") return "refund";
  if (isMessageEdge(edgeType)) return "message";
  return "auth"; // authorization, clearing, transfer, and any fallback
}

/**
 * The STORY layer(s) a leg belongs to — money / message / exception — the unit
 * the lens switch selects (distinct from legendCategory's colour bucket). Honours
 * an explicit `edge.layers` tag; otherwise falls back to a coarse guess from the
 * type. The fallback is deliberately lossy: a money-committing leg typed
 * `authorization`/`clearing` resolves to "message", which is exactly why seeds +
 * the generator should tag `layers` so the "Follow the money" lens stays whole.
 */
export function edgeLayers(edge: Pick<FoFEdge, "type" | "layers">): EdgeLayer[] {
  if (edge.layers && edge.layers.length) return edge.layers;
  switch (edge.type) {
    case "settlement":
    case "funding":
    case "fee":
    case "interchange":
    case "transfer":
      return ["money"];
    case "refund":
    case "chargeback":
      return ["exception"];
    default: // authorization, clearing, notification, reconciliation
      return ["message"];
  }
}

export type FlowLens = "all" | EdgeLayer;

/**
 * Is a leg in focus given the active lens (story layer) + legend category? Used
 * for focus+CONTEXT: focused legs render bright, the rest dim to faint context
 * (never removed) so the full flow always reads while one story is traced. The
 * lens (money/message/exception) and the legend category (auth/settlement/…)
 * compose — both must match — so "Money" + "Settlement" isolates the settlement
 * money legs. "all"/null match everything.
 */
export function edgeInFocus(
  edge: Pick<FoFEdge, "type" | "layers">,
  lens: FlowLens,
  category: string | null,
): boolean {
  const lensOk = lens === "all" || edgeLayers(edge).includes(lens);
  const catOk = !category || legendCategory(edge.type) === category;
  return lensOk && catOk;
}

/**
 * Layout: dagre computes the left-to-right sequence (x). When the flow declares
 * swimlanes, each node's y is fixed to its lane row so the diagram reads as a
 * proper flow-of-funds with parties banded by role. Lane background bands are
 * emitted as non-interactive nodes behind everything else. Falls back to pure
 * dagre when there are no lanes. Honors a node's saved position (drag).
 */
/**
 * Story order for Simple: the visible money legs ordered by their position
 * ALONG THE MONEY PATH (a topological walk of the induced subgraph), not by
 * time. Simple's dagre x-axis is topological, so numbering the same way makes
 * chips ascend 1..k left-to-right — the sentence read. The temporal truth (a
 * recipient can be credited before banks settle) lives at Detailed and in the
 * Timing view; Simple deliberately tells the plumbing story. Deterministic:
 * zero-indegree ties break by the earliest ordinal touching the node, a node's
 * out-legs order by ordinal then declared index, and any cycle remnant falls
 * back to plain ordinal order. Shared by buildEdges (chip numbers), StepView,
 * and the walkthrough via orderedVisibleEdges so the three can never disagree.
 */
export function storyOrderedEdges(edges: FoFEdge[]): FoFEdge[] {
  if (edges.length <= 1) return [...edges];
  const nodeIds = [...new Set(edges.flatMap((e) => [e.source, e.target]))];
  const indeg = new Map(nodeIds.map((n) => [n, 0]));
  const out = new Map<string, FoFEdge[]>();
  const edgeIndex = new Map(edges.map((e, i) => [e.id, i]));
  for (const e of edges) {
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    (out.get(e.source) ?? out.set(e.source, []).get(e.source)!).push(e);
  }
  const firstOrd = new Map<string, number>();
  edges.forEach((e, i) => {
    const ord = e.ordinal ?? i + 1;
    for (const id of [e.source, e.target]) {
      const prev = firstOrd.get(id);
      if (prev === undefined || ord < prev) firstOrd.set(id, ord);
    }
  });
  const rank = (id: string) => firstOrd.get(id) ?? Number.MAX_SAFE_INTEGER;
  const ready = nodeIds.filter((n) => (indeg.get(n) ?? 0) === 0);
  const ordered: FoFEdge[] = [];
  const emitted = new Set<string>();
  while (ready.length) {
    ready.sort((a, b) => rank(a) - rank(b));
    const n = ready.shift()!;
    const outs = [...(out.get(n) ?? [])].sort(
      (a, b) =>
        (a.ordinal ?? 0) - (b.ordinal ?? 0) ||
        (edgeIndex.get(a.id) ?? 0) - (edgeIndex.get(b.id) ?? 0),
    );
    for (const e of outs) {
      if (!emitted.has(e.id)) {
        emitted.add(e.id);
        ordered.push(e);
      }
      indeg.set(e.target, (indeg.get(e.target) ?? 1) - 1);
      if ((indeg.get(e.target) ?? 0) === 0) ready.push(e.target);
    }
  }
  const rest = edges
    .filter((e) => !emitted.has(e.id))
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  return [...ordered, ...rest];
}

/**
 * The ONE reading order for the currently visible legs — what the chip numbers,
 * the mobile StepView list, and the walkthrough all follow. Simple reads in
 * story (money-path) order; Detailed/Expert read in ordinal (temporal) order.
 */
export function orderedVisibleEdges(flow: FlowOfFunds, detail: DetailLevel): FoFEdge[] {
  const visible = visibleEdges(flow, detail, null);
  if (detail === "overview") return storyOrderedEdges(visible);
  return [...visible].sort(
    (a, b) => (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER),
  );
}

export function layoutFlow(
  flow: FlowOfFunds,
  detail: DetailLevel = "standard",
  edgeFilter: string | null = null,
  lens: FlowLens = "all",
): { nodes: Node[]; edges: Edge[] } {
  // Defensive: a persisted snapshot can smuggle an invalid detail level past
  // the type system; fall back to standard instead of destructuring undefined.
  // (The canvas never renders at overview anymore — Simple is the StoryStrip
  // component, not a graph layout — so this path only sees standard/full.)
  const dims = DIMS[detail] ?? DIMS.standard;
  const { w: NODE_W, h: NODE_H, ranksep, lanePad } = dims;
  const LANE_H = NODE_H + lanePad;
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", ranksep, nodesep: 52, marginx: 16, marginy: 16 });

  for (const n of flow.nodes) graph.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of flow.edges) graph.setEdge(e.source, e.target);
  dagre.layout(graph);

  const lanes = [...(flow.swimlanes ?? [])].sort((a, b) => a.order - b.order);
  const usedLanes = lanes.filter((l) => flow.nodes.some((n) => n.swimlaneId === l.id));
  const laneRow = new Map(usedLanes.map((l, i) => [l.id, i]));
  const useLanes = usedLanes.length >= 2;

  const nodes: Node[] = flow.nodes.map((n) => {
    const d = graph.node(n.id);
    let position: { x: number; y: number };
    if (n.position) {
      position = n.position;
    } else if (useLanes && n.swimlaneId && laneRow.has(n.swimlaneId)) {
      position = { x: d.x - NODE_W / 2, y: (laneRow.get(n.swimlaneId) ?? 0) * LANE_H };
    } else {
      position = { x: d.x - NODE_W / 2, y: d.y - NODE_H / 2 };
    }
    return { id: n.id, type: "fofNode", position, data: n };
  });

  // De-overlap nodes that share a lane and ended up too close horizontally.
  if (useLanes) {
    const savedIds = new Set(flow.nodes.filter((n) => n.position).map((n) => n.id));
    for (const lane of usedLanes) {
      const laneNodes = nodes
        .filter((nd) => (nd.data as FoFNode).swimlaneId === lane.id && !savedIds.has(nd.id))
        .sort((a, b) => a.position.x - b.position.x);
      let lastRight = -Infinity;
      for (const nd of laneNodes) {
        if (nd.position.x < lastRight + 36) nd.position.x = lastRight + 36;
        lastRight = nd.position.x + NODE_W;
      }
    }
  }

  // Lane background bands, sized to the diagram extent, rendered behind nodes.
  if (useLanes && nodes.length) {
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_W));
    const bandX = minX - 108;
    const bandW = maxX - bandX + BAND_PAD_R;
    const bands: Node[] = usedLanes.map((lane, i) => ({
      id: `__band-${lane.id}`,
      type: "laneBand",
      position: { x: bandX, y: i * LANE_H - (LANE_H - NODE_H) / 2 },
      // Explicit dimensions: React Flow treats the node as measured on
      // arrival. Without them (no Handles either), useNodesInitialized never
      // flips true and the auto-fit silently dies.
      width: bandW,
      height: LANE_H - 10,
      data: { label: lane.label, width: bandW, height: LANE_H - 10, index: i },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
    }));
    nodes.unshift(...bands);
  }

  const edges = buildEdges(flow, edgeFilter, lens);
  return { nodes, edges };
}

/**
 * The leg set, styled for the canvas, identical in BOTH views (dagre map and the
 * party-swimlane view): shared so the detail dial, the lens/legend dimming, the
 * provenance markers, and the glossary stay byte-for-byte consistent across the
 * two layouts. Extracted from layoutFlow so layoutFlowLanes reuses it verbatim
 * instead of forking a second, drift-prone copy.
 *
 * Focus+context. A lens (story) or legend category never REMOVES a leg, it dims
 * the rest to faint context so the WHOLE flow always reads while one story is
 * traced. (The canvas only renders at standard/full — Simple is the StoryStrip —
 * so every leg is always a candidate and chips print the flow's own normalized
 * ordinals.)
 *
 * arrivalFocus (a glossary "See it move" deep link landing) borrows the same
 * dim: while set it overrides lens/legend focus so only the target element's
 * leg(s) render bright. Cleared by the store on the first interaction.
 */
export function buildEdges(
  flow: FlowOfFunds,
  edgeFilter: string | null,
  lens: FlowLens,
  arrivalFocus: { kind: "node" | "edge"; id: string } | null = null,
): Edge[] {
  return flow.edges.map((e) => {
    const color = edgeColor(e.type);
    const isMessage = isMessageEdge(e.type);
    const focused = arrivalFocus
      ? arrivalFocus.kind === "edge"
        ? e.id === arrivalFocus.id
        : e.source === arrivalFocus.id || e.target === arrivalFocus.id
      : edgeInFocus(e, lens, edgeFilter);
    const baseWidth = isMessage ? 1.4 : e.emphasis === "secondary" ? 1.6 : 2.2;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "fofEdge",
      data: focused ? e : { ...e, _dimmed: true },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      ...(e.direction === "bidirectional"
        ? { markerStart: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 } }
        : {}),
      style: {
        strokeWidth: focused ? baseWidth : 1.1,
        stroke: color,
        ...(isMessage ? { strokeDasharray: "6 4" } : {}),
        opacity: !focused ? 0.12 : e.emphasis === "muted" ? 0.55 : 1,
      },
    };
  });
}

/**
 * Earliest ordinal each node participates in (as source OR target) + one ROW per
 * party (the y-lane index), shared by BOTH auto-arranged views (lanes + timeline)
 * so their party ordering can never drift. Extracted because both layouts derived
 * this byte-for-byte; the column logic (columnFor) differs by design and stays in
 * each layout. Mirrors how buildEdges is shared (see the comment above).
 *
 * Row ORDER of parties: declared swimlanes win (parties inherit lane order, so
 * grouped roles stay banded); otherwise order by the party's earliest ordinal
 * (who acts first sits highest). Ties (and un-legged nodes) keep the flow's
 * declared node order, which is stable and deterministic.
 */
function partyRows(flow: FlowOfFunds): {
  firstOrdinal: Map<string, number>;
  partyRow: Map<string, number>;
  orderedParties: FoFNode[];
} {
  // Earliest ordinal each node participates in (as source OR target). Sort legs
  // by ordinal so "first edge that touches a party" is well defined; a leg with
  // no ordinal counts as its 1-based position in the sorted set.
  const firstOrdinal = new Map<string, number>();
  const noteOrdinal = (id: string, ord: number) => {
    const prev = firstOrdinal.get(id);
    if (prev === undefined || ord < prev) firstOrdinal.set(id, ord);
  };
  [...flow.edges]
    .sort((a, b) => (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER))
    .forEach((e, i) => {
      const ord = e.ordinal ?? i + 1;
      noteOrdinal(e.source, ord);
      noteOrdinal(e.target, ord);
    });

  const lanes = [...(flow.swimlanes ?? [])].sort((a, b) => a.order - b.order);
  const laneOrder = new Map(lanes.map((l, i) => [l.id, i]));
  const nodeIndex = new Map(flow.nodes.map((n, i) => [n.id, i]));
  const partyRank = (n: FoFNode): number => {
    const laneRank = n.swimlaneId !== undefined ? laneOrder.get(n.swimlaneId) : undefined;
    if (laneRank !== undefined) return laneRank;
    return firstOrdinal.get(n.id) ?? Number.MAX_SAFE_INTEGER;
  };
  const orderedParties = [...flow.nodes].sort((a, b) => {
    const ra = partyRank(a);
    const rb = partyRank(b);
    if (ra !== rb) return ra - rb;
    return (nodeIndex.get(a.id) ?? 0) - (nodeIndex.get(b.id) ?? 0);
  });
  // One ROW per party: its lane index is its position in the ordered list.
  const partyRow = new Map(orderedParties.map((n, i) => [n.id, i]));
  return { firstOrdinal, partyRow, orderedParties };
}

/**
 * Party-swimlane layout: the BEGINNER view. Where layoutFlow (dagre) optimizes
 * for a compact left-to-right graph, this lays each PARTY in its own horizontal
 * lane (a sequence-diagram / swimlane feel) so a first-timer reads who-does-what
 * and the handoffs in ORDER.
 *
 * Algorithm (first slice):
 *  - Lane ORDER of parties: when the flow declares swimlanes, parties inherit
 *    their swimlane's `order` (grouped lanes still read top-to-bottom by role).
 *    Otherwise a party's rank is the ordinal of the FIRST leg that touches it, so
 *    whoever acts first sits highest. One ROW per PARTY either way (via partyRows).
 *  - y = lane index * row height (even vertical spacing).
 *  - x = earliest ordinal a party participates in, spread evenly, so the sequence
 *    reads left-to-right in ordinal order and the node→node legs become visible
 *    handoffs between rows.
 *  - Node box sizes are the SAME DIMS the dagre path uses, so chips/labels fit.
 *  - Edges + dimming come from buildEdges (shared), so the detail dial, lenses,
 *    provenance markers, and glossary all work here exactly as in the map view.
 *  - Lane affordance: a per-party background band with the party label anchored
 *    left (reuses the laneBand node type).
 *
 * Auto-arranged: positions are ALWAYS computed (n.position is ignored here). Only
 * the Map view honors a saved drag; a swimlane/timeline cell stays authoritative.
 */
export function layoutFlowLanes(
  flow: FlowOfFunds,
  detail: DetailLevel = "standard",
  edgeFilter: string | null = null,
  lens: FlowLens = "all",
): { nodes: Node[]; edges: Edge[] } {
  const dims = DIMS[detail] ?? DIMS.standard;
  const { w: NODE_W, h: NODE_H, lanePad } = dims;
  const LANE_H = NODE_H + lanePad;
  // Horizontal step between successive ordinal columns. A touch wider than the
  // node so a handoff arrow has room to read between two columns.
  const COL_W = NODE_W + 96;

  // Earliest ordinal each node participates in + one ROW per party, shared with
  // the timeline view (partyRows) so the two auto-arranged layouts can't drift.
  const { firstOrdinal, partyRow, orderedParties } = partyRows(flow);

  // Distinct ordinals → a dense column index, so x reads as a clean sequence even
  // when ordinals skip values (e.g. 1, 3, 8). A party with no leg falls into a
  // trailing column.
  const distinctOrds = [...new Set([...firstOrdinal.values()])].sort((a, b) => a - b);
  const ordColumn = new Map(distinctOrds.map((o, i) => [o, i]));
  const trailingCol = distinctOrds.length; // for un-legged parties

  const columnFor = (id: string): number => {
    const ord = firstOrdinal.get(id);
    if (ord === undefined) return trailingCol;
    return ordColumn.get(ord) ?? trailingCol;
  };

  // Auto-arranged view: positions are ALWAYS computed from the swimlane cell.
  // n.position (a Map-view drag) is deliberately IGNORED so a node dragged in the
  // Map can't escape its row/column here.
  const nodes: Node[] = flow.nodes.map((n) => {
    const row = partyRow.get(n.id) ?? 0;
    const position = { x: columnFor(n.id) * COL_W, y: row * LANE_H };
    return { id: n.id, type: "fofNode", position, data: n };
  });

  // Per-party lane bands behind the nodes: a subtle alternating background with
  // the party label anchored left. Reuses the laneBand node type. Sized to the
  // diagram extent so every column sits inside its row.
  if (nodes.length) {
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_W));
    const bandX = minX - 108;
    const bandW = maxX - bandX + BAND_PAD_R;
    const bands: Node[] = orderedParties.map((party, i) => ({
      id: `__band-${party.id}`,
      type: "laneBand",
      position: { x: bandX, y: i * LANE_H - (LANE_H - NODE_H) / 2 },
      // Explicit dimensions: React Flow treats the node as measured on arrival.
      // Without them (no Handles either), useNodesInitialized never flips true and
      // the auto-fit silently dies (same contract as the dagre lane bands).
      width: bandW,
      height: LANE_H - 10,
      data: { label: party.label, width: bandW, height: LANE_H - 10, index: i },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
    }));
    nodes.unshift(...bands);
  }

  const edges = buildEdges(flow, edgeFilter, lens);
  return { nodes, edges };
}

/**
 * Timeline layout: the THIRD visual representation. Where the map (dagre) reads
 * as a graph and lanes reads as who-does-what, the timeline reads as WHEN: each
 * leg's x is its `edge.timing` bucket (parseTimingBucket), so customer-facing,
 * "feels instant" legs cluster on the LEFT and the legs where money actually
 * SETTLES (T+1/T+2/days) sit on the RIGHT. That visual gap IS the #1 payments
 * truth this view exists to teach.
 *
 * Algorithm (first slice):
 *  - x: a node sits in the EARLIEST time bucket of any leg that touches it (as
 *    source OR target). A node with no leg falls into the instant column. The
 *    column index is the bucket `order` (0 instant … 4 days), so x reads as the
 *    settlement-time axis. (Earliest, not latest, so a party that has BOTH an
 *    instant message leg and a later settlement leg anchors at the moment it
 *    FIRST acts (the settlement leg still arrows rightward to its own column).
 *  - y: one ROW per party (reused from the lanes view): declared swimlane order
 *    when present, else the party's earliest ordinal, so parties stay readable
 *    and the cross-time legs become legible left-to-right handoffs.
 *  - Labeled TIME-BUCKET bands (Instant, Same day, T+1, T+2, Days) render as
 *    vertical columns behind the nodes with a heading anchored at the top, so the
 *    axis is self-explaining. Only buckets that actually contain a leg are drawn.
 *  - Edges + dimming come from buildEdges (shared), so the detail dial, lenses,
 *    provenance markers, and glossary all work here exactly as in the other views.
 *
 * Auto-arranged: positions are ALWAYS computed (n.position is ignored here). Only
 * the Map view honors a saved drag; a time-bucket cell stays authoritative.
 */
export function layoutFlowTimeline(
  flow: FlowOfFunds,
  detail: DetailLevel = "standard",
  edgeFilter: string | null = null,
  lens: FlowLens = "all",
): { nodes: Node[]; edges: Edge[] } {
  const dims = DIMS[detail] ?? DIMS.standard;
  const { w: NODE_W, h: NODE_H, lanePad } = dims;
  const LANE_H = NODE_H + lanePad;
  // A wide column so two parties bucketed into the SAME time slot don't collide,
  // and so a cross-time arrow has room to read between columns.
  const COL_W = NODE_W + 140;

  // The earliest time bucket each node participates in (as source OR target).
  // A node with no leg defaults to the instant column (order 0). The MINIMUM
  // bucket anchors the party at the first moment it acts.
  const bucketForEdge = (e: FoFEdge) => parseTimingBucket(e.timing).order;
  const nodeBucket = new Map<string, number>();
  const noteBucket = (id: string, order: number) => {
    const prev = nodeBucket.get(id);
    if (prev === undefined || order < prev) nodeBucket.set(id, order);
  };
  for (const e of flow.edges) {
    const order = bucketForEdge(e);
    noteBucket(e.source, order);
    noteBucket(e.target, order);
  }
  const columnFor = (id: string): number => nodeBucket.get(id) ?? 0;

  // Row order of parties, shared with the lanes view (partyRows) so the two
  // auto-arranged layouts can't drift: declared swimlanes win (parties inherit
  // lane order); otherwise order by the party's earliest ordinal (who acts first
  // sits highest), ties by declared node order (stable).
  const { partyRow } = partyRows(flow);

  // Auto-arranged view: positions are ALWAYS computed from the time-bucket cell.
  // n.position (a Map-view drag) is deliberately IGNORED so a node dragged in the
  // Map can't escape its row/time-column here.
  const nodes: Node[] = flow.nodes.map((n) => {
    const row = partyRow.get(n.id) ?? 0;
    const position = { x: columnFor(n.id) * COL_W, y: row * LANE_H };
    return { id: n.id, type: "fofNode", position, data: n };
  });

  // De-overlap parties that landed in the SAME row AND same time column (two
  // parties can share both a settlement bucket and a swimlane); nudge them apart
  // horizontally within the column so neither hides behind the other.
  {
    const byCell = new Map<string, Node[]>();
    for (const nd of nodes) {
      const key = `${Math.round(nd.position.y)}:${Math.round(nd.position.x)}`;
      (byCell.get(key) ?? byCell.set(key, []).get(key)!).push(nd);
    }
    for (const group of byCell.values()) {
      group.forEach((nd, i) => {
        nd.position.x += i * (NODE_W + 24);
      });
    }
  }

  // Vertical TIME-BUCKET bands behind the nodes: one column per bucket that
  // actually contains a leg-anchored party, with the bucket label anchored at the
  // top so the axis (Instant → Same day → T+1 → T+2 → Days) reads left to right.
  // Reuses the timeBand node type (vertical sibling of laneBand).
  if (nodes.length) {
    // Columns that actually hold a party, taken from the bucket map (NOT the
    // post-nudge x, which the same-cell de-overlap can push past a COL_W
    // boundary). Positions are always auto-computed here, so the bucket is the
    // single source of truth for which columns are in use.
    const usedCols = [...new Set(flow.nodes.map((n) => columnFor(n.id)))]
      .filter((c) => c >= 0 && c < TIMING_BUCKETS.length)
      .sort((a, b) => a - b);
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_H));
    const bandY = minY - 56; // headroom for the top-anchored label
    const bandH = maxY - bandY + 24;
    const bandW = NODE_W + 48;
    const bands: Node[] = usedCols.map((col, i) => ({
      id: `__timeband-${col}`,
      type: "timeBand",
      position: { x: col * COL_W - 24, y: bandY },
      // Explicit dimensions: React Flow treats the node as measured on arrival.
      // Without them (no Handles either), useNodesInitialized never flips true and
      // the auto-fit silently dies (same contract as the lane bands).
      width: bandW,
      height: bandH,
      data: { label: TIMING_BUCKETS[col].label, width: bandW, height: bandH, index: i },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
    }));
    nodes.unshift(...bands);
  }

  const edges = buildEdges(flow, edgeFilter, lens);
  return { nodes, edges };
}

/**
 * The ORDERED time buckets a leg's `edge.timing` can fall into, LEFT to RIGHT on
 * the timeline axis. The whole point of the timeline view: a customer-facing leg
 * that "feels instant" (order 0) sits far LEFT of where the money actually
 * SETTLES (T+1/T+2/days, orders 2 to 4), so a beginner sees the gap between
 * experience and settlement at a glance. `order` is the column index; `label` is
 * the axis band heading. Keep the order monotonic (0 earliest, 4 latest). */
export const TIMING_BUCKETS: { order: number; label: string }[] = [
  { order: 0, label: "Instant" },
  { order: 1, label: "Same day" },
  { order: 2, label: "T+1" },
  { order: 3, label: "T+2" },
  { order: 4, label: "Days" },
];

/**
 * Bucket a free-text `edge.timing` value into one of the five ORDERED timeline
 * buckets (see TIMING_BUCKETS). The audited catalog uses many phrasings for the
 * same settlement reality ("Real-time", "instant", "Seconds", "T+1 net
 * settlement", "T+1-T+2 batch payout", "Per return code window", "≤30 calendar
 * days", …); this folds them onto the axis so the column reads as WHEN the money
 * really lands, not how the SME happened to word it.
 *
 * Robust to case and the known variants. A leg with NO timing, or an
 * unrecognized phrase, falls back to the INSTANT/message zone (order 0) so it
 * still has a home on the left (the customer-facing / message default) rather
 * than vanishing. Ordering of the checks matters: the LATEST signal wins (a
 * "T+1-T+2" string mentions T+1 but means T+2; a "≤N days" string means the
 * exception bucket even if it also says "instant, post-finality").
 *
 * Pure + exported so it is unit-testable on its own.
 */
export function parseTimingBucket(timing?: string): { order: number; label: string } {
  const bucket = (order: number) => TIMING_BUCKETS[order];
  if (!timing || !timing.trim()) return bucket(0); // no timing => instant/message zone
  const t = timing.toLowerCase();

  // 4 (days / exception bucket). The LATEST window: multi-day return/dispute
  // windows, post-finality reversals, and program-agreement payouts. Checked
  // FIRST so a "≤N calendar days" or "after finality" string can't be siphoned
  // off by an earlier (faster) keyword it also happens to contain.
  if (
    // PLURAL "days" only, a genuine multi-day window ("≤30 calendar days",
    // "1-2 business days", "Up to 30 days"). The SINGULAR "day" in "same day" /
    // "next business day" / "end-of-day" is a faster bucket and is handled below;
    // matching \bdays\b (not \bday\b) keeps them out of the exception column.
    /\bdays\b/.test(t) ||
    t.includes("return code window") ||
    t.includes("return window") ||
    t.includes("finality") || // "after finality", "instant, post-finality", "economically final after N confirmations"
    t.includes("confirmation") || // "after N confirmations", "final after N confirmations"
    t.includes("per program agreement") ||
    // A bare "payout schedule" (program payout, no explicit window) lands in the
    // exception column. A "payout schedule (T+2 …)" carries an explicit T+2 and is
    // handled by the T+2 block below, so it is excluded here (was previously
    // shadowed by this keyword and mis-bucketed).
    (t.includes("payout schedule") && !/t\+2/.test(t)) ||
    t.includes("due date") // bill/invoice due date (lands much later)
  ) {
    return bucket(4);
  }

  // 3 (T+2). The "T+1-T+2 / T+1–T+2" range is bucketed at its LATER edge so the
  // axis never understates settlement risk. (Both the ASCII hyphen and the
  // en-dash forms appear in the catalog.) A "Payout schedule (T+2 or batch)"
  // carries an explicit T+2 and is caught here by the /t\+2/ check.
  if (/t\+1\s*[-–]\s*t\+2/.test(t) || /t\+2/.test(t)) {
    return bucket(3);
  }

  // 1 (early): "Settlement date (T+1 or Same Day ACH)" reads as a same-day
  // window per the audited intent. Checked BEFORE the generic T+1 block so its
  // literal "t+1" substring doesn't pull it into the next-day bucket.
  if (t.includes("settlement date")) return bucket(1);

  // 2 (T+1 / next business day). Net cycles, end-of-day / overnight batches,
  // effective-date credits, and explicit T+1 settlement all land next-day.
  if (
    /t\+1/.test(t) ||
    t.includes("next business day") ||
    t.includes("next-day") ||
    t.includes("effective date") || // "Effective date (next-day or Same Day ACH)"
    t.includes("end-of-day batch") || // "T+0 end-of-day batch" => practically next-day
    /\bbatch\b/.test(t) || // bare "Batch", "T+0 batch submission"
    t.includes("deferred net") || // deferred net settlement is a later cycle
    t.includes("minutes to t+1")
  ) {
    return bucket(2);
  }

  // 1 (same day). Same-day net cycles and same-day ACH land later than instant
  // but before the next business day.
  if (t.includes("same day") || t.includes("same-day")) {
    return bucket(1);
  }

  // 0 (instant / real-time / message zone). Real-time(+gross), instant, seconds,
  // minutes, and the explicit T+0 exchange leg. This is also the FALLBACK below
  // for anything unrecognized (a message/customer-facing leg by default).
  // (Reached for "Real-time", "instant", "Seconds", "Minutes", "T+0 exchange",
  // "Real-time gross", "near-instant", etc., and for any unknown phrase.)
  return bucket(0);
}

/**
 * Guarantee every HUMAN party (an `endpoint` node — the cardholder, the employer,
 * the sender, the merchant, the employee) appears in Simple's story, by adding the
 * fewest EXISTING legs needed to attach each one to the money set.
 *
 * Why this exists: Simple selects money-layer legs, but in card, payroll and pull
 * flows the payer's leg is an `authorization` tagged as a message, so the payer was
 * dropped — and StoryStrip then printed them under "Not part of the money path".
 * That turned an omission into a false assertion about the person whose money it is
 * (measured: 19 of 27 seeds). Simple's promise is "who pays whom", and "whom" is a
 * person, not a settlement account.
 *
 * Nothing is invented. A bridge leg is always an edge the author or the model
 * already drew, with its own label, description, provenance and sources intact.
 * The pass is purely ADDITIVE — it can never drop a leg Simple shows today, so the
 * flows that already read well come out byte-identical.
 *
 * Deterministic by construction: humans are visited in earliest-ordinal order, and
 * each bridge is chosen by (1) fewest hops, (2) landing on a node where the money
 * story starts (so the chain connects rather than dead-ends), (3) leg type rank,
 * (4) lowest ordinal, (5) outward before inward.
 */
export function anchorEndpoints(flow: FlowOfFunds, money: FoFEdge[]): FoFEdge[] {
  const selected = new Set(money.map((e) => e.id));
  const reached = new Set(money.flatMap((e) => [e.source, e.target]));
  // Where the money story starts: reached nodes with no incoming money leg.
  const hasIncoming = new Set(money.map((e) => e.target));
  const moneySources = new Set([...reached].filter((n) => !hasIncoming.has(n)));

  const touches = (id: string) => flow.edges.filter((e) => e.source === id || e.target === id);
  // A leg is bridgeable if it isn't already shown, isn't author-demoted, and isn't
  // an exception/recon leg (those are their own story, not a way in).
  const bridgeable = (e: FoFEdge) =>
    !selected.has(e.id) &&
    e.emphasis !== "secondary" &&
    !["reconciliation", "refund", "chargeback"].includes(e.type);
  const typeRank = (t: string) =>
    ["transfer", "funding", "settlement"].includes(t) ? 0
      : ["authorization", "clearing"].includes(t) ? 1
        : ["interchange", "fee"].includes(t) ? 2
          : 3;

  const firstOrdinal = new Map<string, number>();
  flow.edges.forEach((e, i) => {
    const ord = e.ordinal ?? i + 1;
    for (const id of [e.source, e.target]) {
      const prev = firstOrdinal.get(id);
      if (prev === undefined || ord < prev) firstOrdinal.set(id, ord);
    }
  });

  const humans = flow.nodes
    .filter((n) => n.type === "endpoint" && touches(n.id).length > 0)
    .sort(
      (a, b) =>
        (firstOrdinal.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (firstOrdinal.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );

  // Proportional safety valve: a bridge budget that can't let noise outgrow the
  // story it is attaching to.
  const budget = Math.max(2, Math.ceil(money.length / 2));
  let spent = 0;

  for (const human of humans) {
    if (reached.has(human.id) || spent >= budget) continue;
    // Breadth-first over <= 2 hops, outward (the payer case) and inward (payee).
    type Path = { legs: FoFEdge[]; end: string; outward: boolean };
    const candidates: Path[] = [];
    for (const first of touches(human.id).filter(bridgeable)) {
      const outward = first.source === human.id;
      const end1 = outward ? first.target : first.source;
      candidates.push({ legs: [first], end: end1, outward });
      if (reached.has(end1)) continue; // 1 hop already lands; no need to extend
      for (const second of touches(end1).filter(bridgeable)) {
        if (second.id === first.id) continue;
        const end2 = second.source === end1 ? second.target : second.source;
        if (end2 === human.id) continue;
        candidates.push({ legs: [first, second], end: end2, outward });
      }
    }
    const landing = candidates.filter((c) => reached.has(c.end));
    const pool = landing.length ? landing : candidates;
    if (!pool.length) continue;
    pool.sort(
      (a, b) =>
        a.legs.length - b.legs.length ||
        Number(moneySources.has(b.end)) - Number(moneySources.has(a.end)) ||
        typeRank(a.legs[0].type) - typeRank(b.legs[0].type) ||
        (a.legs[0].ordinal ?? 0) - (b.legs[0].ordinal ?? 0) ||
        Number(b.outward) - Number(a.outward),
    );
    const best = pool[0];
    if (spent + best.legs.length > budget) continue;
    for (const leg of best.legs) {
      selected.add(leg.id);
      reached.add(leg.source);
      reached.add(leg.target);
    }
    spent += best.legs.length;
  }

  // Preserve declared order: storyOrderedEdges uses declared index as its final
  // tiebreak, so returning a filtered flow.edges keeps ordering deterministic.
  return flow.edges.filter((e) => selected.has(e.id));
}

/**
 * The legs that should render for a given detail level + legend filter. Shared by
 * the swimlane layout (above) and the mobile Step view so the two never disagree.
 * Overview drops message/recon legs (the dial's whole point); an isolated legend
 * category omits every leg outside it. An empty result is valid (no legs of that
 * type). Nodes are never touched — only which legs are shown.
 */
export function visibleEdges(
  flow: FlowOfFunds,
  detail: DetailLevel,
  edgeFilter: string | null,
): FoFEdge[] {
  let detailEdges: FoFEdge[];
  if (detail === "overview") {
    // Simple = the MONEY STORY: the value-moving legs the flow's own `layers`
    // tag (or edgeLayers' type fallback for an untagged AI leg) marks as money,
    // minus anything the author tagged `secondary` (fees, minor legs). This is
    // what makes Simple actually simple. It USED to drop only message/recon
    // legs, which for a P2P transfer deleted the recognizable notification loop
    // while KEEPING the switch fee and a reversal exception (backwards), and for
    // 8 of the 26 seeds dropped nothing at all. Guard: if a flow somehow has no
    // money leg, fall back to the old drop-messages set so the canvas is never
    // empty. Nodes left leg-less by this thinning appear in the
    // StoryStrip's "Not part of the money path" row.
    const money = flow.edges.filter(
      (e) => edgeLayers(e).includes("money") && e.emphasis !== "secondary",
    );
    // Double fallback: no money legs -> drop only messages; if THAT is also
    // empty (a pure notification/reconciliation flow), show everything rather
    // than an arrow-less canvas.
    const nonMessage = flow.edges.filter((e) => !isMessageEdge(e.type));
    detailEdges = money.length
      ? anchorEndpoints(flow, money)
      : nonMessage.length
        ? nonMessage
        : flow.edges;
  } else {
    detailEdges = flow.edges;
  }
  return edgeFilter
    ? detailEdges.filter((e) => legendCategory(e.type) === edgeFilter)
    : detailEdges;
}

// Warm-family edge palette. The brand has ONE accent (crimson) and NO blue/green;
// these hexes mirror globals.css tokens so the canvas, the on-canvas legend, and the
// exported PNG never drift back to tech-blue/green. The arc varies hue AND lightness
// (charcoal -> maple -> gold -> crimson + warm grey) so the 5 buckets stay separable
// in greyscale and under common colourblindness. edgeColor() and EDGE_LEGEND below
// MUST stay in lockstep (same 5 hexes).
export function edgeColor(type: string): string {
  if (type === "settlement" || type === "funding") return "#c9962f"; // gold = money landing
  if (type === "authorization" || type === "clearing" || type === "transfer") return "#1c1c1c"; // charcoal backbone
  if (type === "chargeback" || type === "refund") return "#C41E3A"; // crimson = exception
  if (type === "fee" || type === "interchange") return "#8a5a14"; // deep maple
  return "#8a857c"; // notification, reconciliation, and anything message-like (warm grey)
}

/** `key` is the legendCategory() bucket this row isolates when clicked in the
    on-canvas legend filter; it maps 1:1 to a color (kept in lockstep with edgeColor). */
export const EDGE_LEGEND: { key: string; label: string; color: string; dashed?: boolean }[] = [
  { key: "auth", label: "Authorization / clearing", color: "#1c1c1c" },
  { key: "settlement", label: "Settlement / funding", color: "#c9962f" },
  { key: "fee", label: "Fees / interchange", color: "#8a5a14" },
  { key: "refund", label: "Refund / chargeback", color: "#C41E3A" },
  { key: "message", label: "Messages / recon", color: "#8a857c", dashed: true },
];
