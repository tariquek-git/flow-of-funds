/**
 * Public-posture smoke test — the counterpart to gate-smoke.ts. Where gate-smoke
 * asserts the GATED posture (FOF_GATE_SECRET set → /studio redirects, /api/agent
 * 401), this asserts the PUBLIC posture (FOF_PUBLIC=1 → studio open, paid endpoint
 * protected by the same-origin + no-Origin policy instead of a passphrase).
 *
 * Modes:
 *   pnpm smoke:public                       # checks https://flows.fintechnorth.ca
 *   pnpm smoke:public https://your-url       # check any deployed origin
 *   pnpm smoke:public --serve                # boot `next start` in PUBLIC mode
 *                                            # with a DUMMY key, run asserts, tear
 *                                            # down. No secrets, no real spend.
 *
 * Asserts (public posture):
 *   - GET /, /studio, /privacy, /terms      → 200 (studio is OPEN, no /unlock)
 *   - GET /api/health                        → safe release/config metadata only
 *   - GET /api/admin/status                  → 401 (admin stays cookie-gated)
 *   - POST /api/agent cross-origin           → 403
 *   - POST /api/agent no-Origin (local only) → policy from route.ts (see below)
 *   - security headers present
 *
 * SAFETY — never spends real tokens:
 *   - cross-origin POST is refused at the route's same-origin guard BEFORE any
 *     model call (403), so it costs nothing on any deploy.
 *   - the no-Origin POST is only asserted in --serve mode, where the server runs
 *     with a DUMMY AI key: the route's no-Origin guard returns 403 BEFORE the
 *     provider is ever constructed/called, so no tokens are spent. Against a REMOTE
 *     url the no-Origin POST is ALWAYS SKIPPED. A remote deployment may deliberately
 *     set FOF_ALLOW_SERVER_AGENT=1, in which case that probe could reach a paid model.
 *     Remote release smoke therefore never sends an Origin-less agent request.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

const serve = process.argv.includes("--serve") || process.env.FOF_SMOKE_SERVE === "1";
const checkNoOrigin = serve;
const urlArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const LOCAL_BUILD_SHA = "0123456789abcdef0123456789abcdef01234567";
const expectedBuildSha = process.env.FOF_SMOKE_EXPECT_SHA?.trim() || null;
const requireLiveConfig = process.env.FOF_SMOKE_REQUIRE_LIVE === "1";

let failures = 0;
const ok = (name: string) => console.log(`  ✓ ${name}`);
const bad = (name: string, detail: string) => {
  failures += 1;
  console.log(`  ✗ ${name} — ${detail}`);
};
const skip = (name: string, why: string) => console.log(`  ⁃ ${name} — skipped (${why})`);

async function waitForReady(base: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/`, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not become ready within ${timeoutMs}ms`);
}

async function pickServePort(): Promise<number> {
  const requested = Number(process.env.PORT);
  if (requested) return requested;

  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close(() => reject(new Error("could not reserve a smoke-test port")));
        return;
      }
      const { port } = address;
      probe.close(() => resolve(port));
    });
  });
}

async function assertPublic(base: string): Promise<void> {
  console.log(`Public smoke test → ${base}\n`);

  // 1. Public pages must all be 200 (the studio is OPEN in public mode — no /unlock).
  for (const path of ["/", "/studio", "/privacy", "/terms"]) {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    if (res.status === 200) ok(`GET ${path} → 200`);
    else bad(`GET ${path}`, `expected 200, got ${res.status}`);
  }

  // 2. /api/health is a public liveness + release-identity probe. Configuration
  //    is presence-only; the only strings are the declared posture, Git SHA,
  //    and package version. Provider names remain owner-only.
  const health = await fetch(`${base}/api/health`, { redirect: "manual" });
  if (health.status !== 200) {
    bad("GET /api/health", `expected 200, got ${health.status}`);
  } else {
    try {
      const j = (await health.json()) as Record<string, unknown>;
      const expectedKeys = [
        "ok",
        "hasAiKey",
        "hasGate",
        "hasDistributedStore",
        "hasCronSecret",
        "aiGenerationEnabled",
        "accessPosture",
        "buildSha",
        "buildVersion",
      ];
      const exactKeys =
        Object.keys(j).sort().join("|") === expectedKeys.slice().sort().join("|");
      const safeTypes =
        j.ok === true &&
        typeof j.hasAiKey === "boolean" &&
        typeof j.hasGate === "boolean" &&
        typeof j.hasDistributedStore === "boolean" &&
        (serve ? j.hasCronSecret === true : typeof j.hasCronSecret === "boolean") &&
        typeof j.aiGenerationEnabled === "boolean" &&
        j.accessPosture === "public" &&
        (serve
          ? j.buildSha === LOCAL_BUILD_SHA
          : j.buildSha === null ||
            (typeof j.buildSha === "string" && /^[0-9a-f]{7,64}$/i.test(j.buildSha))) &&
        typeof j.buildVersion === "string" &&
        /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(j.buildVersion);
      const expectedShaMatches = !expectedBuildSha || j.buildSha === expectedBuildSha;
      const liveConfigReady =
        !requireLiveConfig ||
        (j.hasAiKey === true &&
          j.hasDistributedStore === true &&
          j.hasCronSecret === true);
      const leak = JSON.stringify(j).match(
        /sk-[A-Za-z0-9_-]{8,}|(?:api[_-]?key|token|password)["']?\s*:\s*["'][A-Za-z0-9_-]{8,}/i,
      );
      if (exactKeys && safeTypes && expectedShaMatches && liveConfigReady && !leak) {
        ok(
          "GET /api/health → safe public posture + build identity + required config, no secrets",
        );
      } else {
        bad(
          "GET /api/health",
          `release contract failed (sha=${String(j.buildSha)}, expected=${expectedBuildSha ?? "any"}, live=${liveConfigReady})`,
        );
      }
    } catch {
      bad("GET /api/health", "response was not JSON");
    }
  }

  // 3. Admin status stays cookie-gated even in public mode (own fof_admin gate).
  const admin = await fetch(`${base}/api/admin/status`, { redirect: "manual" });
  if (admin.status === 401) ok("GET /api/admin/status (no cookie) → 401");
  else bad("GET /api/admin/status", `expected 401, got ${admin.status}`);

  // 4. Cross-origin POST to the paid endpoint is refused at the same-origin guard,
  //    BEFORE any spend. Safe on every deploy.
  const xorigin = await fetch(`${base}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    body: JSON.stringify({ capability: "generate", prompt: "smoke", history: [] }),
    redirect: "manual",
  });
  if (xorigin.status === 403) ok("POST /api/agent (cross-origin) → 403");
  else bad("POST /api/agent (cross-origin)", `expected 403, got ${xorigin.status}`);

  // 5. No-Origin (server/curl) POST → 403 in the local dummy-key fixture. Never
  //    send this request to a remote deployment: FOF_ALLOW_SERVER_AGENT=1 is an
  //    intentional escape hatch there and could allow the probe to spend.
  if (checkNoOrigin) {
    const noOrigin = await fetch(`${base}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability: "generate", prompt: "smoke", history: [] }),
      redirect: "manual",
    });
    if (noOrigin.status === 403) ok("POST /api/agent (no-Origin, keyed) → 403");
    else bad("POST /api/agent (no-Origin)", `expected 403, got ${noOrigin.status}`);
  } else {
    skip(
      "POST /api/agent (no-Origin)",
      "remote no-Origin probes are disabled because server-agent posture is not public evidence",
    );
  }

  // 6. Security headers must be present on a served page.
  const page = await fetch(`${base}/`, { redirect: "manual" });
  for (const h of [
    "content-security-policy",
    "strict-transport-security",
    "x-frame-options",
    "x-content-type-options",
  ]) {
    if (page.headers.get(h)) ok(`header ${h} present`);
    else bad(`header ${h}`, "missing");
  }
}

function report(): never {
  console.log("");
  if (failures) {
    console.error(`FAIL — ${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log("PASS — public posture correct + security headers present");
  process.exit(0);
}

async function runRemote(): Promise<void> {
  const base = (urlArg ?? process.env.FOF_SMOKE_URL ?? "https://flows.fintechnorth.ca").replace(/\/$/, "");
  await assertPublic(base);
  report();
}

async function runServe(): Promise<void> {
  const port = await pickServePort();
  const base = `http://127.0.0.1:${port}`;
  // PUBLIC posture + a DUMMY AI key so hasLiveAiKey() is true (the keyed-prod
  // shape) — the no-Origin guard then returns 403 BEFORE the provider is ever
  // called, so the dummy key is never used and nothing is spent. FOF_ALLOW_SERVER_AGENT
  // is intentionally left UNSET so the default (deny) is what we assert.
  const env = {
    ...process.env,
    NODE_ENV: "production",
    FOF_PUBLIC: "1",
    // Keyed posture via a DUMMY key so hasLiveAiKey() is true and the no-Origin
    // guard returns 403 — but NEUTRALIZE any real provider key that .env.local
    // would otherwise load (process.env wins over .env.local), so even a
    // regression in the guard can't spend: a dummy key just 401s at the provider,
    // and the 403 short-circuits before the provider is ever called anyway.
    ANTHROPIC_API_KEY: "dummy-public-smoke-key-not-used",
    ANTHROPIC_AUTH_TOKEN: "",
    OPENAI_API_KEY: "",
    AI_PROVIDER: "",
    // Non-secret release/config proof fields: verify the health route reports
    // the exact SHA and secret PRESENCE without ever returning the dummy value.
    FOF_BUILD_SHA: LOCAL_BUILD_SHA,
    VERCEL_GIT_COMMIT_SHA: "",
    CRON_SECRET: "dummy-public-smoke-cron-secret-not-used",
    PORT: String(port),
  } as NodeJS.ProcessEnv;
  delete env.FOF_GATE_SECRET; // public mode, no passphrase gate
  delete env.FOF_ALLOW_SERVER_AGENT; // assert the default deny

  console.log(`Booting \`next start\` on ${base} (PUBLIC mode, dummy key, no override)…\n`);
  const server: ChildProcess = spawn("npx", ["next", "start", "-p", String(port)], {
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });

  const shutdown = async () => {
    if (server.exitCode === null && !server.killed) {
      server.kill("SIGTERM");
      await Promise.race([once(server, "exit"), new Promise((r) => setTimeout(r, 3000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
  };

  try {
    await waitForReady(base);
    await assertPublic(base);
  } finally {
    await shutdown();
  }
  report();
}

(serve ? runServe() : runRemote()).catch(async (e) => {
  console.error("smoke test error:", e);
  process.exit(1);
});
