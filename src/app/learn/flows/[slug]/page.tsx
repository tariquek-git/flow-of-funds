import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlowAnnotation, FLOW_ANNOTATIONS } from "@/content";
import type { MarginNote, MarginNoteKind } from "@/content/types";
import { FLOW_CATALOG } from "@/lib/flows/catalog";
import {
  Eyebrow,
  LearnCrumbs,
  LearnDisclaimer,
  SourceList,
  StudioChip,
  TermPills,
} from "@/components/learn/parts";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FLOW_ANNOTATIONS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = getFlowAnnotation(slug);
  if (!f) return {};
  return {
    title: `${f.title} · Flow of Funds`,
    description: f.answer,
    alternates: { canonical: `/learn/flows/${f.slug}` },
  };
}

/** The leg's dominant teaching layer. A leg tagged money+message reads as "both"
 *  (the instruction and the funds travel together); exception always wins. */
type LegKind = "money" | "message" | "exception" | "both";
function legKind(layers?: string[]): LegKind {
  if (!layers?.length) return "message";
  if (layers.includes("exception")) return "exception";
  const money = layers.includes("money");
  const message = layers.includes("message");
  if (money && message) return "both";
  if (money) return "money";
  return "message";
}

const LEG: Record<LegKind, { tag: string; dot: string; chip: string }> = {
  money: { tag: "money", dot: "border-[#e8d9a8] bg-[#f7efd8]", chip: "bg-[#f7efd8] text-[#8a5e00] border-[#e8d9a8]" },
  message: { tag: "message", dot: "border-[#e4dfd2] bg-[#ede7da]", chip: "bg-[#ede7da] text-[#6b6b66] border-[#e4dfd2]" },
  exception: { tag: "exception", dot: "border-[#f1c9d1] bg-[#fbe9ec]", chip: "bg-[#fbe9ec] text-[#b0182f] border-[#f1c9d1]" },
  both: { tag: "money + message", dot: "border-[#e8d9a8] bg-[#f3eede]", chip: "bg-[#f3eede] text-[#8a5e00] border-[#e8d9a8]" },
};

const NOTE: Record<MarginNoteKind, { label: string; glyph: string; chip: string }> = {
  burn: { label: "Where people get burned", glyph: "▲", chip: "bg-[#fbe9ec] text-[#b0182f] border-[#f1c9d1]" },
  "war-story": { label: "Field note", glyph: "✎", chip: "bg-[#efece5] text-[#1c1c1c] border-[#e4dfd2]" },
  receipt: { label: "Why we're sure", glyph: "❖", chip: "bg-[#f7efd8] text-[#8a5e00] border-[#e8d9a8]" },
  depth: { label: "Going deeper", glyph: "↳", chip: "bg-[#efece5] text-[#6b6b66] border-[#e4dfd2]" },
  myth: { label: "Myth vs reality", glyph: "✗", chip: "bg-[#fbe9ec] text-[#b0182f] border-[#f1c9d1]" },
};

function MarginCard({ note }: { note: MarginNote }) {
  const meta = NOTE[note.kind];
  return (
    <div className="rounded-xl border border-[#e4dfd2] bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-tight ${meta.chip}`}
        >
          <span aria-hidden>{meta.glyph}</span>
          {meta.label}
        </span>
        {note.draft ? (
          <span className="inline-flex items-center rounded-full border border-[#d8d1c0] bg-[#f4f0e6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a857c]">
            Draft
          </span>
        ) : null}
        {note.dated ? <span className="text-[11px] text-[#8a857c]">{note.dated}</span> : null}
      </div>
      <p className="mt-2 text-[13px] font-semibold text-[#1c1c1c]">{note.label}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#1c1c1c]">{note.body}</p>
      {note.source ? (
        <div className="mt-2.5 border-t border-[#ede7da] pt-2">
          <SourceList sources={[note.source]} />
        </div>
      ) : null}
    </div>
  );
}

