import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, constantTimeEqual, gateToken } from "@/lib/gate";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Trim the env secret: pasted into a host's dashboard it often carries a
  // trailing newline/space that would make a correct passphrase fail. The
  // middleware cookie check trims identically, so the cookie set below validates.
  const secret = process.env.FOF_GATE_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: true, note: "gate disabled" });

  // Brute-force throttle: the flat 400ms delay below only taxes serial guessing.
  // This caps attempts per IP so a parallel attacker can't grind the passphrase.
  const gate = await rateLimit("unlock", clientIp(req), 8, 300); // 8 tries / 5 min
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    // Trim the entered passphrase too — a copy-paste often picks up a stray
    // leading/trailing space; with both sides trimmed, the right value matches.
    password = typeof body.password === "string" ? body.password.trim() : "";
  } catch {
    // fall through to the failure path
  }

  // Compare HMACs, not the raw passphrase: both operands are then fixed-length
  // hex, so the compare never runs over the secret directly or leaks its length.
  if (!password || !constantTimeEqual(await gateToken(password), await gateToken(secret))) {
    await sleep(400); // flat-rate brute-force tax (see DEPLOY.md: use a high-entropy secret)
    return NextResponse.json({ ok: false, error: "Wrong passphrase" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(secret), {
    httpOnly: true,
    secure: !!process.env.VERCEL || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // re-unlock monthly
  });
  return res;
}
