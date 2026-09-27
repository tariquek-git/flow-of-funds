"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  ArrowLeftRight,
  ArrowRightLeft,
  Building2,
  Cpu,
  Globe,
  Landmark,
  Layers,
  Network,
  Rocket,
  Scale,
  Server,
  Store,
  User,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FoFNode } from "@/lib/schema/flow";
import type { ElementProvenance } from "@/lib/export/exhibit";
import { railBrand } from "@/lib/diagram/brands";
import { useStudio } from "@/lib/state/store";
import { NodeBrandBadge } from "./BrandMark";
import { ProvenanceMarker, provenanceAria } from "./ProvenanceMarker";

const TYPE_STYLES: Record<
  FoFNode["type"],
  { chip: string; icon: string; selected: string }
> = {
  // Warm node-type palette (no blue/teal/violet) — mirrors the edge family +
  // TemplateLibrary node colors: endpoint charcoal, institution maple, intermediary
  // gold, treasury crimson. Tints reuse the design system's money/exception/party fills.
  endpoint: { chip: "bg-[#efece5] text-[#1c1c1c]", icon: "bg-[#e4dfd2] text-[#1c1c1c]", selected: "ring-[#1c1c1c]" },
  institution: { chip: "bg-[#f3eede] text-[#6f4a10]", icon: "bg-[#e9dcc4] text-[#8a5a14]", selected: "ring-[#8a5a14]" },
  intermediary: { chip: "bg-[#f7efd8] text-[#8a5e00]", icon: "bg-[#efe1b8] text-[#9a7016]", selected: "ring-[#c9962f]" },
  treasury: { chip: "bg-[#fbe9ec] text-[#a11930]", icon: "bg-[#f3d2d8] text-[#C41E3A]", selected: "ring-[#C41E3A]" },
};

/**
 * Subtype → icon. The subtype is the AUTHORITATIVE role hint (set by seeds and
 * the agent) and must win over label keywords — otherwise a CSM whose label
 * mentions "ECB", or a bank-PSP whose label contains "PSP", gets mis-iconed.
 * Matches the taxonomy in docs/payment-schemes-global.md.
 */
const SUBTYPE_ICON: Record<string, LucideIcon> = {
  "central-bank": Building2,
  "clearing-house": Layers,
  "scheme-operator": Network,
  "scheme-manager": Network,
  network: Network,
  processor: Cpu,
  gateway: Cpu,
  operator: Server,
  wallet: Wallet,
  fintech: Rocket,
  "program-manager": Rocket,
  neobank: Rocket,
  correspondent: ArrowLeftRight,
  fx: ArrowRightLeft,
  cls: ArrowRightLeft,
  messaging: Globe,
  regulator: Scale,
};

/**
 * Party icon by role: explicit subtype first (authoritative), then label
 * keywords for nodes without a role subtype, then the structural node type.
 */
function nodeIcon(node: FoFNode): LucideIcon {
  const sub = (node.subtype ?? "").toLowerCase().trim();
  if (sub && SUBTYPE_ICON[sub]) return SUBTYPE_ICON[sub];

  const label = node.label.toLowerCase();
  const has = (re: RegExp) => re.test(label);
  if (has(/central bank|reserve bank|federal reserve|eurosystem|bundesbank|bank of (england|canada|mexico|japan)|banco central|monetary authority/))
    return Building2;
  if (has(/clearing house|\bach operator\b|clearing|netting|eba clearing/)) return Layers;
  if (has(/scheme|card network|payment network|network switch/)) return Network;
  if (has(/regulator|supervisor|oversight/)) return Scale;
  if (has(/\bcls\b|foreign exchange|currency conversion/)) return ArrowRightLeft;
  if (has(/correspondent|nostro|vostro/)) return ArrowLeftRight;
  if (has(/\bswift\b|\bcips\b|\bpapss\b/)) return Globe;
  if (has(/wallet|alipay|wechat|weixin|m-?pesa/)) return Wallet;
  if (has(/program manager|\bfintech\b|neobank|payfac/)) return Rocket;
  if (has(/processor|gateway|acquir(?:er|ing) processor/)) return Cpu;

  switch (node.type) {
    case "endpoint":
      return /merchant|retailer|store|supplier|seller|biller/i.test(node.label) ? Store : User;
    case "institution":
      return Landmark;
    case "intermediary":
      return ArrowLeftRight;
    case "treasury":
      return Vault;
  }
}

