/**
 * Gate smoke test — asserts the access gate is enforced and the security headers
 * are present. Run it after every deploy (and in CI) so a Next upgrade, a config
 * slip, or a refactor can never SILENTLY drop the gate and expose the paid AI
 * key.
 *
 * Two modes:
 *
 *   pnpm gate:smoke                          # checks https://flows.fintechnorth.ca
 *   pnpm gate:smoke https://your-url         # check any deployed origin
 *   pnpm gate:smoke http://localhost:3000    # check a local prod server
 *
 *   pnpm gate:smoke --serve                  # CI mode: boot `next start` in
 *                                            # fixture mode with a throwaway gate
 *                                            # secret, run the asserts, tear down.
 *                                            # Needs NO secrets. (FOF_SMOKE_SERVE=1
 *                                            # is equivalent.)
 *
 * Both modes expect the GATED posture (FOF_GATE_SECRET set). The --serve mode
 * sets it itself. Exits non-zero on any failed assertion, so it doubles as a CI
 * check.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

const serve = process.argv.includes("--serve") || process.env.FOF_SMOKE_SERVE === "1";
const urlArg = process.argv.slice(2).find((a) => !a.startsWith("--"));

let failures = 0;
const ok = (name: string) => console.log(`  ✓ ${name}`);
const bad = (name: string, detail: string) => {
  failures += 1;
  console.log(`  ✗ ${name} — ${detail}`);
};

async function waitForReady(base: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // Hit a public path so a wrong-posture (open) server still answers 200; the
  // gate assertions below decide pass/fail, this only waits for "listening".
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/unlock`, { redirect: "manual" });
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

async function assertGate(base: string): Promise<void> {
  console.log(`Gate smoke test → ${base}\n`);

  // 1a. The PUBLIC landing at `/` must be reachable WITHOUT the gate (200, no
  //     redirect). This is the consolidated front door; it spends nothing.
  const landing = await fetch(`${base}/`, { redirect: "manual" });
  if (landing.status === 200) {
    ok("GET / (public landing) → 200, no gate redirect");
  } else {
    bad("GET /", `expected 200 (public landing), got ${landing.status}`);
  }

  // 1b. The GATED studio must redirect an un-passphrased visitor to /unlock.
  const studio = await fetch(`${base}/studio`, { redirect: "manual" });
  const loc = studio.headers.get("location") ?? "";
  if (studio.status >= 300 && studio.status < 400 && loc.includes("/unlock")) {
    ok(`GET /studio → ${studio.status} redirect to /unlock`);
  } else {
    bad("GET /studio", `expected 3xx→/unlock, got ${studio.status} (gate may be OFF)`);
  }

  // 2. THE critical assertion: the paid agent API must be 401 without a cookie.
  //    Middleware rejects before the handler, so this spends nothing.
  const agent = await fetch(`${base}/api/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capability: "generate", prompt: "smoke", history: [] }),
    redirect: "manual",
  });
  if (agent.status === 401) ok("POST /api/agent (no cookie) → 401");
  else bad("POST /api/agent (no cookie)", `expected 401, got ${agent.status} — PAID API IS NOT GATED`);

  // 3. A wrong passphrase is rejected. One attempt won't trip the 8/5min limit.
  const unlock = await fetch(`${base}/api/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "smoke-test-wrong-guess" }),
  });
  if (unlock.status === 401 || unlock.status === 429) ok(`POST /api/unlock (wrong) → ${unlock.status}`);
  else bad("POST /api/unlock (wrong)", `expected 401/429, got ${unlock.status}`);

  // 4. Security headers must be present on the served page. CSP, HSTS,
  //    X-Frame-Options and X-Content-Type-Options are the deploy-safety set.
  const page = await fetch(`${base}/unlock`, { redirect: "manual" });
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
  console.log("PASS — gate enforced + security headers present");
  process.exit(0);
}

async function runRemote(): Promise<void> {
  const base = (urlArg ?? process.env.FOF_SMOKE_URL ?? "https://flows.fintechnorth.ca").replace(/\/$/, "");
  await assertGate(base);
  report();
}

async function runServe(): Promise<void> {
  const port = await pickServePort();
  const base = `http://127.0.0.1:${port}`;
  // CI-safe env: fixture provider (no AI key, no spend) + a throwaway gate
  // secret so the GATED posture is exercised. No real secrets required.
  const env = {
    ...process.env,
    NODE_ENV: "production",
    AI_PROVIDER: "fixture",
    FOF_GATE_SECRET: process.env.FOF_GATE_SECRET || "ci-smoke-throwaway-secret-do-not-use",
    PORT: String(port),
  } as NodeJS.ProcessEnv;

  console.log(`Booting \`next start\` on ${base} (fixture mode, throwaway gate secret)…\n`);
  const server: ChildProcess = spawn("npx", ["next", "start", "-p", String(port)], {
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });

  const shutdown = async () => {
    if (server.exitCode === null && !server.killed) {
      server.kill("SIGTERM");
      // give it a beat, then force
      await Promise.race([once(server, "exit"), new Promise((r) => setTimeout(r, 3000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
  };

  try {
    await waitForReady(base);
    await assertGate(base);
  } finally {
    await shutdown();
  }
  report();
}

(serve ? runServe() : runRemote()).catch(async (e) => {
  console.error("smoke test error:", e);
  process.exit(1);
});
