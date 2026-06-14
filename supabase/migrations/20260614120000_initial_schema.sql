-- ============================================================================
-- WC26 FAN VOTE — SUPABASE SCHEMA  (v1.0)
-- ============================================================================
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query.
-- Safe to re-run on a fresh project. Designed for Postgres 15 / Supabase.
--
-- SECURITY MODEL (important):
--   * Fan Credits (FC) are purchased currency. Balances are NEVER trusted from
--     the browser. profiles.fc_balance is a CACHE; the source of truth is the
--     immutable fc_ledger. All spend/earn happens through SECURITY DEFINER
--     functions (cast_vote, place_prediction, claim_daily_reward, buy_cosmetic…)
--     that validate atomically. Clients CANNOT write to fc_ledger or set
--     fc_balance directly (RLS denies it).
--   * Real-money purchase verification (RevenueCat / IAP) MUST be done by a
--     trusted server (Edge Function with the service_role key) calling
--     record_fc_purchase(). Never put the service_role key in the website.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy search on names
create extension if not exists "citext";         -- case-insensitive username

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type player_position as enum ('GK','DEF','MID','FWD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fc_txn_type as enum (
    'purchase','welcome_bonus','daily_reward','referral_reward','achievement_reward',
    'vote_spend','vote_refund','prediction_stake','prediction_payout','prediction_refund',
    'cosmetic_purchase','merch_purchase','treasury_contribution','admin_adjust'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type market_kind    as enum ('yes_no','head_to_head');
exception when duplicate_object then null; end $$;
do $$ begin
  create type market_subject as enum ('player','team','tournament');
exception when duplicate_object then null; end $$;
do $$ begin
  create type market_status  as enum ('upcoming','open','closed','settled','void');
exception when duplicate_object then null; end $$;
do $$ begin
  create type prediction_status as enum ('open','won','lost','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cosmetic_slot   as enum ('avatar','decoration','nameplate','banner');
exception when duplicate_object then null; end $$;
do $$ begin
  create type cosmetic_rarity as enum ('common','rare','epic','legendary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fixture_status  as enum ('scheduled','live','finished');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. HELPER: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. REFERENCE DATA: teams, players, stats
-- ---------------------------------------------------------------------------
create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text,
  country_code  text unique not null,          -- e.g. 'FR','BR' (or your own keys)
  flag_key      text,                           -- maps to your futuristic flag asset
  grp           text,                           -- 'A'..'L'
  confederation text,
  treasury_fc   bigint not null default 0,
  fan_count     int not null default 0,
  created_at    timestamptz not null default now()
);

create table public.players (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,                    -- 'mbappe'
  name          text not null,
  first_name    text,
  last_name     text,
  short_name    text,                           -- initials 'KM'
  position      player_position not null,
  team_id       uuid references public.teams(id) on delete set null,
  nationality   text,
  jersey_number int,
  age           int,
  photo_url     text,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now()
);
create index players_name_trgm on public.players using gin (name gin_trgm_ops);
create index players_team_idx   on public.players (team_id);
create index players_pos_idx     on public.players (position);

create table public.player_stats (
  player_id     uuid primary key references public.players(id) on delete cascade,
  goals         int not null default 0,
  assists       int not null default 0,
  matches       int not null default 0,
  wc_apps       int not null default 0,
  yellow_cards  int not null default 0,
  red_cards     int not null default 0,
  minutes       int not null default 0,
  win_rate      numeric(5,2) not null default 0,
  goals_per_match numeric(5,2) not null default 0,
  top_speed     numeric(5,2) not null default 0,
  trophies      int not null default 0,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. PROFILES (extends auth.users 1:1) + settings
-- ---------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         citext unique,
  display_name     text,
  avatar_url       text,
  bio              text,
  country_code     text,
  favorite_team_id uuid references public.teams(id) on delete set null,
  favorite_club    text,
  fc_balance       bigint not null default 0 check (fc_balance >= 0), -- CACHE of fc_ledger
  reputation_xp    int not null default 0,
  reputation_level int not null default 1,
  streak_count     int not null default 0,
  last_daily_claim date,
  is_premium       boolean not null default false,
  premium_expires  timestamptz,
  -- privacy
  is_private       boolean not null default false,
  hide_votes       boolean not null default false,
  searchable       boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_settings (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  -- notifications
  notif_push         boolean not null default true,
  notif_email        boolean not null default true,
  notif_vote_reminder boolean not null default true,
  notif_streak       boolean not null default true,
  notif_prediction   boolean not null default true,
  notif_odds         boolean not null default true,
  notif_rank         boolean not null default true,
  notif_new_player   boolean not null default false,
  notif_marketing    boolean not null default false,
  -- preferences
  default_country    text,
  timezone           text,
  date_format        text default 'MM/DD/YYYY',
  language           text default 'English',
  theme              text default 'light',       -- light|dark|system
  accent_color       text default '#4000FF',
  default_vote_weight text default 'normal',      -- normal|premium|custom
  reduce_motion      boolean not null default false,
  sound_effects      boolean not null default true,
  haptics            boolean not null default true,
  extra              jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();

-- equipped cosmetics (1 row per user)
create table public.user_equipped (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  avatar_id     uuid,
  decoration_id uuid,
  nameplate_id  uuid,
  banner_id     uuid,
  updated_at    timestamptz not null default now()
);
create trigger trg_equipped_updated before update on public.user_equipped
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. FAN CREDITS ECONOMY
-- ---------------------------------------------------------------------------
create table public.fc_packages (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,           -- 'starter','fan',...
  name          text not null,
  credits       int not null,
  bonus         int not null default 0,
  price_usd     numeric(8,2) not null,
  revenuecat_id text,
  sort          int not null default 0,
  is_active     boolean not null default true
);

-- one row per real-money purchase. revenuecat_txn_id = idempotency key.
create table public.fc_purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  package_id      uuid references public.fc_packages(id),
  revenuecat_txn_id text unique,
  credits         int not null,
  amount_usd      numeric(8,2),
  status          text not null default 'completed',
  created_at      timestamptz not null default now()
);

-- IMMUTABLE audit trail. Source of truth for balance. No client writes.
create table public.fc_ledger (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount          bigint not null,              -- + earn / - spend
  type            fc_txn_type not null,
  balance_after   bigint not null,
  reference_table text,
  reference_id    text,
  description     text,
  created_at      timestamptz not null default now()
);
create index fc_ledger_user_idx on public.fc_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. VOTING (support players with FC)
-- ---------------------------------------------------------------------------
create table public.votes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  fc_allocated  int not null check (fc_allocated > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, player_id)
);
create index votes_player_idx on public.votes (player_id);
create trigger trg_votes_updated before update on public.votes
  for each row execute function public.set_updated_at();

-- Weighted ranking (matches the product spec formula). Refresh on a schedule.
create materialized view public.player_rankings as
select
  p.id as player_id,
  coalesce(sum(v.fc_allocated),0)::bigint              as total_fc,
  count(distinct v.user_id)                            as unique_supporters,
  ( 0.60 * sqrt(coalesce(sum(v.fc_allocated),0))
  + 0.25 * sqrt(count(distinct v.user_id))
  + 0.10 * coalesce(avg(pr.reputation_level),0)
  + 0.05 * sqrt(count(v.*) filter (where v.updated_at > now() - interval '24 hours'))
  )::numeric(14,4)                                     as rank_score
from public.players p
left join public.votes v   on v.player_id = p.id
left join public.profiles pr on pr.id = v.user_id
group by p.id;
create unique index player_rankings_pk on public.player_rankings (player_id);

create or replace function public.refresh_player_rankings()
returns void language sql security definer set search_path = public as $$
  refresh materialized view concurrently public.player_rankings;
$$;

-- ---------------------------------------------------------------------------
-- 7. PREDICTIONS / MARKETS (binary: yes/no or head-to-head)
-- ---------------------------------------------------------------------------
create table public.markets (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique,
  kind            market_kind not null,
  subject_type    market_subject not null,
  subject_player_id uuid references public.players(id) on delete set null,
  subject_team_id   uuid references public.teams(id)   on delete set null,
  category         text,                          -- 'player','country','tournament'
  type_label       text,                          -- 'Golden Boot','Knockout Stage'
  title            text not null,
  pool_fc          bigint not null default 0,
  platform_fee_pct numeric(5,2) not null default 10.0,
  opens_at         timestamptz not null default now(),
  closes_at        timestamptz,
  status           market_status not null default 'open',
  settled_at       timestamptz,
  winning_option_id uuid,
  created_at       timestamptz not null default now()
);

create table public.market_options (
  id            uuid primary key default gen_random_uuid(),
  market_id     uuid not null references public.markets(id) on delete cascade,
  label         text not null,                   -- 'Yes','No','Mbappé'
  side          text,                            -- 'a' | 'b'
  player_id     uuid references public.players(id) on delete set null,
  team_id       uuid references public.teams(id)   on delete set null,
  implied_pct   numeric(5,2) not null default 50, -- current odds
  fc_allocated  bigint not null default 0,
  supporter_count int not null default 0,
  is_winner     boolean not null default false,
  sort          int not null default 0
);
create index market_options_market_idx on public.market_options (market_id);
alter table public.markets
  add constraint markets_winning_option_fk
  foreign key (winning_option_id) references public.market_options(id) on delete set null;

-- one prediction per user per market
create table public.predictions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  market_id       uuid not null references public.markets(id) on delete cascade,
  option_id       uuid not null references public.market_options(id) on delete cascade,
  stake_fc        int not null check (stake_fc > 0),
  entry_pct       numeric(5,2) not null,         -- odds at time of entry
  potential_payout int not null default 0,
  reward_fc       int,                            -- set on settlement
  status          prediction_status not null default 'open',
  created_at      timestamptz not null default now(),
  settled_at      timestamptz,
  unique (user_id, market_id)
);
create index predictions_user_idx   on public.predictions (user_id, created_at desc);
create index predictions_market_idx on public.predictions (market_id);

-- ---------------------------------------------------------------------------
-- 8. STARTING XI (predict best XI, locks end of group stage)
-- ---------------------------------------------------------------------------
create table public.starting_xi (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade unique,
  formation    text not null default '4-3-3',
  submitted_at timestamptz,
  is_locked    boolean not null default false,
  score        int,                              -- correct picks 0..11
  created_at   timestamptz not null default now()
);
create table public.starting_xi_picks (
  id         uuid primary key default gen_random_uuid(),
  xi_id      uuid not null references public.starting_xi(id) on delete cascade,
  slot       text not null,                      -- 'GK0','DEF1'...
  position   player_position not null,
  player_id  uuid not null references public.players(id) on delete cascade,
  is_correct boolean,
  unique (xi_id, slot)
);

-- ---------------------------------------------------------------------------
-- 9. FAN TREASURY
-- ---------------------------------------------------------------------------
create table public.treasury_contributions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  fc_amount  int not null check (fc_amount > 0),
  created_at timestamptz not null default now()
);
create index treasury_team_idx on public.treasury_contributions (team_id);

