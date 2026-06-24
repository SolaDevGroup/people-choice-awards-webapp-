#!/usr/bin/env node
/**
 * WC26 Fan Vote — HD player-photo enrichment (Wikipedia → Supabase)
 * ---------------------------------------------------------------------------
 * API-Football only serves 150×150 headshots (blurry when shown large). This
 * script finds a sharp portrait for each player on Wikipedia and stores it in
 * public.players.photo_hd. mapPlayer prefers photo_hd, falling back to the
 * API-Football photo_url where no match is found — so no player ever shows the
 * wrong face, and the long tail simply keeps the 150px image.
 *
 * Matching is safe: it takes the top Wikipedia search hit for
 *   "{name} {country} footballer", but ONLY accepts the photo if that page's
 *   description says "footballer"/"soccer" (this rejects e.g. a name that
 *   resolves to a country or a musician).
 *
 * Runs LOCALLY only — uses SUPABASE_SERVICE_ROLE_KEY from scripts/.env (git-
 * ignored), never the browser. No API key needed (Wikipedia is open).
 *
 * Prereq: run migration 20260628120000_players_photo_hd.sql first.
 * Usage:  node scripts/enrich-photos.mjs            (fills players missing photo_hd)
 *         node scripts/enrich-photos.mjs --force    (re-process everyone)
 *         PHOTO_LIMIT=50 node scripts/enrich-photos.mjs   (try a small batch first)
 * Resumable: only touches players whose photo_hd is null, so re-run to continue.
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

const SB_URL = (process.env.SUPABASE_URL || 'https://laypjrtpnvpubzqwnvnt.supabase.co').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const LIMIT = parseInt(process.env.PHOTO_LIMIT || '0', 10);   // 0 = all
const UA = 'PCA-WC26-PhotoEnrich/1.0 (https://github.com/SolaDevGroup; movebysola@gmail.com)';

if (!SB_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in scripts/.env'); process.exit(1); }

function req(method, urlStr, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const r = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sbGet(path) {
  const { status, body } = await req('GET', `${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
  if (status >= 300) throw new Error('SB GET ' + status + ' ' + body.slice(0, 200));
  return JSON.parse(body);
}
async function sbPatch(id, photo_hd) {
  const { status, body } = await req('PATCH', `${SB_URL}/rest/v1/players?id=eq.${encodeURIComponent(id)}`,
    { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ photo_hd }) });
  if (status >= 300) throw new Error('SB PATCH ' + status + ' ' + body.slice(0, 200));
}

// Top Wikipedia hit for the player, but only if it's verified to be a footballer + has a photo.
async function wikiPhoto(name, country) {
  const q = encodeURIComponent(`${name} ${country} footballer`.trim());
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=1&prop=pageimages|description&piprop=thumbnail&pithumbsize=800&format=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { status, body } = await req('GET', url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (status === 429 || status >= 500) { await sleep(1500 * (attempt + 1)); continue; }  // back off + retry
    if (status >= 300) return null;
    let j; try { j = JSON.parse(body); } catch { return null; }
    const pages = j && j.query && j.query.pages; if (!pages) return null;
    const pg = Object.values(pages)[0]; if (!pg) return null;
    const desc = (pg.description || '').toLowerCase();
    if (!/football|soccer/.test(desc)) return null;        // not a footballer (country, musician, …) → skip
    if (!pg.thumbnail || !pg.thumbnail.source) return null; // page has no portrait
    return pg.thumbnail.source;
  }
  return null;
}

(async () => {
  console.log('HD photo enrichment → ' + SB_URL);
  let players = [];
  const pageSize = 1000;
  for (let off = 0; ; off += pageSize) {
    const filter = FORCE ? '' : '&photo_hd=is.null';
    const rows = await sbGet(`players?select=id,name,nationality,photo_hd${filter}&order=name&limit=${pageSize}&offset=${off}`);
    players.push(...rows);
    if (rows.length < pageSize) break;
  }
  if (LIMIT > 0) players = players.slice(0, LIMIT);
  console.log(`${players.length} players to process${FORCE ? ' (forced)' : ''}`);

  let hd = 0, kept = 0, errors = 0, done = 0;
  for (const p of players) {
    try {
      const url = await wikiPhoto(p.name || '', p.nationality || '');
      if (url) { await sbPatch(p.id, url); hd++; }
      else kept++;
    } catch (e) { errors++; if (errors <= 5) console.warn('  err', p.name, e.message); }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${players.length} — ${hd} HD photos, ${kept} kept API photo`);
    await sleep(90); // ~11 req/s — polite to Wikipedia
  }
  console.log(`Done. HD photos set: ${hd} · kept API-Football photo: ${kept} · errors: ${errors}`);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
