-- ════════════════════════════════════════════════════════════════════════
-- Lazy markets for per-team / per-player prediction questions.
-- Pre-seeding 6,500+ markets would be absurd, so instead a question's market is
-- created the FIRST time someone forecasts it, then behaves like any other market
-- (persists, moves the odds). forecast_question() does ensure-market + place-bet
-- atomically and reuses place_prediction() for the FC + odds + XP logic.
--   p_slug must be namespaced: tq_… (team), pq_… (player), mq_… (misc) — so clients
--   can't mint arbitrary markets.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.forecast_question(
  p_slug text, p_title text, p_category text,
  p_label_a text, p_label_b text, p_side text, p_stake int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m_id uuid; a_id uuid; b_id uuid; opt_id uuid;
  subj market_subject; pp jsonb;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if p_slug !~ '^(tq|pq|mq)_' then raise exception 'Invalid question'; end if;

  subj := case p_category
            when 'player'     then 'player'::market_subject
            when 'tournament' then 'tournament'::market_subject
            else 'team'::market_subject end;

  -- 1. Ensure the market exists.
  select id into m_id from public.markets where slug = p_slug;
  if m_id is null then
    insert into public.markets(slug, kind, subject_type, category, type_label, title, pool_fc, status)
      values (p_slug, 'yes_no', subj, p_category, 'Prediction', p_title, 0, 'open')
      on conflict (slug) do nothing
      returning id into m_id;
    if m_id is null then select id into m_id from public.markets where slug = p_slug; end if;
  end if;

  -- 2. Ensure both options exist (side a / b).
  select id into a_id from public.market_options where market_id = m_id and side = 'a';
  if a_id is null then
    insert into public.market_options(market_id, label, side, implied_pct, sort)
      values (m_id, coalesce(p_label_a,'Yes'), 'a', 50, 0) returning id into a_id;
  end if;
  select id into b_id from public.market_options where market_id = m_id and side = 'b';
  if b_id is null then
    insert into public.market_options(market_id, label, side, implied_pct, sort)
      values (m_id, coalesce(p_label_b,'No'), 'b', 50, 1) returning id into b_id;
  end if;

  -- 3. Place the forecast (handles FC, the one-per-market rule, fc_allocated, XP).
  opt_id := case when p_side = 'b' then b_id else a_id end;
  pp := public.place_prediction(m_id, opt_id, p_stake);

  return jsonb_build_object(
    'balance',          pp->'balance',
    'potential_payout', pp->'potential_payout',
    'alloc_a', (select fc_allocated from public.market_options where id = a_id),
    'alloc_b', (select fc_allocated from public.market_options where id = b_id)
  );
end $$;

grant execute on function public.forecast_question(text,text,text,text,text,text,int) to authenticated;
