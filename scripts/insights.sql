-- Flow of Funds — instrumentation loop (the roadmap "operating method", codified).
-- Run against the Supabase project that backs flows.fintechnorth.ca (project ref
-- genericized for this public repo). Data lives in the `fof` schema:
--   events (telemetry), conversations (prompt + generated flow + outcome + usd),
--   feedback (sentiment/message), daily_spend, rate_counters.
-- Privacy: conversations.payload->>'prompt' is private per the no-public-prompt rule.
-- Aggregate only (rail keyword counts, outcomes); never surface individual prompts.
--
-- Usage: run each block, or `supabase db execute -f scripts/insights.sql`, or via the
-- MCP execute_sql. Intended to be run on a cadence (weekly) so the roadmap re-scores
-- against behaviour, not opinion.

-- 1) Funnel: what happens per session. Watch studio_entered -> first_flow_rendered
--    (a big pre-render drop-off = onboarding/empty-state problem) and seed_loaded vs
--    agent_turn (seed fast-path share; higher = cheaper).
select coalesce(payload->>'event','(none)') as event, count(*) n,
       min(created_at)::date first_seen, max(created_at)::date last_seen
from fof.events group by 1 order by n desc;

-- 2) Demand by rail (keyword scan over private prompts, counts only). Zero-demand
--    rails are NOT seed-build candidates; high-demand + low-accuracy rails are.
with c as (select lower(coalesce(payload->>'prompt','')) p from fof.conversations)
select
  count(*) total,
  count(*) filter (where p like '%interac%' or p like '%e-transfer%') interac_etransfer,
  count(*) filter (where p like '%rtr%' or p like '%lynx%' or p like '%acss%' or p like '% eft%' or p like '%pad%') canada_other_rails,
  count(*) filter (where p like '%visa%' or p like '%mastercard%' or p like '%card%' or p like '%tap%' or p like '%square%') cards_acquiring,
  count(*) filter (where p like '%ach%' or p like '%nacha%') ach,
  count(*) filter (where p like '%wire%' or p like '%swift%' or p like '%mt103%' or p like '%pacs%') wire_swift,
  count(*) filter (where p like '%fx%' or p like '%cross-border%' or p like '%international%' or p like '%remittance%') fx_xborder,
  count(*) filter (where p like '%crypto%' or p like '%usdc%' or p like '%stablecoin%') crypto,
  count(*) filter (where p like '%fednow%' or p like '%rtp%') us_instant,
  count(*) filter (where p like '%sepa%') sepa,
  count(*) filter (where p like '%upi%' or p like '%pix%') asia_latam_instant
from c;

-- 3) Quality: outcome split + spend. error+refused share is the "clarify before spend"
--    opportunity; total_usd vs the daily cap tells you whether to widen seeds first.
select coalesce(payload->>'outcome','(null)') outcome, count(*) n,
       round(sum(coalesce((payload->>'usd')::numeric,0))::numeric,2) usd
from fof.conversations group by 1 order by n desc;

-- 4) Geography: is the audience the (Canadian) community it is built for?
select coalesce(payload->'geo'->>'country','(null)') country, count(*) n
from fof.conversations group by 1 order by n desc;

-- 5) Representation engagement: are the Lanes/Time views (differentiator #2) actually
--    used? Very low view_mode_changed = a discovery problem, not a "build more views" one.
select coalesce(payload->'props'->>'to', payload->'props'->>'view', payload->'props'->>'mode','?') switched_to,
       count(*) n
from fof.events where payload->>'event'='view_mode_changed' group by 1 order by n desc;

-- 6) Feedback voice (sparse today — drive more ratings before trusting clusters).
select payload->>'sentiment' sentiment, payload->>'flowTitle' flow,
       left(coalesce(payload->>'message',''),200) message, created_at::date
from fof.feedback order by created_at desc;

-- 7) Spend trend (cap-trip signal).
select day, usd from fof.daily_spend order by day desc limit 30;
