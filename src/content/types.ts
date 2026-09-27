/**
 * Content model for the public knowledge layer (`/learn`).
 *
 * Design intent: a typed, hand-curated, source-aware editorial layer — NOT a CMS,
 * and NOT auto-generated from user prompts. Admin analytics may *suggest* what to
 * write next (see {@link ContentCandidate} + `src/content/recommend.ts`), but every
 * public word here is manually authored and reviewed. Raw user prompts never reach
 * a public page.
 *
 * Everything is plain serialisable data so the `/learn` pages render as static
 * server components with zero client JS.
 */

/** Soft rail taxonomy — drives related-content surfacing and the content-feedback
 *  loop. Not exhaustive; add families as the catalog grows. */
export type RailFamily =
  | "card"
  | "interac"
  | "ach"
  | "wire"
  | "rtp"
  | "sepa"
  | "pix"
  | "upi"
  | "eft" // Canadian batch rails: EFT/AFT files, PADs, ACSS clearing
  | "stablecoin"
  | "bank" // generic deposit / sponsor banking
  | "cross-border";

export type Jurisdiction = "CA" | "US" | "EU" | "GB" | "BR" | "IN" | "global";

/**
 * A citation. We distinguish neutral authorities from operator/vendor docs on
 * purpose: a network's own page is an *implementation example*, not independent
 * confirmation. URLs are stable, top-level publisher links — never fabricated deep
 * paths (a 404 reads worse than a homepage link).
 */
export type SourceLink = {
  label: string; // e.g. "NACHA Operating Rules (overview)"
  url: string; // stable publisher URL
  publisher: string; // e.g. "Payments Canada", "NACHA", "Federal Reserve"
  kind?: "authority" | "operator" | "vendor" | "explainer";
  note?: string; // what this source backs up
};

/**
 * A prompt a reader can open in the Studio. Routes to `/studio?q=<prompt>`. If it
 * resolves to an audited seed it loads instantly with no AI spend; otherwise the
 * AI builds it live. When `seedId` is set it MUST be a `FLOW_CATALOG` id (enforced
 * by `scripts/check-content.ts`).
 */
export type RelatedPrompt = {
  prompt: string;
  seedId?: string;
  note?: string;
};

/** A related audited seed diagram. `seedId` MUST be a `FLOW_CATALOG` id. */
export type RelatedFlowSeed = {
  seedId: string;
  label?: string; // display override; defaults to the catalog title
};

/**
 * A glossary term's "See it move" deep link: opens the studio with an audited
 * seed flow loaded and the term's exact element selected, so the reader lands
 * in the live diagram with the editor open on that element. `seedId` MUST be a
 * `FLOW_CATALOG` id and `select.id` MUST exist in that seed — both enforced by
 * `scripts/check-content.ts`. `label` is the casual sub-line under the link.
 */
export type SeeItMove = {
  seedId: string;
  select?: { kind: "node" | "edge"; id: string };
  label?: string;
};

/** A "people get this wrong" pair — the single most useful thing a payments
 *  glossary can carry, where the folk model and the real model diverge. */
export type Misconception = {
  claim: string; // the common but wrong belief
  reality: string; // the correction
};

/** Which layer of a diagram the term lives in — ties the glossary to the studio's
 *  money-vs-message distinction. "party" = a node (who), not a leg. */
export type FlowLayer = "money" | "message" | "party" | "both";

export type GlossaryTerm = {
  slug: string; // url segment, kebab-case, unique
  term: string; // display name
  aka?: string[]; // synonyms / abbreviations (also fuel search)
  short: string; // one-line definition (~<=140 chars)
  plain: string; // 2–4 sentence plain-English explanation
  inAFlow: string; // where/how it shows up in a flow-of-funds diagram
  flowLayer?: FlowLayer;
  misconceptions?: Misconception[];
  related?: string[]; // other glossary slugs
  guides?: string[]; // guide slugs that use this term
  sources?: SourceLink[];
  railFamily?: RailFamily;
  jurisdiction?: Jurisdiction[];
  seeIt?: SeeItMove;
};

/** A single step in a guide's walkthrough. `kind` keeps money and message legs
 *  semantically distinct (the product's core teaching) and flags reversals. */
export type GuideStep = {
  n: number;
  kind: "money" | "message" | "exception";
  text: string;
  party?: string; // optional acting party
};

export type GuideParty = { name: string; role: string };

/** A node in a guide's sequence diagram — a party, rendered as a lifeline column.
 *  `id` is referenced by legs; `label` is the short display name. */
export type DiagramNode = { id: string; label: string };

/** A leg in a guide's sequence diagram — an arrow from one party to another at a
 *  point in the sequence. `kind` drives the colour (money/message/exception),
 *  mirroring the studio and the step list. `ordinal` orders it top-to-bottom. */
export type DiagramLeg = {
  from: string; // DiagramNode id
  to: string; // DiagramNode id
  kind: "money" | "message" | "exception";
  label: string;
  ordinal: number;
};

/** A lightweight, self-contained sequence diagram for a guide: party lifelines
 *  (nodes) and the money/message legs between them. Rendered as static SVG (no
 *  client JS, no layout engine) so it ships with the SEO page. */
