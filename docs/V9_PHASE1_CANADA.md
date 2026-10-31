# Settlement Map V9 · Phase 1 Canada

Branch `settlement-map-v9-canada`, cut from `settlement-map-v9-preview`. Nothing here touches the Render build or production. The V8 tarball and `v9-overrides/` are unchanged.

**What's in the branch**

| Path | What it is |
|---|---|
| `docs/IA.md` | Information architecture, version 2. Read this first |
| `data/atlas.json` | The one data file. 10 systems, 8 products, 2 access classes, 5 dated changes, 1 scenario, 19 sources |
| `data/atlas.schema.json` | JSON Schema (draft 2020-12) for system, scenario, source, party, group |
| `design/tokens.json` | Colour and line tokens. The prototype must contain every value |
| `design/icons.json` | Flags (flag-icons 7.6, MIT) and logos (Simple Icons 13.21, CC0) embedded in the page |
| `scripts/check.mjs` | `npm run check` (drift tests), `npm run check:self` (fixtures), `npm run mermaid` |
| `tests/fixtures/*.json` | 14 deliberately broken patches. Each must fail the test it targets |
| `prototype/canada/index.html` | Currency index, CAD layer map, settlement clock, change timeline, record panel and Railroom, all reading `data/atlas.json` |
| `scripts/build-preview.mjs` | Inlines the data into one file for a private review link (`dist/`, ignored) |

Run it with `npm install`, `npm run check:self`, then `npx serve .` and open `/prototype/canada/`.

---

## 1. Seven top-level groups

**Update after the IA rebuild.** The home page now leads with currencies, because every currency ends at one central bank and that is the map's core idea. The seven groups below stay as the "By system type" index on the home page and as a tag on every system. The layers are the rows of each currency map. See `docs/IA.md`.

All seven are kinds of payment infrastructure, grouped by what the system does to money. Region is a filter.

| # | Group | Phase 1 records |
|---|---|---|
| 1 | High-value and central bank settlement | Lynx, Bank of Canada settlement accounts, Fedwire Funds, Federal Reserve master accounts |
| 2 | Batch clearing | ACSS (AFT and USBE noted inside the record) |
| 3 | Instant payments | RTR (planned), Interac e-Transfer |
| 4 | Card networks | Visa in Canada, Mastercard in Canada |
| 5 | Cross-border messaging and FX settlement | Swift |
| 6 | Stablecoins and tokenized money | none yet |
| 7 | Customer-facing services | none yet |

**Where I disagree with the brief**

- The current V9 homepage seven are the layers, and those are all the same kind of thing (functions a provider performs). The mixing the brief describes was in the V8 navigation, which put systems, participants, markets, corridors and holding models side by side. So I would not throw the layers away. They become the `roles[]` tag on each record and the "who does what" lens on parties. The seven groups above index the systems.
- Group 7 renamed from "wallets and super-apps" to "Customer-facing services" so Wise-type providers fit without a new group.
- Interac e-Transfer stays in Instant payments even though it settles the next day on a deferred net basis. That contrast is the most useful thing the map can teach, and the settlement drill shows it.

**Where the existing V8 items move**

