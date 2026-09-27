-- Flow of Funds — Supabase schema + RPCs (source of truth)
-- =====================================================================
-- These objects back the distributed store (rate limit, spend cap, query +
-- event logging, feedback) and the owner-only /admin portal. They live in the
-- RLS-locked `fof` schema and are reached ONLY through the `public.fof_*`
-- SECURITY DEFINER functions, which are EXECUTE-granted to the anon role. The
-- app uses the anon/publishable key — never the service_role secret — so the
-- key can call exactly these functions and touch nothing else.
--
-- Applied manually to project `<your-project-ref>` (Supabase dashboard / MCP).
-- This file is the version-controlled record; re-running it is safe (idempotent:
-- CREATE ... IF NOT EXISTS + CREATE OR REPLACE FUNCTION).
--
-- Admin RPCs gate on a SHA-256 hash of FOF_ADMIN_SECRET stored in
-- fof.admin_config (the plaintext secret never lives in the DB).
-- =====================================================================

create schema if not exists fof;
grant usage on schema public to anon; -- anon must reach the public.fof_* wrappers

-- ── Tables (RLS-locked; no policies → unreachable except via the RPCs) ────────

create table if not exists fof.rate_counters (
  key      text primary key,
  count    integer not null default 0,
  reset_at timestamptz not null
);

create table if not exists fof.daily_spend (
  day date primary key,
  usd numeric not null default 0
);

create table if not exists fof.conversations (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  payload    jsonb not null
);

create table if not exists fof.feedback (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  payload    jsonb
);

create table if not exists fof.events (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  payload    jsonb not null
);

create table if not exists fof.admin_config (
  id            integer primary key default 1 check (id = 1),
  secret_sha256 text
);

alter table fof.rate_counters enable row level security;
alter table fof.daily_spend   enable row level security;
alter table fof.conversations enable row level security;
alter table fof.feedback      enable row level security;
alter table fof.events        enable row level security;
alter table fof.admin_config  enable row level security;

-- ── Rate limiting (distributed fixed-window counter) ─────────────────────────

create or replace function public.fof_rate_hit(p_key text, p_limit integer, p_window_seconds integer)
returns table(allowed boolean, remaining integer, reset_at bigint)
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare
  v_now   timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into fof.rate_counters as c (key, count, reset_at)
    values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count    = case when c.reset_at <= v_now then 1 else c.count + 1 end,
        reset_at = case when c.reset_at <= v_now
                          then v_now + make_interval(secs => p_window_seconds)
                          else c.reset_at end
  returning c.count, c.reset_at into v_count, v_reset;

  allowed   := v_count <= p_limit;
  remaining := greatest(0, p_limit - v_count);
  reset_at  := floor(extract(epoch from v_reset))::bigint;
  return next;
end;
$function$;

-- ── Daily spend cap (distributed tally, UTC day) ─────────────────────────────

create or replace function public.fof_spend_add(p_day date, p_usd numeric)
returns numeric
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_total numeric;
begin
  insert into fof.daily_spend as s (day, usd)
    values (p_day, greatest(0, coalesce(p_usd, 0)))
  on conflict (day) do update
    set usd = s.usd + greatest(0, coalesce(excluded.usd, 0))
  returning s.usd into v_total;
  return v_total;
end;
$function$;

create or replace function public.fof_spend_peek(p_day date)
returns numeric
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_total numeric;
begin
  select s.usd into v_total from fof.daily_spend s where s.day = p_day;
  return coalesce(v_total, 0);
end;
$function$;

-- ── Logging: conversations, events, feedback (anon insert via SECURITY DEFINER)

create or replace function public.fof_log_query(p_payload jsonb)
returns bigint
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_id bigint;
begin
  insert into fof.conversations (payload) values (p_payload) returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.fof_log_event(p_payload jsonb)
returns bigint
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_id bigint;
begin
  insert into fof.events (payload) values (p_payload) returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.fof_feedback_add(p_payload jsonb)
returns bigint
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_id bigint;
begin
  insert into fof.feedback (payload) values (coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$function$;

-- ── Admin reads (gated on sha256(FOF_ADMIN_SECRET) = admin_config.secret_sha256)

create or replace function public.fof_admin_list(p_secret text, p_limit integer default 50, p_offset integer default 0, p_outcome text default null)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_rows jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null or encode(sha256(convert_to(p_secret,'UTF8')),'hex') <> v_hash then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'created_at',created_at,'payload',payload) order by created_at desc),'[]'::jsonb)
    into v_rows
  from (select id, created_at, payload from fof.conversations
        where (p_outcome is null or payload->>'outcome' = any(string_to_array(p_outcome, ',')))
        order by created_at desc
        limit greatest(1, least(coalesce(p_limit,50),200)) offset greatest(0, coalesce(p_offset,0))) t;
  return v_rows;
end;
$function$;
-- NOTE: a legacy 3-arg overload public.fof_admin_list(text,integer,integer) also
-- exists in the live DB from before the p_outcome filter. It is harmless (the
-- route always passes p_outcome → resolves to the 4-arg form). Drop it to converge:
--   drop function if exists public.fof_admin_list(text, integer, integer);

