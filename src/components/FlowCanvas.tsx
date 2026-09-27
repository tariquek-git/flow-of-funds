"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenerationProgress } from "./GenerationProgress";
import {
  Background,
  BackgroundVariant,
  Controls,
  getViewportForBounds,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { DIMS, EDGE_LEGEND, buildEdges, layoutFlow, layoutFlowLanes, layoutFlowTimeline, orderedVisibleEdges } from "@/lib/diagram/layout";
// (Simple never mounts this canvas — Studio renders the StoryStrip instead.
// While a generation is DRAWING at Simple, the canvas shows the flow at
// standard density, so `detail` below is mapped away from "overview".)
import { elementProvenance, type ElementProvenance } from "@/lib/export/exhibit";
import { useLabelLayout } from "@/lib/state/labelLayout";
import { useStudio } from "@/lib/state/store";
import { isMobileNow, useIsMobile } from "@/lib/state/useIsMobile";
import { FofNodeView, LaneBandView, TimeBandView } from "./FofNode";
import { FofEdgeView } from "./FofEdge";
import { EDGE_GLYPH } from "./edgeGlyph";

const nodeTypes = { fofNode: FofNodeView, laneBand: LaneBandView, timeBand: TimeBandView };
const edgeTypes = { fofEdge: FofEdgeView };

function CanvasInner({ minimal = false }: { minimal?: boolean }) {
  const flow = useStudio((s) => s.flow);
  const selected = useStudio((s) => s.selected);
  const select = useStudio((s) => s.select);
  const setNodePosition = useStudio((s) => s.setNodePosition);
  const busy = useStudio((s) => s.busy);
  const detailRaw = useStudio((s) => s.detail);
  // This canvas only mounts at standard/full — or at Simple WHILE a generation
  // is drawing (Studio's showStrip gate), where it renders standard density.
  const detail = detailRaw === "overview" ? "standard" : detailRaw;
  const viewMode = useStudio((s) => s.viewMode);
  const edgeFilterRaw = useStudio((s) => s.edgeFilter);
  const lensRaw = useStudio((s) => s.lens);
  const edgeFilter = minimal ? null : edgeFilterRaw;
  const lens = minimal ? "all" : lensRaw;
  const arrivalFocus = useStudio((s) => s.arrivalFocus);
  const setLens = useStudio((s) => s.setLens);
  const walkStep = useStudio((s) => s.walkStep);
  const stepWalk = useStudio((s) => s.stepWalk);
  const endWalk = useStudio((s) => s.endWalk);
  const { getNodes, getNodesBounds, setViewport, getViewport } = useReactFlow();

  // Guided walkthrough: the ordinal-sorted, detail-visible legs (same list the
  // mobile StepView reads). The store holds only the index; this derives the
  // list, and the effect below ends the walk when the index steps off either
  // end (Back past 1 or Next past the last leg = "done").
  // The ONE reading order (story order at Simple, ordinal order above) shared
  // with the chip numbers and the mobile StepView — see orderedVisibleEdges.
  const walkLegs = useMemo(() => (flow ? orderedVisibleEdges(flow, detail) : []), [flow, detail]);
  const walking = walkStep !== null && walkLegs.length > 0;
  const walkLeg = walking && walkStep >= 0 && walkStep < walkLegs.length ? walkLegs[walkStep] : null;
  useEffect(() => {
    if (walkStep !== null && (walkStep < 0 || walkStep >= walkLegs.length)) endWalk();
  }, [walkStep, walkLegs.length, endWalk]);
  // Keyboard while walking: arrows step, Esc ends. Registered only during a walk
  // so it can't shadow the studio's global key handling the rest of the time.
  useEffect(() => {
    if (!walking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); stepWalk(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepWalk(-1); }
      else if (e.key === "Escape") { e.preventDefault(); endWalk(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walking, stepWalk, endWalk]);

  // Lens (story) + legend category drive focus+CONTEXT inside the layout: legs
  // outside the focus dim to faint context, never removed, so the whole flow
  // still reads while one story is traced. viewMode picks the spatial layout:
  // the dagre map (default) or the party-swimlane view (each party in its own
  // lane). Both share the SAME edge styling + dimming, so the detail dial,
  // lenses, provenance markers, and glossary work identically in either view.
  // Split positions from edges so a lens / legend toggle (which only dims legs)
  // never re-runs the dagre/lane/timeline LAYOUT. Node positions depend only on
  // [flow, detail, viewMode] (edgeFilter/lens never affect positions), so this
  // memo stays stable across dimming; only the cheap buildEdges memo below reruns
  // on a lens/filter change. nodeBoxes/bandBounds derive from these stable nodes,
  // so they (and the label-collision store) stop churning on every dim toggle.
  const nodes = useMemo(() => {
    if (!flow) return [];
    if (viewMode === "lanes") return layoutFlowLanes(flow, detail).nodes;
    if (viewMode === "timeline") return layoutFlowTimeline(flow, detail).nodes;
    return layoutFlow(flow, detail).nodes;
  }, [flow, detail, viewMode]);
  // arrivalFocus (glossary deep-link landing) rides the same dim as lens/legend.
  // An active walkthrough overrides it: the current leg is the sole spotlight
  // (identical dim mechanics — everything else drops to faint context).
  const walkLegId = walkLeg?.id ?? null;
  const focus = useMemo(
    () => (walkLegId ? ({ kind: "edge", id: walkLegId } as const) : arrivalFocus),
    [walkLegId, arrivalFocus],
  );
  const edges = useMemo(
    () => (flow ? buildEdges(flow, edgeFilter, lens, focus) : []),
    [flow, edgeFilter, lens, focus],
  );
  // Per-element provenance for the on-canvas markers (verified seal vs AI
  // sparkle). Computed once per flow change into a single id→provenance map, so
  // each leaf marker reads a precomputed value instead of recomputing (or, worse,
  // querying the DOM) every render. Keyed by element id; node/edge id collisions
  // are not a concern because each map is scoped to its own element set.
  const nodeProvenance = useMemo(() => {
    const m = new Map<string, ElementProvenance>();
    if (flow) for (const n of flow.nodes) m.set(n.id, elementProvenance(flow, { kind: "node", id: n.id }));
    return m;
  }, [flow]);
  const edgeProvenance = useMemo(() => {
    const m = new Map<string, ElementProvenance>();
    if (flow) for (const e of flow.edges) m.set(e.id, elementProvenance(flow, { kind: "edge", id: e.id }));
    return m;
  }, [flow]);
  // Selection changes every click, but only the (de)selected elements actually
  // change — cloning EVERY node/edge with a fresh data object on each click
  // would defeat the memo() on FofNodeView/FofEdgeView and re-render the whole
  // canvas. So decorate in two steps: a selection-free base (stable across
  // clicks; only recomputes on layout/provenance changes), then a cheap second
  // memo that clones JUST the selected element. Every other element keeps its
  // object identity, so its memoized view skips the re-render.
  const baseRfNodes = useMemo(
    () =>
      nodes.map((n) =>
        n.type === "fofNode"
          ? {
              ...n,
              selected: false,
              data: { ...n.data, _provenance: nodeProvenance.get(n.id) },
            }
          : n,
      ),
    [nodes, nodeProvenance],
  );
  const rfNodes = useMemo(() => {
    if (selected?.kind !== "node") return baseRfNodes;
    return baseRfNodes.map((n) => (n.id === selected.id ? { ...n, selected: true } : n));
  }, [baseRfNodes, selected]);
  const [revealing, setRevealing] = useState(false);

  // (The one-time lens cue that used to whisper here was removed with the
  // Simple-first pass: it advertised a control the default view hides, and its
  // burn timer ran while the cue was invisible — a nudge that could only
  // misfire. The legend itself, at Detailed+, is the lens's discoverability.)

  // Legend isolation (edgeFilter) is applied upstream in layoutFlow, so `edges`
  // already contains only the visible legs — here we just mark the selected one.
  // Band boundaries in flow coordinates — passed into each edge so FofEdgeView
  // can nudge chips clear of inter-lane gaps without needing the ReactFlow store.
  const bandBounds = useMemo(
    () =>
      nodes
        .filter((n) => n.id.startsWith("__band-"))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((n) => ({ top: n.position.y, bottom: n.position.y + ((n as any).height ?? 120) }))
        .sort((a, b) => a.top - b.top),
    [nodes],
  );

  // Party-node rectangles (flow coords) — passed into each edge so FofEdgeView can
  // nudge a chip clear of any node box. Same-lane horizontal legs otherwise drop a
  // wide chip right across the node row. Footprint comes from DIMS (the dagre size),
  // not the measured DOM, so it's available before React Flow measures.
  const nodeBoxes = useMemo(() => {
    const d = DIMS[detail] ?? DIMS.standard;
    return nodes
      .filter((n) => n.type === "fofNode")
      .map((n) => ({
        top: n.position.y,
        bottom: n.position.y + d.h,
        left: n.position.x,
        right: n.position.x + d.w,
      }));
  }, [nodes, detail]);

  // Feed node boxes to the global label-collision store so it keeps de-overlapped
  // chips clear of the node rows (the same boxes the per-edge nudge uses).
  useEffect(() => {
    useLabelLayout.getState().setBoxes(nodeBoxes);
  }, [nodeBoxes]);

  // Identity-preserving decoration — see the rfNodes comment above.
  const baseRfEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        selected: false,
        data: {
          ...e.data,
          _bandBounds: bandBounds,
          _nodeBoxes: nodeBoxes,
          _provenance: edgeProvenance.get(e.id),
        },
      })),
    [edges, bandBounds, nodeBoxes, edgeProvenance],
  );
  const rfEdges = useMemo(() => {
    if (selected?.kind !== "edge") return baseRfEdges;
    return baseRfEdges.map((e) => (e.id === selected.id ? { ...e, selected: true } : e));
  }, [baseRfEdges, selected]);

  // Throttled refit with a trailing call (see git history for the full saga):
  // fit at most ~every 450ms while ops stream, once more when quiet, with a
  // DOM-verified settle loop at the end.
  const nodeCount = flow?.nodes.length ?? 0;
  const edgeCount = flow?.edges.length ?? 0;
  const fitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFit = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Manual fit: measure the pane in the DOM, compute the viewport from node
  // bounds, set it directly. React Flow's own fitView() goes through its
  // internal dimension store, which stays [0,0] when the canvas mounts
  // unsized (error #004) — its promise then hangs forever and every queued
  // fit is silently dropped. setViewport() bypasses all of that.
  // When the ElementEditor is open it occupies a ~336px panel on the right
  // (w-80 + right-4). On narrower viewports that panel can cover the very node
  // being edited. Reserve that strip from the fit (see reservedRight below) so
  // the diagram sits in the visible region to the left of the panel and the
  // edited element stays in view. The current selection is read from the store
  // at call time (doFit runs in effects/handlers, never during render) so it
  // isn't a doFit dependency.
  const doFit = useCallback(() => {
    lastFit.current = Date.now();
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width < 40 || height < 40) return;
    const measured = getNodes();
    if (!measured.length) return;
    // The panel footprint is w-80 (320) + right-4 (16) = 336; reserve that plus
    // a ~16px gap so the edited element clears it with breathing room (the fit's
    // own content margin can otherwise let the outermost node abut the panel).
    // The 0.58 cap keeps reserve ≥ the 336 panel even on the narrowest target
    // (a ~644px pane = 1024px viewport with the chat dock open), while still
    // leaving usable content width for the (single) element under edit.
    // On a phone, skip the right-strip reserve entirely: the ElementEditor is a
    // right-anchored panel clamped to the viewport width, and reserving ~336px on
    // a narrow screen was what pushed the diagram off the right edge. Desktop
    // keeps the strip clear so the floating editor never covers the edited node.
    // Read the live viewport class at fit time — the useIsMobile hook value can
    // lag a frame behind hydration, and the fit must NOT run with stale desktop
    // math (that left the diagram clipped on the sides). matchMedia can't be stale.
    const mobile = isMobileNow();
    const reservedRight = !mobile && useStudio.getState().selected ? Math.min(360, width * 0.58) : 0;
    const fitWidth = width - reservedRight;
    // No animation under reduced motion — and none in hidden tabs, where
    // rAF-driven transitions pause and an animated fit would never land.
    const instant =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.visibilityState === "hidden";
    // Fit to the real party nodes, not the lane bands — the bands extend well
    // past the outermost nodes, which otherwise widens the bounds, makes WIDTH
    // bind, and floats the diagram with vertical slack. A symmetric margin keeps
    // the bands on-screen without re-skewing the aspect; a higher maxZoom lets
    // small flows grow to fill instead of sitting tiny.
    const content = measured.filter((n) => n.type !== "laneBand" && n.type !== "timeBand");
    const bounds = getNodesBounds(content.length ? content : measured);
    // Tighter margin on a phone so width binds and labels open legible instead
    // of at the zoom floor; desktop keeps the roomier frame.
    const M = mobile ? 20 : 56;
    bounds.x -= M;
    bounds.y -= M;
    bounds.width += M * 2;
    bounds.height += M * 2;
    // Let a small flow grow more on a phone (fills the narrow width); a lower fit
    // floor lets a genuinely wide one shrink to fit without clipping the edges.
    const maxZoom = mobile ? 2 : content.length <= 6 ? 1.6 : 1.3;
    const fitMinZoom = mobile ? 0.04 : 0.06;
    let viewport;
    if (mobile) {
      // Phone: bind to WIDTH so the full left-to-right flow fits and never clips
      // a swimlane (getViewportForBounds fits BOTH dims, so on a short mobile pane
      // HEIGHT binds and shoves the sides off). getNodesBounds also UNDER-reports
      // width — nodes render wider than their laid-out box — so measure the REAL
      // rendered span from the DOM and convert back to flow units via the current
      // viewport. The settle loop re-runs this until the rects truly fit.
      const paneEl = wrapRef.current;
      const nodeEls = paneEl ? [...paneEl.querySelectorAll<HTMLElement>(".react-flow__node")] : [];
      const cur = getViewport();
      const paneRect = paneEl?.getBoundingClientRect();
      let bx = bounds.x;
      let by = bounds.y;
      let bw = bounds.width;
      let bh = bounds.height;
      if (nodeEls.length && paneRect && cur.zoom > 0) {
        const rs = nodeEls.map((n) => n.getBoundingClientRect());
        const left = (Math.min(...rs.map((r) => r.left)) - paneRect.left - cur.x) / cur.zoom;
        const right = (Math.max(...rs.map((r) => r.right)) - paneRect.left - cur.x) / cur.zoom;
        const top = (Math.min(...rs.map((r) => r.top)) - paneRect.top - cur.y) / cur.zoom;
        const bottom = (Math.max(...rs.map((r) => r.bottom)) - paneRect.top - cur.y) / cur.zoom;
        bx = left - M;
        by = top - M;
        bw = right - left + M * 2;
        bh = bottom - top + M * 2;
      }
      const pad = 0.06;
      const zoom = Math.max(fitMinZoom, Math.min(maxZoom, (fitWidth * (1 - pad)) / bw));
      const contentH = bh * zoom;
      const x = (fitWidth - bw * zoom) / 2 - bx * zoom;
      // When a node/edge is selected on mobile the ElementEditor is a bottom sheet
      // covering ~62% of the height — fit the diagram into the top band so the
      // tapped element stays visible above it. Otherwise use the full height.
      const availH = useStudio.getState().selected ? height * 0.36 : height;
      const y = (contentH <= availH ? (availH - contentH) / 2 : 12) - by * zoom;
      viewport = { x, y, zoom };
    } else {
      // getNodesBounds reports the laid-out node BOXES, but a node renders WIDER
      // than its box (long labels, the subtype chip), so the rightmost party
      // (e.g. the Employee node in payroll) could clip off the right edge. Expand
      // the fit bounds to the REAL rendered span measured from the DOM — the same
      // correction the mobile branch makes — and union it with the laid-out bounds
      // so we never fit to LESS than before (covers lane bands / not-yet-rendered
      // nodes). The union can only widen the frame, so it removes clipping without
      // risking a tighter fit.
      const paneEl = wrapRef.current;
      const nodeEls = paneEl ? [...paneEl.querySelectorAll<HTMLElement>(".react-flow__node")] : [];
      const cur = getViewport();
      const paneRect = paneEl?.getBoundingClientRect();
      if (nodeEls.length && paneRect && cur.zoom > 0) {
        const rs = nodeEls.map((n) => n.getBoundingClientRect());
        const rLeft = (Math.min(...rs.map((r) => r.left)) - paneRect.left - cur.x) / cur.zoom;
        const rRight = (Math.max(...rs.map((r) => r.right)) - paneRect.left - cur.x) / cur.zoom;
        const rTop = (Math.min(...rs.map((r) => r.top)) - paneRect.top - cur.y) / cur.zoom;
        const rBottom = (Math.max(...rs.map((r) => r.bottom)) - paneRect.top - cur.y) / cur.zoom;
        const minX = Math.min(bounds.x, rLeft - M);
        const minY = Math.min(bounds.y, rTop - M);
        const maxX = Math.max(bounds.x + bounds.width, rRight + M);
        const maxY = Math.max(bounds.y + bounds.height, rBottom + M);
        bounds.x = minX;
        bounds.y = minY;
        bounds.width = maxX - minX;
        bounds.height = maxY - minY;
      }
      // Fit against the reduced width so content centers in the left region; the
      // reserved strip on the right is left clear for the editor panel. A touch
      // more padding (0.12) gives the comfortable frame the brief asks for.
      viewport = getViewportForBounds(bounds, fitWidth, height, fitMinZoom, maxZoom, 0.12);
    }
    void setViewport(viewport, { duration: instant ? 0 : 180 });
  }, [getNodes, getNodesBounds, setViewport, getViewport]);

  // One-shot sequence cascade: when a NEW flow loads (static loads only — never
  // mid-stream, never reduced motion), the numbered legs draw in 1→N once, then
  // the class is pulled. Armed in an effect, deferred a frame so it isn't a
  // synchronous setState-in-effect, and guarded per flow id so it fires once.
  const armedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!flow) return;
    const id = flow.id;
    if (armedFor.current === id) return;
    // No cascade while streaming or under reduced motion — mark done so it
    // won't arm later for this flow.
    if (busy || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      armedFor.current = id;
      return;
    }
    const maxOrd = Math.min(
      flow.edges.reduce((m, e) => Math.max(m, e.ordinal ?? 0), 0),
      12,
    );
    // Mark armed INSIDE the frame callback, not before: StrictMode runs
    // setup→cleanup→setup and the cleanup cancels the first frame, so guarding
    // before scheduling would let the second setup short-circuit and never arm.
    const raf = requestAnimationFrame(() => {
      armedFor.current = id;
      setRevealing(true);
    });
    const off = setTimeout(() => setRevealing(false), maxOrd * 90 + 420 + 230);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(off);
    };
  }, [flow, busy]);

  useEffect(() => {
    if (!nodeCount) return;
    void detail;
    void viewMode; // a layout toggle (map ↔ lanes) must re-run the settle fit
    // The DOM is the only honest readback of whether a fit landed: every
    // node rect inside the pane rect. A sub-40px pane means the container
    // hasn't been measured yet — not fitted by definition.
    const fitLanded = () => {
      const pane = wrapRef.current;
      if (!pane) return true;
      const p = pane.getBoundingClientRect();
      if (p.width < 40 || p.height < 40) return false;
      const rects = [...pane.querySelectorAll(".react-flow__node")].map((n) =>
        n.getBoundingClientRect(),
      );
      if (!rects.length) return true;
      return rects.every(
        (r) =>
          r.left >= p.left - 4 &&
          r.right <= p.right + 4 &&
          r.top >= p.top - 4 &&
          r.bottom <= p.bottom + 4,
      );
    };
    // Settle loop for quiet moments: fit, wait out the animation plus a
    // measurement beat, verify in the DOM, repeat until the diagram truly
    // sits inside the pane (cold restores and detail relayouts both produce
    // fits computed on stale bounds).
    const settleFit = (attempt = 0) => {
      doFit();
      fitTimer.current = setTimeout(() => {
        if (!fitLanded() && attempt < 12) settleFit(attempt + 1);
      }, 350);
    };
    // Throttle OR trail — never both, or every idle change double-fits and
    // the animation visibly restarts.
    if (!busy) {
      if (fitTimer.current) clearTimeout(fitTimer.current);
      fitTimer.current = setTimeout(() => settleFit(), 200);
    } else if (Date.now() - lastFit.current > 450) {
      doFit();
    } else {
      if (fitTimer.current) clearTimeout(fitTimer.current);
      fitTimer.current = setTimeout(doFit, 160);
    }
    return () => {
      if (fitTimer.current) clearTimeout(fitTimer.current);
    };
  }, [nodeCount, edgeCount, detail, viewMode, doFit, busy]);

  // Persistent collapsible legend — a client asking "what does the amber
  // line mean?" does so minutes after generation, so the key never vanishes.
  const legendOpen = useStudio((s) => s.legendOpen);
  const setLegendOpen = useStudio((s) => s.setLegendOpen);
  // Live generation phase ("Thinking…", "Drawing the flow…") — drives the
  // on-canvas progress affordance so a long thinking phase never reads frozen.
  const statusMessage = useStudio((s) => s.statusMessage);

  // Refit when the canvas itself resizes (chat dock toggling, window resize).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (useStudio.getState().flow) doFit();
      }, 180);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [doFit]);

  // Refit when the editor panel opens/closes so the diagram pans clear of (or
  // back under) the reserved right strip — keeps the edited element visible. A
  // tracked id (kind:id) so re-selecting the same element type doesn't refit.
  const selectionKey = selected ? `${selected.kind}:${selected.id}` : "";
  useEffect(() => {
    if (busy || !useStudio.getState().flow) return;
    const t = setTimeout(() => doFit(), 60);
    return () => clearTimeout(t);
  }, [selectionKey, busy, doFit]);

  return (
    <div ref={wrapRef} className={`h-full w-full ${revealing ? "fof-reveal" : ""}`}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={isMobile ? 0.05 : 0.15}
        // Board-ready exhibit: no third-party watermark on a client surface.
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => {
          if (n.type === "fofNode") select({ kind: "node", id: n.id });
        }}
        onEdgeClick={(_, e) => {
          // A dimmed leg (outside the active lens / legend focus) is context, not
          // a tap target — the chip already drops pointer-events, this closes the
          // edge-path click hole so the focused story stays the thing you select.
          if ((e.data as { _dimmed?: boolean } | undefined)?._dimmed) return;
          select({ kind: "edge", id: e.id });
        }}
        onPaneClick={() => select(null)}
        onNodeDragStop={(_, n) => setNodePosition(n.id, n.position)}
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} color="#d8d2c4" gap={26} size={1.5} />
        {flow && <Controls position="bottom-right" showInteractive={false} />}
      </ReactFlow>

      {/* Guided walkthrough caption: the current leg's number, who-to-whom, and
          its plain-English description, with Back / Next / Done. The canvas
          behind it spotlights just this leg (buildEdges focus). Bottom-center so
          it never fights the legend (bottom-left) or the toolbar (top-right). */}
      {!minimal && walkLeg && (
        <div className="absolute bottom-16 left-1/2 z-20 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2">
          <div className="fof-hint-in rounded-xl border border-[#e4dfd2] bg-white/97 px-4 py-3 shadow-lg">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b6b66]">
                Step {(walkStep ?? 0) + 1} of {walkLegs.length}
              </span>
              <button
                type="button"
                onClick={endWalk}
                aria-label="End walkthrough"
                className="rounded px-1 text-[13px] leading-none text-[#8a857c] hover:text-[#1c1c1c]"
              >
                ×
              </button>
            </div>
            <p className="text-[13.5px] font-semibold leading-tight text-[#1c1c1c]">
              {flow?.nodes.find((n) => n.id === walkLeg.source)?.label ?? walkLeg.source}
              <span className="mx-1 text-[#8a857c]">→</span>
              {flow?.nodes.find((n) => n.id === walkLeg.target)?.label ?? walkLeg.target}
            </p>
            {walkLeg.label && (
              <p className="mt-0.5 text-[12px] font-medium text-[#6b6b66]">{walkLeg.label}</p>
            )}
            {walkLeg.description && (
              <p className="mt-1 text-[12.5px] leading-snug text-[#4a4740]">{walkLeg.description}</p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] text-[#8a857c]">
                {walkLeg.rail}
                {walkLeg.timing ? ` · ${walkLeg.timing}` : ""}
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => stepWalk(-1)}
                  disabled={(walkStep ?? 0) === 0}
                  className="rounded-md border border-[#e4dfd2] px-2.5 py-1 text-[11.5px] font-semibold text-[#1c1c1c] hover:bg-[#f4f0e6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => stepWalk(1)}
                  className="rounded-md bg-[#1c1c1c] px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-[#333]"
                >
                  {(walkStep ?? 0) === walkLegs.length - 1 ? "Done" : "Next"}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend + lens: shown whenever this canvas is (Detailed/Expert, or the
          live draw). Simple's StoryStrip carries no colour vocabulary at all. */}
      {!minimal && flow && (
        <div className="absolute bottom-4 left-4 z-10">
          {legendOpen ? (
            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-[#e4dfd2] bg-white/95 px-2.5 py-2">
              {/* Story lens (focus+context): trace one complete story — the money,
                  the messages, the exceptions — dimming the rest. The colour
                  legend below is the type key + a finer focus within the lens. */}
              <div className="mb-1.5 flex flex-wrap items-center gap-1 border-b border-[#e4dfd2] pb-1.5">
                <span className="pl-1 pr-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#6b6b66]">
                  Follow
                </span>
                {/* Plain-English story names, shared with the mobile toolbar
                    (StudioTools/System view). "Issues" not "Exceptions": reader words,
                    not schema words — the type key below keeps the SME
                    vocabulary for those who want it. */}
                {(
                  [
                    ["all", "Whole flow"],
                    ["money", "The money"],
                    ["message", "The messages"],
                    ["exception", "Issues"],
                  ] as const
                ).map(([key, label]) => {
                  const active = lens === key;
                  return (
                    <button
                      key={key}
                      // The Lens is the single focus control; setLens also clears any
                      // fine colour focus the AI set (in the store), so "Whole flow"
                      // (or any lens) is always a clean reset — on desktop AND mobile.
                      onClick={() => setLens(key)}
                      aria-pressed={active}
                      title={
                        key === "all"
                          ? "Show the whole flow"
                          : key === "money"
                            ? "Follow just the money: who pays whom; dim the rest"
                            : key === "message"
                              ? "Follow the coordination behind the scenes; dim the rest"
                              : "Follow what happens when it fails (refunds, disputes, returns); dim the rest"
                      }
                      className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors hover:bg-[#ede7da] ${
                        active ? "bg-[#1c1c1c] text-white hover:bg-[#1c1c1c]" : "text-[#6b6b66]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {/* Colour KEY — the SME's own vocabulary, kept visible (not hidden as
                  "jargon"). A quiet, READ-ONLY reference: the Lens row above is the
                  single focus control. (The AI can still set a fine colour focus on
                  request; any Lens click clears it.) */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span
                  className="flex items-center gap-1 pl-1"
                  title="Numbered chips show the order of steps"
                >
                  <span className="grid h-[14px] min-w-[14px] place-items-center rounded bg-[#1c1c1c] px-0.5 text-[8.5px] font-bold tabular-nums text-white">
                    1
                  </span>
                  <span className="text-[10px] font-medium text-[#6b6b66]">steps</span>
                </span>
                <span className="h-3 w-px bg-[#e4dfd2]" aria-hidden />
                {EDGE_LEGEND.map((item) => {
                  const Glyph = EDGE_GLYPH[item.key];
                  return (
                    <span key={item.key} className="flex items-center gap-1 px-1 py-0.5">
                      <svg width="16" height="6" aria-hidden>
                        <line
                          x1="0"
                          y1="3"
                          x2="16"
                          y2="3"
                          stroke={item.color}
                          strokeWidth="2.5"
                          strokeDasharray={item.dashed ? "4 3" : undefined}
                        />
                      </svg>
                      {Glyph && (
                        <Glyph size={11} strokeWidth={2.2} aria-hidden className="shrink-0 text-[#8a857c]" />
                      )}
                      <span className="text-[10px] font-medium text-[#6b6b66]">{item.label}</span>
                    </span>
                  );
                })}
                <button
                  onClick={() => setLegendOpen(false)}
                  title="Collapse"
                  className="ml-0.5 rounded px-1 py-0.5 text-[10px] text-[#8a857c] hover:bg-[#ede7da] hover:text-[#1c1c1c]"
                >
                  ▾
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setLegendOpen(true)}
              className="rounded-lg border border-[#e4dfd2] bg-white/95 px-2.5 py-1.5 text-[10.5px] font-semibold text-[#6b6b66] shadow-sm hover:border-[#c8c0ac]"
            >
              Legend ▸
            </button>
          )}
        </div>
      )}

      {/* Live generation, nothing on the canvas yet: a blank pane reads as
          broken on a screen share, so show the live phase. A generate turn can
          spend 60-90s thinking before the first leg lands, so the copy is
          phase-aware (statusMessage, driven by SSE `status` events) instead of
          a single static label that would read as a hung request. The first op
          flips nodeCount > 0 and this clears itself, handing off to the
          assembling diagram. The spinner + dots are neutralized under
          prefers-reduced-motion by the global rule in globals.css, leaving a
          calm static state. */}
      {busy && nodeCount === 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
          role="status"
          aria-live="polite"
        >
          <GenerationProgress statusMessage={statusMessage} />
        </div>
      )}

    </div>
  );
}

export function FlowCanvas({ minimal = false }: { minimal?: boolean }) {
  return (
    <ReactFlowProvider>
      <CanvasInner minimal={minimal} />
    </ReactFlowProvider>
  );
}
