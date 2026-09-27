import { GLOSSARY } from "./glossary";
import { GUIDES } from "./guides";
import { FLOW_ANNOTATIONS } from "./flows";
import type { FlowAnnotation, GlossaryTerm, Guide } from "./types";

export * from "./types";
export { GLOSSARY, GUIDES, FLOW_ANNOTATIONS };

const termBySlug = new Map<string, GlossaryTerm>(GLOSSARY.map((t) => [t.slug, t]));
const guideBySlug = new Map<string, Guide>(GUIDES.map((g) => [g.slug, g]));
const flowBySlug = new Map<string, FlowAnnotation>(FLOW_ANNOTATIONS.map((f) => [f.slug, f]));

export const getTerm = (slug: string): GlossaryTerm | undefined => termBySlug.get(slug);
export const getGuide = (slug: string): Guide | undefined => guideBySlug.get(slug);

/** Flagship annotated-flow pages (the "Margin" reading surface). */
export const getFlowAnnotation = (slug: string): FlowAnnotation | undefined => flowBySlug.get(slug);
export const allFlowAnnotations = (): FlowAnnotation[] => [...FLOW_ANNOTATIONS];

/** Glossary, A→Z by display term. */
export const allTerms = (): GlossaryTerm[] =>
  [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

/** Guides in authored order. */
export const allGuides = (): Guide[] => [...GUIDES];

export const termsForSlugs = (slugs?: string[]): GlossaryTerm[] =>
  (slugs ?? []).map((s) => termBySlug.get(s)).filter((t): t is GlossaryTerm => Boolean(t));

export const guidesForSlugs = (slugs?: string[]): Guide[] =>
  (slugs ?? []).map((s) => guideBySlug.get(s)).filter((g): g is Guide => Boolean(g));

/** Reverse link: which guides reference this term. */
export const guidesUsingTerm = (slug: string): Guide[] =>
  GUIDES.filter((g) => g.relatedTerms?.includes(slug));

/** Alphabetical buckets for the glossary index page. */
export function termsByLetter(): { letter: string; terms: GlossaryTerm[] }[] {
  const buckets = new Map<string, GlossaryTerm[]>();
  for (const t of allTerms()) {
    const letter = (t.term[0] ?? "#").toUpperCase();
    const list = buckets.get(letter);
    if (list) list.push(t);
    else buckets.set(letter, [t]);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, terms]) => ({ letter, terms }));
}
