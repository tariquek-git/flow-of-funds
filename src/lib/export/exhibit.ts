import { EDGE_LEGEND, layoutFlow, layoutFlowLanes, layoutFlowTimeline } from "@/lib/diagram/layout";
import { kbCoverageForEdge } from "@/lib/kb/knowledge";
import type { FlowOfFunds, FoFEdge, FoFMetadata, FoFNode } from "@/lib/schema/flow";
import type { DetailLevel, ViewMode } from "@/lib/state/store";
import { buildTrustReceipt } from "@/lib/trust/receipt";

/**
 * Single source of truth for provenance copy. The on-screen trust surfaces and
 * the exported exhibit footer both read from here so they can
 * never disagree about whether a flow is a curated template, AI draft, or
 * edited flow. The enum stays compatible with existing callers, while the
 * public copy avoids implying claim verification or human review.
 *
 * `tone: "grounded"` is the calm, curated-seed state; `tone: "caution"` is the
 * amber "verify before client use" state for anything AI touched.
 */
export type ProvenanceTone = "grounded" | "caution";

export interface Provenance {
  tone: ProvenanceTone;
  /** Short label for the compact on-canvas badge. */
  short: string;
  /** Full sentence for the exhibit footer (survives into a client deck). */
  long: string;
}

export function sourceProvenance(source: FoFMetadata["source"]): Provenance {
  if (source === "seed") {
    return {
      tone: "grounded",
      short: "Curated template",
      long: "Curated template. Source links do not establish claim verification or human review.",
    };
  }
  if (source === "user-edited") {
    return {
      tone: "caution",
      short: "Edited flow",
      long: "Edited flow. Source links do not establish claim verification or human review.",
    };
  }
  // "ai-generated" (and any future non-seed source) defaults to the AI caution.
  return {
    tone: "caution",
    short: "AI draft",
    long: "AI draft. Source links do not establish claim verification or human review.",
  };
}

export type ExhibitTrustLines = {
  originAndSupport: string;
  reviewAndCaveat: string;
  caveats: string[];
};

/** Pure export copy, kept outside canvas code so tests can lock the trust line. */
export function exhibitTrustLines(flow: FlowOfFunds): ExhibitTrustLines {
  const receipt = buildTrustReceipt(flow);
  const humanReview = receipt.humanReview.recorded
    ? `${receipt.humanReview.reviewer} · ${receipt.humanReview.reviewedAt}`
    : "not recorded";
  const caveats = [
    ...receipt.assumptions.map((text) => `Assumption: ${text}`),
    ...receipt.warnings.map((text) => `Warning: ${text}`),
  ];

  return {
    originAndSupport:
      `${receipt.origin.label} · Document/rail support ${receipt.evidence.coveredLegs}/${receipt.evidence.relevantLegs} matched legs · not claim verification`,
    reviewAndCaveat: caveats.length
      ? `Human review: ${humanReview} · ${caveats.length} attached caveat${caveats.length === 1 ? "" : "s"}`
      : `Human review: ${humanReview} · No attached caveats`,
    caveats,
  };
}

/**
 * Per-element provenance — the product's headline differentiator. Tap any leg
 * or party and learn whether it is a VERIFIED seed fact (audited, sometimes with
 * a cited source) or AI-INFERRED (must be checked before client use), plus a
 * confidence and the primary source when one exists.
 *
 * BESIDE sourceProvenance() on purpose: both live here as the single source of
 * truth so the on-canvas glyph, the editor row, and the exhibit footer can never
 * disagree. No schema change — derivation reads the existing open
 * node.metadata / edge.metadata record and the annotations array.
 *
 *   verified    = warm, grounded (a check/seal). The element is from an audited
 *                 seed, optionally with an explicit cited source.
 *   kb-grounded = warm, honest middle tier (a small KB/book glyph). The element
 *                 is an AI-assembled EDGE whose RAIL is documented in our
 *                 knowledge base. It is BELOW verified: the rail is sound, but the
 *                 AI wrote this specific leg, so the details still want a look. It
 *                 must NEVER read like an audited "Verified" seal.
 *   inferred    = amber/maple caution (an AI sparkle). AI-generated beyond the
 *                 knowledge base, user-edited, or otherwise not vouched for;
 *                 verify rails, timing, and parties.
 */
export type ElementProvenanceKind = "verified" | "kb-grounded" | "inferred";
export type ElementConfidence = "high" | "medium" | "low";

