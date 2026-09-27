import { supabaseEnabled } from "@/lib/supabase";
import packageInfo from "../../../../package.json";

export const runtime = "nodejs";
// Always evaluate fresh — a health probe must reflect the live env, not a build
// snapshot. Cheap (no I/O, just env presence checks), so no caching is wanted.
export const dynamic = "force-dynamic";

/**
 * Minimal health/liveness endpoint for an uptime monitor.
 *
 * Returns 200 with a small, allow-listed JSON response — never a key, token,
 * URL, provider name, or other secret value. Secret-bearing configuration is
 * represented by presence booleans only:
 *   - hasAiKey            an AI provider credential is configured (OpenAI,
 *                         Anthropic, or DeepSeek fallback)
 *   - hasGate             the shared-secret access gate is set (FOF_GATE_SECRET)
 *   - hasDistributedStore a cross-instance store backs the rate limit + spend cap
 *                         (Supabase, or Upstash/Vercel-KV REST)
 *   - hasCronSecret       Vercel Cron authentication is configured (CRON_SECRET)
 *   - accessPosture       the declared public/gated posture (never a secret)
 *   - buildSha/version    immutable release identity for promotion/rollback proof
 *   - aiGenerationEnabled the owner kill switch is not pulled (unset/1 = live;
 *                         FOF_AI_GENERATION_ENABLED=0 = /api/agent refuses 503)
 *
 * Public by design: middleware allow-lists /api/health so a monitor can hit it
 * WITHOUT the gate cookie. Because it leaks no values, exposing it costs nothing.
 */
export function GET(): Response {
  const hasAiKey = !!(
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN
  );
  const hasGate = !!process.env.FOF_GATE_SECRET;
  const hasCronSecret = !!process.env.CRON_SECRET;
  // A distributed (cross-instance) tally backs the limiter + daily cap: Supabase
  // (preferred) or Upstash/Vercel-KV REST. Mirrors the tier detection in
  // ratelimit.ts / budget.ts — presence only, never the URLs or tokens.
  const hasDistributedStore =
    supabaseEnabled() ||
    !!(
      (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
    );

  const aiGenerationEnabled = process.env.FOF_AI_GENERATION_ENABLED !== "0";

  // Git deployments receive VERCEL_GIT_COMMIT_SHA from Vercel. A release made
  // from a clean local checkout can pass the same non-secret identity as
  // FOF_BUILD_SHA at build + runtime. Accept only a Git-shaped hexadecimal SHA
  // so a misconfigured env value can never be reflected by this public route.
  const rawBuildSha =
    process.env.FOF_BUILD_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "";
  const buildSha = /^[0-9a-f]{7,64}$/i.test(rawBuildSha) ? rawBuildSha : null;
  const buildVersion = packageInfo.version;
  const accessPosture = process.env.FOF_PUBLIC === "1" ? "public" : "gated";

  // Provider names and all secret VALUES live behind the admin boundary. Keep
  // this public response flat and explicit so accidental object/env spreading
  // can never turn it into a configuration dump.
  return Response.json(
    {
      ok: true,
      hasAiKey,
      hasGate,
      hasDistributedStore,
      hasCronSecret,
      aiGenerationEnabled,
      accessPosture,
      buildSha,
      buildVersion,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
