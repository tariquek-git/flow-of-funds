"use client";

import { useMemo, useRef, useState } from "react";
import { BookmarkPlus, Trash2, X } from "lucide-react";
import { layoutFlow } from "@/lib/diagram/layout";
import {
  CATEGORY_ORDER,
  filterEntries,
  type LibraryFilter,
} from "@/lib/flows/library";
import type { SavedFlow } from "@/lib/flows/myflows";
import type { FlowOfFunds } from "@/lib/schema/flow";
import { useStudio } from "@/lib/state/store";
import { RailChip } from "./BrandMark";
import { useDialogFocus } from "./useDialogFocus";

const TYPE_COLORS: Record<string, string> = {
  endpoint: "#1c1c1c",
  institution: "#8a5a14",
  intermediary: "#c9962f",
  treasury: "#C41E3A",
};

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "CA", label: "Canada" },
  { id: "US", label: "US" },
  { id: "EU", label: "Europe" },
  { id: "GB", label: "UK" },
  { id: "IN", label: "India" },
  { id: "BR", label: "Brazil" },
  { id: "cross", label: "Cross-border" },
];

type ThumbShapes = {
  lines: { x1: number; y1: number; x2: number; y2: number; color: string; dash: boolean }[];
  boxes: { x: number; y: number; color: string }[];
};
// Catalog flows are immutable module constants — lay each out once. Saved
// flows change between saves, so their cache key embeds savedAt.
const thumbCache = new Map<string, ThumbShapes>();

/** Tiny static preview rendered straight from the seed's own layout. */
function Thumb({ id, flow }: { id: string; flow: FlowOfFunds }) {
  const shapes = useMemo(() => {
    const cached = thumbCache.get(id);
    if (cached) return cached;
    const { nodes } = layoutFlow(flow, "standard");
    const parties = nodes.filter((n) => n.type === "fofNode");
    const pos = new Map(parties.map((n) => [n.id, n.position]));
    const xs = parties.map((n) => n.position.x);
    const ys = parties.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX + 224;
    const h = Math.max(...ys) - minY + 96;
    const sx = (x: number) => ((x - minX) / w) * 204 + 8;
    const sy = (y: number) => ((y - minY) / (h || 1)) * 86 + 8;
    const computed: ThumbShapes = {
      lines: flow.edges
        .map((e) => {
          const s = pos.get(e.source);
          const t = pos.get(e.target);
          if (!s || !t) return null;
          const money = ["settlement", "funding", "transfer"].includes(e.type);
          return {
            x1: sx(s.x + 224),
            y1: sy(s.y + 48),
            x2: sx(t.x),
            y2: sy(t.y + 48),
            color: money ? "#c9962f" : "#8a857c",
            dash: ["notification", "reconciliation"].includes(e.type),
          };
        })
        .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; color: string; dash: boolean }[],
      boxes: parties.map((n) => ({
        x: sx(n.position.x),
        y: sy(n.position.y),
        color: TYPE_COLORS[(n.data as { type: string }).type] ?? "#6b6b66",
      })),
    };
    thumbCache.set(id, computed);
    return computed;
  }, [id, flow]);

  return (
    <svg viewBox="0 0 220 102" className="h-[92px] w-full rounded-md bg-[#f4f0e6]">
      {shapes.lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={l.color}
          strokeWidth="1.1"
          strokeDasharray={l.dash ? "3 2" : undefined}
          opacity="0.7"
        />
      ))}
      {shapes.boxes.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width="22"
          height="9"
          rx="2"
          fill="white"
          stroke={b.color}
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
}

function jurisdictionOf(flow: FlowOfFunds): LibraryFilter {
  const j = flow.metadata.jurisdiction;
  return j.length > 1 ? "cross" : (j[0] as "CA" | "US");
}

