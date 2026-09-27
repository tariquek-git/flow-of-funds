#!/usr/bin/env node
/**
 * bench-light-model.mjs — head-to-head latency for the LIGHT (explain) path.
 *
 * The studio's `explain` / `critique` path is a SINGLE streamed prose call on
 * the light model (src/lib/agent/openai.ts:193, stream:true, no tools). This
 * script reproduces that call across candidate light models and reports
 * time-to-first-token (TTFT — when the user first sees text) and total wall
 * clock, so you can pick a faster light model on evidence, not vibes.
 *
 * It does NOT touch production or your Vercel env. Your key stays local: the
 * script reads OPENAI_API_KEY from the shell env, or from this repo's
 * gitignored .env.local — it is never printed and never leaves your machine.
 *
 * Run:
 *   export OPENAI_API_KEY=sk-...        # or add it to .env.local
 *   node scripts/bench-light-model.mjs
 *   node scripts/bench-light-model.mjs gpt-4.1-mini gpt-4.1-nano   # custom set
 *
 * Notes on faithfulness: the system prompt here is a representative payments
 * explain instruction, SMALLER than production's full KB prefix, so absolute
 * TTFT will read lower than prod for every model — but the RELATIVE gap between
 * models (the thing you're deciding on) holds. Runs are cache-missed per model,
 * same as a real first explain.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- key: shell env first, then repo .env.local (never logged) ---
function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  try {
    const envLocal = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    const m = envLocal.match(/^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  } catch {
    /* no .env.local — fall through */
  }
  return "";
}

const API_KEY = loadKey();
if (!API_KEY) {
  console.error(
    "No OPENAI_API_KEY found.\n" +
      "  export OPENAI_API_KEY=sk-...   (or add OPENAI_API_KEY=... to .env.local)\n" +
      "then re-run: node scripts/bench-light-model.mjs",
  );
  process.exit(1);
}

const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const RUNS = Number(process.env.BENCH_RUNS || 3);
const MODELS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["gpt-4.1-mini", "gpt-4.1-nano", "gpt-5-nano", "gpt-5-mini"];

// A representative light/explain call: short, grounded prose. Mirrors the real
// explain shape (prose only, no tools) without shipping the whole KB.
const SYSTEM =
  "You are a precise payments explainer for a Canadian fintech community tool. " +
  "You explain how money and messages move through payment rails: who moves value, " +
  "when it settles, under whose rules. Banker-grade, calm, concise. No advice, no " +
  "code. Ground answers in real rail mechanics (Interac, ACH/FedACH, wires/SWIFT, " +
  "RTR, Lynx, ACSS, card networks). Keep it to 3-4 sentences of plain prose.";
const USER =
  "Explain how an Interac e-Transfer actually moves money and settles between the " +
  "sender's and recipient's banks, and where Interac sits in that flow.";

const isReasoning = (m) => /^(gpt-5|o[0-9])/i.test(m);

function bodyFor(model) {
  const b = {
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: USER },
    ],
    max_completion_tokens: 600,
  };
  // gpt-5 / o-series: reasoning models. Pin effort to the floor so we measure the
  // FAST configuration; they reject custom temperature, so leave it default.
  if (isReasoning(model)) {
    b.reasoning_effort = process.env.BENCH_EFFORT || "minimal";
  } else {
    b.temperature = 0.4;
  }
  return b;
}

async function oneRun(model) {
  const started = performance.now();
  let ttft = null;
  let outChars = 0;
  let usage = null;
  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(bodyFor(model)),
    });
  } catch (e) {
    return { error: `network: ${e.message}` };
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200).replace(/\s+/g, " ");
    return { error: `HTTP ${res.status}: ${detail}` };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let evt;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      const delta = evt.choices?.[0]?.delta?.content;
      if (delta) {
        if (ttft === null) ttft = performance.now() - started;
        outChars += delta.length;
      }
      if (evt.usage) usage = evt.usage;
    }
  }
  const total = performance.now() - started;
  return { ttft, total, outTokens: usage?.completion_tokens ?? Math.round(outChars / 4) };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
};
const ms = (x) => (x == null || Number.isNaN(x) ? "  —  " : `${Math.round(x)}ms`.padStart(7));

console.log(`\nLight-path latency benchmark · ${RUNS} runs/model · base ${BASE_URL}`);
console.log(`(TTFT = first visible token; Total = full short answer)\n`);
console.log("model".padEnd(15), "TTFT(med)".padStart(10), "Total(med)".padStart(11), "out tok".padStart(9), "  notes");
console.log("-".repeat(62));

for (const model of MODELS) {
  const ttfts = [];
  const totals = [];
  const outs = [];
  let note = "";
  for (let i = 0; i < RUNS; i++) {
    const r = await oneRun(model);
    if (r.error) {
      note = r.error;
      break;
    }
    if (r.ttft != null) ttfts.push(r.ttft);
    totals.push(r.total);
    outs.push(r.outTokens);
  }
  const outAvg = outs.length ? Math.round(outs.reduce((a, b) => a + b, 0) / outs.length) : 0;
  console.log(
    model.padEnd(15),
    ms(median(ttfts)).padStart(10),
    ms(median(totals)).padStart(11),
    String(outAvg).padStart(9),
    note ? `  ⚠ ${note}` : "",
  );
}
console.log(
  "\nInterpret: lower TTFT = user sees the answer start sooner (what 'feels' fast).",
);
console.log(
  "Reasoning models (gpt-5*) run at effort=" + (process.env.BENCH_EFFORT || "minimal") + "; raise BENCH_EFFORT to compare.",
);
console.log("To adopt a winner: set OPENAI_MODEL_LIGHT=<model> in Vercel (light path only; no code change).\n");
