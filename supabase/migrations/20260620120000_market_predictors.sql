-- Recent predictors per market option — powers the social-proof avatar stack on the
-- prediction cards. The predictions table is RLS-locked to its owner, so this runs as
-- SECURITY DEFINER to read across users, but it deliberately exposes ONLY display_name +
-- avatar_url, skips anyone who opted out via profiles.is_private, and caps the result at
-- the 3 most-recent predictors per option. The total count still comes from
-- market_options.supporter_count, so "+N" beyond the shown avatars stays accurate.

create or replace function public.market_predictors()
returns table(option_id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select option_id, display_name, avatar_url
  from (
    select p.option_id,
           pr.display_name,
           pr.avatar_url,
           row_number() over (partition by p.option_id order by p.created_at desc) as rn
    from public.predictions p
    join public.profiles pr on pr.id = p.user_id
    where coalesce(pr.is_private, false) = false
  ) t
  where rn <= 3;
$$;

grant execute on function public.market_predictors() to anon, authenticated;