export interface ElementProvenance {
  kind: ElementProvenanceKind;
  /** Present when a confidence override was stamped on the element. */
  confidence?: ElementConfidence;
  /** The primary citation:
      - verified: footnote text (verified-with-citation), optional URL from metadata.
      - kb-grounded: the KB doc that documents this rail (full title as `text`, doc
        source url, plus a short human `label` for easygoing inline prose). */
  source?: { text: string; url?: string; label?: string };
}

const CONFIDENCE_VALUES: readonly ElementConfidence[] = ["high", "medium", "low"];

/** Read a string field off an element's open metadata record, or undefined. */
function metaString(
  el: Pick<FoFNode, "metadata"> | Pick<FoFEdge, "metadata">,
  key: string,
): string | undefined {
  const v = el.metadata?.[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Any source URL the element carries in its open metadata. Optional helper so a
 * caller (editor row, future export legend) can linkify a citation the same way
 * the Sources tab does, without duplicating the metadata-shape guard.
 */
export function elementSourceUrl(
  el: Pick<FoFNode, "metadata"> | Pick<FoFEdge, "metadata">,
): string | undefined {
  return metaString(el, "sourceUrl") ?? metaString(el, "url");
}

export function elementProvenance(
  flow: FlowOfFunds,
  target: { kind: "node" | "edge"; id: string },
): ElementProvenance {
  const el: FoFNode | FoFEdge | undefined =
    target.kind === "node"
      ? flow.nodes.find((n) => n.id === target.id)
      : flow.edges.find((e) => e.id === target.id);

  // Optional explicit overrides stamped on the element win where present.
  const confOverride = el ? metaString(el, "confidence") : undefined;
  const confidence = CONFIDENCE_VALUES.includes(confOverride as ElementConfidence)
    ? (confOverride as ElementConfidence)
    : undefined;
  const provOverride = el ? metaString(el, "provenance") : undefined;
  const url = el ? elementSourceUrl(el) : undefined;

  // (a) An element-targeted regulatory_footnote is an explicit cited source →
  //     verified-with-citation, regardless of the flow-level source. But a
  //     user-edited element forfeits the verified stamp even when footnoted (the
  //     citation may no longer describe the edited content): it falls through to
  //     inferred, mirroring the guard in (b).
  const footnote = flow.annotations?.find(
    (a) =>
      a.type === "regulatory_footnote" &&
      a.targetType === target.kind &&
      a.targetId === target.id,
  );
  if (footnote && provOverride !== "user-edited") {
    return { kind: "verified", confidence, source: { text: footnote.text, url } };
  }

  // (b) Seed-grounded, no explicit citation: a verified seed whose element has
  //     not been individually user-edited reads verified (no source line).
  if (
    flow.metadata.source === "seed" &&
    el &&
    provOverride !== "user-edited"
  ) {
    return { kind: "verified", confidence };
  }

  // (c) Everything else (an AI-generated flow, a user-edited element, or an
  //     element absent from a seed). This is where the AI's own legs live. If the
  //     element is an EDGE whose RAIL is documented in our knowledge base, it
  //     earns the honest middle tier: kb-grounded. The rail is sound; the AI
  //     assembled THIS leg, so the specifics still want a look. RTR, Lynx, and any
  //     rail with no doc fall through to inferred (kbCoverageForEdge returns null).
  //     Nodes stay inferred for v1: the rail is the accurate unit of KB coverage.
  if (target.kind === "edge" && el) {
    const coverage = kbCoverageForEdge(el as FoFEdge);
    if (coverage) {
      return {
        kind: "kb-grounded",
        confidence,
        source: { text: coverage.docTitle, url: coverage.source?.url, label: coverage.shortLabel },
      };
    }
  }

  // Otherwise AI-inferred → caution.
  return { kind: "inferred", confidence };
}

/**
 * Exhibit export: a composed 16:9 PNG that drops straight into a deck —
 * title block, the full diagram fitted independently of the current
 * viewport, edge-color legend, and provenance/caveat footer. The personas'
 * verdict on the old raw viewport grab: "if I'm cropping screenshots I've
 * lost the time the tool saved me."
 */

const W = 2400;
const H = 1350;
const DIAGRAM = { x: 70, y: 200, w: W - 140, h: 820 };

/**
 * Draw the Fintech North North-Star mark on a 2D canvas, ported from
 * FintechNorthMark.tsx (viewBox 0 0 200 200). Centred on (cx, cy), scaled to
 * `size` px. The apex star is the fixed crimson accent; the constellation lines
 * and lower nodes are charcoal ink so the glyph reads cleanly on the cream
 * footer ground. Used as the lead-in to the exported credit line.
 */
function drawNorthStarMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const ink = "#1c1c1c";
  const crimson = "#C41E3A";
  // Source geometry spans roughly y=22..160 in the 200-unit box; map that band
  // to a `size`-tall glyph centred on (cx, cy).
  const s = size / 150;
  const ox = cx - 100 * s;
  const oy = cy - 91 * s;
  const px = (x: number) => ox + x * s;
  const py = (y: number) => oy + y * s;

  ctx.save();
  ctx.lineCap = "round";
  const line = (
    x1: number, y1: number, x2: number, y2: number,
    color: string, width: number, alpha: number,
  ) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.6, width * s);
    ctx.beginPath();
    ctx.moveTo(px(x1), py(y1));
    ctx.lineTo(px(x2), py(y2));
    ctx.stroke();
  };
  const dot = (x: number, y: number, r: number, color: string, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px(x), py(y), r * s, 0, Math.PI * 2);
    ctx.fill();
  };

  line(100, 22, 100, 110, crimson, 3, 0.6);
  line(100, 22, 38, 80, ink, 2, 0.34);
  line(100, 22, 162, 72, ink, 2, 0.34);
  line(38, 80, 100, 110, ink, 1.6, 0.24);
  line(162, 72, 100, 110, ink, 1.6, 0.24);
  line(38, 80, 58, 160, ink, 1.4, 0.18);
  line(162, 72, 148, 160, ink, 1.4, 0.18);
  line(100, 110, 58, 160, ink, 1.4, 0.18);
  line(100, 110, 148, 160, ink, 1.4, 0.18);
  line(58, 160, 148, 160, ink, 1.2, 0.12);
  dot(100, 22, 9, crimson, 1);
  dot(38, 80, 6, ink, 0.55);
  dot(162, 72, 6, ink, 0.55);
  dot(100, 110, 5, ink, 0.45);
  dot(58, 160, 4.5, ink, 0.35);
  dot(148, 160, 4.5, ink, 0.35);
  ctx.restore();
}

