// Settlement Map drift checks. Run: npm run check
// Flags: --self-test  run every fixture in tests/fixtures and confirm it fails the test it targets
//        --links      also request every source URL (needs open network)
//        --mermaid    print the Mermaid sequence for each scenario and exit
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const args = new Set(process.argv.slice(2));

const schema = read('data/atlas.schema.json');
const tokens = read('design/tokens.json');
const prototypePath = 'prototype/canada/index.html';
const prototypeHtml = fs.existsSync(path.join(root, prototypePath)) ? fs.readFileSync(path.join(root, prototypePath), 'utf8') : '';

const STALE_DAYS = 180;
const TODAY = new Date(process.env.CHECK_TODAY || new Date().toISOString().slice(0, 10));

// ---------- helpers ----------
const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const sentences = (s) => (s.match(/[^.!?]+[.!?]+(\s|$)/g) || [s]).filter((x) => x.trim()).length;
function luminance(hex) {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---------- tests ----------
// Each test returns { errors: [], warnings: [] }
const tests = {
  'schema': (d) => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const ok = ajv.validate(schema, d);
    return { errors: ok ? [] : ajv.errors.map((e) => `${e.instancePath || '/'} ${e.message}`) };
  },

  'unique-ids': (d) => {
    const errors = [];
    for (const k of ['groups', 'parties', 'systems', 'scenarios', 'sources']) {
      const seen = new Set();
      for (const x of d[k]) { if (seen.has(x.id)) errors.push(`${k}: duplicate id ${x.id}`); seen.add(x.id); }
    }
    return { errors };
  },

  'every-claim-sourced': (d) => {
    const errors = [];
    const src = byId(d.sources);
    const claimFields = ['operator', 'scheme_owner', 'roles', 'settlement_asset', 'settlement_mode', 'settles_in', 'settlement_timing', 'hours', 'participants_summary', 'explainer'];
    for (const s of d.systems) {
      for (const f of claimFields) {
        const v = s[f];
        const isClaim = v !== null && !(f === 'settlement_mode' && v === 'unknown');
        const refs = s.field_sources[f];
        if (isClaim && (!refs || refs.length === 0)) errors.push(`${s.id}.${f} has a value but no source`);
        for (const r of refs || []) if (!src[r]) errors.push(`${s.id}.${f} cites missing source ${r}`);
      }
    }
    for (const sc of d.scenarios) {
      for (const st of sc.steps) for (const r of st.sources) if (!src[r]) errors.push(`${sc.id} step ${st.n} cites missing source ${r}`);
      for (const [k, line] of Object.entries(sc.explainer)) for (const r of line.sources) if (!src[r]) errors.push(`${sc.id} explainer.${k} cites missing source ${r}`);
    }
    for (const p of d.parties) for (const r of p.sources) if (!src[r]) errors.push(`party ${p.id} cites missing source ${r}`);
    return { errors };
  },

  'explainer-two-sentences': (d) => ({
    errors: d.systems.filter((s) => sentences(s.explainer) > 2).map((s) => `${s.id} explainer has ${sentences(s.explainer)} sentences (max 2)`),
  }),

  'referential-integrity': (d) => {
    const errors = [];
    const g = byId(d.groups), p = byId(d.parties), sy = byId(d.systems), r = byId(d.regions);
    for (const s of d.systems) {
      if (!g[s.group]) errors.push(`${s.id}.group ${s.group} does not exist`);
      if (!r[s.region]) errors.push(`${s.id}.region ${s.region} does not exist`);
      if (!p[s.operator]) errors.push(`${s.id}.operator ${s.operator} is not a party`);
      if (s.scheme_owner && !p[s.scheme_owner]) errors.push(`${s.id}.scheme_owner ${s.scheme_owner} is not a party`);
      if (s.settles_in && !sy[s.settles_in]) errors.push(`${s.id}.settles_in ${s.settles_in} is not a system`);
    }
    for (const sc of d.scenarios) {
      if (!sy[sc.rail]) errors.push(`${sc.id}.rail ${sc.rail} is not a system`);
      if (!p[sc.settlement_lane]) errors.push(`${sc.id}.settlement_lane ${sc.settlement_lane} is not a party`);
      for (const l of sc.lanes) if (!p[l]) errors.push(`${sc.id} lane ${l} is not a party`);
      sc.steps.forEach((st, i) => {
        if (st.n !== i + 1) errors.push(`${sc.id} step numbers out of order at ${st.n}`);
        for (const end of [st.from, st.to]) if (!sc.lanes.includes(end)) errors.push(`${sc.id} step ${st.n} party ${end} is not a lane`);
        if (st.via && !p[st.via] && !sy[st.via]) errors.push(`${sc.id} step ${st.n} via ${st.via} is not a party or system`);
      });
    }
    return { errors };
  },

  'settlement-chain-terminates': (d) => {
    // Drill down must always end at a central bank ledger (or a declared unknown), never loop.
    const errors = [];
    const sy = byId(d.systems);
    for (const s of d.systems) {
      const seen = [s.id];
      let cur = s;
      while (cur.settles_in) {
        cur = sy[cur.settles_in];
        if (!cur) break;
        if (seen.includes(cur.id)) { errors.push(`settlement loop: ${[...seen, cur.id].join(' > ')}`); break; }
        seen.push(cur.id);
      }
      if (cur && !cur.settles_in) {
        const terminalOk = cur.settlement_mode === 'central-bank-ledger' || ['unknown', 'none', 'on-chain'].includes(cur.settlement_mode);
        if (!terminalOk) errors.push(`${s.id} chain ends at ${cur.id}, which is neither a central bank ledger nor a declared unknown`);
      }
    }
    return { errors };
  },

  'live-never-depends-on-planned': (d) => {
    const sy = byId(d.systems);
    return { errors: d.systems.filter((s) => s.status === 'live' && s.settles_in && sy[s.settles_in]?.status === 'planned').map((s) => `${s.id} is live but settles in planned ${s.settles_in}`) };
  },

  'role-tags': (d) => {
    // Tag tests from the brief. A test whose record is not loaded yet is reported as pending, not passed.
    const errors = [], warnings = [];
    const sy = byId(d.systems), pt = byId(d.parties);
    const need = (id, fn, msg) => { if (!sy[id] && !pt[id]) { warnings.push(`pending: ${id} not loaded yet (${msg})`); return; } if (!fn()) errors.push(msg); };

    for (const s of d.systems) {
      const settles = s.roles.includes('settlement');
      if (s.settlement_mode === 'none' && (settles || s.settles_in)) errors.push(`${s.id} has settlement_mode none but a settlement role or settles_in`);
      if (s.roles.includes('messaging') && s.roles.length === 1 && s.settles_in) errors.push(`${s.id} is messaging-only but has settles_in`);
      if (s.roles.includes('rulebook') && !s.scheme_owner) errors.push(`${s.id} has a rulebook role but no scheme_owner`);
      if (settles && s.settlement_mode === 'unknown') errors.push(`${s.id} claims a settlement role but its settlement mode is unknown`);
    }
    need('swift', () => !sy.swift.roles.includes('settlement') && sy.swift.settles_in === null, 'swift must be messaging only, with no settlement role');
    need('interac-e-transfer', () => sy['interac-e-transfer'].settles_in === 'lynx' && sy['interac-e-transfer'].settlement_mode === 'deferred-net', 'interac-e-transfer must settle deferred net in lynx');
    need('acss', () => sy.acss.settles_in === 'lynx' && sy.acss.settlement_mode === 'deferred-net', 'acss net positions must settle in lynx');
    need('lynx', () => sy.lynx.settles_in === 'boc-accounts' && sy.lynx.settlement_mode === 'rtgs', 'lynx must be rtgs settling in boc-accounts');
    need('rtr', () => sy.rtr.status !== 'live' || TODAY >= new Date('2026-10-01'), 'rtr cannot be marked live before its launch window');
    need('upi', () => sy.upi.settles_in === 'rbi-rtgs', 'upi must settle in rbi-rtgs (NPCI nets, RBI settles)');
    need('chips', () => sy.chips.settles_in === 'chips-prefunded-account', 'chips must settle against its prefunded account at the NY Fed');
    need('rtp', () => sy.rtp.settles_in === 'rtp-joint-account', 'rtp positions must be backed by the joint account at the NY Fed');
    need('usdc', () => {
      const u = sy.usdc; const roles = (k) => d.parties.find((p) => p.id === u[k]);
      return u.issuer && u.reserve_manager && u.custodian && new Set([u.issuer, u.reserve_manager, u.custodian]).size === 3 && roles('issuer') && roles('custodian');
    }, 'usdc must name three distinct parties: issuer, reserve manager, custodian');
    return { errors, warnings };
  },

  'freshness': (d) => {
    const warnings = [];
    const days = (x) => Math.floor((TODAY - new Date(x)) / 86400000);
    for (const s of d.systems) if (days(s.last_checked) > STALE_DAYS) warnings.push(`${s.id} last checked ${days(s.last_checked)} days ago`);
    for (const sc of d.scenarios) if (days(sc.last_checked) > STALE_DAYS) warnings.push(`${sc.id} last checked ${days(sc.last_checked)} days ago`);
    for (const s of d.sources) {
      if (days(s.accessed) > STALE_DAYS) warnings.push(`source ${s.id} accessed ${days(s.accessed)} days ago`);
      if (s.published && /^\d{4}-\d{2}-\d{2}$/.test(s.published) && days(s.published) > 365) warnings.push(`source ${s.id} document dated ${s.published} (older than 12 months; recheck for a newer edition)`);
    }
    return { errors: [], warnings };
  },

  'contrast': (d) => {
    const errors = [], rows = [];
    const tk = d.__tokens || tokens;
    for (const [theme, t] of Object.entries(tk.themes)) {
      for (const pr of tk.contrast_pairs) {
        const r = contrast(t[pr.fg], t[pr.bg]);
        rows.push({ theme, pair: `${pr.fg} on ${pr.bg}`, ratio: r.toFixed(2), min: pr.min, use: pr.use });
        if (r < pr.min) errors.push(`${theme}: ${pr.fg} on ${pr.bg} is ${r.toFixed(2)}:1, needs ${pr.min}:1 (${pr.use})`);
      }
    }
    if (!d.__tokens) tests.contrast.rows = rows;
    return { errors };
  },

  'tokens-match-prototype': () => {
    if (!prototypeHtml) return { errors: [], warnings: [`${prototypePath} not found`] };
    const errors = [];
    for (const [theme, t] of Object.entries(tokens.themes)) for (const [k, v] of Object.entries(t)) {
      if (!prototypeHtml.includes(`--${k}:${v}`) && !prototypeHtml.includes(`--${k}: ${v}`)) errors.push(`${theme} token --${k}:${v} missing from prototype CSS`);
    }
    return { errors };
  },
};

