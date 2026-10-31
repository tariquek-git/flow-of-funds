# Settlement Map · Information architecture

Version 2, 31 Oct 2026. This replaces the wireframes in `V9_PHASE1_CANADA.md` §2. The data model and tests in that file still stand, extended here.

## The one question each level answers

| Level | Screen | Answers | New idea it introduces |
|---|---|---|---|
| L1 | Currencies | Where does each currency's money finally settle, and is it open right now? | Every currency ends at one central bank |
| L2 | One currency (CAD) | Who does what, and what depends on what? | Things people know sit on systems, and systems sit on the central bank |
| L3 | Record panel | What is this one system, and where does it settle? | The settlement path, up and down |
| L4 | Record sections | What exactly backs that claim? | Sources, caveats, unknowns |
| Flow | Railroom | What happens, step by step, in one real payment? | Message vs money vs settlement |

## Drill up and down

Two axes. Both live in one URL.

- **Across, by scope.** Currencies › CAD › Lynx. The breadcrumb shows it. Back or Esc goes up one level.
- **Down, by dependency.** Debit at checkout › ACSS › Lynx › Bank of Canada. Selecting anything on the CAD map lights its path to the central bank and dims the rest.
- **Up, by dependency.** Select the Bank of Canada and everything that settles in it lights up. Select Lynx and you see ACSS, e-Transfer, wires, cheques, direct deposit and debit above it.

Drill down is what a reader does to answer "is this final, and when?" Drill up is what a sponsor-bank or partner buyer does to answer "what breaks if this system is down?"

## Sitemap and URLs

```
/                                  Currencies (L1)
/?ccy=CAD                          Currency map (L2)
/?ccy=CAD&node=lynx                Panel open on a system (L3)
/?ccy=CAD&node=ca-etransfer        Panel open on a product (drill down starts here)
/?type=instant                     All systems of one type, across currencies
/?flow=ca-us-wire&step=5           Railroom
```
Phones and desktop share the same URLs. The private review link uses `#cad`, `#cad-lynx`, `#flow-ca-us-wire-5` because that frame keeps only a plain hash.

## L1 · Currencies

One row per currency. A row holds a flag, the code, the central bank, one sentence on how that market does it, a nine-cell layer strip (filled where the map has something), a 24-hour strip for the central settlement system with a "now" mark, and a count. Loaded currencies are full rows. Phase 2 currencies are a single compact line each, with flag and central bank only, so the scope is visible without pretending to coverage.

Below the rows, one secondary index, **Flows** (Railroom scenarios). The seven system-type groups stay in the data and the `?type=` view, but are off the home page until there are about 40 systems. The nine-cell layer strip was cut after QA because readers could not decode it.

**Not here.** No hero, no globe, no cards, no feature tiles.

## L2 · One currency

Three bands, top to bottom.

1. **Who does what (the settlement map).** It answers one question. For each kind of payment, who carries it, when is it final between banks, and who needs a seat to take part?
   - **Across, left to right, is speed.** Payment types are ordered by how fast the banks settle them (real time, next business day, depends on the card network). A scale above the row says so, and each payment type carries its own "Settles ..." line. A note under the map says settlement between banks is final but some payments can still be undone, with the rule shown on cheques, pre-authorized debits and card purchases. Wire and RTR are on the left, debit, cheque, direct deposit and e-Transfer in the middle, and cards on the right.
   - **Down is the path.** The rows are payment type, then network and rules (4a), clearing (4b), settlement (1), and the central bank band. Plain names come first, and the layer code sits small beside each one. Empty rows are dropped.
   - **Banks are a side column, not a step.** "Who holds the accounts" lists seat holders (Lynx participants and ACSS direct clearers) and those who reach the seat through them, with dotted lines to the central bank. Banks take part in every system, so they sit beside the stack instead of inside it.
   - **The lines.** A thin ink line means runs on. A double accent line with a timing label means settles in. A dashed double line in the planned colour means will settle in once live. Dotted means holds an account at. A dashed stub ending in "?" means not confirmed.
   - The heading states what the lines are. Customer money stays in bank accounts, and the lines show where banks settle what they owe each other.
2. **When it's final (the settlement clock).** A Monday to Sunday strip, one row per system. A long accent bar settles all day (Lynx). A short accent mark settles once (ACSS, Interac Debit, e-Transfer, each labelled with the days it covers). Planned is hatched, and a vertical line marks now in Toronto. A "Monday is a statutory holiday" box shows Friday to Monday settling on Tuesday, which is the four days in Interac's disclosure.
3. **What's changing.** A dated list, done events solid and planned ones hatched. The axis graphic was cut after QA because it repeated the list.

**Phones and narrow columns.** The map switches by the width of its column, not the screen, so it also adapts when the record panel is open on a laptop. Payment types wrap, and the speed scale moves into each node's "Final ..." line. Product lines appear only for the selected path, and the seats column moves under the central bank band.

## L3 · Record panel

Right column on desktop, bottom sheet on phones (half and full height). Order is fixed.

1. Name, flag or logo, type and layer
2. Facts: operator, participants, settlement asset, hours, **settles in**
3. Two-sentence explainer, then one source line
4. Settlement path: the chain to the central bank, each rung with mode and timing, plus Drill down and Settles here (n)
5. Today: a 24-hour strip for this system, with now marked
6. "Show the flow →" when a Railroom scenario uses this system

## L4 · Record sections

Closed by default. Rulebook and operator, Participants, Caveats, Not known yet, All sources (each source says which fields it supports, its tier, dated or undated, and when it was checked).

