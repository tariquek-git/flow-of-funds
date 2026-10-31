// Builds a single self-contained preview page (data inlined) for review links.
// Output goes to dist/, which is git-ignored. Usage: node scripts/build-preview.mjs
import fs from 'node:fs';
const html = fs.readFileSync('prototype/canada/index.html', 'utf8');
const data = fs.readFileSync('data/atlas.json', 'utf8');
const page = html.split('<!--page-->')[1].split('<!--/page-->')[0]
  .replace('<script type="application/json" id="atlas-inline"></script>',
           `<script type="application/json" id="atlas-inline">${JSON.stringify(JSON.parse(data)).replace(/</g, '\\u003c')}</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/settlement-map-canada.html', page.trim() + '\n');
console.log('dist/settlement-map-canada.html', (page.length / 1024).toFixed(1) + ' KB');
