import Link from "next/link";
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  Coins,
  CreditCard,
  Globe,
  Landmark,
  Smartphone,
  Zap,
} from "lucide-react";
import { getGuide, getTerm } from "@/content";
import type { FlowLayer, GuideDiagram, Misconception, RailFamily, SeeItMove, SourceLink } from "@/content/types";
import { FLOW_CATALOG } from "@/lib/flows/catalog";

/**
 * Shared editorial building blocks for the /learn pages. Server components only
 * (no client JS): the knowledge layer is static and SEO-first. Light,
 * banker-grade register, the same charcoal / muted / hairline / crimson tokens
 * as SiteChrome and the legal pages, plus a money(gold) / message(warm-gray) /
 * exception(crimson) coding that mirrors the studio's money-vs-message teaching.
 */

const LAYER: Record<FlowLayer, { label: string; cls: string }> = {
  money: { label: "money leg", cls: "bg-[#f7efd8] text-[#8a5e00] border-[#e8d9a8]" },
  message: { label: "message leg", cls: "bg-[#ede7da] text-[#6b6b66] border-[#e4dfd2]" },
  party: { label: "a party", cls: "bg-[#efece5] text-[#1c1c1c] border-[#e4dfd2]" },
  both: { label: "money + message", cls: "bg-[#f3eede] text-[#6b6b66] border-[#e4dfd2]" },
};

/** A tiny stroke sample in the diagrams' own edge colors (see EDGE_LEGEND in
 *  lib/diagram/layout.ts: gold solid = money, warm-grey dashed = message), so
 *  the glossary reads as the same visual system as the flows it explains
 *  rather than a plain documentation page. */
function LegLine({ layer }: { layer: FlowLayer }) {
  if (layer === "party") return null;
  if (layer === "both") {
    return (
      <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden className="shrink-0">
        <line x1="0" y1="4" x2="6" y2="4" stroke="#c9962f" strokeWidth="1.6" />
        <line x1="8" y1="4" x2="14" y2="4" stroke="#8a857c" strokeWidth="1.6" strokeDasharray="2 1.5" />
      </svg>
    );
  }
  const color = layer === "money" ? "#c9962f" : "#8a857c";
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden className="shrink-0">
      <line
        x1="0"
        y1="4"
        x2="14"
        y2="4"
        stroke={color}
        strokeWidth="1.6"
        {...(layer === "message" ? { strokeDasharray: "2 1.5" } : {})}
      />
    </svg>
  );
}

export function FlowLayerBadge({ layer }: { layer?: FlowLayer }) {
  if (!layer) return null;
  const s = LAYER[layer];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-tight ${s.cls}`}
    >
      <LegLine layer={layer} />
      {s.label}
    </span>
  );
}

const STEP: Record<"money" | "message" | "exception", string> = {
  money: "bg-[#f7efd8] text-[#8a5e00] border-[#e8d9a8]",
  message: "bg-[#ede7da] text-[#6b6b66] border-[#e4dfd2]",
  exception: "bg-[#fbe9ec] text-[#a11930] border-[#f1c9d1]",
};

export function StepKindTag({ kind }: { kind: "money" | "message" | "exception" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STEP[kind]}`}
    >
      {kind}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a857c]">
      {children}
    </h2>
  );
}

