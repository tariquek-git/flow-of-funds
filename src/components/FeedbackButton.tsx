"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { getSessionId, useStudio } from "@/lib/state/store";
import { track } from "@/lib/analytics";

// Beta feedback affordance. The product's whole value is payments accuracy, so
// the most important thing to capture is "this looks wrong" — with enough
// context (current flow + last prompt) to act on it. Posts to /api/feedback
// (gated, rate-limited, logged). Self-contained; no store mutations.

const SENTIMENTS = [
  { key: "wrong", label: "Looks wrong" },
  { key: "confusing", label: "Confusing" },
  { key: "love", label: "Love it" },
] as const;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    setError("");
    const { flow, messages, detail } = useStudio.getState();
    const lastPrompt = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentiment,
          message: message.trim(),
          flowTitle: flow?.metadata.title ?? null,
          flowId: flow?.id ?? null,
          // Session id (join key to the conversation log) + the actual diagram
          // snapshot, so the note is traceable to exactly what they were seeing.
          sessionId: getSessionId(),
          flow: flow ?? null,
          lastPrompt,
          detail,
          path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Couldn't send, try again.");
      }
      track("feedback_sent", { sentiment: sentiment ?? "none" });
      setStatus("done");
      setMessage("");
      setSentiment(null);
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1700);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Couldn't send, try again.");
    }
  };

  return (
    <div className="absolute z-30 flex flex-col items-end gap-2 bottom-3 right-14 md:bottom-16 md:right-4">
      {open && (
        <div className="max-h-[calc(100dvh-6rem)] w-72 overflow-y-auto rounded-xl border border-[#e4dfd2] bg-white p-3 shadow-[0_10px_36px_rgba(28,28,28,0.12)]">
          {status === "done" ? (
            <p className="py-5 text-center text-sm text-[#6b6b66]">Thanks, that really helps. 🙏</p>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1c1c1c]">Feedback very welcome</span>
                <button
                  type="button"
                  aria-label="Close feedback"
                  onClick={() => setOpen(false)}
                  className="text-[#8a857c] transition-colors hover:text-[#1c1c1c]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 text-[10.5px] leading-snug text-[#6b6b66]">
                Any feedback is good, tell us what&rsquo;s wrong, confusing, or working well.
              </p>
              <div className="mb-2 flex flex-wrap gap-1">
                {SENTIMENTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSentiment(sentiment === s.key ? null : s.key)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                      sentiment === s.key
                        ? "border-[#1c1c1c] bg-[#1c1c1c] text-white"
                        : "border-[#e4dfd2] text-[#6b6b66] hover:border-[#c8c0ac]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="What's off, confusing, or great? Diagrams are illustrative, not advice."
                className="w-full resize-none rounded-lg border border-[#e4dfd2] p-2 text-sm text-[#1c1c1c] outline-none transition-colors focus:border-[#C41E3A] focus:ring-2 focus:ring-[#C41E3A]/20"
              />
              {error && <p className="mt-1 text-[11px] text-[#C41E3A]">{error}</p>}
              <p className="mt-1.5 text-[10px] leading-snug text-[#6b6b66]">
                Sends your note plus the current diagram and your last prompt as context, nothing else.
              </p>
              <button
                type="button"
                onClick={submit}
                disabled={!message.trim() || status === "sending"}
                className="mt-2 w-full rounded-lg bg-[#1c1c1c] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#a11930] disabled:opacity-40"
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
              <p className="mt-2 text-center text-[10.5px] leading-snug text-[#6b6b66]">
                Prefer email?{" "}
                <a
                  href="mailto:hello@fintechnorth.ca?subject=Flow%20of%20Funds%20feedback"
                  className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
                >
                  hello@fintechnorth.ca
                </a>
              </p>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Feedback"
        className="fof-touch-target flex items-center gap-1.5 rounded-full border border-[#e4dfd2] bg-white/90 px-3 py-1.5 text-xs font-medium text-[#6b6b66] shadow-sm backdrop-blur transition-colors hover:border-[#c8c0ac] hover:text-[#1c1c1c]"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {/* Label hidden on phones: the floating pill collapses to an icon so it
            clears the centered provenance warning + the zoom controls in the
            crowded mobile bottom gutter. Full label returns at md+. */}
        <span className="hidden md:inline">Feedback</span>
      </button>
    </div>
  );
}
