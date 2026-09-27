"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";

/**
 * Mobile bottom sheet. Portals to <body>, slides up from the bottom over a
 * tap-to-close scrim, with a drag-handle affordance, Esc-to-close, and a body
 * scroll-lock while open. Honors `env(safe-area-inset-bottom)` and caps height at
 * `maxVh` of the DYNAMIC viewport (dvh). SSR-safe (renders nothing until mounted).
 *
 * Used for the element editor / legend / menus on phones; desktop keeps its own
 * panels and never mounts this (callers gate on useIsMobile()). The whole thing
 * is `fof-desktop-hidden` (globals.css — the CSS twin of MOBILE_MEDIA_QUERY) as
 * a belt-and-suspenders against a mid-resize flash. NOT `md:hidden`: that's
 * width-only, and a landscape phone (isMobile via the max-height arm) would
 * mount the sheet display:none — tapping a node would select it and show
 * nothing.
 *
 * z-stack (re-derived from the real values): scrim z-[44] and sheet z-[45] sit
 * above the canvas overlays (z-10) and the z-30/z-40 bits, and BELOW the z-50
 * first-run / rotate / desktop nudges and the z-[60] Turnstile host.
 */
const subscribeNoop = () => () => {};

export function MobileSheet({
  open,
  onClose,
  label,
  maxVh = 62,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  maxVh?: number;
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  // Modal focus: move focus into the sheet while open, trap Tab, restore on
  // close (shared with the other aria-modal surfaces).
  useDialogFocus(dialogRef, mounted && open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} className="fof-desktop-hidden">
      <button
        type="button"
        aria-label={`Close ${label}`}
        onClick={onClose}
        className="fixed inset-0 z-[44] bg-slate-900/30 backdrop-blur-[1px]"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[45] flex flex-col rounded-t-2xl border-t border-[#e4dfd2] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(28,28,28,0.14)]"
        style={{ maxHeight: `${maxVh}dvh` }}
      >
        <button
          type="button"
          aria-label={`Close ${label}`}
          onClick={onClose}
          className="flex h-7 shrink-0 items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
        </button>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
