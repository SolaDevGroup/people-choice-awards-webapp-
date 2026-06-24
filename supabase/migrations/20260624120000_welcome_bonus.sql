-- ===========================================================================
-- Welcome bonus (claim-once per user) + ensure the 7-day daily ladder is seeded.
-- The 500 FC welcome bonus and the daily streak are now server-authoritative:
-- credited via _fc_apply (atomic + fc_ledger), guarded against double-claims.
-- ===========================================================================

-- One-time welcome bonus: a timestamp marks it claimed (null = not yet claimed).
alter table public.profiles
  add column if not exists welcome_bonus_claimed_at timestamptz;

-- Seed / refresh the 7-day reward ladder (matches the UI: 50,75,100,150,200,300,500).
insert into public.daily_rewards(day, fc_reward) values
  (1,50),(2,75),(3,100),(4,150),(5,200),(6,300),(7,500)
on conflict (day) do update set fc_reward = excluded.fc_reward;

-- Claim the 500 FC welcome bonus. Idempotent: if already claimed it credits
-- nothing and returns claimed=false, so it can never be double-claimed.
create or replace function public.claim_welcome_bonus()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); already timestamptz; bal bigint;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select welcome_bonus_claimed_at into already from public.profiles where id = uid for update;
  if already is not null then
    return jsonb_build_object('claimed', false, 'fc', 0,
      'balance', (select fc_balance from public.profiles where id = uid));
  end if;
  bal := public._fc_apply(uid, 500, 'welcome_bonus', 'profiles', uid::text, 'Welcome bonus');
  update public.profiles set welcome_bonus_claimed_at = now() where id = uid;
  perform public.grant_xp(100, 'welcome', 'Welcome bonus');
  return jsonb_build_object('claimed', true, 'fc', 500, 'balance', bal);
end $$;

grant execute on function public.claim_welcome_bonus() to authenticated;
