"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { getSessionId, useStudio } from "@/lib/state/store";
import { track } from "@/lib/analytics";

/**
 * One-tap quality signal on the flow that's on screen: "does this look right?"
 * 👍 / 👎. The product's whole value is payments accuracy, so the highest-signal
 * thing to capture per result is whether the diagram looks right to the viewer.
 *
 * Reuses the existing /api/feedback sink (gated, rate-limited, logged + persisted
 * to Supabase). The rating fires immediately (fire-and-forget) so the signal is
 * never lost; we then offer an INLINE optional note ("what's off?") so the
 * elaboration lands in the same place instead of sending people hunting for the
 * separate Feedback button. Every submission also carries the SESSION id (the
 * join key to the conversation log) and a snapshot of the FLOW being rated, so a
 * rating is traceable to the exact diagram in /admin — even if no conversation
 * row exists. Mounted keyed by flow id (see ChatDock) so it re-asks once per flow.
 */
export function FlowRating({ flowId, flowTitle }: { flowId: string; flowTitle: string | null }) {
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [note, setNote] = useState("");
  const [noteSent, setNoteSent] = useState(false);
  const detail = useStudio((s) => s.detail);

  // One post path for both the bare rating and the optional follow-up note. The
  // flow snapshot + session id make the entry self-contained and linkable.
  const post = (sentiment: "up" | "down", message: string) => {
    const { flow, messages } = useStudio.getState();
    const lastPrompt = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentiment,
        message,
        flowTitle,
        flowId,
        detail,
        sessionId: getSessionId(),
        flow: flow ?? null,
        lastPrompt,
        path: typeof window !== "undefined" ? window.location.pathname : null,
      }),
    }).catch(() => {});
  };

  const rate = (sentiment: "up" | "down") => {
    if (rated) return;
    setRated(sentiment); // optimistic — one rating per flow, never blocks
    track("flow_rated", { sentiment });
    // Capture the signal right away so it's never lost if they skip the note.
    post(sentiment, sentiment === "up" ? "Rated 👍 · looks right" : "Rated 👎 · looks off");
  };

  const sendNote = () => {
    const text = note.trim();
    if (!text || !rated || noteSent) return;
    setNoteSent(true);
    track("flow_rated_note", { sentiment: rated });
    // A second, linked entry (same session + flow) carrying the "why".
    post(rated, text);
    setNote("");
  };

  if (rated) {
    return (
      <div className="space-y-2 border-t border-[#ede7da] px-3.5 py-2.5">
        <p className="text-[11px] text-[#6b6b66]">Thanks, that helps. 🙏</p>
        {noteSent ? (
          <p className="text-[11px] text-[#c9962f]">Got the detail, thank you. 🙏</p>
        ) : (
          <div className="flex items-start gap-1.5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendNote();
              }}
              rows={2}
              aria-label={rated === "down" ? "What looks off?" : "Anything to add?"}
              placeholder={
                rated === "down" ? "What looks off? (optional)" : "Anything to add? (optional)"
              }
              className="flex-1 resize-none rounded-lg border border-[#e4dfd2] p-1.5 text-[12px] text-slate-800 outline-none transition-colors focus:border-[#C41E3A] focus:ring-2 focus:ring-[#C41E3A]/20"
            />
            <button
              type="button"
              onClick={sendNote}
              disabled={!note.trim()}
              className="fof-touch-target shrink-0 rounded-lg bg-[#1c1c1c] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#a11930] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-[#ede7da] px-3.5 py-2">
      <span className="text-[11px] font-medium text-[#6b6b66]">Does this flow look right?</span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => rate("up")}
          aria-label="Looks right"
          title="Looks right"
          className="fof-touch-target grid h-7 w-7 place-items-center rounded-full border border-[#e4dfd2] text-[#6b6b66] transition-colors hover:border-[#c9962f] hover:bg-[#c9962f]/10 hover:text-[#c9962f]"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => rate("down")}
          aria-label="Looks off"
          title="Looks off"
          className="fof-touch-target grid h-7 w-7 place-items-center rounded-full border border-[#e4dfd2] text-[#6b6b66] transition-colors hover:border-[#C41E3A] hover:bg-[#f7ecec] hover:text-[#C41E3A]"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
