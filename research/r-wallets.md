# Wallet markets: Philippines, Kenya, Japan (Nov 8 2026)

Tags: fact = primary says it, stated = secondary says it, inferred = follows from how the system works.

## 1. Market profiles

```yaml
PHP:
  final_at: {a: "BSP PhilPaSSplus", s: "InstaPay and PESONet net positions settle at the BSP real-time gross settlement system, which the BSP owns and runs.", src: bsp.gov.ph/SitePages/PaymentsAndSettlements/PaymentsAndSettlements.aspx, conf: fact}
  core_rails_run_by: {a: "PPMI rules, BancNet and PCHC operate", s: "PPMI was designated rules body in 2018. BancNet ran InstaPay and PCHC ran PESONet until they merged into Payments Network of the Philippines on 1 June 2026.", src: philpayments.org.ph/about-us and mb.com.ph/2026/06/02/philippines-unifies-digital-banking-with-instapay-pesonet-operators-merger, conf: stated}
  instant_rail: {a: "InstaPay, 50,000 PHP cap", s: "24/7 low-value rail. QR Ph settles over InstaPay.", src: philpayments.org.ph/amp/bangko-sentral-and-the-industry-launches-egov-pay-and-qr-ph, conf: stated}
  instant_rail_access: {a: "Banks and e-money issuers", s: "GCash and Maya use InstaPay and PESONet. Direct membership is inferred.", src: gsma.com/.../The-Philippines-Pioneering-Mobile-Money-Growth.pdf, conf: stated}
  nonbank_central_bank_access: {a: "Yes, since 2024", s: "OmniPay became the first non-bank e-money issuer in PhilPaSSplus in January 2024. Wise followed with InstaPay access and a BSP account.", src: fintechalliance.ph/bsp-onboards-first-non-bank-e-money-issuer and newsroom.wise.com/en-CAS/243149, conf: stated}
  where_wallet_funds_sit: {a: "Bank deposits, securities", s: "Circular 649 says liquid assets must equal outstanding e-money, held as bank deposits or government securities. Press says Circular 1166 adds a trust share for large issuers.", src: dev.lawyerly.ph/laws/45715 and wealthinsights.metrobank.com.ph/bworldonline/bsp-sets-liquidity-capital-requirements-for-e-money-issuers, conf: fact}
  card_settlement: {a: "Acquirer banks", s: "Card payments settle through the acquiring bank. No domestic card scheme is run by the BSP.", src: n/a, conf: inferred}
  cross_border_options: {a: "Money transfer operators", s: "GCash and Maya receive inbound remittances through Western Union, MoneyGram, PayPal and bank partners.", src: gsma.com/.../The-Philippines-Pioneering-Mobile-Money-Growth.pdf, conf: stated}
  whats_changing: {a: "Operator merger", s: "InstaPay and PESONet now sit under one operator. Project Nexus lists the Philippines as a member system.", src: mb.com.ph/2026/06/02/... and bis.org/project/nexus, conf: stated}
KES:
  final_at: {a: "KEPSS at CBK, or M-Pesa books", s: "Interbank payments settle in KEPSS, the CBK real-time gross settlement system. M-Pesa to M-Pesa never leaves Safaricom's ledger.", src: centralbank.go.ke/wp-content/uploads/2025/01/The-Kenya-Electronic-Payment-and-Settlement-System-Report-December-2024.pdf, conf: fact}
  core_rails_run_by: {a: "CBK, IPSL, Safaricom", s: "CBK runs KEPSS. IPSL runs PesaLink and is wholly owned by the Kenya Bankers Association. Safaricom runs M-Pesa.", src: techcabal.com/2025/10/02/pesalink-wants-kenyas-payments-rail, conf: stated}
  instant_rail: {a: "PesaLink", s: "Connects 80 providers including all major banks. Safaricom and Airtel wallet connection was still under discussion in late 2025.", src: techcabal.com/2025/10/02/pesalink-wants-kenyas-payments-rail, conf: stated}
  instant_rail_access: {a: "Banks, SACCOs, soon wallets", s: "Safaricom and the bankers association jointly proposed joining M-Pesa to PesaLink. Not confirmed as live.", src: techcabal.com/2025/01/20/mpesa-to-join-pesalink, conf: stated}
  nonbank_central_bank_access: {a: "Only through a sponsor", s: "CBK says payment providers without a settlement account may be sponsored by a settlement bank. Sponsorship is managed outside KEPSS.", src: centralbank.go.ke KEPSS report above, conf: fact}
  where_wallet_funds_sit: {a: "Trust accounts at banks", s: "Regulation 25 requires a trust fund placed in licensed commercial banks or government securities. Safaricom reports cash, deposits and treasury bills in bank trust accounts.", src: centralbank.go.ke/images/docs/legislation/NPSRegulations2014.pdf and safaricom.co.ke/annualreport_2025/.../safaricom-financial-statements.pdf, conf: fact}
  card_settlement: {a: "Acquirer banks", s: "Settles through acquiring banks.", src: n/a, conf: inferred}
  cross_border_options: {a: "Partner wallets, PAPSS", s: "M-Pesa links to other wallets by agreement. A PesaLink to PAPSS link is reported.", src: eu-africa-chamber.org/pesalink-and-pan-african-payment-and-settlement-system-papss-unlock-cross-border-payments-in-local-currencies-in-kenya, conf: stated}
  whats_changing: {a: "New payments law", s: "A National Payment System Bill 2026 proposes stronger CBK powers over wallets. Text not read here.", src: techweez.com/2026/09/22/kenya-national-payment-system-bill-2026, conf: stated}
JPY:
  final_at: {a: "BOJ current accounts", s: "BOJ-NET settles gross in real time. Zengin is a deferred net system, so its net positions end at the BOJ.", src: boj.or.jp/en/paym/outline/index.htm, conf: fact}
  core_rails_run_by: {a: "Zengin-Net, BOJ", s: "The Japanese Banks' Payment Clearing Network runs Zengin and has run it around the clock since 2018.", src: boj.or.jp/en/research/brp/psr/psr190426.htm, conf: fact}
  instant_rail: {a: "Zengin, 24/365", s: "Retail bank transfers clear on Zengin at any hour.", src: boj.or.jp/en/research/brp/psr/psr190426.htm, conf: fact}
  instant_rail_access: {a: "Banks, then non-banks", s: "From October 2022 Zengin eligibility extended to funds transfer service providers.", src: assets.kpmg.com/content/dam/kpmg/jp/pdf/2025/jp-funds-transfer-registration-en.pdf, conf: stated}
  nonbank_central_bank_access: {a: "Wise only", s: "Wise says it is the first funds transfer provider to join Zengin by API and settle directly with the BOJ.", src: ffnews.com/newsarticle/paytech/wise-becomes-first-non-bank-to-go-live-on-japans-zengin-system-via-api-and-settle-directly-with-bank-of-japan, conf: stated}
  where_wallet_funds_sit: {a: "Deposit, guarantee or trust", s: "Funds transfer providers lodge a security deposit at the official depository, or use a guarantee contract or a trust with users as beneficiaries. Prepaid issuers deposit at least half of unused balances.", src: japaneselawtranslation.go.jp/en/laws/view/4477/en, conf: fact}
  card_settlement: {a: "Acquirer banks", s: "Settles through acquiring banks.", src: n/a, conf: inferred}
  cross_border_options: {a: "Wise, bank remittance", s: "Inbound visitors use foreign wallets or cards. PayPay inbound is not covered here.", src: n/a, conf: inferred}
  whats_changing: {a: "Non-bank rail access", s: "A first non-bank is live on Zengin.", src: ffnews link above, conf: stated}
```

