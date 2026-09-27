/**
 * Turn a THROWN provider/SDK error into calm, on-brand copy a non-technical
 * tester can act on. Raw provider JSON must NEVER reach the chat — e.g. the
 * Anthropic SDK throws an APIError whose `.message` is the literal
 *   `400 {"type":"error","error":{"type":"invalid_request_error",
 *        "message":"You have reached your specified API usage limits.
 *        You will regain access on 2026-07-01 at 00:00 UTC."}}`
 * which is technical and alarming when shown verbatim.
 *
 * Spend caps / quota exhaustion (org usage limit, low credit balance,
 * insufficient_quota) map to calm "paused" copy — the phrase
 * "generation is paused" is what the client's looksPaused() keys on, so the
 * client flips the paused banner + template nudge and does NOT retry. A busy /
 * overloaded provider is transient (the client may retry once). Everything else
 * gets a reassuring generic line that still points at a way forward.
 *
 * Only thrown exceptions reach this — the deterministic mid-stream `error`
 * events (dropped-op, schema-repair failure) are emitted directly with their own
 * honest copy and never pass through here.
 */
export function friendlyProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const m = raw.toLowerCase();
  // Spend cap / quota exhausted / billing → live generation is unavailable, not
  // a transient glitch. Covers Anthropic ("usage limits", "regain access",
  // "credit balance") and OpenAI-compatible ("insufficient_quota", "quota").
  if (
    m.includes("usage limit") ||
    m.includes("regain access") ||
    m.includes("credit balance") ||
    m.includes("insufficient_quota") ||
    m.includes("exceeded your current quota") ||
    m.includes("quota") ||
    m.includes("billing")
  ) {
    return "Live generation is paused for now. The studio has hit its AI usage limit, and templates and saved flows still work, so please try again later.";
  }
  // Provider busy / overloaded / upstream rate limit → transient; calm + the
  // client treats a non-paused error as retryable.
  if (
    m.includes("overloaded") ||
    m.includes("rate limit") ||
    m.includes("rate_limit") ||
    m.includes("too many requests")
  ) {
    return "The studio is busy right now. Give it a moment and try again, or load a template to keep going.";
  }
  // Anything else (timeout, 5xx, malformed upstream) — never the raw text.
  return "The studio hit a snag generating that. Give it another try in a moment, or load a template to keep going.";
}
