/**
 * One-time first-run cues, taking turns.
 *
 * Four light nudges can fire on a true first run — the WelcomeOverlay modal, the
 * CanvasHint pill, the lens cue, and (on phones) the DesktopNudge. Shown all at
 * once they stack and read like a tutorial. The owner's philosophy is in-context
 * cues, not a manual: the right whisper at the right moment. So they take turns,
 * only one on screen at a time, in order:
 *
 *   WelcomeOverlay (if unseen) → CanvasHint → lens cue
 *
 * This module is the shared, SSR-safe truth each cue reads to know whether the
 * earlier cues are done. localStorage is the source of truth (so the sequence
 * survives reloads); a single tick + listener set makes the flags reactive
 * within the tab so a later cue appears the instant the one before it is
 * dismissed — read via useSyncExternalStore (no setState-in-effect). Each cue
 * still owns its own WRITE (markSeen / markDismissed / markLensCueDone); those
 * writers call notifyCues() after persisting so every subscriber re-reads.
 *
 * Keys mirror the per-component constants verbatim — this is a read mirror, not
 * a second source of truth.
 */
import { isMobileNow, MOBILE_MEDIA_QUERY } from "./useIsMobile";

export const WELCOME_SEEN_KEY = "fof-native-welcome-seen-v1";
export const EDIT_HINT_DISMISSED_KEY = "fof-native-edit-hint-dismissed-v1";

let cuesTick = 0;
const listeners = new Set<() => void>();

/** Bump after any cue flag is written so all subscribers re-read localStorage. */
export function notifyCues() {
  cuesTick += 1;
  listeners.forEach((l) => l());
}

export function subscribeCues(cb: () => void) {
  listeners.add(cb);
  // readWelcomeSeen() is viewport-aware (mobile skips the welcome), so a
  // desktop↔mobile resize must re-evaluate the gate too — subscribe to the same
  // media query as the rest of the app.
  let mq: MediaQueryList | null = null;
  try {
    mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    mq.addEventListener("change", cb);
  } catch {
    // matchMedia unavailable — nothing extra to subscribe to.
  }
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
  };
}

/** Cheap, referentially-stable snapshot (a tick); the booleans are read below. */
export function getCuesSnapshot() {
  return cuesTick;
}

/**
 * Has the first-run welcome been seen/dismissed? Storage blocked (private mode)
 * counts as seen — matches WelcomeOverlay's own fallback so a later cue isn't
 * held back forever when the welcome can't persist. On a phone the welcome never
 * renders at all (WelcomeOverlay self-gates off mobile — the DesktopNudge carries
 * the first-run message there), so it's treated as already past; otherwise the
 * later cues would wait forever for a modal that can't appear.
 */
export function readWelcomeSeen(): boolean {
  if (isMobileNow()) return true;
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * Has the click-to-edit CanvasHint been dismissed (closed, or retired once the
 * user selected something)? Storage blocked counts as dismissed so the lens cue
 * can still take its turn.
 */
export function readEditHintDismissed(): boolean {
  try {
    return localStorage.getItem(EDIT_HINT_DISMISSED_KEY) === "1";
  } catch {
    return true;
  }
}

/** The lens cue (and DesktopNudge) may only speak once the welcome AND the
 *  CanvasHint have had their turn. Single predicate so every consumer agrees. */
export function readEarlierCuesDone(): boolean {
  return readWelcomeSeen() && readEditHintDismissed();
}
