"use client";

import { useEffect } from "react";

/** Last-resort boundary: replaces the ENTIRE document (root layout included)
 *  when the failure is in the layout itself, so per Next requirements it must
 *  render its own <html>/<body>. We can't assume globals.css, fonts, or the
 *  zustand store survived whatever broke the layout, so this is deliberately
 *  self-contained: inline styles only, system fonts, no app imports.
 *
 *  "Start over" can't reach the store here (it may be the casualty), so it
 *  clears the live session straight from localStorage — but preserves the
 *  recovery snapshot (fof-native-session-prev) and the unlock cookie/gate — then
 *  hard-reloads to a clean mount. Motion is intentionally absent (no animations
 *  to make reduced-motion-safe). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  const startOver = () => {
    try {
      // Wipe only the live working session; keep the recovery snapshot
      // (fof-native-session-prev) and saved flows (fof-native-myflows-v1).
      // The session now lives in sessionStorage (per-tab; no cross-person leak).
      sessionStorage.removeItem("fof-native-session-v1");
    } catch {
      // best-effort — storage may be unavailable
    }
    // The root layout threw, so reset() may immediately re-throw. A hard reload
    // gives the cleanest possible remount.
    try {
      window.location.reload();
    } catch {
      reset();
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          background: "linear-gradient(180deg, #f4f0e6 0%, #fbf9f3 100%)",
          color: "#1c1c1c",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ width: "min(420px, calc(100vw - 32px))" }}>
          <div
            style={{
              marginBottom: "20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Inline towel glyph — this boundary can't import components (the
                layout may be the casualty), so the Don't Panic wink is hand-rolled
                in SVG with no app dependencies. */}
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              aria-hidden
              style={{ marginBottom: "8px" }}
            >
              <path d="M3 5h18" stroke="#1c1c1c" strokeWidth="1.6" strokeLinecap="round" />
              <path
                d="M6 5v12.5a1.5 1.5 0 0 0 1.5 1.5H10V5"
                stroke="#1c1c1c"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 5v14h2.5a1.5 1.5 0 0 0 1.5-1.5V5"
                stroke="#1c1c1c"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M10 8.5h4M10 11h4"
                stroke="#1c1c1c"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "#1c1c1c",
              }}
            >
              Don&rsquo;t Panic.
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "12px", fontWeight: 500, color: "#8a857c" }}>
              The studio needs to reload
            </p>
          </div>
          <div
            style={{
              borderRadius: "16px",
              border: "1px solid #e4dfd2",
              background: "#ffffff",
              padding: "20px",
              boxShadow: "0 8px 30px rgba(28,28,28,0.08)",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#6b6b66" }}>
              Something went wrong loading the studio. Your saved flows are untouched.
              Reload to start a fresh session.
            </p>
            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <button
                onClick={() => reset()}
                style={{
                  borderRadius: "8px",
                  border: "none",
                  background: "#C41E3A",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <button
                onClick={startOver}
                style={{
                  borderRadius: "8px",
                  border: "1px solid #e4dfd2",
                  background: "#ffffff",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b6b66",
                  cursor: "pointer",
                }}
              >
                Start over
              </button>
            </div>
            {error.digest && (
              <p
                style={{
                  margin: "12px 0 0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "10px",
                  color: "#8a857c",
                }}
              >
                Reference: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
