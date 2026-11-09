# China (CNY), mainland: research for Who Holds the Money

Tags: fact = primary source says it, stated = secondary source says it, inferred = follows from how this kind of system works. Dates are in as_of fields only.

## 1. Market profile

```yaml
market: CNY
as_of: 2026-11
final_at: {a: "People's Bank of China", s: "Bank payments settle in PBoC accounts via CNAPS. Wallet balances sit in PBoC custody, so most wallet payments stop on the company's own books.", src: "https://www.gov.cn/gongbao/content/2021/content_5598124.htm", conf: stated}
core_rails_run_by: {a: "PBoC, NetsUnion, UnionPay", s: "PBoC runs CNAPS (HVPS, BEPS, IBPS). NetsUnion clears non-bank online payments. UnionPay runs the card network and an interbank system. CIPS Co. runs cross-border RMB.", src: "https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf", conf: fact}
instant_rail: {a: "IBPS and NetsUnion", s: "IBPS is the bank-to-bank retail rail. NetsUnion carries the much larger non-bank wallet volume (about 250 billion transactions in one quarter versus 4.2 billion on IBPS).", src: "https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf", conf: fact}
instant_rail_access: {a: "Banks and licensed institutions", s: "Banks join CNAPS systems directly. Non-bank payment institutions must clear bank-linked payments through NetsUnion or UnionPay and cannot connect bank by bank.", src: "https://www.caixinglobal.com/2018-11-13/new-online-payment-clearinghouse-survives-double-11-shopping-orgy-101346466.html", conf: stated}
nonbank_central_bank_access: {a: "Custody only", s: "Non-bank payment institutions do not hold CNAPS settlement accounts. Their customer reserve money sits in a PBoC custody account at 100% with no interest.", src: "https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm", conf: fact}
where_wallet_funds_sit: {a: "PBoC custody account", s: "Alipay and WeChat Pay balances are backed 1 to 1 by reserve funds held centrally at the PBoC. Yu'e Bao is a separate money market fund holding.", src: "https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm", conf: fact}
card_settlement: {a: "UnionPay, then banks", s: "UnionPay clears card and many QR payments between issuer and acquirer banks, and banks settle at the PBoC. Visa and Mastercard are a minor share of mainland volume.", src: "https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf", conf: stated}
cross_border_options: {a: "CIPS, Alipay+, HK links", s: "CIPS clears RMB between banks. Inbound visitors pay by linking foreign cards or overseas wallets to Alipay and WeChat Pay.", src: "https://www.cips.com.cn/en/index/index.html", conf: fact}
whats_changing: {a: "e-CNY as deposit money", s: "From 2026 e-CNY in commercial bank wallets is treated as a bank deposit that can earn interest. Non-bank operators hold 100% reserves against it.", src: "https://ydyl.gansu.gov.cn/enggsydyl/news/topnews/202512/t20251230_32760.html", conf: stated}
```

## 2. Entities

