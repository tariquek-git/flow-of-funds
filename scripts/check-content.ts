/**
 * /learn content integrity — offline, no AI, no browser. Guards the typed
 * knowledge layer so a published page can never 404 a link or cite a dangling
 * seed:
 *   1. Slugs are unique across glossary + guides.
 *   2. Every related / guides / relatedTerms cross-ref resolves to a real slug.
 *   3. Every seeds[].seedId and prompts[].seedId is a real FLOW_CATALOG id.
 *   4. Every source has a publisher, a label, and an http(s) URL.
 *   5. Required prose fields are non-empty; guides have steps + sources.
 *   6. Every glossary seeIt ("See it move" deep link) points at an AUDITED
 *      FLOW_CATALOG seed (metadata.source === "seed", the verified provenance
 *      seal) and its select.id names a node/edge that exists in that seed
 *      (src/content/seeit.ts). Plus a soft rail-family fit warning.
 * Run from repo root: npx tsx scripts/check-content.ts
 */
import { GLOSSARY } from "../src/content/glossary";
import { GUIDES } from "../src/content/guides";
import { seeItProblems } from "../src/content/seeit";
import { FLOW_ANNOTATIONS } from "../src/content/flows";
import { FLOW_CATALOG } from "../src/lib/flows/catalog";
import type { SourceLink } from "../src/content/types";

let failures = 0;
const fail = (id: string, msg: string) => {
  failures++;
  console.error(`  ✗ ${id}: ${msg}`);
};

const termSlugs = new Set(GLOSSARY.map((t) => t.slug));
const guideSlugs = new Set(GUIDES.map((g) => g.slug));
const seedIds = new Set(Object.keys(FLOW_CATALOG));

// 1. unique slugs (glossary + guides share one namespace under /learn)
const counts = new Map<string, number>();
for (const s of [...GLOSSARY.map((t) => t.slug), ...GUIDES.map((g) => g.slug)])
  counts.set(s, (counts.get(s) ?? 0) + 1);
for (const [s, n] of counts) if (n > 1) fail(s, `slug used ${n} times`);

const isUrl = (u?: string) => !!u && /^https?:\/\//.test(u);
// Recycled-citation tracker: one URL carrying many different labels erodes the
// source-cited posture. Collected here across glossary + guides, warned on
// below (non-fatal).
const urlLabels = new Map<string, Set<string>>();
const checkSources = (id: string, sources?: SourceLink[]) => {
  for (const src of sources ?? []) {
    if (!src.publisher?.trim()) fail(id, `source missing publisher (${src.url ?? "?"})`);
    if (!src.label?.trim()) fail(id, `source missing label (${src.url ?? "?"})`);
    if (!isUrl(src.url)) {
      fail(id, `source url not http(s): "${src.url ?? ""}"`);
    } else {
      // A citation on a "we cite the rail" brand must deep-link to the actual
      // rule/spec page, not a bare corporate homepage. Reject path-less URLs.
      try {
        const path = new URL(src.url).pathname.replace(/\/+$/, "");
        if (!path) fail(id, `source url is a bare host (needs a deep link): "${src.url}"`);
      } catch {
        fail(id, `source url unparseable: "${src.url}"`);
      }
      if (src.label?.trim()) {
        const labels = urlLabels.get(src.url) ?? new Set<string>();
        labels.add(src.label.trim());
        urlLabels.set(src.url, labels);
      }
    }
  }
};

// Crude semantic-fit hints for the seeIt soft warning: if a term declares a
// rail family, the linked seed should smell like that family somewhere in its
// id/title/tags/rails. A miss is a WARNING, not a failure — plenty of terms
// (e.g. "settlement") legitimately illustrate on a neighbouring rail.
const FAMILY_HINTS: Record<string, string[]> = {
  card: ["visa", "mastercard", "card", "debit", "credit", "prepaid", "interchange"],
  interac: ["interac"],
  ach: ["ach", "eft", "pad", "nacha"],
  wire: ["wire", "fedwire", "swift", "lynx"],
  rtp: ["rtp", "fednow", "real-time", "rtr"],
  sepa: ["sepa"],
  pix: ["pix"],
  upi: ["upi"],
  stablecoin: ["stablecoin", "usdc", "crypto", "on-ramp", "off-ramp"],
  bank: ["bank", "fbo", "sponsor", "deposit"],
  "cross-border": ["cross-border", "correspondent", "remittance", "fx"],
};

