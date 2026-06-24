-- ===========================================================================
-- Analytics: capture date-of-birth at signup + a system-wide aggregation RPC
-- that powers the Analytics page (vote trend, country support, age distribution).
-- ===========================================================================

-- 1) Date of birth (collected on the signup form).
alter table public.profiles add column if not exists date_of_birth date;

-- 2) Let a signed-in user write their OWN date_of_birth. The column-lockdown
--    migration revoked UPDATE on profiles and re-granted only presentational
--    columns; re-issue that grant WITH date_of_birth so it can be saved.
grant update (
  username, display_name, avatar_url, bio,
  country_code, favorite_team_id, favorite_club,
  is_private, hide_votes, searchable, date_of_birth, updated_at
) on public.profiles to authenticated;

-- 3) System-wide analytics. SECURITY DEFINER so it can aggregate across ALL
--    votes/profiles without exposing individual rows — only counts come back.
create or replace function public.get_analytics()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    -- cumulative total votes as of each of the last 7 days (a growing trend line)
    'trend', coalesce((
      select json_agg(t order by t.day) from (
        select d.day::date as day,
               (select count(*) from public.pass_vote pv where pv.created_at::date <= d.day) as count
        from generate_series(current_date - 6, current_date, interval '1 day') as d(day)
      ) t
    ), '[]'::json),
    -- votes grouped by the voter's country (live country read from the profile,
    -- falling back to the denormalised code stored on the vote row)
    'country', coalesce((
      select json_agg(c) from (
        select coalesce(p.country_code, pv.country_code) as code, count(*) as count
        from public.pass_vote pv
        left join public.profiles p on p.id = pv.user_id
        where coalesce(p.country_code, pv.country_code) is not null
        group by 1
      ) c
    ), '[]'::json),
    -- age distribution of FANS WHO HAVE VOTED, bucketed from date_of_birth
    'age', coalesce((
      select json_agg(a order by a.ord) from (
        select bucket, ord, count(*) as count from (
          select
            case when yrs < 20 then '<20'  when yrs < 25 then '20-24'
                 when yrs < 30 then '25-29' when yrs < 35 then '30-34'
                 else '35+' end as bucket,
            case when yrs < 20 then 0 when yrs < 25 then 1
                 when yrs < 30 then 2 when yrs < 35 then 3 else 4 end as ord
          from (
            -- one row per voter who supplied a birth date
            select extract(year from age(p.date_of_birth))::int as yrs
            from public.profiles p
            join public.pass_vote pv on pv.user_id = p.id
            where p.date_of_birth is not null
          ) ages
        ) b group by bucket, ord
      ) a
    ), '[]'::json)
  );
$$;

grant execute on function public.get_analytics() to anon, authenticated;
