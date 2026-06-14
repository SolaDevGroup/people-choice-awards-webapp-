/* ════════ HOME ════════ */
function renderFeatured(){
  const p=players[0];
  document.getElementById('featuredCard').innerHTML=`
  <div class="featured">
    <div>
      <span class="lbl-xs">Daily Featured</span>
      <div class="featured-name">${p.first} ${p.last}</div>
      <div class="featured-meta"><span>${p.flag} ${p.country}</span><span class="dot"></span><span>${posName(p.pos)}</span></div>
      <button class="btn btn-primary btn-sm" onclick="openVote('${p.id}')">Vote Now</button>
    </div>
    <div class="pcard featured-photo" onclick="openPlayer('${p.id}','home')">${pcardHTML(p,64)}</div>
  </div>`;
}
function posName(c){return{FWD:'Forward',MID:'Midfielder',DEF:'Defender',GK:'Goalkeeper'}[c]}

function podiumHTML(list){
  const order=[list[1],list[0],list[2]],ranks=[2,1,3];
  return order.map((p,i)=>{const r=ranks[i];return `
  <div class="podium-col ${r===1?'first':''}">
    <div class="podium-wrap">
      <div class="podium-rank r${r}">${r}</div>
      <div class="pcard podium-card" onclick="openPlayer('${p.id}','leaderboard')">
        ${pcardHTML(p,r===1?86:68)}
        <div class="podium-votes">${fmtV(p.votes)}</div>
        <div class="podium-votes-lbl">Votes</div>
      </div>
    </div>
    <div class="podium-name">${p.name}</div>
    <div class="podium-sub">${fmtV(p.votes)}</div>
  </div>`}).join('');
}
function renderHomePodium(){document.getElementById('homePodium').innerHTML=podiumHTML(players.slice(0,3));}

function renderHomeTrending(){
  const t=[...players].sort((a,b)=>b.trend-a.trend).slice(0,8);
  document.getElementById('homeTrending').innerHTML=t.map(p=>`
  <button class="trend-item" onclick="openPlayer('${p.id}','home')">
    ${avatarHTML(p,54)}<div class="trend-item-name">${p.name.split(' ').slice(-1)[0]}</div>
  </button>`).join('');
}


function hbars(data,maxW){
  const max=Math.max(...data.map(d=>d.v));
  return `<div style="display:flex;flex-direction:column;gap:12px;">${data.map(d=>`
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:84px;font-size:12px;font-weight:600;color:var(--ink-2);flex-shrink:0;">${d.n}</div>
      <div style="flex:1;height:9px;border-radius:100px;background:var(--grey-bg);overflow:hidden;">
        <div style="height:100%;width:${d.v/max*100}%;background:${d.c};border-radius:100px;transition:width .6s cubic-bezier(0,.2,.4,1);"></div></div>
      <div style="width:42px;text-align:right;font-size:12px;font-weight:800;font-variant-numeric:tabular-nums;">${d.v}%</div>
    </div>`).join('')}</div>`;
}
function renderHomeExtra(){
  const hg=document.getElementById('homeGames');
  if(hg)hg.innerHTML='<div class="fixtures-grid">'+fixtures.slice(0,3).map(f=>`
    <div class="fixture-card ${f.live?'islive':''}" onclick="go('games')" style="cursor:pointer;">
      ${f.live?'<span class="fixture-live">● LIVE</span>':''}
      <div class="fixture-teams"><div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.a)}</div><div class="fixture-name">${f.a}</div></div>
      <div class="fixture-vs">VS</div><div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.b)}</div><div class="fixture-name">${f.b}</div></div></div>
      <div class="fixture-meta">Group ${f.group} · ${f.kick}</div></div>`).join('')+'</div>';
  document.getElementById('homePulse').innerHTML=sparkline(11,560,170,true);
  document.getElementById('homeRegions').innerHTML=hbars([
    {n:'UEFA',v:42,c:'#4000FF'},{n:'CONMEBOL',v:27,c:'#FF2065'},{n:'CONCACAF',v:14,c:'#00E6C4'},
    {n:'CAF',v:11,c:'#FFB600'},{n:'AFC',v:6,c:'#3D6BFF'}
  ]);
}