export async function exportExhibitPng(
  flow: FlowOfFunds,
  detail: DetailLevel,
  viewMode: ViewMode = "map",
): Promise<boolean> {
  // Simple is the StoryStrip — plain DOM, no React Flow — so capture it
  // directly at its natural size. Detailed/Expert capture the live canvas
  // viewport, with bounds computed from the SAME layout the canvas is showing
  // (the Parties/Timing layouts use materially wider column grids than dagre's;
  // computing bounds from the map layout against a lanes/timeline DOM capture
  // mis-centred the export).
  const strip =
    detail === "overview"
      ? document.querySelector<HTMLElement>("[data-fof-story-strip]")
      : null;
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  const target = strip ?? viewport;
  if (!target) return false;

  const pad = 24;
  let scale: number, tx: number, ty: number;
  if (strip) {
    const r = strip.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    scale = Math.min(1.4, (DIAGRAM.w - pad * 2) / r.width, (DIAGRAM.h - pad * 2) / r.height);
    tx = (DIAGRAM.w - r.width * scale) / 2;
    ty = (DIAGRAM.h - r.height * scale) / 2;
  } else {
    const { nodes } =
      viewMode === "lanes"
        ? layoutFlowLanes(flow, detail)
        : viewMode === "timeline"
          ? layoutFlowTimeline(flow, detail)
          : layoutFlow(flow, detail);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const w = (n.width as number | undefined) ?? 224;
      const h = (n.height as number | undefined) ?? 110;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }
    if (!isFinite(minX)) return false;
    const bw = maxX - minX;
    const bh = maxY - minY;
    scale = Math.min(1.4, (DIAGRAM.w - pad * 2) / bw, (DIAGRAM.h - pad * 2) / bh);
    tx = (DIAGRAM.w - bw * scale) / 2 - minX * scale;
    ty = (DIAGRAM.h - bh * scale) / 2 - minY * scale;
  }

  // Force any in-flight reveal cascade to its end state during capture so the
  // PNG shows fully-drawn legs (see [data-exporting] in globals.css).
  document.documentElement.setAttribute("data-exporting", "1");
  // Lazy-load the heavy capture lib only when an export actually runs, so
  // importing sourceProvenance() into first-paint UI (the provenance badge)
  // doesn't pull html-to-image into the initial bundle.
  const { toPng } = await import("html-to-image");
  let diagramUrl: string;
  try {
    diagramUrl = await toPng(target, {
      width: DIAGRAM.w,
      height: DIAGRAM.h,
      backgroundColor: "#ffffff",
      style: {
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        // The strip keeps its natural layout size (overriding width would
        // reflow the cards); the canvas viewport is sized to the frame as
        // before. Both scale from the top-left so the transform math holds.
        transformOrigin: "top left",
        margin: "0",
        ...(strip ? {} : { width: `${DIAGRAM.w}px`, height: `${DIAGRAM.h}px` }),
      },
    });
  } finally {
    document.documentElement.removeAttribute("data-exporting");
  }
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = diagramUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const font = (weight: number, size: number) =>
    `${weight} ${size}px var(--font-geist-sans, system-ui), system-ui, sans-serif`;

  // Background + header
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1c1c1c";
  ctx.font = font(700, 46);
  ctx.fillText(flow.metadata.title, 70, 104);
  ctx.fillStyle = "#6b6b66";
  ctx.font = font(500, 23);
  const sub = [
    flow.metadata.primaryRails.join(" · "),
    flow.metadata.currencies.join("/"),
    flow.metadata.jurisdiction.join(" & "),
  ]
    .filter(Boolean)
    .join("   ·   ");
  ctx.fillText(sub, 70, 148);
  ctx.fillStyle = "#8a857c";
  ctx.font = font(500, 20);
  const stamp = `Flow of Funds, by Fintech North · ${new Date().toISOString().slice(0, 10)}`;
  ctx.fillText(stamp, W - 70 - ctx.measureText(stamp).width, 104);

  // Diagram panel
  ctx.fillStyle = "#fbf9f3";
  ctx.strokeStyle = "#e4dfd2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(DIAGRAM.x, DIAGRAM.y, DIAGRAM.w, DIAGRAM.h, 16);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(DIAGRAM.x, DIAGRAM.y, DIAGRAM.w, DIAGRAM.h, 16);
  ctx.clip();
  ctx.drawImage(img, DIAGRAM.x, DIAGRAM.y, DIAGRAM.w, DIAGRAM.h);
  ctx.restore();

  // Anti-crop watermark: a VERY faint, tiled brand URL laid diagonally ACROSS
  // the diagram itself — not just the croppable footer. Kept low-opacity so it
  // stays board-presentable (a glance reads clean, it isn't annoying), but it
  // covers the content, so cropping it off takes the diagram with it and masking
  // every staggered tile by hand is more work than just asking us for a clean
  // copy (the footer credit says how). Clipped to the diagram's rounded bounds.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(DIAGRAM.x, DIAGRAM.y, DIAGRAM.w, DIAGRAM.h, 16);
  ctx.clip();
  ctx.translate(DIAGRAM.x + DIAGRAM.w / 2, DIAGRAM.y + DIAGRAM.h / 2);
  ctx.rotate(-Math.PI / 9); // ~-20°
  ctx.fillStyle = "rgba(28, 28, 28, 0.06)";
  ctx.font = font(700, 30);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const wmText = "flows.fintechnorth.ca";
  const wmStepX = 470;
  const wmStepY = 230;
  const wmSpan = Math.max(DIAGRAM.w, DIAGRAM.h);
  for (let wy = -wmSpan; wy <= wmSpan; wy += wmStepY) {
    // Stagger alternate rows so the tile can't be masked with one straight band.
    const wmOffset = (Math.round(wy / wmStepY) % 2) * (wmStepX / 2);
    for (let wx = -wmSpan + wmOffset; wx <= wmSpan; wx += wmStepX) {
      ctx.fillText(wmText, wx, wy);
    }
  }
  ctx.restore();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Legend — lead with the numbered-chip key so the exported exhibit explains
  // its own sequence numbers (no hover or menu available in a deck).
  let lx = 70;
  const ly = H - 96;
  {
    const chipW = 26;
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.roundRect(lx, ly - 18, chipW, 24, 5);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = font(700, 16);
    ctx.textAlign = "center";
    ctx.fillText("1", lx + chipW / 2, ly - 0.5);
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b6b66";
    ctx.font = font(600, 21);
    ctx.fillText("order of steps", lx + chipW + 10, ly);
    lx += chipW + 10 + ctx.measureText("order of steps").width + 44;
  }
  // Simple exports carry no colour vocabulary (one ink, numbered cards), so a
  // five-swatch key would explain colours the image does not contain.
  for (const item of detail === "overview" ? [] : EDGE_LEGEND) {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 5;
    ctx.setLineDash(item.dashed ? [10, 7] : []);
    ctx.beginPath();
    ctx.moveTo(lx, ly - 7);
    ctx.lineTo(lx + 44, ly - 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#6b6b66";
    ctx.font = font(600, 21);
    ctx.fillText(item.label, lx + 54, ly);
    lx += 54 + ctx.measureText(item.label).width + 44;
  }

  // Right-aligned branded credit, opposite the provenance line. Brand line +
  // canonical URL on top, the contact line underneath, fronted by the North-Star
  // mark. The contact line doubles as the watermark's escape hatch: it names the
  // address to reach for a question or a clean, unwatermarked copy, so the
  // deterrent above always has an easy, friendly way out.
  const creditTop = "Flow of Funds · Fintech North   ·   flows.fintechnorth.ca";
  const creditBottom = "Questions, or to remove the watermark, email hello@fintechnorth.ca";
  const topY = H - 60;
  const bottomY = H - 36;
  const rightEdge = W - 70;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(600, 21);
  const topW = ctx.measureText(creditTop).width;
  ctx.font = font(500, 19);
  const bottomW = ctx.measureText(creditBottom).width;
  const textBlockW = Math.max(topW, bottomW);

  // Left-side trust receipt. A warning may add context, but never replaces the
  // origin, matched-leg support boundary, or human-review state. Ellipsize only
  // the optional overflow so the right-side brand/contact block stays clear.
  const trust = exhibitTrustLines(flow);
  const trustMaxWidth = Math.max(300, W - 70 - textBlockW - 140);
  const ellipsize = (text: string): string => {
    if (ctx.measureText(text).width <= trustMaxWidth) return text;
    let low = 0;
    let high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= trustMaxWidth) low = mid;
      else high = mid - 1;
    }
    return `${text.slice(0, low).trimEnd()}…`;
  };
  ctx.textAlign = "left";
  ctx.fillStyle = sourceProvenance(flow.metadata.source).tone === "grounded" ? "#6b6b66" : "#b45309";
  ctx.font = font(600, 19);
  ctx.fillText(ellipsize(trust.originAndSupport), 70, topY);
  ctx.fillStyle = "#6b6b66";
  ctx.font = font(500, 18);
  ctx.fillText(ellipsize(trust.reviewAndCaveat), 70, bottomY);

  // Preserve the actual attached assumptions and warnings inside the exported
  // image. This compact note band is separate from the receipt summary so a
  // material caveat cannot silently disappear when the flow leaves the app.
  if (trust.caveats.length) {
    const caveatText = `Attached caveats · ${trust.caveats.join(" · ")}`;
    const noteTop = DIAGRAM.y + DIAGRAM.h + 28;
    const noteWidth = W - 140;
    const noteFont = caveatText.length > 1400 ? 12 : caveatText.length > 900 ? 13 : 15;
    const lineHeight = noteFont + 5;
    ctx.font = font(500, noteFont);
    ctx.fillStyle = "#6b6b66";
    const words = caveatText.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= noteWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    const maxLines = 8;
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      visible[maxLines - 1] = `${visible[maxLines - 1]} … Full caveat text remains in the source flow.`;
    }
    visible.forEach((value, index) => ctx.fillText(value, 70, noteTop + index * lineHeight));
  }

  // North-Star mark sits to the left of the credit block, vertically centred on it.
  const markSize = 40;
  const markGap = 18;
  const textLeft = rightEdge - textBlockW;
  const markCx = textLeft - markGap - markSize / 2;
  const markCy = (topY + bottomY) / 2 - 6;
  drawNorthStarMark(ctx, markCx, markCy, markSize);

  // Brand line: charcoal ink wordmark + canonical URL, fronted by the mark.
  ctx.font = font(600, 21);
  ctx.fillStyle = "#1c1c1c";
  ctx.fillText(creditTop, textLeft, topY);
  // Warm, muted invitation underneath.
  ctx.fillStyle = "#6b6b66";
  ctx.font = font(500, 19);
  ctx.fillText(creditBottom, rightEdge - bottomW, bottomY);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  const slug = flow.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  a.download = `${slug || flow.id}-exhibit.png`;
  a.click();
  return true;
}
