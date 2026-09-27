// Single source of truth for the named analytics events. Imported by BOTH the
// client analytics bridge (analytics.ts → PostHog/GA) and the server-side
// /api/event allow-list, so the two can never drift (they had: landing_submit
// and first_flow_rendered were silently 400'd by the route's hand-kept copy).
//
// Kept dependency-free on purpose — the server route must not pull the browser
// posthog-js bundle that analytics.ts imports.
export const ANALYTICS_EVENTS = [
  "agent_turn",
  "seed_loaded",
  "seed_deeplink",
  "flow_saved",
  "flows_cleared",
  "feedback_sent",
  "detail_changed",
  "reader_mode_changed",
  "view_mode_changed",
  "export_exhibit",
  "export_mermaid",
  "export_json",
  "studio_entered",
  // Top-of-funnel denominator: fired once when the landing mounts, so /admin can
  // compute activation (landing_submit / landing_view) and new-vs-returning.
  "landing_view",
  "landing_submit",
  "first_flow_rendered",
  // A usable, settled flow, distinct from the first streamed node appearing.
  // result_type is reviewed_template or ai_generated; no prompt content.
  "flow_completed",
  "first_post_flow_action",
  // Guided walkthrough (spotlight each leg with its plain-English description):
  // fired on start — the signal for whether the simplification earns its spot.
  "walkthrough_started",
  // Sharing is the beta growth mechanic — someone copied a permalink to a flow.
  "flow_link_copied",
  "shared_flow_viewed",
  "shared_flow_opened",
  // The trust moment: someone opened provenance for an element (the editor's
  // provenance row renders on selection) or the Info popover's Sources tab.
  // This was the ONE missing link in the audit's proposed funnel (landing →
  // submit → first flow → provenance opened → helpful → save/share) — every
  // other step already had a wired event.
  "provenance_opened",
  "trust_receipt_opened",
  "flow_rated",
  "flow_rated_note",
  // One-click post-generation self-check. Props stay content-free (only the
  // deterministic count of items that need review).
  "flow_qa_started",
  // Admin analytics-controls events
  "admin_viewed",
  "analytics_filter_changed",
  "analytics_export_csv",
  "analytics_export_json",
  "analytics_refreshed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