export function LearnCrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#6b6b66]">
      {trail.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {c.href ? (
            <Link href={c.href} className="underline-offset-2 hover:text-[#1c1c1c] hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="text-[#1c1c1c]">{c.label}</span>
          )}
          {i < trail.length - 1 && <span className="text-[#d8d1c0]">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function MisconceptionList({ items }: { items?: Misconception[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-3">
      {items.map((m, i) => (
        <li key={i} className="rounded-xl border border-[#e4dfd2] bg-[#fbf9f3] p-4">
          <p className="flex gap-2 text-[13.5px] leading-relaxed text-[#6b6b66]">
            <span aria-hidden className="font-semibold text-[#a11930]">✗</span>
            <span>
              <span className="font-medium text-[#1c1c1c]">Myth: </span>
              {m.claim}
            </span>
          </p>
          <p className="mt-1.5 flex gap-2 text-[13.5px] leading-relaxed text-[#1c1c1c]">
            <span aria-hidden className="font-semibold text-[#1a7a4a]">✓</span>
            <span>
              <span className="font-medium">Reality: </span>
              {m.reality}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SourceList({ sources }: { sources?: SourceLink[] }) {
  if (!sources?.length) return null;
  return (
    <ul className="space-y-1.5">
      {sources.map((s, i) => (
        <li key={i} className="text-[13px] leading-relaxed">
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            {s.label} ↗
          </a>
          <span className="text-[#6b6b66]">
            {" "}· {s.publisher}
            {s.kind && s.kind !== "authority" ? ` (${s.kind})` : ""}
            {s.note ? `. ${s.note}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TermPills({ slugs }: { slugs?: string[] }) {
  const terms = (slugs ?? []).map(getTerm).filter(Boolean);
  if (!terms.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((t) => (
        <Link
          key={t!.slug}
          href={`/learn/glossary/${t!.slug}`}
          className="rounded-full border border-[#e4dfd2] bg-white px-3 py-1 text-[12.5px] text-[#1c1c1c] transition-colors hover:border-[#C41E3A] hover:text-[#C41E3A]"
        >
          {t!.term}
        </Link>
      ))}
    </div>
  );
}

export function GuidePills({ slugs }: { slugs?: string[] }) {
  const guides = (slugs ?? []).map(getGuide).filter(Boolean);
  if (!guides.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {guides.map((g) => (
        <Link
          key={g!.slug}
          href={`/learn/guides/${g!.slug}`}
          className="group flex items-center justify-between gap-3 rounded-lg border border-[#e4dfd2] bg-white px-3.5 py-2.5 transition-colors hover:border-[#C41E3A]"
        >
          <span className="text-[13.5px] font-medium text-[#1c1c1c]">{g!.title}</span>
          <span aria-hidden className="text-[#C41E3A] opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </Link>
      ))}
    </div>
  );
}

/** A "try it in the Studio" chip. Hard-navigates to the gated studio at
 *  /studio?q=…; the middleware preserves ?q through /unlock and the studio seeds
 *  the prompt on arrival. A prompt that matches an audited seed loads instantly
 *  with no AI spend. */
export function StudioChip({ q, label, sub }: { q: string; label: string; sub?: string }) {
  return (
    <a
      href={`/studio?q=${encodeURIComponent(q)}`}
      className="group inline-flex max-w-full flex-col rounded-xl border border-[#e4dfd2] bg-white px-4 py-2.5 transition-colors hover:border-[#C41E3A]"
    >
      <span className="flex items-center gap-2 text-[13px] font-medium text-[#1c1c1c]">
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-[#C41E3A] transition-transform group-hover:translate-x-0.5">→</span>
      </span>
      {sub && <span className="mt-0.5 text-[11.5px] text-[#6b6b66]">{sub}</span>}
    </a>
  );
}

/** A glossary term's "See it move" deep link: hard-navigates to the gated
 *  studio at /studio?seed=…&sel=…, which loads the audited seed locally (no AI
 *  spend) and selects the term's element so the reader lands in the live
 *  diagram with the editor open on it. Styled like StudioChip; plain <a> so the
 *  page stays a static server component. check-content.ts guarantees the seed
 *  and element exist, so the lookup here is belt and braces for dev. */
export function SeeItMoveChip({ seeIt }: { seeIt: SeeItMove }) {
  const seed = FLOW_CATALOG[seeIt.seedId];
  if (!seed) return null;
  const sel = seeIt.select
    ? `&sel=${encodeURIComponent(`${seeIt.select.kind}:${seeIt.select.id}`)}`
    : "";
  return (
    <a
      href={`/studio?seed=${encodeURIComponent(seeIt.seedId)}${sel}`}
      className="group inline-flex max-w-full flex-col rounded-xl border border-[#e4dfd2] bg-white px-4 py-2.5 transition-colors hover:border-[#C41E3A]"
    >
      <span className="flex items-center gap-2 text-[13px] font-medium text-[#1c1c1c]">
        <span className="truncate">See it move</span>
        <span aria-hidden className="text-[#C41E3A] transition-transform group-hover:translate-x-0.5">→</span>
      </span>
      <span className="mt-0.5 text-[11.5px] text-[#6b6b66]">
        {seeIt.label ?? `opens ${seed.metadata.title} in the studio`}
      </span>
    </a>
  );
}

/** Standing educational-not-advice note for the /learn surface. */
export function LearnDisclaimer() {
  return (
    <p className="rounded-lg border border-[#e8d9a8] bg-[#f7efd8]/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-[#7a5e1a]">
      Educational, plain-English explainers. <strong className="font-semibold">Not legal,
      compliance, tax, or financial advice</strong>. These cover fundamentals, not current fees,
      limits, or rates (which change). Rails and parties vary by program and country, so verify
      specifics against primary sources. Last reviewed June 2026.
    </p>
  );
}

const STROKE: Record<"money" | "message" | "exception", string> = {
  money: "#b8860b",
  message: "#6b6b66",
  exception: "#C41E3A",
};
const INK: Record<"money" | "message" | "exception", string> = {
  money: "#8a5e00",
  message: "#6b6b66",
  exception: "#a11930",
};
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * A guide's flow as a static SVG sequence diagram: party lifelines (columns) and
 * money/message/exception arrows (rows, ordered by ordinal), the studio's own
 * visual language, but server-rendered with zero client JS so it ships on the SEO
 * page. Scales to the container; the legend mirrors the step colour coding.
 */
export function GuideSequenceDiagram({ diagram }: { diagram?: GuideDiagram }) {
  if (!diagram?.nodes?.length || !diagram.legs?.length) return null;
  const nodes = diagram.nodes;
  const legs = [...diagram.legs]
    .filter((l) => l.from !== l.to)
    .sort((a, b) => a.ordinal - b.ordinal);
  if (!legs.length) return null;

  const n = nodes.length;
  const marginX = 72;
  const headerY = 44;
  const rowH = 46;
  const bottomPad = 16;
  const W = Math.max(560, n * 152);
  const usable = W - marginX * 2;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const x = (i: number) => (n === 1 ? W / 2 : marginX + (i * usable) / (n - 1));
  const H = headerY + legs.length * rowH + bottomPad;
  const kinds = ["money", "message", "exception"] as const;

  return (
    <figure className="my-1 overflow-hidden rounded-xl border border-[#e4dfd2] bg-white p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Sequence diagram: how the money and messages move between parties"
        style={{ maxWidth: W, height: "auto" }}
        className="mx-auto block"
      >
        <defs>
          {kinds.map((k) => (
            <marker
              key={k}
              id={`fof-arrow-${k}`}
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10z" fill={STROKE[k]} />
            </marker>
          ))}
        </defs>
        {nodes.map((nd, i) => (
          <g key={nd.id}>
            <line
              x1={x(i)}
              y1={headerY - 6}
              x2={x(i)}
              y2={H - bottomPad + 2}
              stroke="#e4dfd2"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <rect x={x(i) - 58} y={6} width={116} height={26} rx={6} fill="#faf8f2" stroke="#e4dfd2" />
            <text x={x(i)} y={23} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1c1c1c">
              {trunc(nd.label, 18)}
            </text>
          </g>
        ))}
        {legs.map((leg, k) => {
          const fi = idx.get(leg.from);
          const ti = idx.get(leg.to);
          if (fi == null || ti == null) return null;
          const y = headerY + k * rowH + rowH / 2;
          const x1 = x(fi);
          const x2 = x(ti);
          const mid = (x1 + x2) / 2;
          const labelW = Math.min(190, leg.label.length * 6 + 16);
          return (
            <g key={k}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke={STROKE[leg.kind]} strokeWidth={1.7} markerEnd={`url(#fof-arrow-${leg.kind})`} />
              <circle cx={x1} cy={y} r={8} fill={STROKE[leg.kind]} />
              <text x={x1} y={y + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
                {leg.ordinal}
              </text>
              <rect x={mid - labelW / 2} y={y - 19} width={labelW} height={14} rx={3} fill="#ffffff" opacity={0.92} />
              <text x={mid} y={y - 9} textAnchor="middle" fontSize={10} fontWeight={500} fill={INK[leg.kind]}>
                {trunc(leg.label, 30)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10.5px] text-[#8a857c]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: STROKE.money }} /> money (funds move)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: STROKE.message }} /> message (instructions)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: STROKE.exception }} /> exception
        </span>
      </figcaption>
    </figure>
  );
}

const RAIL_ICON: Record<string, typeof CreditCard> = {
  card: CreditCard,
  interac: ArrowLeftRight,
  ach: Landmark,
  wire: Banknote,
  "cross-border": Globe,
  rtp: Zap,
  sepa: Globe,
  pix: Smartphone,
  upi: Smartphone,
  stablecoin: Coins,
  bank: Building2,
};

/** A small lucide glyph for a rail family: a light visual cue on cards/terms. */
export function RailIcon({ family, className }: { family?: RailFamily; className?: string }) {
  const Icon = (family && RAIL_ICON[family]) || Banknote;
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}

/** Per-step colour (reinforces the money/message coding in the step rail). */
export const stepColor = STROKE;
