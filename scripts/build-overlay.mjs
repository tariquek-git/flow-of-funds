// Builds v9-overrides/canada/index.html, a full standalone page with the data inlined,
// so the Render preview serves the Canada atlas at /canada/ after it unpacks the V8 baseline
// and copies v9-overrides on top. Usage: node scripts/build-overlay.mjs
import fs from 'node:fs';
const html = fs.readFileSync('prototype/canada/index.html', 'utf8');
const data = JSON.stringify(JSON.parse(fs.readFileSync('data/atlas.json', 'utf8'))).replace(/</g, '\\u003c');
const out = html.replace('<script type="application/json" id="atlas-inline"></script>', `<script type="application/json" id="atlas-inline">${data}</script>`);
if (out === html) throw new Error('atlas-inline placeholder not found');
fs.mkdirSync('v9-overrides/canada', { recursive: true });
fs.writeFileSync('v9-overrides/canada/index.html', out);
console.log('v9-overrides/canada/index.html', (out.length / 1024).toFixed(1) + ' KB');
