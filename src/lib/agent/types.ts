import type { FlowOfFunds, FollowUp } from "@/lib/schema/flow";
import type { FlowOp } from "@/lib/schema/ops";

export type Capability = "generate" | "edit" | "explain" | "critique";

export type HistoryTurn = { role: "user" | "assistant"; text: string };

export type AgentRequest = {
  capability: Capability;
  prompt: string;
  history: HistoryTurn[];
  currentFlow?: FlowOfFunds | null;
  selected?: { kind: "node" | "edge"; id: string } | null;
  /** Legacy internal density passed while the Story/System migration lands.
      The prompt normalizes overview→Story and standard/full→System. */
  requestedDetail?: "overview" | "standard" | "full";
  /** Anonymous client-generated session id (localStorage), used only to group a
      visitor's questions in the owner's conversation log. Not an account, not
      tied to any name/email. Validated + capped server-side. */
  sessionId?: string | null;
  /** Friendly covered-region name inferred from the viewer's connection (e.g.
      "Canada"), set SERVER-SIDE from the geo headers — never trusted from the
      client. The agent uses it as the default region when a request doesn't name
      one. Omitted outside the covered regions. */
  viewerRegion?: string;
};

/** Server → client SSE events. The canvas applies `op` events live. */
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "op"; op: FlowOp }
  | { type: "flow"; flow: FlowOfFunds }
  // Inline string-literal types (not an import of ReaderMode) to avoid a
  // circular import with the store, which imports StreamEvent from here.
  | {
      type: "view";
      mode?: "story" | "system";
      lens?: "all" | "money" | "message" | "exception";
      focus?: string | null;
      // Spatial layout (mirrors ViewMode in state/store.ts, inlined to avoid a
      // circular import). Switches map / lanes / timeline without redrawing.
      viewMode?: "map" | "lanes" | "timeline";
    }
  | { type: "followups"; followups: FollowUp[] }
  | { type: "status"; message: string }
  | {
      type: "done";
      provider: "claude" | "fixture" | "openai" | "deepseek";
      model?: string;
      usage?: { input: number; output: number; cacheRead: number; cacheWrite: number };
      /** Honesty accounting from the live path — logged server-side per run. */
      diagnostics?: { droppedOps: number; stopReason: string | null };
    }
  | { type: "error"; message: string };

export type Emit = (event: StreamEvent) => void | Promise<void>;

/**
 * Mutable run accounting the route hands to the provider so spend is recorded
 * REGARDLESS of how the run ends (clean finish, client abort, mid-stream error,
 * timeout). The provider updates `usage` live as token-usage chunks arrive and
 * sets `model` once known; the route's `finally` reads whatever was consumed and
 * (a) charges it to the daily cap and (b) feeds the conversation log. Before this
 * existed, spend was only counted on the `done` event, so an errored/aborted run
 * dropped its consumed tokens from the cap — a cap-evasion path (audit RED-1).
 *
 * `responseText` accumulates the AI prose (for the conversation log); `flow` holds
 * the final validated flow when one is produced. Both are best-effort capture.
 */
export type RunAccounting = {
  model: string | null;
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
  responseText: string;
  flow: FlowOfFunds | null;
  /** Set true the moment a provider emits its FIRST `op` to the client. The
      DeepSeek fallback retry keys on this so it never re-draws on top of ops the
      OpenAI run already rendered live (usage + flow only land at the very end —
      too late to detect a mid-stream failure that already streamed canvas ops). */
  anyOpsEmitted: boolean;
  /** Sequential agentic rounds this build took. Persisted to the conversation
      log so latency (wall-clock is dominated by round count) is measurable per
      run — including tab-closed runs the client-side agent_turn event misses. */
  rounds: number;
};

export function newRunAccounting(): RunAccounting {
  return {
    model: null,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    responseText: "",
    flow: null,
    anyOpsEmitted: false,
    rounds: 0,
  };
}
