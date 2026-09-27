import type { EdgeType } from "@/lib/schema/flow";

/**
 * Structured rail vocabulary for direct-manipulation editing.
 *
 * The prose corpus in knowledge.ts grounds the agent; this module grounds the
 * UI: known rails for the combobox, the settlement-timing taxonomy for the
 * dropdown, and the rail/leg-type logic that decides which timings are
 * *typical* for the leg being edited. Free text stays legal everywhere (the
 * schema keeps `rail` and `timing` as open strings), so these lists guide
 * without constraining.
 *
 * Rail and timing strings below are reconciled with the shipped seed flows in
 * src/lib/flows/catalog.ts: the combobox and dropdown should recognize the
 * exact values the product's own audited flows carry.
 */

export const KNOWN_RAILS: readonly string[] = [
  "Interac e-Transfer",
  "Interac Debit",
  "EFT (CPA 005)",
  "ACSS / AFT",
  "PAD (Rule H1)",
  "Lynx",
  // Canada's Real-Time Rail: rulebook approved, phased launch planned for late
  // 2026 per Payments Canada; not yet live as of mid-2026.
  "RTR",
  "ACH",
  "Same-day ACH",
  "Fedwire",
  "FedNow",
  "RTP",
  "Visa",
  "Mastercard",
  "SWIFT wire",
  "SCT Inst",
  "Faster Payments",
  "UPI",
  "Pix",
  // SPI: Brazil's instant-payment settlement system at the central bank; the
  // seed Pix flow rails its switch and settlement legs on it.
  "SPI",
  "USDC (ERC-20)",
  "Public blockchain",
  "Book transfer / ledger",
  "Cheque",
];

export const MESSAGE_STANDARDS: readonly string[] = [
  "ISO 20022",
  "ISO 8583",
  "Nacha (CCD/PPD/WEB)",
  "SWIFT MT103",
  "EDI 820",
  "Proprietary API",
];

/** The full settlement-timing taxonomy, fastest to slowest. */
export const TIMING_OPTIONS: readonly string[] = [
  "Real-time (irrevocable)",
  "Real-time",
  "Real-time gross",
  "Near-real-time",
  "Seconds",
  "Real-time message",
  "Real-time (book transfer)",
  "Final after N confirmations",
  "Intraday",
  "Same day (RTGS)",
  "Same day (ACH)",
  "same-day net cycle, deferred net posting",
  "T+0 end-of-day batch",
  "Batch (end of day)",
  "T+1",
  "T+1 net settlement",
  "Deferred bilateral net",
  "T+2",
  "T+2 net settlement",
  "T+3",
  "Weekly",
  "Monthly (billing cycle)",
  "Dispute cycle (days to weeks)",
];

/** Leg types that are messages or fee mechanics get their timing from the
    leg's nature, not from the rail that carries it. */
const TYPE_TIMINGS: Partial<Record<EdgeType, string[]>> = {
  authorization: ["Real-time message"],
  notification: ["Real-time message", "Batch (end of day)"],
  reconciliation: ["Batch (end of day)", "Real-time message"],
  clearing: ["T+0 end-of-day batch", "Batch (end of day)", "Same day (ACH)", "T+1"],
  chargeback: ["Dispute cycle (days to weeks)", "T+1", "T+2"],
  refund: ["T+1", "T+2", "Dispute cycle (days to weeks)"],
  fee: ["T+1 net settlement", "Monthly (billing cycle)"],
  interchange: ["T+1 net settlement", "Monthly (billing cycle)"],
};

/** Money-moving legs (settlement, funding, transfer) settle on the rail's
    clock. Keyed by keyword match against the free-form rail string. */
const RAIL_TIMINGS: { pattern: RegExp; timings: string[] }[] = [
  { pattern: /fednow|\brtp\b|\brtr\b|instant/i, timings: ["Real-time (irrevocable)", "Real-time", "Seconds"] },
  // SEPA instant credit (SCT Inst) and the CSMs it settles in (EBA CLEARING
  // RT1, Eurosystem TIPS): funds available in seconds, irrevocable once settled.
  { pattern: /sct.?inst|sepa.?inst|\brt1\b|\btips\b/i, timings: ["Real-time (irrevocable)", "Seconds"] },
  // UPI end-user legs credit in seconds; NPCI's deferred interbank netting runs
  // on the RBI RTGS rails, matched separately below.
  { pattern: /\bupi\b/i, timings: ["Real-time (irrevocable)", "Seconds"] },
  // Pix credits the payee in seconds; SPI settles each payment gross in
  // central-bank money at the BCB.
  { pattern: /\bpix\b|\bspi\b|\bdict\b/i, timings: ["Real-time (irrevocable)", "Real-time gross", "Seconds"] },
  // UK Faster Payments: near-real-time credit to the payee; interbank positions
  // settle later via deferred net cycles at the Bank of England.
  { pattern: /faster payments/i, timings: ["Near-real-time", "Seconds"] },
  // On-chain transfers (USDC or other tokens): included in a block quickly,
  // treated as final after N confirmations.
  { pattern: /usdc|stablecoin|erc.?20|on.?chain|blockchain/i, timings: ["Final after N confirmations", "Seconds"] },
  // Interac e-Transfer: near-real-time to the recipient; interbank settlement
  // is deferred bilateral net, completing the next business day.
  { pattern: /e-?transfer/i, timings: ["Near-real-time", "T+1", "Deferred bilateral net"] },
  // Deferred multilateral net batches posted to an RTGS (e.g. NPCI's MNSB file
  // into RBI RTGS for UPI). Must precede the generic RTGS rule below.
  { pattern: /mnsb|multilateral net/i, timings: ["same-day net cycle, deferred net posting"] },
  { pattern: /fedwire|lynx|swift|wire|rtgs/i, timings: ["Same day (RTGS)", "Real-time gross", "Intraday"] },
  { pattern: /same.?day ach/i, timings: ["Same day (ACH)", "T+1"] },
  {
    pattern: /\bach\b|\beft\b|acss|\baft\b|\bpad\b|nacha|pre-?authorized/i,
    timings: ["T+1", "T+2", "Same day (ACH)", "Batch (end of day)"],
  },
  {
    pattern: /visa|mastercard|amex|interac debit|card network|scheme/i,
    timings: ["T+1 net settlement", "T+2 net settlement"],
  },
  {
    pattern: /book|ledger|internal|intra-?bank|fbo|on-?us/i,
    timings: ["Real-time (book transfer)", "Intraday", "Batch (end of day)"],
  },
  { pattern: /cheque|check/i, timings: ["T+1", "T+2", "Batch (end of day)"] },
];

/** Timings that are typical for this leg: leg-type logic first (a Visa
    authorization is a real-time message no matter the network), then the
    rail's settlement clock. Empty when nothing matches; the editor then
    shows the flat taxonomy. */
export function suggestTimings(rail: string, type: EdgeType): string[] {
  const byType = TYPE_TIMINGS[type];
  if (byType) return byType;
  for (const { pattern, timings } of RAIL_TIMINGS) {
    if (pattern.test(rail)) return timings;
  }
  return [];
}
