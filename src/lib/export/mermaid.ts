import type { FlowOfFunds } from "@/lib/schema/flow";

function clean(value: string): string {
  return value
    .replace(/["<>]/g, "")
    .replace(/[|]/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

export function toMermaid(flow: FlowOfFunds): string {
  const lines = ["flowchart LR"];
  // Free-form node ids (spaces, brackets, pipes) would inject statements into
  // the Mermaid grammar — emit positional safe ids instead, mapped from the
  // real ids so node and edge lines always agree.
  const safeIds = new Map<string, string>();
  const sid = (id: string): string => {
    let safe = safeIds.get(id);
    if (!safe) {
      safe = `n${safeIds.size}`;
      safeIds.set(id, safe);
    }
    return safe;
  };
  for (const n of flow.nodes) {
    lines.push(`  ${sid(n.id)}["${clean(n.label)}"]`);
  }
  for (const e of [...flow.edges].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))) {
    const label = clean(`${e.label ?? e.type} (${e.rail}, ${e.currency})`);
    const arrow = e.direction === "bidirectional" ? "<-->" : "-->";
    lines.push(`  ${sid(e.source)} ${arrow}|${label}| ${sid(e.target)}`);
  }
  return lines.join("\n");
}
