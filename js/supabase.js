/* ════════ AUTH (sign up · log in · sign out) ════════ */
// Generic password show/hide — works for any input+icon pair (defaults to sign-up).
function togglePass(inpId,iconId){
  const i=document.getElementById(inpId||'suPass');
  const ic=document.getElementById(iconId||'eyeIcon');
  i.type=i.type==='password'?'text':'password';
  if(ic)ic.textContent=i.type==='password'?'visibility_off':'visibility';
}

// Enable the submit button only once every required field is filled (+ terms agreed).
function validateSignup(){
  const b=document.getElementById('suBtn');if(!b)return;
  b.disabled=!(suName.value.trim()&&suEmail.value.trim()&&suPass.value&&suTerms.checked); // DOB is optional
}
function validateLogin(){
  const b=document.getElementById('liBtn');if(!b)return;
  b.disabled=!(liEmail.value.trim()&&liPass.value);
}

async function createAccount(){
  if(!suName.value.trim()||!suEmail.value.trim()||!suPass.value){toast('Please fill in all fields','error');return;}
  const dob=(document.getElementById('suDob')&&document.getElementById('suDob').value)||null; // optional
  if(!suTerms.checked){toast('Please accept the Terms of Use','error');return;}
  const btn=document.getElementById('suBtn');btn.textContent='Creating…';btn.disabled=true;
  const country=(suCountry&&suCountry.value)||null;
  const {data,error}=await _sb.auth.signUp({
    email:suEmail.value.trim(),
    password:suPass.value,
    options:{data:{display_name:suName.value.trim(),country,dob}}
  });
  btn.textContent='Create Account';validateSignup();
  if(error){toast(error.message,'error');return;}
  suPass.value='';validateSignup();
  if(data.session){
    // Email confirmation disabled → user is signed in immediately.
    // Persist country + date of birth on the profile (country → support map, DOB → age analytics).
    const patch={};if(country)patch.country_code=country;if(dob)patch.date_of_birth=dob;
    if(Object.keys(patch).length)await _sb.from('profiles').update(patch).eq('id',data.user.id);
    toast('Welcome to WC26!','celebration');
    go('home');
  }else{
    // Email confirmation on → they must verify before logging in.
    toast('Check your email to verify your account ✓','mail');
    go('login');
  }
}

// UI handler for the login view.
async function logIn(){
  const email=liEmail.value.trim(),pass=liPass.value;
  if(!email||!pass){toast('Please enter your email and password','error');return;}
  const btn=document.getElementById('liBtn');btn.textContent='Logging in…';btn.disabled=true;
  const {data,error}=await _sb.auth.signInWithPassword({email,password:pass});
  btn.textContent='Log in';validateLogin();
  if(error){toast(error.message,'error');return;}
  liPass.value='';validateLogin();
  await loadProfile(data.user.id);
  toast('Welcome back!','login');
  go('home');
}

// Google OAuth — redirects to Google, returns to the app; detectSessionInUrl +
// onAuthStateChange then load the profile. handle_new_user creates the row.
async function signInWithGoogle(){
  const {error}=await _sb.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:location.origin+location.pathname}
  });
  if(error)toast(error.message,'error');
}

// Programmatic sign-in (kept for callers that already have credentials).
async function signIn(email,password){
  const {data,error}=await _sb.auth.signInWithPassword({email,password});
  if(error){toast(error.message,'error');return false;}
  await loadProfile(data.user.id);
  go('home');return true;
}

async function signOut(){
  await _sb.auth.signOut();
  state.user=null;state.profile=null;state.balance=0;state.totalVotes=0;state.hasPass=false;state.myVote=null;
  // clear the submitted Predict-the-XI so it doesn't leak to the next user / guest
  state.xi={};state.xiSubmitted=false;try{localStorage.removeItem('wc26_xi');localStorage.removeItem('wc26_xi_sub');}catch(e){}if(typeof renderXI==='function')renderXI();
  syncBalance();renderAuthUI();
  loadUserCosmetics(); // clears owned/equipped back to the signed-out baseline
  loadPredictions();   // clears the forecast history to the signed-out state
  toast('Signed out','logout');go('home');
}