## 2. Entities

```yaml
- {id: bsp, name: Bangko Sentral ng Pilipinas, kind: central_bank, markets: [PHP], what_it_does: Runs PhilPaSSplus and supervises e-money issuers and banks., edges: [{type: operates, to: PhilPaSSplus, src: bsp.gov.ph/SitePages/PaymentsAndSettlements/PaymentsAndSettlements.aspx, conf: fact}, {type: supervises, to: gcash-gxi, src: gcash.com/about-us, conf: fact}]}
- {id: ppmi, name: Philippine Payments Management Inc., kind: network, markets: [PHP], what_it_does: Rules body for InstaPay, PESONet and QR Ph., edges: [{type: sets_rules_for, to: instapay, src: philpayments.org.ph/about-us, conf: fact}]}
- {id: pnpi, name: Payments Network of the Philippines (ex BancNet and PCHC), kind: network, markets: [PHP], what_it_does: Operates InstaPay and PESONet clearing., edges: [{type: operates, to: instapay, src: mb.com.ph/2026/06/02/..., conf: stated}]}
- {id: instapay, name: InstaPay and PESONet, kind: network, markets: [PHP], what_it_does: Instant and batch bank transfer rails., edges: [{type: settles_at, to: PhilPaSSplus, src: inferred, conf: inferred}, {type: participates_in, to: gcash-gxi, access: direct or via bank, src: gsma.com/.../The-Philippines-Pioneering-Mobile-Money-Growth.pdf, conf: inferred}]}
- {id: qrph, name: QR Ph, kind: network, markets: [PHP], what_it_does: Single national QR standard, BSP mandated adoption., edges: [{type: settles_at, to: instapay, src: philpayments link above, conf: fact}]}
- {id: gcash-gxi, name: GCash (Mynt, G-Xchange Inc.), kind: app, markets: [PHP], what_it_does: Wallet. GXI runs payment operations and Mynt owns it., edges: [{type: owned_by, to: mynt, src: gsma link above, conf: stated}, {type: safeguards_at, to: partner banks, src: gsma link above, conf: stated}]}
- {id: maya-bank, name: Maya Philippines and Maya Bank, kind: app, markets: [PHP], what_it_does: Maya Philippines is the wallet. Maya Bank is a separate digital bank., edges: [{type: links, to: maya-philippines wallet, src: gsma link above, conf: stated}]}
- {id: cbk, name: Central Bank of Kenya, kind: central_bank, markets: [KES], what_it_does: Runs KEPSS and approves trustees., edges: [{type: supervises, to: mpesa, src: NPSRegulations2014 Reg 8, conf: fact}]}
- {id: ipsl, name: IPSL (PesaLink), kind: network, markets: [KES], what_it_does: Interbank instant switch owned by the Kenya Bankers Association., edges: [{type: participates_in, to: mpesa, access: proposed, src: techcabal.com/2025/01/20/mpesa-to-join-pesalink, conf: stated}]}
- {id: mpesa, name: M-Pesa (Safaricom), kind: app, markets: [KES], what_it_does: Mobile money on Safaricom's ledger., edges: [{type: owned_by, to: mphcl, src: safaricom financial statements above, conf: fact}]}
- {id: mphcl, name: M-Pesa Holding Co. Ltd, kind: payment_company, markets: [KES], what_it_does: Corporate trustee for funds held in trust for M-Pesa account holders. Safaricom does not consolidate it., edges: [{type: holds_funds_for, to: mpesa customers, src: safaricom financial statements above, conf: fact}, {type: safeguards_at, to: commercial banks, src: Reg 25(3)(f), conf: fact}]}
- {id: boj, name: Bank of Japan (BOJ-NET), kind: central_bank, markets: [JPY], what_it_does: Real-time gross settlement., edges: [{type: operates, to: bojnet, src: boj.or.jp/en/paym/outline/index.htm, conf: fact}]}
- {id: zengin, name: Zengin-Net (Zengin System), kind: network, markets: [JPY], what_it_does: Deferred net retail clearing., edges: [{type: settles_at, to: boj, src: inferred, conf: inferred}, {type: participates_in, to: wise, access: direct, src: ffnews link above, conf: stated}]}
- {id: paypay, name: PayPay, kind: app, markets: [JPY], what_it_does: Registered prepaid issuer (No. 00710, 2018) and funds transfer operator (No. 00068, 2019)., edges: [{type: links, to: PayPay Bank, src: about.paypay.ne.jp/en/about, conf: fact}]}
```

