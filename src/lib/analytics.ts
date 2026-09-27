import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import { isOptedOut } from "./analytics-optout";

// Product-analytics bridge. PostHog and Google Analytics are both driven from
// the same call sites (see `track` below + the AnalyticsProvider for pageviews).
// Everything here is a no-op unless the matching NEXT_PUBLIC_* env vars are set,
// so the integration is safe to ship before any keys are provisioned.

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const posthogEnabled = Boolean(POSTHOG_KEY);
export const gaEnabled = Boolean(GA_MEASUREMENT_ID);
export const analyticsEnabled = posthogEnabled || gaEnabled;

// Domain events worth a named capture. PostHog autocapture already records raw
// clicks; these add the high-signal product moments. The list lives in the
// dependency-free analytics-events module so the server /api/event allow-list can
// share it (re-exported here for back-compat with existing import sites).
import type { AnalyticsEvent } from "./analytics-events";
export { ANALYTICS_EVENTS } from "./analytics-events";
export type { AnalyticsEvent };

type Props = Record<string, string | number | boolean | null | undefined>;

let posthogReady = false;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Privacy scrubber applied to EVERY PostHog event before it leaves the browser.
// PostHog Error Tracking is our single error pipeline (capture_exceptions below) —
// there is no Sentry — so this is the one place exception content gets redacted.
//   1. Strip query strings from any URL property: a handed-off payment scenario
//      can ride in ?q= (the root-layout sanitizer already lifts it, but this is a
//      hard guard so it can never reach analytics on ANY event).
//   2. For $exception events, redact the human-readable message/value (which can
//      embed prompt or flow fragments) while KEEPING the error type and stack
//      shape (file / line / function) — enough to debug, nothing to leak.
function scrubAnalyticsEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const p = event.properties;
  if (p) {
    for (const key of ["$current_url", "$referrer"] as const) {
      const v = p[key];
      if (typeof v === "string" && v.includes("?")) p[key] = v.split("?")[0];
    }
    if (event.event === "$exception") {
      if (typeof p.$exception_message === "string") p.$exception_message = "[redacted]";
      if (Array.isArray(p.$exception_list)) {
        for (const ex of p.$exception_list) {
          if (ex && typeof ex === "object" && typeof ex.value === "string") {
            ex.value = "[redacted]"; // keep ex.type + ex.stacktrace frames
          }
        }
      }
    }
  }
  return event;
}

export function initAnalytics() {
  if (typeof window === "undefined" || !posthogEnabled || posthogReady) return;
  // Opted-out browser: never init PostHog at all — no capture, no pageleave, no
  // exception capture, and crucially no session replay.
  if (isOptedOut()) return;

  posthog.init(POSTHOG_KEY as string, {
    api_host: POSTHOG_HOST,
    defaults: "2026-01-30",
    before_send: scrubAnalyticsEvent,
    capture_pageview: false, // captured manually on route change (URL sanitized)
    capture_pageleave: true,
    // Privacy: users type sensitive payment scenarios here. Don't autocapture raw
    // DOM interactions/text — we emit explicit, content-free domain events
    // (agent_turn, seed_loaded, …) instead. Mask any input the SDK does read.
    autocapture: false,
    // Session replay is OFF. maskAllInputs only masks <input>/<textarea> — but a
    // visitor's payment scenario is echoed back as plain DOM text (chat bubbles,
    // diagram node labels), which replay WOULD film despite the mask. On a public
    // 800-person share that contradicts the "nothing private" heads-up, so we
    // don't record video at all. "How people use the tool" is still fully covered
    // by the content-free domain events (agent_turn with outcome/latency,
    // landing_view, funnel) plus the server-side conversation log. Re-enabling
    // replay later would require maskTextSelector:'*' (mask ALL text), not just
    // inputs.
    disable_session_recording: true,
    mask_all_element_attributes: true,
    person_profiles: "identified_only",
    // Feature flags remain available through the SDK.
    // Error tracking: auto-capture unhandled exceptions + promise rejections as
    // $exception events — basic error monitoring without a separate Sentry DSN.
    // Exception payloads are scrubbed content-free (see before_send) and
    // autocapture is OFF. (Session replay is OFF — see the block above.)
    capture_exceptions: true,
    // Privacy: the privacy page promises cookieless analytics. Keep PostHog's
    // distinct id in memory only — no cookie, no localStorage — so each page load
    // is an anonymous visit rather than a tracked browser.
    persistence: "memory",
  });
  posthogReady = true;
}

export function capturePageview(url?: string) {
  if (!posthogReady || isOptedOut()) return;
  // Never send a query string to analytics — a handed-off payment scenario can
  // ride in ?q= / ?next=. Send origin + path only.
  let clean: string | undefined;
  if (url) {
    try {
      const u = new URL(url);
      clean = u.origin + u.pathname;
    } catch {
      clean = undefined;
    }
  }
  posthog.capture("$pageview", clean ? { $current_url: clean } : undefined);
}

// Per-tab anonymous session id. Mint it on the first analytics event, which is
// normally landing_view, so the public journey can be joined end to end. The
// store uses the same key for AI conversations. It is never tied to a name,
// email, prompt, or account and disappears when the tab session ends.
const SESSION_ID_KEY = "fof-native-session-id-v1";
const FIRST_ACTION_KEY = "fof-native-first-post-flow-action-v1";
function readSessionId(): string | undefined {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const fresh = `s_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    return undefined;
  }
}

// Mirror named events into our OWN store (Supabase) so interactions show in
// /admin without a third-party dashboard. Content-free by contract: event name +
// small structured props only, never raw prompt text. Fire-and-forget with
// keepalive so an event fired during navigation still lands; never throws.
function logEventToStore(event: AnalyticsEvent, props?: Props) {
  try {
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, props: props ?? {}, sessionId: readSessionId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // swallow — analytics must never affect the app
  }
}

// Fan a domain event out to PostHog, Google Analytics, and our own store.
export function track(event: AnalyticsEvent, props?: Props) {
  if (typeof window === "undefined" || isOptedOut()) return;
  if (event === "flow_completed") {
    try {
      sessionStorage.removeItem(FIRST_ACTION_KEY);
    } catch {}
  }
  if (posthogReady) posthog.capture(event, props);
  if (gaEnabled && typeof window.gtag === "function") window.gtag("event", event, props ?? {});
  logEventToStore(event, props);
}

/** Record only the first meaningful action after the latest completed flow. */
export function trackFirstPostFlowAction(action: string) {
  if (typeof window === "undefined" || isOptedOut()) return;
  try {
    if (sessionStorage.getItem(FIRST_ACTION_KEY)) return;
    sessionStorage.setItem(FIRST_ACTION_KEY, action);
  } catch {
    // Storage can be blocked; a duplicate event is preferable to losing it.
  }
  track("first_post_flow_action", { action });
}