async function loadProfile(uid){
  const {data}=await _sb.from('profiles').select('*').eq('id',uid).single();
  if(!data)return;
  state.profile=data;
  // Backfill country from signup metadata if the profile lacks it (email-confirm
  // signups don't have a session when createAccount runs, so it's saved here).
  const meta=(state.user&&state.user.user_metadata)||{};
  if(!data.country_code&&meta.country){
    await _sb.from('profiles').update({country_code:meta.country}).eq('id',uid);
    data.country_code=meta.country;state.profile.country_code=meta.country;
  }
  // Same for date of birth (drives the Analytics age distribution).
  if(!data.date_of_birth&&meta.dob){
    await _sb.from('profiles').update({date_of_birth:meta.dob}).eq('id',uid);
    data.date_of_birth=meta.dob;state.profile.date_of_birth=meta.dob;
  }
  state.balance=data.fc_balance;
  state.xp=Number(data.reputation_xp)||0; // drives the level bar (real XP)
  syncBalance();renderAuthUI();
  await loadUserCosmetics();
  await loadVoteState();            // pass + current vote → button states
  if(typeof renderVoteList==='function')renderVoteList();
  loadPredictions();                // the user's real forecast history
  if(typeof loadPredictedXI==='function')loadPredictedXI(uid); // restore submitted Predict-the-XI (locked)
  if(typeof loadTransactions==='function')loadTransactions(); // real FC ledger
  await loadUserPlan();             // purchased pack → profile plan badge
  if(typeof renderProfileHero==='function')renderProfileHero();
  if(typeof updateLevelUI==='function')updateLevelUI();   // real level / XP / votes
  if(typeof renderProfile==='function')renderProfile();   // profile page stats + history
  // Reward state (welcome-once + daily streak) follows the server truth, and re-open
  // any reward modal the user tapped "claim" on before they were signed in.
  if(typeof syncRewardStateFromProfile==='function')syncRewardStateFromProfile();
  if(typeof reopenPendingReward==='function')reopenPendingReward();
  // The support map needs a country. If this account never set one (e.g. Google sign-up),
  // ask once after the splash so their vote can be plotted.
  const metaC=state.user&&state.user.user_metadata&&state.user.user_metadata.country;
  if(!state.profile.country_code && !metaC && !state._askedCountry && typeof ensureVoterCountry==='function'){
    state._askedCountry=true;
    setTimeout(()=>{ if(!state.profile.country_code) ensureVoterCountry(); },5600);
  }
}
// The highest FC pack the user has bought → shown as their "plan" badge on the profile.
async function loadUserPlan(){
  state.plan=null;
  if(!state.user)return;
  try{
    const {data}=await _sb.from('fc_purchase').select('pack,fc_amount').order('fc_amount',{ascending:false}).limit(1);
    if(data&&data.length)state.plan=data[0];
  }catch(e){}
}
// Whether the user holds the pass + which player they've voted for (and if they've
// used their one allowed change). Drives every Vote button's enabled/disabled state.
async function loadVoteState(){
  state.hasPass=false; state.myVote=null;
  if(!state.user)return;
  try{
    const [hp,mv]=await Promise.all([_sb.rpc('has_supporter_pass'),_sb.rpc('my_pass_vote')]);
    state.hasPass=!!(hp&&hp.data);
    const v=mv&&mv.data;
    state.myVote=(v&&v.player_id)?{player_id:v.player_id,changes_used:Number(v.changes_used)||0}:null;
  }catch(e){console.warn('[vote-state]',e);}
}
// The user's REAL forecasts (predictions table) → the Prediction History list, with their
// pick, stake, status, server potential payout, and live odds movement.
async function loadPredictions(){
  if(!state.user){ state.predictions=[]; if(typeof renderPredHistory==='function')renderPredHistory(); return; }
  try{
    const {data,error}=await _sb.from('predictions')
      .select('stake_fc,entry_pct,potential_payout,reward_fc,status,created_at, market:markets!market_id(id,title), opt:market_options!option_id(label,side)')
      .order('created_at',{ascending:false});
    if(error){ console.warn('[predictions] load failed:', error.message); return; }
    state.predictions=(data||[]).map(r=>{
      const mid=r.market&&r.market.id;
      const mk=(typeof markets!=='undefined')&&markets.find(x=>x.dbId===mid);
      const sideIdx=(r.opt&&r.opt.side==='b')?1:0;
      const entry=Number(r.entry_pct)||50;
      const curPct=(mk&&typeof marketPcts==='function')?marketPcts(mk)[sideIdx]:entry;
      return {
        market:(r.market&&r.market.title)||'Prediction',
        pick:(r.opt&&r.opt.label)||'',
        fc:Number(r.stake_fc||0),
        status:r.status,                 // 'open' | 'won' | 'lost'
        sidePct:entry, curPct,           // your entry odds → current odds (true line movement)
        reward:Number(r.reward_fc||0),
        potential:Number(r.potential_payout||0)
      };
    });
    if(typeof renderPredHistory==='function')renderPredHistory();
  }catch(e){ console.warn('[predictions]',e); }
}
// Real-time odds refresh: re-read the actual market pool from the DB so odds update when
// OTHER users forecast — and stay perfectly still when nobody does. No random simulation.
async function refreshOdds(){
  if(document.hidden)return;                                  // skip when tab not visible
  if(document.querySelector('.modal-backdrop.open'))return;   // don't disrupt an open modal
  try{
    const {data,error}=await _sb.from('markets').select('*, market_options!market_id(*)').order('created_at',{ascending:true});
    if(!error && data && data.length && typeof mapMarket==='function'){
      markets=data.map(mapMarket);
      if(typeof renderMarkets==='function'){ renderMarkets(); renderHomeMarkets(); }
    }
    loadPredictions(); // recompute live odds + line movement from the refreshed pool
  }catch(e){}
}
// Load the match schedule from Supabase (live-first, then soonest upcoming, then finished).
async function loadFixtures(){
  try{
    const fxRes=await _sb.from('fixtures').select('*').order('kickoff_at',{ascending:true});
    if(fxRes.data && fxRes.data.length){
      const mapped=fxRes.data.map(r=>({a:r.home_team_code,b:r.away_team_code,kickoff_at:r.kickoff_at,stage:r.stage,venue:r.venue,status:r.status,home_score:r.home_score,away_score:r.away_score}));
      const rank=f=>fixtureLive(f)?0:(f.status==='finished'?2:1);
      mapped.sort((a,b)=>{const ra=rank(a),rb=rank(b);if(ra!==rb)return ra-rb;const ta=+new Date(a.kickoff_at),tb=+new Date(b.kickoff_at);return ra===2?tb-ta:ta-tb;});
      fixtures=mapped; catalog.fixturesLoaded=true;
    } else if(fxRes.error){ console.warn('[fixtures] load failed, keeping seed:', fxRes.error.message); }
  }catch(e){ console.warn('[fixtures]',e); }
}
// Keep the schedule live: re-read fixtures + re-render so LIVE badges, scores and countdowns
// stay current (live status is computed against the clock, so this also flips badges on/off).
async function refreshFixtures(){
  if(document.hidden)return;
  await loadFixtures();
  if(typeof renderHomeGames==='function')renderHomeGames();
  if(typeof renderGames==='function')renderGames();
  if(typeof renderStoreTicker==='function')renderStoreTicker();
}
// Live leaderboard: re-read real vote counts (so OTHER users' votes move the ranks),
// show the movement vs the current baseline, then re-baseline for the next 60s window.
async function refreshLeaderboard(){
  if(document.hidden)return;
  try{
    await loadVoteCounts();
    players.sort(rankCmp);
    if(typeof renderLeaderboard==='function')renderLeaderboard(); // render movement vs baseline
    // keep the vote-driven home sections in sync with other users' votes too
    [ 'renderHomePodium','renderHomeTrending','renderFeatured','renderHomePulse','renderSupportByCountry' ].forEach(fn=>{ if(typeof window[fn]==='function')window[fn](); });
    if(typeof captureLbBaseline==='function')captureLbBaseline(); // commit → next window
  }catch(e){}
}
// Overlay each player's live supporter count (pass votes) onto players[].votes.
async function loadVoteCounts(){
  try{
    const {data,error}=await _sb.from('pass_vote_counts').select('player_id,votes');
    if(error||!data)return;
    const m={}; data.forEach(r=>{ m[r.player_id]=Number(r.votes)||0; });
    players.forEach(p=>{ if(p.dbId) p.realVotes=m[p.dbId]||0; }); // real app votes; p.votes getter adds the base
    updateTotalVotes(); // "Total Votes Cast" = sum of all players' real votes
    loadVoteTrends();   // real "Vote Trend (Last 24h)" % off the same refresh
  }catch(e){/* tally view not deployed yet — keep existing counts */}
}
// Real 24h vote trend per player (player_vote_trends RPC) → players[].trend.
async function loadVoteTrends(){
  try{
    const {data,error}=await _sb.rpc('player_vote_trends');
    if(error||!data)return;
    const m={}; data.forEach(r=>{ m[r.player_id]=Number(r.trend)||0; });
    players.forEach(p=>{ if(p.dbId) p.trend=(m[p.dbId]!=null?m[p.dbId]:0); });
    if(typeof renderVoteList==='function')renderVoteList();
    if(typeof renderLeaderboard==='function')renderLeaderboard();
  }catch(e){/* trend RPC not deployed yet — leave trend at 0 */}
}
// Render the real "Total Votes Cast" total on the home page.
function updateTotalVotes(){
  const el=document.getElementById('totalVotes'); if(!el) return;
  const total=(typeof players!=='undefined') ? players.reduce((s,p)=>s+(Number(p.realVotes)||0),0) : 0; // REAL votes cast in the app (not the made-up base)
  el.textContent=fmt(total);
}

