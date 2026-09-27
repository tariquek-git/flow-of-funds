import { create } from "zustand";
import { nanoid } from "nanoid";
import { applyOp, emptyFlow, type FlowOp } from "@/lib/schema/ops";
import { normalizeFlowStructure } from "@/lib/schema/normalize";
import { validateFlow } from "@/lib/schema/validate";
import { FLOW_CATALOG } from "@/lib/flows/catalog";
import { matchSeed, REBUILD_FOLLOWUP_ID, VERIFIED_FOLLOWUP_ID } from "@/lib/flows/seedMatch";
import { isMobileNow } from "@/lib/state/useIsMobile";
import { GUIDE_EXPLAINER, HITCHHIKER_TRIGGER, buildHitchhikerFlow } from "@/lib/flows/easter-egg";
import {
  upsertSlot,
  writeMyFlows,
  clearMyFlows as clearMyFlowsStorage,
  type SavedFlow,
} from "@/lib/flows/myflows";
import type { FlowOfFunds, FollowUp } from "@/lib/schema/flow";
import type { Capability, StreamEvent } from "@/lib/agent/types";
import { track } from "@/lib/analytics";
import { isOptedOut } from "@/lib/analytics-optout";
import { getTurnstileToken } from "@/lib/turnstile-client";
import { appendAssistantDelta } from "@/lib/state/textStream";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: string;
  isError?: boolean;
};

type Selected = { kind: "node" | "edge"; id: string } | null;

/** How much information the diagram shows. The dial. */
export type DetailLevel = "overview" | "standard" | "full";

/** Public reading contract. Layout density remains an internal DetailLevel so
    Story can use the live canvas while drawing, then settle into its concise
    overview without exposing a third reader-facing mode. */
export type ReaderMode = "story" | "system";

/** Map the public reader mode to the internal layout density. Story draws at
    standard density so streamed ops remain legible, then settles to overview;
    System always exposes the complete flow. */
export function detailForReaderMode(
  readerMode: ReaderMode,
  drawing = false,
): DetailLevel {
  if (readerMode === "system") return "full";
  return drawing ? "standard" : "overview";
}

/** Normalize the legacy three-step detail contract during migration. Unknown
    or missing values intentionally fall back to the default Story view. */
export function readerModeFromDetail(detail: unknown): ReaderMode {
  return detail === "standard" || detail === "full" ? "system" : "story";
}

/** Which spatial layout the canvas renders. "map" = the dagre left-to-right
    graph (the default, compact view); "lanes" = the party-swimlane view (each
    party in its own horizontal lane, a sequence-diagram feel for beginners);
    "timeline" = the time-axis view (each leg placed by its settlement timing, so
    "feels instant" legs cluster left and where money actually settles sits
    right). */
export type ViewMode = "map" | "lanes" | "timeline";

/** Runtime allow-list for ViewMode, so an AI-driven `view` event can be validated
    against the same set the UI uses before it touches the canvas layout. */
const VIEW_MODES = new Set<ViewMode>(["map", "lanes", "timeline"]);

export type PopoverId = "detail" | "export" | "info" | "library" | null;

/** Story lens for focus+context (matches layout.ts FlowLens structurally). "all"
    shows the whole flow; the others trace one complete story, dimming the rest. */
export type FlowLens = "all" | "money" | "message" | "exception";

type StudioState = {
  messages: ChatMessage[];
  flow: FlowOfFunds | null;
  followups: FollowUp[];
  /** The prompt of the most recent generate that mapped to an audited seed, so
      the "rebuild it fresh" chip (offered inside the verified view) can re-run it
      as a real AI generation. */
  lastSeedPrompt: string | null;
  /** The audited seed the most recent LIVE generate maps to (or null). Set at
      submit; when the live draw lands, the studio offers a one-tap "show the
      audited version" chip that loads this seed to compare against. This is how
      the verified library stays reachable now that typed prompts always draw
      live. */
  verifiedSeedId: string | null;
  selected: Selected;
  busy: boolean;
  /** Live phase of the in-flight agent turn ("Thinking…", "Drawing the flow…").
      Driven by `status` SSE events; null when idle. Read by the canvas overlay
      so a long thinking phase never reads as a frozen screen. */
  statusMessage: string | null;
  provider: "claude" | "fixture" | "openai" | "deepseek" | null;
  /** Set when live generation is unavailable — OpenAI quota exhausted, the daily
      AI budget cap was hit, or a provider outage. Drives a calm "live paused"
      banner that points users at templates + editing (which need no AI call).
      Cleared on the next successful turn. */
  paused: boolean;
  history: FlowOfFunds[];
  /** Public two-mode reading contract. `detail` below is its internal layout
      representation and remains available temporarily for legacy consumers. */
  readerMode: ReaderMode;
  detail: DetailLevel;
  /** Spatial layout of the canvas — the map (dagre) or the party-swimlane view.
      Persisted/restored like `detail`; reset to "map" whenever a new flow loads
      so a fresh diagram always opens in the familiar compact view. */
  viewMode: ViewMode;
  /** UI surfaces — in the store so selection and popovers can stay mutually
      exclusive without setState-in-effect gymnastics. */
  popover: PopoverId;
  chatOpen: boolean;
  legendOpen: boolean;
  /** Mobile reading mode: "steps" = the vertical leg list (StepView), "diagram"
      = the spatial swimlane. Mobile-only (the Map/Steps toggle); desktop ignores
      it via the isMobile gate and always renders the canvas. */
  mobileView: "diagram" | "steps";
  /** On-canvas legend filter: isolate ONE leg category (a legendCategory key —
      settlement, auth, fee, refund, message) or null = show all. Composes on
      top of the internal detail filtering. Reset to null whenever a new flow
      is generated/loaded so a fresh diagram opens showing everything. */
  edgeFilter: string | null;
  /** Story lens (money / message / exception) for focus+context — dims the legs
      outside the chosen story instead of removing them, so the full flow still
      reads. Composes with edgeFilter. "all" = no lens. Reset with a new flow. */
  lens: FlowLens;
  /** Arrival focus for a glossary "See it move" deep link: while set, buildEdges
      dims every leg except the target element's so the eye lands on the right
      leg. Cleared on the FIRST interaction (any select, lens/legend/detail/view
      change, or a new flow) — a one-beat landing cue, not a mode. */
  arrivalFocus: Selected;
  /** Guided walkthrough: when non-null, the index into the ordinal-sorted
      detail-visible legs that is currently spotlit. The canvas dims every other
      leg (same buildEdges focus the glossary deep-link uses) and a caption card
      shows the leg's plain-English description with Back/Next. Null = off.
      Cleared by a new flow, a detail change, or any explicit select. */
  walkStep: number | null;
  startWalk: () => void;
  stepWalk: (delta: number) => void;
  endWalk: () => void;
  /** Named save slots, persisted locally. Hydrated in startSessionPersistence. */
  myFlows: SavedFlow[];
  /** True for ~1.5s after a save — drives the "saved ✓" affordance. */
  savedFlash: boolean;
  /** Transient line shown after an export lands (e.g. the "nice — you made a
      thing" nudge with the contact email). Null when nothing is showing. */
  exportToast: string | null;
  /** Show a transient export toast; auto-clears after ~6s so a reader has time
      to catch the email. Re-firing resets the timer. */
  flashExportToast: (message: string) => void;
  setPopover: (popover: PopoverId) => void;
  setChatOpen: (open: boolean) => void;
  setLegendOpen: (open: boolean) => void;
  setMobileView: (v: "diagram" | "steps") => void;
  /** True while a generation/replay is actively streaming ops onto the canvas.
      While on, Studio renders the live canvas (standard density) instead of the
      StoryStrip, so the strip can't thrash per streamed op. Distinct
      from `busy`, which is also true during prose-only turns. */
  drawing: boolean;
  /** True once the user has explicitly changed reader mode this session.
      Retains the legacy name while old UI call sites migrate. */
  detailTouched: boolean;
  setLens: (lens: FlowLens) => void;
  setArrivalFocus: (focus: Selected) => void;
  saveMyFlow: () => void;
  deleteMyFlow: (slotId: string) => void;
  clearMyFlows: () => void;
  /** Load a complete validated flow (template, JSON import) with undo. */
  loadFlow: (flow: FlowOfFunds, note?: string) => void;

  send: (prompt: string, capability?: Capability) => Promise<void>;
  /** Stop the in-flight generation (tool turns roll back) or skip the seed
      replay animation. Safe to call when idle. */
  stop: () => void;
  loadSeed: (
    seedId: string,
    opts?: { userText?: string; introText?: string; extraFollowups?: FollowUp[] },
  ) => Promise<void>;
  /** Re-run the last seed-mapped prompt as a real AI generation (the "rebuild it
      fresh" chip inside the verified view — a plain send() would infer an edit
      over the loaded seed). No-op if none pending. */
  rebuildFresh: () => void;
  /** Load the audited seed the last live generate mapped to, verbatim and
      instant, to compare against the live draw. No-op if none pending. */
  showVerified: (seedId?: string) => void;
  skipToVerified: () => void;
  select: (selected: Selected) => void;
  setReaderMode: (readerMode: ReaderMode) => void;
  /** Legacy adapter. New consumers should use setReaderMode. */
  setDetail: (detail: DetailLevel) => void;
  setViewMode: (viewMode: ViewMode) => void;
  undo: () => void;
  setNodePosition: (id: string, position: { x: number; y: number }) => void;
  clear: () => void;
  /** Direct-manipulation edits — same op vocabulary the agent uses, with undo. */
  editNode: (id: string, patch: Record<string, unknown>) => void;
  editEdge: (id: string, patch: Record<string, unknown>) => void;
  removeSelected: () => void;
  setTitle: (title: string) => void;
};

