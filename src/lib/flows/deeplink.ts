/**
 * Parse the ?sel= deep-link selector from a glossary "See it move" link:
 * "node:<id>" or "edge:<id>". UNTRUSTED input (it's a URL param), so anything
 * that doesn't match the grammar returns null and the caller simply skips the
 * selection — the seed still loads. Kept as its own tiny module so
 * scripts/test.ts exercises the exact grammar the studio consumes.
 */
export function parseSel(
  sel: string | null | undefined,
): { kind: "node" | "edge"; id: string } | null {
  const m = sel?.match(/^(node|edge):(.+)$/);
  return m ? { kind: m[1] as "node" | "edge", id: m[2] } : null;
}

/** Whitelist the optional reader mode carried by homepage seed handoffs. */
export function parseReaderMode(
  mode: string | null | undefined,
): "story" | "system" | null {
  return mode === "story" || mode === "system" ? mode : null;
}
