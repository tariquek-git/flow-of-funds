# Settlement Map V9 — review

**Date:** 30 October 2026  
**Scope:** branch `settlement-map-v9-preview` (V9 overrides on top of the V8 archive in `settlement-map-site.tar.gz`) and the live preview at https://settlement-map-v9-preview.onrender.com  
**Mode:** read-only. Nothing on this branch was edited except this report. No deploy. No pull request.

This is a pressure test of an atlas whose job is to say who operates a system, who owns it, and who settles it. The V9 front door is visually restrained. The failures are in what the deeper pages assert, what they leave out, and how a layer tag gets painted onto the wrong institution.

Lighthouse 12.6 (mobile, axe-based accessibility audits), 30 October 2026:

| URL | Performance | Accessibility | Only failing accessibility audit |
|---|---|---|---|
| `/` | 0.99 | 0.94 | color contrast |
| `/systems/chips.html` | 0.99 | 0.94 | color contrast |

Homepage transfer size was about 50 KiB. The CHIPS page was about 68 KiB, most of it Google Fonts. A separate axe CLI was not run; Lighthouse’s accessibility category is the axe run.

Screenshots (desktop 1440, 768, and 375) are saved as artifacts next to this review. See the list at the end.

---

## Top ten

### 1. CHIPS and RTP never say where the money actually sits

**Type:** FACTUAL ERROR

**Evidence:** Live https://settlement-map-v9-preview.onrender.com/systems/chips.html and `/systems/rtp.html`. Archive `systems/chips.html`, `systems/rtp.html`, `systems/us-clearing-house.html`. Screenshot `07-chips-desktop.png`.

The CHIPS page says The Clearing House operates CHIPS, then answers settlement with “High-value interbank payment settlement under CHIPS rules” and “CHIPS provides final, irrevocable settlement when a payment is released and settled.” The RTP page says settlement is “under its own network rules and funding model.” Neither page names a settlement account.

**Why it matters:** Operator and settler are different parties. CHIPS finality is a release against positions backed by a prefunded balance account at the Federal Reserve Bank of New York. RTP finality is a ledger entry backed by a prefunded balance account at a Federal Reserve Bank, funded by Fedwire. A reader of this atlas leaves thinking the private operator’s rulebook is the settlement system.

**Primary sources:**

- CHIPS Rules and Administrative Procedures, effective 4 June 2026, definitions (6) and (7): the CHIPS Prefunded Balance Account is “a special deposit account established at the Federal Reserve Bank of New York.” https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/CHIPS/CHIPS-Rules-and-Administrative-Procedures-June-4-2026.pdf
- RTP Operating Rules effective 30 September 2026, Rule VI: the Prefunded Balance Account Bank holds the funds; TCH is agent; the account bank’s records are not the RTP ledger; the indemnity runs to that bank “and each other Federal Reserve Bank.” https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/RTP/RTP-Operating-Rules-Effective-September-30-2026.pdf
- TCH, “RTP Prefunded Settlement Model” (November 2020), still the operator’s plain-language account of the same structure: the account “is held by the Federal Reserve Bank of New York.” https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/RTP_Settlement_Model_and_Reconciliation_for_Funding_Participants_November_2020.pdf

The sentence “The Clearing House operates CHIPS” is true. The settlement sentence is the one that is wrong for this atlas.

**Minimal fix:** On the CHIPS, RTP, and Clearing House pages, one sentence each: payments become final against a prefunded balance account at the Federal Reserve Bank of New York; TCH operates the system and acts as agent on the account; TCH does not hold the settlement balances. Link the rule PDFs above, not only the marketing pages.

---

### 2. The stablecoin page says the issuer holds the reserves. Circle’s own page, and this atlas, say otherwise

**Type:** FACTUAL ERROR

**Evidence:** Archive `holding/index.html` and `holding/stablecoin-reserves.html`: “The token issuer holds a reserve mix such as short-dated government securities, repos and cash deposits.” The only source on that page is Circle. `assets/atlas-data.json` lines 1064–1075, participant caution: “A stablecoin issuer is not the blockchain network, the reserve custodian or the final settlement ledger.” Screenshot `09-stablecoin-desktop.png`.