/** Anonymous, client-generated session id sent with each /api/agent request so
    the operator can group a visitor's questions in the conversation log (beta
    usage review). It is NOT an account and is tied to no name or email — just a
    random id.

    Stored in sessionStorage (per-tab), NOT localStorage: a new tab / fresh visit
    / next person on a shared device gets a fresh anonymous id, so one person's
    logged questions are never grouped under (or attributed to) another's. It
    survives an in-tab reload and "Start over" (which only wipes the session
    snapshot under fof-native-session-v1). Best-effort: if storage is unavailable
    we mint a per-load id so a request still carries one. */
const SESSION_ID_KEY = "fof-native-session-id-v1";
let memSessionId: string | null = null;
export function getSessionId(): string {
  if (memSessionId) return memSessionId;
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) {
      memSessionId = existing;
      return existing;
    }
    const fresh = `s_${nanoid(16)}`;
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    memSessionId = fresh;
    return fresh;
  } catch {
    // sessionStorage blocked (private mode / SSR) — fall back to a per-load id.
    memSessionId = `s_${nanoid(16)}`;
    return memSessionId;
  }
}

/** True when a failure means live generation is unavailable (quota/cap/outage),
    as opposed to a one-off glitch. Drives the `paused` banner + template nudge.
    Checks both the HTTP status (503 daily cap) and the mid-stream provider error
    text (OpenAI 429 `insufficient_quota`, or an explicit "paused" message). */
export function looksPaused(status: number | null, message: string | null): boolean {
  if (status === 503) return true; // app daily-budget cap
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("insufficient_quota") ||
    m.includes("quota") ||
    m.includes("exceeded your current quota") ||
    m.includes("generation is paused") ||
    m.includes("daily ai budget") ||
    m.includes("daily generation limit") ||
    // Anthropic org spend cap leaks this phrasing if raw text ever reaches the
    // client ("You have reached your specified API usage limits. You will
    // regain access on …"). Backstop the server-side sanitize in providerError.ts.
    m.includes("usage limit") ||
    m.includes("regain access") ||
    m.includes("credit balance")
  );
}

/** Map a failed agent HTTP response to a calm, on-brand message a non-technical
    tester can act on. Raw status codes, stack traces, and provider internals
    never reach the chat. The server already writes friendly copy for the
    spend-protection statuses (429 rate-limit, 503 daily cap, 413 too-large), so
    we trust its text there; everything else gets a reassuring fallback that
    still points at a way forward. */
function friendlyHttpError(status: number, serverError: string | null): string {
  switch (status) {
    case 401:
      // Cookie expired mid-session — they're inside the app, so "unlock first"
      // is confusing. Tell them to reload, which routes through the gate.
      return "Your session timed out. Refresh the page to unlock the studio again. Your work is saved.";
    case 403:
      // Bot check / same-origin guard. For a real user in the studio this is a
      // failed or expired Turnstile challenge — a refresh mints a fresh token.
      return serverError ?? "Quick security check didn't pass. Refresh the page and try again.";
    case 429:
      // "Going a bit fast" — server already phrases this kindly; keep its copy.
      return serverError ?? "You're going a bit fast. Give it a moment and try again.";
    case 503:
      // Honest daily-cap message comes from the server; keep it verbatim.
      return serverError ?? "Live generation is paused for today. Templates and saved flows still work, try again tomorrow.";
    case 413:
      return serverError ?? "That request was a bit too large. Try a shorter prompt or a simpler flow.";
    case 400:
      // A nonsense / un-renderable ask: soft, in-voice, never a hard error.
      return "Mostly harmless. But I can't map that one. Try rephrasing, or load a template to keep going.";
    default:
      if (status >= 500)
        return "The studio hit a snag on our end. Give it another try in a moment, or load a template to keep going.";
      return "That didn't go through. Try again, or load a template to keep going.";
  }
}

/** A content edit over an audited seed means the canvas no longer matches the
    template — the exhibit footer must stop claiming operator-source grounding.
    Layout moves and retitles are presentation, not content, and stay exempt. */
const withEditedSource = (flow: FlowOfFunds): FlowOfFunds =>
  flow.metadata.source === "seed"
    ? { ...flow, metadata: { ...flow.metadata, source: "user-edited" as const } }
    : flow;

/** Merge a `metadata.provenance = "user-edited"` stamp into an element patch,
    preserving any existing element metadata (emoji, source URL, overrides). The
    op reducer shallow-merges `set`, so the WHOLE metadata object is rebuilt here
    rather than left for it to clobber. Read back by elementProvenance() to flip a
    once-verified seed element to AI-inferred after a hand edit. */
