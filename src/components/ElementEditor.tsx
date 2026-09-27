"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { KNOWN_RAILS, MESSAGE_STANDARDS, suggestTimings, TIMING_OPTIONS } from "@/lib/kb/rails";
import { EdgeTypeSchema, type FoFEdge, type FoFNode } from "@/lib/schema/flow";
import { elementProvenance } from "@/lib/export/exhibit";
import { useStudio } from "@/lib/state/store";
import { useIsMobile } from "@/lib/state/useIsMobile";
import { MobileSheet } from "./MobileSheet";
import { ProvenanceMarker, provenanceAria } from "./ProvenanceMarker";
import { GlossaryChips } from "./GlossaryChips";

/**
 * Direct-manipulation editor: click any node or edge and change every field
 * inline. Each commit goes through the same op vocabulary the agent uses
 * (update_node / update_edge), so undo works and the schema stays the law.
 */

const NODE_TYPES = ["endpoint", "institution", "intermediary", "treasury"] as const;
const DIRECTIONS = ["unidirectional", "bidirectional"] as const;

/** Normalize then compare before committing — no-op blurs must not touch
    the undo history. */
function changed(raw: string, current: string | undefined): { next?: string; dirty: boolean } {
  const v = raw.trim();
  const next = v === "" ? undefined : v;
  return { next, dirty: (next ?? "") !== (current ?? "") };
}
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") e.currentTarget.blur();
};

const fieldCls =
  // text-[16px] on mobile is load-bearing for safety, not just ergonomics: a
  // sub-16px input triggers iOS Safari auto-zoom on focus, which re-fires the
  // viewport resize → canvas refit loop. Desktop keeps the compact 12px.
  "w-full rounded-md border border-[#e4dfd2] bg-white px-2 py-1 text-[12px] text-[#1c1c1c] focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]/20 max-md:py-1.5 max-md:text-[16px]";
const labelCls = "mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-[#6b6b66]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

export function ElementEditor() {
  const flow = useStudio((s) => s.flow);
  const selected = useStudio((s) => s.selected);
  const select = useStudio((s) => s.select);
  const isMobile = useIsMobile();
  if (!flow || !selected) return null;
  const node = selected.kind === "node" ? flow.nodes.find((n) => n.id === selected.id) : null;
  const edge = selected.kind === "edge" ? flow.edges.find((e) => e.id === selected.id) : null;
  if (!node && !edge) return null;
  const body = (
    <>
      {node && <NodeEditor key={node.id} node={node} />}
      {edge && <EdgeEditor key={edge.id} edge={edge} />}
    </>
  );
  // Mobile: a bottom sheet — the canvas refits the tapped element into the top
  // band above it (see FlowCanvas selection y-bias). Desktop: the right-anchored
  // panel, clamped to the viewport so it never runs off the edge.
  if (isMobile) {
    return (
      <MobileSheet
        open
        onClose={() => select(null)}
        label={`Edit ${node ? "party" : "leg"}`}
        maxVh={62}
      >
        {body}
      </MobileSheet>
    );
  }
  return (
    <div className="absolute right-4 top-16 z-20 flex max-h-[calc(100%-96px)] w-[min(20rem,calc(100vw-2rem))] flex-col rounded-xl border border-[#e4dfd2] bg-white shadow-lg">
      {body}
    </div>
  );
}

