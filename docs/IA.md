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

Below the rows, two secondary indexes. **By system type** (the seven groups from the brief, with counts) and **Flows** (Railroom scenarios).

**Not here.** No hero, no globe, no cards, no feature tiles.

## L2 · One currency

Three bands, top to bottom.

1. **Who does what (the layer map).** Rows are the layers that have something in this currency. Empty layers are dropped. Each row is labelled with the layer number, name and a plain line on who does what. The bottom band is the central bank, full width. Nodes sit in their layer. Lines join them:
   - thin ink line = *runs on* (a product runs on a system)
   - double accent line with a timing label = *settles in* (e.g. "next day · net")
   - dotted line = *access* (a seat holder's account at the central bank)
   - dashed stub ending in "?" = settlement path not confirmed
   The top row is the things people already know (wire, direct deposit, cheque, e-Transfer, card purchase). Technical names sit one row down.
2. **When it's final (the settlement clock).** A Monday to Sunday strip, one row per system. Opening windows are bars, settlement moments are accent ticks, planned systems are hatched, and a vertical line marks now in Toronto. A toggle for "Monday is a statutory holiday" shows Friday's e-Transfers settling on Tuesday, which is the "up to four days" in Interac's own disclosure.
3. **What's changing.** A dated line from 2020 to 2027 with done events solid and planned ones hatched, and now marked.

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
| Runs on | Thin ink line | Single line |
| Access to a settlement account | Dotted line | Dot pattern |
| Planned | Hatch fill | "planned" label |
| Not confirmed | Dashed outline | "?" and "Not confirmed" |
| Selected path | Full strength | Everything else drops to 25% |

Colour encodes role only. Accent is used for nothing except settlement and the focus ring.

## Type and colour

Instrument Sans for reading and labels, using its narrow widths inside the map so node names fit on a phone. Martian Mono for codes, times and counts (CAD, 00:30, T+1, 4b). Two weights. White page, a cool grey band for alternating layer rows, near-black ink and one vermilion accent. Dark theme mirrors it. Contrast is checked by `npm run check` against `design/tokens.json`.

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
