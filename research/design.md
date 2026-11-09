# Who Holds the Money, design review

## 1. Does this look AI-made? Page by page

**Home**
- The seven-layer list is the most AI-looking thing on the site. Seven identical white cards, round coloured icon badges, number plus title plus subtitle. It is a layer cake turned sideways, which he already rejected.
- The light-then-bold double headline repeats on every page. Once is a brand. Everywhere is a template.
- "Where a payment stops" has real character. Keep it and make it the hero.

**Layer pages (d-layer-4, m-layer-7)**
- Hero illustrations (purple network card, $2,480 phone mockup) are stock SaaS decoration.
- The concentric rings on layer 7 are a fourth chain model. Delete.
- Category cards with grey "Known for it" chips are generic.
- "What to know" numbered circles look templated, but the content is the best writing on the page. Keep the words, drop the circles.
- Breadcrumb, 7 to 1 stepper, Zoom out and prev/next. Three nav devices for one job.

**Country pages (d-ccy-cad, m-ccy-gbp)**
- The rails diagram has character. It is the site's signature. Keep it.
- Its legend needs a paragraph to explain four ownership colours. Too much load.
- The seen-versus-final timing chart is the best visual on the site. It appears twice on the Canada page ("What stands out" and "Who settles it").
- The access ladder is strong but appears twice on the UK page and its pips need a footnote.
- "Ways to pay" is eleven grey tiles with "Runs on" pills. It is a two-column table.
- The five question cards (round icon, source badge, grey label tiles) are template.
- "What practitioners notice" is the actual product. It is the judgement. It sits at the bottom.
- "Takeaway", "Key point" and "In short" are the same pink box three times.

**Compare (d-compare-cad-gbp)**
- Two paragraphs side by side in five cards. Nothing is compared. Readers diff prose themselves. This page fails its job most.

**Player (d-p-p401), system (d-sys-cad-interac), card networks**
- The definition lists look like a real product. Keep and extend.
- The faded five-stop "position" track is a third chain model. Replace with the stop track.
- Leaks like "see P049" and the "MULTI" chip read as an unfinished database.

**Countries (d-countries)**
- The two grouping matrices (who owns the rails, can a nonbank hold a central bank account) are closest to the target. Promote them.

## 2. Remove list

- Round coloured icon badges on every card and section header.
- All hero illustrations on layer pages (phone mockup, purple network card, processor squares, rings).
- The 7 to 1 number stepper and the Zoom out pill. Keep breadcrumb plus prev/next.
- "Key point", "Takeaway", "In short". One summary line under the title only.
- The second timing chart on country pages and the "Overnight / Business day / Evening" bar.
- The second access ladder on the UK page.
- Grey label tiles that repeat the paragraph above.
- "Official source" and "Usual practice" pill badges. Move to a footnote marker on the claim.
- Rail name chips under the rails diagram. Make diagram labels tappable.
- Domestic / Cross-border pill toggle mid-page. Make cross-border its own tab.
- The flag-row card on home and region count badges.
- Soft shadows on every block. Keep elevation for sticky bars and sheets.
- Internal IDs in copy ("P049"), "MULTI" chip.

## 3. Information architecture

**Five templates**
- **Home**. Stop track, market matrix (markets as rows, short answers as columns), plain layer index.
- **Market**, one per currency area. Top screen is the answer card (see section 6). Below, sticky tabs on phones. Rails, Access, Clock, Players, Notes, Cross-border.
- **Compare**, two to four markets on fixed dimensions.
- **Entity**, for players, systems and networks. Definition list, stop track, markets it appears in.
- **Layer**, reference. One line, then a table of player categories by market.

**URL scheme (currency codes, because the euro area is not a country and settlement is per currency)**
- / home
- /cad market
- /cad/lynx system in a market
- /compare/cad-gbp and /compare/cad-gbp-aud
- /players/wise entity
- /networks/cards
- /layers/4-networks-and-processors
- Old hash routes redirect.

**Drill path**
- Breadcrumb plus a header market switcher. Every short answer links down to its entity. Every entity links back up to its markets. "Compare with" on every market page pre-fills it.

**Compare pattern**
- Rows are fixed dimensions. Final at, Core rails run by, Instant rail, Nonbank central bank account, Fintech model, Customer funds held by, What is changing.
- Data files need a short answer (four words max) plus one sentence per dimension per market. Without it, comparison stays prose. This is the main data change.
- Tap a cell for the sentence and source.
- A "Show only differences" switch hides rows where markets match.
- Below the table, the same visuals as small multiples on shared scales (access dot plots side by side, 24 hour strips stacked on one time axis).
- Phone shows two markets, sticky labels. Desktop up to four.

## 4. Visual vocabulary, one form per question

