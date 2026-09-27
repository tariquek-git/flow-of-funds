import { FLOW_CATALOG } from "@/lib/flows/catalog";
import { flowToOps } from "@/lib/flows/toOps";
import { applyOp, type FlowOp } from "@/lib/schema/ops";
import { validateFlow } from "@/lib/schema/validate";
import type { FlowOfFunds } from "@/lib/schema/flow";
import { composeFlow } from "./composer";
import type { AgentRequest, Emit } from "./types";

/**
 * Offline provider. Active when no live-provider credential is configured (or
 * AI_PROVIDER=fixture). Generation composes from scenario archetypes (see
 * composer.ts); edits handle the common cases by hand. Everything streams
 * through the same SSE op protocol the Claude provider uses, so the product
 * experience is identical — just template-bounded instead of model-driven.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NO_KEY_HINT =
  "\n\n(Offline demo mode — add an OpenAI API key to .env.local for fully custom generation and editing.)";

export async function runFixture(req: AgentRequest, emit: Emit): Promise<void> {
  switch (req.capability) {
    case "generate":
      await generate(req, emit);
      break;
    case "edit":
      await edit(req, emit);
      break;
    case "explain":
      await explain(req, emit);
      break;
    case "critique":
      await critique(req, emit);
      break;
  }
  await emit({ type: "done", provider: "fixture" });
}

/** Stream a complete flow as the op sequence that builds it. */
async function streamFlow(flow: FlowOfFunds, emit: Emit): Promise<void> {
  // Mirror the live path's phase signal so the canvas overlay reads the same in
  // offline demo mode (the gated beta surface most testers see first).
  await emit({ type: "status", message: "Drawing the flow…" });
  let draft: FlowOfFunds = {
    ...structuredClone(flow),
    nodes: [],
    edges: [],
    swimlanes: [],
    annotations: [],
    suggestedFollowups: [],
  };
  for (const op of flowToOps(flow)) {
    await sleep(45);
    draft = applyOp(draft, op);
    await emit({ type: "op", op });
  }
  const result = validateFlow(draft);
  if (result.ok) {
    await emit({ type: "flow", flow: result.flow });
    if (result.flow.suggestedFollowups?.length) {
      await emit({ type: "followups", followups: result.flow.suggestedFollowups });
    }
  } else {
    await emit({ type: "error", message: result.errors.join("; ") });
  }
}

export async function replaySeed(seedId: string, emit: Emit): Promise<void> {
  const seed = FLOW_CATALOG[seedId];
  if (!seed) {
    await emit({ type: "error", message: `Unknown seed "${seedId}"` });
    return;
  }
  await emit({
    type: "text",
    delta: seed.metadata.narrative ?? seed.metadata.description ?? "",
  });
  await streamFlow(seed, emit);
}

async function generate(req: AgentRequest, emit: Emit): Promise<void> {
  const composed = composeFlow(req.prompt);
  if (!composed) {
    await emit({
      type: "text",
      delta:
        "I couldn't map that question to one of the offline examples without guessing. Try a curated template below, or add the country and payment type if you know them." +
        NO_KEY_HINT,
    });
    return;
  }
  await emit({ type: "text", delta: composed.intro });
  await streamFlow(composed.flow, emit);
}

