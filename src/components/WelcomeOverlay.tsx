"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Info, MessageSquare, X } from "lucide-react";
import { useStudio } from "@/lib/state/store";
import { notifyCues } from "@/lib/state/cues";
import { MOBILE_MEDIA_QUERY } from "@/lib/state/useIsMobile";
import { useDialogFocus } from "./useDialogFocus";

/**
 * First-run welcome. Shown once per browser the first time someone lands in the
 * studio after unlocking, so a newcomer immediately understands what this is,
 * how to start, and that feedback is welcome. Dismissal is persisted in
 * localStorage and the card never reappears.
 *
 * Built to match the existing CanvasHint dismissal pattern: localStorage is the
 * source of truth, read synchronously via useSyncExternalStore (SSR-safe, no
 * setState-in-effect) so it never flashes pre-hydration. Motion comes from the
 * shared `.fof-hint-in` keyframe, which the global prefers-reduced-motion block
 * in globals.css collapses to an instant appearance.
 *
 * It does NOT duplicate the full Help content — it orients the user and points
 * at the Help (Info) button, which carries the guide, methodology, sources, and
 * feedback detail.
 */
const SEEN_KEY = "fof-native-welcome-seen-v1";

let seenTick = 0;
const listeners = new Set<() => void>();

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage blocked (private mode / policy): treat as seen so the welcome
    // can't pop up on every reload when it can't persist a dismissal.
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // best-effort
  }
  seenTick += 1;
  listeners.forEach((l) => l());
  // Let the sequenced cues (CanvasHint → lens cue) know the welcome is done so
  // the next one can take its turn.
  notifyCues();
}
/** External suppression for a glossary "See it move" deep link: the reader is
 *  arriving AT a loaded diagram, so the first-run card must not stack on top of
 *  the landing. Same markSeen path as a dismissal (the busy/launched effect
 *  below would catch it anyway, but only after a visible flash). */
export function markWelcomeSeen() {
  markSeen();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return seenTick;
}

export function WelcomeOverlay() {
  const setPopover = useStudio((s) => s.setPopover);
  const busy = useStudio((s) => s.busy);
  const flow = useStudio((s) => s.flow);
  const messageCount = useStudio((s) => s.messages.length);

  // Re-read localStorage whenever it's dismissed in this tab.
  useSyncExternalStore(subscribe, getSnapshot, () => -1);
  const seen = useSyncExternalStore(
    subscribe,
    () => readSeen(),
    () => true, // server: treat as seen so the card never flashes pre-hydration
  );

  // On phones the DesktopNudge carries the message instead — this welcome is
  // keyboard-centric (1/2/3, ⌘K) and so largely moot there. Read synchronously
  // (client-only; the server snapshot already renders null) so there's no flash.
  const onMobile =
    typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches;

  const launched = !!flow || messageCount > 0;

  // Modal focus: move focus into the card while it's up, trap Tab, restore on
  // dismissal (shared with the other aria-modal surfaces).
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, !seen && !onMobile && !busy && !launched);

  useEffect(() => {
    // Never let the first-run card cover the first payoff moment. If a flow is
    // loading, restored, or already on-canvas, silently mark the welcome done so
    // the diagram and live progress stay unobstructed.
    if (!seen && !onMobile && (busy || launched)) markSeen();
  }, [busy, launched, onMobile, seen]);

  const shown = !seen && !onMobile && !busy && !launched;
  // Escape dismisses the card, the universal modal expectation. The global
  // Escape handler in Studio only clears selection/popovers, not this overlay,
  // so wire it here while the card is actually up. markSeen is module-stable.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") markSeen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown]);

  if (!shown) return null;

  const openHelp = () => {
    markSeen();
    setPopover("info");
  };

  return (
    <div className="fixed inset-0 z-[52] flex items-center justify-center p-4">
      {/* Scrim: dismiss on click-away, but a deliberate Got it / Show me around
          is the primary path. */}
      <button
        type="button"
        aria-label="Dismiss welcome"
        onClick={markSeen}
        className="absolute inset-0 bg-[#1c1c1c]/15 backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fof-welcome-title"
        className="fof-hint-in relative w-[min(440px,calc(100vw-32px))] rounded-2xl border border-[#e4dfd2] bg-white p-5 shadow-[0_18px_50px_rgba(28,28,28,0.18)]"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={markSeen}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-[#8a857c] transition-colors hover:bg-[#ede7da] hover:text-[#1c1c1c]"
        >
          <X size={15} />
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b6b66]">
          Welcome
        </p>
        <h2
          id="fof-welcome-title"
          className="mt-1 text-[19px] font-bold tracking-tight text-[#1c1c1c]"
        >
          Flow of Funds
          <span className="ml-1.5 text-[12px] font-medium text-[#6b6b66]">by Fintech North</span>
        </h2>

        <p className="mt-3 text-[13px] leading-relaxed text-[#1c1c1c]">
          Describe a payment in plain English and Flow of Funds shows the money moving, step by
          step. Add rails, timing, fees and exceptions when you want them.
        </p>

        <p className="mt-3.5 text-[12px] leading-relaxed text-[#6b6b66]">
          A hobby project for the community from Fintech North, shared as a public preview. Feedback
          very welcome, use the{" "}
          <span className="inline-flex items-center gap-0.5 font-medium text-[#6b6b66]">
            <MessageSquare size={12} className="inline" aria-hidden /> Feedback
          </span>{" "}
          button or{" "}
          <a
            href="mailto:hello@fintechnorth.ca?subject=Flow%20of%20Funds%20feedback"
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            hello@fintechnorth.ca
          </a>
          .
        </p>

        {/* Data-visibility heads-up. This is a learning preview and the operator
            keeps + reads what's typed, so a first-time visitor should know before
            they type. Kept warm and first-person to match the register, but explicit
            (no jokey "state secrets" wink). Mirrors /privacy and the footer line. */}
        <p className="mt-3 rounded-lg border border-[#e4dfd2] bg-[#fbf9f3] px-3 py-2 text-[11.5px] leading-relaxed text-[#6b6b66]">
          One honest heads-up: this is a learning preview, so I keep and read what people type here.
          It&rsquo;s how I learn what people try and make it better. Please stick to payment
          scenarios and skip anything private or confidential.{" "}
          <a
            href="/privacy"
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            What&rsquo;s kept
          </a>
          .
        </p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={openHelp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4dfd2] px-3 py-1.5 text-[12px] font-semibold text-[#6b6b66] transition-colors hover:bg-[#ede7da] hover:text-[#1c1c1c]"
          >
            <Info size={13} aria-hidden />
            More in Help
          </button>
          <button
            type="button"
            onClick={markSeen}
            className="rounded-lg bg-[#1c1c1c] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#a11930]"
          >
            Got it
          </button>
        </div>

        <p className="mt-3 text-center text-[10.5px] text-[#6b6b66]">
          You can reopen this anytime from the{" "}
          <Info size={11} className="inline align-[-1px] text-[#6b6b66]" aria-hidden /> Help button.
        </p>
      </div>
    </div>
  );
}
