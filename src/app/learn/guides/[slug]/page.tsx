import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, GLOSSARY, GUIDES } from "@/content";
import { FLOW_CATALOG } from "@/lib/flows/catalog";
import {
  Eyebrow,
  GuideSequenceDiagram,
  LearnCrumbs,
  LearnDisclaimer,
  MisconceptionList,
  SourceList,
  stepColor,
  StepKindTag,
  StudioChip,
  TermPills,
} from "@/components/learn/parts";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: `${g.title} · Flow of Funds`,
    description: g.answer,
    alternates: { canonical: `/learn/guides/${g.slug}` },
  };
}

function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e4dfd2] bg-[#fbf9f3] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a857c]">{label}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#1c1c1c]">{children}</p>
    </div>
  );
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const seedLinks = (g.seeds ?? []).map((s) => {
    const title = FLOW_CATALOG[s.seedId]?.metadata?.title;
    const label = s.label ?? title ?? s.seedId;
    return { label, q: title ?? label };
  });

  // Guide's own terms first, then glossary terms that link back to this guide (A to Z).
  const ownTermSlugs = g.relatedTerms ?? [];
  const reverseLinkedSlugs = GLOSSARY.filter(
    (t) => t.guides?.includes(g.slug) && !ownTermSlugs.includes(t.slug),
  )
    .sort((a, b) => a.term.localeCompare(b.term))
    .map((t) => t.slug);
  const termSlugs = [...ownTermSlugs, ...reverseLinkedSlugs];

  return (
    <main className="mx-auto w-[min(760px,calc(100vw-40px))] py-12">
      <LearnCrumbs
        trail={[
          { label: "Learn", href: "/learn" },
          { label: "Guides", href: "/learn/guides" },
          { label: g.title },
        ]}
      />
      <header className="border-b border-[#e4dfd2] pb-6">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1c1c1c]">
          {g.title}
        </h1>
        <p className="mt-3 rounded-r-lg border-l-2 border-[#C41E3A] bg-[#fbf9f3] px-4 py-3 text-[15px] leading-relaxed text-[#1c1c1c]">
          {g.answer}
        </p>
        <p className="mt-3 text-[12.5px] text-[#8a857c]">{g.audience}</p>
      </header>

      <article className="mt-7 space-y-8">
        <p className="text-[14.5px] leading-relaxed text-[#1c1c1c]">{g.summary}</p>

        {g.diagram ? (
          <section>
            <Eyebrow>The flow at a glance</Eyebrow>
            <div className="mt-3">
              <GuideSequenceDiagram diagram={g.diagram} />
            </div>
          </section>
        ) : null}

        {g.parties?.length ? (
          <section>
            <Eyebrow>Who&rsquo;s involved</Eyebrow>
            <dl className="mt-3 divide-y divide-[#ede7da] overflow-hidden rounded-xl border border-[#e4dfd2]">
              {g.parties.map((p, i) => (
                <div key={i} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4">
                  <dt className="font-semibold text-[#1c1c1c] sm:w-[190px] sm:shrink-0">{p.name}</dt>
                  <dd className="text-[13.5px] leading-snug text-[#6b6b66]">{p.role}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section>
          <Eyebrow>How it moves, step by step</Eyebrow>
          <ol className="mt-3 space-y-3.5">
            {g.steps.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums text-white"
                  style={{ backgroundColor: stepColor[s.kind] }}
                >
                  {s.n}
                </span>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StepKindTag kind={s.kind} />
                    {s.party ? (
                      <span className="text-[11.5px] font-medium text-[#8a857c]">{s.party}</span>
                    ) : null}
                  </div>
                  <p className="text-[14px] leading-relaxed text-[#1c1c1c]">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#8a857c]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#e8d9a8] bg-[#f7efd8]" /> money: funds
              actually move
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#dbe2ea] bg-[#eef1f4]" /> message:
              instructions, no money yet
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#f1c9d1] bg-[#fbe9ec]" /> exception:
              reversal / dispute
            </span>
          </div>
        </section>

        {g.settlementTiming || g.economics || g.riskNotes ? (
          <section className="grid gap-3">
            {g.settlementTiming ? <Callout label="When it&rsquo;s final">{g.settlementTiming}</Callout> : null}
            {g.economics ? <Callout label="The economics">{g.economics}</Callout> : null}
            {g.riskNotes ? <Callout label="Risk &amp; reversibility">{g.riskNotes}</Callout> : null}
          </section>
        ) : null}

        {g.misconceptions?.length ? (
          <section>
            <Eyebrow>Common misconceptions</Eyebrow>
            <div className="mt-3">
              <MisconceptionList items={g.misconceptions} />
            </div>
          </section>
        ) : null}

        {g.prompts?.length || seedLinks.length ? (
          <section>
            <Eyebrow>See it in the studio</Eyebrow>
            <div className="mt-3 flex flex-col gap-2.5">
              {(g.prompts ?? []).map((p, i) => (
                <StudioChip key={`p${i}`} q={p.prompt} label={p.prompt} sub={p.note} />
              ))}
              {seedLinks.map((s, i) => (
                <StudioChip key={`s${i}`} q={s.q} label={s.label} sub="Audited template, loads instantly" />
              ))}
            </div>
          </section>
        ) : null}

        {termSlugs.length ? (
          <section>
            <Eyebrow>Terms in this guide</Eyebrow>
            <div className="mt-3">
              <TermPills slugs={termSlugs} />
            </div>
          </section>
        ) : null}

        {g.sources?.length ? (
          <section>
            <Eyebrow>Sources</Eyebrow>
            <div className="mt-3">
              <SourceList sources={g.sources} />
            </div>
          </section>
        ) : null}

        <LearnDisclaimer />
      </article>
    </main>
  );
}