function FlowCard({
  thumbId,
  flow,
  onLoad,
  onDelete,
  savedAt,
}: {
  /** Thumb cache key — for saved flows include savedAt so re-saves redraw. */
  thumbId: string;
  flow: FlowOfFunds;
  onLoad: () => void;
  /** Present only on "My flows" cards. */
  onDelete?: () => void;
  savedAt?: string;
}) {
  const m = flow.metadata;
  const jurisdiction = jurisdictionOf(flow);
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onLoad}
        className="flex w-full flex-col rounded-xl border border-[#e4dfd2] bg-white p-2.5 text-left shadow-sm transition-shadow hover:border-[#C41E3A] hover:shadow-md"
      >
        <Thumb id={thumbId} flow={flow} />
        <div className="mt-2 flex items-start justify-between gap-2">
          <span className="text-[12px] font-bold leading-tight text-[#1c1c1c]">{m.title}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
              jurisdiction === "CA"
                ? "bg-red-50 text-red-800"
                : jurisdiction === "US"
                  ? "bg-[#f7ecec] text-[#C41E3A]"
                  : "bg-violet-50 text-violet-800"
            }`}
          >
            {jurisdiction === "cross" ? m.jurisdiction.join("·") : jurisdiction}
          </span>
        </div>
        {m.description && (
          <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-slate-600">
            {m.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {m.primaryRails.slice(0, 2).map((r) => (
            <RailChip
              key={r}
              rail={r}
              className="inline-flex items-center gap-1 rounded bg-[#ede7da] px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
            />
          ))}
          {savedAt && (
            <span className="text-[9px] font-medium text-slate-500">
              Saved {new Date(savedAt).toLocaleDateString("en-CA")}
            </span>
          )}
          <span className="ml-auto text-[10.5px] font-semibold text-[#C41E3A] opacity-100 transition-opacity min-[721px]:opacity-0 min-[721px]:group-focus-within:opacity-100 min-[721px]:group-hover:opacity-100">
            {onDelete ? "Load flow →" : "Load template →"}
          </span>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          title={`Delete "${m.title}" from My flows`}
          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md border border-[#e4dfd2] bg-white text-slate-400 opacity-0 shadow-sm transition-opacity hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

export function TemplateLibrary() {
  const popover = useStudio((s) => s.popover);
  const setPopover = useStudio((s) => s.setPopover);
  const loadSeed = useStudio((s) => s.loadSeed);
  const loadFlow = useStudio((s) => s.loadFlow);
  const deleteMyFlow = useStudio((s) => s.deleteMyFlow);
  const clearMyFlows = useStudio((s) => s.clearMyFlows);
  const myFlows = useStudio((s) => s.myFlows);
  const busy = useStudio((s) => s.busy);
  const [filter, setFilter] = useState<LibraryFilter>("all");

  // Modal focus: move focus into the library while open, trap Tab, restore on
  // close (shared with the other aria-modal surfaces).
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, popover === "library");

  if (popover !== "library") return null;
  const entries = filterEntries(filter);
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: entries.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);
  const savedEntries =
    filter === "all" ? myFlows : myFlows.filter((s) => jurisdictionOf(s.flow) === filter);

  const loadSaved = (slot: SavedFlow) => {
    if (busy) return;
    setPopover(null);
    loadFlow(slot.flow, `Loaded **${slot.flow.metadata.title}** from My flows.`);
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[#1c1c1c]/15 p-3 backdrop-blur-[2px] min-[721px]:p-6"
      onClick={() => setPopover(null)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-library-title"
        aria-describedby="template-library-description"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-2xl border border-[#e4dfd2] bg-white shadow-[0_24px_70px_rgba(28,28,28,0.18)] min-[721px]:max-h-[82vh] min-[721px]:w-[min(900px,95vw)]"
      >
        <header className="relative flex flex-col items-stretch gap-3 border-b border-[#ede7da] px-4 py-3 min-[721px]:flex-row min-[721px]:items-center min-[721px]:justify-between min-[721px]:px-5">
          <div className="min-w-0 pr-12 min-[721px]:pr-0">
            <h2 id="template-library-title" className="text-[15px] font-bold tracking-tight text-[#1c1c1c]">
              Template library
            </h2>
            <p id="template-library-description" className="max-w-[58ch] text-[12px] leading-snug text-slate-600 min-[721px]:text-[11px]">
              Explore payment flows across regions and rails. Open one to see what users
              experience and when institutions settle.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3 min-[721px]:justify-end">
            <div
              role="group"
              aria-label="Filter templates by region"
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-[#e4dfd2] bg-[#fbf9f3] p-0.5 min-[721px]:flex-none"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`min-h-11 shrink-0 rounded-md px-3 py-2 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50 ${
                    filter === f.id
                      ? "bg-[#1c1c1c] text-white"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Close template library"
              onClick={() => setPopover(null)}
              className="absolute right-3 top-3 grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-[#ede7da] hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50 min-[721px]:static"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 min-[721px]:px-5">
          {(savedEntries.length > 0 || (myFlows.length === 0 && filter === "all")) && (
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  My flows
                </h3>
                {savedEntries.length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Clear all ${myFlows.length} saved flow${myFlows.length === 1 ? "" : "s"} from this device? This can't be undone.`,
                        )
                      )
                        clearMyFlows();
                    }}
                    className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500 hover:text-red-700"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {savedEntries.length > 0 ? (
                <>
                  <p className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] leading-snug text-amber-900">
                    <BookmarkPlus size={14} className="mt-0.5 shrink-0" />
                    This device remembers your saved flows between visits. On a shared computer,
                    hit Clear all when you&rsquo;re done, and export JSON or copy a link to keep one
                    anywhere else.
                  </p>
                  <div className="grid grid-cols-1 gap-3 min-[721px]:grid-cols-2 lg:grid-cols-3">
                    {savedEntries.map((slot) => (
                      <FlowCard
                        key={slot.slotId}
                        thumbId={`${slot.slotId}:${slot.savedAt}`}
                        flow={slot.flow}
                        savedAt={slot.savedAt}
                        onLoad={() => loadSaved(slot)}
                        onDelete={() => {
                          if (confirm(`Delete "${slot.flow.metadata.title}" from My flows?`))
                            deleteMyFlow(slot.slotId);
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-[#e4dfd2] bg-[#fbf9f3] px-3 py-3 text-[11px] leading-snug text-slate-500">
                  <BookmarkPlus size={14} className="shrink-0" />
                  Flows you save (bookmark icon top-right, or ⌘S) appear here. Named slots,
                  remembered on this device between visits.
                </p>
              )}
            </section>
          )}
          {byCategory.map(({ cat, items }) => (
            <section key={cat} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {cat}
              </h3>
              <div className="grid grid-cols-1 gap-3 min-[721px]:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => (
                  <FlowCard
                    key={entry.id}
                    thumbId={entry.id}
                    flow={entry.flow}
                    onLoad={() => {
                      if (busy) return;
                      setPopover(null);
                      void loadSeed(entry.id);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
