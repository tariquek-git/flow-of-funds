"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MousePointerClick, X } from "lucide-react";
import { useStudio } from "@/lib/state/store";
import {
  getCuesSnapshot,
  notifyCues,
  readWelcomeSeen,
  subscribeCues,
} from "@/lib/state/cues";

/**
 * One-time discoverability nudge. Nothing on the canvas signals that nodes and
 * edges are clickable/editable — only a returning user knows. The first time a
 * flow finishes rendering for a given browser, we surface a single calm hint and
 * then never show it again (dismissal is persisted in localStorage).
 *
 * Placement: bottom-center, clear of the title chip (top-left), the control
 * cluster (top-right), the provenance badge (bottom-center, lower), the legend
 * (bottom-left), and the feedback button (bottom-right). It auto-dismisses once
 * the user actually selects something (they have found the affordance), and on
 * an explicit close.
 */
const DISMISS_KEY = "fof-native-edit-hint-dismissed-v1";

/**
 * Tiny external store for the dismissed flag, so the component can read it
 * synchronously (via useSyncExternalStore — SSR-safe, no setState-in-effect)
 * and re-render the instant it is dismissed in this tab. The localStorage read
 * is the source of truth; this just makes "dismissed" reactive within the
 * session.
 */
let dismissedTick = 0;
const listeners = new Set<() => void>();
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Storage blocked (private mode / policy): treat as not-yet-dismissed so the
    // hint still helps; it just won't persist across reloads.
    return false;
  }
}
function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // best-effort
  }
  dismissedTick += 1;
  listeners.forEach((l) => l());
  // Hand the turn to the next sequenced cue (the lens cue) the instant this one
  // is retired.
  notifyCues();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
// Snapshot is a cheap primitive (a tick) so the store stays referentially
// stable; the actual boolean is read in the component from readDismissed().
function getSnapshot() {
  return dismissedTick;
}

export function CanvasHint() {
  const flow = useStudio((s) => s.flow);
  const busy = useStudio((s) => s.busy);
  const selected = useStudio((s) => s.selected);
  const [armed, setArmed] = useState(false);

  // SSR-safe: server snapshot is "not dismissed, not mounted" so nothing renders
  // server-side; on the client this reflects the persisted flag and any in-tab
  // dismissal. Re-subscribing on dismissedTick re-reads localStorage.
  useSyncExternalStore(subscribe, getSnapshot, () => -1);
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(),
    () => true, // server: treat as dismissed so the hint never flashes pre-hydration
  );

  // Cue order: this hint waits its turn behind the WelcomeOverlay. Read the
  // welcome-seen flag through the shared cues store (SSR-safe; server = "seen"
  // so nothing flashes pre-hydration) so the pill can't co-occur with the modal
  // and arms the moment the welcome is dismissed.
  useSyncExternalStore(subscribeCues, getCuesSnapshot, () => -1);
  const welcomeSeen = useSyncExternalStore(
    subscribeCues,
    () => readWelcomeSeen(),
    () => true,
  );

  // Arm the hint a beat after the first real flow has settled (not mid-stream),
  // letting the assembly animation finish so the hint doesn't fight the draw-in.
  // Hold until the welcome has been seen so only one cue is on screen at a time.
  const hasFlow = !!flow?.nodes.length;
  useEffect(() => {
    if (dismissed || !welcomeSeen || !hasFlow || busy) {
      return;
    }
    const t = setTimeout(() => setArmed(true), 900);
    return () => clearTimeout(t);
  }, [dismissed, welcomeSeen, hasFlow, busy]);

  // The moment the user selects a node or edge, they have found the affordance —
  // retire the hint for good. Selecting is an external event (a click), so
  // reacting to it here is a legitimate effect, not a render-derived setState.
  useEffect(() => {
    if (selected && armed && !dismissed) markDismissed();
  }, [selected, armed, dismissed]);

  if (dismissed || !armed || !welcomeSeen) return null;

  // Just the pill — the shared bottom-center stack in Studio (CanvasBottomStack)
  // owns positioning and stacks this transient nudge ABOVE the persistent
  // provenance badge with an automatic gap, so the two can never overlap.
  return (
    <div className="fof-hint-in pointer-events-auto flex max-w-[min(92vw,26rem)] items-center gap-2.5 rounded-full border border-[#e4dfd2] bg-white/95 py-1.5 pl-3 pr-1.5 text-slate-700 shadow-[0_6px_24px_rgba(28,28,28,0.10)] backdrop-blur-sm">
      <MousePointerClick size={15} className="shrink-0 text-[#1c1c1c]" aria-hidden />
      <p className="text-[11.5px] font-medium leading-snug text-slate-700">
        Click any party or leg to edit it
        <span className="ml-1.5 hidden text-slate-500 sm:inline">
          · press 1 / 2 / 3 for detail level
        </span>
      </p>
      <button
        onClick={markDismissed}
        aria-label="Dismiss hint"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-[#ede7da] hover:text-slate-700"
      >
        <X size={13} />
      </button>
    </div>
  );
}
