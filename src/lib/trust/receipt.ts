import { assessFlowQuality, type QualityCheck } from "@/lib/flows/quality";
import { evidenceForFlow, type ActiveFlowEvidence } from "@/lib/kb/coverage";
import type { KbSource } from "@/lib/kb/knowledge";
import type { FlowOfFunds, FoFMetadata } from "@/lib/schema/flow";

export const EVIDENCE_LIMITATION =
  "Support is document/rail matching for matched legs, not claim verification.";

export const QUALITY_LIMITATION =
  "Automated checks cover structure and basic completeness only. They do not establish payment, legal, regulatory, or compliance accuracy.";

export type ReceiptOrigin = {
  kind: "curated-template" | "ai-draft" | "edited-flow";
  label: "Curated template" | "AI draft" | "Edited flow";
  detail: string;
};

export type ReceiptEvidence = {
  supportTier: ActiveFlowEvidence["supportTier"];
  coveredLegs: number;
  relevantLegs: number;
  summary: string;
  limitation: typeof EVIDENCE_LIMITATION;
  sources: KbSource[];
};

export type ReceiptHumanReview =
  | {
      recorded: false;
      label: "Not recorded";
      detail: string;
    }
  | {
      recorded: true;
      label: "Recorded";
      reviewer: string;
      reviewedAt: string;
      detail: string;
    };

export type FlowTrustReceipt = {
  origin: ReceiptOrigin;
  evidence: ReceiptEvidence;
  assumptions: string[];
  warnings: string[];
  quality: {
    checks: QualityCheck[];
    clearChecks: number;
    flaggedChecks: number;
    limitation: typeof QUALITY_LIMITATION;
  };
  humanReview: ReceiptHumanReview;
};

const ORIGIN_BY_SOURCE: Record<FoFMetadata["source"], ReceiptOrigin> = {
  seed: {
    kind: "curated-template",
    label: "Curated template",
    detail:
      "Built from a fixed library template. Check its sources, assumptions, and current scheme rules before use.",
  },
  "ai-generated": {
    kind: "ai-draft",
    label: "AI draft",
    detail:
      "Generated with AI. Check the parties, rails, timing, and assumptions before use.",
  },
  "user-edited": {
    kind: "edited-flow",
    label: "Edited flow",
    detail:
      "Changed from its earlier form. Source matches may no longer support every edited claim.",
  },
};

function evidenceSummary(coveredLegs: number, relevantLegs: number): string {
  if (relevantLegs === 0) return "No non-fee legs are available for source matching.";
  return `${coveredLegs} of ${relevantLegs} non-fee legs matched to focused knowledge-base documents by rail.`;
}

function annotationText(flow: FlowOfFunds, type: "assumption" | "warning"): string[] {
  return (flow.annotations ?? [])
    .filter((annotation) => annotation.type === type)
    .map((annotation) => annotation.text.trim())
    .filter(Boolean);
}

/**
 * Build a stable trust receipt from the active flow and the current local
 * knowledge-base mapping. This function has no UI, state, time, or network
 * dependencies, so the same flow and KB snapshot always return the same result.
 */
export function buildTrustReceipt(flow: FlowOfFunds): FlowTrustReceipt {
  const activeEvidence = evidenceForFlow(flow);
  const checks = assessFlowQuality(flow);
  const clearChecks = checks.filter((check) => check.status === "pass").length;

  const humanReview: ReceiptHumanReview = activeEvidence.humanReview
    ? {
        recorded: true,
        label: "Recorded",
        reviewer: activeEvidence.humanReview.reviewer,
        reviewedAt: activeEvidence.humanReview.reviewedAt,
        detail: `${activeEvidence.humanReview.reviewer}, ${activeEvidence.humanReview.reviewedAt}`,
      }
    : {
        recorded: false,
        label: "Not recorded",
        detail: "No dated human payments review is attached to this flow.",
      };

  return {
    origin: { ...ORIGIN_BY_SOURCE[flow.metadata.source] },
    evidence: {
      supportTier: activeEvidence.supportTier,
      coveredLegs: activeEvidence.coveredEdges,
      relevantLegs: activeEvidence.relevantEdges,
      summary: evidenceSummary(activeEvidence.coveredEdges, activeEvidence.relevantEdges),
      limitation: EVIDENCE_LIMITATION,
      sources: activeEvidence.sources.map((source) => ({ ...source })),
    },
    assumptions: annotationText(flow, "assumption"),
    warnings: annotationText(flow, "warning"),
    quality: {
      checks,
      clearChecks,
      flaggedChecks: checks.length - clearChecks,
      limitation: QUALITY_LIMITATION,
    },
    humanReview,
  };
}
