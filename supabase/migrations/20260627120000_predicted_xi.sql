-- ===========================================================================
-- Predict the XI — each user submits ONE predicted starting XI (11 picks).
-- Submit-once: primary key = user_id (one row), and only SELECT + INSERT are
-- granted (no UPDATE/DELETE), so a submitted XI can't be changed.
-- `picks` is a JSON map of slot -> player slug, e.g. {"FWD0":"l-messi-154", ...}
-- ===========================================================================
create table if not exists public.predicted_xi (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  picks        jsonb not null,
  submitted_at timestamptz not null default now()
);

alter table public.predicted_xi enable row level security;

drop policy if exists "read own predicted_xi"   on public.predicted_xi;
drop policy if exists "insert own predicted_xi" on public.predicted_xi;
create policy "read own predicted_xi"   on public.predicted_xi for select using (auth.uid() = user_id);
create policy "insert own predicted_xi" on public.predicted_xi for insert with check (auth.uid() = user_id);

grant select, insert on public.predicted_xi to authenticated;
