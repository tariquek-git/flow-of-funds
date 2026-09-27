-- Flow of Funds — RPC hardening (Section A APPLIED to prod 2026-06-24 — see
-- status note below; Section B NOT APPLIED)
-- =====================================================================
-- Closes two verified findings against the live anon-reachable SECURITY
-- DEFINER RPCs on project `<your-project-ref>` (schema `fof`). Every
-- public.fof_* wrapper is EXECUTE-granted to anon (see 0001/0002), so anyone
-- with the publishable key can POST directly to /rest/v1/rpc, bypassing the
-- Next.js app and its in-app clamps/whitelists.
--
--   (A) public.fof_spend_add(date, numeric) clamps p_usd with a LOWER bound
--       only (greatest(0, …)). A direct anon call with a huge p_usd inflates
--       fof.daily_spend in one shot and trips the daily spend cap → cheap,
--       repeatable DoS of generation. Fix: add an upper per-call ceiling.
--   (B) public.fof_admin_* RPCs are anon/authenticated-EXECUTE-able and gated
--       ONLY by an in-parameter secret → brute-forceable directly against the
--       DB with no DB-side rate limit. Fix: revoke EXECUTE from anon/
--       authenticated so the admin surface is reachable only via service_role.
--
-- Conventions match 0001/0002: objects live in / read the RLS-locked `fof`
-- schema via the public.fof_* SECURITY DEFINER wrappers, search_path pinned to
-- 'fof','public'. SECTION A is idempotent (CREATE OR REPLACE FUNCTION).
--
-- *** STATUS (2026-07-02) ***
-- SECTION A (spend clamp): APPLIED to prod (project <your-project-ref>) on
--   2026-06-24 with a $2.00 per-call ceiling. Section A below was RECONCILED
--   on 2026-07-02 to match the live definition EXACTLY (the draft originally
--   carried a looser $5 ceiling), so re-applying it is a safe no-op.
-- SECTION B (admin-RPC revoke): NOT APPLIED. Still gated on the service_role
--   path prerequisite (see checklist below + NOTES.md).
-- See 0003_fof_rpc_hardening.NOTES.md for the apply prerequisite + one-liner.
-- =====================================================================


-- =====================================================================
-- SECTION A — APPLIED TO PROD 2026-06-24 ($2 ceiling; SQL below matches live)
-- =====================================================================
-- Re-defines public.fof_spend_add identical to 0001 EXCEPT the inserted /
-- accumulated amount is now bounded ABOVE as well as below. Signature, return
-- type, SECURITY DEFINER, search_path, and body shape are unchanged, so the
-- existing anon EXECUTE grant (0001 line 261) still applies and the app's
-- normal per-call spend (cents) is unaffected.
--
-- Ceiling rationale: a single legitimate generation costs well under $1; $2 is
-- a generous per-call cap that absorbs any real request while making the
-- direct-anon DoS (one call jumping daily_spend by thousands) impossible. The
-- pre-existing greatest(0, …) lower clamp is preserved; we simply wrap it in a
-- least(2.0, …). If a different ceiling is wanted later, change the 2.0 in
-- BOTH the insert and the on-conflict update below (keep them in sync).

create or replace function public.fof_spend_add(p_day date, p_usd numeric)
returns numeric
language plpgsql security definer set search_path to 'fof', 'public'
as $function$
declare v_total numeric;
begin
  insert into fof.daily_spend as s (day, usd)
    values (p_day, least(2.0, greatest(0, coalesce(p_usd, 0))))
  on conflict (day) do update
    set usd = s.usd + least(2.0, greatest(0, coalesce(excluded.usd, 0)))
  returning s.usd into v_total;
  return v_total;
end;
$function$;

-- $2/call ceiling: caps how much a single fof_spend_add call can add to the
-- daily tally, so a direct anon RPC call cannot trip the daily spend cap in one
-- (or a few) shots. Normal app calls add cents and are unaffected.
comment on function public.fof_spend_add(date, numeric) is
  'Distributed daily spend tally (UTC day). p_usd is clamped to [0, 2] per call: lower bound rejects negatives, $2 upper bound blocks direct-anon spend-cap DoS via /rest/v1/rpc. Normal app calls add cents.';


-- =====================================================================
-- SECTION B — GATED. DO NOT APPLY UNTIL THE PREREQUISITE BELOW IS MET.
-- =====================================================================
-- !!  DO NOT APPLY UNTIL: the /admin server routes are switched to call the
-- !!  admin RPCs via the Supabase SERVICE_ROLE key (requires
-- !!  SUPABASE_SERVICE_ROLE_KEY set in Vercel + a service-role fetch path in
-- !!  src/lib/supabase.ts). Applying this REVOKE before that WILL BREAK the
-- !!  live /admin panel.
--
-- WHY GATED (verified 2026-06-27 against ~/projects/fof-native):
--   • src/lib/supabase.ts `fofRpc()` is the ONLY RPC caller and authenticates
--     with the ANON / PUBLISHABLE key
--     (SUPABASE_ANON_KEY ?? SUPABASE_PUBLISHABLE_KEY ?? SUPABASE_KEY). There is
--     NO service_role path anywhere in src/ (the only two service_role mentions
--     are comments stating it is deliberately NOT used).
--   • Every admin route — stats, events, feedback, conversations
--     (fof_admin_list / fof_admin_session_list), and the status probe — calls
--     fofRpc(...) → anon key.
--   Therefore revoking anon EXECUTE now makes all five admin RPCs return
--   "permission denied for function" and every /admin panel goes blank.
--
-- The admin RPCs self-gate on sha256(FOF_ADMIN_SECRET) inside Postgres, so the
-- in-DB secret check is NOT removed here — Section B only narrows WHO may invoke
-- the function (defense in depth: only the trusted server, via service_role, can
-- even reach the secret check, eliminating the open-to-anon brute-force surface).
--
-- ── PREREQUISITE CHECKLIST (do all, in order, THEN uncomment Section B) ──
--   1. Add a service-role RPC path in src/lib/supabase.ts (e.g. fofAdminRpc)
--      that sends apikey/Authorization = SUPABASE_SERVICE_ROLE_KEY.
--   2. Point the five admin routes (stats, events, feedback, conversations,
--      status probe) at that service-role path instead of fofRpc().
--   3. Set SUPABASE_SERVICE_ROLE_KEY in Vercel (server-only; never NEXT_PUBLIC_*)
--      and redeploy.
--   4. Verify the /admin panel still loads with the service-role key.
--   5. THEN uncomment and apply the REVOKE statements below.
--
-- Exact current signatures (from 0001 + 0002) are pinned in each REVOKE so the
-- correct overload is targeted.

-- revoke execute on function public.fof_admin_list(text, integer, integer, text) from anon, authenticated;
-- revoke execute on function public.fof_admin_stats(text)                         from anon, authenticated;
-- revoke execute on function public.fof_admin_feedback(text, integer, integer)    from anon, authenticated;
-- revoke execute on function public.fof_admin_events(text)                        from anon, authenticated;
-- revoke execute on function public.fof_admin_session_list(text, text, integer)   from anon, authenticated;

-- (After applying, the service_role grant is implicit — service_role bypasses
-- the EXECUTE check entirely, so no explicit GRANT … TO service_role is needed.)