| V8 item | Moves to |
|---|---|
| systems/lynx, boe-rtgs, chaps, fedwire, chips, us-federal-reserve, uk-boe | Group 1 |
| systems/acss, fedach, epn, us-ach, bacs | Group 2 |
| systems/rtr, interac-e-transfer, interac, rtp, fednow, faster-payments, upi, pix, spi | Group 3 (DICT becomes a component inside the Pix record) |
| participants/visa, mastercard | Group 4 as systems, and kept as parties |
| participants/swift | Group 5. CLS and CIPS join in Phase 2 |
| participants/circle | Group 6 as USDC, with Circle, BlackRock and BNY as three parties |
| participants/wise, airwallex, marqeta, subfunctions/consumer-apps | Group 7 or parties only (Marqeta is a processor, not a system) |
| participants/payments-canada, bank-of-canada, federal-reserve, clearbank, banco-central-do-brasil | Parties, linked from the systems they operate |
| markets/* | Region filter |
| corridors/* | Railroom scenarios |
| holding/* | An L4 section on party records ("where the money sits") |
| layers/*, subfunctions/* | `roles[]` tags |
| systems/architecture, changes, methodology | Methodology page |

---

## 2. Screens

Superseded by `docs/IA.md` and the prototype itself. In short:

- **L1 Currencies.** One row per currency with flag, central bank, how that market does it, a nine-cell layer strip, and a 24-hour strip of its central settlement system with a now mark. Phase 2 currencies are listed compactly.
- **L2 Currency map.** Layer rows (empty ones dropped) sitting on a full-width central bank band. Top row is what customers use (wire, direct deposit, e-Transfer, card purchase). Lines show runs on, settles in (with timing) and account access. Selecting anything lights its path down to the central bank and everything that depends on it. Below the map, a week-long settlement clock with a statutory holiday toggle, and a dated change timeline.
- **L3 Record panel.** Facts, two sentences, source line, the settlement path with Drill down and Settles here (n), today's hours, and the Railroom link. Bottom sheet on phones.
- **L4.** Rulebook and operator, participants, caveats, not known yet, all sources.

---

## 3. Schema and Canada records

The schema is `data/atlas.schema.json`. Three rules carry most of the weight.

- `field_sources` maps each claim field to source ids. A field with a value and no source fails the build.
- `settles_in` points at another system. That single field is what makes the drill down and drill up work.
- `settlement_mode` is one of `rtgs`, `deferred-net`, `real-time-funded`, `central-bank-ledger`, `pvp`, `on-chain`, `none`, `unknown`. Unknown is allowed and shown as "Not confirmed".

**Canada settlement paths in the data**

| System | Settles in | Mode and timing | Primary source |
|---|---|---|---|
| Lynx | Bank of Canada accounts | RTGS, real time | Payments Canada (Lynx page), Bank of Canada account policy |
| ACSS | Lynx | Deferred net, previous day's balances settle next business morning | Payments Canada (ACSS page), Bank of Canada account policy ("meet their net settlement obligations by Lynx payments") |
| Interac e-Transfer | Lynx | Deferred net, day after the value date | Interac PPS self-assessment, as at 2025-04-30 |
| RTR (planned) | Bank of Canada accounts | Real time, accounts funded and defunded by Lynx payments | Payments Canada RTR FAQ, Bank of Canada RTR account policy (2026-07-31) |
| Visa, Mastercard in Canada | Not confirmed | Not confirmed | Bank of Canada oversight list names the operators only |

The full records, with every source, are in `data/atlas.json`.

---

## 4. Line grammar and contrast

```css
--line-message: 1px;      /* dashed 4 3, open arrowhead, ink */
--line-money: 2.5px;      /* solid, filled arrowhead, ink */
--line-settlement: 2.5px; /* double line, accent, ends in the settlement column, labelled "final" */
/* on the currency map the same grammar applies: thin ink = runs on, double accent = settles in (with timing), dotted = holds an account at */
/* customer step: plain label in the lane, no line */
```
SVG markers `m-open` and `m-fill` are in the prototype. Line type is readable without colour (dash, weight, double line, label).

`npm run check` computes this table from `design/tokens.json`.

| Theme | Pair | Ratio | Needs |
|---|---|---|---|
| light | ink on paper | 18.92 | 4.5 |
| light | muted on paper | 7.75 | 4.5 |
| light | muted on layer band | 6.97 | 4.5 |
| light | accent on paper | 6.00 | 4.5 |
| light | accent on layer band | 5.39 | 4.5 |
| light | planned on layer band | 5.98 | 4.5 |
| light | accent on central bank band | 5.23 | 4.5 |
| light | rule-strong on layer band (UI) | 3.64 | 3.0 |
| dark | ink on paper | 15.95 | 4.5 |
| dark | muted on layer band | 7.54 | 4.5 |
| dark | accent on paper | 7.85 | 4.5 |
| dark | accent on central bank band | 6.96 | 4.5 |
| dark | rule-strong on layer band (UI) | 4.13 | 3.0 |

All 28 pairs pass. The full list prints with `npm run check`.

The hairline `rule` colour is decorative only. Anything a reader has to see uses `rule-strong` or darker.

---

## 5. Canada to US flow

```mermaid
sequenceDiagram
  participant payer as Payer (Canadian business)
  participant payer_bank as Payer's bank (Canada)
  participant swift_scrl as Swift
  participant us_correspondent as US correspondent bank
  participant payee_bank as Payee's bank (US)
  participant payee as Payee (US business)
  participant federal_reserve as Federal Reserve Banks
  Note over payer: 1. customer. The payer asks its Canadian bank to send USD to a US account.
  Note over payer_bank: 2. money. The Canadian bank debits the payer's CAD account and converts it to USD.
  payer_bank--)us_correspondent: 3. message via Swift
  Note over us_correspondent: 4. money. The correspondent debits the USD account the Canadian bank holds with it.
  us_correspondent->>federal_reserve: 5. settlement via Fedwire Funds Service [final]
  federal_reserve->>payee_bank: 5. credit to master account [final]
  payee_bank->>payee: 6. money
  Note over payee: 7. customer. The payee sees the USD credit.