**Why it matters:** Custody is the question the holding section exists to answer. For the one issuer the atlas documents, Circle administers USDC; the majority of reserves sit in the Circle Reserve Fund, a government money-market fund managed by BlackRock; the fund’s custodian is The Bank of New York Mellon. The holding page erases that split and then generalizes it to “a stablecoin.”

**Primary sources:**

- Circle transparency, reserves composition as of 26 October 2026: treasuries and overnight reverse Treasury repo “may be held by the Issuer in custodial accounts, as part of a separately managed account, or within the Circle Reserve Fund, a 2a-7 money market fund managed by BlackRock.” https://www.circle.com/transparency
- BlackRock Funds SEC filing: custodian of the Circle Reserve Fund is The Bank of New York Mellon. https://www.sec.gov/Archives/edgar/data/844779/000119312526003784/d62473dncsrs.htm
- BlackRock fund page, size as of 29 October 2026. https://www.blackrock.com/cash/en-us/products/329365/circle-reserv

**Minimal fix:** Replace the holding-page sentence with the split Circle already publishes: issuer, reserve fund manager, fund custodian, and cash at banks are different roles. Name BlackRock and BNY for USDC. Do not describe every stablecoin from this one structure. Tether is not in the atlas at all; do not let the Circle sentence stand in for it.

---

### 3. Layer tags stamp scheme functions onto banks, the Fed, Swift, and Circle

**Type:** FACTUAL ERROR

**Evidence:** `assets/atlas-data.json` participant records: ClearBank `layers` includes `4a` (lines 1052–1055); Circle includes `4a` and `5` (lines 1068–1071); the Federal Reserve, Payments Canada, Swift, and Banco Central do Brasil are also tagged `4a`. The page generator turns every subfunction of a tagged layer into a card under “Explore the underlying functions.”

Live https://settlement-map-v9-preview.onrender.com/participants/clearbank.html shows ClearBank with ROLE on “Schemes and networks,” then cards for Card schemes (“Defines card transaction rules and operates card-network services”), Token transfer networks, and Financial messaging. Screenshot `08-clearbank-desktop.png`. The same card block appears on the Federal Reserve, Swift, Payments Canada, and Circle profiles.

**Why it matters:** ClearBank is a bank and a direct participant. The Bank of England’s CHAPS direct-participant list includes ClearBank Limited. It does not write card-scheme rules. Circle issues USDC and administers reserves; it is not a card scheme and it is not an FX venue. The Federal Reserve does not operate a card scheme. The directory’s layer codes (`2b, 4a` on ClearBank; `4a, 5` on Circle) are what a careful reader will quote.

There is a partial disclaimer on the layer map (“Highlight means a representative function, not proof of a licence”). It sits above the cards and does not say the cards are everyone else’s functions.

**Primary source for the ClearBank mis-tag:** Bank of England, CHAPS direct participants, which lists ClearBank Limited as a participant and states that the Bank operates CHAPS. https://www.bankofengland.co.uk/payments/chaps/

**Minimal fix:** Store the specific subfunctions an entity performs. On a profile, show only those. Delete the `4a` tag from ClearBank and Circle. If ClearBank holds a Bank of England settlement account, its settlement-layer tag is `1`, as a direct participant, with the existing caution that clients do not thereby hold that account.

---

### 4. UPI settlement is described as “coordination.” It is netting into RBI RTGS

**Type:** MISLEADING SIMPLIFICATION

**Evidence:** Archive `systems/india-npci.html`: “NPCI coordinates network-level settlement processes, while RBI-operated central systems provide settlement infrastructure for obligations as applicable.” `markets/india.html` says RBI “operates national central settlement systems” and stops there.

**Why it matters:** The atlas is careful that Pix, the scheme, is not SPI, the settlement system. It then describes India’s larger retail system with a sentence that hides the mechanism. UPI interbank obligations are netted by NPCI and posted as a multilateral net settlement batch into RBI’s RTGS, against members’ RTGS accounts. That is deferred net settlement into a central-bank RTGS, not an instant gross settlement at NPCI, and not the same design as SPI.

**Primary sources:**

