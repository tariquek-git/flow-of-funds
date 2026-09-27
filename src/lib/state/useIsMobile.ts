import { useSyncExternalStore } from "react";

/**
 * Single source of truth for "are we on a phone-sized viewport". The
 * DesktopNudge, WelcomeOverlay, the canvas fit, RotateHint, and the store's
 * detail/legend defaults all branch on this one signal.
 *
 * "Mobile" = small in EITHER dimension: narrow (Tailwind's `md`, 768px → portrait
 * phones) OR short (max-height 500px → a phone in LANDSCAPE, so rotating gives a
 * genuinely full-width diagram with no desktop chrome instead of the sidebar
 * layout). The 500px height ceiling excludes tablets (768px+ tall even in
 * landscape) and normal desktops, so it doesn't reintroduce the coarse-tablet
 * "half-mobile chrome" the old `coarse <=1024px` form caused. Touch-target sizing
 * is separate — it keys off `(pointer: coarse)` directly in globals.css.
 */
export const MOBILE_MEDIA_QUERY = "(max-width: 767.98px), (max-height: 500px)";

/**
 * Non-hook check for code that runs OUTSIDE React (the zustand store, which sets
 * mobile-aware defaults for `detail` and `legendOpen`). SSR-safe: returns false
 * when matchMedia is unavailable.
 */
export function isMobileNow(): boolean {
  try {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  let mq: MediaQueryList | null = null;
  try {
    mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    mq.addEventListener("change", cb);
  } catch {
    // matchMedia unavailable — nothing to subscribe to.
  }
  return () => mq?.removeEventListener("change", cb);
}

/**
 * Reactive viewport check for components. The server snapshot is false so the
 * desktop layout renders first and never flashes the mobile shell pre-hydration.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileNow, () => false);
}
