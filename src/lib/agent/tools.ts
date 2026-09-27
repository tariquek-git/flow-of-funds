import type Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic tool definitions for the op protocol.
 *
 * Hand-written JSON Schema (not generated) so the serialized bytes are
 * deterministic — the tool list renders at position 0 of the prompt, and any
 * byte churn there would invalidate the prompt cache on every request.
 * Order and content must stay stable.
 *
 * NOT using `strict: true`: the strict-mode grammar caps total optional params
 * at 24 across all tools, and this op vocabulary has ~47 (timing, messageStandard,
 * regulators, emphasis, …) — all genuinely optional payments detail. Structural
 * validity is enforced downstream by Zod (schema/validate.ts) plus one repair
 * pass in claude.ts, which also catches semantic gaps strict mode never could.
 */

// Must stay in sync with JurisdictionSchema / CurrencySchema in schema/flow.ts —
// the tool enums gate what the model can emit for live generation.
const JURISDICTION = { type: "string", enum: ["CA", "US", "EU", "GB", "IN", "BR"] } as const;
const CURRENCY = { type: "string", enum: ["CAD", "USD", "EUR", "GBP", "INR", "BRL"] } as const;
const EMPHASIS = { type: "string", enum: ["primary", "secondary", "muted"] } as const;
const STR = { type: "string" } as const;
const STR_ARR = { type: "array", items: { type: "string" } } as const;

const NODE_PROPS = {
  id: { type: "string", description: "Stable kebab-case id, e.g. 'issuer' or 'sponsor-bank'" },
  type: { type: "string", enum: ["endpoint", "institution", "intermediary", "treasury"] },
  subtype: { ...STR, description: "Optional refinement, e.g. 'network' or 'operator'" },
  label: { ...STR, description: "Display name, e.g. 'Issuing bank'" },
  description: { ...STR, description: "One sentence on the party's role in this flow" },
  jurisdiction: JURISDICTION,
  regulators: { ...STR_ARR, description: "Relevant regulators/oversight, e.g. ['OSFI','FCAC']" },
  license: { ...STR, description: "License or role of record, e.g. 'Issuer of record / BIN sponsor'" },
  swimlaneId: { ...STR, description: "Lane this party belongs to (must match an add_swimlane id)" },
  emphasis: EMPHASIS,
} as const;

const EDGE_PROPS = {
  id: { type: "string", description: "Stable id, e.g. 'e1'" },
  source: { ...STR, description: "Source node id" },
  target: { ...STR, description: "Target node id" },
  type: {
    type: "string",
    enum: [
      "authorization",
      "clearing",
      "settlement",
      "funding",
      "refund",
      "chargeback",
      "interchange",
      "fee",
      "reconciliation",
      "transfer",
      "notification",
    ],
  },
  layers: {
    type: "array",
    items: { type: "string", enum: ["money", "message", "exception"] },
    description: "Which story each leg belongs to; an edge may have more than one",
  },
  rail: { ...STR, description: "Rail or system carrying this leg, e.g. 'Interac Debit', 'ACH', 'FedNow'" },
  currency: CURRENCY,
  timing: { ...STR, description: "e.g. 'real-time', 'T+1', 'end-of-day batch'" },
  messageStandard: { ...STR, description: "e.g. 'ISO 20022', 'Nacha PPD', 'MT103'" },
  amount: {
    type: "object",
    properties: {
      value: { type: "number" },
      unit: { type: "string", enum: ["fixed", "percent", "variable"] },
    },
    required: ["value", "unit"],
    additionalProperties: false,
  },
  fee: {
    type: "object",
    properties: { value: { type: "number" }, type: { type: "string" } },
    required: ["value", "type"],
    additionalProperties: false,
  },
  direction: { type: "string", enum: ["unidirectional", "bidirectional"] },
  label: { ...STR, description: "Short edge label shown on the diagram, e.g. 'Auth routed'" },
  description: STR,
  ordinal: { type: "number", description: "Sequence number in the flow narrative (1, 2, 3, ...)" },
  emphasis: EMPHASIS,
} as const;

const ANNOTATION_PROPS = {
  id: STR,
  type: {
    type: "string",
    enum: ["callout", "note", "warning", "fee_breakdown", "regulatory_footnote", "assumption"],
  },
  targetType: { type: "string", enum: ["node", "edge", "canvas"] },
  targetId: STR,
  text: STR,
  // surfacedByLens deliberately absent: the persona-lens concept it fed was
  // never rendered anywhere, so offering it here only prompted the model to
  // spend tokens generating unread data. The Zod schema still ACCEPTS the
  // field (old seeds/share links carry it), it just isn't solicited.
} as const;

function obj(properties: Record<string, unknown>, required: string[]) {
  return { type: "object" as const, properties, required, additionalProperties: false };
}

