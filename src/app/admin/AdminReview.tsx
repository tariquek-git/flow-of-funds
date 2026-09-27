"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { track, GA_MEASUREMENT_ID, posthogEnabled } from "@/lib/analytics";
import type { AnalyticsControlsState } from "@/components/AnalyticsControls";
import { AnalyticsControls } from "@/components/AnalyticsControls";

/**
 * Owner-only analytics dashboard for /admin. Read-only: it never edits or
 * deletes. Organized into four tabs:
 *
 *   Overview      — usage stat boxes, regions, runs-over-time, what's failing,
 *                   busiest hours (from /api/admin/stats).
 *   Conversations — every logged conversation, newest first, each row expands to
 *                   the full prompt / reply / flow; outcome filter, pagination,
 *                   CSV export (/api/admin/conversations).
 *   Feedback      — beta feedback submissions (/api/admin/feedback).
 *   Clicks        — content-free interaction events (/api/admin/events).
 *
 * Every endpoint is admin-cookie gated and returns calm `pending` empty states
 * until its backing RPC exists, so a missing store reads as "connecting" rather
 * than an error. Each tab loads its own data lazily the first time it's opened.
 */

const PAGE_SIZE = 50;

type Usage = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
};

type Geo = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
};

/** Resolve-then-discard visitor classification (see lib/visitor.ts) — the org/ASN
 *  is looked up from the request IP at write time and only the resolved name is
 *  stored; the IP itself never reaches this payload. */
type Visitor = {
  org?: string | null;
  asn?: string | null;
  isBot?: boolean;
};

/** The logged conversation payload (see fof.conversations). All fields optional
 *  on read — we never assume a row is well-formed. */
type Payload = {
  ts?: string;
  sessionId?: string | null;
  capability?: string;
  prompt?: string;
  responseText?: string;
  flow?: unknown;
  model?: string | null;
  usage?: Usage;
  usd?: number;
  outcome?: "success" | "error" | "aborted" | "refused";
  error?: string | null;
  geo?: Geo | null;
  visitor?: Visitor | null;
};

type Row = { id: string; created_at: string; payload: Payload };

type ApiResponse = {
  conversations: Row[];
  pending: boolean;
  limit: number;
  offset: number;
  hasMore?: boolean;
};

/** Aggregate usage stats from /api/admin/stats (fof_admin_stats RPC). All fields
 *  optional — never assume the shape is complete. */
type Stats = {
  total?: number;
  last24h?: number;
  by_outcome?: Record<string, number>;
  by_capability?: Record<string, number>;
  distinct_sessions?: number;
  top_countries?: { country: string; count: number }[];
  spend_total?: number;
  spend_by_day?: { day: string; usd: number }[];
  feedback_total?: number;
  first_run?: string | null;
  last_run?: string | null;
  by_day?: { day: string; runs?: number; success?: number; error?: number; refused?: number }[];
  by_hour?: { hour: number; runs?: number }[];
  failure_reasons?: { reason?: string; outcome?: string; count?: number }[];
};

/** A logged feedback submission. Payload mirrors the /api/feedback sink:
 *  { evt, at, sentiment, message, flowTitle, flowId, sessionId, flow, detail, path }. */
type FeedbackPayload = {
  at?: string;
  sentiment?: string | null;
  message?: string;
  flowTitle?: string | null;
  flowId?: string | null;
  sessionId?: string | null;
  flow?: unknown;
  lastPrompt?: string | null;
  detail?: string | null;
  path?: string | null;
};
type FeedbackRow = { id: string; created_at: string; payload: FeedbackPayload };

/** Interaction-event aggregate from /api/admin/events (fof_admin_events RPC). */
type EventStats = {
  total?: number;
  last24h?: number;
  by_event?: Record<string, number>;
  recent?: {
    created_at?: string;
    event?: string;
    sessionId?: string | null;
    props?: Record<string, string | number | boolean> | null;
  }[];
};

/** System + cost status from /api/admin/status. */
type SystemStatus = {
  provider?: string;
  fallbackProvider?: string | null;
  modelHeavy?: string | null;
  modelLight?: string | null;
  fallbackModelHeavy?: string | null;
  fallbackModelLight?: string | null;
  hasAiKey?: boolean;
  hasGate?: boolean;
  hasAdmin?: boolean;
  store?: string;
  dailyCapUsd?: number;
  spendTodayUsd?: number;
  pctOfCap?: number;
  overCap?: boolean;
  dataSecretInSync?: boolean | null;
  deepSeekSpendCapUsd?: number;
  deepSeekLowBalanceUsd?: number;
  deepSeekBalance?: {
    configured: boolean;
    ok: boolean;
    isAvailable: boolean | null;
    currency: string | null;
    totalBalanceUsd: number | null;
    grantedBalanceUsd: number | null;
    toppedUpBalanceUsd: number | null;
    lowBalance: boolean;
    overConfiguredCap: boolean;
    error: string | null;
  };
};

type TabKey = "overview" | "conversations" | "feedback" | "clicks" | "dailyAudit" | "system";
type OutcomeFilter = "all" | "failing" | "success" | "refused";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "conversations", label: "Conversations" },
  { key: "feedback", label: "Feedback" },
  { key: "clicks", label: "Clicks" },
  { key: "dailyAudit", label: "Daily Audit" },
  { key: "system", label: "System" },
];

const OUTCOME_STYLE: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  error: "bg-red-50 text-red-700 ring-red-200",
  aborted: "bg-amber-50 text-amber-700 ring-amber-200",
  refused: "bg-violet-50 text-violet-700 ring-violet-200",
  // Client agent_turn abort flavors (store.ts): skip-to-audited jump, a
  // deliberate user Stop, the silent-stream watchdog, and the spend-cap pause.
  // All abort family (amber) — keeping them out of the red error bucket is the
  // whole point of the split.
  skipped: "bg-amber-50 text-amber-700 ring-amber-200",
  stopped: "bg-amber-50 text-amber-700 ring-amber-200",
  stalled: "bg-amber-50 text-amber-700 ring-amber-200",
  paused: "bg-amber-50 text-amber-700 ring-amber-200",
};

