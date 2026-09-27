# Product

## Register

Community-built public preview. Casual and transparent in the framing, but never self-deprecating. Do not use "free"/"free tool" or product-launch language, and do not imply regulatory certification.

## Users

The Canadian fintech community, beginner to expert: people learning how payments actually work, operators and compliance folks who need to see a specific corridor, and experts checking edge cases. Tarique (fintech business development) built it and uses it too — but the audience is the community, not a client boardroom. Context: curiosity, desk work, a link shared in a Slack. Everyone starts with the same concise Story; specialists can open System for every party and leg, while `/learn` supplies the deeper teaching layer.

## Purpose

A question-to-brief tool that turns a plain-language payment question into a concise, source-linked payment document. The default Story separates approval, funds availability, and institutional settlement, then keeps money, messages, exceptions, assumptions, and evidence inspectable. Success: someone can answer “who gets usable value when, and when do institutions settle?” in under a minute without mistaking a message for money or a source match for claim verification.

## Brand Personality

Banker-grade, precise, calm — with a warm, editorial register (Fintech North Brand & Design System). The same information design as Tarique's hand-built whiteboard exhibits, rendered in the brand palette: cream/paper surfaces, charcoal ink, soft warm hairlines, ONE crimson accent, restrained semantic color on the diagram. No navy, no blue "tech" surfaces. The tool should feel like a sharp analyst, not a tech demo. See `DESIGN.md` for the canonical palette and type system (Archivo + JetBrains Mono).

## Brand Architecture

- **Fintech North** is the parent and trust source.
- **Flow of Funds** is the product name and must appear in the primary lockup and share assets.
- **The constellation** is the parent brand mark. It must not compete with the payment question or appear as a decorative pseudo-diagram.
- **Polaris** is an optional conversational guide. It must not replace the product name, parent brand, or prompt affordance.

## Anti-references

- Dark neon "AI tool" dashboards; gamer aesthetics; glassmorphism.
- Toy-like chatbot demos where the diagram is an afterthought.
- Generic SaaS landing-page styling leaking into a working tool.

## Design Principles

1. **The answer is the deliverable.** Story leads with the payment's dual clock and the principal-value path, not a graph or a control panel.
2. **One document, two readings.** Story is the default concise brief. System is the bounded complete graph. They are projections of the same flow and must never contradict each other.
3. **Messages are not money.** Approval, availability, and institutional settlement are separate states. Missing states stay visibly missing rather than being inferred from a familiar rail.
4. **Trust is a receipt, not a badge.** Every surface states origin, document-level source matching, attached assumptions and warnings, automated-check limits, and whether a dated human review is actually recorded.
5. **Conversation is an editing tool.** Ask or edit is available when language is faster, but it does not occupy the primary reading surface.
6. **Motion conveys progress, never decoration.** The only choreography is the flow assembling while the agent streams.

## Accessibility & Inclusion

WCAG AA contrast (≥4.5:1 body text). Edge meaning is never carried by color alone (type labels + sequence numbers accompany color). Reduced-motion users get instant diagram assembly instead of staged animation.