```
Generated from the data by `npm run mermaid`, so it cannot drift from the steps.

| Step | Caption | Source |
|---|---|---|
| 1 | The payer asks its Canadian bank to send USD to a US account | BIS CPMI correspondent banking |
| 2 | The bank debits the payer's CAD account and converts it. A book entry, not an interbank payment | BIS CPMI |
| 3 | Instruction to the US correspondent over Swift. Swift moves no money | Swift, BIS CPMI |
| 4 | The correspondent debits the Canadian bank's USD account on its books | BIS CPMI |
| 5 | Fedwire to the payee's bank. The master account credit is final | Federal Reserve Financial Services |
| 6 | The payee's bank credits the payee | BIS CPMI |
| 7 | The payee sees the USD credit | BIS CPMI |

No CAD interbank settlement happens in this flow, which surprises most readers. If the payee banks with the correspondent, step 5 becomes a book transfer.

---

## 6. Drift tests

| Test | Fails when | Fixture that proves it |
|---|---|---|
| schema | A record breaks the JSON Schema | any |
| unique-ids | Two records share an id | n/a |
| every-claim-sourced | A field has a value but no source, or cites a missing source | `03-unsourced-hours`, `08-missing-source-id` |
| explainer-two-sentences | An explainer runs past two sentences | `04-three-sentences` |
| referential-integrity | `settles_in`, operator, group, lane or step party points at nothing | `05-dangling-settles-in` |
| settlement-chain-terminates | A settlement path loops, or ends somewhere that is neither a central bank ledger nor a declared unknown | `06-settlement-loop` |
| live-never-depends-on-planned | A live system settles in a planned one (Interac in RTR today) | `07-live-on-planned` |
| referential-integrity (products, access, currencies) | A product runs on a missing system, a live product runs on a planned one, or a currency's root is not a central bank ledger | `11-product-on-missing` |
| every-claim-sourced (hours) | Opening or settlement windows have no source | `12-unsourced-window` |
| timeline-consistent | A future event is marked done, a passed date is still planned, or a system is marked live while its launch is still planned | `13-rtr-live-early`, `14-done-in-future` |
| role-tags | Swift gets a settlement role, Interac moves off Lynx, ACSS stops settling in Lynx, UPI not in RBI RTGS, CHIPS/RTP not on their NY Fed accounts, USDC without three distinct parties | `01-swift-settles`, `02-interac-in-acss`, `10-upi-wrong` |
| freshness | A record or source is older than 180 days (warning), or a source document is over 12 months old (warning) | live warnings today on four older documents |
| contrast | A token pair drops below 4.5:1 text or 3:1 UI | `09-low-contrast` (the 3.7:1 problem) |
| tokens-match-prototype | The prototype CSS stops matching `design/tokens.json` | n/a |

UPI, CHIPS, RTP and USDC tests report "pending" until Phase 2 loads those records. Link checking is opt-in (`npm run check:links`) because the network is flaky in CI.

---

## 7. Facts in §3 I would correct or tighten

- **Interac e-Transfer (new).** It settles on a deferred net basis through Lynx, the day after the value date, not through ACSS. Interac does not hold participant funds. The old Canada drilldown mockup hedged on this. Source is Interac's PPS self-assessment, as at 2025-04-30.
- **RTP.** Settlement happens by debits and credits on ledger positions RTP maintains, and those positions are backed by funds in a joint account at the New York Fed. So the ledger is TCH's and the backing is central bank money. Saying it "settles at the NY Fed" overstates it. Source is the Federal Reserve Board order on RTP joint account balances, 2023-06-07.
- **CHIPS and RTP.** Each has its own prefunded account at the New York Fed. They are not one shared joint account. I did not reverify CHIPS mechanics on a primary source this pass, so treat that line as a read.
- **UPI.** Confirmed. NPCI calculates each member's net position and settlement runs through members' RTGS accounts with RBI, inside the existing IMPS settlement file. Source is NPCI's UPI settlement process note (undated).
- **RTR.** Not live as of 31 Oct 2026. The by-law and rules took effect 24 Aug 2026 and launch is planned for Q4 2026.
- **USDC.** Not reverified this pass. The three-party split stands, but the reserve also holds cash at banks outside the BlackRock fund, so "BlackRock manages the reserve" should read "manages the Circle Reserve Fund portion".
- **Card settlement in Canada.** I could not find a primary source for where Visa and Mastercard CAD net amounts finally settle. Shown as "Not confirmed" rather than guessed.

---

## 8. What I would cut

- The ⌘K command menu. Ten systems and a region filter do not need search. Add it past about 60 records.
- The optional world map on L1. Rows carry it.
- Rail-swap small multiples until there are at least two sourced Canada flows to compare.
- The conversational Railroom mode until there are four or more sourced scenarios.
- Separate Railroom data. It already reads the same file.
- Flags at Phase 1. The two-letter ISO chip does the job and avoids an asset pipeline.

**Small deviations from the brief.** The settlement lane is the last column of the sequence diagram rather than a band underneath, because steps run down the page. The private preview link uses `#rtr` style links because the artifact frame only keeps a plain hash. The repo prototype uses `?system=rtr` as specified.
