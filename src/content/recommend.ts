import { GLOSSARY } from "./glossary";
import { GUIDES } from "./guides";
import type { ContentCandidate, GlossaryTerm, Guide, Jurisdiction, RailFamily } from "./types";

/**
 * Studio → content. Given the rails / tags / jurisdiction of the diagram on
 * screen, suggest the most relevant glossary terms + guides to read next. Pure
 * and typed, so the studio can render a subtle "Related on /learn" affordance
 * with no per-diagram authoring and no canvas clutter.
 */
export function suggestContentForFlow(input: {
  railFamily?: RailFamily;
  tags?: string[];
  jurisdiction?: Jurisdiction[];
}): { terms: GlossaryTerm[]; guides: Guide[] } {
  const tags = (input.tags ?? []).map((t) => t.toLowerCase());
  const hitTag = (hay: string) => {
    const h = hay.toLowerCase();
    return tags.some((t) => h.includes(t) || t.includes(h));
  };
  const score = (railFamily: RailFamily | undefined, jurisdiction: Jurisdiction[] | undefined, hay: string[]) => {
    let s = 0;
    if (input.railFamily && railFamily === input.railFamily) s += 3;
    if (input.jurisdiction?.length && jurisdiction?.some((j) => input.jurisdiction!.includes(j))) s += 1;
    if (hay.some(hitTag)) s += 2;
    return s;
  };

  const terms = GLOSSARY.map((t) => ({ t, s: score(t.railFamily, t.jurisdiction, [t.term, ...(t.aka ?? [])]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.t);
  const guides = GUIDES.map((g) => ({ g, s: score(g.railFamily, g.jurisdiction, [g.title]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.g);
  return { terms, guides };
}

/**
 * Bridge the studio's rail vocabulary to the content one. A flow labels its rails
 * with high-level FAMILY names ("Interac", "ACH", "Visa", "Fedwire", "Pix"; see
 * `src/lib/agent/rails.ts`), but the glossary/guides tag content with the softer
 * {@link RailFamily} taxonomy ("card", "wire", "interac", ...). This folds the
 * first canonical rail we recognise into that taxonomy so
 * {@link suggestContentForFlow} can score against it. Pure, case/spacing-
 * insensitive; returns undefined when nothing maps (the caller then leans on tags
 * and jurisdiction alone).
 */
export function railFamilyForRails(rails: readonly string[] | undefined): RailFamily | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Ordered prefix -> RailFamily, mirroring the canonical buckets normalizeRail emits.
  const rules: Array<[RegExp, RailFamily]> = [
    [/^(visa|mastercard|amex|americanexpress|discover|card)/, "card"],
    [/^interac/, "interac"],
    [/^(ach|fedach|nacha|epn|eftaft|acss|lynx|paymentscanada)/, "ach"],
    [/^(fedwire|wire|swift|mt103)/, "wire"],
    [/^(fednow|rtp|rtr)/, "rtp"],
    [/^(sepa|sctinst|sct|sdd)/, "sepa"],
    [/^pix/, "pix"],
    [/^upi/, "upi"],
    [/^(usdc|usdt|stablecoin|stable)/, "stablecoin"],
  ];
  for (const raw of rails ?? []) {
    if (typeof raw !== "string") continue;
    const k = norm(raw);
    for (const [re, fam] of rules) {
      if (re.test(k)) return fam;
    }
  }
  return undefined;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Analytics → curation. Turn AGGREGATE demand signals (from the admin
 * conversation log, search prompts, and 👎 flow ratings) into a manual content
 * worklist. This never ingests raw prompts into public output — it returns
 * candidate *topics* for a human to write and review. See
 * docs/content-feedback-loop.md.
 */
export function contentCandidatesFromSignals(
  signals: {
    railFamily?: RailFamily;
    jurisdiction?: Jurisdiction;
    useCase?: string;
    confusionTerms?: string[];
    relatedPromptCount?: number;
    downvotedFlowCount?: number;
  }[],
): ContentCandidate[] {
  const haveTerm = new Set(GLOSSARY.map((t) => t.slug));
  const haveGuide = new Set(GUIDES.map((g) => g.slug));
  const out: ContentCandidate[] = [];

  for (const s of signals) {
    // Terms people keep asking to clarify but we don't yet define → glossary candidates.
    for (const term of s.confusionTerms ?? []) {
      const suggestedSlug = slugify(term);
      if (!suggestedSlug || haveTerm.has(suggestedSlug)) continue;
      out.push({
        kind: "glossary",
        suggestedSlug,
        suggestedTitle: term,
        signal: {
          railFamily: s.railFamily,
          jurisdiction: s.jurisdiction,
          confusionTerms: [term],
          relatedPromptCount: s.relatedPromptCount,
        },
        rationale: `Asked about repeatedly${s.relatedPromptCount ? ` (~${s.relatedPromptCount} prompts)` : ""} but not yet in the glossary.`,
        status: "idea",
      });
    }
    // A use-case whose flows draw downvotes → a guide candidate (explanation gap).
    if (s.useCase && (s.downvotedFlowCount ?? 0) > 0) {
      const suggestedSlug = slugify(s.useCase);
      if (suggestedSlug && !haveGuide.has(suggestedSlug)) {
        out.push({
          kind: "guide",
          suggestedSlug,
          suggestedTitle: s.useCase,
          signal: {
            railFamily: s.railFamily,
            jurisdiction: s.jurisdiction,
            useCase: s.useCase,
            downvotedFlowCount: s.downvotedFlowCount,
          },
          rationale: `Flows for "${s.useCase}" drew ${s.downvotedFlowCount} 👎, so a plain-English guide could close the gap.`,
          status: "idea",
        });
      }
    }
  }
  return out;
}
