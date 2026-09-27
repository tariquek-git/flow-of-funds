# Flow of Funds

Describe a payment. Explore where the money sits, who can move it, which rails
connect the parties, and where approval, availability, and settlement differ.

**[Try the hosted preview](https://flows.fintechnorth.ca/)** ·
**[About Tarique](https://tariquekhan.ca/)** ·
**[Contribute](CONTRIBUTING.md)**

## Take it and run with it

This is a community learning tool built by Tarique Khan, a payments practitioner
learning by building. The concepts have been pressure-tested from a payments
perspective. That is not a claim that every generated diagram is correct or that
the software is production-certified.

Please fork it, improve it, put your own brand on it, and share it. The goal is to
help more people understand payments. Accuracy corrections, simpler explanations,
new scenarios, and engineering improvements are all welcome.

The source code is licensed under **Apache-2.0**. Keep the required license and
attribution notices. Replace the Fintech North names and brand assets with your
own before distributing a branded version; see [LICENSE](LICENSE) and
[NOTICE](NOTICE).

## Status and limits

This is a work in progress and an educational exploration tool. Use synthetic
scenarios, inspect the assumptions, and check material claims against the relevant
rail documentation. It does not move money or replace implementation, compliance,
or security review. Payments review of the concepts does not validate each AI output.

This repository is a public source snapshot released on September 27, 2026.
The hosted preview may evolve independently. No hosted-service credentials or
private development history are included. Bring your own keys if you enable live
AI; the default local fixture mode needs no API key.

## What is included

Question-to-brief flow-of-funds tool for payments across Canada, the US, the euro area/SEPA,
the UK, India, Brazil, and USD stablecoin/USDC. Ask a payment question and get a concise
Story that separates approval, receiver availability, and institutional settlement. Open
System only when you need every party and leg, or use Ask or edit to revise the document.

Every flow carries a Trust receipt. It states whether the origin is a curated template,
an AI draft, or an edited flow; which legs match focused knowledge-base documents; what
assumptions and warnings are attached; what automated checks can and cannot establish;
and whether a dated human payments review is actually recorded.

The data contract (`schemaVersion 1.0`) uses live model tool-calling instead of a
fixture-first JSON envelope. OpenAI is the default live provider; DeepSeek Pro can
be enabled as an explicit fallback, and Claude remains available as an explicit adapter.

## The op protocol (what makes it AI-native)

The agent never returns one monolithic flow JSON. It emits a **stream of small
operations as tool calls** — `set_metadata`, `add_swimlane`, `add_node`, `add_edge`,
`update_node`, `remove_edge`, `add_annotation`, `suggest_followups` — which the server
forwards over SSE and the canvas applies in real time.

One vocabulary covers both modes:

- **Generation** — the flow materializes live while the model reasons (on the explicit
  `AI_PROVIDER=claude` path, adaptive extended thinking is enabled per-model).
- **Editing** — surgical patches (`update_node`, not regenerate-everything), so edits are
  fast, cheap, and preserve your layout and ids.

Every op is schema-enforced server-side by Zod (`parseOp`). The tool definitions
deliberately do NOT set `strict: true`: the strict-mode grammar caps total optional
params at 24 across all tools, and this op vocabulary has ~47 genuinely optional
payments fields (timing, messageStandard, regulators, emphasis, …). The assembled flow
is validated against the full `FlowOfFundsSchema`; if it fails, one automatic repair
pass sends the errors back and streams corrective ops — which also catches semantic
gaps strict mode never could.

## Using AI efficiently

| Lever | How |
|---|---|
| Prompt caching | The system prompt (role + rules + full payments KB) and tool definitions are one byte-stable frozen prefix. On the default OpenAI path, automatic prompt caching serves it at the discounted cached-input rate on every round after the first; on the explicit `AI_PROVIDER=claude` path the same prefix is marked with `cache_control` breakpoints. Per-request state lives in the user turn, after the cached prefix. |
| Model tiering | The heavy model (`OPENAI_MODEL`, OpenAI is the default provider) builds & edits; the light model (`OPENAI_MODEL_LIGHT`) handles explain & critique. On the explicit Claude path (`AI_PROVIDER=claude`) the equivalents are `AI_MODEL` / `AI_MODEL_LIGHT`. |
| Patch edits | Edits emit only the delta ops, never the whole flow. |
| Free seeds | The bundled seed scenarios replay locally from the catalog — zero tokens. |
| Fixture fallback | No API key → deterministic fixture provider; the whole app stays demoable at zero spend. |
| Usage transparency | Each assistant reply footer shows tokens in/out and how much was served from cache. |

## Grounding

`src/lib/kb/knowledge.ts` holds a curated corpus (Interac debit & e-Transfer, Visa
four-party, sponsor-bank/FBO programs in CA and US, ACH, FedNow, cross-border wire+FX,
disputes/chargebacks, glossary). It is embedded in the cached system prompt, so
explanations and critiques cite real rail mechanics without per-request retrieval cost.

## Run

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # defaults to offline fixture mode
pnpm dev                     # http://127.0.0.1:3000
pnpm eval                    # offline: validates all seeds + op round-trip
pnpm lint
pnpm build
```

Use Node.js 24 and pnpm 11.2.2 to match the CI example. For live generation, set
`AI_PROVIDER=openai` and your own `OPENAI_API_KEY` in `.env.local`. Read
[SECURITY.md](SECURITY.md) and [DEPLOY.md](DEPLOY.md) before hosting a fork.

## Architecture

```
Browser (ChatDock + FlowCanvas, Zustand store)
  │  POST /api/agent { capability, prompt, history, currentFlow, selected }
  ▼
/api/agent (SSE)
  ├─ provider: openai (OPENAI_API_KEY set) | claude (explicit) | fixture (zero-spend)
  ├─ fallback: deepseek-v4-pro when AI_FALLBACK_PROVIDER=deepseek + DEEPSEEK_API_KEY
  ├─ openai.ts: /chat/completions streaming with function-call ops + cached system prompt
  │    text deltas → {type:"text"} · function-call batch complete → {type:"op"}
  │    stream end → Zod validate → repair pass if needed → {type:"flow"}
  └─ events: text | op | flow | followups | status | done(usage) | error
```

Key files: `src/lib/schema/ops.ts` (op vocabulary + reducer), `src/lib/agent/openai.ts`
(default streaming engine), `src/lib/agent/claude.ts` (explicit/fallback adapter),
`src/lib/agent/tools.ts` (deterministic tool schemas),
`src/lib/agent/prompt.ts` (cached system prompt), `src/lib/agent/fixture.ts`
(zero-spend provider), `src/lib/diagram/layout.ts` (dagre + swimlane layout).

## Deployment

The project has a hosted preview at [flows.fintechnorth.ca](https://flows.fintechnorth.ca).
To host your own fork, configure your own Vercel project and services. This public
repository does not deploy to the Fintech North site. Public mode uses `FOF_PUBLIC=1`;
the studio can be put behind a passphrase gate via `FOF_GATE_SECRET` when public
mode is disabled. `OPENAI_API_KEY` (default live provider), optional
`ANTHROPIC_API_KEY` (explicit `AI_PROVIDER=claude` fallback), and the optional backing services
(Supabase, Upstash, PostHog/GA, Turnstile) are set as Vercel env vars; `maxDuration` is
already set on the agent route. See `.env.example` for the full config surface.

**Two postures, two smokes.** In public mode (`FOF_PUBLIC=1`) the paid `/api/agent`
endpoint is protected by a same-origin guard (cross-origin → 403), a no-Origin guard
(server/curl POSTs are refused on a keyed deploy unless `FOF_ALLOW_SERVER_AGENT=1`),
per-IP rate limits, the daily `$` kill-switch, and (when keyed) Cloudflare Turnstile.
Verify the live posture with `pnpm smoke:public` (public) or `pnpm gate:smoke` (gated);
both have a `--serve` / `:ci` variant that boots a local server and needs no secrets.

## Optional continuous integration

A GitHub Actions configuration is included at `docs/ci-example.yml`. Copy it to
`.github/workflows/ci.yml` in your own fork to enable it. This public snapshot
does not currently run an automated workflow; use the local validation commands
in [DEPLOY.md](DEPLOY.md).
