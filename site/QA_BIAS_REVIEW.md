# Settlement Map — Bias, Representation & Adversarial QA

**Audit date:** 30 October 2026  
**Scope:** V7 static content (115 HTML pages), not a confirmation of live market conditions or every factual claim.  
**Method:** Reproducible text/links inventory (`qa_bias_gate.py`) plus editorial tests. The results are warning indicators, not a country ranking.

## Key finding

The atlas currently **overrepresents the markets we happened to develop first** (Canada, United States, UK), compared with the intended currency scope. Ecuador appeared as a striking same-currency cross-border example and was inadvertently promoted into the main navigation. It remains valid as a specialist educational case, but it should not set global research priorities. The homepage example has now been replaced with a direct link to Brazil's Pix scheme; the Ecuador corridor page remains available.

## Current automated checks and interpretation

| Check | Observed | Interpretation |
|---|---|---|
| Coverage universe | 115 pages; 7 named market pages | Number of pages is not geographic breadth or accuracy |
| Markets with no mentions in body content | Euro area, Philippines, Singapore, Japan, Nigeria, South Africa, Australia and other originally discussed markets | **Research gap**, not evidence the infrastructure or access does not exist |
| Currencies with no literal code mention | EUR, CHF, AUD, JPY, SGD, CNY, KRW, HKD, AED, SAR, IDR, ZAR | **Coverage flag**; exact code matching is conservative and imperfect |
| Customer cash-out/mobile money | 4 pages include the detected terms | Potential **bank account / developed market lens** |
| FX/currency conversion | 39 pages include detected terms | FX could be disproportionately prominent relative to other money movements |
| Central-bank settlement | 27 pages include detected terms | Center of gravity may be central banks; this is a **text keyword** check |
| Explicit commercial-bank settlement | 0 pages include the specific phrases tested | Requires manual investigation, not proof of conceptual omission |
| Returns, chargebacks, exceptions | 0 pages with selected phrases | Weaker visibility for reversibility and failure handling |
| Two pages without sourcebox links | `systems/architecture.html`, `systems/changes.html` | Introductory overview pages; check whether their claims are independently attributed |
| Dead local links / missing headings | None reported in static scan | Navigation smoke test passes, not full interaction QA |

The raw counts are in `QA_BIAS_GATE.json`. The scanner strips global navigation but is still affected by copy, spelling and repeated templates. It is deliberately not a score of economic importance or factual accuracy.

## Ten adversarial release gates

1. **Anchoring / inherited examples.** For every promoted home-page example, record: why selected, an alternate candidate that teaches the same lesson, and whether the original would still be chosen *without* prior conversation history. Ecuador vs Philippines/Singapore for cross-border infrastructure is a useful test.
2. **Market-selection bias.** Use two separate scorecards—*systemic relevance* (operator/regulator data such as BIS Red Book, participation, measured cross-border importance) and *architectural diversity* (ownership, settlement, non-bank access, currency and instrument differences). Never quietly use one score as a substitute for the other.
3. **English-language / public-disclosure bias.** Search local-language central-bank and scheme material. If we cannot verify a connection, mark it **not publicly established**, not **nonexistent**. Prioritize missing large or distinctive systems rather than easiest English sources.
4. **Operator / brand bias.** Test claims against both scheme/regulator sources and company legal disclosures where applicable. Do not treat a corporate marketing capability as evidence that a route is used in a particular market. Brands and licensed entities are not always interchangeable.
5. **Incumbent / non-bank bias.** Sample a bank, an indirect fintech, a direct non-bank participant, a processor-only firm, a merchant/acquirer and a cash/mobile-wallet endpoint. Make sure all appear meaningfully, not only as partner logos.
6. **Flow-type bias.** Test on-us, domestic instant, retail batch, high-value, cards, cross-border prefunded, cash payout and tokenized-money paths. This avoids treating cross-border P2P and FX as the universal payment.
7. **Money vs messages vs settlement confusion.** For each diagram, independently identify the customer claim, where the backing is held, the messaging channel, clearing entity, settlement asset, settlement accounts and legal finality. Mark where the paths are conceptual or optional.
8. **Proposed vs available vs actually used.** Check distinctions between *eligible*, *approved*, *participant*, *direct connector*, *direct settlement account holder*, *live*, and *actual route selected*. A plan or rule change must not appear as a completed service.
9. **Visual salience / logo bias.** The prominence of a box, line weight, size, geographic area or logo must never imply market share, payment volume, ownership or use of a route without verified data. Use flat schematic layouts, and add a legend for link types.
10. **Temporal / survivorship bias.** Record a source's original publication/effective date separately from its last-reviewed date. Dated sources older than 12 months are flagged. Record discontinued, superseded and not-yet-live systems, not just the currently surviving winners.

