import type { Metadata } from "next";
import Link from "next/link";
import { allGuides } from "@/content";
import { LearnCrumbs, RailIcon } from "@/components/learn/parts";

export const metadata: Metadata = {
  title: "Payments how-it-works guides · Flow of Funds",
  description:
    "Step-by-step, plain-English walkthroughs of how real payments move: Interac e-Transfer, a card tap to settlement, ACH credit vs debit, payroll, cross-border wires, FBO accounts, chargebacks, marketplace payouts, wallet top-ups, and stablecoin on/off-ramps.",
  alternates: { canonical: "/learn/guides" },
};

export default function GuidesIndex() {
  const guides = allGuides();

  return (
    <main className="mx-auto w-[min(880px,calc(100vw-40px))] py-12">
      <LearnCrumbs trail={[{ label: "Learn", href: "/learn" }, { label: "Guides" }]} />
      <header className="border-b border-[#e4dfd2] pb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1c1c1c]">How-it-works guides</h1>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-[#6b6b66]">
          {guides.length} step-by-step walkthroughs of real flows: each one separates the message
          legs (instructions) from the money legs (funds), and links straight into the studio so you
          can see it as a diagram.
        </p>
      </header>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/learn/guides/${g.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-[#e4dfd2] bg-white p-5 transition-colors hover:border-[#C41E3A]"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#e4dfd2] bg-[#faf8f2] text-[#C41E3A]">
                <RailIcon family={g.railFamily} className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-[16px] font-semibold leading-snug text-[#1c1c1c] group-hover:text-[#C41E3A]">
                {g.title}
              </h2>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[#6b6b66]">{g.answer}</p>
              <span className="mt-3 text-[12px] text-[#8a857c]">{g.audience}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
