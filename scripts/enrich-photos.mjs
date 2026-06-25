#!/usr/bin/env node
/**
 * WC26 Fan Vote — current player photos (FotMob → Supabase)
 * ---------------------------------------------------------------------------
 * API-Football only serves small 150×150 headshots. FotMob has up-to-date,
 * uniform 192×192 headshots for nearly every pro player, on an open image CDN.
 * This script matches each player to FotMob and stores the photo URL in
 * public.players.photo_hd. mapPlayer prefers photo_hd, falling back to the
 * API-Football photo_url where no confident match is found.
 *
 * MATCHING (precision-first — never show the wrong face):
 *   - search FotMob by the player's LAST name (our names are stored abbreviated,
 *     e.g. "L. Messi", so a last-name search is the most reliable),
 *   - accept a candidate ONLY if its last name matches AND its first name starts
 *     with our player's first initial (so "D. Sánchez" won't grab "Robert
 *     Sánchez"). No match → leave photo_hd null → keep the API-Football photo.
 *
 * Runs LOCALLY only — SUPABASE_SERVICE_ROLE_KEY from scripts/.env. No API key
 * needed (FotMob search + image CDN are open).
 *
 * Prereq: migration 20260628120000_players_photo_hd.sql.
 * Usage:  node scripts/enrich-photos.mjs --force   (re-process EVERYONE — use this
 *                                                    to switch the whole roster to FotMob)
 *         node scripts/enrich-photos.mjs           (only players missing photo_hd)
 *         PHOTO_LIMIT=40 node scripts/enrich-photos.mjs --force   (small test first)
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
const LIMIT = parseInt(process.env.PHOTO_LIMIT || '0', 10);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const fmImg = id => `https://images.fotmob.com/image_resources/playerimages/${id}.png`;

if (!SB_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in scripts/.env'); process.exit(1); }

function req(method, urlStr, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const r = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, res => {
      const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => resolve({ status: res.statusCode, buf: Buffer.concat(ch) }));
    });
    r.on('error', reject); if (body) r.write(body); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\-]/g, '');

async function sbGet(path) {
  const { status, buf } = await req('GET', `${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
  if (status >= 300) throw new Error('SB GET ' + status + ' ' + buf.toString().slice(0, 200));
  return JSON.parse(buf.toString());
}
async function sbPatch(id, photo_hd) {
  const { status, buf } = await req('PATCH', `${SB_URL}/rest/v1/players?id=eq.${encodeURIComponent(id)}`,
    { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ photo_hd }) });
  if (status >= 300) throw new Error('SB PATCH ' + status + ' ' + buf.toString().slice(0, 200));
}

// Find a confident FotMob match for a stored player name → image URL, or null.
async function fotmobPhoto(name) {
  const toks = String(name || '').trim().split(/\s+/);
  if (!toks.length) return null;
  const first = toks[0] || '';
  const meLast = norm(toks[toks.length - 1]);
  const meFirst = norm(first);
  const isInitial = /^[a-z]\.?$/i.test(first);  // "D." / "D"
  if (!meLast) return null;

  let j;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { status, buf } = await req('GET', `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(meLast)}&lang=en`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (status === 429 || status >= 500) { await sleep(1200 * (attempt + 1)); continue; }
    if (status >= 300) return null;
    try { j = JSON.parse(buf.toString()); } catch { return null; }
    break;
  }
  const block = j && j.squadMemberSuggest && j.squadMemberSuggest[0];
  const opts = (block && block.options) || [];
  for (const o of opts) {
    if (!o.payload || o.payload.isCoach) continue;
    const label = (o.text || '').split('|')[0];
    const ct = label.trim().split(/\s+/);
    const cLast = norm(ct[ct.length - 1]);
    const cFirst = norm(ct[0]);
    if (cLast !== meLast) continue;                                   // last name must match
    if (isInitial) { if (cFirst.charAt(0) !== meFirst.charAt(0)) continue; }   // initial must match
    else { if (cFirst !== meFirst && !cFirst.startsWith(meFirst) && !meFirst.startsWith(cFirst)) continue; }
    // confident match — verify the image actually exists (some players have no photo)
    const url = fmImg(o.payload.id);
    const img = await req('GET', url, { headers: { 'User-Agent': UA } });
    if (img.status === 200 && img.buf.length > 800) return url;
    return null;
  }
  return null;
}

// Fallback for players FotMob doesn't list: a Wikipedia portrait, but only if the
// top hit is verified to be a footballer (rejects country/musician name clashes).
async function wikiPhoto(name, country) {
  const q = encodeURIComponent(`${name} ${country} footballer`.trim());
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=1&prop=pageimages|description&piprop=thumbnail&pithumbsize=600&format=json`;
  for (let a = 0; a < 3; a++) {
    const { status, buf } = await req('GET', url, { headers: { 'User-Agent': 'PCA-WC26-PhotoEnrich/1.0 (movebysola@gmail.com)', Accept: 'application/json' } });
    if (status === 429 || status >= 500) { await sleep(1200 * (a + 1)); continue; }
    if (status >= 300) return null;
    let j; try { j = JSON.parse(buf.toString()); } catch { return null; }
    const pages = j && j.query && j.query.pages; if (!pages) return null;
    const pg = Object.values(pages)[0]; if (!pg) return null;
    if (!/football|soccer/.test((pg.description || '').toLowerCase())) return null;
    if (!pg.thumbnail || !pg.thumbnail.source) return null;
    return pg.thumbnail.source;
  }
  return null;
}

(async () => {
  console.log('FotMob photo enrichment (+ Wikipedia fallback) → ' + SB_URL + (FORCE ? '  (force: re-processing everyone)' : ''));
  let players = [];
  const pageSize = 1000;
  for (let off = 0; ; off += pageSize) {
    const filter = FORCE ? '' : '&photo_hd=is.null';
    const rows = await sbGet(`players?select=id,name,nationality,photo_hd${filter}&order=name&limit=${pageSize}&offset=${off}`);
    players.push(...rows);
    if (rows.length < pageSize) break;
  }
  if (LIMIT > 0) players = players.slice(0, LIMIT);
  console.log(`${players.length} players to process`);

  let fm = 0, wk = 0, kept = 0, errors = 0, done = 0;
  for (const p of players) {
    try {
      let url = await fotmobPhoto(p.name || ''), viaFm = true;
      if (!url) { url = await wikiPhoto(p.name || '', p.nationality || ''); viaFm = false; }  // FotMob gap → Wikipedia HD
      if (url) { await sbPatch(p.id, url); viaFm ? fm++ : wk++; }
      else { if (p.photo_hd) await sbPatch(p.id, null); kept++; }  // neither → keep the API photo
    } catch (e) { errors++; if (errors <= 5) console.warn('  err', p.name, e.message); }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${players.length} — ${fm} FotMob, ${wk} Wikipedia, ${kept} kept API`);
    await sleep(120);
  }
  console.log(`Done. FotMob: ${fm} · Wikipedia fallback: ${wk} · kept API-Football: ${kept} · errors: ${errors}`);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