// ---- Cosmetics: catalogue map (code<->uuid) + per-user ownership/equipped ----
// The cosmetics table mirrors the 144 frontend custItems by `code`. We map each
// item's dbId (uuid) so buy_cosmetic/equip_cosmetic can reference real rows, and
// translate owned/equipped uuids back to codes for the UI.
function reRenderCosmetics(){
  if(typeof renderCust==='function'){renderCust();renderProfile();renderProfileHero();updateChromeAvatars();}
}
async function loadCosmeticCatalog(){
  if(catalog.cosmeticById&&Object.keys(catalog.cosmeticById).length)return; // idempotent
  const {data,error}=await _sb.from('cosmetics').select('id,code');
  if(error||!data){console.warn('[cosmetics] catalog load failed:',error&&error.message);return;}
  catalog.cosmeticById={};catalog.cosmeticByCode={};
  data.forEach(c=>{catalog.cosmeticById[c.id]=c.code;catalog.cosmeticByCode[c.code]=c.id;});
  if(typeof custItems!=='undefined')custItems.forEach(i=>{i.dbId=catalog.cosmeticByCode[i.id]||null;});
}
async function loadUserCosmetics(){
  if(!state.user){
    state.ownedCust=new Set();
    state.equipped={avatar:null,decoration:null,nameplate:null,banner:null};
    reRenderCosmetics();return;
  }
  await loadCosmeticCatalog();
  const [own,eq]=await Promise.all([
    _sb.from('user_cosmetics').select('cosmetic_id'),
    _sb.from('user_equipped').select('avatar_id,decoration_id,nameplate_id,banner_id').maybeSingle()
  ]);
  if(own.data)state.ownedCust=new Set(own.data.map(r=>catalog.cosmeticById[r.cosmetic_id]).filter(Boolean));
  const e=eq.data||{};
  state.equipped={
    avatar:catalog.cosmeticById[e.avatar_id]||null,
    decoration:catalog.cosmeticById[e.decoration_id]||null,
    nameplate:catalog.cosmeticById[e.nameplate_id]||null,
    banner:catalog.cosmeticById[e.banner_id]||null
  };
  reRenderCosmetics();
}

