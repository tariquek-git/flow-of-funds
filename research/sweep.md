# Sweep of past work against the current build

Sources read: about 14 chats, the Layer Map Plan doc, the Site Story canvas (Clock, Country files), the older Settlement Map artifact, the Drive folder, the memory file money-movement-layer-map, Basic Memory Side projects. The Payments by Country doc was read in full as text. The Drive folder holds only PNGs (see Drive note).

**Decided but not built**
- 24-hour settlement clock as a hero. The Site Story canvas has it as one of four zoom levels (pick a country, distance from the central bank, one system, 24-hour clock), and memory records it as confirmed Nov 1. The Canada clock there is a radial dial with Lynx, ACSS and card networks. Tarique also called the clock "the place for creative spice" (Oct 30). The current plan demotes it to a strip on market and compare pages, not the hero. Chats 517554a2 and d1184c3c.
- Drill up and down by dependency. Select Bank of Canada and everything that settles in it lights up. Select Lynx and see what sits above. Tarique asked to keep this (memory, Oct 31). The plan has system pages but no up-and-down lighting.
- "Who is responsible" as a core tenet. The current build does have the strip. The plan lists "Responsible" as thin and HKD has no entries. Chat 517554a2 also produced a 5 stop by 5 failure matrix (carries, shares, none) with regional differences. Only part of it reached the page.
- Corridor stack blocks on ten country pages, then a corridor explorer, then the "who do you need" explainer (qualification questions, adjustable assumptions, bill of materials output, OpenRouter with Claude Sonnet). Layer Map Plan phases 3 to 5. The plan carries these as "later" and the build has zero corridors.
- "Ways around the sponsor bank" business models. Post two, drafted. Eight models grounded in rows (Chime buying Stride, Wise one seat per currency, Adyen Australia ESA, Banking Circle selling seats, CENTROlink as sponsor, Kraken Fedwire only, Western Union with Anchorage, Whop renting every layer). Chat 15e6a141. Nothing on the site frames the sponsor bank alternatives, and it is the audience's exact decision.
- Railroom flow types. Agentic flow tool reading the same data file. Canada to US wire and Interac e-Transfer flows exist on a branch, with message vs money vs settlement separated and "Show the flow" from system panels. Chats d1184c3c and 15826067. Not on the site. Tarique also said he did not want worked walkthroughs, so scope this as one or two sourced flows only.

**Researched but not used**
- Audited country nuances. 92 of 94 survived audit, four to six "what practitioners notice" per country. Some are on pages. HKD has four and no scam source. Files were sent as attachments in chat 517554a2. They are not in the repo, so locate them before the KB migration.
- Audited hop-by-hop responsibility (46 of 66 items fixed). Only the five-failure strip uses it. Layer nuances and cross-country comparisons (Part B and C) are mostly unused.
- Visual references research (BIS, Bank of England, Pudding, Stripe, Swift gpi tracker, flight and grid explainers) with 10 to 14 visual forms, including custody baton, ledger view, world clock of open systems, country fingerprint glyph, liability heat strip, small multiples. Only finality gap, distance ladder and two books made it. The plan names small multiples and a 24-hour strip. A "which systems are open right now" world clock is not planned.
- Power map research (chat 2c880281). Nine layers with 4a/4b and 2a/2b splits, seven holding models (central bank, bank deposit, pooled FBO, safeguarded, permitted investments, trust at local bank, behind a stablecoin), and one line per currency for 19 currencies. The site's seven layers and "where a payment stops" cover only part of this. The seven holding models are the best unused structure and match the planned "where customer funds sit" field.
- Drive folder. Four subfolders (V9 screenshots, historical mockups, design references, comparisons and QA), PNGs only. Design references hold six "Settlement Map" infographic variants (Canada payments ecosystem, global payment infrastructure, fintech layers). Tarique called the GPT infographic too busy for one page but wants to keep some icons. No text files to mine.

**Payment models never covered**
- CBDC (e-CNY, eNaira) has zero mentions. QR is mentioned about 23 times, mostly UPI, PayNow and Pix, with no cross-market view. Crypto ramps and remittance networks have one paragraph or rows only. Nothing on BNPL.
- Wallets and super apps. Alipay and WeChat Pay appear only as Hong Kong e-wallet examples. No model for closed-loop wallets where the app's books are the final stop, which Tarique asked for ("money does not always end at a central bank"). A super-app chat (9d97154e, May 2026) exists as a LinkedIn post only.
- China. Data has CIPS, PBOC custody accounts and NetsUnion (4 rows) and a CNY slab, but no country page. NetsUnion (the 2018 clearing mandate for wallet funds, reserve custody at PBOC) is the missing mechanism.
- Korea. Rows for BOK-Wire+, KFTC and Toss Bank. Kakao, K bank and Toss took banking licences instead of a nonbank seat, a good nuance in the data but only in row text. No page, no Naver Pay.
- Mobile money. M-Pesa (trust accounts at banks), GCash, PAPSS and Nexus exist as rows. No Kenya, Philippines or Africa page, no trust-account holding model shown, and no Nigeria or ZAR despite being queued in the Payments by Country doc.
- BNPL, closed-loop and prepaid. No BNPL. Prepaid appears in copy about nine times, with no model. Closed-loop is absent.

**Contradictions**
- Also minor. Layer names differ from the Oct 30 power map (4a/4b, 2a/2b dropped). Payments Canada sits at two layers. Bright layer illustrations conflict with one accent colour. Railroom walkthroughs conflict with the no worked examples rule. Wanting unpublished facts inferred conflicts with "Not known yet" sections.
- Rings vs layers. Nov 1 memory says Tarique likes the rings but wants the layer view first and the circle second, and is unsure rings tell the story. The Site Story canvas draws rings. The current plan deletes rings and replaces them with distance ladders and an access dot plot. The ladder and ring answer the same question, so this is a defensible swap but it should be flagged to him.
- Layer view vs matrix home. Nov 4 decision is layers as the visual hierarchy on home. The plan resolves this with a layers by markets matrix and moves the settlement gap second. Matches in spirit, but a matrix may not read as "the layers".
- Country vs currency spine. Oct 27 says global by corridor and not country by country. Oct 31 and Nov 1 say country first. The plan uses currency codes in URLs. EUR, HKD and multi-country currencies make this blur, and the country pages are for nine, the data has 19.
- Radial vs strip clock. The Site Story canvas has a radial dial. The plan says "no radial clocks, they read badly on phones". Tarique confirmed the canvas Nov 1.

**Top 8 things to bring back**
1. Settlement clock with the holiday toggle and plain labels ("Settles Fri, Sat and Sun payments"). It was the insight reviewers liked most, and it is the one thing that is a feature, not a diagram.
2. Seven holding models ("where the money sits") per player and per market. The core of "who holds the money" and the answer to sponsor bank selection.
3. Ways around the sponsor bank, eight models. The buyer's real decision, and it already has verified rows.
4. Drill up and down by dependency, so a buyer sees what breaks if a system is down.
5. Corridor blocks for ten markets, starting with CAD to INR, then the "who do you need" explainer. Needed for the test question in the info review.
6. Full responsibility matrix with regional differences (UK split scam reimbursement, Pix return, chargeback rules), and fill HKD.
7. China and Korea pages, plus Mexico. Row data already exists, and the wallet versus bank licence nuance (Kakao, Toss, NetsUnion) is what practitioners find interesting. Add one wallet and mobile money page (M-Pesa, GCash, Alipay) to cover the closed-loop model.
8. Interac split and Visa Lynx settlement facts, plus one or two Railroom flows (Canada to US wire, e-Transfer) tied to system pages.
