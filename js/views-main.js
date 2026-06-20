/* ════════ HOME ════════ */
function renderFeatured(){
  const p=players[0];
  document.getElementById('featuredCard').innerHTML=`
  <div class="featured">
    <div>
      <span class="lbl-xs">Daily Featured</span>
      <div class="featured-name">${p.first} ${p.last}</div>
      <div class="featured-meta"><span>${flagImg(p.country,15)||p.flag} ${p.country}</span><span class="dot"></span><span>${posName(p.pos)}</span></div>
      ${voteBtnHTML(p,'btn-sm')}
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
  // Most-voted first, then alphabetical (by last name) when there are no votes yet.
  const t=[...players].sort(rankCmp).slice(0,8);
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
// Today's matches (live first, then the rest of today's kickoffs). Falls back to the next
// upcoming games when there's nothing scheduled today.
function todaysFixtures(){
  if(!fixtures||!fixtures.length)return [];
  const now=new Date();
  const sameDay=d=>{const x=new Date(d);return x.getFullYear()===now.getFullYear()&&x.getMonth()===now.getMonth()&&x.getDate()===now.getDate();};
  const live=fixtures.filter(fixtureLive);
  const today=fixtures.filter(f=>f.kickoff_at&&sameDay(f.kickoff_at)&&!fixtureLive(f));
  const set=[...live,...today];
  if(set.length)return set.slice(0,4);
  return fixtures.filter(f=>f.status!=='finished').slice(0,3); // none today → next up
}
function renderHomeGames(){
  const hg=document.getElementById('homeGames');if(!hg)return;
  const list=todaysFixtures();
  if(!list.length){hg.innerHTML='<div class="card" style="padding:18px;text-align:center;color:var(--ink-3);font-size:13px;">No games scheduled right now.</div>';return;}
  hg.innerHTML='<div class="fixtures-grid">'+list.map(f=>{const live=fixtureLive(f),k=fmtKickoff(f.kickoff_at);
    const mid=live?`${f.home_score??0} - ${f.away_score??0}`:'VS';
    return `
    <div class="fixture-card ${live?'islive':''}" onclick="go('games')" style="cursor:pointer;">
      ${live?'<span class="fixture-live">● LIVE</span>':''}
      <div class="fixture-teams"><div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.a)}</div><div class="fixture-name">${f.a}</div></div>
      <div class="fixture-vs">${mid}</div><div class="fixture-team"><div class="fixture-flag">${fixtureFlag(f.b)}</div><div class="fixture-name">${f.b}</div></div></div>
      <div class="fixture-meta">${f.stage||'Group Stage'} · ${live?'Live now':k.time}</div></div>`;}).join('')+'</div>';
}
function renderHomeExtra(){
  renderHomeGames();
  if(typeof updateTotalVotes==='function')updateTotalVotes(); // real "Total Votes Cast"
  renderHomePulse();        // real votes-per-date chart (7d / month / YTD)
  renderSupportByCountry(); // real % of votes from each signup country
}

/* ════════ VOTE LIST ════════ */
function prowHTML(p,rank){
  return `
  <div class="prow" onclick="openPlayer('${p.id}','vote')">
    <div class="p-rank">${rank}</div>
    ${avatarHTML(p)}
    <div class="p-info"><div class="p-name">${p.name}</div><div class="p-meta">${p.country}${p.club?' · '+p.club:''}</div></div>
    <div class="p-votes"><div class="p-votes-num">${fmtV(p.votes)}</div>${trendHTML(p.trend)}</div>
    <button class="fav-btn ${state.favs.has(p.id)?'faved':''}" onclick="event.stopPropagation();toggleFav('${p.id}',this)" aria-label="Favourite">
      <span class="material-icons-round">${state.favs.has(p.id)?'favorite':'favorite_border'}</span>
    </button>
  </div>`;
}
function setPos(pos){state.pos=pos;document.querySelectorAll('#posChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.pos===pos));renderVoteList();}
function fillDropdowns(){
  // filter(Boolean): players whose club hasn't been imported yet have club='' — skip those
  const cs=[...new Set(players.map(p=>p.country).filter(Boolean))].sort(),cl=[...new Set(players.map(p=>p.club).filter(Boolean))].sort();
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
  else list=[...list].sort(rankCmp);
  voteList.innerHTML=list.map(p=>prowHTML(p,players.indexOf(p)+1)).join('');
  voteEmpty.style.display=list.length?'none':'block';
}
function saveFavs(){try{localStorage.setItem('wc26_favs',JSON.stringify([...state.favs]));}catch(e){}}
function toggleFav(id,btn){
  const faved=state.favs.has(id);
  if(faved){state.favs.delete(id);toast('Removed from favourites','favorite_border');}
  else{state.favs.add(id);toast('Added to favourites','favorite');}
  saveFavs();
  if(btn){
    const now=state.favs.has(id);
    btn.classList.toggle('faved',now);
    const ic=btn.querySelector('.material-icons-round');if(ic)ic.textContent=now?'favorite':'favorite_border';
  }
}
// Real share: copy a link to the clipboard (SPA has no per-player route, so share the app URL).
function copyLink(name){
  const url=location.origin+location.pathname;
  const text=name?`${name} · WC26 Fan Vote — ${url}`:url;
  const done=()=>toast('Link copied to clipboard','link');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done,done);
  else done();
}

/* ════════ VOTE FLOW ════════ */
// Decide what the Vote button should look like for a given player, given the user's
// pass + their single (changeable-once) vote. Returns {label, disabled, voted}.
function voteState(p){
  const mv=state.myVote;
  if(!state.hasPass)return {label:'Vote Now',disabled:false};      // → opens paywall
  if(mv&&p.dbId&&mv.player_id===p.dbId)return {label:'Voted',disabled:true,voted:true};
  if(mv&&mv.changes_used>=1)return {label:'Vote Now',disabled:true}; // change already used
  return {label:mv?'Change Vote':'Vote Now',disabled:false};
}
// Vote button markup used in the list, player detail, and featured card.
function voteBtnHTML(p,cls){
  const v=voteState(p);
  const ic=v.voted?'<span class="material-icons-round" style="font-size:16px;vertical-align:-3px;margin-right:4px;">check_circle</span>':'';
  return `<button class="btn ${v.voted?'btn-secondary':'btn-primary'} ${cls||''}"${v.disabled?' disabled':''} onclick="openVote('${p.id}')">${ic}${v.label}</button>`;
}
function openVote(id){
  if(!requireAuth('Sign in to vote'))return;
  const p=players.find(x=>x.id===id); if(!p)return;
  state.votingFor=p;
  // No pass yet → open the access paywall. After payment the webhook casts this vote.
  if(!state.hasPass){ openModal('voteModal'); populateSupporterPass(); return; }
  const mv=state.myVote;
  if(mv&&mv.player_id===p.dbId){ toast('You already voted for this player','how_to_vote'); return; }
  if(mv&&mv.changes_used>=1){ toast('You can only change your vote once','lock'); return; }
  if(mv){
    // This consumes their ONE allowed change → confirm first.
    vcConfirmPlayer=p;
    document.getElementById('vcTitle').textContent='Change your vote?';
    document.getElementById('vcBody').innerHTML=`This is your <strong>only</strong> vote change. Move your vote to <strong>${p.name}</strong>? You won't be able to change it again.`;
    document.getElementById('vcConfirm').textContent='Yes, change my vote';
    openModal('voteConfirmModal');
  }else{
    castPassVote(p,false); // first vote (e.g. paid but not yet voted) → cast directly
  }
}
let vcConfirmPlayer=null;
function confirmVoteChange(){ closeModal('voteConfirmModal'); if(vcConfirmPlayer)castPassVote(vcConfirmPlayer,true); vcConfirmPlayer=null; }
// Make sure we know the voter's country (needed for the support-map marker). Resolves to a
// country name, or null if cancelled. Saves the choice to the user's profile so the server
// records it on the vote and the map can plot it.
function ensureVoterCountry(){
  return new Promise(resolve=>{
    const known=(state.profile&&state.profile.country_code)||(state.user&&state.user.user_metadata&&state.user.user_metadata.country)||'';
    if(known)return resolve(known);
    const sel=document.getElementById('cmCountry'),btn=document.getElementById('cmConfirm');
    if(!sel||!btn)return resolve(null);
    const list=(typeof signupCountryList==='function')?signupCountryList():[];
    sel.innerHTML=list.map(c=>`<option value="${c}">${c}</option>`).join('');
    const done=async()=>{
      btn.removeEventListener('click',done);
      const cc=sel.value;
      try{await _sb.from('profiles').update({country_code:cc}).eq('id',state.user.id);}catch(e){}
      state.profile=state.profile||{};state.profile.country_code=cc;
      closeModal('countryModal');resolve(cc);
    };
    btn.addEventListener('click',done);
    openModal('countryModal');
  });
}
// Cast or change the single vote (server enforces the rules), then refresh counts + map.
async function castPassVote(p,isChange){
  const cc=await ensureVoterCountry();
  if(!cc){toast('Pick your country to vote','public');return;}
  const {data,error}=await _sb.rpc('cast_pass_vote',{p_player:p.dbId});
  if(error){toast(error.message||'Vote failed','error');return;}
  state.myVote={player_id:data.player_id,changes_used:Number(data.changes_used)||0};
  await loadVoteCounts();                         // refresh everyone's tallies
  players.sort(rankCmp);
  loadPlayerCharts(p);                            // trend + support map + totals for this player
  renderVoteList();renderFeatured();renderHomePodium();renderHomeTrending();renderLeaderboard();renderHomePulse();renderSupportByCountry();
  successText.innerHTML=isChange?`Your vote has been changed to<br><strong>${p.name}</strong>.`:`Your vote for<br><strong>${p.name}</strong> has been<br>successfully recorded.`;
  successCount.textContent=(state.myVote&&1)||1;
  openModal('successModal');
}
// supabase-js puts non-2xx responses in `error` and hides the body; dig out the real
// message the Edge Function returned (e.g. the exact Stripe error) for the toast/console.
async function fnErr(error){
  try{const b=await error.context.json();if(b&&b.error)return b.error;}catch(e){}
  try{const t=await error.context.text();if(t)return t;}catch(e){}
  return (error&&error.message)||'Unknown error';
}
// Pull the pass name/price straight from Stripe so the modal is never hard-coded.
let _passLoaded=false;
async function populateSupporterPass(){
  if(_passLoaded)return;
  try{
    const {data,error}=await _sb.functions.invoke('get-pass',{body:{}});
    if(error){console.warn('[get-pass]',await fnErr(error));return;}
    if(!data||data.error){console.warn('[get-pass]',data&&data.error);return;}
    const set=(id,v)=>{const el=document.getElementById(id);if(el&&v)el.textContent=v;};
    set('vpPlanName',data.name);
    set('vpPlanPrice',data.price);
    set('vpPlanPer',data.per);
    if(data.description)set('vpPlanDesc',data.description);
    _passLoaded=true;
  }catch(e){/* offline / not deployed — leave the mock copy in place */}
}
// Generic Stripe Checkout. product: 'pass' | 'starter' | 'fan' | 'ultra' | 'legend' |
// 'champion'. All route through Stripe-hosted Checkout (Apple Pay / Google Pay / card auto).
// The server maps the product → its Stripe id + FC amount, so nothing is hard-coded here.
async function stripeCheckout(product,playerId){
  if(!requireAuth('Sign in to continue'))return;
  const pk=(typeof STRIPE_PUBLISHABLE_KEY!=='undefined'&&STRIPE_PUBLISHABLE_KEY)||'';
  if(!pk){toast('Payment setup pending — add your Stripe keys','lock');return;}
  toast('Opening secure checkout…','lock');
  try{
    const {data,error}=await _sb.functions.invoke('create-checkout-session',{
      body:{product,origin:location.origin,player_id:playerId||null}});
    if(error){const m=await fnErr(error);console.error('[checkout]',m);toast(m,'error');return;}
    if(!data||!data.url){console.error('[checkout]',data);toast((data&&data.error)||'Could not start checkout','error');return;}
    window.location.href=data.url; // → Stripe-hosted Checkout (Apple/Google Pay + card)
  }catch(e){console.error('[checkout]',e);toast('Could not start checkout','error');}
}
// Supporter Pass checkout (the paywall buttons). method is ignored — hosted Checkout shows
// every wallet/card itself. We stash the pending player so the vote survives the redirect.
function startCheckout(method){
  try{localStorage.setItem('pendingVotePlayer',(state.votingFor&&state.votingFor.dbId)||'');}catch(e){}
  stripeCheckout('pass',state.votingFor&&state.votingFor.dbId);
}
async function confirmVote(){
  if(!requireAuth('Sign in to vote'))return;
  const amt=+allocSlider.value;
  if(amt>state.balance){toast('Not enough Fan Credits','error');return;}
  const p=state.votingFor;
  if(!p||!p.dbId){toast('Player unavailable','error');return;}
  // Server-authoritative: deducts FC, records the vote in public.votes (attributed to
  // this user → their signup country), grants XP, returns the new balance.
  const {data,error}=await _sb.rpc('cast_vote',{p_player:p.dbId,p_fc:amt});
  if(error){toast(error.message,'error');return;}
  state.balance=Number(data);state.votesToday++;state.totalVotes++;
  state.myVotes.unshift({player:p.name,short:p.short,fc:amt,date:'Today'});
  syncBalance();closeModal('voteModal');
  successText.innerHTML=`Your vote for<br><strong>${p.name}</strong> has been<br>successfully recorded.`;
  successCount.textContent=state.votesToday;
  openModal('successModal');
  loadPlayerCharts(p); // re-reads votes → updates the trend, total, and the map marker for your country
  renderVoteList();
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
function worldMap(hotspots){
  // hotspots: real vote-distribution circles {x,y,r,o}. Passed [] for "no votes yet"
  // (neutral map). Called with no arg (leaderboard) → decorative default below.
  const hot = hotspots || signupHotspots(); // default: highlight the signup countries
  return `<svg class="chart-svg worldmap" viewBox="0 0 960 480" aria-hidden="true">
    <defs>
      <radialGradient id="hotg"><stop offset="0%" stop-color="#4000FF" stop-opacity=".9"/><stop offset="100%" stop-color="#4000FF" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="960" height="480" fill="#F2EEFF" rx="14"/>
    <g class="map-land" fill="#D9CEFF" stroke="#fff" stroke-width="1.5">
      ${Object.values(WORLD_PATHS).map(d=>`<path d="${d}"/>`).join('')}
    </g>
    <g class="map-hot">${hot.map((h,i)=>`<circle cx="${h.x}" cy="${h.y}" r="${h.r}" fill="url(#hotg)" opacity="${h.o}" style="animation:hotPulse 3s ease-in-out ${i*.3}s infinite"/>`).join('')}</g>
    <g class="map-pins">${hot.map((h,i)=>`<circle cx="${h.x}" cy="${h.y}" r="4" fill="#4000FF" stroke="#fff" stroke-width="1.5" style="animation:pinPop .5s ease ${i*.12}s both"/>`).join('')}</g>
  </svg>
  <div class="map-legend"><span class="caption">Low</span><div class="map-grad"></div><span class="caption">High</span></div>`;
}
/* ---- real vote-trend + global-support (driven by the votes table) ---- */
// Same sparkline visual as sparkline(), but from real data points + labels.
function trendSVG(points,labels,W,H){
  W=W||600;H=H||180;
  const pts=points&&points.length?points:[0,0];
  const min=Math.min(...pts),max=Math.max(...pts),range=(max-min)||1,pad=12,bot=26;
  const xy=pts.map((v,i)=>[pad+i*(W-2*pad)/Math.max(pts.length-1,1),H-bot-((v-min)/range)*(H-pad-bot)]);
  const line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${xy[xy.length-1][0].toFixed(1)} ${H-bot} L ${xy[0][0].toFixed(1)} ${H-bot} Z`;
  const n=labels.length,lbls=labels.map((t,i)=>`<text class="axis-lbl" x="${pad+i*(W-2*pad)/Math.max(n-1,1)}" y="${H-6}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${t}</text>`).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <defs><linearGradient id="gtrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6640FF" stop-opacity=".28"/><stop offset="100%" stop-color="#6640FF" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#gtrend)"/>
    <path d="${line}" fill="none" stroke="#6640FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${xy.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#6640FF" stroke="#fff" stroke-width="1.5"/>`).join('')}${lbls}</svg>`;
}
function last7Days(){
  const out=[],now=new Date();
  for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);d.setHours(23,59,59,999);out.push({end:d,label:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})});}
  return out;
}
/* ---- Tournament Pulse: real votes bucketed by date / month ---- */
let _pulseRange='7d';
// Bucket vote timestamps into the chart's points + axis labels for the chosen range.
function votePulseData(range,dateList){
  const now=new Date();
  const ts=(dateList||[]).map(d=>+new Date(d)).filter(t=>!isNaN(t));
  const countIn=(s,e)=>ts.reduce((n,t)=>n+(t>=s&&t<e?1:0),0);
  if(range==='ytd'){
    const yr=now.getFullYear(),mNow=now.getMonth(),points=[],labels=[];
    for(let m=0;m<=mNow;m++){points.push(countIn(+new Date(yr,m,1),+new Date(yr,m+1,1)));labels.push(new Date(yr,m,1).toLocaleDateString('en-US',{month:'short'}));}
    return {points,labels};
  }
  const days=range==='month'?30:7,points=[],labels=[],base=new Date(now);base.setHours(0,0,0,0);
  for(let i=days-1;i>=0;i--){
    const d=new Date(base);d.setDate(d.getDate()-i);const s=d.getTime();
    points.push(countIn(s,s+864e5));
    const pos=days-1-i;
    let lbl='';
    if(days===7) lbl=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    else if(pos%5===0||pos===days-1) lbl=d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); // ~6 labels over a month
    labels.push(lbl);
  }
  return {points,labels};
}
async function renderHomePulse(){
  const el=document.getElementById('homePulse'); if(!el) return;
  let dates=[];
  try{ const {data}=await _sb.from('pass_vote').select('created_at'); dates=(data||[]).map(r=>r.created_at); }catch(e){}
  const {points,labels}=votePulseData(_pulseRange,dates);
  el.innerHTML=trendSVG(points,labels,560,170);
}
function setPulseRange(r){ _pulseRange=r; renderHomePulse(); }
/* ---- Support by Country: real % of votes coming from each signup country ---- */
const _supportColors=['#4000FF','#FF2065','#00E6C4','#FFB600','#3D6BFF','#0BA84A','#6640FF','#FF8600','#EE1045','#13D6C4','#2F6BFF'];
async function renderSupportByCountry(){
  const el=document.getElementById('homeRegions'); if(!el) return;
  const counts={}; let total=0;
  try{
    const {data}=await _sb.from('pass_vote').select('country_code');
    (data||[]).forEach(r=>{ const cc=r.country_code; if(!cc) return;
      const name=SIGNUP_CODE[String(cc).toUpperCase()]||cc; counts[name]=(counts[name]||0)+1; total++; });
  }catch(e){}
  if(!total){ el.innerHTML='<div class="caption" style="color:var(--ink-3);text-align:center;padding:8px 0;">No votes yet — be the first to vote!</div>'; return; }
  // Same countries as the signup picker; % of all votes from each, biggest first.
  const rows=signupCountryList().map((c,i)=>({n:c,v:Math.round((counts[c]||0)/total*100),c:_supportColors[i%_supportColors.length],raw:counts[c]||0}))
    .sort((a,b)=>b.raw-a.raw);
  el.innerHTML=hbars(rows);
}
// cumulative FC supporting this player at the end of each of the last 7 days
function buildTrend(votes){
  const days=last7Days();
  const points=days.map(({end})=>votes.filter(v=>new Date(v.created_at)<=end).reduce((s,v)=>s+(v.fc_allocated||0),0));
  const labels=days.filter((_,i)=>i%2===0).map(x=>x.label);
  return {points,labels};
}
// Signup-dropdown countries, positioned within the stylized continents of
// WORLD_PATHS (960×480 viewBox). These are the markets we support, so the map
// always highlights them; real votes scale each country's glow.
const COUNTRY_XY={
  'Canada':{x:180,y:98},'United States':{x:172,y:135},'Mexico':{x:158,y:182},
  'Brazil':{x:294,y:350},'Argentina':{x:274,y:414},
  'England':{x:478,y:78},'France':{x:498,y:96},'Spain':{x:470,y:112},'Germany':{x:518,y:86},
  'Morocco':{x:486,y:158},'United Arab Emirates':{x:602,y:176},
};
const SIGNUP_COUNTRIES=Object.keys(COUNTRY_XY);
// voter country_code → signup country name (so real votes can scale the glow)
const SIGNUP_CODE={AE:'United Arab Emirates',FR:'France',BR:'Brazil',GB:'England','GB-ENG':'England',AR:'Argentina',ES:'Spain',DE:'Germany',MA:'Morocco',US:'United States',MX:'Mexico',CA:'Canada'};
// Read the live signup dropdown so the highlighted set stays in sync with it
// (only countries we have a map position for; falls back to the full list).
function signupCountryList(){
  const sel=document.getElementById('suCountry');
  if(sel){const opts=[...sel.options].map(o=>o.textContent.trim()).filter(c=>COUNTRY_XY[c]);if(opts.length)return opts;}
  return SIGNUP_COUNTRIES;
}
function signupHotspots(byCountry){
  byCountry=byCountry||{};
  const list=signupCountryList();
  const max=Math.max(1,...list.map(c=>Number(byCountry[c]||0)));
  return list.map(c=>{const t=Number(byCountry[c]||0)/max,pos=COUNTRY_XY[c];return{x:pos.x,y:pos.y,r:11+t*15,o:.55+t*.4};});
}
/* ---- Google Maps support map (styled to match; falls back to the SVG map) ---- */
const COUNTRY_LATLNG={
  'Canada':{lat:56.1,lng:-106.3},'United States':{lat:39.8,lng:-98.6},'Mexico':{lat:23.6,lng:-102.5},
  'Brazil':{lat:-14.2,lng:-51.9},'Argentina':{lat:-38.4,lng:-63.6},
  'England':{lat:52.5,lng:-1.5},'France':{lat:46.6,lng:2.2},'Spain':{lat:40.2,lng:-3.7},'Germany':{lat:51.2,lng:10.4},
  'Morocco':{lat:31.8,lng:-7.1},'United Arab Emirates':{lat:23.9,lng:53.8},
};
const COUNTRY_ISO3={'United Arab Emirates':'ARE','France':'FRA','Brazil':'BRA','England':'GBR','Argentina':'ARG','Spain':'ESP','Germany':'DEU','Morocco':'MAR','United States':'USA','Mexico':'MEX','Canada':'CAN'};
// Purple, label-free style so the Google map reads like the app's SVG map.
const MAP_STYLE=[
  {elementType:'geometry',stylers:[{color:'#E2D9FB'}]},
  {elementType:'labels',stylers:[{visibility:'off'}]},
  {featureType:'administrative',stylers:[{visibility:'off'}]},
  {featureType:'road',stylers:[{visibility:'off'}]},
  {featureType:'poi',stylers:[{visibility:'off'}]},
  {featureType:'transit',stylers:[{visibility:'off'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#F2EEFF'}]},
];
let _mapsPromise=null,_geojson=null;
function loadGoogleMaps(){
  if(window.google&&window.google.maps)return Promise.resolve();
  if(_mapsPromise)return _mapsPromise;
  if(typeof MAP_KEY==='undefined'||!MAP_KEY)return Promise.reject(new Error('MAP_KEY missing'));
  _mapsPromise=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(MAP_KEY);
    s.async=true;s.onload=res;s.onerror=()=>rej(new Error('Maps script failed'));
    document.head.appendChild(s);
  });
  return _mapsPromise;
}
async function countriesGeoJson(){
  if(_geojson)return _geojson;
  const r=await fetch('https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json');
  _geojson=await r.json();return _geojson;
}
// Render the Google map into containerId; byCountry = {countryName: fcVotes}.
function mapLoadingHTML(){return `<div class="map-loading"></div>`;}
async function renderSupportMap(containerId,byCountry){
  const el=document.getElementById(containerId);if(!el)return;
  try{
    await loadGoogleMaps();
    const Map=google.maps.Map, Marker=google.maps.Marker;
    const list=signupCountryList();
    const wanted=new Set(list.map(c=>COUNTRY_ISO3[c]).filter(Boolean));
    el.style.height='230px';el.style.borderRadius='14px';el.style.overflow='hidden';el.style.position='relative';
    // Build the map in an overlay div so the loading shimmer stays visible until the map is
    // actually rendered, then fade it in — no jarring swap from the placeholder.
    const mapDiv=document.createElement('div');
    mapDiv.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .45s ease;';
    el.appendChild(mapDiv);
    const map=new Map(mapDiv,{center:{lat:25,lng:5},zoom:1,minZoom:1,
      disableDefaultUI:true,gestureHandling:'none',keyboardShortcuts:false,backgroundColor:'#E9E3FB',styles:MAP_STYLE});
    google.maps.event.addListenerOnce(map,'idle',()=>{ mapDiv.style.opacity='1';
      setTimeout(()=>{const ph=el.querySelector('.map-loading');if(ph)ph.remove();},480); });
    // highlight signup countries with their real boundaries (same purple as the SVG land)
    try{
      const gj=await countriesGeoJson();
      map.data.addGeoJson({type:'FeatureCollection',features:gj.features.filter(f=>wanted.has(f.id))});
      map.data.setStyle({fillColor:'#8E6BFF',fillOpacity:.55,strokeColor:'#ffffff',strokeWeight:1.2});
    }catch(e){console.warn('[map] country boundaries unavailable:',e.message);}
    // small pixel-sized vote markers (don't grow with zoom); hover shows the country.
    const max=Math.max(1,...list.map(c=>Number((byCountry||{})[c]||0)));
    const info=new google.maps.InfoWindow({disableAutoPan:true});
    list.forEach(c=>{const pos=COUNTRY_LATLNG[c],fc=Number((byCountry||{})[c]||0);
      if(!pos||fc<=0)return;
      const m=new Marker({position:pos,map,title:`${c} · ${fc} vote${fc===1?'':'s'}`,
        icon:{path:google.maps.SymbolPath.CIRCLE,scale:5+(fc/max)*4,
          fillColor:'#4000FF',fillOpacity:.85,strokeColor:'#ffffff',strokeWeight:1.5}});
      m.addListener('mouseover',()=>{info.setContent(`<div style="font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;color:#101010;padding:1px 2px;white-space:nowrap;">${c} · ${fc} vote${fc===1?'':'s'}</div>`);info.open({map,anchor:m});});
      m.addListener('mouseout',()=>info.close());});
  }catch(e){
    console.warn('[map] Google Maps unavailable, using SVG fallback:',e.message);
    el.style.height='';el.innerHTML=worldMap(signupHotspots(byCountry));
  }
}

// fetch real votes for the player and fill the trend chart + support map + totals
async function loadPlayerCharts(p){
  if(!p.dbId)return;
  // Supporter-Pass model: one row per voter (weight 1). Read the country live from the
  // voter's profile (robust even if the denormalized column on the row is stale/null).
  const {data,error}=await _sb.from('pass_vote').select('created_at,country_code,profiles(country_code)').eq('player_id',p.dbId);
  if(error){console.warn('[charts] votes load failed:',error.message);return;}
  const votes=(data||[]).map(v=>({created_at:v.created_at,fc_allocated:1,profiles:{country_code:(v.profiles&&v.profiles.country_code)||v.country_code}}));
  // trend
  const {points,labels}=buildTrend(votes);
  const tc=document.getElementById('voteTrendChart');if(tc)tc.innerHTML=trendSVG(points,labels,600,180);
  // global support — highlight the signup countries, scaled by how many voters came from each
  const byCountry={};
  votes.forEach(v=>{const cc=v.profiles&&v.profiles.country_code;if(!cc)return;const name=SIGNUP_CODE[String(cc).toUpperCase()]||cc;byCountry[name]=(byCountry[name]||0)+1;});
  renderSupportMap('globalSupportMap',byCountry);
  // live totals + 24h growth (each vote counts as 1 supporter)
  const total=votes.length;
  if(p)p.votes=total; // keep the player's live vote total in sync (lists, podium)
  const cut=new Date();cut.setHours(cut.getHours()-24);
  const old=votes.filter(v=>new Date(v.created_at)<=cut).reduce((s,v)=>s+(v.fc_allocated||0),0);
  const growth=old>0?((total-old)/old*100):(total>0?100:0);
  const tv=document.getElementById('totalVotesVal');if(tv)tv.textContent=fmtV(total);
  const gv=document.getElementById('voteGrowthVal');if(gv){const up=growth>=0;gv.textContent=(up?'+':'')+growth.toFixed(1)+'%';gv.className='ov-big '+(up?'up':'down');gv.style.color=up?'var(--green)':'var(--pink)';}
}

function openPlayer(id,from){
  const p=players.find(x=>x.id===id);
  const idx=players.indexOf(p);state.backTo=from||'vote';
  const g=p.trend>=0;
  const pPreds=playerPreds(p); // keep a ref so we can fill real odds after render
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
      <div class="detail-meta-item"><span class="mdot"></span>${flagImg(p.country,16)||p.flag} ${p.country}</div>
      <div class="detail-meta-item"><span class="mdot"></span>${posName(p.pos)}</div>
      ${p.club?`<div class="detail-meta-item"><span class="mdot"></span>${p.club}</div>`:''}
    </div>
  </div>
  <div class="overlap-card">
    <div class="ov-top">
      <div><span class="lbl-xs">Total Votes</span><div class="ov-big" id="totalVotesVal">${fmtV(p.votes)}</div></div>
      <div><span class="lbl-xs">Vote Growth</span><div class="ov-big ${g?'up':'down'}" id="voteGrowthVal" style="color:${g?'var(--green)':'var(--pink)'};">${g?'+':''}${p.trend.toFixed(1)}%</div><div class="caption" style="color:var(--ink-4);">Last 24h</div></div>
    </div>
    <div class="ov-stats">
      <div><div class="ov-stat-v">${p.goals}</div><div class="ov-stat-l">Goals</div></div>
      <div><div class="ov-stat-v">${p.assists}</div><div class="ov-stat-l">Assists</div></div>
      <div><div class="ov-stat-v">${p.matches}</div><div class="ov-stat-l">Matches</div></div>
      <div><div class="ov-stat-v">${(+p.gpm||0).toFixed(2)}</div><div class="ov-stat-l">Goals/Match</div></div>
    </div>
  </div>
  <div class="chart-head"><span class="lbl">Vote Trend</span>
    <span class="caption" style="color:var(--ink-3);font-weight:600;display:flex;align-items:center;gap:2px;">Last 7 Days<span class="material-icons-round" style="font-size:15px;">expand_more</span></span></div>
  <div id="voteTrendChart">${trendSVG([0,0,0,0,0,0,0],last7Days().filter((_,i)=>i%2===0).map(x=>x.label),600,180)}</div>
  <div class="chart-head"><span class="lbl">Global Support</span></div>
  <div class="map-wrap" id="globalSupportMap">${mapLoadingHTML()}</div>
  <div class="chart-head"><span class="lbl">Predictions · ${p.name.split(' ').slice(-1)[0]}</span><span class="caption" style="color:var(--ink-4);font-weight:600;">Yes / No</span></div>
  <div class="yn-list" id="playerPredList">${yesNoListHTML(pPreds)}</div>
  <div class="detail-cta">
    ${voteBtnHTML(p,'btn-block')}
    <button class="sq-btn" onclick="copyLink('${(p.name||'').replace(/'/g,'')}')" aria-label="Share"><span class="material-icons-outlined">ios_share</span></button>
  </div>`;
  go('player');
  loadPlayerCharts(p); // fill trend chart + support map + live totals from real votes
  // Fill real odds for any player questions that already have a market (default 50/50).
  const renderPP=()=>{const el=document.getElementById('playerPredList');if(el)el.innerHTML=yesNoListHTML(pPreds);};
  _activeQuestionRender=renderPP; loadQuestionPcts(pPreds,renderPP);
}

/* ════════ COMPARE ════════ */
function donut(aPct,size,colorA,colorB,thick){
  size=size||120;thick=thick||16;
  const r=(size-thick)/2,c=2*Math.PI*r,off=c*(1-aPct/100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="display:block;">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorB}" stroke-width="${thick}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorA}" stroke-width="${thick}"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="butt" transform="rotate(-90 ${size/2} ${size/2})"/>
  </svg>`;
}
function fillCompareSelects(){
  const opts=players.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  cmpA.innerHTML=opts;cmpB.innerHTML=opts;
  // default to two players that actually have votes (so the vote comparison shows a real
  // split, not 100/0). players is sorted votes-desc, so the top two voted players win;
  // fall back to the first two players if fewer than two have any votes.
  const voted=players.filter(p=>p.votes>0);
  const pick=voted.length>=2?voted:players;
  cmpA.value=pick[0]?pick[0].id:'';
  cmpB.value=pick[1]?pick[1].id:(pick[0]?pick[0].id:'');
  renderCompare();
}
function cmpCard(p,side){
  const img=p.photo?`<img class="cmp2-photo" src="${p.photo}" alt="${(p.name||'').replace(/"/g,'')}" onerror="this.remove()">`:'';
  return `<div class="cmp2-card ${side}" onclick="openPlayer('${p.id}','compare')"><span class="cmp2-init">${p.short||''}</span>${img}</div>`;
}
function renderCompare(){
  const a=players.find(p=>p.id===cmpA.value),b=players.find(p=>p.id===cmpB.value);
  if(!a||!b){if(typeof compareBody!=='undefined'&&compareBody)compareBody.innerHTML='';return;}
  const aPct=(a.votes+b.votes)?Math.round(a.votes/(a.votes+b.votes)*100):50;
  // Real, API-backed stats (top speed / shots-on-target / passes have no data source).
  const rows=[['WC Appearances','matches',0],['Most WC Goals','goals',0],['Most WC Assists','assists',0],['Goals / Match','gpm',2]];
  compareBody.innerHTML=`
  <div class="cmp2-cards">
    ${cmpCard(a,'a')}
    <div class="cmp2-vs">VS</div>
    ${cmpCard(b,'b')}
  </div>
  <div class="cmp2-sec">Vote Comparison</div>
  <div class="cmp2-vote">
    <div class="cmp2-vote-side"><div class="cmp2-vote-name">${a.last}</div><div class="cmp2-vote-pct">${aPct}%</div></div>
    <div class="cmp2-donut">${donut(aPct,100,'#4000FF','#E7DFFF',16)}</div>
    <div class="cmp2-vote-side r"><div class="cmp2-vote-name">${b.last}</div><div class="cmp2-vote-pct">${100-aPct}%</div></div>
  </div>
  <div class="cmp2-stats">
    ${rows.map(([lbl,k,dec])=>{
      const av=Number(a[k])||0,bv=Number(b[k])||0,tot=av+bv||1,pct=Math.round(av/tot*100);
      const show=v=>dec?v.toFixed(dec):fmt(v);
      // the lower value is de-emphasised (Poppins reg 14); the greater stays Clash bold 24.
      const aLo=av<bv?' cmp2-lo':'', bLo=bv<av?' cmp2-lo':'';
      return `<div class="cmp2-stat">
        <div class="cmp2-stat-top"><span class="cmp2-a${aLo}">${show(av)}</span><span class="cmp2-name">${lbl}</span><span class="cmp2-b${bLo}">${show(bv)}</span></div>
        <div class="cmp2-bar"><div class="cmp2-fill" style="width:${pct}%;"></div></div>
      </div>`;}).join('')}
  </div>`;
}

/* ════════ MARKETS ════════ */
function marketSideMedia(o){
  if(o.pid){const p=players.find(x=>x.id===o.pid);if(p)return avatarHTML(p,34);}
  if(o.flag){const fi=flagImg(o.flag,22);if(fi)return `<span style="line-height:0">${fi}</span>`;}
  return '';
}
// Displayed odds = share of real prediction money (fc_allocated) per side. Until anyone
// forecasts, every market shows an even split (50/50 for two outcomes). Percentages always
// sum to 100. Applies to every tab (All / Tournament / Players / Countries).
function marketPcts(m){
  const opts=(m&&m.options)||[],n=opts.length||1;
  // Virtual liquidity per side: keeps the split at an exact 50/50 with no forecasts, and
  // makes the odds move smoothly (not jump straight to 100/0) once stakes come in.
  const V=100;
  const alloc=opts.map(o=>Number(o.alloc||o.fc_allocated||0)+V);
  const total=alloc.reduce((s,x)=>s+x,0)||1;
  let acc=0;
  return alloc.map((x,i)=>{const v=(i===n-1)?(100-acc):Math.round(x/total*100);acc+=v;return v;});
}
// "+1.4k" style overflow count
function mkCount(n){return n>=1000?'+'+(n/1000).toFixed(1).replace(/\.0$/,'')+'k':'+'+n;}
function mkInitials(name){const n=(name||'').trim()||'?';return ((n.match(/[A-Za-z0-9]+/g)||[n]).map(w=>w[0]).join('').slice(0,2)||'?').toUpperCase();}
// one predictor avatar — their photo, else name-initials (sidebar style)
function mkAvatar(p){return p.photo?`<span class="mk-pa" style="background-image:url('${String(p.photo).replace(/'/g,'')}')"></span>`:`<span class="mk-pa" title="${(p.name||'').replace(/"/g,'')}">${mkInitials(p.name)}</span>`;}
function mkOption(m,o,pct,active){
  const isYN=m.kind==='yn';
  const player=o.pid?players.find(x=>x.dbId===o.pid||x.id===o.pid):null;
  const av=isYN?'':(player&&player.photo?`<img class="mk-av" src="${player.photo}" alt="">`:(player?`<span class="mk-av mk-av-i">${player.short||''}</span>`:''));
  const nm=isYN
    ?`<img class="mk-yn-img" src="assets/${(o.n||'').toLowerCase()}_${active?'active':'inactive'}.svg" alt="${o.n}">`
    :`<span class="mk-name">${(o.n||'').toUpperCase()}</span>`;
  // Real predictors (supporter_count = total). Avatars come from market_predictors() — up to
  // 3 recent faces; if the RPC isn't live yet, fall back to the current user on their own pick.
  const sup=Number(o.supporters||0);
  let preds=(typeof marketPredictors!=='undefined'&&marketPredictors[o.id])||[];
  if(!preds.length && active && state.user){
    preds=[{name:(typeof pName==='function'?pName():'You'),photo:(state.profile&&state.profile.avatar_url)||''}];
  }
  let voters='';
  if(preds.length){
    const shown=preds.slice(0,3);
    const overflow=Math.max(0,sup-shown.length); // "+N" only beyond the avatars shown
    voters=`<span class="mk-voters"><span class="mk-stack">${shown.map(mkAvatar).join('')}</span>${overflow>0?`<span class="mk-count">${mkCount(overflow)}</span>`:''}</span>`;
  } else if(sup>0){
    voters=`<span class="mk-voters"><span class="mk-count">${mkCount(sup)}</span></span>`;
  }
  return `<button class="mk-opt ${active?'active':'inactive'}" onclick="openMarketPred('${m.id}')">
    <span class="mk-fill">${av}${nm}${voters}</span>
    <span class="mk-pct">${pct}%</span>
  </button>`;
}
function marketCardHTML(m){
  const pc=marketPcts(m);
  // active option = the one this user has forecast on; if they haven't, both stay grey/inactive
  const pick=(state.predictions||[]).find(p=>p.market===m.title);
  const pn=pick&&pick.pick;
  return `<div class="card market-card">
    <div class="market-top"><span class="market-type">${m.type}</span>
      <span class="market-closes"><span class="material-icons-outlined">schedule</span>Closes ${m.closes}</span></div>
    <div class="market-title">${m.title}</div>
    <div class="market-pool">Pool: <strong>${fmt(m.pool)} FC</strong></div>
    <div class="mk-opts">${m.options.map((o,i)=>mkOption(m,o,pc[i],pn===o.n)).join('')}</div>
  </div>`;
}
function openMarketPred(mid){
  const m=markets.find(x=>x.id===mid);
  openPredModal(m.id,m.title,marketPcts(m)[0],m.options[0].n,m.options[1].n,m);
}
// Lazily-created per-team / per-player question markets (tq_/pq_/mq_) live only in the
// team/player modals — keep them out of the main Predictions grid.
function gridMarkets(){return markets.filter(m=>!/^(tq|pq|mq)_/.test(m.id||''));}
function renderHomeMarkets(){homeMarkets.innerHTML=gridMarkets().slice(0,2).map(marketCardHTML).join('');}
function setMarketTab(t){state.mtab=t;document.querySelectorAll('#marketTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.mtab===t));renderMarkets();}
function renderMarkets(){marketGrid.innerHTML=gridMarkets().filter(m=>state.mtab==='all'||m.cat===state.mtab).map(marketCardHTML).join('');
  teamChips.innerHTML=countriesLB.map(c=>{const fi=flagImg(c.name,18);return `<button class="team-chip" onclick="openTeamPreds('${c.name}')">${fi||c.f}<span>${c.name}</span></button>`;}).join('');}
/* predict() removed — markets are binary via openMarketPred */
function renderPredHistory(){
  if(!state.predictions||!state.predictions.length){
    predHistory.innerHTML=state.user
      ? `<div class="empty-state" style="padding:22px 0;"><div class="empty-icon"><span class="material-icons-outlined">insights</span></div><div class="h3">No forecasts yet</div><div class="small" style="color:var(--ink-3);margin-top:6px;">Place a forecast above and it'll appear here.</div></div>`
      : `<div class="empty-state" style="padding:22px 0;"><div class="empty-icon"><span class="material-icons-outlined">lock</span></div><div class="h3">Sign in to forecast</div><div class="small" style="color:var(--ink-3);margin-top:6px;">Your predictions will show up here.</div></div>`;
    return;
  }
  predHistory.innerHTML=state.predictions.map((p,idx)=>{const w=p.status==='won';
    const open=p.status==='open';
    const potential=Number(p.potential||0)||(open?predPayout(p.fc,p.curPct||50).net:0);
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
        ${w?'+'+fmt(p.reward)+' FC':open?'<span style="font-size:10px;color:var(--ink-4);font-weight:600;display:block;">Potential</span>'+fmt(potential)+' FC':'Settled'}</div>
    </div>
    ${open?`<div class="pred-breakdown" id="pb-${idx}">
      <div class="pb-row"><span>Stake</span><strong>${fmt(p.fc)} FC</strong></div>
      <div class="pb-row"><span>Your pick</span><strong>${p.pick}</strong></div>
      <div class="pb-row"><span>Current odds</span><strong>${p.curPct||50}%${moved?` (${movePct>0?'+':''}${movePct}%)`:''}</strong></div>
      <div class="pb-row total"><span>Potential win</span><strong style="color:var(--green);">${fmt(potential)} FC</strong></div>
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
  // Lazy markets: each question gets a stable slug; its market is created the first time
  // someone forecasts it. Shows 50/50 until then (loadQuestionPcts fills real odds on open).
  return base.map((q,i)=>({id:p.id+'_'+i,q,yes:50,
    slug:p.dbId?('pq_'+p.dbId+'_'+i):null,category:'player',labelA:'Yes',labelB:'No'}));
}
function slugify(s){return String(s||'').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'');}
const TEAMS=[...new Set(players.map(p=>p.country))];
function teamFlag(C){const fi=flagImg(C,16);return fi||'';}
function teamPreds(C){
  const qs=[`Will ${C} win their group?`,`Will ${C} reach the Round of 16?`,`Will ${C} reach the quarter-finals?`,`Will ${C} reach the final?`,`Will ${C} keep a clean sheet in the group stage?`,`Will ${C} score 6+ goals in the group stage?`,`Will ${C} win the World Cup?`];
  // Lazy markets (created on first forecast). 50/50 until real stakes come in.
  return qs.map((q,i)=>({id:C+'_'+i,q,yes:50,slug:'tq_'+slugify(C)+'_'+i,category:'country',labelA:'Yes',labelB:'No'}));
}
let curPred=null;
function openPredModal(id,q,aPct,aLabel,bLabel,market,lazy){
  if(!requireAuth('Sign in to forecast'))return;
  aLabel=aLabel||'Yes';bLabel=bLabel||'No';
  curPred={id,q,aPct,aLabel,bLabel,side:'a',market:market||null,lazy:lazy||null};
  document.getElementById('predQ').textContent=q;
  document.getElementById('sideYesLbl').textContent=aLabel;
  document.getElementById('sideNoLbl').textContent=bLabel;
  document.getElementById('predYesPct').textContent=aPct+'%';
  document.getElementById('predNoPct').textContent=(100-aPct)+'%';
  selectSide('a');
  // Stake is selectable up to 1,000 (or the user's balance if higher); balance is enforced
  // at "Place Forecast", not on the slider. Defaults to the 50 FC minimum.
  const sl=document.getElementById('predSlider');sl.min=50;sl.step=50;sl.max=Math.max(1000,state.balance);sl.value=50;
  predAmt(sl.value);document.getElementById('predMax').textContent=fmt(state.balance);
  updatePredPayout();
  openModal('predModal');
}
function selectSide(s){curPred.side=s;
  document.getElementById('sideYes').classList.toggle('sel',s==='a');
  document.getElementById('sideNo').classList.toggle('sel',s==='b');updatePredPayout();}
function predAmt(v){document.getElementById('predAmtNum').textContent=fmt(+v);updatePredPayout();}
function predQuick(v){const sl=document.getElementById('predSlider');sl.value=Math.min(v,+sl.max);predAmt(sl.value);}
async function confirmPred(){
  if(!requireAuth('Sign in to forecast'))return;
  const amt=+document.getElementById('predSlider').value;
  if(amt>state.balance){
    toast("You don't have enough Fan Credits — buy more to forecast",'lock');
    closeModal('predModal');openModal('creditsModal');return;
  }
  const sideLabel=curPred.side==='a'?curPred.aLabel:curPred.bLabel;
  const m=curPred.market;
  if(m&&m.dbId&&m.options&&m.options.length>=2){
    // Real, server-authoritative forecast: place_prediction deducts FC, records it, moves
    // the odds (fc_allocated) and grants XP — so it persists across refresh.
    const opt=curPred.side==='a'?m.options[0]:m.options[1];
    const {data,error}=await _sb.rpc('place_prediction',{p_market:m.dbId,p_option:opt.id,p_stake:amt});
    if(error){toast(error.message||'Forecast failed','error');return;}
    if(data&&data.balance!=null)state.balance=Number(data.balance);
    // Re-read this market's stakes so the % + bar update live.
    try{
      const {data:os}=await _sb.from('market_options').select('id,fc_allocated').eq('market_id',m.dbId);
      if(os){const mp={};os.forEach(o=>{mp[o.id]=Number(o.fc_allocated||0);});m.options.forEach(o=>{if(mp[o.id]!=null)o.alloc=mp[o.id];});}
    }catch(e){}
    m.pool=(m.pool||0)+amt;
    const pct=marketPcts(m)[curPred.side==='a'?0:1];
    syncBalance();renderMarkets();renderHomeMarkets();closeModal('predModal');
    loadPredictions(); if(typeof loadTransactions==="function")loadTransactions(); // refresh history + FC ledger
    const net=(data&&data.potential_payout!=null)?Number(data.potential_payout):predPayout(amt,pct).net;
    toast(`Forecast placed · potential win ${fmt(net)} FC`,'insights');
    return;
  }
  const lz=curPred.lazy;
  if(lz&&lz.slug){
    // Lazy market: the server creates the market on first forecast, then places the bet —
    // so per-team / per-player questions persist and move just like the main markets.
    const {data,error}=await _sb.rpc('forecast_question',{
      p_slug:lz.slug,p_title:lz.q||curPred.q,p_category:lz.category||'country',
      p_label_a:lz.labelA||'Yes',p_label_b:lz.labelB||'No',p_side:curPred.side,p_stake:amt});
    if(error){toast(error.message||'Forecast failed','error');return;}
    if(data&&data.balance!=null)state.balance=Number(data.balance);
    const av=Number((data&&data.alloc_a)||0)+100,bv=Number((data&&data.alloc_b)||0)+100;
    lz.yes=Math.round(av/(av+bv)*100);                 // update the question's live odds
    syncBalance();closeModal('predModal');
    loadPredictions(); if(typeof loadTransactions==="function")loadTransactions(); // refresh history + FC ledger
    if(typeof _activeQuestionRender==='function')_activeQuestionRender(); // refresh the open list
    const net=(data&&data.potential_payout!=null)?Number(data.potential_payout):predPayout(amt,lz.yes).net;
    toast(`Forecast placed · potential win ${fmt(net)} FC`,'insights');
    return;
  }
  // Last resort (no slug, no DB market): client-side only.
  state.balance-=amt;
  const pct=curPred.side==='a'?curPred.aPct:(100-curPred.aPct);
  state.predictions.unshift({market:curPred.q,pick:sideLabel,fc:amt,status:'open',sidePct:pct,curPct:pct});
  state.upStreak[curPred.q]=0;
  syncBalance();renderPredHistory();closeModal('predModal');grantXP(15,'prediction');
  toast(`Forecast placed · potential win ${fmt(predPayout(amt,pct).net)} FC`,'insights');
}
const _questionMap={};
let _activeQuestionRender=null; // re-renders the open question list after a forecast moves it
function yesNoListHTML(arr){
  return arr.map(p=>{ _questionMap[p.id]=p; return `
  <button class="yn-row" onclick="openQuestionPred('${p.id}')">
    <span class="yn-q">${p.q}</span>
    <span class="yn-prob"><span class="yn-yes">${p.yes}%</span><span class="yn-sep">·</span><span class="yn-no">${100-p.yes}%</span></span>
    <span class="material-icons-round yn-chev">chevron_right</span>
  </button>`;}).join('');
}
function openQuestionPred(id){
  const q=_questionMap[id]; if(!q)return;
  closeModal('teamPredModal'); // hide the question list so the forecast modal is on top
  openPredModal(q.id,q.q,q.yes,q.labelA||'Yes',q.labelB||'No',null,q); // q = lazy-market descriptor
}
// Fill real odds for any questions whose market already exists (default stays 50/50).
async function loadQuestionPcts(questions,rerender){
  const slugs=questions.map(q=>q.slug).filter(Boolean);
  if(!slugs.length)return;
  try{
    const {data}=await _sb.from('markets').select('slug, market_options!market_id(side,fc_allocated)').in('slug',slugs);
    if(!data)return;
    const bySlug={}; data.forEach(m=>{ bySlug[m.slug]=m.market_options||[]; });
    questions.forEach(q=>{
      const opts=bySlug[q.slug]; if(!opts)return;
      const a=opts.find(o=>o.side==='a'),b=opts.find(o=>o.side==='b');
      const av=Number((a&&a.fc_allocated)||0)+100,bv=Number((b&&b.fc_allocated)||0)+100; // virtual liquidity
      q.yes=Math.round(av/(av+bv)*100);
    });
    if(rerender)rerender();
  }catch(e){}
}
function openTeamPreds(C){
  document.getElementById('teamPredTitle').innerHTML=`${teamFlag(C)} ${C}`;
  const qs=teamPreds(C);
  const render=()=>{document.getElementById('teamPredList').innerHTML=yesNoListHTML(qs);};
  _activeQuestionRender=render; render();
  openModal('teamPredModal');
  loadQuestionPcts(qs,render); // pull real odds for any already-created markets
}

/* ════════ LEADERBOARD ════════ */
function setLbTab(t){state.ltab=t;document.querySelectorAll('[data-ltab]').forEach(b=>b.classList.toggle('active',b.dataset.ltab===t));renderLeaderboard();}
const moveHTML=m=>{const c=m>0?'up':m<0?'down':'flat-t';const tx=m>0?'+'+m:m<0?''+m:'—';return `<div class="lb-move ${c}">${tx}</div>`;};
// Real rank movement: how far a player has moved since the last leaderboard baseline.
// Baseline is captured at load + every 60s, so the +/- shows live change, not fake numbers.
function captureLbBaseline(){state.lbBaseRank={};players.forEach((p,i)=>{state.lbBaseRank[p.id]=i;});}
function lbMove(p,rankIdx){const b=state.lbBaseRank&&state.lbBaseRank[p.id];if(b==null)return 0;return Math.max(-9,Math.min(9,b-rankIdx));}
function renderLeaderboard(){
  if(state.ltab==='players'){
    lbPodiumWrap.style.display='';
    lbPodium.innerHTML=podiumHTML(players.slice(0,3));
    lbList.innerHTML=players.slice(3,12).map((p,i)=>`
    <div class="prow" onclick="openPlayer('${p.id}','leaderboard')">
      <div class="p-rank">${i+4}</div>${avatarHTML(p)}
      <div class="p-info"><div class="p-name">${p.name}</div><div class="p-meta">${p.country}</div></div>
      <div class="p-votes"><div class="p-votes-num">${fmtV(p.votes)}</div></div>
      ${moveHTML(lbMove(p,i+3))}
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

