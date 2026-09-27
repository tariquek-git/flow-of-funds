# Contributing

Flow of Funds is a hobby project, built nights and weekends. Issues, ideas, and
pull requests are genuinely welcome - but fair warning: response time is
irregular. If something's on fire or you need a timely conversation, email
hello@fintechnorth.ca.

## What's helpful

- **Bug reports** with the exact prompt, expected diagram, and what you got
  instead. Screenshots help.
- **Payments accuracy fixes** - if a rail, jurisdiction, or settlement mechanic
  is wrong in a seed or the knowledge base, that's the most valuable thing you
  can flag. The project's integrity depends on every diagram being grounded in
  real mechanics, and no single person gets every rail right.
- **Missing rails or regions** - see `docs/payment-schemes-global.md` for the
  full research catalog. If a rail there is flagged `authoritative` and we
  don't draw it yet, a seeded flow + sourced KB doc is a great PR.
- **Documentation improvements** - `/learn` glossary entries, guide copy,
  README clarifications, or corrections.
- **Accessibility fixes** - the canvas has known gaps (keyboard navigation,
  screen reader support) that are genuinely hard to get right.

## What to avoid

These guidelines concern contributions to this repository. You are welcome to
fork it, change the design, and build something different under Apache-2.0.
Use your own name and brand assets when publishing your version (see `NOTICE`).

- Feature requests that turn this into a product rather than a community tool
  (accounts, billing, enterprise SSO, team workspaces).
- Brand or design changes that drift from the Fintech North visual system
  (warm palette, banker-grade, no dark mode/gamer aesthetic).

## Before opening a PR

1. Run `pnpm eval` - it validates all seeds and op round-trips. Must pass.
2. Run `pnpm lint` and `pnpm build` - both clean.
3. For AI-accuracy changes: add or update a seed flow in `src/lib/flows/catalog.ts`.
4. For new regions: also add a sourced KB doc in `src/lib/kb/knowledge.ts` and
   read `docs/nuances-and-edge-cases.md` first for the recurring traps.
5. Payments accuracy is the sacred invariant. If you're unsure of a mechanic,
   flag it in the PR description rather than guessing. A cautious diagram is
   better than a confident wrong one.
6. Branches from `main`, PRs target `main`.

## Code of conduct

Be excellent to one another. This is a community project about teaching
payments, not a competition. See `CODE_OF_CONDUCT.md`.

## Licensing

By contributing, you agree that your contributions are licensed under
Apache-2.0 (see `LICENSE`). The Fintech North brand assets and product names
are not licensed for reuse - see `NOTICE`.
