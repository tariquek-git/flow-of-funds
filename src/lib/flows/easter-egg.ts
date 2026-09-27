import type { FlowOfFunds } from "@/lib/schema/flow";
import { edge, makeFlow, node } from "./builders";

/**
 * Hidden easter egg. A handful of iconic phrases, typed as the whole message,
 * load ONE pre-built flow set in the Hitchhiker's Guide universe — with a
 * Guide-style explainer. It is deliberately NOT a generative mode: it loads this
 * single canned flow client-side (no AI call, no spend), so it can't be used to
 * coax the assistant off its payments scope. All text is original homage — no
 * copyrighted passages are reproduced.
 *
 * The gag maps perfectly to a flow of funds: the surest way to afford the most
 * expensive meal in history is to deposit one coin in your own era and let
 * compound interest, over the lifetime of the universe, settle the bill.
 */
export const HITCHHIKER_TRIGGER =
  /^\s*(42|the answer(?: to life,? the universe,? and everything)?|don'?t panic|hitch?hiker'?s?(?: guide)?(?: to the galaxy)?|so long(?: and thanks for all the fish)?|pan[ -]?galactic gargle blaster|babel fish)\s*[!.?]*\s*$/i;

export function buildHitchhikerFlow(): FlowOfFunds {
  return makeFlow({
    id: "end-of-universe-dinner",
    title: "Dinner at the Restaurant at the End of the Universe",
    description:
      "A time-deferred settlement: one coin deposited today is matured by compound interest, over the lifetime of the universe, into enough to pay for the most expensive meal in history.",
    narrative:
      "You order the set menu at Milliways. Rather than pay at the table, you deposit a single penny in a savings account back in your own era. Compound interest, given roughly the lifespan of the universe to work with, matures that coin into a fortune; at the End of Time the bill settles itself in full. The maths is kept by Bistromathics, the only accounting that gets more accurate the more wine is poured.",
    jurisdiction: ["GB"],
    primaryRails: ["Compound interest (T+∞)", "Bistromathic Drive", "Sub-Etha Net"],
    currencies: ["GBP"],
    // NOT "seed" (makeFlow's default): the gag must never export with the
    // audited "grounded in operator and regulator sources" provenance footer.
    source: "ai-generated",
    tags: ["easter-egg", "do-not-panic"],
    nodes: [
      node({ id: "diner", type: "endpoint", label: "You (interstellar tourist)", jurisdiction: "GB", swimlaneId: "customer", description: "A traveller with a towel, a sense of humour, and exactly one penny to spare.", metadata: { emoji: "🧑‍🚀" } }),
      node({ id: "restaurant", type: "endpoint", label: "Milliways (End of the Universe)", swimlaneId: "merchant", description: "The Restaurant at the End of the Universe. Presents the most expensive bill in history, then waits patiently for the universe to end.", metadata: { emoji: "🍽️" } }),
      node({ id: "bistromath", type: "intermediary", subtype: "operator", label: "Bistromathic clearing desk", swimlaneId: "network", description: "Reconciles the bill using Bistromathics (numbers whose behaviour depends entirely on the restaurant they are in).", metadata: { emoji: "🧮" } }),
      node({ id: "subetha", type: "intermediary", subtype: "network", label: "Sub-Etha relay", swimlaneId: "network", description: "Broadcasts the receipt across the Sub-Etha Net, the galaxy's messaging fabric.", metadata: { emoji: "📡" } }),
      node({ id: "babelfish", type: "intermediary", subtype: "fx", label: "Babel fish translator", swimlaneId: "network", description: "Pop one in your ear and any galactic bill (or Vogon demand) renders into your own tongue, free of charge.", metadata: { emoji: "🐟" } }),
      node({ id: "home-bank", type: "institution", label: "Earth building society (early 21st c.)", jurisdiction: "GB", regulators: ["FCA", "PRA"], swimlaneId: "banking", description: "An ordinary high-street savings account, opened the morning before you left.", metadata: { emoji: "🏦" } }),
      node({ id: "escrow", type: "treasury", label: "Compound-interest escrow", jurisdiction: "GB", swimlaneId: "banking", description: "Where the penny quietly grows for ~13.8 billion years until it can cover dinner.", metadata: { emoji: "⏳" } }),
      node({ id: "vogon", type: "institution", subtype: "regulator", label: "Vogon revenue service", swimlaneId: "banking", description: "Levies an administrative fee. Files it in triplicate. Recites poetry at anyone who objects.", metadata: { emoji: "📋" } }),
    ],
    edges: [
      edge({ id: "e1", source: "diner", target: "restaurant", type: "authorization", rail: "Set menu", currency: "GBP", label: "Orders dinner", ordinal: 1 }),
      edge({ id: "e2", source: "diner", target: "home-bank", type: "funding", rail: "1p deposit (own era)", currency: "GBP", amount: { value: 0.01, unit: "fixed" }, timing: "today, before departure", label: "Deposits one penny", ordinal: 2 }),
      edge({ id: "e3", source: "home-bank", target: "escrow", type: "settlement", rail: "Compound interest", currency: "GBP", timing: "T+∞ (heat-death of the universe)", label: "Penny matures into a fortune", ordinal: 3 }),
      edge({ id: "e4", source: "escrow", target: "restaurant", type: "settlement", rail: "Bistromathic Drive", currency: "GBP", timing: "the End of Time", label: "Bill paid in full", ordinal: 4 }),
      edge({ id: "e5", source: "restaurant", target: "bistromath", type: "clearing", rail: "Bistromathics", currency: "GBP", label: "Bill reconciled", ordinal: 5 }),
      edge({ id: "e6", source: "restaurant", target: "subetha", type: "notification", rail: "Sub-Etha Net", currency: "GBP", label: "Receipt broadcast", ordinal: 6 }),
      edge({ id: "e7", source: "subetha", target: "babelfish", type: "notification", rail: "Sub-Etha Net", currency: "GBP", label: "Feed picked up", ordinal: 7 }),
      edge({ id: "e8", source: "babelfish", target: "diner", type: "notification", rail: "Babel fish (in-ear)", currency: "GBP", label: "Bill, translated to your tongue", ordinal: 8 }),
      edge({ id: "e9", source: "restaurant", target: "vogon", type: "fee", rail: "Vogon levy", currency: "GBP", label: "Paperwork fee", ordinal: 9, emphasis: "secondary" }),
    ],
    annotations: [
      { id: "a1", type: "note", targetType: "canvas", text: "GUIDE ENTRY: never pay at the table. Time is the cheapest financier in the galaxy. Give compound interest long enough and a single penny settles any bill, including this one." },
      { id: "a2", type: "warning", targetType: "edge", targetId: "e9", text: "The Vogon fee is, as ever, in triplicate. Do not, under any circumstances, ask to see the poetry." },
    ],
    followups: [
      { id: "egg-f1", prompt: "Show a real US card payment flow", rationale: "Back to this galaxy." },
      { id: "egg-f2", prompt: "How does ACH settlement actually work?", rationale: "Real rails, real timing." },
      { id: "egg-f3", prompt: "Compare this to a real instant-payment rail like FedNow", rationale: "Settlement that takes seconds, not aeons." },
    ],
  });
}

/** The Guide's voice, in chat — original homage, and a gentle nudge back to real work. */
export const GUIDE_EXPLAINER =
  "📖 **The Guide** has this to say about dinner at the End of the Universe:\n\n" +
  "The trick to affording the most expensive meal in history is to never pay at the table. " +
  "Slip a single penny into a savings account back in your own era and let compound interest do the heavy lifting; " +
  "given roughly the lifespan of the universe to work with, one coin matures into a sum that covers the meal, the tip, " +
  "and a modest planetary mortgage. The books are kept by Bistromathics, the only branch of accounting that gets *more* " +
  "accurate the more wine is poured. From your side, settlement is instant. From the restaurant's, it's merely cosmological.\n\n" +
  "*That's the one corner of the galaxy I'll wander into. Ask me for real flows: cards, ACH, SEPA, UPI, Pix, and I'll keep both feet in this one.*";
