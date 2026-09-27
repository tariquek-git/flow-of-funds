import type { Metadata } from "next";
import Link from "next/link";
import { allComparisons, getComparison } from "@/content/compare";
import { LearnCrumbs, LearnDisclaimer } from "@/components/learn/parts";

export const metadata: Metadata = {
  title: "Compare payment rails, side by side · Flow of Funds",
  description:
    "Vendor-neutral, side-by-side comparisons of payment rails that genuinely compete: FedNow vs RTP, ACH vs RTP, Interac e-Transfer vs the Real-Time Rail, Lynx vs ACSS, and two BaaS program structures. Each comparison shows the diff and when to pick each.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndex() {
  // Only render cards whose seeds actually resolve (defensive; the content check
  // guarantees this, but a card should never link to a 404).
  const cards = allComparisons().filter((p) => getComparison(p.id));

  return (
    <main className="mx-auto w-[min(960px,calc(100vw-40px))] py-12">
      <LearnCrumbs trail={[{ label: "Learn", href: "/learn" }, { label: "Compare rails" }]} />
      <header className="border-b border-[#e4dfd2] pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a857c]">
          Flow of Funds · Compare
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight text-[#1c1c1c] sm:text-[32px]">
          Compare payment rails, side by side
        </h1>
        <p className="mt-3 max-w-[64ch] text-[14.5px] leading-relaxed text-[#1c1c1c]">
          Decision mode: a vendor-neutral, side-by-side look at rails that genuinely{" "}
          <strong className="font-semibold">compete</strong> (same market, same job). We do not pit
          incomparable rails against each other (no ACH vs Pix). Each comparison shows both flows, a
          diff of the attributes that matter, and one line on when you would pick each.
        </p>
        <div className="mt-4 max-w-[64ch]">
          <LearnDisclaimer />
        </div>
      </header>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((p) => (
          <li key={p.id}>
            <Link
              href={`/compare/${p.id}`}
              className="group flex h-full flex-col rounded-2xl border border-[#e4dfd2] bg-white p-5 transition-colors hover:border-[#C41E3A]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[16px] font-semibold leading-snug text-[#1c1c1c] group-hover:text-[#C41E3A]">
                  {p.title}
                </h2>
                <span className="shrink-0 text-[11.5px] font-medium text-[#8a857c]">
                  {p.jurisdiction}
                </span>
              </div>
              <p className="mt-2 text-[12.5px] font-medium text-[#6b6b66]">{p.job}</p>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#6b6b66]">{p.theDecision}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#C41E3A]">
                See the comparison
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-2xl border border-[#e4dfd2] bg-[#fbf9f3] p-6 text-center">
        <h2 className="text-[17px] font-semibold text-[#1c1c1c]">Want a different angle?</h2>
        <p className="mx-auto mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-[#6b6b66]">
          The studio draws any single flow from plain English, and the guides walk each rail through
          step by step.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/learn/guides"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e4dfd2] bg-white px-5 py-2.5 text-[14px] font-medium text-[#1c1c1c] transition-colors hover:border-[#C41E3A]"
          >
            Read the guides
          </Link>
          <a
            href="/studio"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#C41E3A] px-5 py-2.5 text-[14px] font-medium text-white transition-[filter] hover:brightness-110"
          >
            Open the studio
            <span aria-hidden>→</span>
          </a>
        </div>
      </section>
    </main>
  );
}
