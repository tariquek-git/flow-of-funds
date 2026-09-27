"use client";

import { useSyncExternalStore } from "react";
import { Monitor, X } from "lucide-react";
import { readEarlierCuesDone, subscribeCues } from "@/lib/state/cues";
import { MOBILE_MEDIA_QUERY } from "@/lib/state/useIsMobile";
import { useStudio } from "@/lib/state/store";

/**
 * Gentle "best on a desktop" nudge for phone / small-screen visitors. Flow of
 * Funds renders wide, multi-party payment maps that are genuinely cramped on a
 * phone — this sets expectations kindly rather than blocking anyone. It is a
 * soft, dismissible card (NOT a modal or a hard gate): mobile still works, it's
 * just roomier on a laptop. Shown once per browser on small / coarse-pointer
 * viewports; dismissal persists in localStorage so it never nags a returning
 * visitor. On mobile this replaces the first-run WelcomeOverlay (which is
 * keyboard-centric and so largely moot on a phone — see WelcomeOverlay).
 *
 * Visibility is read through useSyncExternalStore (mirrors WelcomeOverlay): the
 * server snapshot is always false so it never flashes pre-hydration, and the
 * client snapshot derives from the viewport + the localStorage flag.
 */
const SEEN_KEY = "fof-native-desktop-nudge-seen-v1";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  let mq: MediaQueryList | null = null;
  try {
    mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    mq.addEventListener("change", cb);
  } catch {
    // matchMedia unavailable — nothing to subscribe to.
  }
  // Also re-evaluate when an earlier cue is dismissed: this nudge waits behind
  // the CanvasHint so the two don't stack on a small-screen Map view.
  const offCues = subscribeCues(cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
    offCues();
  };
}

// Show only when we're on a small/coarse viewport, it hasn't been dismissed, AND
// the earlier first-run cue (the CanvasHint) has had its turn — so only one cue
// is on screen at a time. Storage blocked (private mode) counts as "seen" so it
// can't nag every load.
function getSnapshot(): boolean {
  let seen = true;
  try {
    seen = localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    seen = true;
  }
  if (seen) return false;
  if (!readEarlierCuesDone()) return false;
  try {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // best-effort
  }
  listeners.forEach((l) => l());
}

export function DesktopNudge() {
  const show = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false, // server: never render, so it can't flash pre-hydration
  );
  // The pinch/pan/"wide one" advice is about the spatial Map — pointless in the
  // Steps reading view (the mobile default). Only nudge once they're on the Map.
  const onMap = useStudio((s) => s.mobileView === "diagram");

  if (!show || !onMap) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="fof-desktop-nudge-title"
      className="fof-hint-in fixed inset-x-3 bottom-3 z-[51] mx-auto max-w-md rounded-2xl border border-[#e4dfd2] bg-white/95 p-4 shadow-[0_18px_50px_rgba(28,28,28,0.18)] backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ede7da] text-[#1c1c1c]">
          <Monitor size={16} aria-hidden />
        </div>
        <div className="min-w-0">
          <p id="fof-desktop-nudge-title" className="text-[13.5px] font-semibold text-[#1c1c1c]">
            Nicer on a bigger screen
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#6b6b66]">
            These payment maps really open up on a laptop. They work fine on your phone too, just
            pinch to zoom and drag to pan (the +/&minus; controls sit bottom-right).{" "}
            {/* Orientation-aware: don't tell a landscape phone to "turn sideways" (it already is),
                and don't duplicate RotateHint's tilt nudge there. Portrait keeps the tilt tip. */}
            <span className="landscape:hidden">Turn your phone sideways for a bit more room.</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={markSeen}
          className="-mr-1 -mt-1 ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#8a857c] transition-colors hover:bg-[#ede7da] hover:text-[#1c1c1c]"
        >
          <X size={15} />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={markSeen}
          className="rounded-lg bg-[#1c1c1c] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#a11930]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
