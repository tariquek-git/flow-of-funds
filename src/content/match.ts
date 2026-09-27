/**
 * Element -> glossary matcher (the beginner on-ramp).
 *
 * Given a selected studio party (node) or leg (edge), surface the handful of
 * glossary terms that actually apply, so the ElementEditor can render them as
 * "in plain English" chips. Reuses the shipped {@link GLOSSARY}; authors nothing.
 *
 * Design stance: CONSERVATIVE, exactly like flows/seedMatch.ts. A wrong chip is
 * the only real failure mode, so matching is WHOLE-WORD / whole-phrase against a
 * space-padded blob of the element's fields. Short tokens (ach, rtp, fbo, ...)
 * never fire inside another word ("ach" inside "attach", "fbo" inside "fbology").
 * Results are deduped, capped, and returned in stable GLOSSARY order.
 */
import { GLOSSARY } from "./glossary";
import type { GlossaryTerm } from "./types";
import type { FoFEdge, FoFNode } from "@/lib/schema/flow";

/** Max chips to show. Small on purpose: this is a nudge, not a reading list. */
const MAX_TERMS = 5;

/** Lowercase, strip punctuation to single spaces, collapse runs. Mirrors the
 *  normalize() in flows/seedMatch.ts so matching behaves identically. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The phrases that, if found as whole words in an element, mean "this term
 * applies." Built once from each term's display name, its aka synonyms, and the
 * slug read as words. Deliberately tight: we DROP very short / ambiguous tokens
 * and parenthetical expansions that would over-fire (e.g. the long ODFI/RDFI
 * spellings are dropped; "auth" stays because it is a real, used abbreviation).
 */
type TermPhrases = { term: GlossaryTerm; phrases: string[] };

/** Tokens we never let match on their own — too generic, would fire everywhere. */
const STOP_PHRASES = new Set([
  "bank",
  "account",
  "fee",
  "card",
  "payment",
  "transfer",
  "money",
  "fund",
  "funds",
  "of",
  "to",
  "from",
  "due",
  "agent",
  "directory",
  "service",
  "process",
  "dispute", // too broad on its own; "card dispute" / "chargeback" carry it
]);

/** Phrases shorter than this (after normalize) only match if they came from an
 *  aka explicitly meant as an abbreviation; we keep a small allowlist. */
const SHORT_OK = new Set(["auth", "odfi", "rdfi", "fbo", "ach", "rtp"]);

function phrasesFor(term: GlossaryTerm): string[] {
  const out = new Set<string>();
  const add = (raw: string) => {
    // Drop parenthetical expansions and slash-alternatives' noise: take the head
    // before any "(" so "FBO Account (For Benefit Of)" -> "fbo account".
    const head = raw.split("(")[0];
    for (const part of head.split("/")) {
      const p = normalize(part);
      if (!p) continue;
      if (STOP_PHRASES.has(p)) continue;
      // Single short token: only keep if it's a known good abbreviation.
      if (p.length <= 4 && !p.includes(" ") && !SHORT_OK.has(p)) continue;
      out.add(p);
    }
  };
  add(term.term);
  for (const a of term.aka ?? []) add(a);
  // slug as words ("sponsor-bank" -> "sponsor bank"); skip if it collapses to a
  // stop phrase or a bare short token.
  const slugWords = normalize(term.slug.replace(/-/g, " "));
  if (slugWords && !STOP_PHRASES.has(slugWords)) out.add(slugWords);
  return [...out];
}

// Precompute once at module load.
const TERM_PHRASES: TermPhrases[] = GLOSSARY.map((term) => ({
  term,
  phrases: phrasesFor(term),
}));

/**
 * Edge `type` is a closed taxonomy (see EdgeTypeSchema). Several values map 1:1
 * onto a glossary slug with high confidence regardless of the free-form label,
 * so we match them directly. Values without a clean glossary home (funding,
 * transfer, notification, reconciliation, fee, refund) are intentionally
 * absent. Refund stays unmapped on purpose: a refund is a merchant-initiated
 * credit back through the acquirer, not an issuer-initiated chargeback, so a
 * chargeback chip on a refund leg would be exactly the wrong-chip failure mode
 * this matcher exists to avoid.
 */
const EDGE_TYPE_TO_SLUG: Record<string, string> = {
  authorization: "authorization",
  clearing: "clearing",
  settlement: "settlement",
  chargeback: "chargeback",
  interchange: "interchange",
};

const bySlug = new Map<string, GlossaryTerm>(GLOSSARY.map((t) => [t.slug, t]));

/** Collect the element's matchable text into one normalized, space-padded blob.
 *  Padding lets us test ` phrase ` for word-boundary matches cheaply. */
function blobFor(el: FoFNode | FoFEdge): string {
  const parts: (string | undefined)[] = [el.label, el.type];
  if ("rail" in el) parts.push(el.rail);
  else parts.push(el.subtype);
  const joined = parts
    .map((p) => (p ? normalize(p) : ""))
    .filter(Boolean)
    .join(" ");
  return ` ${joined} `;
}

/**
 * Match a selected node or edge to relevant glossary terms.
 *
 * Pure + unit-testable: `(element) => GlossaryTerm[]`. Returns up to
 * {@link MAX_TERMS} terms in stable GLOSSARY order, deduped. Whole-word only:
 * no substring false positives.
 */
export function matchTerms(el: FoFNode | FoFEdge): GlossaryTerm[] {
  const hits = new Set<string>();

  // 1. High-confidence edge-type taxonomy match (exact, label-independent).
  if ("rail" in el) {
    const slug = EDGE_TYPE_TO_SLUG[el.type];
    if (slug && bySlug.has(slug)) hits.add(slug);
  }

  // 2. Whole-phrase scan over the element's text fields.
  const blob = blobFor(el);
  for (const { term, phrases } of TERM_PHRASES) {
    if (hits.has(term.slug)) continue;
    for (const p of phrases) {
      if (blob.includes(` ${p} `)) {
        hits.add(term.slug);
        break;
      }
    }
  }

  // Stable GLOSSARY order; cap.
  const ordered = GLOSSARY.filter((t) => hits.has(t.slug));
  return ordered.slice(0, MAX_TERMS);
}