export const FLOW_TOOLS: Anthropic.Messages.ToolUnion[] = [
  {
    name: "set_metadata",
    description:
      "Set the flow's title and metadata. Call this FIRST when generating a new flow, or when an edit changes scope (rails, jurisdiction, currencies, title).",
    input_schema: obj(
      {
        title: STR,
        description: STR,
        narrative: { ...STR, description: "3-5 sentence prose walkthrough of the whole flow, in order" },
        jurisdiction: { type: "array", items: JURISDICTION },
        primaryRails: STR_ARR,
        currencies: { type: "array", items: CURRENCY },
        tags: STR_ARR,
      },
      ["title", "jurisdiction", "primaryRails", "currencies"],
    ),
  },
  {
    name: "add_swimlane",
    description:
      "Declare a horizontal lane that groups parties by role. Call once per lane after set_metadata, before adding nodes. Standard lanes: customer (order 1), merchant (order 2), network (order 3), banking (order 4).",
    input_schema: obj(
      { id: STR, label: STR, description: STR, jurisdiction: JURISDICTION, order: { type: "number" } },
      ["id", "label", "order"],
    ),
  },
  {
    name: "add_node",
    description:
      "Add one party to the flow (acts as upsert if the id exists). Emit one of these for EVERY party in the same turn, in narrative order — all nodes in one batch, not one per turn. endpoint = people/businesses; institution = banks/networks/operators; intermediary = processors/program managers/FX/correspondents; treasury = FBO/custodial/settlement accounts.",
    input_schema: obj(NODE_PROPS as unknown as Record<string, unknown>, ["id", "type", "label"]),
  },
  {
    name: "update_node",
    description:
      "Patch fields on an existing node (rename, change regulators, move lanes, ...). Prefer this over remove+add — it preserves layout and edge references.",
    input_schema: obj(
      {
        id: STR,
        set: {
          type: "object",
          properties: { ...NODE_PROPS, id: undefined } as unknown as Record<string, unknown>,
          additionalProperties: false,
        },
      },
      ["id", "set"],
    ),
  },
  {
    name: "remove_node",
    description: "Remove a node and every edge connected to it. Use only when the party truly leaves the flow.",
    input_schema: obj({ id: STR }, ["id"]),
  },
  {
    name: "add_edge",
    description:
      "Add one money or message movement between two existing nodes (acts as upsert if the id exists). Emit one of these for EVERY leg in the same turn, in narrative order with ordinal set — all edges in one batch, not one per turn. Every edge needs a real rail and the correct edge type.",
    input_schema: obj(EDGE_PROPS as unknown as Record<string, unknown>, [
      "id",
      "source",
      "target",
      "type",
      "rail",
      "currency",
    ]),
  },
  {
    name: "update_edge",
    description:
      "Patch fields on an existing edge (change rail, timing, label, type, ...). Prefer this over remove+add.",
    input_schema: obj(
      {
        id: STR,
        set: {
          type: "object",
          properties: { ...EDGE_PROPS, id: undefined } as unknown as Record<string, unknown>,
          additionalProperties: false,
        },
      },
      ["id", "set"],
    ),
  },
  {
    name: "remove_edge",
    description: "Remove one edge by id.",
    input_schema: obj({ id: STR }, ["id"]),
  },
  {
    name: "add_annotation",
    description:
      "Attach a compliance footnote, fee breakdown, warning, or callout to a node, an edge, or the whole canvas. Use sparingly for things a reader must not miss (e.g. 'the fintech is NOT the issuer').",
    input_schema: obj(ANNOTATION_PROPS as unknown as Record<string, unknown>, [
      "id",
      "type",
      "targetType",
      "text",
    ]),
  },
  {
    name: "remove_annotation",
    description: "Remove one annotation by id.",
    input_schema: obj({ id: STR }, ["id"]),
  },
  {
    name: "set_view",
    description:
      "Set the diagram VIEW without redrawing — `mode` chooses the reading experience (story = concise money story on the map, system = full mechanics); `lens` traces one STORY end-to-end (money, message, exception) and dims the rest, or `all` for the whole flow; `focus` isolates one fine colour type in the legend (settlement, message, auth, fee, refund) or `all`; `viewMode` switches the spatial LAYOUT (map = node graph, lanes = party swimlanes, timeline = legs placed by settlement time). Story always uses map and clears lens/focus; use System for non-trivial lens, focus, or layout requests. Always call this as part of the final turn when generating — it is required, never optional.",
    input_schema: obj(
      {
        mode: { type: "string", enum: ["story", "system"] },
        lens: { type: "string", enum: ["all", "money", "message", "exception"] },
        focus: { type: "string", enum: ["all", "auth", "settlement", "fee", "refund", "message"] },
        viewMode: {
          type: "string",
          enum: ["map", "lanes", "timeline"],
          description:
            "Spatial layout: map = the default node graph; lanes = party swimlanes (one row per party); timeline = legs placed by settlement time.",
        },
      },
      [],
    ),
  },
  {
    name: "suggest_followups",
    description:
      "Suggest 2-4 next prompts the user could ask about this flow. Call this LAST, after all other ops.",
    input_schema: obj(
      {
        followups: {
          type: "array",
          items: obj({ prompt: STR, rationale: STR }, ["prompt"]),
        },
      },
      ["followups"],
    ),
  },
];
