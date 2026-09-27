import { FLOW_CATALOG } from "@/lib/flows/catalog";
import type { FlowOfFunds } from "@/lib/schema/flow";

/**
 * Offline flow composer — the "fake it well" engine.
 *
 * Without an API key the app shouldn't be limited to verbatim seed replay.
 * This scores the prompt against scenario archetypes, picks the closest seed,
 * and adapts it: domain relabeling (a fleet-fuel program renames the
 * cardholder to "Fleet driver", the merchant to "Fuel merchant", etc.),
 * a prompt-derived title, and an honest intro that says what it modeled the
 * answer on. Real Claude replaces all of this the moment a credential lands.
 */

type Archetype = {
  seed: string;
  /** Each matching pattern adds its weight to the score. */
  signals: { rx: RegExp; w: number }[];
};

const ARCHETYPES: Archetype[] = [
  {
    seed: "interac-etransfer",
    signals: [
      { rx: /e-?transfer|email money|autodeposit/i, w: 5 },
      { rx: /send (money|cash) .*(friend|person|account)/i, w: 3 },
      { rx: /\b(p2p|a2a)\b/i, w: 2 },
      { rx: /interac/i, w: 1 },
    ],
  },
  {
    seed: "interac-debit",
    signals: [
      { rx: /interac.{0,20}debit|debit.{0,20}interac/i, w: 5 },
      { rx: /\b(pos|point of sale|tap|terminal|in-?store)\b/i, w: 2 },
      { rx: /debit/i, w: 1 },
      { rx: /canad/i, w: 1 },
    ],
  },
  {
    seed: "prepaid-sponsor-ca",
    signals: [
      { rx: /prepaid/i, w: 4 },
      { rx: /schedule\s?i\b/i, w: 4 },
      { rx: /canad.{0,40}(fintech|program|card)|fintech.{0,40}canad/i, w: 3 },
      { rx: /(fleet|fuel|gas|gift|payout|expense) card/i, w: 3 },
      { rx: /sponsor|bin|program manager/i, w: 2 },
      { rx: /\bfbo\b/i, w: 2 },
    ],
  },
  {
    seed: "neobank-sponsor-us",
    signals: [
      { rx: /neobank|challenger bank/i, w: 5 },
      { rx: /\bbaas\b|banking.as.a.service/i, w: 4 },
      { rx: /checking|deposit account.*fintech/i, w: 3 },
      { rx: /sponsor bank/i, w: 2 },
      { rx: /\bfbo\b/i, w: 2 },
      { rx: /debit card/i, w: 1 },
    ],
  },
  {
    seed: "ach-payroll",
    signals: [
      { rx: /\bach\b/i, w: 4 },
      { rx: /payroll|direct deposit|wages|salary/i, w: 4 },
      { rx: /\b(odfi|rdfi|nacha)\b/i, w: 4 },
      // Bank-side origination vocabulary: nearest existing pattern is the
      // ODFI credit-push seed. Low weights on purpose — alone they stay under
      // the score-3 floor, so a bare "prefunding" prompt gets an honest
      // refusal instead of a payroll diagram.
      { rx: /third.?party sender|\btps\b/i, w: 2 },
      { rx: /prefund/i, w: 2 },
      { rx: /batch/i, w: 1 },
    ],
  },
  {
    seed: "fednow-b2b",
    signals: [
      { rx: /fednow/i, w: 6 },
      { rx: /instant payment/i, w: 4 },
      { rx: /iso ?20022/i, w: 2 },
      { rx: /b2b|invoice|supplier payment/i, w: 1 },
    ],
  },
  {
    seed: "rtp-b2b",
    signals: [
      { rx: /\brtp\b/i, w: 6 },
      { rx: /clearing house/i, w: 4 },
      { rx: /real.?time payment/i, w: 3 },
    ],
  },
  {
    seed: "card-dispute-rege",
    signals: [
      { rx: /chargeback|dispute/i, w: 5 },
      { rx: /reg\s?e\b/i, w: 5 },
      { rx: /provisional credit/i, w: 5 },
      { rx: /unauthorized (transaction|charge|debit card)/i, w: 4 },
      { rx: /\bre-?present(ment|ed|s)?\b/i, w: 3 },
    ],
  },
  {
    seed: "ach-debit-web",
    signals: [
      { rx: /ach debit|debit pull/i, w: 5 },
      { rx: /\bweb entry\b/i, w: 5 },
      { rx: /\br0?1\b|\br10\b/i, w: 5 },
      { rx: /return window|unauthorized.*return|\bnsf\b/i, w: 4 },
      { rx: /subscription|recurring (billing|debit)/i, w: 3 },
      // Keeps "subscription billing via ACH" ahead of the payroll seed's
      // generic \bach\b w:4 without stealing plain credit-push ACH prompts.
      { rx: /\bach\b/i, w: 2 },
      // "Pre-authorized debit" is PAD vocabulary, but US-context recurring
      // debits belong here — this lets them outscore the Canadian PAD seed.
      { rx: /pre.?authoriz/i, w: 2 },
    ],
  },
  {
    seed: "pad-debit-ca",
    signals: [
      { rx: /pre.?authoriz/i, w: 5 },
      { rx: /\bpad\b/i, w: 4 },
      { rx: /rule\s?h1/i, w: 5 },
      { rx: /dishonou?r/i, w: 3 },
      { rx: /recurring.{0,30}(debit|payment).{0,40}canad|canad.{0,40}recurring (debit|payment)/i, w: 4 },
      { rx: /\bacss\b|\baft\b/i, w: 4 },
    ],
  },
  {
    seed: "payfac-us",
    signals: [
      { rx: /payfac|payment facilitator/i, w: 6 },
      { rx: /sub.?merchant/i, w: 5 },
      { rx: /master merchant/i, w: 4 },
      { rx: /(software |saas )?platform.{0,30}payments?/i, w: 2 },
      { rx: /acquir/i, w: 1 },
    ],
  },
  {
    seed: "wire-fx",
    signals: [
      { rx: /wire/i, w: 4 },
      { rx: /\bfx\b|foreign exchange|currency conversion|cad.{0,10}usd|usd.{0,10}cad/i, w: 4 },
      { rx: /cross.?border|international|swift|correspondent/i, w: 3 },
    ],
  },
  {
    seed: "visa-four-party",
    signals: [
      { rx: /four.?party|open.?loop/i, w: 5 },
      { rx: /interchange|mdr|merchant discount/i, w: 3 },
      { rx: /credit card/i, w: 3 },
      { rx: /visa|mastercard/i, w: 2 },
      { rx: /merchant|acquirer|issuer/i, w: 1 },
    ],
  },
];

