/**
 * Payments grounding corpus.
 *
 * Every doc is embedded verbatim in the agent's system prompt, which is sent
 * with cache_control — the whole corpus is paid for once per cache window,
 * then read at ~10% price on every turn. Keep docs factual and small; editing
 * any doc invalidates the prompt cache until the next write.
 *
 * `sources` are authoritative operator/regulator references (URLs verified
 * reachable 2026-06-12). They ground the agent's citations and are surfaced
 * in the UI's Sources panel.
 */
import { normalizeRail } from "@/lib/agent/rails";

export type KbSource = { label: string; url: string };
export type KbDoc = {
  id: string;
  title: string;
  text: string;
  tags: string[];
  sources: KbSource[];
};

export const SOURCE_REGISTRY = {
  paymentsCanada: {
    label: "Payments Canada · payment systems (Lynx, ACSS)",
    url: "https://www.payments.ca/systems-services/payment-systems",
  },
  interacDebit: {
    label: "Interac Corp · Interac Debit",
    url: "https://www.interac.ca/en/business/products/interac-debit/",
  },
  interacETransfer: {
    label: "Interac Corp · Interac e-Transfer",
    url: "https://www.interac.ca/en/consumers/products/interac-e-transfer/",
  },
  nacha: { label: "Nacha Operating Rules", url: "https://www.nacha.org/rules" },
  fedNow: {
    label: "Federal Reserve · FedNow Service",
    url: "https://www.frbservices.org/financial-services/fednow",
  },
  fedAch: {
    label: "Federal Reserve · FedACH",
    url: "https://www.frbservices.org/financial-services/ach",
  },
  visaRules: {
    label: "Visa Core Rules and Visa Product and Service Rules",
    url: "https://usa.visa.com/support/consumer/visa-rules.html",
  },
  tchRtp: {
    label: "The Clearing House · RTP network",
    url: "https://www.theclearinghouse.org/payment-systems/rtp",
  },
  fdic: {
    label: "FDIC · deposit insurance (pass-through coverage)",
    url: "https://www.fdic.gov/resources/deposit-insurance/",
  },
  cfpb: { label: "CFPB · consumer financial protection rules", url: "https://www.consumerfinance.gov/" },
  osfi: { label: "OSFI · federally regulated financial institutions", url: "https://www.osfi-bsif.gc.ca/en" },
  fcac: { label: "FCAC · consumer protection (Canada)", url: "https://www.fcac-acfc.gc.ca/" },
  fintrac: { label: "FINTRAC · AML/ATF (Canada)", url: "https://fintrac-canafe.canada.ca/intro-eng" },
  swift: { label: "SWIFT · messaging standards (MT/ISO 20022)", url: "https://www.swift.com/" },
  sepaEpc: { label: "European Payments Council · SEPA Instant Credit Transfer", url: "https://www.europeanpaymentscouncil.eu/what-we-do/sepa-instant-credit-transfer" },
  ecbTarget: { label: "ECB · TARGET Services (TIPS instant settlement)", url: "https://www.ecb.europa.eu/paym/target/html/index.en.html" },
  payUk: { label: "Pay.UK · Faster Payment System", url: "https://www.wearepay.uk/what-we-do/payment-systems/faster-payment-system/" },
  boe: { label: "Bank of England · RTGS & settlement", url: "https://www.bankofengland.co.uk/payment-and-settlement" },
  fed: { label: "Federal Reserve · payment systems", url: "https://www.federalreserve.gov/" },
  circleUsdc: { label: "Circle · USDC (issuer; reserves & monthly attestations)", url: "https://www.circle.com/usdc" },
} as const satisfies Record<string, KbSource>;

const S = SOURCE_REGISTRY;

