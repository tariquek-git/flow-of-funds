"use client";

import "@xyflow/react/dist/style.css";
import { useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { track, trackFirstPostFlowAction } from "@/lib/analytics";
import { visibleEdges } from "@/lib/diagram/layout";
import { mountTurnstile, turnstileClientEnabled, unmountTurnstile } from "@/lib/turnstile-client";
import { startSessionPersistence } from "@/lib/state/persist";
import { decodeHashToFlow } from "@/lib/share";
import { FLOW_CATALOG } from "@/lib/flows/catalog";
import { parseReaderMode, parseSel } from "@/lib/flows/deeplink";
import { useStudio } from "@/lib/state/store";
import { isMobileNow } from "@/lib/state/useIsMobile";
import { StudioBriefView } from "./StudioBriefView";
import { markWelcomeSeen } from "./WelcomeOverlay";

export function Studio() {
  const flow = useStudio((s) => s.flow);
  const messages = useStudio((s) => s.messages);
  const launched = !!flow || messages.length > 0;
  const router = useRouter();
  const turnstileHostRef = useRef<HTMLDivElement>(null);

  // Mount the invisible Turnstile widget ONCE here, at this always-rendered
  // location — NOT inside ChatDock, which is unmounted before launch and when
  // chat is collapsed. That guarantees a fresh bot-check token is available for
  // the very first message of a session (including the landing ?q= handoff) and
  // every message after. DORMANT: a no-op unless NEXT_PUBLIC_TURNSTILE_SITE_KEY
  // is set, so it adds nothing to the tool until keys are provisioned.
  useEffect(() => {
    if (!turnstileClientEnabled || !turnstileHostRef.current) return;
    mountTurnstile(turnstileHostRef.current);
    return () => unmountTurnstile();
  }, []);

  // A bare /studio visit used to bounce to / on the theory that it would land
  // on an "empty launch screen that reads as a second landing page." The current
  // StudioBriefView has a useful empty state with question and template actions,
  // so a bare /studio remains a valid destination for guides and internal links.

  // Activation funnel: fire ONCE per page load the first time a flow actually
  // reaches the reader — on ANY surface. This used to live in FlowCanvas, which
  // the default level no longer mounts (Simple is the strip) and which mobile
  // never mounts at all, so the denominator silently stopped counting most
  // sessions. Content-free.
  const flowArrived = useRef(false);
  useEffect(() => {
    if (flow && !flowArrived.current) {
      flowArrived.current = true;
      track("first_flow_rendered");
    }
  }, [flow]);

  // Restore the last session and keep persisting this one (sessionStorage,
  // per-tab — see persist.ts; deliberately NOT localStorage).
  useEffect(() => {
    track("studio_entered");
    // On a phone, start with the canvas in view (chat is a summonable bottom
    // sheet, not a permanent half-screen) — unless a ?q handoff is arriving,
    // where chat should be open to show the generation stream. The handoff
    // effect re-opens chat via send() anyway, so this only affects restores.
    const hasQ =
      !!window.__fofHandoff?.q || !!new URLSearchParams(window.location.search).get("q");
    if (isMobileNow() && !hasQ) useStudio.getState().setChatOpen(false);
    return startSessionPersistence();
  }, []);

  // Handoff from the public landing page: arriving with ?q=… starts a fresh
  // generation immediately, so "type on the landing → the diagram builds" is
  // one continuous motion. Declared after the restore effect so it supersedes
  // any persisted session; the param is stripped first so a reload doesn't
  // re-run (and re-spend).
  useEffect(() => {
    // The payment query arrives via ?q=. The inline sanitizer in the root layout
    // has already lifted it out of the URL (so it never hit analytics/history)
    // and parked it on window.__fofHandoff. Fall back to the raw URL only if that
    // script didn't run (e.g. JS-disabled edge cases), stripping it ourselves.
    let q: string | null = window.__fofHandoff?.q ?? null;
    if (q == null) {
      try {
        q = new URLSearchParams(window.location.search).get("q");
        if (q) {
          const url = new URL(window.location.href);
          url.searchParams.delete("q");
          window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        }
      } catch {
        q = null;
      }
    }
    if (!q || !q.trim()) return;
    const state = useStudio.getState();
    if (state.busy) return;
    state.clear();
    void state.send(q.trim());
  }, []);

  // Shared-flow deep link: a "Copy link" share (ShareMenu) encodes the EXACT
  // flow into #f=<hash> (lib/share). On load, decode and load it directly — no
  // AI, no regeneration, so a colleague sees precisely what was shared. The hash
  // is UNTRUSTED input: decodeHashToFlow validates and returns null on anything
  // malformed/oversized/hostile, so a bad link is silently ignored. Cleared after
  // so a reload doesn't re-hydrate over later edits.
  useEffect(() => {
    const m = window.location.hash.match(/^#f=(.+)$/);
    if (!m) return;
    let cancelled = false;
    void decodeHashToFlow(m[1]).then((flow) => {
      if (cancelled || !flow) return;
      const state = useStudio.getState();
      if (state.busy) return;
      state.loadFlow(flow, "Shared flow");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Glossary "See it move" deep link: /learn/glossary/<term> links here as
  // /studio?seed=<catalogId>&sel=<node|edge>:<id>. Modeled on the #f= effect
  // above: consume the params, load the audited seed locally (no AI, no spend),
  // then select the term's element so the reader lands with the editor open on
  // it. Params are UNTRUSTED: an unknown seed (a rotted link) goes back to the
  // glossary index rather than stranding the reader in a bare studio; a
  // malformed/unknown sel is simply ignored and the seed still loads. Params
  // are stripped first so a reload doesn't re-run.
  useEffect(() => {
    let seedId: string | null = null;
    let sel: string | null = null;
    let requestedMode: "story" | "system" | null = null;
    let openLibrary = false;
    try {
      const params = new URLSearchParams(window.location.search);
      seedId = params.get("seed");
      sel = params.get("sel");
      requestedMode = parseReaderMode(params.get("mode"));
      openLibrary = params.get("library") === "1";
      if (seedId || sel || requestedMode || openLibrary) {
        const url = new URL(window.location.href);
        url.searchParams.delete("seed");
        url.searchParams.delete("sel");
        url.searchParams.delete("mode");
        url.searchParams.delete("library");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    } catch {
      return;
    }
    if (!seedId) {
      if (openLibrary) {
        markWelcomeSeen();
        useStudio.getState().setPopover("library");
      }
      return;
    }
    if (!FLOW_CATALOG[seedId]) {
      router.replace("/learn/glossary");
      return;
    }
    const state = useStudio.getState();
    if (state.busy) return;
    // The reader is arriving AT a loaded diagram — don't stack the first-run
    // welcome card on top of the landing.
    markWelcomeSeen();
    track("seed_deeplink", { seedId, hasSel: !!sel });
    let cancelled = false;
    void state.loadSeed(seedId).then(() => {
      if (cancelled) return;
      if (requestedMode === "system") {
        const s = useStudio.getState();
        s.setReaderMode("system");
        s.setViewMode("lanes");
      }
      const target = parseSel(sel);
      if (!target) return;
      const s = useStudio.getState();
      const exists =
        target.kind === "node"
          ? s.flow?.nodes.some((n) => n.id === target.id)
          : s.flow?.edges.some((e) => e.id === target.id);
      if (!exists) return;
      // Every flow opens at Simple, which shows only the money legs — a
      // glossary deep link often targets a MESSAGE leg (or a party whose legs
      // are all messages), and spotlighting an element the strip doesn't render
      // would land the reader on a strip with nothing highlighted. Climb to Detailed first so
      // the target is actually on screen. (setDetail clears arrivalFocus, so
      // it must run before the select/setArrivalFocus pair below.)
      if (s.flow && s.readerMode === "story") {
        const visible = visibleEdges(s.flow, "overview", null);
        const onScreen =
          target.kind === "edge"
            ? visible.some((e) => e.id === target.id)
            : visible.some((e) => e.source === target.id || e.target === target.id);
        if (!onScreen) s.setReaderMode("system");
      }
      // Order matters: select() clears arrivalFocus (any select is "the first
      // interaction"), so set the arrival dim after it.
      s.select(target);
      s.setArrivalFocus(target);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Keyboard: Esc closes topmost surface; 1/2 set Story/System; ⌘Z undoes;
  // ⌘K focuses the composer; ⌘S saves to My flows — detail/undo are no-ops
  // while typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "TEXTAREA" ||
          e.target.tagName === "INPUT" ||
          e.target.tagName === "SELECT" ||
          e.target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const composer = document.getElementById("fof-composer");
        if (composer) {
          composer.focus();
        } else {
          // Chat is collapsed — open it, then focus on the next frame.
          useStudio.getState().setChatOpen(true);
          requestAnimationFrame(() => document.getElementById("fof-composer")?.focus());
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        // Swallow the browser's save-page dialog even when there's nothing to
        // save — inside the studio ⌘S always means "save to My flows".
        e.preventDefault();
        const state = useStudio.getState();
        if (state.flow && !state.busy) state.saveMyFlow();
        return;
      }
      if (e.key === "Escape") {
        const state = useStudio.getState();
        if (state.selected) state.select(null);
        else if (state.popover) state.setPopover(null);
        else if (state.chatOpen) state.setChatOpen(false);
        return;
      }
      if (typing) return;
      if (e.key === "1" || e.key === "2") {
        const mode = (["story", "system"] as const)[Number(e.key) - 1];
        if (useStudio.getState().flow) {
          useStudio.getState().setReaderMode(mode);
          track("reader_mode_changed", { mode, via: "keyboard" });
          trackFirstPostFlowAction("reader_mode_changed");
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (!useStudio.getState().busy) useStudio.getState().undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {turnstileClientEnabled && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__fofTurnstileOnload"
            strategy="afterInteractive"
          />
          <div ref={turnstileHostRef} className="fixed bottom-3 left-3 z-[60]" />
        </>
      )}
      <StudioBriefView launched={launched} />
    </>
  );
}