## 3. Where a payment stops

- **GCash to GCash:** company books of G-Xchange Inc. (inferred). GCash to a bank over InstaPay: bank books after PhilPaSSplus settlement (stated).
- **M-Pesa to M-Pesa:** Safaricom's ledger. M-Pesa to bank: trust account at a commercial bank, then KEPSS between banks (fact for trust, inferred for the hop).
- **PayPay to PayPay:** PayPay's ledger. Wise to bank: Zengin then BOJ current account (stated).

## 4. Practitioner notes

- **PHP:** Ask whether a partner is a direct InstaPay member or sits behind a bank. The 50,000 PHP cap applies.
- **PHP:** Maya Bank is a PDIC-covered bank and the Maya wallet is not insured. Check which entity holds the balance.
- **KES:** M-Pesa float sits in a trust at banks, held by a separate trustee company.
- **KES:** PesaLink wallet access is not confirmed, so bank payouts from M-Pesa run on Safaricom's own bank links (inferred).

## 5. Fixes to existing rows

- **P054 and P407:** "float sits at banks" is wrong for funds transfer providers. The Act requires a security deposit at the official depository, or a guarantee or trust. Only Type III may use bank deposits. Prepaid issuers deposit at least half of unused balances. Name Zengin-Net as operator. The 21 Oct 2025 BOJ date is unconfirmed here, Wise announced on 25 Nov 2025.
- **P059 M-Pesa:** replace the riotimesonline source with Safaricom FY2025 notes and CBK Regulation 25. Raise conf. Name MPHCL as trustee. Drop "banks named per market", none are named.
- **P111 and P112:** fill "chain unknown" with OmniPay (Jan 2024) and Wise as non-bank accounts. Add the BancNet and PCHC merger (1 June 2026).
- **P113 GCash:** Circular 649 has no trust rule. Soften to bank deposits and securities, with a trust share for large issuers per press. The bank link is not on the GCash page, so leave it out.

