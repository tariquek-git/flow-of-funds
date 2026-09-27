"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * "The AI is working, it's not stuck" affordance, shown only until the first
 * node lands. With incremental op emit (openai.ts) the first parties now paint a
 * few seconds in, so this card is brief; a big flow still keeps building live on
 * the canvas afterwards (chat carries its own elapsed timer). Three honest
 * signals cover the short blank window:
 *
 *  1. an ELAPSED COUNTER — the one cue that survives prefers-reduced-motion and
 *     can't be mistaken for a loop: numbers ticking up = definitely alive;
 *  2. ESCALATING, honest copy keyed to how long it's run, so a long wait reads
 *     as "big flow, still going" and never as "frozen";
 *  3. an indeterminate sweep bar (motion only) as the familiar "in progress" cue.
 *
 * Both surfaces mount only while a turn is in flight and unmount when it lands,
 * so the counter resets itself each generation with no external state.
 */

/** Seconds since this hook first mounted, ticking once a second. */
function useElapsedSeconds(): number {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return s;
}

export function formatElapsed(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Reassurance that escalates with the wait. Never claims a fixed ETA it can't
// keep; just sets expectation and, past the anxious minute mark, says plainly
// that a long wait is normal here.
function reassurance(s: number): string {
  if (s < 15) return "Mapping the rails. First parties land in a few seconds.";
  if (s < 40) return "Drawing every party and leg. Hang tight.";
  if (s < 75) return "Bigger flow, still working. It's not stuck.";
  return "A complex one. Still going, give it a moment.";
}

/** Tiny "0:14" counter for inline use (the chat thinking indicator). */
export function ElapsedTimer({ className }: { className?: string }) {
  const s = useElapsedSeconds();
  return (
    <span className={`tabular-nums ${className ?? ""}`} aria-hidden>
      {formatElapsed(s)}
    </span>
  );
}

/** The chat thinking indicator's ONE line: plain reassurance, tiered by
    elapsed time. The rotating-joke tier (ThinkingWhimsy) was cut in the
    Simple-first pass — on desktop it ran at the same time as the on-canvas
    card's own rotating wait copy, two different gag reels at once, which reads
    as the tool being clever at the user. Personality now lives in exactly one
    place (the canvas card's statusMessage rotation); the chat line just says
    what's happening. */
export function ThinkingLine({ className }: { className?: string }) {
  const s = useElapsedSeconds();
  return <span className={className}>{reassurance(s)}</span>;
}

/** The on-canvas generating card (shown while busy with nothing drawn yet). */
export function GenerationProgress({ statusMessage }: { statusMessage: string | null }) {
  const s = useElapsedSeconds();
  const reduce = usePrefersReducedMotion();
  return (
    <div className="flex max-w-[80vw] flex-col items-center gap-2.5 rounded-xl border border-[#e4dfd2] bg-white/95 px-5 py-4 text-center shadow-[0_8px_30px_rgba(28,28,28,0.08)]">
      <div className="flex items-center gap-2.5">
        <Loader2 size={16} className="animate-spin text-[#1c1c1c]" aria-hidden />
        <span className="text-[12.5px] font-medium text-[#1c1c1c]">
          {statusMessage ?? "Drawing your flow…"}
        </span>
        <span className="tabular-nums text-[12px] font-semibold text-[#C41E3A]" aria-hidden>
          {formatElapsed(s)}
        </span>
      </div>
      {!reduce && (
        <div className="h-[3px] w-44 overflow-hidden rounded-full bg-[#ede7da]" aria-hidden>
          <div className="fof-gen-sweep h-full w-2/5 rounded-full bg-[#C41E3A]/70" />
        </div>
      )}
      <span className="text-[10.5px] font-medium text-[#6b6b66]">{reassurance(s)}</span>
    </div>
  );
}