export const KB_DOCS: KbDoc[] = [
  {
    id: "interac-debit",
    title: "Interac Debit (in-person, Canada)",
    text: "Interac is Canada's domestic debit network. At a Canadian retailer a cardholder taps/inserts an Interac debit card at the merchant's payment terminal. The acquirer/payment processor routes an authorization to the Interac network (Inter-Member Network switch), which forwards it to the cardholder's issuing bank for approval against the deposit account. Funds clear and settle between issuer and acquirer through Interac, with interbank settlement finalized over Payments Canada systems. Parties: cardholder, merchant, acquirer/processor, Interac network, issuer. Currency CAD. Regulators/oversight: Interac Corp (network rules), Payments Canada (settlement), OSFI (federally regulated banks).",
    tags: ["CA", "interac", "debit", "card-present", "retail"],
    sources: [S.interacDebit, S.paymentsCanada, S.osfi],
  },
  {
    id: "visa-four-party",
    title: "Four-party card model (Visa/Mastercard credit)",
    text: "The four-party (open-loop) model has cardholder, merchant, acquirer (merchant's bank/processor), and issuer (cardholder's bank), with the card network (Visa/Mastercard) in the middle. (American Express and Discover run three-party closed-loop models where the network itself is the issuer and often the acquirer, so interchange as a separate flow does not exist there.) Flow: (1) Authorization: merchant -> acquirer -> network -> issuer -> back. (2) Clearing: transaction records exchanged through the network. (3) Settlement: the issuer pays the acquirer the transaction amount net of interchange, which the issuer keeps as its fee (interchange is borne by the acquirer's side and earned by the issuer); the network nets and settles these positions between member banks. The acquirer charges the merchant a merchant discount rate (interchange + network assessment + acquirer margin). Currency USD in US. Oversight: card network rules; in the US, CFPB (consumer protection); Reg II/Durbin applies to debit interchange, not credit.",
    tags: ["US", "visa", "mastercard", "credit", "four-party", "interchange"],
    sources: [S.visaRules, S.cfpb],
  },
  {
    id: "sponsor-bank-fbo-ca",
    title: "Canadian fintech prepaid program (sponsor bank + FBO)",
    text: "A Canadian fintech issues a prepaid Visa/Mastercard as a program manager on top of a sponsoring Schedule I bank, which is the issuer of record holding the BIN and network license. Cardholder loads are pooled in a For-Benefit-Of (FBO) custodial account at the sponsor bank; the fintech's ledger tracks per-cardholder balances. Card spend authorizes through the network to the sponsor bank as issuer; settlement debits the FBO pool. Parties: cardholder, fintech/program manager, processor, sponsor (Schedule I) bank as issuer, FBO account, card network, merchant. Currency CAD. Oversight: OSFI (Schedule I bank), FCAC (consumer), Payments Canada, network rules; the fintech is not the issuer.",
    tags: ["CA", "fintech", "prepaid", "sponsor-bank", "schedule-i", "fbo", "bin-sponsorship"],
    sources: [S.osfi, S.fcac, S.visaRules],
  },
  {
    id: "sponsor-bank-fbo-us",
    title: "US neobank debit program (sponsor bank + FBO)",
    text: "A US neobank offers checking/debit as a program manager on a sponsor bank (the chartered, FDIC-insured issuer of record). Customer deposits are held in a pooled FBO/custodial account at the sponsor bank; with proper titling and recordkeeping, FDIC pass-through insurance can extend to end customers. The neobank's ledger tracks individual balances. Debit spend authorizes via the network to the sponsor bank as issuer; settlement debits the FBO pool. Parties: customer, neobank/program manager, processor (BaaS), sponsor bank as issuer, FBO account, card network, merchant. Currency USD. Oversight: OCC/FDIC/Fed (sponsor bank), CFPB, state money-transmitter law (neobank), Reg II for debit interchange, network rules.",
    tags: ["US", "neobank", "debit", "sponsor-bank", "fbo", "baas", "fdic"],
    sources: [S.fdic, S.cfpb, S.fed],
  },
  {
    id: "interac-etransfer",
    title: "Interac e-Transfer (account-to-account, Canada)",
    text: "Interac e-Transfer moves money between Canadian bank accounts using an email/mobile alias. Sender initiates from their online banking; their bank debits/holds the funds and sends a notification (with a security question, or Autodeposit) via the Interac platform. The recipient is notified and accepts; the recipient's bank credits the account. Interbank settlement occurs between the financial institutions via Interac, finalized through Payments Canada rails; many transfers are now near-real-time. Parties: sender, sender's bank, Interac e-Transfer platform, recipient's bank, recipient. Currency CAD. Oversight: Interac Corp, Payments Canada, OSFI.",
    tags: ["CA", "interac", "e-transfer", "a2a", "p2p", "notification"],
    sources: [S.interacETransfer, S.paymentsCanada],
  },
  {
    id: "canada-eft-aft",
    title: "EFT / AFT (Canada bank-to-bank batch: direct deposit & pre-authorized debit)",
    text: "EFT (Electronic Funds Transfer), delivered through Payments Canada's Automated Funds Transfer (AFT) service, is Canada's batch bank-to-bank rail for recurring and bulk payments: payroll and government direct deposit, vendor/supplier payments, and pre-authorized debits (PADs) for bills and subscriptions. It is the Canadian counterpart to US ACH and is DISTINCT from Interac e-Transfer (an alias-addressed, near-real-time consumer transfer) and from Interac Debit (card-present). When a scenario is payroll, a recurring bill, a PAD, or any scheduled/bulk account-to-account payment in Canada, the rail is EFT/AFT, not e-Transfer. The originator (employer, biller, or payer) submits an AFT file to its originating financial institution following Payments Canada Standard 005 (the AFT file format). A CREDIT (direct deposit) pushes funds from the originator to each receiver; a DEBIT (PAD) pulls funds from the payer's account under a prior authorization. Items are exchanged between the originating FI and each counterparty FI and cleared through the ACSS (Automated Clearing Settlement System); the receiving FI posts to the recipient's deposit account, typically next business day (T+1) on a deferred-net cycle. Final interbank settlement of the netted ACSS positions occurs across participants' settlement accounts at the Bank of Canada. Parties: originator, originating FI, ACSS clearing, receiving FI, recipient. Currency CAD (a parallel USD bulk stream also runs). Standard: Payments Canada Standard 005 (AFT); PADs are additionally governed by Payments Canada Rule H1. Oversight: Payments Canada (rules & ACSS), Bank of Canada (settlement), OSFI (FIs), FCAC (PAD consumer protection).",
    tags: ["CA", "eft", "aft", "pad", "pre-authorized-debit", "direct-deposit", "payroll", "acss", "batch", "bank-transfer"],
    sources: [S.paymentsCanada, S.osfi, S.fcac],
  },
  {
    id: "ach-credit",
    title: "ACH credit push (US, direct deposit payroll)",
    text: "ACH is the US batch interbank network governed by Nacha rules. For payroll direct deposit the employer originates a credit-push entry through its bank (the ODFI). The ODFI batches and submits entries to an ACH Operator (the Federal Reserve's FedACH or The Clearing House's EPN), which routes them to each employee's bank (the RDFI). The RDFI posts the credit to the employee on the effective/settlement date (next-day or Same Day ACH). Interbank settlement occurs across Federal Reserve accounts. Parties: employer, ODFI, ACH operator, RDFI, employee. Currency USD. Message standard: Nacha file (PPD entries). Oversight: Nacha (rules), Federal Reserve, CFPB.",
    tags: ["US", "ach", "credit-push", "payroll", "direct-deposit", "nacha", "odfi", "rdfi"],
    sources: [S.nacha, S.fedAch],
  },
  {
    id: "fednow",
    title: "FedNow instant payment (US, B2B)",
    text: "FedNow is the Federal Reserve's instant-payment rail: 24/7/365, credit-push, irrevocable, with instant settlement in central bank money. A sending business instructs its bank; the bank sends an ISO 20022 payment message through the FedNow Service, which settles between the banks' Fed master accounts instantly and forwards the credit to the receiving bank. The receiving bank normally posts funds within seconds, but an accepted-without-posting exception can delay customer availability even though interbank settlement has completed. Parties: sender business, sender's bank, FedNow Service (Federal Reserve), receiver's bank, receiver business. Currency USD. Message standard: ISO 20022. Oversight: Federal Reserve.",
    tags: ["US", "fednow", "instant", "iso20022", "b2b", "real-time"],
    sources: [S.fedNow],
  },
  {
    id: "cross-border-wire-fx",
    title: "Cross-border wire with FX (Canada -> US supplier)",
    text: "A Canadian company pays a US supplier by international wire. The company instructs its Canadian bank, which debits a CAD account and performs FX conversion CAD->USD at the bank's rate (plus spread/fee). The payment is sent as an ISO 20022 pacs.008 message over SWIFT through correspondent banking (pacs.008 replaced the legacy MT103 when SWIFT retired MT messages for cross-border interbank payment instructions in November 2025); a USD correspondent/intermediary bank may sit between the Canadian bank and the US beneficiary bank. The beneficiary (US) bank credits the supplier in USD. Parties: CA company, CA bank, FX desk, correspondent/intermediary bank, US beneficiary bank, US supplier. Currencies CAD and USD. Message standard: ISO 20022 (pacs.008) over SWIFT; legacy MT103 retired November 2025. Oversight/compliance: FINTRAC (CA AML), OFAC + FinCEN (US sanctions/AML), Payments Canada / Fedwire on legs.",
    tags: ["CA", "US", "wire", "swift", "fx", "correspondent", "cross-border", "mt103"],
    sources: [S.swift, S.fintrac, S.fed, S.paymentsCanada],
  },
  {
    id: "disputes-refunds",
    title: "Refunds, disputes, and chargebacks (exception paths)",
    text: "A refund is merchant-initiated: the merchant instructs its acquirer to push funds back through the network to the issuer, which credits the cardholder. It reverses the settlement direction of the original sale and typically takes days. A chargeback is issuer-initiated on the cardholder's behalf (dispute): the issuer raises it through the network, debiting the acquirer, which debits the merchant; the merchant may re-present evidence. Visa Debit and Debit Mastercard disputes run under the same network chargeback rules and time limits as credit (typically 120 days, varying by reason code). Interac Debit has no comparable chargeback right: unauthorized-use claims are investigated by the issuer under Interac's zero-liability policy, and merchant disputes have no network reversal path. ACH has its own return framework (Nacha return codes, unauthorized-debit returns). An ACH return is not a chargeback. Wires and FedNow/RTP credits are irrevocable; recovery is by request-for-return, not by right.",
    tags: ["chargeback", "refund", "dispute", "returns", "exceptions"],
    sources: [S.visaRules, S.nacha],
  },
  {
    id: "reg-e-error-resolution",
    title: "Reg E error resolution (US consumer EFT disputes)",
    text: "Regulation E (12 CFR Part 1005) governs error resolution for consumer electronic fund transfers (debit cards, prepaid accounts, and ACH debits). It does not cover credit cards (billing errors there run under Reg Z). On notice of an unauthorized EFT or other error, the institution must investigate promptly: resolve within 10 business days, or extend the investigation to 45 days (longer for new accounts, POS, or foreign transactions) only if it posts provisional credit to the consumer within 10 business days. Consumer liability for unauthorized transfers is tiered: typically capped at $50 if a lost/stolen access device is reported within 2 business days, up to $500 if reported later, and unlimited for transfers occurring more than 60 days after the statement showing the first unauthorized transfer was sent. In sponsor-bank programs the issuer of record carries the Reg E obligation; the provisional credit typically posts to the cardholder's ledger balance, and the cost is allocated per the program agreement, often to the program manager, frequently via a reserve account the bank can debit.",
    tags: ["US", "reg-e", "dispute", "provisional-credit", "debit", "prepaid", "unauthorized"],
    sources: [S.cfpb],
  },
  {
    id: "rtp-vs-fednow",
    title: "RTP (The Clearing House) vs FedNow",
    text: "RTP and FedNow are both US instant-payment rails: 24/7/365, credit-push only, irrevocable once settled, ISO 20022 messaging, with funds available to the receiver in seconds. The structural difference is settlement: RTP (The Clearing House, launched 2017) settles by transferring positions within a single prefunded joint account held at the Federal Reserve Bank of New York. Participants must maintain a funded position before sending, making liquidity management a participant obligation. FedNow (Federal Reserve, launched 2023) settles directly across each participant's Federal Reserve master account, with no prefunded pool. Network coverage and per-transaction limits differ between the rails and change over time. Neither rail pulls funds; debits are modeled as a request-for-payment message followed by a credit push.",
    tags: ["US", "rtp", "fednow", "instant", "iso20022", "prefunding", "settlement"],
    sources: [S.tchRtp, S.fedNow],
  },
  {
    id: "ach-returns-sec-codes",
    title: "ACH returns and SEC codes",
    text: "The Nacha Operating Rules define a return framework: an RDFI returns an entry with an R-code through the ACH operator back to the ODFI. Most administrative returns (R01 insufficient funds, R02 account closed) must be returned so the ODFI receives them within 2 banking days of settlement. Consumer unauthorized returns (R10 · customer advises not authorized; R11 · not in accordance with authorization) have a 60-calendar-day window and require a Written Statement of Unauthorized Debit from the consumer. SEC codes identify the authorization channel and set the proof-of-authorization requirements: PPD (prearranged consumer), WEB (internet/mobile-authorized consumer debit), TEL (phone-authorized), CCD (corporate). The ODFI warrants every entry it originates: returns debit the ODFI, which has recourse to its originator under the origination agreement. Uncollected returns are ODFI credit exposure, which is why ODFIs underwrite and monitor originators (Nacha also caps unauthorized return rates). An ACH return is not a card chargeback: different rulebook, windows, and liability allocation.",
    tags: ["US", "ach", "returns", "sec-codes", "nacha", "r01", "r10", "web", "odfi"],
    sources: [S.nacha, S.fedAch],
  },
  {
    id: "glossary",
    title: "Glossary & conventions",
    text: "Node types: endpoint (people/businesses originating or receiving), institution (banks, networks, operators), intermediary (processors, program managers, FX, correspondents), treasury (FBO/custodial/settlement accounts). Edge types include authorization, clearing, settlement, funding, refund, chargeback, interchange, fee, reconciliation, transfer, notification. A chargeback path runs from cardholder/issuer back toward merchant/acquirer (dispute). Scope spans CA/US/EU/UK/India/Brazil; each supported region is grounded by its own knowledge-base doc.",
    tags: ["glossary", "conventions", "node-types", "edge-types"],
    sources: [],
  },
  {
    id: "sepa-instant-eu",
    title: "SEPA Instant Credit Transfer (SCT Inst) \u00b7 EUR account-to-account, euro area",
    text: "SEPA Instant Credit Transfer (SCT Inst) moves euro instantly between accounts at different euro-area PSPs. The payer PSP debits the payer and submits an ISO 20022 instruction (pacs.008) to an instant CSM (EBA CLEARING RT1 or ECB TIPS) under the EPC rulebook; the payee PSP confirms (pacs.002) and credits the payee in under 10 seconds, 24/7/365. Interbank settlement is finalized real-time GROSS in central-bank money on the Eurosystem's books: TIPS settles each payment on the PSPs' TIPS Dedicated Cash Accounts (TIPS DCAs), and RT1, EBA CLEARING's instant-payment CSM (an SFD-designated system, not a central-bank RTGS), likewise settles each payment gross in immediately available central-bank funds, with participant liquidity held on a dedicated RT1 AS technical account in TIPS. There is no netting and no deferred cycle on either CSM; T2 (TARGET RTGS) only funds/defunds the TIPS DCA. Oversight: ECB/Eurosystem; rulebook owner: EPC (2025 SCT Inst rulebook v1.1, in force 5 Oct 2025); Regulation (EU) 2024/886.",
    tags: ["EU", "EUR", "sct-inst", "sepa-instant", "instant", "a2a"],
    sources: [{ label: "European Payments Council \u00b7 SEPA Instant Credit Transfer (scheme owner / rulebook)", url: "https://www.europeanpaymentscouncil.eu/what-we-do/sepa-instant-credit-transfer" }, { label: "European Payments Council \u00b7 2025 SCT Inst rulebook version 1.1 (in force 5 Oct 2025)", url: "https://www.europeanpaymentscouncil.eu/document-library/rulebooks/2025-sepa-instant-credit-transfer-rulebook-version-11" }, { label: "ECB \u00b7 TARGET Services / TIPS (instant settlement on TIPS DCAs in central-bank money)", url: "https://www.ecb.europa.eu/paym/target/html/index.en.html" }],
  },
  {
    id: "uk-faster-payments",
    title: "UK Faster Payments \u00b7 Instant GBP A2A Transfer (Pay.UK / Bank of England)",
    text: "UK Faster Payments (FPS) is an instant sterling A2A rail operated by Pay.UK on the Vocalink/Mastercard platform; the PSR (economic) and FCA (conduct) regulate it, while the Bank of England supervises it (Banking Act 2009) and provides settlement. The payee is credited within seconds, 24/7/365 (ISO 8583-based, migrating to ISO 20022 under the infrastructure-renewal programme rebranded Interbank Infrastructure Renewal / IIR in 2026). Funds availability is not finality: FPS is a Deferred Net Settlement system (NOT itself an RTGS system). Pay.UK calculates participants' multilateral net positions and sends a net settlement instruction to the Bank of England, where positions settle in central-bank money across reserve/settlement accounts in the BoE's RTGS roughly three times per business day; weekend/holiday payments settle the next business day, and cash-collateralised Pre-Funded Accounts covering each participant's Net Sender Cap eliminate settlement risk. Confirmation of Payee name-checks the payee before sending via a peer-to-peer API to the responding (payee) PSP, resolved through a Pay.UK-governed directory/aggregator. The payee PSP, not Pay.UK, performs the match.",
    tags: ["instant-payments", "a2a", "faster-payments", "pay.uk", "bank-of-england", "rtgs"],
    sources: [{ label: "Pay.UK \u00b7 Faster Payment System (scheme operator)", url: "https://www.wearepay.uk/what-we-do/payment-systems/faster-payment-system/" }, { label: "Pay.UK \u00b7 Faster Payments System Principles (Jan 2026, v11): real-time 24/7, DNS ~3x/business day via central-bank funds at the Bank of England, Reserve/Settlement and Pre-Funded Accounts", url: "https://www.wearepay.uk/wp-content/uploads/2026/02/Pay.UK-Faster-Payments-System-Principles-v-11-Jan-2026.pdf" }, { label: "Pay.UK \u00b7 Confirmation of Payee (peer-to-peer API name-check; responding PSP performs the match; directory/aggregator model)", url: "https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/" }],
  },
  {
    id: "india-upi",
    title: "India UPI \u00b7 Instant A2A Payment to Merchant (NPCI switch orchestrates debit + credit; deferred multilateral NET settlement at RBI)",
    text: "India's UPI is an instant INR account-to-account rail operated by NPCI and regulated by the RBI. UPI apps are Third-Party App Providers (TPAPs, e.g. BHIM/GPay/PhonePe) riding on PSP/sponsor banks, not wallets, since UPI is account-to-account. The payer approves with a UPI PIN; the TPAP app forwards the request to NPCI's central switch, which orchestrates both legs: it sends a debit request (with PIN auth) to the payer's remitter/issuer bank (which debits the payer) and, on debit success, a credit request to the merchant's beneficiary bank (which credits the merchant in seconds, 24/7). NPCI does not hold or move funds. It routes/authenticates messages and computes each member bank's single multilateral net position. NPCI (a Type-D RTGS member) submits a Multilateral Net Settlement Batch (MNSB) file to the RBI's RTGS over the Net Settlement Interface, where the already-netted positions settle on a DEFERRED MULTILATERAL NET basis. Each member's single net debit/net credit posts ALL-OR-NONE (atomically) to its settlement (current) account in central-bank money over same-day cycles (~10 authorized-transaction cycles/day plus separate dispute cycles under the 2025 framework). If any net-debit member lacks funds, the whole MNSB stays pending. RTGS settlement is where finality occurs, final/irrevocable under the PSS Act, 2007. The model is NET, not gross: RBI defines gross settlement as one-to-one without netting (the opposite of an MNSB); RTGS settles gross only for its own native instructions. NPCI's Settlement Guarantee Fund (\u224890% bank line of credit + \u224810% member cash collateral) backstops member-bank default.",
    tags: ["instant-payments", "account-to-account", "UPI", "NPCI", "RBI", "TPAP"],
    sources: [{ label: "NPCI \u00b7 UPI product page (operator)", url: "https://www.npci.org.in/product/upi" }, { label: "NPCI \u00b7 NFS Settlement Process (net debit/net credit positions settled via MNSB on member settlement accounts with RBI; MNSB settles all-or-none in RTGS)", url: "https://www.npci.org.in/PDF/npci/others/NFS-Settlement-Process.pdf" }, { label: "World Bank \u00b7 Fast Payments / India IMPS & UPI case study (deferred multilateral net settlement; NPCI computes net positions settled in RBI RTGS)", url: "https://fastpayments.worldbank.org/sites/default/files/2021-10/World_Bank_FPS_India_IMPS_and_UPI_Case_Study.pdf" }],
  },
  {
    id: "brazil-pix",
    title: "Brazil Pix \u00b7 BRL Instant Payment (SPI / DICT, Banco Central do Brasil)",
    text: "Pix is Brazil's instant payment scheme operated by Banco Central do Brasil (BCB). The payer PSP resolves the payee's Pix key via DICT, the BCB-run alias directory exposed as a REST/OpenAPI API over RSFN (a message lookup, not money and NOT ISO 20022). The payer PSP blocks/reserves the payer's funds and submits a signed ISO 20022 pacs.008 order into the SPI (Sistema de Pagamentos Instant\u00e2neos), the BCB real-time gross settlement system for Pix. SPI checks and blocks the payer PSP's PI (Conta PI) balance and forwards the order to the receiving PSP, which validates it can credit, makes a PROVISIONAL credit annotation (anota\u00e7\u00e3o provis\u00f3ria de cr\u00e9dito), and returns a pacs.002 (ACSP, AcceptedSettlementInProcess, or reject AB09) within ~1.4s (median per BCB Manual de Tempos). Only after that ACSP confirmation does SPI effect the interbank settlement, debiting the payer PSP's PI account and crediting the payee PSP's PI account in central-bank money, transaction by transaction, definitive and irrevocable (the t4 'finality' moment), 24/7/365. SPI then sends the conclusive pacs.002 (ACSC) first to the payee PSP, which (only now, AFTER finality) makes the REAL customer credit; SPI also confirms to the payer PSP, which finalizes the real debit. So the order is provisional acceptance \u2192 interbank finality \u2192 real customer credit; finality is gated on the payee PSP's ACSP, and the customer credit follows finality (BCB Manual de Fluxos \u00a73.1.1; Manual de Tempos v7.0). End to end ~10s. Money settles AT the BCB on PI accounts, not THROUGH SPI or DICT; PI accounts are funded via the STR reserves RTGS.",
    tags: ["instant-payments", "a2a", "rtgs", "central-bank-money", "iso20022", "brazil"],
    sources: [{ label: "Banco Central do Brasil \u00b7 Pix (official overview)", url: "https://www.bcb.gov.br/en/financialstability/pix_en" }, { label: "BCB \u00b7 Manual de Fluxos do Processo de Efetiva\u00e7\u00e3o do Pix (\u00a73.1.1 immediate-settlement flow between direct participants: step 8 provisional credit annotation, step 11 Conta PI settlement finality, step 14 real customer credit AFTER finality)", url: "https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/III_ManualdeFluxosdoProcessodeEfetivacaodoPix.pdf" }, { label: "BCB \u00b7 Manual de Tempos do Pix v7.0 (timeline: t3' SPI receives pacs.002, t4 = finality / Conta PI balance exchange precedes the real credit; ~10s end-to-end, 40s hard limit)", url: "https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/IX_ManualdeTemposdoPix.pdf" }],
  },
  {
    id: "stablecoin-usdc",
    title: "USD stablecoin payment & on-chain settlement (USDC)",
    text: "A fiat-backed stablecoin (e.g. USDC) is a token pegged 1:1 to a fiat currency and redeemable from its issuer; value moves PEER-TO-PEER on a public blockchain while the peg is held OFF-CHAIN by the issuer's reserves. Issuance/redemption: a customer wires USD to the issuer (Circle for USDC) through an on-ramp; the issuer MINTS new USDC and holds the matching USD in reserves (cash + short-dated US Treasuries at custodian banks / a regulated reserve fund), and BURNS USDC on redemption to return USD. This is what keeps the peg, not market trading. Transfer leg (the on-chain payment): the payer holds USDC in a wallet (self-custody or a hosted/exchange wallet) and signs a transaction moving USDC to the payee's wallet; the transaction is broadcast to the blockchain network (e.g. Ethereum, Base, or Solana), validators include it in a block and the token contract updates balances, and the transfer reaches FINALITY on-chain. No bank and no central operator sit in the transfer itself, and the payer pays a network 'gas' fee in the chain's native token. Settlement IS the on-chain confirmation: there is no deferred net cycle, no scheme/interchange, and no central-bank money. Merchant acceptance (the most common business flow): a crypto payment processor / PSP (e.g. Coinbase Commerce, BitPay, or Stripe) receives the USDC on the merchant's behalf and typically AUTO-CONVERTS it to fiat, settling to the merchant's bank account by ACH, so the merchant is paid in dollars without holding crypto. Parties: payer (USDC wallet), payee/merchant (wallet), blockchain network/validators, stablecoin issuer (Circle), reserve custodian bank, on-/off-ramp or PSP (fiat<->USDC), and the merchant's settlement bank. Currency: USD-pegged USDC. Oversight: payment-stablecoin issuers are regulated under the US GENIUS Act (2025) framework (1:1 high-quality liquid reserves, monthly attestations) and, in the EU, under MiCA's e-money-token rules; reserve management and AML/KYC sit with the issuer and the ramps, not a payments operator. KEY CONTRAST with card/bank rails: trust shifts from a scheme + central-bank settlement to the issuer's reserves plus the chain's consensus: fast, 24/7, and final on-chain, but only as sound as the reserves behind the token.",
    tags: ["stablecoin", "usdc", "crypto", "on-chain", "blockchain", "wallet", "digital-asset", "USD", "settlement", "circle"],
    sources: [S.circleUsdc],
  },
];

