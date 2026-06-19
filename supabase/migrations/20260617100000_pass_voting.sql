-- ════════════════════════════════════════════════════════════════════════
-- Supporter-Pass voting model: ONE vote per user, changeable exactly ONCE.
-- (Replaces the FC-allocation model for the front-end vote button.)
--   • A user must hold an active Supporter Pass to vote.
--   • First vote is free once they have the pass (cast at purchase by the webhook,
--     or via the UI). They may change it to a different player ONE time, never again.
--   • Each vote carries the voter's profile country (for the support map).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.pass_vote (
  user_id      uuid primary key references public.profiles(id) on delete cascade, -- one row per user
  player_id    uuid not null references public.players(id) on delete cascade,
  country_code text,
  changes_used int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists pass_vote_player_idx on public.pass_vote (player_id);

alter table public.pass_vote enable row level security;
drop policy if exists "read pass votes" on public.pass_vote;
create policy "read pass votes" on public.pass_vote for select using (true); -- public tallies/map

-- Per-player vote tally (count of supporters) for lists / leaderboard / podium.
create or replace view public.pass_vote_counts as
  select player_id, count(*)::int as votes
  from public.pass_vote group by player_id;
grant select on public.pass_vote_counts to anon, authenticated;

-- Cast or change the single vote. Server-authoritative; enforces all the rules.
create or replace function public.cast_pass_vote(p_player uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur record; cc text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.supporter_pass where user_id = uid and active) then
    raise exception 'Supporter Pass required';
  end if;
  select country_code into cc from public.profiles where id = uid;
  select * into cur from public.pass_vote where user_id = uid;

  if cur.user_id is null then
    insert into public.pass_vote(user_id, player_id, country_code) values (uid, p_player, cc);
    perform public.grant_xp(10, 'vote', 'Cast a vote');
  elsif cur.player_id = p_player then
    raise exception 'You already voted for this player';
  elsif cur.changes_used >= 1 then
    raise exception 'You can only change your vote once';
  else
    update public.pass_vote
      set player_id = p_player, changes_used = changes_used + 1, country_code = cc, updated_at = now()
      where user_id = uid;
  end if;

  return (select jsonb_build_object('player_id', player_id, 'changes_used', changes_used)
          from public.pass_vote where user_id = uid);
end $$;

-- Service-role helper the Stripe webhook calls to cast the INITIAL vote at purchase
-- (no auth.uid() there). Never overwrites an existing vote.
create or replace function public.grant_initial_vote(p_user uuid, p_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cc text;
begin
  if p_player is null then return; end if;
  select country_code into cc from public.profiles where id = p_user;
  insert into public.pass_vote(user_id, player_id, country_code)
    values (p_user, p_player, cc)
    on conflict (user_id) do nothing; -- keep their existing choice if any
end $$;

-- The current user's vote state (drives the button enable/disable in the UI).
create or replace function public.my_pass_vote()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('player_id', player_id, 'changes_used', changes_used)
       from public.pass_vote where user_id = auth.uid()),
    '{}'::jsonb);
$$;

grant execute on function public.cast_pass_vote(uuid)        to authenticated;
grant execute on function public.my_pass_vote()              to anon, authenticated;
grant execute on function public.grant_initial_vote(uuid,uuid) to service_role;