// ---------- Mermaid ----------
export function mermaid(d, sc) {
  const p = byId(d.parties);
  const alias = (id) => id.replace(/-/g, '_');
  const lines = ['sequenceDiagram'];
  for (const l of [...sc.lanes, sc.settlement_lane]) lines.push(`  participant ${alias(l)} as ${p[l].name}`);
  const arrow = { message: '--)', money: '->>', settlement: '->>', customer: '->>' };
  for (const st of sc.steps) {
    const via = st.via ? ` via ${byId([...d.parties, ...d.systems])[st.via].name}` : '';
    if (st.type === 'customer') { lines.push(`  Note over ${alias(st.from)}: ${st.n}. customer. ${st.caption}`); continue; }
    if (st.type === 'settlement') {
      lines.push(`  ${alias(st.from)}${arrow.settlement}${alias(sc.settlement_lane)}: ${st.n}. settlement${via} [final]`);
      lines.push(`  ${alias(sc.settlement_lane)}${arrow.settlement}${alias(st.to)}: ${st.n}. credit to master account [final]`);
      continue;
    }
    if (st.from === st.to) lines.push(`  Note over ${alias(st.from)}: ${st.n}. ${st.type}. ${st.caption}`);
    else lines.push(`  ${alias(st.from)}${arrow[st.type]}${alias(st.to)}: ${st.n}. ${st.type}${via}`);
  }
  return lines.join('\n');
}

