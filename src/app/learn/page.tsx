import type { Metadata } from "next";
import Link from "next/link";
import { allFlowAnnotations, allGuides, allTerms } from "@/content";
import { COMPARE_PAIRS } from "@/content/compare";
import { Eyebrow, LearnDisclaimer, TermPills } from "@/components/learn/parts";

export const metadata: Metadata = {
  title: "Learn the flow of funds · by Fintech North",
  description:
    "A plain-English glossary and how-it-works guides for payments: issuers, acquirers, authorization vs settlement, ACH, cross-border wires, FBO accounts, stablecoins and more. The knowledge layer behind the Flow of Funds studio.",
  alternates: { canonical: "/learn" },
};

export default function LearnHome() {
  const terms = allTerms();
  const guides = allGuides();
  const flows = allFlowAnnotations();
  const featured = guides.slice(0, 4);
  const starters = ["issuer", "acquirer", "settlement", "interchange", "fbo-account", "stablecoin"];

  return (
    <main className="mx-auto w-[min(960px,calc(100vw-40px))] py-12">
      <header className="pb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a857c]">
          Flow of Funds · Learn
        </p>
        <h1 className="mt-2 text-[30px] font-bold tracking-tight text-[#1c1c1c] sm:text-[34px]">
          Learn the flow of funds
        </h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[#1c1c1c]">
          Payments has its own language: issuers and acquirers, authorization and settlement, ODFI
          and RDFI, FBO accounts and on-ramps. This is the plain-English companion to the studio: a{" "}
          <strong className="font-semibold">glossary</strong> that defines the parts, and{" "}
          <strong className="font-semibold">guides</strong> that walk through how the money actually
          moves, keeping the message legs (instructions) honest about the money legs (funds).
        </p>
        <div className="mt-4 max-w-[62ch]">
          <LearnDisclaimer />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/learn/glossary"
          className="group rounded-2xl border border-[#e4dfd2] bg-white p-6 transition-colors hover:border-[#C41E3A]"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Glossary</h2>
            <span className="text-[13px] font-medium text-[#6b6b66]">{terms.length} terms</span>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#6b6b66]">
            Short, source-cited definitions of the parties and steps in a payment, and the
            misconceptions people trip on.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#C41E3A]">
            Browse the glossary
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </Link>

        <Link
          href="/learn/guides"
          className="group rounded-2xl border border-[#e4dfd2] bg-white p-6 transition-colors hover:border-[#C41E3A]"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Guides</h2>
            <span className="text-[13px] font-medium text-[#6b6b66]">{guides.length} guides</span>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#6b6b66]">
            Step-by-step walkthroughs of real flows: Interac e-Transfer, a card tap, ACH payroll, a
            cross-border wire, stablecoin on/off-ramps, money leg by message leg.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#C41E3A]">
            Read the guides
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </Link>

        <Link
          href="/compare"
          className="group rounded-2xl border border-[#e4dfd2] bg-white p-6 transition-colors hover:border-[#C41E3A]"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold text-[#1c1c1c]">Compare rails</h2>
            <span className="text-[13px] font-medium text-[#6b6b66]">{COMPARE_PAIRS.length} pairs</span>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#6b6b66]">
            Side-by-side, vendor-neutral comparisons of rails that genuinely compete (FedNow vs RTP,
            Lynx vs ACSS), with the diff and when to pick each.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#C41E3A]">
            Compare rails
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </Link>
      </div>

      <section className="mt-10">
        <Eyebrow>Start with a guide</Eyebrow>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {featured.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/learn/guides/${g.slug}`}
                className="group flex h-full flex-col rounded-xl border border-[#e4dfd2] bg-white px-4 py-3.5 transition-colors hover:border-[#C41E3A]"
              >
                <span className="text-[14px] font-medium text-[#1c1c1c] group-hover:text-[#C41E3A]">
                  {g.title}
                </span>
                <span className="mt-1 text-[12.5px] leading-snug text-[#6b6b66]">{g.answer}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {flows.length ? (
        <section className="mt-10">
          <Eyebrow>Annotated flows</Eyebrow>
          <p className="mb-3 mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-[#6b6b66]">
            One real flow, read straight down in plain English, then pull a margin open on any leg
            for the timing, the rulebook, or where it actually trips people up. Same flow, whatever
            depth you&rsquo;re after.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {flows.map((fl) => (
              <li key={fl.slug}>
                <Link
                  href={`/learn/flows/${fl.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-[#e4dfd2] bg-white px-4 py-3.5 transition-colors hover:border-[#C41E3A]"
                >
                  <span className="text-[14px] font-medium text-[#1c1c1c] group-hover:text-[#C41E3A]">
                    {fl.title}
                  </span>
                  <span className="mt-1 text-[12.5px] leading-snug text-[#6b6b66]">{fl.answer}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-9">
        <Eyebrow>Handy terms</Eyebrow>
        <div className="mt-3">
          <TermPills slugs={starters} />
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-[#e4dfd2] bg-[#fbf9f3] p-6 text-center">
        <h2 className="text-[17px] font-semibold text-[#1c1c1c]">See it as a diagram</h2>
        <p className="mx-auto mt-1.5 max-w-[50ch] text-[13.5px] leading-relaxed text-[#6b6b66]">
          Describe any payment in plain English and the studio draws the whole flow, every party,
          rail, and settlement leg.
        </p>
        <a
          href="/studio"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#C41E3A] px-5 py-2.5 text-[14px] font-medium text-white transition-[filter] hover:brightness-110"
        >
          Open the studio
          <span aria-hidden>→</span>
        </a>
      </section>
    </main>
  );
}