// ---- Auth gate: call at the top of any user-dependent action ----
// Returns true when signed in; otherwise toasts, routes to login, returns false.
function requireAuth(msg){
  if(state.user)return true;
  go('login'); // anything that needs auth → straight to the login page (no toast)
  return false;
}
const REP_LEVEL_NAMES={1:'Rookie',2:'Bronze Fan',3:'Silver Fan',4:'Gold Fan',5:'Legend Fan',6:'Hall of Fame'};
function authInitials(){
  const n=(state.profile&&(state.profile.display_name||state.profile.username))||(state.user&&state.user.email)||'';
  const parts=String(n).replace(/@.*/,'').trim().split(/[\s._-]+/).filter(Boolean);
  return (((parts[0]||'')[0]||'?')+((parts[1]||'')[0]||'')).toUpperCase();
}

// Swap the auth entry points between signed-out (Log in / Create Account) and
// signed-in (Sign Out) states. Called on every auth change and from renderAll.
function renderAuthUI(){
  const signedIn=!!state.user;
  // Sidebar identity chip: real user when signed in, a Log in prompt otherwise.
  const sp=document.getElementById('sbProfile');
  if(sp){
    if(signedIn){
      const name=(state.profile&&(state.profile.display_name||state.profile.username))||state.user.email;
      const lvl=(state.profile&&REP_LEVEL_NAMES[state.profile.reputation_level])||'Fan';
      sp.onclick=()=>go('profile');
      sp.innerHTML=`<div class="profile-avatar">${authInitials()}</div>
        <div style="text-align:left;"><div style="font-size:13px;font-weight:700;">${name}</div><div class="caption" style="color:var(--ink-3);">${lvl}</div></div>`;
    }else{
      sp.onclick=()=>go('login');
      sp.innerHTML=`<div class="profile-avatar"><span class="material-icons-round" style="font-size:18px;">login</span></div>
        <div style="text-align:left;"><div style="font-size:13px;font-weight:700;">Log in</div><div class="caption" style="color:var(--ink-3);">Sign in to start</div></div>`;
    }
  }
  const pa=document.getElementById('profileAuth');
  if(pa)pa.innerHTML=signedIn
    ? `<button class="btn btn-secondary btn-block" onclick="signOut()">Sign Out</button>`
    : `<button class="btn btn-primary btn-block" onclick="go('login')">Log in</button>
       <button class="btn btn-secondary btn-block" onclick="go('signup')" style="margin-top:8px;">Create Account</button>`;
  const sa=document.getElementById('sheetAuth');
  if(sa)sa.innerHTML=signedIn
    ? `<button class="sheet-item" onclick="closeSheet();signOut()"><span class="material-icons-outlined">logout</span>Sign Out<span class="material-icons-round chev">chevron_right</span></button>`
    : `<button class="sheet-item" onclick="closeSheet();go('login')"><span class="material-icons-outlined">login</span>Log in<span class="material-icons-round chev">chevron_right</span></button>
       <button class="sheet-item" onclick="closeSheet();go('signup')"><span class="material-icons-outlined">person_add</span>Create Account<span class="material-icons-round chev">chevron_right</span></button>`;
}

