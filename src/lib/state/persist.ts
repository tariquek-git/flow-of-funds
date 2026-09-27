import { useStudio } from "./store";
import { readMyFlows } from "@/lib/flows/myflows";
import { normalizeFlowStructure } from "@/lib/schema/normalize";
import { validateFlow } from "@/lib/schema/validate";
import type { ChatMessage } from "./store";
import {
  detailForReaderMode,
  readerModeFromDetail,
  type DetailLevel,
  type ReaderMode,
  type ViewMode,
} from "./store";

/**
 * Session persistence: the current flow + conversation survive a reload WITHIN
 * the same tab, but never carry across sessions or between people.
 *
 * Stored in sessionStorage (per-tab), deliberately NOT localStorage: a mid-work
 * refresh in the same tab is preserved, but a new tab, a fresh visit, or the
 * next person on a shared-passphrase link / shared device opens CLEAN at the
 * launch screen with no prior flow or chat. localStorage would have hydrated the
 * previous person's flow + conversation for whoever loaded the page next — a
 * privacy leak. "Start over" still wipes it.
 */

const KEY = "fof-native-session-v1";

type Persisted = {
  flow: unknown;
  messages: ChatMessage[];
  readerMode?: ReaderMode;
  /** Legacy field retained for one migration window. */
  detail?: DetailLevel;
  viewMode: ViewMode;
  provider: "claude" | "fixture" | "openai" | "deepseek" | null;
  savedAt: string;
};

let timer: ReturnType<typeof setTimeout> | null = null;

/** Call once on the client after mount. Returns an unsubscribe. */
export function startSessionPersistence(): () => void {
  // Hydrate "My flows" save slots (stored under their own key; saves are
  // written explicitly by the store actions, not by the debounced loop below).
  useStudio.setState({ myFlows: readMyFlows() });

  // Restore (per-tab only — see KEY note: a fresh visit / new tab / next person
  // gets an empty sessionStorage and therefore a clean launch screen).
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Persisted;
      const result = validateFlow(data.flow);
      const messages = (Array.isArray(data.messages) ? data.messages : []).map((m, i, all) =>
        m.role === "assistant" && !m.text && i === all.length - 1
          ? { ...m, text: "(interrupted by reload)" }
          : m,
      );
      // Prefer the new public mode. A legacy snapshot migrates overview→Story
      // and standard/full→System; invalid or missing legacy values default to
      // Story. Detail remains an internal density derived from that mode.
      const readerMode: ReaderMode = (["story", "system"] as ReaderMode[]).includes(
        data.readerMode as ReaderMode,
      )
        ? (data.readerMode as ReaderMode)
        : readerModeFromDetail(data.detail);
      const detail = detailForReaderMode(readerMode);
      // Same whitelist guard as `detail`: a stale/tampered snapshot can't smuggle
      // an unknown view mode past the type system into the canvas.
      const restoredViewMode: ViewMode = (["map", "lanes", "timeline"] as ViewMode[]).includes(
        data.viewMode,
      )
        ? data.viewMode
        : "map";
      // Same invariant setReaderMode enforces: Story is always the map. A legacy
      // snapshot can carry overview+lanes, a state the UI cannot explain.
      const viewMode: ViewMode = readerMode === "story" ? "map" : restoredViewMode;
      if (result.ok || messages.length) {
        useStudio.setState({
          // Same determinism pass as every other flow entry point (loadFlow,
          // seeds, agent finalize): a pre-deploy snapshot can carry model-order
          // lanes / sparse ordinals that must not survive the reload.
          flow: result.ok ? normalizeFlowStructure(result.flow) : null,
          messages,
          readerMode,
          detail,
          viewMode,
          provider: data.provider ?? null,
          followups: result.ok ? (result.flow.suggestedFollowups ?? []) : [],
        });
      }
    }
  } catch {
    // Corrupt or incompatible snapshot — start clean.
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // sessionStorage unavailable — nothing to clean.
    }
  }

  // Persist (debounced) on every relevant change.
  const unsubscribe = useStudio.subscribe((state) => {
    if (state.busy) return; // persist settled states only
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (!state.flow && state.messages.length === 0) {
          sessionStorage.removeItem(KEY);
          return;
        }
        const snapshot: Persisted = {
          flow: state.flow,
          messages: state.messages.slice(-40),
          readerMode: state.readerMode,
          // Keep writing the normalized density during the migration so a
          // pre-ReaderMode client can still recover the same session safely.
          detail: state.detail,
          viewMode: state.viewMode,
          provider: state.provider,
          savedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(KEY, JSON.stringify(snapshot));
      } catch {
        // Storage full or unavailable — persistence is best-effort.
      }
    }, 600);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
