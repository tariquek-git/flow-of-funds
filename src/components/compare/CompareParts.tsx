import type { FlowOfFunds } from "@/lib/schema/flow";
import { buildDiff, flowSteps } from "@/lib/compare/diff";
import { sourceProvenance } from "@/lib/export/exhibit";

/**
 * Server-rendered building blocks for /compare. Same warm, banker-grade register
 * as /learn (charcoal / muted / hairline / crimson tokens, gold for money legs).
 * No client JS: the interactive React Flow canvas is heavy and client-only, so v1
 * renders a COMPACT, correct STATIC representation of each flow (an ordered list
 * of the legs, money leg by message leg). Diagram fidelity is a follow-on; the
 * DIFF is the v1 value.
 */

const STEP_KIND: Record<"money" | "message" | "exception", { cls: string; label: string }> = {
  money: { cls: "bg-[#f7efd8] text-[#8a5e00] border-[#e8d9a8]", label: "money" },
  message: { cls: "bg-[#ede7da] text-[#6b6b66] border-[#e4dfd2]", label: "message" },
  exception: { cls: "bg-[#fbe9ec] text-[#a11930] border-[#f1c9d1]", label: "exception" },
};

function KindTag({ kind }: { kind: "money" | "message" | "exception" }) {
  const s = STEP_KIND[kind];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

/**
 * One flow rendered compactly: a title block (rails / currency / jurisdiction),
 * its narrative, then the ordered legs as a numbered sequence. This is the static
 * stand-in for the canvas; it is correct (every leg restated from the seed) and
 * cheap (zero client JS).
 */
export function FlowCard({ flow }: { flow: FlowOfFunds }) {
  const steps = flowSteps(flow);
  const prov = sourceProvenance(flow.metadata.source);
  const sub = [
    flow.metadata.primaryRails.join(" · "),
    flow.metadata.currencies.join("/"),
    flow.metadata.jurisdiction.join(" & "),
  ]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#e4dfd2] bg-white p-5">
      <h3 className="text-[16px] font-semibold leading-snug text-[#1c1c1c]">{flow.metadata.title}</h3>
      <p className="mt-1 text-[11.5px] font-medium text-[#8a857c]">{sub}</p>
      {flow.metadata.narrative ? (
        <p className="mt-3 text-[13px] leading-relaxed text-[#6b6b66]">{flow.metadata.narrative}</p>
      ) : null}

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a857c]">
        How it moves, step by step
      </p>
      <ol className="mt-2.5 space-y-2.5">
        {steps.map((s) => (
          <li key={`${s.n}-${s.label}`} className="flex gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1c1c1c] text-[10px] font-bold tabular-nums text-white">
              {s.n}
            </span>
            <div className="min-w-0">
              <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                <KindTag kind={s.kind} />
                <span className="text-[11px] font-medium text-[#1c1c1c]">
                  {s.from} <span aria-hidden className="text-[#b8b1a4]">→</span> {s.to}
                </span>
              </div>
              <p className="text-[12.5px] leading-snug text-[#1c1c1c]">{s.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#8a857c]">
                {s.rail}
                {s.timing ? ` · ${s.timing}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p
        className={`mt-4 rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
          prov.tone === "grounded"
            ? "border border-[#e8d9a8] bg-[#f7efd8]/60 text-[#7a5e1a]"
            : "border border-[#f1c9d1] bg-[#fbe9ec]/60 text-[#a11930]"
        }`}
      >
        {prov.short}
      </p>
    </div>
  );
}

/**
 * The DIFF table: every comparable attribute pulled from the two seeds' existing
 * structure, side by side, with the rows where they DIFFER highlighted. The two
 * column heads carry the rail titles. No new facts; buildDiff only restates seed
 * content.
 */
export function DiffTable({
  a,
  b,
  aTitle,
  bTitle,
}: {
  a: FlowOfFunds;
  b: FlowOfFunds;
  aTitle: string;
  bTitle: string;
}) {
  const rows = buildDiff(a, b);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4dfd2]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#fbf9f3]">
            <th className="w-[22%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a857c]">
              Attribute
            </th>
            <th className="px-4 py-3 text-[13px] font-semibold text-[#1c1c1c]">{aTitle}</th>
            <th className="px-4 py-3 text-[13px] font-semibold text-[#1c1c1c]">{bTitle}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={`border-t border-[#ede7da] align-top ${
                r.differs ? "bg-[#f7efd8]/45" : "bg-white"
              }`}
            >
              <th
                scope="row"
                className="px-4 py-3 text-[12.5px] font-medium text-[#1c1c1c]"
              >
                <span className="flex items-center gap-1.5">
                  {r.label}
                  {r.differs ? (
                    <span
                      className="inline-flex items-center rounded-full border border-[#e8d9a8] bg-[#f7efd8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#8a5e00]"
                      title="These rails differ on this attribute"
                    >
                      differs
                    </span>
                  ) : null}
                </span>
              </th>
              <td className="px-4 py-3 text-[12.5px] leading-relaxed text-[#1c1c1c]">{r.a}</td>
              <td className="px-4 py-3 text-[12.5px] leading-relaxed text-[#1c1c1c]">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
