# Supabase — schema & migrations

This folder is the **source of truth for the database**. Every change to the
Supabase project (tables, columns, functions, RLS, seed data) lives here as a
versioned `.sql` file, so the schema is reviewable, repeatable, and never a
one-off click in the dashboard that nobody can reproduce.

Project ref: `laypjrtpnvpubzqwnvnt` · URL: https://laypjrtpnvpubzqwnvnt.supabase.co

## How we work (the loop)

1. **I write SQL** into a new file under `migrations/` (timestamp-prefixed,
   newest last). Each file is self-contained and safe to re-run
   (`create ... if not exists`, `on conflict do nothing`, `create or replace`).
2. **You apply it** — pick ONE:
   - **SQL Editor (simplest):** Supabase Dashboard → SQL Editor → New query →
     paste the new file → Run. Expect "Success. No rows returned."
   - **CLI (optional, once set up):** `supabase db push` (see below).
3. **I verify** the result through the app's anon client in the live preview
   (row counts, RPC behavior) and report back. If a check needs a signed-in
   user, I'll tell you exactly what to click.

> Dashboard-only things I can't do for you (I'll give exact steps instead):
> Realtime replication toggles, Auth/email settings, pg_cron jobs, Edge
> Functions, and anything needing the `service_role` key. The `service_role`
> key never goes in this repo or the website.

## Files

| File | What it is |
|------|------------|
| `migrations/20260614120000_initial_schema.sql` | **Baseline.** The full schema you already ran (tables, enums, RLS, `SECURITY DEFINER` functions, and seed reference data). Idempotent — safe to re-run. |

New changes get added as new timestamped files **after** this one. Never edit a
migration that's already been applied to the live DB — add a new one.

## Optional: Supabase CLI

You don't need the CLI (the SQL Editor works fine), but if you want
`supabase db push` / `db diff`:

```bash
npm install -g supabase
supabase login
supabase link --project-ref laypjrtpnvpubzqwnvnt
supabase db push          # applies any migrations the remote hasn't run yet
```

Running `supabase init` will generate a `config.toml` here — that's expected and
fine to commit.
