-- ===========================================================================
-- SECURITY FIX: lock down direct client writes to public.profiles.
--
-- The RLS "update own profile" policy is row-level only, so a logged-in user
-- could UPDATE *any* column on their own row — including fc_balance (mint
-- unlimited credits), reputation_xp/level, and the reward guards
-- (welcome_bonus_claimed_at, streak_count, last_daily_claim → re-claim rewards).
--
-- Postgres column-level GRANTs restrict this without touching RLS. The
-- SECURITY DEFINER functions (_fc_apply, claim_daily_reward, claim_welcome_bonus,
-- grant_xp, cast_vote, buy_*, record_fc_purchase) run as the table owner and
-- BYPASS these grants, so the legitimate server-managed paths keep working.
-- ===========================================================================

revoke update on public.profiles from authenticated, anon;

-- Clients may only edit presentational + privacy fields. Everything else
-- (fc_balance, reputation_xp, reputation_level, streak_count, last_daily_claim,
--  welcome_bonus_claimed_at, is_premium, premium_expires, id, created_at) is
-- server-managed only.
grant update (
  username, display_name, avatar_url, bio,
  country_code, favorite_team_id, favorite_club,
  is_private, hide_votes, searchable, updated_at
) on public.profiles to authenticated;
