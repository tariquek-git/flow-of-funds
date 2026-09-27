/**
 * Rough per-run cost estimate so spend is visible in the server logs and the
 * /admin System tab without external math. Prices are per 1M tokens. This is an
 * ESTIMATE for eyeballing only — the OpenAI dashboard (Usage) is the source of
 * truth for billing, and is where the hard spend ceiling should also be set.
 *
 * Two things make a naive estimate diverge from the real bill, both handled in
 * estimateUsd below: (1) most of our prompt is CACHED (the system prompt + KB
 * are stable across a session) and OpenAI bills cached input at ~0.1x; (2)
 * OpenAI's usage.prompt_tokens already INCLUDES the cached tokens, so the cached
 * portion must be billed once (at the cache rate), not twice. Skipping these
 * over-counts a mostly-cached run by ~10x — on top of any missing-price drift.
 */
export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

// model -> [inputPerM, outputPerM, cacheHitInputPerM?] in USD
const PRICING: Record<string, [number, number, number?]> = {
  // Anthropic — kept for completeness; not the live provider. Per 1M tokens.
  "claude-opus-4-8": [5, 25],
  "claude-opus-4-7": [5, 25],
  "claude-opus-4-6": [5, 25],
  "claude-fable-5": [10, 50],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-4-5": [1, 5],
  // OpenAI — the sole live provider (via openai.ts + scope.ts). Standard-tier
  // list prices per 1M tokens, verified against the OpenAI pricing page
  // (Jun 2026). The live/dev config runs gpt-4.1-mini for BOTH the HEAVY
  // (generate/edit/critique) and LIGHT (explain + scope classifier) tiers; the
  // code default when OPENAI_MODEL / OPENAI_MODEL_LIGHT are unset is now the same
  // gpt-4.1-mini. Cached input bills at ~0.1x for the gpt-5 family (applied in
  // estimateUsd); OpenAI does not bill cache writes.
  // IMPORTANT: whatever OPENAI_MODEL / OPENAI_MODEL_LIGHT are set to MUST have a
  // row here — a missing row silently falls back to the priciest known rate and
  // grossly over-estimates spend (this is exactly what happened when gpt-5-mini
  // shipped without a row). Add the row in the same change as the model swap.
  "gpt-5": [1.25, 10],
  "gpt-5-mini": [0.25, 2.0],
  "gpt-5-nano": [0.05, 0.4],
  "gpt-4.1": [2.0, 8.0],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1-nano": [0.1, 0.4],
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  // DeepSeek — optional OpenAI-compatible fallback. Pricing per official
  // DeepSeek API docs (Jun 2026): V4 Pro as quality fallback, Flash for light
  // prose/classification. Cache-hit pricing is dramatically lower than miss.
  "deepseek-v4-pro": [0.435, 0.87, 0.003625],
  "deepseek-v4-flash": [0.14, 0.28, 0.0028],
};

// Fail-safe rates for an UNKNOWN model name. AI_MODEL / AI_MODEL_LIGHT are free
// env overrides, so a rename or a newly-released model can drift out of PRICING.
// If that drift produced a null/0 estimate the caller would skip addSpend() and
// the daily cap would silently stop counting — i.e. the spend kill-switch turns
// itself off exactly when the model is unrecognized. So price the unknown model
// at the MOST EXPENSIVE known rates (currently Fable 5) and warn loudly. This
// over-counts rather than under-counts: the cap trips early, never never.
const FALLBACK_PRICING: [number, number] = Object.values(PRICING).reduce<[number, number]>(
  (max, [inM, outM]) => [Math.max(max[0], inM), Math.max(max[1], outM)],
  [0, 0],
);

// Only warn once per unknown model name so a hot path can't flood the logs.
const warnedModels = new Set<string>();

/**
 * Estimated USD for one run. NEVER returns null: an unknown model falls back to
 * the most expensive known rates (and warns once) so spend is ALWAYS recorded
 * and the daily cap can never be silently disabled by a model-name drift.
 */
export function estimateUsd(model: string, u: Usage): number {
  let price = PRICING[model];
  if (!price) {
    price = FALLBACK_PRICING;
    if (!warnedModels.has(model)) {
      warnedModels.add(model);
      console.warn(
        `[cost] unknown model "${model}" — no price in PRICING; estimating at the ` +
          `most expensive known rates ($${price[0]}/$${price[1]} per 1M in/out) so spend ` +
          `is still tracked toward the daily cap. Add it to PRICING in src/lib/agent/cost.ts.`,
      );
    }
  }
  const [inM, outM, cacheHitInM] = price;
  // OpenAI and DeepSeek report usage.prompt_tokens as the TOTAL prompt INCLUDING
  // cached tokens, so the cached portion must be billed once (at the cache-hit
  // rate below), not again at the full input rate. Anthropic reports input as
  // uncached-only, so don't subtract there. Clamp at 0 for safety.
  const separatesCacheRead = /^(gpt-|o[0-9]|chatgpt|deepseek-)/i.test(model) || cacheHitInM != null;
  const fullInput = separatesCacheRead ? Math.max(0, u.input - u.cacheRead) : u.input;
  const cacheReadRate = cacheHitInM ?? inM * 0.1;
  const usd =
    (fullInput * inM +
      u.cacheRead * cacheReadRate +
      u.cacheWrite * inM * 1.25 +
      u.output * outM) /
    1_000_000;
  // 4 dp. On gpt-5-mini a generate runs a few agentic rounds over a mostly-
  // cached prompt, so it lands around $0.006–0.03; an edit less; explain ~$0.001.
  return Math.round(usd * 10000) / 10000;
}
