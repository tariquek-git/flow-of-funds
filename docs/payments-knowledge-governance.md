# Payments knowledge governance

Flow of Funds does not claim to contain every global payment system. It ships
scheme-by-scheme coverage, and every public claim must resolve to one of three
states in `src/lib/kb/coverage.ts`:

- `kb-backed` — the agent receives a compact mechanics document with named
  operator, regulator, central-bank, or standards sources.
- `reviewed-template-only` — a fixed diagram has been reviewed, but the rail is
  not available for open-ended grounded generation.
- `planned` — a maintainer backlog item. It must never be presented to users as
  supported.

## Evidence record

Every knowledge document should record:

1. Rail, jurisdiction, use case, currency, and participant scope.
2. Operator and settlement venue. These are separate fields even when one
   institution performs both roles.
3. Message or instruction path, principal-money path, fee path, settlement
   asset, timing, finality, returns, disputes, reversals, and operating windows.
4. Primary sources with publisher, title, URL, publication/version date when
   available, retrieval date, and the exact claims each source supports.
5. A reviewer, review date, and next-review trigger.
6. Known assumptions, product-level variations, and facts intentionally not
   generalized.

Primary/operator material should support mechanics. Secondary sources may help
explain a concept, but cannot be the only support for a consequential rail,
timing, finality, or compliance claim.

## Claim rules

- Never transfer a fact from one scheme to another because they look similar.
- Never use a credit-card source to vouch for debit, or one network's rules to
  vouch for another network.
- Distinguish authorization, clearing, settlement, posting, and funds
  availability.
- Distinguish a message leg from movement of principal money.
- Treat fees and interchange as separate money legs, not proof that principal
  moved.
- Name material uncertainty in the diagram instead of silently choosing a
  country, rail, settlement venue, or timetable.
- Planned or pre-launch infrastructure must be labelled with its current
  operating status and an as-of date.

## Release gate for a new rail

A rail can move to `kb-backed` only when all of the following pass:

1. At least one primary authority source is attached.
2. A payments reviewer confirms the participant, message, money, settlement,
   timing, and exception paths.
3. A reviewed golden flow passes schema and evidence checks.
4. An exception case and an ambiguous-prompt case have been tested.
5. Public copy and the coverage manifest use the same support status.

## Golden QA suite

Each supported rail needs five tests:

1. **Happy path:** the ordinary end-to-end payment.
2. **Settlement path:** where and in what asset obligations settle.
3. **Failure path:** reject, return, reversal, dispute, or timeout.
4. **Ambiguity:** a prompt missing a material country, corridor, or product
   detail must disclose its assumption or ask a useful follow-up.
5. **Source mismatch:** a nearby but unsupported product must remain inferred,
   not inherit the supported rail's evidence badge.

The automated suite validates structure and manifest integrity. It does not
certify payment accuracy. Accuracy sign-off remains a human payments-review
gate, with the exact reviewed flow and sources recorded.

## Current priority backlog

The highest-value gaps are standalone primary-source packs for Fedwire; Lynx;
Mastercard credit and debit; Visa debit; SWIFT/ISO 20022; SEPA Credit Transfer
and Direct Debit; Bacs and CHAPS; Australia's NPP/PayID/PayTo; and broader Indian
rails. Add depth to these before adding more lightly sourced geographies.