// ---------- runner ----------
function run(d, only) {
  const out = {};
  for (const [name, fn] of Object.entries(tests)) {
    if (only && name !== only) continue;
    try { out[name] = { errors: [], warnings: [], ...fn(d) }; }
    catch (e) { out[name] = { errors: [`threw: ${e.message}`], warnings: [] }; }
  }
  return out;
}

function applyPatch(d, ops) {
  const c = structuredClone(d);
  for (const op of ops) {
    // path like "systems[id=swift].roles"
    let parts = op.path.split('.');
    let obj = c;
    if (parts[0] === 'tokens') { c.__tokens = c.__tokens || structuredClone(tokens); obj = c.__tokens; parts = parts.slice(1); }
    for (let i = 0; i < parts.length; i++) {
      const m = parts[i].match(/^(\w+)\[id=([^\]]+)\]$/);
      const last = i === parts.length - 1;
      if (m) {
        const arr = obj[m[1]];
        let idx = arr.findIndex((x) => x.id === m[2]);
        if (last) { if (op.remove) arr.splice(idx, 1); else if (idx < 0) arr.push(op.value); else arr[idx] = op.value; }
        else obj = arr[idx];
      } else if (last) { if (op.remove) delete obj[parts[i]]; else obj[parts[i]] = op.value; }
      else obj = obj[parts[i]];
    }
  }
  return c;
}

