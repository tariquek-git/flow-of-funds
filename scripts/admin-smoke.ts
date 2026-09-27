/**
 * Owner-only release smoke for the live generation control plane.
 *
 * Provide FOF_ADMIN_SECRET through a trusted shell for this one process. The
 * value and derived cookie are never logged or written by this script.
 */
import { ADMIN_COOKIE, adminToken } from "../src/lib/gate";

const urlArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = (urlArg ?? "https://flows.fintechnorth.ca").replace(/\/$/, "");

type AdminStatus = {
  provider?: unknown;
  modelHeavy?: unknown;
  hasAiKey?: unknown;
  hasGate?: unknown;
  hasAdmin?: unknown;
  store?: unknown;
  capGloballyEnforced?: unknown;
  requireSharedStore?: unknown;
  refusing?: unknown;
  dataSecretInSync?: unknown;
  headroomUsd?: unknown;
};

async function main(): Promise<void> {
  const secret = process.env.FOF_ADMIN_SECRET?.trim();
  if (!secret) {
    console.error("FAIL - FOF_ADMIN_SECRET is not available to the smoke process");
    process.exit(1);
  }
  const token = await adminToken(secret);
  const response = await fetch(`${base}/api/admin/status`, {
    headers: { Cookie: `${ADMIN_COOKIE}=${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  let body: AdminStatus = {};
  try {
    body = (await response.json()) as AdminStatus;
  } catch {
    console.error(`FAIL - expected JSON, received HTTP ${response.status}`);
    process.exit(1);
  }

  const safeSummary = {
    status: response.status,
    provider: body.provider,
    modelHeavy: body.modelHeavy,
    hasAiKey: body.hasAiKey === true,
    hasGate: body.hasGate === true,
    hasAdmin: body.hasAdmin === true,
    store: body.store,
    capGloballyEnforced: body.capGloballyEnforced === true,
    requireSharedStore: body.requireSharedStore === true,
    refusing: body.refusing === true,
    dataSecretInSync: body.dataSecretInSync === true,
    headroomUsd: body.headroomUsd,
  };
  console.log(JSON.stringify(safeSummary));

  const passed =
    response.ok &&
    body.provider !== "fixture" &&
    typeof body.modelHeavy === "string" &&
    body.hasAiKey === true &&
    body.hasGate === true &&
    body.hasAdmin === true &&
    body.store !== "in-memory" &&
    body.capGloballyEnforced === true &&
    body.requireSharedStore === true &&
    body.refusing === false &&
    body.dataSecretInSync === true &&
    typeof body.headroomUsd === "number" &&
    body.headroomUsd > 0;

  if (!passed) {
    console.error("FAIL - admin control-plane release contract is not ready");
    process.exit(1);
  }

  console.log("PASS - admin secret, live provider, shared cap, and data RPC are ready");
}

main().catch((error: unknown) => {
  console.error(
    "FAIL - admin smoke request failed",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exit(1);
});