function EditorShell({
  heading,
  kind,
  children,
}: {
  heading: string;
  kind: "node" | "edge";
  children: React.ReactNode;
}) {
  const select = useStudio((s) => s.select);
  const removeSelected = useStudio((s) => s.removeSelected);
  const send = useStudio((s) => s.send);
  const busy = useStudio((s) => s.busy);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <header className="flex items-start justify-between gap-2 border-b border-[#ede7da] px-3.5 py-2">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-[#6b6b66]">
            Edit {kind === "node" ? "party" : "leg"}
          </span>
          <span className="block truncate text-[12.5px] font-semibold leading-tight text-[#1c1c1c]">
            {heading}
          </span>
        </div>
        <button
          onClick={() => select(null)}
          title="Close editor (Esc)"
          className="-mr-1 mt-0.5 shrink-0 rounded-md p-1 text-[#8a857c] transition-colors hover:bg-[#ede7da] hover:text-[#1c1c1c]"
        >
          <X size={13} />
        </button>
      </header>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">{children}</div>
      <footer className="flex items-center gap-1.5 border-t border-[#ede7da] px-3.5 py-2.5">
        <button
          onClick={() => send(`Explain the ${kind} "${heading}" in this flow.`, "explain")}
          disabled={busy}
          className="flex-1 rounded-md bg-[#1c1c1c] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#a11930] disabled:opacity-40"
        >
          Explain with AI
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (confirmDelete) removeSelected();
            else {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 2500);
            }
          }}
          className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
            confirmDelete
              ? "border-[#C41E3A] bg-[#C41E3A] text-white"
              : "border-[#e4dfd2] text-[#C41E3A] hover:bg-[#C41E3A]/10"
          }`}
        >
          <Trash2 size={12} />
          {confirmDelete ? "Confirm" : "Delete"}
        </button>
      </footer>
    </>
  );
}

/** URL inside a source string, if any — so a cited footnote that mentions a link
    can be linkified the way the Sources tab does. (Most footnotes name a domain
    in parentheses rather than a full URL; this catches the explicit ones.) */
function firstUrl(text: string): string | undefined {
  return text.match(/https?:\/\/[^\s)]+/)?.[0];
}

/**
 * Provenance ROW — the tap-to-trust payoff, at the top of the node/edge editor.
 * Three honest tiers, in trust order, each in the brand's warm, easy-going voice:
 *   verified    → calm gold. A seed fact (optionally with a cited source).
 *   kb-grounded → amber-gold. An AI leg whose RAIL is documented in our knowledge
 *                 base. HONEST: the rail is sound, the AI drew this leg, so the
 *                 details still want a look. NOT an audited "Verified" stamp.
 *   inferred    → maple/amber caution. Beyond the knowledge base, so verify.
 * The confidence marker shows when known; the source links out (verified: the
 * footnote; kb-grounded: the KB doc's source). Warm palette only; no em dashes.
 */
function ProvenanceRow({ kind, id }: { kind: "node" | "edge"; id: string }) {
  const flow = useStudio((s) => s.flow);
  const prov = flow ? elementProvenance(flow, { kind, id }) : null;
  // The funnel's trust moment: this row appearing IS "provenance opened" — it
  // renders whenever an element is selected. Fired per element (kind+id), with
  // the trust tier so /admin can see WHICH provenance people actually inspect.
  const tier = prov?.kind;
  useEffect(() => {
    if (tier) track("provenance_opened", { kind, tier, surface: "editor" });
  }, [kind, id, tier]);
  if (!flow || !prov) return null;
  const verified = prov.kind === "verified";
  const grounded = prov.kind === "kb-grounded";
  const sourceText = prov.source?.text;
  // Short, easygoing name for inline prose (kb-grounded); the full title still
  // rides on the link/tooltip. Falls back to the full text when no label exists.
  const shortLabel = prov.source?.label ?? sourceText;
  const url = prov.source?.url ?? (sourceText ? firstUrl(sourceText) : undefined);

  // Honest headline per tier. For kb-grounded the RAIL is the grounded thing, not
  // the AI's leg — so the headline says so without sounding like a vouch.
  const headline = verified
    ? sourceText
      ? "Curated element · source linked"
      : "Curated template element"
    : grounded
      ? "Rail's in our knowledge base"
      : "AI's best guess, worth a look";

  // Warm, honest body copy. kb-grounded must make clear the AI wrote THIS leg;
  // inferred owns up that it went beyond what we have on file. (When grounded
  // has a doc, the body is rendered inline below so the short label can link.)
  const body = grounded
    ? shortLabel
      ? undefined
      : "The rail is in our knowledge base. The AI sketched this leg, so give the details a quick look."
    : !verified
      ? "This one's beyond our notes, so it's the AI's best guess. Give it a look before you lean on it."
      : "A fixed template supplied this element. That origin is not a claim-verification or human-review record.";

  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${
        verified
          ? "border-[#ead9ad] bg-[#faf4e4]"
          : grounded
            ? "border-[#e6c98f] bg-[#fbf2dc]"
            : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <ProvenanceMarker provenance={prov} size={13} className="shrink-0" />
        <span
          className={`text-[11px] font-semibold leading-tight ${
            verified ? "text-[#6f4a10]" : grounded ? "text-[#7a5310]" : "text-amber-900"
          }`}
        >
          {headline}
        </span>
        {prov.confidence && (
          <span
            className={`ml-auto rounded-sm px-1 py-px text-[9px] font-bold uppercase tracking-wide ${
              verified
                ? "bg-[#efe1b8] text-[#8a5e00]"
                : grounded
                  ? "bg-[#f0dcae] text-[#7a5310]"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {prov.confidence}
          </span>
        )}
      </div>
      {/* Verified-with-citation keeps the footnote as plain text and links only a
          short "source" anchor; kb-grounded weaves the short rail label into the
          body sentence and links it (full title on the tooltip); inferred is a
          plain caution. */}
      {verified && sourceText ? (
        <p className="mt-1 text-[10.5px] leading-snug text-[#6b6b66]">
          {sourceText}
          {url ? (
            <>
              {" "}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
              >
                source
              </a>
            </>
          ) : null}
        </p>
      ) : grounded && shortLabel ? (
        <p className="mt-1 text-[10.5px] leading-snug text-[#6b6b66]">
          Built on our{" "}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title={sourceText}
              className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
            >
              {shortLabel}
            </a>
          ) : (
            <span title={sourceText !== shortLabel ? sourceText : undefined}>{shortLabel}</span>
          )}{" "}
          notes. The AI sketched this leg, so give the details a quick look.
        </p>
      ) : body ? (
        <p className="mt-1 text-[10.5px] leading-snug text-[#6b6b66]">{body}</p>
      ) : null}
      <span className="sr-only">{provenanceAria(prov)}</span>
    </div>
  );
}