/* ════════ VOTE LIST ════════ */
function prowHTML(p,rank){
  return `
  <div class="prow" onclick="openPlayer('${p.id}','vote')">
    <div class="p-rank">${rank}</div>
    ${avatarHTML(p)}
    <div class="p-info"><div class="p-name">${p.name}</div><div class="p-meta">${p.country} · ${p.club}</div></div>
    <div class="p-votes"><div class="p-votes-num">${fmtV(p.votes)}</div>${trendHTML(p.trend)}</div>
    <button class="fav-btn ${state.favs.has(p.id)?'faved':''}" onclick="event.stopPropagation();toggleFav('${p.id}',this)" aria-label="Favourite">
      <span class="material-icons-round">${state.favs.has(p.id)?'favorite':'favorite_border'}</span>
    </button>
  </div>`;
}
function setPos(pos){state.pos=pos;document.querySelectorAll('#posChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.pos===pos));renderVoteList();}
function fillDropdowns(){
  const cs=[...new Set(players.map(p=>p.country))].sort(),cl=[...new Set(players.map(p=>p.club))].sort();
  ddCountry.innerHTML='<option value="">Country</option>'+cs.map(c=>`<option>${c}</option>`).join('');
  ddClub.innerHTML='<option value="">Club</option>'+cl.map(c=>`<option>${c}</option>`).join('');
}
function renderVoteList(){
  const q=(playerSearch.value||'').toLowerCase().trim();
  const co=ddCountry.value,cb=ddClub.value,so=ddSort.value;
  let list=players.filter(p=>
    (state.pos==='all'||p.pos===state.pos)&&(!co||p.country===co)&&(!cb||p.club===cb)&&
    (!q||p.name.toLowerCase().includes(q)||p.country.toLowerCase().includes(q)||p.club.toLowerCase().includes(q)));
  if(so==='trend')list=[...list].sort((a,b)=>b.trend-a.trend);
  else if(so==='name')list=[...list].sort((a,b)=>a.name.localeCompare(b.name));
  else list=[...list].sort((a,b)=>b.votes-a.votes);
  voteList.innerHTML=list.map(p=>prowHTML(p,players.indexOf(p)+1)).join('');
  voteEmpty.style.display=list.length?'none':'block';
}
function toggleFav(id,btn){
  if(state.favs.has(id))state.favs.delete(id);
  else{state.favs.add(id);toast('Added to favourites','favorite');}
  btn.classList.toggle('faved',state.favs.has(id));
  btn.querySelector('.material-icons-round').textContent=state.favs.has(id)?'favorite':'favorite_border';
}

/* ════════ VOTE FLOW ════════ */
function openVote(id){
  if(!requireAuth('Sign in to vote'))return;
  const p=players.find(x=>x.id===id);state.votingFor=p;
  voteModalPlayer.innerHTML=`${avatarHTML(p,52)}
    <div><div style="font-size:16px;font-weight:800;">${p.name}</div>
    <div class="caption" style="color:var(--ink-3);">${p.country} · ${p.club} · Rank #${players.indexOf(p)+1}</div></div>`;
  allocSlider.max=Math.max(50,state.balance);
  allocSlider.value=Math.min(250,state.balance);
  updateAlloc(allocSlider.value);
  allocMax.textContent=fmt(state.balance);
  openModal('voteModal');
}
function updateAlloc(v){allocNum.textContent=fmt(+v);}
function setAlloc(v){allocSlider.value=Math.min(v,+allocSlider.max);updateAlloc(allocSlider.value);}
function confirmVote(){
  if(!requireAuth('Sign in to vote'))return;
  const amt=+allocSlider.value;
  if(amt>state.balance){toast('Not enough Fan Credits','error');return;}
  const p=state.votingFor;
  state.balance-=amt;state.votesToday++;state.totalVotes++;
  p.votes+=amt*40;
  state.myVotes.unshift({player:p.name,short:p.short,fc:amt,date:'Today'});
  syncBalance();grantXP(10,'vote');closeModal('voteModal');
  successText.innerHTML=`Your vote for<br><strong>${p.name}</strong> has been<br>successfully recorded.`;
  successCount.textContent=state.votesToday;
  openModal('successModal');renderAll();
}

/* ════════ PLAYER DETAIL ════════ */
function sparkline(seed,W,H,labels){
  W=W||600;H=H||170;
  let pts=[],v=30+(seed%20);
  for(let i=0;i<10;i++){v+=Math.sin(seed+i*1.7)*6+3.4;pts.push(v);}
  const min=Math.min(...pts),max=Math.max(...pts),pad=12,bot=labels?26:12;
  const xy=pts.map((p,i)=>[pad+i*(W-2*pad)/(pts.length-1),H-bot-((p-min)/(max-min))*(H-pad-bot)]);
  const line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${xy[xy.length-1][0].toFixed(1)} ${H-bot} L ${xy[0][0].toFixed(1)} ${H-bot} Z`;
  const lbls=labels?['May 9','May 11','May 13','May 15'].map((t,i)=>`<text class="axis-lbl" x="${pad+i*(W-2*pad)/3}" y="${H-6}" text-anchor="${i===0?'start':i===3?'end':'middle'}">${t}</text>`).join(''):'';
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <defs><linearGradient id="g${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6640FF" stop-opacity=".28"/><stop offset="100%" stop-color="#6640FF" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#g${seed})"/>
    <path d="${line}" fill="none" stroke="#6640FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${xy.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#6640FF" stroke="#fff" stroke-width="1.5"/>`).join('')}
    ${lbls}</svg>`;
}

/* real-ish equirectangular world map (choropleth) */
const WORLD_PATHS={
  na:"M70 70 L150 58 L235 64 L262 88 L250 110 L300 116 L322 138 L300 160 L250 168 L226 200 L196 196 L150 150 L120 140 L96 110 Z M150 205 L172 196 L190 214 L176 250 L160 244 Z",
  sa:"M250 270 Q300 258 320 300 Q332 350 312 400 Q292 446 262 452 Q236 446 230 408 Q224 360 236 318 Q240 286 250 270 Z",
  eu:"M470 70 L520 58 L560 66 L548 92 L572 96 L560 120 L520 128 L496 112 L472 118 L460 96 Z",
  af:"M480 150 Q540 138 566 162 Q582 196 568 240 Q556 286 528 320 Q506 340 486 320 Q470 286 472 240 Q470 196 480 150 Z",
  asia:"M580 60 Q700 36 820 60 Q900 80 916 128 Q900 176 820 188 Q740 196 690 176 Q640 196 596 172 Q576 132 580 100 Z M700 200 Q740 192 760 214 Q752 248 720 256 Q694 248 696 220 Z",
  oce:"M820 320 Q880 308 906 336 Q898 372 856 380 Q822 372 818 348 Z"
};
function worldMap(){
  const cells=[];
  // choropleth "support" hotspots over real continents
  const hot=[{x:300,y:300,r:24,o:.85},{x:120,y:120,r:20,o:.7},{x:520,y:95,r:14,o:.9},{x:520,y:230,r:18,o:.6},{x:740,y:120,r:16,o:.55},{x:860,y:350,r:12,o:.5},{x:200,y:170,r:14,o:.6},{x:300,y:380,r:13,o:.65}];
  return `<svg class="chart-svg worldmap" viewBox="0 0 960 480" aria-hidden="true">
    <defs>
      <radialGradient id="hotg"><stop offset="0%" stop-color="#4000FF" stop-opacity=".9"/><stop offset="100%" stop-color="#4000FF" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="960" height="480" fill="#F2EEFF" rx="14"/>
    <g class="map-land" fill="#D9CEFF" stroke="#fff" stroke-width="1.5">
      ${Object.values(WORLD_PATHS).map(d=>`<path d="${d}"/>`).join('')}
    </g>
    <g class="map-hot">${hot.map((h,i)=>`<circle cx="${h.x}" cy="${h.y}" r="${h.r}" fill="url(#hotg)" opacity="${h.o}" style="animation:hotPulse 3s ease-in-out ${i*.3}s infinite"/>`).join('')}</g>
    <g class="map-pins">${hot.slice(0,5).map((h,i)=>`<circle cx="${h.x}" cy="${h.y}" r="4" fill="#4000FF" stroke="#fff" stroke-width="1.5" style="animation:pinPop .5s ease ${i*.12}s both"/>`).join('')}</g>
  </svg>
  <div class="map-legend"><span class="caption">Low</span><div class="map-grad"></div><span class="caption">High</span></div>`;
}
function openPlayer(id,from){
  const p=players.find(x=>x.id===id);
  const idx=players.indexOf(p);state.backTo=from||'vote';
  const g=p.trend>=0;
  playerDetail.innerHTML=`
  <div class="detail-hero">
    <div class="pcard-shine"></div>
    <div class="detail-hero-mark">${p.num}</div>
    <div class="hero-top">
      <button class="hero-icon" onclick="go(state.backTo)" aria-label="Back"><span class="material-icons-round">arrow_back</span></button>
      <button class="hero-icon" onclick="toggleFav('${p.id}',this);this.querySelector('span').textContent=state.favs.has('${p.id}')?'favorite':'favorite_border'" aria-label="Favourite">
        <span class="material-icons-round">${state.favs.has(p.id)?'favorite':'favorite_border'}</span></button>
    </div>
    <div class="detail-first">${p.first}</div>
    <div class="detail-last">${p.last}</div>
    <div class="detail-meta">
      <div class="detail-meta-item"><span class="mdot"></span>${p.flag} ${p.country}</div>
      <div class="detail-meta-item"><span class="mdot"></span>${posName(p.pos)}</div>
      <div class="detail-meta-item"><span class="mdot"></span>${p.club}</div>
    </div>
  </div>
  <div class="overlap-card">
    <div class="ov-top">
      <div><span class="lbl-xs">Total Votes</span><div class="ov-big">${fmtV(p.votes)}</div></div>
      <div><span class="lbl-xs">Vote Growth</span><div class="ov-big ${g?'up':'down'}" style="color:${g?'var(--green)':'var(--pink)'};">${g?'+':''}${p.trend.toFixed(1)}%</div><div class="caption" style="color:var(--ink-4);">Last 24h</div></div>
    </div>
    <div class="ov-stats">
      <div><div class="ov-stat-v">${p.goals}</div><div class="ov-stat-l">Goals</div></div>
      <div><div class="ov-stat-v">${p.assists}</div><div class="ov-stat-l">Assists</div></div>
      <div><div class="ov-stat-v">${p.matches}</div><div class="ov-stat-l">Matches</div></div>
      <div><div class="ov-stat-v">${p.wc}</div><div class="ov-stat-l">WC Apps</div></div>
    </div>
  </div>
  <div class="chart-head"><span class="lbl">Vote Trend</span>
    <span class="caption" style="color:var(--ink-3);font-weight:600;display:flex;align-items:center;gap:2px;">Last 7 Days<span class="material-icons-round" style="font-size:15px;">expand_more</span></span></div>
  ${sparkline(idx+3,600,180,true)}
  <div class="chart-head"><span class="lbl">Global Support</span></div>
  <div class="map-wrap">${worldMap()}</div>
  <div class="chart-head"><span class="lbl">Predictions · ${p.name.split(' ').slice(-1)[0]}</span><span class="caption" style="color:var(--ink-4);font-weight:600;">Yes / No</span></div>
  <div class="yn-list">${yesNoListHTML(playerPreds(p))}</div>
  <div class="detail-cta">
    <button class="btn btn-primary btn-block" onclick="openVote('${p.id}')">Vote Now</button>
    <button class="sq-btn" onclick="toast('Link copied to clipboard','link')" aria-label="Share"><span class="material-icons-outlined">ios_share</span></button>
  </div>`;
  go('player');
}

/* ════════ COMPARE ════════ */
function donut(aPct,size,colorA,colorB,thick){
  size=size||120;thick=thick||16;
  const r=(size-thick)/2,c=2*Math.PI*r,off=c*(1-aPct/100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="display:block;">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorB}" stroke-width="${thick}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorA}" stroke-width="${thick}"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
  </svg>`;
}
function fillCompareSelects(){
  const opts=players.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  cmpA.innerHTML=opts;cmpB.innerHTML=opts;
  cmpA.value='mbappe';cmpB.value='haaland';
}
function renderCompare(){
  const a=players.find(p=>p.id===cmpA.value),b=players.find(p=>p.id===cmpB.value);
  const rows=[['Trophies','trophies'],['Goals','goals'],['Assists','assists'],['Matches','matches'],['Win Rate','winRate','%'],['Goals per Match','gpm'],['Top Speed (km/h)','speed']];
  const aPct=Math.round(a.votes/(a.votes+b.votes)*100);
  compareBody.innerHTML=`
  <div class="cmp-pickers">
    <div class="pcard cmp-photo" onclick="openPlayer('${a.id}','compare')">${pcardHTML(a,56)}
      <div class="cmp-photo-lbl">${a.name.split(' ').slice(-1)[0]}<span class="caption">${a.flag} ${a.country}</span></div></div>
    <div class="vs">VS</div>
    <div class="pcard cmp-photo" onclick="openPlayer('${b.id}','compare')">${pcardHTML(b,56)}
      <div class="cmp-photo-lbl">${b.name.split(' ').slice(-1)[0]}<span class="caption">${b.flag} ${b.country}</span></div></div>
  </div>
  <div style="margin-top:18px;">
    ${rows.map(([lbl,k,suf])=>{
      const av=a[k],bv=b[k],tot=av+bv||1,pct=Math.round(av/tot*100);
      return `<div class="cmp-row">
        <div class="cmp-val">${av}${suf||''}</div>
        <div class="cmp-mid"><div class="cmp-bar"><div class="cmp-fill" style="width:${pct}%;"></div></div><div class="cmp-lbl">${lbl}</div></div>
        <div class="cmp-val r">${bv}${suf||''}</div>
      </div>`;}).join('')}
  </div>
  <div class="sec-row"><span class="lbl">Vote Comparison</span></div>
  <div class="donut-row">
    <div class="donut-side">${a.name.split(' ').slice(-1)[0]}<span class="caption">${aPct}%</span></div>
    ${donut(aPct,116,'#4000FF','#E7DFFF',15)}
    <div class="donut-side" style="text-align:right;">${b.name.split(' ').slice(-1)[0]}<span class="caption">${100-aPct}%</span></div>
  </div>`;
}

