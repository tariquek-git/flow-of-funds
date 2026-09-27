"use client";

import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

/** Where to land after a successful unlock. Only same-origin relative paths are
 *  honored (e.g. a landing-page handoff `/studio?q=…`) — never an attacker-supplied
 *  absolute or protocol-relative URL — so the gate can't be turned into an
 *  open redirect. Defaults to the gated studio, NOT the public landing `/`:
 *  someone who just entered the passphrase wants the tool, not the front door. */
function safeNext(): string {
  try {
    // Prefer the sanitizer's stash (the inline layout script lifts `next` out of
    // the URL so the encoded payment never reaches analytics); fall back to the
    // raw URL if that script didn't run.
    const n = window.__fofHandoff?.next ?? new URLSearchParams(window.location.search).get("next");
    // Browsers normalize backslashes to forward slashes when parsing a URL, so
    // "/\evil.com" or "\/evil.com" would otherwise slip past a "//" check and
    // resolve to an external origin. Normalize first, then require a single
    // leading "/" with no second "/" or "\" right after it.
    const normalized = n?.replace(/\\/g, "/");
    if (normalized && normalized.startsWith("/") && !normalized.startsWith("//")) return n as string;
  } catch {
    // fall through to the default
  }
  return "/studio";
}

/** Single-field gate. Banker-grade quiet: no branding beyond the product name. */
export default function UnlockPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!password || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = safeNext();
        return;
      }
      setError(res.status === 401 ? "That passphrase isn't right." : `Unlock failed (${res.status}).`);
    } catch {
      setError("Network error, try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <SiteHeader />
      <main className="flex w-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-[min(380px,calc(100vw-32px))]">
        <div className="mb-5 text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-[#1c1c1c]">Flow of Funds</h1>
          <p className="mt-1 text-[12px] font-medium text-[#6b6b66]">
            Private preview. Enter the passphrase to continue
          </p>
        </div>
        <div className="rounded-2xl border border-[#e4dfd2] bg-white p-2.5 shadow-[0_8px_30px_rgba(28,28,28,0.08)]">
          <div className="flex gap-2">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder="Passphrase"
              className="flex-1 rounded-lg border border-[#e4dfd2] bg-white px-3 py-2 text-[13px] text-[#1c1c1c] placeholder:text-slate-500 focus:border-[#C41E3A] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            />
            <button
              onClick={() => void submit()}
              disabled={!password || checking}
              className="rounded-lg bg-[#1c1c1c] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#a11930] disabled:opacity-30"
            >
              {checking ? "…" : "Unlock"}
            </button>
          </div>
          {error && (
            <p className="mt-2 px-1 text-[11px] font-medium text-red-700">{error}</p>
          )}
        </div>
        <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-[#6b6b66]">
          A Fintech North private preview. Diagrams are informational only, verify
          before relying on them; not legal, compliance, or financial advice.
        </p>
        <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-[#8a857c]">
          No passphrase yet, or have a question? Request access or reach us at{" "}
          <a
            href="mailto:hello@fintechnorth.ca?subject=Flow%20of%20Funds%20preview%20access"
            className="font-medium text-[#C41E3A] underline-offset-2 hover:underline"
          >
            hello@fintechnorth.ca
          </a>
          .
        </p>
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