export default async function FlowAnnotationPage({ params }: Params) {
  const { slug } = await params;
  const f = getFlowAnnotation(slug);
  if (!f) notFound();

  const seed = FLOW_CATALOG[f.seedId];
  if (!seed) notFound();

  // Spine ordering is seed-owned (by ordinal); prose and notes are authored.
  const edges = [...seed.edges].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  // Draft notes (the war-story placeholders awaiting the owner's own words) are
  // authoring scaffolding: visible in dev so they're easy to find and fill, but
  // NEVER shipped to the published page. A real story appears the moment it's
  // written and `draft` is removed.
  const showDrafts = process.env.NODE_ENV !== "production";
  const notesByEdge = new Map<string, MarginNote[]>();
  for (const n of f.notes) {
    if (!n.pinTo.edgeId) continue;
    if (n.draft && !showDrafts) continue;
    const list = notesByEdge.get(n.pinTo.edgeId);
    if (list) list.push(n);
    else notesByEdge.set(n.pinTo.edgeId, [n]);
  }
  const studioPrompt = seed.metadata?.title ?? f.title;

  return (
    <main className="mx-auto w-[min(820px,calc(100vw-40px))] py-12">
      <LearnCrumbs
        trail={[
          { label: "Learn", href: "/learn" },
          { label: "Flows", href: "/learn" },
          { label: f.title },
        ]}
      />
      <header className="border-b border-[#e4dfd2] pb-6">
        <Eyebrow>Annotated flow</Eyebrow>
        <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-[#1c1c1c]">
          {f.title}
        </h1>
        <p className="mt-3 rounded-r-lg border-l-2 border-[#C41E3A] bg-[#fbf9f3] px-4 py-3 text-[15px] leading-relaxed text-[#1c1c1c]">
          {f.answer}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#8a857c]">
          <span>{f.audience}</span>
          {f.byline ? (
            <>
              <span aria-hidden className="text-[#d8d1c0]">·</span>
              <span>{f.byline}</span>
            </>
          ) : null}
        </div>
      </header>

      <article className="mt-7 space-y-8">
        <p className="text-[14.5px] leading-relaxed text-[#1c1c1c]">{f.summary}</p>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Eyebrow>The flow, leg by leg</Eyebrow>
            <span className="text-[11.5px] text-[#8a857c]">
              Read the spine straight down · open a margin to go deeper
            </span>
          </div>

          <ol className="mt-4 space-y-2.5">
            {edges.map((e, i) => {
              const kind = legKind(e.layers);
              const meta = LEG[kind];
              const line = f.lines[e.id] ?? e.label ?? e.rail;
              const notes = notesByEdge.get(e.id) ?? [];
              const isKey = f.keyLeg === e.id;
              return (
                <li
                  key={e.id}
                  className={`rounded-xl border bg-white p-4 ${isKey ? "border-[#C41E3A] ring-1 ring-[#C41E3A]/15" : "border-[#e4dfd2]"}`}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums text-[#1c1c1c] ${meta.dot}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}
                        >
                          {meta.tag}
                        </span>
                        {e.timing ? (
                          <span className="text-[11px] text-[#8a857c]">{e.timing}</span>
                        ) : null}
                        {isKey ? (
                          <span className="text-[11px] font-semibold text-[#C41E3A]">
                            ← the gap most people miss
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[14px] leading-relaxed text-[#1c1c1c]">{line}</p>

                      {notes.length ? (
                        <details className="group mt-2.5">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium text-[#C41E3A] [&::-webkit-details-marker]:hidden">
                            <span aria-hidden className="transition-transform group-open:rotate-90">
                              ▸
                            </span>
                            Read the margin · {notes.length} note{notes.length > 1 ? "s" : ""}
                          </summary>
                          <div className="mt-2.5 space-y-2.5 border-l-2 border-[#ede7da] pl-3.5">
                            {notes.map((n) => (
                              <MarginCard key={n.id} note={n} />
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#8a857c]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#e8d9a8] bg-[#f7efd8]" /> money · funds
              actually move
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#e4dfd2] bg-[#ede7da]" /> message ·
              instructions, no money yet
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#f1c9d1] bg-[#fbe9ec]" /> exception ·
              reversal / dispute
            </span>
          </div>
        </section>

        <section>
          <Eyebrow>See it in the studio</Eyebrow>
          <p className="mb-3 mt-1.5 text-[13px] leading-relaxed text-[#6b6b66]">
            The same grounded flow, as a live diagram you can re-route, dim to one layer, or push to
            its exception path.
          </p>
          <StudioChip q={studioPrompt} label={studioPrompt} sub="Audited template · loads instantly" />
        </section>

        {f.relatedTerms?.length ? (
          <section>
            <Eyebrow>Terms on this page</Eyebrow>
            <div className="mt-3">
              <TermPills slugs={f.relatedTerms} />
            </div>
          </section>
        ) : null}

        {f.sources?.length ? (
          <section>
            <Eyebrow>Sources</Eyebrow>
            <div className="mt-3">
              <SourceList sources={f.sources} />
            </div>
          </section>
        ) : null}

        <LearnDisclaimer />
      </article>
    </main>
  );
}