/** Deduplicated list for the UI Sources panel. */
export const ALL_SOURCES: KbSource[] = Object.values(SOURCE_REGISTRY);

// ---------------------------------------------------------------------------
// KB coverage for an AI-assembled leg.
//
// Per-element provenance lights up on the 24 seeds, but every AI-generated leg
// reads a uniform "AI-inferred". The honest middle tier: when a leg's RAIL is
// documented in this corpus, we can say so. It does NOT mean the AI's specifics
// are correct, only that the rail itself is grounded; the leg still wants a look.
//
// CONSERVATIVE on purpose. Under-claiming (returning null) is safe; over-claiming
// destroys the moat. So:
//  - We match the RAW edge.rail against high-confidence, rail-specific prefixes,
//    NOT the lossy family bucket from normalizeRail(). normalizeRail folds Lynx
//    and LVTS into "Payments Canada", which would otherwise borrow the EFT/AFT
//    doc's coverage. Lynx (Canada's high-value wire/RTGS) is NOT in any doc, so
//    it must read inferred. The same goes for Fedwire and RTR (seeds only).
//  - normalizeRail() is still used as a fallback for the families that map
//    cleanly and unambiguously to exactly one doc (Interac, ACH, FedNow, RTP,
//    Visa, SEPA, UPI, Pix, SWIFT). Mastercard remains uncovered until it has
//    its own primary-source mechanics document.
//  - Anything we are not confident about returns null.
// ---------------------------------------------------------------------------