```yaml
- id: pboc
  name: People's Bank of China
  kind: central_bank
  markets: [CNY]
  what_it_does: Sets payment rules, runs CNAPS settlement, licenses non-bank payment institutions, issues e-CNY.
  edges:
    - {type: supervises, to: alipay-tenpay-licensees, src: "https://www.hankunlaw.com/en/portal/article/index/cid/8/id/13856", conf: fact}
    - {type: operates, to: cnaps, src: "https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf", conf: stated}
    - {type: safeguards_at, to: wallet-reserve-funds, src: "https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm", conf: fact}
- id: cnaps
  name: CNAPS (HVPS, BEPS, IBPS)
  kind: settlement_system
  markets: [CNY]
  what_it_does: HVPS is real-time gross settlement for large payments. BEPS carries small batch payments. IBPS carries retail credit transfers around the clock.
  edges:
    - {type: settles_at, to: pboc, src: "https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf", conf: stated}
    - {type: participates_in, to: banks, access: direct, src: "inferred from how RTGS systems work", conf: inferred}
- id: cncc
  name: China National Clearing Center (PBoC)
  kind: technology_provider
  markets: [CNY]
  what_it_does: PBoC body that builds and runs the CNAPS systems day to day.
  edges:
    - {type: operates, to: cnaps, src: "https://en.wikipedia.org/wiki/China_National_Clearing_Center", conf: stated}
- id: netsunion
  name: NetsUnion Clearing Corporation (Wanglian)
  kind: settlement_system
  markets: [CNY]
  what_it_does: Single clearing house for bank-linked online payments from non-bank institutions. Set up in 2017 on central bank instruction.
  edges:
    - {type: participates_in, to: alipay-tenpay-licensees, access: via, src: "https://www.caixinglobal.com/2018-11-13/new-online-payment-clearinghouse-survives-double-11-shopping-orgy-101346466.html", conf: stated}
    - {type: sets_rules_for, to: alipay-tenpay-licensees, src: "https://www.caixinglobal.com/2018-11-13/new-online-payment-clearinghouse-survives-double-11-shopping-orgy-101346466.html", conf: stated}
    - {type: settles_at, to: pboc, src: "inferred: banks settle at PBoC, custody account is at PBoC", conf: inferred}
- id: unionpay
  name: China UnionPay
  kind: network
  markets: [CNY]
  what_it_does: Domestic card network and interbank system. Also a permitted clearing route for non-bank online payments and runs the Cloud QuickPass app.
  edges:
    - {type: operates, to: unionpay-interbank-system, src: "https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf", conf: fact}
    - {type: links, to: alipay, src: "https://www.ciw.news/p/unionpay-integrates-alipay-wechat", conf: stated}
    - {type: links, to: wechat-pay, src: "https://www.ciw.news/p/unionpay-integrates-alipay-wechat", conf: stated}
- id: alipay
  name: Alipay (Ant Group)
  kind: app
  markets: [CNY]
  what_it_does: Super app with a stored value wallet, bank card linking, QR payments and fund products. Licensed payment entity sits inside Ant.
  edges:
    - {type: holds_funds_for, to: alipay-users, src: "https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm", conf: stated}
    - {type: safeguards_at, to: pboc, src: "https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm", conf: fact}
    - {type: participates_in, to: netsunion, access: via, src: "https://www.caixinglobal.com/2018-11-13/new-online-payment-clearinghouse-survives-double-11-shopping-orgy-101346466.html", conf: stated}
- id: wechat-pay
  name: WeChat Pay (Tenpay, Tencent)
  kind: app
  markets: [CNY]
  what_it_does: Wallet inside WeChat. Tenpay is the licensed payment institution.
  edges:
    - {type: safeguards_at, to: pboc, src: "https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm", conf: fact}
    - {type: participates_in, to: netsunion, access: via, src: "https://www.caixinglobal.com/2018-11-13/new-online-payment-clearinghouse-survives-double-11-shopping-orgy-101346466.html", conf: stated}
- id: yuebao
  name: Yu'e Bao (managed by Tianhong Asset Management)
  kind: payment_company
  markets: [CNY]
  what_it_does: Money market fund sold inside Alipay. A balance moved here leaves the wallet reserve and becomes fund units.
  edges:
    - {type: links, to: alipay, src: "https://www.caixinglobal.com/2025-09-24/tianhong-slashes-yue-bao-fees-for-first-time-in-12-years-amid-industry-shake-up-102365366.html", conf: stated}
- id: cips
  name: CIPS Co.
  kind: settlement_system
  markets: [CNY, HKD]
  what_it_does: Cross-border RMB clearing and settlement, hybrid RTGS and deferred net settlement, 214 direct and 1,651 indirect participants.
  edges:
    - {type: settles_at, to: pboc, src: "https://www.cips.com.cn/en/index/index.html", conf: fact}
    - {type: sets_rules_for, to: banks, src: "https://www.cips.com.cn/en/index/index.html", conf: fact}
- id: ecny
  name: e-CNY (Digital Currency Institute, PBoC)
  kind: central_bank
  markets: [CNY]
  what_it_does: Retail central bank digital currency distributed through designated operators, counted in M0.
  edges:
    - {type: operates, to: designated-operators, src: "https://kclpure.kcl.ac.uk/ws/files/368611050/Bidder_Lu_Riding_the_Digital_Tides_Digital_Yuan.pdf", conf: stated}
    - {type: links, to: mbridge, src: "https://www.bis.org/press/p240605.htm", conf: fact}
- id: mbridge
  name: mBridge
  kind: settlement_system
  markets: [CNY, HKD]
  what_it_does: Shared central bank digital currency platform. Founding central banks were Thailand, UAE, PBoC's Digital Currency Institute and HKMA. Saudi Central Bank joined as a full participant.
  edges:
    - {type: links, to: ecny, src: "https://www.bis.org/press/p240605.htm", conf: fact}
```

## 3. Where a payment stops

- **Alipay to Alipay (wallet balance):** company books. Both users hold claims on the same institution, so only its ledger changes. The backing reserve in the PBoC custody account does not move. Source: reserve rule (gov.cn 2019). Confidence: inferred for the ledger step.
- **Alipay or WeChat Pay from a linked bank card:** bank books, cleared through NetsUnion or UnionPay, and the two banks settle at the PBoC. Example: Q1 2025 NetsUnion platform volume of 249.6 billion transactions worth RMB139.3 trillion (PBoC payment system report).
- **Wallet to a merchant at another wallet:** clearing house. The reserve moves between custody accounts, and Order 2021 No. 1 (as the existing P501 row cites it) routes transfers through a PBoC-approved clearing institution.
- **Large bank transfer:** central bank, via HVPS (RMB1,850 trillion in Q1 2025).
- **e-CNY wallet to wallet:** central bank money moving through operator wallets. Tag stated.

