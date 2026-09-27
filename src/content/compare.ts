import { FLOW_CATALOG } from "@/lib/flows/catalog";
import type { FlowOfFunds } from "@/lib/schema/flow";

/**
 * Rail compare (decision mode): a CURATED, vendor-neutral side-by-side of payment
 * rails that genuinely COMPETE. The hard product rule is "never an incomparable
 * pair": only same-market, same-job alternatives, and for v1 the set is
 * hand-picked and hard-coded so a meaningless pair (ACH vs Pix, UPI vs Pix) is
 * impossible by construction.
 *
 * Every pair points at two AUDITED seeds in FLOW_CATALOG. `theDecision` is ONE
 * line that restates when you'd pick each side, DERIVED from the two seeds' own
 * narratives / annotations (which are already source-verified). It invents no new
 * payment facts: it only re-says what the seeds already say.
 *
 * scripts/check-compare.ts (part of `pnpm test`) enforces, for every pair, that
 * both seed ids resolve AND the two sides share a jurisdiction OR an archetype,
 * so an incomparable pair can never ship.
 */

export type ComparePair = {
  /** URL slug for /compare/[id]. */
  id: string;
  title: string;
  /** Human jurisdiction label shown on the card (e.g. "United States", "Canada"). */
  jurisdiction: string;
  /** The "same job" the two rails compete to do, in plain English. */
  job: string;
  aSeedId: string;
  bSeedId: string;
  /** One line, restated from the two seeds, on when to pick each. NO new facts. */
  theDecision: string;
};

export const COMPARE_PAIRS: ComparePair[] = [
  {
    id: "fednow-vs-rtp",
    title: "FedNow vs RTP",
    jurisdiction: "United States",
    job: "Send an instant, irrevocable credit-push payment between US banks",
    aSeedId: "fednow-b2b",
    bSeedId: "rtp-b2b",
    theDecision:
      "Both settle in seconds; the split is the settlement model. FedNow settles directly across each bank's Federal Reserve master account, while RTP settles by moving positions inside a prefunded joint account at the FRBNY (so RTP participants carry the liquidity burden of keeping that position funded).",
  },
  {
    id: "ach-vs-rtp",
    title: "ACH vs RTP",
    jurisdiction: "United States",
    job: "Move USD between US bank accounts (e.g. a business or payroll payment)",
    aSeedId: "ach-payroll",
    bSeedId: "rtp-b2b",
    theDecision:
      "Pick ACH when batch and low cost win (entries clear end-of-day and settle across Fed accounts on the settlement date); pick RTP when the payment must be instant and final, credit-push only, settled in seconds via the prefunded joint account.",
  },
  {
    id: "interac-etransfer-vs-rtr",
    title: "Interac e-Transfer vs the Real-Time Rail",
    jurisdiction: "Canada",
    job: "Move CAD account-to-account between two Canadian banks in (near) real time",
    aSeedId: "interac-etransfer",
    bSeedId: "rtr-instant-ca",
    theDecision:
      "Interac e-Transfer is the live incumbent (alias-based, credited in seconds, with deferred net interbank settlement). The Real-Time Rail is the planned successor that settles in central bank money at the Bank of Canada in real time, but it has NOT launched (Payments Canada targets a late-Q4-2026 go-live and the date has slipped), so today the e-Transfer is the one you can actually send.",
  },
  {
    id: "lynx-vs-acss",
    title: "Lynx vs ACSS / EFT",
    jurisdiction: "Canada",
    job: "Clear and settle a CAD interbank payment through Payments Canada",
    aSeedId: "lynx-wire-ca",
    bSeedId: "acss-eft-aft-ca",
    theDecision:
      "Pick Lynx for high-value, time-critical wires that must be final immediately (real-time gross settlement, each payment irrevocable in central bank money, no inter-participant credit risk); pick ACSS / EFT for everyday retail batch items (direct deposits, PADs) that exchange in batches and settle on a deferred multilateral NET basis the next business day.",
  },
  {
    id: "prepaid-ca-vs-neobank-us",
    title: "CA prepaid program vs US neobank program",
    jurisdiction: "Canada vs United States (two BaaS structures)",
    job: "Run a sponsor-bank card program where a fintech owns the UX and the bank is issuer of record",
    aSeedId: "prepaid-sponsor-ca",
    bSeedId: "neobank-sponsor-us",
    theDecision:
      "Same BaaS shape on both sides (a fintech program manager owns the UX and ledger, a sponsor bank is issuer of record and holds cardholder funds in an FBO account, settlement runs bank-to-bank). The differences are jurisdiction and structure: a Canadian Schedule I prepaid program (OSFI / FCAC) versus a US neobank debit program (OCC / CFPB) that also carries a program-manager-funded reserve to collateralize program losses.",
  },
];

const byId = new Map<string, ComparePair>(COMPARE_PAIRS.map((p) => [p.id, p]));

/** Every curated comparison, in authored order. */
export const allComparisons = (): ComparePair[] => [...COMPARE_PAIRS];

/** A resolved comparison: the pair plus both audited seed flows. */
export type Comparison = {
  pair: ComparePair;
  a: FlowOfFunds;
  b: FlowOfFunds;
};

/**
 * Resolve a comparison by id, with both seeds looked up in FLOW_CATALOG. Returns
 * undefined if the id is unknown or either seed is missing (so a route can 404
 * cleanly instead of rendering a half-empty page).
 */
export function getComparison(id: string): Comparison | undefined {
  const pair = byId.get(id);
  if (!pair) return undefined;
  const a = FLOW_CATALOG[pair.aSeedId];
  const b = FLOW_CATALOG[pair.bSeedId];
  if (!a || !b) return undefined;
  return { pair, a, b };
}
