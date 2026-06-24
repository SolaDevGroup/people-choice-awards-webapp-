# Scheduled data sync (cron jobs)

Two GitHub Actions cron jobs keep the live data in Supabase fresh. Both reuse the
existing importer `scripts/import-wc26.mjs` (dependency-free, rate-limited, resumable).

| Workflow | Flag | Schedule | Cost | Purpose |
|---|---|---|---|---|
| `sync-fixtures.yml` | `--fixtures-only` | every 15 min | ~1 API call/run | match schedule + live scores/status |
| `sync-player-stats.yml` | `--stats-only` | every 6 h | ~64 API calls/run | goals / assists / matches / minutes (also refreshes fixtures) |

The API key and Supabase service-role key live in **GitHub Secrets** — never in the
browser bundle. The roster itself (teams + players) is imported **once, locally**
(`node scripts/import-wc26.mjs --fresh`); these crons only *update* stats + fixtures.

## One-time setup

1. **Repo secrets** — GitHub → repo → *Settings → Secrets and variables → Actions → Secrets*:
   - `API_FOOTBALL_KEY` — your api-football.com key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → *Project Settings → API → service_role*
   - `SUPABASE_URL` — e.g. `https://laypjrtpnvpubzqwnvnt.supabase.co`

2. **Repo variables** (optional) — same page, *Variables* tab:
   - `WC_SEASON` — `2026` (default). 2026 needs a **paid** API-Football plan;
     a free key only reaches 2024 and the script auto-falls back to 2022.
   - `MAX_CALLS` — per-run cap for the stats job. `95` (default) suits the free
     plan (100/day); raise to `500`+ on a paid plan.

3. **Commit & push** these workflow files. They appear under the repo's **Actions** tab.

## Test it
Actions tab → pick a workflow → **Run workflow** (manual trigger). Open the run log:
fixtures should print `fixtures refreshed: N`; stats should print
`player_stats upserted: N`. Then confirm in the app (Games schedule / a player's
Goals·Assists·Matches) or in Supabase Table Editor.

## API budget (important)
The **free** plan is **100 calls/day**. Fixtures every 15 min alone ≈ 96/day, so on
free either widen the fixtures interval (e.g. `0 */2 * * *` = ~12/day) or skip the
stats cron. At go-live you're on a **paid** plan (required for season 2026), where
the schedules above are comfortably within budget.

## Tuning the schedule
Edit the `cron:` lines (UTC). Examples:
- Live match days, fixtures: `*/10 * * * *` (every 10 min)
- Off-season, fixtures: `0 */6 * * *` (4×/day)
- Stats once daily after matches: `30 6 * * *`

## Alternative: Supabase pg_cron + Edge Function
The fixtures job is light enough to run as a Supabase Edge Function invoked by
`pg_cron` (`cron.schedule` + `net.http_post`). The **stats** job is *not* a good fit
there — its multi-minute, rate-limited sweep exceeds Edge Function execution limits.
GitHub Actions is recommended for both so they share one proven code path.
