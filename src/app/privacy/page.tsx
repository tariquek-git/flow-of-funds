import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Privacy · Flow of Funds",
  description: "The short, plain-English privacy note for the Flow of Funds preview.",
  robots: { index: false, follow: false },
};

const CONTACT_EMAIL = "hello@fintechnorth.ca";
const LAST_UPDATED = "June 2026";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-[min(680px,calc(100vw-40px))] py-12">
        <header className="pb-6">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1c1c1c]">Privacy, plainly</h1>
          <p className="mt-2 text-[13px] text-[#6b6b66]">
            The short, honest version. Last updated {LAST_UPDATED}.
          </p>
        </header>

        <div className="space-y-4 border-t border-[#e4dfd2] pt-6 text-[14px] leading-relaxed text-[#1c1c1c]">
          <p>
            Flow of Funds is a <strong>hobby project for the community</strong>{" "}from Fintech North,
            shared as a public preview. There&rsquo;s no login and no account. I never ask for your name or email.
          </p>
          <p>
            I <strong>am</strong>{" "}collecting data, to make it better. That means: what you type, the
            diagrams it draws, and basic, cookieless analytics (rough region, device, which pages get
            visited, no IP address stored, no session recordings). I also look up which organization a visit likely came
            from (e.g. a bank or credit union) using your IP at the moment of the request, then
            discard the IP itself, keeping only the resolved organization name. Your prompts also
            get sent to a US-based AI provider to generate the diagram. That&rsquo;s it. Nothing is
            sold, and nothing is shared beyond the services that run the thing (the AI provider,
            the database, analytics, hosting).
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[13px] text-amber-900">
            So treat it like a public sketchpad: <strong>don&rsquo;t paste anything confidential</strong>,{" "}
            deal terms, customer data, secrets, anything you wouldn&rsquo;t want recorded and read.
            It&rsquo;s a community preview, not a vault.
          </p>
          <p>
            Questions, or want your stuff deleted? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Flow%20of%20Funds%20privacy`}
              className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter currentPage="privacy" />
    </>
  );
}
