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
  b.disabled=!(suName.value.trim()&&suEmail.value.trim()&&suPass.value&&suTerms.checked);
}
function validateLogin(){
  const b=document.getElementById('liBtn');if(!b)return;
  b.disabled=!(liEmail.value.trim()&&liPass.value);
}

async function createAccount(){
  if(!suName.value.trim()||!suEmail.value.trim()||!suPass.value){toast('Please fill in all fields','error');return;}
  if(!suTerms.checked){toast('Please accept the Terms of Use','error');return;}
  const btn=document.getElementById('suBtn');btn.textContent='Creating…';btn.disabled=true;
  const {data,error}=await _sb.auth.signUp({
    email:suEmail.value.trim(),
    password:suPass.value,
    options:{data:{display_name:suName.value.trim()}}
  });
  btn.textContent='Create Account';validateSignup();
  if(error){toast(error.message,'error');return;}
  suPass.value='';validateSignup();
  if(data.session){
    // Email confirmation disabled → user is signed in immediately.
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

// Programmatic sign-in (kept for callers that already have credentials).
async function signIn(email,password){
  const {data,error}=await _sb.auth.signInWithPassword({email,password});
  if(error){toast(error.message,'error');return false;}
  await loadProfile(data.user.id);
  go('home');return true;
}

async function signOut(){
  await _sb.auth.signOut();
  state.user=null;state.profile=null;state.balance=0;state.totalVotes=0;syncBalance();renderAuthUI();
  toast('Signed out','logout');go('home');
}

async function loadProfile(uid){
  const {data}=await _sb.from('profiles').select('*').eq('id',uid).single();
  if(!data)return;
  state.profile=data;
  state.balance=data.fc_balance;
  state.totalVotes=data.reputation_xp;
  syncBalance();renderAuthUI();
}

// ---- Auth gate: call at the top of any user-dependent action ----
// Returns true when signed in; otherwise toasts, routes to login, returns false.
function requireAuth(msg){
  if(state.user)return true;
  toast(msg||'Sign in to continue','login');
  go('login');
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
  else{state.profile=null;state.balance=0;syncBalance();}
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
    votes: Number(rank.total_fc || 0),
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
    .map(o=>({ id:o.id, n:o.label, p:Number(o.implied_pct||0), pid:o.player_id||undefined }));
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
async function loadCatalog(){
  try{
    const [teamsRes, playersRes, ranksRes, marketsRes] = await Promise.all([
      _sb.from('teams').select('*'),
      _sb.from('players').select('*, player_stats(*)'),
      _sb.from('player_rankings').select('player_id,total_fc,unique_supporters'),
      // hint the FK explicitly: markets has two relationships to market_options
      // (market_options.market_id and markets.winning_option_id), so disambiguate.
      _sb.from('markets').select('*, market_options!market_id(*)').order('created_at',{ascending:true})
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
      players = playersRes.data.map(r=>mapPlayer(r, rankByPlayer))
        .sort((a,b)=>b.votes-a.votes);
      catalog.playersLoaded=true;
    } else if(playersRes.error){
      console.warn('[catalog] players load failed, keeping seed roster:', playersRes.error.message);
    } else {
      console.info('[catalog] players table empty, keeping seed roster.');
    }

    // Markets
    if(marketsRes.data && marketsRes.data.length){
      markets = marketsRes.data.map(mapMarket);
      catalog.marketsLoaded=true;
    } else if(marketsRes.error){
      console.warn('[catalog] markets load failed, keeping seed markets:', marketsRes.error.message);
    } else {
      console.info('[catalog] markets table empty, keeping seed markets.');
    }

    // Refresh everything that reads players/markets.
    fillDropdowns(); fillCompareSelects(); renderAll();
  }catch(e){
    console.warn('[catalog] load error, keeping seed data:', e);
  }
}

