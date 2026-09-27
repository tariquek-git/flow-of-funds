import { nanoid } from "nanoid";
import { validateFlow } from "@/lib/schema/validate";
import type { FlowOfFunds } from "@/lib/schema/flow";

/**
 * "My flows": named save slots, persisted on the device (localStorage). Slots are
 * keyed by flow title — saving again under the same title updates that slot,
 * a different title creates a new one. The title chip is the rename control.
 *
 * localStorage so saves SURVIVE across visits (close the tab, come back tomorrow,
 * your flows are still there). The tool spends real AI money to draw these, so a
 * durable home is the activation→retention fix (360-review prod-2). Originally
 * sessionStorage to keep saves from leaking to the next person behind a SHARED
 * PASSPHRASE — moot now the front door is public/ungated. On a shared device a
 * user can wipe one slot via per-slot Delete, or every slot at once via the
 * library's "Clear all" control (see deleteMyFlow / clearMyFlows).
 */

export type SavedFlow = { slotId: string; flow: FlowOfFunds; savedAt: string };

const KEY = "fof-native-myflows-v1";
export const MAX_SLOTS = 30;

export function readMyFlows(): SavedFlow[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate every slot — a stale or hand-edited entry must not be able to
    // crash the library grid. Invalid slots are dropped, valid ones survive.
    const slots: SavedFlow[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const result = validateFlow((item as SavedFlow).flow);
      if (!result.ok) continue;
      slots.push({
        slotId: typeof item.slotId === "string" && item.slotId ? item.slotId : nanoid(8),
        flow: result.flow,
        savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
      });
    }
    return slots.slice(0, MAX_SLOTS);
  } catch {
    return [];
  }
}

export function writeMyFlows(slots: SavedFlow[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(slots));
    return true;
  } catch {
    // Storage full or unavailable — caller decides how to tell the user.
    return false;
  }
}

/** Wipe every saved slot from this device — the library's "Clear all" control. */
export function clearMyFlows(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/** Same trimmed title (case-insensitive) → same slot. */
export function upsertSlot(
  slots: SavedFlow[],
  flow: FlowOfFunds,
): { slots: SavedFlow[]; updated: boolean } | { full: true } {
  const title = flow.metadata.title.trim().toLowerCase();
  const existing = slots.findIndex(
    (s) => s.flow.metadata.title.trim().toLowerCase() === title,
  );
  const savedAt = new Date().toISOString();
  if (existing >= 0) {
    const next = slots.slice();
    next[existing] = { ...next[existing], flow, savedAt };
    return { slots: next, updated: true };
  }
  if (slots.length >= MAX_SLOTS) return { full: true };
  // Newest first — the flow you just saved is the one you'll reach for.
  return { slots: [{ slotId: nanoid(8), flow, savedAt }, ...slots], updated: false };
}
