/**
 * Default model ids + env-var resolution, single-sourced.
 *
 * The default model for each provider/tier — and the env var that overrides it —
 * was previously duplicated literal-by-literal across openai.ts, claude.ts, and
 * scope.ts. That let a tier swap or a typo'd env-var name silently drift ONE call
 * site onto a different model than the rest (e.g. scope.ts classifying on a
 * different light model than the one actually generating). These resolvers are the
 * ONE place the (env var → default) mapping lives.
 *
 * Deliberately NOT here: the cost table (cost.ts) and the Claude thinking-
 * capability map (claude.ts). Those are per-model REGISTRIES keyed by id — "what
 * does model X cost / support", not "which model do we default to". Folding them in
 * would conflate two different concerns.
 *
 * Functions, not consts, so a caller that mutates process.env between invocations
 * (tests) sees the change; in production env is fixed at boot, so this is free.
 */

// Default to gpt-4.1-mini for BOTH tiers: it is the model the whole agentic loop
// (MAX_ROUNDS, per-round token cap, prompt shape in openai.ts) is tuned for, and
// the one the live/dev config actually sets. A 2026-07 head-to-head smoke
// (scripts/eval:live) confirmed it: gpt-4.1-mini drew 3/3 core flows schema-valid,
// while gpt-5-mini at low effort regressed (a Visa flow with no money edge, wire
// dropping ops) at equal cost and higher latency, because it is a REASONING model
// and this loop is tuned for non-reasoning tool emission. The old defaults were
// gpt-4o / gpt-4o-mini; gpt-4o costs ~6x gpt-4.1-mini on input, so a deploy that
// lost its OPENAI_MODEL env var silently jumped onto the pricier model. Keeping
// the default equal to the tuned/blessed model removes that footgun. Override per
// deploy via OPENAI_MODEL / OPENAI_MODEL_LIGHT (add a PRICING row in cost.ts too).
export function openaiHeavyModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}
export function openaiLightModel(): string {
  return process.env.OPENAI_MODEL_LIGHT ?? "gpt-4.1-mini";
}
export function claudeHeavyModel(): string {
  return process.env.AI_MODEL ?? "claude-opus-4-8";
}
export function claudeLightModel(): string {
  return process.env.AI_MODEL_LIGHT ?? "claude-haiku-4-5";
}
export function deepseekHeavyModel(): string {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
}
export function deepseekLightModel(): string {
  return process.env.DEEPSEEK_MODEL_LIGHT ?? "deepseek-v4-flash";
}
