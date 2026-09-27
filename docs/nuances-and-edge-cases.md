# Nuances & edge cases — what to watch out for

The accuracy traps the verification passes keep catching, and the product/engineering
edge cases that have bitten (or would bite) this project. Read before adding a region,
a seed, or a rail.

## Payments-accuracy traps (domain)

These are the errors the adversarial verifiers caught in real drafts — they are subtle and
exactly what a sharp bank/compliance reviewer flags.

1. **Money never routes *through* a messaging/scheme network.** SWIFT, VisaNet, the SEPA
   CSM, the UPI switch *route messages and trigger settlement*; **banks and central-bank
   accounts move the funds.** (Shipped once as a P0 bug: `wire-fx` routed money through
   SWIFT.) A money-type edge into a network operator is almost always wrong.
2. **Gross vs net settlement — get it right per rail.** This is the single most common
   error. Verified-correct values:
   - SEPA Instant (RT1 / TIPS): **real-time GROSS** in central-bank money on TIPS DCAs.
   - UK Faster Payments: **deferred NET** at the Bank of England (~3×/business day), pre-funded.
   - India UPI: **deferred NET** — NPCI computes a Multilateral Net Settlement Batch (MNSB)
     settled across RBI accounts. (UPI is NOT gross.)
   - Brazil Pix: **real-time GROSS** in central-bank money at the BCB's SPI.
   - US Fedwire: gross (RTGS). US ACH: deferred net. Card networks: net settlement.
3. **Funds-availability ≠ settlement-finality.** Instant rails credit the payee in seconds,
   but the *interbank* leg may be deferred/netted/prefunded. Show both, in the right order;
   never imply the interbank settlement is instant when it's a net cycle.
4. **Issuer-of-record vs program manager.** A fintech / program manager is NOT the issuer
   when a sponsor bank issues; the FBO/custodial structure is where funds actually sit.
5. **Closed-loop vs open-loop.** Closed-loop (PLCC, proprietary fleet, stored value) has
   **no open-loop interchange** — don't draw VisaNet/interchange legs into it.
6. **Auth / clearing / settlement are distinct phases** unless the rail truly settles
   instantly. Don't collapse them.
7. **Operator vs regulator per region:** NPCI (operator) vs RBI (regulator); EPC (rulebook
   owner) vs ECB/Eurosystem (settlement operator); Pay.UK (operator) vs Bank of England
   (settlement + supervisor) vs PSR/FCA (economic/conduct); BCB *operates and regulates* Pix.
8. **Alias / name-check legs are MESSAGES, not money:** Pix DICT lookup, UK Confirmation of
   Payee, EU Verification of Payee. CoP/VoP are **peer-to-peer / directory API** checks
   (bank-to-bank), not routed through the central hub.
9. **Message standards differ** — don't blanket-label ISO 20022: ISO 20022 (SEPA, Fedwire
   post-2025, most modern rails), ISO 8583 (cards; legacy FPS), Nacha fixed-width (US ACH),
   proprietary REST (Pix DICT).
10. **Sanctions & emerging rails:** Mir (sanctions-affected) and stablecoin on/off-ramps
    (non-traditional) must carry an **on-canvas warning annotation**, never a clean rail chip
    that implies frictionless global acceptance.

## Product & engineering edge cases

1. **The schema enum is the accuracy gate.** Widen `JurisdictionSchema` / `CurrencySchema`
   (`src/lib/schema/flow.ts`) only **per region, in lockstep** with a sourced KB doc + a
   verified seed. Never open it to all schemes at once. `ops.ts` and `builders.ts` **derive**
   from those exported schemas — don't re-hardcode `["CA","US"]` anywhere (it drifted once).
2. **Live generation is UNVERIFIED until `pnpm eval:live` passes.** Provider-agnostic — run
   it against whichever model is configured (Claude / OpenAI / DeepSeek) before trusting
   live output in a demo.
3. **Deploy fail-closed.** Middleware returns **503 on Vercel** if `FOF_GATE_SECRET` is
   unset; `activeProvider()` refuses to spend any key on an ungated deploy. Set the secret
   for **Production AND Preview** or Preview deploys 503.
4. **Cut-short honesty.** Dropped ops / `max_tokens` refuse to render as a complete diagram
   — the "polished wrong diagram" guard. Don't weaken it.
5. **Parallel multi-agent editing.** Multiple AI surfaces edit this repo concurrently
   (this build: chat-left + `rails.ts` + the detail dial were built by another surface while
   logos/global went through here). Commit often, prefer non-colliding files, `git fetch`
   before push, and `git add <specific files>` rather than `-A`.
6. **localStorage is origin-bound.** "My flows" saves do NOT follow from `localhost` to the
   deployed URL. Do pre-meeting prep on the exact origin + browser you'll present from.
7. **simple-icons gotchas:** verify the export EXISTS in the *installed* version
   (`siUnionpay` is absent) AND that it's the RIGHT brand (`siSwift` is the Swift
   *programming language* logo, not the SWIFT bank network). Never fabricate logo artwork —
   real CC0 mark or styled wordmark chip only.
8. **Node icon: subtype is authoritative** over label keywords. A CSM labeled "ECB" must not
   get the central-bank icon; a bank-PSP labeled "PSP" must not get the fintech rocket.
9. **React Flow:** custom nodes need hidden `<Handle>`s or every `fitView` hangs; **self-loop
   edges** (`source === target`) render poorly — model settlement as a leg between two
   parties, not a loop on the settlement node; background-tab timer throttling makes the
   35 ms-per-op seed replay crawl in headless QA (looks like a hang, isn't one).
10. **OpenRouter breaks Anthropic prompt caching** (the ~90% input-discount on the cached KB
    — the app's main cost lever). Go direct per provider for the heavy tier.
11. **Provenance footer is keyed off `metadata.source`:** seed = "grounded in operator
    sources" stamp; ai-generated / user-edited = "verify before client use". Manual canvas
    edits flip `seed → user-edited` so a hand-altered template stops claiming grounding.