export interface KbEdgeCoverage {
  docId: string;
  /** The full, formal doc title — used for the link/tooltip. */
  docTitle: string;
  /** A short, human label for inline prose ("Interac e-Transfer", "Canada EFT/AFT").
   *  Keeps the easygoing voice from fighting the long formal title. */
  shortLabel: string;
  source?: KbSource;
}

/**
 * Short, human label per KB doc, for inline prose in the provenance copy. The
 * full docTitle still rides on the link/tooltip; this is the warm, glanceable
 * name. Keyed by docId so it stays beside the doc it describes.
 */
const DOC_SHORT_LABEL: Record<string, string> = {
  "interac-debit": "Interac Debit",
  "interac-etransfer": "Interac e-Transfer",
  "canada-eft-aft": "Canada EFT/AFT",
  "ach-credit": "US ACH",
  fednow: "FedNow",
  "rtp-vs-fednow": "RTP & FedNow",
  "visa-four-party": "card networks (credit)",
  "cross-border-wire-fx": "SWIFT cross-border wire",
  "sepa-instant-eu": "SEPA Instant",
  "uk-faster-payments": "UK Faster Payments",
  "india-upi": "India UPI",
  "brazil-pix": "Brazil Pix",
  "stablecoin-usdc": "USDC stablecoin",
};

