# Who Holds the Money: information review (Nov 8 2026)

## 1. Inventory

**What exists**
- 19 currencies in D.ccys, 19 central banks in D.cb. 136 rows in D.rows covering about 131 named organisations across 31 currency codes, plus 25 rows tagged only "MULTI".
- 34 rails in PATHS for the 9 page countries. Only 4 have ids, all Canadian (C101 to C104). 14 have no row at all (CHAPS, Faster Payments, Bacs, ACH). Elsewhere systems hide inside central bank names, like P047 "ECB (TARGET2, T2, TIPS)".
- Taxonomies. 7 layers plus 4 sub-layers, 11 archetypes, 5 access values, 5 lanes, 5 settlement kinds.
- About 290 source URLs across 138 domains, stored in five different shapes, with no tier field.

**Rows are role placements, not entities**
- Wise is P049 (layer 3) and P401 (layer 7). Same for Western Union (P042, P404), Banking Circle (P046, P403), ClearBank (P073, P402), Whop (P074, P075). Facts split across the pair (Wise's FY26 source sits on P401, the figures it supports on P049).
- way and cp are one value per row, so a multi-market player gets one answer. P049 Wise is "own" although it is indirect in BRL and goes through banks in CAD and USD. A hand patch (OVR) rewrites it in copy.
- P010 Federal Reserve has way "denied", which is a market policy stored on an entity.

**Same fact stored twice or in conflict**
- Nonbank access to the central bank is stated six times (D.hows, D.slabs, CA.how and CA.slab, PATHS.nonbank_access and nonbank_note, ACCESSL, STORIES). EUR is "opening" in PATHS but "Live, one" in slabs. SGD is "no" in PATHS but "connect to FAST themselves" in hows.
- Payments Canada is layer 1 and settlement_operator in D, layer 4 and scheme_network in the Canada v2.3 dataset (CA). CA is a parallel copy of 12 Canada rows with extra fields.
- Layer copy sits in 8 dictionaries, player copy in 7, access labels in 4.
- Nine Canada-only dictionaries (CA, MODEL, OPER, OVS, OVR and others) give Canada a second data layer no other country has.

## 2. Uneven depth

**Country pages are even, the player data is not**
- MODELS copy is level at 610 to 790 words per country, 9 to 16 sources each.
- Rows per page country are USD 37, CAD 16, EUR 13, BRL 10, GBP 7, AUD 6, SGD 4, INR 4, HKD 3.
- HKD has rows only at layers 1 and 4. SGD, INR, BRL and MXN have no bank rows.
- Slabs (the central bank access verdict) exist for CHF, MXN, CNY and KRW, which have no page, and are missing for AUD, INR and HKD, which do.

**Currencies with no country page (10)**
- MXN (15 rows and a slab, the third deepest market, so the next page), PHP 6, AED 4, CNY 4, CHF 3, JPY 3, KRW 3, SAR 3, ZAR 3, IDR 1. Drop the rest from D.ccys or label them players only.

**Thin roles**
- Holds. Only 5 of 20 "sponsored" rows name the actual bank (Wealthsimple and RBC, Chime, Airwallex, Circle, Whop). KOHO, Float and Paramount say "Sponsor bank" or "Payment partners".
- Responsible. HKD has no entries in the five failure scenarios.

## 3. Gaps that matter most

- **Comparable market fields.** The compare view sets two prose paragraphs side by side. Only two dimensions are structured (rails_owner, nonbank_access). Add a fixed market profile. RTGS and its operator. Instant rail, operator, settlement mode and hours. Who can hold a central bank account (banks only, eligible, live with named holders). Whether a nonbank can join the instant rail directly. Card settlement arrangement. Safeguarding model (segregated at bank, trust, pooled FBO, central bank custody). Licence a payment company needs. Fraud loss model.
- **Systems as entities, with participation per system.** 30 of 34 rails lack an id. One edge per player and system (direct, indirect via a named bank, technical only).
- **Named sponsor relationships.** The audience picks sponsor banks, yet the 16 US sponsor bank rows link to no fintech.
- **Corridors.** No pairwise records. Nexus, Buna and PAPSS exist only as rows. A corridor record needs the options (correspondent, global payment company, card push, instant link, stablecoin), inbound rules on the far side and who serves it.
- **Change as data.** "Launching" and "expires at RTR launch" are baked into copy and the Canada state already looks stale against the Oct 21 statement. A changes table (announced, pilot, live, with as-of) lets copy stay timeless while the status updates itself.
- **Stablecoins structured.** Each country has one prose paragraph. Needs issuer, reserve holder, local regime status and ramps per market.

## 4. Simplify

**One model is supported**
- The arch to layer crosstab is nearly one to one. About 126 of 136 rows sit where their arch predicts. The exceptions (distributors at 6, payment companies at 5 and 6, schemes at 1) are role placements, not kinds.
- So store one **kind** per entity with six values (app, payment company, bank, payment system or network, central bank, technology provider). The brief's five kinds plus technology provider, which holds no money and covers 9 rows.
- The five lanes are relationship types. Rules is sets_rules_for, moves is operates and participates_in, holds is holds_funds_for, settles is settles_at, responsible is supervises.
- The seven layers become a display grouping computed from kind plus edges. The five-stop track is just kind. "Where a payment stops" is the kind of the settles_at target. The ladder is path length.

**Cut or merge**
- arch (11) and sub-layers (4a, 4b, 2a, 2b) into kind. Retire FIT, ROLE1, WAY1, ARCHST, ARCHOBS.
- way, ACCESS, WAY, ACCESSL into one access value on the participation edge.
- conf plus in-text "(inferred)" into fact, stated, inferred. It matches the tags in the Payments by Country doc.
- State labels in slabs ("Live, count only"). Tarique already rejected state words.
- KIND and MODEL into one settlement_mode. MULTI into explicit market lists. The CA dataset, once its extra fields move over.
- Key point, Takeaway and In short into one takeaway field.

## 5. Knowledge base design

**Layout, one folder per entity type, plain files**
- data/markets/cad.yaml (profile fields from gap 1)
- data/entities/wise.yaml (all six kinds, systems included)
- data/corridors/cad-inr.yaml
- data/sources.csv (id, url, title, publisher, tier primary or operator or analyst, retrieved)
- data/changes.csv (subject, what, status, as_of, source)
- copy/ for prose only, referring to ids
- build.py validates ids and edges, then emits the site JSON, claims.jsonl and llms.txt

**Rules**
- Ids are slugs that never change (wise, ca-lynx, bank-of-canada). Keep old P ids as an alias field so links survive.
- Every fact and edge carries src, as_of and conf inline. The build flattens them into claims.jsonl, so one person edits one file, never a separate claims table.
- Copy states no fact that is not in data.
- Before migrating, scrub the Payments by Country doc. Its Canada members list names a company the project excludes.

**Edge types**
- operates, sets_rules_for, participates_in (direct, indirect, technical, with via), settles_at, sponsored_by, holds_funds_for, safeguards_at, supervises, registered_with, owned_by, links (system to system).

**Example, data/entities/wise.yaml**

```yaml
id: wise
aliases: [P049, P401]
name: Wise
kind: payment_company
site: https://wise.com
summary_ref: copy/entities/wise.md
markets: [GBP, EUR, AUD, JPY, SGD, MYR, BRL, CAD, USD]
edges:
  - {type: participates_in, to: uk-rtgs, access: direct, src: [needs-primary], as_of: 2026-10-27, conf: stated}
  - {type: participates_in, to: jp-boj-net, access: direct, src: [needs-primary], as_of: 2026-10-27, conf: stated}
  - {type: participates_in, to: eu-t2, access: indirect, via: bank-of-lithuania, as_of: 2026-10-27, conf: stated}
  - {type: participates_in, to: br-pix, access: indirect, src: [bcb-pix-list], as_of: 2026-10-27, conf: fact}
  - {type: participates_in, to: ca-lynx, access: indirect, via: unnamed-bank, src: [S09], as_of: 2026-10-27, conf: fact}
  - {type: sponsored_by, to: community-federal-savings-bank, market: USD, as_of: 2026-10-27, conf: stated}
  - {type: safeguards_at, to: banks, market: GLOBAL, src: [S507], as_of: 2026-03-31, conf: fact}
facts:
  - {field: customer_funds_usd_m, value: 30254.2, src: [S507], as_of: 2026-03-31, conf: fact}
```

- The current row cites no Bank of England or Bank of Japan source for its two strongest claims. The format makes that gap visible.

## 6. AI and agentic readiness

**The test question**
- "Who do I need to move CAD to INR for a payroll product" needs a CAD to INR corridor record, INR inbound rules (bank credit, purpose codes, cash limits), players with participation edges in both markets, their Canadian registration and their sponsor banks. Today the data has 4 INR rows, no corridor and no registration edges, so an agent would guess.

**Now**
- Stable slug ids, typed edges, src, as_of and conf on every claim.
- Build emits /api/markets/{ccy}.json, /api/entities/{id}.json, /api/corridors/{a}-{b}.json, a full graph.json and llms.txt plus llms-full.txt.
- The fact base is small enough to fit in one Sonnet context. No vector search needed.
- Ten corridor records before the explainer.

**Later**
- An MCP server with three tools (get_market, find_route from, to and use case, list_providers by corridor) reading graph.json.
- use_case tags on corridor options (payroll, remittance, payouts).
