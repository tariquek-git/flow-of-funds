/**
 * Rail-compare integrity — offline, no AI, no browser. Guards the curated
 * COMPARE_PAIRS so an incomparable or broken pair can never ship:
 *   1. Pair ids are unique.
 *   2. Both seed ids resolve to a real FLOW_CATALOG flow.
 *   3. The two sides are GENUINELY comparable: they share a jurisdiction OR a
 *      structural archetype (same set of node types). This is the hard product
 *      rule ("never an incomparable pair") enforced by construction.
 *   4. getComparison(id) resolves for every pair (the route never 404s a card).
 *   5. theDecision / title / job are non-empty.
 *
 * Run from repo root: npx tsx scripts/check-compare.ts  (also part of `pnpm test`)
 */
import { COMPARE_PAIRS, getComparison } from "../src/content/compare";
import { FLOW_CATALOG } from "../src/lib/flows/catalog";
import type { FlowOfFunds } from "../src/lib/schema/flow";

let failures = 0;
const fail = (id: string, msg: string) => {
  failures++;
  console.error(`  ✗ ${id}: ${msg}`);
};

/** A flow's structural archetype: the sorted set of distinct node types. Two
 *  flows with the same archetype are doing the same KIND of job (e.g. both are
 *  endpoint/institution/treasury bank-rail flows), which is the structural sense
 *  in which they "genuinely compete" even across jurisdictions (BaaS vs BaaS). */
const archetype = (flow: FlowOfFunds): string =>
  [...new Set(flow.nodes.map((n) => n.type))].sort().join(",");

const sharesJurisdiction = (a: FlowOfFunds, b: FlowOfFunds): boolean =>
  a.metadata.jurisdiction.some((j) => b.metadata.jurisdiction.includes(j));

console.log("Compare pairs:");

// 1. unique ids
const counts = new Map<string, number>();
for (const p of COMPARE_PAIRS) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
for (const [id, n] of counts) if (n > 1) fail(id, `pair id used ${n} times`);

for (const p of COMPARE_PAIRS) {
  const before = failures;

  // 5. non-empty copy
  if (!p.title?.trim()) fail(p.id, "empty title");
  if (!p.job?.trim()) fail(p.id, "empty job");
  if (!p.jurisdiction?.trim()) fail(p.id, "empty jurisdiction");
  if (!p.theDecision?.trim()) fail(p.id, "empty theDecision");

  // 2. both seeds resolve in the catalog
  const a = FLOW_CATALOG[p.aSeedId];
  const b = FLOW_CATALOG[p.bSeedId];
  if (!a) fail(p.id, `aSeedId → unknown FLOW_CATALOG id "${p.aSeedId}"`);
  if (!b) fail(p.id, `bSeedId → unknown FLOW_CATALOG id "${p.bSeedId}"`);
  if (p.aSeedId === p.bSeedId) fail(p.id, "a and b are the same seed (not a comparison)");

  // 3. genuinely comparable: shared jurisdiction OR shared archetype
  if (a && b) {
    const comparable = sharesJurisdiction(a, b) || archetype(a) === archetype(b);
    if (!comparable) {
      fail(
        p.id,
        `INCOMPARABLE pair: "${p.aSeedId}" (${a.metadata.jurisdiction.join("/")}, ${archetype(a)}) ` +
          `vs "${p.bSeedId}" (${b.metadata.jurisdiction.join("/")}, ${archetype(b)}) ` +
          `share neither jurisdiction nor archetype`,
      );
    }
  }

  // 4. getComparison resolves (the route renders, never 404s a listed card)
  if (!getComparison(p.id)) fail(p.id, "getComparison(id) did not resolve");

  if (failures === before) console.log(`  ✓ ${p.id}`);
}

if (COMPARE_PAIRS.length < 1) fail("compare", "no curated pairs defined");

if (failures) {
  console.error(`\n${failures} compare failure(s)`);
  process.exit(1);
}
console.log(`\nAll ${COMPARE_PAIRS.length} compare pairs pass integrity checks.`);