/* ════════ MARKETS ════════ */
function marketSideMedia(o){
  if(o.pid){const p=players.find(x=>x.id===o.pid);if(p)return avatarHTML(p,34);}
  if(o.flag){const fi=flagImg(o.flag,22);if(fi)return `<span style="line-height:0">${fi}</span>`;}
  return '';
}
function marketCardHTML(m){
  const a=m.options[0],b=m.options[1];
  return `<div class="card market-card">
    <div class="market-top"><span class="market-type">${m.type}</span>
      <span class="market-closes"><span class="material-icons-outlined">schedule</span>Closes ${m.closes}</span></div>
    <div class="market-title">${m.title}</div>
    <div class="market-pool">Pool: <strong>${fmt(m.pool)} FC</strong> · Platform fee 10%</div>
    <div class="vs-wrap">
      <button class="vs-side a" onclick="openMarketPred('${m.id}')">
        <span class="vs-media">${marketSideMedia(a)}</span>
        <span class="vs-name">${a.n}</span><span class="vs-pct">${a.p}%</span>
      </button>
      <span class="vs-mid">${m.kind==='vs'?'VS':'OR'}</span>
      <button class="vs-side b" onclick="openMarketPred('${m.id}')">
        <span class="vs-pct">${b.p}%</span><span class="vs-name">${b.n}</span>
        <span class="vs-media">${marketSideMedia(b)}</span>
      </button>
    </div>
    <div class="vs-bar"><div class="vs-bar-a" style="width:${a.p}%"></div><div class="vs-bar-b" style="width:${b.p}%"></div></div>
  </div>`;
}
function openMarketPred(mid){
  const m=markets.find(x=>x.id===mid);
  openPredModal(m.id,m.title,m.options[0].p,m.options[0].n,m.options[1].n);
}
function renderHomeMarkets(){homeMarkets.innerHTML=markets.slice(0,2).map(marketCardHTML).join('');}
function setMarketTab(t){state.mtab=t;document.querySelectorAll('#marketTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.mtab===t));renderMarkets();}
function renderMarkets(){marketGrid.innerHTML=markets.filter(m=>state.mtab==='all'||m.cat===state.mtab).map(marketCardHTML).join('');
  teamChips.innerHTML=countriesLB.map(c=>{const fi=flagImg(c.name,18);return `<button class="team-chip" onclick="openTeamPreds('${c.name}')">${fi||c.f}<span>${c.name}</span></button>`;}).join('');}
/* predict() removed — markets are binary via openMarketPred */
function renderPredHistory(){
  predHistory.innerHTML=state.predictions.map((p,idx)=>{const w=p.status==='won';
    const open=p.status==='open';
    const pl=open?predPayout(p.fc,p.curPct||p.sidePct||50):null;
    const moved=open&&p.curPct&&p.sidePct&&p.curPct!==p.sidePct;
    const movePct=moved?(p.curPct-p.sidePct):0;
    return `
  <div class="pred-hist">
    <div class="hist-row" style="border-bottom:none;padding-bottom:6px;" onclick="togglePredBreakdown(${idx})">
      <div class="hist-icon" style="background:${w?'rgba(11,168,74,.1)':'var(--purple-a)'};">
        <span class="material-icons-round" style="color:${w?'var(--green)':'var(--purple)'};">${w?'emoji_events':'insights'}</span></div>
      <div style="flex:1;min-width:0;"><div class="hist-title">${p.market}</div>
        <div class="hist-sub">Forecast: ${p.pick} · ${fmt(p.fc)} FC${moved?` · <span style="color:${movePct>0?'var(--green)':'var(--live)'};font-weight:700;">${movePct>0?'▲':'▼'} ${Math.abs(movePct)}%</span>`:''}</div></div>
      <div class="hist-amt" style="color:${w?'var(--green)':open?'var(--green)':'var(--ink-4)'};text-align:right;">
        ${w?'+'+fmt(p.reward)+' FC':open?'<span style="font-size:10px;color:var(--ink-4);font-weight:600;display:block;">Potential</span>'+fmt(pl.net)+' FC':'Settled'}</div>
    </div>
    ${open?`<div class="pred-breakdown" id="pb-${idx}">
      <div class="pb-row"><span>Stake</span><strong>${fmt(p.fc)} FC</strong></div>
      <div class="pb-row"><span>Current odds</span><strong>${p.curPct||p.sidePct}% · ${pl.mult.toFixed(2)}×</strong></div>
      <div class="pb-row"><span>Gross payout</span><strong>${fmt(pl.gross)} FC</strong></div>
      <div class="pb-row"><span>Platform fee (10%)</span><strong style="color:var(--ink-3);">-${fmt(pl.fee)} FC</strong></div>
      <div class="pb-row total"><span>Potential win</span><strong style="color:var(--green);">${fmt(pl.net)} FC</strong></div>
    </div>`:''}
  </div>`;}).join('');
}
function togglePredBreakdown(idx){const el=document.getElementById('pb-'+idx);if(el)el.classList.toggle('open');}

/* ════════ YES/NO + BINARY PREDICTIONS ════════ */
function hashPct(str,lo,hi){let h=0;for(let i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))&0xffffff;}return lo+(h%(hi-lo+1));}
function playerPreds(p){
  const L=p.last.split(' ').slice(-1)[0], C=p.country;
  const base={
    FWD:[`Will ${L} score in the group stage?`,`Will ${L} score 3+ goals this tournament?`,`Will ${L} win the Golden Boot?`,`Will ${L} score in a knockout match?`,`Will ${L} register an assist this tournament?`],
    MID:[`Will ${L} register 3+ assists?`,`Will ${L} score a goal this tournament?`,`Will ${L} be named Player of the Match in the group stage?`,`Will ${L} win the Golden Ball?`,`Will ${L} start every group game?`],
    DEF:[`Will ${L} help keep 2+ clean sheets?`,`Will ${L} score this tournament?`,`Will ${C} reach the quarter-finals with ${L}?`,`Will ${L} register an assist?`,`Will ${L} avoid a red card all tournament?`],
    GK:[`Will ${L} save a penalty?`,`Will ${L} keep 3+ clean sheets?`,`Will ${L} win the Golden Glove?`,`Will ${L} concede fewer than 5 goals total?`,`Will ${L} start every match?`]
  }[p.pos];
  return base.map((q,i)=>({id:p.id+'_'+i,q,yes:hashPct(q,28,72)}));
}
const TEAMS=[...new Set(players.map(p=>p.country))];
function teamFlag(C){const fi=flagImg(C,16);return fi||'';}
function teamPreds(C){
  const qs=[`Will ${C} win their group?`,`Will ${C} reach the Round of 16?`,`Will ${C} reach the quarter-finals?`,`Will ${C} reach the final?`,`Will ${C} keep a clean sheet in the group stage?`,`Will ${C} score 6+ goals in the group stage?`,`Will ${C} win the World Cup?`];
  return qs.map((q,i)=>({id:C+'_'+i,q,yes:hashPct(q,18,74)}));
}
let curPred=null;
function openPredModal(id,q,aPct,aLabel,bLabel){
  if(!requireAuth('Sign in to forecast'))return;
  aLabel=aLabel||'Yes';bLabel=bLabel||'No';
  curPred={id,q,aPct,aLabel,bLabel,side:'a'};
  document.getElementById('predQ').textContent=q;
  document.getElementById('sideYesLbl').textContent=aLabel;
  document.getElementById('sideNoLbl').textContent=bLabel;
  document.getElementById('predYesPct').textContent=aPct+'%';
  document.getElementById('predNoPct').textContent=(100-aPct)+'%';
  selectSide('a');
  const sl=document.getElementById('predSlider');sl.max=Math.max(50,state.balance);sl.value=Math.min(100,state.balance);
  predAmt(sl.value);document.getElementById('predMax').textContent=fmt(state.balance);
  updatePredPayout();
  openModal('predModal');
}
function selectSide(s){curPred.side=s;
  document.getElementById('sideYes').classList.toggle('sel',s==='a');
  document.getElementById('sideNo').classList.toggle('sel',s==='b');updatePredPayout();}
