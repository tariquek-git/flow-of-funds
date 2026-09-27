"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { RotateCw } from "lucide-react";
import { getCuesSnapshot, readEarlierCuesDone, subscribeCues } from "@/lib/state/cues";
import { useIsMobile } from "@/lib/state/useIsMobile";
import { useStudio } from "@/lib/state/store";

const PORTRAIT_QUERY = "(orientation: portrait)";

function subscribe(cb: () => void): () => void {
  let mq: MediaQueryList | null = null;
  try {
    mq = window.matchMedia(PORTRAIT_QUERY);
    mq.addEventListener("change", cb);
  } catch {
    // matchMedia unavailable — nothing to subscribe to.
  }
  return () => mq?.removeEventListener("change", cb);
}

function getSnapshot(): boolean {
  try {
    return window.matchMedia(PORTRAIT_QUERY).matches;
  } catch {
    return false;
  }
}

function usePortrait(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Gentle, one-time reminder to turn the phone sideways — the payment maps are
 * wide, so landscape gives them real room. Shows ONLY on a phone, in portrait,
 * once a flow is on the canvas. It clears itself the instant they rotate to
 * landscape (the action it's asking for), after a few seconds, or on dismiss —
 * and never nags again that session. Static (no motion) so it's reduced-motion
 * safe; the canvas already works in portrait, this is just a "there's more room"
 * tip, not a gate.
 */
export function RotateHint() {
  const isMobile = useIsMobile();
  const portrait = usePortrait();
  const hasFlow = useStudio((s) => !!s.flow);
  // Only relevant in the spatial Map view — the Steps list has nothing wide to
  // rotate for.
  const onMap = useStudio((s) => s.mobileView === "diagram");
  const [done, setDone] = useState(false);

  // Cue order: wait behind the first-run CanvasHint so this tilt tip doesn't pile
  // on top of it on a small-screen Map view. Read through the shared cues store
  // (SSR-safe; server = not done → never renders pre-hydration).
  useSyncExternalStore(subscribeCues, getCuesSnapshot, () => -1);
  const earlierCuesDone = useSyncExternalStore(
    subscribeCues,
    () => readEarlierCuesDone(),
    () => false,
  );

  // Rotating to landscape hides it automatically (portrait flips false). `done`
  // (set by the timer or the dismiss button — never synchronously in an effect)
  // keeps it from re-showing once it has run its course this session.
  const visible = isMobile && portrait && hasFlow && onMap && earlierCuesDone && !done;

  // Auto-clear after a few seconds so it never becomes permanent clutter.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setDone(true), 6500);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed left-1/2 top-[41%] z-50 -translate-x-1/2" role="status">
      <div className="flex items-center gap-2 rounded-full border border-[#e4dfd2] bg-white/95 px-3 py-1.5 text-[12px] font-medium text-[#1c1c1c] shadow-md backdrop-blur">
        <RotateCw size={13} className="shrink-0 text-[#1c1c1c]" aria-hidden />
        Rotate your phone for a wider view
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDone(true)}
          className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#8a857c] hover:bg-[#ede7da] hover:text-[#1c1c1c]"
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>
    </div>
  );
}
