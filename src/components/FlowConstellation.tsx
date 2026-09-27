"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The Fintech North Polaris mark, doing double duty as a live flow-of-funds
 * diagram. The constellation's own nodes are the payment entities and money
 * tokens ride the logo's own lines through the central hub. The mark leans 15
 * degrees left (the wordmark stays upright, rendered separately in the hero);
 * the geometry is the real logo's node positions, never an invented shape.
 *
 * It cycles through eleven plain-English payment scenarios from around the world
 * (card taps, split rent, payroll, instant rails, cross-border wires, refunds,
 * subscriptions, stablecoin, chargebacks): each relabels the six nodes and
 * reroutes the gold tokens along whichever of the logo's real edges that flow
 * uses. The labels are generic roles and rail types, never brand names.
 * Constellation geometry is constant. Only labels and routes change, and a route
 * can only travel an edge that exists (validated below).
 * Honours prefers-reduced-motion: no cycling, no travelling coins.
 */

type NodeId = "issuer" | "cardholder" | "merchant" | "network" | "acquirer" | "processor";

// Real logo node positions (untilted local space); the whole group is tilted by
// the rotate() wrapper so labels lean with the mark.
const POS: Record<NodeId, { x: number; y: number; r: number }> = {
  issuer: { x: 230, y: 55, r: 7 },
  cardholder: { x: 131, y: 148, r: 5 },
  merchant: { x: 329, y: 135, r: 5 },
  network: { x: 230, y: 196, r: 4.5 },
  acquirer: { x: 163, y: 276, r: 3.8 },
  processor: { x: 307, y: 276, r: 3.8 },
};

const LABEL_POS: Record<NodeId, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
  issuer: { x: 230, y: 42, anchor: "middle" },
  cardholder: { x: 122, y: 151, anchor: "end" },
  merchant: { x: 338, y: 138, anchor: "start" },
  network: { x: 230, y: 228, anchor: "middle" },
  acquirer: { x: 163, y: 297, anchor: "middle" },
  processor: { x: 307, y: 297, anchor: "middle" },
};

// The logo's own ten edges (undirected). issuer-network is the red Polaris spine.
const EDGES: Array<[NodeId, NodeId]> = [
  ["issuer", "network"],
  ["issuer", "cardholder"],
  ["issuer", "merchant"],
  ["cardholder", "network"],
  ["merchant", "network"],
  ["cardholder", "acquirer"],
  ["merchant", "processor"],
  ["network", "acquirer"],
  ["network", "processor"],
  ["acquirer", "processor"],
];

const ek = (a: NodeId, b: NodeId) => [a, b].sort().join("|");
const EDGE_SET = new Set(EDGES.map(([a, b]) => ek(a, b)));
const SPINE = ek("issuer", "network");

type Flow = {
  prompt: string;
  labels: Record<NodeId, string>;
  routes: NodeId[][]; // each a connected chain; the token rides it
};

// Reusable token routes over the logo's real edges. RAIL is the account-to-
// account path "left -> bank -> hub -> bank -> right" (e-Transfer, payroll, RTP,
// wires); CARD is a card purchase; SETTLE is the settlement leg; REFUND and
// CHARGEBACK run the rail in reverse for the exception scenarios.
const RAIL: NodeId[] = ["cardholder", "acquirer", "network", "processor", "merchant"];
const SETTLE: NodeId[] = ["acquirer", "network", "issuer"];
const CARD: NodeId[] = ["cardholder", "network", "merchant"];
const REFUND: NodeId[] = ["merchant", "network", "cardholder"];
const CHARGEBACK: NodeId[] = ["merchant", "processor", "network", "acquirer", "cardholder"];