const data = read('data/atlas.json');

if (args.has('--mermaid')) {
  for (const sc of data.scenarios) console.log(`%% ${sc.id}\n${mermaid(data, sc)}\n`);
  process.exit(0);
}

let failed = false;
const results = run(data);
for (const [name, r] of Object.entries(results)) {
  const mark = r.errors.length ? 'FAIL' : 'pass';
  console.log(`${mark}  ${name}${r.warnings.length ? `  (${r.warnings.length} warning${r.warnings.length > 1 ? 's' : ''})` : ''}`);
  for (const e of r.errors) console.log(`        x ${e}`);
  for (const w of r.warnings) console.log(`        ! ${w}`);
  if (r.errors.length) failed = true;
}
if (tests.contrast.rows) {
  console.log('\ncontrast');
  for (const r of tests.contrast.rows) console.log(`  ${r.theme.padEnd(5)} ${r.pair.padEnd(26)} ${r.ratio.padStart(5)}:1  min ${r.min}  ${r.use}`);
}

if (args.has('--links')) {
  console.log('\nlinks');
  for (const s of data.sources) {
    try { const res = await fetch(s.url, { method: 'HEAD', redirect: 'follow' }); console.log(`  ${res.ok ? 'ok ' : res.status} ${s.id}`); if (!res.ok && res.status !== 403 && res.status !== 405) failed = true; }
    catch (e) { console.log(`  ?? ${s.id} ${e.cause?.code || e.message}`); }
  }
}

if (args.has('--self-test')) {
  console.log('\nself-test (each fixture must fail the test it targets)');
  const dir = path.join(root, 'tests/fixtures');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = run(applyPatch(data, fx.patch), fx.expect_fail)[fx.expect_fail];
    const ok = r && r.errors.length > 0;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${f}  -> ${fx.expect_fail}: ${ok ? r.errors[0] : 'did not fail'}`);
    if (!ok) failed = true;
  }
}

process.exit(failed ? 1 : 0);