const stampElementEdited = (
  existing: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> => {
  const mergedMeta = {
    ...(existing ?? {}),
    ...((patch.metadata as Record<string, unknown> | undefined) ?? {}),
    provenance: "user-edited",
  };
  return { ...patch, metadata: mergedMeta };
};

/** Module-level abort plumbing — function values don't belong in zustand state. */
let activeAbort: AbortController | null = null;
let abortReason: "user" | "stalled" | null = null;
// When set, the in-flight generate is being aborted specifically to jump to the
// audited seed (the "skip the wait" escape during a live draw). The generate's
// finally hook reads it AFTER the stream fully settles and busy flips false, then
// loads the seed — so the seed load can never race the abort's own state cleanup
// (which restores the pre-run flow and clears busy).
let pendingVerifiedSkipId: string | null = null;
/** Auto-clear timer for the transient post-export toast (flashExportToast). */
let exportToastTimer: ReturnType<typeof setTimeout> | null = null;
// No-event timeout. A generate turn can reason silently for 60-90s before the
// first leg lands; the server sends ~10s heartbeats (openai.ts) to keep this
// from firing on a healthy run. This is the BACKSTOP for when heartbeats are
// delayed (a slow upstream connect before the heartbeat starts) — generous on
// purpose so a thinking model is never mistaken for a dead stream. A genuinely
// dead stream still surfaces, just a bit later. (Was 45s, which guillotined
// valid long generations.)
const WATCHDOG_MS = 120_000;

/** Witty, payments-themed, boardroom-appropriate lines shown while a request is
    in flight. Dry, not goofy — they read like an in-joke a payments team would
    smile at, never slapstick. Cycled client-side (see startWaitRotation) so a
    long generation never reads as a frozen screen, and so the wait has a little
    personality without the server having to narrate. Node/edge LABELS stay
    clean and boardroom-ready; the wit lives only here, in the transient status. */
export const FUNNY_WAIT_MESSAGES = [
  // The Guide's standard advice — its natural home is the wait, not the help panel.
  "Don't Panic. Drawing your flow…",
  "Chasing down the missing settlement leg…",
  "Negotiating interchange with the network…",
  "Untangling the nostro from the vostro…",
  "Teaching the ACH batch some manners…",
  "Politely interrogating SWIFT…",
  "Asking FedNow to please hurry…",
  "Counting basis points by hand…",
  "Double-checking who's the issuer of record…",
  "Routing funds through very official pipes…",
  "Waking up the settlement window…",
  "Reconciling with the ledger gremlins…",
  "Confirming the sponsor bank is awake…",
  "Netting positions before the cutoff…",
  "Drawing arrows that mean money…",
] as const;

const WAIT_ROTATE_MS = 3500;
/** Handle for the in-flight wait-message rotation; cleared when the turn ends. */
let waitRotation: ReturnType<typeof setInterval> | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Start cycling FUNNY_WAIT_MESSAGES into statusMessage every ~3.5s while busy.
    The first line shows immediately. Under prefers-reduced-motion we show ONE
    calm line and do not rotate (no recurring text changes / flashing). Server
    `status` events for genuine phase shifts ("Validating and repairing…") still
    win — they overwrite statusMessage directly in send(); the rotation simply
    resumes its cadence afterward. Always paired with stopWaitRotation(). */
function startWaitRotation(set: (partial: Partial<StudioState>) => void) {
  stopWaitRotation();
  const pick = (i: number) => set({ statusMessage: FUNNY_WAIT_MESSAGES[i % FUNNY_WAIT_MESSAGES.length] });
  // Random start so back-to-back turns don't always open on the same line.
  let i = Math.floor(Math.random() * FUNNY_WAIT_MESSAGES.length);
  pick(i);
  if (prefersReducedMotion()) return; // single static line, no rotation
  waitRotation = setInterval(() => {
    i += 1;
    pick(i);
  }, WAIT_ROTATE_MS);
}

function stopWaitRotation() {
  if (waitRotation) {
    clearInterval(waitRotation);
    waitRotation = null;
  }
}

function inferCapability(prompt: string, flow: FlowOfFunds | null): Capability {
  if (!flow) return "generate";
  if (/^(critique|review|check|audit|stress)/i.test(prompt)) return "critique";
  // Edit intent outranks question-shaped openings: "What if we add a refund
  // leg?" must reach the tools, not get answered in prose.
  if (/\b(add|remove|rename|change|swap|insert|delete|retitle|relabel|reroute|update|move|split|merge)\b/i.test(prompt))
    return "edit";
  if (/^(explain|what|why|how|who|describe|tell|walk|narrate)/i.test(prompt)) return "explain";
  if (/\b(new flow|start over|from scratch|instead show|generate a)\b/i.test(prompt))
    return "generate";
  // A prompt that OPENS with a "draw me a new diagram" verb is a fresh
  // generation, not an edit of the current canvas — even when a flow already
  // exists. This catches the frankenflow repro ("Show a US ACH payroll…" typed
  // after an Interac flow was generated): without it, the second ask fell to the
  // `edit` default and was built on top of the first flow, mixing both diagrams.
  // Placed AFTER the edit-verb check so "add/change/move…" stay edits; these
  // scene-setting verbs only win when no edit verb is present.
  if (/^(show|draw|generate|create|diagram|map|build|visuali[sz]e|illustrate|model|sketch)\b/i.test(prompt))
    return "generate";
  return "edit";
}

/** A reviewed template is the default shortcut only for an ordinary generate.
 * An explicit generate is the user's escape hatch back to a fresh AI draw. */
export function shouldUseReviewedFastPath(
  explicitCapability: Capability | undefined,
  inferredCapability: Capability,
): boolean {
  return explicitCapability === undefined && inferredCapability === "generate";
}

export const useStudio = create<StudioState>((set, get) => ({
  messages: [],
  flow: null,
  followups: [],
  lastSeedPrompt: null,
  verifiedSeedId: null,
  selected: null,
  busy: false,
  drawing: false,
  detailTouched: false,
  statusMessage: null,
  provider: null,
  paused: false,
  history: [],
  readerMode: "story",
  // Mobile opens lean + with the legend collapsed so a shared-link first paint
  // fits the screen instead of overflowing (see FlowCanvas).
  detail: detailForReaderMode("story"),
  // Open in the familiar compact map; the swimlane view is one toggle away.
  viewMode: "map",
  popover: null,
  // The payment document is the default surface. Generation opens the drawer
  // when progress or a response needs attention; a loaded template stays quiet.
  chatOpen: false,
  legendOpen: !isMobileNow(),
  // Mobile opens on the ordered step view so the first read is legible without
  // pinch-zoom. The spatial map stays one tap away. Desktop ignores this flag.
  mobileView: isMobileNow() ? "steps" : "diagram",
  edgeFilter: null,
  lens: "all",
  arrivalFocus: null,
  myFlows: [],
  savedFlash: false,
  exportToast: null,

  // Any select (element click, canvas click-away, Esc) also ends the deep-link
  // arrival dim — it's the reader's first interaction. The deep-link effect sets
  // arrivalFocus AFTER its own select call, so the order there is deliberate.
  select: (selected) =>
    set(
      selected
        ? { selected, popover: null, arrivalFocus: null, walkStep: null }
        : { selected, arrivalFocus: null, walkStep: null },
    ),

  // Guided walkthrough. The store only holds the index; the canvas derives the
  // ordinal-sorted visible legs, clamps, and ends the walk when the index runs
  // off either end. Starting clears any selection/popover so the spotlight is
  // the only focus on screen.
  walkStep: null,
  startWalk: () => set({ walkStep: 0, selected: null, popover: null, arrivalFocus: null }),
  stepWalk: (delta) => {
    const cur = get().walkStep;
    if (cur === null) return;
    set({ walkStep: cur + delta });
  },
  endWalk: () => set({ walkStep: null }),

  flashExportToast: (message) => {
    if (exportToastTimer) clearTimeout(exportToastTimer);
    set({ exportToast: message });
    exportToastTimer = setTimeout(() => {
      set({ exportToast: null });
      exportToastTimer = null;
    }, 6000);
  },

  setPopover: (popover) => set(popover ? { popover, selected: null } : { popover }),

  setChatOpen: (chatOpen) => set({ chatOpen }),

  setLegendOpen: (legendOpen) => set({ legendOpen }),
  setMobileView: (mobileView) => set({ mobileView }),

  // Picking a lens is always a clean reset: it also clears any fine colour focus
  // the AI set (edgeFilter), so every caller — desktop legend AND mobile segments
  // — gets the same behaviour for free (was only done at the desktop call site).
  setLens: (lens) => set({ lens, edgeFilter: null, arrivalFocus: null, walkStep: null }),

  setArrivalFocus: (arrivalFocus) => set({ arrivalFocus }),

  stop: () => {
    if (!get().busy) return;
    if (activeAbort) {
      abortReason = "user";
      activeAbort.abort();
    }
  },

  saveMyFlow: () => {
    const { flow, busy, myFlows } = get();
    if (!flow || busy) return;
    // Re-validate before persisting; Zod's parse also deep-copies, so the
    // saved slot can never alias the live canvas flow.
    const result = validateFlow(flow);
    if (!result.ok) {
      alert(`This flow can't be saved yet:\n${result.errors.slice(0, 3).join("\n")}`);
      return;
    }
    const upserted = upsertSlot(myFlows, result.flow);
    if ("full" in upserted) {
      alert(
        `My flows is full (${myFlows.length} saved). Delete one from the library to make room.`,
      );
      return;
    }
    if (!writeMyFlows(upserted.slots)) {
      alert("Couldn't save: browser storage is full or unavailable.");
      return;
    }
    set({ myFlows: upserted.slots, savedFlash: true });
    setTimeout(() => set({ savedFlash: false }), 1500);
    track("flow_saved", { slots: upserted.slots.length });
  },

  deleteMyFlow: (slotId) => {
    const next = get().myFlows.filter((s) => s.slotId !== slotId);
    writeMyFlows(next);
    set({ myFlows: next });
  },

  clearMyFlows: () => {
    clearMyFlowsStorage();
    set({ myFlows: [] });
    track("flows_cleared");
  },

  loadFlow: (flow, note) => {
    const result = validateFlow(flow);
    if (!result.ok) return;
    // Determinism pass on entry: canonical lane order + dense ordinals, so a
    // reopened/imported/shared flow lands on the same stage as a fresh one.
    const normalized = normalizeFlowStructure(result.flow);
    set((s) => ({
      history: s.flow ? [...s.history.slice(-19), s.flow] : s.history,
      flow: normalized,
      readerMode: "story",
      detail: detailForReaderMode("story"),
      viewMode: "map",
      selected: null,
      edgeFilter: null,
      lens: "all",
      arrivalFocus: null, walkStep: null,
      followups: result.flow.suggestedFollowups ?? [],
      messages: note
        ? [...s.messages, { id: nanoid(8), role: "assistant" as const, text: note }]
        : s.messages,
    }));
  },

  // Story is a clean reset: filters and alternate layouts belong to the deeper
  // System view, so Story always returns to the stable left-to-right map.
  setReaderMode: (readerMode) =>
    set(
      readerMode === "story"
        ? {
            readerMode,
            detail: detailForReaderMode(readerMode, get().drawing),
            detailTouched: true,
            lens: "all",
            edgeFilter: null,
            viewMode: "map",
            arrivalFocus: null,
            walkStep: null,
          }
        : {
            readerMode,
            detail: detailForReaderMode(readerMode, get().drawing),
            detailTouched: true,
            arrivalFocus: null,
            walkStep: null,
          },
    ),

  // Transitional adapter for UI call sites that still speak DetailLevel.
  setDetail: (detail) => get().setReaderMode(readerModeFromDetail(detail)),

  setViewMode: (viewMode) => set({ viewMode, arrivalFocus: null, walkStep: null }),

  undo: () => {
    const { history } = get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    set({ flow: prev, history: history.slice(0, -1), selected: null, edgeFilter: null, lens: "all", arrivalFocus: null, walkStep: null });
  },

  clear: () => {
    // Stash the outgoing session so "Start over" is recoverable WITHIN this tab,
    // then make the wipe RELIABLE: (a) remove the live session snapshot
    // synchronously (don't wait for the debounced persist, so a fast reload can't
    // restore what was just cleared), and (b) strip a lingering landing handoff +
    // any ?q=/#f= from the URL so a re-render or reload can't re-seed the prompt
    // or re-hydrate a shared flow. sessionStorage (not localStorage) so the stash
    // can't carry a prior person's flow/chat across sessions or to the next person.
    try {
      const { flow, messages } = get();
      if (flow || messages.length) {
        sessionStorage.setItem(
          "fof-native-session-prev",
          JSON.stringify({ flow, messages: messages.slice(-40), savedAt: new Date().toISOString() }),
        );
      }
      sessionStorage.removeItem("fof-native-session-v1");
    } catch {
      // best-effort — storage may be unavailable
    }
    if (typeof window !== "undefined") {
      try {
        if (window.__fofHandoff) window.__fofHandoff.q = null;
        if (window.location.search || window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch {
        // history/window unavailable — nothing to strip
      }
    }
    set({
      flow: null,
      messages: [],
      followups: [],
      readerMode: "story",
      detail: detailForReaderMode("story"),
      viewMode: "map",
      selected: null,
      edgeFilter: null,
      lens: "all",
      arrivalFocus: null, walkStep: null,
      history: [],
      paused: false,
      popover: null,
      exportToast: null,
    });
  },

  setNodePosition: (id, position) => {
    const { flow } = get();
    if (!flow) return;
    set({
      flow: {
        ...flow,
        nodes: flow.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      },
    });
  },

  editNode: (id, patch) => {
    const { flow, busy } = get();
    if (!flow || busy) return;
    // Stamp per-element provenance on the TOUCHED node only, in addition to the
    // flow-level seed→user-edited flip below. This is what elementProvenance()
    // reads to flip a once-verified seed element to AI-inferred on tap (a hand
    // edit can no longer claim the audited-seed guarantee). Merged into the
    // patch so it rides the SAME immutable op path and stays undoable.
    const set_ = stampElementEdited(flow.nodes.find((n) => n.id === id)?.metadata, patch);
    const op = { op: "update_node", id, set: set_ } as FlowOp;
    set((s) => ({
      history: [...s.history.slice(-19), flow],
      flow: withEditedSource(applyOp(flow, op)),
    }));
  },

  editEdge: (id, patch) => {
    const { flow, busy } = get();
    if (!flow || busy) return;
    const set_ = stampElementEdited(flow.edges.find((e) => e.id === id)?.metadata, patch);
    const op = { op: "update_edge", id, set: set_ } as FlowOp;
    set((s) => ({
      history: [...s.history.slice(-19), flow],
      // Re-normalize so a hand-typed ordinal (gaps, duplicates) lands back on
      // dense 1..n — the numbers the user sees are always the numbers stored.
      flow: normalizeFlowStructure(withEditedSource(applyOp(flow, op))),
    }));
  },

  removeSelected: () => {
    const { flow, selected, busy } = get();
    if (!flow || !selected || busy) return;
    const op = {
      op: selected.kind === "node" ? "remove_node" : "remove_edge",
      id: selected.id,
    } as FlowOp;
    set((s) => ({
      history: [...s.history.slice(-19), flow],
      flow: withEditedSource(applyOp(flow, op)),
      selected: null,
    }));
  },

  setTitle: (title) => {
    const { flow, busy } = get();
    if (!flow || busy || !title.trim() || title.trim() === flow.metadata.title) return;
    const m = flow.metadata;
    const op = {
      op: "set_metadata",
      title: title.trim(),
      description: m.description,
      narrative: m.narrative,
      jurisdiction: m.jurisdiction,
      primaryRails: m.primaryRails,
      currencies: m.currencies,
      tags: m.tags,
    } as FlowOp;
    set((s) => ({
      history: [...s.history.slice(-19), flow],
      flow: applyOp(flow, op),
    }));
  },

  loadSeed: async (seedId, opts) => {
    const seed = FLOW_CATALOG[seedId];
    if (!seed || get().busy) return;
    const completedAtStart = Date.now();
    const msgId = nanoid(8);
    set((s) => ({
      busy: true,
      followups: [],
      readerMode: "story",
      detail: detailForReaderMode("story"),
      edgeFilter: null,
      lens: "all",
      arrivalFocus: null, walkStep: null,
      viewMode: "map",
      // A seed replay IS the audited version — no "audited version" left to offer,
      // so clear any lingering match. Also stops the mid-draw "skip the wait" chip
      // from rendering (dead) over an unrelated library/verified replay.
      verifiedSeedId: null,
      history: s.flow ? [...s.history.slice(-19), s.flow] : s.history,
      messages: [
        ...s.messages,
        // A direct library click uses the seed's own title/narrative; the
        // prompt fast-path passes the user's own words + a tailored intro.
        { id: nanoid(8), role: "user", text: opts?.userText ?? seed.metadata.title },
        { id: msgId, role: "assistant", text: opts?.introText ?? seed.metadata.narrative ?? "" },
      ],
    }));
    // Curated templates load as one complete document. Incremental replay made
    // Story briefly state conclusions from half-built flows, which was slower
    // and less trustworthy than the instant local load users were promised.
    const draft = structuredClone(seed);
    const result = validateFlow(draft);
    set({
      busy: false,
      drawing: false,
      readerMode: "story",
      detail: detailForReaderMode("story"),
      viewMode: "map",
      edgeFilter: null,
      lens: "all",
      arrivalFocus: null,
      walkStep: null,
      flow: normalizeFlowStructure(result.ok ? result.flow : (draft as FlowOfFunds)),
      followups: [
        ...(opts?.extraFollowups ?? []),
        ...(result.ok ? (result.flow.suggestedFollowups ?? []) : []),
      ],
    });
    track("seed_loaded", { seedId, ok: result.ok, via: opts?.userText ? "prompt" : "library" });
    track("flow_completed", {
      result_type: "reviewed_template",
      seedId,
      ok: result.ok,
      ms_total: Date.now() - completedAtStart,
    });
  },

  rebuildFresh: () => {
    const p = get().lastSeedPrompt;
    // Force capability "generate": a plain send() over the loaded seed would
    // infer an EDIT, not a fresh draw.
    if (p && !get().busy) void get().send(p, "generate");
  },

  // "Skip the wait" during a live draw whose prompt maps to an audited seed:
  // abort the in-flight generation and hand the user the instant hand-verified
  // version instead. We DON'T load the seed here — a load now would race the
  // abort's own cleanup (which restores the pre-run flow and flips busy). Instead
  // we stash the seed id and let the generate's finally hook load it once the
  // stream has fully settled. No-op unless a matched live draw is in flight.
  skipToVerified: () => {
    const { busy, verifiedSeedId } = get();
    if (!busy || !verifiedSeedId || !activeAbort) return;
    pendingVerifiedSkipId = verifiedSeedId;
    abortReason = "user";
    activeAbort.abort();
  },

  showVerified: (seedId) => {
    // Prefer an explicitly-passed id (the skip-to-verified finally hook captures
    // it up front so a mid-send drift of verifiedSeedId could never load the
    // wrong seed); fall back to the current match for the post-draw compare chip.
    const id = seedId ?? get().verifiedSeedId;
    const seed = id ? FLOW_CATALOG[id] : null;
    if (!id || !seed || get().busy) return;
    void get().loadSeed(id, {
      userText: "Show the curated template",
      introText: `Here's the curated **${seed.metadata.title}** template from the library, for comparison. It loads instantly with its source notes and caveats. Rebuild it with the AI to go back to a fresh draw.\n\n${seed.metadata.narrative ?? ""}`,
      extraFollowups: [
        {
          id: REBUILD_FOLLOWUP_ID,
          prompt: "Rebuild with the AI",
          rationale: "Draw a fresh version with the AI instead of the saved template",
        },
      ],
    });
  },

  send: async (prompt, capability) => {
    const state = get();
    if (state.busy || !prompt.trim()) return;

    // Easter egg: a few iconic phrases, typed alone, load ONE pre-built flow set
    // in the Hitchhiker's Guide universe with a Guide-style explainer. It runs
    // entirely client-side — no AI call, no spend — and it's a fixed flow, not a
    // generative mode, so it can't be used to pull the assistant off its scope.
    if (HITCHHIKER_TRIGGER.test(prompt.trim())) {
      const flow = buildHitchhikerFlow();
      set((s) => ({
        flow,
        readerMode: "story",
        detail: detailForReaderMode("story"),
        viewMode: "map",
        selected: null,
        edgeFilter: null,
        lens: "all",
        arrivalFocus: null, walkStep: null,
        popover: null,
        followups: flow.suggestedFollowups ?? [],
        verifiedSeedId: null,
        history: s.flow ? [...s.history.slice(-19), s.flow] : s.history,
        messages: [
          ...s.messages,
          { id: nanoid(8), role: "user", text: prompt },
          { id: nanoid(8), role: "assistant", text: GUIDE_EXPLAINER },
        ],
      }));
      return;
    }

    const cap = capability ?? inferCapability(prompt, state.flow);

    // Common, unambiguous asks should feel instant and be more trustworthy than
    // a fresh model run. Load the hand-audited catalog flow first; the user can
    // still ask for a custom redraw from the follow-up chip. This also avoids a
    // 30-90 second wait and paid generation for the studio's own examples.
    if (shouldUseReviewedFastPath(capability, cap)) {
      const seedId = matchSeed(prompt);
      const seed = seedId ? FLOW_CATALOG[seedId] : null;
      if (seedId && seed) {
        set({ lastSeedPrompt: prompt });
        await get().loadSeed(seedId, {
          userText: prompt,
          introText: `Here's the curated **${seed.metadata.title}** template from the library. It loaded instantly with its source notes and caveats. Read the Story, open System for every leg, or ask Polaris to adapt it.\n\n${seed.metadata.narrative ?? ""}`,
          extraFollowups: [
            {
              id: REBUILD_FOLLOWUP_ID,
              prompt: "Redraw with the AI",
              rationale: "Build a fresh custom version instead of the reviewed template",
            },
          ],
        });
        return;
      }
    }

    // Custom generations draw live. If a future conservative alias maps while
    // this path is forced explicitly, keep the audited comparison reachable.
    if (cap === "generate") {
      const seedId = matchSeed(prompt);
      set({ verifiedSeedId: seedId, lastSeedPrompt: seedId ? prompt : null });
    } else {
      // An edit/critique/explain over the current flow has no "audited version"
      // to offer — clear any stale match so the compare chip doesn't linger.
      set({ verifiedSeedId: null });
    }

    const usesTools = cap === "generate" || cap === "edit";
    // A generate is a fresh diagram, never an addition to the current one. The
    // server already builds every generate from an empty draft (claude.ts /
    // openai.ts), so the client must mirror that: blow away the rendered flow
    // up front so NO prior nodes can survive into the new diagram. Without this,
    // a generate-over-an-existing-flow left the old canvas standing until the
    // first op landed and — worse, when a prompt was misrouted to a clone-based
    // path — stitched the old nodes into the new flow (the "frankenflow" bug:
    // US ACH nodes bleeding into an Interac e-Transfer diagram). Edit/critique
    // are unchanged: they correctly build on the current flow.
    const snapshot = cap === "generate" ? null : state.flow;
    // The flow as it stood BEFORE this run, regardless of capability. `snapshot`
    // is deliberately null for a generate (fresh builds start from an empty
    // canvas, including the mid-loop retry reset), but a FAILED run must roll
    // back to what the user actually had — restoring `snapshot` there blanked
    // the canvas while claiming it "was restored to its previous state".
    const preRunFlow = state.flow;

    const historyTurns = state.messages
      .filter((m) => m.text.trim())
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    const assistantId = nanoid(8);
    const modeLabel =
      cap === "generate" ? "drawing the flow…" :
      cap === "edit" ? "editing the diagram…" :
      cap === "critique" ? "reviewing…" : "answering…";
    set((s) => ({
      busy: true,
      // statusMessage is seeded by the rotation below.
      followups: [],
      popover: null,
      chatOpen: true,
      // On a generate, clear the rendered canvas NOW (before any op streams) so
      // the previous diagram can't linger or leak into the fresh one. The old
      // flow is still captured into history just below, so undo restores it.
      // Edit/critique leave the canvas in place — they build on it.
      ...(cap === "generate"
        ? {
            flow: null,
            readerMode: "story" as const,
            detail: detailForReaderMode("story"),
            selected: null,
            edgeFilter: null,
            lens: "all" as const,
            arrivalFocus: null,
            walkStep: null,
            viewMode: "map" as const,
          }
        : {}),
      history:
        usesTools && s.flow ? [...s.history.slice(-19), s.flow] : s.history,
      messages: [
        ...s.messages,
        { id: nanoid(8), role: "user", text: prompt },
        { id: assistantId, role: "assistant", text: "", meta: modeLabel },
      ],
    }));
    // Start cycling the funny, payments-themed wait copy into statusMessage
    // (canvas overlay) immediately, so frame zero already reads as progress.
    // The chat-bubble meta keeps the calm modeLabel ("drawing the flow…") until
    // prose or the settled provider meta lands. Stopped in finally.
    startWaitRotation(set);

    const patchAssistant = (patch: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage)) =>
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id !== assistantId ? m : typeof patch === "function" ? patch(m) : { ...m, ...patch },
        ),
      }));

    // Per-run state that survives across the (at most one) automatic retry.
    let working: FlowOfFunds | null = null;
    let failed = false;
    let sawOps = false;
    let sawTerminal = false; // a final `flow` or `error` event arrived
    // Classification of the LAST attempt's failure, used to decide whether a
    // single silent retry is worthwhile and whether to flip the `paused` banner.
    let retryable = false; // transient glitch (dropped op / schema rollback / 5xx / dropped stream)
    let pausedFailure = false; // live generation unavailable (quota/cap/outage)
    let attempts = 0;
    // Why the turn was aborted, if it was — carried out to the agent_turn event
    // so a deliberate user Stop (or a skip-to-audited jump) never inflates the
    // "error" outcome bucket the owner watches. runOnce's own finally nulls
    // abortReason before the outer finally runs, so this captures it in time.
    let abortKind: "user" | "stalled" | null = null;
    // Wall-clock start of the whole send (survives the one silent retry). Feeds
    // ms_total on agent_turn so the beta can measure perceived generation speed —
    // the core "type a sentence, a diagram builds" promise. Rounded ms only.
    const t0 = Date.now();

    // One automatic retry on a TRANSIENT generation failure. Occasionally a
    // generate/edit drops an op, fails schema validation (canvas rolls back), or
    // the stream drops mid-flight — a first-timer shouldn't see that glitch. We
    // retry the request ONCE, silently, then surface the honest error. Spend for
    // BOTH attempts is counted server-side (correct/safe — the cap can't be
    // gamed); the bound of two total attempts means no spend loop. We never retry
    // an abort/stop, a rate-limit/cap/quota ("paused") refusal, or a scope
    // refusal — those are deliberate, and retrying would waste a call.
    const MAX_ATTEMPTS = 2;

    /** A single network request + stream consume. Mutates the shared per-run
        flags above. Returns nothing; the loop reads the flags + `retryable`. */
    const runOnce = async (): Promise<void> => {
      // Reset per-attempt result flags (a retry starts clean).
      failed = false;
      sawOps = false;
      sawTerminal = false;
      retryable = false;
      pausedFailure = false;

      // Fresh abort plumbing per attempt: the Stop button aborts this controller,
      // and the watchdog aborts it if the stream goes silent — a generation must
      // never be able to lock the studio mid-meeting.
      const controller = new AbortController();
      activeAbort = controller;
      abortReason = null;
      let lastEventAt = Date.now();
      const watchdog = setInterval(() => {
        if (Date.now() - lastEventAt > WATCHDOG_MS) {
          abortReason = "stalled";
          controller.abort();
        }
      }, 5_000);

      try {
        // Inside the try: structuredClone can throw (e.g. RangeError on
        // pathologically deep node metadata) and the finally below must still
        // clear the watchdog.
        working =
          cap === "generate" || !snapshot
            ? emptyFlow(`flow-${nanoid(6)}`)
            : structuredClone(snapshot);
        // Fresh single-use Turnstile token for THIS submit (null when dormant).
        // Obtained per-attempt — inside runOnce, which the retry loop re-invokes —
        // so a silent retry mints its own token instead of replaying a consumed
        // one (Cloudflare rejects a reused token as `timeout-or-duplicate`).
        const turnstileToken = await getTurnstileToken();
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Opted-out browser: tell the server to skip the conversation log so
            // the owner's own test generations don't land in /admin (or its cost
            // stats). Rate limits + the spend kill-switch still apply.
            ...(isOptedOut() ? { "x-fof-notrack": "1" } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            capability: cap,
            prompt,
            history: historyTurns,
            currentFlow: snapshot,
            selected: state.selected,
            // Only meaningful once the user has explicitly changed reader mode —
            // otherwise it just reports the app default (always Story) and the
            // model would treat every visitor as "new to payments".
            requestedDetail: state.detailTouched ? state.detail : undefined,
            // Anonymous session id so the operator can group a visitor's questions
            // in the conversation log (see getSessionId). Not an account.
            sessionId: getSessionId(),
            // Bot-check token; null when Turnstile is dormant → server skips it.
            turnstileToken,
          }),
        });
        if (!res.ok) {
          // Calm, on-brand failures for non-technical testers — never a raw
          // status code or stack. Prefer the server's own friendly message where
          // it writes one (429 rate-limit, 503 daily-budget, 413 too-large), and
          // fall back to a reassuring sentence per status family otherwise.
          const serverError = await res
            .json()
            .then((j) => (j && typeof j.error === "string" ? j.error : null))
            .catch(() => null);
          // A 5xx is a transient server-side snag worth one retry; 4xx (rate
          // limit, too-large, locked) is deliberate and must not be retried.
          // 503 (daily cap) + any quota signal flips the "paused" banner.
          if (looksPaused(res.status, serverError)) pausedFailure = true;
          else if (res.status >= 500) retryable = true;
          throw new Error(friendlyHttpError(res.status, serverError));
        }
        if (!res.body) {
          // No stream at all — a transport hiccup; one retry is reasonable.
          retryable = true;
          throw new Error(
            "The studio didn't send anything back. Give it another try, or load a template to keep going.",
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          lastEventAt = Date.now();
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            // Guard the per-frame parse: one malformed frame must not throw into
            // the outer catch and roll back a generation that already applied
            // (and was already paid for) this turn. Skip the bad frame, continue.
            let event: StreamEvent;
            try {
              event = JSON.parse(line.slice(6)) as StreamEvent;
            } catch {
              continue;
            }
            switch (event.type) {
              case "text":
                patchAssistant((m) => ({ ...m, text: appendAssistantDelta(m.text, event.delta) }));
                break;
              case "op":
                sawOps = true;
                working = applyOp(working, event.op as FlowOp);
                set((s) => ({
                  flow: working,
                  drawing: true,
                  detail: detailForReaderMode(s.readerMode, true),
                }));
                break;
              case "flow":
                sawOps = true;
                sawTerminal = true;
                working = event.flow;
                // The terminal flow is the settled, normalized one — drawing
                // ends here so Story snaps to its clean settled layout.
                set((s) => ({
                  flow: event.flow,
                  drawing: false,
                  detail: detailForReaderMode(s.readerMode),
                }));
                break;
              case "view":
                // AI-driven view control: change what the canvas shows (reader
                // mode + story lens + legend focus + spatial layout) without
                // redrawing the diagram. Each field is independent — omitted
                // fields leave that piece untouched. lens picks WHICH story
                // (money/message/exception); focus narrows to one fine colour
                // type within it; viewMode switches the layout (map/lanes/timeline).
                // Through setReaderMode, not a raw set: Story must run
                // the same clean reset (lens/filter/viewMode) the button does.
                if (event.mode) get().setReaderMode(event.mode);
                {
                  // Story hides the lens picker, colour key, and view toggle —
                  // no lens/focus/viewMode may be planted there with no visible
                  // control left to explain or undo it (the setReaderMode reset's
                  // invariant). Two cases: (a) the event itself asked for
                  // Story — drop the rest, Story IS the money story; (b) the
                  // user sits at Story and the AI answers "show the messages"
                  // etc. — climb to System first so the state stays visible.
                  // Trivial values (lens all / focus all / viewMode map) never
                  // force a climb.
                  const wantsLens = !!event.lens && event.lens !== "all";
                  const wantsFocus = event.focus !== undefined && event.focus !== "all";
                  const wantsView =
                    !!event.viewMode && event.viewMode !== "map" && VIEW_MODES.has(event.viewMode);
                  const nonTrivial = wantsLens || wantsFocus || wantsView;
                  if (event.mode === "story" && nonTrivial) break;
                  if (nonTrivial && get().readerMode === "story") get().setReaderMode("system");
                }
                if (event.lens) set({ lens: event.lens });
                if (event.focus !== undefined) {
                  set({ edgeFilter: event.focus === "all" ? null : event.focus });
                }
                // Validate against the same ViewMode union the UI uses; a bad
                // value from a misbehaving provider leaves the current layout alone.
                if (event.viewMode && VIEW_MODES.has(event.viewMode)) {
                  set({ viewMode: event.viewMode });
                }
                break;
              case "followups":
                set({ followups: event.followups });
                break;
              case "status":
                // The canvas overlay's statusMessage is owned by the funny-wait
                // rotation; don't let generic server fillers ("Thinking…",
                // "Drawing the flow…") fight it. The chat bubble still reflects the
                // server's phase in its meta — useful for the brief, genuine phases
                // (e.g. "Validating and repairing the flow…").
                patchAssistant((m) => ({ ...m, meta: event.message }));
                break;
              case "done": {
                const u = event.usage;
                const usageNote = u
                  ? ` · ${u.input + u.cacheRead + u.cacheWrite} in (${u.cacheRead} cached) / ${u.output} out`
                  : "";
                set({ provider: event.provider });
                patchAssistant((m) => ({
                  ...m,
                  meta: `${event.provider}${event.model ? ` · ${event.model}` : ""}${usageNote}`,
                }));
                break;
              }
              case "error": {
                failed = true;
                sawTerminal = true;
                // A mid-stream provider error: a dropped-op / schema-validation
                // failure is the intermittent glitch we want to retry; a quota
                // signal means live generation is unavailable (paused, no retry).
                const isPaused = looksPaused(null, event.message);
                if (isPaused) pausedFailure = true;
                else retryable = true;
                // The server already maps raw provider JSON to calm copy via
                // friendlyProviderError(). Preserve that specific reason here
                // (daily app budget vs provider quota vs outage) instead of
                // flattening every paused state to the generic banner text.
                patchAssistant((m) => ({
                  ...m,
                  isError: true,
                  text: m.text + (m.text ? "\n\n" : "") + `⚠ ${event.message}`,
                }));
                break;
              }
            }
          }
        }
        // Transport honesty: a stream that ends cleanly mid-diagram (proxy cut,
        // network drop) must not leave a partial flow standing as if complete.
        if (usesTools && sawOps && !sawTerminal) {
          failed = true;
          retryable = true; // a dropped stream is exactly the transient case to retry
          patchAssistant((m) => ({
            ...m,
            isError: true,
            text:
              m.text +
              (m.text ? "\n\n" : "") +
              "⚠ The connection dropped before the flow was finalized.",
          }));
        }
      } catch (error) {
        failed = true;
        const aborted =
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError");
        // A user/stalled abort is never retried (deliberate stop / dead stream).
        if (aborted) {
          retryable = false;
          abortKind = abortReason ?? "user";
        }
        // A bare fetch rejection (offline, DNS, CORS, connection reset) is a
        // TypeError with terse, technical text ("Failed to fetch") — never show
        // it, and treat it as transient (worth one retry). friendlyHttpError
        // already produced calm copy for !res.ok cases and re-throws Error, so
        // those flow through error.message untouched (retryable already set above).
        else if (error instanceof TypeError) retryable = true;
        const message = aborted
          ? abortReason === "stalled"
            ? `No response from the studio for ${Math.round(WATCHDOG_MS / 1000)} seconds, so it stopped. Try again, or load a template to keep going.`
            : "Stopped."
          : error instanceof TypeError
            ? "Couldn't reach the studio. Check your connection and try again. Your work is saved."
            : error instanceof Error
              ? error.message
              : "Something went wrong. Try again, or load a template to keep going.";
        // A "skip to the audited version" jump aborts intentionally, not on an
        // error — suppress the red bubble; the seed intro loaded afterward stands
        // in its place.
        if (!pendingVerifiedSkipId) {
          patchAssistant((m) => ({
            ...m,
            isError: true,
            text: m.text + (m.text ? "\n\n" : "") + `⚠ ${message}`,
          }));
        }
      } finally {
        clearInterval(watchdog);
        if (activeAbort === controller) activeAbort = null;
        abortReason = null;
      }
    };

    try {
      for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
        await runOnce();
        // Retry exactly once, and only for a transient glitch: not on success,
        // not on an abort/stop, not on a paused (quota/cap) state, not on a
        // scope refusal (which completes as a non-failed prose turn). On the
        // retry, blank the error bubble + reset the canvas to the snapshot so the
        // second attempt starts clean and the glitch is never shown.
        if (failed && retryable && !pausedFailure && !pendingVerifiedSkipId && attempts < MAX_ATTEMPTS) {
          patchAssistant((m) => ({ ...m, isError: false, text: "", meta: modeLabel }));
          if (usesTools) set({ flow: snapshot });
          continue;
        }
        break;
      }
    } finally {
      stopWaitRotation();
      // Live-paused banner: flip it on when generation is unavailable, and clear
      // it on any non-paused outcome (a later success, or a different failure)
      // so a transient cap doesn't strand the user in the degraded state.
      set((s) => ({
        paused: pausedFailure,
        drawing: false,
        detail: detailForReaderMode(s.readerMode),
      }));
      if (failed && usesTools && !pendingVerifiedSkipId) {
        // Roll the canvas back to the pre-run flow — and say so. This must be
        // preRunFlow, not snapshot: on a failed generate, snapshot is null, so
        // restoring it blanked the canvas. Pop the history entry pushed at run
        // start (gated on the same non-null flow) so undo depth stays consistent.
        // Skipped when the abort was a "skip to audited version" jump — the seed
        // load below replaces the canvas anyway, so a restore + "restored" note
        // would just flicker and confuse.
        set((s) => ({
          flow: preRunFlow,
          history: preRunFlow ? s.history.slice(0, -1) : s.history,
        }));
        patchAssistant((m) => ({
          ...m,
          text: m.text + "\n\nThe canvas was restored to its previous state.",
        }));
      } else if (!failed && usesTools && !sawOps && !pendingVerifiedSkipId && preRunFlow && !get().flow) {
        // A REFUSED (or clarifying, prose-only) generate turn: the run cleared
        // the canvas up front but drew nothing and didn't fail, so without this
        // the previous flow silently vanishes behind the refusal text. Quietly
        // put it back and pop the history entry pushed at run start — the prose
        // reply is the answer, no "restored" note needed.
        set((s) => ({ flow: preRunFlow, history: s.history.slice(0, -1) }));
      } else if (!failed && sawOps) {
        // Agent ops over an audited seed mean the canvas no longer matches
        // the template — drop the "seed" provenance so the exhibit footer
        // stops claiming operator-source grounding (see export/exhibit.ts).
        const settled = get().flow;
        if (settled && settled.metadata.source === "seed") {
          set({
            flow: {
              ...settled,
              metadata: { ...settled.metadata, source: "user-edited" },
            },
          });
        }
        // Best-of-both-worlds: a live draw whose prompt maps to an audited seed
        // gets a one-tap "show the audited version" chip so the hand-verified
        // flow stays reachable for comparison, without ever pre-empting the live
        // generation. Prepend so it leads the follow-up row.
        if (cap === "generate" && get().verifiedSeedId) {
          set((s) => ({
            followups: [
              {
                id: VERIFIED_FOLLOWUP_ID,
                prompt: "Show the curated template",
                rationale: "Compare with the fixed library template (instant, no AI)",
              },
              ...s.followups.filter((f) => f.id !== VERIFIED_FOLLOWUP_ID),
            ],
          }));
        }
      }
      // A turn that changed the diagram invalidates any open editor panel —
      // its uncontrolled fields would silently re-commit pre-edit values.
      // Clear the live status either way — the turn is over.
      set(sawOps ? { busy: false, selected: null, statusMessage: null } : { busy: false, statusMessage: null });
      // outcome disambiguates the one signal a beta most needs: WHY a turn didn't
      // draw. `ok:false` alone conflated three very different drop-offs — a real
      // error, a cap/quota "paused", and a scope refusal (a tool-capable turn that
      // answered in prose but emitted no ops). All values are already in scope;
      // still content-free (enums/booleans/rounded ms, never the prompt text).
      track("agent_turn", {
        capability: cap,
        ok: !failed,
        usedTools: usesTools,
        attempts,
        // Aborts get their own outcomes so the owner's error rate stays honest:
        // "skipped" = the skip-to-audited jump (successful feature use, the seed
        // loads right after), "stopped" = a deliberate user Stop, "stalled" =
        // the silent-stream watchdog fired. None of these are the app erroring.
        outcome: failed
          ? pendingVerifiedSkipId
            ? "skipped"
            : abortKind === "user"
              ? "stopped"
              : abortKind === "stalled"
                ? "stalled"
                : pausedFailure
                  ? "paused"
                  : "error"
          : usesTools && !sawOps
            ? "refused"
            : "success",
        retryable,
        ms_total: Date.now() - t0,
      });
      if (!failed && sawOps && cap === "generate") {
        // Every newly completed diagram lands in the public Story view. The
        // streamed build used standard density internally; completion settles
        // it to overview and removes any transient AI-driven focus or layout.
        set({
          readerMode: "story",
          detail: detailForReaderMode("story"),
          viewMode: "map",
          edgeFilter: null,
          lens: "all",
          arrivalFocus: null,
          walkStep: null,
        });
        track("flow_completed", {
          result_type: "ai_generated",
          ok: true,
          ms_total: Date.now() - t0,
        });
      }
      // "Skip the wait" escape: the user aborted this live draw to jump to the
      // audited version. The stream has fully settled and busy is now false, so
      // loading the seed here can't race the cleanup above. showVerified() reads
      // verifiedSeedId (still set) and replays the hand-verified flow instantly.
      if (pendingVerifiedSkipId) {
        const id = pendingVerifiedSkipId;
        pendingVerifiedSkipId = null;
        get().showVerified(id);
      }
    }
  },
}));