/** Domain packs: relabel parties to match the user's scenario language. */
type DomainPack = {
  rx: RegExp;
  rename: Record<string, { label: string; description?: string }>;
  noun: string;
};

const DOMAIN_PACKS: DomainPack[] = [
  {
    rx: /fleet|fuel|gas station|trucking/i,
    noun: "fleet fuel card program",
    rename: {
      cardholder: { label: "Fleet driver", description: "Driver paying with the program's fleet card." },
      customer: { label: "Fleet driver", description: "Driver paying with the program's fleet card." },
      merchant: { label: "Fuel merchant", description: "Gas station accepting the fleet card." },
      fintech: {
        label: "Fleet card program manager",
        description: "Runs the fleet program, controls, and ledger; not the issuer of record.",
      },
      neobank: {
        label: "Fleet card program manager",
        description: "Runs the fleet program, controls, and ledger; not the issuer of record.",
      },
    },
  },
  {
    rx: /gift card/i,
    noun: "gift card program",
    rename: {
      cardholder: { label: "Gift card holder" },
      customer: { label: "Gift card holder" },
      fintech: { label: "Gift card program manager" },
      neobank: { label: "Gift card program manager" },
    },
  },
  {
    rx: /payout|gig|creator|contractor|marketplace/i,
    noun: "payout program",
    rename: {
      cardholder: { label: "Gig worker / payee" },
      customer: { label: "Gig worker / payee" },
      fintech: { label: "Payout platform" },
      neobank: { label: "Payout platform" },
      employer: { label: "Marketplace platform" },
      employee: { label: "Gig worker / payee" },
    },
  },
  {
    rx: /expense|corporate card|spend management/i,
    noun: "corporate expense card program",
    rename: {
      cardholder: { label: "Employee cardholder" },
      customer: { label: "Employee cardholder" },
      fintech: { label: "Spend management platform" },
      neobank: { label: "Spend management platform" },
    },
  },
  {
    rx: /rent|landlord|tenant/i,
    noun: "rent payment flow",
    rename: {
      sender: { label: "Tenant" },
      recipient: { label: "Landlord" },
      employer: { label: "Tenant" },
      employee: { label: "Landlord" },
    },
  },
];

