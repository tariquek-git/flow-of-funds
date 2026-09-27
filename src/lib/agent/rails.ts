import { KNOWN_RAILS } from "@/lib/kb/rails";
import type { FlowOfFunds } from "@/lib/schema/flow";

/**
 * Rail naming. Two layers with different jobs:
 *
 *  - RAIL_GUIDANCE (prompt): steer the agent toward SPECIFIC, seed-level rail
 *    names, the exact strings the editor's KNOWN_RAILS combobox recognizes
 *    ("Interac e-Transfer", "SCT Inst", "Faster Payments"), so generated flows
 *    speak the same vocabulary as the shipped catalog. Anything unlisted uses
 *    its common specific name; new/exotic rails are never blocked.
 *  - normalizeRail() (post-generation): fold a label into a high-level family
 *    bucket by a high-confidence prefix match. KB coverage matching keys on
 *    these family buckets (see kbCoverageForRail), so this stays even though
 *    the prompt now asks for specific names; anything unrecognized passes
 *    through unchanged.
 */

/** Prompt guidance: specific seed-level rail names, official-name fallback. */
export const RAIL_GUIDANCE =
  `Rail names: label each leg's rail with the SPECIFIC rail the leg actually rides, using the exact strings from this vocabulary where one applies: ${KNOWN_RAILS.join("; ")}. ` +
  `Prefer the specific rail over a family label (say "Interac e-Transfer" or "Interac Debit", not "Interac"; "SCT Inst", not "SEPA"; "ACSS / AFT" or "Lynx", not "Payments Canada") and keep the same rail string consistent across a diagram's legs. ` +
  `Keep message and product detail (pacs.008, MT103 (legacy), Interac Flash) in the leg's LABEL, not the rail field. ` +
  `For a rail not in the vocabulary, use its common specific name (e.g. "Zelle", "Wise", "Visa Direct"); new or exotic rails are never blocked.`;

/** Ordered prefix → family-bucket rules, matched on an alphanumeric-lowercased key
 *  (so spacing/punctuation/casing don't matter). High-confidence only; a label that
 *  matches NO family prefix passes through unchanged. */
const RAIL_BUCKETS: Array<[RegExp, string]> = [
  [/^interac/, "Interac"],
  [/^(paymentscanada|acss|lynx|lvts|eftaft|aftpaymentscanada)/, "Payments Canada"],
  [/^(ach|fedach|epn|nacha)/, "ACH"],
  [/^fedwire/, "Fedwire"],
  [/^fednow/, "FedNow"],
  [/^rtp/, "RTP"],
  [/^visa/, "Visa"],
  [/^(mastercard|banknet)/, "Mastercard"],
  [/^(swift|mt103)/, "SWIFT"], // bare "pacs" dropped: pacs.008 is shared by many instant rails (Pix, SCT Inst, FedNow), so it does NOT identify SWIFT
  [/^(sepa|sctinst|sct|sdd)/, "SEPA"],
  [/^upi/, "UPI"],
  [/^pix/, "Pix"],
];

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Fold a rail label into its high-level family bucket. Conservative: a label that
 *  matches no known family prefix passes through unchanged (only trimmed). */
export function normalizeRail(rail: string): string {
  const trimmed = rail.trim();
  if (!trimmed) return rail;
  const k = key(trimmed);
  for (const [re, bucket] of RAIL_BUCKETS) {
    if (re.test(k)) return bucket;
  }
  return trimmed;
}

/** Apply normalizeRail across a flow's edge rails + metadata.primaryRails.
 *  Immutable; returns the SAME object reference when nothing changed. */
export function normalizeFlowRails(flow: FlowOfFunds): FlowOfFunds {
  let changed = false;
  const edges = flow.edges.map((e) => {
    if (typeof e.rail !== "string") return e;
    const r = normalizeRail(e.rail);
    if (r === e.rail) return e;
    changed = true;
    // Stash the PRE-normalization rail: kb coverage (kbCoverageForEdge) matches
    // raw, rail-specific keys ("Interac Debit", "Visa Debit", "SEPA Direct
    // Debit") that the family bucket erases; without the stash a debit leg
    // would borrow the credit/A2A doc's grounding.
    return { ...e, rail: r, metadata: { ...e.metadata, railRaw: e.rail } };
  });
  const rails = flow.metadata.primaryRails;
  let primaryRails = rails;
  if (Array.isArray(rails)) {
    // Bucketing can map several entries to the same family; dedupe so
    // primaryRails doesn't repeat (e.g. ["Interac e-Transfer","Interac Debit"]
    // → ["Interac"], not ["Interac","Interac"]).
    const mapped = rails.map((r) => (typeof r === "string" ? normalizeRail(r) : r));
    const deduped = mapped.filter((r, i) => typeof r !== "string" || mapped.indexOf(r) === i);
    if (deduped.length !== rails.length || deduped.some((r, i) => r !== rails[i])) {
      changed = true;
      primaryRails = deduped;
    }
  }
  if (!changed) return flow;
  return { ...flow, edges, metadata: { ...flow.metadata, primaryRails } };
}
