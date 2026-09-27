import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, constantTimeEqual, gateToken } from "@/lib/gate";

/**
 * Shared-secret gate for deployed environments. The gate exists to protect a
 * paid AI key — so it's only mandatory when a key is present:
 *  - No secret + no key (fixture demo)  → OPEN. Share the link freely; nothing
 *    to protect, no spend possible. This is the WhatsApp-group / show-a-use-case
 *    path.
 *  - No secret + a key on Vercel        → fail closed (503). Never expose a
 *    keyed deploy as a public proxy.
 *  - Secret set                          → gate enforced (pages → /unlock,
 *    APIs → 401). Use this once you wire a live key.
 */

export async function middleware(req: NextRequest) {
  // PUBLIC MODE: when FOF_PUBLIC=1 the tool is intentionally open — no tester
  // passphrase — and the entire gate below (including the !secret fail-closed
  // 503) is bypassed. /admin + /api/admin/* are UNAFFECTED: they enforce their
  // own fof_admin cookie (lib/admin.ts) regardless of this flag. The paid
  // /api/agent is protected in public mode by its same-origin guard, per-IP
  // rate limits, the daily $ kill-switch, and (when keyed) Cloudflare Turnstile.
  // To restore the passphrase gate: unset FOF_PUBLIC (or set 0), keep FOF_GATE_SECRET.
  if (process.env.FOF_PUBLIC === "1") {
    return NextResponse.next();
  }

  // Trim: a secret pasted into a host's env dashboard often carries a trailing
  // newline/space, which would make a correct passphrase fail. /api/unlock trims
  // identically, so the cookie it sets with gateToken(trimmed) validates here.
  const secret = process.env.FOF_GATE_SECRET?.trim();
  if (!secret) {
    const hasLiveKey = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.OPENAI_API_KEY ||
      process.env.DEEPSEEK_API_KEY
    );
    if (process.env.VERCEL && hasLiveKey) {
      return new NextResponse(
        "Flow of Funds is locked: a live AI key is set but no FOF_GATE_SECRET. Set the gate secret (to protect spend) or remove the key to run the open fixture demo.",
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  // Always-public paths. The PUBLIC FACE of the app is the landing at `/` plus
  // the legal / SEO / link-preview surfaces an un-passphrased visitor (or a
  // social unfurler) must reach — and /api/health, so an uptime monitor can
  // probe liveness without the gate cookie (it returns booleans only, no
  // secrets). EVERYTHING ELSE STAYS GATED — in particular the studio (`/studio`)
  // and the paid `/api/agent` endpoint, which fall through to the cookie check
  // below (page → /unlock, API → 401).
  //
  // `/` is the public landing (FinTechNorth consolidation Stage 2): it carries
  // the prompt box + example chips that hand off to `/studio?q=…`, and the gate
  // preserves ?q on the way through. The landing itself spends nothing, so it is
  // safe to expose.
  //
  // The /admin surface and its routes are listed here so they BYPASS the tester
  // gate — they are protected by their OWN admin cookie (`fof_admin`, keyed off
  // FOF_ADMIN_SECRET) which the admin page + data route enforce themselves. The
  // tester passphrase grants no admin access and vice versa.
  const PUBLIC = [
    "/", // public landing
    "/unlock",
    "/api/unlock",
    "/api/health",
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
    "/admin",
    "/api/admin-unlock",
    "/api/admin/conversations",
    "/api/admin/stats",
    "/api/admin/feedback",
    "/api/admin/events",
    "/api/admin/status",
    "/api/event",
  ];
  // Static brand/preview assets served from /public must be reachable by social
  // unfurlers without the gate (the link-preview image lives here). These are
  // inert files, no spend, so an exact-name allow-list is safe.
  const PUBLIC_ASSETS = new Set([
    "/og-image.png",
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
    // Brand Polaris favicon + PWA install icons must load on a locked tab.
    // (favicon.ico is already excluded by the matcher below.)
    "/icon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/maskable-192.png",
    "/maskable-512.png",
  ]);
  if (
    PUBLIC.includes(pathname) ||
    // Public knowledge layer: the glossary + guides at /learn are ungated, SEO
    // content (no spend) — the whole subtree is open, like the landing.
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    // Rail compare (/compare and /compare/[id]): the same kind of ungated, SEO
    // content layer (no spend) as /learn, so open the whole subtree too.
    pathname === "/compare" ||
    pathname.startsWith("/compare/") ||
    PUBLIC_ASSETS.has(pathname) ||
    pathname.startsWith("/opengraph-image")
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(GATE_COOKIE)?.value;
  if (cookie && constantTimeEqual(cookie, await gateToken(secret))) {
    return NextResponse.next();
  }

  // Service-to-service bridge (e.g. the Polaris WhatsApp bot's fof-native
  // query script): a distinct credential from the human passphrase, scoped to
  // exactly this one route, never a blanket gate bypass. Rotating the human
  // passphrase never breaks the bridge and vice versa. agent/route.ts still
  // separately validates this same secret and applies its own per-user rate
  // limit — this only lets the request past the gate, nothing else.
  const bridgeSecret = process.env.FOF_BRIDGE_SECRET?.trim();
  if (pathname === "/api/agent" && bridgeSecret) {
    const provided = req.headers.get("x-fof-bridge-secret");
    if (provided && constantTimeEqual(provided, bridgeSecret)) {
      return NextResponse.next();
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked — open the app and unlock it first" }, { status: 401 });
  }
  // Preserve where they were headed (e.g. a landing-page handoff `/?q=…`) so
  // unlocking drops them straight into that destination instead of a blank
  // studio. Only the same-origin path+query is carried; the unlock page
  // re-validates it's a relative path before navigating.
  const dest = pathname + req.nextUrl.search;
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = dest && dest !== "/" ? `?next=${encodeURIComponent(dest)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  // Gate everything except Next's static assets and the public brand marks.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brands/).*)"],
};
