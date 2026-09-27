import { Coins, MessageSquare, Percent, ShieldCheck, Undo2, type LucideIcon } from "lucide-react";
import { legendCategory } from "@/lib/diagram/layout";

/**
 * One glyph per legend bucket — a non-colour, greyscale-legible channel that
 * says WHAT a leg does (authorize / settle / fee / refund / message), redundant
 * with edgeColor() so the meaning survives mono print, low vision, and
 * colour-blindness (where the warm palette collapses: fee-maple and
 * chargeback-crimson sit at the same luminance). Keyed by legendCategory() so
 * it stays in lockstep with edgeColor() + EDGE_LEGEND. Swap the map, not the
 * call sites, to re-theme glyphs per use case.
 */
export const EDGE_GLYPH: Record<string, LucideIcon> = {
  auth: ShieldCheck, // authorization / clearing / transfer — the approval to move
  settlement: Coins, // settlement / funding — value actually landing
  fee: Percent, // fee / interchange — a cut taken
  refund: Undo2, // refund / chargeback — money going back
  message: MessageSquare, // notification / reconciliation — information, not value
};

/** The activity glyph for an edge type, resolved through its legend bucket.
    Falls back to the auth glyph, matching legendCategory()'s own fallback. */
export function edgeGlyphFor(type: string): LucideIcon {
  return EDGE_GLYPH[legendCategory(type)] ?? ShieldCheck;
}