function outcomeClass(outcome?: string): string {
  return OUTCOME_STYLE[outcome ?? ""] ?? "bg-slate-100 text-slate-600 ring-slate-200";
}

/** Bar fill per outcome — used by the runs-over-time chart and event/feedback
 *  accents. Kept in lockstep with OUTCOME_STYLE's hue family. */
const OUTCOME_FILL: Record<string, string> = {
  success: "#16a34a", // green-600
  error: "#dc2626", // red-600
  refused: "#7c3aed", // violet-600
};

function shortSession(id?: string | null): string {
  if (!id) return "–";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function fmtTime(ts?: string, fallback?: string): string {
  const raw = ts || fallback;
  if (!raw) return "–";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtUsd(usd?: number): string {
  if (typeof usd !== "number" || Number.isNaN(usd)) return "–";
  return usd < 0.01 && usd > 0 ? `<$0.01` : `$${usd.toFixed(usd < 1 ? 4 : 2)}`;
}

/** "feedback_sent" → "Feedback sent". Humanizes snake_case event/capability names. */
function humanize(name?: string | null): string {
  if (!name) return "–";
  const s = name.replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "–";
}

/** "Jun 14" from a YYYY-MM-DD day string (UTC-safe, no off-by-one). */
function shortDay(day?: string): string {
  if (!day) return "–";
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function geoLabel(geo?: Geo | null): string {
  if (!geo) return "";
  return [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
}

/** Small inline badge: resolved visitor org (bank/FI/CU/ISP name) when known,
 *  or a "bot" flag when the request looked automated. Neither is shown when
 *  there's nothing to say (unresolved org on a non-bot request). */
function VisitorBadge({ visitor }: { visitor?: Visitor | null }) {
  if (!visitor) return null;
  if (visitor.isBot) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
        bot
      </span>
    );
  }
  if (!visitor.org) return null;
  return (
    <span
      className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-200"
      title={visitor.asn ? `${visitor.asn} · ${visitor.org}` : visitor.org}
    >
      {visitor.org}
    </span>
  );
}

/** RFC-4180-ish CSV cell: wrap in quotes, double internal quotes. */
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: Row[]): void {
  const header = [
    "ts",
    "session",
    "capability",
    "outcome",
    "model",
    "usd",
    "country",
    "prompt",
    "responseText",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const p = r.payload ?? {};
    lines.push(
      [
        csvCell(p.ts || r.created_at),
        csvCell(p.sessionId ?? ""),
        csvCell(p.capability ?? ""),
        csvCell(p.outcome ?? ""),
        csvCell(p.model ?? ""),
        csvCell(typeof p.usd === "number" ? p.usd : ""),
        csvCell(p.geo?.country ?? ""),
        csvCell(p.prompt ?? ""),
        csvCell(p.responseText ?? ""),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fof-conversations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminReview() {
  const [tab, setTab] = useState<TabKey>("overview");
  // Cross-link: a feedback row can deep-link into that session's runs.
  const [sessionFilter, setSessionFilter] = useState<string | null>(null);
  const viewSession = useCallback((sid: string) => {
    setSessionFilter(sid);
    setTab("conversations");
  }, []);

  // Analytics controls (date range, event filter)
  const [controls, setControls] = useState<AnalyticsControlsState>(() => ({
    datePreset: "14d",
    since: new Date(Date.now() - 14 * 86400_000).toISOString(),
    eventFilter: null,
  }));

  // Stats power the Overview tab; loaded on mount (also feeds the Refresh button).
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async (since: string | null) => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      const url = `/api/admin/stats${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return; // calm: a 401/!ok just leaves the prior snapshot
      const data = (await res.json()) as { stats: Stats | null };
      setStats(data.stats ?? null);
    } catch {
      // swallow — Overview shows its own calm empty state
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadStats(controls.since));
    // Track admin view once
    track("admin_viewed", { tab: "overview" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatsRefresh = useCallback(() => {
    void loadStats(controls.since);
  }, [loadStats, controls.since]);

  // Out-of-sync guard: surface (loudly) when the admin DATA secret no longer
  // matches the stored hash — otherwise every panel reads empty with no signal,
  // which is exactly the failure that blanked this page before.
  const [secretSync, setSecretSync] = useState<boolean | null>(null);
  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await fetch("/api/admin/status", { cache: "no-store" });
        if (!res.ok) return;
        const s = (await res.json()) as { dataSecretInSync?: boolean | null };
        setSecretSync(s.dataSecretInSync ?? null);
      } catch {
        // calm — never raise the banner on a transient error
      }
    });
  }, []);

  return (
    <main className="mx-auto w-[min(1100px,calc(100vw-32px))] flex-1 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1c1c1c]">Admin</h1>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            Usage, conversations, feedback, and clicks for Flow of Funds. Read-only.
          </p>
        </div>
      </div>

      {secretSync === false && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] leading-relaxed text-red-800">
          <span className="font-semibold">Admin data secret out of sync.</span> The app&rsquo;s{" "}
          <code className="rounded bg-red-100 px-1 font-mono text-[11.5px]">FOF_ADMIN_SECRET</code>{" "}
          doesn&rsquo;t match the stored hash, so the panels below read empty even though your data is
          safe. Re-seed{" "}
          <code className="rounded bg-red-100 px-1 font-mono text-[11.5px]">
            fof.admin_config.secret_sha256
          </code>{" "}
          to{" "}
          <code className="rounded bg-red-100 px-1 font-mono text-[11.5px]">
            sha256(FOF_ADMIN_SECRET)
          </code>{" "}
          (see <code className="rounded bg-red-100 px-1 font-mono text-[11.5px]">supabase/README.md</code>)
          to restore it.
        </div>
      )}

      {/* Analytics controls bar: date range, event filter, refresh */}
      <div className="mt-4">
        <AnalyticsControls
          state={controls}
          onChange={setControls}
          onRefresh={handleStatsRefresh}
          loading={statsLoading}
        />
      </div>

      {/* Tab bar — navy active pill, matching the in-app sentiment/Info pills. */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="mt-5 flex flex-wrap gap-1.5 rounded-xl border border-[#e4dfd2] bg-white p-1"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active
                  ? "bg-[#1c1c1c] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#1c1c1c]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "overview" && <OverviewTab stats={stats} loading={statsLoading} />}
        {tab === "conversations" && (
          <ConversationsTab
            sessionFilter={sessionFilter}
            onClearSessionFilter={() => setSessionFilter(null)}
          />
        )}
        {tab === "feedback" && <FeedbackTab onViewSession={viewSession} />}
        {tab === "clicks" && <ClicksTab controls={controls} />}
        {tab === "dailyAudit" && <DailyAuditTab />}
        {tab === "system" && <SystemTab />}
      </div>
    </main>
  );
}

/* ───────────────────────── Daily Audit ───────────────────────── */

/** One row from fof.daily_audits — either a run summary or a flagged finding.
 *  See src/lib/agent/dailyAudit.ts for the two payload shapes. */
type AuditPayload = {
  kind?: "summary" | "finding";
  date?: string;
  checked?: number;
  schemaFailures?: number;
  flagged?: number;
  checkKind?: "schema" | "critique";
  conversationId?: string;
  reason?: string;
  prompt?: string;
  flowTitle?: string | null;
  /** True when the run hit its time budget and stopped before checking every
   *  eligible conversation — see dailyAudit.ts's TIME_BUDGET_MS. */
  truncated?: boolean;
  totalEligible?: number;
};
type AuditRow = { id: string; created_at: string; payload: AuditPayload };

/** Re-checks the last 24h of real, successful generations against schema
 *  validity and a lightweight AI critique — the "did Polaris get anything
 *  wrong today" view. Runs automatically once a day (Vercel Cron); this tab
 *  just reads what the last run(s) found. See dailyAudit.ts for the checks. */
function DailyAuditTab() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [pending, setPending] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/daily-audit", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { audits: AuditRow[]; pending: boolean };
      setRows(data.audits);
      setPending(data.pending);
    } catch {
      // calm empty state below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (loading || !rows) {
    return (
      <Panel>
        <EmptyState
          title={loading ? "Loading audit history…" : "No audit data yet"}
          body="Reading the last runs of the daily pressure test."
        />
      </Panel>
    );
  }

  if (pending || rows.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No audit runs yet"
          body="The daily pressure test runs once a day (Vercel Cron) and re-checks the prior 24h of real generations for schema issues and payments-accuracy problems. Nothing to show until it's run at least once."
        />
      </Panel>
    );
  }

  const summaries = rows.filter((r) => r.payload.kind === "summary");
  const findings = rows.filter((r) => r.payload.kind === "finding");
  const latest = summaries[0]?.payload;

  return (
    <div className="space-y-4">
      {latest && (
        <Panel>
          <PanelHeader title="Latest run" hint={fmtTime(summaries[0]?.created_at)} />
          {latest.truncated && (
            <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              Ran out of time, checked {latest.checked ?? 0} of {latest.totalEligible ?? "?"} eligible
              conversations before stopping. The rest weren&rsquo;t audited today.
            </div>
          )}
          <div className="grid grid-cols-3 divide-x divide-[#e4dfd2] px-4 py-3 text-center">
            <div>
              <div className="text-[20px] font-bold text-[#1c1c1c]">{latest.checked ?? 0}</div>
              <div className="text-[10.5px] font-medium text-slate-500">
                checked{latest.truncated ? ` / ${latest.totalEligible ?? "?"}` : ""}
              </div>
            </div>
            <div>
              <div
                className={`text-[20px] font-bold ${(latest.schemaFailures ?? 0) > 0 ? "text-red-600" : "text-[#1c1c1c]"}`}
              >
                {latest.schemaFailures ?? 0}
              </div>
              <div className="text-[10.5px] font-medium text-slate-500">schema failures</div>
            </div>
            <div>
              <div
                className={`text-[20px] font-bold ${(latest.flagged ?? 0) > 0 ? "text-amber-600" : "text-[#1c1c1c]"}`}
              >
                {latest.flagged ?? 0}
              </div>
              <div className="text-[10.5px] font-medium text-slate-500">flagged by critique</div>
            </div>
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Flagged items" hint={`${findings.length} total`} />
        {findings.length === 0 ? (
          <EmptyState
            title="Nothing flagged"
            body="Every checked generation from the latest run passed schema validation and the accuracy critique clean."
          />
        ) : (
          <div className="divide-y divide-[#e4dfd2]">
            {findings.map((f) => (
              <div key={f.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                      f.payload.checkKind === "schema"
                        ? "bg-red-50 text-red-700 ring-red-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                  >
                    {f.payload.checkKind === "schema" ? "Schema" : "Critique"}
                  </span>
                  <span className="text-[10.5px] font-medium text-slate-400">
                    {fmtTime(f.created_at)}
                  </span>
                </div>
                {f.payload.flowTitle && (
                  <p className="mt-1.5 text-[12.5px] font-semibold text-[#1c1c1c]">
                    {f.payload.flowTitle}
                  </p>
                )}
                <p className="mt-1 text-[12px] leading-snug text-slate-700">{f.payload.reason}</p>
                {f.payload.prompt && (
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    Prompt: {f.payload.prompt}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ───────────────────────── System & cost ───────────────────────── */

function SystemTab() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/status", { cache: "no-store" });
      if (!res.ok) return;
      setStatus((await res.json()) as SystemStatus);
    } catch {
      // calm empty state below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (!status) {
    return (
      <Panel>
        <EmptyState
          title={loading ? "Loading status…" : "Status unavailable"}
          body={
            loading
              ? "Reading provider, stores, and today's spend."
              : "Couldn't read system status. Reload and try again."
          }
        />
      </Panel>
    );
  }

  const cap = status.dailyCapUsd ?? 0;
  const spent = status.spendTodayUsd ?? 0;
  const pct = status.pctOfCap ?? 0;
  const warn = !status.overCap && pct >= 80;
  const barColor = status.overCap ? "#dc2626" : warn ? "#b45309" : "#16a34a";

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader title="AI spend today vs daily cap" hint="UTC day · the hard kill-switch" />
        <div className="px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-bold tabular-nums text-[#1c1c1c]">{fmtUsd(spent)}</span>
            <span className="text-[12.5px] text-slate-500">
              of {fmtUsd(cap)} cap · {pct}%
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="mt-2 text-[12px] font-medium" style={{ color: barColor }}>
            {status.overCap
              ? "Cap reached. Live generation is paused until the next UTC day. Templates + explain still work."
              : warn
                ? "Approaching the daily cap (heavy generation pauses at 100%)."
                : "Healthy, well under the daily cap."}
          </p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="System" hint="Live configuration" />
        <dl className="divide-y divide-[#e4dfd2]">
          <StatusRow label="AI provider" value={status.provider || "–"} />
          <StatusRow label="Fallback provider" value={status.fallbackProvider || "–"} />
          <StatusRow
            label="Model (heavy / light)"
            value={`${status.modelHeavy || "–"} / ${status.modelLight || "–"}`}
          />
          <StatusRow
            label="Fallback model (heavy / light)"
            value={`${status.fallbackModelHeavy || "–"} / ${status.fallbackModelLight || "–"}`}
          />
          <StatusRow label="AI key" ok={status.hasAiKey} value={status.hasAiKey ? "configured" : "missing"} />
          <StatusRow label="Tester gate" ok={status.hasGate} value={status.hasGate ? "enforced" : "open"} />
          <StatusRow label="Admin gate" ok={status.hasAdmin} value={status.hasAdmin ? "enabled" : "disabled"} />
          <StatusRow
            label="Distributed store"
            ok={status.store === "supabase" || status.store === "upstash"}
            value={status.store || "–"}
          />
        </dl>
      </Panel>

      <Panel>
        <PanelHeader title="DeepSeek fallback balance" hint="Provider-side prepaid ceiling" />
        <dl className="divide-y divide-[#e4dfd2]">
          <StatusRow
            label="Balance endpoint"
            ok={status.deepSeekBalance?.ok}
            value={status.deepSeekBalance?.ok ? "reachable" : status.deepSeekBalance?.error || "unavailable"}
          />
          <StatusRow
            label="Available balance"
            ok={status.deepSeekBalance?.isAvailable === true && !status.deepSeekBalance?.lowBalance}
            value={fmtUsd(status.deepSeekBalance?.totalBalanceUsd ?? undefined)}
          />
          <StatusRow label="Configured cap" value={fmtUsd(status.deepSeekSpendCapUsd)} />
          <StatusRow label="Low-balance alert" value={`≤ ${fmtUsd(status.deepSeekLowBalanceUsd)}`} />
          <StatusRow
            label="Auto top-up risk check"
            ok={!status.deepSeekBalance?.overConfiguredCap}
            value={
              status.deepSeekBalance?.overConfiguredCap
                ? "balance exceeds configured cap (check dashboard auto top-up)"
                : "balance at/below configured cap"
            }
          />
        </dl>
      </Panel>

      {/* Analytics / data health — live feed verification */}
      <Panel>
        <PanelHeader title="Analytics data health" hint="Are the tracking sinks receiving data?" />
        <dl className="divide-y divide-[#e4dfd2]">
          <StatusRow
            label="GA4 measurement ID"
            ok={!!GA_MEASUREMENT_ID}
            value={GA_MEASUREMENT_ID || "not configured"}
          />
          <StatusRow
            label="PostHog project key"
            ok={posthogEnabled}
            value={posthogEnabled ? "configured (client)" : "not configured"}
          />
          <StatusRow
            label="Vercel Web Analytics"
            ok={true}
            value="auto (Vercel Hobby)"
          />
          <StatusRow
            label="First-party event store"
            ok={status.store === "supabase"}
            value={status.store === "supabase" ? "Supabase (events + conversations)" : status.store || "none"}
          />
          <StatusRow
            label="Admin data secret"
            ok={status.dataSecretInSync !== false}
            value={
              status.dataSecretInSync === true
                ? "in sync"
                : status.dataSecretInSync === false
                  ? "OUT OF SYNC (panels will read empty)"
                  : "unknown (checking…)"
            }
          />
        </dl>
      </Panel>

      <button
        onClick={() => void load()}
        disabled={loading}
        className="rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        {loading ? "…" : "Refresh status"}
      </button>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-[12.5px] text-slate-500">{label}</dt>
      <dd className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1c1c1c]">
        {typeof ok === "boolean" && (
          <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
        )}
        {value}
      </dd>
    </div>
  );
}

/* ───────────────────────── Overview ───────────────────────── */

function OverviewTab({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (!stats) {
    return (
      <Panel>
        <EmptyState
          title={loading ? "Loading usage…" : "No usage yet"}
          body={
            loading
              ? "Pulling the latest aggregate from the store."
              : "Connecting to the usage store. Stats appear here once runs are logged."
          }
        />
      </Panel>
    );
  }

  const total = stats.total ?? 0;
  const oc = stats.by_outcome ?? {};
  const success = oc.success ?? 0;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
  const latest = stats.spend_by_day?.[0];
  const countries = (stats.top_countries ?? []).filter((c) => c.country && c.country !== "–");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatBox label="Runs" value={total} sub={`${stats.last24h ?? 0} in last 24h`} />
        <StatBox
          label="Success rate"
          value={`${successRate}%`}
          sub={
            <span className="flex flex-wrap gap-x-2">
              <span className="text-emerald-600">{success} ok</span>
              <span className="text-violet-600">{oc.refused ?? 0} refused</span>
              <span className="text-red-600">{oc.error ?? 0} error</span>
            </span>
          }
        />
        <StatBox label="Visitors" value={stats.distinct_sessions ?? 0} sub="distinct sessions" />
        <StatBox
          label="AI spend"
          value={fmtUsd(stats.spend_total)}
          sub={latest ? `${fmtUsd(latest.usd)} on ${latest.day}` : "no spend yet"}
        />
        <StatBox label="Feedback" value={stats.feedback_total ?? 0} sub="messages sent" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e4dfd2] bg-white px-3.5 py-2.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
          Top regions
        </span>
        {countries.length > 0 ? (
          countries.slice(0, 8).map((c) => (
            <span
              key={c.country}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-700"
            >
              <span className="font-semibold">{c.country}</span>
              <span className="text-slate-400">{c.count}</span>
            </span>
          ))
        ) : (
          <span className="text-[11.5px] text-slate-400">
            Collecting. New runs after this update are tagged with a coarse country/region.
          </span>
        )}
      </div>

      {/* What's failing — the headline of this tab. */}
      <FailureReasons reasons={stats.failure_reasons} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RunsOverTime byDay={stats.by_day} />
        <BusiestHours byHour={stats.by_hour} />
      </div>
    </div>
  );
}

function FailureReasons({ reasons }: { reasons?: Stats["failure_reasons"] }) {
  const list = (reasons ?? []).filter((r) => r && (r.count ?? 0) > 0);
  return (
    <Panel>
      <PanelHeader
        title="What's failing"
        hint="Errors and refusals, most frequent first"
      />
      {list.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">
          No failures recorded. Errors and refusals will rank here as they happen.
        </p>
      ) : (
        <ul className="divide-y divide-[#e4dfd2]">
          {list.slice(0, 12).map((r, i) => (
            <li
              key={`${r.outcome}-${r.reason}-${i}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span className="mt-0.5 inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-slate-100 px-1.5 text-[12px] font-bold tabular-nums text-[#1c1c1c]">
                {r.count ?? 0}
              </span>
              <span
                className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${outcomeClass(
                  r.outcome,
                )}`}
              >
                {r.outcome || "–"}
              </span>
              <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-slate-700">
                {r.reason || "Unspecified reason"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RunsOverTime({ byDay }: { byDay?: Stats["by_day"] }) {
  const days = (byDay ?? []).slice(-21);
  const max = Math.max(1, ...days.map((d) => d.runs ?? 0));

  return (
    <Panel>
      <PanelHeader title="Runs over time" hint="Stacked by outcome" />
      {days.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">No runs logged yet.</p>
      ) : (
        <div className="px-4 pb-3 pt-4">
          <div className="flex h-[120px] items-end gap-[3px]">
            {days.map((d) => {
              const runs = d.runs ?? 0;
              const ok = d.success ?? 0;
              const err = d.error ?? 0;
              const ref = d.refused ?? 0;
              const heightPct = (runs / max) * 100;
              return (
                <div
                  key={d.day}
                  className="group relative flex flex-1 flex-col justify-end"
                  style={{ height: "100%" }}
                  title={`${shortDay(d.day)} · ${runs} runs (${ok} ok / ${err} err / ${ref} refused)`}
                >
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-[3px]"
                    style={{ height: `${heightPct}%`, minHeight: runs > 0 ? 3 : 0 }}
                  >
                    <Seg value={ok} total={runs} color={OUTCOME_FILL.success} />
                    <Seg value={err} total={runs} color={OUTCOME_FILL.error} />
                    <Seg value={ref} total={runs} color={OUTCOME_FILL.refused} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
            <span>{shortDay(days[0]?.day)}</span>
            {days.length > 2 && <span>{shortDay(days[Math.floor(days.length / 2)]?.day)}</span>}
            <span>{shortDay(days[days.length - 1]?.day)}</span>
          </div>
          <Legend />
        </div>
      )}
    </Panel>
  );
}

/** One stacked segment of a day's bar. Renders nothing for zero so rounded
 *  corners stay clean. */
function Seg({ value, total, color }: { value: number; total: number; color: string }) {
  if (value <= 0 || total <= 0) return null;
  return <div style={{ height: `${(value / total) * 100}%`, backgroundColor: color }} />;
}

function Legend() {
  const items: [string, string][] = [
    ["Success", OUTCOME_FILL.success],
    ["Error", OUTCOME_FILL.error],
    ["Refused", OUTCOME_FILL.refused],
  ];
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-slate-500">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function BusiestHours({ byHour }: { byHour?: Stats["by_hour"] }) {
  // Normalize to a fixed 0..23 array so every hour has a bar even if absent.
  const map = new Map<number, number>();
  for (const h of byHour ?? []) {
    if (typeof h?.hour === "number") map.set(h.hour, h.runs ?? 0);
  }
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, runs: map.get(i) ?? 0 }));
  const max = Math.max(1, ...hours.map((h) => h.runs));
  const any = hours.some((h) => h.runs > 0);

  return (
    <Panel>
      <PanelHeader title="Busiest hours" hint="Runs by hour of day (local)" />
      {!any ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">No runs logged yet.</p>
      ) : (
        <div className="px-4 pb-3 pt-4">
          <div className="flex h-[120px] items-end gap-[2px]">
            {hours.map((h) => (
              <div
                key={h.hour}
                className="flex flex-1 flex-col justify-end"
                style={{ height: "100%" }}
                title={`${String(h.hour).padStart(2, "0")}:00 · ${h.runs} runs`}
              >
                <div
                  className="w-full rounded-[2px] bg-[#1c1c1c]"
                  style={{ height: `${(h.runs / max) * 100}%`, minHeight: h.runs > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ─────────────────────── Conversations ─────────────────────── */

const FILTERS: { key: OutcomeFilter; label: string; outcome: string | null }[] = [
  { key: "all", label: "All", outcome: null },
  { key: "failing", label: "Failing", outcome: "error,refused" },
  { key: "success", label: "Success", outcome: "success" },
  { key: "refused", label: "Refused", outcome: "refused" },
];

function ConversationsTab({
  sessionFilter,
  onClearSessionFilter,
}: {
  sessionFilter?: string | null;
  onClearSessionFilter?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<OutcomeFilter>("all");

  const load = useCallback(async (nextOffset: number, f: OutcomeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const outcome = FILTERS.find((x) => x.key === f)?.outcome;
      const params = new URLSearchParams();
      if (sessionFilter) {
        // Server-side: the session RPC returns this session's FULL run history,
        // unbounded by the global pagination window.
        params.set("session", sessionFilter);
      } else {
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(nextOffset));
        if (outcome) params.set("outcome", outcome);
      }
      const res = await fetch(`/api/admin/conversations?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Session expired. Reload and sign in again.");
        return;
      }
      if (!res.ok) {
        setError(`Couldn't load conversations (${res.status}).`);
        return;
      }
      const data = (await res.json()) as ApiResponse;
      setRows(Array.isArray(data.conversations) ? data.conversations : []);
      setPending(!!data.pending);
      setHasMore(!!data.hasMore);
      setOffset(nextOffset);
      setExpanded(new Set());
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [sessionFilter]);

  useEffect(() => {
    queueMicrotask(() => void load(0, "all"));
  }, [load]);

  const changeFilter = (f: OutcomeFilter) => {
    setFilter(f);
    void load(0, f); // reset offset to 0 on filter change
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageLabel = useMemo(() => {
    if (rows.length === 0) return "";
    return `${offset + 1}–${offset + rows.length}`;
  }, [offset, rows.length]);

  // Session mode is filtered server-side, so the rows returned ARE this session's
  // runs — no client-side narrowing needed.
  const displayRows = rows;

  return (
    <div>
      {sessionFilter && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#1c1c1c]/15 bg-[#1c1c1c]/[0.03] px-3.5 py-2 text-[12px]">
          <span className="font-semibold text-[#1c1c1c]">Runs for session</span>
          <span className="font-mono text-[11.5px] text-slate-600">{sessionFilter}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">
            {rows.length} run{rows.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => onClearSessionFilter?.()}
            className="ml-auto rounded-lg border border-[#e4dfd2] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear filter
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`flex flex-wrap gap-1 ${sessionFilter ? "pointer-events-none opacity-40" : ""}`}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => changeFilter(f.key)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                  active
                    ? "border-[#1c1c1c] bg-[#1c1c1c] text-white"
                    : "border-[#e4dfd2] text-slate-600 hover:border-[#e4dfd2] hover:text-[#1c1c1c]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(displayRows)}
            disabled={displayRows.length === 0}
            className="rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1c1c1c] hover:bg-slate-50 disabled:opacity-30"
          >
            Download CSV
          </button>
          <button
            onClick={() => void load(offset, filter)}
            disabled={loading}
            className="rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#e4dfd2] bg-white shadow-[0_8px_30px_rgba(28,28,28,0.06)]">
        {/* Header row */}
        <div className="hidden grid-cols-[120px_90px_1fr_90px_140px_80px] gap-3 border-b border-[#e4dfd2] bg-slate-50/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Time</span>
          <span>Session</span>
          <span>Capability</span>
          <span>Outcome</span>
          <span>Model</span>
          <span className="text-right">Cost</span>
        </div>

        {error && (
          <div className="px-4 py-10 text-center text-[13px] font-medium text-red-700">{error}</div>
        )}

        {!error && loading && displayRows.length === 0 && (
          <div className="px-4 py-12 text-center text-[13px] text-slate-500">Loading…</div>
        )}

        {!error && !loading && displayRows.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-[14px] font-semibold text-[#1c1c1c]">
              {sessionFilter
                ? "No runs found for this session"
                : pending
                  ? "No conversations yet"
                  : filter === "all"
                    ? "Nothing logged yet"
                    : "No matching conversations"}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-slate-500">
              {sessionFilter
                ? "No conversation runs are logged for this session. The feedback may have been sent on a template or without a matching run. The diagram snapshot on the feedback card is the source of truth."
                : pending
                  ? "Connecting to the conversation store. Logged conversations will appear here as soon as the store is ready."
                  : filter === "all"
                    ? "Once people use the tool, their conversations will show up here, newest first."
                    : "No conversations match this filter. Try a different outcome."}
            </p>
          </div>
        )}

        {!error &&
          displayRows.map((r) => {
            const p = r.payload ?? {};
            const isOpen = expanded.has(r.id);
            const country = p.geo?.country;
            return (
              <div key={r.id} className="border-b border-[#e4dfd2] last:border-b-0">
                <button
                  onClick={() => toggle(r.id)}
                  className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left hover:bg-slate-50/70 md:grid-cols-[120px_90px_1fr_90px_140px_80px] md:items-center md:gap-3"
                >
                  <span className="text-[12px] font-medium text-slate-700">
                    {fmtTime(p.ts, r.created_at)}
                  </span>
                  <span className="flex items-center gap-1.5 truncate" title={geoLabel(p.geo) || p.sessionId || undefined}>
                    <span className="font-mono text-[11px] text-slate-500">
                      {shortSession(p.sessionId)}
                    </span>
                    {country && (
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                        {country}
                      </span>
                    )}
                    <VisitorBadge visitor={p.visitor} />
                  </span>
                  <span className="truncate text-[12.5px] text-slate-800">
                    <span className="font-medium">{p.capability || "–"}</span>
                    {p.prompt && (
                      <span className="ml-2 text-slate-400">
                        {p.prompt.length > 80 ? `${p.prompt.slice(0, 80)}…` : p.prompt}
                      </span>
                    )}
                  </span>
                  <span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${outcomeClass(
                        p.outcome,
                      )}`}
                    >
                      {p.outcome || "–"}
                    </span>
                  </span>
                  <span
                    className="truncate text-[11.5px] text-slate-500"
                    title={p.model ?? undefined}
                  >
                    {p.model || "–"}
                  </span>
                  <span className="text-[12px] font-medium text-slate-700 md:text-right">
                    {fmtUsd(p.usd)}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-4 bg-slate-50/40 px-4 py-4 text-[13px]">
                    <Field label="Prompt">
                      <pre className="whitespace-pre-wrap break-words font-sans text-slate-800">
                        {p.prompt || "–"}
                      </pre>
                    </Field>
                    <Field label="AI reply">
                      <pre className="whitespace-pre-wrap break-words font-sans text-slate-800">
                        {p.responseText || "–"}
                      </pre>
                    </Field>
                    {p.error && (
                      <Field label="Error / reason">
                        <pre className="whitespace-pre-wrap break-words font-sans text-red-700">
                          {p.error}
                        </pre>
                      </Field>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] text-slate-500">
                      <span>
                        Session:{" "}
                        <span className="font-mono text-slate-700">{p.sessionId || "–"}</span>
                      </span>
                      {geoLabel(p.geo) && (
                        <span>
                          Location: <span className="text-slate-700">{geoLabel(p.geo)}</span>
                        </span>
                      )}
                      {(p.visitor?.org || p.visitor?.isBot) && (
                        <span>
                          Visitor: <VisitorBadge visitor={p.visitor} />
                        </span>
                      )}
                      {p.usage && (
                        <span>
                          Tokens: in {p.usage.input ?? 0} / out {p.usage.output ?? 0}
                          {(p.usage.cacheRead || p.usage.cacheWrite) &&
                            ` / cache r${p.usage.cacheRead ?? 0} w${p.usage.cacheWrite ?? 0}`}
                        </span>
                      )}
                    </div>
                    <Field label="Flow">
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[#e4dfd2] bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-700">
                        {p.flow == null ? "–" : JSON.stringify(p.flow, null, 2)}
                      </pre>
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Pagination — hidden in session-cross-link mode (flat 200 fetch). */}
      {!sessionFilter && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[12px] text-slate-500">
          <span>Showing {pageLabel}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load(Math.max(0, offset - PAGE_SIZE), filter)}
              disabled={offset === 0 || loading}
              className="rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 font-semibold text-[#1c1c1c] hover:bg-slate-50 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => void load(offset + PAGE_SIZE, filter)}
              disabled={!hasMore || loading}
              className="rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 font-semibold text-[#1c1c1c] hover:bg-slate-50 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Feedback ───────────────────────── */

const SENTIMENT_STYLE: Record<string, string> = {
  wrong: "bg-red-50 text-red-700 ring-red-200",
  confusing: "bg-amber-50 text-amber-700 ring-amber-200",
  love: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const SENTIMENT_LABEL: Record<string, string> = {
  wrong: "Looks wrong",
  confusing: "Confusing",
  love: "Love it",
};

function FeedbackTab({ onViewSession }: { onViewSession?: (sessionId: string) => void }) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFlow, setOpenFlow] = useState<Set<string>>(new Set());
  const toggleFlow = (id: string) =>
    setOpenFlow((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feedback?limit=50&offset=0", { cache: "no-store" });
      if (res.status === 401) {
        setError("Session expired. Reload and sign in again.");
        return;
      }
      if (!res.ok) {
        setError(`Couldn't load feedback (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { feedback?: FeedbackRow[] };
      setRows(Array.isArray(data.feedback) ? data.feedback : []);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-slate-500">
          What people typed into the in-app feedback box, newest first.
        </p>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <Panel className="mt-4">
          <p className="px-4 py-10 text-center text-[13px] font-medium text-red-700">{error}</p>
        </Panel>
      ) : loading && rows.length === 0 ? (
        <Panel className="mt-4">
          <p className="px-4 py-12 text-center text-[13px] text-slate-500">Loading…</p>
        </Panel>
      ) : rows.length === 0 ? (
        <Panel className="mt-4">
          <EmptyState
            title="No feedback yet"
            body="When someone sends a note from the in-app feedback box, it shows up here with the diagram and page they were on."
          />
        </Panel>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const p = r.payload ?? {};
            const sentiment = p.sentiment ?? undefined;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-[#e4dfd2] bg-white p-4 shadow-[0_4px_16px_rgba(28,28,28,0.04)]"
              >
                <div className="mb-2 flex items-center gap-2">
                  {sentiment && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${
                        SENTIMENT_STYLE[sentiment] ?? "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {SENTIMENT_LABEL[sentiment] ?? sentiment}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-medium text-slate-400">
                    {fmtTime(p.at, r.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-slate-800">
                  {p.message || "–"}
                </p>
                {p.lastPrompt && (
                  <p className="mt-2 rounded-lg bg-slate-50/70 px-2.5 py-1.5 text-[12px] leading-snug text-slate-600">
                    <span className="font-semibold text-slate-400">Prompt: </span>
                    <span className="italic">{p.lastPrompt}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#e4dfd2] pt-2.5 text-[11px] text-slate-500">
                  {p.flowTitle && (
                    <span>
                      Flow: <span className="text-slate-700">{p.flowTitle}</span>
                    </span>
                  )}
                  {p.detail && (
                    <span>
                      Detail: <span className="text-slate-700">{p.detail}</span>
                    </span>
                  )}
                  {p.path && (
                    <span>
                      Page: <span className="font-mono text-slate-700">{p.path}</span>
                    </span>
                  )}
                  {p.sessionId && (
                    <span>
                      Session:{" "}
                      <span className="font-mono text-slate-700">{shortSession(p.sessionId)}</span>
                    </span>
                  )}
                </div>

                {/* "What is happening where": open the exact diagram this was
                    about, and jump to that session's runs. */}
                {(p.flow != null || (p.sessionId && onViewSession)) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {p.flow != null && (
                      <button
                        onClick={() => toggleFlow(r.id)}
                        className="rounded-lg border border-[#e4dfd2] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#1c1c1c] hover:bg-slate-50"
                      >
                        {openFlow.has(r.id) ? "Hide diagram" : "View diagram"}
                      </button>
                    )}
                    {p.sessionId && onViewSession && (
                      <button
                        onClick={() => onViewSession(p.sessionId as string)}
                        className="rounded-lg border border-[#e4dfd2] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        View this session&rsquo;s runs →
                      </button>
                    )}
                  </div>
                )}

                {p.flow != null && openFlow.has(r.id) && (
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[#e4dfd2] bg-slate-50/60 p-2.5 font-mono text-[11px] leading-relaxed text-slate-700">
                    {JSON.stringify(p.flow, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Clicks ────────────────────────── */

function ClicksTab({ controls }: { controls: AnalyticsControlsState }) {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (since: string | null, event: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      if (event) params.set("event", event);
      const qs = params.toString();
      const url = `/api/admin/events${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 401) {
        setError("Session expired. Reload and sign in again.");
        return;
      }
      if (!res.ok) {
        setError(`Couldn't load events (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { stats: EventStats | null };
      setStats(data.stats ?? null);
      setLoaded(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load(controls.since, controls.eventFilter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.since, controls.eventFilter]);

  const byEvent = useMemo(() => {
    const entries = Object.entries(stats?.by_event ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    return entries;
  }, [stats]);
  const maxCount = Math.max(1, ...byEvent.map(([, n]) => n));
  const recent = stats?.recent ?? [];
  const hasData = (stats?.total ?? 0) > 0 || byEvent.length > 0 || recent.length > 0;

  if (error) {
    return (
      <Panel>
        <p className="px-4 py-10 text-center text-[13px] font-medium text-red-700">{error}</p>
      </Panel>
    );
  }

  if (loading && !loaded) {
    return (
      <Panel>
        <p className="px-4 py-12 text-center text-[13px] text-slate-500">Loading…</p>
      </Panel>
    );
  }

  if (!hasData) {
    return (
      <Panel>
        <EmptyState
          title="No clicks recorded yet"
          body="Interaction events (turns, saves, exports) appear here once the tracking build is live and people start using the tool."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatBox label="Total events" value={stats?.total ?? 0} sub="all time" />
        <StatBox label="Last 24h" value={stats?.last24h ?? 0} sub="events" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="By event" hint="Most frequent first" />
          {byEvent.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">No events yet.</p>
          ) : (
            <ul className="space-y-2 px-4 py-3.5">
              {byEvent.map(([name, count]) => (
                <li key={name}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="font-medium text-slate-700">{humanize(name)}</span>
                    <span className="tabular-nums font-semibold text-[#1c1c1c]">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1c1c1c]"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recent events" hint="Latest first" />
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">
              No recent events.
            </p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-[#e4dfd2] overflow-auto">
              {recent.slice(0, 50).map((e, i) => {
                const props = e.props ?? {};
                const propEntries = Object.entries(props).slice(0, 4);
                return (
                  <li key={`${e.created_at}-${i}`} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-slate-800">
                        {humanize(e.event)}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-slate-400">
                        {fmtTime(e.created_at)}
                      </span>
                    </div>
                    {(propEntries.length > 0 || e.sessionId) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
                        {e.sessionId && (
                          <span className="font-mono text-slate-400">
                            {shortSession(e.sessionId)}
                          </span>
                        )}
                        {propEntries.map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5"
                          >
                            <span className="text-slate-400">{k}</span>
                            <span className="font-medium text-slate-700">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ─────────────────────── Shared atoms ─────────────────────── */

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#e4dfd2] bg-white shadow-[0_8px_30px_rgba(28,28,28,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function PanelHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-[#e4dfd2] bg-slate-50/60 px-4 py-2.5">
      <h2 className="text-[12.5px] font-semibold text-[#1c1c1c]">{title}</h2>
      {hint && <span className="text-[10.5px] font-medium text-slate-400">{hint}</span>}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-[14px] font-semibold text-[#1c1c1c]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#e4dfd2] bg-white px-3.5 py-3 shadow-[0_4px_16px_rgba(28,28,28,0.04)]">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-[22px] font-bold leading-none tracking-tight text-[#1c1c1c]">
        {value}
      </div>
      {sub != null && <div className="mt-1.5 text-[11.5px] leading-tight text-slate-500">{sub}</div>}
    </div>
  );
}
