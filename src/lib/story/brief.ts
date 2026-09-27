import type { FoFEdge, FoFNode, FlowOfFunds } from "@/lib/schema/flow";

const MESSAGE_TYPES = new Set(["authorization", "clearing", "notification", "reconciliation"]);
const MONEY_TYPES = new Set(["settlement", "funding", "transfer", "fee", "interchange"]);
const EXCEPTION_TYPES = new Set(["refund", "chargeback"]);

export type BriefStage = {
  id: "approval" | "availability" | "settlement";
  ordinal: number;
  title: string;
  subtitle: string;
  actor: string;
  event: string;
  timing: string;
  visibility: "customer-visible" | "institutional";
  edgeId: string;
};

export type PaymentBrief = {
  title: string;
  answer: string[];
  stages: BriefStage[];
  participants: FoFNode[];
  money: FoFEdge[];
  messages: FoFEdge[];
  exceptions: FoFEdge[];
  scope: string[];
};

function ordered(edges: FoFEdge[]): FoFEdge[] {
  return [...edges].sort(
    (a, b) => (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER),
  );
}

function timing(edge: FoFEdge | undefined, fallback: string): string {
  return edge?.timing?.trim() || fallback;
}

function nodeLabel(nodes: Map<string, FoFNode>, id: string, fallback: string): string {
  return nodes.get(id)?.label || fallback;
}

function actorForEdge(nodes: Map<string, FoFNode>, edge: FoFEdge): string {
  return `${nodeLabel(nodes, edge.source, "Originator")} → ${nodeLabel(nodes, edge.target, "Receiver")}`;
}

function uniqueNodes(flow: FlowOfFunds, edges: FoFEdge[]): FoFNode[] {
  const wanted = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return flow.nodes.filter((node) => wanted.has(node.id));
}

function selectAvailability(flow: FlowOfFunds, money: FoFEdge[]): FoFEdge | undefined {
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));
  const candidates = money.filter(
    (edge) => {
      const recordedEvent = `${edge.label ?? ""} ${edge.description ?? ""}`;
      const recordsUsableValue =
        /\b(?:available|availability|credit(?:ed)?|deposit(?:ed)?|fund(?:ed|ing|s)?|payout|receive(?:d|r)?|wallet)\b/i.test(
          recordedEvent,
        );
      return (
        (edge.type === "funding" || edge.type === "transfer") &&
        (!edge.layers || edge.layers.includes("money")) &&
        nodeById.get(edge.target)?.type === "endpoint" &&
        recordsUsableValue
      );
    },
  );
  return (
    candidates.at(-1)
  );
}

function isExceptionLeg(edge: FoFEdge): boolean {
  return (
    EXCEPTION_TYPES.has(edge.type) ||
    edge.layers?.includes("exception") === true
  );
}

function collectScope(flow: FlowOfFunds): string[] {
  return [
    flow.metadata.jurisdiction.length ? `Jurisdiction: ${flow.metadata.jurisdiction.join(", ")}` : null,
    flow.metadata.currencies.length ? `Currency: ${flow.metadata.currencies.join(", ")}` : null,
    flow.metadata.primaryRails.length ? `Rails: ${flow.metadata.primaryRails.join(", ")}` : null,
  ].filter((value): value is string => !!value);
}

function isExplicitDecision(edge: FoFEdge): boolean {
  if (isExceptionLeg(edge)) return false;
  const label = edge.label?.trim() ?? "";
  if (!label) return false;
  const recordedEvent = [label, edge.description, edge.rail, edge.messageStandard]
    .filter(Boolean)
    .join(" ");
  const isWalletOrTokenAuthorization =
    /\b(?:sign|signed|signature|broadcast|wallet|token allowance|permit)\b/i.test(recordedEvent) &&
    /\b(?:USDC|stablecoin|token|ERC-?20|on-chain|blockchain|wallet)\b/i.test(recordedEvent);
  if (isWalletOrTokenAuthorization) return false;
  return (
    /\b(?:approv(?:e|ed|al)|decision)\b/i.test(label) ||
    (/\b(?:accept|confirm)\b/i.test(label) && /\b(?:reject|declin(?:e|ed)?)\b/i.test(label))
  );
}

