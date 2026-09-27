import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GLOSSARY, getTerm, guidesUsingTerm } from "@/content";
import {
  Eyebrow,
  FlowLayerBadge,
  GuidePills,
  LearnCrumbs,
  LearnDisclaimer,
  MisconceptionList,
  SeeItMoveChip,
  SourceList,
  TermPills,
} from "@/components/learn/parts";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getTerm(slug);
  if (!t) return {};
  return {
    title: `${t.term} · payments glossary`,
    description: t.short,
    alternates: { canonical: `/learn/glossary/${t.slug}` },
  };
}

export default async function TermPage({ params }: Params) {
  const { slug } = await params;
  const t = getTerm(slug);
  if (!t) notFound();

  const usedIn = guidesUsingTerm(t.slug).map((g) => g.slug);
  const guideSlugs = Array.from(new Set([...(t.guides ?? []), ...usedIn]));

  return (
    <main className="mx-auto w-[min(760px,calc(100vw-40px))] py-12">
      <LearnCrumbs
        trail={[
          { label: "Learn", href: "/learn" },
          { label: "Glossary", href: "/learn/glossary" },
          { label: t.term },
        ]}
      />
      <header className="border-b border-[#e4dfd2] pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[27px] font-bold tracking-tight text-[#1c1c1c]">{t.term}</h1>
          <FlowLayerBadge layer={t.flowLayer} />
        </div>
        {t.aka?.length ? (
          <p className="mt-1.5 text-[13px] text-[#6b6b66]">Also known as: {t.aka.join(", ")}</p>
        ) : null}
        <p className="mt-3 text-[16px] leading-relaxed text-[#1c1c1c]">{t.short}</p>
      </header>

      <article className="mt-7 space-y-8">
        <p className="text-[14.5px] leading-relaxed text-[#1c1c1c]">{t.plain}</p>

        <section>
          <Eyebrow>In a flow</Eyebrow>
          <p className="mt-2 text-[14px] leading-relaxed text-[#1c1c1c]">{t.inAFlow}</p>
          {t.seeIt && (
            <div className="mt-3">
              <SeeItMoveChip seeIt={t.seeIt} />
            </div>
          )}
        </section>

        {t.misconceptions?.length ? (
          <section>
            <Eyebrow>Common misconceptions</Eyebrow>
            <div className="mt-3">
              <MisconceptionList items={t.misconceptions} />
            </div>
          </section>
        ) : null}

        {t.related?.length ? (
          <section>
            <Eyebrow>Related terms</Eyebrow>
            <div className="mt-3">
              <TermPills slugs={t.related} />
            </div>
          </section>
        ) : null}

        {guideSlugs.length ? (
          <section>
            <Eyebrow>See it in a guide</Eyebrow>
            <div className="mt-3">
              <GuidePills slugs={guideSlugs} />
            </div>
          </section>
        ) : null}

        {t.sources?.length ? (
          <section>
            <Eyebrow>Sources</Eyebrow>
            <div className="mt-3">
              <SourceList sources={t.sources} />
            </div>
          </section>
        ) : null}

        <LearnDisclaimer />
      </article>
    </main>
  );
}
