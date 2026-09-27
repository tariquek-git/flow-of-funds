import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  ListChecks,
  ReceiptText,
  UserRound,
} from "lucide-react";
import type { FlowOfFunds } from "@/lib/schema/flow";
import { buildTrustReceipt } from "@/lib/trust/receipt";
import { track } from "@/lib/analytics";

export type TrustReceiptProps = {
  flow: FlowOfFunds;
  className?: string;
};

function CaveatList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-[11px] leading-snug text-muted">{empty}</p>;

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex items-start gap-2 text-[11px] leading-snug text-ink">
          <AlertTriangle size={13} className="mt-px shrink-0 text-brand" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Compact, expandable provenance and limitation summary for one flow. */
export function TrustReceipt({ flow, className = "" }: TrustReceiptProps) {
  const receipt = buildTrustReceipt(flow);
  const caveatCount = receipt.assumptions.length + receipt.warnings.length;

  return (
    <section
      aria-label="Trust receipt"
      className={`overflow-hidden rounded-xl border border-line bg-panel text-ink ${className}`.trim()}
    >
      <details
        className="group"
        onToggle={(event) => {
          if (event.currentTarget.open) {
            track("trust_receipt_opened", {
              source_kind: receipt.origin.kind,
              support_tier: receipt.evidence.supportTier,
              has_assumptions: caveatCount > 0,
              human_reviewed: receipt.humanReview.recorded,
            });
          }
        }}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50 [&::-webkit-details-marker]:hidden">
          <ReceiptText size={16} className="shrink-0 text-brand" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] font-bold text-ink">Trust receipt</span>
              <span className="rounded-full bg-soft px-2 py-0.5 text-[9.5px] font-semibold text-ink">
                {receipt.origin.label}
              </span>
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted">
              Source match {receipt.evidence.coveredLegs}/{receipt.evidence.relevantLegs}
              {caveatCount > 0
                ? ` · ${caveatCount} attached caveat${caveatCount === 1 ? "" : "s"}`
                : " · No attached caveats"}
              {` · Human review ${receipt.humanReview.label.toLowerCase()}`}
            </span>
          </span>
          <ChevronDown
            size={15}
            className="shrink-0 text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="divide-y divide-line border-t border-line px-3.5">
          <section className="py-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <FileText size={13} aria-hidden="true" />
              Origin
            </h3>
            <p className="text-[11px] font-semibold text-ink">{receipt.origin.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{receipt.origin.detail}</p>
          </section>

          <section className="py-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <BookOpen size={13} aria-hidden="true" />
              Source support
            </h3>
            <p className="text-[11px] leading-snug text-ink">{receipt.evidence.summary}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-muted">{receipt.evidence.limitation}</p>
            {receipt.evidence.sources.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {receipt.evidence.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-start gap-1.5 rounded py-0.5 text-[11px] font-semibold leading-snug text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                    >
                      <span>{source.label}</span>
                      <ExternalLink size={12} className="mt-px shrink-0" aria-hidden="true" />
                      <span className="sr-only">Opens in a new tab</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] leading-snug text-brand">
                No matched source is attached to this flow.
              </p>
            )}
          </section>

          <section className="py-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <AlertTriangle size={13} aria-hidden="true" />
              Assumptions and warnings
            </h3>
            <div className="space-y-2.5">
              <div>
                <p className="mb-1 text-[10.5px] font-semibold text-ink">Assumptions</p>
                <CaveatList
                  items={receipt.assumptions}
                  empty="No assumptions are attached to this flow."
                />
              </div>
              <div>
                <p className="mb-1 text-[10.5px] font-semibold text-ink">Warnings</p>
                <CaveatList
                  items={receipt.warnings}
                  empty="No warnings are attached to this flow."
                />
              </div>
            </div>
          </section>

          <section className="py-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <ListChecks size={13} aria-hidden="true" />
              Automated checks
            </h3>
            <p className="text-[10.5px] leading-snug text-muted">{receipt.quality.limitation}</p>
            <ul className="mt-2 space-y-1.5">
              {receipt.quality.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-2 text-[11px] leading-snug">
                  {check.status === "pass" ? (
                    <Check size={13} className="mt-px shrink-0 text-ink" aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={13} className="mt-px shrink-0 text-brand" aria-hidden="true" />
                  )}
                  <span>
                    <b className="font-semibold text-ink">{check.label}:</b>{" "}
                    <span className="text-muted">{check.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="py-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <UserRound size={13} aria-hidden="true" />
              Human review
            </h3>
            <p className="text-[11px] font-semibold text-ink">{receipt.humanReview.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{receipt.humanReview.detail}</p>
          </section>
        </div>
      </details>
    </section>
  );
}
