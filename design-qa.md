# Design QA

Historical design review notes. The screenshots below were local working
artifacts and are not part of this public source release. These observations
are not a fresh validation of the current hosted preview.

## Comparison target

- Source visual truth: `exec-07487a7a-c5a7-4d0e-a8de-52d0c71158e5.png` (historical local artifact; not included)
- Browser-rendered implementation: `question-brief-reference-size.png` (historical local artifact; not included)
- Full-view side-by-side evidence: `design-comparison-exact.png` (historical local artifact; not included)
- State: Question-to-Brief landing input with the default Story brief rendered for a Canadian debit-card purchase.
- Viewport: browser capture requested at 1495 x 1064 CSS px, producing a 1487 x 1058 content capture after the browser inset.
- Pixel dimensions: source 1487 x 1058; implementation 1487 x 1058.
- Density normalization: both artifacts are 1x captures at identical pixel dimensions. No resize or density conversion was used for the final comparison.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation preserves the source's editorial hierarchy, compact labels, bold brief title, readable stage timings, and small evidence copy. Wrapping remains controlled at desktop and 390 px mobile widths.
- Spacing and layout rhythm: the question field, brief header, stage sequence, participant strip, disclosures, and evidence rail retain the source's scan order and density. The implementation intentionally gives the question prompt and receipt more horizontal room while keeping the same hierarchy.
- Colors and visual tokens: the warm paper background, graphite text, Fintech North red, settlement amber, hairline borders, and quiet surfaces match the target direction and preserve contrast.
- Image quality and asset fidelity: the target relies on typography, Lucide-style interface icons, and the Fintech North mark rather than product photography or illustration. No target image asset was replaced by placeholder art, emoji, CSS art, or handcrafted SVG.
- Copy and content: the implementation improves the target's safety boundary by distinguishing approval, institutional settlement, and funds availability; it labels source matching as support rather than claim verification; and it records human review as not recorded.
- Icons and controls: stage, participant, disclosure, Trust Receipt, Story/System, and Ask/Edit controls are aligned and visually consistent. Native buttons, textarea, and details controls retain keyboard semantics and focus behavior.
- Responsiveness and accessibility: no horizontal overflow was observed at 390 x 844; the question wraps; the Ask/Edit drawer fits the viewport; Escape closes the drawer even when its textarea is focused; and the mobile Ask/Edit control has an accessible label.

## Focused evidence

- Story desktop: `studio-story-desktop-final.png` (historical local artifact; not included) (1440 x 1024)
- System desktop: `studio-system-desktop-settled.png` (historical local artifact; not included) (1440 x 1024)
- Expanded Trust Receipt: `studio-story-trust-open.png` (historical local artifact; not included) (1440 x 1024)
- Story mobile: `studio-story-mobile-final.png` (historical local artifact; not included) (390 x 844)
- Question mobile: `question-brief-mobile.png` (historical local artifact; not included) (382 x 827 content capture from the 390 x 844 browser viewport)

These focused views were needed because stage copy, receipt limitations, graph density, drawer fit, and mobile wrapping are too small to judge confidently in the full-view comparison.

## Primary interactions and runtime checks

- Submitted the default payment question and opened the curated Story brief.
- Switched Story to System and inspected the bounded graph.
- Expanded the Trust Receipt and verified origin, support boundary, caveats, automated check boundary, sources, and human-review status.
- Opened and closed Ask/Edit; verified Escape behavior with focus in the textarea.
- Tested desktop and 390 px mobile layouts for clipping and overflow.
- Followed visible homepage links and replaced the broken `/about` destination with `/privacy`.
- Checked the browser console after System rendering; the prior React Flow `getNodesBounds` warning was removed.

## Comparison history

1. P1 responsive shell clipping and hidden controls at mobile width.
   Fix: applied consistent box sizing, `min-width: 0`, compact header actions, and mobile layout rules.
   Post-fix evidence: `studio-story-mobile-final.png` and `question-brief-mobile.png`.
2. P1 Ask/Edit drawer could not be dismissed with Escape while focus remained in the textarea.
   Fix: moved Escape handling to a document-level listener for the open drawer.
   Post-fix evidence: interactive browser pass at 390 x 844.
3. P2 participant strip and long question content could clip or force horizontal overflow.
   Fix: made the participant region responsive and changed the mobile question control to a wrapping textarea.
   Post-fix evidence: `studio-story-mobile-final.png` and `question-brief-mobile.png`.
4. P2 System mode emitted a React Flow bounds warning.
   Fix: used the hook-provided `getNodesBounds` API and corrected the callback dependency list.
   Post-fix evidence: clean console after `studio-system-desktop-settled.png` was captured.
5. P1 homepage About link led to a missing route.
   Fix: routed the link to the existing privacy page.
   Post-fix evidence: browser navigation pass on the landing page.
6. P2 trust language could imply source matching was factual verification.
   Fix: made origin, matched-leg support, caveats, automated-check limits, and human-review state explicit throughout Studio, share metadata, Open Graph, and export.
   Post-fix evidence: `studio-story-trust-open.png`.

## Follow-up polish

No P3 item is required before release. A later research pass could test whether first-time users prefer the current stage labels or shorter conversational labels, but that is a product-learning question rather than a fidelity defect.

final result: passed
