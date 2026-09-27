"use client";

import { useState } from "react";

/**
 * Minimal admin unlock form — mirrors the tester /unlock visual register but is
 * its own surface posting to /api/admin-unlock. On success it reloads /admin,
 * which re-reads the now-set `fof_admin` cookie server-side and renders the
 * review UI. `disabled` is true when the deploy has no FOF_ADMIN_SECRET, so we
 * tell the owner admin isn't enabled rather than letting them guess forever.
 */
export function AdminUnlock({ disabled }: { disabled: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!password || checking || disabled) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      if (res.status === 503) {
        setError("Admin review is not enabled on this deployment.");
      } else if (res.status === 401) {
        setError("That admin password isn't right.");
      } else if (res.status === 429) {
        setError("Too many attempts. Wait a bit and try again.");
      } else {
        setError(`Unlock failed (${res.status}).`);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-[min(380px,calc(100vw-32px))]">
        <div className="mb-5 text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-[#1c1c1c]">Admin review</h1>
          <p className="mt-1 text-[12px] font-medium text-slate-500">
            Owner-only. Enter the admin password to review conversations
          </p>
        </div>
        <div className="rounded-2xl border border-[#e4dfd2] bg-white p-2.5 shadow-[0_8px_30px_rgba(28,28,28,0.08)]">
          <div className="flex gap-2">
            <input
              type="password"
              autoFocus
              value={password}
              disabled={disabled}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder={disabled ? "Admin disabled" : "Admin password"}
              className="flex-1 rounded-lg border border-[#e4dfd2] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-500 focus:border-[#C41E3A] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={() => void submit()}
              disabled={!password || checking || disabled}
              className="rounded-lg bg-[#C41E3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#a11930] disabled:opacity-30"
            >
              {checking ? "…" : "Enter"}
            </button>
          </div>
          {error && <p className="mt-2 px-1 text-[11px] font-medium text-red-700">{error}</p>}
          {disabled && !error && (
            <p className="mt-2 px-1 text-[11px] font-medium text-slate-500">
              Set <code className="font-mono">FOF_ADMIN_SECRET</code> to enable this page.
            </p>
          )}
        </div>
        <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-slate-500">
          This area is for the site owner. It is separate from the tester
          passphrase and shows logged prompts and replies.
        </p>
      </div>
    </main>
  );
}
