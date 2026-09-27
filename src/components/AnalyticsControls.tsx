"use client";

/**
 * Shared analytics controls for the /admin dashboard: date range selector,
 * event type filter, and refresh button. Inserted into the Overview tab
 * and Clicks tab header area so filters persist across tabs.
 *
 * Emits `analytics_filter_changed` and `analytics_refreshed` events so you
 * can see filter-usage patterns in the Clicks tab itself.
 */

import { useCallback } from "react";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";

export type DatePreset = "7d" | "14d" | "30d" | "all" | "custom";
export type AnalyticsControlsState = {
  datePreset: DatePreset;
  since: string | null; // ISO timestamp or null for "all time"
  eventFilter: string | null; // event name or null for "all events"
};

// Preset → ISO timestamp helper. Returns null for "all".
function presetSince(preset: DatePreset): string | null {
  const now = Date.now();
  switch (preset) {
    case "7d":
      return new Date(now - 7 * 86400_000).toISOString();
    case "14d":
      return new Date(now - 14 * 86400_000).toISOString();
    case "30d":
      return new Date(now - 30 * 86400_000).toISOString();
    case "all":
    case "custom": // caller handles custom via the customSince field
      return null;
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  all: "All time",
  custom: "Custom",
};

// The known event names (from the shared list), plus "all".
const EVENT_NAMES = [...ANALYTICS_EVENTS].filter((e) => e !== "agent_turn" && !e.startsWith("admin_"));

export function AnalyticsControls({
  state,
  onChange,
  onRefresh,
  loading,
}: {
  state: AnalyticsControlsState;
  onChange: (next: AnalyticsControlsState) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const { datePreset, eventFilter } = state;

  const changePreset = useCallback(
    (preset: DatePreset) => {
      const newSince = presetSince(preset);
      track("analytics_filter_changed", { preset, since: newSince ?? "all" });
      onChange({ ...state, datePreset: preset, since: newSince });
    },
    [state, onChange],
  );

  const changeEvent = useCallback(
    (e: string | null) => {
      track("analytics_filter_changed", { event: e ?? "all" });
      onChange({ ...state, eventFilter: e });
    },
    [state, onChange],
  );

  const handleRefresh = useCallback(() => {
    track("analytics_refreshed", { preset: datePreset, event: eventFilter ?? "all" });
    onRefresh();
  }, [datePreset, eventFilter, onRefresh]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e4dfd2] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgba(28,28,28,0.04)]">
      {/* Date presets */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
          Period
        </span>
        {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => {
          if (preset === "custom") return null; // skip custom for now
          const active = datePreset === preset;
          return (
            <button
              key={preset}
              onClick={() => changePreset(preset)}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                active
                  ? "bg-[#1c1c1c] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#1c1c1c]"
              }`}
            >
              {PRESET_LABELS[preset]}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <span className="hidden h-4 w-px bg-[#e4dfd2] sm:inline-block" />

      {/* Event type filter (Clicks tab context) */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
          Event
        </span>
        <select
          value={eventFilter ?? ""}
          onChange={(e) => changeEvent(e.target.value || null)}
          className="rounded-lg border border-[#e4dfd2] bg-white px-2 py-1 text-[11.5px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1c1c1c]/20"
        >
          <option value="">All events</option>
          {EVENT_NAMES.map((name) => (
            <option key={name} value={name}>
              {name.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="ml-auto rounded-lg border border-[#e4dfd2] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        {loading ? "…" : "Refresh"}
      </button>
    </div>
  );
}

/**
 * Build a URL query string from the controls state. Returns a Record suitable
 * for URLSearchParams. Omits defaults (null) to keep URLs clean.
 */
export function controlParams(
  state: AnalyticsControlsState,
  extra?: Record<string, string>,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.since) params.since = state.since;
  if (state.eventFilter) params.event = state.eventFilter;
  // Also always pass the preset as a hint for the UI
  if (state.datePreset !== "all") params.preset = state.datePreset;
  return { ...params, ...extra };
}
