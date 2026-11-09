# South Korea (KRW) research

## 1. Market profile

```yaml
market: KR
as_of: 2026-11
final_at:
  answer: Bank of Korea
  text: Bank of Korea current accounts hold final KRW settlement. conf fact.
  src: https://www.bis.org/cpmi/publ/d97_kr.pdf
  conf: fact
core_rails_run_by:
  answer: BOK and KFTC
  text: The Bank of Korea runs the RTGS (BOK-Wire+). KFTC, a non-profit owned by member banks, runs the retail systems.
  src: https://www.bis.org/cpmi/publ/d97_kr.pdf
  conf: fact
instant_rail:
  answer: KFTC interbank remittance
  text: Retail transfers run on KFTC's interbank remittance and electronic banking systems and are netted, then settled at the BOK. Customers see them as instant.
  src: https://www.bis.org/cpmi/publ/d97_kr.pdf
  conf: fact (netting), inferred (customer experience is instant)
instant_rail_access:
  answer: Banks, plus regulated nonbanks
  text: Banks are general or associate KFTC members. Securities firms and others join as special participants. Fintech wallets reach the rail through banks or the 2020 nonbank route.
  src: https://www.asiae.co.kr/en/article/2020060510544503434
  conf: fact for member classes, stated for the 2020 opening
nonbank_central_bank_access:
  answer: Yes, with conditions
  text: Since the 2020 rule change the BOK accepts qualifying fintechs as direct participants if they open a BOK current account, join the BOK network, allow joint BOK and FSS inspection and manage net settlement risk. Large wallets mostly still settle through banks (inferred).
  src: https://www.asiae.co.kr/en/article/2020060510544503434
  conf: stated, with inferred note
where_wallet_funds_sit:
  answer: Bank deposit, trust, insurance
  text: Prepaid balances must be held at 100 percent in a bank or Korea Post deposit, a trust invested in safe assets, or payment guarantee insurance.
  src: https://fsc.go.kr/eng/pr010101/83006?curPage=8
  conf: fact
card_settlement:
  answer: Card company to merchant bank
  text: Domestic credit cards settle between the card company, or BC Card as a multilateral net hub for its member banks, and the merchant. Merchants reach them through VAN and PG companies (inferred detail).
  src: https://www.bis.org/cpmi/publ/d97_kr.pdf
  conf: fact for BC Card, inferred for VAN role
cross_border_options:
  answer: Alipay+, ZeroPay, banks
  text: Inbound tourists pay with foreign cards or Alipay+ wallets linked to ZeroPay QR. Outbound money goes through banks and securities firms, with the same no-documents cap of USD 100,000 a year across them from January 2026.
  src: https://www.koreatimes.co.kr/business/banking-finance/20251210/overseas-remittance-rule-overhaul-intensifies-competition-among-banks
  conf: stated
whats_changing:
  answer: Tighter wallet safeguarding
  text: Prepaid scope widened to most mobile gift cards. Payment gateway funds move to full external custody in three steps. The BOK is piloting 24 hour offshore won settlement with four large banks.
  src: https://www.bkl.co.kr/en/law/insight/newsletter/6619
  conf: stated
```

## 2. Entities

