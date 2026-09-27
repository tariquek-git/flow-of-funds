/**
 * Prompt -> audited seed matcher. A common, generic prompt (e.g. "etransfer")
 * maps to a hand-built, footnoted seed in FLOW_CATALOG so it can render
 * INSTANTLY — no AI call, no spend, and higher accuracy than a fresh generation
 * (the seeds are audited; a live generate is the thing that occasionally drops a
 * leg). Deliberately CONSERVATIVE: only short, unambiguous prompts match;
 * anything longer or region-ambiguous falls through to the AI generate path.
 * A wrong match is the only real failure mode, so the aliases stay tight and the
 * studio always offers a "rebuild it fresh" escape hatch.
 */

/** Sentinel followup id: the "rebuild it fresh" chip. Routed by ChatDock to a
    forced AI generation of the original prompt instead of the normal send(prompt)
    (which, over a loaded seed, would infer an EDIT). Offered inside the verified
    view so the user can jump from the audited template back to a live draw. */
export const REBUILD_FOLLOWUP_ID = "__rebuild_fresh__";

/** Sentinel followup id: the "show the audited version" chip. Offered after a
    LIVE generation whose prompt maps to an audited seed — one tap loads that seed
    verbatim (instant, no AI) to compare against. Routed by ChatDock to
    showVerified() instead of the normal send(prompt). This is the seed library's
    new home: live draw is the default, the verified flow is one tap away. */
export const VERIFIED_FOLLOWUP_ID = "__show_verified__";

