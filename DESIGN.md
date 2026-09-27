# Design

Light, warm, banker-grade exhibit style, matching Tarique's hand-built flow-of-funds artifacts and the Fintech North Brand & Design System. The brand explicitly rejects blue "tech" surfaces: cream/paper grounds, charcoal ink, ONE accent (crimson). Source of truth is `src/app/globals.css` (chrome tokens) + `src/app/landing.css` (scoped `--fl-*` mirror); build against the token names, not raw hexes.

## Identity hierarchy

The primary lockup is the Fintech North constellation with a two-line name: parent `Fintech North`, product `Flow of Funds`. The product name must be visible on the landing page, Studio chrome, exports, and share cards. The mark stays compact; it does not expand into a decorative graph or compete with the payment question. Polaris is reserved for conversational help and should not appear inside generic form controls or replace the product name.

## Color

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f4f0e6` | Cream — app background (gradient foot to `#fbf9f3`) |
| `--color-panel` | `#fbf9f3` | Paper — cards, nodes, chat panel surfaces |
| `--color-soft` | `#ede7da` | Warm soft — hovers, chips, faint fills |
| `--color-ink` | `#1c1c1c` | Charcoal — primary text |
| `--color-muted` | `#6b6b66` | Warm muted — secondary text (AA on cream) |
| `--color-faint` | `#8a857c` | Warm faint — tertiary/labels (large or bold only) |
| `--color-line` | `#e4dfd2` | Hairline — borders, dividers |
| `--color-brand` / `--color-maple` | `#C41E3A` | Canadian Red — the single accent (links, primary actions, focus). The ONE Fintech North red, shared with fintechnorth.ca per BRAND.md ("never recolor the North Star"). Was `#d4203f`. |
| `--color-crimson-glow` | `#ff2d4d` | Focus ring / hover glow |
| `--color-gold` | `#c9962f` | PRODUCT ONLY — "money in motion" on the flow canvas, never chrome |

Diagram-meaning colors (edge/node semantics — authorization, settlement, fee, chargeback, etc.) live in `src/lib/diagram/`; they carry meaning and are always paired with type labels + sequence numbers, never color alone.

Strategy: Restrained and warm. Cream/paper surfaces, charcoal ink, NO navy and NO blue. Semantic color only on diagram meaning and the one crimson accent for primary actions.

## Typography

Two brand faces, wired in `src/app/layout.tsx`: **Archivo** (neutral grotesque) for UI/headings, **JetBrains Mono** for numbers, URLs, code, and the mono "signal" lines. They are loaded into the `--font-geist-sans` / `--font-geist-mono` CSS variables so downstream code is unchanged; the variable names are legacy, the faces are Archivo + JetBrains Mono. **Two-tier brand type system** with fintechnorth.ca: the mono (JetBrains Mono) is SHARED across both sites so the "signal" voice reads as one brand, while each world keeps its own display face (this tool: Archivo, banker-grade; the community site: Outfit). BRAND.md names JetBrains Mono as the Fintech North mono; the tool's display face was Space Mono for mono and stays Archivo for display. Fixed rem scale, ratio ~1.2: 11px labels/meta, 12.5px chat body, 13–14px node labels, 16px panel titles, 18px app title. Weight contrast (600–700 headings, 400–500 body) does the hierarchy work.

## Reading vocabulary

- **Two public modes, one model** (`ReaderMode` in `src/lib/state/store.ts`): **Story** is the default brief; **System** is the full party-lane graph. Internal layout density remains an implementation detail and is never exposed as Simple, Detailed, or Expert.
- **Story** leads with a direct answer, then real document-backed stages. It keeps approval, receiver availability, and institutional settlement distinct, preserves their recorded order, and says when a stage is not recorded. Money, Messages, and Exceptions are inspectable disclosures below the brief.
- **System** preserves all parties and legs in one bounded lane view. Optional focus treatments may dim context but must not delete it. A user can always return directly to Story.
- **Trust receipt** travels with landing, Studio, share, and export surfaces. Curated template, AI draft, and Edited flow are origin states, not accuracy grades. Source support is document/rail matching, not claim verification. Human review appears only with a named reviewer, date, and scope.
- **Internal layouts** (`ViewMode`): Map, Lanes, and Time remain available to the rendering engine and legacy links. They are not a second public complexity hierarchy.
- **Lane/time bands**: alternating `rgba(255,255,255,0.72)` / `rgba(237,231,218,0.5)` rows (or columns in the timeline) with a warm hairline border (`#e4dfd2`) and bold uppercase band labels (`src/components/FofNode.tsx`).
- **Nodes**: white cards, 1px `--line` border, 8px radius, type chip (tinted bg + dark text of the type color), 14px ink label, 11px muted description.
- **Edges**: solid 2px, closed arrowheads, labels as `N · Label` (sequence number first). Colored from the warm 5-bucket family in System and the live drawing phase in `edgeColor()` (`src/lib/diagram/layout.ts`, kept in lockstep with `EDGE_LEGEND`): charcoal `#1c1c1c` authorization/clearing/transfer, gold `#c9962f` settlement/funding, deep maple `#8a5a14` fees/interchange, crimson `#C41E3A` refund/chargeback, warm grey `#8a857c` for message-only legs (notification, reconciliation), which render dashed and thinner. No blue, no green, no animated edges.
- **Legend**: a read-only semantic key inside System. Story uses editorial labels and disclosures instead of requiring the reader to decode graph color.

## Motion

Streaming assembly is the one animated moment: nodes/edges appear as ops arrive; viewport refits with a 200ms ease-out, debounced so it never fights the stream. Everything else: 150ms state transitions. `prefers-reduced-motion`: no fit animation, instant appearance.
