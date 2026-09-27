import Link from "next/link";
import { FintechNorthMark } from "./FintechNorthMark";

/**
 * Shared site chrome for the standalone pages (privacy, terms, unlock). The
 * studio is full-bleed and carries its own in-canvas chrome, so these are NOT
 * used there — they exist to make the surrounding pages read as one cohesive
 * Fintech North family rather than a scatter of disconnected documents.
 *
 * Harmonized with fintechnorth.ca and the landing: the same Polaris constellation
 * mark, the same footer lockup (FINTECH NORTH · email · the community → · ©, then
 * the cross-links), and the same maple-red accent — in the light, banker-grade
 * register the studio and legal pages share.
 *
 * Server components by design: no client state, so they add nothing to the
 * bundle and render at first paint.
 */

const CONTACT_EMAIL = "hello@fintechnorth.ca";
const COMMUNITY_URL = "https://fintechnorth.ca";

/**
 * Light wordmark header. The lockup links to the front door (`/`) so legal and
 * learn visitors can reach it; "Open the tool" in the nav is the way into the
 * studio, and the right-hand link goes out to the community site, mirroring how
 * fintechnorth.ca links in to the tool.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-[#e4dfd2]">
      <div className="mx-auto flex w-[min(960px,calc(100vw-40px))] items-center justify-between py-4">
        <Link
          href="/"
          aria-label="Flow of Funds, back to the front door"
          className="group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40"
        >
          <FintechNorthMark size={26} className="shrink-0 text-[#1c1c1c]" />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-[#1c1c1c]">
              Flow of Funds
            </span>
            <span className="text-[11.5px] font-medium text-[#6b6b66]">by Fintech North</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/learn"
            className="text-[12px] font-medium text-[#6b6b66] underline-offset-2 transition-colors hover:text-[#1c1c1c] hover:underline"
          >
            Learn
          </Link>
          <Link
            href="/studio"
            className="text-[12px] font-medium text-[#6b6b66] underline-offset-2 transition-colors hover:text-[#1c1c1c] hover:underline"
          >
            Open the tool
          </Link>
          <a
            href={COMMUNITY_URL}
            className="hidden text-[12px] font-medium text-[#6b6b66] underline-offset-2 transition-colors hover:text-[#1c1c1c] hover:underline sm:inline"
          >
            the community ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

/**
 * Shared footer, mirroring the fintechnorth.ca lockup: the constellation +
 * FINTECH NORTH, contact, a link out to the community, and the copyright — then
 * the tool's own cross-links and the house sign-off. `currentPage` drops the
 * self-link so a page never links to itself.
 */
export function SiteFooter({ currentPage }: { currentPage?: "privacy" | "terms" | "learn" }) {
  return (
    <footer className="mt-16 border-t border-[#e4dfd2]">
      <div className="mx-auto w-[min(960px,calc(100vw-40px))] py-7 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[12px] text-[#6b6b66]">
          <span className="inline-flex items-center gap-1.5 font-medium tracking-[0.12em] text-[#1c1c1c]">
            <FintechNorthMark size={15} className="text-[#1c1c1c]" />
            FINTECH NORTH
          </span>
          <span className="text-[#e4dfd2]">·</span>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Flow%20of%20Funds`}
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          <span className="text-[#e4dfd2]">·</span>
          <a
            href={COMMUNITY_URL}
            className="underline-offset-2 hover:text-[#1c1c1c] hover:underline"
          >
            the community →
          </a>
          <span className="text-[#e4dfd2]">·</span>
          <span>© {new Date().getFullYear()} Fintech North</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11.5px] text-[#6b6b66]">
          <Link href="/" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
            Home
          </Link>
          {currentPage !== "privacy" && (
            <Link href="/privacy" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
              Privacy
            </Link>
          )}
          {currentPage !== "terms" && (
            <Link href="/terms" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
              Terms
            </Link>
          )}
          {currentPage !== "learn" && (
            <Link href="/learn" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
              Learn
            </Link>
          )}
          <Link href="/studio" className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
            Open the tool
          </Link>
          <span className="text-[#e4dfd2]">·</span>
          <span className="tracking-[0.14em]">HEY FROM TORONTO</span>
        </div>
      </div>
    </footer>
  );
}
