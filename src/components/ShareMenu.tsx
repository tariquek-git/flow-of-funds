"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Link2 } from "lucide-react";
import { track, trackFirstPostFlowAction } from "@/lib/analytics";
import { encodeFlowToHash } from "@/lib/share";
import { useStudio } from "@/lib/state/store";

/**
 * Self-contained "Copy link" share control for the studio toolbar.
 *
 * Copies a URL that reproduces the EXACT current flow with zero backend and
 * zero AI — the whole flow is serialized into a url-safe hash (encodeFlowToHash,
 * built in parallel) and dropped onto `/share/<hash>`. That route server-renders a
 * per-flow social preview (title + rails + OG image) and hands off to the live
 * studio via `/studio#f=<hash>`, so a pasted link unfurls as THIS diagram instead
 * of a generic card. Anyone who opens it rehydrates the same flow client-side.
 *
 * Visually matches the Studio header actions — white pill with
 * a hairline #e4dfd2 border, charcoal #1c1c1c label, warm muted icon, crimson
 * #C41E3A on hover. Disabled (and a no-op) until there's a flow on the canvas.
 *
 * All window/navigator/clipboard access lives inside the click handler so the
 * component is SSR-safe. The integrator mounts this anywhere in the toolbar; it
 * makes no assumptions about parent layout.
 */

type ShareState = "idle" | "copied" | "error";

export function ShareMenu({ compact = false }: { compact?: boolean } = {}) {
  const flow = useStudio((s) => s.flow);
  const [state, setState] = useState<ShareState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't leave a stray revert timer running if we unmount mid-feedback.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = (next: "copied" | "error") => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  const disabled = !flow;

  const copy = async () => {
    if (!flow) return;
    let url = "";
    try {
      const hash = await encodeFlowToHash(flow);
      url = `${window.location.origin}/share/${hash}`;
    } catch {
      // Couldn't even build the link — nothing to fall back to.
      flash("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      // Content-free: records that a flow was shared, never the flow itself.
      track("flow_link_copied");
      trackFirstPostFlowAction("share");
      flash("copied");
    } catch {
      // Clipboard blocked (insecure context, permission, focus). Surface the
      // URL so the user can still copy it by hand, then show the failed state.
      try {
        window.prompt("Copy this link to share the exact flow:", url);
      } catch {
        // prompt() can be suppressed too — last resort is just the error label.
      }
      flash("error");
    }
  };

  const label = state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : "Copy link";
  const accessibleLabel =
    state === "copied"
      ? "Link copied to clipboard"
      : state === "error"
        ? "Copy link failed"
        : "Copy a link to this exact flow";
  const statusMessage =
    state === "copied"
      ? "Link copied to clipboard."
      : state === "error"
        ? "The link could not be copied automatically."
        : "";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={disabled}
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className={`fof-touch-target inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#e4dfd2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1c1c1c] transition-colors hover:border-[#C41E3A] hover:text-[#C41E3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40 ${
          state === "copied" ? "text-green-700" : state === "error" ? "text-[#a11930]" : ""
        } ${disabled ? "pointer-events-none opacity-40" : ""}`}
      >
        {state === "copied" ? (
          <Check size={14} className="text-green-700" aria-hidden />
        ) : state === "error" ? (
          <AlertTriangle size={14} aria-hidden />
        ) : (
          <Link2 size={14} className="text-[#6b6b66]" aria-hidden />
        )}
        <span className={compact ? "max-[720px]:sr-only" : ""}>{label}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </span>
    </>
  );
}
