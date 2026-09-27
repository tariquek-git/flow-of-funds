import { z } from "zod";
import {
  AnnotationSchema,
  CurrencySchema,
  EdgeSchema,
  JurisdictionSchema,
  NodeSchema,
  SwimlaneSchema,
  type FlowOfFunds,
  type FollowUp,
  SCHEMA_VERSION,
} from "./flow";

/**
 * The operation protocol — the heart of the AI-native design.
 *
 * Instead of asking the model for one monolithic JSON flow, the agent emits a
 * stream of small operations (as tool calls). The same vocabulary serves:
 *  - generation: build a flow from empty, op by op (the canvas renders live)
 *  - editing: surgical patches that preserve ids, positions, and layout
 *
 * Each op is validated independently; the assembled flow is validated against
 * FlowOfFundsSchema at the end of the stream.
 */

const NodePayload = NodeSchema.omit({ position: true, metadata: true });
const NodePatch = NodePayload.partial().omit({ id: true });
const EdgePayload = EdgeSchema.omit({ metadata: true });
const EdgePatch = EdgePayload.partial().omit({ id: true });

export const OpSchemas = {
  set_metadata: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    narrative: z.string().optional(),
    jurisdiction: z.array(JurisdictionSchema).min(1),
    primaryRails: z.array(z.string()),
    currencies: z.array(CurrencySchema).min(1),
    tags: z.array(z.string()).optional(),
  }),
  add_swimlane: SwimlaneSchema.partial({ orientation: true }),
  add_node: NodePayload,
  update_node: z.object({ id: z.string().min(1), set: NodePatch }),
  remove_node: z.object({ id: z.string().min(1) }),
  add_edge: EdgePayload.partial({ direction: true }),
  update_edge: z.object({ id: z.string().min(1), set: EdgePatch }),
  remove_edge: z.object({ id: z.string().min(1) }),
  add_annotation: AnnotationSchema,
  remove_annotation: z.object({ id: z.string().min(1) }),
  suggest_followups: z.object({
    followups: z
      .array(z.object({ prompt: z.string().min(1), rationale: z.string().optional() }))
      .min(1)
      .max(4),
  }),
} as const;

export type OpName = keyof typeof OpSchemas;
export const OP_NAMES = Object.keys(OpSchemas) as OpName[];

export type FlowOp = {
  [K in OpName]: { op: K } & z.infer<(typeof OpSchemas)[K]>;
}[OpName];

/** Parse a raw tool input into a validated FlowOp. Returns null on mismatch. */
export function parseOp(name: string, input: unknown): FlowOp | null {
  if (!OP_NAMES.includes(name as OpName)) return null;
  const result = OpSchemas[name as OpName].safeParse(input);
  if (!result.success) return null;
  return { op: name, ...result.data } as FlowOp;
}

export function emptyFlow(id: string): FlowOfFunds {
  const stamp = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    metadata: {
      title: "Untitled flow",
      jurisdiction: ["CA"],
      primaryRails: [],
      currencies: ["CAD"],
      createdAt: stamp,
      updatedAt: stamp,
      source: "ai-generated",
    },
    nodes: [],
    edges: [],
    swimlanes: [],
    annotations: [],
    suggestedFollowups: [],
  };
}

/**
 * Pure reducer. Tolerant by design: adds are upserts, updates/removes on
 * missing ids are no-ops — a slightly disordered op stream should never
 * crash the canvas mid-render.
 */
export function applyOp(flow: FlowOfFunds, op: FlowOp): FlowOfFunds {
  const next: FlowOfFunds = {
    ...flow,
    metadata: { ...flow.metadata, updatedAt: new Date().toISOString() },
    nodes: [...flow.nodes],
    edges: [...flow.edges],
    swimlanes: [...(flow.swimlanes ?? [])],
    annotations: [...(flow.annotations ?? [])],
    suggestedFollowups: [...(flow.suggestedFollowups ?? [])],
  };

  switch (op.op) {
    case "set_metadata": {
      const { op: _op, ...meta } = op;
      next.metadata = { ...next.metadata, ...meta };
      return next;
    }
    case "add_swimlane": {
      const { op: _op, ...lane } = op;
      const full = { orientation: "horizontal" as const, ...lane };
      const i = next.swimlanes!.findIndex((l) => l.id === lane.id);
      if (i >= 0) next.swimlanes![i] = full;
      else next.swimlanes!.push(full);
      return next;
    }
    case "add_node": {
      const { op: _op, ...node } = op;
      const i = next.nodes.findIndex((n) => n.id === node.id);
      if (i >= 0) next.nodes[i] = { ...next.nodes[i], ...node };
      else next.nodes.push(node);
      return next;
    }
    case "update_node": {
      const i = next.nodes.findIndex((n) => n.id === op.id);
      if (i >= 0) next.nodes[i] = { ...next.nodes[i], ...op.set };
      return next;
    }
    case "remove_node": {
      next.nodes = next.nodes.filter((n) => n.id !== op.id);
      next.edges = next.edges.filter((e) => e.source !== op.id && e.target !== op.id);
      next.annotations = next.annotations!.filter(
        (a) => !(a.targetType === "node" && a.targetId === op.id),
      );
      return next;
    }
    case "add_edge": {
      const { op: _op, ...edge } = op;
      const full = { direction: "unidirectional" as const, ...edge };
      const i = next.edges.findIndex((e) => e.id === edge.id);
      if (i >= 0) next.edges[i] = { ...next.edges[i], ...full };
      else next.edges.push(full);
      return next;
    }
    case "update_edge": {
      const i = next.edges.findIndex((e) => e.id === op.id);
      if (i >= 0) next.edges[i] = { ...next.edges[i], ...op.set };
      return next;
    }
    case "remove_edge": {
      next.edges = next.edges.filter((e) => e.id !== op.id);
      next.annotations = next.annotations!.filter(
        (a) => !(a.targetType === "edge" && a.targetId === op.id),
      );
      return next;
    }
    case "add_annotation": {
      const { op: _op, ...ann } = op;
      const i = next.annotations!.findIndex((a) => a.id === ann.id);
      if (i >= 0) next.annotations![i] = ann;
      else next.annotations!.push(ann);
      return next;
    }
    case "remove_annotation": {
      next.annotations = next.annotations!.filter((a) => a.id !== op.id);
      return next;
    }
    case "suggest_followups": {
      next.suggestedFollowups = op.followups.map((f, i) => ({
        id: `f${i + 1}`,
        prompt: f.prompt,
        rationale: f.rationale,
      }));
      return next;
    }
  }
}

export function applyOps(flow: FlowOfFunds, ops: FlowOp[]): FlowOfFunds {
  return ops.reduce(applyOp, flow);
}

export function followupsOf(flow: FlowOfFunds): FollowUp[] {
  return flow.suggestedFollowups ?? [];
}
