-- ════════════════════════════════════════════════════════════════════════
-- Supporter Pass entitlement (Stripe-backed)
-- One row per user once they buy the pass. Written ONLY by the stripe-webhook
-- Edge Function (service-role); users may read their own row.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.supporter_pass (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  active             boolean      not null default true,
  stripe_session_id  text,
  stripe_customer_id text,
  granted_at         timestamptz  not null default now()
);

alter table public.supporter_pass enable row level security;

-- A user can see whether they hold the pass; nobody can write from the client
-- (the webhook uses the service-role key, which bypasses RLS).
drop policy if exists "read own supporter pass" on public.supporter_pass;
create policy "read own supporter pass"
  on public.supporter_pass for select
  using (auth.uid() = user_id);

-- Convenience: does the current user hold an active pass?
create or replace function public.has_supporter_pass()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.supporter_pass
    where user_id = auth.uid() and active = true
  );
$$;
