# Settlement Map · Infrastructure Atlas v6

**Research and design snapshot:** October 30, 2026. This is a working, multi-page reference prototype, not a verified database of every bank-to-bank relationship or a production deployment.

## Open

Open `index.html` in a modern browser. The site is a self-contained static HTML/CSS/JavaScript atlas; internal pages use relative URLs. Some typography may use online fonts; local system fallbacks are configured.

## Product model

The nine named layers remain the global functional taxonomy. **They are not nine mandatory chronological processing stages.** Every major entity, layer, market, participant, corridor and holding model gets its own URL and detail page.

A national-system page separates ownership/governance, rules, operator, access, customer funds, and clearing/settlement. These roles are not interchangeable. A participant may operate in several layers or markets, but a functional footprint does not establish a privately disclosed bilateral partner arrangement.

Start with:

- `systems/architecture.html` — click-through comparison of Canada, the United States and Brazil, with a technical three-track diagram separating instructions, customer balances and interbank settlement.
- `systems/changes.html` — structural change tracker distinguishing proposed, eligible and live infrastructure, with dated primary sources.
- `markets/canada.html` — the Canadian split between Payments Canada, Interac and Bank of Canada.
- `systems/brazil-pix.html` — central-bank-operated Pix, SPI and DICT distinctions.
- `systems/us-clearing-house.html` — distinct U.S. privately operated systems.
- `corridors/us-ecuador.html` — an illustrative same-currency cross-border case.

## Source and accuracy rules

1. Prefer central banks, system operators, regulator registers, current rulebooks and legal terms over company marketing.
2. Label proposals and launches separately; a policy granting **eligibility** does not establish a live participant or account grant.
3. Distinguish scheme membership, messaging connectivity, technical processing, clearing, settlement participation and possession of a central-bank account.
4. Do not use a logo as evidence of a partnership or settlement role.
5. Never infer that an account denominated in USD settles at the Federal Reserve or that every payment through a provider uses its most direct route.
6. Conceptual and corridor examples are deliberately *illustrative* unless a source specifically verifies their end-to-end counterparties.
7. For time-sensitive pages, verify the as-of date before re-publishing. Use source publication dates when available; mark undated pages as **checked** rather than pretending they were published on the check date.

`assets/verified-claims.json` contains a limited set of directly sourced structural claims, not a record of the entire site's contents. Do not treat every general-explainer page as a jurisdiction-specific fact.

## UI and design system

Purposefully restrained editorial-engineering language: light technical canvas, precise connectors, narrow colored cues only where they communicate different functions, no stock 3D illustrations, no artificial figures or fabricated route metrics. Logos remain optional identifiers, not the main architecture.

Desktop uses a clickable isometric layer reference; mobile uses touch-friendly linear navigation. Every URL is separately accessible, with breadcrumb navigation for orientation.

## Verification completed for this package

- 115 HTML pages, no broken local links or asset references, one main H1 per page.
- 48 sampled Chromium viewport checks covering 16 pages at 1440, 390 and 320 px, with no overflow or JavaScript exceptions.
- Corridor funding tab and participant directory search interaction checks pass.
- Six formerly unreferenced conceptual explanations now have relevant primary/operator/BIS source links with explicit scope and limitations.
- Checked adversarial cases include Pix vs SPI vs DICT, Interac operator vs fund holder, RTR policy vs launch, RTP ownership vs participation, CHIPS vs Fedwire, FedNow vs RTP, and currency vs jurisdiction.

**Limitations:** The runtime browser sandbox blocked local HTTP navigation. Relative file targets were checked statically and representative pages independently rendered, but an end-to-end hosted-browser navigation check is still recommended after deployment. External logo licenses and availability have not been certified. This is a selected-market reference: exhaustive global participant-level coverage and the originally envisaged 17-currency research pass remain unfinished.