export type Composed = {
  flow: FlowOfFunds;
  intro: string;
  archetypeTitle: string;
  adapted: boolean;
};

export function composeFlow(prompt: string): Composed | null {
  type Scored = { seed: string; score: number; hits: number };
  const scored: Scored[] = [];
  for (const a of ARCHETYPES) {
    let score = 0;
    let hits = 0; // count of DISTINCT signals that matched
    for (const sig of a.signals) {
      if (sig.rx.test(prompt)) {
        score += sig.w;
        hits += 1;
      }
    }
    if (score > 0) scored.push({ seed: a.seed, score, hits });
  }
  let best: Scored | null = null;
  for (const s of scored) {
    if (!best || s.score > best.score) best = s;
  }
  // Low-confidence refusal: a polished wrong diagram is worse than an honest
  // "I can't map that offline", so weak matches return null instead of guessing.
  if (!best || best.score < 3) return null;

  const seed = FLOW_CATALOG[best.seed];
  const flow: FlowOfFunds = structuredClone(seed);
  const archetypeTitle = seed.metadata.title;
  const pack = DOMAIN_PACKS.find((p) => p.rx.test(prompt));
  let adapted = false;

  // Domain relabeling — only claimed when at least one node actually renamed.
  let packApplied = false;
  if (pack) {
    let renamed = 0;
    for (const node of flow.nodes) {
      const r = pack.rename[node.id];
      if (r) {
        node.label = r.label;
        if (r.description) node.description = r.description;
        renamed++;
      }
    }
    if (renamed > 0) {
      packApplied = true;
      adapted = true;
      flow.metadata.title = titleFromPrompt(prompt) ?? `${capitalize(pack.noun)} — flow of funds`;
      flow.metadata.tags = [...(flow.metadata.tags ?? []), "adapted"];
      if (flow.metadata.narrative) {
        flow.metadata.narrative += ` (Adapted to the ${pack.noun} described.)`;
      }
    }
  }

  // Network-brand relabel: never ship Visa branding for a Mastercard prompt.
  let brandSwapped = false;
  if (
    seed.metadata.primaryRails.some((r) => /visa/i.test(r)) &&
    /mastercard/i.test(prompt) &&
    !/visa/i.test(prompt)
  ) {
    applyMastercardBranding(flow);
    brandSwapped = true;
    adapted = true;
  }

  // A single matched signal can score 4–5 off one keyword ("wire") — that's
  // pattern-matching, not understanding. Only present the seed without the
  // adapted caveat when ≥2 distinct signals matched or the score is decisive.
  if (!adapted && best.hits < 2 && best.score < 6) {
    adapted = true; // weak/single-signal match — be explicit it's the nearest pattern
  }

  // Jurisdiction guard: a US-phrased prompt matched to a Canada-only seed
  // (or the inverse) must carry the adapted caveat — silently rendering the
  // wrong country's rails is the worst failure mode for client-facing work.
  const seedJur = seed.metadata.jurisdiction;
  const usOnly = seedJur.length === 1 && seedJur[0] === "US";
  const caOnly = seedJur.length === 1 && seedJur[0] === "CA";
  const usMarked = /\b(us|u\.s\.|united states|american)\b/i.test(prompt);
  const caMarked = /canad/i.test(prompt);
  if ((usMarked && caOnly) || (caMarked && usOnly)) {
    adapted = true;
  }
  // A cross-jurisdiction tie at the top score is genuine ambiguity (e.g. a
  // US-phrased "pre-authorized debit" splitting ACH WEB vs Canadian PAD) —
  // surface the caveat even though the tie-break picked a plausible seed.
  if (!adapted && (usOnly || caOnly)) {
    const bestSeed = best.seed;
    const bestScore = best.score;
    const rivalTie = scored.some((s) => {
      if (s.seed === bestSeed || s.score !== bestScore) return false;
      const j = FLOW_CATALOG[s.seed].metadata.jurisdiction;
      return j.length === 1 && j[0] !== seedJur[0];
    });
    if (rivalTie) adapted = true;
  }

  flow.id = `composed-${Date.now().toString(36)}`;
  flow.metadata.source = "ai-generated";

  // The chat-only disclosure disappears at screenshot time; an on-canvas
  // caveat survives exports of adapted compositions.
  if (adapted) {
    flow.annotations = [
      ...(flow.annotations ?? []),
      {
        id: "adapted-note",
        type: "warning",
        targetType: "canvas",
        text: `Offline composition modeled on: ${archetypeTitle}. Verify details before client use.`,
      },
    ];
  }

  const qualifiers = [
    packApplied ? `relabeled for the ${pack!.noun}` : null,
    brandSwapped ? "rebranded Visa → Mastercard (Banknet rails)" : null,
  ].filter((q): q is string => q !== null);
  const intro = adapted
    ? `Modeled on the closest in-scope pattern: **${archetypeTitle}**${qualifiers.length ? `, ${qualifiers.join(", ")}` : ""}. Offline demo mode composes from known archetypes; add an API key for fully custom generation.`
    : (seed.metadata.narrative ?? seed.metadata.description ?? "");

  return { flow, intro, archetypeTitle, adapted };
}