function predAmt(v){document.getElementById('predAmtNum').textContent=fmt(+v);updatePredPayout();}
function predQuick(v){const sl=document.getElementById('predSlider');sl.value=Math.min(v,+sl.max);predAmt(sl.value);}
function confirmPred(){
  if(!requireAuth('Sign in to forecast'))return;
  const amt=+document.getElementById('predSlider').value;
  if(amt>state.balance){toast('Not enough Fan Credits','error');return;}
  state.balance-=amt;
  const sideLabel=curPred.side==='a'?curPred.aLabel:curPred.bLabel;
  const pct=curPred.side==='a'?curPred.aPct:(100-curPred.aPct);
  state.predictions.unshift({market:curPred.q,pick:sideLabel,fc:amt,status:'open',sidePct:pct,curPct:pct});
  state.upStreak[curPred.q]=0;
  syncBalance();renderPredHistory();closeModal('predModal');grantXP(15,'prediction');
  const pl=predPayout(amt,pct);
  toast(`Forecast placed · potential win ${fmt(pl.net)} FC`,'insights');
}
function yesNoListHTML(arr){
  return arr.map(p=>`
  <button class="yn-row" onclick="openPredModal('${p.id}',\`${p.q.replace(/`/g,'')}\`,${p.yes})">
    <span class="yn-q">${p.q}</span>
    <span class="yn-prob"><span class="yn-yes">${p.yes}%</span><span class="yn-sep">·</span><span class="yn-no">${100-p.yes}%</span></span>
    <span class="material-icons-round yn-chev">chevron_right</span>
  </button>`).join('');
}
function openTeamPreds(C){
  document.getElementById('teamPredTitle').innerHTML=`${teamFlag(C)} ${C}`;
  document.getElementById('teamPredList').innerHTML=yesNoListHTML(teamPreds(C));
  openModal('teamPredModal');
}