const FLOWS: Flow[] = [
  {
    prompt: "a coffee, tapped",
    labels: {
      issuer: "Issuer",
      cardholder: "Cardholder",
      merchant: "Coffee shop",
      network: "Card network",
      acquirer: "Acquirer",
      processor: "Processor",
    },
    routes: [CARD, SETTLE],
  },
  {
    prompt: "groceries on a credit card",
    labels: {
      issuer: "Issuer",
      cardholder: "Cardholder",
      merchant: "Grocery store",
      network: "Card network",
      acquirer: "Acquirer",
      processor: "Processor",
    },
    routes: [CARD, SETTLE],
  },
  {
    prompt: "rent, split five ways",
    labels: {
      issuer: "Clearing house",
      cardholder: "Sender",
      merchant: "Recipient",
      network: "Instant rail",
      acquirer: "Sender's bank",
      processor: "Recipient's bank",
    },
    routes: [RAIL],
  },
  {
    prompt: "your paycheck landing Friday",
    labels: {
      issuer: "Batch operator",
      cardholder: "Employer",
      merchant: "Employee",
      network: "Clearing",
      acquirer: "Employer's bank",
      processor: "Employee's bank",
    },
    routes: [RAIL, SETTLE],
  },
  {
    prompt: "splitting dinner in seconds",
    labels: {
      issuer: "Clearing house",
      cardholder: "You",
      merchant: "Your friend",
      network: "Instant rail",
      acquirer: "Your bank",
      processor: "Their bank",
    },
    routes: [RAIL],
  },
  {
    prompt: "a wire to family overseas",
    labels: {
      issuer: "Correspondent",
      cardholder: "You",
      merchant: "Family",
      network: "Cross-border · FX",
      acquirer: "Your bank",
      processor: "Their bank",
    },
    routes: [RAIL],
  },
  {
    prompt: "a refund that could still be clawed back",
    labels: {
      issuer: "Issuer",
      cardholder: "You",
      merchant: "The store",
      network: "Card network",
      acquirer: "Acquirer",
      processor: "Processor",
    },
    routes: [REFUND],
  },
  {
    prompt: "a subscription renewing tonight",
    labels: {
      issuer: "Issuer",
      cardholder: "Subscriber",
      merchant: "The service",
      network: "Card network",
      acquirer: "Acquirer",
      processor: "Processor",
    },
    routes: [CARD, SETTLE],
  },
  {
    prompt: "a payment that clears in seconds",
    labels: {
      issuer: "Central bank",
      cardholder: "Payer",
      merchant: "Payee",
      network: "Instant rail",
      acquirer: "Payer's bank",
      processor: "Payee's bank",
    },
    routes: [RAIL],
  },
  {
    prompt: "paying a supplier abroad",
    labels: {
      issuer: "Stablecoin issuer",
      cardholder: "Payer",
      merchant: "Supplier",
      network: "Stablecoin · chain",
      acquirer: "On-ramp",
      processor: "Off-ramp",
    },
    routes: [RAIL],
  },
  {
    prompt: "a disputed charge, charged back",
    labels: {
      issuer: "Issuer",
      cardholder: "Cardholder",
      merchant: "Merchant",
      network: "Card network",
      acquirer: "Acquirer",
      processor: "Processor",
    },
    routes: [CHARGEBACK],
  },
];

// Build a token path over a route, stopping at the first non-existent edge so a
// payment never travels a wire that isn't there.
function routePath(route: NodeId[]): string {
  const pts: string[] = [];
  for (let i = 0; i < route.length; i++) {
    if (i > 0 && !EDGE_SET.has(ek(route[i - 1], route[i]))) break;
    const p = POS[route[i]];
    pts.push(`${i === 0 ? "M" : "L"}${p.x},${p.y}`);
  }
  return pts.join(" ");
}

function litEdges(routes: NodeId[][]): Set<string> {
  const s = new Set<string>();
  for (const r of routes) {
    for (let i = 1; i < r.length; i++) {
      const k = ek(r[i - 1], r[i]);
      if (EDGE_SET.has(k)) s.add(k);
    }
  }
  return s;
}

const NODE_IDS = Object.keys(POS) as NodeId[];

// The frozen scenario for the explainer band: the card-tap flow (index 0).
const FREEZE_IDX = 0;

