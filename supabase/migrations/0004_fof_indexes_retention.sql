-- Flow of Funds — admin-query indexes + retention scaffolding
-- =====================================================================
-- *** DRAFT — NOT APPLIED TO PROD. ***
-- Version-controlled draft only; the owner applies it (same flow as 0003's
-- NOTES: Supabase MCP `apply_migration` on project `<your-project-ref>`, or
-- `supabase db push` / psql).
--
-- Purpose: the admin RPCs in 0001/0002 scan fof.conversations and fof.events
-- with `order by created_at desc`, time-window filters (`created_at >= now() -
-- interval …`), and jsonb expression filters (`payload->>'sessionId' = …`,
-- `payload->>'outcome' = any(…)`). None of those columns/expressions are
-- indexed today, so every admin panel load is a seq scan that degrades as the
-- tables grow. This adds btree indexes matching those exact access patterns,
-- plus a commented retention/cleanup section for the unbounded tables.
--
-- Conventions match 0001–0003: objects live in the RLS-locked `fof` schema;
-- idempotent (CREATE INDEX IF NOT EXISTS); no grants change.
-- =====================================================================


-- =====================================================================
-- SECTION A — indexes for the admin RPC access patterns
-- =====================================================================

-- fof_admin_list / fof_admin_stats: `order by created_at desc limit …` and the
-- 24h / 14d window counts on fof.conversations (0001 lines ~167–213).
create index if not exists conversations_created_at_desc_idx
  on fof.conversations (created_at desc);

-- fof_admin_events: `order by created_at desc limit 30` + the 24h count on
-- fof.events (0001 lines ~248–252).
create index if not exists events_created_at_desc_idx
  on fof.events (created_at desc);

-- fof_admin_session_list: `where payload->>'sessionId' = p_session` equality
-- filter on fof.conversations (0002 line ~55); also serves the
-- distinct-sessions count in fof_admin_stats.
create index if not exists conversations_session_id_idx
  on fof.conversations ((payload->>'sessionId'));

-- fof_admin_list p_outcome filter (`payload->>'outcome' = any(…)`) and the
-- failure_reasons / by_outcome aggregates in fof_admin_stats.
create index if not exists conversations_outcome_idx
  on fof.conversations ((payload->>'outcome'));


-- =====================================================================
-- SECTION B — retention / cleanup (COMMENTED — decide windows before applying)
-- =====================================================================
-- All three tables below grow without bound today. Nothing here runs until the
-- owner uncomments it and picks retention windows. Suggested mechanism: the
-- pg_cron extension (available on Supabase: `create extension if not exists
-- pg_cron;`), scheduling a nightly job per statement.
--
-- 1. fof.rate_counters — rows are dead as soon as their window lapses; safe to
--    purge aggressively:
--
--      delete from fof.rate_counters where reset_at < now();
--
-- 2. fof.events — telemetry only; a bounded window (e.g. 90 days) keeps the
--    admin dashboard fast without losing anything the stats need day-to-day:
--
--      delete from fof.events where created_at < now() - interval '90 days';
--
-- 3. fof.conversations — feeds the admin drill-down and outcome stats; keep a
--    longer window (e.g. 180 days) or export before deleting:
--
--      delete from fof.conversations where created_at < now() - interval '180 days';
--
-- Example pg_cron scheduling (run once, after uncommenting the deletes above):
--
--      create extension if not exists pg_cron;
--      select cron.schedule('fof-purge-rate-counters', '17 3 * * *',
--        $$delete from fof.rate_counters where reset_at < now()$$);
--      select cron.schedule('fof-purge-events', '23 3 * * *',
--        $$delete from fof.events where created_at < now() - interval '90 days'$$);
--      select cron.schedule('fof-purge-conversations', '29 3 * * *',
--        $$delete from fof.conversations where created_at < now() - interval '180 days'$$);
