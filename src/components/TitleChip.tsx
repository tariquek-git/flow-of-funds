"use client";

import { useState } from "react";
import { edgeLayers } from "@/lib/diagram/layout";
import { useStudio } from "@/lib/state/store";
import { RailChip } from "./BrandMark";
import { FintechNorthMark } from "./FintechNorthMark";

export function TitleChip() {
  const flow = useStudio((s) => s.flow);
  const setTitle = useStudio((s) => s.setTitle);
  const [editing, setEditing] = useState(false);
  if (!flow?.metadata.title) return null;

  return (
    <div className="group max-w-full">
      <div className="rounded-lg border border-[#e4dfd2] bg-white/95 px-3.5 py-2 shadow-sm">
        {/* Quiet brand tie-back so the live canvas reads as part of the Fintech
            North site, not a stray tool window. One line, faint, never competes
            with the diagram title below it. The North-Star mark (same six-star
            constellation as the landing, recolored for the light studio: ink
            supporting nodes, red North Star) links home to fintechnorth.ca. */}
        <span className="mb-1 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#6b6b66]">
          <a
            href="https://fintechnorth.ca"
            aria-label="Fintech North"
            className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-maple/50"
          >
            <FintechNorthMark size={14} className="text-[#1c1c1c]" />
          </a>
          Flow of Funds · Fintech North
        </span>
        {editing ? (
          <input
            autoFocus
            defaultValue={flow.metadata.title}
            onBlur={(e) => {
              setTitle(e.target.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-72 rounded border border-[#C41E3A] bg-white px-1.5 py-0.5 text-[14px] font-bold tracking-tight text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Click to rename"
            className="block text-left text-[14px] font-bold tracking-tight text-[#1c1c1c] hover:text-[#a11930]"
          >
            {flow.metadata.title}
          </button>
        )}
        {(() => {
          // One-line orientation, derived from the flow itself: how many
          // parties, how many actual money movements, and whether there's a
          // failure path. Answers "what am I looking at" before the reader
          // parses a single node — the counts describe the FULL flow (not the
          // current detail level), so they stay stable as the dial moves.
          const parties = flow.nodes.length;
          // Same predicate the strip selects with (edgeLayers honours the type
          // fallback for an untagged AI leg, and `secondary` legs are editorial
          // asides). A raw `layers` read counted legs the strip doesn't draw, so
          // the header said "money moves 4 times" over 3 cards on 7 seeds.
          const money = flow.edges.filter(
            (e) => edgeLayers(e).includes("money") && e.emphasis !== "secondary",
          ).length;
          const issues = flow.edges.filter((e) => (e.layers ?? []).includes("exception")).length;
          if (!parties || !money) return null;
          return (
            <p className="mt-0.5 text-[10.5px] leading-snug text-[#6b6b66]">
              {parties} parties · money moves {money === 1 ? "once" : `${money} times`}
              {issues > 0 && ` · ${issues} failure path${issues === 1 ? "" : "s"}`}
            </p>
          );
        })()}
        <div className="mt-0 hidden flex-wrap gap-1 pt-1.5 group-hover:flex">
          {flow.metadata.primaryRails.map((r) => (
            <RailChip key={r} rail={r} />
          ))}
          {flow.metadata.currencies.map((c) => (
            <span
              key={c}
              className="rounded bg-[#ede7da] px-1.5 py-0.5 text-[10px] font-semibold text-[#1c1c1c]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