/** Short human label for a doc, falling back to its full title if none is set. */
function docShortLabel(doc: KbDoc): string {
  return DOC_SHORT_LABEL[doc.id] ?? doc.title;
}

/** Alphanumeric-lowercased key so spacing/punctuation/casing never matter. */
const railKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A doc's first source (the primary citation), if it has one. */
function primarySource(doc: KbDoc): KbSource | undefined {
  return doc.sources[0];
}

function docById(id: string): KbDoc | undefined {
  return KB_DOCS.find((d) => d.id === id);
}

/**
 * Rails that LOOK Canada-domestic but are NOT covered, checked before any other
 * rule so they can never borrow another doc's grounding. Lynx/LVTS (high-value
 * wire) and RTR (Real-Time Rail) are seeds-only, never KB docs. Fedwire likewise
 * has no doc. These MUST read inferred.
 */
const UNCOVERED_RAIL_KEYS: RegExp[] = [
  /^lynx/, // Canada high-value wire (Payments Canada Lynx) — no doc
  /^lvts/, // Lynx's former name — no doc
  /^rtr/, // Real-Time Rail (Canada) — seed only, no doc
  /^realtimerail/,
  /^fedwire/, // US high-value wire — no doc (cross-border-wire-fx is SWIFT)
  // Debit card-network legs are NOT covered by visa-four-party (that doc is the
  // CREDIT four-party model + Durbin/Reg II). Checked here, before the Visa/
  // Mastercard family fallback, so a debit-card leg reads "inferred" until a
  // debit-specific doc exists — never borrowing the credit doc's grounding.
  /^visadebit/,
  /^mastercarddebit/,
  /^maestro/, // Mastercard's debit brand
  // SEPA Direct Debit is a PULL scheme. The only SEPA doc (sepa-instant-eu) is
  // instant CREDIT (SCT Inst), so excluding SDD here, before the SEPA family
  // fallback, keeps a direct-debit leg "inferred" instead of borrowing the
  // credit doc's grounding (it would otherwise fold into the SEPA family).
  /^sepadirectdebit/,
  /^sepadd/,
  /^sdd/,
];

