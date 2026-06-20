/* ════════ INTERACTION POLISH ════════ */
document.addEventListener('click',function(e){
  const t=e.target.closest('.btn,.merch-buy,.p-vote-btn,.fc-pill,.pay-btn,.quick-amt,.side-btn');
  if(!t)return;
  const r=document.createElement('span');r.className='ripple';
  const rect=t.getBoundingClientRect();const d=Math.max(rect.width,rect.height);
  r.style.width=r.style.height=d+'px';
  r.style.left=(e.clientX-rect.left-d/2)+'px';r.style.top=(e.clientY-rect.top-d/2)+'px';
  t.appendChild(r);setTimeout(()=>r.remove(),560);
});
let _io;
function observeReveals(){
  if(_io)_io.disconnect();
  _io=new IntersectionObserver((es)=>{es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');_io.unobserve(en.target);}});},{threshold:.08});
  document.querySelectorAll('#view-home .card, #view-home .featured, #view-home .podium-col, .fixture-card, .merch-card, .hl-card').forEach((el,i)=>{
    if(!el.classList.contains('in')){el.classList.add('reveal');el.style.transitionDelay=Math.min(i*30,180)+'ms';_io.observe(el);}
  });
}
function countUp(el,target,dur){
  if(!el)return;const start=0,t0=performance.now();
  function step(t){const p=Math.min(1,(t-t0)/dur);const v=Math.floor(start+(target-start)*(1-Math.pow(1-p,3)));
    el.textContent=fmt(v);if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
// flip countdown digits subtly (self-contained store to avoid TDZ at startup)
function flipIfChanged(id,val){flipIfChanged._s=flipIfChanged._s||{};if(flipIfChanged._s[id]!==val){flipIfChanged._s[id]=val;const el=document.getElementById(id);if(el){el.classList.remove('cd-flip');void el.offsetWidth;el.classList.add('cd-flip');}}}

/* ════════ SPLASH ════════ */
function hideSplash(){const s=document.getElementById('splash');if(!s)return;s.classList.add('hide');
  const v=document.getElementById('splashVideo');setTimeout(()=>{s.remove();if(v)v.pause();},650);}
function initSplash(){
  const v=document.getElementById('splashVideo');
  if(!v){return;}
  v.src=ASSETS.splash;
  const p=v.play();if(p&&p.catch)p.catch(()=>{});
  v.addEventListener('ended',hideSplash);
  setTimeout(hideSplash,5000); // hard cap 5s
}


/* ════════ SETTINGS ════════ */
const prefs=[
  {ic:'public',n:'Default Country',s:'This is used to personalize your experience',opts:['United States','United Arab Emirates','France','Brazil','England','Spain']},
  {ic:'flag',n:'Favorite Team',s:'Choose your favorite national team',opts:['France','Brazil','England','Argentina','Spain','Morocco']},
  {ic:'shield',n:'Favorite Club',s:'Choose your favorite club team',opts:['Real Madrid','Barcelona','Man City','Arsenal','PSG','Bayern']},
  {ic:'schedule',n:'Timezone',s:'Select your current timezone',opts:['(GMT-5:00) Eastern Time','(GMT+0:00) GMT','(GMT+4:00) Gulf Time']},
  {ic:'event',n:'Date Format',s:'Choose your preferred date format',opts:['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD']},
  {ic:'translate',n:'Language',s:'Select your preferred language',opts:['English','Français','Español','العربية']}
];
function renderPrefs(){
  document.getElementById('prefRows').innerHTML=prefs.map(p=>`
  <div class="pref-row">
    <div class="pref-icon"><span class="material-icons-outlined">${p.ic}</span></div>
    <div class="pref-txt"><div class="pref-name">${p.n}</div><div class="pref-sub">${p.s}</div></div>
    <div class="pref-select-wrap"><select class="pref-select">${p.opts.map(o=>`<option>${o}</option>`).join('')}</select></div>
  </div>`).join('');
}
function segPick(btn){if(!btn||!btn.parentNode)return;btn.parentNode.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function pickTheme(btn,t){document.querySelectorAll('#themeRow .theme-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  if(t==='dark')toast('Dark theme is coming soon','dark_mode');else toast(t.charAt(0).toUpperCase()+t.slice(1)+' theme selected','palette');}
function pickAccent(btn,col){document.querySelectorAll('#accentRow .accent-sw').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.documentElement.style.setProperty('--purple',col);
  // derive soft + alpha
  document.documentElement.style.setProperty('--purple-a',hexA(col,.08));
  document.documentElement.style.setProperty('--purple-soft',hexA(col,.16));
  toast('Accent color updated','palette');}
function hexA(hex,a){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return `rgba(${r},${g},${b},${a})`;}

/* ════════ TRANSACTIONS ════════ */
const txData=[
  {date:'May 11, 2025',time:'10:24 AM',desc:'FC Purchase',sub:'Fan Pack',type:'purchase',amt:1000,usd:'$9.99',bal:2450,ic:'shopping_cart',col:'var(--purple)',bg:'var(--purple-a)'},
  {date:'May 11, 2025',time:'10:20 AM',desc:'Vote Cast',sub:'Kylian Mbappé',type:'vote',amt:-20,bal:1450,ic:'how_to_vote',col:'var(--blue)',bg:'rgba(61,107,255,.1)'},
  {date:'May 11, 2025',time:'09:15 AM',desc:'Premium Vote Boost',sub:'2x Vote Weight (7 Days)',type:'redemption',amt:-100,bal:1470,ic:'bolt',col:'var(--gold)',bg:'rgba(255,182,0,.12)'},
  {date:'May 10, 2025',time:'08:45 PM',desc:'Vote Cast',sub:'Jude Bellingham',type:'vote',amt:-20,bal:1570,ic:'how_to_vote',col:'var(--blue)',bg:'rgba(61,107,255,.1)'},
  {date:'May 10, 2025',time:'07:30 PM',desc:'Reward Redeemed',sub:'Premium Badge – Gold Fan',type:'redemption',amt:-150,bal:1590,ic:'redeem',col:'var(--pink)',bg:'rgba(255,32,101,.1)'},
  {date:'May 10, 2025',time:'06:10 PM',desc:'Vote Cast',sub:'Vinícius Jr.',type:'vote',amt:-20,bal:1740,ic:'how_to_vote',col:'var(--blue)',bg:'rgba(61,107,255,.1)'},
  {date:'May 9, 2025',time:'11:05 AM',desc:'FC Purchase',sub:'Starter Pack',type:'purchase',amt:500,usd:'$4.99',bal:1760,ic:'shopping_cart',col:'var(--purple)',bg:'var(--purple-a)'},
  {date:'May 9, 2025',time:'10:58 AM',desc:'Vote Cast',sub:'Erling Haaland',type:'vote',amt:-20,bal:1260,ic:'how_to_vote',col:'var(--blue)',bg:'rgba(61,107,255,.1)'},
  {date:'May 8, 2025',time:'09:22 PM',desc:'Refund',sub:'Cancelled prediction',type:'refund',amt:100,bal:1380,ic:'undo',col:'var(--green)',bg:'rgba(11,168,74,.1)'},
  {date:'May 8, 2025',time:'08:15 PM',desc:'Welcome Bonus',sub:'New fan reward',type:'redemption',amt:250,bal:1280,ic:'celebration',col:'var(--teal)',bg:'rgba(0,230,196,.12)'}
];
const TX_BADGE={purchase:['Purchase','var(--green)','rgba(11,168,74,.1)'],vote:['Vote','var(--blue)','rgba(61,107,255,.1)'],
  prediction:['Prediction','var(--purple)','var(--purple-a)'],
  redemption:['Redemption','var(--gold)','rgba(255,182,0,.14)'],refund:['Refund','var(--teal)','rgba(0,230,196,.12)']};
state.txTab='all';
// fc_ledger.type → UI tab category + how to display the row.
const LEDGER_MAP={
  purchase:            {cat:'purchase',  t:'FC Purchase',     ic:'shopping_cart',        col:'var(--purple)',  bg:'var(--purple-a)'},
  welcome_bonus:       {cat:'redemption',t:'Welcome Bonus',   ic:'celebration',          col:'var(--teal)',    bg:'rgba(0,230,196,.12)'},
  daily_reward:        {cat:'redemption',t:'Daily Reward',    ic:'local_fire_department',col:'var(--live)',    bg:'rgba(238,16,69,.1)'},
  referral_reward:     {cat:'redemption',t:'Referral Reward', ic:'group_add',            col:'var(--teal)',    bg:'rgba(0,230,196,.12)'},
  achievement_reward:  {cat:'redemption',t:'Achievement',     ic:'emoji_events',         col:'var(--gold)',    bg:'rgba(255,182,0,.14)'},
  vote_spend:          {cat:'vote',      t:'Vote Cast',       ic:'how_to_vote',          col:'var(--blue)',    bg:'rgba(61,107,255,.1)'},
  vote_refund:         {cat:'refund',    t:'Vote Refund',     ic:'undo',                 col:'var(--green)',   bg:'rgba(11,168,74,.1)'},
  prediction_stake:    {cat:'prediction',t:'FC Engaged',      ic:'insights',             col:'var(--purple-2)',bg:'var(--purple-a)'},
  prediction_payout:   {cat:'prediction',t:'Forecast Win',    ic:'emoji_events',         col:'var(--green)',   bg:'rgba(11,168,74,.1)'},
  prediction_refund:   {cat:'prediction',t:'Forecast Refund', ic:'undo',                 col:'var(--green)',   bg:'rgba(11,168,74,.1)'},
  cosmetic_purchase:   {cat:'redemption',t:'Profile Item',    ic:'auto_awesome',         col:'var(--purple)',  bg:'var(--purple-a)'},
  merch_purchase:      {cat:'redemption',t:'Merch Redemption',ic:'redeem',               col:'var(--pink)',    bg:'rgba(255,32,101,.1)'},
  treasury_contribution:{cat:'vote',     t:'Treasury',        ic:'savings',              col:'var(--blue)',    bg:'rgba(61,107,255,.1)'},
  admin_adjust:        {cat:'redemption',t:'Adjustment',      ic:'tune',                 col:'var(--ink-3)',   bg:'var(--grey-bg)'}
};
let _txLedger=[], _txRange='30';
// Pull the user's real FC ledger (every credit in/out) → the transaction history.
async function loadTransactions(){
  if(!state.user){ _txLedger=[]; renderTx(); return; }
  try{
    const {data,error}=await _sb.from('fc_ledger')
      .select('amount,type,balance_after,description,created_at')
      .order('created_at',{ascending:false}).limit(300);
    if(error){ console.warn('[transactions]',error.message); renderTx(); return; }
    _txLedger=(data||[]).map(r=>{
      const m=LEDGER_MAP[r.type]||{cat:'redemption',t:r.type,ic:'receipt_long',col:'var(--ink-3)',bg:'var(--grey-bg)'};
      const d=new Date(r.created_at), amt=Number(r.amount)||0;
      let usd='', sub=r.description||'';
      if(r.type==='purchase' && typeof fcPacks!=='undefined'){ const pk=fcPacks.find(p=>p.fc===amt); if(pk){usd=pk.price; sub=pk.name;} }
      // engagement wording for forecasts (this is a fan-engagement product, not betting)
      if(r.type==='prediction_stake') sub='Engaged in a forecast';
      else if(r.type==='prediction_payout') sub='Forecast winnings';
      else if(r.type==='prediction_refund') sub='Forecast returned';
      return { date:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
        time:d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),
        desc:m.t, sub, type:m.cat, amt, bal:Number(r.balance_after)||0,
        usd, ic:m.ic, col:m.col, bg:m.bg, ts:+d };
    });
  }catch(e){ console.warn('[transactions]',e); }
  renderTx();
}
state.txFilters={date:'all',type:'all',method:'all',status:'all'};
function setTxTab(t){state.txTab=t;document.querySelectorAll('#txTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.txtab===t));renderTx();}
function setTxRange(r){_txRange=r;renderTxSummary();}
// "Filter Transactions" panel → read the four selects and re-render (resets to All tab so the
// panel becomes the active filter). Payment Method maps to purchase (real money) vs Fan Credits.
function applyTxFilters(){
  const v=id=>{const el=document.getElementById(id);return el?el.value:'all';};
  state.txFilters={date:v('fltDate'),type:v('fltType'),method:v('fltMethod'),status:v('fltStatus')};
  state.txTab='all';document.querySelectorAll('#txTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.txtab==='all'));
  renderTx();toast('Filters applied','filter_alt');
}
function resetTxFilters(){
  ['fltDate','fltType','fltMethod','fltStatus'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='all';});
  state.txFilters={date:'all',type:'all',method:'all',status:'all'};
  renderTx();toast('Filters reset','restart_alt');
}
function renderTx(){
  const f=state.txFilters||{},now=Date.now();
  const cut=(f.date&&f.date!=='all')?(f.date==='ytd'?+new Date(new Date().getFullYear(),0,1):now-(+f.date)*864e5):0;
  const list=_txLedger.filter(x=>{
    if(state.txTab!=='all'&&x.type!==state.txTab)return false;        // active tab
    if(f.type&&f.type!=='all'&&x.type!==f.type)return false;          // panel type
    if(cut&&x.ts<cut)return false;                                    // date range
    if(f.method==='purchase'&&x.type!=='purchase')return false;       // paid with money
    if(f.method==='fc'&&x.type==='purchase')return false;             // paid with FC
    if(f.status==='pending')return false;                            // ledger entries are all completed
    return true;
  });
  document.getElementById('txList').innerHTML=list.length?list.map(t=>{
    const bdg=TX_BADGE[t.type]||['Activity','var(--ink-3)','var(--grey-bg)'];const [bl,bc,bg]=bdg;const pos=t.amt>0;
    return `<div class="tx-row">
      <div class="tx-date">${t.date}<small>${t.time}</small></div>
      <div class="tx-desc"><div class="tx-ic" style="background:${t.bg};"><span class="material-icons-round" style="color:${t.col};">${t.ic}</span></div>
        <div class="tx-desc-txt"><div class="tx-desc-t">${t.desc}</div><div class="tx-desc-s">${t.sub}</div></div></div>
      <div class="tx-type"><span class="tx-badge" style="color:${bc};background:${bg};">${bl}</span></div>
      <div class="tx-amt" style="color:${pos?'var(--green)':'var(--live)'};">${pos?'+':''}${fmt(t.amt)} FC${t.usd?`<small>${t.usd}</small>`:''}</div>
      <div class="tx-bal">${fmt(t.bal)} FC</div>
    </div>`;}).join(''):`<div class="empty-state" style="padding:30px 0;"><div class="empty-icon"><span class="material-icons-outlined">receipt_long</span></div><div class="h3">${state.user?'No transactions yet':'Sign in to see transactions'}</div><div class="small" style="color:var(--ink-3);margin-top:6px;">${state.user?'Buy Fan Credits or place a forecast.':''}</div></div>`;
  const pg=document.getElementById('txPager');if(pg)pg.innerHTML='';
  renderTxSummary();
}
function renderTxSummary(){
  const now=Date.now(), cut=_txRange==='all'?0:now-(+_txRange)*864e5;
  const rows=_txLedger.filter(t=>t.ts>=cut);
  const spent=rows.filter(t=>t.amt<0).reduce((s,t)=>s-t.amt,0);
  const earned=rows.filter(t=>t.amt>0).reduce((s,t)=>s+t.amt,0);
  const net=earned-spent;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('txSpent',fmt(spent)+' FC'); set('txEarned',fmt(earned)+' FC');
  const ne=document.getElementById('txNet');
  if(ne){ ne.textContent=(net<0?'-':'+')+fmt(Math.abs(net))+' FC'; ne.style.color=net<0?'var(--live)':'var(--green)'; }
  // balance trajectory over the range
  const el=document.getElementById('txChart');if(!el)return;
  const asc=[...rows].sort((a,b)=>a.ts-b.ts);
  if(!asc.length){ el.innerHTML=''; return; }
  const points=asc.map(t=>t.bal), n=asc.length, step=Math.max(1,Math.ceil(n/5));
  const labels=asc.map((t,i)=>(i===0||i===n-1||i%step===0)?new Date(t.ts).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'');
  el.innerHTML=trendSVG(points,labels,300,120);
}


/* ════════ PREDICTION PAYOUT ════════ */
function predPayout(stake,pct){
  pct=Math.max(1,Math.min(99,pct));
  const mult=1/(pct/100);
  const gross=stake*mult;
  const fee=gross*0.10;
  const net=gross-fee;
  return {mult,gross:Math.round(gross),fee:Math.round(fee),net:Math.round(net),profit:Math.round(net-stake)};
}
function updatePredPayout(){
  if(!curPred)return;
  const stake=+document.getElementById('predSlider').value;
  const pct=curPred.side==='a'?curPred.aPct:(100-curPred.aPct);
  const pl=predPayout(stake,pct);
  const sideLbl=curPred.side==='a'?curPred.aLabel:curPred.bLabel;
  document.getElementById('payoutBox').innerHTML=`
    <div class="pb-row"><span>Your pick</span><strong>${sideLbl} · ${pct}%</strong></div>
    <div class="pb-row"><span>Multiplier</span><strong>${pl.mult.toFixed(2)}×</strong></div>
    <div class="pb-row"><span>Gross payout</span><strong>${fmt(pl.gross)} FC</strong></div>
    <div class="pb-row"><span>Platform fee (10%)</span><strong style="color:var(--ink-3);">-${fmt(pl.fee)} FC</strong></div>
    <div class="pb-row total"><span>Potential win</span><strong style="color:var(--green);">${fmt(pl.net)} FC</strong></div>
    <div class="pb-row"><span>Potential profit</span><strong style="color:var(--green);">+${fmt(pl.profit)} FC</strong></div>`;
}

/* ════════ NOTIFICATIONS FEED + BADGES ════════ */
function addNotif(cat,icon,color,bg,t,s){
  notifs.unshift({cat,icon,color,bg,t,s,time:'just now'});
  state.unread++;updateNotifBadges();
  if(document.getElementById('view-notifications').classList.contains('active'))renderNotifs();
}
function updateNotifBadges(){
  const n=state.unread;
  document.querySelectorAll('.notif-dot').forEach(d=>d.style.display=n>0?'block':'none');
  // Bell icon: red-dot SVG when there are unread notifications, plain bell otherwise.
  document.querySelectorAll('.bell-ico').forEach(b=>b.setAttribute('src',n>0?'assets/bell-dot.svg':'assets/bell.svg'));
  const sb=document.querySelector('.sb-link[data-nav="notifications"] .sb-badge');if(sb){sb.textContent=n;sb.style.display=n>0?'flex':'none';}
}

/* ════════ GAMIFICATION (XP · levels · streak · rewards) ════════ */
const LEVELS=[
  {n:'Rookie',min:0},{n:'Bronze Fan',min:500},{n:'Silver Fan',min:1200},
  {n:'Gold Fan',min:2000},{n:'Legend Fan',min:5000},{n:'Hall of Fame',min:12000}
];
function levelFor(xp){let lv=LEVELS[0];for(const l of LEVELS)if(xp>=l.min)lv=l;return lv;}
function nextLevel(xp){return LEVELS.find(l=>l.min>xp)||null;}
function grantXP(amt,reason){
  const before=levelFor(state.xp).n;
  state.xp+=amt;
  const after=levelFor(state.xp);
  if(after.n!==before){addNotif('rankings','military_tech','var(--gold)','rgba(255,182,0,.14)','Level up! You\u2019re now '+after.n,'Keep voting and forecasting to climb higher.');toast('Level up · '+after.n+' 🎉','military_tech');}
  updateLevelUI();
}
const LVL_TARGET=[0,500,1500,3000,5000,8000,12000]; // XP to reach each level (1..6)
function updateLevelUI(){
  const p=state.profile;
  const xp=Number(p&&p.reputation_xp)||Number(state.xp)||0;
  const L=Math.max(1,Math.min(6,(p&&p.reputation_level)||1));
  const name=(typeof REP_LEVEL_NAMES!=='undefined'&&REP_LEVEL_NAMES[L])||'Rookie';
  const min=LVL_TARGET[L-1]||0, next=LVL_TARGET[L]||(min+4000);
  const pct=Math.max(0,Math.min(100,Math.round((xp-min)/((next-min)||1)*100)));
  document.querySelectorAll('.xp-fill').forEach(f=>f.style.width=pct+'%');
  document.querySelectorAll('.lvl-name').forEach(e=>e.textContent=name);
  document.querySelectorAll('.lvl-xp').forEach(e=>e.textContent=`${fmt(xp)} / ${fmt(next)} XP`);
  if(typeof pInit==='function')document.querySelectorAll('.acct-init').forEach(e=>e.textContent=pInit());
  const votes=state.myVote?1:0; // pass model: one vote per user
  ['setVotes','statVotes'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=fmt(votes);});
  const c=p&&p.country_code;
  document.querySelectorAll('.acct-country-rank .rank-country').forEach(e=>e.textContent=c||'');
}
const DAILY_LADDER=[50,75,100,150,200,300,500];
function renderDaily(){
  const wrap=document.getElementById('dailyLadder');if(!wrap)return;
  wrap.innerHTML=DAILY_LADDER.map((fc,i)=>{const day=i+1;const done=day<=state.streak;const today=day===state.streak+1;
    return `<div class="daily-day ${done?'done':''} ${today?'today':''}">
      <div class="daily-d">Day ${day}</div>
      <div class="daily-coin">${done?'<span class="material-icons-round">check</span>':`<img class="fc-coin" src="${ASSETS.fc}">`}</div>
      <div class="daily-fc">${fc}</div></div>`;}).join('');
  const claimBtn=document.getElementById('dailyClaimBtn');
  if(claimBtn){claimBtn.disabled=state.dailyClaimed;claimBtn.textContent=state.dailyClaimed?'Claimed today ✓':'Claim Day '+(state.streak+1)+' Reward';}
}
function claimDaily(){
  if(!requireAuth('Sign in to claim your daily reward'))return;
  if(state.dailyClaimed)return;
  const fc=DAILY_LADDER[Math.min(state.streak,DAILY_LADDER.length-1)];
  state.streak++;state.dailyClaimed=true;state.balance+=fc;
  syncBalance();grantXP(20,'daily');renderDaily();var dcd=document.getElementById('dailyCtaDay');if(dcd)dcd.textContent=state.streak+1;
var ml=document.getElementById('mLogo');if(ml)ml.src=ASSETS.pca;var mc2=document.getElementById('mCoin');if(mc2)mc2.src=ASSETS.fc;
  addNotif('updates','local_fire_department','var(--live)','rgba(238,16,69,.1)','Day '+state.streak+' streak! +'+fc+' FC','Come back tomorrow to keep your streak alive.');
  toast('+'+fc+' FC · Day '+state.streak+' streak 🔥','local_fire_department');
  txData.unshift({date:'Today',time:'now',desc:'Daily Reward',sub:'Day '+state.streak+' streak',type:'redemption',amt:fc,bal:state.balance,ic:'local_fire_department',col:'var(--live)',bg:'rgba(238,16,69,.1)'});
  renderTx();
}
/* welcome onboarding (once per session) */
function runWelcome(){
  if(sessionStorage.getItem('wc26_welcomed'))return;
  try{sessionStorage.setItem('wc26_welcomed','1');}catch(e){}
  setTimeout(()=>openModal('welcomeModal'),400);
}
function claimWelcome(){
  state.balance+=500;syncBalance();grantXP(100,'welcome');
  addNotif('updates','celebration','var(--teal)','rgba(0,230,196,.12)','Welcome bonus: +500 FC','You unlocked the New Fan achievement.');
  txData.unshift({date:'Today',time:'now',desc:'Welcome Bonus',sub:'New fan reward',type:'redemption',amt:500,bal:state.balance,ic:'celebration',col:'var(--teal)',bg:'rgba(0,230,196,.12)'});
  renderTx();closeModal('welcomeModal');
  toast('+500 FC welcome bonus added 🎉','celebration');
  setTimeout(()=>openModal('dailyModal'),350);
}

/* ════════ ODDS MOVEMENT → notifications ════════ */
function simulateOdds(){
  const open=state.predictions.filter(p=>p.status==='open');
  if(!open.length)return;
  const p=open[Math.floor(Math.random()*open.length)];
  // nudge implied pct; ~60% chance it moves in user's favour
  const up=Math.random()<0.6;
  const delta=1+Math.floor(Math.random()*3);
  const before=predPayout(p.fc,p.curPct).net;
  p.curPct=Math.max(5,Math.min(95,p.curPct+(up?delta:-delta)));
  const after=predPayout(p.fc,p.curPct).net;
  if(after>before){
    state.upStreak[p.market]=(state.upStreak[p.market]||0)+1;
    const streak=state.upStreak[p.market];
    const gain=after-before;
    const hot=streak>=2?' 🔥 on a roll ('+streak+'×)':'';
    addNotif('rankings','trending_up','var(--green)','rgba(11,168,74,.1)','Your forecast is climbing'+hot,'\u201C'+p.market+'\u201D · potential win now '+fmt(after)+' FC (+'+fmt(gain)+')');
    if(streak>=2)toast('Forecast heating up: '+p.market+' → '+fmt(after)+' FC','trending_up');
    renderPredHistory();
  } else {
    state.upStreak[p.market]=0;
    renderPredHistory();
  }
}


/* ════════ SETTINGS PANELS (9 distinct sections) ════════ */
function pRow(ic,name,sub,ctrl){return `<div class="pref-row"><div class="pref-icon"><span class="material-icons-outlined">${ic}</span></div><div class="pref-txt"><div class="pref-name">${name}</div><div class="pref-sub">${sub}</div></div>${ctrl}</div>`;}
function pToggle(on){return `<label class="switch"><input type="checkbox" ${on?'checked':''}><span class="slider-tg"></span></label>`;}
function pSelect(opts){return `<div class="pref-select-wrap"><select class="pref-select">${opts.map(o=>`<option>${o}</option>`).join('')}</select></div>`;}
function pSeg(opts,act){return `<div class="seg">${opts.map((o,i)=>`<button class="seg-btn ${i===(act||0)?'active':''}" onclick="segPick(this)">${o}</button>`).join('')}</div>`;}
function lkRow(ic,name,sub,right){return `<button class="link-row" onclick="${right?'':''}"><span class="lr-ic"><span class="material-icons-outlined">${ic}</span></span><div style="flex:1;min-width:0;"><div class="pref-name">${name}</div><div class="pref-sub">${sub}</div></div>${right||'<span class="material-icons-round chev">chevron_right</span>'}</button>`;}

/* ---- real profile accessors + Settings actions ---- */
function escAttr(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function pName(){return (state.profile&&state.profile.display_name)||(state.user&&state.user.email?state.user.email.split('@')[0]:'')||'';}
function pInit(){const n=pName()||'FC';return ((n.match(/[A-Za-z0-9]+/g)||['F','C']).map(w=>w[0]).join('').slice(0,2)||'FC').toUpperCase();}
function pSince(){const t=(state.profile&&state.profile.created_at)||(state.user&&state.user.created_at);return t?new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';}
function selSet(id,opts,sel){const list=sel&&opts.indexOf(sel)<0?[sel,...opts]:opts;return `<select id="${id}" class="select-input">${list.map(o=>`<option${o===sel?' selected':''}>${escAttr(o)}</option>`).join('')}</select>`;}
async function saveAccountInfo(){
  if(!requireAuth())return; const name=(document.getElementById('setFullName').value||'').trim();
  const {error}=await _sb.from('profiles').update({display_name:name}).eq('id',state.user.id);
  if(error){toast(error.message,'error');return;}
  state.profile.display_name=name; renderProfileHero(); renderAuthUI(); toast('Account changes saved','check');
}
async function changeEmail(){
  if(!requireAuth())return; const email=(document.getElementById('setEmail').value||'').trim();
  if(!/.+@.+\..+/.test(email)){toast('Enter a valid email','error');return;}
  const {error}=await _sb.auth.updateUser({email});
  if(error){toast(error.message,'error');return;} toast('Confirmation sent to '+email,'mail');
}
async function changeUsername(){
  if(!requireAuth())return; const u=(document.getElementById('setUsername').value||'').trim().replace(/^@/,'');
  if(!u){toast('Enter a username','error');return;}
  const {error}=await _sb.from('profiles').update({username:u}).eq('id',state.user.id);
  if(error){toast(/duplicate|unique|23505/i.test(error.message||error.code||'')?'Username already taken':error.message,'error');return;}
  state.profile.username=u; renderProfileHero(); toast('Username updated','check');
}
async function saveProfile(){
  if(!requireAuth())return;
  const upd={display_name:(document.getElementById('setDispName').value||'').trim(),
    bio:(document.getElementById('setBio').value||'').trim(),
    favorite_club:document.getElementById('setFavClub').value,
    country_code:document.getElementById('setFavTeam').value};
  const {error}=await _sb.from('profiles').update(upd).eq('id',state.user.id);
  if(error){toast(error.message,'error');return;}
  Object.assign(state.profile,upd); renderProfileHero(); renderAuthUI(); toast('Profile updated','check');
}
async function updatePassword(){
  if(!requireAuth())return;
  const np=document.getElementById('setNewPass').value, cp=document.getElementById('setConfPass').value;
  if(!np||np.length<6){toast('Password must be at least 6 characters','lock');return;}
  if(np!==cp){toast('Passwords do not match','error');return;}
  const {error}=await _sb.auth.updateUser({password:np});
  if(error){toast(error.message,'error');return;}
  document.getElementById('setNewPass').value='';document.getElementById('setConfPass').value='';
  toast('Password updated','lock');
}
const SET_PANELS={
  account:()=>`
    <div class="card set-card">
      <div class="set-card-title">Account Information</div>
      <div class="acct-grid">
        <div class="acct-avatar-col"><div class="set-label">Profile Picture</div>
          <div class="acct-avatar"><div class="profile-avatar" style="width:64px;height:64px;font-size:22px;">${pInit()}</div>
            <button class="acct-cam" onclick="toast('Photo upload coming soon','photo_camera')"><span class="material-icons-round">photo_camera</span></button></div></div>
        <div class="acct-fields">
          <div class="field"><label class="set-label">Full Name</label><input id="setFullName" class="text-input" value="${escAttr(pName())}"></div>
          <div class="field"><label class="set-label">Email Address</label><div class="field-inline"><input id="setEmail" class="text-input" value="${escAttr((state.user&&state.user.email)||'')}"><button class="link-btn" onclick="changeEmail()">Change</button></div></div>
          <div class="field"><label class="set-label">Username</label><div class="field-inline"><input id="setUsername" class="text-input" value="${escAttr((state.profile&&state.profile.username)?'@'+state.profile.username:'')}"><button class="link-btn" onclick="changeUsername()">Change</button></div></div>
          <div class="field"><label class="set-label">Member Since</label><div class="text-input static"><span class="material-icons-outlined">event</span>${pSince()}</div></div>
        </div></div>
    </div>
    <div class="card set-card">
      <div class="set-card-title">Voting Preferences</div>
      ${pRow('check_circle','Vote Confirmation','Show a confirmation after each vote',pToggle(true))}
    </div>
    <button class="btn btn-primary" style="align-self:flex-start;" onclick="saveAccountInfo()">Save Changes</button>`,

  profile:()=>`
    <div class="card set-card">
      <div class="set-card-title">Public Profile</div>
      <div class="field" style="margin-bottom:14px;"><label class="set-label">Display Name</label><input id="setDispName" class="text-input" value="${escAttr(pName())}"></div>
      <div class="field" style="margin-bottom:14px;"><label class="set-label">Bio</label><textarea id="setBio" class="text-input" rows="3" style="resize:vertical;" placeholder="Tell other fans about yourself…">${escAttr((state.profile&&state.profile.bio)||'')}</textarea></div>
      <div class="acct-fields">
        <div class="field"><label class="set-label">Favorite National Team</label>${selSet('setFavTeam',['France','Brazil','England','Argentina','Spain','Morocco','Germany','Morocco','United States','Mexico','Canada'],(state.profile&&state.profile.country_code)||'')}</div>
        <div class="field"><label class="set-label">Favorite Club</label>${selSet('setFavClub',['Real Madrid','Barcelona','Man City','Arsenal','PSG','Bayern','Liverpool','Chelsea'],(state.profile&&state.profile.favorite_club)||'')}</div>
      </div>
    </div>
    <div class="card set-card">
      <div class="set-card-title">Visibility</div>
      ${pRow('visibility','Profile Visibility','Who can view your fan profile',pSeg(['Public','Friends','Private'],0))}
      ${pRow('flag','Show Country Flag','Display your flag on your profile & votes',pToggle(true))}
      ${pRow('leaderboard','Show on Leaderboards','Appear in global & country rankings',pToggle(true))}
    </div>
    <button class="btn btn-primary" style="align-self:flex-start;" onclick="saveProfile()">Save Profile</button>`,

  preferences:()=>`
    <div class="card set-card">
      <div class="set-card-title">App Preferences</div>
      ${pRow('public','Default Country','Used to personalize your experience',pSelect(['United States','United Arab Emirates','France','Brazil','England','Spain']))}
      ${pRow('schedule','Timezone','Your current timezone',pSelect(['(GMT-5:00) Eastern Time','(GMT+0:00) GMT','(GMT+4:00) Gulf Time']))}
      ${pRow('event','Date Format','How dates are displayed',pSelect(['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD']))}
    </div>
    <div class="card set-card">
      <div class="set-card-title">Experience</div>
      ${pRow('play_circle','Auto-play Highlights','Autoplay match highlights previews',pToggle(false))}
      ${pRow('animation','Reduce Motion','Minimize animations across the app',pToggle(false))}
      ${pRow('volume_up','Sound Effects','Play sounds for votes & rewards',pToggle(true))}
      ${pRow('vibration','Haptics','Vibration feedback on actions',pToggle(true))}
    </div>`,

  notifications:()=>`
    <div class="card set-card">
      <div class="set-card-title">Channels</div>
      ${pRow('notifications_active','Push Notifications','Receive alerts on this device',pToggle(true))}
      ${pRow('mail','Email Notifications','Receive updates by email',pToggle(true))}
    </div>
    <div class="card set-card">
      <div class="set-card-title">Activity Alerts</div>
      ${pRow('how_to_vote','Daily Vote Reminder','Remind me to vote each day',pToggle(true))}
      ${pRow('local_fire_department','Streak Expiry Reminder','Warn me before my streak ends',pToggle(true))}
      ${pRow('insights','Prediction Results','When a forecast settles',pToggle(true))}
      ${pRow('trending_up','Odds Movement Alerts','When my forecast value changes',pToggle(true))}
      ${pRow('leaderboard','Rank Changes','When my rank moves up or down',pToggle(true))}
      ${pRow('person_add','New Player Added','When a new player is available to vote',pToggle(false))}
    </div>
    <div class="card set-card">
      <div class="set-card-title">Marketing</div>
      ${pRow('campaign','Product News & Offers','Occasional news and promotions',pToggle(false))}
    </div>`,

  privacy:()=>`
    <div class="card set-card">
      <div class="set-card-title">Change Password</div>
      <div class="acct-fields">
        <div class="field"><label class="set-label">New Password</label><input id="setNewPass" class="text-input" type="password" placeholder="••••••••"></div>
        <div class="field"><label class="set-label">Confirm New Password</label><input id="setConfPass" class="text-input" type="password" placeholder="••••••••"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px;" onclick="updatePassword()">Update Password</button>
    </div>
    <div class="card set-card">
      <div class="set-card-title">Security</div>
      ${pRow('verified_user','Two-Factor Authentication','Add an extra layer of security',pToggle(false))}
      ${pRow('login','Login Alerts','Notify me of new sign-ins',pToggle(true))}
      ${lkRow('devices','Active Sessions','2 devices currently signed in')}
      ${lkRow('logout','Sign Out Everywhere','End all other active sessions')}
    </div>
    <div class="card set-card">
      <div class="set-card-title">Privacy</div>
      ${pRow('lock','Private Profile','Only approved followers can view',pToggle(false))}
      ${pRow('visibility_off','Hide My Votes','Keep my voting history private',pToggle(false))}
      ${pRow('search','Searchable by Username','Let others find me by @username',pToggle(true))}
      ${lkRow('block','Blocked Users','Manage your blocked list')}
    </div>`,

  linked:()=>`
    <div class="card set-card">
      <div class="set-card-title">Connected Accounts</div>
      ${connRow('google','Google','alex.fan@gmail.com',true)}
      ${connRow('apple','Apple','Hidden email',true)}
      ${connRow('meta','Meta','Not connected',false)}
      ${connRow('x','X (Twitter)','Not connected',false)}
      ${connRow('discord','Discord','Not connected',false)}
      <p class="caption" style="color:var(--ink-4);margin-top:14px;line-height:1.6;">Linking accounts lets you sign in faster and find friends who already play.</p>
    </div>`,

  payment:()=>`
    <div class="card set-card">
      <div class="set-card-title">Payment Methods</div>
      <div class="pay-method"><div class="pay-brand" style="background:#000;">Pay</div><div><div class="pref-name">Apple Pay</div><div class="pref-sub">alex.fan@email.com</div></div><span class="pay-default">Default</span></div>
      <div class="pay-method"><div class="pay-brand" style="background:linear-gradient(135deg,#1a1f71,#2f80ff);">VISA</div><div><div class="pref-name">Visa •••• 4242</div><div class="pref-sub">Expires 08/27</div></div></div>
      <button class="btn btn-secondary btn-block" onclick="toast('Add payment method','add_card')"><span class="material-icons-round">add</span>Add Payment Method</button>
    </div>
    <div class="card set-card">
      <div class="set-card-title">Subscription</div>
      ${lkRow('workspace_premium','Premium Vote Boost','Active · renews monthly','<span class="conn-btn connected">Active</span>')}
      ${lkRow('receipt_long','Billing History','View purchases & receipts')}
      <button class="btn btn-secondary btn-block" style="margin-top:6px;" onclick="go('transactions')">Open Transaction History</button>
    </div>`,

  language:()=>`
    <div class="card set-card">
      <div class="set-card-title">Language</div>
      ${['English','Français','Español','العربية','Português','Deutsch','日本語','中文'].map((l,i)=>`
        <div class="radio-item ${i===0?'sel':''}" onclick="pickLang(this,'${l}')"><div class="radio-dot"></div><div style="flex:1;"><div class="ri-name">${l}</div></div></div>`).join('')}
    </div>
    <div class="card set-card">
      <div class="set-card-title">Region & Format</div>
      ${pRow('public','Region','Content & matches relevant to you',pSelect(['United States','Middle East','Europe','South America']))}
      ${pRow('format_textdirection_r_to_l','Right-to-Left Layout','Auto-enabled for Arabic & Hebrew',pToggle(false))}
    </div>`,

  about:()=>`
    <div class="card set-card">
      <div class="about-version">
        <img class="about-logo" src="${ASSETS.pca}" alt="PCA">
        <div class="h3" style="font-size:18px;">PCA · WC26 Fan Vote</div>
        <div class="caption" style="color:var(--ink-3);">Version 1.0.0 · World Cup 2026 Special Edition</div>
      </div>
      ${lkRow('auto_awesome','What\u2019s New','See the latest features & updates')}
      ${lkRow('description','Terms of Use','Read our terms of service')}
      ${lkRow('shield','Privacy Policy','How we handle your data')}
      ${lkRow('cookie','Cookie Policy','Manage cookie preferences')}
      ${lkRow('code','Open-Source Licenses','Third-party software notices')}
      ${lkRow('star','Rate the App','Enjoying WC26 Fan Vote?')}
      ${lkRow('support_agent','Contact Support','Get help from our team')}
      <p class="caption" style="color:var(--ink-4);text-align:center;margin-top:16px;line-height:1.6;">Fan Credits have no cash value. Not a gambling product.<br>© 2026 PCA · Not affiliated with FIFA.</p>
    </div>`
};
function pSelectInline(opts){return `<select class="select-input">${opts.map(o=>`<option>${o}</option>`).join('')}</select>`;}
function connRow(brand,name,sub,connected){
  const ICON={google:'mail',apple:'phone_iphone',meta:'groups',x:'tag',discord:'forum'}[brand]||'link';
  return `<div class="link-row" style="cursor:default;"><span class="lr-ic"><span class="material-icons-outlined">${ICON}</span></span>
    <div style="flex:1;min-width:0;"><div class="pref-name">${name}</div><div class="pref-sub">${sub}</div></div>
    <button class="conn-btn ${connected?'connected':''}" onclick="toggleConn(this,'${name}')">${connected?'Connected':'Connect'}</button></div>`;
}
function toggleConn(btn,name){
  const on=btn.classList.toggle('connected');btn.textContent=on?'Connected':'Connect';
  toast(name+(on?' connected':' disconnected'),on?'link':'link_off');
}
function pickLang(el,lang){document.querySelectorAll('#settingsPanel .radio-item').forEach(r=>r.classList.remove('sel'));el.classList.add('sel');toast(lang+' selected','language');}
function setSettingsPanel(key){
  state.setPanel=key;
  document.querySelectorAll('#settingsNav .set-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.set===key));
  const el=document.getElementById('settingsPanel');
  if(el){
    el.innerHTML=(SET_PANELS[key]||SET_PANELS.account)();
    // Sign Out lives at the bottom of the Account panel, only when logged in.
    if(key==='account'&&state.user){
      el.insertAdjacentHTML('beforeend','<button class="btn btn-secondary btn-block" onclick="signOut()" style="margin-top:16px;">Sign Out</button>');
    }
  }
}


