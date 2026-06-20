-- _fc_apply previously did `update ... set fc_balance = fc_balance + p_amount` and only
-- checked `new_bal < 0` AFTER the update. But the profiles_fc_balance_check (fc_balance >= 0)
-- constraint fires DURING the update, so an over-spend surfaced as the raw Postgres error
-- "new row for relation \"profiles\" violates check constraint \"profiles_fc_balance_check\""
-- instead of a friendly message. This re-checks the balance BEFORE the update (row-locked),
-- so every caller (forecasts, votes, cosmetics, merch…) gets a clean "Insufficient Fan Credits".

create or replace function public._fc_apply(
  p_user uuid, p_amount bigint, p_type fc_txn_type,
  p_ref_table text default null, p_ref_id text default null, p_desc text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare cur bigint; new_bal bigint;
begin
  select fc_balance into cur from public.profiles where id = p_user for update;
  if cur is null then raise exception 'Profile not found'; end if;
  if cur + p_amount < 0 then
    raise exception 'Insufficient Fan Credits' using errcode = 'P0001';
  end if;
  update public.profiles
     set fc_balance = cur + p_amount
   where id = p_user
   returning fc_balance into new_bal;
  insert into public.fc_ledger(user_id,amount,type,balance_after,reference_table,reference_id,description)
  values (p_user,p_amount,p_type,new_bal,p_ref_table,p_ref_id,p_desc);
  return new_bal;
end $$;
