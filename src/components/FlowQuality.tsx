"use client";

import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { assessFlowQuality } from "@/lib/flows/quality";
import { track } from "@/lib/analytics";
import { evidenceForFlow } from "@/lib/kb/coverage";
import { useStudio } from "@/lib/state/store";

const QA_PROMPT =
  "Check this flow end to end for payments-mechanics errors, missing parties, missing settlement or funding legs, timing gaps, rail and jurisdiction mismatches, and unsupported assumptions. Fix only the issues you find, keep correct content unchanged, and summarize the changes. If it is already sound, say so without changing the diagram.";

export function FlowQuality() {
  const flow = useStudio((s) => s.flow);
  const busy = useStudio((s) => s.busy);
  const send = useStudio((s) => s.send);
  if (!flow) return null;

  const checks = assessFlowQuality(flow);
  const evidence = evidenceForFlow(flow);
  const passed = checks.filter((check) => check.status === "pass").length;
  const needsReview = checks.length - passed;
  const curatedTemplate = flow.metadata.source === "seed";
  const structuralFlags = checks.filter((check) => check.id !== "evidence" && check.status === "review").length;

  if (curatedTemplate && structuralFlags === 0) {
    return (
      <div className="border-t border-[#ede7da] bg-white px-3.5 py-2.5">
        <p className="text-[11px] font-semibold text-[#1c1c1c]">
          Curated example · {evidence.supportTier === "kb-backed" ? "KB-backed legs" : "partial source coverage"}
        </p>
        <p className="text-[10px] leading-snug text-[#6b6b66]">
          {evidence.coveredEdges}/{evidence.relevantEdges} non-fee legs matched. Claims still need payments-reviewer verification.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[#ede7da] bg-white px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[#1c1c1c]">Automated structure check · {checks.length} basic checks run</p>
          <p className="text-[10px] leading-snug text-[#6b6b66]">
            {needsReview ? `${needsReview} item${needsReview === 1 ? "" : "s"} flagged.` : "No basic structure flags."} Not factual, regulatory, or compliance verification.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            track("flow_qa_started", { needsReview });
            void send(QA_PROMPT, "edit");
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1c1c1c] px-2.5 py-1.5 text-[10.5px] font-semibold text-white transition-colors hover:bg-[#a11930] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A]/50 disabled:opacity-40"
        >
          <RefreshCw size={12} />
          Review &amp; improve
        </button>
      </div>
      <details className="mt-1.5">
        <summary className="cursor-pointer text-[10px] font-medium text-[#6b6b66] hover:text-[#1c1c1c]">
          See checks
        </summary>
        <ul className="mt-1.5 space-y-1">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-1.5 text-[10px] leading-snug text-[#6b6b66]">
              {check.status === "pass" ? (
                <CheckCircle2 size={12} className="mt-px shrink-0 text-emerald-700" aria-hidden />
              ) : (
                <AlertTriangle size={12} className="mt-px shrink-0 text-amber-700" aria-hidden />
              )}
              <span><b className="font-semibold text-[#1c1c1c]">{check.label}:</b> {check.detail}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
