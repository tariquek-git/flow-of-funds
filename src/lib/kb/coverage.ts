import { FLOW_CATALOG } from "@/lib/flows/catalog";
import type { FlowOfFunds } from "@/lib/schema/flow";
import { KB_DOCS, kbCoverageForEdge, type KbSource } from "./knowledge";

export type CoverageStatus = "kb-backed" | "reviewed-template-only" | "planned";

export type PaymentRailCoverage = {
  id: string;
  label: string;
  region: string;
  status: CoverageStatus;
  kbDocIds: string[];
  seedIds: string[];
  authorityFamilies: string[];
  note?: string;
};

export type ActiveFlowEvidence = {
  supportTier: "kb-backed" | "partial" | "template-only" | "uncovered";
  coverageIds: string[];
  coveredEdges: number;
  relevantEdges: number;
  sources: KbSource[];
  humanReview: { reviewer: string; reviewedAt: string } | null;
};

/**
 * Honest production coverage, not an aspirational list of the world's rails.
 *
 * `kb-backed` means the agent receives a compact mechanics document with at
 * least one named official/operator source. `reviewed-template-only` means a
 * fixed diagram exists, but open-ended AI generation must still treat the rail
 * as outside the KB. `planned` is visible to maintainers only and must never be
 * described to users as supported.
 */
export const PAYMENT_RAIL_COVERAGE: PaymentRailCoverage[] = [
  { id: "ca-interac", label: "Interac Debit and e-Transfer", region: "Canada", status: "kb-backed", kbDocIds: ["interac-debit", "interac-etransfer"], seedIds: ["interac-debit", "interac-etransfer"], authorityFamilies: ["Interac", "Payments Canada"] },
  { id: "ca-batch", label: "EFT, AFT and ACSS", region: "Canada", status: "kb-backed", kbDocIds: ["canada-eft-aft"], seedIds: ["acss-eft-aft-ca", "pad-debit-ca"], authorityFamilies: ["Payments Canada", "Bank of Canada"] },
  { id: "ca-high-value", label: "Lynx", region: "Canada", status: "reviewed-template-only", kbDocIds: [], seedIds: ["lynx-wire-ca"], authorityFamilies: ["Payments Canada", "Bank of Canada"], note: "Fixed reviewed flow exists; open-ended Lynx generation remains outside the KB." },
  { id: "ca-rtr", label: "Real-Time Rail", region: "Canada", status: "reviewed-template-only", kbDocIds: [], seedIds: ["rtr-instant-ca"], authorityFamilies: ["Payments Canada", "Bank of Canada"], note: "Model as a planned/not-yet-live system until the operator confirms launch." },
  { id: "us-ach", label: "ACH", region: "United States", status: "kb-backed", kbDocIds: ["ach-credit", "ach-returns-sec-codes"], seedIds: ["ach-payroll", "ach-debit-web"], authorityFamilies: ["Nacha", "Federal Reserve"] },
  { id: "us-instant", label: "FedNow and RTP", region: "United States", status: "kb-backed", kbDocIds: ["fednow", "rtp-vs-fednow"], seedIds: ["fednow-b2b", "fednow-p2p", "rtp-b2b"], authorityFamilies: ["Federal Reserve", "The Clearing House"] },
  { id: "us-fedwire", label: "Fedwire Funds Service", region: "United States", status: "reviewed-template-only", kbDocIds: [], seedIds: ["wire-fx"], authorityFamilies: ["Federal Reserve"], note: "Cross-border template uses Fedwire legs; there is no standalone Fedwire KB document yet." },
  { id: "cards-visa", label: "Visa four-party credit", region: "Cards", status: "kb-backed", kbDocIds: ["visa-four-party"], seedIds: ["visa-four-party"], authorityFamilies: ["Visa"] },
  { id: "cards-mastercard", label: "Mastercard credit and debit", region: "Cards", status: "planned", kbDocIds: [], seedIds: [], authorityFamilies: ["Mastercard"], note: "Needs its own primary-source mechanics mapping before production use." },
  { id: "eu-sct-inst", label: "SEPA Instant Credit Transfer", region: "Euro area", status: "kb-backed", kbDocIds: ["sepa-instant-eu"], seedIds: ["sepa-instant-eu"], authorityFamilies: ["European Payments Council", "ECB"] },
  { id: "gb-fps", label: "Faster Payments", region: "United Kingdom", status: "kb-backed", kbDocIds: ["uk-faster-payments"], seedIds: ["uk-faster-payments"], authorityFamilies: ["Pay.UK", "Bank of England"] },
  { id: "in-upi", label: "UPI", region: "India", status: "kb-backed", kbDocIds: ["india-upi"], seedIds: ["india-upi"], authorityFamilies: ["NPCI", "Reserve Bank of India"] },
  { id: "br-pix", label: "Pix", region: "Brazil", status: "kb-backed", kbDocIds: ["brazil-pix"], seedIds: ["brazil-pix", "brazil-pix-merchant-checkout"], authorityFamilies: ["Banco Central do Brasil"] },
  { id: "cross-border", label: "SWIFT correspondent wire", region: "Cross-border", status: "kb-backed", kbDocIds: ["cross-border-wire-fx"], seedIds: ["wire-fx"], authorityFamilies: ["SWIFT", "Federal Reserve", "Payments Canada"] },
  { id: "au-npp", label: "NPP, PayID and PayTo", region: "Australia", status: "planned", kbDocIds: [], seedIds: [], authorityFamilies: ["Reserve Bank of Australia", "Australian Payments Plus"] },
];

