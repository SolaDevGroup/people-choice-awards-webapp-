-- ════════════════════════════════════════════════════════════════════════
-- Proper odds-based forecast payouts.
-- Before: every forecast paid a flat 1.8× (entry odds hard-locked at 50%).
-- After:  the payout reflects the REAL odds of the pick at the moment of the bet —
--         favourites pay less, underdogs pay more — using the same virtual-liquidity
--         (V=100/side) split the UI shows. entry_pct is stored so the history can show
--         true line movement (current odds − entry odds), not movement off a fake 50%.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.place_prediction(p_market uuid, p_option uuid, p_stake int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); m record; o record;
  fee numeric; v int := 100;               -- virtual liquidity per side (matches the UI)
  tot bigint; n_opts int; side_alloc bigint; prob numeric; entry int; pot int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  select * into m from public.markets where id = p_market;
  if m is null then raise exception 'Market not found'; end if;
  if m.status <> 'open' then raise exception 'Market is not open'; end if;
  if m.closes_at is not null and m.closes_at < now() then raise exception 'Market is closed'; end if;
  select * into o from public.market_options where id = p_option and market_id = p_market;
  if o is null then raise exception 'Invalid option'; end if;
  if exists (select 1 from public.predictions where user_id = uid and market_id = p_market) then
    raise exception 'You already forecast this market';
  end if;

  fee := m.platform_fee_pct/100.0;
  -- take the stake, add it to the pool
  perform public._fc_apply(uid, -p_stake, 'prediction_stake','markets',p_market::text,'Forecast stake');
  update public.market_options set fc_allocated = fc_allocated + p_stake, supporter_count = supporter_count + 1 where id = p_option;
  update public.markets set pool_fc = pool_fc + p_stake where id = p_market;

  -- fair odds for the chosen side (with virtual liquidity) → fair payout
  select coalesce(sum(fc_allocated),0), count(*) into tot, n_opts from public.market_options where market_id = p_market;
  select fc_allocated into side_alloc from public.market_options where id = p_option;
  prob := (side_alloc + v)::numeric / nullif(tot + n_opts*v, 0);
  if prob is null or prob <= 0 then prob := 0.5; end if;
  entry := round(prob*100);
  pot   := round( (p_stake / prob) * (1-fee) );

  insert into public.predictions(user_id, market_id, option_id, stake_fc, entry_pct, potential_payout)
  values (uid, p_market, p_option, p_stake, entry, pot);
  perform public.grant_xp(15,'prediction','Placed a forecast');
  return jsonb_build_object('potential_payout', pot, 'balance', (select fc_balance from public.profiles where id = uid), 'entry_pct', entry);
end $$;

-- Backfill the already-placed forecasts so their odds + potential are correct too.
-- Everything is computed inside the subquery (which never references the UPDATE target
-- `pr`); the update just matches rows by id.
update public.predictions pr set
  entry_pct        = gp.entry,
  potential_payout = gp.pot
from (
  select p2.id,
    round(prob.p * 100)::int                                                      as entry,
    round(p2.stake_fc / prob.p * (1 - coalesce(mk.platform_fee_pct,10)/100.0))::int as pot
  from public.predictions p2
  join public.market_options mo on mo.id = p2.option_id
  join public.markets        mk on mk.id = p2.market_id
  join lateral (select coalesce(sum(fc_allocated),0) s, count(*) n
                from public.market_options where market_id = p2.market_id) tt on true
  join lateral (select (mo.fc_allocated + 100)::numeric / nullif(tt.s + tt.n*100, 0) as p) prob on true
) gp
where gp.id = pr.id;
