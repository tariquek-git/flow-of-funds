import { ImageResponse } from "next/og";
import { decodeHashToFlow } from "@/lib/share";
import { buildTrustReceipt } from "@/lib/trust/receipt";

/**
 * Per-flow social preview image. A shared /share/<hash> link now unfurls (Slack,
 * iMessage, LinkedIn, X…) with a branded card showing THIS diagram's title, rails,
 * and size — not a generic logo. The hash lives in the PATH (server-readable),
 * unlike the studio's #f=<hash> fragment which crawlers never see; we decode it
 * server-side (share.ts is Web-API only) and render with next/og. Satori needs an
 * explicit display:flex on every multi-child node.
 */

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A flow-of-funds diagram, by Fintech North";

const CREAM = "#faf7f0";
const INK = "#1c1c1c";
const CRIMSON = "#C41E3A";
const MUTED = "#6b6b66";
const LINE = "#e4dfd2";

export default async function Image({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const flow = await decodeHashToFlow(hash).catch(() => null);
  const receipt = flow ? buildTrustReceipt(flow) : null;
  const caveatCount = receipt ? receipt.assumptions.length + receipt.warnings.length : 0;

  const title = flow?.metadata.title ?? "A flow of funds";
  const rails = (flow?.metadata.primaryRails ?? []).filter(Boolean).slice(0, 5);
  const juris = (flow?.metadata.jurisdiction ?? []).join(" · ");
  const counts = flow ? `${flow.nodes.length} parties · ${flow.edges.length} legs` : "";
  const subline = [juris, counts].filter(Boolean).join("   ·   ");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: CREAM, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: 16, background: CRIMSON }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 72px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: MUTED,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            <div style={{ display: "flex", width: 18, height: 18, borderRadius: 18, background: CRIMSON }} />
            <span>FLOW OF FUNDS · FINTECH NORTH</span>
          </div>

          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              border: `1px solid ${LINE}`,
              borderRadius: 999,
              background: "#ffffff",
              color: INK,
              padding: "7px 18px",
              fontSize: 21,
              fontWeight: 700,
              marginTop: 26,
            }}
          >
            {receipt?.origin.label ?? "Origin unavailable"}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: title.length > 60 ? 52 : 66,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.08,
              marginTop: 28,
              maxWidth: 1010,
            }}
          >
            {title}
          </div>

          {subline ? (
            <div style={{ display: "flex", fontSize: 30, color: MUTED, marginTop: 26 }}>{subline}</div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: "auto" }}>
            {rails.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  border: `2px solid ${CRIMSON}`,
                  color: CRIMSON,
                  borderRadius: 999,
                  padding: "8px 24px",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {r}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 7,
              marginTop: 28,
              color: MUTED,
              fontSize: 20,
            }}
          >
            <span>
              {receipt
                ? `Document/rail support ${receipt.evidence.coveredLegs}/${receipt.evidence.relevantLegs} matched legs · not claim verification`
                : "Source support unavailable · no claim verification implied"}
            </span>
            <span>
              Human review: {receipt?.humanReview.label ?? "Not recorded"}
              {receipt?.humanReview.recorded ? ` · ${receipt.humanReview.detail}` : ""}
              {receipt ? ` · Caveats attached: ${caveatCount}` : ""}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              paddingTop: 18,
              borderTop: `1px solid ${LINE}`,
              color: MUTED,
              fontSize: 24,
            }}
          >
            flows.fintechnorth.ca
          </div>
        </div>
      </div>
    ),
    size,
  );
}