## 4. Practitioner notes

- **There is no sponsor bank layer for wallets.** The wallet issuer holds a PBoC licence and the reserve sits at the PBoC. A foreign firm looking for a partner is looking for a licensed payment institution plus a settlement bank for bank-card legs, not a sponsor bank. (inferred)
- **Overseas payment firms need a domestic licence to serve domestic users.** The 2023 regulations say so, and purely offshore support may not need one (Hankun summary, stated).
- **Inbound visitors:** foreign cards linked to Alipay and WeChat Pay now have a US$5,000 single and US$50,000 annual cap (China Briefing, stated, check PBoC original). That is the practical way foreign card money reaches Chinese merchants. UnionPay and the e-CNY app are alternatives.
- **Interest-free reserves changed the economics.** Platforms lost float income when reserves moved to the PBoC (gov.cn 2019). This is why balance-holding is not the product and fund sales and credit are. (inferred)
- **Mainland and Hong Kong are separate stacks.** The HK RMB clearing bank and FPS RMB are offshore. Settlement happens at CIPS or the clearing bank, not CNAPS directly (inferred).

## 5. Review of existing CNY rows

- **P070 CIPS:** counts match the CIPS site (214 direct, 1,651 indirect, RTGS plus DNS, RMB and HKD). Keep. Fix: the cited treasury-management.com and frbsf.org links are secondary, so swap the lead source to cips.com.cn. Add the Q1 2025 volume (RMB44.25 trillion, 1.9 million transactions).
- **P105 HKICL FPS:** tagged CNY, but this is Hong Kong infrastructure. Remove CNY from the mainland page and treat it as an offshore link.
- **P501 PBoC:** correct in substance (100% centralised deposit, no interest, from January 2019). The Order 2021 No. 1 article numbers (4 and 6) I could not re-verify here. The gov.cn gazette link should be checked by someone who can read it. Also add "CNAPS" and "e-CNY issuer" roles.
- **P502 NetsUnion:** correct (2017 set up, 2018 mandatory routing). Conf "stated" is right. Add numbers: about 2.77 billion transactions a day in Q1 2025.
- **Missing rows entirely:** Alipay, WeChat Pay (Tenpay), China UnionPay, CNAPS (HVPS, BEPS, IBPS), Yu'e Bao, e-CNY, mBridge, Alipay+. The mainland page cannot work without them.

## 6. Sources

- Primary: PBoC Payment System Report Q1 2025 (https://www.pbc.gov.cn/en/3688110/3688259/3689026/3706133/2025/2025120416492544012/2025120416492584878.pdf)
- Primary: CIPS site (https://www.cips.com.cn/en/index/index.html)
- Primary: BIS mBridge release (https://www.bis.org/press/p240605.htm)
- Primary, not re-read: gov.cn gazette Order 2021 No. 1 (https://www.gov.cn/gongbao/content/2021/content_5598124.htm). PBoC's e-CNY white paper was blocked to fetchers, so wallet tiers are untested here.
- Secondary: State Council English site on 100% deposits (https://english.www.gov.cn/policies/policy_watch/2019/01/15/content_281476479885412.htm)
- Secondary: Hankun Law on 2023 regulations (https://www.hankunlaw.com/en/portal/article/index/cid/8/id/13856)
- Secondary: Caixin on NetsUnion (https://www.caixinglobal.com/2018-11-13/new-online-payment-clearinghouse-survives-double-11-shopping-orgy-101346466.html)
- Secondary: China Briefing on visitor payments (https://www.china-briefing.com/news/china-unveils-new-guidelines-on-optimized-payment-services-for-foreigners-an-overview/)
- Secondary: Gansu/Xinhua on e-CNY 2026 framework (https://ydyl.gansu.gov.cn/enggsydyl/news/topnews/202512/t20251230_32760.html)
- Secondary: KCL e-CNY paper (https://kclpure.kcl.ac.uk/ws/files/368611050/Bidder_Lu_Riding_the_Digital_Tides_Digital_Yuan.pdf)
- Secondary: Caixin on Yu'e Bao (https://www.caixinglobal.com/2025-09-24/tianhong-slashes-yue-bao-fees-for-first-time-in-12-years-amid-industry-shake-up-102365366.html)
- Secondary: CIW on UnionPay QR links (https://www.ciw.news/p/unionpay-integrates-alipay-wechat)

## Gaps

- Ant's 2020 prospectus text I fetched had no reserve fund language, so the Ant reserve step rests on the 2019 State Council item.
- QR interoperability is only stated (UnionPay app scanning WeChat Pay and Alipay codes). No PBoC primary found.
- Alipay+ mechanics (overseas e-wallets linked to Alipay) are only in China Briefing, not an Ant filing.
