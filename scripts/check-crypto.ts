/**
 * Crypto/stablecoin seed health check — offline, no AI, no browser.
 * Two guards:
 *   1. Geometry: the 4 crypto seeds lay out cleanly (no overlap, in-band,
 *      distinct edge endpoints, muted Circle governance legs survive layout).
 *      Mirrors the real layout contract in src/lib/diagram/layout.ts.
 *   2. Discoverability: the real public homepage showcase includes a crypto or
 *      stablecoin scenario whose direct seed exists. This guards the rendered
 *      product contract instead of a disconnected typewriter fixture.
 * Run from repo root: npx tsx scripts/check-crypto.ts
 */
import { layoutFlow } from "../src/lib/diagram/layout";
import { FLOW_CATALOG } from "../src/lib/flows/catalog";
import { SHOWCASE_SCENARIOS } from "../src/lib/flows/showcase";
import type { DetailLevel } from "../src/lib/state/store";
import type { FoFNode } from "../src/lib/schema/flow";

// Must match DIMS in layout.ts (standard row). A drift fails invariant 2 loudly.
const STD = { w: 224, h: 96, lanePad: 92 };

const CRYPTO_SEEDS = [
  "usdc-onchain-payment",
  "usdc-cross-border-payout",
  "crypto-exchange-onramp",
  "stablecoin-merchant-accept",
] as const;

// (id -> muted Circle governance edge ids) that must survive layout + stay muted.
const MUTED_GOVERNANCE: Record<string, string[]> = {
  "usdc-onchain-payment": ["e8"],
  "stablecoin-merchant-accept": ["e6"],
};

const DETAIL: DetailLevel = "standard";
let failures = 0;
const fail = (id: string, msg: string) => {
  failures++;
  console.error(`  ✗ ${id}: ${msg}`);
};

type Box = { id: string; x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

console.log("Geometry (dagre layout invariants):");
for (const id of CRYPTO_SEEDS) {
  const before = failures;
  const seed = FLOW_CATALOG[id];
  if (!seed) {
    fail(id, "seed missing from FLOW_CATALOG");
    continue;
  }

  const { w: NODE_W, h: NODE_H, lanePad } = STD;
  const LANE_H = NODE_H + lanePad;

  const { nodes, edges } = layoutFlow(seed, DETAIL, null, "all");
  const partyNodes = nodes.filter((n) => n.type === "fofNode");
  const bandNodes = nodes.filter((n) => n.type === "laneBand");

  // 1. No two party-node boxes overlap (bands are decorative, skipped).
  const boxes: Box[] = partyNodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, w: NODE_W, h: NODE_H }));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      if (overlap(boxes[i], boxes[j])) fail(id, `node "${boxes[i].id}" overlaps "${boxes[j].id}"`);

  // 2. Every node sits in its assigned swimlane band. Recompute usedLanes/laneRow
  //    exactly as layout.ts does (sort by order, keep only lanes that have a node).
  const lanes = [...(seed.swimlanes ?? [])].sort((a, b) => a.order - b.order);
  const usedLanes = lanes.filter((l) => seed.nodes.some((n) => n.swimlaneId === l.id));
  const laneRow = new Map(usedLanes.map((l, i) => [l.id, i]));
  if (usedLanes.length !== bandNodes.length)
    fail(id, `expected ${usedLanes.length} bands, layout emitted ${bandNodes.length}`);
  for (const n of partyNodes) {
    const lane = (n.data as FoFNode).swimlaneId;
    if (!lane || !laneRow.has(lane)) {
      fail(id, `node "${n.id}" has no resolvable swimlane ("${lane ?? "none"}")`);
      continue;
    }
    const row = laneRow.get(lane)!;
    const bandTop = row * LANE_H - (LANE_H - NODE_H) / 2;
    const bandBottom = bandTop + (LANE_H - 10);
    const top = n.position.y,
      bottom = n.position.y + NODE_H;
    if (top < bandTop - 0.5 || bottom > bandBottom + 0.5)
      fail(id, `node "${n.id}" (y ${top}..${bottom}) escapes lane "${lane}" band (${bandTop}..${bandBottom})`);
  }

  // 3. Every edge has two distinct, real endpoints (no self-loop / zero-length).
  for (const e of edges) {
    if (e.source === e.target) fail(id, `edge "${e.id}" is a self-loop (${e.source})`);
    const s = partyNodes.find((n) => n.id === e.source);
    const t = partyNodes.find((n) => n.id === e.target);
    if (!s || !t) {
      fail(id, `edge "${e.id}" endpoint missing a node`);
      continue;
    }
    if (s.position.x === t.position.x && s.position.y === t.position.y)
      fail(id, `edge "${e.id}" has zero-length geometry (endpoints coincide)`);
  }

  // 4. Muted Circle governance legs survive layout and stay emphasis:"muted".
  for (const eid of MUTED_GOVERNANCE[id] ?? []) {
    const e = edges.find((x) => x.id === eid);
    if (!e) {
      fail(id, `muted governance edge "${eid}" was dropped from the layout`);
      continue;
    }
    const seedEdge = seed.edges.find((x) => x.id === eid)!;
    if (seedEdge.emphasis !== "muted") fail(id, `governance edge "${eid}" is no longer emphasis:"muted"`);
    if (!partyNodes.find((n) => n.id === e.source) || !partyNodes.find((n) => n.id === e.target))
      fail(id, `muted governance edge "${eid}" points at a non-existent node`);
  }

  if (failures === before) console.log(`  ✓ ${id}: ${partyNodes.length} nodes, ${bandNodes.length} bands, ${edges.length} edges`);
}

// 5. Discoverability: the actual public showcase must visibly include a direct
//    crypto/stablecoin template load (instant, deterministic, no AI spend).
console.log("\nDiscoverability (public stablecoin showcase points to a real seed):");
const cryptoShowcase = SHOWCASE_SCENARIOS.filter((scenario) =>
  /usdc|crypto|stablecoin/i.test(`${scenario.category} ${scenario.question} ${scenario.outcome}`),
);
if (cryptoShowcase.length === 0) fail("landing", "no crypto or stablecoin scenario is visible in SHOWCASE_SCENARIOS");
for (const scenario of cryptoShowcase) {
  if (!FLOW_CATALOG[scenario.seedId]) {
    fail("landing", `"${scenario.question}" points to missing seed "${scenario.seedId}"`);
  } else if (!(CRYPTO_SEEDS as readonly string[]).includes(scenario.seedId)) {
    fail("landing", `"${scenario.question}" points to non-crypto seed "${scenario.seedId}"`);
  } else {
    console.log(`  ✓ "${scenario.question}" → ${scenario.seedId}`);
  }
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll crypto seeds lay out cleanly and the public stablecoin showcase resolves.");