create or replace function public.fof_admin_stats(p_secret text)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_out jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null or encode(sha256(convert_to(p_secret,'UTF8')),'hex') <> v_hash then
    return '{}'::jsonb;
  end if;
  select jsonb_build_object(
    'total', (select count(*) from fof.conversations),
    'last24h', (select count(*) from fof.conversations where created_at >= now() - interval '24 hours'),
    'by_outcome', (select coalesce(jsonb_object_agg(k,c),'{}'::jsonb) from (select coalesce(payload->>'outcome','unknown') k, count(*) c from fof.conversations group by 1) o),
    'by_capability', (select coalesce(jsonb_object_agg(k,c),'{}'::jsonb) from (select coalesce(payload->>'capability','unknown') k, count(*) c from fof.conversations group by 1) cc),
    'distinct_sessions', (select count(distinct payload->>'sessionId') from fof.conversations where payload->>'sessionId' is not null),
    'top_countries', (select coalesce(jsonb_agg(jsonb_build_object('country',country,'count',c) order by c desc),'[]'::jsonb) from (select coalesce(nullif(payload->'geo'->>'country',''),'—') country, count(*) c from fof.conversations group by 1 order by c desc limit 10) r),
    'spend_total', (select coalesce(sum(usd),0) from fof.daily_spend),
    'spend_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day',day,'usd',usd) order by day desc),'[]'::jsonb) from (select day,usd from fof.daily_spend order by day desc limit 14) d),
    'feedback_total', (select count(*) from fof.feedback),
    'first_run', (select min(created_at) from fof.conversations),
    'last_run', (select max(created_at) from fof.conversations),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day',day,'runs',runs,'success',success,'error',error,'refused',refused) order by day),'[]'::jsonb)
       from (select (created_at at time zone 'America/Toronto')::date as day, count(*) runs,
                    count(*) filter (where payload->>'outcome'='success') success,
                    count(*) filter (where payload->>'outcome'='error') error,
                    count(*) filter (where payload->>'outcome'='refused') refused
             from fof.conversations where created_at >= now() - interval '14 days' group by 1) d),
    'by_hour', (select coalesce(jsonb_agg(jsonb_build_object('hour',hour,'runs',runs) order by hour),'[]'::jsonb)
       from (select extract(hour from (created_at at time zone 'America/Toronto'))::int as hour, count(*) runs from fof.conversations group by 1) h),
    'failure_reasons', (select coalesce(jsonb_agg(jsonb_build_object('reason',reason,'outcome',outcome,'count',c) order by c desc),'[]'::jsonb)
       from (select left(coalesce(payload->>'error', payload->>'outcome'),140) reason, payload->>'outcome' outcome, count(*) c
             from fof.conversations where payload->>'outcome' in ('error','refused') group by 1,2 order by c desc limit 12) f)
  ) into v_out;
  return v_out;
end;
$function$;

create or replace function public.fof_admin_feedback(p_secret text, p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_rows jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null or encode(sha256(convert_to(p_secret,'UTF8')),'hex') <> v_hash then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'created_at',created_at,'payload',payload) order by created_at desc),'[]'::jsonb)
    into v_rows
  from (select id, created_at, payload from fof.feedback order by created_at desc
        limit greatest(1, least(coalesce(p_limit,50),200)) offset greatest(0, coalesce(p_offset,0))) t;
  return v_rows;
end;
$function$;

create or replace function public.fof_admin_events(p_secret text)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_out jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null or encode(sha256(convert_to(p_secret,'UTF8')),'hex') <> v_hash then
    return '{}'::jsonb;
  end if;
  select jsonb_build_object(
    'total', (select count(*) from fof.events),
    'last24h', (select count(*) from fof.events where created_at >= now() - interval '24 hours'),
    'by_event', (select coalesce(jsonb_object_agg(k,c),'{}'::jsonb) from (select coalesce(payload->>'event','(unknown)') k, count(*) c from fof.events group by 1 order by 2 desc) e),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('created_at',created_at,'event',payload->>'event','sessionId',payload->>'sessionId','props',payload->'props') order by created_at desc),'[]'::jsonb)
       from (select created_at, payload from fof.events order by created_at desc limit 30) r)
  ) into v_out;
  return v_out;
end;
$function$;

-- ── Grants: anon may EXECUTE exactly these wrappers, nothing else ─────────────

grant execute on function public.fof_rate_hit(text, integer, integer) to anon;
grant execute on function public.fof_spend_add(date, numeric) to anon;
grant execute on function public.fof_spend_peek(date) to anon;
grant execute on function public.fof_log_query(jsonb) to anon;
grant execute on function public.fof_log_event(jsonb) to anon;
grant execute on function public.fof_feedback_add(jsonb) to anon;
grant execute on function public.fof_admin_list(text, integer, integer, text) to anon;
grant execute on function public.fof_admin_stats(text) to anon;
grant execute on function public.fof_admin_feedback(text, integer, integer) to anon;
grant execute on function public.fof_admin_events(text) to anon;