async function edit(req: AgentRequest, emit: Emit): Promise<void> {
  const flow = req.currentFlow;
  if (!flow) {
    await emit({ type: "text", delta: "There's no flow on the canvas yet — generate one first." });
    return;
  }

  const rename = req.prompt.match(
    /rename\s+(?:the\s+)?["']?(.+?)["']?\s+to\s+["']?(.+?)["']?\s*$/i,
  );
  if (rename) {
    const node = findNode(flow, rename[1]);
    if (node) {
      const op: FlowOp = { op: "update_node", id: node.id, set: { label: rename[2] } };
      await emit({ type: "text", delta: `Renamed "${node.label}" to "${rename[2]}".` });
      await emit({ type: "op", op });
      await finish(applyOp(flow, op), emit);
      return;
    }
  }

  const retitle = req.prompt.match(/(?:re)?title\s+(?:it|this|the flow)?\s*(?:as|to)?\s*["']?(.+?)["']?\s*$/i);
  if (retitle && /title/i.test(req.prompt)) {
    const m = flow.metadata;
    const op: FlowOp = {
      op: "set_metadata",
      title: retitle[1],
      description: m.description,
      narrative: m.narrative,
      jurisdiction: m.jurisdiction,
      primaryRails: m.primaryRails,
      currencies: m.currencies,
      tags: m.tags,
    };
    await emit({ type: "text", delta: `Retitled the flow to "${retitle[1]}".` });
    await emit({ type: "op", op });
    await finish(applyOp(flow, op), emit);
    return;
  }

  const remove = req.prompt.match(/(?:remove|delete)\s+(?:the\s+)?["']?(.+?)["']?\s*$/i);
  if (remove) {
    const node = findNode(flow, remove[1]);
    if (node) {
      const op: FlowOp = { op: "remove_node", id: node.id };
      await emit({ type: "text", delta: `Removed "${node.label}" and its connected edges.` });
      await emit({ type: "op", op });
      await finish(applyOp(flow, op), emit);
      return;
    }
  }

  if (/chargeback|dispute/i.test(req.prompt)) {
    const issuer = findNode(flow, "issuer") ?? findNode(flow, "sponsor");
    const merchant = findNode(flow, "merchant") ?? findNode(flow, "acquirer");
    if (issuer && merchant) {
      const op: FlowOp = {
        op: "add_edge",
        id: "chargeback-1",
        source: issuer.id,
        target: merchant.id,
        type: "chargeback",
        rail: flow.metadata.primaryRails[0] ?? "Card network",
        currency: flow.metadata.currencies[0],
        ordinal: nextOrdinal(flow),
        label: "Dispute / chargeback",
        description:
          "Issuer-initiated dispute: debits the acquirer, which debits the merchant; merchant may re-present evidence.",
        emphasis: "secondary",
      };
      await emit({
        type: "text",
        delta: `Added a chargeback path from "${issuer.label}" back toward "${merchant.label}". Under card network rules, disputes run issuer → acquirer → merchant.`,
      });
      await emit({ type: "op", op });
      await finish(applyOp(flow, op), emit);
      return;
    }
    await emit({
      type: "text",
      delta:
        "This flow has no card issuer/merchant pair, so a chargeback doesn't apply. On ACH the equivalent is a Nacha return; on wires and FedNow/RTP, credits are irrevocable (recovery is by request-for-return).",
    });
    return;
  }

  if (/refund/i.test(req.prompt)) {
    const merchant = findNode(flow, "merchant");
    const holder = findNode(flow, "cardholder") ?? findNode(flow, "customer");
    if (merchant && holder) {
      const op: FlowOp = {
        op: "add_edge",
        id: "refund-1",
        source: merchant.id,
        target: holder.id,
        type: "refund",
        rail: flow.metadata.primaryRails[0] ?? "Card network",
        currency: flow.metadata.currencies[0],
        ordinal: nextOrdinal(flow),
        label: "Refund",
        description:
          "Merchant-initiated: funds push back through the network to the issuer, which credits the cardholder.",
        emphasis: "secondary",
      };
      await emit({
        type: "text",
        delta: `Added a refund path from "${merchant.label}" back to "${holder.label}".`,
      });
      await emit({ type: "op", op });
      await finish(applyOp(flow, op), emit);
      return;
    }
  }

  await emit({
    type: "text",
    delta:
      'Offline edits I can apply: "rename X to Y", "remove X", "retitle it to …", "add a chargeback", "add a refund".' +
      NO_KEY_HINT,
  });
}

async function explain(req: AgentRequest, emit: Emit): Promise<void> {
  const flow = req.currentFlow;
  if (!flow) {
    await emit({ type: "text", delta: "Nothing on the canvas to explain yet." });
    return;
  }
  if (req.selected?.kind === "node") {
    const node = flow.nodes.find((n) => n.id === req.selected!.id);
    if (node) {
      await emit({
        type: "text",
        delta: `**${node.label}** is ${/^[aeiou]/i.test(node.subtype ?? node.type) ? "an" : "a"} ${node.subtype ?? node.type}${node.jurisdiction ? ` in ${node.jurisdiction === "CA" ? "Canada" : "the US"}` : ""}.${node.description ? ` ${node.description}` : ""}${node.license ? ` Role of record: ${node.license}.` : ""}${node.regulators?.length ? ` Oversight: ${node.regulators.join(", ")}.` : ""}`,
      });
      return;
    }
  }
  if (req.selected?.kind === "edge") {
    const edge = flow.edges.find((e) => e.id === req.selected!.id);
    if (edge) {
      await emit({
        type: "text",
        delta: `**${edge.label ?? edge.type}**: a ${edge.type} leg over ${edge.rail} in ${edge.currency}${edge.timing ? `, timing: ${edge.timing}` : ""}${edge.messageStandard ? `, message standard: ${edge.messageStandard}` : ""}.${edge.description ? ` ${edge.description}` : ""}`,
      });
      return;
    }
  }
  await emit({
    type: "text",
    delta: flow.metadata.narrative ?? flow.metadata.description ?? flow.metadata.title,
  });
}

async function critique(req: AgentRequest, emit: Emit): Promise<void> {
  const flow = req.currentFlow;
  if (!flow) {
    await emit({ type: "text", delta: "Nothing on the canvas to critique yet." });
    return;
  }
  // Honest static checks — not a model critique, but not useless either.
  const notes: string[] = [];
  const hasSettlement = flow.edges.some((e) => e.type === "settlement");
  const hasTreasury = flow.nodes.some((n) => n.type === "treasury");
  if (!hasSettlement) notes.push("No settlement leg — every money flow should show where value finally moves between institutions.");
  if (!hasTreasury) notes.push("No treasury/settlement account node — consider showing where funds actually sit.");
  const noOrdinal = flow.edges.filter((e) => !e.ordinal).length;
  if (noOrdinal) notes.push(`${noOrdinal} edge(s) missing a sequence number — ordering helps a reader follow the flow.`);
  const hasException = flow.edges.some((e) => e.type === "chargeback" || e.type === "refund");
  if (!hasException) notes.push("Happy path only — no refund/chargeback/return leg. Ask me to add one if it applies to this rail.");
  const danglingLanes = (flow.swimlanes ?? []).filter((l) => !flow.nodes.some((n) => n.swimlaneId === l.id));
  if (danglingLanes.length) notes.push(`${danglingLanes.length} declared lane(s) have no parties.`);

  await emit({
    type: "text",
    delta: notes.length
      ? `Static checks (offline — a model critique needs an API key):\n\n${notes.map((n) => `• ${n}`).join("\n\n")}`
      : "Static checks pass: settlement shown, sequence numbers present, lanes used. For a domain-judgment critique (correct rails, realistic timing), add an API key.",
  });
}

function nextOrdinal(flow: FlowOfFunds): number {
  return Math.max(0, ...flow.edges.map((e) => e.ordinal ?? 0)) + 1;
}

function findNode(flow: FlowOfFunds, query: string) {
  const q = query.trim().toLowerCase();
  return (
    flow.nodes.find((n) => n.id.toLowerCase() === q || n.label.toLowerCase() === q) ??
    flow.nodes.find(
      (n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
    )
  );
}

async function finish(draft: FlowOfFunds, emit: Emit): Promise<void> {
  const result = validateFlow(draft);
  if (result.ok) await emit({ type: "flow", flow: result.flow });
}
