"use client";

import { BookMarked, Library, Sparkles } from "lucide-react";
import type { ElementProvenance } from "@/lib/export/exhibit";

/**
 * On-canvas provenance glyph — the product's headline differentiator made
 * tappable. Drives off elementProvenance(): a LIBRARY mark for an element from
 * a curated template, a KB BOOK (BookMarked) for an AI leg whose rail is
 * documented in our knowledge base, or an AI SPARKLE (Sparkles) for a leg
 * inferred beyond it.
 *
 * Three origin/support tiers: curated template > KB-grounded rail > AI-inferred.
 * None of the glyphs implies claim verification or human review.
 *
 * Brand + a11y: WARM palette only (gold library / amber-gold book / maple sparkle),
 * and meaning is carried by SHAPE + an aria-label, never colour alone. The exact
 * tones come from the warm de-blue sweep:
 *   verified    → gold #c9962f library mark (internal enum kept for compatibility)
 *   kb-grounded → amber-gold #b8791f book (documented rail, give it a look)
 *   inferred    → maple/amber #b45309 sparkle (verify before use)
 */

// Gold for the curated-template mark; amber-gold for the kb-grounded book; maple/amber
// for the AI-inferred caution. No teal, blue, or green (brand constraint).
const VERIFIED_COLOR = "#c9962f";
const KB_GROUNDED_COLOR = "#b8791f";
const INFERRED_COLOR = "#b45309";

const CONFIDENCE_LABEL: Record<NonNullable<ElementProvenance["confidence"]>, string> = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
};

/** Spoken label for a marker: shape-independent meaning + optional confidence. */
export function provenanceAria(p: ElementProvenance): string {
  const base =
    p.kind === "verified"
      ? p.source
        ? "Curated template element with a source link; claim verification not recorded"
        : "Curated template element; claim verification not recorded"
      : p.kind === "kb-grounded"
        ? "Rail grounded in the knowledge base, AI wrote this leg, give the details a look"
        : "AI-inferred, verify before use";
  return p.confidence ? `${base}, ${CONFIDENCE_LABEL[p.confidence]}` : base;
}

/**
 * A single inline glyph. `size` is the icon px. `withConfidence` appends the
 * confidence word as text (used only at detail==="full", per spec). On nodes the
 * glyph is a ~10px corner mark; on edge chips it sits next to the ordinal.
 */
export function ProvenanceMarker({
  provenance,
  size = 12,
  withConfidence = false,
  className = "",
}: {
  provenance: ElementProvenance;
  size?: number;
  withConfidence?: boolean;
  className?: string;
}) {
  const { kind } = provenance;
  const color =
    kind === "verified"
      ? VERIFIED_COLOR
      : kind === "kb-grounded"
        ? KB_GROUNDED_COLOR
        : INFERRED_COLOR;
  const Icon =
    kind === "verified" ? Library : kind === "kb-grounded" ? BookMarked : Sparkles;
  return (
    <span
      role="img"
      aria-label={provenanceAria(provenance)}
      title={provenanceAria(provenance)}
      className={`inline-flex items-center gap-0.5 leading-none ${className}`}
      style={{ color }}
    >
      <Icon size={size} strokeWidth={2.4} aria-hidden />
      {withConfidence && provenance.confidence && (
        <span className="text-[8.5px] font-semibold uppercase tracking-wide">
          {provenance.confidence}
        </span>
      )}
    </span>
  );
}

/**
 * Minimal overview treatment for an edge chip: a tiny shape, no text. Three
 * shapes so meaning survives at small size and works without colour:
 *   verified    → a gold outlined square (curated-template origin, not a seal).
 *   kb-grounded → a solid amber-gold dot RINGED in charcoal (a documented puck:
 *                 filled like verified, but ringed so it never reads identical).
 *   inferred    → a HOLLOW maple ring (verify before use).
 */
export function ProvenanceDot({ provenance }: { provenance: ElementProvenance }) {
  const { kind } = provenance;
  const style: React.CSSProperties =
    kind === "verified"
      ? { border: `1.5px solid ${VERIFIED_COLOR}`, backgroundColor: "transparent" }
      : kind === "kb-grounded"
        ? { backgroundColor: KB_GROUNDED_COLOR, boxShadow: "0 0 0 1.5px #1c1c1c" }
        : { border: `1.5px solid ${INFERRED_COLOR}`, backgroundColor: "transparent" };
  return (
    <span
      role="img"
      aria-label={provenanceAria(provenance)}
      title={provenanceAria(provenance)}
      className={`block h-[7px] w-[7px] ${kind === "verified" ? "rounded-[1px]" : "rounded-full"}`}
      style={style}
    />
  );
}