## Encodings

| Meaning | Encoding | Without colour |
|---|---|---|
| Central bank money, finality | Accent colour | Double line, "final" label, base band |
| Will settle once live | Planned colour, dashed double line | "planned" tag, hatch |
| Speed to finality | Horizontal position plus the "Final ..." line | Text label on every payment type |
| Runs on | Thin ink line | Single line |
| Access to a settlement account | Dotted line | Dot pattern |
| Planned | Hatch fill | "planned" label |
| Not confirmed | Dashed outline | "?" and "Not confirmed" |
| Selected path | Full strength, outlined | Everything else turns muted grey and keeps readable contrast |

Colour encodes role only. Accent is used for nothing except settlement in central bank money. Focus rings, navigation and controls are ink.

## Type and colour

Instrument Sans for reading and labels, using its narrow widths inside the map so node names fit on a phone. Martian Mono only for codes, times and counts (CAD, 00:30, 4b, timing labels). Navigation, breadcrumbs, buttons and field labels use the sans. Two weights. White page, a cool grey band for alternating layer rows, near-black ink and one vermilion accent. Dark theme mirrors it. Contrast is checked by `npm run check` against `design/tokens.json`.

## Phones

- The layer map keeps its rows. The layer label moves above its nodes and nodes wrap. Lines are redrawn from live positions, so they stay attached at any width.
- The clock and the timeline scroll sideways inside their own band, with row labels pinned.
- The panel is a bottom sheet. Half height leaves the selected path visible above it.
- Tap targets are at least 40px tall.

## Copy rules

- Name things by what people already call them first, the system name second (Debit at checkout, then ACSS).
- Say who does what in plain words. No metaphors and no state words like "live" or "claimed" in running copy. "Planned" appears only as a status label.
- Two sentences maximum for any explainer. A number or time always has a source.
- "Not confirmed" is a valid answer and is shown, never hidden.
- No em dashes, semicolons or colons in running copy.

## What was cut and why

- ⌘K search. Ten systems do not need it. Add it past about 60.
- World map or globe. The currency rows do the job and work on a phone.
- Logo walls. Logos appear at 16px next to a name, only where an open-source mark exists (Visa, Mastercard, Swift).
- Rail-swap small multiples. They wait for a second sourced Canada flow.

## Version 3 changes (31 Oct 2026)

- **Isometric glyphs instead of boxes.** Payment types are iso tiles with a line icon. Networks are iso cubes. ACSS and Lynx are long iso slabs that lines land on. Seat holders are iso buildings, and the Bank of Canada is a slab across the bottom. A full isometric scene was tried and dropped, because the diagonal axis broke the left-to-right speed reading and the labels.
- **High level first.** Payment types show only a name and a short speed. Timing labels on lines appear only when something is picked. Details live in the record.
- **No live time.** The open-or-closed status, the "today" bars and the weekly clock with its now line are gone. They could not know statutory holidays and would need a yearly calendar. Timing is now five plain sourced sentences under "When it settles".
- **Three line styles.** Runs on, settles in, and dotted for planned, account links or not confirmed.
- **Home page.** Only currencies with content are listed. The rest are one line. USD stays inside the Canada to US flow.
- **Railroom.** The steps-as-text list is behind a toggle.
- **One review link.** The Render preview at /canada/.

## Version 4 changes (31 Oct 2026)

- **Show what it is, not the brand, except where people know the brand.** The map works at the level a reader needs. The detailed, sourced records stay underneath and open from the bucket.
  - **Interbank settlement** is one node for Lynx and ACSS. The clearing row is gone. Wire versus daily-total timing still shows on each payment type and in "What's inside".
  - **Interac** is one node for Debit and e-Transfer. It is the only network that runs both.
  - **Networks** is one row with the known brands named: Interac, Visa, Mastercard and Amex.
- **Networks never settle. Banks do.** Visa and Mastercard settle through a settlement bank that pays over Lynx. Mastercard is shown that way because that is how card networks work, and the record says no Canadian source names its bank.
- **Amex** is an issuer, acquirer and network in one (Amex Canada merchant pricing page). When it issues the card and signs the merchant, there is no bank-to-bank step, so its node has no line down.
- **Data.** `rollups` in `data/atlas.json` defines the buckets. The view folds them in at load. Checks and sources still run on the detailed records.
- **Rule for later.** Bucket anything a reader would not tell apart, and name a brand only when people already know it.

## Version 5 changes (31 Oct 2026). A clickable site, one page per thing

- **No single map.** The all-in-one map is gone as a page, because one chart cannot answer every question at once. (The map code stays in the file, unused, until it is deleted for good.)
- **Currencies › Canada.** The Canada page lists four sections, with no lines. Payment types are grouped by how fast banks settle them. Then Networks, Settlement, and Who holds the accounts. "When each one settles", "What's changing" and "Step through a real payment" are drop-downs at the bottom.
- **One page per thing** (17 for Canada). Each page has a kind label, the name and a two-sentence explainer with its source, then up to three key facts. Next is one vertical path to the Bank of Canada, with each step linking to its own page (drill down). "Depends on this" lists what sits above it (drill up). Drop-downs for detail follow, closed by default except "Can it be undone". Previous and next links stay within the section.
- **Card purchase** shows three short paths side by side (Visa, Mastercard, Amex), stacked on phones.
- **URLs.** `?ccy=CAD&node=<id>` on the site and `#cad-<id>` in the single-file build, so every page can be linked.