/**
 * Brand swap for Mastercard prompts matched to Visa-railed seeds. Ordered:
 * specific brand strings first (VisaNet → Banknet, Visa Debit → Debit
 * Mastercard), then the generic name, covering labels, descriptions, rails,
 * annotations, and metadata so no Visa branding survives anywhere.
 */
const BRAND_SWAPS: [RegExp, string][] = [
  [/VisaNet/g, "Banknet"],
  [/Visa Debit/g, "Debit Mastercard"],
  [/Visa clearing/g, "Mastercard clearing"],
  [/Visa settlement/g, "Mastercard settlement"],
  [/Visa network/g, "Mastercard network"],
  [/Visa/g, "Mastercard"],
  [/\bvisa\b/g, "mastercard"],
];

function swapBrand(s: string): string {
  return BRAND_SWAPS.reduce((acc, [rx, to]) => acc.replace(rx, to), s);
}

function applyMastercardBranding(flow: FlowOfFunds): void {
  for (const n of flow.nodes) {
    n.label = swapBrand(n.label);
    if (n.description) n.description = swapBrand(n.description);
  }
  for (const e of flow.edges) {
    e.rail = swapBrand(e.rail);
    if (e.label) e.label = swapBrand(e.label);
    if (e.description) e.description = swapBrand(e.description);
  }
  for (const a of flow.annotations ?? []) {
    a.text = swapBrand(a.text);
  }
  const m = flow.metadata;
  m.title = swapBrand(m.title);
  if (m.description) m.description = swapBrand(m.description);
  if (m.narrative) m.narrative = swapBrand(m.narrative);
  m.primaryRails = m.primaryRails.map(swapBrand);
  if (m.tags) m.tags = m.tags.map(swapBrand);
}

function titleFromPrompt(prompt: string): string | null {
  const cleaned = prompt
    .replace(/^(show|draw|map|model|build|create|generate|give|make)( me)?( a| an| the)?\s*/i, "")
    .replace(/[.?!]\s*$/, "")
    .trim();
  if (cleaned.length < 8 || cleaned.length > 90) return null;
  return capitalize(cleaned);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