/**
 * High-confidence RAW-rail → docId rules, matched on the alphanumeric key by
 * prefix. Ordered; first match wins. Each entry maps a rail to a doc whose
 * `tags` GENUINELY cover that rail. Deliberately narrow: a rail not listed here
 * (and not resolvable via the family fallback) returns null.
 */
const RAW_RAIL_DOC_RULES: Array<[RegExp, string]> = [
  // Card-present Interac (Debit / Flash) is its OWN doc and MUST resolve here,
  // before the "Interac" family fallback would otherwise fold it into the A2A
  // e-Transfer doc. (Bare "Interac" still maps to interac-etransfer via the
  // family bucket; "Interac e-Transfer" matches neither prefix here and also
  // takes the family path → interac-etransfer.)
  [/^(interacdebit|interacflash)/, "interac-debit"],
  // Canada batch bank-to-bank: EFT / AFT / ACSS / PAD all live in canada-eft-aft.
  // (Lynx/LVTS are excluded above, so "Payments Canada" never reaches here as Lynx.)
  [/^(eft|aft|acss|pad|preauthorizeddebit|directdeposit)/, "canada-eft-aft"],
  // UK Faster Payments (the uk-faster-payments doc). Seed rail "Faster Payments".
  [/^(fasterpayments|fps|payuk)/, "uk-faster-payments"],
  // Brazil Pix: the brazil-pix doc names SPI (settlement) + DICT (alias directory).
  // Seeds label legs "SPI" / "DICT"; "Pix" itself also resolves via the family bucket.
  [/^(pix|spi|dict)/, "brazil-pix"],
  // SEPA Instant (SCT Inst) on RT1 / TIPS → sepa-instant-eu. Kept as a RAW rule
  // (NOT a widened SEPA family bucket) so SEPA Direct Debit is never pulled into
  // this instant-credit doc. Seeds use "TIPS" / "EBA CLEARING RT1 / TIPS" / "TIPS DCA".
  [/^(sctinst|sepainstant|tips|ebaclearing|rt1)/, "sepa-instant-eu"],
  // USDC / stablecoin on-chain settlement.
  [/^(usdc|usdstablecoin|stablecoin)/, "stablecoin-usdc"],
];