// Curated aliases per seed key (the keys are FLOW_CATALOG ids). Lowercase,
// space-separated; matching is whole-phrase / word-boundaried, so short tokens
// like "pix" / "upi" / "pad" never fire inside another word ("pixel", "ipad").
const SEED_ALIASES: { seedId: string; phrases: string[] }[] = [
  { seedId: "interac-etransfer", phrases: ["etransfer", "e transfer", "interac etransfer", "interac e transfer", "interac transfer", "emt", "send an etransfer", "send money etransfer", "rent split five ways", "split rent"] },
  { seedId: "interac-debit", phrases: ["interac debit", "interac card", "interac at the till", "interac in store", "tap interac", "interac point of sale", "a debit card tapped", "debit card tapped", "canadian debit card"] },
  { seedId: "ach-payroll", phrases: ["payroll", "us payroll", "ach payroll", "payroll ach", "ach credit payroll", "ach direct deposit", "us direct deposit", "payroll direct deposit", "paycheck", "paycheck landing friday"] },
  { seedId: "fednow-b2b", phrases: ["fednow", "fed now"] },
  { seedId: "rtp-b2b", phrases: ["rtp", "tch rtp", "clearing house rtp", "supplier invoice paid", "supplier invoice"] },
  { seedId: "rtr-instant-ca", phrases: ["rtr", "real time rail", "canada rtr", "payments canada rtr", "canada real time rail", "payment that clears in seconds", "clears in seconds"] },
  // US consumer instant P2P (split-the-bill). matchSeed is region-blind and only
  // picks the seed for the "show the audited version" compare chip; a typed
  // prompt still live-draws region-aware. The audience skews US, so the generic
  // split-the-bill phrases resolve here rather than to the Canadian RTR seed.
  { seedId: "fednow-p2p", phrases: ["splitting dinner in seconds", "split dinner", "split the bill", "splitting the bill", "split the check", "instant p2p", "pay a friend instantly", "send money in seconds"] },
  { seedId: "lynx-wire-ca", phrases: ["lynx", "lvts", "lynx rtgs", "canadian high value wire", "high value payment canada", "rtgs canada"] },
  { seedId: "acss-eft-aft-ca", phrases: ["acss", "aft", "canadian eft", "eft canada", "canada direct deposit", "direct deposit canada", "automated clearing settlement system", "paycheque", "pay cheque", "your paycheque", "your pay cheque", "canadian paycheque", "paycheque canada", "cra tax refund", "tax refund canada", "government benefit deposit canada", "canadian salary deposit", "canadian bill payment", "pay a bill canada"] },
  { seedId: "visa-four-party", phrases: ["four party", "visa four party", "visa credit", "tap a visa", "visa at tim hortons", "coffee tapped", "a coffee tapped", "card tapped", "groceries on a credit card", "subscription renewing tonight"] },
  { seedId: "wire-fx", phrases: ["wire fx", "wire with fx", "cross border wire", "international wire", "canada to us wire", "wire transfer fx", "wire to family overseas", "paying a supplier abroad", "supplier abroad"] },
  { seedId: "cross-border-card", phrases: ["cross border card", "foreign card", "card abroad", "card overseas", "visa abroad", "foreign card payment", "buying online three time zones away", "buying online abroad"] },
  { seedId: "card-dispute-rege", phrases: ["chargeback", "card dispute", "reg e", "rege", "reg e dispute", "debit dispute", "disputed charge", "charged back"] },
  { seedId: "ach-debit-web", phrases: ["ach debit", "recurring ach", "web debit", "subscription ach", "ach pull", "ach return"] },
  { seedId: "pad-debit-ca", phrases: ["pad", "pre authorized debit", "preauthorized debit", "canada pad", "canadian pad", "canadian autopay", "canadian gym membership", "canada gym membership", "pre authorized payment canada", "canadian subscription pad"] },
  { seedId: "payfac-us", phrases: ["payfac", "payment facilitator", "sub merchant", "submerchant"] },
  { seedId: "sepa-instant-eu", phrases: ["sepa", "sepa instant", "sct inst", "sepa credit transfer", "euro instant"] },
  { seedId: "uk-faster-payments", phrases: ["faster payments", "uk faster payments", "fps", "pay uk", "uk instant payment"] },
  { seedId: "india-upi", phrases: ["upi", "india upi", "npci upi", "paying with a phone number", "phone number payment", "qr code"] },
  { seedId: "brazil-pix", phrases: ["pix", "brazil pix", "brazilian pix"] },
  { seedId: "prepaid-sponsor-ca", phrases: ["prepaid canada", "canadian prepaid", "prepaid sponsor", "prepaid program canada"] },
  { seedId: "neobank-sponsor-us", phrases: ["neobank", "us neobank", "sponsor bank debit", "baas debit"] },
  { seedId: "usdc-onchain-payment", phrases: ["usdc payment", "send usdc", "usdc wallet to wallet", "stablecoin transfer", "on chain usdc transfer", "usdc on chain", "erc 20 usdc transfer", "peer to peer stablecoin"] },
  { seedId: "usdc-cross-border-payout", phrases: ["usdc cross border", "usdc payout", "stablecoin payout", "usdc supplier payment", "stablecoin cross border", "usdc to eur", "pay supplier usdc"] },
  { seedId: "crypto-exchange-onramp", phrases: ["buy crypto on exchange", "crypto exchange on ramp", "coinbase buy bitcoin", "custodial exchange buy", "withdraw crypto to wallet", "not your keys not your coins", "buy btc with ach", "fund exchange account", "self custody withdrawal"] },
  { seedId: "stablecoin-merchant-accept", phrases: ["accept stablecoin settle cash", "merchant accept usdc", "store accepting usdc", "shop accepting usdc", "accept usdc payments", "crypto payment processor", "bitpay merchant settlement", "coinbase commerce flow", "stablecoin merchant payment", "pay merchant in usdc", "usdc settled in fiat", "crypto checkout off ramp"] },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return the seed id for a confident, generic match, or null to fall through to
 * the AI. Only short prompts (<= 6 words) are eligible — a longer, more specific
 * ask ("etransfer for a gig worker paid weekly") wants a custom draw. On a tie,
 * the longest (most specific) matched phrase wins.
 */
export function matchSeed(prompt: string): string | null {
  const norm = normalize(prompt);
  if (!norm || norm.split(" ").length > 6) return null;
  const padded = ` ${norm} `;
  let best: { seedId: string; len: number } | null = null;
  for (const { seedId, phrases } of SEED_ALIASES) {
    for (const p of phrases) {
      if (padded.includes(` ${p} `) && (!best || p.length > best.len)) {
        best = { seedId, len: p.length };
      }
    }
  }
  return best?.seedId ?? null;
}