/* ════════ LEADERBOARD ════════ */
function setLbTab(t){state.ltab=t;document.querySelectorAll('[data-ltab]').forEach(b=>b.classList.toggle('active',b.dataset.ltab===t));renderLeaderboard();}
const moveHTML=m=>{const c=m>0?'up':m<0?'down':'flat-t';const tx=m>0?'+'+m:m<0?''+m:'—';return `<div class="lb-move ${c}">${tx}</div>`;};
function renderLeaderboard(){
  if(state.ltab==='players'){
    lbPodiumWrap.style.display='';
    lbPodium.innerHTML=podiumHTML(players.slice(0,3));
    const moves=[1,-1,2,0,1,0,-2,1,0];
    lbList.innerHTML=players.slice(3,12).map((p,i)=>`
    <div class="prow" onclick="openPlayer('${p.id}','leaderboard')">
      <div class="p-rank">${i+4}</div>${avatarHTML(p)}
      <div class="p-info"><div class="p-name">${p.name}</div><div class="p-meta">${p.country}</div></div>
      <div class="p-votes"><div class="p-votes-num">${fmtV(p.votes)}</div></div>
      ${moveHTML(moves[i]||0)}
    </div>`).join('');
  }else if(state.ltab==='fans'){
    lbPodiumWrap.style.display='none';
    lbList.innerHTML=fans.map((f,i)=>`
    <div class="prow" style="cursor:default;${f.me?'background:var(--purple-a);border-radius:12px;border-bottom-color:transparent;padding-left:10px;padding-right:10px;':''}">
      <div class="p-rank" ${i<3?'style="color:var(--gold);"':''}>${i+1}</div>
      <div class="avatar" style="width:40px;height:40px;font-size:12px;">${f.short}</div>
      <div class="p-info"><div class="p-name">${f.name}${f.me?' <span style="font-size:9px;font-weight:800;color:var(--purple);">YOU</span>':''}</div><div class="p-meta">${f.c}</div></div>
      <div class="p-votes"><div class="p-votes-num">${fmt(f.votes)}</div></div>
      ${moveHTML(f.move)}
    </div>`).join('');
  }else{
    lbPodiumWrap.style.display='';
    lbPodium.innerHTML='<div class="card" style="grid-column:1/-1;padding:16px;"><div class="lbl" style="margin-bottom:8px;">Global Support Map</div>'+worldMap()+'</div>';
    lbList.innerHTML=countriesLB.map((c,i)=>{const fi=flagImg(c.name,26);return `
    <div class="prow" onclick="openTeamPreds('${c.name}')">
      <div class="p-rank" ${i<3?'style="color:var(--gold);"':''}>${i+1}</div>
      <div style="width:40px;text-align:center;flex-shrink:0;line-height:0;">${fi||`<span style='font-size:25px'>${c.f}</span>`}</div>
      <div class="p-info"><div class="p-name">${c.name}</div><div class="p-meta">Tap for predictions</div></div>
      <div class="p-votes"><div class="p-votes-num">${fmtV(c.votes)}</div></div>
      ${moveHTML(c.move)}
    </div>`}).join('');
  }
}

