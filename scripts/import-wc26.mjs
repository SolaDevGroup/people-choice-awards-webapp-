#!/usr/bin/env node
/**
 * WC26 Fan Vote — real World Cup player data importer (API-Football → Supabase)
 * ---------------------------------------------------------------------------
 * Populates public.teams / players / player_stats from API-Football so the
 * frontend (reads Supabase via loadCatalog) shows real World Cup players.
 * Runs LOCALLY only — keys live in scripts/.env (git-ignored), never in browser.
 *
 * FREE PLAN LIMITS (important):
 *   - seasons 2022–2024 only (2025/2026 blocked) → we use the 2022 World Cup;
 *     this script auto-falls-back to 2022 when WC_SEASON is plan-blocked.
 *   - 10 requests/MINUTE and 100/day.
 *   - the /players list caps `page` at 3 (only 60 rows) — so we use
 *     /players/squads (full squad per team, one call, no page limit) for rosters.
 *   At go-live: upgrade the plan + set WC_SEASON=2026.
 *
 * Pipeline:
 *   1. /teams?league=1&season=S          → upsert 32 national teams
 *   2. /players/squads?team={id} (×32)   → upsert ~830 players (identity/pos/photo)
 *   3. /players?id={id}&season=S (resumable, capped) → club + World Cup stats
 *
 * Rosters cost ~33 calls (one run). Per-player stats are RESUMABLE and capped per
 * run (MAX_CALLS), so on free they fill over several days — or fast on a paid key.
 * Idempotent (upsert on api_id). --fresh clears the demo seed first.
 *
 * Prereqs: run migration 20260614140000_add_players_club_api_id.sql, fill
 *   scripts/.env, then: node scripts/import-wc26.mjs --fresh   (--help for flags)
 * ---------------------------------------------------------------------------
 */