## 6. Other payment methods taxonomy

- **Bank account plus instant rail:** bank deposit, stops at the bank or the central bank.
- **Card network:** bank deposit behind a card, stops at the card settlement bank.
- **Closed loop wallet:** provider ledger, backing at a bank or trust, stops in the provider's books.
- **Interoperable wallet on a national QR:** e-money, backing in bank accounts, stops at the issuer or at the instant rail.
- **Mobile money on a telco:** e-money in a bank trust, stops on the telco ledger.
- **CBDC:** central bank liability, stops on the central bank ledger.
- **Stablecoin:** token claim, reserves at banks or in bills, stops on the token ledger.
- **BNPL:** merchant paid by the lender, consumer owes the lender, stops at the lender's books and a card or bank rail.

## 7. Sources

- **Primary:** BSP, PPMI, CBK (NPS Regulations 2014, KEPSS report), Safaricom FY2025 financial statements, Payment Services Act translation, BOJ, company pages for GCash, Maya Bank and PayPay.
- **Secondary:** GSMA, BusinessWorld, Manila Bulletin, Fintech Alliance PH, Wise newsroom, TechCabal, FFNews, KPMG Japan.
- **Not retrieved:** BSP operator list, Kenya concentration limits, Kenya Bill 2026 text, BOJ Wise decision.