console.log("Glossary:");
let seeItCount = 0;
for (const t of GLOSSARY) {
  const before = failures;
  if (!t.short?.trim()) fail(t.slug, "empty short");
  if (!t.plain?.trim()) fail(t.slug, "empty plain");
  if (!t.inAFlow?.trim()) fail(t.slug, "empty inAFlow");
  for (const r of t.related ?? []) if (!termSlugs.has(r)) fail(t.slug, `related → unknown term "${r}"`);
  for (const g of t.guides ?? []) if (!guideSlugs.has(g)) fail(t.slug, `guides → unknown guide "${g}"`);
  checkSources(t.slug, t.sources);
  if (t.seeIt) {
    seeItCount++;
    // Hard gate: the deep link must land on an audited seed and a real element.
    for (const p of seeItProblems(t.seeIt, FLOW_CATALOG)) fail(t.slug, p);
    const seed = FLOW_CATALOG[t.seeIt.seedId];
    const hints = t.railFamily ? FAMILY_HINTS[t.railFamily] : undefined;
    if (seed && hints) {
      const haystack = [
        t.seeIt.seedId,
        seed.metadata.title,
        ...(seed.metadata.tags ?? []),
        ...(seed.metadata.primaryRails ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!hints.some((h) => haystack.includes(h)))
        console.warn(`  ! ${t.slug}: seeIt rail-family fit — "${t.railFamily}" term links seed "${t.seeIt.seedId}"`);
    }
  }
  if (failures === before) console.log(`  ✓ ${t.slug}`);
}
console.log(`\n${seeItCount} of ${GLOSSARY.length} terms have a live diagram link`);

console.log("\nGuides:");
for (const g of GUIDES) {
  const before = failures;
  if (!g.answer?.trim()) fail(g.slug, "empty answer");
  if (!g.summary?.trim()) fail(g.slug, "empty summary");
  if (!g.steps?.length) fail(g.slug, "no steps");
  if (!g.sources?.length) fail(g.slug, "no sources");
  for (const r of g.relatedTerms ?? []) if (!termSlugs.has(r)) fail(g.slug, `relatedTerms → unknown term "${r}"`);
  for (const s of g.seeds ?? []) if (!seedIds.has(s.seedId)) fail(g.slug, `seed → unknown FLOW_CATALOG id "${s.seedId}"`);
  for (const p of g.prompts ?? []) if (p.seedId && !seedIds.has(p.seedId)) fail(g.slug, `prompt seedId → unknown FLOW_CATALOG id "${p.seedId}"`);
  if (g.diagram) {
    const nodeIds = new Set(g.diagram.nodes.map((n) => n.id));
    if (!g.diagram.nodes.length) fail(g.slug, "diagram has no nodes");
    if (!g.diagram.legs.length) fail(g.slug, "diagram has no legs");
    for (const leg of g.diagram.legs) {
      if (!nodeIds.has(leg.from)) fail(g.slug, `diagram leg.from → unknown node "${leg.from}"`);
      if (!nodeIds.has(leg.to)) fail(g.slug, `diagram leg.to → unknown node "${leg.to}"`);
      if (leg.from === leg.to) fail(g.slug, `diagram leg is a self-loop on "${leg.from}"`);
    }
  }
  checkSources(g.slug, g.sources);
  if (failures === before) console.log(`  ✓ ${g.slug}`);
}

console.log("\nFlows (annotated):");
for (const f of FLOW_ANNOTATIONS) {
  const before = failures;
  if (!f.answer?.trim()) fail(f.slug, "empty answer");
  if (!f.summary?.trim()) fail(f.slug, "empty summary");
  const seed = FLOW_CATALOG[f.seedId];
  if (!seed) {
    fail(f.slug, `seedId → unknown FLOW_CATALOG id "${f.seedId}"`);
    continue;
  }
  const edgeIds = new Set(seed.edges.map((e) => e.id));
  const nodeIds = new Set(seed.nodes.map((n) => n.id));
  // Every authored spine line must pin to a real edge on the seed.
  for (const eid of Object.keys(f.lines)) if (!edgeIds.has(eid)) fail(f.slug, `lines → unknown edge "${eid}"`);
  if (f.keyLeg && !edgeIds.has(f.keyLeg)) fail(f.slug, `keyLeg → unknown edge "${f.keyLeg}"`);
  // Margin notes: stable pins, non-empty bodies, unique ids, receipts must cite.
  const noteIds = new Map<string, number>();
  for (const note of f.notes) {
    noteIds.set(note.id, (noteIds.get(note.id) ?? 0) + 1);
    if (!note.body?.trim()) fail(f.slug, `note "${note.id}" empty body`);
    if (!note.pinTo.edgeId && !note.pinTo.nodeId) fail(f.slug, `note "${note.id}" pins to nothing`);
    if (note.pinTo.edgeId && !edgeIds.has(note.pinTo.edgeId)) fail(f.slug, `note "${note.id}" → unknown edge "${note.pinTo.edgeId}"`);
    if (note.pinTo.nodeId && !nodeIds.has(note.pinTo.nodeId)) fail(f.slug, `note "${note.id}" → unknown node "${note.pinTo.nodeId}"`);
    if (note.kind === "receipt" && !note.source) fail(f.slug, `receipt note "${note.id}" has no source`);
    if (note.source) checkSources(f.slug, [note.source]);
  }
  for (const [id, n] of noteIds) if (n > 1) fail(f.slug, `note id "${id}" used ${n} times`);
  for (const r of f.relatedTerms ?? []) if (!termSlugs.has(r)) fail(f.slug, `relatedTerms → unknown term "${r}"`);
  checkSources(f.slug, f.sources);
  if (failures === before) console.log(`  ✓ ${f.slug}`);
}

// Soft warnings (don't fail): a short list usually means an authoring drop.
if (GLOSSARY.length < 32) console.warn(`  ! glossary has ${GLOSSARY.length} terms (<32 expected)`);
if (GUIDES.length < 16) console.warn(`  ! guides has ${GUIDES.length} (<16 expected)`);
// A single URL cited under more than 3 distinct labels is a recycled citation,
// one page carrying many different promises. Surfaced here, never fatal.
for (const [url, labels] of urlLabels) {
  if (labels.size > 3) {
    console.warn(
      `  ! url cited under ${labels.size} distinct labels: ${url}\n` +
        [...labels].map((l) => `      - "${l}"`).join("\n")
    );
  }
}

if (failures) {
  console.error(`\n${failures} content failure(s)`);
  process.exit(1);
}
console.log(
  `\nAll ${GLOSSARY.length} terms + ${GUIDES.length} guides + ${FLOW_ANNOTATIONS.length} annotated flow(s) pass integrity checks.`,
);