// Listen for auth changes (also fires once on every page load with the restored session).
_sb.auth.onAuthStateChange(async (event,session)=>{
  state.user=session?session.user:null;
  if(session){await loadProfile(session.user.id);}
  else{state.profile=null;state.balance=0;syncBalance();loadUserCosmetics();}
  renderAuthUI();
});

/* ════════ SUPABASE CATALOG (players · teams · markets) ════════ */
// Source of truth is Supabase. The hardcoded arrays above are a seed fallback so
// the app still renders if a table is empty or the network is down. When a table
// returns rows we replace the in-memory array (mapped to the frontend shape) and
// re-render. UUIDs are kept on .dbId so the server RPCs (cast_vote, place_prediction…)
// can reference real rows while the frontend keeps using slug ids for DOM/state.

// Country → flag emoji, derived from the seed roster (DB doesn't store the emoji).
const COUNTRY_FLAG = Object.fromEntries(players.map(p=>[p.country, p.flag]));
const MARKET_KIND_MAP = {yes_no:'yn', head_to_head:'vs'};

// Loading flags + team lookups (task 5 reads these for loading/empty states).
const catalog = {playersLoaded:false, marketsLoaded:false, teamsLoaded:false, teamsById:{}, teamsByCode:{}};

function fmtCloses(ts){
  if(!ts) return '';
  const d=new Date(ts);
  return isNaN(d) ? '' : d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

// DB player row (+ nested player_stats) + ranking → frontend player shape.
function mapPlayer(row, rankByPlayer){
  const st = (Array.isArray(row.player_stats)?row.player_stats[0]:row.player_stats) || {};
  const team = row.team_id && catalog.teamsById[row.team_id];
  const country = (team && team.name) || row.nationality || '';
  const rank = rankByPlayer[row.id] || {};
  const last = (row.last_name || (row.name||'').split(' ').slice(-1)[0] || '').toUpperCase();
  return {
    id: row.slug || row.id,
    dbId: row.id,
    name: row.name,
    first: row.first_name || (row.name||'').split(' ')[0] || '',
    last,
    short: row.short_name || (last.slice(0,2)),
    num: row.jersey_number || 0,
    pos: row.position,
    country,
    flag: COUNTRY_FLAG[country] || '',
    club: row.club || '',
    photo: row.photo_hd || row.photo_url || '',  // prefer the sharp Wikipedia portrait, fall back to API-Football
    base: playerBaseVotes({goals:st.goals||0, assists:st.assists||0, matches:st.matches||0, gpm:Number(st.goals_per_match||0), id:row.slug||row.id, name:row.name}),
    realVotes: Number(rank.total_fc || 0),
    get votes(){ return (Number(this.base)||0) + (Number(this.realVotes)||0); }, // base + real (each vote +1)
    trend: 0,
    goals: st.goals||0, assists: st.assists||0, matches: st.matches||0,
    wc: st.wc_apps||0, winRate: Number(st.win_rate||0),
    gpm: Number(st.goals_per_match||0), speed: Number(st.top_speed||0),
    trophies: st.trophies||0
  };
}

// DB market row (+ nested market_options) → frontend market shape.
function mapMarket(row){
  const options = (row.market_options||[])
    .slice().sort((a,b)=>(a.sort||0)-(b.sort||0))
    .map(o=>({ id:o.id, n:o.label, p:Number(o.implied_pct||0), alloc:Number(o.fc_allocated||0), supporters:Number(o.supporter_count||0), pid:o.player_id||undefined }));
  const cat = row.subject_type==='team' ? 'country'
            : row.subject_type==='tournament' ? 'tournament' : 'player';
  return {
    id: row.slug || row.id,
    dbId: row.id,
    cat,
    kind: MARKET_KIND_MAP[row.kind] || 'yn',
    type: row.type_label || '',
    title: row.title,
    pool: Number(row.pool_fc||0),
    closes: fmtCloses(row.closes_at),
    options
  };
}

// Fetch the public catalog and re-render. Safe to call anytime; never throws.
// Fetch every player + nested stats, paging past PostgREST's 1000-row cap.
async function fetchAllPlayers(){
  const all=[]; const size=1000;
  for(let from=0;;from+=size){
    const {data,error}=await _sb.from('players').select('*, player_stats(*)').range(from,from+size-1);
    if(error) return {data:all.length?all:null, error};
    all.push(...(data||[]));
    if(!data || data.length<size) break;
  }
  return {data:all, error:null};
}
// Recent predictors per option (display_name + avatar) → social-proof avatar stack.
// Reads the SECURITY DEFINER market_predictors() RPC (3 most-recent, privacy-respecting).
let marketPredictors={}; // option_id (uuid) -> [{name, photo}]
async function loadMarketPredictors(){
  try{
    const {data,error}=await _sb.rpc('market_predictors');
    if(error||!Array.isArray(data))return; // RPC not deployed yet → cards just show "+N"
    const map={};
    data.forEach(r=>{(map[r.option_id]=map[r.option_id]||[]).push({name:r.display_name||'',photo:r.avatar_url||''});});
    marketPredictors=map;
    if(typeof renderMarkets==='function')renderMarkets();
    if(typeof renderHomeMarkets==='function')renderHomeMarkets();
  }catch(e){}
}
async function loadCatalog(){
  // Markets render fast — load them on their own (NOT behind the heavy ~1,248-player
  // fetch) so the real odds (fc_allocated) show immediately instead of flashing 50/50.
  _sb.from('markets').select('*, market_options!market_id(*)').order('created_at',{ascending:true})
    .then(({data,error})=>{
      if(data && data.length){ markets=data.map(mapMarket); catalog.marketsLoaded=true; renderMarkets(); renderHomeMarkets(); loadPredictions(); loadMarketPredictors(); }
      else if(error){ console.warn('[catalog] markets load failed, keeping seed:', error.message); }
    });
  try{
    const [teamsRes, playersRes, ranksRes] = await Promise.all([
      _sb.from('teams').select('*'),
      fetchAllPlayers(),   // paginated — PostgREST caps a single request at 1000 rows
      _sb.from('player_rankings').select('player_id,total_fc,unique_supporters')
    ]);

    // Teams → lookup maps (used to resolve player country/flag). Build before players.
    if(teamsRes.data && teamsRes.data.length){
      catalog.teamsById={}; catalog.teamsByCode={};
      teamsRes.data.forEach(t=>{ catalog.teamsById[t.id]=t; catalog.teamsByCode[t.country_code]=t; });
      catalog.teamsLoaded=true;
    } else if(teamsRes.error){
      console.warn('[catalog] teams load failed:', teamsRes.error.message);
    }

    // Rankings (materialized view) → player_id map. Optional; tolerate if not exposed.
    const rankByPlayer={};
    if(ranksRes.data){ ranksRes.data.forEach(r=>{ rankByPlayer[r.player_id]=r; }); }
    else if(ranksRes.error){ console.warn('[catalog] rankings unavailable:', ranksRes.error.message); }

    // Players
    if(playersRes.data && playersRes.data.length){
      players = playersRes.data.map(r=>mapPlayer(r, rankByPlayer)).sort(rankCmp);
      catalog.playersLoaded=true;
    } else if(playersRes.error){
      console.warn('[catalog] players load failed, keeping seed roster:', playersRes.error.message);
    } else {
      console.info('[catalog] players table empty, keeping seed roster.');
    }

    // (Markets are loaded + rendered independently above, so they don't wait on players.)

    await loadFixtures(); // match schedule (live-first sort)
    if(typeof renderStoreTicker==='function')renderStoreTicker(); // refresh ticker with real fixtures
    if(typeof renderAnalytics==='function')renderAnalytics(); // real analytics once the roster/votes are in

    // Overlay live supporter counts (Supporter-Pass votes) + the user's own vote state.
    await loadVoteCounts(); players.sort(rankCmp);
    if(typeof captureLbBaseline==='function')captureLbBaseline(); // baseline for rank movement
    await loadVoteState();

    // Refresh everything that reads players/markets/fixtures.
    fillDropdowns(); fillCompareSelects(); renderAll();
  }catch(e){
    console.warn('[catalog] load error, keeping seed data:', e);
  }
}

