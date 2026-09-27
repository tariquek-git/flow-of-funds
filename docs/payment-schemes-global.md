# Global payment schemes — source-verified catalog

Compiled by a multi-agent research pass (78 agents, web-verified, adversarial source check). **72 schemes** — 49 authoritative, 19 mixed, 4 weak. Trust `authoritative`; treat `mixed`/`weak` as needing a sourced KB doc before they ship.

> Data file: `docs/payment-schemes-global.json` (full structured records).
> This is research input for taking FoF Native global — NOT yet wired into the schema or KB.

72 scheme entries cover the global retail/wholesale/cross-border rail map well (the Big-Four card networks, every major real-time rail — UPI, Pix, FedNow, RTP, SCT Inst, FPS, PIX-class A2A — plus RTGS, ACH-batch, wallets, and cross-border infra SWIFT/CLS/CIPS/PAPSS), but the catalog has 6 duplicate ids (visa, mastercard, unionpay, american-express, discover/diners-discover, rupay each appear twice as network + global-acceptance variants) that must be de-duped before any enum or KB wiring. Source quality is uneven and self-labeled: trust the `authoritative` entries (most public-operator rails: Payments Canada, Fed, Nacha, ECB/Eurosystem, Pay.UK, NPCI, BCB Pix, ABS/AusPayNet) and treat the `weak`/`mixed` ones (notably the Visa/Mastercard/UnionPay brand entries and several APAC/MEA operators) as needing a sourced KB doc before they ship. Logo guidance is sound and matches the app's existing brands.ts posture: only ~9 schemes have genuine CC0 simple-icons marks; everything else is official-mark-with-trademark-caveat or styled wordmark chip — do not fabricate logo artwork for the ~50 rails without a CC0 mark.

## How to go global without breaking the accuracy thesis

1. De-dup and normalize the catalog FIRST: collapse the 6 duplicate ids (visa, mastercard, unionpay, american-express, discover/diners-discover, rupay each appear twice), reconcile RuPay's two hexes (#097939 vs #097D40), and fix the SADAD brandColorHex which contains a Cyrillic 'А' (U+0410) and won't parse as hex. A diagram that ships with a malformed color or a double-rendered Visa node breaks the accuracy thesis before any rail logic runs.

2. Do NOT widen the schema enums yet. Keep JurisdictionSchema=['CA','US'] and CurrencySchema=['CAD','USD'] as the hard accuracy lock. Add new jurisdictions/currencies one region at a time, and only in lockstep with a sourced KB doc + a passing seed — never open the enum to all 72 schemes at once. Region rollout order by source strength and importance: (1) EU/SEPA + Eurosystem (EUR), (2) UK/Pay.UK + CHAPS (GBP), (3) Mexico/SPEI (MXN, completes North America), (4) Brazil/Pix and India/UPI (BRL/INR, both authoritative + CC0-or-clean wordmark), then APAC/MEA last where source authority is mostly 'mixed'.

3. Gate every scheme behind a KbDoc in knowledge.ts with verified operator/regulator sources[] — the same contract the CA/US docs already use. A scheme that has no KB doc must remain ungenerable, not silently rendered. Prioritize authoring docs for the 'authoritative' entries; explicitly hold the 'weak'/'mixed' entries (the Visa/Mastercard brand rows, CIPS, CNAPS, several APAC operators) until their KB doc cites a primary source. This keeps the Sources panel honest as coverage grows.

4. Preserve the composer's honest-refusal + adapted-caveat as the global-coverage safety net. The existing logic (low-confidence refusal, <2-signal adapted flag, and the CA/US jurisdiction guard) is exactly the right shape — extend the jurisdiction guard so that ANY prompt naming a region without a shipped KB doc gets an adapted caveat or refusal, never a confident diagram. A polished wrong global flow is more damaging than a CA/US refusal because the user has less ability to catch the error.

5. Extend brands.ts incrementally with the verified CC0 marks only: add siUnionpay, siJcb, siAlipay, siWechat, siPix, siSwift to the BRANDS table (Visa/MC/Amex/Discover already present). For every other rail, add a styled wordmark chip with the catalog's brand hex — never fabricate logo artwork. Carry the trademarkNote text into a title/aria attribute so 'identification use only' travels with the mark into exhibit PNG exports.

6. Model the new institution types as schema subtypes, not new node 'type' enum values. The node 'type' enum (endpoint/institution/intermediary/treasury) is intentionally small; map central bank, scheme operator, clearing house, correspondent, FX/CLS, wallet, fintech/program-manager, and regulator onto the free-form 'subtype' field plus the lucide icon mapping above. This adds global expressiveness without loosening the structural contract that keeps validation tight.

7. Encode two rail-class invariants before going global, because both have already shipped as P0 bugs: (a) messaging networks (SWIFT, and arguably CIPS messaging) must never carry a MONEY edge — they ride notification/messaging legs only; (b) settlement infra (CLS, RTGS operators) and card networks must net/settle, not move retail money directly. Add these as KB facts and composer guards so the first non-CA/US generations don't repeat the wire-fx SWIFT-carrying-money error at global scale.

