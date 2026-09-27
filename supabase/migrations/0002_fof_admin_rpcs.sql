-- Flow of Funds — live-applied admin RPCs missing from 0001 (reconciliation)
-- =====================================================================
-- Purpose: bring the committed migrations back in sync with the LIVE database
-- on project `<your-project-ref>`. After 0001 was written, several admin RPCs
-- were applied directly to production (Supabase dashboard / MCP) and never
-- back-filled into version control. This file captures every such object so the
-- repo reproduces production.
--
-- Captured here (present live, absent from 0001):
--   • public.fof_admin_session_list(text, text, integer)  — per-session drill-down
--   • DROP of the stale legacy overload public.fof_admin_list(text, integer, integer)
--     (superseded by the 4-arg p_outcome form already in 0001; it still carried an
--     anon EXECUTE grant, so we drop it to converge on a single current signature)
--
-- Already in 0001 and intentionally NOT repeated here: fof_admin_list(4-arg),
-- fof_admin_stats, fof_admin_feedback, fof_admin_events, fof_log_event/fof.events,
-- and all the core rate-limit / spend / logging / feedback RPCs.
--
-- Conventions match 0001: objects live in / read the RLS-locked `fof` schema via
-- the `public.fof_*` SECURITY DEFINER wrappers, search_path pinned to 'fof','public',
-- admin RPCs gate on sha256(FOF_ADMIN_SECRET) = fof.admin_config.secret_sha256,
-- and anon is the only role given EXECUTE.
--
-- Idempotent / safe to re-run: CREATE OR REPLACE FUNCTION + DROP ... IF EXISTS.
-- Date: 2026-06-23
-- =====================================================================

-- ── Drop the stale legacy overload (4-arg p_outcome form in 0001 is current) ──

drop function if exists public.fof_admin_list(text, integer, integer);

-- ── Admin reads: per-session conversation list (gated like the other admin RPCs)

create or replace function public.fof_admin_session_list(p_secret text, p_session text, p_limit integer default 200)
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
  if p_session is null or length(p_session) = 0 then
    return '[]'::jsonb;
  end if;
  select coalesce(
           jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'payload', payload)
                     order by created_at desc),
           '[]'::jsonb)
    into v_rows
  from (select id, created_at, payload
        from fof.conversations
        where payload->>'sessionId' = p_session
        order by created_at desc
        limit greatest(1, least(coalesce(p_limit, 200), 500))) t;
  return v_rows;
end;
$function$;

-- ── Grants: anon may EXECUTE exactly this wrapper ─────────────────────────────

grant execute on function public.fof_admin_session_list(text, text, integer) to anon;
