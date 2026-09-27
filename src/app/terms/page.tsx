import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Terms · Flow of Funds",
  description:
    "Terms of use for the Flow of Funds public preview: acceptable use, the informational nature of diagrams, ownership, and the absence of warranty.",
  robots: { index: false, follow: false },
};

// TODO(owner): legal sign-off needed before these are treated as binding terms.
// Confirm (1) the operating entity name and (2) the governing province /
// jurisdiction for any "governed by the laws of" clause a lawyer may want
// added. Contact email is confirmed below.
const CONTACT_EMAIL = "hello@fintechnorth.ca";
const LAST_UPDATED = "June 2026"; // TODO(owner): refresh on each material change

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-9">
      <h2 className="text-[16px] font-semibold tracking-tight text-[#1c1c1c]">{title}</h2>
      <div className="mt-2 space-y-3 text-[13.5px] leading-relaxed text-[#1c1c1c]">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-[min(720px,calc(100vw-40px))] py-12">
      <header className="pb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1c1c1c]">Terms of use</h1>
        <p className="mt-2 text-[13px] text-[#6b6b66]">
          The ground rules for using this hobby project. Last updated {LAST_UPDATED}.
        </p>
      </header>

      <p className="mt-2 border-t border-[#e4dfd2] pt-6 text-[13.5px] leading-relaxed text-[#1c1c1c]">
        Flow of Funds is a hobby project for the community, operated by Fintech North and shared as a
        public preview. By using it, you agree to these terms. If you do not agree, please do not use
        it.
      </p>

      <Section id="preview" title="A public preview">
        <p>
          This is an early preview shared openly with the community. It may change, break, or be
          taken offline at any time. Features, content, and availability are not guaranteed.
        </p>
      </Section>

      <Section id="informational" title="Diagrams are informational. Verify before relying on them">
        <p>
          The diagrams, labels, rails, timing, and explanations this tool produces are{" "}
          <strong>informational only</strong>. They are AI-generated and may be incomplete, outdated,
          or wrong. They are <strong>not legal, compliance, regulatory, accounting, or financial
          advice</strong>, and they are not a substitute for the authoritative rules of any payment
          network, operator, or regulator.
        </p>
        <p>
          Always verify any output against primary sources, the relevant scheme rules, operator
          documentation, and applicable regulation, and your own qualified advisors before relying
          on it for a decision, a deliverable, or anything client-facing. You are responsible for how
          you use what the tool produces.
        </p>
      </Section>

      <Section id="acceptable-use" title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>use the tool for anything unlawful, or to facilitate fraud or financial crime;</li>
          <li>
            submit confidential, personal, or sensitive information you are not authorized to share
            with a third-party AI provider;
          </li>
          <li>
            attempt to break, overload, scrape, reverse-engineer, or circumvent the rate limits or
            any access controls;
          </li>
          <li>
            present the tool&rsquo;s output as verified fact, professional advice, or an official
            position of any payment network or regulator;
          </li>
          <li>resell or redistribute the service.</li>
        </ul>
      </Section>

      <Section id="ownership" title="Ownership and your content">
        <p>
          The Flow of Funds application, its design, its underlying knowledge base, and its branding
          are owned by Fintech North and its licensors. Third-party marks (payment networks,
          operators, and regulators) shown for identification belong to their respective owners and
          do not imply endorsement.
        </p>
        <p>
          You keep whatever rights you have in the scenarios you describe and the diagrams you create
          with the tool. There&rsquo;s no account, so keeping a copy (via export, a share link, or My
          Flows in your browser) is up to you. As described in our{" "}
          <a
            href="/privacy"
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            privacy notice
          </a>
          , we also keep a server-side record of prompts and diagrams to review and improve the tool.
          That&rsquo;s not a saved-workspace or backup feature you can rely on to recover your work.
        </p>
      </Section>

      <Section id="no-warranty" title="No warranty; limitation of liability">
        <p>
          The preview is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available,&rdquo;</strong>{" "}
          without warranties of any kind, express or implied, including accuracy, fitness for a
          particular purpose, or uninterrupted availability. To the fullest extent permitted by law,
          Fintech North is not liable for any loss or damage arising from your use of, or reliance
          on, the tool or its output.
        </p>
      </Section>

      <Section id="changes" title="Changes">
        <p>
          We may update these terms as the preview evolves; the &ldquo;last updated&rdquo; date above
          reflects the current version. Continued use after a change means you accept the updated
          terms.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          Questions about these terms? Contact Fintech North at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Flow%20of%20Funds%20terms`}
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      </main>
      <SiteFooter currentPage="terms" />
    </>
  );
}
