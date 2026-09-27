import type { FlowOfFunds } from "@/lib/schema/flow";
import { validateFlow } from "@/lib/schema/validate";

export type QualityCheck = {
  id: "structure" | "money" | "timing" | "evidence";
  label: string;
  detail: string;
  status: "pass" | "review";
};

const PRINCIPAL_MONEY_TYPES = new Set(["settlement", "funding", "transfer"]);

/** Fast, deterministic checks that can run after every edit without another AI
 * call. They prove renderability and basic completeness, not factual accuracy. */
export function assessFlowQuality(flow: FlowOfFunds): QualityCheck[] {
  const structural = validateFlow(flow).ok;
  const moneyEdges = flow.edges.filter((edge) => PRINCIPAL_MONEY_TYPES.has(edge.type));
  const timingEdges = flow.edges.filter(
    (edge) =>
      edge.type === "settlement" || edge.type === "funding" || edge.type === "transfer",
  );
  const timedMoneyEdges = timingEdges.filter((edge) => !!edge.timing?.trim());
  const curatedTemplate = flow.metadata.source === "seed";

  return [
    {
      id: "structure",
      label: "Diagram structure",
      detail: structural ? "Parties and connections validate." : "The diagram needs structural repair.",
      status: structural ? "pass" : "review",
    },
    {
      id: "money",
      label: "Money path",
      detail: moneyEdges.length ? `${moneyEdges.length} value-moving legs found.` : "No value-moving leg is labelled.",
      status: moneyEdges.length ? "pass" : "review",
    },
    {
      id: "timing",
      label: "Timing",
      detail:
        timingEdges.length === 0
          ? "No principal transfer, settlement, or funding leg is available to check."
          : timedMoneyEdges.length > 0
            ? `${timedMoneyEdges.length} of ${timingEdges.length} principal money legs include timing.`
            : "Principal money legs do not include settlement timing.",
      status: timingEdges.length > 0 && timedMoneyEdges.length > 0 ? "pass" : "review",
    },
    {
      id: "evidence",
      label: "Source posture",
      detail: curatedTemplate
        ? "Curated library template with source links; claim-by-claim review is still required."
        : "AI-touched flow: verify assumptions before external use.",
      status: "review",
    },
  ];
}
