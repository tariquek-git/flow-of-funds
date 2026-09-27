"use client";

import { edgeColor, edgeInFocus, legendCategory, orderedVisibleEdges } from "@/lib/diagram/layout";
import { useStudio } from "@/lib/state/store";

/**
 * Mobile-native reading mode: the flow as a vertical, scrollable list of legs
 * (ordered by `ordinal`) instead of the wide spatial swimlane. No React Flow, no
 * dagre, no fit math — it reads top-to-bottom the way a phone wants, so the most
 * common "tapped a shared link on my phone" case is legible instantly. Tapping a
 * leg selects it (the ElementEditor opens as a bottom sheet), so editing still
 * works; the spatial canvas is one tap away via the Map/Steps toggle.
 *
 * Shares visibleEdges() with the swimlane layout for the detail dial. The lens
 * (story) and legend category are focus+context, matching the canvas: they NEVER
 * drop a leg here — every detail-appropriate leg is listed, and the ones outside
 * the active focus render visually de-emphasized rather than disappearing.
 */
const CATEGORY_LABEL: Record<string, string> = {
  auth: "Auth / clearing",
  settlement: "Settlement / funding",
  fee: "Fees / interchange",
  refund: "Refund / chargeback",
  message: "Messages / recon",
};

export function StepView() {
  const flow = useStudio((s) => s.flow);
  const detail = useStudio((s) => s.detail);
  const edgeFilter = useStudio((s) => s.edgeFilter);
  const lens = useStudio((s) => s.lens);
  const selected = useStudio((s) => s.selected);
  const select = useStudio((s) => s.select);
  if (!flow) return null;

  const nodeLabel = (id: string) => flow.nodes.find((n) => n.id === id)?.label ?? id;
  // The ONE reading order (story order at Simple, ordinal order above), shared
  // with the canvas chips and the walkthrough via orderedVisibleEdges. The lens
  // + legend category are focus+context, never a removal, matching the canvas:
  // legs outside the active focus stay listed but de-emphasize (edgeInFocus).
  const legs = orderedVisibleEdges(flow, detail);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#f4f0e6] px-3 pb-28 pt-20">
      <div className="mx-auto max-w-md">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b6b66]">
          Flow of Funds · Fintech North
        </p>
        <h1 className="text-[18px] font-bold leading-tight text-[#1c1c1c]">{flow.metadata.title}</h1>
        <p className="mb-4 mt-1 text-[12px] text-[#6b6b66]">
          {legs.length} step{legs.length === 1 ? "" : "s"} · tap one to edit
        </p>
        {legs.length === 0 ? (
          <p className="rounded-xl border border-[#e4dfd2] bg-white px-3 py-5 text-center text-[13px] text-[#6b6b66]">
            No legs at this detail level, bump the detail up, or switch to Map.
          </p>
        ) : (
          <ol className="space-y-2">
            {legs.map((e, i) => {
              const color = edgeColor(e.type);
              const cat = legendCategory(e.type);
              const isSel = selected?.kind === "edge" && selected.id === e.id;
              // Focus+context: a leg outside the active lens / legend focus reads
              // as faint context (de-emphasized, not the primary tap target),
              // never dropped — matching the canvas. A selected leg stays bright.
              const focused = edgeInFocus(e, lens, edgeFilter) || isSel;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => select({ kind: "edge", id: e.id })}
                    className={`flex w-full items-start gap-3 rounded-xl border bg-white px-3 py-3 text-left transition-colors ${
                      isSel ? "border-[#1c1c1c] ring-1 ring-[#1c1c1c]/30" : "border-[#e4dfd2]"
                    } ${focused ? "" : "opacity-40"}`}
                  >
                    <span
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {/* Positional, not e.ordinal: the list is the visible set
                          sorted by ordinal, so numbers always read 1..k even when
                          Simple thins the legs — matching the StoryStrip cards, which
                          number the same set positionally. */}
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold leading-tight text-[#1c1c1c]">
                        {nodeLabel(e.source)} <span className="text-[#8a857c]">→</span>{" "}
                        {nodeLabel(e.target)}
                      </span>
                      {e.label && (
                        <span className="mt-0.5 block text-[12px] font-medium leading-snug text-[#6b6b66]">
                          {e.label}
                        </span>
                      )}
                      {e.description && (
                        // The plain-English sentence for this numbered leg, so the
                        // list reads as a described walkthrough ("leg 2 settles the
                        // USD into the receiver's account"), not just labels. Tied
                        // to the ordinal badge above. Requested feedback, 2026-07-08.
                        <span className="mt-1 block text-[12px] leading-snug text-[#4a4740]">
                          {e.description}
                        </span>
                      )}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] text-[#6b6b66]">
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold"
                          style={{ backgroundColor: `${color}1a`, color }}
                        >
                          {CATEGORY_LABEL[cat] ?? cat}
                        </span>
                        {e.rail && <span>{e.rail}</span>}
                        {e.timing && <span>· {e.timing}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