/**
 * Build an evidence receipt for the active diagram from the current KB.
 * This is intentionally derived at read time: a shared flow cannot retain an
 * old "grounded" badge after its source mapping or coverage tier changes.
 * Human review is never inferred from `metadata.source === "seed"`.
 */
export function evidenceForFlow(flow: FlowOfFunds): ActiveFlowEvidence {
  const relevantEdges = flow.edges.filter((edge) => edge.type !== "fee" && edge.type !== "interchange");
  const matchedDocs = relevantEdges
    .map((edge) => kbCoverageForEdge(edge))
    .filter((item): item is NonNullable<typeof item> => !!item);
  const docIds = [...new Set(matchedDocs.map((item) => item.docId))];
  const sources = [...new Map(
    matchedDocs
      .flatMap((match) => KB_DOCS.find((doc) => doc.id === match.docId)?.sources ?? [])
      .map((source) => [source.url, source]),
  ).values()];
  const coverageIds = PAYMENT_RAIL_COVERAGE
    .filter((rail) => rail.seedIds.includes(flow.id) || rail.kbDocIds.some((id) => docIds.includes(id)))
    .map((rail) => rail.id);
  const coveredEdges = matchedDocs.length;
  const supportTier =
    coveredEdges > 0 && coveredEdges === relevantEdges.length
      ? "kb-backed"
      : coveredEdges > 0
        ? "partial"
        : flow.metadata.source === "seed"
          ? "template-only"
          : "uncovered";

  return {
    supportTier,
    coverageIds,
    coveredEdges,
    relevantEdges: relevantEdges.length,
    sources,
    humanReview: null,
  };
}

/** CI-facing integrity checks for the coverage manifest. */
export function coverageProblems(): string[] {
  const problems: string[] = [];
  const docs = new Map(KB_DOCS.map((doc) => [doc.id, doc]));
  for (const rail of PAYMENT_RAIL_COVERAGE) {
    if (rail.status === "kb-backed" && rail.kbDocIds.length === 0) {
      problems.push(`${rail.id}: kb-backed without a KB document`);
    }
    for (const docId of rail.kbDocIds) {
      const doc = docs.get(docId);
      if (!doc) problems.push(`${rail.id}: missing KB document ${docId}`);
      else if (!doc.sources.length) problems.push(`${rail.id}: KB document ${docId} has no sources`);
    }
    for (const seedId of rail.seedIds) {
      if (!FLOW_CATALOG[seedId]) problems.push(`${rail.id}: missing reviewed template ${seedId}`);
    }
    if (rail.status === "planned" && (rail.kbDocIds.length || rail.seedIds.length)) {
      problems.push(`${rail.id}: planned coverage must not point at production KB docs or templates`);
    }
  }
  return problems;
}
