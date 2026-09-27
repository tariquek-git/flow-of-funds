import { NextRequest, after } from "next/server";
import { runAgent } from "@/lib/agent/run";
import { activeProvider } from "@/lib/agent/run";
import { friendlyProviderError } from "@/lib/agent/providerError";
import { newRunAccounting } from "@/lib/agent/types";
import { estimateUsd } from "@/lib/agent/cost";
import { clientIp, rateLimit, type RateResult } from "@/lib/ratelimit";
import {
  addSpend,
  capHeadroomUsd,
  CAP_HEADROOM_USD,
  dailyCapUsd,
  requireSharedStore,
  sharedStoreConfigured,
  warnIfNoSharedStore,
} from "@/lib/budget";
import { fofRpc, supabaseEnabled } from "@/lib/supabase";
import { constantTimeEqual } from "@/lib/gate";
import { clientGeo, regionHint, type ClientGeo } from "@/lib/geo";
import { isBotUA, resolveVisitorOrg } from "@/lib/visitor";
import { verifyTurnstile } from "@/lib/turnstile";
import { tryAcquire, release } from "@/lib/agent/concurrency";
import { validateFlow } from "@/lib/schema/validate";
import type { AgentRequest, RunAccounting, StreamEvent } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const CAPABILITIES = new Set(["generate", "edit", "explain", "critique"]);

/** True when a live (paid) AI provider key is configured — same set the gate
 *  middleware checks. With no key the route runs the zero-spend fixture provider,
 *  so there's nothing to protect. */
function hasLiveAiKey(): boolean {
  return !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );
}

const tooMany = (r: RateResult, msg: string) =>
  Response.json({ error: msg }, { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } });

/**
 * Conversation logging — the owner wants to review what people ask so the tool
 * can be improved during the beta. Writes ONE row to the locked `fof.conversations`
 * table via the anon-callable SECURITY DEFINER RPC `public.fof_log_query`.
 *
 * BACKGROUND-WRITE by contract: the caller must NOT await this in a way that
 * delays the SSE stream (it's async only to resolve the visitor org below).
 * Callers register it with Next's `after()` so the invocation stays alive for
 * the write once the response closes — a plain `void … .catch()` here let the
 * serverless context freeze before the write ran (the production outage this
 * path caused; see the call site). Guards on supabaseEnabled()
 * (no-op when the distributed store isn't configured) and swallows ALL errors —
 * logging must never break or slow a generation. Privacy: a COARSE region
 * (country/region/city from Vercel's edge) and a resolved visitor org/ASN are
 * included for owner analytics, but the IP itself is NOT stored — it's read
 * transiently for rate limiting and the org lookup only (see privacy page).
 */
