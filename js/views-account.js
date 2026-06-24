/* ════════ NOTIFICATIONS ════════ */
function setNotifTab(t){state.nf=t;document.querySelectorAll('#notifChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.nf===t));renderNotifs();}
function renderNotifs(){
  notifList.innerHTML=notifs.filter(n=>state.nf==='all'||n.cat===state.nf).map(n=>`
  <div class="notif-row">
    <div class="hist-icon" style="background:${n.bg};"><span class="material-icons-round" style="color:${n.color};">${n.icon}</span></div>
    <div><div class="hist-title">${n.t}</div><div class="hist-sub">${n.s}</div></div>
    <div class="notif-time">${n.time}</div>
  </div>`).join('');
}

/* ════════ PROFILE ════════ */
function renderProfile(){
  renderProfileHero();updateChromeAvatars();
  badgeStrip.innerHTML=badges.map(b=>`
  <div class="badge-it ${b.locked?'locked':''}"><div class="badge-medal">${b.e}</div><div class="badge-it-n">${b.n}</div></div>`).join('');
  achList.innerHTML=achievements.map(a=>`
  <div class="hist-row">
    <div class="hist-icon" style="background:${a.done?'rgba(11,168,74,.1)':'var(--grey-bg)'};">
      <span class="material-icons-round" style="color:${a.done?'var(--green)':'var(--ink-4)'};">${a.i}</span></div>
    <div><div class="hist-title">${a.n}</div><div class="hist-sub">${a.s}</div></div>
    <div class="hist-amt">${a.done?'<span class="material-icons-round" style="color:var(--green);font-size:19px;">check_circle</span>':'<span class="lbl-xs">In progress</span>'}</div>
  </div>`).join('');
  // Real voting history: the player this user voted for (Supporter-Pass model = one vote).
  let myV=[];
  if(state.myVote&&state.myVote.player_id&&typeof players!=='undefined'){
    const pl=players.find(x=>x.dbId===state.myVote.player_id);
    if(pl)myV=[{player:pl.name,short:pl.short,changed:state.myVote.changes_used>0}];
  }
  voteHistory.innerHTML=myV.length?myV.map(v=>`
  <div class="hist-row">
    <div class="avatar" style="width:38px;height:38px;font-size:12px;">${v.short||v.player.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
    <div><div class="hist-title">${v.player}</div><div class="hist-sub">${v.changed?'Changed once':'Your vote'}</div></div>
    <div class="hist-amt" style="color:var(--green);">✓ Voted</div>
  </div>`).join(''):`<div class="empty-state" style="padding:22px 0;"><div class="empty-icon"><span class="material-icons-outlined">how_to_vote</span></div><div class="h3">${state.user?'No vote yet':'Sign in to vote'}</div></div>`;
  if(typeof statVotes!=='undefined'&&statVotes)statVotes.textContent=fmt(state.myVote?1:0);
}

/* ════════ ANALYTICS (real, system-wide) ════════ */
// Bucket any roster position string (GK/DEF/MID/FWD or Goalkeeper/Defender/…/Attacker)
// into one of four categories for the distribution donut.
function posCategory(pos){
  const p=String(pos||'').trim().toUpperCase();
  if(p.startsWith('G'))return 'GK';
  if(p.startsWith('D'))return 'DEF';
  if(p.startsWith('M'))return 'MID';
  if(p.startsWith('F')||p.startsWith('A')||p.startsWith('W')||p.startsWith('S'))return 'FWD';
  return 'MID';
}
// Donut from real segments: [{pct, color}, …]
function multiDonut(segs){
  const size=128,thick=20,r=(size-thick)/2,c=2*Math.PI*r;
  segs=(segs&&segs.length)?segs:[{pct:100,color:'var(--border)'}];
  let acc=0,out='';
  segs.forEach(s=>{const pct=Math.max(0,s.pct||0);if(pct<=0)return;
    const dash=Math.max(0,c*pct/100-2);
    out+=`<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thick}"
      stroke-dasharray="${dash.toFixed(2)} ${(c-dash).toFixed(2)}" stroke-dashoffset="${(-c*acc/100).toFixed(2)}" transform="rotate(-90 ${size/2} ${size/2})"/>`;
    acc+=pct;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;">${out}</svg>`;
}
// Position distribution = share of votes cast for players of each position (live roster
// votes). With no votes yet it falls back to the roster make-up so the donut isn't empty.
function renderPositionDonut(){
  const votes={FWD:0,MID:0,DEF:0,GK:0},roster={FWD:0,MID:0,DEF:0,GK:0};
  let votesTotal=0,rosterTotal=0;
  ((typeof players!=='undefined')?players:[]).forEach(p=>{const cat=posCategory(p.pos),w=Number(p.votes)||0;
    votes[cat]+=w;votesTotal+=w;roster[cat]+=1;rosterTotal+=1;});
  // real fan-vote distribution: share of votes by the voted player's position. Falls back
  // to the roster make-up only when nobody has voted yet (so the donut is never empty).
  const useVotes=votesTotal>0;
  const src=useVotes?votes:roster, total=(useVotes?votesTotal:rosterTotal)||1;
  const order=[['FWD','#FF2065'],['MID','#6640FF'],['DEF','#3D6BFF'],['GK','#FFB600']];
  if(typeof posDonut!=='undefined'&&posDonut)posDonut.innerHTML=multiDonut(order.map(([k,col])=>({pct:src[k]/total*100,color:col})));
  const lp=document.querySelectorAll('#view-analytics .legend .legend-pct');
  order.forEach(([k],i)=>{if(lp[i])lp[i].textContent=Math.round(src[k]/total*100)+'%';});
}
// Vote trend — cumulative votes over the last 7 days (smooth-curve chart, same as player detail)
function renderAnTrend(trend){
  const el=document.getElementById('anTrend');if(!el)return;
  trend=Array.isArray(trend)?trend:[];
  const points=trend.map(d=>Number(d.count)||0);
  const labels=trend.map(d=>{const dt=new Date(d.day+'T00:00:00');return isNaN(dt)?String(d.day):dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});});
  el.innerHTML=trendSVG(points.length?points:[0,0],labels.length?labels:['',''],560,180);
}
// Country support — reuse the player-detail support map with system-wide vote counts
function renderAnCountry(country){
  country=Array.isArray(country)?country:[];
  const byCountry={};
  country.forEach(c=>{const code=c.code;if(!code)return;
    const name=(typeof SIGNUP_CODE!=='undefined'&&(SIGNUP_CODE[String(code).toUpperCase()]||SIGNUP_CODE[code]))||code;
    byCountry[name]=(byCountry[name]||0)+(Number(c.count)||0);});
  const el=document.getElementById('anMap');
  if(el&&!el.querySelector('.map-loading'))el.innerHTML='<div class="map-loading"></div>';
  if(typeof renderSupportMap==='function')renderSupportMap('anMap',byCountry);
}
// Age distribution — bars from registered fans' date_of_birth
function renderAnAge(age){
  const el=document.getElementById('ageBars');if(!el)return;
  age=Array.isArray(age)?age:[];
  const order=['<20','20-24','25-29','30-34','35+'];
  const m={};age.forEach(a=>{m[a.bucket]=Number(a.count)||0;});
  const data=order.map(b=>[b,m[b]||0]);
  const max=Math.max(1,...data.map(d=>d[1]));
  const any=data.some(d=>d[1]>0);
  el.innerHTML=`<div style="display:flex;align-items:flex-end;gap:12px;height:140px;padding-top:8px;">
    ${data.map(([l,v])=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;">
      <div title="${v} fan${v===1?'':'s'}" style="width:100%;max-width:34px;height:${any?(v/max*100):0}%;min-height:${v>0?4:0}px;background:var(--purple-2);border-radius:6px 6px 0 0;transition:height .5s ease;"></div>
      <div class="caption" style="color:var(--ink-3);font-size:10px;font-weight:600;">${l}</div></div>`).join('')}
  </div>${any?'':'<div class="caption" style="text-align:center;color:var(--ink-4);margin-top:10px;">No data yet — votes from fans with a birth date populate this.</div>'}`;
}
async function renderAnalytics(){
  renderPositionDonut(); // instant, from the live roster
  if(typeof _sb==='undefined'||!_sb){renderAnTrend([]);renderAnAge([]);return;}
  try{
    const {data,error}=await _sb.rpc('get_analytics');
    if(error)throw error;
    renderAnTrend((data&&data.trend)||[]);
    renderAnCountry((data&&data.country)||[]);
    renderAnAge((data&&data.age)||[]);
  }catch(e){
    console.warn('[analytics] aggregate load failed:',e.message||e);
    renderAnTrend([]);renderAnCountry([]);renderAnAge([]);
  }
}

/* ════════ FC STORE ════════ */
function renderFcPacks(){
  if(typeof state.fcPack!=='number')state.fcPack=2; // default selection (Ultra Pack), as in the design
  fcPackList.innerHTML=fcPacks.map((p,i)=>`
  <button class="fc-pack${i===state.fcPack?' selected':''}" onclick="selectPack(${i})" aria-pressed="${i===state.fcPack}">
    <div class="fc-pack-top">
      <div class="fc-pack-info">
        <div class="fc-pack-name">${p.name}</div>
        <div class="fc-pack-amt">${fmt(p.fc)} FC</div>
      </div>
      <img class="fc-coin fc-pack-coin" src="${ASSETS.fc}" alt="FC">
    </div>
    <div class="fc-pack-bottom">
      ${p.badge?`<span class="fc-badge ${p.badgeType||'purple'}">${p.badge}</span>`:'<span class="fc-badge-spacer"></span>'}
      <div class="fc-pack-price">${p.price}</div>
    </div>
  </button>`).join('');
}
function selectPack(i){state.fcPack=i;renderFcPacks();} // highlight the chosen pack
function creditsCheckout(){buyPack(typeof state.fcPack==='number'?state.fcPack:2);} // Card Payment → checkout selected pack
// FC pack keys aligned with fcPacks order (data.js) and the Edge Function CATALOG.
const PACK_KEYS=['starter','fan','ultra','legend','champion'];
function buyPack(i){
  if(!requireAuth('Sign in to buy Fan Credits'))return;
  const key=PACK_KEYS[i]; if(!key)return;
  // Real Stripe Checkout → the webhook credits the FC to the profile on success.
  stripeCheckout(key);
}
function syncBalance(){
  navBalance.textContent=fmt(state.balance);
  homeBalance.textContent=fmt(state.balance);
  statBalance.textContent=fmt(state.balance);
  const sb=document.getElementById('storeBalance');if(sb)sb.textContent=fmt(state.balance);
  ['sbBalance','hdrBalance','mBalance'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=fmt(state.balance);});
  // Cache the real balance so the next reload shows it instantly (no flash to a placeholder).
  try{localStorage.setItem('wc26_balance',String(state.balance||0));}catch(e){}
}