function combinedTiming(edges: FoFEdge[], fallback: string): string {
  const values = [...new Set(edges.map((edge) => edge.timing?.trim()).filter(Boolean) as string[])];
  const informative = values.filter(
    (value) =>
      !values.some(
        (other) =>
          other !== value && other.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
      ),
  );
  return informative.join("; ") || fallback;
}

function plainTiming(value: string): string {
  if (/^seconds$/i.test(value)) return "within seconds";
  if (/^real[- ]?time$/i.test(value)) return "in real time";
  if (/^acquirer contract/i.test(value)) {
    return "on the acquirer's contractual payout schedule";
  }
  if (/^timing varies/i.test(value)) {
    return "under current scheme and participant rules";
  }
  if (/^effective date/i.test(value)) {
    return "on the ACH effective date, usually the next business day or the same day when Same Day ACH is used";
  }
  if (/^settlement date/i.test(value)) {
    return "on the ACH settlement date, usually the next business day or the same day when Same Day ACH is used";
  }
  if (/deferred net/i.test(value) && /next business day/i.test(value)) {
    return "in a deferred net cycle, typically the next business day";
  }
  if (/T\+1[–-]T\+2/i.test(value)) {
    return `one to two settlement days later (${value})`;
  }
  if (/T\+1/i.test(value)) {
    return `one settlement day later (${value})`;
  }
  return value;
}

/**
 * A conservative Story projection. It never invents a settlement state: every
 * stage is tied to a real edge in the payment document. Availability also needs
 * an explicit funding/credit/availability signal in the recorded leg, not just
 * a generic transfer to an endpoint. Missing stages remain missing rather than
 * being inferred from a familiar rail pattern.
 */
