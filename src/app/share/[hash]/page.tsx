import type { Metadata } from "next";
import Link from "next/link";
import { decodeHashToFlow } from "@/lib/share";
import { OpenSharedFlowLink, SharedFlowView } from "@/components/ShareAnalytics";
import { buildTrustReceipt } from "@/lib/trust/receipt";

/**
 * Server-rendered landing for a shared flow link (/share/<hash>).
 *
 * Why this exists separately from the studio: the studio packs the flow into a
 * `#f=<hash>` URL fragment, which is never sent to the server — so a pasted link
 * unfurls with a generic preview. This route puts the hash in the PATH instead, so
 * (a) generateMetadata can set a per-flow title/description and (b) the sibling
 * opengraph-image.tsx renders a per-flow social card. The page itself shows a small
 * server-rendered summary and hands off to the live studio via the existing
 * `/studio#f=<hash>` decode path — the studio is untouched.
 *
 * A share link is UNTRUSTED: decodeHashToFlow never throws and returns null on
 * anything malformed, which we render as a friendly "couldn't open" state.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  const flow = await decodeHashToFlow(hash).catch(() => null);
  if (!flow) {
    return {
      title: "Shared flow · Flow of Funds",
      description:
        "This shared flow could not be read. Origin, source support, and human review are unavailable.",
    };
  }
  const receipt = buildTrustReceipt(flow);
  const caveatCount = receipt.assumptions.length + receipt.warnings.length;
  const rails = (flow.metadata.primaryRails ?? []).slice(0, 4).join(", ");
  const desc = [
    receipt.origin.label,
    `document/rail support ${receipt.evidence.coveredLegs}/${receipt.evidence.relevantLegs} legs; not claim verification`,
    `human review ${receipt.humanReview.label.toLowerCase()}`,
    `${caveatCount} attached caveat${caveatCount === 1 ? "" : "s"}`,
    `${flow.nodes.length} parties · ${flow.edges.length} legs`,
    rails,
    flow.metadata.description,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 200);
  return {
    title: `${flow.metadata.title} · Flow of Funds`,
    description: desc,
    openGraph: { title: flow.metadata.title, description: desc, type: "article" },
    twitter: { card: "summary_large_image", title: flow.metadata.title, description: desc },
  };
}

export default async function SharePage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const flow = await decodeHashToFlow(hash).catch(() => null);
  const studioHref = `/studio#f=${hash}`;
  const receipt = flow ? buildTrustReceipt(flow) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <SharedFlowView valid={Boolean(flow)} />
      <Link
        href="/studio"
        className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.2em] text-[#6b6b66] transition-colors hover:text-[#C41E3A]"
      >
        <span className="inline-block h-3 w-3 rounded-full bg-[#C41E3A]" aria-hidden />
        Flow of Funds · Fintech North
      </Link>

      {flow ? (
        <div className="mt-10 rounded-2xl border border-[#e4dfd2] bg-[#fbf9f3] p-8 shadow-sm">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6b6b66]">
            Shared flow
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#1c1c1c] md:text-4xl">
            {flow.metadata.title}
          </h1>
          <p className="mt-4 text-[15px] text-[#6b6b66]">
            {flow.nodes.length} parties · {flow.edges.length} legs
            {flow.metadata.jurisdiction?.length ? ` · ${flow.metadata.jurisdiction.join(" · ")}` : ""}
          </p>

          {flow.metadata.description ? (
            <p className="mt-5 text-[16px] leading-relaxed text-[#1c1c1c]">
              {flow.metadata.description}
            </p>
          ) : null}

          {flow.metadata.primaryRails?.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {flow.metadata.primaryRails.slice(0, 8).map((r, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#C41E3A] px-3 py-1 text-[12px] font-semibold text-[#C41E3A]"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : null}

          {receipt ? (
            <section
              aria-label="Trust receipt"
              className="mt-6 rounded-xl border border-[#e4dfd2] bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[12px] font-bold text-[#1c1c1c]">Trust receipt</h2>
                <span className="rounded-full bg-[#ede7da] px-2.5 py-1 text-[10px] font-semibold text-[#1c1c1c]">
                  {receipt.origin.label}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#1c1c1c]">
                Document/rail support: {receipt.evidence.coveredLegs}/{receipt.evidence.relevantLegs}{" "}
                non-fee legs matched. This is not claim verification.
              </p>
              <p className="mt-1 text-[12px] text-[#6b6b66]">
                Human review: {receipt.humanReview.label}
                {receipt.humanReview.recorded ? ` · ${receipt.humanReview.detail}` : ""}
              </p>
              {receipt.assumptions.length || receipt.warnings.length ? (
                <div className="mt-3 border-t border-[#e4dfd2] pt-3">
                  <h3 className="text-[11px] font-bold text-[#1c1c1c]">Attached assumptions and warnings</h3>
                  <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-[#6b6b66]">
                    {receipt.assumptions.map((item) => <li key={`assumption-${item}`}><b>Assumption:</b> {item}</li>)}
                    {receipt.warnings.map((item) => <li key={`warning-${item}`}><b>Warning:</b> {item}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-[#6b6b66]">No assumptions or warnings are attached to this flow.</p>
              )}
              {receipt.evidence.sources.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Matched sources">
                  {receipt.evidence.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-[#C41E3A] underline-offset-2 hover:underline"
                      >
                        {source.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <OpenSharedFlowLink href={studioHref} />

          <p className="mt-6 text-[13px] text-[#6b6b66]">
            A hobby project for the community from Fintech North, shared as a public preview.
          </p>
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-[#e4dfd2] bg-[#fbf9f3] p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-[#1c1c1c]">This share link couldn’t be opened</h1>
          <p className="mt-3 text-[15px] text-[#6b6b66]">
            The link may be incomplete or from an older format. You can start a fresh diagram in the
            studio. No origin, source-support, or human-review record could be read from this link.
          </p>
          <Link
            href="/studio"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#C41E3A] px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#a11930]"
          >
            Open the studio →
          </Link>
        </div>
      )}
    </main>
  );
}
