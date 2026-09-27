"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";
import type { FoFEdge } from "@/lib/schema/flow";
import type { ElementProvenance } from "@/lib/export/exhibit";
import { useLabelLayout } from "@/lib/state/labelLayout";
import { useStudio } from "@/lib/state/store";
import { ProvenanceMarker, provenanceAria } from "./ProvenanceMarker";
import { edgeGlyphFor } from "./edgeGlyph";

/**
 * Custom edge with HTML labels. Two anti-clutter moves:
 *  1. Labels are placed at a point ALONG the actual rendered path (via
 *     getPointAtLength), spread by sequence number — instead of every label
 *     stacking at the geometric midpoint where edges cross.
 *  2. The detail dial changes what a label is: a numbered dot (overview),
 *     "N · Label" (standard), or label + rail/timing subline (full).
 */

// Spread positions along the path, indexed by sequence number.
const T_SPREAD = [0.5, 0.34, 0.66, 0.42, 0.58, 0.26, 0.74];

// Chip nudges work in flow units. 15 ≈ 11 CSS px at the ~0.73 fit zoom — a
// conservative half-height for keeping a chip clear of lane gaps and node boxes.
const CHIP_HALF_FLOW = 15;

export const FofEdgeView = memo(function FofEdgeView(props: EdgeProps) {
  const select = useStudio((s) => s.select);
  const detail = useStudio((s) => s.detail);
  const data = props.data as unknown as FoFEdge | undefined;
  // Focus+context: a dimmed leg (outside the active lens / legend focus) fades to
  // faint context and stops intercepting clicks, so the focused story stays the
  // thing you read and tap. A selected leg always stays bright.
  const dimmed = !!(props.data as { _dimmed?: boolean } | undefined)?._dimmed && !props.selected;

  const [path, midX, midY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition ?? Position.Right,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition ?? Position.Left,
    borderRadius: 8,
  });

  const ordinal = data?.ordinal ?? 0;

  const [ptRaw, setPtRaw] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = document.querySelector<SVGPathElement>(
      `.react-flow__edge[data-id="${props.id}"] path.react-flow__edge-path`,
    );
    if (!el) {
      setPtRaw(null);
      return;
    }
    try {
      const total = el.getTotalLength();
      const group = el.closest<SVGGElement>(".react-flow__edge");
      if (group) {
        group.style.setProperty("--leg-len", String(Math.ceil(total)));
        group.style.setProperty("--leg-delay", `${Math.min(ordinal, 12) * 90}ms`);
      }
      const dy = Math.abs(props.targetY - props.sourceY);
      const dx = Math.abs(props.targetX - props.sourceX);
      const t = dy > dx * 1.5 ? 0.5 : T_SPREAD[ordinal % T_SPREAD.length];
      const p = el.getPointAtLength(total * t);
      setPtRaw({ x: p.x, y: p.y });
    } catch {
      setPtRaw(null);
    }
  }, [path, props.id, ordinal, props.sourceY, props.targetY, props.sourceX, props.targetX]);

  // Chip placement nudges in the render phase — pure, no DOM access, immune to
  // fitView timing. FlowCanvas injects the lane bands and the party-node boxes
  // (flow coords) into edge data, so this needs no ReactFlow store access.
  const pt = useMemo(() => {
    if (!ptRaw) return ptRaw;
    const bands =
      (data as { _bandBounds?: Array<{ top: number; bottom: number }> } | undefined)?._bandBounds ??
      [];
    const boxes =
      (
        data as
          | { _nodeBoxes?: Array<{ top: number; bottom: number; left: number; right: number }> }
          | undefined
      )?._nodeBoxes ?? [];
    let finalY = ptRaw.y;
    // 1) Inter-lane gap nudge: keep a chip out of the empty gaps between bands.
    for (let i = 0; i < bands.length - 1; i++) {
      const gapTop = bands[i].bottom;
      const gapBottom = bands[i + 1].top;
      if (ptRaw.y + CHIP_HALF_FLOW > gapTop && ptRaw.y - CHIP_HALF_FLOW < gapBottom) {
        finalY = gapBottom + CHIP_HALF_FLOW + 2;
        break;
      }
    }
    // 2) Node-box nudge: same-lane horizontal legs land on the node row, where a
    //    wide chip bleeds across the node boxes. If the chip overlaps a node, drop
    //    it just below into the lane's empty lower padding, clearing the node text.
    if (boxes.length) {
      const lbl = data ? (data.label ?? data.type ?? "") : "";
      // est. chip half-width in flow units (px / ~0.73 fit zoom), capped at max-w.
      const halfW = Math.min(210, 34 + lbl.length * 6) / 2 / 0.73;
      for (const nb of boxes) {
        const xOver = ptRaw.x + halfW > nb.left && ptRaw.x - halfW < nb.right;
        const yOver = finalY + CHIP_HALF_FLOW > nb.top && finalY - CHIP_HALF_FLOW < nb.bottom;
        if (xOver && yOver) {
          finalY = nb.bottom + CHIP_HALF_FLOW + 2;
          break;
        }
      }
    }
    return { x: ptRaw.x, y: finalY };
  }, [ptRaw, data]);

  // Chips portal outside the edge <g> (EdgeLabelRenderer), so the cascade var
  // can't inherit — set the matching delay inline on each chip.
  const chipDelay = { ["--leg-delay" as string]: `${Math.min(ordinal, 12) * 90}ms` } as React.CSSProperties;

  // Global label collision pass: report this chip's BASE rect (post node/gap nudge)
  // and read back a vertical offset that de-overlaps it from other labels. dy only
  // shifts the rendered transform, never the reported base — so there is no loop.
  const chipRef = useRef<HTMLButtonElement>(null);
  const labelDY = useLabelLayout((s) => s.dy[props.id] ?? 0);
  const baseX = pt?.x ?? midX;
  const baseY = pt?.y ?? midY;
  const x = baseX;
  const y = baseY + labelDY;
  const stroke = (props.style?.stroke as string) ?? "#8a857c";
  const label = data ? (data.label ?? data.type) : "";
  // Activity glyph — a non-colour channel for WHAT the leg does, redundant with
  // the edge colour so it reads in greyscale / under colour-blindness (where the
  // warm palette collapses). Charcoal, so it stays legible on the white chip
  // regardless of the leg's own colour.
  const Glyph = data ? edgeGlyphFor(data.type) : null;
  // Per-element provenance, precomputed in FlowCanvas (no per-render DOM query).
  const provenance = (props.data as { _provenance?: ElementProvenance } | undefined)?._provenance;

  // Report base rect + measured size to the collision store when placement or size
  // changes; remove on unmount or when this edge has no chip.
  useEffect(() => {
    const el = chipRef.current;
    if (!label || !el || !el.offsetWidth) {
      useLabelLayout.getState().removeRect(props.id);
      return;
    }
    useLabelLayout
      .getState()
      .reportRect(props.id, { x: baseX, y: baseY, w: el.offsetWidth, h: el.offsetHeight });
    return () => useLabelLayout.getState().removeRect(props.id);
  }, [props.id, label, baseX, baseY, detail]);
  const tooltip = data
    ? `${data.ordinal ? `${data.ordinal}. ` : ""}${label} · ${data.type} · ${data.rail} · ${data.currency}${data.timing ? ` · ${data.timing}` : ""}${data.messageStandard ? ` · ${data.messageStandard}` : ""}`
    : "";
  const subline =
    detail === "full" && data
      ? [data.rail, data.timing, data.messageStandard].filter(Boolean).join(" · ")
      : "";

  const onSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Mirror the canvas's onEdgeClick guard: a dimmed leg is context, not a
    // target — pointer-events already blocks the mouse, this blocks Enter/Space
    // on a keyboard-focused chip.
    if (dimmed) return;
    select({ kind: "edge", id: props.id });
  };

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        markerStart={props.markerStart}
        style={{
          ...props.style,
          ...(props.selected
            ? { strokeWidth: ((props.style?.strokeWidth as number) ?? 2) + 1.2 }
            : {}),
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          {/* One chip, one shape: the canvas only renders at Detailed/Expert
              (Simple is the StoryStrip, which draws its own step cards). */}
          <button
              ref={chipRef}
              data-edge-id={props.id}
              onClick={onSelect}
              aria-label={`${tooltip ? `Edit leg ${tooltip}` : `Edit leg ${props.id}`}${
                provenance ? `. ${provenanceAria(provenance)}` : ""
              }`}
              aria-pressed={props.selected}
              tabIndex={dimmed ? -1 : undefined}
              title={tooltip}
              className={`fof-leg-chip pointer-events-auto absolute flex max-w-[220px] items-center gap-1.5 rounded-md border bg-white/95 py-1 pl-1.5 pr-2 text-left leading-tight shadow-sm backdrop-blur-[1px] transition-shadow cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/50 ${
                props.selected ? "ring-2" : ""
              }`}
              style={{
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                borderColor: props.selected ? stroke : "#e4dfd2",
                ...chipDelay,
                ...(dimmed ? { opacity: 0.2, pointerEvents: "none" as const } : {}),
                ...(props.selected
                  ? ({ "--tw-ring-color": stroke } as React.CSSProperties)
                  : {}),
              }}
            >
              {data?.ordinal != null && (
                <span
                  className="grid h-[16px] min-w-[16px] shrink-0 place-items-center rounded px-0.5 text-[10.5px] font-bold tabular-nums text-white"
                  style={{ background: stroke }}
                >
                  {data.ordinal}
                </span>
              )}
              {Glyph && (
                <Glyph size={14} strokeWidth={2.2} aria-hidden className="shrink-0 text-slate-700" />
              )}
              {provenance && (
                // Seal (verified) / book (kb-grounded) / sparkle (inferred) sits
                // next to the ordinal; confidence text only at full detail (keeps
                // standard chips clean).
                <ProvenanceMarker
                  provenance={provenance}
                  size={12}
                  withConfidence={detail === "full"}
                  className="shrink-0"
                />
              )}
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold text-slate-800">
                  {label}
                </span>
                {subline && (
                  <span className="block truncate text-[9.5px] font-medium text-slate-500">
                    {subline}
                  </span>
                )}
              </span>
            </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
