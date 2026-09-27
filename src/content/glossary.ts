// Generated from the audited content pass, expanded + QA'd. Safe to hand-edit; scripts/check-content.ts
// (wired into `pnpm test` + prebuild) keeps slugs unique and every cross-ref + seedId + source + diagram honest.
// Public glossary terms. Model: src/content/types.ts.
//
// Maintenance note — "See it move" deep links (`seeIt`): a term MAY carry a
// seeIt that opens the studio with an audited seed loaded and the term's exact
// element selected (/studio?seed=<FLOW_CATALOG id>&sel=<node|edge>:<id>).
// Rules, hard-gated by check-content.ts: seedId must be a FLOW_CATALOG id from
// the audited tier (source "seed"), and select.id must name a node/edge that
// exists in that seed. Pick the element that best EMBODIES the term (the leg
// whose editor shows the right rail/timing/annotations), and keep `label` in
// the casual hobby register with no em-dashes (CI-enforced).
import type { GlossaryTerm } from "./types";

export const GLOSSARY: GlossaryTerm[] = [
  {
    "slug": "issuer",
    "term": "Issuer",
    "aka": [
      "issuing bank",
      "card issuer"
    ],
    "short": "The cardholder's bank, it issues the card, approves the authorization, and funds its side of settlement so the purchase can be paid.",
    "plain": "The issuer is the bank (or the bank backing a fintech) that gave the cardholder their card and holds the account behind it. When you tap, the issuer is the party that answers the authorization request, checking the account is good for the amount and placing a hold; no money has moved yet at that point. Later, during settlement, the issuer is the bank that actually funds its side of settlement, typically through the network's settlement system, so the acquirer can be paid, usually net of interchange. On a credit card it is extending its own money on your behalf; on a debit card it is moving money that already sits in your account.",
    "inAFlow": "On the money leg, the issuer is the source of funds: it approves the auth in real time, then pays into settlement so the acquirer can fund the merchant. Think of it as the 'pay from' bank in any card flow.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The issuer is Visa or Mastercard.",
        "reality": "Visa and Mastercard are networks that route the messages and set the rules; they are not your bank and they do not hold your money. The issuer is the actual bank (or its sponsor) whose name is on the account behind the card."
      },
      {
        "claim": "When the issuer approves an authorization, it has paid the merchant.",
        "reality": "Authorization is just a real-time check and hold, a 'yes, good for it' message. The issuer's money does not move until settlement, which happens later and is a separate, bank-to-bank step."
      }
    ],
    "related": [
      "acquirer",
      "processor",
      "authorization",
      "settlement",
      "interchange",
      "sponsor-bank"
    ],
    "guides": [
      "card-tap-to-settlement",
      "card-chargebacks"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Issuer role in the four-party model and authorization."
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "visa-four-party",
      "select": { "kind": "node", "id": "issuer" },
      "label": "opens a four-party card flow, Visa here, with the issuer bank picked out"
    }
  },
  {
    "slug": "acquirer",
    "term": "Acquirer",
    "aka": [
      "acquiring bank",
      "merchant bank",
      "merchant acquirer"
    ],
    "short": "The merchant's bank, it brings the transaction into the network and pays the merchant for sales, typically net of fees.",
    "plain": "The acquirer is the bank (often working with a processor) on the merchant's side of a card transaction. It accepts the merchant as a customer, passes their card transactions into the network for authorization and clearing, and then funds the merchant's account for completed sales. The amount the merchant receives is typically the sale total minus fees, interchange, network fees, and the acquirer's own markup are usually deducted before or as the merchant is paid. The acquirer is also the party that receives a chargeback when a cardholder disputes a transaction and must work it out with the merchant.",
    "inAFlow": "On the money leg, the acquirer is the destination bank that receives funds through the network's settlement and then pays the merchant. On the message leg, it submits the merchant's auth and clearing records into the network. It is the 'pay to' bank in a card flow.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The acquirer pays the merchant the full sale amount and bills fees separately later.",
        "reality": "In a common pattern the merchant is funded net, interchange, network fees, and the acquirer's markup are taken out as part of settlement or the payout, not invoiced as a separate wire. Arrangements vary by program and contract; some merchants are on gross-plus-invoice pricing."
      },
      {
        "claim": "The acquirer and the payment processor are always the same company.",
        "reality": "They are different roles. The acquirer is the bank of record that holds the merchant relationship and the funds; the processor is the technology moving the messages. One company can do both, but the bank role and the tech role are distinct."
      }
    ],
    "related": [
      "issuer",
      "processor",
      "interchange",
      "clearing",
      "settlement",
      "chargeback",
      "representment"
    ],
    "guides": [
      "card-tap-to-settlement",
      "card-chargebacks",
      "marketplace-payouts"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "visa-four-party",
      "select": { "kind": "node", "id": "acquirer" },
      "label": "opens a four-party card flow, Visa here, with the acquirer picked out"
    }
  },
  {
    "slug": "processor",
    "term": "Processor",
    "aka": [
      "payment processor",
      "issuer processor",
      "acquirer processor"
    ],
    "short": "The technology that moves authorization and clearing messages for an issuer or an acquirer, not the bank of record.",
    "plain": "A processor is the tech layer that handles the message traffic of card payments, formatting and routing the authorization request, returning the approve/decline, and submitting clearing records, on behalf of an issuer or an acquirer. It is plumbing for messages, not the holder of the money. The bank of record (issuer or acquirer) is still the party that legally holds accounts and moves funds in settlement; the processor just makes the data flow fast and correctly. Many fintechs you interact with sit on top of an issuer processor without ever being a bank themselves.",
    "inAFlow": "The processor lives on the message leg: it carries auth and clearing traffic between the merchant, the networks, and the banks. It does not sit on the money leg, settlement still happens bank-to-bank between the issuer and the acquirer.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The processor holds and moves the money.",
        "reality": "The processor moves messages, not funds. The money moves in settlement between the issuer and the acquirer, the banks of record. The processor's job is to route the data quickly and accurately."
      },
      {
        "claim": "If a company processes your payments, it must be a bank.",
        "reality": "No. A processor can be a pure technology company. The banking, holding accounts, reaching the rails, settling funds, is done by the issuer or acquirer (and, for fintechs, often a sponsor bank behind them)."
      }
    ],
    "related": [
      "issuer",
      "acquirer",
      "authorization",
      "clearing",
      "sponsor-bank",
      "program-manager"
    ],
    "guides": [
      "card-tap-to-settlement"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "prepaid-sponsor-ca",
      "select": { "kind": "node", "id": "processor" },
      "label": "opens the Canadian prepaid card flow with the processor picked out"
    }
  },
  {
    "slug": "sponsor-bank",
    "term": "Sponsor bank",
    "aka": [
      "sponsoring bank",
      "BIN sponsor",
      "sponsor"
    ],
    "short": "A chartered bank that lets a fintech reach the payment rails under its licence, acting as the issuer or acquirer of record.",
    "plain": "A sponsor bank is a licensed, chartered bank that extends its regulatory standing and network access to a fintech that isn't a bank itself. Because reaching card networks or payment rails requires a charter and network membership, the fintech operates 'under' the sponsor: the bank is the issuer or acquirer of record, holds the regulated accounts, and is ultimately answerable to the network and regulators, while the fintech runs the product and customer experience. This is a common way a non-bank fintech can offer cards or accounts. The exact split of duties and liability is set by contract and varies widely.",
    "inAFlow": "The sponsor bank is the party that actually touches the rails and the money, it is the bank of record on the issuer or acquirer side. The fintech's brand sits in front, but funds settle through the sponsor's regulated accounts.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "A fintech with its own app and cards is its own bank.",
        "reality": "Often it isn't. Many fintechs run on a sponsor bank that holds the charter, the regulated accounts, and the network membership. The fintech owns the experience; the sponsor is the bank of record behind it."
      },
      {
        "claim": "The sponsor bank just lends its name and takes no responsibility.",
        "reality": "As the issuer or acquirer of record, the sponsor carries real regulatory and network obligations for the program. How duties and liability are divided with the fintech is set by contract and differs case to case."
      }
    ],
    "related": [
      "program-manager",
      "issuer",
      "acquirer",
      "processor",
      "fbo-account"
    ],
    "guides": [
      "card-tap-to-settlement",
      "fbo-account-explained",
      "wallet-top-up"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "FDIC overview of bank-fintech arrangements and deposit pass-through",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority",
        "note": "Context on the bank-of-record role and pass-through deposit arrangements."
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "prepaid-sponsor-ca",
      "select": { "kind": "node", "id": "sponsor" },
      "label": "opens the Canadian prepaid flow with the sponsor bank picked out"
    }
  },
  {
    "slug": "program-manager",
    "term": "Program manager",
    "aka": [
      "fintech program manager",
      "neobank operator"
    ],
    "short": "The fintech that owns the user experience and the ledger of a card or account program, but is not the bank of record.",
    "plain": "A program manager is the company that designs and runs a payments program, the app, the onboarding, the customer support, and its own internal ledger of who has what, while a sponsor bank sits behind it as the actual issuer or acquirer of record. The program manager often holds the customer relationship and tracks balances on its books, but the regulated money and rail access live with the sponsor bank. It's the role many fintech 'neobanks' play: they feel like a bank to the user, but the charter belongs to a partner. Exactly which duties the program manager handles versus the bank varies by deal.",
    "inAFlow": "The program manager sits on the party layer next to its sponsor: it owns the experience and an internal ledger, while the sponsor bank is where funds actually settle and sit. The program manager directs and records the flow but is not the bank moving the regulated money.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The program manager holds your deposits and is itself an insured bank.",
        "reality": "The program manager typically runs the experience and its own ledger, while the sponsor bank holds the regulated funds. Any deposit insurance comes from the bank, sometimes via a pass-through arrangement, and whether and how it applies depends on the specific setup."
      },
      {
        "claim": "Program manager and processor are the same thing.",
        "reality": "They're different roles. The program manager owns the product and the customer ledger; the processor is the technology routing payment messages. A program manager usually contracts with a processor and a sponsor bank rather than being either one."
      }
    ],
    "related": [
      "sponsor-bank",
      "processor",
      "issuer",
      "fbo-account"
    ],
    "guides": [
      "fbo-account-explained",
      "wallet-top-up",
      "marketplace-payouts"
    ],
    "sources": [
      {
        "label": "FDIC guidance on deposit insurance and pass-through arrangements",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority"
      },
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "neobank-sponsor-us",
      "select": { "kind": "node", "id": "neobank" },
      "label": "opens the US neobank flow with the program manager picked out"
    }
  },
  {
    "slug": "interchange",
    "term": "Interchange",
    "aka": [
      "interchange fee",
      "interchange reimbursement fee"
    ],
    "short": "A fee set by the network that flows, economically, from the merchant's side to the issuer, typically netted inside settlement, not sent as a separate payment.",
    "plain": "Interchange is a fee, published in the network's rate schedules, that the acquirer/merchant side effectively pays to the issuer on each card transaction. It's the network's way of compensating the issuer for funding the purchase, taking on cardholder risk, and running the account. In a common pattern, interchange is not a separate wire that someone sends, it's baked into the math of settlement, so the issuer remits the transaction amount minus interchange and the merchant ends up funded net of it. Rates vary widely by card type, merchant category, region, and how the transaction is processed, and the networks publish the schedules. On three-party schemes like American Express, the same company plays issuer and network, so interchange isn't a separate flow there, just internal accounting.",
    "inAFlow": "Interchange is a money-leg adjustment, not a message and not its own transfer. It changes how much settles between the issuer and acquirer: the issuer typically remits the sale amount less interchange, which is why the merchant is funded net of fees.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "Interchange is a separate payment the merchant wires to the issuer.",
        "reality": "It generally isn't sent on its own. Interchange is netted inside settlement, the issuer remits the transaction amount minus interchange, so the merchant simply ends up funded net of it. No standalone interchange transfer happens in the typical flow."
      },
      {
        "claim": "The card network keeps the interchange fee.",
        "reality": "On the major four-party networks, interchange flows economically to the issuer, not the network. The network sets and publishes the rates and charges its own separate network/assessment fees, but the interchange itself is the issuer's compensation."
      }
    ],
    "related": [
      "issuer",
      "acquirer",
      "settlement",
      "clearing",
      "processor"
    ],
    "guides": [
      "card-tap-to-settlement"
    ],
    "sources": [
      {
        "label": "Visa interchange reimbursement fees",
        "url": "https://usa.visa.com/support/small-business/regulations-fees.html",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network-published interchange rate schedules."
      },
      {
        "label": "Mastercard interchange rates",
        "url": "https://www.mastercard.com/us/en/business/support/merchant-interchange-rates.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "visa-four-party",
      "select": { "kind": "edge", "id": "e8" },
      "label": "opens a four-party card flow, Visa here, with the interchange leg selected"
    }
  },
  {
    "slug": "authorization",
    "term": "Authorization",
    "aka": [
      "auth",
      "card authorization",
      "auth hold",
      "pre-authorization"
    ],
    "short": "The real-time check asking 'is this card good for this amount?' It places a hold, but no money moves yet.",
    "plain": "Authorization is the instant back-and-forth that happens when you tap or enter a card. The merchant's side asks the cardholder's bank, in real time, whether the card is valid and has enough room for this specific amount. If the answer is yes, the bank places a temporary hold on the funds and sends back an approval code. No money has actually moved at this point; it is purely a message exchange, and the real transfer of funds happens later during clearing and settlement.",
    "inAFlow": "When a customer taps to pay, the acquirer routes an authorization request through the card network to the issuer, which approves or declines and places a hold on the cardholder's available balance. This approval is what lets the merchant hand over the goods, even though the actual money typically arrives days later.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "When my card is approved, the merchant has been paid.",
        "reality": "Approval only confirms the card is good and places a hold. The merchant typically receives the actual funds days later, after clearing and settlement."
      },
      {
        "claim": "An authorization hold permanently takes the money out of my account.",
        "reality": "A hold reduces your available balance temporarily. If the charge is never captured, the hold is released, often within a few days depending on the issuer."
      }
    ],
    "related": [
      "clearing",
      "settlement",
      "issuer",
      "acquirer",
      "processor"
    ],
    "guides": [
      "card-tap-to-settlement",
      "card-chargebacks"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Describes the authorization request and response flow between acquirer and issuer."
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "visa-four-party",
      "select": { "kind": "edge", "id": "e4" },
      "label": "opens a card auth example, Visa here, with the issuer decision leg selected"
    }
  },
  {
    "slug": "clearing",
    "term": "Clearing",
    "aka": [
      "clearing process",
      "presentment",
      "batch clearing"
    ],
    "short": "Exchanging the transaction records that compute who owes whom. Still messages, not money.",
    "plain": "Clearing is the step after a payment is approved where the banks exchange the detailed records of each transaction. These records are used to calculate the net amounts each bank owes the others. Think of it as everyone comparing their books and agreeing on the totals before any cash changes hands. In a common card pattern, the merchant's side submits the captured transactions in batches, the network sorts and forwards them, and positions are tallied up. Money still has not moved; that is settlement's job.",
    "inAFlow": "After authorizations are captured, the acquirer submits transaction records into the network, which clears them by routing each to the right issuer and computing net positions. The output of clearing is an agreed set of obligations that settlement then discharges.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "Clearing is when the money gets transferred between banks.",
        "reality": "Clearing exchanges records and computes who owes whom. The actual bank-to-bank money movement is settlement, a separate step."
      },
      {
        "claim": "Authorization and clearing are the same event.",
        "reality": "Authorization is a real-time yes/no check with a hold. Clearing happens later, often in batches, and is about reconciling the records that determine final amounts."
      }
    ],
    "related": [
      "authorization",
      "settlement",
      "interchange",
      "acquirer",
      "issuer"
    ],
    "guides": [
      "card-tap-to-settlement",
      "ach-credit-vs-debit"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "ACH network: clearing and settlement basics",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Illustrates clearing as record exchange ahead of settlement, generalizing beyond cards."
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "visa-four-party",
      "select": { "kind": "edge", "id": "e5" },
      "label": "opens a four-party card flow, Visa here, with the clearing records leg selected"
    }
  },
  {
    "slug": "settlement",
    "term": "Settlement",
    "aka": [
      "settling",
      "net settlement",
      "final settlement"
    ],
    "short": "The actual bank-to-bank money movement that discharges the obligation. This is when funds become final.",
    "plain": "Settlement is the moment money genuinely moves between banks to pay off the obligations that clearing calculated. It is the difference between a promise and a payment. On card rails, banks typically settle net positions through a settlement bank or central system, so funds become final and the merchant's bank can credit the merchant. The concept generalizes to every rail: networks route messages and compute positions, but settlement is when real funds change hands and the deal is done.",
    "inAFlow": "Once clearing has netted out who owes whom, settlement moves the actual funds between the issuer's and acquirer's banks, often across a central settlement system. After settlement, the obligation is discharged and the money is final, which is when the merchant ultimately gets paid.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "The card network moves the money during settlement.",
        "reality": "Networks route messages and compute net positions. Banks, often through a settlement bank or central system, move the actual funds. The network does not transfer the money itself."
      },
      {
        "claim": "Funds are final as soon as the payment is approved.",
        "reality": "Approval is just a check and a hold. Funds typically become final only at settlement, which can be a day or more after authorization."
      }
    ],
    "related": [
      "clearing",
      "authorization",
      "acquirer",
      "issuer",
      "correspondent-bank",
      "nostro-vostro"
    ],
    "guides": [
      "card-tap-to-settlement",
      "cross-border-wire",
      "ach-credit-vs-debit"
    ],
    "sources": [
      {
        "label": "Core funding, settlement and oversight in Canada",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "Explains final settlement of interbank obligations."
      },
      {
        "label": "Payments Canada: clearing and settlement systems",
        "url": "https://www.payments.ca/systems-services/payment-systems",
        "publisher": "Payments Canada",
        "kind": "operator"
      },
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "visa-four-party",
      "select": { "kind": "edge", "id": "e6" },
      "label": "opens a card settlement example, Visa here, with the settlement leg selected"
    }
  },
  {
    "slug": "chargeback",
    "term": "Chargeback",
    "aka": [
      "dispute",
      "card dispute",
      "transaction reversal"
    ],
    "short": "A cardholder dispute that reverses a settled card payment through the network's rules.",
    "plain": "A chargeback is a way for a cardholder to dispute a charge and get their money back, typically after a payment has already settled. The cardholder contacts their bank, the issuer, which can reverse the transaction by pulling the funds back from the merchant's bank through the card network's dispute rules. Common reasons include fraud, goods not received, or a charge the cardholder does not recognize. Because the payment had usually already settled, a chargeback is a genuine reversal of money, not just a message. The merchant can contest it by re-presenting evidence.",
    "inAFlow": "When a cardholder disputes a settled charge, the issuer initiates a chargeback that flows back through the network to the acquirer, debiting the merchant. The merchant can fight it with representment, and unresolved cases may escalate to network arbitration.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "A chargeback is the same as asking the merchant for a refund.",
        "reality": "A refund is the merchant voluntarily returning funds. A chargeback is a forced reversal initiated by the cardholder's bank under the network's dispute rules, often with fees for the merchant."
      },
      {
        "claim": "Once a chargeback is filed, the merchant has no recourse.",
        "reality": "Merchants can contest a chargeback through representment, submitting evidence to the network. The dispute can be resolved in the merchant's favor."
      }
    ],
    "related": [
      "representment",
      "settlement",
      "issuer",
      "acquirer",
      "authorization"
    ],
    "guides": [
      "card-chargebacks",
      "card-tap-to-settlement"
    ],
    "sources": [
      {
        "label": "Visa dispute resolution",
        "url": "https://www.visa.com/en-us/support/business/dispute-resolution",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "Mastercard dispute management",
        "url": "https://www.mastercard.com/us/en/business/cybersecurity-fraud-prevention/dispute-management.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [
      "US",
      "CA",
      "EU"
    ],
    "seeIt": {
      "seedId": "card-dispute-rege",
      "select": { "kind": "edge", "id": "e3" },
      "label": "opens a US card dispute example (Reg E) with the chargeback leg selected"
    }
  },
  {
    "slug": "representment",
    "term": "Representment",
    "aka": [
      "re-presentment",
      "second presentment",
      "chargeback rebuttal"
    ],
    "short": "The merchant and acquirer re-presenting evidence to contest a chargeback.",
    "plain": "Representment is how a merchant fights back against a chargeback. After the cardholder's bank reverses a charge, the merchant and its acquiring bank can re-present the transaction with evidence, such as proof of delivery, a signed receipt, or records showing the customer authorized the purchase. The case goes back through the network, which applies its dispute rules to decide. The word literally means presenting the transaction again. It is a message-and-evidence step; whether money actually moves back to the merchant depends on how the dispute is resolved.",
    "inAFlow": "When a merchant disputes a chargeback, the acquirer submits representment with supporting evidence through the network to the issuer. If the evidence holds up under the network's rules, the funds can return to the merchant; if not, the dispute may escalate to arbitration.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "Representment automatically gets the merchant's money back.",
        "reality": "Representment submits evidence to contest the chargeback, but the outcome depends on the network's rules and the strength of the evidence. It can still be decided against the merchant."
      },
      {
        "claim": "Representment is the same as a chargeback.",
        "reality": "A chargeback is the cardholder's bank reversing a charge. Representment is the merchant's response, re-presenting the transaction with evidence to challenge that reversal."
      }
    ],
    "related": [
      "chargeback",
      "settlement",
      "acquirer",
      "issuer"
    ],
    "guides": [
      "card-chargebacks"
    ],
    "sources": [
      {
        "label": "Visa dispute resolution",
        "url": "https://www.visa.com/en-us/support/business/dispute-resolution",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "Mastercard dispute management",
        "url": "https://www.mastercard.com/us/en/business/cybersecurity-fraud-prevention/dispute-management.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [
      "US",
      "CA",
      "EU"
    ],
    "seeIt": {
      "seedId": "card-dispute-rege",
      "select": { "kind": "edge", "id": "e8" },
      "label": "opens a US card dispute example (Reg E) with the re-presentment leg selected"
    }
  },
  {
    "slug": "odfi",
    "term": "ODFI (Originating Depository Financial Institution)",
    "aka": [
      "originating bank",
      "originating depository financial institution"
    ],
    "short": "The bank that submits an ACH payment into the network on behalf of the party starting it.",
    "plain": "When a company sends an ACH payment, payroll, vendor payment, or a debit it's pulling from a customer, it doesn't plug into the ACH network directly. Its bank does that for it, and that bank is the ODFI. The ODFI takes the payment instruction from its customer (the originator), formats it correctly, and submits it to an ACH operator for processing. It also carries warranties and responsibilities for those entries, which is why banks vet the businesses they let originate.",
    "inAFlow": "In an ACH payroll run, the employer is the originator and its bank is the ODFI: the ODFI packages the employees' pay instructions and sends them into the ACH network, where they're routed to each employee's bank (the RDFI) to post.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The ODFI moves the money straight to the receiver's bank.",
        "reality": "The ODFI originates the instruction; an ACH operator processes and routes it, and the actual bank-to-bank money movement happens later through settlement. Originating an entry is a message step, not the moment funds become final."
      },
      {
        "claim": "Any business can originate ACH on its own.",
        "reality": "Originators reach ACH through a sponsoring ODFI. The bank takes on warranties for the entries it submits, so it typically underwrites and monitors who it lets originate."
      }
    ],
    "related": [
      "rdfi",
      "processor",
      "settlement",
      "clearing"
    ],
    "guides": [
      "ach-credit-vs-debit",
      "payroll-via-ach"
    ],
    "sources": [
      {
        "label": "ACH Network rules and roles",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Defines ODFI/RDFI roles, warranties, and origination responsibilities."
      },
      {
        "label": "Automated Clearing House (ACH) services",
        "url": "https://www.federalreserve.gov/paymentsystems/fedach_about.htm",
        "publisher": "Federal Reserve",
        "kind": "operator",
        "note": "Federal Reserve as an ACH operator that processes and routes entries."
      }
    ],
    "railFamily": "ach",
    "jurisdiction": [
      "US"
    ],
    "seeIt": {
      "seedId": "ach-payroll",
      "select": { "kind": "node", "id": "odfi" },
      "label": "opens the ACH payroll flow with the ODFI picked out"
    }
  },
  {
    "slug": "rdfi",
    "term": "RDFI (Receiving Depository Financial Institution)",
    "aka": [
      "receiving bank",
      "receiving depository financial institution"
    ],
    "short": "The bank that receives an ACH entry and posts it to the receiver's account.",
    "plain": "On the receiving end of an ACH payment is a bank holding the account that gets credited or debited. That bank is the RDFI. After an ACH operator routes the entry, the RDFI is responsible for posting it to the right account by the required time, and for sending a return if something is wrong, such as the account being closed or, for a debit, the customer saying it wasn't authorized. The RDFI is identified by the routing number on the entry.",
    "inAFlow": "In an ACH payroll run, each employee's bank is an RDFI: it receives the pay entry routed through the ACH network and posts the credit to the employee's account on the settlement date.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The RDFI checks and approves each ACH entry before it posts, the way a card authorization works.",
        "reality": "ACH typically has no real-time approval step. The RDFI receives entries in batches and posts them; if an entry is bad or unauthorized, the fix usually comes afterward as an ACH return within the allowed return window."
      },
      {
        "claim": "Once the RDFI posts an ACH debit, the money is gone for good.",
        "reality": "Posting and finality aren't the same. An RDFI can return a debit within the rules' timeframes, and consumer debits in particular carry extended return rights, so a posted entry can still be reversed."
      }
    ],
    "related": [
      "odfi",
      "settlement",
      "clearing",
      "authorization"
    ],
    "guides": [
      "ach-credit-vs-debit",
      "payroll-via-ach"
    ],
    "sources": [
      {
        "label": "ACH Network rules, returns, and RDFI obligations",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "Defines RDFI posting duties, return reasons, and return timeframes."
      },
      {
        "label": "Automated Clearing House (ACH) services",
        "url": "https://www.federalreserve.gov/paymentsystems/fedach_about.htm",
        "publisher": "Federal Reserve",
        "kind": "operator",
        "note": "Federal Reserve as an ACH operator routing entries to receiving banks."
      }
    ],
    "railFamily": "ach",
    "jurisdiction": [
      "US"
    ],
    "seeIt": {
      "seedId": "ach-payroll",
      "select": { "kind": "node", "id": "rdfi" },
      "label": "opens the ACH payroll flow with the RDFI picked out"
    }
  },
  {
    "slug": "alias-directory",
    "term": "Alias Directory",
    "aka": [
      "proxy directory",
      "addressing service",
      "alias lookup",
      "directory service"
    ],
    "short": "The lookup that turns an email, phone number, or handle into the bank account it points to.",
    "plain": "Many account-to-account systems let you send money to something memorable, an email, a phone number, or a username, instead of a routing and account number. Behind that convenience sits an alias directory: a registry that maps each alias to the underlying account so the system knows where to send the payment. It answers WHO, not how much or when. The directory resolves the destination; the actual money still moves over the underlying rail between banks.",
    "inAFlow": "When someone sends an Interac e-Transfer to an email registered for Autodeposit, the alias directory resolves that email to the recipient's account and the money is deposited automatically; without Autodeposit, the email is just where the notification goes, and the recipient picks the deposit account when they claim the transfer. Either way, the value itself settles between the banks over the underlying rail.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "The alias directory holds your money or moves it.",
        "reality": "It only stores the mapping from an alias to an account. It's a routing lookup; the actual funds move bank-to-bank over the underlying payment rail and settle there, not in the directory."
      },
      {
        "claim": "An email or phone number alias is a new kind of account.",
        "reality": "The alias is just a friendly label pointing at a normal bank account. Resolving the alias reveals the real account that gets credited."
      }
    ],
    "related": [
      "rdfi",
      "settlement",
      "correspondent-bank"
    ],
    "guides": [
      "interac-e-transfer-explained",
      "wallet-top-up"
    ],
    "sources": [
      {
        "label": "Interac e-Transfer",
        "url": "https://www.interac.ca/en/consumers/products/interac-e-transfer/",
        "publisher": "Interac",
        "kind": "operator",
        "note": "Send to an email or phone number; alias resolves the recipient."
      },
      {
        "label": "Unified Payments Interface (UPI)",
        "url": "https://www.npci.org.in/product/upi",
        "publisher": "NPCI",
        "kind": "operator",
        "note": "Virtual payment addresses map to bank accounts in UPI."
      },
      {
        "label": "Pix",
        "url": "https://www.bcb.gov.br/en/financialstability/pix",
        "publisher": "Banco Central do Brasil",
        "kind": "authority",
        "note": "Pix keys (phone, email, tax ID) resolve to accounts via a central directory."
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "CA",
      "US",
      "IN",
      "BR",
      "EU"
    ],
    "seeIt": {
      "seedId": "brazil-pix",
      "select": { "kind": "node", "id": "dict" },
      "label": "opens the Brazil Pix example with its DICT alias directory picked out"
    }
  },
  {
    "slug": "fbo-account",
    "term": "FBO Account (For Benefit Of)",
    "aka": [
      "for benefit of account",
      "pooled custodial account",
      "omnibus account"
    ],
    "short": "One pooled bank account a company uses to hold many customers' funds, with per-person balances tracked on its own ledger.",
    "plain": "An FBO, short for For Benefit Of, account is a single custodial account at a bank that holds money belonging to many end users at once, owned by the company (often a fintech) for the benefit of those users. The bank sees one pooled balance; who owns what within it lives on the fintech's own ledger. This is a common structure for fintechs that aren't banks themselves: it lets them offer balances and payments while a partner bank actually holds the funds. How customer funds are protected depends on the specific setup and isn't automatic.",
    "inAFlow": "A neobank app shows each user their own balance, but under the hood those balances are slices of one pooled FBO account at a partner bank; the bank holds the total, and the neobank's ledger records each user's share.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "Each user in an FBO account has their own bank account.",
        "reality": "There's typically one pooled account at the bank. Individual user balances are sub-balances on the fintech's ledger, not separate accounts the bank tracks per user."
      },
      {
        "claim": "Money in an FBO account is automatically insured per end user.",
        "reality": "Whether pass-through deposit insurance reaches each end user depends on the specific account titling, recordkeeping, and whether the partner is an insured bank. It's a structure-dependent question, not a guarantee, and this is educational framing, not advice."
      }
    ],
    "related": [
      "sponsor-bank",
      "program-manager",
      "settlement",
      "correspondent-bank"
    ],
    "guides": [
      "fbo-account-explained",
      "marketplace-payouts"
    ],
    "sources": [
      {
        "label": "Deposit insurance and pass-through coverage concepts",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority",
        "note": "Conditions under which deposit insurance can pass through to underlying owners."
      },
      {
        "label": "Correspondent banking and custody structures",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Context on pooled and custodial account structures in payments."
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "US"
    ],
    "seeIt": {
      "seedId": "neobank-sponsor-us",
      "select": { "kind": "node", "id": "fbo" },
      "label": "opens the US neobank flow with the pooled FBO account picked out"
    }
  },
  {
    "slug": "correspondent-bank",
    "term": "Correspondent Bank",
    "aka": [
      "correspondent",
      "intermediary bank",
      "agent bank"
    ],
    "short": "A bank that holds accounts for other banks so they can reach a currency or country they can't touch directly.",
    "plain": "Most banks don't have branches or central-bank access in every country, so they can't move foreign currency on their own. A correspondent bank solves this: it holds an account for the other bank and makes and receives payments on its behalf in a currency or jurisdiction the first bank can't reach directly. In a common cross-border pattern, your bank instructs its correspondent to pay the recipient's bank, and the correspondent moves the actual money locally. Several correspondents may be chained together when no single one connects both ends.",
    "inAFlow": "In a cross-border payment, the sending bank rarely pays the receiving bank directly. It sends a message to a correspondent that holds its account and can settle in the destination currency; that correspondent moves money locally to the next bank in the chain. Each hop is a real money leg between banks, distinct from the SWIFT messages that instruct it.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "SWIFT moves the money between countries.",
        "reality": "SWIFT is a messaging network, it carries the payment instructions between banks. The actual money moves through correspondent banks debiting and crediting the accounts they hold for each other."
      },
      {
        "claim": "My bank pays the recipient's bank directly across the border.",
        "reality": "Unless the two banks already hold accounts with each other, the payment is typically routed through one or more correspondent banks that bridge the currencies and jurisdictions involved."
      }
    ],
    "related": [
      "nostro-vostro",
      "settlement"
    ],
    "guides": [
      "cross-border-wire"
    ],
    "sources": [
      {
        "label": "Correspondent banking",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "CPMI work on correspondent banking structure and trends."
      },
      {
        "label": "SWIFT messaging and cross-border payments",
        "url": "https://www.swift.com/about-us/discover-swift",
        "publisher": "SWIFT",
        "kind": "operator",
        "note": "How payment instructions are carried between banks."
      }
    ],
    "railFamily": "cross-border",
    "jurisdiction": [
      "global"
    ],
    "seeIt": {
      "seedId": "wire-fx",
      "select": { "kind": "node", "id": "correspondent" },
      "label": "opens the CAD to USD wire with the correspondent bank picked out"
    }
  },
  {
    "slug": "nostro-vostro",
    "term": "Nostro / Vostro Accounts",
    "aka": [
      "nostro account",
      "vostro account",
      "loro account",
      "due to / due from"
    ],
    "short": "Two names for the same correspondent account, seen from each bank's side: nostro is 'our money at your bank', vostro is 'your money at our bank'.",
    "plain": "When one bank holds an account at another bank, both banks book the same account, just from opposite viewpoints. The bank that owns the money calls it a nostro account ('ours' at the other bank, usually in a foreign currency). The bank holding that money for it calls the same account a vostro ('yours' held with us). It's a labeling convention, not two separate pots: every credit to one side is the matching debit on the other. These balances are where cross-border money actually sits and moves.",
    "inAFlow": "Cross-border settlement happens by moving balances in these accounts. When your bank's correspondent pays out abroad, it debits your bank's nostro balance held there; from the correspondent's books that same account is a vostro. The money leg is the change in that balance, the SWIFT message just tells the correspondent to make it.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "Nostro and vostro are two different accounts.",
        "reality": "They're the same account described from two sides. 'Nostro' is the owning bank's view of its money held elsewhere; 'vostro' is the holding bank's view of that same balance."
      },
      {
        "claim": "Foreign-currency payments move money instantly across borders.",
        "reality": "What typically moves is a balance in a nostro/vostro account at a correspondent. If that account lacks funds or available credit in the right currency, the payment may not settle until it does."
      }
    ],
    "related": [
      "correspondent-bank",
      "settlement"
    ],
    "guides": [
      "cross-border-wire"
    ],
    "sources": [
      {
        "label": "Correspondent banking and account relationships",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Structure of nostro/vostro relationships in correspondent banking."
      },
      {
        "label": "Cross-border payments and messaging",
        "url": "https://www.swift.com/about-us/discover-swift",
        "publisher": "SWIFT",
        "kind": "operator"
      }
    ],
    "railFamily": "cross-border",
    "jurisdiction": [
      "global"
    ],
    "seeIt": {
      "seedId": "wire-fx",
      "select": { "kind": "edge", "id": "e5" },
      "label": "opens the CAD to USD wire with the nostro debit leg selected"
    }
  },
  {
    "slug": "stablecoin",
    "term": "Stablecoin",
    "aka": [
      "fiat-backed token",
      "digital dollar",
      "USD stablecoin"
    ],
    "short": "A digital token that aims to track a reference value (often the US dollar); it's a claim on an issuer, not a bank deposit.",
    "plain": "A stablecoin is a token on a blockchain designed to hold a steady value, typically one token aiming to equal one US dollar. The most common type is backed by reserves the issuer holds (cash and short-term government securities), and the token is effectively an IOU you can redeem with the issuer. Holding a stablecoin is not the same as holding a bank deposit: it isn't a balance at your bank, and it generally isn't covered by deposit insurance. Its stability and redeemability depend on the issuer's reserves and on it actually paying out at par.",
    "inAFlow": "In an on-chain payment, the stablecoin itself is the money leg, sending the token typically transfers value directly between wallets on-chain, without a separate bank settlement leg behind it. Getting in and out of the banking system happens at the edges, through an on-ramp (fiat to token) and an off-ramp (token back to fiat).",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "A stablecoin is just dollars in a digital wallet, like a bank balance.",
        "reality": "It's a token representing a claim on an issuer, not a bank deposit. It typically carries no deposit insurance, and its value holds only as long as the issuer can redeem it at par from its reserves."
      },
      {
        "claim": "A stablecoin always equals exactly one dollar.",
        "reality": "It aims to, but the peg is a design goal, not a guarantee. The price can drift from par, and stability depends on the quality and liquidity of the issuer's reserves."
      }
    ],
    "related": [
      "on-ramp",
      "off-ramp"
    ],
    "guides": [
      "stablecoin-on-off-ramp"
    ],
    "sources": [
      {
        "label": "Stablecoins and the financial system",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Analysis of stablecoin mechanics, backing, and risks."
      },
      {
        "label": "USDC reserves and mechanics",
        "url": "https://www.circle.com/transparency",
        "publisher": "Circle",
        "kind": "vendor",
        "note": "Issuer documentation on how a fiat-backed stablecoin is reserved and redeemed."
      }
    ],
    "railFamily": "stablecoin",
    "jurisdiction": [
      "global"
    ],
    "seeIt": {
      "seedId": "usdc-onchain-payment",
      "label": "opens the wallet to wallet USDC flow, where the token is the money"
    }
  },
  {
    "slug": "on-ramp",
    "term": "On-Ramp",
    "aka": [
      "fiat on-ramp",
      "buy crypto",
      "cash-in"
    ],
    "short": "Converting regular bank or card money (fiat) into crypto or a stablecoin.",
    "plain": "An on-ramp is the entry point from the traditional financial system into crypto. You pay with fiat, a bank transfer, debit card, or similar, and receive crypto or a stablecoin in a wallet. The on-ramp provider takes your fiat and either mints new tokens or hands you tokens from its own holdings. Behind the scenes this is two distinct steps: a normal fiat payment moving money into the provider, and a separate on-chain transfer of tokens out to you.",
    "inAFlow": "An on-ramp sits at the boundary of a stablecoin or crypto flow. The fiat money leg uses a familiar rail, a card authorization and settlement, or a bank transfer, to move funds to the provider. Once that fiat is received, the provider sends tokens to your wallet on-chain, which is a separate money leg on a different rail.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "Buying crypto is one instant step.",
        "reality": "It's typically two legs: a fiat payment into the provider on a bank or card rail, then a separate on-chain transfer of tokens to your wallet. Each can clear and settle on its own timeline."
      },
      {
        "claim": "The crypto network turns my dollars into tokens.",
        "reality": "A blockchain doesn't touch your bank money. A provider (the on-ramp) receives your fiat through normal banking rails and then issues or sends tokens to you on-chain."
      }
    ],
    "related": [
      "off-ramp",
      "stablecoin"
    ],
    "guides": [
      "stablecoin-on-off-ramp",
      "wallet-top-up"
    ],
    "sources": [
      {
        "label": "Stablecoin and crypto-asset arrangements",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Context on fiat-to-crypto conversion within payment arrangements."
      },
      {
        "label": "Converting fiat to USDC",
        "url": "https://www.circle.com/transparency",
        "publisher": "Circle",
        "kind": "vendor",
        "note": "Issuer view of minting and acquiring stablecoins with fiat."
      }
    ],
    "railFamily": "stablecoin",
    "jurisdiction": [
      "global"
    ],
    "seeIt": {
      "seedId": "usdc-cross-border-payout",
      "select": { "kind": "node", "id": "onramp" },
      "label": "opens the USDC payout flow with the on-ramp picked out"
    }
  },
  {
    "slug": "off-ramp",
    "term": "Off-Ramp",
    "aka": [
      "fiat off-ramp",
      "cash-out",
      "redeem to bank"
    ],
    "short": "Converting crypto or a stablecoin back into fiat that lands in a bank account.",
    "plain": "An off-ramp is the exit from crypto back into the traditional financial system. You send crypto or a stablecoin to a provider, and it pays you the equivalent fiat into a bank account. The provider either redeems the tokens with the issuer or takes them into its own holdings, then sends you money over a bank rail. As with an on-ramp, this is two distinct steps: an on-chain transfer of tokens in, and a separate fiat payout to your bank.",
    "inAFlow": "An off-ramp sits at the far boundary of a stablecoin or crypto flow. First the tokens move on-chain to the provider, one money leg on the crypto rail. Then the provider initiates a fiat payout, typically a bank transfer, which clears and settles on a banking rail to land funds in the recipient's account. The two legs are independent and may not be simultaneous.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "Cashing out crypto puts dollars in my bank instantly.",
        "reality": "The on-chain token transfer and the fiat bank payout are separate legs. The bank payout still rides a normal rail and settles on that rail's timeline, which may be later than the token transfer."
      },
      {
        "claim": "The blockchain deposits the money in my bank.",
        "reality": "A blockchain can't credit a bank account. An off-ramp provider receives your tokens on-chain and then makes a separate fiat payment to your bank through banking rails."
      }
    ],
    "related": [
      "on-ramp",
      "stablecoin"
    ],
    "guides": [
      "stablecoin-on-off-ramp"
    ],
    "sources": [
      {
        "label": "Stablecoin and crypto-asset arrangements",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Context on crypto-to-fiat conversion within payment arrangements."
      },
      {
        "label": "Redeeming USDC for fiat",
        "url": "https://www.circle.com/transparency",
        "publisher": "Circle",
        "kind": "vendor",
        "note": "Issuer view of redeeming stablecoins back to fiat."
      }
    ],
    "railFamily": "stablecoin",
    "jurisdiction": [
      "global"
    ],
    "seeIt": {
      "seedId": "usdc-cross-border-payout",
      "select": { "kind": "node", "id": "offramp" },
      "label": "opens the USDC payout flow with the off-ramp picked out"
    }
  },
  {
    "slug": "payment-gateway",
    "term": "Payment Gateway",
    "aka": [
      "payment page",
      "checkout gateway",
      "hosted checkout"
    ],
    "short": "The tech front door at checkout that captures payment details and hands them to the processor or acquirer.",
    "plain": "A payment gateway is the software that sits at the checkout and captures the customer's card or payment details, then securely passes them onward to the processor and acquirer for authorization. Think of it as the front door of a payment: it collects the information and routes the request, but it does not move the money itself. Gateways usually handle encryption and tokenization so the raw card number is protected in transit. In many setups the gateway and the processor are bundled by the same provider, which is why people often blur the two.",
    "inAFlow": "The gateway is a message leg, not a money leg. At checkout it captures the card details and forwards an authorization request toward the processor and acquirer; the actual funds move later during settlement, and banks move that money, not the gateway.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "The payment gateway charges the card and moves the money.",
        "reality": "The gateway only captures and routes the payment message. Authorization is decided by the issuer, and the money is moved by banks during clearing and settlement."
      },
      {
        "claim": "A gateway and a processor are the same thing.",
        "reality": "They are different roles that are often bundled. The gateway captures and forwards details at checkout; the processor connects to the card networks and handles the authorization and clearing traffic. One vendor may provide both."
      }
    ],
    "related": [
      "processor",
      "acquirer",
      "psp",
      "tokenization",
      "authorization"
    ],
    "guides": [
      "card-tap-to-settlement",
      "recurring-billing-explained"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network rules governing how card transactions are accepted and routed."
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "Roles in the card acceptance chain."
      },
      {
        "label": "EMVCo tokenization and 3DS specifications",
        "url": "https://www.emvco.com/emv-technologies/3d-secure/",
        "publisher": "EMVCo",
        "kind": "operator",
        "note": "Standards a gateway uses to protect card data at checkout."
      }
    ],
    "railFamily": "card",
    "jurisdiction": []
  },
  {
    "slug": "psp",
    "term": "Payment Service Provider (PSP)",
    "aka": [
      "payment aggregator",
      "payment facilitator",
      "payfac"
    ],
    "short": "An aggregator that typically lets a merchant accept payments under the PSP's own acquiring relationships, rather than setting up its own acquirer.",
    "plain": "A payment service provider, or PSP, is a company that lets many merchants accept payments under its umbrella, using the PSP's own acquiring relationships and bank connections. In the common Stripe or Adyen pattern, a merchant signs up with the PSP and starts accepting cards quickly, without negotiating its own direct acquirer contract. The PSP handles the gateway, processing, onboarding, and payout, and bundles merchants together (a model often called payment facilitation or aggregation). The trade-off is less direct control and a layer of the PSP's pricing in exchange for speed and simplicity.",
    "inAFlow": "The PSP is a party in the flow, not a money rail. It sits between the merchant and the acquiring bank, capturing and routing the payment message and then paying out the merchant; the underlying money still moves through banks and the card networks' settlement process.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "Using a PSP means you have your own acquiring relationship.",
        "reality": "In the typical aggregator model the merchant accepts payments under the PSP's acquiring relationships, not its own. That is what makes onboarding fast, but it means the PSP, not the merchant, holds the direct bank contract."
      },
      {
        "claim": "A PSP is just a payment gateway.",
        "reality": "A gateway is the checkout tech that captures details. A PSP usually bundles the gateway plus processing, merchant onboarding, risk, and payout under its own acquiring umbrella, so it is a broader role."
      }
    ],
    "related": [
      "acquirer",
      "processor",
      "payment-gateway",
      "merchant-of-record"
    ],
    "guides": [
      "card-tap-to-settlement",
      "marketplace-payouts"
    ],
    "sources": [
      {
        "label": "Visa payment facilitator model",
        "url": "https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/visa-payment-facilitator-model.pdf",
        "publisher": "Visa",
        "kind": "operator",
        "note": "How aggregators onboard sub-merchants under their acquiring relationship."
      },
      {
        "label": "Mastercard acceptance and facilitator rules",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "Network rules for payment facilitators and sub-merchants."
      }
    ],
    "railFamily": "card",
    "jurisdiction": [],
    "seeIt": {
      "seedId": "payfac-us",
      "select": { "kind": "node", "id": "payfac" },
      "label": "opens a US payfac example, one kind of PSP, with the facilitator picked out"
    }
  },
  {
    "slug": "merchant-of-record",
    "term": "Merchant of Record (MoR)",
    "aka": [
      "MoR",
      "seller of record",
      "reseller of record"
    ],
    "short": "The legal seller on the transaction, which carries the tax, compliance, and chargeback liability for the sale.",
    "plain": "The merchant of record is the entity that is legally the seller in a transaction: the name the customer sees on the statement, and the party responsible for collecting and remitting sales tax or VAT, handling refunds, and absorbing chargeback liability. A business can be its own merchant of record, or it can use a provider that becomes the merchant of record on its behalf (common for global software and digital goods sales). This differs from a payfac or agent, which processes payments for you but does not take on legal ownership of the sale. Choosing a merchant-of-record provider shifts a lot of tax and dispute burden onto that provider, at the cost of margin and control.",
    "inAFlow": "The merchant of record is a party, defining who owns the sale rather than how money moves. In a flow it is the legal counterparty to the buyer, so chargebacks, refunds, and tax obligations route to it, even though the funds themselves still move through the acquirer and banks during settlement.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "The merchant of record is just whoever processes the payment.",
        "reality": "Processing moves the transaction; being merchant of record means being the legal seller. The merchant of record owns the tax, refund, and chargeback liability, which a pure payfac or processor does not take on."
      },
      {
        "claim": "If I sell globally, I am automatically the merchant of record everywhere.",
        "reality": "You are the merchant of record only where you act as the legal seller. Many businesses use a merchant-of-record provider precisely so that provider, not them, handles cross-border tax registration and liability. This is educational, not tax or legal advice."
      }
    ],
    "related": [
      "psp",
      "acquirer",
      "chargeback",
      "reconciliation"
    ],
    "guides": [
      "marketplace-payouts",
      "card-chargebacks",
      "how-a-refund-works"
    ],
    "sources": [
      {
        "label": "Visa dispute resolution",
        "url": "https://www.visa.com/en-us/support/business/dispute-resolution",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Liability that attaches to the seller in disputes."
      },
      {
        "label": "Mastercard dispute management",
        "url": "https://www.mastercard.com/us/en/business/cybersecurity-fraud-prevention/dispute-management.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "How dispute liability is assigned to the merchant."
      }
    ],
    "railFamily": "card",
    "jurisdiction": []
  },
  {
    "slug": "tokenization",
    "term": "Tokenization",
    "aka": [
      "network tokenization",
      "card tokenization",
      "PAN tokenization"
    ],
    "short": "Replacing a card or account number with a stand-in token so the real number is never stored or passed around.",
    "plain": "Tokenization swaps a sensitive number, like a card's 16 digits, for a surrogate value called a token that has no value if stolen. The real number is kept in a secure vault, and merchants, gateways, and apps handle only the token. This shrinks the amount of raw card data flowing through systems, which reduces both breach risk and compliance scope. Network tokenization (offered through schemes like Visa and Mastercard via EMVCo standards) also lets tokens update automatically when a card is reissued, so saved-card and wallet payments keep working.",
    "inAFlow": "Tokenization is a message-layer protection, not a money movement. It changes what data travels through the authorization and storage steps (a token instead of the real number); the actual funds still move through banks during clearing and settlement, unaffected by the swap.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "Tokenization is the same as encryption.",
        "reality": "Encryption scrambles data that can be unscrambled with a key. Tokenization replaces the number with an unrelated stand-in that has no mathematical link to the original, so a stolen token cannot be reversed into a card number."
      },
      {
        "claim": "A token can be used anywhere, like a real card number.",
        "reality": "Tokens are typically restricted, often to a specific merchant, device, or use. A token captured in one place generally cannot be replayed elsewhere, which is a core part of why it reduces fraud value."
      }
    ],
    "related": [
      "payment-gateway",
      "authorization",
      "three-d-secure",
      "psp"
    ],
    "guides": [
      "card-tap-to-settlement",
      "wallet-top-up",
      "recurring-billing-explained"
    ],
    "sources": [
      {
        "label": "EMVCo Payment Tokenisation specifications",
        "url": "https://www.emvco.com/emv-technologies/payment-tokenisation/",
        "publisher": "EMVCo",
        "kind": "operator",
        "note": "The cross-network standard for payment tokens."
      },
      {
        "label": "Visa Token Service",
        "url": "https://usa.visa.com/products/visa-token-service.html",
        "publisher": "Visa",
        "kind": "operator",
        "note": "Network tokenization for saved cards and wallets."
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator",
        "note": "Network rules covering tokenized transaction processing."
      }
    ],
    "railFamily": "card",
    "jurisdiction": []
  },
  {
    "slug": "three-d-secure",
    "term": "3-D Secure (3DS)",
    "aka": [
      "3DS",
      "Verified by Visa",
      "Mastercard Identity Check",
      "SCA step-up",
      "EMV 3DS"
    ],
    "short": "An extra authentication step on a card payment that helps confirm the real cardholder is making the purchase and can shift fraud liability away from the merchant.",
    "plain": "3-D Secure is a check that runs during an online card payment, usually before the bank decides whether to approve it. The shopper may get a prompt from their bank (a push notification in the bank app, a one-time code, or a face or fingerprint scan) to prove they are the genuine cardholder. This is a message leg, not a money leg: nothing is being paid in this step, the parties are just exchanging proof of identity. When 3DS is used and the cardholder is authenticated, liability for certain fraud can shift from the merchant to the card issuer, which is the main reason merchants enable it. In Europe, a rule called Strong Customer Authentication (SCA) makes this kind of step mandatory for many online payments; elsewhere it is often optional and risk-based.",
    "inAFlow": "It sits inside the authorization step of a card payment, before the issuer approves or declines. The merchant or gateway routes an authentication request through the card network's 3DS service to the issuer; the issuer challenges the cardholder if needed and returns a result. Only after that does the normal authorization (and later clearing and settlement, when banks actually move money) proceed.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "3-D Secure charges the card.",
        "reality": "It only authenticates the cardholder. No money moves during 3DS. The actual charge happens in authorization and later settlement, which are separate steps handled by the banks."
      },
      {
        "claim": "Passing 3DS guarantees the merchant can never lose a dispute.",
        "reality": "A successful 3DS check typically shifts liability for certain fraud-type chargebacks to the issuer, but disputes over non-delivery, quality, or other reasons can still come back to the merchant."
      }
    ],
    "related": [
      "authorization",
      "tokenization",
      "issuer",
      "chargeback",
      "kyc-aml"
    ],
    "guides": [
      "card-tap-to-settlement",
      "card-chargebacks",
      "recurring-billing-explained"
    ],
    "sources": [
      {
        "label": "EMVCo 3-D Secure specifications",
        "url": "https://www.emvco.com/emv-technologies/3d-secure/",
        "publisher": "EMVCo",
        "kind": "operator",
        "note": "Maintains the EMV 3DS specification used across card networks."
      },
      {
        "label": "Visa Secure (3-D Secure)",
        "url": "https://usa.visa.com/products/visa-secure.html",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "Mastercard rules and standards",
        "url": "https://www.mastercard.com/us/en/business/support/rules.html",
        "publisher": "Mastercard",
        "kind": "operator"
      }
    ],
    "railFamily": "card",
    "jurisdiction": [
      "EU",
      "global"
    ]
  },
  {
    "slug": "kyc-aml",
    "term": "KYC / AML",
    "aka": [
      "know your customer",
      "anti-money-laundering",
      "customer due diligence",
      "CDD",
      "identity verification"
    ],
    "short": "The identity checks and ongoing monitoring a regulated financial party must run to confirm who its customers are and to detect suspicious activity.",
    "plain": "KYC (know your customer) is the process of verifying a customer's identity before and during a financial relationship: collecting and checking things like name, address, date of birth, and identity documents. AML (anti-money-laundering) is the broader set of obligations to monitor activity and report transactions that look like money laundering or other financial crime. These are message-and-control layers, not money movement: they decide whether an account opens, stays open, or gets frozen, and they sit around the edges of nearly every flow. Banks, payment companies, and program managers all carry some version of these duties, with the exact rules set by each country's regulators and law.",
    "inAFlow": "KYC usually happens at onboarding, before a party can send or receive funds, and AML monitoring runs continuously in the background on the flows that follow. In a typical sponsored program, the program manager and its sponsor bank share responsibility for verifying customers and watching transactions. None of this moves money itself; it gates and watches the money legs that the banks execute.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "KYC and AML are the same thing.",
        "reality": "KYC is one part of AML. KYC is mainly about verifying identity at onboarding; AML is the wider program of ongoing monitoring, record-keeping, and reporting that KYC feeds into."
      },
      {
        "claim": "Only banks have to do KYC and AML.",
        "reality": "Many non-bank players (payment processors, program managers, crypto on-ramps and off-ramps) carry obligations too, though who is ultimately responsible depends on the structure and the jurisdiction."
      }
    ],
    "related": [
      "program-manager",
      "sponsor-bank",
      "fbo-account",
      "escrow",
      "three-d-secure",
      "merchant-of-record"
    ],
    "guides": [
      "fbo-account-explained",
      "marketplace-payouts",
      "wallet-top-up",
      "stablecoin-on-off-ramp"
    ],
    "sources": [
      {
        "label": "FDIC compliance and consumer resources",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority"
      },
      {
        "label": "Consumer Financial Protection Bureau",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority"
      },
      {
        "label": "BIS / CPMI on financial market integrity",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "Bank for International Settlements",
        "kind": "authority"
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "global",
      "CA",
      "US",
      "EU"
    ]
  },
  {
    "slug": "escrow",
    "term": "Escrow",
    "aka": [
      "escrow account",
      "held funds",
      "conditional holding"
    ],
    "short": "Money held by a neutral third party and released only once agreed conditions are met, so neither side has to trust the other directly.",
    "plain": "Escrow is an arrangement where a trusted middle party holds funds until specific conditions are satisfied, then releases them to the right recipient. It lets a buyer and seller transact without either having to go first on trust: the payer's money is real and set aside, but the payee cannot touch it until, for example, goods ship or a milestone is signed off. This is a party-and-control concept layered on top of ordinary money movement; the funds still sit in a real bank account and still move via normal rails, but a rulebook governs when. Marketplaces and platforms often use escrow-like holds so they can pay out sellers only after a buyer is satisfied.",
    "inAFlow": "A payer funds the escrow (a real money leg into a holding account), the holder confirms the release condition is met, then the holder pays out to the payee (a second money leg). The hold itself is the control step in between. In marketplace setups the platform may hold funds in an FBO-style account and release payouts on its own schedule rather than instantly.",
    "flowLayer": "party",
    "misconceptions": [
      {
        "claim": "Escrow means the money sits frozen and untouchable somewhere special.",
        "reality": "The funds are usually in an ordinary bank account controlled by the escrow holder. What makes it escrow is the rules on when and to whom it can be released, not a special vault."
      },
      {
        "claim": "Any platform holding your money is true legal escrow.",
        "reality": "Many platforms use escrow-like holds that are not formal escrow. Whether something is legally escrow depends on the structure and local rules, which affects who is protected if the holder fails."
      }
    ],
    "related": [
      "fbo-account",
      "float",
      "settlement",
      "merchant-of-record",
      "reconciliation",
      "kyc-aml"
    ],
    "guides": [
      "marketplace-payouts",
      "fbo-account-explained",
      "how-a-refund-works"
    ],
    "sources": [
      {
        "label": "Consumer Financial Protection Bureau",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority"
      },
      {
        "label": "FDIC deposit and account guidance",
        "url": "https://www.fdic.gov/financial-institution-employees-guide-deposit-insurance/pass-through-deposit-insurance-coverage",
        "publisher": "FDIC",
        "kind": "authority"
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "global"
    ]
  },
  {
    "slug": "reconciliation",
    "term": "Reconciliation",
    "aka": [
      "recon",
      "matching",
      "settlement reconciliation"
    ],
    "short": "Matching your own records against what actually settled at the bank, so the money that moved and the messages about it agree.",
    "plain": "Reconciliation is the back-office practice of comparing what you think happened (your internal ledger, order records, or expected payouts) against what the bank and networks report actually settled. The goal is to confirm that every money leg lines up with its message leg, and to catch the gaps: a payment that authorized but never cleared, a fee that came out differently than expected, a refund that did not land. Because authorization, clearing, and settlement happen at different times and often in batches, records can drift apart temporarily, and reconciliation is how you prove they came back together. It is the quiet step that makes a flow trustworthy rather than just plausible.",
    "inAFlow": "It typically runs after settlement, when the bank or processor sends statements and settlement files. The operator matches each expected transaction against the settled record, flags mismatches (called exceptions or breaks), and investigates them. Good reconciliation closes the loop on a flow: the diagram says money should have moved a certain way, and recon is the evidence that it did.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "If a payment was approved, reconciliation is unnecessary.",
        "reality": "Approval (authorization) is only a promise. Money moves later at settlement, and amounts, fees, timing, and reversals can all differ. Reconciliation confirms what truly settled."
      },
      {
        "claim": "Reconciliation moves or fixes money.",
        "reality": "It is a matching and checking step, a message-layer activity. It surfaces discrepancies, but correcting them still requires a real money leg such as an adjustment, refund, or repayment handled by the banks."
      }
    ],
    "related": [
      "settlement",
      "clearing",
      "float",
      "fbo-account",
      "escrow",
      "interchange",
      "chargeback"
    ],
    "guides": [
      "card-tap-to-settlement",
      "marketplace-payouts",
      "fbo-account-explained",
      "payroll-via-ach"
    ],
    "sources": [
      {
        "label": "Visa Core Rules and Visa Product and Service Rules",
        "url": "https://www.visa.com/en-us/support/visa-rules",
        "publisher": "Visa",
        "kind": "operator"
      },
      {
        "label": "NACHA ACH operating rules",
        "url": "https://www.nacha.org/rules",
        "publisher": "NACHA",
        "kind": "authority"
      },
      {
        "label": "Payments Canada clearing and settlement",
        "url": "https://www.payments.ca/systems-services/payment-systems",
        "publisher": "Payments Canada",
        "kind": "authority"
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "global"
    ]
  },
  {
    "slug": "float",
    "term": "Float",
    "aka": [
      "value float",
      "funds in transit",
      "availability gap"
    ],
    "short": "The gap between when money leaves one party and when it becomes usable by another.",
    "plain": "Float is value in transit: money has left the payer's account but is not yet usable by the payee, or it sits in an in-between account during processing. It exists because most payment systems clear (agree on who owes what) before they settle (move the actual funds), so there is a window where the money is committed but not landed. Whoever holds funds during that window may earn interest on them, which is one reason settlement timing matters. Float is normal plumbing, not a trick, but it shapes when a recipient can actually spend what they were sent.",
    "inAFlow": "On a diagram, float is the time and the holding point between the money leg leaving the payer and the same money becoming available to the payee, often parked in a bank or intermediary account while clearing finishes.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "If a payment shows as sent, the money is already in the other account.",
        "reality": "Sent usually means the instruction went out and clearing has begun. The actual funds may settle hours or days later, and float is exactly that gap. Instant rails shrink float toward zero but most batch rails still have it."
      },
      {
        "claim": "Float is money someone is illegally holding onto.",
        "reality": "Float is an ordinary feature of systems that clear before they settle. It is governed by network rules and account terms, not inherently improper, though who earns interest on it is a real commercial question."
      }
    ],
    "related": [
      "settlement",
      "clearing",
      "reconciliation",
      "fbo-account",
      "escrow",
      "rtgs"
    ],
    "guides": [
      "ach-credit-vs-debit",
      "cross-border-wire",
      "marketplace-payouts",
      "instant-payments-explained"
    ],
    "sources": [
      {
        "label": "Understanding payment clearing and settlement",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Glossary and principles on clearing vs settlement timing, which is where float lives."
      },
      {
        "label": "Core payment systems and settlement in Canada",
        "url": "https://www.payments.ca/systems-services/payment-systems",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "How Canadian rails clear and settle, including settlement windows."
      },
      {
        "label": "Bank of Canada on settlement and finality",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/",
        "publisher": "Bank of Canada",
        "kind": "authority"
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "global"
    ]
  },
  {
    "slug": "rtgs",
    "term": "RTGS (Real-Time Gross Settlement)",
    "aka": [
      "real-time gross settlement",
      "high-value payment system",
      "Lynx",
      "Fedwire",
      "T2",
      "TARGET2"
    ],
    "short": "A central-bank system that settles large payments one by one, with final funds moving immediately.",
    "plain": "RTGS stands for real-time gross settlement. Gross means each payment settles individually rather than being bundled and netted with others, and real-time means it settles continuously through the day rather than in an end-of-day batch. Because the central bank moves actual reserve funds for each payment, settlement is final and irrevocable once done, which is why RTGS is used for high-value and time-critical transfers. Examples include Lynx in Canada, Fedwire in the United States, and T2 (formerly TARGET2) in the euro area. These systems carry the money leg between banks, so a customer-facing wire typically rides on top of an RTGS settlement between the banks involved.",
    "inAFlow": "RTGS is the bottom money leg between banks: when a wire moves, the sending bank's reserves at the central bank go down and the receiving bank's go up, one payment at a time, with finality. Customer accounts are debited and credited around that core settlement.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "RTGS and instant consumer payments (like an e-transfer) are the same thing.",
        "reality": "They are different layers. Consumer instant rails settle small retail payments and often net positions between banks, while RTGS settles large interbank amounts gross, one by one. Instant rails frequently rely on an RTGS or central-bank settlement underneath to make funds final."
      },
      {
        "claim": "The RTGS network sends the money to the recipient's bank account.",
        "reality": "RTGS settles funds between banks' accounts at the central bank. The recipient's own bank then credits the customer. The system moves interbank value and finality, not the final retail deposit itself."
      }
    ],
    "related": [
      "settlement",
      "correspondent-bank",
      "nostro-vostro",
      "iso-20022",
      "float",
      "remittance"
    ],
    "guides": [
      "cross-border-wire",
      "instant-payments-explained"
    ],
    "sources": [
      {
        "label": "Lynx high-value payment system",
        "url": "https://www.payments.ca/systems-services/payment-systems",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "Canada's RTGS system for large-value, time-critical payments."
      },
      {
        "label": "Fedwire Funds Service",
        "url": "https://www.frbservices.org/financial-services/wires",
        "publisher": "Federal Reserve Financial Services",
        "kind": "operator",
        "note": "U.S. real-time gross settlement service for the money leg of wires."
      },
      {
        "label": "BIS / CPMI on real-time gross settlement",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Standards and definitions for RTGS and settlement finality."
      }
    ],
    "railFamily": "wire",
    "jurisdiction": [
      "CA",
      "US",
      "EU",
      "global"
    ],
    "seeIt": {
      "seedId": "lynx-wire-ca",
      "select": { "kind": "edge", "id": "e3" },
      "label": "opens Lynx, Canada's RTGS, with the gross settlement leg selected"
    }
  },
  {
    "slug": "iso-20022",
    "term": "ISO 20022",
    "aka": [
      "ISO20022",
      "structured payment messaging",
      "pacs / pain / camt messages"
    ],
    "short": "A shared, structured messaging standard that lets payment systems carry richer, well-labeled data.",
    "plain": "ISO 20022 is an international standard for the format of payment messages, the instructions banks and systems send to each other. Older formats packed limited data into rigid fields, while ISO 20022 uses structured, clearly labeled fields that can carry much more detail, such as full party names, addresses, and which invoice a payment relates to. This is a message-layer standard: it shapes how instructions are described and routed, not how the actual funds move. Many modern and modernizing rails have adopted it, including high-value and instant systems, because better-structured data improves automation, compliance screening, and reconciliation.",
    "inAFlow": "ISO 20022 lives on the message legs of a diagram, the instructions and confirmations passing between banks and systems. The money leg still settles separately on the underlying rail; ISO 20022 just makes the accompanying instruction richer and easier to match to records.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "ISO 20022 is a payment network or a new way to move money.",
        "reality": "It is a messaging standard, a common language for the instructions, not a rail. Networks and central-bank systems still do the clearing and settlement. ISO 20022 just standardizes the data those messages carry."
      },
      {
        "claim": "Adopting ISO 20022 makes payments instant.",
        "reality": "Speed depends on the rail's settlement design, not the message format. ISO 20022 improves the quality and structure of data; an instruction can be richly described and still settle on a batch or T+1 to T+2 schedule."
      }
    ],
    "related": [
      "clearing",
      "reconciliation",
      "rtgs",
      "correspondent-bank",
      "remittance",
      "settlement"
    ],
    "guides": [
      "cross-border-wire",
      "instant-payments-explained"
    ],
    "sources": [
      {
        "label": "ISO 20022 standard and adoption resources",
        "url": "https://www.swift.com/about-us/discover-swift",
        "publisher": "SWIFT",
        "kind": "operator",
        "note": "Registration authority context and migration guidance for ISO 20022 messaging."
      },
      {
        "label": "ISO 20022 in Canadian payment modernization",
        "url": "https://www.payments.ca/systems-services/payment-systems",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "How Canadian rails adopt ISO 20022 for richer payment data."
      },
      {
        "label": "BIS / CPMI on messaging standards and harmonization",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority"
      }
    ],
    "railFamily": "bank",
    "jurisdiction": [
      "global"
    ],
    "seeIt": {
      "seedId": "sepa-instant-eu",
      "select": { "kind": "edge", "id": "e2" },
      "label": "opens a SEPA instant example with its pacs.008 message leg selected"
    }
  },
  {
    "slug": "remittance",
    "term": "Remittance",
    "aka": [
      "cross-border P2P transfer",
      "money transfer",
      "worker remittance"
    ],
    "short": "A cross-border transfer of money between people, often a worker sending funds home to family.",
    "plain": "A remittance is money sent across borders from one person to another, most commonly a worker abroad sending support to family in their home country. The funds usually pass through one or more intermediaries (a money transfer provider, banks, and sometimes a local payout partner) before the recipient can collect cash or receive a deposit. Because two currencies and multiple institutions are involved, remittances carry a foreign-exchange conversion and fees, and the recipient gets the amount after those costs. The word remittance can also mean the explanatory detail attached to a business payment, but in a flow-of-funds context it typically means this cross-border person-to-person transfer.",
    "inAFlow": "On a diagram, a remittance is a money leg that crosses a currency boundary: the sender funds a provider in one currency, value is converted, and a payout partner or bank delivers local currency to the recipient. Message legs (instructions and compliance checks) run alongside, and an FX rate plus fees sit at the conversion point.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "The recipient gets the exact amount the sender entered.",
        "reality": "Remittances usually involve a currency conversion and fees, so the payout is the sent amount adjusted by the exchange rate and charges. The advertised rate and the rate actually applied can differ, which affects the final amount delivered."
      },
      {
        "claim": "The money flies directly from sender to recipient in one hop.",
        "reality": "Most remittances move through intermediaries: a transfer provider, correspondent banks, and often a local payout partner. The recipient experiences one transfer, but several institutions and a settlement chain sit behind it."
      }
    ],
    "related": [
      "correspondent-bank",
      "nostro-vostro",
      "on-ramp",
      "off-ramp",
      "stablecoin",
      "kyc-aml",
      "float",
      "rtgs"
    ],
    "guides": [
      "remittance-explained",
      "cross-border-wire",
      "stablecoin-on-off-ramp"
    ],
    "sources": [
      {
        "label": "BIS / CPMI on cross-border payments and remittances",
        "url": "https://www.bis.org/cpmi/about/overview.htm",
        "publisher": "BIS / CPMI",
        "kind": "authority",
        "note": "Work program on improving cost and speed of cross-border and remittance flows."
      },
      {
        "label": "Consumer protections for international money transfers (remittance rule)",
        "url": "https://www.consumerfinance.gov/rules-policy/regulations/1005/",
        "publisher": "CFPB",
        "kind": "authority",
        "note": "U.S. disclosure rules on fees and exchange rates for remittance transfers; illustrative of consumer safeguards."
      },
      {
        "label": "SWIFT on cross-border payment messaging",
        "url": "https://www.swift.com/about-us/discover-swift",
        "publisher": "SWIFT",
        "kind": "operator",
        "note": "How instructions for cross-border transfers are routed between institutions."
      }
    ],
    "railFamily": "cross-border",
    "jurisdiction": [
      "global"
    ]
  },
  {
    "slug": "pad",
    "term": "Pre-Authorized Debit (PAD)",
    "aka": [
      "pre-authorized debit",
      "PAD agreement",
      "pre-authorized payment"
    ],
    "short": "A Canadian pull payment: with a signed agreement, a biller debits your bank account over the EFT batch rail under Payments Canada Rule H1.",
    "plain": "A pre-authorized debit is how a Canadian biller pulls money from your bank account: you sign a PAD agreement (on paper or electronically), and on each due date the biller's bank originates a debit that is exchanged through the ACSS batch system and posted against your account. Payments Canada Rule H1 governs the arrangement and defines four categories: personal, business, cash management, and funds transfer PADs. If a debit is dishonoured (say, for insufficient funds) it returns through the same system, and a personal payor who spots a debit that was never authorized or does not match the agreement can claim reimbursement from their own bank for up to 90 calendar days after the withdrawal; business claims get a shorter window. The mechanics rhyme with a US ACH debit, but the rulebook is different: Rule H1 and Payments Canada standards apply, not Nacha's rules and return codes.",
    "inAFlow": "The PAD agreement and the debit file are message legs: the biller submits an AFT debit through its bank, and the item is exchanged through ACSS to your bank. The money leg is your account being debited on the due date, with the banks settling their net positions the next business day and the biller funded net. Returns, like an NSF item, are an exception leg back through the same rail.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "A PAD is basically card autopay.",
        "reality": "No card is involved. A PAD debits your bank account directly over Canada's batch EFT rail under Payments Canada Rule H1, while card autopay is a card network transaction with chargeback rights. Different rails, different dispute paths: a PAD dispute is a Rule H1 reimbursement claim through your own bank, not a chargeback."
      },
      {
        "claim": "Cancelling my PAD agreement cancels the bill.",
        "reality": "Cancelling stops the debits (the biller must act on your cancellation notice), but the underlying contract and anything you owe survive, so you still need another way to pay the biller. And if debits keep arriving after a proper cancellation, that becomes a reimbursement claim to your bank."
      }
    ],
    "related": [
      "eft-aft",
      "acss",
      "clearing",
      "settlement",
      "chargeback"
    ],
    "guides": [
      "eft-and-pads-explained"
    ],
    "sources": [
      {
        "label": "Rule H1, Pre-Authorized Debits (PADs)",
        "url": "https://www.payments.ca/sites/default/files/h1eng.pdf",
        "publisher": "Payments Canada",
        "kind": "authority",
        "note": "The rule behind PAD agreements, the four PAD categories, dishonoured items, and reimbursement claims."
      },
      {
        "label": "Pre-authorized debit consumer guide",
        "url": "https://www.payments.ca/payment-resources/support-guides/consumer-guides/pre-authorized-debit",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "PAD agreements, cancellation, and the 90 calendar day reimbursement window in plain language."
      },
      {
        "label": "ACH Network rules and roles",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "The US ACH debit counterpart: the same pull payment shape under a different rulebook and return framework."
      }
    ],
    "railFamily": "eft",
    "jurisdiction": [
      "CA"
    ],
    "seeIt": {
      "seedId": "pad-debit-ca",
      "select": { "kind": "edge", "id": "e3" },
      "label": "opens the Canadian pre-authorized debit example with the debit exchange leg selected"
    }
  },
  {
    "slug": "eft-aft",
    "term": "EFT / AFT File",
    "aka": [
      "EFT",
      "AFT",
      "Automated Funds Transfer",
      "electronic funds transfer (Canada)",
      "Standard 005 file",
      "direct deposit file"
    ],
    "short": "Canada's batch bank-to-bank files: credits like payroll and debits like PADs, formatted under CPA Standard 005 and cleared through ACSS.",
    "plain": "EFT (electronic funds transfer) is how most scheduled money moves between Canadian bank accounts: payroll and government direct deposits, vendor payments, and pre-authorized debits. The originator, an employer or a biller, hands its bank a file of entries in the format set by Payments Canada Standard 005, delivered through the Automated Funds Transfer (AFT) service, which is why the files are called AFT files. A credit entry pushes money out (a direct deposit); a debit entry pulls money in (a PAD). Items are exchanged between institutions in batches, cleared through ACSS, and typically post to the recipient's account the next business day. It is Canada's counterpart to US ACH, but a separate system with its own rules, file format, and return windows.",
    "inAFlow": "In a payroll run, the employer's AFT credit file to its bank is a message leg; the items exchange through ACSS to each employee's bank, which posts the credit. The money leg settles behind that: the banks' multilateral net positions settle the next business day across settlement accounts at the Bank of Canada.",
    "flowLayer": "message",
    "misconceptions": [
      {
        "claim": "EFT is just Canada's ACH, so ACH rules apply.",
        "reality": "The shape is the same, batch credits and debits between bank accounts, but nothing else transfers. Canadian EFT runs on Payments Canada rules and the Standard 005 file format, clears through ACSS, and settles at the Bank of Canada. Nacha's rules, SEC codes, and ACH return windows have no force in Canada."
      },
      {
        "claim": "An Interac e-Transfer is an EFT.",
        "reality": "In Canadian usage they are different rails. An e-Transfer is an alias addressed transfer that clears over Interac's platform in near real time; EFT/AFT is a scheduled batch file exchanged bank to bank through ACSS, typically posting next business day. Payroll, government benefits, and PADs ride EFT, not e-Transfer."
      }
    ],
    "related": [
      "pad",
      "acss",
      "clearing",
      "settlement",
      "odfi"
    ],
    "guides": [
      "eft-and-pads-explained"
    ],
    "sources": [
      {
        "label": "Standard 005, Standards for the Exchange of Financial Data on AFT Files",
        "url": "https://www.payments.ca/sites/default/files/standard005eng.pdf",
        "publisher": "Payments Canada",
        "kind": "authority",
        "note": "The file format behind Canadian batch credits and debits."
      },
      {
        "label": "Retail batch payment system (ACSS)",
        "url": "https://www.payments.ca/systems-services/payment-systems/retail-batch-payment-system",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "How batch items clear and settle the next business day at the Bank of Canada."
      },
      {
        "label": "ACH Network rules and roles",
        "url": "https://www.nacha.org/rules",
        "publisher": "Nacha",
        "kind": "authority",
        "note": "The US counterpart, for comparison; Canadian EFT does not run under these rules."
      }
    ],
    "railFamily": "eft",
    "jurisdiction": [
      "CA"
    ],
    "seeIt": {
      "seedId": "acss-eft-aft-ca",
      "select": { "kind": "edge", "id": "e2" },
      "label": "opens the Canadian EFT batch example with the AFT items exchange leg selected"
    }
  },
  {
    "slug": "acss",
    "term": "ACSS (Automated Clearing Settlement System)",
    "aka": [
      "Automated Clearing Settlement System",
      "retail batch clearing (Canada)",
      "ACSS/USBE"
    ],
    "short": "Payments Canada's retail batch system: the day's items net into one position per bank, settled next business day at the Bank of Canada.",
    "plain": "The ACSS is where Canada's everyday retail payment items clear: cheques, EFT credits and debits (payroll, direct deposits, PADs), bill payments, and point of sale debit. It does not settle payments one by one. Items are exchanged between direct clearers in batches, the system tallies each participant's multilateral net position, and those net positions settle the next business day in central bank money across settlement accounts at the Bank of Canada. That is deferred net settlement, the opposite of Lynx's real time gross model. The ACSS carries roughly 99 percent of the transaction volume across Payments Canada's systems but only about 13 percent of the value, and the Bank of Canada oversees it as a prominent payment system.",
    "inAFlow": "ACSS sits on the clearing layer between banks: batch items flow in and get tallied, not settled, so the diagram shows message legs through ACSS and a separate money leg the next business day, when each bank's net position settles across its account at the Bank of Canada.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "ACSS settles each payment as it clears.",
        "reality": "It is a deferred net system. Items are exchanged in batches and only each bank's overall net position settles, the next business day, at the Bank of Canada. The posting you see in an account and the interbank settlement are separate events on different clocks."
      },
      {
        "claim": "Everything in Canadian payments clears through ACSS.",
        "reality": "Interac e-Transfers clear over Interac's own platform and card network transactions clear through the networks; the banks' resulting obligations settle separately. ACSS's lanes are the retail batch traffic: cheques, EFT/AFT items like payroll and PADs, bill payments, and point of sale debit."
      }
    ],
    "related": [
      "eft-aft",
      "pad",
      "lynx",
      "clearing",
      "settlement"
    ],
    "guides": [
      "eft-and-pads-explained"
    ],
    "sources": [
      {
        "label": "Retail batch payment system (ACSS)",
        "url": "https://www.payments.ca/systems-services/payment-systems/retail-batch-payment-system",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "What ACSS clears, next business day settlement at the Bank of Canada, and the 99 percent volume / 13 percent value split."
      },
      {
        "label": "Oversight of designated clearing and settlement systems",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/oversight-designated-clearing-settlement-systems/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "ACSS designated as a prominent payment system; Lynx as systemically important."
      }
    ],
    "railFamily": "eft",
    "jurisdiction": [
      "CA"
    ],
    "seeIt": {
      "seedId": "acss-eft-aft-ca",
      "select": { "kind": "edge", "id": "e5" },
      "label": "opens the Canadian EFT batch example with the next-day net settlement leg selected"
    }
  },
  {
    "slug": "lynx",
    "term": "Lynx",
    "aka": [
      "Lynx RTGS",
      "Canada's high-value payment system",
      "LVTS (predecessor)"
    ],
    "short": "Canada's high-value RTGS: large, time-critical CAD payments settle one by one, immediately and irrevocably, in central bank money.",
    "plain": "Lynx is Canada's high-value payment system, operated by Payments Canada on the real-time gross settlement model: each payment settles individually, in real time, across participants' settlement accounts at the Bank of Canada, so funds are final and irrevocable the moment they settle. It replaced the LVTS in September 2021, uses ISO 20022 messaging with SWIFT as its message service provider, and is designated by the Bank of Canada as a systemically important payment system under the Payment Clearing and Settlement Act. Lynx is also a key mechanism the Bank of Canada uses to implement monetary policy, and it is the settlement backbone the other Canadian rails lean on: ACSS net positions settle across the same Bank of Canada accounts, and the coming RTR's settlement balances are funded and defunded through Lynx.",
    "inAFlow": "Lynx is the bottom money leg of a Canadian wire: the sending bank's settlement account at the Bank of Canada is debited and the receiving bank's is credited, one payment at a time, with finality. The customer's instruction and the ISO 20022 messages ride above that settlement core.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "Lynx is where Interac e-Transfers settle.",
        "reality": "Not individually. An e-Transfer clears over Interac's platform, and what later settles between the banks is their netted obligation, separate from the transfer you sent. Lynx itself settles individual high-value payments gross; your $50 e-Transfer never appears inside it as a Lynx payment."
      },
      {
        "claim": "A wire can be recalled if you sent it to the wrong place.",
        "reality": "Lynx settlement is final and irrevocable the moment it happens. Getting money back means asking the receiving bank and its customer to send a new payment the other way, a request, not a right."
      }
    ],
    "related": [
      "rtgs",
      "acss",
      "rtr",
      "settlement",
      "iso-20022"
    ],
    "sources": [
      {
        "label": "Lynx high-value payment system",
        "url": "https://www.payments.ca/systems-services/payment-systems/high-value-payment-system-lynx",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "RTGS model, real-time settlement finality, ISO 20022, and SWIFT as the message service provider."
      },
      {
        "label": "Lynx (Bank of Canada)",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/lynx/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "Replaced the LVTS in September 2021; designated systemically important; role in monetary policy."
      }
    ],
    "railFamily": "wire",
    "jurisdiction": [
      "CA"
    ],
    "seeIt": {
      "seedId": "lynx-wire-ca",
      "select": { "kind": "edge", "id": "e3" },
      "label": "opens Lynx, Canada's high-value wire, with the gross settlement leg selected"
    }
  },
  {
    "slug": "rtr",
    "term": "Real-Time Rail (RTR)",
    "aka": [
      "RTR",
      "Canada's real-time payment system",
      "real-time rail"
    ],
    "short": "Canada's instant payment system, still in delivery: real-time credit pushes settling in central bank money, launch targeted for Q4 2026.",
    "plain": "The Real-Time Rail is Payments Canada's coming instant rail: account to account credit pushes that clear and settle in real time, around the clock, every day of the year, carrying data-rich ISO 20022 messages, with settlement finality in central bank money across dedicated accounts at the Bank of Canada. As of mid 2026 it has not launched: the exchange component, built by Interac, was completed in 2023; the clearing and settlement component went into testing after the technical build finished in Q3 2025; and Payments Canada is targeting launch in Q4 2026, a date that has slipped before. The design includes a centralized fraud service from day one. Until it goes live, Canada's fast consumer transfers run on Interac e-Transfer and scheduled payments run on the EFT batch rail.",
    "inAFlow": "In the intended design, a credit push clears in real time over the RTR and each payment settles immediately in central bank money: the sending bank's RTR settlement balance at the Bank of Canada is debited, the receiving bank's is credited, and the recipient's bank makes funds available within seconds. Draw it as a design, not a production flow, until launch.",
    "flowLayer": "money",
    "misconceptions": [
      {
        "claim": "The RTR is live, e-Transfers already run on it.",
        "reality": "As of mid 2026 the RTR has not launched; Payments Canada targets Q4 2026 and the timeline has moved more than once. Interac e-Transfer is a separate service that runs today over Interac's own platform. Interac did build the RTR's exchange component, which is where the confusion comes from."
      },
      {
        "claim": "Mastercard's Vocalink is building the RTR's clearing and settlement.",
        "reality": "That was the original 2020 selection, but the program changed. Payments Canada now names CGI, IBM, and Interac as the vendor partners delivering the RTR's applications, infrastructure, and operations, and the clearing and settlement build proceeded with those partners."
      }
    ],
    "related": [
      "lynx",
      "acss",
      "eft-aft",
      "rtgs",
      "settlement"
    ],
    "sources": [
      {
        "label": "Real-Time Rail payment system",
        "url": "https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "Status and launch target (Q4 2026); instant, data-rich payments; testing under way since the Q3 2025 build."
      },
      {
        "label": "The Real-Time Rail: where are we now?",
        "url": "https://www.payments.ca/real-time-rail-where-are-we-now",
        "publisher": "Payments Canada",
        "kind": "operator",
        "note": "Delivery update: exchange component built in 2023; clearing and settlement build with CGI, IBM, and Interac; fraud utility from day one."
      },
      {
        "label": "Settlement account policies for Payments Canada payment systems",
        "url": "https://www.bankofcanada.ca/core-functions/financial-system/bank-canadas-settlement-account-policies-for-payments-canada-payment-systems/",
        "publisher": "Bank of Canada",
        "kind": "authority",
        "note": "Final settlement for Lynx, ACSS, and the RTR occurs across settlement accounts at the Bank of Canada, in central bank money."
      }
    ],
    "railFamily": "rtp",
    "jurisdiction": [
      "CA"
    ],
    "seeIt": {
      "seedId": "rtr-instant-ca",
      "select": { "kind": "edge", "id": "e3" },
      "label": "opens the RTR design example, the rail is still in delivery, with the central bank settlement leg selected"
    }
  }
];