export type GuideDiagram = { nodes: DiagramNode[]; legs: DiagramLeg[] };

export type Guide = {
  slug: string;
  title: string; // "How an Interac e-Transfer actually moves money"
  answer: string; // one-sentence answer, up top
  audience: string; // "Founders, ops, and PMs new to <X>"
  summary: string; // 2–4 sentence overview of the flow
  parties: GuideParty[];
  steps: GuideStep[];
  diagram?: GuideDiagram; // optional sequence-style visual of the flow
  settlementTiming?: string; // when the money is actually final
  economics?: string; // fees / who-pays, if relevant (illustrative, never quoted rates as fact)
  riskNotes?: string; // risk / reversal / compliance notes (educational, NOT advice)
  misconceptions?: Misconception[];
  relatedTerms?: string[]; // glossary slugs
  prompts?: RelatedPrompt[]; // try-in-studio
  seeds?: RelatedFlowSeed[]; // related audited seed diagrams
  sources: SourceLink[];
  railFamily?: RailFamily;
  jurisdiction?: Jurisdiction[];
  updated?: string; // ISO date, manual
};

/**
 * Flow Annotation — the "Margin" reading surface (`/learn/flows/<slug>`).
 *
 * One grounded seed flow rendered as a vertical plain-English SPINE (one warm
 * sentence per leg, color-keyed money/message/exception), with an opt-in MARGIN
 * of hand-written notes pinned to specific seed edge/node ids. The spine is
 * machine-grounded (it renders FROM the seed in `FLOW_CATALOG`); the margin is
 * irreducibly human — that human voice is the point, and the part a competitor
 * can't scrape. Notes pin to STABLE seed ids and are build-gated by
 * `scripts/check-content.ts`, so a note can never silently drift from the diagram.
 */

/** What kind of margin note this is. Each kind reads differently:
 *  - `burn`   — "here's where people get burned" (rule-based; pair with a source)
 *  - `war-story` — first-person lived experience; tacit knowledge no rulebook holds
 *  - `receipt`   — a source pin: why we're sure (MUST carry a source)
 *  - `depth`     — the engineer's nuance (timing, venue, economics, regulator)
 *  - `myth`      — a misconception fired off the exact leg it concerns */
export type MarginNoteKind = "burn" | "war-story" | "receipt" | "depth" | "myth";

/** A hand-written note pinned to one leg (edge) or party (node) of a seed flow. */
export type MarginNote = {
  id: string; // unique within the flow
  pinTo: { edgeId?: string; nodeId?: string }; // exactly one, a real seed id
  kind: MarginNoteKind;
  label: string; // short headline shown in the margin
  body: string; // the note itself
  source?: SourceLink; // required for `receipt`; expected on rule-based `burn`/`myth`
  /** Marks a human-voice placeholder (typically `war-story`) awaiting the owner's
   *  own words. Drafts render with a visible badge and are never presented as
   *  lived fact until a human replaces them. */
  draft?: boolean;
  dated?: string; // ISO, for war stories
};

/**
 * A flagship "annotated flow" page. Deliberately a SMALL, lovingly-authored set
 * (3–5 flows), not coverage — a half-populated field of annotations reads worse
 * than a plain glossary. The spine ordering and geometry come from the seed; only
 * the prose, the chosen notes, and the teaching beats are authored here.
 */
export type FlowAnnotation = {
  slug: string; // url segment, kebab-case, unique
  seedId: string; // a real FLOW_CATALOG id — the grounded spine
  title: string;
  answer: string; // one-sentence plain answer, up top
  audience: string;
  summary: string; // 2–4 sentence overview
  byline?: string; // "Notes by …" — set before promoting; the named voice is the moat
  lines: Record<string, string>; // edgeId -> warm plain-English spine sentence
  keyLeg?: string; // edgeId of the highest-leverage teaching leg (the split point)
  notes: MarginNote[];
  relatedTerms?: string[]; // glossary slugs
  sources?: SourceLink[]; // page-level citations
  updated?: string; // ISO date, manual
};

/**
 * Content-feedback loop (a design, not automation).
 *
 * Admin analytics — the conversation log, search prompts, and 👎 flow ratings —
 * reveal demand: which rails/jurisdictions people ask about, which terms confuse
 * them, which flows get downvoted. `src/content/recommend.ts` turns those
 * *aggregate* signals into {@link ContentCandidate}s: a curation worklist. A human
 * then writes and reviews the actual page. Raw prompts are never published; only
 * the editor sees them, and only to decide what to write next.
 */
export type ContentCandidate = {
  kind: "glossary" | "guide";
  suggestedSlug: string;
  suggestedTitle: string;
  signal: {
    railFamily?: RailFamily;
    jurisdiction?: Jurisdiction;
    useCase?: string;
    confusionTerms?: string[];
    relatedPromptCount?: number; // how many aggregate prompts cluster here
    downvotedFlowCount?: number; // 👎 on related flows -> an explanation gap
  };
  rationale: string;
  status: "idea" | "drafting" | "published";
};
