/**
 * In-process concurrency gate — a simple semaphore that prevents too many
 * simultaneous agent runs from overwhelming the AI provider's rate limits.
 *
 * When the provider (DeepSeek, OpenAI, Claude) has a low concurrent-request
 * limit, 3+ parallel requests all fail with rate-limit errors, and serial
 * retries then also fail because the rate-limit window hasn't reset. A small
 * in-process gate smooths load without external infra.
 *
 * Default capacity: 2 concurrent runs. Override with FOF_AGENT_CONCURRENCY.
 * Set to 0 to disable (unlimited). Never blocks — excess requests get a calm
 * "busy" response immediately, same pattern as the per-IP rate limits.
 */

const DEFAULT_CONCURRENCY = 2;
const ENV_KEY = "FOF_AGENT_CONCURRENCY";

function capacity(): number {
  const v = Number(process.env[ENV_KEY]);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_CONCURRENCY;
  return Math.floor(v);
}

let active = 0;

/**
 * Try to acquire a slot. Returns `true` if a slot is available immediately,
 * or `false` if all slots are busy (caller should emit a "busy" response).
 * Non-blocking by design — keeps the route fast.
 */
export function tryAcquire(): boolean {
  const cap = capacity();
  // cap <= 0 disables the gate entirely.
  if (cap <= 0) return true;
  if (active < cap) {
    active++;
    return true;
  }
  return false;
}

/**
 * Release a slot. MUST be called in a finally block by every caller that
 * successfully acquired a slot.
 */
export function release(): void {
  if (active > 0) active--;
}

/**
 * How many slots are currently in use. Useful for observability.
 */
export function activeCount(): number {
  return active;
}

/**
 * Configured capacity. Useful for observability / status pages.
 */
export function maxCapacity(): number {
  return Math.max(0, capacity());
}