import https from 'node:https';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const txt = readFileSync(join(__dirname, '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no .env */ }
}
loadEnv();

const API_KEY = process.env.API_FOOTBALL_KEY;
const SB_URL  = (process.env.SUPABASE_URL || 'https://laypjrtpnvpubzqwnvnt.supabase.co').replace(/\/$/, '');
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC_SEASON = process.env.WC_SEASON || '2026';
const FREE_FALLBACK_SEASON = '2022';
const MAX_CALLS = parseInt(process.env.MAX_CALLS || '95', 10);  // daily budget guard (raise on paid)
const RATE_MS = parseInt(process.env.RATE_MS || '6500', 10);    // initial spacing; auto-adapts to the plan
const args = new Set(process.argv.slice(2));
const FRESH = args.has('--fresh');
const ROSTERS_ONLY = args.has('--rosters-only');
const STATS_ONLY = args.has('--stats-only');
const FIXTURES_ONLY = args.has('--fixtures-only'); // refresh match schedule + live status only
const WIPE = args.has('--wipe');         // delete ALL imported data first (e.g. switching season)

if (args.has('--help')) {
  console.log(`Usage: node scripts/import-wc26.mjs [--wipe] [--fresh] [--rosters-only] [--stats-only]
  --wipe          delete ALL imported teams/players/stats first (use when switching season, e.g. 2022→2026)
  --fresh         delete demo seed teams/players (api_id is null) first
  --rosters-only  import teams + squads only (skip the per-player stats phase)
  --stats-only    skip rosters; fill stats only (per-team, resumable)
Env (scripts/.env): API_FOOTBALL_KEY, SUPABASE_SERVICE_ROLE_KEY, [SUPABASE_URL],
                    [WC_SEASON=2026 -> auto 2022 on free] [MAX_CALLS=95] [RATE_MS=6500]`);
  process.exit(0);
}
if (!API_KEY || !SB_KEY) {
  console.error('Missing API_FOOTBALL_KEY or SUPABASE_SERVICE_ROLE_KEY. See scripts/.env.example.');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function request(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, text: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const API_BASE = 'https://v3.football.api-sports.io';
let calls = 0;
let pace = RATE_MS; // auto-tuned from the plan's per-minute limit (free 10 → slow, paid → fast)
async function api(path) {
  if (calls >= MAX_CALLS) throw new Error(`MAX_CALLS (${MAX_CALLS}) reached — re-run later to continue.`);
  for (let attempt = 0; ; attempt++) {
    const { status, text, headers } = await request('GET', `${API_BASE}${path}`, { 'x-apisports-key': API_KEY });
    if (status === 429) {
      if (attempt >= 6) throw new Error(`Rate-limited (429) repeatedly on ${path}`);
      console.log('  rate-limited (429) — waiting 60s…');
      await sleep(60000);
      continue;
    }
    const json = JSON.parse(text || '{}');
    calls++;
    const perMin = Number(headers['x-ratelimit-limit']); // requests/minute allowed by the plan
    if (perMin > 0) pace = Math.max(200, Math.ceil(60000 / perMin) + 150);
    await sleep(pace);
    return json;
  }
}

async function sb(method, path, body, prefer) {
  const payload = body ? JSON.stringify(body) : null;
  const { status, text } = await request(method, `${SB_URL}/rest/v1/${path}`, {
    apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }, payload);
  if (status < 200 || status >= 300) throw new Error(`Supabase ${method} ${path} → ${status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const upsert = (table, rows, onConflict, returnRep = false) =>
  rows.length ? sb('POST', `${table}?on_conflict=${onConflict}`, rows,
     `resolution=merge-duplicates,return=${returnRep ? 'representation' : 'minimal'}`) : [];

const POS = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Attacker: 'FWD' };
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const initials = (name) => {
  const p = String(name || '').split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '??';
};
const planBlocked = (json) => JSON.stringify(json.errors || {}).toLowerCase().includes('do not have access');
const FIX_STATUS = s => ['FT','AET','PEN'].includes(s) ? 'finished'
  : ['NS','TBD','PST','CANC','ABD','AWD','WO','SUSP'].includes(s) ? 'scheduled' : 'live';

// Refresh the match schedule (+ live status / scores) into public.fixtures.
async function importFixtures(season){
  const j = await api(`/fixtures?league=1&season=${season}`);
  const arr = j.response || [];
  if(!arr.length){ console.log('  fixtures: none returned', JSON.stringify(j.errors||'')); return; }
  const rows = arr.map(x => ({
    home_team_code: x.teams?.home?.name || '?',
    away_team_code: x.teams?.away?.name || '?',
    kickoff_at: x.fixture?.date,
    stage: x.league?.round || null,
    grp: null,
    venue: [x.fixture?.venue?.name, x.fixture?.venue?.city].filter(Boolean).join(', ') || null,
    status: FIX_STATUS(x.fixture?.status?.short),
    home_score: x.goals?.home ?? null,
    away_score: x.goals?.away ?? null,
  })).filter(r => r.kickoff_at);
  await sb('DELETE', 'fixtures?id=not.is.null');     // full refresh (highlights FK = set null)
  await sb('POST', 'fixtures', rows, 'return=minimal');
  console.log(`  fixtures refreshed: ${rows.length}`);
}

async function main() {
  console.log(`WC26 import → ${SB_URL}  (cap ${MAX_CALLS} calls)`);

  if (WIPE) {
    console.log('--wipe: deleting ALL imported teams/players/stats for a clean re-import…');
    await sb('DELETE', 'player_stats?player_id=not.is.null');
    await sb('DELETE', 'players?id=not.is.null');
    await sb('DELETE', 'teams?id=not.is.null');
  }

  // 1) TEAMS — resolve a plan-readable season (free → 2022).
  let season = WC_SEASON;
  let teamsJson = await api(`/teams?league=1&season=${season}`);
  if (planBlocked(teamsJson)) {
    console.log(`  season ${season} blocked → using ${FREE_FALLBACK_SEASON} (last free World Cup).`);
    season = FREE_FALLBACK_SEASON;
    teamsJson = await api(`/teams?league=1&season=${season}`);
  }
  const teamsResp = teamsJson.response || [];
  if (!teamsResp.length) { console.error('  no teams returned:', JSON.stringify(teamsJson.errors || teamsJson)); process.exit(1); }
  console.log(`  World Cup season ${season} — ${teamsResp.length} teams`);

  if (FIXTURES_ONLY) { await importFixtures(season); console.log(`Done (fixtures only). API calls: ${calls}.`); return; }

  // --stats-only: skip rosters, load the player pool straight from the DB.
  let players;
  if (STATS_ONLY) {
    players = await sb('GET', 'players?select=id,api_id&api_id=not.is.null') || [];
    console.log(`  stats-only: ${players.length} players in DB`);
  } else {
    if (FRESH) {
      console.log('--fresh: clearing demo seed rows (api_id is null)…');
      await sb('DELETE', 'players?api_id=is.null');
      await sb('DELETE', 'teams?api_id=is.null');
    }
    const teamRows = teamsResp.map(t => ({
      api_id: t.team.id, name: t.team.name,
      country_code: t.team.code || t.team.name, flag_key: t.team.name,
    }));
    const teams = await upsert('teams', teamRows, 'api_id', true);
    const teamUuid = Object.fromEntries(teams.map(t => [t.api_id, t.id]));
    console.log(`  teams upserted: ${teams.length}`);

    // 2) SQUADS — full roster per team (one call each, no page limit).
    let playerRows = [];
    for (const t of teamsResp) {
      const squad = await api(`/players/squads?team=${t.team.id}`);
      const list = squad.response?.[0]?.players || [];
      for (const pl of list) playerRows.push({
        api_id: pl.id, slug: `${slugify(pl.name)}-${pl.id}`, name: pl.name,
        short_name: initials(pl.name), position: POS[pl.position] || 'MID',
        jersey_number: pl.number ?? null, photo_url: pl.photo || null,
        nationality: t.team.name, team_id: teamUuid[t.team.id] || null, is_verified: true,
      });
      console.log(`  ${t.team.name}: ${list.length}`);
    }
    const seen = new Set();
    playerRows = playerRows.filter(p => !seen.has(p.api_id) && seen.add(p.api_id));
    players = await upsert('players', playerRows, 'api_id', true);
    console.log(`  players upserted: ${players.length}`);

    if (ROSTERS_ONLY) { console.log(`Done (rosters only). API calls used: ${calls}.`); return; }
  }

  // 3) STATS — per TEAM (efficient): /players?team&season returns ~26 players WITH
  //    their World Cup stats in ≤2 pages (under the free page≤3 limit). ~64 calls
  //    fills ALL players' goals/assists/matches in a single run.
  const teamIds = STATS_ONLY
    ? ((await sb('GET', 'teams?select=api_id&api_id=not.is.null')) || []).map(t => t.api_id)
    : teamsResp.map(t => t.team.id);
  const pmap = {};
  (players || []).forEach(p => { if (p.api_id) pmap[p.api_id] = p.id; });

  const byPlayer = {}; // player uuid -> stat row (dedupe across pages)
  let stopped = false;
  for (const tid of teamIds) {
    if (calls >= MAX_CALLS || stopped) break;
    let page = 1, total = 1;
    do {
      const j = await api(`/players?team=${tid}&season=${season}&page=${page}`);
      if (j.errors && Object.keys(j.errors).length) { console.log('  API limit/error:', JSON.stringify(j.errors)); stopped = true; break; }
      total = Math.min(j.paging?.total || 1, 3);
      for (const r of j.response || []) {
        const uuid = pmap[r.player?.id];
        if (!uuid) continue;
        const wc = (r.statistics || []).find(s => s.league?.id === 1) || (r.statistics || [])[0] || {};
        const g = wc.games || {}, gl = wc.goals || {}, m = g.appearences || 0, goals = gl.total || 0;
        byPlayer[uuid] = { player_id: uuid, goals, assists: gl.assists || 0, matches: m, minutes: g.minutes || 0, goals_per_match: m ? +(goals / m).toFixed(2) : 0 };
      }
      page++;
    } while (page <= total && calls < MAX_CALLS);
    console.log(`  team ${tid}: ${Object.keys(byPlayer).length} players with stats so far`);
  }
  const statRows = Object.values(byPlayer);
  await upsert('player_stats', statRows, 'player_id');
  console.log(`  player_stats upserted: ${statRows.length}`);
  await importFixtures(season);
  console.log(`Done. World Cup ${season}. API calls: ${calls}.`);
}

main().catch(e => { console.error('\nImport failed:', e.message); process.exit(1); });
