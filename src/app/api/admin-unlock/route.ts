import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, constantTimeEqual } from "@/lib/gate";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Owner-only admin unlock. Mirrors /api/unlock but checks FOF_ADMIN_SECRET and
 * sets a SEPARATE httpOnly cookie (`fof_admin`). Fail-closed: with no admin
 * secret configured the route returns 503 ("admin disabled") and never sets a
 * cookie, so the review surface can't be reached on a deploy that hasn't opted in.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Trim the env secret: pasted into a host's dashboard it often carries a
  // trailing newline/space that would make a correct password fail. isAdmin()
  // trims identically, so the cookie set below (adminToken(trimmed)) validates.
  const secret = process.env.FOF_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Admin review is not enabled on this deployment." },
      { status: 503 },
    );
  }

  // Brute-force throttle, same shape as /api/unlock: cap attempts per IP so the
  // flat 400ms delay below isn't the only defense against parallel guessing.
  const gate = await rateLimit("admin-unlock", clientIp(req), 8, 300); // 8 tries / 5 min
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    // Trim the entered password too — a copy-paste of the secret often picks up a
    // leading/trailing space; with both sides trimmed, the right value matches.
    password = typeof body.password === "string" ? body.password.trim() : "";
  } catch {
    // fall through to the failure path
  }

  // Compare HMACs, not the raw secret: both operands are fixed-length hex, so the
  // compare never runs over the secret directly or leaks its length.
  if (!password || !constantTimeEqual(await adminToken(password), await adminToken(secret))) {
    await sleep(400); // flat-rate brute-force tax
    return NextResponse.json({ ok: false, error: "Wrong admin password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminToken(secret), {
    httpOnly: true,
    secure: !!process.env.VERCEL || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // re-auth weekly — tighter than the tester gate
  });
  return res;
}
