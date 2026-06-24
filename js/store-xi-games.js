/* ════════ MODALS / SHEET / TOAST ════════ */
function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';}
function closeModal(id){document.getElementById(id).classList.remove('open');document.body.style.overflow='';}
function backdropClose(e,id){if(e.target===e.currentTarget){closeModal(id);}}
function openSheet(){document.getElementById('moreSheet').classList.add('open');document.body.style.overflow='hidden';}
function closeSheet(){document.getElementById('moreSheet').classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal-backdrop.open,.sheet-backdrop.open').forEach(m=>{m.classList.remove('open');});closeMenu();document.body.style.overflow='';}});
function selectPlan(p){
  planTournament.classList.toggle('selected',p==='tournament');
  planMonthly.classList.toggle('selected',p==='monthly');
}
function payToast(){closeModal('premiumModal');toast('Checkout opens in the app','lock');}
let toastTimer;
function toast(msg,icon){
  toastText.textContent=msg;toastIcon.textContent=icon||'check_circle';
  const t=document.getElementById('toast');t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}


/* ════════ STORE ════════ */
const merchTypes=[
  {n:'Home Jersey',e:'👕',fc:1800},{n:'Away Jersey',e:'🎽',fc:1800},{n:'Match Scarf',e:'🧣',fc:650},
  {n:'Supporter Cap',e:'🧢',fc:550},{n:'Mini Ball',e:'⚽',fc:900},{n:'Wall Poster',e:'🖼️',fc:300}
];
const merchTeams=['France','Brazil','England','Argentina','Spain','Germany','Morocco','Portugal'];
let merch=[];
merchTeams.forEach(t=>merchTypes.forEach((m,i)=>merch.push({id:t+'_'+i,team:t,name:m.n,emoji:m.e,fc:m.fc})));
state.storeFilter='all';state.owned=new Set();
function renderStoreChips(){
  storeChips.innerHTML=`<button class="chip ${state.storeFilter==='all'?'active':''}" onclick="setStoreFilter('all')">All Nations</button>`+
    merchTeams.map(t=>{const fi=flagImg(t,16);return `<button class="chip ${state.storeFilter===t?'active':''}" onclick="setStoreFilter('${t}')" style="display:inline-flex;align-items:center;gap:6px;">${fi||''}${t}</button>`;}).join('');
}
function setStoreFilter(f){state.storeFilter=f;renderStoreChips();renderMerch();}
function renderMerch(){
  const list=merch.filter(m=>state.storeFilter==='all'||m.team===state.storeFilter);
  // Same card design as the customization cards: dark gradient image, name/team/price, tap-to-buy.
  merchGrid.innerHTML=list.map(m=>{const fi=flagImg(m.team,16);const owned=state.owned.has(m.id);
    const status=owned?'<span class="cust-state on">Owned ✓</span>':'';
    return `<button class="cust-card2" onclick="buyMerch('${m.id}')">
    <div class="cust-img">
      <div class="cust-badges">${fi?`<span class="merch-flag-chip">${fi}</span>`:'<span></span>'}</div>
      <div class="cust-art"><span class="merch-emoji">${m.emoji}</span></div>
    </div>
    <div class="cust-meta">
      <div class="cust-nm">${m.name}</div>
      <div class="cust-sub">${m.team}</div>
      <div class="cust-price">${fcCoin}<span class="cust-amt">${fmt(Math.round(m.fc*0.8))}</span><span class="cust-orig">$${fmt(m.fc)}</span><span class="cust-fcu">FC</span>${status}</div>
    </div>
  </button>`;}).join('');
}
function buyMerch(id){
  if(!requireAuth('Sign in to shop merch'))return;
  if(state.owned.has(id))return;
  const m=merch.find(x=>x.id===id);
  if(state.balance<m.fc){toast('Not enough Fan Credits','error');openModal('creditsModal');return;}
  state.balance-=m.fc;state.owned.add(id);syncBalance();grantXP(5,'merch');renderMerch();
  toast(`${m.team} ${m.name} unlocked!`,'redeem');
}

/* ════════ STARTING XI (4-3-3) ════════ */
const XI_FORMATION=[
  {row:'FWD',count:3},{row:'MID',count:3},{row:'DEF',count:4},{row:'GK',count:1}
];
// "actual" most-voted per position (top by votes) — used to score predictions
function topByPos(pos,n){return players.filter(p=>p.pos===pos).sort((a,b)=>b.votes-a.votes).slice(0,n);}
state.xi={};state.xiSubmitted=false;
let xiSlots=[];
function buildXISlots(){
  xiSlots=[];
  XI_FORMATION.forEach(line=>{for(let i=0;i<line.count;i++)xiSlots.push({pos:line.row,key:line.row+i});});
}
function renderXI(){
  pitchRows.innerHTML=XI_FORMATION.map(line=>`
  <div class="pitch-line">
    ${Array.from({length:line.count}).map((_,i)=>{
      const key=line.row+i;const pid=state.xi[key];const p=pid&&players.find(x=>x.id===pid);
      const correct=state.xiSubmitted&&p&&topByPos(line.pos,line.count).some(tp=>tp.id===pid);
      return `<button class="xi-slot" onclick="openXIPicker('${line.pos}','${key}')">
        <div class="xi-dot ${p?'filled':''} ${correct?'correct':''}">${p?p.short:'<span class=\"material-icons-round\">add</span>'}</div>
        <div class="xi-pos">${line.pos}</div>
        ${p?`<div class="xi-name">${p.name.split(' ').slice(-1)[0]}</div>`:''}
      </button>`;
    }).join('')}
  </div>`).join('');
  const n=Object.keys(state.xi).length;
  xiProgressLbl.textContent=`${n} / 11 selected`;
  xiSubmitBtn.textContent=state.xiSubmitted?'XI Submitted ✓':'Submit Predicted XI';
  xiSubmitBtn.style.opacity=state.xiSubmitted?'.6':'1';
}
function openXIPicker(pos,key){
  if(state.xiSubmitted){toast('Your XI is locked in','lock');return;}
  document.getElementById('xiPickerTitle').textContent='Pick '+({FWD:'Forward',MID:'Midfielder',DEF:'Defender',GK:'Goalkeeper'}[pos]);
  const used=new Set(Object.entries(state.xi).filter(([k])=>k!==key).map(([,v])=>v));
  const cands=players.filter(p=>p.pos===pos);
  document.getElementById('xiPickerList').innerHTML=cands.map(p=>{const dis=used.has(p.id);return `
    <button class="sheet-item" ${dis?'disabled style="opacity:.4;"':''} onclick="pickXI('${key}','${p.id}')">
      ${avatarHTML(p,38)}
      <div style="margin-left:2px;"><div style="font-size:13px;font-weight:700;">${p.name}</div>
      <div class="caption" style="color:var(--ink-3);">${p.country} · ${fmtV(p.votes)} votes</div></div>
      ${state.xi[key]===p.id?'<span class="material-icons-round chev" style="color:var(--purple);">check_circle</span>':'<span class="material-icons-round chev">chevron_right</span>'}
    </button>`;}).join('');
  document.getElementById('xiPicker').classList.add('open');document.body.style.overflow='hidden';
}
function pickXI(key,pid){
  state.xi[key]=pid;
  document.getElementById('xiPicker').classList.remove('open');document.body.style.overflow='';
  renderXI();
}
function submitXI(){
  if(!requireAuth('Sign in to submit your Starting XI'))return;
  if(state.xiSubmitted)return;
  if(Object.keys(state.xi).length<11){toast('Pick all 11 positions first','sports_soccer');return;}
  state.xiSubmitted=true;renderXI();
  // score
  let correct=0;
  XI_FORMATION.forEach(line=>{const top=topByPos(line.pos,line.count).map(p=>p.id);
    for(let i=0;i<line.count;i++){const pid=state.xi[line.row+i];if(top.includes(pid))correct++;}});
  if(correct===11)toast('Perfect XI! You\u2019re in the running for the special prize 🏆','military_tech');
  else toast(`XI submitted · ${correct}/11 match the current most-voted`,'sports_soccer');
}


/* ════════ GAMES (schedule + highlights) ════════ */
// Fallback schedule; replaced by real WC2026 fixtures from Supabase in loadCatalog.
let fixtures=[
  {a:'USA',b:'Paraguay',stage:'Group Stage',venue:'SoFi Stadium, Los Angeles',kickoff_at:'2026-06-12T20:00:00Z',status:'scheduled',home_score:null,away_score:null},
  {a:'Brazil',b:'Morocco',stage:'Group Stage',venue:'MetLife Stadium, New York',kickoff_at:'2026-06-15T13:00:00Z',status:'live',home_score:1,away_score:0},
  {a:'Germany',b:'Japan',stage:'Group Stage',venue:'Mercedes-Benz Stadium, Atlanta',kickoff_at:'2026-06-15T19:00:00Z',status:'scheduled',home_score:null,away_score:null},
];
// name → flag emoji (regional-indicator for nations; subdivisions hardcoded)
const NAT_ISO2={Algeria:'DZ',Argentina:'AR',Australia:'AU',Austria:'AT',Belgium:'BE','Bosnia & Herzegovina':'BA',Brazil:'BR',Canada:'CA','Cape Verde Islands':'CV',Colombia:'CO','Congo DR':'CD',Croatia:'HR','Curaçao':'CW',Czechia:'CZ',Ecuador:'EC',Egypt:'EG',France:'FR',Germany:'DE',Ghana:'GH',Haiti:'HT',Iran:'IR',Iraq:'IQ','Ivory Coast':'CI',Japan:'JP',Jordan:'JO',Mexico:'MX',Morocco:'MA',Netherlands:'NL','New Zealand':'NZ',Norway:'NO',Panama:'PA',Paraguay:'PY',Portugal:'PT',Qatar:'QA','Saudi Arabia':'SA',Senegal:'SN','South Africa':'ZA','South Korea':'KR',Spain:'ES',Sweden:'SE',Switzerland:'CH',Tunisia:'TN','Türkiye':'TR',Turkey:'TR',USA:'US','United States':'US',Uruguay:'UY',Uzbekistan:'UZ'};
const NAT_SPECIAL={England:'🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',Scotland:'🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',Wales:'🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'};
function flagEmoji(name){
  if(NAT_SPECIAL[name])return NAT_SPECIAL[name];
  const c=NAT_ISO2[name];
  return c?String.fromCodePoint(...[...c].map(ch=>0x1F1E6+ch.charCodeAt(0)-65)):'';
}
function fixtureLive(f){
  if(f.status==='finished')return false;
  if(f.status==='live')return true;
  if(!f.kickoff_at)return false;
  const k=new Date(f.kickoff_at).getTime();
  return Date.now()>=k && Date.now()<=k+2.5*3600e3; // within a ~2.5h match window
}
function fmtKickoff(iso){const d=new Date(iso);return isNaN(d)?{date:'TBD',time:''}:{date:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),time:d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};}
function fixtureBig(f,live){
  if(f.status==='finished')return{v:`${f.home_score??0} - ${f.away_score??0}`,lbl:'FULL TIME'};
  if(live)return{v:`${f.home_score??0} - ${f.away_score??0}`,lbl:'LIVE'};
  const diff=f.kickoff_at?new Date(f.kickoff_at).getTime()-Date.now():0;
  if(!f.kickoff_at)return{v:'TBD',lbl:''};
  if(diff<=0)return{v:'KICK OFF',lbl:''};
  const h=Math.floor(diff/3600e3),m=Math.floor((diff%3600e3)/60e3);
  if(h>=48)return{v:`${Math.floor(h/24)}d ${h%24}h`,lbl:'TO KICKOFF'};
  return{v:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,lbl:'HRS · MINS'};
}
/* ---- Fan Store live-match ticker (moving schedule bar under the header) ---- */
let _stPaused=false;
function stShortDate(iso){const d=new Date(iso);return isNaN(d)?'':d.getDate()+' '+d.toLocaleDateString('en-US',{month:'short'});}
function stMatchHTML(f){
  const d=new Date(f.kickoff_at);
  const tm=isNaN(d)?'TBD':String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); // 24h, Figma "09:00"
  const fa=flagImg(f.a,15),fb=flagImg(f.b,15);
  return `<span class="st-match"><span class="st-time">${tm}</span>${fa}<span class="st-dash">-</span>${fb}</span>`;
}
function renderStoreTicker(){
  const tr=document.getElementById('stTrack');if(!tr)return;
  const all=(typeof fixtures!=='undefined'&&fixtures)?fixtures:[];
  // show the schedule from today forward (current date → next dates), earliest first.
  const dayStart=new Date();dayStart.setHours(0,0,0,0);const ds=dayStart.getTime();
  let fx=all.filter(f=>f.kickoff_at && new Date(f.kickoff_at).getTime()>=ds)
           .sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at)).slice(0,12);
  if(!fx.length)fx=all.slice(0,12); // fallback: nothing upcoming → show whatever we have
  if(!fx.length){tr.innerHTML='';return;}
  // group consecutive fixtures by kickoff date: matches in one date sit together (4px gap),
  // the [dot] + [date] separators are their own items (16px gaps from the track).
  const groups=[];let cur=null,lastDate=null;
  fx.forEach(f=>{const d=fmtKickoff(f.kickoff_at).date;
    if(d!==lastDate){cur={iso:f.kickoff_at,matches:[]};groups.push(cur);lastDate=d;}
    cur.matches.push(f);
  });
  const set=groups.map(g=>
    `<span class="st-group">${g.matches.map(stMatchHTML).join('')}</span>`+
    `<span class="st-dot"></span><span class="st-date">${stShortDate(g.iso)}</span>`
  ).join('');
  tr.innerHTML=set+set; // duplicate the set so the marquee loops seamlessly
  tr.style.animationPlayState=_stPaused?'paused':'running';
}
function toggleStoreTicker(){
  _stPaused=!_stPaused;
  const tr=document.getElementById('stTrack');if(tr)tr.style.animationPlayState=_stPaused?'paused':'running';
  const ic=document.querySelector('#stPause .material-icons-round');if(ic)ic.textContent=_stPaused?'play_arrow':'pause';
}
// ESPN FC — game highlights only (https://www.youtube.com/@ESPNFC/videos)
const ESPNFC='https://www.youtube.com/@ESPNFC/videos';
const highlights=[
  {a:'Brazil',b:'Morocco',score:'2 - 1',title:'Brazil vs Morocco · Extended Highlights',dur:'10:24',q:'1080p'},
  {a:'Germany',b:'Japan',score:'1 - 1',title:'Germany vs Japan · Group Stage Highlights',dur:'9:12',q:'1080p'},
  {a:'Mexico',b:'South Africa',score:'3 - 0',title:'Mexico vs South Africa · Highlights',dur:'8:48',q:'1080p'},
  {a:'USA',b:'Paraguay',score:'2 - 2',title:'USA vs Paraguay · Match Highlights',dur:'7:36',q:'1080p'},
  {a:'Qatar',b:'Switzerland',score:'0 - 1',title:'Qatar vs Switzerland · Highlights',dur:'8:05',q:'1080p'},
  {a:'Haiti',b:'Scotland',score:'1 - 2',title:'Haiti vs Scotland · Group Stage Highlights',dur:'7:58',q:'1080p'}
];
state.gtab='schedule';
/* ---- FIFA YouTube highlights (real videos, inline player) ---- */
const FIFA_UPLOADS='UUpcTrCXblq78GZrTUTLWeBw';            // FIFA channel uploads playlist
const FIFA_URL='https://www.youtube.com/@fifa/videos';
let ytHighlights=[], ytLoaded=false;
const htmlEsc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Uses a YouTube Data API key; falls back to MAP_KEY if YouTube Data API is enabled on it.
function ytKey(){try{if(YOUTUBE_KEY)return YOUTUBE_KEY;}catch(e){}try{if(YT_KEY)return YT_KEY;}catch(e){}try{if(MAP_KEY)return MAP_KEY;}catch(e){}return'';}
const bestThumb=t=>t?((t.maxres||t.standard||t.high||t.medium||t.default||{}).url):'';
// NOTE: FIFA syndication-blocks embedded playback on every World Cup upload (IFrame API
// returns error 150 for all of them) — this is a global broadcast-rights restriction, not
// domain-specific, so inline <iframe> playback is impossible. The grid therefore opens each
// video on YouTube in a new tab; we keep crisp maxres thumbnails for the card art.
async function loadHighlights(){
  ytLoaded=true;const key=ytKey();if(!key)return;
  try{
    const r=await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${FIFA_UPLOADS}&key=${encodeURIComponent(key)}`);
    const j=await r.json();
    if(j.error){console.warn('[highlights] YouTube Data API:',j.error.message);return;}
    let items=(j.items||[]).map(it=>({
      id:(it.contentDetails&&it.contentDetails.videoId)||(it.snippet&&it.snippet.resourceId&&it.snippet.resourceId.videoId),
      title:it.snippet&&it.snippet.title,
      thumb:bestThumb(it.snippet&&it.snippet.thumbnails)
    })).filter(v=>v.id&&!/#shorts/i.test(v.title||''));
    // Keep only public videos + upgrade thumbnails to the highest available resolution.
    const ids=items.map(v=>v.id).slice(0,50).join(',');
    try{
      const vr=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${ids}&key=${encodeURIComponent(key)}`);
      const vj=await vr.json();
      if(!vj.error&&vj.items){
        const ok=new Set(),betterThumb={};
        vj.items.forEach(v=>{
          if((v.status||{}).privacyStatus==='public'){ok.add(v.id);betterThumb[v.id]=bestThumb(v.snippet&&v.snippet.thumbnails);}
        });
        items=items.filter(v=>ok.has(v.id)).map(v=>({...v,thumb:betterThumb[v.id]||v.thumb}));
      }
    }catch(e){/* if status check fails, fall back to unfiltered list */}
    const hl=items.filter(v=>/highlight/i.test(v.title||''));
    ytHighlights=(hl.length?hl:items).slice(0,12);
    if(state.gtab==='highlights')renderGames();
  }catch(e){console.warn('[highlights] load failed:',e);}
}
// FIFA disables embedded playback on every WC upload (IFrame error 150), so open the video
// on YouTube in a new tab rather than showing YouTube's "blocked on this website" screen.
function playHighlight(id){
  window.open(`https://www.youtube.com/watch?v=${id}`,'_blank','noopener');
}
function setGamesTab(t){state.gtab=t;document.querySelectorAll('#gamesTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.gtab===t));
  document.getElementById('gamesSchedule').style.display=t==='schedule'?'':'none';
  document.getElementById('gamesHighlights').style.display=t==='highlights'?'':'none';
  if(t==='highlights'&&!ytLoaded)loadHighlights();}
function fixtureFlag(name){const fi=flagImg(name,30);if(fi)return fi;const e=flagEmoji(name);return `<span style="font-size:26px">${e||'🏳️'}</span>`;}
function renderGames(){
  document.getElementById('gamesSchedule').innerHTML=`<div class="fixtures-grid">${fixtures.map(f=>{
    const live=fixtureLive(f),big=fixtureBig(f,live),k=fmtKickoff(f.kickoff_at);
    return `<div class="fixture-card ${live?'islive':''}">
      ${live?'<span class="fixture-live">● LIVE</span>':''}
      <div class="fixture-teams">
        <div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.a)}</div><div class="fixture-name">${f.a}</div></div>
        <div class="fixture-vs">VS</div>
        <div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.b)}</div><div class="fixture-name">${f.b}</div></div>
      </div>
      <div class="fixture-time">${big.v}${big.lbl?`<span class="fixture-time-lbl">${big.lbl}</span>`:''}</div>
      <div class="fixture-meta">${f.stage||'World Cup 2026'}</div>
      <div class="fixture-venue"><span class="material-icons-outlined">stadium</span>${f.venue||'TBD'}</div>
      <div class="fixture-foot">
        <span><span class="material-icons-outlined">event</span>${k.date}</span>
        <span><span class="material-icons-outlined">schedule</span>${k.time}</span>
      </div>
    </div>`;}).join('')}</div>`;
  const hh=document.getElementById('gamesHighlights');if(!hh)return;
  const head=`<div class="hl-channel"><span class="material-icons-round">verified</span><div><div class="hl-ch-name">FIFA</div><div class="caption" style="color:var(--ink-3);">Official World Cup highlights</div></div>
      <a class="btn btn-secondary btn-sm" href="${FIFA_URL}" target="_blank" rel="noopener" style="margin-left:auto;">Visit channel</a></div>`;
  if(ytHighlights.length){
    // Real FIFA videos — FIFA blocks embedded playback, so cards open the video on YouTube.
    hh.innerHTML=head+`<div class="hl-grid">${ytHighlights.map(v=>`
      <a class="hl-card" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" style="cursor:pointer;">
        <div class="hl-thumb" style="background-image:url('${v.thumb}')">
          <span class="hl-play"><span class="material-icons-round">play_arrow</span></span>
        </div>
        <div class="hl-body"><div class="hl-title">${htmlEsc(v.title)}</div>
          <div class="hl-ch"><span class="material-icons-round">verified</span>FIFA</div></div>
      </a>`).join('')}</div>
      <p class="caption" style="color:var(--ink-4);text-align:center;margin-top:14px;">Tap a video to watch it on YouTube · official FIFA channel</p>`;
  }else{
    // Fallback (no YouTube Data API key yet): cards link out to the FIFA channel.
    hh.innerHTML=head+`<div class="hl-grid">${highlights.map(h=>`
      <a class="hl-card" href="${FIFA_URL}" target="_blank" rel="noopener">
        <div class="hl-thumb hl-match">
          <span class="hl-q">${h.q}</span><span class="hl-dur">${h.dur}</span>
          <div class="hl-match-inner">
            <div class="hl-team">${flagImg(h.a,26)||''}<span>${h.a}</span></div>
            <div class="hl-score">${h.score}</div>
            <div class="hl-team">${flagImg(h.b,26)||''}<span>${h.b}</span></div>
          </div>
          <span class="hl-play"><span class="material-icons-round">play_arrow</span></span>
        </div>
        <div class="hl-body"><div class="hl-title">${h.title}</div>
          <div class="hl-ch"><span class="material-icons-round">verified</span>FIFA</div></div>
      </a>`).join('')}</div>
      <p class="caption" style="color:var(--ink-4);text-align:center;margin-top:14px;">Add a YouTube Data API key to stream FIFA's latest highlights in-app</p>`;
  }
}

