/**
 * Streamed-prose helpers. Kept dependency-free (no store/client imports) so the
 * unit test harness can import it without pulling browser-only modules.
 *
 * appendAssistantDelta: append a streamed assistant text delta to the running
 * message, repairing the one ugly artifact of raw delta concatenation — a
 * sentence-boundary GLUE where the model's prose was split across two emitted
 * deltas and the space between them was lost (e.g. "…path." + "The…" →
 * "path.The"; or a new agentic round's prose joined onto the previous round's on
 * the Claude path, which — unlike the OpenAI path — emits no inter-round separator).
 *
 * Conservative + markdown-safe by design: inserts a SINGLE space ONLY at a clear
 * sentence end — a `.`/`!`/`?` whose preceding char is a LOWERCASE letter (so
 * initialisms like "U.S." are never split), immediately followed by an UPPERCASE
 * letter — and never touches a boundary that already has whitespace on either
 * side. It never inserts between arbitrary letters or digits, so rail names
 * ("FedNow") and numbers are left exactly as the model wrote them.
 */
export function appendAssistantDelta(prev: string, delta: string): string {
  if (!prev || !delta) return prev + delta;
  const a = prev[prev.length - 1];
  const b = delta[0];
  if (/\s/.test(a) || /\s/.test(b)) return prev + delta; // the model's own spacing wins
  const prevPrev = prev[prev.length - 2] ?? "";
  if (/[.!?]/.test(a) && /[a-z]/.test(prevPrev) && /[A-Z]/.test(b)) {
    return `${prev} ${delta}`;
  }
  return prev + delta;
}
