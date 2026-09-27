import type { Metadata } from "next";
import Link from "next/link";
import { allTerms, termsByLetter } from "@/content";
import { FlowLayerBadge, LearnCrumbs } from "@/components/learn/parts";

export const metadata: Metadata = {
  title: "Payments glossary · Flow of Funds",
  description:
    "Plain-English, source-cited definitions of payments terms: issuer, acquirer, processor, interchange, authorization, clearing, settlement, ODFI/RDFI, FBO account, correspondent bank, nostro/vostro, stablecoin, on-ramp and off-ramp.",
  alternates: { canonical: "/learn/glossary" },
};

export default function GlossaryIndex() {
  const groups = termsByLetter();
  const count = allTerms().length;

  return (
    <main className="mx-auto w-[min(880px,calc(100vw-40px))] py-12">
      <LearnCrumbs trail={[{ label: "Learn", href: "/learn" }, { label: "Glossary" }]} />
      <header className="border-b border-[#e4dfd2] pb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1c1c1c]">Payments glossary</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-[#6b6b66]">
          {count} plain-English, source-cited definitions: the parties and steps in a payment, and
          where each one sits on the money leg or the message leg.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.letter} className="mt-8">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#C41E3A]">{g.letter}</h2>
          <ul className="mt-2 divide-y divide-[#ede7da]">
            {g.terms.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/learn/glossary/${t.slug}`}
                  className="group block py-3.5 transition-colors"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#1c1c1c] group-hover:text-[#C41E3A]">
                      {t.term}
                    </span>
                    <FlowLayerBadge layer={t.flowLayer} />
                    {/* Gold dot = this term has a "See it move" live diagram link. */}
                    {t.seeIt && (
                      <span
                        aria-hidden
                        title="Has a live diagram link"
                        className="inline-block h-1.5 w-1.5 rounded-full bg-[#b8860b]"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-[#6b6b66]">
                    {t.short}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
