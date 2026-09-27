import type { FlowOfFunds, FoFEdge, FoFNode, Swimlane, FollowUp } from "@/lib/schema/flow";

const now = () => new Date().toISOString();

type NodeInput = Omit<FoFNode, "emphasis"> & { emphasis?: FoFNode["emphasis"] };
type EdgeInput = Omit<FoFEdge, "direction" | "emphasis"> & {
  direction?: FoFEdge["direction"];
  emphasis?: FoFEdge["emphasis"];
};

export function node(input: NodeInput): FoFNode {
  return { emphasis: "primary", ...input };
}

export function edge(input: EdgeInput): FoFEdge {
  return { direction: "unidirectional", emphasis: "primary", ...input };
}

export function standardLanes(jurisdiction: FlowOfFunds["metadata"]["jurisdiction"]): Swimlane[] {
  const lanes: Swimlane[] = [
    { id: "customer", label: "Customer / Originator", orientation: "horizontal", order: 1 },
    { id: "merchant", label: "Merchant / Receiver", orientation: "horizontal", order: 2 },
    { id: "network", label: "Network / Operator", orientation: "horizontal", order: 3 },
    { id: "banking", label: "Banking / Settlement", orientation: "horizontal", order: 4 },
  ];
  return lanes.map((lane) => ({
    ...lane,
    jurisdiction: jurisdiction.length === 1 ? jurisdiction[0] : undefined,
  }));
}

export function followups(kind: string): FollowUp[] {
  return [
    {
      id: `${kind}-f1`,
      prompt: "Critique this flow for missing parties or inconsistent rails.",
      rationale: "Useful before sharing a diagram externally.",
    },
    {
      id: `${kind}-f2`,
      prompt: "Render this through the compliance lens.",
      rationale: "Surfaces controls, oversight, and regulatory handoffs.",
    },
    {
      id: `${kind}-f3`,
      prompt: "Add a chargeback or exception path where applicable.",
      rationale: "Stress-tests the happy path.",
    },
  ];
}

export function makeFlow(args: {
  id: string;
  title: string;
  description: string;
  narrative: string;
  jurisdiction: FlowOfFunds["metadata"]["jurisdiction"];
  primaryRails: string[];
  currencies: FlowOfFunds["metadata"]["currencies"];
  tags?: string[];
  nodes: FoFNode[];
  edges: FoFEdge[];
  annotations?: FlowOfFunds["annotations"];
  swimlanes?: Swimlane[];
  followups?: FollowUp[];
  source?: FlowOfFunds["metadata"]["source"];
}): FlowOfFunds {
  const stamp = now();
  return {
    schemaVersion: "1.0",
    id: args.id,
    metadata: {
      title: args.title,
      description: args.description,
      narrative: args.narrative,
      activeLens: "executive",
      jurisdiction: args.jurisdiction,
      primaryRails: args.primaryRails,
      currencies: args.currencies,
      tags: args.tags,
      createdAt: stamp,
      updatedAt: stamp,
      source: args.source ?? "seed",
    },
    nodes: args.nodes,
    edges: args.edges,
    swimlanes: args.swimlanes ?? standardLanes(args.jurisdiction),
    annotations: args.annotations,
    suggestedFollowups: args.followups ?? followups(args.id),
  };
}

export function stampEdited(flow: FlowOfFunds): FlowOfFunds {
  return {
    ...flow,
    metadata: {
      ...flow.metadata,
      updatedAt: now(),
      source: "user-edited",
    },
  };
}
