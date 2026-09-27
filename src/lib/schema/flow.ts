import { z } from "zod";

/**
 * FoF Studio data contract (schemaVersion 1.0).
 *
 * Permissive on labels (free-form strings), strict on structure. This Zod schema
 * is the single source of truth: it infers the TypeScript types used across the
 * app AND validates every agent response at runtime.
 */

export const SCHEMA_VERSION = "1.0" as const;

export const LensSchema = z.enum([
  "executive",
  "compliance",
  "engineering",
  "commercial",
  "regulatory",
]);
export type Lens = z.infer<typeof LensSchema>;
// (LensSchema survives only so existing seeds/share links carrying the old
// persona-lens fields still validate; nothing renders or solicits them.)

// Going global region-by-region (see docs/payment-schemes-global.md). KB-backed
// regions ship with sourced docs + verified seeds. A small number of destination
// codes may be schema-allowed for caveated cross-border diagrams (e.g. MX/MXN)
// without treating their local rails as KB-backed.
export const JurisdictionSchema = z.enum(["CA", "US", "EU", "GB", "IN", "BR", "MX"]);
export const CurrencySchema = z.enum(["CAD", "USD", "EUR", "GBP", "INR", "BRL", "MXN"]);

export const NodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["endpoint", "institution", "intermediary", "treasury"]),
  subtype: z.string().optional(),
  label: z.string().min(1),
  description: z.string().optional(),
  jurisdiction: JurisdictionSchema.optional(),
  regulators: z.array(z.string()).optional(),
  license: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  swimlaneId: z.string().optional(),
  emphasis: z.enum(["primary", "secondary", "muted"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type FoFNode = z.infer<typeof NodeSchema>;

export const EdgeTypeSchema = z.enum([
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
]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

/**
 * A leg's STORY layer — orthogonal to its fine-grained `type`. `type` drives the
 * colour (authorization vs settlement vs fee …); `layers` drives which complete
 * narrative the leg belongs to, so a view can trace the WHOLE money path even
 * though that path is spread across several edge types (a debit is `funding`, an
 * interbank leg is `settlement`, a credit is `funding` — all one money story). An
 * edge may belong to MORE THAN ONE layer (a credit instruction is a message that
 * also moves the money story forward).
 *   money     — value actually moving or committed: debit, credit, settlement, fees
 *   message   — instructions, notifications, confirmations, clearing
 *   exception — the unhappy path: refunds, chargebacks, reversals, returns
 * Optional: when absent, the renderer derives a coarse fallback from `type`
 * (see edgeLayers() in lib/diagram/layout.ts). Seeds + the generator SHOULD tag
 * it explicitly, because the money story is cross-type and the fallback can't
 * recover a money-committing leg that happens to be typed `authorization`.
 */
export const EdgeLayerSchema = z.enum(["money", "message", "exception"]);
export type EdgeLayer = z.infer<typeof EdgeLayerSchema>;

export const EdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: EdgeTypeSchema,
  layers: z.array(EdgeLayerSchema).optional(),
  rail: z.string(),
  currency: CurrencySchema,
  timing: z.string().optional(),
  messageStandard: z.string().optional(),
  amount: z
    .object({ value: z.number(), unit: z.enum(["fixed", "percent", "variable"]) })
    .optional(),
  fee: z.object({ value: z.number(), type: z.string() }).optional(),
  direction: z.enum(["unidirectional", "bidirectional"]),
  label: z.string().optional(),
  description: z.string().optional(),
  ordinal: z.number().optional(),
  emphasis: z.enum(["primary", "secondary", "muted"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type FoFEdge = z.infer<typeof EdgeSchema>;

export const SwimlaneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  jurisdiction: JurisdictionSchema.optional(),
  orientation: z.enum(["horizontal", "vertical"]),
  order: z.number(),
});
export type Swimlane = z.infer<typeof SwimlaneSchema>;

export const AnnotationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "callout",
    "note",
    "warning",
    "fee_breakdown",
    "regulatory_footnote",
    "assumption",
  ]),
  targetType: z.enum(["node", "edge", "canvas"]),
  targetId: z.string().optional(),
  text: z.string().min(1),
  surfacedByLens: z.array(LensSchema).optional(),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

export const FollowUpSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  rationale: z.string().optional(),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

export const MetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  narrative: z.string().optional(),
  activeLens: LensSchema.optional(),
  jurisdiction: z.array(JurisdictionSchema).min(1),
  primaryRails: z.array(z.string()),
  currencies: z.array(CurrencySchema).min(1),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.enum(["seed", "ai-generated", "user-edited"]),
});
export type FoFMetadata = z.infer<typeof MetadataSchema>;

export const FlowOfFundsSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: z.string().min(1),
    metadata: MetadataSchema,
    nodes: z.array(NodeSchema).min(1),
    edges: z.array(EdgeSchema),
    swimlanes: z.array(SwimlaneSchema).optional(),
    annotations: z.array(AnnotationSchema).optional(),
    suggestedFollowups: z.array(FollowUpSchema).optional(),
  })
  .superRefine((flow, ctx) => {
    // Structural integrity beyond shape: edges must connect real nodes,
    // and node ids must be unique. Labels stay free-form (permissive).
    const nodeIds = new Set<string>();
    flow.nodes.forEach((n, i) => {
      if (nodeIds.has(n.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate node id "${n.id}"`,
          path: ["nodes", i, "id"],
        });
      }
      nodeIds.add(n.id);
    });
    flow.edges.forEach((e, i) => {
      if (!nodeIds.has(e.source)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge "${e.id}" references unknown source node "${e.source}"`,
          path: ["edges", i, "source"],
        });
      }
      if (!nodeIds.has(e.target)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge "${e.id}" references unknown target node "${e.target}"`,
          path: ["edges", i, "target"],
        });
      }
    });
    // Anti-empty-graph floor: a multi-party flow must have at least one money-
    // movement leg. ~18% of generated diagrams were shipping with parties but
    // ZERO edges (logged "success") because shape validation allows an empty edge
    // array. Require >=1 edge once there are 2+ nodes — the providers route this
    // through one repair round, then an honest "too sparse, re-run" instead of
    // emitting a node-only render. Deliberately edge-count-only and lenient:
    // legitimate context/oversight nodes (a scheme rulebook body, a regulator)
    // may be intentionally edge-less, so we do NOT require every node to connect.
    if (flow.nodes.length >= 2 && flow.edges.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "Flow has 2+ parties but no money-movement legs (0 edges) — emit the money/message legs that connect them, or remove any party that has no role in the flow.",
        path: ["edges"],
      });
    }
    // Note: swimlaneId is intentionally NOT required to match a declared
    // swimlane. A node may carry a lane hint (e.g. "network") even when the
    // flow declares no lanes; the renderer treats unknown lanes as un-laned.
    // We keep the structurally critical checks (edge endpoints, unique ids).
  });

export type FlowOfFunds = z.infer<typeof FlowOfFundsSchema>;
