/**
 * Flow Annotations — the "Margin" reading surface (`/learn/flows/<slug>`).
 *
 * Safe to hand-edit; `scripts/check-content.ts` keeps every `lines` key, `keyLeg`,
 * and note `pinTo` resolving to a real edge/node on the referenced seed, and
 * forces every `receipt` note to carry a live source. The spine renders FROM the
 * seed in `FLOW_CATALOG` — these are the authored words, not the geometry.
 *
 * AUTHORING NOTE: `war-story` notes flagged `draft: true` are placeholders for a
 * named human (the owner) to replace in their own voice. They render with a DRAFT
 * badge and must never be promoted as lived fact until rewritten. Set `byline`
 * before this page is promoted — the named voice is the whole point.
 */
import type { FlowAnnotation } from "./types";

const PAYMENTS_CANADA = {
  label: "Clearing & settlement systems",
  url: "https://www.payments.ca/systems-services/payment-systems",
  publisher: "Payments Canada",
  kind: "authority",
} as const;

const BANK_OF_CANADA = {
  label: "Core funding & settlement",
  url: "https://www.bankofcanada.ca/core-functions/financial-system/",
  publisher: "Bank of Canada",
  kind: "authority",
} as const;

const INTERAC = {
  label: "Interac e-Transfer",
  url: "https://www.interac.ca/en/consumers/products/interac-e-transfer/",
  publisher: "Interac",
  kind: "operator",
} as const;

const FEDERAL_RESERVE = {
  label: "Payment systems & settlement",
  url: "https://www.federalreserve.gov/paymentsystems/fedach_about.htm",
  publisher: "Federal Reserve",
  kind: "authority",
} as const;

const VISA = {
  label: "Visa Core Rules & interchange schedules",
  url: "https://usa.visa.com/support/small-business/regulations-fees.html",
  publisher: "Visa",
  kind: "operator",
} as const;

const CFPB = {
  label: "Credit card disputes & billing rights",
  url: "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
  publisher: "Consumer Financial Protection Bureau",
  kind: "authority",
} as const;

const NACHA = {
  label: "Nacha Operating Rules (overview)",
  url: "https://www.nacha.org/rules",
  publisher: "Nacha",
  kind: "authority",
} as const;

const SWIFT = {
  label: "SWIFT messaging (MT103 / ISO 20022)",
  url: "https://www.swift.com/about-us/who-we-are",
  publisher: "Swift",
  kind: "operator",
} as const;

const BIS = {
  label: "Correspondent banking",
  url: "https://www.bis.org/cpmi/about/overview.htm",
  publisher: "Bank for International Settlements",
  kind: "authority",
} as const;

const CIRCLE = {
  label: "USDC reserve & mint/redeem",
  url: "https://www.circle.com/transparency",
  publisher: "Circle",
  kind: "operator",
} as const;

const FATF = {
  label: "Virtual assets & the Travel Rule",
  url: "https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Guidance-rba-virtual-assets-2021.html",
  publisher: "Financial Action Task Force",
  kind: "authority",
} as const;