- NPCI, UPI settlement process: NPCI is the clearing and settlement agency; the settlement account “is the RTGS account of members with RBI.” https://www.npci.org.in/uploads/UPI_Settlement_Process_256f73e1df.pdf
- NPCI UPI consolidated circular, section 29: net debit and credit positions are posted through the Multilateral Net Settlement Batch in RTGS. https://www.npci.org.in/uploads/UPI_Consolidated_Circular_f9c023a0ef.pdf
- Reserve Bank of India: RTGS is owned and operated by RBI and settles MNSB files for systems operated by NPCI. https://www.rbi.org.in/scripts/PublicationsView.aspx?Id=23127

**Minimal fix:** One sentence on the UPI and India pages: NPCI calculates the net; RBI’s RTGS debits and credits members’ settlement accounts. Keep the true sentence that NPCI is not the RBI, and that a UPI app is not the account-holding bank.

---

### 5. The seven groups mix a stack, institution types, and a cross-border product

**Type:** IA

**Evidence:** Live homepage and `v9-overrides/index.html`. The list is numbered 07 down to 01. Group 03 is “Multi-market accounts.” Group 02 is “Correspondents and sponsor banks.” Group 04 is “Networks and processing.” Group 05 is “FX and liquidity,” peer to settlement. The footer says these are “not mandatory steps.” Screenshot `01-home-desktop.png`.

Inside a layer page the index changes. `layers/1.html` still shows nine rows (4a, 4b, 2a, 2b). Screenshot `04-layer1-desktop.png`.

**Why it matters:** A numbered stack from customer to settlement is a path, whatever the footer says. The footer is also the low-contrast line (issue 9), so the disclaimer is the text most likely to be missed.

The groups are not one kind of thing:

- 07 and 06 are stages. For UPI, Pix, and an ACH credit they are often the same rail.
- 05 is an activity most domestic payments never do. CLS, the system that actually settles wholesale FX payment-versus-payment, is not in this group. See issue 6.
- 04 mixes rule-makers and processors. The V9 split into 4a and 4b is the right distinction, and the homepage immediately undoes it with one label.
- 03, “Multi-market accounts,” is a cross-border product pattern (Wise and similar). A domestic deposit, which is where most payments start and end, has no group.
- 02 mixes correspondent banking with sponsor-bank access. Those are different contracts. The V9 page at `layers/2.html` says so, and the homepage label joins them again.
- 01 and 04 overlap. CHAPS is a payment system and an RTGS. Pix is split into scheme and SPI. Cards sit only in “networks,” while their net positions in the UK settle in Bank of England RTGS.

**Minimal fix:** Keep seven entries if seven is the constraint. Make each entry one kind of role: customer instruction, scheme rules, messaging, processing, account liability, interbank settlement. Put correspondent and sponsor on the bank-access page, not in the title of a layer. Put “multi-market accounts” on the Wise profile and the holding pages, not as a layer of the system. On every layer page, show the same seven names the homepage uses.

---

### 6. The map reads as global. The largest settlement systems are absent, including from markets it does cover

**Type:** MISLEADING SIMPLIFICATION

**Evidence:** Market pages exist for Canada, the United States, the United Kingdom, Brazil, Mexico, India, and Ecuador. A text search of all 116 archive pages finds no mention of T2 or TARGET2, CLS, CIPS, SEPA as a scheme, Euroclear, Clearstream, or DTCC. `QA_BIAS_REVIEW.md` in the archive already records that the euro area and China were not written. Ecuador remains a market in the index.

The UK pages are the sharper case, because the market is “covered” and the settlement account is still incomplete. `systems/boe-rtgs.html` and `systems/uk-payuk.html` describe CHAPS, Faster Payments, and Bacs. The Bank of England’s RTGS self-assessment says the same accounts also settle CREST (Euroclear UK & International), the sterling legs of CLS, and the net obligations of Visa Europe and Mastercard, among others. The CHAPS direct-participant list includes CLS Bank International and Euroclear Bank.

**Why it matters:** Selecting Canada, the US, the UK, Brazil, and India can be an honest teaching set. Presenting that set, plus Ecuador, as “the seven layers of money movement,” with no euro RTGS and no CLS under “FX and liquidity,” teaches a map of the markets that were written first. The project’s own bias note says this. The homepage does not.

**Primary sources for what is missing:**