export const FofNodeView = memo(function FofNodeView({ data, selected }: NodeProps) {
  const node = data as unknown as FoFNode;
  const detail = useStudio((s) => s.detail);
  const select = useStudio((s) => s.select);
  const style = TYPE_STYLES[node.type];
  // Per-element provenance, precomputed in FlowCanvas (no per-render DOM query).
  const provenance = (data as { _provenance?: ElementProvenance } | undefined)?._provenance;
  const Icon = nodeIcon(node);
  const brand =
    node.subtype === "network" || node.subtype === "operator" ? railBrand(node.label) : null;
  // Themed flows (e.g. the Hitchhiker's Guide easter egg) can carry a per-node
  // emoji in metadata; it renders in place of the lucide icon.
  const emoji = typeof node.metadata?.emoji === "string" ? (node.metadata.emoji as string) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        provenance
          ? `Edit ${node.label} party. ${provenanceAria(provenance)}`
          : `Edit ${node.label} party`
      }
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select({ kind: "node", id: node.id });
        }
      }}
      className={`relative w-[224px] rounded-lg border bg-white px-3.5 py-2.5 shadow-sm transition-shadow ${
        selected
          ? `border-transparent ring-2 ${style.selected} shadow-md`
          : "border-[#e4dfd2] hover:shadow-md"
      } ${node.emphasis === "muted" ? "opacity-60" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/50`}
    >
      {provenance && (
        // ~10px corner glyph: a gold seal (verified), an amber-gold book
        // (kb-grounded), or a maple sparkle (inferred). Nodes are verified or
        // inferred in v1 (edges carry the kb-grounded rail tier). Confidence text
        // only at full detail, matching the edge chips.
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 grid place-items-center rounded-full border border-[#e4dfd2] bg-white p-0.5 shadow-sm">
          <ProvenanceMarker provenance={provenance} size={10} withConfidence={detail === "full"} />
        </span>
      )}
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-[#c9c3b8]" />

      <>
          <div className="flex items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${style.icon}`}>
              {emoji ? <span className="text-base leading-none" aria-hidden>{emoji}</span> : <Icon size={15} strokeWidth={2.2} />}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${style.chip}`}
            >
              {node.subtype ?? node.type}
            </span>
            <span className="flex-1" />
            {brand && <NodeBrandBadge text={node.label} />}
            {node.jurisdiction && (
              <span className="text-[10px] font-bold text-slate-500">{node.jurisdiction}</span>
            )}
          </div>
          <div className="mt-1.5 text-[14px] font-semibold leading-tight text-slate-900">
            {node.label}
          </div>
          {node.description && (
            <div
              className={`mt-1 text-[11px] leading-snug text-slate-600 ${
                detail === "full" ? "line-clamp-3" : "line-clamp-2"
              }`}
            >
              {node.description}
            </div>
          )}
          {detail === "full" && node.license && (
            <div className="mt-1 truncate text-[10px] font-medium text-slate-500">
              {node.license}
            </div>
          )}
          {detail === "full" && !!node.regulators?.length && (
            <div className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
              {node.regulators.join(" · ")}
            </div>
          )}
      </>

      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-[#c9c3b8]" />
    </div>
  );
});

export const LaneBandView = memo(function LaneBandView({ data }: NodeProps) {
  const band = data as unknown as { label: string; width: number; height: number; index: number };
  const hidden = { opacity: 0, pointerEvents: "none" as const, width: 1, height: 1 };
  return (
    <div
      className="pointer-events-none rounded-xl border border-[#e4dfd2]"
      style={{
        width: band.width,
        height: band.height,
        background: band.index % 2 === 0 ? "rgba(255,255,255,0.72)" : "rgba(237,231,218,0.5)",
      }}
    >
      {/* Invisible handles: React Flow only marks a node "initialized" once
          handle bounds exist. Without these, every fitView in the app hangs
          forever (the internal nodesInitialized check never passes). */}
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hidden} isConnectable={false} />
      <span className="absolute left-3 top-1/2 block w-[88px] -translate-y-1/2 text-[13px] font-bold uppercase leading-tight tracking-wide text-slate-500">
        {band.label}
      </span>
    </div>
  );
});

/** A vertical TIME-BUCKET band for the timeline view: a column behind the nodes
    with its bucket heading anchored at the TOP (the axis reads left to right,
    Instant → Days). Vertical sibling of LaneBandView; same measured-node /
    hidden-handle contract so the auto-fit never hangs. Warm palette only. */
export const TimeBandView = memo(function TimeBandView({ data }: NodeProps) {
  const band = data as unknown as { label: string; width: number; height: number; index: number };
  const hidden = { opacity: 0, pointerEvents: "none" as const, width: 1, height: 1 };
  return (
    <div
      className="pointer-events-none rounded-xl border border-[#e4dfd2]"
      style={{
        width: band.width,
        height: band.height,
        background: band.index % 2 === 0 ? "rgba(255,255,255,0.72)" : "rgba(237,231,218,0.5)",
      }}
    >
      {/* Invisible handles: React Flow only marks a node "initialized" once
          handle bounds exist. Without these every fitView in the app hangs. */}
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hidden} isConnectable={false} />
      <span className="absolute left-0 top-2 block w-full text-center text-[12px] font-bold uppercase leading-tight tracking-wide text-slate-500">
        {band.label}
      </span>
    </div>
  );
});
