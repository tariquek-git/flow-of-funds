# Supabase (Flow of Funds)

The distributed store (rate limit, daily spend cap, conversation/event/feedback
logging) and the `/admin` portal are backed by Postgres in the RLS-locked `fof`
schema, reached only through `public.fof_*` SECURITY DEFINER functions.

- **Schema + RPCs:** the ordered files in [`migrations/`](migrations/) are the
  version-controlled source of truth. `0001` is only the base schema. Later
  files replace RPC definitions, add hardening, indexes/retention, current
  admin signatures, and daily-audit storage.
- **Project:** `<your-project-ref>`. Migrations are applied manually (Supabase
  dashboard SQL editor or MCP); there is no automated runner wired up yet.
- **Apply rule:** on a fresh project, apply `0001` through the latest migration
  in numeric order. On an existing project, apply only the unapplied files.
  Never rerun `0001` alone against production: it can replace a hardened RPC
  with the older base definition until the later migration is reapplied.
- **0003 warning:** Section A is the active `$2` spend clamp. Section B is
  intentionally not applied because the app still uses the anon/publishable RPC
  path; applying that revoke now breaks `/admin`.
- **App env:** `SUPABASE_URL` + `SUPABASE_ANON_KEY` (the anon/**publishable** key — never the `service_role` secret). Absent these, the app degrades to Upstash, then in-memory (see `src/lib/supabase.ts`, `ratelimit.ts`, `budget.ts`).

## Admin secret (set out of band — never commit it)

The admin RPCs gate on a SHA-256 hash of `FOF_ADMIN_SECRET` stored in
`fof.admin_config`. Set both to the same value:

1. Vercel env: `FOF_ADMIN_SECRET = <password>` (then redeploy).
2. DB hash (run once, replace the value):

```sql
update fof.admin_config
set secret_sha256 = encode(sha256(convert_to('<password>','UTF8')),'hex')
where id = 1;
-- seed the row first if empty: insert into fof.admin_config (id) values (1) on conflict do nothing;
```

The plaintext password lives only in the Vercel env; the DB stores only its hash.
