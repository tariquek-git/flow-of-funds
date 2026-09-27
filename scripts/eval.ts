/**
 * Offline eval — no AI spend.
 *  1. Every seed flow validates against the schema.
 *  2. Every seed survives the op round-trip: flowToOps(seed) applied to an
 *     empty flow re-validates and preserves node/edge/lane counts.
 *  3. Spend-safety asserts (cost.ts unknown-model fail-safe) — see
 *     scripts/spend-safety.ts.
 * Run: pnpm eval
 */
import { FLOW_CATALOG } from "../src/lib/flows/catalog";
import { flowToOps } from "../src/lib/flows/toOps";
import { applyOps, emptyFlow } from "../src/lib/schema/ops";
import { validateFlow } from "../src/lib/schema/validate";
import { estimateUsd, type Usage } from "../src/lib/agent/cost";

let failures = 0;

for (const [id, seed] of Object.entries(FLOW_CATALOG)) {
  const direct = validateFlow(seed);
  if (!direct.ok) {
    failures++;
    console.error(`✗ ${id}: seed invalid — ${direct.errors.join("; ")}`);
    continue;
  }

  const rebuilt = applyOps(emptyFlow(id), flowToOps(seed));
  const roundTrip = validateFlow(rebuilt);
  if (!roundTrip.ok) {
    failures++;
    console.error(`✗ ${id}: op round-trip invalid — ${roundTrip.errors.join("; ")}`);
    continue;
  }

  const counts =
    rebuilt.nodes.length === seed.nodes.length &&
    rebuilt.edges.length === seed.edges.length &&
    (rebuilt.swimlanes?.length ?? 0) === (seed.swimlanes?.length ?? 0);
  if (!counts) {
    failures++;
    console.error(`✗ ${id}: op round-trip lost content`);
    continue;
  }
  console.log(
    `✓ ${id} — ${seed.nodes.length} nodes, ${seed.edges.length} edges, round-trip ok`,
  );
}

// Spend-safety: an unknown model must fail safe to a positive, conservative
// estimate so addSpend() always fires — otherwise a model-name drift silently
// disables the daily cap. Guards the cost.ts fix.
const SPEND_USAGE: Usage = { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 };
const fableEst = estimateUsd("claude-fable-5", SPEND_USAGE); // priciest known
const unknownEst = estimateUsd("totally-made-up-model", SPEND_USAGE);
if (typeof unknownEst === "number" && unknownEst > 0 && unknownEst >= fableEst) {
  console.log(
    `✓ spend-safety — unknown model estimates $${unknownEst} (>= priciest known $${fableEst}); cap stays armed`,
  );
} else {
  failures++;
  console.error(
    `✗ spend-safety — unknown model returned ${unknownEst} (expected >0 and >= ${fableEst}); DAILY CAP WOULD BE DISABLED`,
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll seeds valid, op-round-trip clean, spend-safety asserted.");
