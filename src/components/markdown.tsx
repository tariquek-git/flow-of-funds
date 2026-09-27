import type { ReactNode } from "react";

/**
 * Lightweight Markdown renderer for agent chat prose. Handles the subset the
 * system prompt is told to emit: blank-line paragraphs, ordered lists (`1.`),
 * unordered lists (`-` / `*`), and inline `**bold**`. Nothing else (no headings,
 * tables, code fences, or raw HTML).
 *
 * XSS-safe by construction: the model's text is only ever placed into React
 * text children — there is no dangerouslySetInnerHTML and no HTML is parsed, so
 * any "<script>" in the output renders as literal characters.
 */

/** Split a line into text + <strong> runs on **bold** markers. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${j}`} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const UNORDERED = /^\s*[-*]\s+(.*)$/;

/** Group raw lines into paragraph / ordered-list / unordered-list blocks. */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  // Normalise CRLF, then split on blank lines into chunks.
  const chunks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    let cur: Block | null = null;

    const flush = () => {
      if (cur) blocks.push(cur);
      cur = null;
    };

    for (const line of lines) {
      if (!line.trim()) continue;
      const ol = line.match(ORDERED);
      const ul = line.match(UNORDERED);
      if (ol) {
        if (cur?.kind !== "ol") {
          flush();
          cur = { kind: "ol", items: [] };
        }
        cur.items.push(ol[1]);
      } else if (ul) {
        if (cur?.kind !== "ul") {
          flush();
          cur = { kind: "ul", items: [] };
        }
        cur.items.push(ul[1]);
      } else {
        if (cur?.kind !== "p") {
          flush();
          cur = { kind: "p", lines: [] };
        }
        cur.lines.push(line.trim());
      }
    }
    flush();
  }

  return blocks;
}

export function renderText(text: string): ReactNode {
  const blocks = toBlocks(text);
  let first = true;

  return blocks.map((block, i) => {
    const spaced = first ? "" : "mt-2";
    first = false;

    if (block.kind === "ol") {
      return (
        <ol key={i} className={`${spaced} list-decimal space-y-1 pl-5 marker:text-slate-400`}>
          {block.items.map((item, k) => (
            <li key={k} className="pl-0.5">
              {renderInline(item, `${i}-${k}`)}
            </li>
          ))}
        </ol>
      );
    }

    if (block.kind === "ul") {
      return (
        <ul key={i} className={`${spaced} list-disc space-y-1 pl-5 marker:text-slate-400`}>
          {block.items.map((item, k) => (
            <li key={k} className="pl-0.5">
              {renderInline(item, `${i}-${k}`)}
            </li>
          ))}
        </ul>
      );
    }

    // Paragraph: join wrapped lines with spaces (single newlines aren't breaks).
    return (
      <p key={i} className={spaced}>
        {renderInline(block.lines.join(" "), `${i}`)}
      </p>
    );
  });
}
