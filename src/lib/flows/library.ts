import { FLOW_CATALOG } from "./catalog";
import type { FlowOfFunds } from "@/lib/schema/flow";

/**
 * The template library: every seed, organized the way a payments person
 * shops for a starting point — by jurisdiction and by category.
 */

export type LibraryFilter = "all" | "CA" | "US" | "EU" | "GB" | "IN" | "BR" | "cross";
/** Single-jurisdiction region codes a library entry can carry. */
export type RegionCode = "CA" | "US" | "EU" | "GB" | "IN" | "BR";

export const CATEGORY_ORDER = [
  "Cards & networks",
  "Programs & BaaS",
  "Bank rails",
  "Instant payments",
  "Exceptions & disputes",
  "Cross-border",
  "Crypto & stablecoin",
] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

const CATEGORIES: Record<string, Category> = {
  "interac-debit": "Cards & networks",
  "visa-four-party": "Cards & networks",
  "prepaid-sponsor-ca": "Programs & BaaS",
  "neobank-sponsor-us": "Programs & BaaS",
  "payfac-us": "Programs & BaaS",
  "interac-etransfer": "Bank rails",
  "ach-payroll": "Bank rails",
  "ach-debit-web": "Bank rails",
  "pad-debit-ca": "Bank rails",
  "lynx-wire-ca": "Bank rails",
  "acss-eft-aft-ca": "Bank rails",
  "fednow-b2b": "Instant payments",
  "rtp-b2b": "Instant payments",
  "rtr-instant-ca": "Instant payments",
  "card-dispute-rege": "Exceptions & disputes",
  "wire-fx": "Cross-border",
  "cross-border-card": "Cross-border",
  "sepa-instant-eu": "Instant payments",
  "uk-faster-payments": "Instant payments",
  "india-upi": "Instant payments",
  "brazil-pix": "Instant payments",
  "brazil-pix-merchant-checkout": "Instant payments",
  "usdc-onchain-payment": "Crypto & stablecoin",
  "usdc-cross-border-payout": "Crypto & stablecoin",
  "crypto-exchange-onramp": "Crypto & stablecoin",
  "stablecoin-merchant-accept": "Crypto & stablecoin",
};

export type LibraryEntry = {
  id: string;
  flow: FlowOfFunds;
  category: Category;
  jurisdiction: RegionCode | "cross";
};

export function libraryEntries(): LibraryEntry[] {
  return Object.entries(FLOW_CATALOG).map(([id, flow]) => {
    const j = flow.metadata.jurisdiction;
    return {
      id,
      flow,
      category: CATEGORIES[id] ?? "Bank rails",
      jurisdiction: j.length > 1 ? "cross" : (j[0] as RegionCode),
    };
  });
}

export function filterEntries(filter: LibraryFilter): LibraryEntry[] {
  const all = libraryEntries();
  if (filter === "all") return all;
  return all.filter((e) => e.jurisdiction === filter);
}
