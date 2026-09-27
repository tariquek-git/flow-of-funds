"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { matchTerms } from "@/content/match";
import type { FoFEdge, FoFNode } from "@/lib/schema/flow";
import type { GlossaryTerm } from "@/content/types";

/**
 * In-plain-English chips for the selected party/leg (the beginner on-ramp).
 *
 * Renders the {@link matchTerms} hits as small warm chips. Each chip:
 *  - reveals the term's one-line `short` definition on HOVER and on TAP/FOCUS
 *    (a title attr alone is invisible to touch + keyboard, so we use a real
 *    inline popover toggled by both),
 *  - deep-links to /learn/glossary/<slug> via a small ↗ affordance.
 * Warm palette only (cream / charcoal / crimson / gold). Keyboard + aria wired.
 */

function Chip({ term }: { term: GlossaryTerm }) {
  const [open, setOpen] = useState(false);
  const popId = useId();

  return (
    <span
      className="relative inline-flex"
      // Hover-to-reveal is mouse-only. A tap synthesizes mouseenter → focus →
      // click; letting the first two pre-open the popover made the click's
      // toggle immediately close it, so touch never saw a definition. Touch
      // relies purely on the button's click toggle.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
    >
      <span className="inline-flex items-center overflow-hidden rounded-full border border-[#e8d9a8] bg-[#faf4e4]">
        {/* The definition toggle. A button (not a link) so tap/Enter/Space reveal
            the meaning in place rather than navigating away. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={popId}
          onClick={() => setOpen((v) => !v)}
          // Keyboard focus only (:focus-visible): tap/click focus precedes the
          // click, and opening here would make the toggle close it right back.
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          className="px-2 py-0.5 text-[11px] font-medium text-[#6f4a10] transition-colors hover:text-[#a11930] focus:outline-none focus-visible:text-[#a11930]"
        >
          {term.term.split("(")[0].trim()}
        </button>
        {/* Deep-link to the full glossary entry. Separate target so revealing the
            definition never costs an accidental navigation. */}
        <Link
          href={`/learn/glossary/${term.slug}`}
          target="_blank"
          rel="noreferrer"
          title={`Open the glossary entry for ${term.term.split("(")[0].trim()}`}
          aria-label={`Open the glossary entry for ${term.term.split("(")[0].trim()}`}
          className="border-l border-[#e8d9a8] px-1.5 py-0.5 text-[10px] text-[#8a5e00] transition-colors hover:bg-[#f3e6c2] hover:text-[#a11930] focus:outline-none focus-visible:bg-[#f3e6c2]"
        >
          <span aria-hidden>↗</span>
        </Link>
      </span>
      {open && (
        <span
          id={popId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-[15rem] max-w-[70vw] rounded-md border border-[#e8d9a8] bg-white px-2.5 py-1.5 text-[11px] leading-snug text-[#1c1c1c] shadow-md"
        >
          {term.short}
        </span>
      )}
    </span>
  );
}

export function GlossaryChips({ element }: { element: FoFNode | FoFEdge }) {
  const terms = matchTerms(element);
  if (!terms.length) return null;

  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6b6b66]">
        In plain English
      </span>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((t) => (
          <Chip key={t.slug} term={t} />
        ))}
      </div>
    </div>
  );
}