## How to choose the first featured markets without overfitting

Use an **archetype panel**, not a top-ten ranking drawn from familiarity:

| Archetype | Suggested research candidate | Structural question illustrated |
|---|---|---|
| Statutory member-governed operator | Canada | How Lynx/ACSS differ from Interac, and how Bank of Canada settlement fits |
| Parallel public/private infrastructure | United States | Why Fedwire/FedNow/FedACH and TCH RTP/CHIPS/EPN cannot be treated as one operator |
| Central-bank-led scheme | Brazil | Pix vs SPI vs DICT and direct/indirect participants |
| Multi-jurisdiction single currency | Euro area | SEPA scheme rules vs clearing and TARGET settlement across jurisdictions |
| Purpose-built national utility | India | NPCI/UPI, banks and RBI: rule-making vs processing vs settlement |
| Private-sector governance with central-bank settlement | United Kingdom | Pay.UK, Faster Payments, CHAPS/BoE and non-bank access |
| Mobile money and wallet-intensive payout | Philippines or an African mobile-money market | Who issues the wallet liability and where backing/settlement sits |
| Same-denomination cross-border edge case | Ecuador (USD) | Why no FX does not mean no cross-border banking infrastructure |

These are **candidates to verify**, not an exhaustive list or claims about current permissions. The country selection should also be tested against current BIS CPMI statistics and corridor observations from the World Bank. A market can be important *either* because of scale *or* because it demonstrates a distinct architecture; the two reasons must be labelled.

## Suggested workflow (independent challenge, not consensus by repetition)

- **Researcher A — market coverage:** Use independent scale/relevance benchmarks to challenge the country short list.
- **Researcher B — architecture:** Produce a function/ownership/governance/access matrix independently of existing page categories.
- **Researcher C — flow of funds:** Attempt to falsify ten diagrams by tracing obligations, backing, clearing and finality.
- **Researcher D — sources:** Verify source type, effective date, current status and legal entity; track claims that cannot be established.
- **Researcher E — design:** Run blind tests: can an informed viewer distinguish a scheme from an operator, and a live link from an illustrative one without reading all footnotes?
- **Editor:** Compare disagreements, keep an issue log, require evidence before resolving factual disputes. An agent's agreement does not count as verification.

**Release gate:** No featured example without a written selection rationale; no factual relationship without a primary source or explicit uncertainty label; no visually implied flow stronger than its evidence; no status newer than its evidence date.

## Primary benchmark sources

- BIS CPMI [Red Book payment systems and participation data](https://www.bis.org/committees/cpmi/payment) (institutional and system statistics; latest series should be checked for reference-year lag).
- BIS, [Fast payments: design and adoption](https://www.bis.org/publications/qr-202403/fast-payments-design-and-adoption) (2024 methodological comparison; older than 12 months but still useful for taxonomy).
- World Bank, [Remittance Prices Worldwide](https://datacatalog.worldbank.org/search/dataset/0037898/remittance-prices-worldwide) (corridor cost and coverage, dataset updated September 2026; not an exhaustive payment-flow ranking).

## Changes actually made this pass

1. Homepage example **USD across borders (Ecuador)** demoted and replaced with **Pix / Brazil** as a featured system-level governance example.
2. Ecuador's detailed corridor retained for the same-currency cross-jurisdiction explanation.
3. Repeatable static test added: `qa_bias_gate.py` and `QA_BIAS_GATE.json`.
4. Identified scope/flow/source gaps above for explicit prioritization in the next content build.

**Limit:** This is an editorial bias audit, not a fresh independent verification of all 115 pages or a completed global coverage expansion.
