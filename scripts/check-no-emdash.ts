/**
 * Brand guard: NO em dashes (U+2014) in user-facing copy. Use comma / parentheses
 * / middot (·) instead. Runs in `pnpm test` and CI so the rule self-enforces.
 *
 * AST-based (TypeScript compiler API), not grep: it flags U+2014 ONLY inside string
 * literals, template literals, and JSX text — so code COMMENTS (//, block, JSDoc,
 * {/* *​/}) are structurally ignored, no regex guesswork. Scoped to user-facing
 * dirs; src/lib/agent is deliberately EXCLUDED (model-facing prompts are functional,
 * not brand copy, and editing them would shift model behavior / the golden hash).
 *
 * Run: pnpm check:nodash   (also part of `pnpm test`)
 */
import ts from "typescript";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

const EM = "—";
const DIRS = [
  "src/app",
  "src/components",
  "src/content",
  "src/lib/flows",
  "src/lib/kb",
  "src/lib/state", // store.ts carries user-facing chat/intro strings
  "src/lib/export", // exhibit.ts stamps user-facing text into the exported PNG
];
// agent/ = model-facing prompts (out of scope); never flag tests/specs.
const SKIP = /(^|[\\/])agent([\\/])|\.test\.|\.spec\./;

type Hit = { file: string; line: number; col: number; text: string };
const hits: Hit[] = [];

function walkFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walkFiles(p));
    else if ([".ts", ".tsx"].includes(extname(p)) && !SKIP.test(p)) out.push(p);
  }
  return out;
}

function checkFile(file: string) {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    )
      text = (node as ts.LiteralLikeNode).text;
    else if (ts.isJsxText(node)) text = node.text;
    if (text && text.includes(EM)) {
      const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      hits.push({ file, line: pos.line + 1, col: pos.character + 1, text: text.replace(/\s+/g, " ").trim().slice(0, 90) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

for (const d of DIRS) {
  try {
    walkFiles(d).forEach(checkFile);
  } catch {
    // dir may not exist in some checkouts; skip silently.
  }
}

if (hits.length) {
  console.error(
    `✗ ${hits.length} em dash(es) in user-facing copy (brand rule: no em dashes — use comma / parentheses / ·):`,
  );
  for (const h of hits) console.error(`  ${h.file}:${h.line}:${h.col}  ${h.text}`);
  process.exit(1);
}
console.log("✓ check:nodash — no em dashes in user-facing copy");