export function FlowConstellation({
  freeze = false,
  onPrompt,
}: {
  freeze?: boolean;
  /** When set, the "generated from <prompt>" caption becomes a one-tap CTA that
   *  hands the currently-shown prompt off to the studio. The landing passes this
   *  so the most-watched element on the page also starts a flow. */
  onPrompt?: (prompt: string) => void;
}) {
  const reduce = usePrefersReducedMotion();
  const [idx, setIdx] = useState(freeze ? FREEZE_IDX : 0);
  const [visible, setVisible] = useState(true);

  // A frozen instance is fully static: no cycling, no crossfade, no travelling
  // coins (see `animate` below), just the labelled nodes and one lit route.
  // Treat it like reduced motion so a frozen instance never starts an interval
  // even while the hero's live instance is cycling.
  const animate = !freeze && !reduce;

  // Cycle scenarios with a quick crossfade. setState lives in the timer
  // callbacks (not the effect body), so it doesn't trip the cascading-render
  // lint. Cleaned up on unmount. Frozen entirely under reduced motion or freeze.
  useEffect(() => {
    if (!animate) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const cycle = setInterval(() => {
      setVisible(false);
      swap = setTimeout(() => {
        setIdx((i) => (i + 1) % FLOWS.length);
        setVisible(true);
      }, 320);
    }, 3600);
    return () => {
      clearInterval(cycle);
      if (swap) clearTimeout(swap);
    };
  }, [animate]);

  const flow = FLOWS[idx];
  const lit = litEdges(flow.routes);

  return (
    <div className="fof-fc">
      {onPrompt ? (
        <button
          type="button"
          className="fof-fc-genfrom fof-fc-genfrom-btn"
          style={{ opacity: visible ? 1 : 0 }}
          onClick={() => onPrompt(flow.prompt)}
          title={`Map this flow: ${flow.prompt}`}
        >
          <span>Flow of Funds can map</span> <span className="fof-fc-ex">{flow.prompt}</span>
          <span className="fof-fc-try" aria-hidden>
            ↗
          </span>
        </button>
      ) : (
        <p className="fof-fc-genfrom" style={{ opacity: visible ? 1 : 0 }}>
          <span>Flow of Funds can map</span> <span className="fof-fc-ex">{flow.prompt}</span>
        </p>
      )}
      <div className="fof-fc-stage" style={{ opacity: visible ? 1 : 0 }}>
        <svg
          key={idx}
          viewBox="0 0 480 390"
          width="100%"
          role="img"
          aria-label={`The Fintech North logo drawn as a payment flow: ${flow.prompt}. Money tokens travel the logo's lines between the parties.`}
        >
          <title>Payments moving along the Fintech North logo lines</title>
          <g transform="translate(10,24) rotate(-15 230 166)">
            {EDGES.map(([a, b]) => {
              const k = ek(a, b);
              const isSpine = k === SPINE;
              const on = lit.has(k);
              const pa = POS[a];
              const pb = POS[b];
              return (
                <line
                  key={k}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={isSpine ? "#C41E3A" : "#1c1c1c"}
                  strokeWidth={isSpine ? 2 : on ? 1.2 : 0.9}
                  opacity={isSpine ? 0.85 : on ? 0.42 : 0.13}
                />
              );
            })}
            <circle cx={POS.issuer.x} cy={POS.issuer.y} r="14" fill="#C41E3A" opacity="0.16">
              {animate && (
                <animate
                  attributeName="opacity"
                  values="0.08;0.24;0.08"
                  dur="3.4s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            {NODE_IDS.map((id) => {
              const p = POS[id];
              const op =
                id === "issuer"
                  ? 1
                  : id === "cardholder" || id === "merchant"
                    ? 0.9
                    : id === "network"
                      ? 0.85
                      : id === "acquirer"
                        ? 0.7
                        : 0.6;
              return (
                <circle
                  key={id}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={id === "issuer" ? "#C41E3A" : "#1c1c1c"}
                  opacity={op}
                />
              );
            })}
            {NODE_IDS.map((id) => {
              const l = LABEL_POS[id];
              return (
                <text
                  key={id}
                  x={l.x}
                  y={l.y}
                  textAnchor={l.anchor}
                  fontSize={id === "network" ? 11.5 : 12}
                  fontWeight={id === "issuer" ? 500 : 400}
                  fill={id === "issuer" ? "#C41E3A" : "#6b6b66"}
                >
                  {flow.labels[id]}
                </text>
              );
            })}
            {animate &&
              flow.routes.map((r, ri) => (
                <g key={ri}>
                  <animateMotion
                    dur="3.6s"
                    begin={ri ? `-${ri * 1.8}s` : "0s"}
                    repeatCount="indefinite"
                    path={routePath(r)}
                  />
                  <circle r={ri === 0 ? 9 : 7} fill="#C9962F" />
                  <text
                    x="0"
                    y={ri === 0 ? 4 : 3.5}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#5A3F0A"
                  >
                    $
                  </text>
                </g>
              ))}
          </g>
          {/* The Guide's advice, tucked in the corner, upright. */}
          <text x="16" y="380" fontSize="11" fontStyle="italic" fill="#1c1c1c" opacity="0.16">
            Don&apos;t Panic
          </text>
        </svg>
      </div>
    </div>
  );
}
