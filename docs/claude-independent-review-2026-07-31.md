# Claude independent review — 31 July 2026

## Handoff

- **Tool used:** Claude Code, Claude Sonnet, high effort.
- **Goal:** Independently challenge the Flow of Funds payments, evidence, AI, UX, analytics, brand, and launch-readiness work.
- **Method:** Read-only review of a portable handoff covering the implemented changes, payment coverage, QA results, known analytics, brand system, and current launch posture. Direct repository traversal was attempted with Opus and Sonnet but stalled; the bounded handoff review completed successfully.
- **Changes made by Claude:** None.

## Executive verdict

Claude found the build more disciplined than most AI-assisted fintech tools, but concluded that the product's credibility claim still exceeds its evidence foundation. Its core concern is epistemic: an `Expert` tier, document-level rather than claim-level sourcing, and AI self-review from the same knowledge lineage can collectively imply a level of payment verification that does not yet exist.

Claude agrees with conditional private beta and rejects broad public launch.

## What Claude considered sound

- Curated-versus-AI separation.
- Explicit `kb-backed`, template-only, and planned coverage tiers.
- Golden tests preventing authorization-only legs from becoming money movement.
- Active-flow evidence receipts and matched-edge ratios.
- Prohibition on claiming universal or global completeness.
- Deterministic checks for schema, money path, timing, and source posture.
- Removing Mastercard's ability to borrow Visa evidence.

## P0 findings before private beta

1. **No confirmed live analytics receipt.** Instrumentation code is not proof that events reach the reporting pipeline.
2. **`Expert` implies a quality gate that does not exist.** Claude recommends gating it behind named review or renaming it until that review exists.
3. **The Sources experience can be read as claim-level support.** Current matching is document/rail-level and needs a persistent plain-language disclosure.
4. **AI self-validation is not independent QA.** A second pass using the same knowledge and prompt lineage can repeat the original misconception.

## P1 findings before broad public sharing

- Fedwire and RTR remain template-only or insufficiently grounded.
- Custom generation has unacceptable measured reliability and latency for a public default.
- KB records do not yet carry rulebook version, effective date, or review date.
- Desktop diagram scale and contrast underperform the mobile Steps experience.
- Mastercard, Australia NPP, broader SEPA/SDD, and Bacs/CHAPS remain meaningful coverage gaps.

## What AI can own

- Schema and graph-structure checks.
- First drafts clearly marked unreviewed.
- Rail/jurisdiction classification with coverage caveats.
- Coverage-gap detection against the manifest.
- Consistency checks across Simple, Detailed, and Expert presentations.

## What needs deterministic controls

- Settlement finality and irrevocability claims must resolve to specific sourced material.
- Fee classification and fee incidence need contract-aware safeguards.
- Cross-border correspondent chains require documented corridor templates or stronger restrictions.

## What needs a named payments reviewer

- Any flow shown under an `Expert` assurance.
- Any rail moving from template-only to KB-backed.
- Fedwire, RTR, and Lynx mechanics.
- The payment truth of the golden flows themselves; tests only lock encoded behavior.

## Claude's required gates

### Before private beta

1. Prove a complete live analytics receipt.
2. Gate or rename `Expert`.
3. State that source matching is document-level, not claim-level.
4. Keep an AI-generated, not-expert-reviewed disclaimer visible for generated flows.
5. Show template-only warnings before users open unsupported major rails.

### Before broad public sharing

1. Named payments-reviewer sign-off for the strongest initial rail set.
2. Atomic claim/source/version metadata.
3. Rulebook version and effective-date handling.
4. Custom-generation error rate below 5% and median latency below 60 seconds, or restrict custom generation.
5. Desktop presentation parity with mobile.
6. Explicitly cover or block major unsupported rails.

## Final recommendation

- **Private beta:** Conditional go only after the four P0 gates are met.
- **Broad public:** No-go.

## Open loops

- Decide whether `Expert` describes visual density or reviewed accuracy. The UI currently risks implying both.
- Run a production analytics receipt test.
- Decide whether to implement persistent generated-flow disclaimers immediately.
- Establish the first named-review rail set and reviewer workflow.