async function logConversation(payload: {
  ts: string;
  sessionId: string | null;
  capability: string;
  prompt: string;
  responseText: string;
  flow: unknown;
  model: string | null;
  usage: RunAccounting["usage"];
  usd: number;
  /** Wall-clock ms for the whole run, and the sequential agentic round count.
      Persisted here (not only in the client agent_turn event) so latency is
      captured for every run, including tab-closed ones. Both drive /admin's
      latency view; rounds is null for the prose-only paths. */
  ms: number;
  rounds: number | null;
  /** How the run ended, so the owner can see in `fof.conversations` what people
      tried that FAILED or was abandoned — not only clean runs. Derived from
      whether the run errored / aborted / was refused vs. completed. */
  outcome: "success" | "error" | "aborted" | "refused";
  /** Calm one-line error/refusal reason when outcome !== "success"; null on a
      clean run. Capped — error text can embed flow/user fragments. */
  error: string | null;
  /** Coarse request region (country/region/city) for owner analytics — never the
      IP. Null in local dev or when the edge didn't provide geo headers. */
  geo: ClientGeo | null;
  /** Request IP, read only long enough to resolve an org/ASN below — never
      included in the stored payload itself. */
  ip: string;
  userAgent: string | null;
}): Promise<void> {
  if (!supabaseEnabled()) return;
  const isBot = isBotUA(payload.userAgent);
  const { org, asn } = isBot ? { org: null, asn: null } : await resolveVisitorOrg(payload.ip);
  const visitor = { org, asn, isBot };
  // Size clamps, mirroring the feedback route's flow-snapshot guard: rows are
  // for owner review, not archival, so a runaway response or a huge flow must
  // not bloat the locked table. fof_log_query receives the same payload shape —
  // only sizes are capped (oversized flow degrades to null, never throws).
  const flow = (() => {
    if (!payload.flow || typeof payload.flow !== "object") return payload.flow ?? null;
    try {
      return JSON.stringify(payload.flow).length <= 40000 ? payload.flow : null;
    } catch {
      return null;
    }
  })();
  // Destructure out `ip`/`userAgent` explicitly rather than spreading `payload`
  // wholesale — the IP must never reach the stored row, only the resolved
  // `visitor` org/ASN/bot flag computed above.
  const { ip: _ip, userAgent: _userAgent, ...rest } = payload;
  const capped = { ...rest, responseText: payload.responseText.slice(0, 4000), flow, visitor };
  // fofRpc never throws (it returns null on failure), but guard anyway so an
  // unexpected synchronous error can never bubble into the request path.
  //
  // In production every real conversation write silently failed for over a day
  // with nothing to grep. The ROOT CAUSE was a lifecycle bug at the call site,
  // not this write: it was fired as a bare `void … .catch()` after the SSE
  // response closed, so Vercel's Node runtime could freeze the context before
  // these awaits ran. That's fixed at the call site with Next's `after()`. The
  // two defenses below are kept as belt-and-suspenders, not as the fix:
  // 1. A console.log backup line (mirrors the feedback route's pattern) so the
  //    conversation survives in Vercel's runtime logs even if the DB write
  //    fails. 2. A longer timeout than fofRpc's 2.5s default — this payload can
  //    carry a 40KB flow + 4KB of response text, far bigger than the other
  //    RPCs, so the default budget may simply be too tight under load.
  try {
    const ok = await fofRpc("fof_log_query", { p_payload: capped }, 6000);
    if (ok === null) {
      console.log(`[conversation-log-fallback] ${JSON.stringify(capped)}`);
    }
  } catch {
    // swallow — logging is best-effort and must never affect the response.
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: AgentRequest;
  try {
    body = (await req.json()) as AgentRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!CAPABILITIES.has(body.capability) || typeof body.prompt !== "string") {
    return Response.json({ error: "Expected { capability, prompt, history }" }, { status: 400 });
  }
  if (
    body.requestedDetail !== "overview" &&
    body.requestedDetail !== "standard" &&
    body.requestedDetail !== "full"
  ) {
    body.requestedDetail = undefined;
  }

  // Service-to-service bridge (e.g. the Polaris WhatsApp bot). Authenticated by
  // a secret distinct from both the human gate passphrase and
  // FOF_ALLOW_SERVER_AGENT (that flag opens this route to ANY server caller;
  // this authenticates one specific, named caller). A bridge request skips the
  // browser-oriented guards below (origin, Turnstile) since it was never going
  // to have a browser Origin or a Turnstile token, but stays capped to the
  // cheap `explain` capability only and is rate-limited per end user (see
  // rateLimitKey below), never allowed to share one bucket across everyone the
  // bot talks to.
  const bridgeSecretEnv = process.env.FOF_BRIDGE_SECRET?.trim();
  const bridgeSecretHeader = req.headers.get("x-fof-bridge-secret");
  const isBridge = !!(
    bridgeSecretEnv &&
    bridgeSecretHeader &&
    constantTimeEqual(bridgeSecretHeader, bridgeSecretEnv)
  );
  if (isBridge && body.capability !== "explain") {
    return Response.json(
      { error: "The service bridge only supports capability=explain." },
      { status: 403 },
    );
  }

  // Same-origin guard. The studio's own fetch is same-origin, so a present
  // Origin must match the request host; a cross-origin Origin is a scripted /
  // CSRF-style caller and is refused before any spend. Origin-less (non-browser)
  // requests fall through to the per-IP rate limit + daily cap below. Cheap
  // defense-in-depth that matters most once the studio is ungated.
  const origin = req.headers.get("origin");
  if (!isBridge && origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    const host = req.headers.get("host");
    if (originHost && host && originHost !== host) {
      return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    }
  }

  // No-Origin hardening. A browser always sends Origin on a state-changing POST,
  // so the studio's own (same-origin) fetch is covered above. An Origin-LESS POST
  // is a non-browser caller (server, curl, a script) — the public-proxy abuse
  // vector once the studio is ungated (FOF_PUBLIC=1) and a live AI key is set.
  // Refuse it on a keyed deploy UNLESS the owner explicitly opts in
  // (FOF_ALLOW_SERVER_AGENT=1) or it's the authenticated bridge above. With NO
  // live key (fixture demo, local dev, CI) there is no spend to protect, so
  // allow it — keeps dev/tests/the open demo working. This closes the "curl
  // with no cookie/Origin spends real tokens" gap.
  if (!isBridge && !origin && hasLiveAiKey() && process.env.FOF_ALLOW_SERVER_AGENT !== "1") {
    return Response.json(
      { error: "Direct (non-browser) requests aren't allowed for this endpoint." },
      { status: 403 },
    );
  }

  // Bot check (Cloudflare Turnstile). DORMANT + FAIL-OPEN: a complete no-op
  // unless BOTH Turnstile keys are configured (see lib/turnstile). When enabled,
  // the client attaches a fresh single-use token per message; verify it here,
  // before any per-IP accounting or model spend. A missing/invalid/expired token
  // (or, when enabled, an unreachable Cloudflare) is refused with 403. The
  // bridge is exempt — it authenticates with its own secret and was never
  // going to have a browser-issued Turnstile token.
  if (!isBridge) {
    const turnstile = await verifyTurnstile((body as { turnstileToken?: unknown }).turnstileToken);
    if (!turnstile.ok) {
      return Response.json(
        { error: "Verification failed — please refresh the page and try again." },
        { status: 403 },
      );
    }
  }

  // Owner-operated emergency kill switch (set FOF_AI_GENERATION_ENABLED=0 in
  // the deploy env). The auth/browser guards above keep their normal 403
  // contract; this runs before any rate, concurrency, scope, moderation, or
  // provider work so a known-bad generation path cannot spend a single token.
  // Curated templates, saved flows, Story/System, exports, and sharing are
  // client-side and stay available. 503 + "generation is paused" is the exact
  // contract looksPaused() keys on: the client flips the paused banner +
  // template nudge and does not retry.
  if (process.env.FOF_AI_GENERATION_ENABLED === "0") {
    return Response.json(
      {
        error:
          "Live generation is paused while it is being hardened. Curated templates, saved flows, Story/System, exports, and sharing still work.",
      },
      { status: 503 },
    );
  }

  // Spend protection — layered so it holds up even with no passphrase gate in
  // front. Per client IP: a general anti-flood ceiling on every call, then a
  // tighter window on the paid heavy capabilities (generate/edit/critique, which
  // hit the heavy model) and a looser per-day ceiling on the cheap `explain`.
  // Above all of them sits the app-wide daily $ kill-switch (capHeadroomUsd).
  const ip = clientIp(req);
  // Bridge requests all arrive from the same server IP regardless of which
  // WhatsApp member is actually asking — keying rate limits on `ip` would let
  // the whole community share one bucket (the first few messages of the day
  // lock everyone else out). The bot passes a stable per-sender id; namespaced
  // so it can never collide with a real visitor IP, and falls back to `ip` if
  // the header is missing so a misconfigured bridge fails safe (shared,
  // conservative bucket) rather than unbounded.
  const bridgeUser = isBridge
    ? (req.headers.get("x-fof-bridge-user") || "").slice(0, 128).trim()
    : null;
  const rateLimitKey = bridgeUser ? `bridge:${bridgeUser}` : ip;

  // Anonymous client session id (localStorage), sent with each request so the
  // owner can group a visitor's questions in the conversation log. Coerce/cap it
  // — it's untrusted client input that goes straight into a logged payload. A
  // bridge request has no client-side session id at all, so log the sender
  // identity there instead — otherwise every WhatsApp-driven conversation would
  // show up identically anonymous, indistinguishable from real web traffic.
  const sessionId = isBridge
    ? bridgeUser
      ? `bridge:${bridgeUser}`
      : "bridge:unknown"
    : typeof body.sessionId === "string" && body.sessionId.length <= 100
      ? body.sessionId
      : null;

  // Opt-out: an owner/dev browser with ?notrack=1 sends this header so its own
  // test generations stay out of the conversation log + /admin. Limits + the
  // spend kill-switch below still apply regardless.
  const noTrack = req.headers.get("x-fof-notrack") === "1";
  // Coarse request region for owner analytics (country/region/city), read from
  // Vercel's edge headers — never the IP itself. See logConversation + privacy.
  const geo = clientGeo(req);
  // Feed the viewer's covered region to the agent so it can default an ambiguous
  // request to the right country ("looks like you're in Canada, so Interac…").
  // Derived server-side from geo; never trusted from the client body.
  body.viewerRegion = regionHint(geo) ?? undefined;
  const flood = await rateLimit("agent", rateLimitKey, 20, 60); // 20 / min
  if (!flood.ok) return tooMany(flood, "Slow down — too many requests. Try again in a moment.");
  if (body.capability !== "explain") {
    const burst = await rateLimit("agent-heavy", rateLimitKey, 12, 300); // 12 / 5 min
    if (!burst.ok) return tooMany(burst, "You're generating quickly — give it a minute and retry.");
    const daily = await rateLimit("agent-heavy-day", rateLimitKey, 60, 86_400); // 60 / day
    if (!daily.ok) return tooMany(daily, "Daily generation limit reached. Back tomorrow, or say hello at hello@fintechnorth.ca.");
  } else {
    // `explain` runs on the cheap light model, but it still spends and still
    // counts toward the daily cap below — so give it its own per-key daily
    // ceiling. Without the passphrase gate in front, this is what stops a single
    // source from grinding cheap explain calls all day long.
    const explainDay = await rateLimit("agent-explain-day", rateLimitKey, 40, 86_400); // 40 / day
    if (!explainDay.ok) return tooMany(explainDay, "Daily limit reached. Back tomorrow, or say hello at hello@fintechnorth.ca.");
  }
  // Make a dangerous misconfig loud: with no shared store the cap + per-IP limits
  // are per-instance only, so the "global" cap is effectively N× too loose on
  // serverless. Warn once; refuse outright only when the owner opts in
  // (FOF_REQUIRE_SHARED_CAP=1), so local dev and current prod behaviour are
  // unchanged by default.
  warnIfNoSharedStore();
  if (requireSharedStore() && !sharedStoreConfigured()) {
    return Response.json(
      {
        error:
          "Live generation is temporarily unavailable (server is missing a shared spend store). Templates and saved flows still work.",
      },
      { status: 503 },
    );
  }
  // App-level spend kill-switch: a true daily $ ceiling across ALL clients and
  // ALL paid capabilities (explain spend is charged to the cap too), so once the
  // day's AI budget is gone, every model call pauses — not just the heavy ones.
  // Refuse once less than one run's headroom remains, not just at the exact cap,
  // so concurrent pre-run checks can't collectively overshoot. Client-side
  // templates and saved flows never hit the model, so they keep working when paused.
  if ((await capHeadroomUsd()) <= CAP_HEADROOM_USD) {
    return Response.json(
      {
        error: `Live generation is paused — the studio hit its daily AI budget (~$${dailyCapUsd()}). Templates and saved flows still work; try generating again tomorrow.`,
      },
      { status: 503 },
    );
  }
  body.history = Array.isArray(body.history) ? body.history : [];
  // Cheap spend seatbelts — the UI never produces these, so reject loudly.
  if (body.prompt.length > 4_000) {
    return Response.json({ error: "Prompt too long (4,000 character limit)" }, { status: 413 });
  }
  try {
    if (body.currentFlow && JSON.stringify(body.currentFlow).length > 200_000) {
      return Response.json({ error: "Flow too large" }, { status: 413 });
    }
  } catch {
    return Response.json({ error: "Flow not serializable" }, { status: 413 });
  }
  // Validate client-authored currentFlow against the Zod schema at the trust
  // boundary, BEFORE it's stringified into the model's user turn (prompt.ts) or
  // cloned into the edit draft (openai.ts/claude.ts). The `as AgentRequest` cast
  // above is a compile-time fiction over untrusted JSON; without this a crafted
  // but <200KB flow flows verbatim into the model context. The output is already
  // re-validated on the way out, but validating on the way IN keeps the injected
  // JSON well-formed (real node ids, edges referencing real nodes) and rejects
  // garbage early instead of wasting a paid round on it.
  if (body.currentFlow != null) {
    const parsed = validateFlow(body.currentFlow);
    if (!parsed.ok) {
      return Response.json({ error: "Invalid flow payload" }, { status: 400 });
    }
    body.currentFlow = parsed.flow;
  }
  body.history = body.history.slice(-8).map((t) => ({
    // Coerce role to a valid value (the client type is compile-time only) so a
    // crafted role can't reach the model and bounce a 400 off the provider.
    role: t.role === "assistant" ? "assistant" : "user",
    text: typeof t.text === "string" ? t.text.slice(0, 8_000) : "",
  }));
  // selected is interpolated into the user turn and re-sent every agentic round
  // — validate + cap it like the other fields so a giant or malformed value
  // can't bloat input spend or inject free text.
  if (body.selected != null) {
    const s = body.selected as { kind?: unknown; id?: unknown };
    if ((s.kind !== "node" && s.kind !== "edge") || typeof s.id !== "string" || s.id.length > 200) {
      body.selected = null;
    }
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();
  // One structured line per run (Vercel captures stdout) — enough to diagnose
  // a failed demo and to seed next week's tuning, without logging prompt or
  // flow content.
  const runLog: Record<string, unknown> = {
    evt: "agent_run",
    capability: body.capability,
    promptChars: body.prompt.length,
    hasFlow: !!body.currentFlow,
  };
  // Run accounting the provider fills live (model + token usage as they arrive,
  // plus prose + final flow). The route reads this in finally so spend is charged
  // and the conversation logged REGARDLESS of how the run ends — a clean finish,
  // a client abort, or a mid-stream provider error (audit RED-1). The `done`
  // event still populates runLog for the existing stdout diagnostics line.
  const acct = newRunAccounting();
  // Client-disconnect handling: stop emitting AND abort the upstream model
  // stream — a closed laptop mid-demo must not keep spending tokens.
  const upstream = new AbortController();
  let closed = false;
  // Outcome tracking (see the stream below). Declared here so the abort handlers
  // — which can fire before the stream's start() runs — can mark "aborted".
  let outcome: "success" | "error" | "aborted" | "refused" = "success";
  let errorMessage: string | null = null;
  req.signal.addEventListener("abort", () => {
    closed = true;
    runLog.aborted = true;
    outcome = "aborted";
    upstream.abort();
  });
  // If the client disconnected before the listener attached, the abort event has
  // already fired — short-circuit so we don't spend on a request that's gone.
  if (req.signal.aborted) {
    closed = true;
    runLog.aborted = true;
    outcome = "aborted";
    upstream.abort();
  }
  // Run OUTCOME tracking for the conversation log (declared above so the abort
  // handlers can reach it). The owner wants to see what people tried that FAILED
  // or was abandoned — not only clean runs. Default "success"; downgrade as
  // terminal events arrive:
  //  - an `error` event  → "error"  (with its message captured in runLog.error)
  //  - a `done` event whose stopReason starts with "refused:" → "refused"
  //    (the scope guard politely declined; not a failure of the studio)
  //  - a client abort (req.signal) → "aborted" (set in the abort handler above)
  // The `finally` reads these to stamp `outcome`/`error` on the logged payload.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        if (event.type === "done") {
          runLog.provider = event.provider;
          runLog.model = event.model;
          runLog.usage = event.usage;
          runLog.diagnostics = event.diagnostics;
          // A polite scope refusal completes cleanly with a "refused:" stopReason
          // and no error event — surface it distinctly so the owner can see the
          // off-topic / jailbreak asks that were declined.
          if (outcome === "success" && event.diagnostics?.stopReason?.startsWith("refused:")) {
            outcome = "refused";
            errorMessage = event.diagnostics.stopReason.slice(0, 300);
          }
        } else if (event.type === "error") {
          // Error text can embed flow/user fragments — cap what reaches logs.
          runLog.error = event.message.slice(0, 300);
          // An abort can race ahead of the error event; don't let a late error
          // overwrite a genuine "aborted" classification.
          if (outcome !== "aborted") {
            outcome = "error";
            errorMessage = event.message.slice(0, 300);
          }
        }
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
          runLog.aborted = true;
          upstream.abort();
        }
      };

      // Concurrency gate: prevent too many simultaneous agent runs from
      // overwhelming the AI provider's rate limits. When all slots are taken,
      // return a calm "busy" response immediately — same pattern as the per-IP
      // rate limits, but keyed on in-process slot count instead of IP.
      if (!tryAcquire()) {
        await emit({
          type: "error",
          message: "The studio is busy handling other requests right now. Give it a moment and try again.",
        });
        await emit({
          type: "done",
          provider: activeProvider(),
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          diagnostics: { droppedOps: 0, stopReason: "refused: concurrency gate" },
        });
        return;
      }
      // Route-level keepalive: a comment frame every 10s so the client's no-event
      // watchdog never false-fires during ANY silent phase — model reasoning, the
      // scope pre-flight, a slow upstream connect, or the seam between agentic
      // rounds. Provider-agnostic (covers the Claude path, which has no heartbeat
      // of its own) and SSE-comment-safe: ":" frames reset the client's last-event
      // timer but are skipped by its `data:` parser. Paired with the response's
      // X-Accel-Buffering:no so the comment actually flushes through the proxy.
      const keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // stream already torn down; emit()/finally handle teardown
        }
      }, 10_000);
      try {
        await runAgent(body, emit, upstream.signal, acct);
      } catch (error) {
        if (!upstream.signal.aborted) {
          // A THROWN provider/SDK failure (spend cap, quota, upstream outage)
          // carries raw, alarming text — e.g. Anthropic's
          // `400 {"type":"error",...,"You have reached your specified API usage
          // limits..."}`. Never forward it verbatim: map to calm, on-brand copy.
          // Spend-cap/quota copy contains "generation is paused", which the
          // client's looksPaused() keys on to flip the paused banner and skip
          // the retry.
          emit({ type: "error", message: friendlyProviderError(error) });
        }
      } finally {
        release();
        clearInterval(keepalive);
        const elapsedMs = Date.now() - startedAt;
        runLog.ms = elapsedMs;
        // Cost visibility + cap enforcement from the SHARED accounting, not the
        // `done` event. Before RED-1 this read runLog.model/runLog.usage, which
        // only the `done` event set — so an errored/aborted/timed-out run dropped
        // its consumed-token spend from the daily cap (a cap-evasion path). The
        // provider now accumulates usage into `acct` live, so whatever tokens the
        // model actually consumed are charged here regardless of how the run ended.
        let usd = 0;
        if (acct.model && (acct.usage.input || acct.usage.output || acct.usage.cacheRead || acct.usage.cacheWrite)) {
          // estimateUsd never returns null — an unknown model fails safe to the
          // most expensive known rates (it warns) so the daily cap can't be
          // silently disabled by a model-name drift. addSpend ignores <=0.
          usd = estimateUsd(acct.model, acct.usage);
          runLog.usdEstimate = usd;
          // Count real spend toward the daily cap (every capability, for an
          // accurate total — the gate above only blocks the heavy ones).
          await addSpend(usd);
        }
        // Conversation log (owner review). NOT awaited into the response path —
        // it must never delay the SSE stream (the caller-must-not-await contract
        // above still holds). But it is registered with Next's `after()` instead
        // of plain fire-and-forget: `after()` keeps the serverless invocation
        // alive until this background write settles. A bare `void … .catch()`
        // here was the confirmed production outage — the SSE response closes on
        // the next line, and Vercel's Node runtime can freeze/recycle the
        // execution context before the detached promise's `resolveVisitorOrg` +
        // `fofRpc` (and even its own console.log fallback) ever run, silently
        // dropping every conversation write with zero trace while the awaited
        // sibling writes in this same request (spend, rate-limit) survived. This
        // is called inside the stream's start() continuation, which still runs
        // within the route's request scope, so `after()` is valid here. Logs the
        // prompt, the captured AI prose, and the resulting flow when there was
        // one. No IP. Skipped for an opted-out (?notrack=1) browser.
        if (!noTrack) {
          after(() =>
            logConversation({
              ts: new Date(startedAt).toISOString(),
              sessionId,
              geo,
              ip,
              userAgent: req.headers.get("user-agent"),
              capability: body.capability,
              prompt: body.prompt,
              responseText: acct.responseText,
              flow: acct.flow,
              model: acct.model,
              usage: acct.usage,
              usd,
              // Latency + round count, persisted server-side so EVERY run carries
              // them — including tab-closed runs the client agent_turn event drops.
              // Wall-clock is dominated by round count; storing both makes the
              // loop-tuning measurable against real percentiles in /admin.
              ms: elapsedMs,
              rounds: acct.rounds || null,
              // Outcome + reason so the owner can review failed/abandoned/refused runs,
              // not just clean ones. `error` is null on success.
              outcome,
              error: outcome === "success" ? null : errorMessage,
            }).catch(() => {}),
          );
        }
        // Mirror the outcome into the stdout diagnostics line too — a failed demo
        // is now greppable by outcome without opening the conversation table.
        runLog.outcome = outcome;
        console.log(JSON.stringify(runLog));
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed by the runtime
          }
        }
      }
    },
    cancel() {
      closed = true;
      runLog.aborted = true;
      outcome = "aborted";
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy/CDN buffering (Vercel edge, nginx) so the per-round
      // heartbeats (openai.ts) actually reach the client DURING silent reasoning.
      // Without this the SSE stream is buffered upstream, the heartbeats arrive in
      // a late batch, and the client's no-event watchdog false-fires mid-think —
      // killing a perfectly healthy 60-90s generation.
      "X-Accel-Buffering": "no",
    },
  });
}
