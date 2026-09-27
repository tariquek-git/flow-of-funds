-- Flow of Funds — admin RPC date-range parameters + event-type filter
-- =====================================================================
-- Extends fof_admin_stats and fof_admin_events with optional p_since
-- (ISO timestamp filter) so the admin panel can query arbitrary date
-- windows. Also adds p_event filter to fof_admin_events.
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Safe to re-run.
-- =====================================================================

-- ── fof_admin_stats(p_secret, p_since) — date-windowed usage stats ────────────
-- Extends the existing 1-arg signature: p_since is optional (null = all time).
-- When p_since is non-null, every time-window aggregate scopes to it.
-- Keeps the old 1-arg overload for backward compat; the new route uses this.

create or replace function public.fof_admin_stats(p_secret text, p_since text default null)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_since timestamp; v_out jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null or encode(sha256(convert_to(p_secret,'UTF8')),'hex') <> v_hash then
    return '{}'::jsonb;
  end if;
  -- Parse optional ISO timestamp; null = no window (all time).
  if p_since is not null and length(p_since) >= 10 then
    v_since := p_since::timestamp;
  end if;
  select jsonb_build_object(
    'total', (select count(*) from fof.conversations where v_since is null or created_at >= v_since),
    'last24h', (select count(*) from fof.conversations where created_at >= now() - interval '24 hours'),
    'by_outcome', (select coalesce(jsonb_object_agg(k,c),'{}'::jsonb)
       from (select coalesce(payload->>'outcome','unknown') k, count(*) c
             from fof.conversations where v_since is null or created_at >= v_since group by 1) o),
    'by_capability', (select coalesce(jsonb_object_agg(k,c),'{}'::jsonb)
       from (select coalesce(payload->>'capability','unknown') k, count(*) c
             from fof.conversations where v_since is null or created_at >= v_since group by 1) cc),
    'distinct_sessions', (select count(distinct payload->>'sessionId')
       from fof.conversations
       where (v_since is null or created_at >= v_since) and payload->>'sessionId' is not null),
    'top_countries', (select coalesce(jsonb_agg(jsonb_build_object('country',country,'count',c) order by c desc),'[]'::jsonb)
       from (select coalesce(nullif(payload->'geo'->>'country',''),'—') country, count(*) c
             from fof.conversations where v_since is null or created_at >= v_since group by 1 order by c desc limit 10) r),
    'spend_total', (select coalesce(sum(usd),0) from fof.daily_spend),
    'spend_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day',day,'usd',usd) order by day desc),'[]'::jsonb)
       from (select day,usd from fof.daily_spend order by day desc limit 28) d),
    'feedback_total', (select count(*) from fof.feedback),
    'first_run', (select min(created_at) from fof.conversations),
    'last_run', (select max(created_at) from fof.conversations),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day',day,'runs',runs,'success',success,'error',error,'refused',refused) order by day),'[]'::jsonb)
       from (select (created_at at time zone 'America/Toronto')::date as day, count(*) runs,
                    count(*) filter (where payload->>'outcome'='success') success,
                    count(*) filter (where payload->>'outcome'='error') error,
                    count(*) filter (where payload->>'outcome'='refused') refused
             from fof.conversations
             where v_since is null or created_at >= v_since
             group by 1) d),
    'by_hour', (select coalesce(jsonb_agg(jsonb_build_object('hour',hour,'runs',runs) order by hour),'[]'::jsonb)
       from (select extract(hour from (created_at at time zone 'America/Toronto'))::int as hour, count(*) runs
             from fof.conversations where v_since is null or created_at >= v_since group by 1) h),
    'failure_reasons', (select coalesce(jsonb_agg(jsonb_build_object('reason',reason,'outcome',outcome,'count',c) order by c desc),'[]'::jsonb)
       from (select left(coalesce(payload->>'error', payload->>'outcome'),140) reason, payload->>'outcome' outcome, count(*) c
             from fof.conversations
             where (v_since is null or created_at >= v_since)
               and payload->>'outcome' in ('error','refused')
             group by 1,2 order by c desc limit 12) f)
  ) into v_out;
  return v_out;
end;
$function$;

comment on function public.fof_admin_stats(text,text) is
  'Usage stats for /admin. p_since = optional ISO timestamp (e.g. 2026-06-01T00:00:00); null = all time.';

-- ── fof_admin_events(p_secret, p_since, p_event) — filtered event aggregate ──

create or replace function public.fof_admin_events(p_secret text, p_since text default null, p_event text default null)
returns jsonb
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_hash text; v_since timestamp; v_out jsonb;
begin
  select secret_sha256 into v_hash from fof.admin_config where id = 1;
  if v_hash is null or p_secret is null or encode(sha256(convert_to(p_secret,'UTF8')),'hex') <> v_hash then
    return '{}'::jsonb;
  end if;
  if p_since is not null and length(p_since) >= 10 then
    v_since := p_since::timestamp;
  end if;
  select jsonb_build_object(
    'total', (select count(*) from fof.events where (v_since is null or created_at >= v_since)),
    'last24h', (select count(*) from fof.events where created_at >= now() - interval '24 hours'),
    'by_event', (select coalesce(jsonb_object_agg(k,c),'{}'::jsonb)
       from (select coalesce(payload->>'event','(unknown)') k, count(*) c
             from fof.events where v_since is null or created_at >= v_since group by 1 order by 2 desc) e),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('created_at',created_at,'event',payload->>'event','sessionId',payload->>'sessionId','props',payload->'props') order by created_at desc),'[]'::jsonb)
       from (select created_at, payload from fof.events
             where (v_since is null or created_at >= v_since)
               and (p_event is null or coalesce(payload->>'event','') = p_event)
             order by created_at desc limit 50) r)
  ) into v_out;
  return v_out;
end;
$function$;

comment on function public.fof_admin_events(text,text,text) is
  'Interaction-event stats for /admin. p_since = optional ISO timestamp; p_event = optional event-name filter.';

-- ── Grants: anon may EXECUTE the new signatures ────────────────────────────────

grant execute on function public.fof_admin_stats(text, text) to anon;
grant execute on function public.fof_admin_events(text, text, text) to anon;

-- ── fof_conversations view for admin: expose the event stream ─────────────────
-- Not strictly needed by the RPC upgrade, but useful for direct Supabase
-- dashboard queries. Commented out unless the owner wants it:
-- (The admin already reaches this data via the RPCs above.)