8. Flag emerging/non-traditional rails (stablecoin on/off-ramps, and sanctions-affected Mir) with an explicit on-canvas disclosure rather than a clean rail chip. The catalog already marks these out-of-traditional-rails / sanctions-affected; surface that as a warning annotation (the schema's annotation type='warning' already exists) so a generated flow never implies frictionless global acceptance that doesn't exist.

## Logo / trademark matrix

Verified against the **installed** `simple-icons` package (two synthesis claims were wrong: `siUnionpay` is absent → wordmark; `siSwift` is the Swift *programming language* logo, not the bank network → keep the dark wordmark chip). Never fabricate logo artwork.

| Scheme | Status | How |
|---|---|---|
| Visa / Visa Direct / VisaNet | simple-icons-cc0 `visa` | Already wired in brands.ts via siVisa.path. Render the real mark on a white/ring chip. CC0 icon; trademark still Visa's  |
| Mastercard / Mastercard Send / Banknet | simple-icons-cc0 `mastercard` | Wired via siMastercard.path. Real interlocking-circles mark. CC0 icon, Mastercard trademark — identification only. Same  |
| American Express | simple-icons-cc0 `americanexpress` | Wired via siAmericanexpress.path. CC0 icon, Amex trademark — identification only. |
| Discover / Discover Global Network / Diners / PULSE | simple-icons-cc0 `discover` | Wired via siDiscover.path. Use for Discover; Diners Club International and PULSE have NO separate CC0 mark — fall back t |
| UnionPay (China UnionPay) | simple-icons-cc0 `unionpay` | Add siUnionpay to brands.ts. CC0 icon exists; China UnionPay trademark — identification only. Source authority on the ca |
| JCB | simple-icons-cc0 `jcb` | Add siJcb to brands.ts. CC0 icon, JCB trademark — identification only. |
| Alipay | simple-icons-cc0 `alipay` | CC0 'alipay' icon exists. Wallet party, not a rail. Ant Group trademark — identification only; gate behind a China-walle |
| WeChat Pay (Weixin Pay / Tenpay) | simple-icons-cc0-app-not-subbrand `wechat` | Only the parent 'wechat' app icon is CC0 — there is no CC0 'WeChat Pay' sub-brand mark. Use the wechat glyph but label t |
| Pix | simple-icons-cc0 `pix` | CC0 'pix' mark exists (Banco Central do Brasil owns the brand). Add siPix to brands.ts; identification use only. Strong  |
| SWIFT | simple-icons-cc0 `swift` | CC0 'swift' wordmark exists; already a wordmark chip in brands.ts (#3D3D3D) — can upgrade to the simple-icons path. CRIT |
| Interac e-Transfer / Interac Debit | official-mark-trademark-caveat | No CC0 mark. Keep the existing styled wordmark chip (#FDB913 / dark ink) already in brands.ts. Interac Corp trademark —  |
| FedNow / Fedwire / Federal Reserve | official-mark-trademark-caveat | No CC0 mark. Styled wordmark chips already present (FedNow #046A38, Federal Reserve #0A3161). Fed registered service mar |
| RTP (The Clearing House) | official-mark-trademark-caveat | No CC0 mark. Wordmark chip present (#12284C). TCH registered mark — identification only. |
| Zelle | official-mark-trademark-caveat | No CC0 mark. Use a styled 'Zelle' wordmark chip in brand purple (#6D1ED4). Early Warning Services trademark — identifica |
| ACH Network / Same Day ACH (Nacha) | official-mark-trademark-caveat | No CC0 mark. 'ACH' wordmark chip already present (#1C4F9C). Nacha/ACH registered marks — identification only. |
| Payments Canada rails (Lynx, ACSS, RTR, EFT/AFT) | official-mark-trademark-caveat | No CC0 mark. 'Payments Canada' wordmark chip present (#7A1F3D); add per-rail text chips (Lynx, ACSS, RTR). Operator mark |
| SEPA family (SCT, SCT Inst, SDD) / CHAPS / Bacs / Faster Payments / CoP / NPA | styled-wordmark-chip-only | EPC/Pay.UK/Bank-of-England programme marks with NO CC0 logo. Render plain text labels only ('SEPA Credit Transfer', 'CHA |
| Eurosystem rails (T2/TARGET2, TIPS) / EBA CLEARING (RT1, STEP2-T) | official-mark-trademark-caveat | No CC0 mark. ECB/Eurosystem and EBA CLEARING marks — styled wordmark chips in brand blue (#003299 / #005B9F), identifica |
| NPCI rails (UPI, IMPS, RuPay) / NEFT / RTGS-India | official-mark-trademark-caveat | No CC0 marks (UPI/BHIM/RuPay are NPCI trademarks; NEFT/RTGS are RBI public schemes with no consumer brand). Styled wordm |
| M-Pesa | styled-wordmark-chip-only | No CC0 mark. Catalog flags wordmark-only; render 'M-Pesa' text chip in Safaricom green (#1BB14B). Safaricom/Vodafone tra |
| APAC/MEA operators (PayNow, FAST, FPS-HK, Zengin, NPP/PayTo, BECS, BPAY, KFTC, NIBSS-NIP, PesaLink, sarie, SADAD, Aani) | official-mark-trademark-caveat | No CC0 marks. Styled wordmark chips only. WATCH: SADAD brandColorHex '#00А651' contains a Cyrillic 'А' (U+0410) not Lati |
| Cross-border infra (CIPS, CNAPS, PAPSS, CLS) | official-mark-trademark-caveat | No CC0 marks; institutional infrastructure, not consumer brands. Wordmark chips only. CLS is settlement infra (FX PvP) — |
| Mir (NSPK) | official-mark-trademark-caveat-sanctions | No CC0 mark. Wordmark chip only. NSPK trademark. ADDED RISK: subject to international sanctions affecting acceptance — i |
| Wise | official-mark-trademark-caveat | Not confirmed in the CC0 set per the catalog — do NOT assume a slug. Use a 'Wise' wordmark chip (#9FE870 on dark) until  |
| Correspondent banking / ISO 8583 / ISO 20022 / Stablecoin on-off ramps | no-logo-render-as-plain-label | Generic arrangements / technical standards / a category — no brand or trademark exists. Render as plain wordmark or a ne |

**Confirmed CC0 marks present in our package:** visa, mastercard, americanexpress, discover (already wired) + **jcb, pix, alipay, wechat** (newly added). Everything else = styled wordmark chip.

## Institution / party icon taxonomy

A global flow needs more party types than the current set. Map onto the free-form `subtype` field (not new `type` enum values) + these lucide icons:

| Party type | Icon | Why |
|---|---|---|
| Consumer / payer (individual endpoint) | `User` | The originating or receiving natural person; maps to the schema's 'endpoint' node type. Di |
| Merchant / payee / business | `Store` | The accepting business at point of sale or the receiving enterprise; 'endpoint' node type. |
| Commercial bank (issuer / acquirer / ODFI / RDFI / beneficiary bank) | `Landmark` | The workhorse 'institution' node — any chartered deposit-taking bank playing issuer, acqui |
| Central bank / RTGS & settlement operator | `Building2` | Fed, ECB/Eurosystem, Bank of England, Banco de Mexico, RBI, BCB, PBoC — operators of RTGS  |
| Scheme operator / network switch | `Network` | Card networks (Visa/Mastercard/UnionPay/RuPay) and A2A scheme operators (Interac, NPCI-UPI |
| Processor / acquirer-processor / gateway | `Cpu` | The technical intermediary (BaaS processor, payment gateway, acquiring processor) that for |
| Clearing house / ACH operator | `Layers` | Batch/netting operators — FedACH, EPN, ACSS, STEP2-T, EBA CLEARING, Bacs. Layered glyph ev |
| Wallet / digital money provider | `Wallet` | Alipay, WeChat Pay, M-Pesa, CoDi — stored-value or pass-through wallets that sit between c |
| Fintech / program manager / neobank | `Rocket` | The non-bank program manager riding a sponsor bank (the FoF Studio core scenario — FBO/spo |
| Correspondent / intermediary bank (nostro/vostro) | `ArrowLeftRight` | The USD/EUR correspondent sitting between originating and beneficiary banks on cross-borde |
| FX desk / CLS settlement (PvP) | `ArrowRightLeft` | Currency conversion and CLSSettlement payment-versus-payment for cross-currency flows (CAD |
| Cross-border messaging / settlement infrastructure | `Globe` | SWIFT, CIPS, PAPSS — the international rails/messaging layers. A globe denotes the cross-b |
| Regulator / supervisor | `Scale` | OSFI, OCC, FDIC, CFPB, FCA, RBI, SAMA, FINTRAC — oversight bodies surfaced in the complian |
| FBO / custodial / settlement account | `Vault` | The pooled For-Benefit-Of or settlement account where program funds actually sit (central  |

## Schemes by region

### United States

- **ACH Network (Nacha)** (ach-batch, significance 5/5, sources: authoritative)  
  Transactions are submitted in batches to one of two ACH Operators (FedACH or EPN), which compute and post deferred net settlement positions across member banks via Federal Reserve accounts.  
  Operator: Two ACH Operators clear and settle: the Federal Reserve (FedACH) and The Clearing House (Electronic Payments Network, EPN). Nacha governs th  
  Rails: ACH, ACH Network, FedACH, EPN, Direct Deposit, Direct Payment · Message: Nacha file format (proprietary fixed-width NACHA record form · Timing: Next business day (standard); same-day available via Same Da  
  Sources: [Federal Reserve — FedACH Services (the F](https://www.federalreserve.gov/paymentsystems/fedach_about.htm)
- **Fedwire Funds Service** (rtgs, significance 5/5, sources: mixed)  
  Each large-value transfer settles individually and finally in real time across the sending and receiving banks' Federal Reserve master accounts (real-time gross settlement).  
  Operator: Federal Reserve Banks  
  Rails: Fedwire, Fedwire Funds Service, wire transfer · Message: ISO 20022 (migrated July 14, 2025; replaced the legacy Fedwi · Timing: Real-time, intraday; immediate, final and irrevocable (typic  
  Sources: [Federal Reserve Financial Services — Fed](https://www.frbservices.org/financial-services/wires) · [Federal Reserve Board — Fedwire Funds Se](https://www.federalreserve.gov/paymentsystems/fedfunds_about.htm)
- **FedNow Service** (instant, significance 5/5, sources: authoritative)  
  Credit-push instant payments settle individually in central-bank money in real time, 24/7, across banks' Federal Reserve master accounts (gross settlement with liquidity-transfer support).  
  Operator: Federal Reserve Banks  
  Rails: FedNow, FedNow Service · Message: ISO 20022 · Timing: Instant, 24/7/365; final and irrevocable in seconds  
  Sources: [The Fed — FedNow Additional Questions an](https://www.federalreserve.gov/paymentsystems/fednow-additional-questions-and-answers.htm) · [The Fed — About the FedNow Service (Boar](https://www.federalreserve.gov/paymentsystems/fednow_about.htm)
- **RTP (Real-Time Payments)** (instant, significance 5/5, sources: authoritative)  
  Credit-push payments clear instantly with finality; settlement is effected against a prefunded joint account banks hold at the Federal Reserve, with positions adjusted in real time (24/7).  
  Operator: The Clearing House (TCH)  
  Rails: RTP, RTP network, The Clearing House RTP · Message: ISO 20022 · Timing: Instant, 24/7/365; final settlement in seconds  
  Sources: [Federal Reserve — Designated Financial M](https://www.federalreserve.gov/paymentsystems/designated_fmu_about.htm) · [Federal Reserve — Order Concerning Payme](https://www.federalreserve.gov/paymentsystems/files/interest_on_rtp_joint_balances.pdf)
- **Zelle** (instant, significance 5/5, sources: authoritative)  
  Zelle is a directory/messaging overlay that links accounts by email or mobile number; the actual money moves on underlying interbank rails — interbank settlement runs over ACH (next-day net) or, increasingly, over RTP (instant).  
  Operator: Early Warning Services, LLC (owned by seven large US banks)  
  Rails: Zelle, Zelle Network · Message: Proprietary Zelle Network messaging; underlying interbank se · Timing: User experience is near-instant (minutes); interbank settlem  
  Sources: [Early Warning — Zelle now settles on the](https://www.earlywarning.com/press-release/early-warning-services-clearing-house-enable-zelle-payments) · [Early Warning / TCH — Zelle and RTP inte](https://www.earlywarning.com/press-release/early-warning-and-clearing-house-complete-critical-integration-milestone-zeller-and)
- **Same Day ACH** (ach-batch, significance 4/5, sources: authoritative)  
  Same-day-eligible batches are processed in faster intraday windows by the ACH Operators, with deferred net settlement posted same business day across member banks via Federal Reserve accounts (per-payment cap currently $1,000,000).  
  Operator: Federal Reserve (FedACH) and The Clearing House (EPN); rules set by Nacha.  
  Rails: Same Day ACH, SDA · Message: Nacha file format (proprietary) · Timing: Same business day, across three daily settlement windows  
  Sources: [Nacha — Same Day ACH (Phase 1)](https://www.nacha.org/rules/same-day-ach-moving-payments-faster-phase-1) · [Nacha — ACH Payments Fact Sheet](https://www.nacha.org/content/ach-payments-fact-sheet)

### Global

- **Visa** (card-network, significance 5/5, sources: weak)  
  Four-party model: real-time authorization messages flow issuer-acquirer over VisaNet (ISO 8583); funds move by deferred net settlement across member banks, with Visa as central calculation/settlement agent.  
  Operator: Visa Inc. (VisaNet)  
  Rails: Visa, VisaNet, Visa credit, Visa debit · Message: ISO 8583 (VisaNet/BASE I and BASE II); migrating toward ISO  · Timing: Authorization in real time; clearing and settlement on a def  
  Sources: [Visa Inc. — VisaNet (official): network ](https://usa.visa.com/products/visanet-plus-ai.html) · [Visa Inc. — Decoding ISO 20022 / card-ra](https://corporate.visa.com/content/dam/VCOM/regional/na/us/sites/documents/veei-whitepaper-decoding-iso-20022.pdf)
- **Mastercard** (card-network, significance 5/5, sources: weak)  
  Four-party model: real-time authorizations flow issuer-acquirer over Banknet (ISO 8583); funds move by deferred net settlement across member banks, with Mastercard as central settlement agent.  
  Operator: Mastercard Incorporated (Banknet / Mastercard Network)  
  Rails: Mastercard, Banknet, Mastercard credit, Mastercard debit, Maestro · Message: ISO 8583 (proprietary Mastercard dialect over Banknet); migr · Timing: Authorization in real time; clearing and settlement on a def  
  Sources: [Mastercard Annual Report (Form 10-K, FY2](https://www.sec.gov/Archives/edgar/data/0001141391/000114139124000080/ma12312023-10xkarsasfiled.pdf) · [Federal Register — Regulation II / Durbi](https://www.federalregister.gov/documents/2023/01/13/2023-00559/mastercard-incorporated-analysis-of-agreement-containing-consent-orders-to-aid-public-comment)
- **SWIFT (FIN MT, ISO 20022 MX, and SWIFT gpi)** (cross-border, significance 5/5, sources: authoritative)  
  Secure financial messaging cooperative: member banks exchange standardized payment instructions (MT/ISO 20022) that move value over correspondent nostro/vostro accounts; SWIFT itself does not hold funds or settle  
  Operator: Society for Worldwide Interbank Financial Telecommunication (SWIFT SC), a member-owned cooperative incorporated in La Hulpe, Belgium  
  Rails: SWIFT, SWIFT network, FIN / MT messages, MX / ISO 20022 messages, SWIFT gpi, Swift Go · Message: Historically SWIFT MT (FIN); migrating to ISO 20022 (MX) for · Timing: Messaging only, not settlement; gpi credits most payments wi  
  Sources: [SWIFT — SWIFT gpi (operator)](https://www.swift.com/products/swift-gpi) · [SWIFT — Oversight & governance (operator](https://www.swift.com/about-us/organisation-governance/swift-oversight)
- **CLS / CLSSettlement (Continuous Linked Settlement)** (other, significance 5/5, sources: authoritative)  
  Eliminates FX settlement (Herstatt) risk by settling both legs of an FX trade simultaneously payment-versus-payment across multi-currency accounts members hold at CLS Bank, with multilateral net pay-ins/pay-outs through national RTGS systems (18 currencies)  
  Operator: CLS Bank International (settlement institution); CLS Group Holdings AG  
  Rails: CLS, CLSSettlement, Continuous Linked Settlement, CLSNet, CLSClearedFX · Message: SWIFT messaging for instructions/funding; PvP settlement on  · Timing: Same-day, within a daily ~5-hour settlement window during ov  
  Sources: [CLS Group — CLSSettlement (operator)](https://www.cls-group.com/products/settlement/clssettlement/) · [CLS Group — Currencies settled (operator](https://www.cls-group.com/products/settlement/clssettlement/currencies/)
- **Correspondent banking (nostro/vostro)** (cross-border, significance 5/5, sources: authoritative)  
  Banks without a direct presence in a currency/jurisdiction route payments through a correspondent that holds their account (vostro from the correspondent's view, nostro from the respondent's), debiting/crediting those accounts via SWIFT instructions, sometimes through multiple intermediary hops  
  Operator: No single operator; a decentralized network of commercial banks holding reciprocal accounts, predominantly messaged over SWIFT  
  Rails: Correspondent banking, nostro/vostro accounts, agency banking, intermediary banking, payment chains · Message: SWIFT MT / ISO 20022 instructions between correspondents · Timing: Variable; minutes to several business days depending on inte  
  Sources: [BIS CPMI — Quantitative review of corres](https://www.bis.org/cpmi/paysysinfo/corr_bank_data.htm) · [BIS CPMI — Correspondent banking report ](https://www.bis.org/cpmi/publ/d147.htm)
- **Visa (VisaNet)** (card-network, significance 5/5, sources: mixed)  
  Four-party open-loop network: issuer authorizes a transaction via VisaNet (ISO 8583), Visa clears the transaction data and computes multilateral net positions, then settles funds between acquirer and issuer banks (typically T+1)  
  Operator: Visa Inc.  
  Rails: Visa, VisaNet, Visa Direct, V Pay, Visa Electron, Plus (ATM) · Message: ISO 8583 (authorization/clearing/settlement), with ISO 20022 · Timing: Authorization in real time; clearing and net settlement to a  
  Sources: [Visa — VisaNet / how Visa works (operato](https://corporate.visa.com/en/about-visa/visanet.html) · [BIS CPMI — International payment arrange](https://www.bis.org/cpmi/publ/d53p16.pdf)
- **Mastercard (Banknet / GCMS)** (card-network, significance 5/5, sources: authoritative)  
  Four-party open-loop network: issuer authorizes over Banknet (ISO 8583), transactions clear through the Global Clearing Management System, and Mastercard nets and settles funds between acquirer and issuer banks (typically T+1)  
  Operator: Mastercard Incorporated  
  Rails: Mastercard, Banknet, Maestro, Cirrus (ATM), Mastercard Send · Message: ISO 8583 (Banknet / Global Clearing Management System), with · Timing: Authorization in real time; clearing via GCMS and net settle  
  Sources: [Mastercard Incorporated — SEC EDGAR fili](https://data.sec.gov/submissions/CIK0001141391.json) · [Mastercard Incorporated — SEC EDGAR enti](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001141391&type=10-K&dateb=&owner=include&count=40)
- **American Express** (card-network, significance 4/5, sources: authoritative)  
  Predominantly a closed-loop model where Amex is issuer, network and frequently acquirer; authorizations and settlement run on its own ISO 8583-based network, paying merchants directly and settling on a deferred basis.  
  Operator: American Express Company (Amex Global Network)  
  Rails: Amex, American Express, Amex Global Network · Message: ISO 8583 (proprietary Amex dialect) · Timing: Authorization in real time; settlement on a deferred basis (  
  Sources: [American Express — Global Network / acqu](https://network.americanexpress.com/globalnetwork/v4/partners/acquirers/power-of-the-network/) · [American Express 2025 Resolution Plan (F](https://www.federalreserve.gov/supervisionreg/resolution-plans/american-express-3g-20251001.pdf)
- **Visa Direct** (card-network, significance 4/5, sources: mixed)  
  Reverses the card rail to push funds: an Original Credit Transaction (OCT, ISO 8583) sends money to an eligible debit/credit card via VisaNet, crediting the recipient card in near-real time while network settlement remains deferred net.  
  Operator: Visa Inc. (Visa Direct, part of Visa Money Movement)  
  Rails: Visa Direct, push-to-card, Original Credit Transaction (OCT) · Message: ISO 8583 (Visa OCT messages); APIs exposed over JSON · Timing: Funds typically available to the recipient card in minutes;   
  Sources: [Visa Developer — Getting Started with Vi](https://developer.visa.com/capabilities/visa_direct/docs) · [Visa — Visa Direct FAQs (how it works, O](https://usa.visa.com/supporting-info/visa-direct/visa-direct-faq.html)
- **Mastercard Send** (card-network, significance 4/5, sources: authoritative)  
  Push-payment service on the Mastercard network: a push Payment Transaction (ISO 8583) credits a recipient card, bank account or wallet in near-real time, with interbank network settlement deferred net; cross-border legs route via Mastercard Move.  
  Operator: Mastercard Incorporated (Mastercard Send / Mastercard Move)  
  Rails: Mastercard Send, Mastercard Move, push-to-card, Payment Transaction (push) · Message: ISO 8583 (Mastercard push/Payment Transaction messages); API · Timing: Funds typically available to the recipient endpoint in secon  
  Sources: [Mastercard Developers — Mastercard Send ](https://developer.mastercard.com/product/mastercard-send/) · [Mastercard Developers — Mastercard Send ](https://developer.mastercard.com/mastercard-send-disbursements/documentation/)
- **UnionPay (China UnionPay / UnionPay International)** (card-network, significance 4/5, sources: mixed)  
  China's bank-card association/switch (established under PBOC approval) that routes domestic yuan card transactions through its network and clears/settles among member banks; UnionPay International extends acceptance abroad via the same ISO 8583-based rails  
  Operator: China UnionPay Co., Ltd.; international expansion via UnionPay International Co., Ltd.  
  Rails: UnionPay, China UnionPay, CUP, 银联, UnionPay International, UnionPay QuickPass · Message: ISO 8583-based UnionPay interface specifications (proprietar · Timing: Real-time authorization; net clearing and settlement typical  
  Sources: [UnionPay International — About Us (opera](https://www.unionpayintl.com/en/aboutUs/) · [UnionPay International — official site h](https://www.unionpayintl.com/en/)
- **American Express** (card-network, significance 4/5, sources: authoritative)  
  Predominantly a closed-loop network where Amex acts as issuer, network and acquirer in one, giving it an end-to-end view of each transaction; it authorizes, clears and settles directly with card members and merchants (plus a Global Network for partner-issued/acquired volume)  
  Operator: American Express Company  
  Rails: American Express, Amex, American Express Global Network · Message: ISO 8583-based proprietary specification · Timing: Real-time authorization; merchant settlement typically withi  
  Sources: [American Express — Global Network for ac](https://network.americanexpress.com/globalnetwork/v4/partners/acquirers/power-of-the-network/) · [ISO — ISO 8583 card message standard](https://www.iso.org/standard/79451.html)
- **ISO 8583 (card message standard)** (other, significance 4/5, sources: authoritative)  
  Not a money rail but the underlying message format: defines the bitmap/data-element structure for card authorization, clearing and settlement messages exchanged between acquirers and issuers; nearly every Visa/Mastercard/UnionPay/JCB/Amex/Discover/Mir/RuPay transaction uses an ISO 8583 variant  
  Operator: International Organization for Standardization (ISO) — standard maintained by ISO/TC 68 (financial services)  
  Rails: ISO 8583, card authorization message, interchange message specification · Message: ISO 8583 itself (the standard); modern card schemes are laye · Timing: N/A — a message format standard, not a settlement system  
  Sources: [ISO — ISO 8583:2023 financial transactio](https://www.iso.org/standard/79451.html) · [ISO — ISO 8583:1993 (historical baseline](https://www.iso.org/standard/15871.html)
- **Discover** (card-network, significance 3/5, sources: authoritative)  
  Closed-loop network where Discover is issuer, network and acquirer; authorizations and deferred settlement flow over its own ISO 8583-based network, with reach extended via Diners Club and the PULSE debit network.  
  Operator: Discover Financial Services (Discover Global Network)  
  Rails: Discover, Discover Global Network, Diners Club, PULSE · Message: ISO 8583 (proprietary Discover dialect) · Timing: Authorization in real time; settlement on a deferred basis (  
  Sources: [Discover Global Network — official netwo](https://www.discoverglobalnetwork.com/)
- **JCB (Japan Credit Bureau)** (card-network, significance 3/5, sources: authoritative)  
  Japan's international card brand operating a four-party-style open-loop network (with partner banks abroad): issuers authorize via ISO 8583 messages and JCB clears and net-settles between acquiring and issuing members  
  Operator: JCB Co., Ltd.  
  Rails: JCB, Japan Credit Bureau, JCB Contactless · Message: ISO 8583-based proprietary specification · Timing: Real-time authorization; clearing and settlement typically n  
  Sources: [METI — Installment Sales Act (regulator ](https://www.meti.go.jp/english/policy/economy/installment_sales/index.html) · [ISO 8583:2023 (standard 79451) — Financi](https://www.iso.org/obp/ui/en/#!iso:std:79451:en)
- **Discover Global Network (Discover, Diners Club International, PULSE)** (card-network, significance 3/5, sources: authoritative)  
  Open-loop network running Discover, Diners Club International and the PULSE debit/ATM network: issuers authorize via ISO 8583, transactions clear and Discover net-settles between acquirers and issuers; Capital One completed its acquisition of Discover on 18 May 2025  
  Operator: Discover Financial Services (Discover Global Network) — owned by Capital One since May 2025  
  Rails: Discover, Discover Global Network, Diners Club International, PULSE · Message: ISO 8583-based proprietary specification · Timing: Real-time authorization; net settlement typically next busin  
  Sources: [Discover IR — Capital One Completes Acqu](https://investorrelations.discover.com/newsroom/press-releases/press-release-details/2025/Capital-One-Completes-Acquisition-of-Discover/default.aspx) · [Capital One 8-K, filed May 2025 (SEC EDG](https://www.sec.gov/Archives/edgar/data/0000927628/000119312525122059/d934475d8k.htm)
- **Wise (fintech cross-border, category exemplar)** (cross-border, significance 3/5, sources: mixed)  
  Representative of the fintech cross-border category: rather than wiring each payment internationally, Wise holds local float/accounts in many currencies and largely 'matches' opposite-direction flows, paying recipients out of local balances over domestic rails at mid-market FX — reducing reliance on full correspondent chains  
  Operator: Wise Payments Limited / Wise plc  
  Rails: Wise, Wise (formerly TransferWise), Wise Platform, Wise Account / multi-currency account · Message: Connects to underlying rails (SWIFT, local ACH/instant schem · Timing: Often seconds to same-day for major corridors; longer where   
  Sources: [Wise — How is Wise regulated in each cou](https://wise.com/help/articles/2932693/how-is-wise-regulated-in-each-country-and-region) · [FCA Financial Services Register — Wise P](https://register.fca.org.uk/s/firm?id=001b000001EjC6SAAV)
- **Stablecoin / crypto on- and off-ramps (emerging, non-traditional)** (other, significance 3/5, sources: authoritative)  
  OUT-OF-TRADITIONAL-RAILS / EMERGING: value moves as fiat-referenced tokens transferred peer-to-peer on a blockchain ledger (settlement = on-chain finality), with 'on-ramps'/'off-ramps' (exchanges, PSPs, issuer redemption) bridging to and from bank money; US framework set by the GENIUS Act 2025, fully effective by Jan 2027 — uncertainty remains as no stablecoins were yet issued under it at time of writing  
  Operator: No single operator — stablecoin issuers (e.g. regulated permitted payment-stablecoin issuers) plus exchanges/PSPs acting as fiat on/off-ramp  
  Rails: stablecoins, USDC / USDT / payment stablecoins, on-ramp / off-ramp, fiat-to-crypto conversion, blockchain settlement · Message: Blockchain transaction formats (e.g. ERC-20) + token transfe · Timing: On-chain transfer near-instant to minutes; fiat on/off-ramp   
  Sources: [Federal Reserve — Payment stablecoins an](https://www.federalreserve.gov/econres/notes/feds-notes/payment-stablecoins-and-cross-border-payments-benefits-and-implications-for-monetary-policy-20260330.html) · [Congress.gov — GENIUS Act of 2025 (S.158](https://www.congress.gov/crs-product/IN12553)

### Canada

- **Interac e-Transfer** (instant, significance 5/5, sources: authoritative)  
  A messaging/directory overlay (linking by email or mobile number) that notifies the recipient to deposit funds; the money itself is moved between banks via the underlying Payments Canada clearing system rather than on the Interac message rail.  
  Operator: Interac Corp.  
  Rails: Interac e-Transfer, e-Transfer, EMT (legacy) · Message: Proprietary Interac messaging; underlying interbank settleme · Timing: Near-instant to the recipient (seconds, up to ~30 min); inte  
  Sources: [Interac Corp. — e-Transfer (official)](https://www.interac.ca/en/payments/personal/send-receive-money-with-interac-e-transfer/) · [Interac Corp. — company overview](https://www.interac.ca/en/company/about/company-overview/)
- **Interac Debit** (card-network, significance 4/5, sources: authoritative)  
  Canada's domestic debit network: real-time authorization between merchant acquirer and cardholder's bank over the Interac network, with the resulting debit/credit items cleared and net-settled through Payments Canada's ACSS.  
  Operator: Interac Corp.  
  Rails: Interac Debit, Interac Flash, Interac (debit at POS/ATM) · Message: ISO 8583-based card messaging (Interac domestic dialect) · Timing: Authorization in real time; interbank settlement via ACSS (d  
  Sources: [Interac Corp. — company overview (debit ](https://www.interac.ca/en/company/about/company-overview/) · [Interac Corp. — official home](https://www.interac.ca/en/)
- **Lynx** (rtgs, significance 4/5, sources: authoritative)  
  Canada's high-value RTGS: each wire settles individually with real-time finality across participants' settlement accounts at the Bank of Canada, which acts as settlement agent (replaced LVTS in 2021).  
  Operator: Payments Canada  
  Rails: Lynx, high-value payment system, wire (replaced LVTS) · Message: ISO 20022 (MX messages; full adoption achieved) · Timing: Real-time, intraday; irrevocable with real-time finality  
  Sources: [Payments Canada — High-value payment sys](https://www.payments.ca/systems-services/payment-systems/high-value-payment-system-lynx) · [Payments Canada — Lynx achieves full ISO](https://www.payments.ca/lynx-achieves-full-adoption-iso-20022-messaging-standard-mx-and-implementation-hybrid-postal)
- **ACSS (Automated Clearing Settlement System)** (ach-batch, significance 4/5, sources: authoritative)  
  Canada's main retail clearing system: banks exchange cheques, pre-authorized debits/credits, point-of-sale and ATM items; the ACSS computes net balances and settles them the next business morning via the Bank of Canada.  
  Operator: Payments Canada  
  Rails: ACSS, retail batch payment system, USBE (US Bulk Exchange, USD items) · Message: Payments Canada / Canadian Payments Association rules-based  · Timing: Deferred net settlement; net positions settled the following  
  Sources: [Payments Canada — Retail batch payment s](https://www.payments.ca/systems-services/payment-systems/retail-batch-payment-system) · [Payments Canada — ACSS rules update (eff](https://www.payments.ca/rules-automated-clearing-and-settlement-system-acss-updated-effective-april-28-2025)
- **Real-Time Rail (RTR)** (instant, significance 4/5, sources: authoritative)  
  Canada's new instant credit-push system: payments clear in real time over an Interac-built exchange using ISO 20022, with the Bank of Canada acting as settlement agent (gross/real-time settlement model), available 24/7.  
  Operator: Payments Canada (Interac Corp. selected as the exchange-solution provider)  
  Rails: RTR, Real-Time Rail, real-time payments · Message: ISO 20022 · Timing: Instant, 24/7/365; irrevocable funds in seconds (live rollou  
  Sources: [Payments Canada — Real-Time Rail payment](https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system) · [Payments Canada — selects Interac Corp. ](https://www.payments.ca/payments-canada-selects-interac-corp-exchange-solution-provider-canadas-new-real-time-payments)
- **EFT / AFT (Automated Funds Transfer)** (ach-batch, significance 3/5, sources: authoritative)  
  Canada's electronic batch direct-credit/direct-debit stream (the equivalent of US ACH): AFT files of credits (e.g. payroll) and debits (e.g. PADs) are exchanged between banks and net-settled through the ACSS, typically next business day. (Note: 'EFT' is used loosely in Canada; the formal Payments Canada stream is AFT.)  
  Operator: Payments Canada (cleared and settled through the ACSS)  
  Rails: EFT, AFT, Automated Funds Transfer, direct deposit, pre-authorized debit (PAD) · Message: Payments Canada AFT standard 005 record format (proprietary) · Timing: Deferred net settlement via ACSS; typically next business da  
  Sources: [Payments Canada — Retail batch payment s](https://www.payments.ca/systems-services/payment-systems/retail-batch-payment-system) · [Payments Canada — Rule F1: Rules Applica](https://www.payments.ca/sites/default/files/f1eng.pdf)

### Mexico

- **SPEI (Sistema de Pagos Electrónicos Interbancarios)** (instant, significance 5/5, sources: authoritative)  
  Central-bank-operated real-time gross settlement system: each interbank transfer is processed and settled individually in central-bank money in seconds, 24/7, with immediate finality (Banxico is both operator and settlement agent).  
  Operator: Banco de México (Banxico)  
  Rails: SPEI, Sistema de Pagos Electrónicos Interbancarios, transferencia interbancaria · Message: Banco de México proprietary SPEI message format (XML-based) · Timing: Real-time, 24/7; final and irrevocable, typically within sec  
  Sources: [Banco de México — SPEI (official scheme ](https://www.banxico.org.mx/servicios/sistema-pagos-electronicos-in001.html) · [Banco de México — Interbank Electronic P](https://www.banxico.org.mx/payment-systems/d/%7B90965A55-8F44-7DD2-45CF-2BF1D7C0B75B%7D.pdf)
- **CoDi (Cobro Digital)** (wallet, significance 3/5, sources: mixed)  
  A QR-code / request-to-pay layer on top of SPEI: the payee generates a QR or payment request, and on acceptance the funds move instantly bank-to-bank over SPEI (CoDi is the initiation overlay, not a separate settlement rail). Note: I could not isolate a dedicated CoDi-only page on banxico.org.mx in this pass, so the CoDi-specific details rely on the SPEI/Banxico hub plus the World Bank case study.  
  Operator: Banco de México (Banxico)  
  Rails: CoDi, Cobro Digital, QR payments · Message: Built on SPEI (Banxico proprietary message format); QR / pus · Timing: Instant (settles over SPEI in seconds); no fees  
  Sources: [Banco de México — CoDi (Cobro Digital), ](https://www.banxico.org.mx/sistemas-de-pago/codi-cobro-digital-banco-me.html) · [Banco de México — SPEI / Sistema de Pago](https://www.banxico.org.mx/servicios/sistema-pagos-electronicos-in001.html)

### Europe

- **SEPA Credit Transfer (SCT)** (ach-batch, significance 5/5, sources: authoritative)  
  Bank submits credit-transfer files to a clearing mechanism (CSM); transactions are cleared in batch cycles and net positions settle in central-bank money via the T2 RTGS system, with funds credited to the payee by D+1.  
  Operator: European Payments Council (EPC) — scheme manager/rulebook owner; clearing performed by CSMs such as EBA CLEARING STEP2 and national ACHs, se  
  Rails: SCT, SEPA Credit Transfer, Überweisung (SEPA), virement SEPA · Message: ISO 20022 (XML; Implementation Guidelines based on the 2019  · Timing: Next business day (D+1) credit at latest; cleared in batch c  
  Sources: [simple-icons SEPA brand entry (slug "sep](https://github.com/simple-icons/simple-icons/blob/develop/slugs.md) · [EPC — SEPA logo vector + visual identity](https://www.europeanpaymentscouncil.eu/document-library/other/sepa-logo-visual-identity-guidelines)
- **SEPA Instant Credit Transfer (SCT Inst)** (instant, significance 5/5, sources: authoritative)  
  Payer and payee PSPs plus the instant CSM (RT1 or TIPS) have ~10 seconds to clear and settle a single euro payment in central-bank money around the clock, with the payee credited and the payer debited near-simultaneously.  
  Operator: European Payments Council (EPC) — scheme owner; instant clearing/settlement via systems such as EBA CLEARING RT1 and ECB TIPS  
  Rails: SCT Inst, SEPA Instant, instant SEPA credit transfer · Message: ISO 20022 (XML; 2019 message version, real-time profile) · Timing: Funds available to payee in under 10 seconds, 24/7/365 (regu  
  Sources: [simple-icons — SEPA icon (CC0 1.0), raw ](https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/sepa.svg) · [EUR-Lex — Regulation (EU) 2024/886 Insta](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202400886)
- **T2 (RTGS) — successor to TARGET2** (rtgs, significance 5/5, sources: authoritative)  
  High-value and bank-to-bank euro payments settle individually and irrevocably in real time across participants' accounts in central-bank money, with a Central Liquidity Management (CLM) component managing liquidity and an RTGS component settling payments.  
  Operator: Eurosystem — European Central Bank and euro-area national central banks (built/run on the 4CB platform)  
  Rails: T2, TARGET2 (legacy name), TARGET RTGS, CLM + RTGS · Message: ISO 20022 (migrated from SWIFT MT; common with T2S, TIPS, EC · Timing: Real-time gross settlement, transaction-by-transaction, intr  
  Sources: [ECB — What is T2?](https://www.ecb.europa.eu/paym/target/t2/html/index.en.html) · [ECB — Successful launch of new T2 wholes](https://www.ecb.europa.eu/press/pr/date/2023/html/ecb.pr230321~f5c7bddf6d.en.html)
- **SEPA Direct Debit (SDD Core & SDD B2B)** (ach-batch, significance 4/5, sources: authoritative)  
  Creditor (biller), authorised by a stored mandate under the creditor-driven mandate flow, presents collection instructions through a CSM; debtor banks debit accounts on the due date and net positions settle in central-bank money via T2.  
  Operator: European Payments Council (EPC) — scheme owner (SDD Core for consumers, SDD B2B for businesses); cleared via CSMs (e.g. EBA CLEARING STEP2),  
  Rails: SDD, SEPA Direct Debit, SDD Core, SDD B2B, Lastschrift (SEPA) · Message: ISO 20022 (XML; 2019 message version per Implementation Guid · Timing: Collection on a pre-agreed due date; presented in batch ahea  
  Sources: [simple-icons — SEPA icon (CC0), confirms](https://cdn.simpleicons.org/sepa) · [simple-icons LICENSE — CC0 1.0 Universal](https://github.com/simple-icons/simple-icons/blob/master/LICENSE.md)
- **TIPS (TARGET Instant Payment Settlement)** (instant, significance 4/5, sources: authoritative)  
  Built on the SCT Inst scheme, TIPS settles individual instant euro payments gross and irrevocably in central-bank money within seconds, around the clock, acting as a pan-European instant settlement engine for participating PSPs and ACHs.  
  Operator: Eurosystem — European Central Bank and euro-area national central banks  
  Rails: TIPS, TARGET Instant Payment Settlement · Message: ISO 20022 (common with T2, T2S, ECMS) · Timing: Instant gross settlement in central-bank money, in seconds,   
  Sources: [ECB — TARGET Services overview (incl. TI](https://www.ecb.europa.eu/paym/target/html/index.en.html) · [ECB — The new TARGET instant payment set](https://www.ecb.europa.eu/press/intro/mip-online/2017/html/201706_article_tips.en.html)
- **RT1 (EBA CLEARING)** (instant, significance 4/5, sources: authoritative)  
  Pan-European instant payment system processing EPC-compliant SCT Inst (and OCT Inst) euro payments in seconds on a prefunded basis, with settlement positions backed by liquidity held in TARGET (T2), available around the clock.  
  Operator: EBA CLEARING (privately owned, European financial market infrastructure provider)  
  Rails: RT1, RT1 SCT Inst, RT1 OCT Inst · Message: ISO 20022 (real-time messaging, EPC SCT Inst / OCT Inst comp · Timing: Instant — end-to-end processing in seconds (avg ~1s between   
  Sources: [EBA CLEARING — RT1 System (operator)](https://www.ebaclearing.eu/services-instant-payments/rt1/) · [EBA CLEARING — RT1 SCT Inst overview (op](https://www.ebaclearing.eu/services-instant-payments/rt1-sct-inst/)
- **STEP2-T (EBA CLEARING)** (ach-batch, significance 4/5, sources: authoritative)  
  Pan-European automated clearing house for euro mass payments (SEPA credit transfers and direct debits): participants exchange batched ISO 20022 files across daily cycles and net positions settle in central-bank money via the T2 RTGS system.  
  Operator: EBA CLEARING  
  Rails: STEP2, STEP2-T, STEP2 SCT, STEP2 SDD · Message: ISO 20022 (XML; SEPA SCT and SDD) · Timing: Multiple batch cycles per day (near-continuous); net settlem  
  Sources: [EBA CLEARING — STEP2-T System (operator ](https://www.ebaclearing.eu/services-sepa-payments/step2-t/) · [EBA CLEARING — STEP2-T Settlement (Conti](https://www.ebaclearing.eu/services-sepa-payments/step2-t/settlement/)

### United Kingdom

- **Faster Payment System (FPS)** (instant, significance 5/5, sources: authoritative)  
  Single sterling payments are exchanged and made available to the payee in real time around the clock, while banks settle the resulting net positions in central-bank money at the Bank of England via deferred net settlement roughly three times each business day.  
  Operator: Pay.UK (scheme operator); central infrastructure provided by Vocalink/Mastercard  
  Rails: Faster Payments, FPS, Faster Payment System · Message: ISO 8583-based (legacy FPS); migrating toward ISO 20022 unde · Timing: Funds received within seconds, 24/7/365 (limit £1m); deferre  
  Sources: [Pay.UK — Faster Payment System](https://www.wearepay.uk/what-we-do/payment-systems/faster-payment-system/) · [Pay.UK — How Faster Payments work](https://www.wearepay.uk/what-we-do/payment-systems/faster-payment-system/how-faster-payments-work/)
- **CHAPS** (rtgs, significance 5/5, sources: authoritative)  
  High-value, time-critical sterling payments (e.g. house purchases, wholesale flows) settle individually, irrevocably and in real time across banks' settlement accounts at the Bank of England's RTGS service, with no netting.  
  Operator: Bank of England (operator of CHAPS since November 2017; settles across the Bank's RTGS service)  
  Rails: CHAPS, RTGS (Bank of England) · Message: ISO 20022 (migrated June 2023, on the enhanced MX standard v · Timing: Same-day, real-time gross settlement in central-bank money (  
  Sources: [Bank of England — CHAPS](https://www.bankofengland.co.uk/payment-and-settlement/chaps) · [Bank of England — A brief introduction t](https://www.bankofengland.co.uk/payment-and-settlement/a-brief-introduction-to-the-real-time-gross-settlement-system-and-chaps)
- **Bacs (Direct Debit & Direct Credit)** (ach-batch, significance 4/5, sources: authoritative)  
  Bulk sterling Direct Debits and Direct Credits are submitted in batch and run on a fixed three-day cycle, with each participant's net position settled in central-bank money at the Bank of England at 09:30 on the third day.  
  Operator: Pay.UK (Bacs became a wholly owned subsidiary of Pay.UK in 2018); infrastructure by Vocalink/Mastercard  
  Rails: Bacs, Bacs Direct Debit, Bacs Direct Credit · Message: Standard 18 (proprietary Bacs fixed-format); separate from I · Timing: Three-day processing cycle (submit, process, settle); net se  
  Sources: [Bank of England — Consolidation of three](https://www.bankofengland.co.uk/news/2018/may/consolidation-of-three-uk-payment-system-operators) · [Payment Systems Regulator — Who we regul](https://www.psr.org.uk/how-we-regulate/who-we-regulate/)
- **New Payments Architecture (NPA) / central infrastructure renewal** (other, significance 3/5, sources: weak)  
  Programme (not yet a live rail) to renew the UK's retail interbank clearing-and-settlement infrastructure on ISO 20022; NOTE: the original NPA competitive procurement was cancelled and Pay.UK is now pursuing a modular, phased infrastructure-renewal strategy aligned to the 2024 National Payments Vision — treat scope/timeline as in flux.  
  Operator: Pay.UK (programme owner)  
  Rails: NPA, New Payments Architecture, central infrastructure renewal · Message: ISO 20022 (target standard for the renewed retail interbank  · Timing: Not yet live — future programme to renew the clearing/settle  
  Sources: [Payment Systems Regulator — Interbank In](https://www.psr.org.uk/our-work/interbank-infrastructure-renewal-iir/) · [HM Treasury — National Payments Vision (](https://assets.publishing.service.gov.uk/media/6736385fb613efc3f182317a/National_Payments_Vision..pdf)
- **Confirmation of Payee (CoP)** (other, significance 3/5, sources: authoritative)  
  An overlay (not a payment rail): before a sterling payment is sent, the payer's PSP queries the payee's PSP via API to check whether the entered name matches the account holder, returning match / close-match / no-match / unavailable to reduce misdirected payments and APP fraud.  
  Operator: Pay.UK (operates the CoP overlay/name-checking service)  
  Rails: Confirmation of Payee, CoP, account name check · Message: Open Banking-style API (CoP uses an API request/response mod · Timing: N/A — overlay service, not a settlement rail; performs a rea  
  Sources: [Pay.UK — Confirmation of Payee (operator](https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/) · [Payment Systems Regulator — Confirmation](https://www.psr.org.uk/our-work/app-scams/confirmation-of-payee/)

### India

- **UPI (Unified Payments Interface)** (instant, significance 5/5, sources: authoritative)  
  Real-time account-to-account messaging via NPCI's central switch (overlaid on IMPS-style rails), with interbank obligations netted and settled across member banks through NPCI's RTGS settlement membership at the RBI  
  Operator: National Payments Corporation of India (NPCI)  
  Rails: UPI, Unified Payments Interface, BHIM UPI · Message: Proprietary NPCI UPI API/specification (ISO 20022-aligned da · Timing: Instant payment confirmation 24/7; interbank funds settled b  
  Sources: [NPCI — UPI product page](https://www.npci.org.in/product/upi) · [NPCI — circulars / UPI](https://www.npci.org.in/circulars/upi)
- **IMPS (Immediate Payment Service)** (instant, significance 4/5, sources: authoritative)  
  24/7 interbank instant funds transfer switched through NPCI; member-bank obligations are netted and settled same-day, backed by NPCI's Settlement Guarantee Fund  
  Operator: National Payments Corporation of India (NPCI)  
  Rails: IMPS, Immediate Payment Service · Message: Proprietary NPCI IMPS specification (ISO 8583-derived switch · Timing: Instant 24/7 for the customer; interbank settlement by NPCI   
  Sources: [NPCI — IMPS Product Overview (official)](https://www.npci.org.in/what-we-do/imps/product-overview) · [NPCI — Settlement Risk Management (Settl](https://www.npci.org.in/who-we-are/risk-management/settlement-risk-management)
- **NEFT (National Electronic Funds Transfer)** (ach-batch, significance 4/5, sources: mixed)  
  Bank-to-bank credit transfers batched and settled on a deferred net settlement basis in half-hourly cycles directly on the RBI's books  
  Operator: Reserve Bank of India (RBI)  
  Rails: NEFT, National Electronic Funds Transfer · Message: RBI NEFT message format (SFMS-based; ISO 20022 adopted along · Timing: Deferred net settlement in half-hourly batches, 24/7/365 (si  
  Sources: [RBI — NEFT system FAQs (operator, half-h](https://www.rbi.org.in/scripts/FAQView.aspx?Id=60) · [RBI — Press Release: NEFT available 24x7](https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=48884)
- **RTGS (Real Time Gross Settlement, India)** (rtgs, significance 4/5, sources: mixed)  
  Large-value, high-priority transfers settled individually and irrevocably in real time across banks' settlement accounts held at the RBI  
  Operator: Reserve Bank of India (RBI)  
  Rails: RTGS, NG-RTGS, Next Generation RTGS · Message: ISO 20022 (pacs.008, pacs.009, pacs.004, pacs.002, camt.054) · Timing: Real-time gross settlement, transaction-by-transaction, 24/7  
  Sources: [RBI — NG-RTGS ISO 20022 XSDs, Rules, Sam](https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=28270) · [RBI — RTGS FAQ (operator, real-time gros](https://www.rbi.org.in/scripts/FAQView.aspx?Id=65)
- **RuPay** (card-network, significance 4/5, sources: authoritative)  
  India's domestic card network: card-present/CNP authorizations routed via NPCI's switch in ISO 8583, with issuer/acquirer obligations cleared and net-settled through NPCI  
  Operator: National Payments Corporation of India (NPCI)  
  Rails: RuPay, RuPay Debit, RuPay Credit · Message: ISO 8583 (card authorization messaging) · Timing: Real-time authorization; interbank clearing/settlement by NP  
  Sources: [NPCI — About RuPay](https://www.npci.org.in/product/rupay/about-rupay) · [NPCI — RuPay product page (canonical; re](https://www.npci.org.in/product/rupay)
- **RuPay** (card-network, significance 3/5, sources: authoritative)  
  India's domestic open-loop card scheme run by NPCI (set up by RBI and the Indian Banks' Association): issuers authorize via ISO 8583, NPCI clears and net-settles between member banks; RuPay credit cards can now also be linked to and spent over UPI  
  Operator: National Payments Corporation of India (NPCI)  
  Rails: RuPay, RuPay Debit, RuPay Credit, RuPay on UPI · Message: ISO 8583-based proprietary specification (NPCI/RuPay) · Timing: Real-time authorization; domestic net settlement same/next b  
  Sources: [NPCI — About RuPay (operator)](https://www.npci.org.in/product/rupay/about-rupay) · [NPCI — RuPay product page (operator)](https://www.npci.org.in/product/rupay)

### China

- **UnionPay (China UnionPay)** (card-network, significance 5/5, sources: weak)  
  China's national bankcard switch: it operates the unified interbank card network, routing authorizations and clearing/net-settling issuer-acquirer obligations domestically and cross-border  
  Operator: China UnionPay Co., Ltd. (UnionPay International for cross-border)  
  Rails: UnionPay, China UnionPay, CUP, 银联 · Message: ISO 8583 (with UnionPay-specific UICS/CUPS implementation) · Timing: Real-time authorization; interbank net clearing and settleme  
  Sources: [UnionPay International — Introduction (A](https://www.unionpayintl.com/en/aboutUs/companyProfile/introductiontoUPI/) · [People's Bank of China — Payment and Set](http://www.pbc.gov.cn/en/3688066/3688095/3689388/index.html)
- **CIPS (Cross-border Interbank Payment System)** (cross-border, significance 5/5, sources: mixed)  
  Dedicated cross-border RMB clearing/settlement system: direct and indirect participants route ISO 20022 RMB payments through CIPS, which clears and settles offshore RMB obligations (via PBoC infrastructure)  
  Operator: Cross-border Interbank Payment System Co., Ltd. (CIPS Co., Ltd., established by PBoC)  
  Rails: CIPS, Cross-border Interbank Payment System · Message: ISO 20022 · Timing: Real-time gross settlement and deferred net settlement modes  
  Sources: [CIPS — official site (English)](https://www.cips.com.cn/en/index/index.html) · [CIPS — Introduction (operator; documents](https://www.cips.com.cn/en/about_us/about_cips/introduction/index.html)
- **Alipay** (wallet, significance 5/5, sources: mixed)  
  Mobile wallet front-end (QR/in-app) where balances and bank-linked payments are switched and net-cleared through the PBoC-chartered NetsUnion (NUCC) platform rather than direct bank links  
  Operator: Ant Group (Alipay) — interbank clearing via NetsUnion Clearing Corporation (NUCC)  
  Rails: Alipay, 支付宝, Alipay+ · Message: Proprietary Alipay APIs; bank/clearing leg via NetsUnion (NU · Timing: Instant to the user; underlying bank funds cleared/settled t  
  Sources: [NetsUnion Clearing Corporation (NUCC) — ](https://www.nucc.com/) · [People's Bank of China — official Englis](http://www.pbc.gov.cn/en/)
- **WeChat Pay (Weixin Pay / Tenpay)** (wallet, significance 5/5, sources: mixed)  
  Tencent's QR/in-app wallet where bank-linked and balance payments are routed and net-cleared through the PBoC-mandated NetsUnion (NUCC) platform  
  Operator: Tenpay (Tencent) — interbank clearing via NetsUnion Clearing Corporation (NUCC)  
  Rails: WeChat Pay, Weixin Pay, 微信支付, Tenpay · Message: Proprietary Tenpay/WeChat Pay APIs; bank/clearing leg via Ne · Timing: Instant to the user; underlying bank funds cleared/settled t  
  Sources: [NetsUnion Clearing Corporation (NUCC) — ](https://www.nucc.com/) · [PBoC (English) — Payment & Settlement Sy](https://www.pbc.gov.cn/en/3688241/3688663/3688669/index.html)
- **CNAPS (China National Advanced Payment System)** (rtgs, significance 4/5, sources: mixed)  
  China's domestic interbank backbone run by the PBoC's clearing center: HVPS settles large-value payments gross in real time on central-bank accounts, while BEPS nets and batch-settles bulk low-value payments  
  Operator: China National Clearing Center (CNCC), People's Bank of China  
  Rails: CNAPS, HVPS (High-Value Payment System), BEPS (Bulk Electronic Payment System) · Message: Proprietary PBoC CNAPS message standard (CNAPS codes for rou · Timing: HVPS: real-time gross settlement; BEPS: deferred net (batch)  
  Sources: [BIS CPSS Red Book (2012) — Payment, clea](https://www.bis.org/cpmi/publ/d105_cn.pdf) · [People's Bank of China (PBoC) — Payment ](https://www.pbc.gov.cn/en/3688241/3688663/3688666/index.html)

### Brazil

- **Pix** (instant, significance 5/5, sources: authoritative)  
  Real-time gross settlement of each transfer in central-bank money on the BCB-run SPI (no netting, no daily cycle); the order settles only if the payer's institution has funds in its SPI Pix account at that instant, otherwise it is auto-rejected  
  Operator: Banco Central do Brasil (BCB) — operates the SPI (Sistema de Pagamentos Instantâneos) settlement core; the DICT proxy directory is also run   
  Rails: Pix, SPI (Sistema de Pagamentos Instantâneos), PIX · Message: ISO 20022 (Brazil-specific message catalog) · Timing: Real-time, 24/7/365; final in seconds  
  Sources: [Banco Central do Brasil — Pix (official)](https://www.bcb.gov.br/en/financialstability/pix_en) · [BCB — SPI Annual Report 2024 (PDF)](https://www.bcb.gov.br/content/financialstability/spi_annual_reports/SPI_2024.pdf)

### Africa

- **M-Pesa** (wallet, significance 5/5, sources: authoritative)  
  Closed-loop e-money: Safaricom issues wallet balances 1:1 against cash held in CBK-supervised trust accounts at commercial banks; transfers move e-value between wallets in real time, while the underlying cash stays pooled in the trust (settles only on bank-rail in/out)  
  Operator: Safaricom PLC (M-Pesa mobile-money e-money wallet; e-value fully backed by funds in ring-fenced trust accounts at commercial banks)  
  Rails: M-Pesa, M-PESA · Message: Proprietary (USSD/STK and Daraja API); not ISO 20022 · Timing: Real-time wallet-to-wallet transfer of e-money; agent cash-i  
  Sources: [Central Bank of Kenya — National Payment](https://www.centralbank.go.ke/national-payments-system/mobile-payments/) · [Kenya — National Payment System Act, 201](https://www.centralbank.go.ke/images/docs/legislation/NATIONAL%20PAYMENT%20SYSTEM%20ACT%20(No%2039%20of%202011)%20(2).pdf)
- **NIBSS Instant Payment (NIP)** (instant, significance 4/5, sources: authoritative)  
  Account-to-account instant credit transfer: NIBSS routes the payment message and credits the beneficiary instantly, while interbank obligations are aggregated and settled on a deferred-net basis in central-bank money across banks' CBN RTGS settlement accounts  
  Operator: Nigeria Inter-Bank Settlement System Plc (NIBSS) — owned by the Central Bank of Nigeria and licensed banks  
  Rails: NIP, NIBSS Instant Payment, NIBSS Instant Pay · Message: ISO 8583 (interface specifications conform to ISO 8583) · Timing: Instant credit to beneficiary; interbank settlement via defe  
  Sources: [CBN — Circular on Review of Operations o](https://www.cbn.gov.ng/Out/2014/BPSD/Circular%20on%20the%20Review%20of%20Operations%20of%20NIBSS%20Instant%20Payment%20(NIP)%20System%20and%20other%20EPayment%20Options%20with%20similar%20Features.pdf) · [NIBSS — NIBSS Instant Payment (NIP) (off](https://nibss-plc.com.ng/nibss-instant-payment/)
- **PAPSS (Pan-African Payment and Settlement System)** (cross-border, significance 4/5, sources: authoritative)  
  Cross-border instant payment in local currencies with continental multilateral net settlement: PAPSS computes each central bank's net position daily, instructs national RTGS systems to debit/credit, and Afreximbank acts as hard-currency settlement agent guaranteeing the leg between central banks (removes need to route via correspondent banks outside Africa)  
  Operator: PAPSS (the company/FMI), developed by African Export-Import Bank (Afreximbank); Afreximbank is the main settlement agent, in partnership wit  
  Rails: PAPSS, Pan-African Payment and Settlement System · Message: ISO 20022 · Timing: Payment instruction processed within ~120 seconds in local c  
  Sources: [PAPSS — Afreximbank & AfCFTA announce op](https://papss.com/media/afreximbank-and-afcfta-announce-the-operational-roll-out-of-the-pan-african-payment-and-settlement-system-papss/) · [PAPSS — How it works (official)](https://papss.com/how-it-works/)
- **PesaLink** (instant, significance 3/5, sources: mixed)  
  Bank-led real-time A2A switch: IPSL routes instant credit transfers directly between participating institutions' accounts (bypassing card rails and mobile-money wallets), with interbank obligations settled same-day in central-bank money via CBK  
  Operator: Integrated Payment Services Limited (IPSL) — a subsidiary owned by the Kenya Bankers Association (KBA)  
  Rails: PesaLink, Pesalink · Message: ISO 20022 (migrated to modernized real-time platform on ISO  · Timing: Real-time account-to-account transfer, 24/7; interbank settl  
  Sources: [AfricaNenda — State of Instant and Inclu](https://africanenda.org/wp-content/uploads/EN_SIIPS_Casestudy_Pesalink-1.pdf) · [Kenya Bankers Association — IPSL (PesaLi](https://www.kba.co.ke/gituku-kirika-joins-pesalink-operator-integrated-payment-services-limited-ipsl-as-chief-executive-officer/)

### Singapore

- **PayNow** (instant, significance 4/5, sources: mixed)  
  Proxy-addressed (mobile/NRIC/UEN) overlay on the FAST rails: payments are switched in near real time and interbank obligations are net-settled across participating banks  
  Operator: Banking Computer Services Pte Ltd (BCS, a NETS company); scheme owned by Association of Banks in Singapore (ABS)  
  Rails: PayNow, PayNow Corporate · Message: ISO 20022 (runs over the FAST rails) · Timing: Near-instant 24/7; interbank settlement via deferred net set  
  Sources: [World Bank Fast Payments Toolkit — Singa](https://fastpayments.worldbank.org/sites/default/files/2021-10/World_Bank_FPS_Singapore_FAST_Case_Study.pdf) · [Association of Banks in Singapore (ABS) ](https://www.abs.org.sg/consumer-banking/pay-now)
- **FAST (Fast And Secure Transfers)** (instant, significance 4/5, sources: mixed)  
  Singapore's 24/7 retail instant credit-transfer rail: BCS switches payments in real time and net-settles interbank positions across participating banks under MAS oversight  
  Operator: Banking Computer Services Pte Ltd (BCS, a NETS company); governed by Association of Banks in Singapore (ABS)  
  Rails: FAST, Fast And Secure Transfers · Message: ISO 20022 · Timing: Near-instant funds availability 24/7; interbank deferred net  
  Sources: [ABS — FAST and Secure Transfers Fact She](https://www.abs.org.sg/docs/library/2024-06-28-fast-fact-sheet.pdf) · [World Bank Fast Payments Toolkit — Singa](https://fastpayments.worldbank.org/sites/default/files/2021-10/World_Bank_FPS_Singapore_FAST_Case_Study.pdf)

### Hong Kong

- **FPS (Faster Payment System)** (instant, significance 4/5, sources: mixed)  
  HKMA-introduced, HKICL-operated instant payment system supporting HKD and RMB with proxy addressing; HKD payments settle in real time on HKMA's books (part of HKD CHATS)  
  Operator: Hong Kong Interbank Clearing Limited (HKICL)  
  Rails: FPS, Faster Payment System, 轉數快 · Message: ISO 20022 · Timing: Real-time, 24/7/365; HKD settled across HKMA's books, RMB se  
  Sources: [HKICL — FPS overview (operator)](https://fps.hkicl.com.hk/eng/fps/about_fps/overview.php) · [HKMA — Faster Payment System (FPS) (regu](https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/financial-market-infrastructure/faster-payment-system-fps/)

### Japan

- **Zengin System (Zengin Data Telecommunication System)** (instant, significance 4/5, sources: mixed)  
  Japan's domestic interbank funds-transfer backbone: Zengin-Net (a licensed Fund Clearing Agency) clears retail/corporate transfers and net-settles interbank obligations across banks' BOJ accounts via BOJ-NET  
  Operator: Japanese Banks' Payment Clearing Network (Zengin-Net), a subsidiary of the Japanese Bankers Association (JBA)  
  Rails: Zengin System, Zengin-Net, 全銀システム · Message: Proprietary Zengin message format (ISO 20022 migration under · Timing: Near-real-time customer transfers on business days; interban  
  Sources: [Zengin-Net — Clearing of Funds (operator](https://www.zengin-net.jp/en/zengin_net/clearing/) · [Bank of Japan — Payment and Settlement S](https://www.boj.or.jp/en/paym/outline/pay_boj/index.htm)

### Australia

- **NPP (New Payments Platform) / PayTo** (instant, significance 4/5, sources: authoritative)  
  ISO 20022 real-time A2A platform with overlays (Osko payments, PayID addressing, PayTo mandates); each transaction settles individually in central-bank money via the RBA's Fast Settlement Service  
  Operator: NPP Australia Limited (subsidiary of Australian Payments Plus, AP+)  
  Rails: NPP, New Payments Platform, Osko, PayTo, PayID · Message: ISO 20022 · Timing: Real-time, individually settled 24/7 via the RBA's Fast Sett  
  Sources: [RBA — The New Payments Platform (settlem](https://www.rba.gov.au/payments-and-infrastructure/new-payments-platform/) · [Australian Payments Plus — NPP](https://www.auspayplus.com.au/solutions/npp)
- **BECS (Bulk Electronic Clearing System / Direct Entry)** (ach-batch, significance 3/5, sources: authoritative)  
  Australia's bulk direct-credit/direct-debit rail: banks exchange batched files multiple times a day and net-settle the resulting interbank obligations across the RBA's RITS settlement system  
  Operator: Australian Payments Network (AusPayNet)  
  Rails: BECS, Direct Entry, DE, Bulk Electronic Clearing System · Message: Proprietary BECS/Direct Entry file format (legacy fixed-form · Timing: Deferred net settlement, multiple same-day exchange/settleme  
  Sources: [AusPayNet — Direct Debits & Electronic T](https://auspaynet.com.au/network/direct-debit-electronic-transfers) · [ACCC — AusPayNet Bulk Electronic Clearin](https://www.accc.gov.au/public-registers/authorisations-and-notifications-registers/authorisations-register/australian-payments-network-limited-%E2%80%93-bulk-electronic-clearing-system)
- **BPAY** (other, significance 3/5, sources: authoritative)  
  Bill-payment scheme using a Biller Code + CRN to route a customer's bank-initiated payment to the biller; the customer's bank debits in real time while interbank funds clear/net-settle to the biller next business day  
  Operator: BPAY Group Pty Ltd (part of Australian Payments Plus, AP+)  
  Rails: BPAY, BPAY Bill Payment · Message: Proprietary BPAY scheme messaging (Biller Code + Customer Re · Timing: Funds typically reach biller next banking business day; inte  
  Sources: [BPAY Support (official, Australian Payme](https://www.auspayplus.com.au/solutions/bpay-support) · [AusPayNet — New to Payments: BPAY](https://auspaynet.com.au/resources/New-To-Payments-8)

### Middle East

- **sarie (Instant Payment System)** (instant, significance 4/5, sources: mixed)  
  Account-to-account instant credit transfer over the SAMA/Saudi Payments rail with ISO 20022 messaging; beneficiary credited in real time 24/7, with interbank positions settled in central-bank money (note: exact settlement model — RTGS-style vs deferred net — not specified in the SAMA circular reviewed, flagged uncertain)  
  Operator: Saudi Payments (a wholly owned subsidiary / arm of the Saudi Central Bank, SAMA), which operates the sarie Instant Payment System  
  Rails: sarie, SARIE Instant Payments, sarie IPS · Message: ISO 20022 · Timing: Real-time, 24/7; credit to beneficiary within seconds  
  Sources: [SAMA — sarie (Instant Payment System), o](https://www.sama.gov.sa/en-us/payment/pages/Sarie.aspx) · [SAMA Rulebook — Instant Payments Launch ](https://rulebook.sama.gov.sa/en/instant-payments-launch-sarie)
- **SADAD** (other, significance 3/5, sources: authoritative)  
  National bill-payment hub (EBPP): billers register once with SADAD and become payable from any bank channel; SADAD presents invoices and routes payment instructions so consumers pay government/service bills through their bank, with funds settling to billers via the banking system (a bill-pay overlay, not a general A2A transfer rail)  
  Operator: Saudi Central Bank (SAMA) — owner; operated under SAMA / Saudi Payments as the national electronic bill presentment and payment (EBPP) syste  
  Rails: SADAD, SADAD Payment System · Message: Proprietary biller/bank integration (national EBPP standard) · Timing: Real-time bill payment confirmation; interbank/biller settle  
  Sources: [SAMA — SADAD (official, scheme owner / c](https://www.sama.gov.sa/en-US/payment/pages/sadad.aspx) · [BIS CPMI — Payment, clearing and settlem](https://www.bis.org/cpmi/publ/d105_sa.pdf)
- **Aani** (instant, significance 3/5, sources: authoritative)  
  Account-to-account instant credit transfer via the CBUAE/Al Etihad Payments national rail with ISO 20022 messaging, proxy (phone-number) addressing and Request-to-Pay; beneficiary credited instantly 24/7 with interbank settlement in central-bank money (exact gross-vs-net settlement model not stated in the official press release reviewed)  
  Operator: Al Etihad Payments (AEP) — a subsidiary of the Central Bank of the UAE (CBUAE); part of the Financial Infrastructure Transformation (FIT) pr  
  Rails: Aani, Aani Instant Payments Platform, IPP (Instant Payments Platform) · Message: ISO 20022 · Timing: Real-time, 24/7; processed instantly  
  Sources: [CBUAE — Al Etihad Payments launches Aani](https://www.centralbank.ae/media/eccjvuib/al-etihad-payments-launches-aani-a-instant-payments-platform-for-digital-transactions-in-the-uae-en.pdf) · [Al Etihad Payments — Aani launch press r](https://aep.ae/en/news-media/press-releasesarticles/al-etihad-payments-launches-aani-an-instant-payments-platform-for-digital-transactions-in-the-uae/)

### South Korea

- **KFTC Interbank Networks (Korea) — incl. Interbank Fund Transfer / instant transfer** (instant, significance 3/5, sources: authoritative)  
  KFTC operates Korea's shared interbank retail networks (instant fund transfer, CD/ATM, e-banking) switching payments in near real time, with interbank obligations net-settled the next business day on the Bank of Korea's BOK-Wire+ accounts  
  Operator: Korea Financial Telecommunications & Clearings Institute (KFTC)  
  Rails: KFTC, Interbank Fund Transfer (IFT) Network, CD/ATM Network, Electronic Banking (Internet/mobile) Network · Message: Proprietary KFTC interbank message formats · Timing: Near-instant retail transfers 24/7; interbank net positions   
  Sources: [KFTC — official (English)](https://www.kftc.or.kr/kftc/main/EgovkftcEnMain.do) · [Bank of Korea — Payment and Settlement S](https://www.bok.or.kr/eng/main/contents.do?menuNo=400045)

### Russia

- **Mir (НСПК / NSPK)** (card-network, significance 3/5, sources: mixed)  
  Russia's domestic card system, built and owned by the central bank via NSPK after 2014 sanctions, to process and clear/settle domestic card transactions independently of Visa/Mastercard; international acceptance is limited and sanctions-constrained  
  Operator: National Payment Card System JSC (NSPK / АО НСПК), a subsidiary of the Bank of Russia  
  Rails: Mir, Мир, NSPK, National Payment Card System, Mir Pay · Message: ISO 8583-based proprietary specification · Timing: Real-time authorization; domestic net settlement typically s  
  Sources: [Bank of Russia — National Payment System](https://www.cbr.ru/eng/psystem/) · [NSPK — official operator site (English)](https://www.nspk.com/)