function NodeEditor({ node }: { node: FoFNode }) {
  const editNode = useStudio((s) => s.editNode);
  const flow = useStudio((s) => s.flow);
  const annotations =
    flow?.annotations?.filter((a) => a.targetType === "node" && a.targetId === node.id) ?? [];
  const commit = (patch: Record<string, unknown>) => editNode(node.id, patch);

  return (
    <EditorShell heading={node.label} kind="node">
      <ProvenanceRow kind="node" id={node.id} />
      <GlossaryChips element={node} />
      <Field label="Label">
        <input
          className={fieldCls}
          defaultValue={node.label}
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const c = changed(e.target.value, node.label);
            if (c.dirty && c.next) commit({ label: c.next });
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select
            className={fieldCls}
            defaultValue={node.type}
            onChange={(e) => commit({ type: e.target.value })}
          >
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jurisdiction">
          <select
            className={fieldCls}
            defaultValue={node.jurisdiction ?? ""}
            onChange={(e) => commit({ jurisdiction: e.target.value || undefined })}
          >
            <option value="">·</option>
            <option value="CA">CA</option>
            <option value="US">US</option>
            <option value="EU">EU</option>
            <option value="GB">GB</option>
            <option value="IN">IN</option>
            <option value="BR">BR</option>
          </select>
        </Field>
      </div>
      <Field label="Subtype (e.g. network, operator)">
        <input
          className={fieldCls}
          defaultValue={node.subtype ?? ""}
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const c = changed(e.target.value, node.subtype);
            if (c.dirty) commit({ subtype: c.next });
          }}
        />
      </Field>
      <Field label="Description">
        <textarea
          className={`${fieldCls} resize-none`}
          rows={3}
          defaultValue={node.description ?? ""}
          onBlur={(e) => {
            const c = changed(e.target.value, node.description);
            if (c.dirty) commit({ description: c.next });
          }}
        />
      </Field>
      <Field label="Regulators (comma-separated)">
        <input
          className={fieldCls}
          defaultValue={node.regulators?.join(", ") ?? ""}
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
            if (list.join("|") === (node.regulators ?? []).join("|")) return;
            commit({ regulators: list.length ? list : undefined });
          }}
        />
      </Field>
      <Field label="License / role of record">
        <input
          className={fieldCls}
          defaultValue={node.license ?? ""}
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const c = changed(e.target.value, node.license);
            if (c.dirty) commit({ license: c.next });
          }}
        />
      </Field>
      {annotations.map((a) => (
        <p
          key={a.id}
          className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${
            a.type === "warning" ? "bg-amber-50 text-amber-900" : "bg-[#ede7da] text-[#1c1c1c]"
          }`}
        >
          {a.text}
        </p>
      ))}
    </EditorShell>
  );
}

/**
 * Settlement timing as a dropdown that knows payments logic: typical options
 * for this leg first (an authorization is a real-time message; ACH settles
 * T+1/T+2; wires are same-day RTGS — see kb/rails.ts), the full taxonomy
 * below, and a Custom… escape hatch since the schema keeps timing free-form.
 */
function TimingField({
  edge,
  commit,
}: {
  edge: FoFEdge;
  commit: (patch: Record<string, unknown>) => void;
}) {
  const [custom, setCustom] = useState(false);
  const suggested = suggestTimings(edge.rail, edge.type);
  const rest = TIMING_OPTIONS.filter((t) => !suggested.includes(t));
  const isCustomValue = !!edge.timing && !TIMING_OPTIONS.includes(edge.timing);

  if (custom) {
    return (
      <Field label="Settlement timing">
        <input
          className={fieldCls}
          autoFocus
          defaultValue={edge.timing ?? ""}
          placeholder="e.g. T+1 net of interchange"
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const c = changed(e.target.value, edge.timing);
            if (c.dirty) commit({ timing: c.next });
            setCustom(false);
          }}
        />
      </Field>
    );
  }
  return (
    <Field label="Settlement timing">
      <select
        className={fieldCls}
        value={edge.timing ?? ""}
        onChange={(e) => {
          if (e.target.value === "__custom") {
            setCustom(true);
            return;
          }
          commit({ timing: e.target.value || undefined });
        }}
      >
        <option value="">·</option>
        {isCustomValue && <option value={edge.timing}>{edge.timing}</option>}
        {suggested.length > 0 && (
          <optgroup label={`Typical · ${edge.type} on ${edge.rail}`}>
            {suggested.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={suggested.length ? "All timings" : "Timings"}>
          {rest.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </optgroup>
        <option value="__custom">Custom…</option>
      </select>
    </Field>
  );
}

function EdgeEditor({ edge }: { edge: FoFEdge }) {
  const editEdge = useStudio((s) => s.editEdge);
  const detail = useStudio((s) => s.detail);
  const flow = useStudio((s) => s.flow);
  const annotations =
    flow?.annotations?.filter((a) => a.targetType === "edge" && a.targetId === edge.id) ?? [];
  const commit = (patch: Record<string, unknown>) => editEdge(edge.id, patch);

  return (
    <EditorShell heading={edge.label ?? edge.type} kind="edge">
      <ProvenanceRow kind="edge" id={edge.id} />
      <GlossaryChips element={edge} />
      <Field label="Label">
        <input
          className={fieldCls}
          defaultValue={edge.label ?? ""}
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const c = changed(e.target.value, edge.label);
            if (c.dirty) commit({ label: c.next });
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select
            className={fieldCls}
            defaultValue={edge.type}
            onChange={(e) => commit({ type: e.target.value })}
          >
            {EdgeTypeSchema.options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <select
            className={fieldCls}
            defaultValue={edge.currency}
            onChange={(e) => commit({ currency: e.target.value })}
          >
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rail">
          <input
            className={fieldCls}
            list="fof-rails"
            defaultValue={edge.rail}
            onKeyDown={blurOnEnter}
            onBlur={(e) => {
              const c = changed(e.target.value, edge.rail);
              if (c.dirty && c.next) commit({ rail: c.next });
            }}
          />
          <datalist id="fof-rails">
            {KNOWN_RAILS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        {/* Reordering is a Detailed/Expert operation: Simple's strip numbers
            steps by money-path position, which need not match the temporal
            ordinal this field edits — showing both side by side just contradicts
            the card the user clicked. */}
        {detail !== "overview" && (
          <Field label="Sequence #">
            <input
              className={fieldCls}
              type="number"
              min={0}
              defaultValue={edge.ordinal ?? ""}
              onKeyDown={blurOnEnter}
              onBlur={(e) => {
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                if (v !== edge.ordinal) commit({ ordinal: v });
              }}
            />
          </Field>
        )}
      </div>
      <TimingField edge={edge} commit={commit} />
      <Field label="Message standard">
        <input
          className={fieldCls}
          list="fof-standards"
          defaultValue={edge.messageStandard ?? ""}
          placeholder="ISO 20022, Nacha WEB, MT103…"
          onKeyDown={blurOnEnter}
          onBlur={(e) => {
            const c = changed(e.target.value, edge.messageStandard);
            if (c.dirty) commit({ messageStandard: c.next });
          }}
        />
        <datalist id="fof-standards">
          {MESSAGE_STANDARDS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <Field label="Direction">
        <select
          className={fieldCls}
          defaultValue={edge.direction}
          onChange={(e) => commit({ direction: e.target.value })}
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea
          className={`${fieldCls} resize-none`}
          rows={2}
          defaultValue={edge.description ?? ""}
          onBlur={(e) => {
            const c = changed(e.target.value, edge.description);
            if (c.dirty) commit({ description: c.next });
          }}
        />
      </Field>
      {annotations.map((a) => (
        <p
          key={a.id}
          className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${
            a.type === "warning" ? "bg-amber-50 text-amber-900" : "bg-[#ede7da] text-[#1c1c1c]"
          }`}
        >
          {a.text}
        </p>
      ))}
    </EditorShell>
  );
}
