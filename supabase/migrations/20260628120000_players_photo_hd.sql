-- ===========================================================================
-- High-res player portraits. API-Football only serves 150×150 headshots, which
-- look blurry when shown large (player detail hero, podium on retina). The
-- scripts/enrich-photos.mjs importer fills this column with a sharp Wikipedia
-- portrait where one exists (verified to be a footballer); players without a
-- match keep their API-Football photo_url. mapPlayer prefers photo_hd.
-- ===========================================================================
alter table public.players add column if not exists photo_hd text;

-- the frontend reads players with the anon key; make the new column readable
grant select (photo_hd) on public.players to anon, authenticated;
