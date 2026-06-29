#!/usr/bin/env node
/**
 * Store product images (projerseyshop.cn → Supabase store_products)
 * ---------------------------------------------------------------------------
 * We list the WC26 jerseys in our own DB but the photos live on the third-party
 * store. For each product this:
 *   1. searches the store for "{team} {Home|Away} Soccer Fan Jersey World Cup 2026"
 *   2. matches the base fan-jersey link  /productdetail/{Team}-{Type}-Soccer-Fan-Jersey-World-Cup-2026/{id}
 *   3. reads the product page's <meta property="og:image"> (the main image)
 *   4. saves image_url + buy_url onto the store_products row.
 *
 * Runs LOCALLY only — SUPABASE_SERVICE_ROLE_KEY from scripts/.env. No API key.
 * Prereq: migration 20260628140000_store_products.sql.
 * Usage:  node scripts/import-store-images.mjs           (only rows missing image_url)
 *         node scripts/import-store-images.mjs --force    (re-fetch all)
 * Resumable: only touches rows where image_url is null unless --force.
 * ---------------------------------------------------------------------------
 */
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try { const t = readFileSync(join(__dirname, '.env'), 'utf8');
    for (const l of t.split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  } catch {}
}
loadEnv();
const SB_URL = (process.env.SUPABASE_URL || 'https://laypjrtpnvpubzqwnvnt.supabase.co').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORCE = new Set(process.argv.slice(2)).has('--force');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const STORE = 'https://www.projerseyshop.cn';
if (!SB_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in scripts/.env'); process.exit(1); }

function req(method, urlStr, { headers = {}, body = null, timeout = 30000 } = {}) {
  return new Promise((resolve) => {
    const u = new URL(urlStr);
    const r = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, res => {
      const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(ch).toString() }));
    });
    r.on('error', () => resolve({ status: 0, body: '' }));
    r.setTimeout(timeout, () => r.destroy());
    if (body) r.write(body); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function sbGet(p) { const { status, body } = await req('GET', `${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }); if (status >= 300) throw new Error('SB GET ' + status + ' ' + body.slice(0, 200)); return JSON.parse(body); }
async function sbPatch(id, fields) { const { status, body } = await req('PATCH', `${SB_URL}/rest/v1/store_products?product_id=eq.${encodeURIComponent(id)}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(fields) }); if (status >= 300) throw new Error('SB PATCH ' + status + ' ' + body.slice(0, 200)); }

// our team name → store URL slug (the store hyphenates and, for a few, names differ)
const TEAM_SLUG = { 'USA': 'USA', 'South Korea': 'South-Korea', 'South Africa': 'South-Africa', 'Bosnia and Herzegovina': 'Bosnia-and-Herzegovina', 'Saudi Arabia': 'Saudi-Arabia', 'New Zealand': 'New-Zealand', 'Cape Verde': 'Cape-Verde', 'Ivory Coast': 'C-te-d-Ivoire', 'DR Congo': 'DR-Congo', 'Czechia': 'Czechia', 'Türkiye': 'Turkey', 'Curaçao': 'Curacao' };
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// One fetch of the product sitemap gives every product URL — far more reliable (and
// gentler on the store) than 96 keyword searches. We match each jersey off this list.
let SITEMAP = null;
async function loadSitemap() {
  if (SITEMAP) return SITEMAP;
  let xml = '';
  for (const host of ['https://www.projerseyshop.es', STORE]) {
    const r = await req('GET', `${host}/sitemap/product.xml`, { headers: { 'User-Agent': UA } });
    if (r.status === 200 && r.body.length > 1000) { xml = r.body; break; }
    await sleep(900);
  }
  // every /productdetail/{slug}/{id} link to a World-Cup-2026 fan jersey
  const urls = [...new Set((xml.match(/productdetail\/[^<"']+Soccer-(?:Fan|Match)-Jersey-World-Cup-2026\/\d+/g) || []))];
  SITEMAP = urls.map(u => { const m = u.match(/productdetail\/(.+)\/(\d+)$/); return { slug: m[1], id: m[2], path: '/' + u }; });
  return SITEMAP;
}

async function findImage(team, type) {
  const list = await loadSitemap();
  if (!list.length) return null;
  const slug = TEAM_SLUG[team] || team.replace(/ /g, '-');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // STRICT: only the exact base Fan jersey for this team + kit. The slug names the team,
  // so an exact match is guaranteed correct — no fuzzy fallback (which mismatched teams before).
  const rx = new RegExp('^' + esc(slug) + '-' + type + '-Soccer-Fan-Jersey-World-Cup-2026$', 'i');
  const hit = list.find(e => rx.test(e.slug));
  if (!hit) return null;
  const page = await req('GET', STORE + hit.path, { headers: { 'User-Agent': UA } });
  if (page.status >= 300) return null;
  // og:image == the store's own primary product image (its first/main shot)
  const og = page.body.match(/<meta property="og:image" content="([^"]+)"/i);
  if (!og) return null;
  // single-unit USD price from the JSON-LD Offer → FC at our fixed rate ($1 = 100 FC)
  const pm = page.body.match(/"offers":\s*\{[^}]*?"price":"([0-9.]+)"/) || page.body.match(/"priceCurrency":"USD","price":"([0-9.]+)"/);
  const price_fc = pm ? Math.round(parseFloat(pm[1]) * 100) : null;
  return { image: og[1], buy: STORE + hit.path, price_fc };
}

// --rebuild: process EVERY row and CLEAR rows with no exact Fan-jersey match (wipes any
// wrong data from earlier fuzzy matching). Default (no flag): only fill rows still missing.
const REBUILD = new Set(process.argv.slice(2)).has('--rebuild');
(async () => {
  console.log('Store image import → ' + SB_URL + (FORCE || REBUILD ? '  (rebuild — strict + clears non-matches)' : ''));
  const filter = (FORCE || REBUILD) ? '' : '&or=(image_url.is.null,price_fc.is.null)';
  const rows = await sbGet(`store_products?select=product_id,team,jersey_type${filter}&order=sort_order&limit=200`);
  console.log(`${rows.length} products to process`);
  let ok = 0, cleared = 0, miss = 0, errors = 0, done = 0;
  for (const p of rows) {
    try {
      const r = await findImage(p.team, p.jersey_type);
      if (r) { const f = { image_url: r.image, buy_url: r.buy, price_fc: r.price_fc ?? null }; await sbPatch(p.product_id, f); ok++; }
      else if (REBUILD) { await sbPatch(p.product_id, { image_url: null, buy_url: null, price_fc: null }); cleared++; console.warn('  cleared (not on store):', p.product_id, '(' + p.team, p.jersey_type + ')'); }
      else { miss++; console.warn('  no match:', p.product_id, '(' + p.team, p.jersey_type + ')'); }
    } catch (e) { errors++; if (errors <= 5) console.warn('  err', p.product_id, e.message); }
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${rows.length} — ${ok} set · ${cleared} cleared · ${miss} unmatched`);
    await sleep(1500); // gentle — the store throttles rapid requests
  }
  console.log(`Done. set: ${ok} · cleared: ${cleared} · unmatched: ${miss} · errors: ${errors}`);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
