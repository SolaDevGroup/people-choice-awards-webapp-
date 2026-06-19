-- ════════════════════════════════════════════════════════════════════════
-- FC coin-pack purchases via Stripe.
-- The Stripe webhook (service role) calls credit_fc_purchase() when a pack
-- Checkout completes. Idempotent on the Checkout session id, so a duplicate
-- webhook delivery never double-credits. Crediting goes through _fc_apply so
-- it lands in fc_ledger and keeps profiles.fc_balance (the cache) correct.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.fc_purchase (
  session_id  text primary key,                                   -- Stripe Checkout session id
  user_id     uuid not null references public.profiles(id) on delete cascade,
  pack        text,
  fc_amount   int  not null,
  created_at  timestamptz not null default now()
);

alter table public.fc_purchase enable row level security;
drop policy if exists "read own fc purchases" on public.fc_purchase;
create policy "read own fc purchases"
  on public.fc_purchase for select using (auth.uid() = user_id);

create or replace function public.credit_fc_purchase(p_session text, p_user uuid, p_fc int, p_pack text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_fc is null or p_fc <= 0 then return; end if;
  insert into public.fc_purchase(session_id, user_id, pack, fc_amount)
    values (p_session, p_user, p_pack, p_fc)
    on conflict (session_id) do nothing;
  if not found then return; end if;        -- session already processed → don't credit twice
  perform public._fc_apply(p_user, p_fc::bigint, 'purchase'::fc_txn_type,
                           'fc_purchase', p_session, coalesce(p_pack, 'FC') || ' purchase');
end $$;

-- Only the service role (the webhook) may credit FC. Lock everyone else out.
revoke execute on function public.credit_fc_purchase(text, uuid, int, text) from public, anon, authenticated;
grant  execute on function public.credit_fc_purchase(text, uuid, int, text) to service_role;
