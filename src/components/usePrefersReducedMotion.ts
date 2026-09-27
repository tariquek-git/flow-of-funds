"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared prefers-reduced-motion hook. SSR-safe: returns false on the server
 * snapshot, then the live media-query match once mounted, and re-renders on
 * change. Used by both the FlowConstellation and the landing's dynamic prompts
 * so every animated surface honours the same setting from one source.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
