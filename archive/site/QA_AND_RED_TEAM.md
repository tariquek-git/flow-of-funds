# QA & adversarial review — Settlement Map v6

**Date:** 2026-10-30  
**Scope:** 115-page static reference atlas, selected markets and operators, not a production deployment.

## Independent passes

### 1 · Structural / link auditor — PASS

All 115 pages have a main H1, local links and assets resolve to files, no missing source sections remain. All nine exact layer names are preserved. Navigation structure follows: overview → layers → subfunctions, markets → operator → rail, participant footprint, corridor, and holding model.

### 2 · Factual / evidence auditor — PASS WITH SCOPED LIMITS

New system-anatomy and change pages use primary sources from the Bank of Canada, Payments Canada, Interac, BCB, Federal Reserve, The Clearing House, Bank of England and BIS. A traceable subset of core claims is in `assets/verified-claims.json`. Six previously unsourced general pages now contain primary or operator supporting context and mark limits. Some dated sources are older than 12 months and carry warnings.

Core corrections / invariants:
- Interac does not hold transferred customer funds; participating financial institutions do. Interac's terms say the sending institution can hold funds pending deposit. Interac is shareholder-owned, but shareholder status is not scheme participation.
- Payments Canada owns/operates Lynx and ACSS; the Bank of Canada holds direct participant settlement accounts.
- RTR was planned for Q4 2026 as of this review; eligibility policies and onboarding schedules do **not** establish launch or a specific live non-bank settlement account.
- Brazil's Pix scheme, DICT directory and SPI settlement infrastructure are separate objects even though BCB governs or operates them.
- RTP, CHIPS and EPN are distinct systems of The Clearing House; participating in RTP does not require ownership of TCH.
- CHIPS finality and liquidity offsetting differ from Fedwire; RTP differs from FedNow; ACH rules span operators.
- UK non-bank settlement-account eligibility is not a banking licence or proof that every provider has an RTGS account.
- Same-currency international transfers still span jurisdictional infrastructure; a USD balance outside the U.S. is not by default a Federal Reserve balance.

### 3 · Visual / interaction auditor — PASS WITH NAVIGATION LIMIT

Chromium tested 16 representative pages at 1440px desktop, 390px phone and 320px narrow phone: **48 clean render checks**, zero horizontal overflow and zero script exceptions. Corridor flow tabs and participant search verified. Screenshots delivered separately. Local browser HTTP navigation was blocked by the runtime; static link resolution succeeded, but live hosted click-through is not certified.

### 4 · Adversarial review — PASS FOR DEFINED RISKS

Searched for overstatements such as 'Interac settles', 'Swift settles', 'RTR launched', 'FedNow and RTP are interoperable' and global-direct-settlement claims. No affirmative false pattern was found in the checked pages. Each corridor detail has a conceptual/illustrative disclaimer. The new three-track schematic explicitly says it is not a universal path or transaction volume chart.

## Remaining high-priority gaps before public launch

1. **Expand source depth.** A page's linked source validates the specific scoped point, not every statement or participant relationship. Complete claim-level primary sourcing for the original 17 currencies and additional corridors.
2. **Confirm live status on publication date.** RTR and any access policy/participant changes are time-sensitive. Recheck with the relevant operator.
3. **Human banking-operations review.** Validate clearing, liquidity and finality wording for each live rail, including legal finality, account holder, funding arrangements and indirect participation.
4. **Brand rights.** Validate permitted use of exact logos, especially Swift, before public distribution; fallback text identities are acceptable.
5. **Hosted functional + accessibility QA.** Test links in a real deployment; perform keyboard/screen-reader contrast and semantics review on the deployed site.
6. **No partner invention.** The selected illustrative corridors must not be promoted to named end-to-end live routes without legal-disclosure or operator evidence.

## Release verdict

**Accept for product/design preview and sourced structural learning; do not yet present as an exhaustive, externally audited global infrastructure directory.**
