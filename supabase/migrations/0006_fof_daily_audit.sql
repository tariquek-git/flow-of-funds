-- Flow of Funds — daily pressure-test audit storage
-- =====================================================================
-- Purpose: back the daily accuracy audit (cron-triggered, see
-- src/lib/agent/dailyAudit.ts). Each run of the audit re-checks the last 24h
-- of successful real generations from fof.conversations against (a) schema
-- validation and (b) a lightweight AI critique against known payments
-- mechanics, then logs the results here for owner review in /admin.
--
-- Row shape mirrors the other content tables (id, created_at, payload jsonb),
-- with `payload.kind` distinguishing the two record types:
--   "summary" — one per run: { date, checked, schemaFailures, flagged }
--   "finding" — one per flagged item: { date, conversationId, reason,
--               kind: "schema"|"critique", flowTitle }
--
-- Conventions match 0001/0002/0003: objects live in the RLS-locked `fof`
-- schema, reached ONLY via public.fof_* SECURITY DEFINER wrappers.
--   - fof_log_daily_audit(jsonb): pure insert, anon EXECUTE, NO secret gate —
--     same posture as fof_log_query/fof_log_event (this is a server-only
--     write path from the cron route, not user-facing; abuse risk is the same
--     already-accepted shape as the other fire-and-forget log sinks).
--   - fof_admin_daily_audits(text, integer): admin READ, gated on
--     sha256(FOF_ADMIN_SECRET) = fof.admin_config.secret_sha256, same as every
--     other fof_admin_* RPC.
--
-- Idempotent / safe to re-run: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE.
-- Date: 2026-07-06
-- =====================================================================

create table if not exists fof.daily_audits (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  payload    jsonb not null
);

alter table fof.daily_audits enable row level security;
-- No policies: RLS-locked, reached only through the SECURITY DEFINER RPCs
-- below (same pattern as fof.conversations / fof.events / fof.feedback).

create or replace function public.fof_log_daily_audit(p_payload jsonb)
returns bigint
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_id bigint;
begin
  insert into fof.daily_audits (payload) values (p_payload) returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.fof_admin_daily_audits(p_secret text, p_limit integer default 200)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_rows jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null
     or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> v_hash then
    return '[]'::jsonb;
  end if;
  select coalesce(
           jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'payload', payload)
                     order by created_at desc),
           '[]'::jsonb)
    into v_rows
  from (select id, created_at, payload
        from fof.daily_audits
        order by created_at desc
        limit greatest(1, least(coalesce(p_limit, 200), 500))) t;
  return v_rows;
end;
$function$;

grant execute on function public.fof_log_daily_audit(jsonb) to anon;
grant execute on function public.fof_admin_daily_audits(text, integer) to anon;

-- Retention: keep 90 days of audit history, mirroring 0004's conversation
-- retention approach. Run manually / via the same retention job as 0004 if
-- one exists; not scheduled here (no pg_cron dependency assumed).
comment on table fof.daily_audits is
  'Daily pressure-test results (schema + AI critique) over real fof.conversations rows. See src/lib/agent/dailyAudit.ts. Suggested retention: 90 days.';