- **What are the layers and who sits in each** is a matrix. Layers by markets, named players in cells.
- **Where does a payment stop** is the stop track. One horizontal axis, four stops (Company's books, Bank, Settlement bank, Central bank), stablecoin shown off-axis as its own ledger. This becomes the only chain model. Player pages use it too ("where its customers' money stops"). The five-stop position track and the rings go.
- **How does a payment travel in this country** is the rails diagram. Payer's bank and payee's bank at the sides, rails between, the central bank underneath. Same layout everywhere.
- **Who can get close to the central bank** is a dot plot. Rows are kinds of player (big bank, credit union, licensed payment company, fintech on a sponsor). Columns are labelled hops (Own account, Through one, Through two). It reuses the stop-track axis
- **When does money settle** is a 24 hour strip. Horizontal bar per system in local time, with operating hours shaded and settlement cycles as ticks. A bracket shows customer credited to final, running off the edge with "+1 day" when finality is next day. In compare view the strips stack on UTC, so overlap windows (Lynx and CHAPS both open) become visible. No radial clocks. They read badly on phones and cannot stack.
- **How does this market compare to that one** is the compare table plus small multiples of the forms above on shared scales.
- **How is it changing** is a dashed line on every form above. Dashed means planned or being built. Plus a short status list (Live, Being built, Proposed).

**Isometric**
- It earns no place in v1. The only honest use would be a "books on books" plate showing commercial bank ledgers sitting on central bank accounts. That collides with the rejected layer cake and adds nothing the stop track lacks. Elsewhere it is decoration.

## 5. Brand and identity

**Colour, one meaning each, tied to the five kinds of institution**
- Central bank, red (the existing accent). Red means central bank and nothing else. Links, takeaways and highlights stop using red.
- Bank, navy.
- Payment company, green.
- Network or system, violet.
- App, warm grey.
- Fill means it holds money. Outline means it does not. A payment company is filled only where it holds safeguarded funds itself. One rule replaces the ownership legend.
- Dashed means planned. Ink is for text and links. Nothing else gets colour.

**Icons**
- One set, Lucide (open source, consistent stroke, React package). Five glyphs mapped to the five kinds. Smartphone for app, Wallet for payment company, Waypoints for network or system, Building 2 for bank, Landmark for central bank.
- Icons only inside diagram nodes and matrix headers.

**Flags**
- Keep. Rectangular 3:2 with a hairline border (flag-icons library), not circles. Always beside a name or code. EU flag for the euro area.

**Central bank identity, no logos**
- The [Bank of Canada's terms](https://www.bankofcanada.ca/terms/) say its logo and wordmark may not be reproduced without written authorization.
- The [Bank of England's legal page](https://www.bankofengland.co.uk/legal) lists "Bank of England" as a registered trade mark and bars links that suggest endorsement.
- The [ECB's disclaimer](https://www.ecb.europa.eu/home/disclaimer/html/index.en.html) warns its name and logos are increasingly misused by third parties.
- [18 U.S.C. 709](https://www.law.cornell.edu/uscode/text/18/709-) bars symbols falsely suggesting Federal Reserve membership.
- Logos would also imply endorsement. Use flag, official name on first mention, then the common short name (the Fed, BoC, BoE, ECB, RBA, MAS, HKMA, BCB, RBI), with the red Landmark glyph. Same for companies. Names, no logos.

**Typography and density**
- Keep Outfit from the Fintech North system, but one weight per role. Drop the light-then-bold double title. One bold title, one plain summary line.
- Add IBM Plex Mono with tabular figures for data tokens only (codes, times, cycle counts). This makes it read as a product.
- Hairline rules and tables, not cards. 16px body on phones.

**What makes it feel serious**
- Real URLs, search, a market switcher, "Last checked" and source per row, and a "Suggest a correction" link on every page.

## 6. Before and after

**Home top screen**
- Before. Double headline, seven stacked layer cards. The good chart is below the fold.
- After. One line, stop track, matrix.

```
WHO HOLDS THE MONEY     [CA v] [Search]
Where money stops, market by market.

Where a payment stops
          Co. Bank Sett. CB
Same app   o----.----.----.
Same bank  *----o----.----.
Card       *----*----o----.
Bank-bank  *----*----*----o

Market     Final at  Nonbank CB acct
[CA] CAD   BoC       Opening up
[GB] GBP   BoE       Yes
[US] USD   The Fed   No
...                 [Compare >]
```

**Country page top screen on a phone**
- Before. Double headline, long summary, diagram with legend and chips. Facts far below.
- After. Facts first, diagram, sticky tabs.

```
< Markets              [Compare]
[CA] Canada  CAD
One operator, one bank-owned
network, settled at the BoC.

Final at        BoC, Lynx
Instant now     Interac e-Transfer
Instant next    Real-Time Rail (dashed)
Nonbank CB acct Opening up
Fintech funds   At a bank or trust co.

[ rails diagram, labels tappable ]

Rails | Access | Clock | Players | Notes
```

**Compare view**
- Before. Five cards of paired paragraphs.
- After. Short answers, differences flagged, shared-scale visuals.

```
Compare   [CA v] [GB v] [+ Add]
[x] Show only differences
                 CA           GB
Final at         BoC          BoE
Core rails run   Industry     Mixed     ≠
Nonbank CB acct  Opening up   Yes       ≠
Instant rail     Interac      FPS       ≠
Fintech model    Sponsor      Own acct  ≠
                                 or sponsor
Access   [dot plot CA] [dot plot GB]
24h      CA |==Lynx====|  ACSS ticks
(UTC)    GB    |===CHAPS===| FPS x3
Notes that differ (2)  >
```
