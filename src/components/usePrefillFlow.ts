"use client";

import { useEffect, useRef } from "react";

const MAX_LEN = 500;

// Code point ranges stripped from a payment description before it's ever
// rendered, logged, or handed off: ASCII C0 controls + DEL, C1 controls,
// zero-width characters, and Unicode bidi override/isolate characters. The
// bidi ones matter here specifically — a description is rendered as plain
// text in the chat, and an embedded RIGHT-TO-LEFT OVERRIDE (or similar) can
// visually reorder digits/amounts, a Trojan-Source-style spoof, even though
// the string is never used as markup. Built from numeric code points (not
// literal characters) so the source file itself never contains an invisible
// or bidi-control character.
const UNSAFE_CODE_POINT_RANGES: Array<[number, number]> = [
  [0x00, 0x1f], // C0 controls
  [0x7f, 0x9f], // DEL + C1 controls
  [0x200b, 0x200d], // zero-width space/non-joiner/joiner
  [0xfeff, 0xfeff], // zero-width no-break space (BOM)
  [0x202a, 0x202e], // bidi embedding/override
  [0x2066, 0x2069], // bidi isolate
];

const UNSAFE_CHARS = new RegExp(
  "[" +
    UNSAFE_CODE_POINT_RANGES.map(
      ([start, end]) =>
        String.fromCodePoint(start) +
        (end > start ? "-" + String.fromCodePoint(end) : ""),
    ).join("") +
    "]",
  "gu",
);

/**
 * Strip anything that could make a payment description dangerous to render or
 * log as plain text: HTML angle brackets (no tag injection, even though React
 * already escapes text content by default — this value can also end up in
 * console logs, the conversation-log payload, and the studio's own history),
 * control/zero-width/bidi-override characters, and collapsed whitespace.
 * Length-capped on Unicode code points (not UTF-16 units) so the cap can't
 * split a surrogate pair (e.g. an emoji) in half.
 */
export function sanitizeFlowDescription(raw: string): string {
  return Array.from(raw)
    .slice(0, MAX_LEN)
    .join("")
    .replace(/[<>]/g, "")
    .replace(UNSAFE_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prefill-link support: a `?d=<payment description>` on the public landing
 * (e.g. a link the Polaris WhatsApp bot writes) should feel like "type this
 * in, then go" arriving pre-typed. Deliberately mirrors Studio's own `?q=`
 * handoff effect rather than the `useSearchParams()` hook: reading
 * `window.__fofHandoff` (parked by the root layout's inline URL-sanitizer,
 * see layout.tsx) with a raw-URL fallback needs no Suspense boundary and never
 * lets a payment description sit in the URL long enough to reach analytics,
 * the Referer header, or browser history.
 *
 * Fires at most once per mount. Silently no-ops on anything empty, too short
 * after cleaning, or absent — no param is the unchanged, current behaviour.
 */
export function usePrefillFlow(onPrefill: (description: string) => void) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    let raw: string | null = window.__fofHandoff?.d ?? null;
    if (raw == null) {
      try {
        raw = new URLSearchParams(window.location.search).get("d");
      } catch {
        raw = null;
      }
    }
    if (!raw) return;
    const clean = sanitizeFlowDescription(raw);
    if (clean.length < 8) return;
    fired.current = true;
    onPrefill(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
