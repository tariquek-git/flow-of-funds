/**
 * The small, deliberately varied set shown on the public homepage.
 *
 * Every item opens a fixed catalog flow directly. That keeps the first click
 * fast and deterministic while the free-form question box remains available
 * for scenarios that need a custom AI draft.
 */
export const SHOWCASE_SCENARIOS = [
  {
    category: "Everyday cards",
    question: "When does a Canadian debit-card merchant get paid?",
    outcome: "Separate the tap, bank settlement, and merchant payout.",
    seedId: "interac-debit",
  },
  {
    category: "Instant checkout",
    question: "How does a Pix merchant QR payment settle?",
    outcome: "Follow a real-time checkout from QR scan to final credit.",
    seedId: "brazil-pix-merchant-checkout",
  },
  {
    category: "Cross-border",
    question: "Where does FX happen in a Canada-to-US supplier wire?",
    outcome: "See the correspondent, currency conversion, and final payout.",
    seedId: "wire-fx",
  },
  {
    category: "Payment programs",
    question: "Who holds the money in a sponsor-bank neobank program?",
    outcome: "Trace the FBO account, program ledger, card, and settlement.",
    seedId: "neobank-sponsor-us",
  },
  {
    category: "Exceptions",
    question: "Who funds a provisional credit during a card dispute?",
    outcome: "Map the dispute, chargeback, re-presentment, and loss path.",
    seedId: "card-dispute-rege",
  },
  {
    category: "Stablecoin to cash",
    question: "How can a merchant accept USDC and receive USD?",
    outcome: "Connect wallet settlement, conversion, and an ACH payout.",
    seedId: "stablecoin-merchant-accept",
  },
] as const;