- ECB, T2 (the RTGS that replaced TARGET2 in March 2023): https://www.ecb.europa.eu/paym/target/t2/html/index.en.html
- CLSSettlement: https://www.cls-group.com/products/settlement/clssettlement/
- Bank of England, RTGS and CHAPS PFMI self-assessment (2023), on what RTGS settles, including CLS and CREST: https://www.bankofengland.co.uk/payments/rtgs-and-chaps-2023-pfmi-self-assessment
- Bank of England, CHAPS participants (CLS Bank, Euroclear Bank, ClearBank): https://www.bankofengland.co.uk/payments/chaps/
- CIPS (Cross-Border Interbank Payment System): https://www.cips.com.cn/en/

Euroclear, Clearstream, and DTCC are securities settlement infrastructures. Leaving them out of a payments atlas is a scope choice. Leaving CLS and T2 out is a hole inside the scope the homepage claims. CREST belongs on the UK RTGS page even if the atlas never becomes a securities atlas, because sterling securities settlement uses that RTGS.

**Minimal fix:** On the homepage footer, name the covered markets and say T2, CLS, and CIPS are not written yet. On the UK RTGS page, add the other systems the Bank says settle there: Faster Payments, Bacs, card schemes, CLS sterling legs, CREST. On the FX layer, add CLS as the PvP settlement system, with no invented membership list. Do not add Ecuador to the front door.

---

### 7. The front door does not open the rest of the atlas

**Type:** NAVIGATION

**Evidence:** `v9-overrides/index.html` links only to `layers/1.html` through `layers/7.html`. There is no link to markets, national systems, participants, holding models, or method. `v9-overrides/layers/index.html` is a second copy of that homepage, so the sidebar item “Layers” on every deep page returns to the seven-name list rather than the nine-row index those pages still draw. `v9-overrides/layers/2.html` and `layers/4.html` link only to 2a/2b and 4a/4b.

`assets/atlas.css` (the rule just before the V6 comment): `@media(max-width:650px){section[aria-labelledby="systems-compare"]{display:none}}`. That section is the “Who owns, operates and settles?” entry and the “Five architectures” comparison on `systems/index.html`. At 375px those links are removed. Screenshot `11-systems-375.png` shows the country list and not that comparison.

**Why it matters:** Progressive disclosure has to connect layers, markets, national systems, and participants. From the live homepage the only path is a layer, then a V8 page, then the sidebar. The two taxonomies (seven groups on the door, nine rows inside) are not labeled as the same map. On a phone, the page that explains ownership versus settlement hides its comparison.

**Minimal fix:** Add one line of text links under the seven rows: Markets, National systems, Participants, Where money sits, Method. Point “Layers” at a single index that uses the seven names. Delete the duplicate `layers/index.html` or make it that index. At narrow widths, stack the systems comparison. Do not set it to `display: none`.

---

### 8. The interior is a card grid the homepage just refused

**Type:** VISUAL/DESIGN PREFERENCE

**Evidence:** Screenshots `07-chips-desktop.png`, `08-clearbank-desktop.png`, `04-layer1-desktop.png`, `10-systems-desktop.png`.

The homepage is a list. One click later the page is a left rail, an eyebrow kicker, a large title, a two-column card grid, a teal “don’t confuse this with” bar, and a ↗ on every row. ClearBank’s “underlying functions” are six cards, four of which are the wrong institution (issue 3). CHIPS uses the same card chrome for RTP and EPN. Layer 1 uses it again for five subfunctions and four participants. `v9-overrides/DESIGN_V9.md` asks for no decorated cards on the homepage. The homepage complies. The pages that carry the facts do not.

**Why it matters:** The cards are where the false role assignments are displayed. They also add a second visual system, so the atlas feels like two sites.

**Minimal fix:** On participant and system pages, use the same row list as the homepage. One link, one sentence, no kicker, no card border. Keep the source line. Do not redesign type, color, or layout beyond removing that chrome.

---

### 9. The disclaimer and the layer numbers fail contrast. Small type on interior pages fails harder

**Type:** ACCESSIBILITY

**Evidence:** Lighthouse color-contrast audit, 30 October 2026.

Homepage, `v9-overrides/assets/home-v9.css`:

