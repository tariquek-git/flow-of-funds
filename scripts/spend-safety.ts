/**
 * Spend-safety asserts (no AI spend) — guards the two correctness fixes in
 * src/lib/agent/cost.ts and src/lib/agent/claude.ts:
 *
 *  1. estimateUsd NEVER returns null/0 for an unknown model — an unrecognized
 *     AI_MODEL must fail safe to the most-expensive known rates so addSpend()
 *     always fires and the daily cap can't be silently disabled by a drift.
 *  2. The unknown-model estimate is >= the cheapest known model's estimate for
 *     the same usage (conservative HIGH, never under-counted).
 *
 * Exits non-zero on any failed assertion so it gates in CI / `pnpm eval`.
 */
import { estimateUsd, type Usage } from "../src/lib/agent/cost";

let failures = 0;
const ok = (name: string) => console.log(`  ✓ ${name}`);
const bad = (name: string, detail: string) => {
  failures += 1;
  console.error(`  ✗ ${name} — ${detail}`);
};

const U: Usage = { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 };

// 1. Known models price as before (regression guard on the table).
const opus = estimateUsd("claude-opus-4-8", U); // (5 + 25) = 30
if (opus === 30) ok("estimateUsd known model (opus-4-8) = $30 for 1M+1M");
else bad("estimateUsd known model", `expected 30, got ${opus}`);

const haiku = estimateUsd("claude-haiku-4-5", U); // (1 + 5) = 6
if (haiku === 6) ok("estimateUsd known model (haiku-4-5) = $6 for 1M+1M");
else bad("estimateUsd known light model", `expected 6, got ${haiku}`);

// 2. THE fix: unknown model must NOT be null/0 — it must record spend.
const unknown = estimateUsd("totally-made-up-model-name", U);
if (typeof unknown === "number" && unknown > 0) {
  ok(`estimateUsd unknown model > 0 (got $${unknown}) — spend still tracked`);
} else {
  bad("estimateUsd unknown model", `expected a positive number, got ${unknown} — DAILY CAP WOULD BE DISABLED`);
}

// 3. Unknown model fails safe HIGH: >= the most expensive known model.
const fable = estimateUsd("claude-fable-5", U); // (10 + 50) = 60, the priciest
if (unknown >= fable) ok(`estimateUsd unknown ($${unknown}) >= most expensive known ($${fable})`);
else bad("estimateUsd unknown not conservative", `unknown ${unknown} < fable ${fable}`);

// 4. Empty usage is 0 (so addSpend's <=0 guard skips a no-token run cleanly).
const zero = estimateUsd("totally-made-up-model-name", { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
if (zero === 0) ok("estimateUsd zero usage = 0 (clean no-op)");
else bad("estimateUsd zero usage", `expected 0, got ${zero}`);

if (failures) {
  console.error(`\nspend-safety: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nspend-safety: all asserts passed.");