export function buildPaymentBrief(flow: FlowOfFunds): PaymentBrief {
  const edges = ordered(flow.edges);
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
  const messages = edges.filter((edge) => MESSAGE_TYPES.has(edge.type));
  const money = edges.filter((edge) =>
    edge.layers ? edge.layers.includes("money") : MONEY_TYPES.has(edge.type),
  );
  const exceptions = edges.filter(
    (edge) => EXCEPTION_TYPES.has(edge.type) || edge.layers?.includes("exception"),
  );

  // Most documents include a normal path plus secondary return/reversal legs.
  // Build the headline clock from the normal path when one exists, while a
  // document whose entire purpose is an exception (for example, a chargeback)
  // still gets a useful Story instead of an empty one.
  const normalMoney = money.filter((edge) => !isExceptionLeg(edge));
  const storyMoney = normalMoney.length ? normalMoney : money;
  // Approval is a business state, not an edge type. Only labels that explicitly
  // record an approval/decision or an accept-vs-reject response qualify. A
  // generic authorization instruction therefore cannot become "approved" by
  // inference, while a labelled decision on another message type still counts.
  const approvalPath = edges.filter(isExplicitDecision);
  const availability = selectAvailability(flow, storyMoney);
  const settlementPath = storyMoney.filter((edge) => edge.type === "settlement");
  const settlement = settlementPath.at(-1);
  const settlementTiming = combinedTiming(settlementPath, "Timing not recorded");
  const settlementIds = new Set(settlementPath.map((edge) => edge.id));
  const bridgeMoney = storyMoney.filter((edge) => {
    if (edge.id === availability?.id || settlementIds.has(edge.id)) return false;
    if (edge.emphasis === "secondary" || edge.type === "fee" || edge.type === "interchange") {
      return false;
    }
    const recordedEvent = `${edge.rail ?? ""} ${edge.label ?? ""} ${edge.description ?? ""}`;
    return /\b(?:on-chain|USDC|convert|liquidate|off-ramp|nostro|cover payment|FX)\b/i.test(
      recordedEvent,
    );
  });

  const stages: BriefStage[] = [];
  if (approvalPath.length) {
    const firstApproval = approvalPath[0];
    const lastApproval = approvalPath.at(-1) ?? firstApproval;
    stages.push({
      id: "approval",
      ordinal: firstApproval.ordinal ?? Number.MAX_SAFE_INTEGER,
      title: "Recorded approval",
      subtitle: "An explicit decision in this document",
      actor: `${nodeLabel(nodes, firstApproval.source, "Originator")} → ${nodeLabel(nodes, lastApproval.target, "Decision maker")}`,
      event:
        approvalPath.length === 1
          ? firstApproval.label || firstApproval.description || "Authorization message"
          : `${approvalPath.length} recorded decision events; final event: ${lastApproval.label || lastApproval.description || "decision response"}`,
      timing: timing(lastApproval, "Timing not recorded"),
      visibility: "customer-visible",
      edgeId: lastApproval.id,
    });
  }
  if (availability && availability.id !== settlement?.id) {
    stages.push({
      id: "availability",
      ordinal: availability.ordinal ?? Number.MAX_SAFE_INTEGER,
      title: "Funds available",
      subtitle: "When the receiver can use the value",
      actor: actorForEdge(nodes, availability),
      event: availability.label || availability.description || "Receiver funded",
      timing: timing(availability, "Timing not recorded"),
      visibility: "customer-visible",
      edgeId: availability.id,
    });
  }
  if (settlement) {
    stages.push({
      id: "settlement",
      ordinal: settlementPath[0]?.ordinal ?? Number.MAX_SAFE_INTEGER,
      title: "Institutional settlement",
      subtitle: "When institutions discharge obligations",
      actor:
        settlementPath.length > 1
          ? `${nodeLabel(nodes, settlementPath[0].source, "Paying institution")} → ${nodeLabel(nodes, settlement.target, "Receiving institution")}`
          : actorForEdge(nodes, settlement),
      event:
        settlementPath.length > 1
          ? `${settlementPath.length} recorded settlement legs; final event: ${settlement.label || settlement.description || "settlement completed"}`
          : settlement.label || settlement.description || "Settlement leg",
      timing: settlementTiming,
      visibility: "institutional",
      edgeId: settlement.id,
    });
  }

  stages.sort((a, b) => a.ordinal - b.ordinal);
  stages.forEach((stage, index) => {
    stage.ordinal = index + 1;
  });

  const answer: string[] = [];
  if (!approvalPath.length) {
    answer.push("No separate approval or decision event is explicitly recorded in this flow.");
  }
  if (bridgeMoney.length) {
    const recordedPath = bridgeMoney.map((edge) => {
      const event = edge.label || edge.description || "Recorded value movement";
      return edge.timing ? `${event} (${plainTiming(edge.timing)})` : event;
    });
    answer.push(`Before final payout, the recorded value path includes ${recordedPath.join(", then ")}.`);
  }
  if (availability) {
    answer.push(
      `${nodeLabel(nodes, availability.target, "The receiver")} is funded ${plainTiming(timing(availability, "at the timing recorded in the flow"))}.`,
    );
  } else if (money.length) {
    answer.push("The flow records principal movement, but does not identify a separate availability event.");
  } else {
    answer.push("This flow does not contain a labelled principal-money leg.");
  }
  if (settlement) {
    answer.push(
      `Institutional settlement via ${settlement.rail || "the recorded rail"}: ${plainTiming(settlementTiming)}.`,
    );
  } else {
    answer.push("No separate institutional-settlement leg is recorded in this flow.");
  }

  const storyEdges = edges.filter((edge) => !isExceptionLeg(edge));
  const participantEdges = storyEdges.length ? storyEdges : edges;

  return {
    title: flow.metadata.title,
    answer,
    stages,
    participants: uniqueNodes(flow, participantEdges),
    money,
    messages,
    exceptions,
    scope: collectScope(flow),
  };
}
