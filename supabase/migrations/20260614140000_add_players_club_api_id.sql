-- ============================================================================
-- WC26 FAN VOTE — MIGRATION: support real player data import (API-Football)
-- ============================================================================
-- 1. players.club  -> powers the "Club" filter in the Vote Players module
--    (mapPlayer in js/supabase.js already reads row.club; the column was missing).
-- 2. api_id on players & teams -> stable external key so the import script can
--    upsert idempotently (re-runnable) without colliding on slug / country_code.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.players add column if not exists club   text;
alter table public.players add column if not exists api_id bigint;
alter table public.teams   add column if not exists api_id bigint;

create unique index if not exists players_api_id_key on public.players (api_id);
create unique index if not exists teams_api_id_key   on public.teams   (api_id);
create index        if not exists players_club_idx    on public.players (club);