- `.v9-layer-no` `#758992` on white, 12px: **3.65:1**. Fails WCAG 2.2 AA for normal text (4.5:1). All seven numbers fail.
- `.v9-foot` `#78878c` on white, 11px: **3.72:1**. This is the sentence “Functional categories, not mandatory steps in every payment.”

CHIPS page, `assets/atlas.css`:

- 10px meta text `#8a9ea6` on white: **2.79:1**. Fails even the 3:1 large-text floor.
- 11px breadcrumb `#67808a`: **4.17:1**.
- 12px body secondary `#67818a`: **4.13:1**.

`home-v9.css` at `max-width: 760px` sets `.v9-layer-desc { display: none }`. At 375px the only definition of each layer disappears. Screenshot `02-home-375.png`. At 768px the descriptions are still there, because 768 is just above the cutoff. Screenshot `03-home-768.png`.

Both stylesheets define `:focus-visible`. Both honor `prefers-reduced-motion`. The homepage has `header`, `main`, `nav`, and `footer`. Interior pages have `aside` and `main`. Logo images that exist use alt text (`alt="Visa logo"`). There is no skip link. I did not complete a manual tab-through of every page.

The systems comparison removed under 650px (issue 7) is also an accessibility failure: content is hidden rather than reflowed.

**Minimal fix:** Darken layer numbers, footer, breadcrumbs, and 10–12px secondary text until they clear 4.5:1. Keep the layer description visible at 375px, under the name. Restore the systems comparison as a stacked list. Add a skip link on the interior template. No other visual change.

---

### 10. The data model is not what the browser loads, so these errors will be copied, not caught

**Type:** TECHNICAL

**Evidence:**

- `assets/atlas-data.json` is about 80 KB and is not referenced by any HTML page or by `assets/atlas.js`. The script only toggles tabs and filters text.
- `assets/verified-claims.json` has eight claims. It is also not loaded. Several of those claims are right (Lynx, Interac, Pix, RTP participation versus ownership). They do not cover CHIPS settlement, RTP’s prefunded account, USDC custody, or UPI’s RTGS posting.
- V9 is a second hand-written tree. `v9-overrides/layers/index.html` repeats `v9-overrides/index.html` with different relative URLs. They will diverge the first time one is edited.
- `QA_BIAS_REVIEW.md` refers to `qa_bias_gate.py`. That script is not in the published archive.
- Page weight is not the problem. Lighthouse: homepage ~50 KiB, CHIPS ~68 KiB, LCP about 1.5–1.6 s, CLS about 0. Performance scores were 0.99. Google Fonts are render-blocking and are most of the bytes (`home-v9.css` line 1, `@import` of DM Sans and IBM Plex Mono).

**Why it matters:** The ClearBank card bug is a join between `participants[].layers` and `subfunctions` of that layer, baked into static HTML. Editing the JSON will not change the site. A drift check would have compared “ClearBank / card schemes” to the participant description and failed.

**Minimal fix:** Generate the HTML from `atlas-data.json`, or delete the JSON so it cannot be mistaken for the source. Add one test: every participant card’s subfunction id must be listed on that participant. Add the CHIPS, RTP, USDC, and UPI claims to `verified-claims.json` with the URLs in this review. Self-host the two fonts, or accept the system-font fallback already named in the CSS.

---

## Appendix A — factual errors and the citation

