"use client";

import { useEffect, type RefObject } from "react";

/**
 * Shared focus management for modal dialogs (aria-modal surfaces). While open:
 * remembers what had focus, moves focus into the dialog (first focusable
 * element, else the dialog itself), and traps Tab / Shift+Tab inside it. On
 * close (or unmount) focus returns to the element that opened the dialog.
 *
 * Used by MobileSheet, WelcomeOverlay, the ChatDock mobile sheet, and the
 * TemplateLibrary modal so every aria-modal surface behaves the same for
 * keyboard and screen-reader users. Escape handling stays with each caller —
 * this hook only owns focus.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus in: the first focusable child, else the dialog itself (given a
    // programmatic tabindex so .focus() actually lands).
    const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
    if (!first && !dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
    (first ?? dialog).focus({ preventScroll: true });

    // Trap Tab: cycle within the dialog's focusable elements. Capture phase so
    // the trap wins even if a child stops propagation.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        // Skip anything display:none'd (e.g. hidden file inputs).
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && dialog.contains(active);
      if (e.shiftKey) {
        if (!inside || active === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (!inside || active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Restore focus to the opener (if it's still in the document).
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref, open]);
}
