/**
 * Authenticated release smoke for the daily audit.
 *
 * Provide CRON_SECRET through a trusted shell for this one process. The value
 * is never logged or written by this script.
 */

const urlArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = (urlArg ?? "https://flows.fintechnorth.ca").replace(/\/$/, "");

type AuditResponse = {
  ran?: unknown;
  checked?: unknown;
  schemaFailures?: unknown;
  flagged?: unknown;
  critiqueErrors?: unknown;
  summaryPersisted?: unknown;
  truncated?: unknown;
  totalEligible?: unknown;
};

async function main(): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("FAIL - CRON_SECRET is not available to the smoke process");
    process.exit(1);
  }
  console.log(`Daily-audit smoke -> ${base}`);
  const response = await fetch(`${base}/api/cron/daily-audit`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(125_000),
  });

  let body: AuditResponse = {};
  try {
    body = (await response.json()) as AuditResponse;
  } catch {
    console.error(`FAIL - expected JSON, received HTTP ${response.status}`);
    process.exit(1);
  }

  const countsAreNumbers =
    typeof body.checked === "number" &&
    typeof body.schemaFailures === "number" &&
    typeof body.flagged === "number" &&
    typeof body.critiqueErrors === "number";
  const contractPassed =
    response.ok &&
    body.ran === true &&
    body.summaryPersisted === true &&
    countsAreNumbers &&
    body.critiqueErrors === 0 &&
    body.truncated !== true;

  const summary = {
    status: response.status,
    ran: body.ran === true,
    summaryPersisted: body.summaryPersisted === true,
    checked: body.checked,
    totalEligible: body.totalEligible,
    schemaFailures: body.schemaFailures,
    flagged: body.flagged,
    critiqueErrors: body.critiqueErrors,
    truncated: body.truncated === true,
  };
  console.log(JSON.stringify(summary));

  if (!contractPassed) {
    console.error("FAIL - daily audit did not complete and persist cleanly");
    process.exit(1);
  }

  if (body.schemaFailures !== 0 || body.flagged !== 0) {
    console.error("FAIL - daily audit found flows that require owner review");
    process.exit(1);
  }

  console.log("PASS - daily audit completed, persisted, and found no unresolved issues");
}

main().catch((error: unknown) => {
  console.error(
    "FAIL - daily-audit smoke request failed",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exit(1);
});
