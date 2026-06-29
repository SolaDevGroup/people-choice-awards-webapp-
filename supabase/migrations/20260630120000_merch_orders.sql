-- ===========================================================================
-- Jersey orders (Fan Store checkout). NOTE: a different, older `merch_orders`
-- table already exists (initial schema, for cosmetic redemptions), so this uses
-- its OWN table `store_orders` to avoid colliding with it.
--
-- place_merch_order deducts the FC (server-authoritative, recorded in fc_ledger as
-- 'merch_purchase' so it shows in transaction history) and stores the full order
-- (product + chosen add-ons + shipping address) so it can be fulfilled / emailed.
-- ===========================================================================
create table if not exists public.store_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  product_id   text,                 -- store product id (e.g. 616956)
  product_name text,                 -- e.g. "Mexico 2026 Home Jersey"
  fc_total     int  not null,        -- credits charged (item + add-ons + shipping + service)
  details      jsonb not null,       -- size, add-ons, contact + full shipping address
  status       text not null default 'placed',
  created_at   timestamptz not null default now()
);
create index if not exists store_orders_user_idx on public.store_orders (user_id, created_at desc);

alter table public.store_orders enable row level security;
drop policy if exists "read own store orders" on public.store_orders;
create policy "read own store orders" on public.store_orders for select using (user_id = auth.uid());

-- Place an order: insert it + deduct the credits atomically. _fc_apply guards the
-- balance (raises 'Insufficient Fan Credits') and writes the ledger row, so a failed
-- deduction rolls back the order too. Returns the order id + the new balance.
create or replace function public.place_merch_order(p_order jsonb, p_fc int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); oid uuid; bal bigint;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_fc is null or p_fc <= 0 then raise exception 'Invalid amount'; end if;
  insert into public.store_orders(user_id, product_id, product_name, fc_total, details)
    values (uid, p_order->>'product_id', p_order->>'product_name', p_fc, p_order)
    returning id into oid;
  bal := public._fc_apply(uid, (-p_fc)::bigint, 'merch_purchase'::fc_txn_type,
                          'store_orders', oid::text, coalesce(p_order->>'product_name','Jersey') || ' order');
  return jsonb_build_object('order_id', oid, 'balance', bal);
end $$;

revoke execute on function public.place_merch_order(jsonb, int) from public, anon;
grant  execute on function public.place_merch_order(jsonb, int) to authenticated;
