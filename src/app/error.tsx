"use client";

import { useEffect } from "react";
import { useStudio } from "@/lib/state/store";
import { TowelMark } from "@/components/TowelMark";

/** Route-segment error boundary. Catches a render/runtime throw anywhere under
 *  the studio and replaces a white-screen-of-death with a banker-grade recovery
 *  card in the same quiet boardroom language as the gate. Two ways out:
 *  - Try again: Next's reset() re-renders the segment in place (cheapest path).
 *  - Start over: wipe the live session (the store's clear() also stashes the
 *    outgoing flow under fof-native-session-prev so nothing is truly lost), then
 *    reset — so a poisoned flow/message in state can't immediately re-throw.
 *  Motion is opt-in via CSS only; the global prefers-reduced-motion block in
 *  globals.css neutralizes every animation/transition, so this card is
 *  reduced-motion-safe with no extra JS. */
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface to the console for local debugging / Vercel runtime logs; we never
  // render the raw message to the user (it can leak internals and reads as a
  // crash, not a recoverable state).
  useEffect(() => {
    console.error("Studio error boundary:", error);
  }, [error]);

  const startOver = () => {
    try {
      useStudio.getState().clear();
    } catch {
      // If the store itself is the casualty, fall through to reset() anyway.
    }
    reset();
  };

  return (
    <main className="flex h-dvh w-full items-center justify-center px-4">
      <div className="w-[min(420px,calc(100vw-32px))]">
        <div className="mb-5 flex flex-col items-center text-center">
          <TowelMark size={28} className="mb-2" />
          <h1 className="text-[22px] font-bold tracking-tight text-[#1c1c1c]">Don&rsquo;t Panic.</h1>
          <p className="mt-1 text-[12px] font-medium text-[#6b6b66]">
            Something interrupted the studio
          </p>
        </div>
        <div className="rounded-2xl border border-[#e4dfd2] bg-white p-5 shadow-[0_8px_30px_rgba(28,28,28,0.08)]">
          <p className="text-[13px] leading-relaxed text-[#6b6b66]">
            The diagram studio hit an unexpected error and stopped (these things happen at the
            edge of the known galaxy). Your work is saved locally, so grab a towel and pick up
            where you left off, or start a fresh session.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => reset()}
              className="rounded-lg bg-[#C41E3A] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a11930]"
            >
              Try again
            </button>
            <button
              onClick={startOver}
              className="rounded-lg border border-[#e4dfd2] bg-white px-3.5 py-2 text-xs font-semibold text-[#6b6b66] transition-colors hover:bg-[#ede7da]"
            >
              Start over
            </button>
          </div>
          {error.digest && (
            <p className="mt-3 font-mono text-[10px] text-[#8a857c]">Reference: {error.digest}</p>
          )}
        </div>
      </div>
    </main>
  );
}
