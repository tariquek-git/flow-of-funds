"use client";

import { create } from "zustand";

/**
 * Global edge-label collision pass.
 *
 * Per-edge placement (FofEdge) can keep a chip off node boxes and lane gaps, but
 * it can't see the OTHER labels — so two edges whose chips land at the same spot
 * overlap (e.g. several legs of a hub node piling up just below it). Here every
 * FofEdge reports its BASE chip rect (the position after the per-edge node/gap
 * nudge) and reads back a vertical offset `dy` that spreads any overlapping chips
 * across the clear corridor between node rows.
 *
 * Everything is in FLOW units: a chip is positioned with `translate(x, y)` in
 * flow coords inside the viewport transform, and its `offsetWidth/Height` are the
 * unscaled (flow-unit) size — so no screen<->flow conversion is needed, and the
 * resolver can reuse the same node boxes the per-edge nudge uses.
 *
 * No render loop: a chip's BASE rect is independent of `dy` (dy only shifts the
 * rendered transform), so applying dy never changes what a chip reports.
 */

export type LabelRect = { x: number; y: number; w: number; h: number };
export type LabelBox = { top: number; bottom: number; left: number; right: number };

const GAP = 6; // vertical breathing room between stacked chips (flow units)

// AABB overlap on centre-positioned rects (chips translate(-50%,-50%)).
function overlaps(a: LabelRect, b: LabelRect): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

/** Pure: base rects + node boxes -> per-edge vertical offset that de-overlaps. */
function resolve(rectMap: Record<string, LabelRect>, boxes: LabelBox[]): Record<string, number> {
  const items = Object.entries(rectMap).map(([id, r]) => ({ id, ...r }));
  const dy: Record<string, number> = {};
  for (const it of items) dy[it.id] = 0;
  if (items.length < 2) return dy;

  // Connected components over the overlap graph (BFS) — each cluster resolved alone.
  const adj: number[][] = items.map(() => []);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i], items[j])) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  const seen = new Array(items.length).fill(false);
  for (let i = 0; i < items.length; i++) {
    if (seen[i]) continue;
    const comp: number[] = [];
    const queue = [i];
    seen[i] = true;
    while (queue.length) {
      const k = queue.shift() as number;
      comp.push(k);
      for (const n of adj[k]) {
        if (!seen[n]) {
          seen[n] = true;
          queue.push(n);
        }
      }
    }
    if (comp.length < 2) continue; // singletons keep their (already-clean) base

    // Spread the cluster vertically, centred on its mean base Y, sorted stably.
    const members = comp
      .map((idx) => items[idx])
      .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
    const n = members.length;
    const rowStep = Math.max(...members.map((m) => m.h)) + GAP;
    const anchor = members.reduce((s, m) => s + m.y, 0) / n;
    let targets = members.map((_, k) => anchor + (k - (n - 1) / 2) * rowStep);

    // Clamp into the clear corridor: the vertical band between the nearest node box
    // above and below the cluster, considering only boxes in the cluster's column.
    const left = Math.min(...members.map((m) => m.x - m.w / 2));
    const right = Math.max(...members.map((m) => m.x + m.w / 2));
    const halfMax = Math.max(...members.map((m) => m.h)) / 2;
    let ceil = -Infinity;
    let floor = Infinity;
    for (const b of boxes) {
      if (b.left >= right || b.right <= left) continue; // not under/over this cluster
      if (b.bottom <= anchor && b.bottom > ceil) ceil = b.bottom;
      if (b.top >= anchor && b.top < floor) floor = b.top;
    }
    const lo = ceil === -Infinity ? -Infinity : ceil + halfMax + 2;
    const hi = floor === Infinity ? Infinity : floor - halfMax - 2;
    const span = targets[n - 1] - targets[0];
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi - lo < span) {
      // Corridor too short for full spacing — compress evenly into it.
      const step = (hi - lo) / (n - 1);
      targets = members.map((_, k) => lo + k * step);
    } else if (Number.isFinite(lo) && targets[0] < lo) {
      const d = lo - targets[0];
      targets = targets.map((t) => t + d);
    } else if (Number.isFinite(hi) && targets[n - 1] > hi) {
      const d = targets[n - 1] - hi;
      targets = targets.map((t) => t - d);
    }
    members.forEach((m, k) => (dy[m.id] = targets[k] - m.y));
  }
  return dy;
}

type State = {
  rects: Record<string, LabelRect>;
  boxes: LabelBox[];
  dy: Record<string, number>;
  reportRect: (id: string, rect: LabelRect) => void;
  removeRect: (id: string) => void;
  setBoxes: (boxes: LabelBox[]) => void;
};

const sameRect = (a: LabelRect | undefined, b: LabelRect) =>
  !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

export const useLabelLayout = create<State>((set, get) => ({
  rects: {},
  boxes: [],
  dy: {},
  reportRect: (id, rect) => {
    if (sameRect(get().rects[id], rect)) return;
    const rects = { ...get().rects, [id]: rect };
    set({ rects, dy: resolve(rects, get().boxes) });
  },
  removeRect: (id) => {
    if (!(id in get().rects)) return;
    const rects = { ...get().rects };
    delete rects[id];
    set({ rects, dy: resolve(rects, get().boxes) });
  },
  setBoxes: (boxes) => {
    set({ boxes, dy: resolve(get().rects, boxes) });
  },
}));
