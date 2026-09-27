# Host your own fork

Start in offline fixture mode. This public repository is a source snapshot and
is not connected to the Fintech North production deployment.

## Local setup

Use Node.js 24 and pnpm 11.2.2, matching the CI example.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

The example configuration sets `AI_PROVIDER=fixture`. Local fixture mode uses
bundled scenarios and does not require a provider key.

## Validate your changes

```sh
pnpm tsc --noEmit
pnpm lint
pnpm test
pnpm eval
pnpm build
pnpm smoke:public:ci
pnpm gate:smoke:ci
```

The offline checks validate structure and expected behavior. They do not establish
that every generated payment explanation is correct. Review the actual outputs
with relevant payments expertise and primary documentation.

## Deploy a separate instance

1. Fork this repository and import your fork into your own Vercel project.
2. Replace the Fintech North names and brand assets with your own, as described
   in `NOTICE`. Keep the Apache-2.0 license and attribution notices.
3. Set `AI_PROVIDER=fixture` first. For a gated deployment, configure a strong
   `FOF_GATE_SECRET`. Use `FOF_PUBLIC=1` only when you intend the app to be public.
4. Keep Production and Preview environment values intentional and separate.
5. Validate the deployed page and its corresponding public or gated smoke test.

## Enable live AI deliberately

- Set `AI_PROVIDER=openai` and your own `OPENAI_API_KEY`, or explicitly configure
  another supported provider. Check available models in your provider account.
- Configure a shared spend/rate-limit store (Supabase or Upstash/KV) before a
  public live-key deployment. Read `.env.example` for the complete settings.
- Set an application daily budget and provider-side spending controls. Run
  `pnpm eval:live` only when you intend to incur provider charges.
- Set your own admin secret and configure any required database migrations;
  see `supabase/README.md`. Never copy somebody else's hosted credentials.
- Review privacy copy and logging behavior for your deployment. Keep private,
  personal, and client-identifying information out of example prompts.
- Use `FOF_AI_GENERATION_ENABLED=0` to stop live AI generation while retaining
  access to curated/local functionality.

Read `SECURITY.md` and `docs/release-runbook.md` before wider distribution.