| Claim in the atlas | What is wrong | Primary source |
|---|---|---|
| CHIPS settlement is “under CHIPS rules,” with finality when CHIPS releases the payment. The Clearing House is the only institution named. | The settlement balances are in the CHIPS Prefunded Balance Account at the Federal Reserve Bank of New York. TCH operates CHIPS and is agent on the account. | https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/CHIPS/CHIPS-Rules-and-Administrative-Procedures-June-4-2026.pdf |
| RTP settles “under its own network rules and funding model.” | Current rules settle against a prefunded balance account at a Federal Reserve Bank, funded by Fedwire. TCH’s settlement note names the Federal Reserve Bank of New York. The RTP ledger is not the account bank’s ledger. | https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/RTP/RTP-Operating-Rules-Effective-September-30-2026.pdf and https://www.theclearinghouse.org/-/media/New/TCH/Documents/Payment-Systems/RTP_Settlement_Model_and_Reconciliation_for_Funding_Participants_November_2020.pdf |
| “The token issuer holds a reserve mix…” on the stablecoin holding pages. | For USDC, Circle administers; BlackRock manages the Circle Reserve Fund; BNY Mellon is the fund custodian. The atlas’s own Circle caution says the issuer is not the custodian. | https://www.circle.com/transparency and https://www.sec.gov/Archives/edgar/data/844779/000119312526003784/d62473dncsrs.htm |
| ClearBank has a role in “Schemes and networks,” and the profile lists card schemes and token networks as its underlying functions. | ClearBank is a CHAPS direct participant. It does not define card-scheme rules or operate a token network. | https://www.bankofengland.co.uk/payments/chaps/ |
| Circle is tagged to schemes/networks (`4a`) and FX (`5`), and the profile lists card schemes and domestic schemes. | Circle’s documented role here is USDC issuance and reserve administration. | https://www.circle.com/transparency |
| The same “underlying functions” cards assign card schemes and token networks to the Federal Reserve, Payments Canada, and Swift. | Those cards are every subfunction of layer `4a`, not functions those institutions perform. | Same data join as ClearBank; `assets/atlas-data.json` participant `layers` arrays. Swift’s own oversight page says it is neither a payment nor a settlement system: https://www.swift.com/about-us/organisation-governance/swift-oversight |

## Appendix B — simplifications that are not false sentences

These are not listed as factual errors. The words on the page can be read as true and still send an expert to the wrong picture.

- **UPI.** “NPCI coordinates” settlement and RBI provides infrastructure “as applicable.” NPCI is the settlement agency and the posting is an MNSB into RBI RTGS. Citations in issue 4.
- **Federal Reserve one-liner.** “Operates FedNow and provides central-bank settlement services.” Fedwire Funds is the RTGS. The US market diagram also leads with FedNow. Fedwire Funds credits master accounts: https://www.frbservices.org/financial-services/wires
- **Lynx and CHAPS messaging.** Both pages name the operator and the central-bank account. Neither says Swift carries the payment messages. Payments Canada lists Swift as the Lynx message network and as a participation requirement: https://www.payments.ca/systems-services/payment-systems/high-value-payment-system-lynx. The Bank of England says CHAPS resilience rests on RTGS and the SWIFT network: https://www.bankofengland.co.uk/payments/chaps/
- **Pay.UK versus Vocalink.** “Pay.UK operates Faster Payments and Bacs” matches the Bank of England. Pay.UK’s PFMI disclosure says the central infrastructure is outsourced to Vocalink, and Pay.UK extended those contracts for FPS, Bacs, and the Image Clearing System. The atlas does not mention Vocalink or the Image Clearing System. https://www.bankofengland.co.uk/payments/payment-settlement and https://www.wearepay.uk/pay-uk-and-vocalink-extend-contracts/
- **UK RTGS scope.** Faster Payments and Bacs netting in RTGS is right. CLS sterling legs, CREST, and Visa/Mastercard net settlement in the same RTGS are absent. https://www.bankofengland.co.uk/payments/rtgs-and-chaps-2023-pfmi-self-assessment
- **Two systems named SPI.** Ecuador’s SPI (Sistema de Pagos Interbancarios, Banco Central del Ecuador) and Brazil’s SPI (Pix settlement) are different systems. The Ecuador page says it is not Fedwire. It does not say it is not Brazil’s SPI.
- **Fedwire citation quality.** The claim that Fedwire is a Federal Reserve service settling in Reserve Bank accounts is true. The atlas cites a generic New York Fed “what we do” page. The operator page is https://www.frbservices.org/financial-services/wires
- **Absent, with no false sentence, because they are not mentioned:** T2, CLS, CIPS, SEPA, Euroclear, Clearstream, DTCC, Tether. CLS and T2 are the omissions that change the map. Euroclear/Clearstream/DTCC are securities FMIs; the UK RTGS page should still mention CREST.

## Appendix C — checked and consistent with the primary page

