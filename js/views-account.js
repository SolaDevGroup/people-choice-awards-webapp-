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
  voteHistory.innerHTML=state.myVotes.slice(0,5).map(v=>`
  <div class="hist-row">
    <div class="avatar" style="width:38px;height:38px;font-size:12px;">${v.short||v.player.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
    <div><div class="hist-title">${v.player}</div><div class="hist-sub">${v.date}</div></div>
    <div class="hist-amt" style="color:var(--purple);">${v.fc} FC</div>
  </div>`).join('');
  statVotes.textContent=fmt(state.totalVotes);
}

/* ════════ ANALYTICS ════════ */
function ageBarsHTML(){
  const data=[['<20',28],['20-24',58],['25-29',92],['30-34',64],['35+',38]];
  const max=Math.max(...data.map(d=>d[1]));
  return `<div style="display:flex;align-items:flex-end;gap:12px;height:140px;padding-top:8px;">
    ${data.map(([l,v])=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;">
      <div style="width:100%;max-width:34px;height:${v/max*100}%;background:var(--purple-2);border-radius:6px 6px 0 0;"></div>
      <div class="caption" style="color:var(--ink-3);font-size:10px;font-weight:600;">${l}</div></div>`).join('')}
  </div>`;
}
function multiDonut(){
  const size=128,thick=20,r=(size-thick)/2,c=2*Math.PI*r;
  const segs=[[45,'#FF2065'],[30,'#6640FF'],[20,'#3D6BFF'],[5,'#FFB600']];
  let acc=0,out='';
  segs.forEach(([pct,col])=>{
    out+=`<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="${thick}"
      stroke-dasharray="${c*pct/100-2} ${c-(c*pct/100-2)}" stroke-dashoffset="${-c*acc/100}" transform="rotate(-90 ${size/2} ${size/2})"/>`;
    acc+=pct;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;">${out}</svg>`;
}
function renderAnalytics(){
  anTrend.innerHTML=sparkline(7,560,180,true);
  anMap.innerHTML=worldMap();
  posDonut.innerHTML=multiDonut();
  ageBars.innerHTML=ageBarsHTML();
}

/* ════════ FC STORE ════════ */
function renderFcPacks(){
  fcPackList.innerHTML=fcPacks.map((p,i)=>`
  <div class="plan-card ${p.pop?'selected':''}" style="border:1.5px solid ${p.pop?'var(--purple)':'var(--border)'};" onclick="buyPack(${i})">
    <div style="display:flex;align-items:center;gap:12px;">
      <div class="hist-icon" style="background:rgba(255,182,0,.12);">${fcCoin}</div>
      <div><div style="font-size:14px;font-weight:800;">${p.name}${p.pop?' <span class="premium-pill" style="vertical-align:2px;">Best value</span>':''}</div>
      <div class="caption" style="color:var(--ink-3);">${fmt(p.fc)} Fan Credits</div></div>
    </div>
    <div style="font-size:15px;font-weight:900;">${p.price}</div>
  </div>`).join('');
}
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
}

