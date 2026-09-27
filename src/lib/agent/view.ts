import type { StreamEvent } from "./types";

type ViewEvent = Extract<StreamEvent, { type: "view" }>;

const MODES = new Set(["story", "system"]);
const LEGACY_DETAILS = new Set(["overview", "standard", "full"]);
const LENSES = new Set(["all", "money", "message", "exception"]);
const FOCI = new Set(["all", "auth", "settlement", "fee", "refund", "message"]);
// Must stay in sync with the ViewMode union in state/store.ts and the set_view
// tool's viewMode enum in tools.ts — the spatial layouts the canvas can render.
const VIEW_MODES = new Set(["map", "lanes", "timeline"]);

/**
 * Parse a `set_view` tool call's raw JSON args into a whitelisted `view` SSE event.
 *
 * set_view is a VIEW control (reader mode + legend lens/focus + spatial
 * layout) — NOT a flow op: it changes what the canvas SHOWS without touching the
 * diagram, so it must never count as a dropped op or trigger "Drawing the flow…".
 * Unknown / out-of-range values are dropped. Shared by both providers so the
 * allow-lists live in ONE place (they were duplicated near-verbatim in openai.ts
 * and claude.ts).
 */
export function buildViewEvent(rawArgs: string): ViewEvent {
  let args: {
    mode?: unknown;
    detail?: unknown;
    lens?: unknown;
    focus?: unknown;
    viewMode?: unknown;
  } = {};
  try {
    args = rawArgs.trim() ? (JSON.parse(rawArgs) as typeof args) : {};
  } catch {
    args = {};
  }
  const view: ViewEvent = { type: "view" };
  if (typeof args.mode === "string" && MODES.has(args.mode)) {
    view.mode = args.mode as ViewEvent["mode"];
  } else if (typeof args.detail === "string" && LEGACY_DETAILS.has(args.detail)) {
    // Accept cached/in-flight calls from the former three-level contract, but
    // normalize them before the event reaches public state consumers.
    view.mode = args.detail === "overview" ? "story" : "system";
  }
  if (typeof args.lens === "string" && LENSES.has(args.lens)) {
    view.lens = args.lens as ViewEvent["lens"];
  }
  if (typeof args.focus === "string" && FOCI.has(args.focus)) {
    view.focus = args.focus;
  }
  if (typeof args.viewMode === "string" && VIEW_MODES.has(args.viewMode)) {
    view.viewMode = args.viewMode as ViewEvent["viewMode"];
  }
  return view;
}