```yaml
- id: bank-of-korea
  name: Bank of Korea
  kind: central_bank
  markets: [KR]
  what_it_does: Runs BOK-Wire+ and holds the current accounts where KRW settles. Approves use of its financial network.
  edges:
    - {type: operates, to: bok-wire-plus, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: fact}
    - {type: settles_at, to: kftc-retail-systems, access: net settlement, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: fact}
    - {type: participates_in, to: kftc, access: general member, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: fact}
- id: bok-wire-plus
  name: BOK-Wire+
  kind: settlement_system
  markets: [KR]
  what_it_does: Won RTGS with hybrid netting. Urgent payments settle gross. Normal payments offset bilaterally with multilateral offsetting every 30 minutes, and all become urgent at 17:05.
  edges:
    - {type: operates, to: bank-of-korea, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: fact}
    - {type: links, to: bok-wire-int, src: https://www.koreatimes.co.kr/amp/economy/20260721/korea-to-launch-pilot-offshore-won-settlement-network-in-september, conf: stated}
- id: bok-wire-int
  name: BOK-WireInt (pilot)
  kind: settlement_system
  markets: [KR]
  what_it_does: Planned 24 hour business day won settlement for foreign investors via KB Kookmin, Shinhan, Hana and Woori.
  edges:
    - {type: participates_in, to: kb-shinhan-hana-woori, access: direct, src: https://www.koreatimes.co.kr/amp/economy/20260721/korea-to-launch-pilot-offshore-won-settlement-network-in-september, conf: stated}
- id: kftc
  name: Korea Financial Telecommunications and Clearings Institute (KFTC)
  kind: network
  markets: [KR]
  what_it_does: Non-profit owned by banks. Runs interbank remittance, electronic banking, ATM, giro, CMS, cheque, EFTPOS and open banking.
  edges:
    - {type: settles_at, to: bank-of-korea, access: next business day net, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: fact}
    - {type: owned_by, to: member-banks, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: fact}
- id: fsc-fss
  name: Financial Services Commission and Financial Supervisory Service
  kind: central_bank
  markets: [KR]
  what_it_does: Licence and register electronic financial businesses, set the safeguarding rules, supervise through the FSS. (Kind is regulator, closest allowed value.)
  edges:
    - {type: supervises, to: kakao-pay, src: https://www.asiae.co.kr/en/article/2020061323555484633, conf: stated}
    - {type: supervises, to: toss, src: https://www.asiae.co.kr/en/article/2020061323555484633, conf: stated}
    - {type: supervises, to: naver-pay, src: https://www.asiae.co.kr/en/article/2020061323555484633, conf: stated}
- id: kakao-pay
  name: Kakao Pay
  kind: payment_company
  markets: [KR]
  what_it_does: Wallet and easy payment app. Kakao Pay Money is a prepaid balance (about KRW 2.1 trillion in Q3 2025) funded from a linked bank account.
  edges:
    - {type: holds_funds_for, to: kakao-pay-users, access: prepaid electronic payment means, src: https://www.asiae.co.kr/en/article/2025112509442704305, conf: stated}
    - {type: safeguards_at, to: bank-trust-or-insurance, src: https://fsc.go.kr/eng/pr010101/83006?curPage=8, conf: fact (rule), inferred (Kakao Pay's own choice)}
    - {type: links, to: kakao-pay-securities, src: https://www.asiae.co.kr/en/article/2025112509442704305, conf: stated}
- id: kakao-bank
  name: KakaoBank
  kind: bank
  markets: [KR]
  what_it_does: Separate listed internet-only bank licensed by the FSC (April 2017). Deposits are bank liabilities. Not the same company as Kakao Pay.
  edges:
    - {type: participates_in, to: kftc, access: member, src: https://fsc.go.kr/eng/pr010101/76052, conf: inferred}
- id: toss
  name: Toss (Viva Republica)
  kind: app
  markets: [KR]
  what_it_does: Super-app with easy pay and transfers. Registered as an electronic financial operator in 2015. Transfers move through bank accounts.
  edges:
    - {type: participates_in, to: kftc, access: via banks, src: https://www.elibrary.imf.org/view/journals/002/2020/280/article-A001-en.xml, conf: stated}
- id: toss-bank
  name: Toss Bank
  kind: bank
  markets: [KR]
  what_it_does: Licensed internet-only bank. Viva Republica is the lead shareholder but not the only one (inferred). Deposits are bank liabilities held at the BOK as a bank.
  edges:
    - {type: participates_in, to: bank-of-korea, access: direct, src: https://fsc.go.kr/eng/pr010101/76052, conf: fact}
    - {type: owned_by, to: toss, src: https://fsc.go.kr/eng/pr010101/76052, conf: stated}
- id: naver-pay
  name: Naver Pay (Naver Financial)
  kind: payment_company
  markets: [KR]
  what_it_does: Easy pay and prepaid points wallet. Classified with Toss and Kakao Pay as an electronic financial operator.
  edges:
    - {type: holds_funds_for, to: naver-pay-users, access: prepaid electronic payment means, src: https://www.asiae.co.kr/en/article/2020061323555484633, conf: stated}
- id: samsung-pay
  name: Samsung Pay
  kind: technology_provider
  markets: [KR]
  what_it_does: Tokenised in-store card wallet (NFC and magnetic secure transmission). The card issuer holds the account, so Samsung holds no balance. Not a published fact in sources reviewed.
  edges:
    - {type: links, to: card-companies, src: n/a, conf: inferred}
- id: bc-card
  name: BC Card
  kind: network
  markets: [KR]
  what_it_does: Consortium of banks. Gives multilateral net settlement between cardholder bank and merchant bank.
  edges:
    - {type: settles_at, to: bank-of-korea, access: via member banks, src: https://www.bis.org/cpmi/publ/d97_kr.pdf, conf: stated}
- id: zeropay
  name: ZeroPay
  kind: network
  markets: [KR]
  what_it_does: Public QR payment for small merchants run by the Korea Easy Payment Foundation. Alipay+ linked it in 2023.
  edges:
    - {type: links, to: alipay-plus, src: https://www.businesswire.com/news/home/20230831026956/en/ZeroPay-Introduces-Alipay-at-1.7-Million-Merchants-in-South-Korea-Promoting-Convenient-Experience-for-Asian-Tourists, conf: stated}
- id: alipay-plus
  name: Alipay+
  kind: network
  markets: [KR]
  what_it_does: Ant Group gateway that lets foreign wallets pay at Korean merchants.
  edges:
    - {type: links, to: zeropay, src: https://www.businesswire.com/news/home/20230831026956/en/ZeroPay-Introduces-Alipay-at-1.7-Million-Merchants-in-South-Korea-Promoting-Convenient-Experience-for-Asian-Tourists, conf: stated}
```