| What the atlas says | Source opened for this review |
|---|---|
| Payments Canada owns and operates Lynx. Direct participants maintain a settlement account at the Bank of Canada. Lynx is an RTGS with real-time finality. | https://www.payments.ca/systems-services/payment-systems/high-value-payment-system-lynx |
| The Bank of England operates CHAPS. Obligations settle individually, gross, in RTGS, and are irrevocable between direct participants. | https://www.bankofengland.co.uk/payments/chaps/ |
| Pay.UK operates Faster Payments and Bacs. Customer payments can be near-real-time while interbank settlement is deferred net in RTGS. Faster Payments settles three times a business day; Bacs once. The atlas’s “separate cycles” wording matches this. | https://www.bankofengland.co.uk/payments/payment-settlement |
| Fedwire Funds is a Federal Reserve service. Finality is credit to a master account. It is not ACH and not FedNow. | https://www.frbservices.org/financial-services/wires |
| Interac’s shareholders include banks, credit unions, caisses populaires, and payment acquirers. Interac does not hold e-Transfer funds; the account is at the financial institution. | https://www.interac.ca/en/interac-e-transfer-disclosure/ and https://www.interac.ca/en/resources/personal-resources/personal-faq/interac-e-transfer/ |
| RTR is not live. Payments Canada’s testing-and-launch page still says a sequenced Q4 2026 launch, initial direct-to-Exchange participants first, Interac e-Transfer migration in 2027. A companion page says launch is “in the coming weeks.” Recheck before calling RTR live. | https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system/testing-and-launch |
| Banco de México administers and operates SPEI, described there as a real-time settlement system, 24/7, in domestic currency. | https://www.banxico.org.mx/servicios/spei_-informacion-banco-mex.html |
| Swift “is neither a payment nor a settlement system” and is a shareholder-owned cooperative overseen by central banks, lead overseer the National Bank of Belgium. | https://www.swift.com/about-us/organisation-governance/swift-oversight |
| RTP participation does not require ownership of The Clearing House. The marketing page says any federally insured depository and certain other institutions can participate without TCH ownership. | https://www.theclearinghouse.org/payment-systems/rtp |
| Nacha administers ACH rules; FedACH and EPN are the two operators. The atlas draws this split. Not re-litigated against the Nacha rulebook in this pass; no contradicting sentence was found in the pages read. | Atlas `systems/us-ach.html`, `systems/fedach.html`, `systems/epn.html` |

Pix (BCB owns the scheme and operates SPI and DICT; direct versus indirect participants) matches the atlas’s cited BCB URL. The fetch of https://www.bcb.gov.br/en/financialstability/pixcentralbanksrole on 30 October 2026 returned no body text, so Pix is not marked confirmed from a fresh page read.

Visa and Mastercard cautions — the scheme is not the deposit-holding institution — were not re-opened against the Visa rules PDF or the Mastercard switching page in this pass. The Bank of England does confirm that Visa Europe and Mastercard net obligations settle in RTGS, which the UK pages do not say.

## Appendix D — screenshots

Saved under the artifact directory `screenshots/`:

| File | Viewport | Screen |
|---|---|---|
| `01-home-desktop.png` | 1440 | V9 homepage |
| `02-home-375.png` | 375 | Homepage with layer descriptions removed |
| `03-home-768.png` | 768 | Homepage with descriptions still visible |
| `04-layer1-desktop.png` | 1440 | Settlement layer, nine-row index, card grid |
| `05-layer1-375.png` | 375 | Same layer, stacked |
| `06-layer4-desktop.png` | 1440 | V9 networks split |
| `14-layer4-375.png` | 375 | V9 networks split |
| `07-chips-desktop.png` | 1440 | CHIPS, settlement answer without the Fed account |
| `08-clearbank-desktop.png` | 1440 | ClearBank with card-scheme cards |
| `09-stablecoin-desktop.png` | 1440 | “Issuer holds the reserve mix” |
| `10-systems-desktop.png` | 1440 | National systems index |
| `11-systems-375.png` | 375 | Systems index with the comparison section hidden |
| `12-markets-desktop.png` | 1440 | Market index |
| `13-circle-desktop.png` | 1440 | Circle profile |

## What this review did not do

No production edit, no deploy, no push to `settlement-map-v9-preview` or `main`, no pull request. Logo permissions were not reviewed. Bilateral correspondent routes were not invented in order to test them. Pix’s BCB page, the Visa rulebook, and the Mastercard switching page were not successfully re-read in this pass.
