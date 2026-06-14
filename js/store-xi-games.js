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
  merchGrid.innerHTML=list.map(m=>{const fi=flagImg(m.team,18);const owned=state.owned.has(m.id);return `
  <div class="merch-card">
    <div class="merch-img" style="background:linear-gradient(160deg,var(--grey-bg),#ECEAF4);">
      <span class="merch-flag">${fi||''}</span><span class="merch-emoji">${m.emoji}</span>
    </div>
    <div class="merch-body">
      <div class="merch-name">${m.name}</div>
      <div class="merch-team">${m.team}</div>
      <div class="merch-foot">
        <div class="merch-price">${fcCoin}${fmt(m.fc)}</div>
        <button class="merch-buy ${owned?'owned':''}" onclick="buyMerch('${m.id}')">${owned?'Owned':'Buy'}</button>
      </div>
    </div>
  </div>`;}).join('');
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
const fixtures=[
  {a:'USA',b:'Paraguay',af:'USA',bf:null,time:'04:00',group:'D',venue:'SoFi Stadium, Los Angeles',date:'Thu, Jun 12, 2026',kick:'8:00 PM',live:false},
  {a:'Haiti',b:'Scotland',af:null,bf:null,time:'04:00',group:'A',venue:'NRG Stadium, Houston',date:'Fri, Jun 13, 2026',kick:'12:00 PM',live:false},
  {a:'Mexico',b:'South Africa',af:'Mexico',bf:null,time:'22:00',group:'F',venue:'AT&T Stadium, Dallas',date:'Sat, Jun 14, 2026',kick:'3:00 PM',live:false},
  {a:'Qatar',b:'Switzerland',af:null,bf:'Switzerland',time:'22:00',group:'B',venue:'Lusail Stadium, Lusail',date:'Sat, Jun 14, 2026',kick:'11:00 AM',live:false},
  {a:'Brazil',b:'Morocco',af:'Brazil',bf:'Morocco',time:'01:00',group:'C',venue:'MetLife Stadium, New York',date:'Sun, Jun 15, 2026',kick:'1:00 PM',live:true},
  {a:'Germany',b:'Japan',af:'Germany',bf:'Japan',time:'05:00',group:'E',venue:'Mercedes-Benz Stadium, Atlanta',date:'Sun, Jun 15, 2026',kick:'7:00 PM',live:false},
];
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
function setGamesTab(t){state.gtab=t;document.querySelectorAll('#gamesTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.gtab===t));
  document.getElementById('gamesSchedule').style.display=t==='schedule'?'':'none';
  document.getElementById('gamesHighlights').style.display=t==='highlights'?'':'none';}
function fixtureFlag(name){const fi=flagImg(name,30);return fi||`<span style="font-size:26px">🏳️</span>`;}
function renderGames(){
  document.getElementById('gamesSchedule').innerHTML=`<div class="fixtures-grid">${fixtures.map(f=>`
    <div class="fixture-card ${f.live?'islive':''}">
      ${f.live?'<span class="fixture-live">● LIVE</span>':''}
      <div class="fixture-teams">
        <div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.a)}</div><div class="fixture-name">${f.a}</div></div>
        <div class="fixture-vs">VS</div>
        <div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.b)}</div><div class="fixture-name">${f.b}</div></div>
      </div>
      <div class="fixture-time">${f.time}<span class="fixture-time-lbl">${f.time.endsWith('00')?'HRS · MINS':''}</span></div>
      <div class="fixture-meta">Group Stage · Group ${f.group}</div>
      <div class="fixture-venue"><span class="material-icons-outlined">stadium</span>${f.venue}</div>
      <div class="fixture-foot">
        <span><span class="material-icons-outlined">event</span>${f.date}</span>
        <span><span class="material-icons-outlined">schedule</span>${f.kick}</span>
      </div>
    </div>`).join('')}</div>`;
  document.getElementById('gamesHighlights').innerHTML=`
    <div class="hl-channel"><span class="material-icons-round">verified</span><div><div class="hl-ch-name">ESPN FC</div><div class="caption" style="color:var(--ink-3);">Official match highlights · 1080p</div></div>
      <a class="btn btn-secondary btn-sm" href="${ESPNFC}" target="_blank" rel="noopener" style="margin-left:auto;">Visit channel</a></div>
    <div class="hl-grid">${highlights.map(h=>{const fa=flagImg(h.a,26),fb=flagImg(h.b,26);return `
    <a class="hl-card" href="${ESPNFC}" target="_blank" rel="noopener">
      <div class="hl-thumb hl-match">
        <span class="hl-q">${h.q}</span><span class="hl-dur">${h.dur}</span>
        <div class="hl-match-inner">
          <div class="hl-team">${fa||''}<span>${h.a}</span></div>
          <div class="hl-score">${h.score}</div>
          <div class="hl-team">${fb||''}<span>${h.b}</span></div>
        </div>
        <span class="hl-play"><span class="material-icons-round">play_arrow</span></span>
      </div>
      <div class="hl-body"><div class="hl-title">${h.title}</div>
        <div class="hl-ch"><span class="material-icons-round">verified</span>ESPN FC</div></div>
    </a>`;}).join('')}</div>
    <p class="caption" style="color:var(--ink-4);text-align:center;margin-top:14px;">Game highlights only · opens on ESPN FC's official YouTube channel</p>`;
}