## 3. Where a payment stops

- **Kakao Pay Money to a Kakao Pay merchant.** Company books of Kakao Pay for the balance, with the backing money at a bank, trust or insurance product. Example from the Q3 2025 report on the KRW 2.1 trillion balance.
- **Toss app transfer to another bank.** Bank books, then a KFTC net position that settles at the Bank of Korea on the next business day. Example is the Toss easy-pay and transfer flow (IMF 2020).
- **Toss Bank or KakaoBank account to account.** The bank's own books if both are customers, else KFTC net then Bank of Korea.
- **Domestic card purchase.** Clearing house. BC Card nets between cardholder and merchant banks, then bank accounts at the BOK.
- **Large value bank transfer.** Central bank, in BOK-Wire+.

## 4. Practitioner notes

- Toss and Toss Bank are two firms with different licences. Toss is a registered electronic financial operator. Toss Bank is a bank. Same for KakaoBank and Kakao Pay. Ask which entity holds the balance.
- Safeguarding is a custody rule, not a bank guarantee. Prepaid balances need 100 percent external custody. Kakao Pay Money top-ups reportedly flow into a Kakao Pay Securities account, so ask which regime the product sits in (stated, one article).
- Wallet and bank transfers reach customers instantly but settle net at the BOK on the next business day. A nonbank can seek direct BOK access since 2020 but most go through bank agents (inferred).
- Merchant onboarding goes via a VAN or PG firm. PG funds move to full external custody in three steps under the amended Act effective December 2026 (stated, proposed decree). Ask the PG about its ratio and custody type.
- Overseas remittance competes on bank rails. Banks lost exclusivity for the no-documents USD 100,000 annual cap in January 2026, so Toss Bank and Kbank are the likely fintech partners. A licensed small remittance entity was not covered in sources read (inferred it exists under the Foreign Exchange Transactions Act).

## 5. KRW row checks

- **P114 Bank of Korea.** Correct. Add that BOK-Wire+ nets bilaterally and multilaterally every 30 minutes, that all normal payments turn urgent at 17:05, and that KFTC net settlement is next business day. Add the BOK-WireInt pilot (24 hour, four banks, full launch planned January). Source S123 is fine.
- **P115 KFTC.** Correct. Add the open banking fact that fintechs and banks joined from December 2019 (16 banks, 31 fintechs at launch). Fintechs reach it as open banking participants, not as clearing members. Also add the ATM, giro and EFTPOS systems.
- **P503 Toss Bank.** Fix the licence date. The FSC press release is the June 2021 preliminary approval. Final approval and launch came in autumn 2021, so say preliminary approval. Say Viva Republica is a lead shareholder, not the owner. Row says chain is bank, so its "layer 7 distributor" arch may confuse. Add a separate row for Toss the app and a safeguarding note.
- **Missing rows.** Kakao Pay, KakaoBank, Naver Pay, Samsung Pay, BC Card, ZeroPay, Alipay+ and a KFTC open banking entry. Ask whether wallets should show as layer 7 apps with a bank partner edge.

## 6. Sources

- BIS CPMI Korea note, https://www.bis.org/cpmi/publ/d97_kr.pdf (primary, 2011 vintage, participant counts are old)
- FSC press release on revised rules, https://fsc.go.kr/eng/pr010101/83006?curPage=8 (primary)
- FSC open banking launch, https://fsc.go.kr/eng/pr010101/22275 (primary)
- FSC Toss Bank release, https://fsc.go.kr/eng/pr010101/76052 (primary, cited by existing row, not re-read)
- IMF 2020 article, https://www.elibrary.imf.org/view/journals/002/2020/280/article-A001-en.xml (primary, cited by row, not re-read)
- BKL newsletter on the amended Act, https://www.bkl.co.kr/en/law/insight/newsletter/6619 (secondary, law firm)
- Asiae on BOK nonbank access, https://www.asiae.co.kr/en/article/2020060510544503434 (secondary)
- Asiae on Kakao Pay Money, https://www.asiae.co.kr/en/article/2025112509442704305 (secondary)
- Asiae on PG custody ratios, https://www.asiae.co.kr/en/article/2024090913312724862 (secondary)
- Asiae on easy pay oversight, https://www.asiae.co.kr/en/article/2020061323555484633 (secondary)
- Korea Times on BOK-WireInt, https://www.koreatimes.co.kr/amp/economy/20260721/korea-to-launch-pilot-offshore-won-settlement-network-in-september (secondary)
- Korea Times on remittance caps, https://www.koreatimes.co.kr/business/banking-finance/20251210/overseas-remittance-rule-overhaul-intensifies-competition-among-banks (secondary)
- BusinessWire on ZeroPay and Alipay+, https://www.businesswire.com/news/home/20230831026956/en/ZeroPay-Introduces-Alipay-at-1.7-Million-Merchants-in-South-Korea-Promoting-Convenient-Experience-for-Asian-Tourists (secondary, vendor release)
