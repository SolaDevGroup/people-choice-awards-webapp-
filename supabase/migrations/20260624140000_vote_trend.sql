-- ===========================================================================
-- Real "Vote Trend (Last 24h)": % growth in a player's pass-vote support over
-- the last 24 hours. `recent` = support that landed on the player in the last
-- 24h (a brand-new vote OR a vote switched onto them — both bump updated_at);
-- the trend is recent vs. the support they already had:
--     trend% = recent / (total - recent) * 100
-- Read-only over the public pass_vote tallies; safe for anon + authenticated.
-- ===========================================================================
create or replace function public.player_vote_trends()
returns table(player_id uuid, trend numeric)
language sql stable set search_path = public as $$
  with tot as (
    select pv.player_id,
           count(*)::numeric as total,
           count(*) filter (where pv.updated_at >= now() - interval '24 hours')::numeric as recent
    from public.pass_vote pv
    group by pv.player_id
  )
  select t.player_id,
         round(
           case when (t.total - t.recent) > 0 then (t.recent / (t.total - t.recent)) * 100
                when t.recent > 0 then 100        -- all current support is brand-new → +100%
                else 0 end
         , 1) as trend
  from tot t;
$$;

grant execute on function public.player_vote_trends() to anon, authenticated;
