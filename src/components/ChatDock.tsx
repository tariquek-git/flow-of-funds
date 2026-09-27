"use client";

import { useEffect, useRef, useState } from "react";
import { PanelLeftClose, X } from "lucide-react";
import { useStudio } from "@/lib/state/store";
import { FintechNorthMark } from "./FintechNorthMark";
import { renderText } from "./markdown";
import { ElapsedTimer, ThinkingLine } from "./GenerationProgress";
import { FlowRating } from "./FlowRating";
import { FlowQuality } from "./FlowQuality";
import { REBUILD_FOLLOWUP_ID, VERIFIED_FOLLOWUP_ID } from "@/lib/flows/seedMatch";
import { isMobileNow } from "@/lib/state/useIsMobile";
import { useDialogFocus } from "./useDialogFocus";

const chip =
  "fof-followup-chip rounded-full border border-[#e4dfd2] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#6b6b66] hover:border-[#C41E3A] hover:text-[#C41E3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50 disabled:opacity-40";

export function ChatDock({ onCollapse }: { onCollapse: () => void }) {
  const messages = useStudio((s) => s.messages);
  const followups = useStudio((s) => s.followups);
  const busy = useStudio((s) => s.busy);
  const flow = useStudio((s) => s.flow);
  const provider = useStudio((s) => s.provider);
  const paused = useStudio((s) => s.paused);
  const setPopover = useStudio((s) => s.setPopover);
  const send = useStudio((s) => s.send);
  const stop = useStudio((s) => s.stop);
  const rebuildFresh = useStudio((s) => s.rebuildFresh);
  const showVerified = useStudio((s) => s.showVerified);
  const verifiedSeedId = useStudio((s) => s.verifiedSeedId);
  const skipToVerified = useStudio((s) => s.skipToVerified);
  const clear = useStudio((s) => s.clear);
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  // On phones the dock is a full-width aria-modal sheet — manage focus like the
  // other modal surfaces (focus in, trap Tab, restore on close). Desktop keeps
  // it as a plain sidebar, no trap.
  useDialogFocus(sheetRef, true);

  // Mobile: keep the composer above the on-screen keyboard. interactiveWidget
  // (viewport export) resizes the layout viewport on Android — so window.innerHeight
  // shrinks and `overlap` stays ~0 there. On iOS Safari the layout viewport does
  // NOT shrink for the keyboard, so visualViewport reports the overlap and we lift
  // the fixed sheet by it. Using window.innerHeight makes the same formula correct
  // on both (no double-count).
  useEffect(() => {
    if (!isMobileNow()) return;
    const vv = window.visualViewport;
    const el = sheetRef.current; // the sheet node is stable for this mount
    if (!vv || !el) return;
    const apply = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      el.style.transform = overlap > 1 ? `translateY(${-overlap}px)` : "";
    };
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    apply();
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      el.style.transform = "";
    };
  }, []);

  // The in-flight assistant message (the last one while busy). Its "thinking"
  // indicator must stay visibly alive even AFTER prose has streamed — gpt-5
  // keeps reasoning while it draws, and a static phase line reads as frozen.
  const inFlightId = busy ? messages[messages.length - 1]?.id : undefined;

  // Autoscroll only while the user is pinned near the bottom. Long generations
  // stream chunks for 60-90s; if they've scrolled up to re-read, yanking them
  // back down on every chunk is hostile. The pin flag updates on every scroll
  // (including our own programmatic snap, which lands back at the bottom).
  const pinnedRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    void send(prompt);
  };

  return (
    <aside
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label="Ask or edit the payment brief"
      className="fixed inset-x-0 bottom-0 z-[45] flex h-[78dvh] max-h-[90dvh] flex-col rounded-t-2xl border-t border-[#e4dfd2] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(28,28,28,0.14)] md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-r-0 md:border-t-0 md:pb-0 md:shadow-[-8px_0_24px_rgba(28,28,28,0.10)]"
    >
      <header className="flex items-center justify-between border-b border-[#ede7da] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <FintechNorthMark size={18} className="text-[#1c1c1c]" />
          <span className="text-[13px] font-bold tracking-tight text-[#1c1c1c]">Flow of Funds</span>
          {provider && (
            <span
              className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                provider === "fixture"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-green-50/70 text-green-800/90"
              }`}
              title={
                provider === "fixture"
                  ? "Offline demo mode: composed from known patterns, no live AI right now"
                  : "Live generation"
              }
            >
              {provider === "fixture" ? "Offline demo" : "Live"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {confirmClear ? (
            <div className="flex items-center gap-1 rounded-lg border border-[#C41E3A]/30 bg-[#C41E3A]/10 px-1.5 py-1">
              <span className="text-[10.5px] font-semibold text-[#a11930]">Clear?</span>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setConfirmClear(false);
                }}
                className="fof-touch-target rounded-md bg-[#C41E3A] px-2 py-1 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                aria-label="Cancel clear"
                className="fof-touch-target grid h-6 w-6 place-items-center rounded-md text-[#a11930] hover:bg-[#C41E3A]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmClear(true);
                // Wide window so the armed state can't time out mid-decision
                // (the old 2.5s read as "nothing happened" to testers/users).
                setTimeout(() => setConfirmClear(false), 4500);
              }}
              disabled={busy}
              className="fof-touch-target rounded-md px-2 py-1 text-[11px] font-medium text-[#6b6b66] hover:bg-[#ede7da] hover:text-[#1c1c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40 disabled:opacity-40"
              title="Clear the canvas and conversation"
              aria-label="Start over, clear the canvas and conversation"
            >
              Start over
            </button>
          )}
          <button
            onClick={onCollapse}
            title="Hide chat"
            aria-label="Hide chat"
            className="fof-touch-target grid h-8 w-8 place-items-center rounded-md text-[#6b6b66] hover:bg-[#ede7da] hover:text-[#1c1c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-3 overflow-y-auto bg-[#fbf9f3] px-3.5 py-3.5"
      >
        {messages.map((m) => {
          // While this message is the in-flight turn, keep a LIVE indicator —
          // pulsing dots + a line that rotates every couple of seconds — visible
          // the whole time, even after the intro prose has streamed. gpt-5 keeps
          // reasoning while it draws the legs, so a static phase line ("Drawing
          // the flow…") reads as a freeze; the rotation makes it obviously alive.
          const streaming = m.id === inFlightId;
          return (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={`max-w-[94%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#1c1c1c] text-white"
                    : m.isError
                      ? "border border-[#C41E3A]/30 bg-[#C41E3A]/10 text-[#a11930] shadow-sm"
                      : "border border-[#e4dfd2] bg-white text-[#1c1c1c] shadow-sm"
                }`}
              >
                {m.text && renderText(m.text)}
                {streaming ? (
                  <>
                    <div
                      className={`flex items-center gap-2 text-[#6b6b66] ${m.text ? "mt-2" : ""}`}
                      role="status"
                      aria-label="Working on your flow"
                    >
                      <span className="inline-flex gap-1 text-[#8a857c]" aria-hidden>
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse [animation-delay:150ms]">●</span>
                        <span className="animate-pulse [animation-delay:300ms]">●</span>
                      </span>
                      {/* ONE rotating line, not two: whimsy for the common fast
                          case, honest escalating reassurance once a wait runs
                          long enough to need explaining. Was previously both at
                          once (plus the dots and timer already here) — four
                          concurrent "still alive" signals, redundant. */}
                      <ThinkingLine className="text-[11.5px] font-medium text-[#6b6b66]" />
                      <ElapsedTimer className="text-[11px] font-semibold text-[#C41E3A]" />
                    </div>
                    {/* Skip-the-wait escape: when the live draw's prompt maps to a
                        hand-audited seed, offer the instant version without ever
                        pre-empting the live-first default. Only shows for matched
                        prompts, mid-draw. */}
                    {verifiedSeedId && (
                      <button
                        onClick={skipToVerified}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#e4dfd2] bg-white px-2 py-1 text-[11px] font-medium text-[#6b6b66] transition-colors hover:border-[#C41E3A] hover:text-[#1c1c1c]"
                      >
                        Skip the wait, show the curated template
                      </button>
                    )}
                  </>
                ) : (
                  !m.text && <span className="text-[#6b6b66]">(interrupted)</span>
                )}
                {/* Settled meta (provider · model · usage) — only once the turn
                    has landed; while streaming the live indicator above stands in
                    for it, so the phase line never sits there looking frozen. */}
                {m.meta && !streaming && (
                  <div
                    className={`mt-1.5 border-t pt-1 text-[10px] ${
                      m.role === "user"
                        ? "border-white/20 text-white/55"
                        : "border-[#ede7da] text-[#6b6b66]"
                    }`}
                  >
                    {m.meta}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {flow && !busy && (
        <>
          <FlowQuality />
          <FlowRating key={flow.id} flowId={flow.id} flowTitle={flow.metadata.title ?? null} />
        </>
      )}

      {followups.length > 0 && !busy && (
        <div className="flex flex-wrap gap-1.5 border-t border-[#ede7da] px-3.5 py-2">
          {followups.map((f) => {
            // Two utility chips route to store actions, not send(f.prompt):
            // "rebuild it fresh" forces an AI generation of the original prompt,
            // and "show the audited version" loads the mapped seed to compare.
            // Both wear a muted neutral style, distinct from the red topic chips.
            const isRebuild = f.id === REBUILD_FOLLOWUP_ID;
            const isVerified = f.id === VERIFIED_FOLLOWUP_ID;
            const isUtility = isRebuild || isVerified;
            return (
              <button
                key={f.id}
                onClick={() =>
                  isRebuild ? rebuildFresh() : isVerified ? showVerified() : void send(f.prompt)
                }
                title={f.rationale ? `${f.prompt}, ${f.rationale}` : f.prompt}
                className={
                  isUtility
                    ? "fof-followup-chip max-w-full truncate rounded-full border border-[#e4dfd2] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#6b6b66] hover:border-[#e4dfd2] hover:text-[#1c1c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40"
                    : "fof-followup-chip max-w-full truncate rounded-full border border-[#e4dfd2] bg-[#f7ecec]/60 px-2.5 py-1 text-[10.5px] font-medium text-[#C41E3A] hover:border-[#C41E3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50"
                }
              >
                {isRebuild ? `↻ ${f.prompt}` : isVerified ? `✓ ${f.prompt}` : f.prompt}
              </button>
            );
          })}
        </div>
      )}

      {!flow && messages.length > 0 && !busy && (
        <div className="border-t border-[#ede7da] px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => setPopover("library")}
            className="fof-touch-target inline-flex items-center rounded-full bg-[#1c1c1c] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#a11930] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40"
          >
            Browse curated templates
          </button>
        </div>
      )}

      {/* Live-paused degradation: when generation can't run (provider quota
          exhausted, the daily AI budget cap was hit, or a provider outage) the
          studio is NOT broken — templates + click-to-edit work with no AI call.
          Show a calm, on-brand banner that says so and routes to the template
          library as the obvious next step. Cleared on the next good turn. */}
      {paused && !busy && (
        <div className="border-t border-amber-200 bg-amber-50/70 px-3.5 py-2.5">
          <p className="text-[11.5px] font-semibold leading-snug text-amber-900">
            Live generation is paused right now.
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-800/90">
            Templates and editing still work, no AI needed. Load a board-ready flow,
            then click any element to edit it.
          </p>
          <button
            onClick={() => setPopover("library")}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1c1c1c] px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#a11930]"
          >
            Browse templates →
          </button>
        </div>
      )}

      <div className="border-t border-[#e4dfd2] p-3">
        {/* Stable "what you can ask" menu. These are always-available core actions,
            distinct from the agent's CONTEXTUAL followups above. To avoid showing
            the same action twice (the chat used to stack a red "Critique this
            flow…" followup over a grey "Critique flow" quick-action), each entry
            hides itself when the current followups already cover it — deduped, not
            deleted: when the agent suggests nothing, the full menu stays, so no
            capability is ever hidden. */}
        {flow &&
          !busy &&
          (() => {
            const covered = (re: RegExp) =>
              followups.some((f) => re.test(f.prompt) || (f.rationale ? re.test(f.rationale) : false));
            const actions: { label: string; hide: boolean; run: () => void }[] = [
              {
                label: "Narrate flow",
                hide: covered(/narrat|walk .*through|end to end/i),
                run: () => void send("Walk me through this flow end to end.", "explain"),
              },
              {
                label: "Compliance lens",
                hide: covered(/complianc/i),
                run: () => void send("Render this through the compliance lens.", "critique"),
              },
              {
                label: "Explain simply",
                hide: covered(/explain|plain english|simpl/i),
                run: () =>
                  void send(
                    "Re-explain this whole flow in plain English for someone who has never worked in payments. Decode every acronym and piece of jargon the first time it appears (for example: ODFI is just the sender's bank, interchange is the fee the store's side pays, settlement is when the money actually moves between the banks). Keep it short and friendly, follow the money from start to finish, and don't change the diagram.",
                    "explain",
                  ),
              },
              {
                label: "What could go wrong?",
                hide: covered(/wrong|exception|chargeback|refund|return|dispute|failure/i),
                run: () =>
                  void send(
                    "What could go wrong here? Add the exception and failure paths that genuinely apply to this flow's rails, for example chargebacks and refunds on cards, ACH returns and NSF on ACH debits, recall requests on wires, or the relevant dispute path. Keep everything already drawn and just add the exception legs, labelled clearly, then say one short line naming what you added.",
                    "edit",
                  ),
              },
            ];
            const visible = actions.filter((a) => !a.hide);
            if (!visible.length) return null;
            return (
              <div className="mb-2">
                <p className="mb-1 text-[10px] font-medium text-[#6b6b66]">
                  Or ask for more, in your own words or a tap
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visible.map((a) => (
                    <button key={a.label} onClick={a.run} className={chip}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        <div className="flex gap-2">
          <textarea
            id="fof-composer"
            aria-label="Describe or edit a payments scenario"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Just tell it: “show the messaging”, “simplify”, “add a chargeback”, “why the FBO?”…"
            className="flex-1 resize-none rounded-lg border border-[#e4dfd2] bg-white px-3 py-2 text-[12.5px] text-[#1c1c1c] placeholder:text-[#6b6b66] focus:border-[#C41E3A] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/50 max-md:text-[16px]"
          />
          <button
            onClick={busy ? stop : submit}
            disabled={!busy && !input.trim()}
            title={busy ? "Stop, in-flight AI changes are rolled back" : undefined}
            className={`fof-touch-target self-end rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 ${
              busy ? "bg-[#C41E3A] hover:bg-[#a11930]" : "bg-[#1c1c1c] hover:bg-[#a11930]"
            }`}
          >
            {busy ? "Stop" : "Send"}
          </button>
        </div>
        {provider === "fixture" ? (
          // Offline demo questions may still be logged. Keep the disclosure at
          // the point of entry, in the same plain language as the live-AI path.
          <p className="mt-1.5 text-center text-[10px] leading-snug text-[#6b6b66]">
            Offline demo mode uses known patterns and may log questions to improve the tool. Do not
            enter private, client, or confidential information.{" "}
            <a href="/privacy" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
              Why?
            </a>
          </p>
        ) : (
          // Honest disclosure at the point of entry: custom questions use a paid
          // service and may be retained for product improvement. Static text,
          // reduced-motion safe, and consistent with /privacy.
          <p className="mt-1.5 text-center text-[10px] leading-snug text-[#6b6b66]">
            Custom questions use a paid AI service and may be logged to improve the tool. Do not
            enter private, client, or confidential information.{" "}
            <a href="/privacy" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
              Why?
            </a>
          </p>
        )}
      </div>
    </aside>
  );
}