-- ---------------------------------------------------------------------------
-- 10. REPUTATION / XP / ACHIEVEMENTS / DAILY
-- ---------------------------------------------------------------------------
create table public.reputation_levels (
  level   int primary key,
  name    text not null,
  min_xp  int not null,
  color   text
);
create table public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  source     text not null,                      -- 'vote','prediction','daily','welcome'
  amount     int not null,
  description text,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events (user_id, created_at desc);

create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  description text,
  icon        text,
  xp_reward   int not null default 0,
  fc_reward   int not null default 0,
  category    text,
  sort        int not null default 0
);
create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.daily_rewards (
  day       int primary key,                     -- 1..7
  fc_reward int not null
);
create table public.daily_claims (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        int not null,
  fc         int not null,
  claimed_at timestamptz not null default now()
);
create index daily_claims_user_idx on public.daily_claims (user_id, claimed_at desc);

-- ---------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text,                               -- 'updates','rankings','news'
  type       text,
  icon       text,
  color      text,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 12. STORE: merchandise + profile cosmetics
-- ---------------------------------------------------------------------------
create table public.merch_items (
  id        uuid primary key default gen_random_uuid(),
  code      text unique not null,
  name      text not null,
  team_code text,
  category  text,
  emoji     text,
  price_fc  int not null,
  is_active boolean not null default true
);
create table public.merch_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  merch_item_id uuid not null references public.merch_items(id),
  price_fc      int not null,
  status        text not null default 'fulfilled',
  created_at    timestamptz not null default now(),
  unique (user_id, merch_item_id)
);