export const FLOW_ANNOTATIONS: FlowAnnotation[] = [
  {
    slug: "interac-e-transfer",
    seedId: "interac-etransfer",
    title: "An Interac e-Transfer, leg by leg",
    answer:
      "Almost everything that feels instant is a message; the money itself moves between the banks separately, and usually later.",
    audience: "Anyone who's sent one, and anyone who has to reason about when it's final.",
    summary:
      "Read the spine straight down for the plain-English story of how $200 gets from you to a friend. Pull a margin open on any leg you want to go deeper: the timing, the rulebook, or where this actually trips people up. Same flow, whatever depth you're after.",
    // Community byline for now; swap to your own name once the war stories are
    // genuinely yours (the named voice is the moat).
    byline: "Notes by Fintech North",
    keyLeg: "e6",
    lines: {
      e1: "You tell your bank to send $200. It immediately sets that money aside (debited or held) so nothing about the rest of this can outrun the funds.",
      e2: "Your bank registers the transfer with Interac. This is a message, not money: Interac is being told what to do, not handed any cash.",
      e3: "Interac pings your recipient: 'there's money waiting for you.' Still just a notification.",
      e4: "They accept it, or with Autodeposit it lands automatically. Another message; no funds have moved between the banks yet.",
      e5: "Interac instructs the recipient's bank to pay out. An instruction, not the money.",
      e6: "The recipient's bank credits their account. They can see it and spend it now; this is the moment that feels like 'it arrived.'",
      e7: "Separately, and usually later, your bank settles what it owes the other bank. This is when money actually moves between institutions.",
      e8: "Settlement funds the recipient's bank for the money it already fronted to your recipient.",
      e9: "Your bank pays Interac a small switch fee for running the rails. You usually never see it.",
      e10: "Interac reports back to you: transfer complete.",
      e11: "If the transfer is never accepted, the money your bank held at step 1 is released back to you. The unhappy path.",
    },
    notes: [
      {
        id: "etransfer-availability",
        pinTo: { edgeId: "e6" },
        kind: "burn",
        label: "Availability is not settlement",
        body: "The instant your recipient sees the money is their bank fronting it on the strength of an instruction, not proof the two banks have squared up. The real interbank settlement is the next leg, on a deferred net cycle that can land later. For a $200 transfer between friends, that gap is invisible and harmless. At volume, treating 'the recipient can see it' as 'this money is irreversibly theirs' is exactly where people get burned: what's shown can still unwind before settlement is final.",
        source: PAYMENTS_CANADA,
      },
      {
        id: "etransfer-fieldnote",
        pinTo: { edgeId: "e6" },
        kind: "war-story",
        label: "Field note",
        body: "[DRAFT: replace with your own words.] A short, dated, de-identified story about a time the availability-vs-settlement gap (this leg vs the next) actually bit someone you worked with. This slot is intentionally human: it carries the lived experience the rulebooks can't, and it's signed.",
        draft: true,
      },
      {
        id: "etransfer-settlement-venue",
        pinTo: { edgeId: "e7" },
        kind: "depth",
        label: "How the banks actually settle",
        body: "The customer experience runs on a good-funds model, but the obligations between the participating banks net and settle on a deferred basis, with final interbank settlement across accounts at the central bank. That separation is the whole point: your account was debited or held back at step 1, while the bank-to-bank money moves on its own cycle here.",
        source: BANK_OF_CANADA,
      },
      {
        id: "etransfer-instant-myth",
        pinTo: { edgeId: "e3" },
        kind: "myth",
        label: "What's actually 'instant'",
        body: "Myth: hitting Send moves the money instantly. Reality: what's instant is the message and the notification (legs 2 to 5). The recipient sees funds when their bank chooses to credit them (leg 6); the banks themselves settle separately (leg 7). Instant experience, deferred settlement; they're not the same event.",
        source: INTERAC,
      },
      {
        id: "etransfer-hold",
        pinTo: { edgeId: "e1" },
        kind: "depth",
        label: "Debited up front, not at the end",
        body: "Notice the money leaves your side at the very first step: the bank debits or holds it the moment you initiate, long before any bank-to-bank settlement. That held amount is the bank's protection: it has already taken your funds, so it can safely instruct payout downstream.",
        source: INTERAC,
      },
      {
        id: "etransfer-autodeposit",
        pinTo: { edgeId: "e4" },
        kind: "depth",
        label: "Why Autodeposit is the default now",
        body: "With Autodeposit, the recipient's acceptance happens automatically: no security question, no link to click. It's faster and removes the interception risk of a guessable question-and-answer, which is why banks now push it as the default path.",
        source: INTERAC,
      },
      {
        id: "etransfer-receipt-goodfunds",
        pinTo: { edgeId: "e5" },
        kind: "receipt",
        label: "Why we're sure",
        body: "The good-funds model (the recipient's credit happening on an instruction, separate from interbank settlement) is documented by the network operator and the national payments authority. The separation of customer experience from settlement is not an implementation detail; it's how the system is designed.",
        source: PAYMENTS_CANADA,
      },
      {
        id: "etransfer-unclaimed",
        pinTo: { edgeId: "e11" },
        kind: "myth",
        label: "Unclaimed money doesn't vanish",
        body: "Myth: an unclaimed e-Transfer disappears, or sits with Interac. Reality: because your bank held the funds up front (leg 1), an unclaimed transfer is simply reversed back to you after a set window. The money was never 'in transit' the way people picture; it was parked on your side the whole time.",
        source: INTERAC,
      },
      {
        id: "etransfer-fee",
        pinTo: { edgeId: "e9" },
        kind: "depth",
        label: "Who actually pays",
        body: "The per-transfer cost is a switch fee the sender's bank pays Interac for running the network. Consumers usually pay nothing per transfer (it's bundled into account fees); businesses on bulk products may pay per item. The fee never touches the recipient.",
        source: INTERAC,
      },
    ],
    relatedTerms: ["settlement", "authorization"],
    sources: [PAYMENTS_CANADA, INTERAC, BANK_OF_CANADA],
    updated: "2026-06-27",
  },
  {
    slug: "card-tap-to-settlement",
    seedId: "visa-four-party",
    title: "A card tap, from 'Approved' to actually paid",
    answer:
      "The 'Approved' at the counter is a message reserving credit; the money moves a day later, and the merchant is funded (net of fees) a day or two after that.",
    audience: "Anyone who taps a card, and anyone on the merchant side waiting to actually get paid.",
    summary:
      "Read the spine straight down for what really happens between your tap and the merchant's bank balance. Pull a margin open on any leg for the timing, who keeps the fee, or where the gap between 'approved' and 'paid' bites. Same flow, whatever depth you're after.",
    byline: "Notes by Fintech North",
    keyLeg: "e6",
    lines: {
      e1: "You tap your card at the merchant. Despite how final it feels, this is the start of a conversation, not a payment: no money has moved.",
      e2: "The merchant's side asks its bank (the acquirer) whether this card is good for the amount.",
      e3: "The acquirer routes that question through Visa's network.",
      e4: "Your card's issuer answers yes or no, and on yes places a hold on your credit line. The 'Approved' you see is a promise, not a transfer.",
      e5: "At end of day the transactions are batched and cleared: the network reconciles who owes whom. Still records, not money.",
      e6: "The next day, your issuer actually pays the network the net it owes. This is the first time real money moves.",
      e7: "The network pays the acquirer its net share.",
      e8: "Out of that, the issuer keeps an interchange fee, netted inside the settlement totals rather than sent as a separate payment.",
      e9: "A day or two after your tap, the merchant is finally funded, net of the fees taken along the way.",
    },
    notes: [
      {
        id: "card-approved-not-paid",
        pinTo: { edgeId: "e4" },
        kind: "myth",
        label: "'Approved' is not 'paid'",
        body: "Myth: a card approval means the merchant has been paid. Reality: approval is a message that reserves credit on the cardholder's line. Real money first moves at settlement the next day (leg 6), and the merchant isn't funded until a day or two after that (leg 9). The whole authorization round-trip moves zero dollars.",
        source: VISA,
      },
      {
        id: "card-money-moves",
        pinTo: { edgeId: "e6" },
        kind: "depth",
        label: "When money actually moves",
        body: "Settlement is net, not transaction-by-transaction: issuers and acquirers pay or receive a single net position for the day, funded across the central-bank rails. That's why a single $40 tap never moves on its own; it's bundled into a day's totals and squared up here.",
        source: FEDERAL_RESERVE,
      },
      {
        id: "card-clearing-receipt",
        pinTo: { edgeId: "e5" },
        kind: "receipt",
        label: "Why we're sure",
        body: "The separation of authorization, clearing, and settlement into distinct steps, with money moving only at settlement, is how open-loop card systems are documented by the network and the central bank.",
        source: FEDERAL_RESERVE,
      },
      {
        id: "card-interchange",
        pinTo: { edgeId: "e8" },
        kind: "depth",
        label: "Who keeps the fee",
        body: "Interchange flows economically from the merchant/acquirer side to the issuer. The rate shown in the diagram is illustrative only; real rates vary by card product and merchant category per the network's published schedules. The merchant discount the seller actually pays adds network assessments and acquirer margin on top, and interchange is netted within the daily settlement totals rather than paid as a separate transfer.",
        source: VISA,
      },
      {
        id: "card-funded-clawable",
        pinTo: { edgeId: "e9" },
        kind: "burn",
        label: "Funded net, and clawable for months",
        body: "The merchant is funded net of fees a day or two after the tap, and that money can still be pulled back via a chargeback for months afterward. The gap between 'approved at the counter' and 'irreversibly mine' is long, and it's exactly where merchants who treat an authorization as a completed sale get burned.",
        source: CFPB,
      },
      {
        id: "card-fieldnote",
        pinTo: { edgeId: "e9" },
        kind: "war-story",
        label: "Field note",
        body: "[DRAFT: replace with your own words.] A short, dated, de-identified story about a merchant or program that treated 'approved' as 'paid' and got caught by the funding delay or a chargeback wave. This slot is intentionally human.",
        draft: true,
      },
    ],
    relatedTerms: ["issuer", "acquirer", "interchange", "settlement", "authorization", "chargeback"],
    sources: [VISA, FEDERAL_RESERVE, CFPB],
    updated: "2026-06-27",
  },
  {
    slug: "ach-payroll",
    seedId: "ach-payroll",
    title: "Payday: how your wages actually arrive",
    answer:
      "Direct deposit is a batch of instructions; the wages post on the effective date on the strength of the rules, while the banks settle separately, and the credit can still be returned.",
    audience: "Anyone who gets paid by direct deposit, and anyone who runs a payroll.",
    summary:
      "Read the spine straight down for what happens between your employer hitting Approve and money landing in your account. Pull a margin open on any leg for the timing, why it isn't instant, or where the 'it's in my account' feeling outruns reality. Same flow, whatever depth you're after.",
    byline: "Notes by Fintech North",
    keyLeg: "e5",
    lines: {
      e1: "Your employer approves payroll. It's a file of instructions handed to a processor; no money moves yet.",
      e2: "The processor formats it as a Nacha file and submits it to the employer's bank (the ODFI).",
      e3: "The bank batches it to an ACH operator at end of day. ACH waits and moves in batches, which is why it isn't instant.",
      e4: "The operator routes each entry to the employee's bank (the RDFI). Still just instructions.",
      e5: "On the effective date, the employee's bank credits their account. Payday: the wages show up here, on the strength of the rules, before the banks have settled.",
      e6: "Separately, on the settlement date, the employer's bank pays out across the Federal Reserve.",
      e7: "The Fed credits the employee's bank for the money it already made available.",
    },
    notes: [
      {
        id: "ach-provisional",
        pinTo: { edgeId: "e5" },
        kind: "burn",
        label: "Payday money can still be pulled back",
        body: "Wages posted on the effective date arrive on the strength of the rules, not because the banks have settled. An ACH credit can be reversed or returned within a defined window (a duplicate run, a wrong amount, an error), so until that window closes the money is provisional. For ordinary payroll this is invisible; for a large or unexpected credit, treating it as final the same hour is exactly where people get burned.",
        source: NACHA,
      },
      {
        id: "ach-not-instant",
        pinTo: { edgeId: "e3" },
        kind: "depth",
        label: "Why ACH isn't instant",
        body: "ACH is a batch system: entries are collected and exchanged on a schedule rather than one at a time, which is why a credit submitted today typically lands the next banking day. Same Day ACH exists for an extra fee and within cutoff windows, but the default is batch-and-wait, not real-time.",
        source: NACHA,
      },
      {
        id: "ach-midnight-myth",
        pinTo: { edgeId: "e5" },
        kind: "myth",
        label: "Direct deposit doesn't 'hit at midnight'",
        body: "Myth: pay lands at a fixed time the network guarantees. Reality: the receiving bank posts on the effective date, and many banks choose to make funds available early as a perk. The exact moment is the bank's decision, not a clock the ACH network runs, so it varies bank to bank.",
        source: NACHA,
      },
      {
        id: "ach-settle",
        pinTo: { edgeId: "e6" },
        kind: "depth",
        label: "When the banks actually settle",
        body: "Settlement happens on the settlement date across accounts at the Federal Reserve, on a net basis, separate from the moment the employee saw their wages. The receiving bank effectively fronted the credit and is squared up here.",
        source: FEDERAL_RESERVE,
      },
      {
        id: "ach-receipt",
        pinTo: { edgeId: "e2" },
        kind: "receipt",
        label: "Why we're sure",
        body: "The file format, the originating bank's warranties, the return rights, and the timing windows are all set by the Nacha Operating Rules, the rulebook every US ACH participant agrees to.",
        source: NACHA,
      },
      {
        id: "ach-fieldnote",
        pinTo: { edgeId: "e5" },
        kind: "war-story",
        label: "Field note",
        body: "[DRAFT: replace with your own words.] A short, dated, de-identified story about a duplicate or reversed payroll run, or someone who spent a credit that later got returned. This slot is intentionally human.",
        draft: true,
      },
    ],
    relatedTerms: ["odfi", "rdfi", "settlement"],
    sources: [NACHA, FEDERAL_RESERVE],
    updated: "2026-06-27",
  },
  {
    slug: "cross-border-wire",
    seedId: "wire-fx",
    title: "A cross-border wire, and where the money really goes",
    answer:
      "Nothing flies overseas: SWIFT carries instructions, the money moves as a debit to a US dollar account your bank already holds abroad, and the fees are mostly hidden in the exchange rate.",
    audience: "Anyone sending money abroad, and anyone who has watched a wire arrive short or late.",
    summary:
      "Read the spine straight down for what actually happens when you wire money to another country. Pull a margin open on any leg for the real cost, why SWIFT isn't the money, or where a wire gets stuck. Same flow, whatever depth you're after.",
    byline: "Notes by Fintech North",
    keyLeg: "e5",
    lines: {
      e1: "Your company instructs its Canadian bank to pay a US supplier. An instruction in Canadian dollars; nothing has crossed a border yet.",
      e2: "The bank converts your CAD to USD at its own rate. The FX spread and the wire fee are taken here, which is why the supplier often receives less than you'd expect.",
      e3: "Your bank sends a SWIFT message. This is the part people picture as 'the money flying overseas,' but SWIFT only carries instructions, never funds.",
      e4: "The message reaches a US correspondent bank that holds US dollars on your bank's behalf.",
      e5: "The actual money moves here: your bank's US dollar account at the correspondent (its nostro) is debited to cover the payment. The 'overseas transfer' is really a debit to a pre-funded US account.",
      e6: "The correspondent pays the supplier's US bank, settling in US dollars on domestic rails.",
      e7: "The supplier's bank credits their account. From their side, dollars simply arrived.",
    },
    notes: [
      {
        id: "wire-swift-myth",
        pinTo: { edgeId: "e3" },
        kind: "myth",
        label: "SWIFT doesn't move money",
        body: "Myth: SWIFT sends your money abroad. Reality: SWIFT is a messaging network. It carries the payment instruction (an MT103, or its ISO 20022 successor pacs.008), not funds. The money itself moves through the accounts banks hold with each other; the message just tells them to do it.",
        source: SWIFT,
      },
      {
        id: "wire-nostro",
        pinTo: { edgeId: "e5" },
        kind: "depth",
        label: "What a nostro account is",
        body: "Your bank keeps a US dollar account at a US bank: its nostro. A cross-border payment is a debit to that pre-funded account, not dollars travelling across the ocean. If your bank has no direct relationship with the destination bank, the payment hops through a chain of correspondents, and each link can add time and cost.",
        source: BIS,
      },
      {
        id: "wire-hidden-fee",
        pinTo: { edgeId: "e2" },
        kind: "burn",
        label: "The fee is in the rate, not the line item",
        body: "The visible wire fee is usually small next to the FX spread baked into the exchange rate, and intermediary correspondents can deduct their own charges along the way. The result is that the supplier receives materially less than you sent. Quoting someone the wire fee while ignoring the spread is exactly where senders, and the people waiting to be paid, get burned.",
        source: BIS,
      },
      {
        id: "wire-settlement",
        pinTo: { edgeId: "e6" },
        kind: "depth",
        label: "Where settlement really happens",
        body: "The 'international' leg resolves into a domestic US dollar settlement: the correspondent pays the beneficiary bank over US rails in central-bank or clearing money. Cross-border, in practice, is two domestic legs joined by a messaging network and a pre-funded account.",
        source: FEDERAL_RESERVE,
      },
      {
        id: "wire-receipt",
        pinTo: { edgeId: "e4" },
        kind: "receipt",
        label: "Why we're sure",
        body: "The correspondent-banking model, nostro and vostro accounts, and SWIFT operating as messaging rather than value transfer are documented by the messaging network and by the Bank for International Settlements.",
        source: BIS,
      },
      {
        id: "wire-fieldnote",
        pinTo: { edgeId: "e5" },
        kind: "war-story",
        label: "Field note",
        body: "[DRAFT: replace with your own words.] A short, dated, de-identified story about a wire that arrived short after intermediary deductions, or one held for days at a correspondent for compliance screening. This slot is intentionally human.",
        draft: true,
      },
    ],
    relatedTerms: ["correspondent-bank", "nostro-vostro", "settlement"],
    sources: [SWIFT, BIS, FEDERAL_RESERVE],
    updated: "2026-06-27",
  },
  {
    slug: "stablecoin-on-off-ramp",
    seedId: "usdc-cross-border-payout",
    title: "A stablecoin payout, on-ramp to off-ramp",
    answer:
      "The customer pays normal dollars and the supplier receives normal euros; only the middle leg is on-chain, and the stablecoin issuer governs the reserve without ever moving your money.",
    audience: "Anyone curious how a stablecoin payment really works, and anyone weighing one for cross-border payouts.",
    summary:
      "Read the spine straight down for how dollars become a stablecoin, cross a border, and come out as euros. Pull a margin open on any leg for what 'final' means on-chain, where the FX cost hides, or where the real risk sits. Same flow, whatever depth you're after.",
    byline: "Notes by Fintech North",
    keyLeg: "e4",
    lines: {
      e1: "A US company tells its bank to fund the payout. An instruction in US dollars; no token, no border crossing yet.",
      e2: "Real dollars move to a regulated on-ramp (an exchange or payment firm). This is the on-ramp: cash in.",
      e3: "The on-ramp turns those dollars into USDC, a stablecoin minted one-for-one against dollars held in reserve.",
      e4: "The on-ramp sends the USDC across a public blockchain. This is the part that actually crosses the border, and it's value moving, not a bank message.",
      e5: "Someone has to pay the network to record the transfer: the on-ramp pays a gas fee, not the company.",
      e6: "After enough confirmations, the USDC lands in the off-ramp's wallet. Finality here is the blockchain's, not a bank's.",
      e7: "Alongside the transfer, the two firms exchange data on who's paying whom. A compliance message, no money.",
      e8: "The off-ramp redeems the USDC back to dollars; the issuer burns the tokens and releases the reserve dollars. This is the off-ramp: tokens back to cash.",
      e9: "The off-ramp converts dollars to euros at its own rate (the FX, and its spread, happen here) and pays out over SEPA.",
      e10: "The supplier's bank credits them in euros. From their side, a normal euro payment simply arrived.",
    },
    notes: [
      {
        id: "stablecoin-fiat-bookends",
        pinTo: { edgeId: "e4" },
        kind: "myth",
        label: "Only the middle leg is crypto",
        body: "Myth: a stablecoin payment is crypto end to end. Reality: the company pays ordinary dollars and the supplier receives ordinary euros. Only the middle hop is on-chain. The on-ramp and off-ramp are where fiat becomes token and back, and most of the flow is conventional banking bookending one blockchain transfer.",
        source: BIS,
      },
      {
        id: "stablecoin-finality",
        pinTo: { edgeId: "e6" },
        kind: "depth",
        label: "What 'final' means on-chain",
        body: "On-chain finality is probabilistic, not a legal moment a central bank declares. Validators confirm the transfer block by block, and the receiver treats it as settled only after enough confirmations. It's fast, but 'final' is a confidence threshold the off-ramp chooses, not a stamp from a settlement authority.",
        source: BIS,
      },
      {
        id: "stablecoin-issuer",
        pinTo: { edgeId: "e8" },
        kind: "depth",
        label: "The issuer governs the reserve, not the payment",
        body: "The USDC issuer mints and burns one-for-one against dollar reserves and attests to them, but it never custodies or routes this payment. The value moves peer-to-peer between the on-ramp and off-ramp on-chain. The trust is in the reserve and the right to redeem, not in a payment rail the issuer runs.",
        source: CIRCLE,
      },
      {
        id: "stablecoin-ramp-risk",
        pinTo: { edgeId: "e2" },
        kind: "burn",
        label: "Your risk lives at the ramps, not the chain",
        body: "The on-chain leg is robust, but the regulated on-ramp and off-ramp custody the funds in between, and they are the points that can freeze an account, stall on a compliance check, or fail outright. The boundary where fiat meets token is where people get burned, far more than the blockchain itself.",
        source: BIS,
      },
      {
        id: "stablecoin-travel-rule",
        pinTo: { edgeId: "e7" },
        kind: "receipt",
        label: "Why we're sure",
        body: "The originator and beneficiary data the two firms exchange is the FATF Travel Rule for virtual-asset service providers, carried by standards like IVMS 101. It is a messaging obligation that rides alongside the on-chain value transfer, not part of the money movement.",
        source: FATF,
      },
      {
        id: "stablecoin-fx",
        pinTo: { edgeId: "e9" },
        kind: "depth",
        label: "Where the FX (and its cost) really is",
        body: "The dollars-to-euros conversion and its spread happen at the off-ramp's desk, not on-chain. The blockchain only moved a dollar-denominated token; the currency switch is a conventional FX trade with a conventional margin, applied right before the SEPA payout.",
        source: BIS,
      },
      {
        id: "stablecoin-fieldnote",
        pinTo: { edgeId: "e8" },
        kind: "war-story",
        label: "Field note",
        body: "[DRAFT: replace with your own words.] A short, dated, de-identified story about a redemption that stalled, an off-ramp account frozen for review, or a payout held at the fiat boundary. This slot is intentionally human.",
        draft: true,
      },
    ],
    relatedTerms: ["stablecoin", "on-ramp", "off-ramp"],
    sources: [CIRCLE, BIS, FATF],
    updated: "2026-06-27",
  },
];