/**
 * Family-bucket → docId, used ONLY for families that map cleanly and
 * unambiguously to a single doc. Keyed on the normalizeRail() output. Excludes
 * "Payments Canada" (ambiguous: covers EFT/AFT but NOT Lynx) and "Fedwire"
 * (no doc) by simply not listing them.
 */
const FAMILY_DOC_MAP: Record<string, string> = {
  Interac: "interac-etransfer",
  ACH: "ach-credit",
  FedNow: "fednow",
  RTP: "rtp-vs-fednow",
  Visa: "visa-four-party",
  SWIFT: "cross-border-wire-fx",
  SEPA: "sepa-instant-eu",
  UPI: "india-upi",
  Pix: "brazil-pix",
};

/**
 * Resolve a rail string to the KB doc that documents it, conservatively, or
 * null. Exported and pure so it is unit-testable and reusable.
 */
export function kbCoverageForRail(rail: string | undefined): KbEdgeCoverage | null {
  if (typeof rail !== "string") return null;
  const trimmed = rail.trim();
  if (!trimmed) return null;
  const k = railKey(trimmed);
  if (!k) return null;

  // (0) Hard exclusions first — these can never borrow another doc's grounding.
  if (UNCOVERED_RAIL_KEYS.some((re) => re.test(k))) return null;

  // (1) High-confidence raw-rail prefixes (Interac Debit, EFT/AFT/ACSS/PAD,
  //     Faster Payments, Pix/SPI/DICT, SEPA Instant, USDC, …).
  for (const [re, docId] of RAW_RAIL_DOC_RULES) {
    if (re.test(k)) {
      const doc = docById(docId);
      if (doc)
        return {
          docId: doc.id,
          docTitle: doc.title,
          shortLabel: docShortLabel(doc),
          source: primarySource(doc),
        };
    }
  }

  // (2) Clean family buckets (Interac, ACH, FedNow, RTP, Visa, Mastercard,
  //     SWIFT, SEPA, UPI, Pix). normalizeRail folds e.g. "Interac e-Transfer"
  //     → "Interac"; "MT103" → "SWIFT"; "SCT Inst" → "SEPA".
  const family = normalizeRail(trimmed);
  const docId = FAMILY_DOC_MAP[family];
  if (docId) {
    const doc = docById(docId);
    if (doc)
      return {
        docId: doc.id,
        docTitle: doc.title,
        shortLabel: docShortLabel(doc),
        source: primarySource(doc),
      };
  }

  // (3) Not confidently covered → inferred.
  return null;
}