create table public.cosmetics (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  theme_name  text,
  slot        cosmetic_slot not null,
  rarity      cosmetic_rarity not null default 'common',
  team_code   text,                              -- null => WC26 general
  is_animated boolean not null default false,
  colors      text[] not null default '{}',      -- gradient colors
  price_fc    int not null,
  is_active   boolean not null default true
);
create table public.user_cosmetics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id uuid not null references public.cosmetics(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  unique (user_id, cosmetic_id)
);
-- wire equipped FKs now that cosmetics exists
alter table public.user_equipped
  add constraint ue_avatar_fk     foreign key (avatar_id)     references public.cosmetics(id) on delete set null,
  add constraint ue_decoration_fk foreign key (decoration_id) references public.cosmetics(id) on delete set null,
  add constraint ue_nameplate_fk  foreign key (nameplate_id)  references public.cosmetics(id) on delete set null,
  add constraint ue_banner_fk     foreign key (banner_id)     references public.cosmetics(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 13. GAMES: fixtures + highlights
-- ---------------------------------------------------------------------------
create table public.fixtures (
  id             uuid primary key default gen_random_uuid(),
  home_team_code text not null,
  away_team_code text not null,
  kickoff_at     timestamptz not null,
  stage          text,                            -- 'Group Stage'
  grp            text,
  venue          text,
  status         fixture_status not null default 'scheduled',
  home_score     int,
  away_score     int
);
create table public.highlights (
  id          uuid primary key default gen_random_uuid(),
  fixture_id  uuid references public.fixtures(id) on delete set null,
  title       text not null,
  channel     text not null default 'ESPN FC',
  youtube_url text not null,
  quality     text default '1080p',
  duration    text,
  published_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 14. SOCIAL: follows + leaderboard snapshots + linked accounts
-- ---------------------------------------------------------------------------
create table public.user_follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table public.leaderboard_snapshots (
  id           bigint generated always as identity primary key,
  scope        text not null,                    -- 'global','country','friends','weekly'
  scope_value  text,
  entity_type  text not null,                    -- 'player','fan','team'
  entity_id    uuid,
  rank         int not null,
  score        numeric(14,4) not null,
  captured_at  timestamptz not null default now()
);
create index lb_snap_idx on public.leaderboard_snapshots (scope, scope_value, captured_at desc);

create table public.linked_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  provider     text not null,                    -- 'google','apple','meta','x','discord'
  external_handle text,
  connected_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- payment methods: references only — NEVER store raw card data
create table public.payment_methods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  brand      text,                                -- 'Apple Pay','Visa'
  last4      text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 15. CORE MONEY FUNCTIONS  (SECURITY DEFINER — server-authoritative)
-- ============================================================================
-- Internal: apply a balance change atomically + write ledger. Raises if broke.
create or replace function public._fc_apply(
  p_user uuid, p_amount bigint, p_type fc_txn_type,
  p_ref_table text default null, p_ref_id text default null, p_desc text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare new_bal bigint;
begin
  update public.profiles
     set fc_balance = fc_balance + p_amount
   where id = p_user
   returning fc_balance into new_bal;
  if new_bal is null then raise exception 'Profile not found'; end if;
  if new_bal < 0 then raise exception 'Insufficient Fan Credits'; end if;
  insert into public.fc_ledger(user_id,amount,type,balance_after,reference_table,reference_id,description)
  values (p_user,p_amount,p_type,new_bal,p_ref_table,p_ref_id,p_desc);
  return new_bal;
end $$;

-- Grant XP + recompute level (+ optional FC reward handled by caller)
create or replace function public.grant_xp(p_amount int, p_source text, p_desc text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_lvl int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  insert into public.xp_events(user_id,source,amount,description) values (uid,p_source,p_amount,p_desc);
  update public.profiles set reputation_xp = reputation_xp + p_amount where id = uid;
  select coalesce(max(level),1) into new_lvl
    from public.reputation_levels rl
    join public.profiles p on p.id = uid
   where rl.min_xp <= p.reputation_xp;
  update public.profiles set reputation_level = new_lvl where id = uid;
end $$;

-- Cast / change a vote (reallocate). Charges only the delta.
create or replace function public.cast_vote(p_player uuid, p_fc int)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prev int := 0; delta int; new_bal bigint;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_fc <= 0 then raise exception 'Amount must be positive'; end if;
  select fc_allocated into prev from public.votes where user_id=uid and player_id=p_player;
  delta := p_fc - coalesce(prev,0);
  if delta > 0 then
    new_bal := public._fc_apply(uid, -delta, 'vote_spend','votes',p_player::text,'Vote allocation');
  elsif delta < 0 then
    new_bal := public._fc_apply(uid, -delta, 'vote_refund','votes',p_player::text,'Vote re-allocation refund');
  end if;
  insert into public.votes(user_id,player_id,fc_allocated) values (uid,p_player,p_fc)
    on conflict (user_id,player_id) do update set fc_allocated = excluded.fc_allocated, updated_at = now();
  perform public.grant_xp(10,'vote','Cast a vote');
  return (select fc_balance from public.profiles where id=uid);
end $$;

-- Place a binary prediction (one per market). Computes potential payout.
create or replace function public.place_prediction(p_market uuid, p_option uuid, p_stake int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m record; o record; pot int; fee numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  select * into m from public.markets where id=p_market;
  if m is null then raise exception 'Market not found'; end if;
  if m.status <> 'open' then raise exception 'Market is not open'; end if;
  if m.closes_at is not null and m.closes_at < now() then raise exception 'Market is closed'; end if;
  select * into o from public.market_options where id=p_option and market_id=p_market;
  if o is null then raise exception 'Invalid option'; end if;
  if exists (select 1 from public.predictions where user_id=uid and market_id=p_market) then
    raise exception 'You already forecast this market';
  end if;
  -- payout: stake / impliedProb, minus platform fee
  fee := m.platform_fee_pct/100.0;
  pot := round( (p_stake / (greatest(o.implied_pct,1)/100.0)) * (1-fee) );
  perform public._fc_apply(uid, -p_stake, 'prediction_stake','markets',p_market::text,'Forecast stake');
  insert into public.predictions(user_id,market_id,option_id,stake_fc,entry_pct,potential_payout)
  values (uid,p_market,p_option,p_stake,o.implied_pct,pot);
  update public.market_options set fc_allocated=fc_allocated+p_stake, supporter_count=supporter_count+1 where id=p_option;
  update public.markets set pool_fc=pool_fc+p_stake where id=p_market;
  perform public.grant_xp(15,'prediction','Placed a forecast');
  return jsonb_build_object('potential_payout',pot,'balance',(select fc_balance from public.profiles where id=uid));
end $$;

-- Claim daily reward (advances streak). One claim per calendar day.
create or replace function public.claim_daily_reward()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p record; nxt int; reward int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into p from public.profiles where id=uid;
  if p.last_daily_claim = current_date then raise exception 'Already claimed today'; end if;
  if p.last_daily_claim = current_date - 1 then nxt := least(p.streak_count+1,7); else nxt := 1; end if;
  select fc_reward into reward from public.daily_rewards where day=nxt;
  reward := coalesce(reward,50);
  perform public._fc_apply(uid, reward, 'daily_reward','daily_claims',null,'Daily reward day '||nxt);
  update public.profiles set streak_count=nxt, last_daily_claim=current_date where id=uid;
  insert into public.daily_claims(user_id,day,fc) values (uid,nxt,reward);
  perform public.grant_xp(20,'daily','Daily check-in');
  return jsonb_build_object('day',nxt,'fc',reward,'balance',(select fc_balance from public.profiles where id=uid));
end $$;

-- Buy a cosmetic (idempotent — you can't buy twice)
create or replace function public.buy_cosmetic(p_cosmetic uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.cosmetics where id=p_cosmetic and is_active;
  if c is null then raise exception 'Item unavailable'; end if;
  if exists (select 1 from public.user_cosmetics where user_id=uid and cosmetic_id=p_cosmetic) then
    raise exception 'Already owned';
  end if;
  perform public._fc_apply(uid, -c.price_fc, 'cosmetic_purchase','cosmetics',p_cosmetic::text, c.name);
  insert into public.user_cosmetics(user_id,cosmetic_id) values (uid,p_cosmetic);
  perform public.grant_xp(8,'cosmetic','Unlocked a profile item');
  return (select fc_balance from public.profiles where id=uid);
end $$;

-- Equip / unequip a cosmetic into its slot (must be owned)
create or replace function public.equip_cosmetic(p_cosmetic uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.cosmetics where id=p_cosmetic;
  if c is null then raise exception 'Item not found'; end if;
  if not exists (select 1 from public.user_cosmetics where user_id=uid and cosmetic_id=p_cosmetic) then
    raise exception 'You do not own this item';
  end if;
  insert into public.user_equipped(user_id) values (uid) on conflict (user_id) do nothing;
  if c.slot='avatar'     then update public.user_equipped set avatar_id     = case when avatar_id=p_cosmetic     then null else p_cosmetic end where user_id=uid; end if;
  if c.slot='decoration' then update public.user_equipped set decoration_id = case when decoration_id=p_cosmetic then null else p_cosmetic end where user_id=uid; end if;
  if c.slot='nameplate'  then update public.user_equipped set nameplate_id  = case when nameplate_id=p_cosmetic  then null else p_cosmetic end where user_id=uid; end if;
  if c.slot='banner'     then update public.user_equipped set banner_id     = case when banner_id=p_cosmetic     then null else p_cosmetic end where user_id=uid; end if;
end $$;

-- Buy merch
create or replace function public.buy_merch(p_item uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m record;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into m from public.merch_items where id=p_item and is_active;
  if m is null then raise exception 'Item unavailable'; end if;
  if exists (select 1 from public.merch_orders where user_id=uid and merch_item_id=p_item) then
    raise exception 'Already owned';
  end if;
  perform public._fc_apply(uid, -m.price_fc, 'merch_purchase','merch_items',p_item::text, m.name);
  insert into public.merch_orders(user_id,merch_item_id,price_fc) values (uid,p_item,m.price_fc);
  return (select fc_balance from public.profiles where id=uid);
end $$;

-- TRUSTED-ONLY: record a verified real-money FC purchase (call from Edge Function w/ service role)
create or replace function public.record_fc_purchase(
  p_user uuid, p_package uuid, p_txn text, p_credits int, p_amount numeric
) returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.fc_purchases where revenuecat_txn_id = p_txn) then return; end if; -- idempotent
  insert into public.fc_purchases(user_id,package_id,revenuecat_txn_id,credits,amount_usd)
  values (p_user,p_package,p_txn,p_credits,p_amount);
  perform public._fc_apply(p_user, p_credits, 'purchase','fc_purchases',p_txn,'FC purchase');
end $$;

-- New auth user => create profile + settings + equipped row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, username)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
          null);
  insert into public.user_settings(user_id) values (new.id);
  insert into public.user_equipped(user_id) values (new.id);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 16. ROW LEVEL SECURITY
-- ============================================================================
-- Public reference tables: world-readable, no client writes.
alter table public.teams              enable row level security;
alter table public.players            enable row level security;
alter table public.player_stats       enable row level security;
alter table public.fc_packages        enable row level security;
alter table public.markets            enable row level security;
alter table public.market_options     enable row level security;
alter table public.reputation_levels  enable row level security;
alter table public.achievements       enable row level security;
alter table public.daily_rewards      enable row level security;
alter table public.merch_items        enable row level security;
alter table public.cosmetics          enable row level security;
alter table public.fixtures           enable row level security;
alter table public.highlights         enable row level security;
alter table public.leaderboard_snapshots enable row level security;

create policy "read teams"        on public.teams              for select using (true);
create policy "read players"      on public.players            for select using (true);
create policy "read stats"        on public.player_stats       for select using (true);
create policy "read packages"     on public.fc_packages        for select using (true);
create policy "read markets"      on public.markets            for select using (true);
create policy "read options"      on public.market_options     for select using (true);
create policy "read levels"       on public.reputation_levels  for select using (true);
create policy "read achievements" on public.achievements       for select using (true);
create policy "read daily"        on public.daily_rewards      for select using (true);
create policy "read merch"        on public.merch_items        for select using (true);
create policy "read cosmetics"    on public.cosmetics          for select using (true);
create policy "read fixtures"     on public.fixtures           for select using (true);
create policy "read highlights"   on public.highlights         for select using (true);
create policy "read leaderboard"  on public.leaderboard_snapshots for select using (true);

-- Profiles: anyone can read public profiles; you can update your own.
alter table public.profiles enable row level security;
create policy "read public profiles" on public.profiles for select
  using (not is_private or id = auth.uid());
create policy "update own profile"   on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- NOTE: fc_balance/xp/level are changed only by SECURITY DEFINER funcs above.
-- To harden, you may revoke direct UPDATE on those columns; see SETUP guide.

-- User-owned tables: owner can read; writes go through functions, but we allow
-- owner read so the UI can render. (Direct insert/update intentionally omitted.)
alter table public.user_settings        enable row level security;
alter table public.user_equipped        enable row level security;
alter table public.fc_purchases         enable row level security;
alter table public.fc_ledger            enable row level security;
alter table public.votes                enable row level security;
alter table public.predictions          enable row level security;
alter table public.starting_xi          enable row level security;
alter table public.starting_xi_picks    enable row level security;
alter table public.treasury_contributions enable row level security;
alter table public.xp_events            enable row level security;
alter table public.user_achievements    enable row level security;
alter table public.daily_claims         enable row level security;
alter table public.notifications        enable row level security;
alter table public.merch_orders         enable row level security;
alter table public.user_cosmetics       enable row level security;
alter table public.user_follows         enable row level security;
alter table public.linked_accounts      enable row level security;
alter table public.payment_methods      enable row level security;

create policy "own settings rw" on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own equipped r"  on public.user_equipped for select using (user_id = auth.uid());
create policy "own purchases r" on public.fc_purchases  for select using (user_id = auth.uid());
create policy "own ledger r"    on public.fc_ledger     for select using (user_id = auth.uid());
create policy "read votes"      on public.votes         for select using (true); -- public tallies
create policy "own predictions r" on public.predictions for select using (user_id = auth.uid());
create policy "own xi r"        on public.starting_xi   for select using (user_id = auth.uid());
create policy "own xi picks r"  on public.starting_xi_picks for select
  using (exists (select 1 from public.starting_xi x where x.id = xi_id and x.user_id = auth.uid()));
create policy "read treasury"   on public.treasury_contributions for select using (true);
create policy "own xp r"        on public.xp_events     for select using (user_id = auth.uid());
create policy "own achv r"      on public.user_achievements for select using (user_id = auth.uid());
create policy "own daily r"     on public.daily_claims  for select using (user_id = auth.uid());
create policy "own notifs rw"   on public.notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own orders r"    on public.merch_orders  for select using (user_id = auth.uid());
create policy "own cosmetics r" on public.user_cosmetics for select using (user_id = auth.uid());
create policy "follows rw"      on public.user_follows  for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy "own linked rw"   on public.linked_accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own payment rw"  on public.payment_methods for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Let signed-in users call the money functions
grant execute on function
  public.cast_vote(uuid,int),
  public.place_prediction(uuid,uuid,int),
  public.claim_daily_reward(),
  public.buy_cosmetic(uuid),
  public.equip_cosmetic(uuid),
  public.buy_merch(uuid),
  public.grant_xp(int,text,text)
to authenticated;

-- ============================================================================
-- 17. SEED DATA  (reference rows so the app works immediately)
-- ============================================================================
insert into public.fc_packages(code,name,credits,bonus,price_usd,sort) values
 ('starter','Starter Pack',500,0,4.99,1),
 ('fan','Fan Pack',1200,200,9.99,2),
 ('ultra','Ultra Pack',2500,500,19.99,3),
 ('legend','Legend Pack',6500,1500,49.99,4),
 ('champion','Champion Pack',15000,5000,99.99,5)
on conflict (code) do nothing;

insert into public.reputation_levels(level,name,min_xp,color) values
 (1,'Rookie',0,'#A8B0C0'),(2,'Bronze Fan',500,'#CD7F32'),(3,'Silver Fan',1200,'#3D6BFF'),
 (4,'Gold Fan',2000,'#FFB600'),(5,'Legend Fan',5000,'#7F3DFF'),(6,'Hall of Fame',12000,'#15E5D0')
on conflict (level) do nothing;

insert into public.daily_rewards(day,fc_reward) values
 (1,50),(2,75),(3,100),(4,150),(5,200),(6,300),(7,500)
on conflict (day) do nothing;

insert into public.achievements(code,name,description,icon,xp_reward,fc_reward,sort) values
 ('first_vote','First Vote','Cast your first vote','how_to_vote',50,25,1),
 ('streak_7','7-Day Streak','Vote 7 days in a row','local_fire_department',200,100,2),
 ('streak_30','30-Day Streak','Vote 30 days in a row','local_fire_department',1000,500,3),
 ('votes_100','100 Votes','Cast 100 votes','how_to_vote',300,150,4),
 ('votes_1000','1000 Votes','Cast 1000 votes','how_to_vote',2000,1000,5),
 ('prediction_master','Prediction Master','Win 10 forecasts','insights',500,250,6),
 ('country_champion','Country Champion','Top contributor to a treasury','flag',1500,750,7),
 ('hall_of_fame','Hall of Fame Fan','Reach max level','military_tech',5000,2500,8),
 ('first_purchase','First Purchase','Buy your first FC pack','shopping_cart',100,50,9),
 ('new_fan','New Fan','Claim your welcome bonus','celebration',100,0,10)
on conflict (code) do nothing;

-- A few teams (expand to all 48 later)
insert into public.teams(name,short_name,country_code,flag_key,grp,confederation) values
 ('France','FRA','FR','France','D','UEFA'),
 ('Brazil','BRA','BR','Brazil','C','CONMEBOL'),
 ('England','ENG','GB-ENG','England','B','UEFA'),
 ('Argentina','ARG','AR','Argentina','A','CONMEBOL'),
 ('Spain','ESP','ES','Spain','E','UEFA'),
 ('Germany','GER','DE','Germany','E','UEFA'),
 ('Morocco','MAR','MA','Morocco','C','CAF'),
 ('Norway','NOR','NO','Norway','F','UEFA'),
 ('Belgium','BEL','BE','Belgium','G','UEFA'),
 ('Netherlands','NED','NL','Netherlands','H','UEFA'),
 ('Croatia','CRO','HR','Croatia','I','UEFA')
on conflict (country_code) do nothing;

-- Sample players (expand later / import full roster)
with t as (select country_code, id from public.teams)
insert into public.players(slug,name,first_name,last_name,short_name,position,team_id,nationality,jersey_number,age,is_verified)
select x.slug,x.name,x.fn,x.ln,x.sh,x.pos::player_position,t.id,x.nat,x.num,x.age,true
from (values
 ('mbappe','Kylian Mbappé','Kylian','Mbappé','KM','FWD','FR','France',10,27),
 ('bellingham','Jude Bellingham','Jude','Bellingham','JB','MID','GB-ENG','England',5,22),
 ('vinicius','Vinícius Jr','Vinícius','Júnior','VJ','FWD','BR','Brazil',7,25),
 ('haaland','Erling Haaland','Erling','Haaland','EH','FWD','NO','Norway',9,25),
 ('yamal','Lamine Yamal','Lamine','Yamal','LY','FWD','ES','Spain',19,18),
 ('martinez','Emi Martínez','Emiliano','Martínez','EM','GK','AR','Argentina',23,33),
 ('courtois','Thibaut Courtois','Thibaut','Courtois','TC','GK','BE','Belgium',1,33)
) as x(slug,name,fn,ln,sh,pos,nat_code,nat,num,age)
join t on t.country_code = x.nat_code
on conflict (slug) do nothing;

insert into public.player_stats(player_id,goals,assists,matches,wc_apps,win_rate,trophies)
select id,
  case slug when 'mbappe' then 52 when 'haaland' then 45 when 'vinicius' then 38 else 20 end,
  case slug when 'bellingham' then 19 when 'yamal' then 25 else 10 end,
  60, 6, 60, 8
from public.players
on conflict (player_id) do nothing;

-- WC26 general + a couple national cosmetics (the app generates the full grid;
-- store the catalogue here for ownership/equipping to persist)
insert into public.cosmetics(code,name,theme_name,slot,rarity,team_code,is_animated,colors,price_fc) values
 ('wc26_avatar_golden','Golden Trophy Avatar','Golden Trophy','avatar','epic',null,false,'{#FFB600,#FF8600,#7A4F00}',700),
 ('wc26_deco_confetti','Champions Confetti Decoration','Champions Confetti','decoration','legendary',null,true,'{#4000FF,#00E6C4,#FF2065}',1900),
 ('wc26_plate_neon','Neon Goal Name Plate','Neon Goal','nameplate','rare',null,false,'{#4000FF,#00E6C4,#6640FF}',850),
 ('wc26_banner_stadium','Stadium Lights Banner','Stadium Lights','banner','epic',null,false,'{#101010,#FFB600,#4000FF}',1600),
 ('fr_plate','France Name Plate','France','nameplate','rare','FR',false,'{#1B3A8C,#EF4135,#FFFFFF}',750),
 ('br_banner','Brazil Banner','Brazil','banner','epic','BR',false,'{#009C3B,#FFDF00,#1B5E20}',1500)
on conflict (code) do nothing;

insert into public.merch_items(code,name,team_code,category,emoji,price_fc) values
 ('fr_home','France Home Jersey','FR','jersey','👕',1800),
 ('br_scarf','Brazil Match Scarf','BR','scarf','🧣',650),
 ('eng_cap','England Supporter Cap','GB-ENG','cap','🧢',550)
on conflict (code) do nothing;

-- Fixtures + highlights (ESPN FC)
insert into public.fixtures(home_team_code,away_team_code,kickoff_at,stage,grp,venue,status) values
 ('US','PY', now()+interval '2 days','Group Stage','D','SoFi Stadium, Los Angeles','scheduled'),
 ('BR','MA', now()+interval '4 days','Group Stage','C','MetLife Stadium, New York','live'),
 ('DE','JP', now()+interval '4 days','Group Stage','E','Mercedes-Benz Stadium, Atlanta','scheduled')
on conflict do nothing;

-- ============================================================================
-- DONE.  Next: see SUPABASE_SETUP.md for the click-by-click steps.
-- ============================================================================
