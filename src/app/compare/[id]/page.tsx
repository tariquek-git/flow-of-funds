import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARE_PAIRS, getComparison } from "@/content/compare";
import { Eyebrow, LearnCrumbs, LearnDisclaimer } from "@/components/learn/parts";
import { DiffTable, FlowCard } from "@/components/compare/CompareParts";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return COMPARE_PAIRS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const c = getComparison(id);
  if (!c) return {};
  return {
    title: `${c.pair.title} · Flow of Funds`,
    description: c.pair.theDecision,
    alternates: { canonical: `/compare/${c.pair.id}` },
  };
}

/** Map a studio seed title into the studio prompt that loads it instantly. */
function studioHref(title: string): string {
  return `/studio?q=${encodeURIComponent(title)}`;
}

export default async function ComparePage({ params }: Params) {
  const { id } = await params;
  const c = getComparison(id);
  if (!c) notFound();
  const { pair, a, b } = c;

  return (
    <main className="mx-auto w-[min(1040px,calc(100vw-40px))] py-12">
      <LearnCrumbs
        trail={[
          { label: "Learn", href: "/learn" },
          { label: "Compare rails", href: "/compare" },
          { label: pair.title },
        ]}
      />
      <header className="border-b border-[#e4dfd2] pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1c1c1c] sm:text-[30px]">
            {pair.title}
          </h1>
          <span className="text-[12px] font-medium text-[#8a857c]">{pair.jurisdiction}</span>
        </div>
        <p className="mt-2 text-[13px] font-medium text-[#6b6b66]">
          Same job: {pair.job}.
        </p>
        <p className="mt-3 rounded-r-lg border-l-2 border-[#C41E3A] bg-[#fbf9f3] px-4 py-3 text-[15px] leading-relaxed text-[#1c1c1c]">
          <span className="font-semibold">The decision: </span>
          {pair.theDecision}
        </p>
      </header>

      <section className="mt-7">
        <Eyebrow>The diff</Eyebrow>
        <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-[#6b6b66]">
          Pulled from each rail&rsquo;s audited flow. Highlighted rows are where the two differ.
        </p>
        <div className="mt-3">
          <DiffTable a={a} b={b} aTitle={a.metadata.title} bTitle={b.metadata.title} />
        </div>
      </section>

      <section className="mt-9">
        <Eyebrow>Both flows, side by side</Eyebrow>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <FlowCard flow={a} />
          <FlowCard flow={b} />
        </div>
      </section>

      <section className="mt-9">
        <Eyebrow>See each in the studio</Eyebrow>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          {[a, b].map((flow) => (
            <a
              key={flow.id}
              href={studioHref(flow.metadata.title)}
              className="group inline-flex flex-1 flex-col rounded-xl border border-[#e4dfd2] bg-white px-4 py-3 transition-colors hover:border-[#C41E3A]"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-[#1c1c1c]">
                <span className="truncate">{flow.metadata.title}</span>
                <span aria-hidden className="text-[#C41E3A] transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
              <span className="mt-0.5 text-[11.5px] text-[#6b6b66]">
                Audited template · loads instantly
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-9">
        <Link
          href="/compare"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#C41E3A] underline-offset-2 hover:underline"
        >
          <span aria-hidden>←</span> All rail comparisons
        </Link>
      </section>

      <div className="mt-8">
        <LearnDisclaimer />
      </div>
    </main>
  );
}