/**
 * Debit / card-present / direct-debit signals in a leg's own free text. The
 * prompt's RAIL_GUIDANCE steers the model toward FAMILY-level rails ("Visa",
 * "Interac") with the sub-type in the LABEL, so the label is where a debit leg
 * reveals itself when the rail alone can't. Word-bounded so the verb in prose
 * ("issuer debits the FBO pool") does not match, while "debit card", "direct
 * debit", "tap", "contactless", "POS" do.
 */
const DEBIT_CONTEXT_RE =
  /\b(debit|card[- ]present|contactless|tap(?:s|ped)?|point[- ]of[- ]sale|pos|maestro|flash)\b/i;

/**
 * Docs whose grounding does NOT extend to debit / card-present / direct-debit
 * legs of their family: visa-four-party is the CREDIT model (+ Durbin/Reg II),
 * sepa-instant-eu is instant CREDIT (SCT Inst, not SDD), interac-etransfer is
 * A2A push (not card-present). A debit-context leg must not borrow them.
 */
const DEBIT_BLIND_DOC_IDS = new Set(["visa-four-party", "sepa-instant-eu", "interac-etransfer"]);

/**
 * Coverage for a flow EDGE (the rail is the accurate unit of KB coverage).
 * Prefers the PRE-normalization rail: on every AI flow, normalizeFlowRails()
 * folds rails to family buckets ("Interac Debit" → "Interac", "SEPA Direct
 * Debit" → "SEPA") BEFORE provenance ever runs, which would blind the raw-key
 * exclusions/rules above and let a debit leg cite a credit doc. The folder
 * stashes the original in `metadata.railRaw`; it is trusted only while it still
 * folds to the same family as the edge's current rail (a hand-re-railed edge
 * ignores the stale stash). And because RAIL_GUIDANCE sends sub-types to the
 * LABEL, a debit/card-present signal in the leg's own text demotes the
 * credit-/push-only docs to null (inferred) — under-claiming is safe,
 * over-claiming destroys the moat. Returns null for any uncovered edge.
 */
export function kbCoverageForEdge(
  edge:
    | { rail?: string; label?: string; description?: string; metadata?: Record<string, unknown> }
    | undefined,
): KbEdgeCoverage | null {
  if (!edge) return null;
  const stashed = edge.metadata?.["railRaw"];
  const rail =
    typeof stashed === "string" &&
    stashed.trim() &&
    typeof edge.rail === "string" &&
    normalizeRail(stashed) === normalizeRail(edge.rail)
      ? stashed
      : edge.rail;
  const coverage = kbCoverageForRail(rail);
  if (!coverage) return null;
  if (
    DEBIT_BLIND_DOC_IDS.has(coverage.docId) &&
    DEBIT_CONTEXT_RE.test(`${edge.label ?? ""} ${edge.description ?? ""}`)
  ) {
    return null;
  }
  return coverage;
}
