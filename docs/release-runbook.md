# Release runbook

This runbook makes one claim provable: the exact Git commit tested on an
immutable, production-configured candidate is the artifact promoted to
`flows.fintechnorth.ca`, and a rollback points the production alias to a
previously recorded exact artifact. A passing build, a visible preview, or a
push to `main` is not release proof on its own.

No command below should print or store environment values. Store only deployment
IDs/URLs, commit SHAs, non-secret `/api/health` output, test summaries, timestamps,
and the operator.

## Release gates

The candidate is releasable only when all of these are recorded for one SHA:

1. The `CI` workflow for that SHA passed type-check, lint, the full `pnpm test`,
   offline eval, build, public smoke, and gated smoke.
2. An immutable, unaliased Vercel candidate built with production configuration
   reports that same SHA from `/api/health`.
3. The candidate reports `hasAiKey`, `hasDistributedStore`, and `hasCronSecret`
   as `true`, and its public smoke passes against that exact SHA.
4. The deployment ID inspected before promotion is the deployment ID promoted.
5. Production reports the candidate SHA after promotion and passes the matching
   smoke test.
6. One safe live-AI journey completes on the candidate and records latency plus
   an honest AI-draft Trust Receipt.
7. The authenticated daily audit completes without truncation/provider errors,
   persists its summary, and returns no unresolved findings.

Any SHA change, including a merge commit created after preview validation, starts
a new evidence record. Never transfer a green preview from one SHA to another.

## 1. Identify the exact candidate

Work from a clean checkout of the intended release commit:

```bash
export CANDIDATE_SHA="$(git rev-parse HEAD)"
git status --short
git show --no-patch --format=fuller "$CANDIDATE_SHA"
```

`git status --short` must be empty. Record `CANDIDATE_SHA`, the branch/PR, and the
CI run URL. In GitHub CLI, the read-only checks are:

```bash
gh run list --workflow CI --commit "$CANDIDATE_SHA" --limit 5
gh run view <run-id>
```

The accepted CI run must conclude `success` and its head SHA must equal
`CANDIDATE_SHA`.

## 2. Build and prove the candidate artifact

Do not promote an ordinary Git preview when Preview and Production environment
configuration differ. Create a production-target deployment without assigning
the production domains. This uses Production configuration while leaving the
live aliases untouched. Pass the non-secret candidate SHA at build and runtime
so a CLI deployment can prove its identity:

```bash
vercel deploy --prod --skip-domain --yes \
  --build-env FOF_BUILD_SHA="$CANDIDATE_SHA" \
  --env FOF_BUILD_SHA="$CANDIDATE_SHA"
export PREVIEW_URL="https://<immutable-candidate-host-from-output>"
vercel inspect "$PREVIEW_URL"
curl -fsS "$PREVIEW_URL/api/health" | tee /tmp/fof-preview-health.json
jq . /tmp/fof-preview-health.json
```

The health response is intentionally non-secret. It must show:

- `ok: true`;
- `buildSha` exactly equal to `CANDIDATE_SHA`;
- a non-empty semantic `buildVersion`;
- the intended production `accessPosture`;
- `hasAiKey`, `hasDistributedStore`, and `hasCronSecret` all `true`;
- configuration presence booleans only, never credentials or provider names.

Make the SHA comparison executable:

```bash
jq -e --arg sha "$CANDIDATE_SHA" \
  '.ok == true and .buildSha == $sha and .accessPosture == "public" and
   .hasAiKey == true and .hasDistributedStore == true and .hasCronSecret == true' \
  /tmp/fof-preview-health.json
```

Run the smoke matching the declared posture. The public smoke can enforce the
same SHA and required production configuration without making a paid model call:

```bash
# Current intended public posture
FOF_SMOKE_EXPECT_SHA="$CANDIDATE_SHA" FOF_SMOKE_REQUIRE_LIVE=1 \
  pnpm smoke:public "$PREVIEW_URL"

# Use this instead only if production is deliberately gated
pnpm gate:smoke "$PREVIEW_URL"
```

Then complete one deliberately non-template payment question in the browser so
the live provider path is exercised. Record only a safe prompt, completion
status, elapsed time, and the resulting Trust Receipt labels. Do not record a
sensitive user scenario. The result must be labelled `AI draft`, retain its
assumptions/warnings, and say `Human review: Not recorded`.

Finally, run the authenticated checks against the candidate. Vercel Sensitive
variables cannot be exported by the CLI, so the owner must supply each value to
a trusted local shell without echoing or writing it. First prove the admin
secret, live provider, shared cap, and data RPC are ready. Then run the audit.
The audit may use the configured light model; neither command belongs in CI:

```bash
read -rs "FOF_ADMIN_SECRET?FOF_ADMIN_SECRET: "
export FOF_ADMIN_SECRET
pnpm admin:smoke "$PREVIEW_URL"
unset FOF_ADMIN_SECRET

read -rs "CRON_SECRET?CRON_SECRET: "
export CRON_SECRET
pnpm cron:smoke "$PREVIEW_URL"
unset CRON_SECRET
```

Record the command, exit code, and summary. Stop if the SHA is null/mismatched,
the posture differs from the release plan, inspection points to another
deployment, a live generation fails, or either smoke fails.

## 3. Promote the exact deployment

Before promotion, record the current production deployment and health response;
this is the immediate rollback candidate:

```bash
export PRODUCTION_URL="https://flows.fintechnorth.ca"
vercel inspect "$PRODUCTION_URL"
curl -fsS "$PRODUCTION_URL/api/health" | tee /tmp/fof-production-before.json
```

Promote the immutable preview deployment URL or its inspected deployment ID. Do
not redeploy from a working tree and do not substitute a branch alias:

```bash
vercel promote "$PREVIEW_URL"
```

After the alias changes, fetch fresh evidence and require the exact SHA:

```bash
curl -fsS "$PRODUCTION_URL/api/health" | tee /tmp/fof-production-after.json
jq -e --arg sha "$CANDIDATE_SHA" \
  '.ok == true and .buildSha == $sha and .accessPosture == "public" and
   .hasAiKey == true and .hasDistributedStore == true and .hasCronSecret == true' \
  /tmp/fof-production-after.json
```

Then run the smoke matching production's declared posture:

```bash
# Current intended production posture
FOF_SMOKE_EXPECT_SHA="$CANDIDATE_SHA" FOF_SMOKE_REQUIRE_LIVE=1 \
  pnpm smoke:public "$PRODUCTION_URL"

# Use this instead if production is deliberately gated
pnpm gate:smoke "$PRODUCTION_URL"
```

Promotion is complete only when `vercel inspect`, production health, and smoke
all identify/validate the promoted artifact. A successful `vercel promote`
command without those post-checks is not completion proof.

## 4. Roll back to a recorded artifact

Use a known-good immutable deployment ID/URL from an earlier release record.
Before changing the alias, verify and record its expected SHA:

```bash
export ROLLBACK_DEPLOYMENT="<known-good-deployment-id-or-url>"
export ROLLBACK_SHA="<recorded-known-good-sha>"
vercel inspect "$ROLLBACK_DEPLOYMENT"
curl -fsS "https://<known-good-immutable-host>/api/health" \
  | tee /tmp/fof-rollback-target.json
jq -e --arg sha "$ROLLBACK_SHA" '.ok == true and .buildSha == $sha' \
  /tmp/fof-rollback-target.json
```

For a legacy deployment created before `/api/health` exposed `buildSha`, verify
the immutable deployment's Git metadata instead and record that this exception
was used:

```bash
vercel api "/v13/deployments/$ROLLBACK_DEPLOYMENT" --raw \
  | jq -e --arg sha "$ROLLBACK_SHA" '.meta.githubCommitSha == $sha'
```

Rollback to that specific deployment, never an unqualified "previous" release:

```bash
vercel rollback "$ROLLBACK_DEPLOYMENT"
```

Verify the production alias now reports the rollback SHA, then rerun the matching
production smoke. Use the Vercel metadata check again for a legacy target whose
health schema predates release identity:

```bash
curl -fsS "$PRODUCTION_URL/api/health" | tee /tmp/fof-production-rollback.json
jq -e --arg sha "$ROLLBACK_SHA" \
  '.ok == true and .buildSha == $sha and .hasCronSecret == true' \
  /tmp/fof-production-rollback.json
pnpm smoke:public "$PRODUCTION_URL"
```

If production is gated, substitute `pnpm gate:smoke`. Record the incident/reason,
operator, UTC time, failed release SHA, rollback deployment ID, rollback SHA,
health output, and smoke result.

## Evidence record template

```text
Candidate SHA:
Package version:
PR / branch:
CI run URL and conclusion:
Immutable preview URL:
Preview deployment ID:
Preview health SHA / posture:
Preview smoke command / result:
Previous production deployment ID / SHA:
Promotion operator / UTC time:
Production health SHA / posture / hasCronSecret:
Production smoke command / result:
Live generation prompt class / completion / latency / receipt:
Admin provider / model / shared cap / secret sync / result:
Daily audit checked / errors / persisted / result:
Rollback target deployment ID / SHA (if used):
Rollback identity source (health or Vercel metadata):
Rollback operator / UTC time / reason (if used):
Post-rollback health and smoke result (if used):
Open blockers:
```
