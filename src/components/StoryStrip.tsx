"use client";

import { orderedVisibleEdges } from "@/lib/diagram/layout";
import type { FoFEdge } from "@/lib/schema/flow";
import { useStudio } from "@/lib/state/store";

/**
 * Simple, as a SENTENCE, not a graph. The default (overview) view renders the
 * money story as a plain horizontal strip of numbered steps — no React Flow,
 * no dagre, no layout special-casing. Reading order comes from
 * orderedVisibleEdges (story order along the money path), the same order the
 * mobile StepView uses, so the two surfaces can never disagree. Parties the
 * money never touches sit in a captioned row underneath.
 *
 * The strip is self-narrating (each card carries the step's plain-English
 * description), which is why the guided walkthrough only exists at
 * Detailed/Expert, where the spatial graph actually needs narrating.
 *
 * While a generation is DRAWING, Studio shows the live canvas instead — you
 * watch the full diagram assemble, then it settles into this strip. Tapping a
 * card or a party pill selects it (the ElementEditor opens), same as the
 * canvas. The exhibit export captures [data-fof-story-strip] directly.
 */
export function StoryStrip() {
  const flow = useStudio((s) => s.flow);
  const selected = useStudio((s) => s.selected);
  const select = useStudio((s) => s.select);
  if (!flow) return null;

  const steps = orderedVisibleEdges(flow, "overview");
  const inStory = new Set(steps.flatMap((e) => [e.source, e.target]));
  const skipped = flow.nodes.filter((n) => !inStory.has(n.id));
  const partyLabel = (id: string) => flow.nodes.find((n) => n.id === id)?.label ?? id;
  const isException = (e: FoFEdge) => e.type === "refund" || e.type === "chargeback";

  return (
    <div className="absolute inset-0 flex overflow-auto bg-transparent">
      <div data-fof-story-strip className="m-auto flex flex-col gap-8 px-10 py-8">
        <ol aria-label="Money steps, in order" className="flex items-stretch gap-0">
          {steps.map((e, i) => (
            <li key={e.id} className="flex items-center">
              <button
                type="button"
                onClick={() => select({ kind: "edge", id: e.id })}
                aria-pressed={selected?.kind === "edge" && selected.id === e.id}
                title={e.description || e.label || undefined}
                className={`w-[220px] rounded-xl border bg-white px-3.5 py-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/50 ${
                  selected?.kind === "edge" && selected.id === e.id
                    ? "border-[#1c1c1c] ring-1 ring-[#1c1c1c]/30"
                    : "border-[#e4dfd2]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums text-white"
                    style={{ background: isException(e) ? "#C41E3A" : "#1c1c1c" }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 text-[13px] font-semibold leading-tight">
                    {partyLabel(e.source)} <span className="text-[#8a857c]">→</span>{" "}
                    {partyLabel(e.target)}
                  </span>
                  {isException(e) && (
                    <span className="sr-only">
                      {e.type === "chargeback" ? "chargeback" : "refund"} step
                    </span>
                  )}
                </span>
                {e.label && (
                  <span className="mt-1.5 block text-[11.5px] font-medium leading-snug text-[#6b6b66]">
                    {e.label}
                  </span>
                )}
                {e.description && (
                  // No `block` alongside line-clamp: the clamp IS a display mode
                  // (-webkit-box) and display:block silently defeats it.
                  <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#4a4740]">
                    {e.description}
                  </span>
                )}
                {/* Settlement timing: the one fact a plain-English list of steps
                    reliably gets wrong, and the product's whole point (what feels
                    instant vs when the money actually lands). It is already on
                    ~all edges and was rendered nowhere. One muted line, no colour,
                    no glyph, no legend. */}
                {e.timing && (
                  <span className="mt-1.5 block text-[10.5px] font-medium tabular-nums text-[#8a857c]">
                    {e.timing}
                  </span>
                )}
              </button>
              {/* Draw the arrow ONLY where the money actually continues. An
                  unconditional arrow claimed a connection between every pair of
                  cards, which is false wherever the story branches, fans, or is
                  genuinely two separate movements (a card purchase and the
                  interbank settlement behind it are not one continuous hop).
                  A break renders as a plain gap of the same footprint. */}
              {i < steps.length - 1 &&
                (steps[i].target === steps[i + 1].source ? (
                  <span aria-hidden className="px-2 text-[18px] font-semibold text-[#8a857c]">
                    →
                  </span>
                ) : (
                  <span className="px-2" role="separator" aria-label="separate step">
                    <span aria-hidden className="block h-6 w-px bg-[#e4dfd2]" />
                  </span>
                ))}
            </li>
          ))}
          {steps.length === 0 && (
            <li className="rounded-xl border border-[#e4dfd2] bg-white px-4 py-3 text-[12.5px] text-[#6b6b66]">
              No money movement to show here yet. Switch to Detailed for the full flow.
            </li>
          )}
        </ol>

        {skipped.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* A statement of fact about THIS view, not a verdict on the party.
                The old uppercase "Not part of the money path" read as an
                assertion that (before anchorEndpoints) was printed over the
                cardholder and the employer — the people whose money it is. */}
            <p className="text-[10.5px] font-medium text-[#8a857c]">
              No money moves through these at this level. Switch to Detailed for the full flow.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {skipped.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => select({ kind: "node", id: n.id })}
                  aria-pressed={selected?.kind === "node" && selected.id === n.id}
                  title="No money moves through here in this view. Switch to Detailed for the full flow."
                  className={`rounded-full border bg-white px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-[#c8c0ac] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/50 ${
                    selected?.kind === "node" && selected.id === n.id
                      ? "border-[#1c1c1c] text-[#1c1c1c]"
                      : "border-[#e4dfd2] text-[#8a857c]"
                  } ${n.type === "endpoint" ? "text-[#4a4740]" : ""}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
