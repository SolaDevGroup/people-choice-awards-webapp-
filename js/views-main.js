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
  const cs=[...new Set(players.map(p=>p.country).filter(Boolean))].sort();
  ddCountry.innerHTML='<option value="">Country</option>'+cs.map(c=>`<option>${c}</option>`).join('');
}
function renderVoteList(){
  const q=(playerSearch.value||'').toLowerCase().trim();
  const co=ddCountry.value,so=ddSort.value;
  let list=players.filter(p=>
    (state.pos==='all'||p.pos===state.pos)&&(!co||p.country===co)&&
    (!q||p.name.toLowerCase().includes(q)||p.country.toLowerCase().includes(q)));
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

/* ════════ SHARE PLAYER ════════ */
// Deep-link to a player: ?player=<id>. init.js reads it on load and opens the detail page.
function playerShareUrl(id){return location.origin+location.pathname+'?player='+encodeURIComponent(id);}
let _shareUrl='', _shareText='';
// Brand SVG paths (simple-icons, 24×24, white fill)
const SHARE_BRANDS={
  whatsapp:{label:'WhatsApp',color:'#25D366',path:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.447h.005c6.585 0 11.946-5.359 11.949-11.893a11.821 11.821 0 00-3.479-8.453'},
  x:{label:'X',color:'#000000',path:'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z'},
  facebook:{label:'Facebook',color:'#1877F2',path:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'},
  telegram:{label:'Telegram',color:'#26A5E4',path:'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.061 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'}
};
function openSharePlayer(id,name){
  _shareUrl=playerShareUrl(id);
  const p=(typeof players!=='undefined')?players.find(x=>x.id===id):null;
  const nm=(p&&p.name)||name||'this player';
  // Rich share text: flag + name + nationality/position/number, then a clear call-to-action.
  const flag=(p&&typeof flagEmoji==='function'&&flagEmoji(p.country))||'';
  const role=p?[p.country,(typeof posName==='function'?posName(p.pos):p.pos),p.num?'#'+p.num:''].filter(Boolean).join(' · '):'';
  const text=`🗳️ I'm backing ${flag?flag+' ':''}${nm}${role?' ('+role+')':''} for WC26 Fan Player of the Tournament! 🏆 Cast your vote:`;
  document.getElementById('shareSub').textContent=`Send ${nm} to anyone — opening the link takes them straight to the stats & vote page.`;
  const u=encodeURIComponent(_shareUrl), t=encodeURIComponent(text);
  _shareText=text;
  const hrefs={
    whatsapp:`https://wa.me/?text=${t}%20${u}`,
    x:`https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    facebook:`https://www.facebook.com/sharer/sharer.php?u=${u}`,
    telegram:`https://t.me/share/url?url=${u}&text=${t}`
  };
  document.getElementById('shareTitle').textContent=`Share ${nm}`;
  document.getElementById('shareLinkInput').value=_shareUrl;
  let html=Object.keys(SHARE_BRANDS).map(k=>{const b=SHARE_BRANDS[k];
    return `<a class="share-item" href="${hrefs[k]}" target="_blank" rel="noopener" onclick="closeModal('shareModal')"><span class="share-ico" style="background:${b.color}"><svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true"><path d="${b.path}"/></svg></span><span class="share-lbl">${b.label}</span></a>`;
  }).join('');
  // native share sheet (mobile / supported browsers) → reach every other app
  if(navigator.share)html+=`<button class="share-item" onclick="nativeSharePlayer()"><span class="share-ico" style="background:#6640FF"><span class="material-icons-round">ios_share</span></span><span class="share-lbl">More</span></button>`;
  document.getElementById('shareGrid').innerHTML=html;
  openModal('shareModal');
}
function copyShareLink(){
  const done=()=>toast('Link copied to clipboard','link');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(_shareUrl).then(done,done);
  else{const inp=document.getElementById('shareLinkInput');inp.select();try{document.execCommand('copy');}catch(e){}done();}
}
function nativeSharePlayer(){
  if(navigator.share){navigator.share({title:'WC26 Fan Vote',text:_shareText,url:_shareUrl}).then(()=>closeModal('shareModal'),()=>{});}
  else copyShareLink();
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
// Pre-boot the checkout Edge Function (debounced) when a purchase modal opens, so the
// imports/container are already hot and the real Buy click creates the session in ~1s
// instead of a 5–6s cold start. The {warmup:true} ping returns early — no session made.
let _lastWarm=0;
function warmCheckout(){
  if(typeof _sb==='undefined'||!_sb||!_sb.functions)return;
  const now=Date.now();
  if(now-_lastWarm<90000)return;   // at most once every 90s
  _lastWarm=now;
  try{ _sb.functions.invoke('create-checkout-session',{body:{warmup:true}}).catch(()=>{}); }catch(e){}
}
// Full-screen "Opening secure checkout…" overlay — instant, obvious feedback so the
// button never reads as unclickable while the Edge Function builds the Stripe session.
function showCheckoutLoading(){
  let el=document.getElementById('coLoading');
  if(!el){el=document.createElement('div');el.id='coLoading';el.className='co-loading';
    el.innerHTML='<div class="co-loading-box"><div class="co-inner"><div class="co-spin"></div><div class="co-loading-txt">Opening secure checkout…</div></div></div>';
    document.body.appendChild(el);}
  el.classList.add('on');
}
function hideCheckoutLoading(){const el=document.getElementById('coLoading');if(el)el.classList.remove('on');}
let _checkoutBusy=false;
async function stripeCheckout(product,playerId){
  if(!requireAuth('Sign in to continue'))return;
  const pk=(typeof STRIPE_PUBLISHABLE_KEY!=='undefined'&&STRIPE_PUBLISHABLE_KEY)||'';
  if(!pk){toast('Payment setup pending — add your Stripe keys','lock');return;}
  if(_checkoutBusy)return;          // ignore repeat taps while a session is being created
  _checkoutBusy=true;
  showCheckoutLoading();            // show immediately, before the (multi-second) network call
  try{
    const {data,error}=await _sb.functions.invoke('create-checkout-session',{
      body:{product,origin:location.origin,player_id:playerId||null}});
    if(error){const m=await fnErr(error);console.error('[checkout]',m);toast(m,'error');hideCheckoutLoading();_checkoutBusy=false;return;}
    if(!data||!data.url){console.error('[checkout]',data);toast((data&&data.error)||'Could not start checkout','error');hideCheckoutLoading();_checkoutBusy=false;return;}
    window.location.href=data.url; // → Stripe-hosted Checkout; overlay stays until the browser navigates away
  }catch(e){console.error('[checkout]',e);toast('Could not start checkout','error');hideCheckoutLoading();_checkoutBusy=false;}
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
// smooth Catmull-Rom → cubic-bézier path through the points (the Figma's flowing curve)
function smoothLinePath(pts){
  if(!pts.length)return '';
  if(pts.length<2)return `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||pts[i+1];
    const c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6;
    const c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
    d+=` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
let _trendUID=0;
function trendSVG(points,labels,W,H){
  W=W||600;H=H||180;
  const pts=points&&points.length?points:[0,0];
  const max=Math.max(...pts,1),range=max||1;
  const lpad=36,rpad=10,tpad=16,bpad=30;
  const px=i=>lpad+i*(W-lpad-rpad)/Math.max(pts.length-1,1);
  const py=v=>tpad+(1-v/range)*(H-tpad-bpad);
  const xy=pts.map((v,i)=>[px(i),py(v)]);
  const line=smoothLinePath(xy);
  const base=(H-bpad).toFixed(1);
  const area=`${line} L${xy[xy.length-1][0].toFixed(1)} ${base} L${xy[0][0].toFixed(1)} ${base} Z`;
  // y-axis labels (0 → max in 3 steps)
  const yt=[0,1,2,3].map(k=>{const v=max*k/3;return `<text class="axis-lbl" x="${lpad-9}" y="${(py(v)+3.5).toFixed(1)}" text-anchor="end">${fmtV(Math.round(v))}</text>`;}).join('');
  const n=labels.length||1,lx=i=>lpad+i*(W-lpad-rpad)/Math.max(n-1,1);
  const xl=labels.map((t,i)=>`<text class="axis-lbl" x="${lx(i).toFixed(0)}" y="${H-7}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${t}</text>`).join('');
  const uid='gt'+(++_trendUID); // unique gradient ids — multiple charts share the DOM, dup ids break url(#…)
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6640FF" stop-opacity=".5"/><stop offset="55%" stop-color="#6640FF" stop-opacity=".18"/><stop offset="100%" stop-color="#6640FF" stop-opacity="0"/></linearGradient>
      <linearGradient id="${uid}b" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#3D6BFF"/><stop offset="100%" stop-color="#6640FF"/></linearGradient>
    </defs>
    <path d="${area}" fill="url(#${uid}a)"/>
    <path d="${line}" fill="none" stroke="url(#${uid}b)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${yt}${xl}</svg>`;
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
/* Player-detail Vote Trend — same range filter as the home pulse, fed by this player's votes */
let _playerTrendRange='7d', _playerVoteDates=[];
function renderPlayerTrend(){
  const tc=document.getElementById('voteTrendChart'); if(!tc) return;
  const {points,labels}=votePulseData(_playerTrendRange,_playerVoteDates);
  tc.innerHTML=trendSVG(points,labels,600,180);
}
function setPlayerTrendRange(r){ _playerTrendRange=r; renderPlayerTrend(); }
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
    el.style.height='230px';el.style.borderRadius='24px';el.style.overflow='hidden';el.style.position='relative';
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
  const {data,error}=await _sb.from('pass_vote').select('created_at,updated_at,country_code,profiles(country_code)').eq('player_id',p.dbId);
  if(error){console.warn('[charts] votes load failed:',error.message);return;}
  const votes=(data||[]).map(v=>({created_at:v.created_at,fc_allocated:1,profiles:{country_code:(v.profiles&&v.profiles.country_code)||v.country_code}}));
  // trend — range-aware (7d / month / ytd), same engine as the home Tournament Pulse
  _playerVoteDates=votes.map(v=>v.created_at);
  renderPlayerTrend();
  // global support — highlight the signup countries, scaled by how many voters came from each
  const byCountry={};
  votes.forEach(v=>{const cc=v.profiles&&v.profiles.country_code;if(!cc)return;const name=SIGNUP_CODE[String(cc).toUpperCase()]||cc;byCountry[name]=(byCountry[name]||0)+1;});
  renderSupportMap('globalSupportMap',byCountry);
  // live totals + real 24h growth — support that LANDED on this player in the last 24h
  // (new or switched-in → updated_at), matching the player_vote_trends RPC.
  const total=votes.length;
  if(p)p.realVotes=total; // keep the player's live REAL votes in sync; p.votes getter adds the base
  const cut=new Date();cut.setHours(cut.getHours()-24);
  const recent=(data||[]).filter(v=>v.updated_at&&new Date(v.updated_at)>=cut).length;
  const growth=(total-recent)>0?(recent/(total-recent)*100):(recent>0?100:0);
  if(p)p.trend=Math.round(growth*10)/10; // single source of truth → cards/leaderboard agree
  const tv=document.getElementById('totalVotesVal');if(tv)tv.textContent=fmtV(p?p.votes:total); // base + real
  const gv=document.getElementById('voteGrowthVal');if(gv){const up=growth>=0;gv.textContent=(up?'+':'')+growth.toFixed(1)+'%';gv.className='ov-big '+(up?'up':'down');gv.style.color=up?'var(--green)':'var(--pink)';}
}

function openPlayer(id,from){
  const p=players.find(x=>x.id===id);
  const idx=players.indexOf(p);state.backTo=from||'vote';
  _playerTrendRange='7d'; // each player opens on the default range (select shows it too)
  const g=p.trend>=0;
  const pPreds=playerPreds(p); // keep a ref so we can fill real odds after render
  playerDetail.innerHTML=`
  <header class="pd-header" id="pdHeader">
    <button class="hero-icon" onclick="go(state.backTo)" aria-label="Back"><span class="material-icons-round">arrow_back</span></button>
    <div class="hero-htitle"><div class="hero-htitle-t">Player Detail</div><div class="hero-htitle-s">See all player's stats</div></div>
    <div class="hero-actions">
      <button class="hero-icon" onclick="openSharePlayer('${p.id}','${(p.name||'').replace(/'/g,'')}')" aria-label="Share"><span class="material-icons-round">ios_share</span></button>
      <button class="hero-icon" onclick="toggleFav('${p.id}',this);this.querySelector('span').textContent=state.favs.has('${p.id}')?'favorite':'favorite_border'" aria-label="Favourite">
        <span class="material-icons-round">${state.favs.has(p.id)?'favorite':'favorite_border'}</span></button>
    </div>
  </header>
  <div class="detail-hero">
    ${(p&&p.photo)?`<img class="detail-hero-img" src="${p.photo}" alt="" loading="lazy" onerror="this.remove()">`:`<div class="detail-hero-mark">${p.num}</div>`}
    ${(p&&p.photo)?`<div class="pd-blur" aria-hidden="true"><img src="${p.photo}"><img src="${p.photo}"><img src="${p.photo}"><img src="${p.photo}"><img src="${p.photo}"><img src="${p.photo}"></div>`:''}
    <div class="detail-first">${p.first}</div>
    <div class="detail-last">${p.last}</div>
    <div class="detail-meta">
      <div class="detail-meta-item">${flagImg(p.country,16)||p.flag} ${p.country}</div>
      <div class="detail-meta-item">#${p.num} <span class="mdot"></span> ${posName(p.pos)}</div>
    </div>
  </div>
  <div class="overlap-card">
    <div class="ov-top">
      <div><span class="lbl-xs">Total Votes</span><div class="ov-big" id="totalVotesVal">${fmtV(p.votes)}</div></div>
      <div><div class="ov-trend-col"><span class="lbl-xs">Vote Trend</span><div class="ov-big ${g?'up':'down'}" id="voteGrowthVal" style="color:${g?'var(--green)':'var(--pink)'};">${g?'+':''}${p.trend.toFixed(1)}%</div><div class="caption" style="color:var(--ink-4);">Last 24h</div></div></div>
    </div>
    <div class="ov-stats">
      <div><div class="ov-stat-l">Goals</div><div class="ov-stat-v">${p.goals}</div></div>
      <div><div class="ov-stat-l">Assists</div><div class="ov-stat-v">${p.assists}</div></div>
      <div><div class="ov-stat-l">Matches</div><div class="ov-stat-v">${p.matches}</div></div>
      <div><div class="ov-stat-l">WC Apps</div><div class="ov-stat-v">${p.wc||0}</div></div>
    </div>
  </div>
  <div class="chart-head"><span class="lbl">Vote Trend</span>
    <select id="playerTrendRange" class="mini-select" onchange="setPlayerTrendRange(this.value)" aria-label="Trend range">
      <option value="7d">Last 7 Days</option>
      <option value="month">Last Month</option>
      <option value="ytd">Year to Date</option>
    </select></div>
  <div id="voteTrendChart">${trendSVG([0,0,0,0,0,0,0],last7Days().filter((_,i)=>i%2===0).map(x=>x.label),600,180)}</div>
  <div class="chart-head"><span class="lbl">Global Support</span></div>
  <div class="map-wrap" id="globalSupportMap">${mapLoadingHTML()}</div>
  <div class="map-legend"><span>Low</span><span class="map-legend-track"></span><span>High</span></div>
  <div class="chart-head"><span class="lbl">Predictions for ${p.name.split(' ').slice(-1)[0]}</span><span class="caption" style="color:var(--ink-4);font-weight:600;">Yes / No</span></div>
  <div class="pq-list" id="playerPredList">${playerQListHTML(pPreds)}</div>
  <div class="detail-cta">
    ${voteBtnHTML(p,'btn-block')}
    <button class="sq-btn" onclick="openCompareWith('${p.id}')" aria-label="Compare players"><img class="sq-ico" src="assets/share.svg?v=20260624g" alt="Compare"></button>
  </div>`;
  go('player');
  // progressive-blur header: frost in once the hero scrolls up under the fixed header
  if(window._pdScroll)window.removeEventListener('scroll',window._pdScroll);
  window._pdScroll=function(){const h=document.getElementById('pdHeader');if(h)h.classList.toggle('scrolled',(window.scrollY||window.pageYOffset||0)>40);};
  window.addEventListener('scroll',window._pdScroll,{passive:true});window._pdScroll();
  loadPlayerCharts(p); // fill trend chart + support map + live totals from real votes
  // Fill real odds for any player questions that already have a market (default 50/50).
  const renderPP=()=>{const el=document.getElementById('playerPredList');if(el)el.innerHTML=playerQListHTML(pPreds);};
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
// Open the Compare page pre-filled with this player in slot A; slot B gets a
// sensible different default the user can change.
function openCompareWith(pid){
  const a=players.find(p=>p.id===pid);
  go('compare');
  if(typeof cmpA==='undefined'||!cmpA){return;}
  if(!cmpA.options.length && typeof fillCompareSelects==='function')fillCompareSelects();
  if(a)cmpA.value=pid;
  if(cmpB && (cmpB.value===pid || !cmpB.value)){
    const other=players.find(p=>p.id!==pid && p.votes>0)||players.find(p=>p.id!==pid);
    if(other)cmpB.value=other.id;
  }
  if(typeof renderCompare==='function')renderCompare();
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
// Resolve the player a vs-option refers to: by id first, then by matching the label to a name.
function mkNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[^a-z]/g,'');}
function mkFindPlayer(label){
  if(!label)return null;
  const words=String(label).split(/\s+/).map(mkNorm).filter(w=>w.length>2&&w!=='jr');
  if(!words.length)return null;
  return players.find(p=>{const pl=mkNorm(p.last),pn=mkNorm(p.name);return words.some(w=>(pl&&(pl.includes(w)||w.includes(pl)))||(pn&&pn.includes(w)));})||null;
}
// A yes/no market about a country → that country's name (for the flag chip).
function mkMarketCountry(m){
  if(typeof FLAG_FILE==='undefined'||!m||!m.title)return '';
  return Object.keys(FLAG_FILE).find(c=>m.title.indexOf(c)>=0)||'';
}
function mkOption(m,o,pct,active,idx,big){
  const isYN=m.kind==='yn';
  // player markets → real photo before the name; fall back to id-match then label-match, then initials
  let player=o.pid?players.find(x=>x.dbId===o.pid||x.id===o.pid):null;
  if(!player&&!isYN)player=mkFindPlayer(o.n);
  const av=player?(player.photo?`<img class="mk-av" src="${player.photo}" alt="">`:`<span class="mk-av mk-av-i">${player.short||mkInitials(player.name)}</span>`):'';
  // country yes/no markets → the country flag after the YES/NO label
  const ctry=isYN?mkMarketCountry(m):'';
  const flag=ctry?`<span class="mk-flag">${flagImg(ctry,16)||''}</span>`:'';
  const nm=isYN
    ?`<img class="mk-yn-img" src="assets/${(o.n||'').toLowerCase()}_${active?'active':'inactive'}.svg?v=20260623a" alt="${o.n}">`
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
  return `<button class="mk-opt ${active?'active':'inactive'}${big?'':' sm'}" onclick="openMarketPred('${m.id}','${idx===1?'b':'a'}')">
    <span class="mk-fill" style="--fill:${pct}%">${av}${nm}${flag}${voters}</span>
    <span class="mk-pct">${pct}%</span>
  </button>`;
}
function marketCardHTML(m){
  const pc=marketPcts(m);
  // active option = the one this user has forecast on; if they haven't, both stay grey/inactive
  const pick=(state.predictions||[]).find(p=>p.market===m.title);
  const pn=pick&&pick.pick;
  const engaged=pick?Number(pick.fc||0):0; // FC the user engaged in this market (only if they forecast)
  return `<div class="card market-card">
    <div class="market-top"><span class="market-type">${m.type}</span>
      <span class="market-closes"><span class="material-icons-outlined">schedule</span>Closes ${m.closes}</span></div>
    <div class="market-title">${m.title}</div>
    <div class="market-pool"><span>Pool: <strong>${fmt(m.pool)} FC</strong></span>${engaged?`<span class="mk-engaged">FC Engaged: <strong>${fmt(engaged)} FC</strong></span>`:''}</div>
    <div class="mk-opts">${(mx=>m.options.map((o,i)=>mkOption(m,o,pc[i],pn===o.n,i,pc[i]>=mx)))(Math.max(...pc)).join('')}</div>
  </div>`;
}
function openMarketPred(mid,side){
  const m=markets.find(x=>x.id===mid);
  openPredModal(m.id,m.title,marketPcts(m)[0],m.options[0].n,m.options[1].n,m,null,side);
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
        <div class="hist-sub">${p.pick} · <strong>${fmt(p.fc)} FC</strong> engaged${moved?` · <span style="color:${movePct>0?'var(--green)':'var(--live)'};font-weight:700;">${movePct>0?'▲':'▼'} ${Math.abs(movePct)}%</span>`:''}</div></div>
      <div class="hist-amt" style="color:${w?'var(--green)':open?'var(--green)':'var(--ink-4)'};text-align:right;">
        ${w?'+'+fmt(p.reward)+' FC':open?'<span style="font-size:10px;color:var(--ink-4);font-weight:600;display:block;">Potential</span>'+fmt(potential)+' FC':'Settled'}</div>
    </div>
    ${open?`<div class="pred-breakdown" id="pb-${idx}">
      <div class="pb-row"><span>Engaged</span><strong>${fmt(p.fc)} FC</strong></div>
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
  return base.map((q,i)=>({id:p.id+'_'+i,q,yes:50,country:p.country,
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
function openPredModal(id,q,aPct,aLabel,bLabel,market,lazy,side){
  if(!requireAuth('Sign in to forecast'))return;
  aLabel=aLabel||'Yes';bLabel=bLabel||'No';
  side=(side==='b')?'b':'a'; // preselect the option the user actually clicked
  curPred={id,q,aPct,aLabel,bLabel,side,market:market||null,lazy:lazy||null};
  document.getElementById('predQ').textContent=q;
  document.getElementById('sideYesLbl').textContent=aLabel;
  document.getElementById('sideNoLbl').textContent=bLabel;
  document.getElementById('predYesPct').textContent=aPct+'%';
  document.getElementById('predNoPct').textContent=(100-aPct)+'%';
  // Yes/No markets keep the green/red semantics; name-vs-name markets go neutral (no good/bad side)
  const isYN=(aLabel==='Yes'&&bLabel==='No');
  document.getElementById('predSideRow').classList.toggle('names',!isYN);
  selectSide(side);
  // Stake is selectable up to 1,000 (or the user's balance if higher); balance is enforced
  // at "Place Forecast", not on the slider. Defaults to the 50 FC minimum.
  const sl=document.getElementById('predSlider');sl.min=50;sl.step=50;sl.max=Math.max(1000,state.balance);sl.value=50;
  predAmt(sl.value);document.getElementById('predMax').textContent=fmt(state.balance);
  updatePredPayout();
  openModal('predModal');
  // refresh the shown balance from the DB (cached value can be stale)
  syncBalanceFromDB().then(b=>{const pm=document.getElementById('predMax');if(pm)pm.textContent=fmt(b);sl.max=Math.max(1000,b);});
}
function selectSide(s){curPred.side=s;
  document.getElementById('sideYes').classList.toggle('sel',s==='a');
  document.getElementById('sideNo').classList.toggle('sel',s==='b');updatePredPayout();}
function predAmt(v){document.getElementById('predAmtNum').textContent=fmt(+v);updatePredPayout();}
function predQuick(v){const sl=document.getElementById('predSlider');sl.value=Math.min(v,+sl.max);predAmt(sl.value);}
// The cached state.balance can drift from the DB (other spends, multiple tabs, etc.).
// Re-read the authoritative fc_balance so we never let a stake exceed the real balance
// (which would otherwise hit the profiles_fc_balance_check constraint server-side).
async function syncBalanceFromDB(){
  try{
    if(state.user&&typeof _sb!=='undefined'){
      const {data}=await _sb.from('profiles').select('fc_balance').eq('id',state.user.id).single();
      if(data&&data.fc_balance!=null){state.balance=Number(data.fc_balance);syncBalance();}
    }
  }catch(e){}
  return state.balance;
}
function notEnoughFC(){
  toast("You don't have enough Fan Credits — buy more to forecast",'lock');
  closeModal('predModal');openModal('creditsModal');
}
async function confirmPred(){
  if(!requireAuth('Sign in to forecast'))return;
  const amt=+document.getElementById('predSlider').value;
  await syncBalanceFromDB();               // use the REAL balance, not the cached one
  if(amt>state.balance){ notEnoughFC(); return; }
  const sideLabel=curPred.side==='a'?curPred.aLabel:curPred.bLabel;
  const m=curPred.market;
  if(m&&m.dbId&&m.options&&m.options.length>=2){
    const opt=curPred.side==='a'?m.options[0]:m.options[1];
    // ── Optimistic UI: flip the bar to the selected state + close the modal INSTANTLY,
    //    then persist on the server in the background (roll back if it fails). ──
    const snap={pool:m.pool||0,alloc:m.options.map(o=>o.alloc||0),preds:(state.predictions||[]).slice(),bal:state.balance};
    m.pool=(m.pool||0)+amt; opt.alloc=(opt.alloc||0)+amt;
    const pct=marketPcts(m)[curPred.side==='a'?0:1];
    state.predictions=(state.predictions||[]).filter(p=>p.market!==m.title);
    state.predictions.unshift({market:m.title,pick:sideLabel,fc:amt,status:'open',sidePct:pct,curPct:pct});
    state.balance=Math.max(0,state.balance-amt);
    syncBalance();renderMarkets();renderHomeMarkets();closeModal('predModal');
    // Real, server-authoritative forecast: place_prediction deducts FC, records it, moves the odds.
    const {data,error}=await _sb.rpc('place_prediction',{p_market:m.dbId,p_option:opt.id,p_stake:amt});
    if(error){
      // roll back the optimistic changes
      m.pool=snap.pool; m.options.forEach((o,i)=>o.alloc=snap.alloc[i]); state.predictions=snap.preds;
      await syncBalanceFromDB(); renderMarkets(); renderHomeMarkets();
      if(/fc_balance|Insufficient Fan Credits/i.test(error.message||'')){ notEnoughFC(); }
      else { toast(error.message||'Forecast failed','error'); }
      return;
    }
    if(data&&data.balance!=null)state.balance=Number(data.balance);
    // Reconcile the real stakes/odds from the server.
    try{
      const {data:os}=await _sb.from('market_options').select('id,fc_allocated').eq('market_id',m.dbId);
      if(os){const mp={};os.forEach(o=>{mp[o.id]=Number(o.fc_allocated||0);});m.options.forEach(o=>{if(mp[o.id]!=null)o.alloc=mp[o.id];});}
    }catch(e){}
    syncBalance();renderMarkets();renderHomeMarkets();
    loadPredictions(); if(typeof loadTransactions==="function")loadTransactions(); // refresh history + FC ledger
    const net=(data&&data.potential_payout!=null)?Number(data.potential_payout):predPayout(amt,pct).net;
    toast(`Forecast placed · potential win ${fmt(net)} FC`,'insights');
    return;
  }
  const lz=curPred.lazy;
  if(lz&&lz.slug){
    // Lazy market: the server creates the market on first forecast, then places the bet —
    // so per-team / per-player questions persist and move just like the main markets.
    const qTitle=lz.q||curPred.q;
    // ── Optimistic UI: flip the bar to active + close the modal INSTANTLY, then persist
    //    on the server in the background (roll back if it fails). Mirrors the markets flow. ──
    const snap={preds:(state.predictions||[]).slice(),bal:state.balance,yes:lz.yes};
    state.predictions=(state.predictions||[]).filter(p=>p.market!==qTitle);
    state.predictions.unshift({market:qTitle,pick:sideLabel,fc:amt,status:'open',sidePct:lz.yes,curPct:lz.yes});
    state.balance=Math.max(0,state.balance-amt);
    syncBalance();closeModal('predModal');
    if(typeof _activeQuestionRender==='function')_activeQuestionRender(); // bar flips active NOW
    const {data,error}=await _sb.rpc('forecast_question',{
      p_slug:lz.slug,p_title:qTitle,p_category:lz.category||'country',
      p_label_a:lz.labelA||'Yes',p_label_b:lz.labelB||'No',p_side:curPred.side,p_stake:amt});
    if(error){
      state.predictions=snap.preds; state.balance=snap.bal; lz.yes=snap.yes; // roll back
      await syncBalanceFromDB();
      if(typeof _activeQuestionRender==='function')_activeQuestionRender();
      if(/fc_balance|Insufficient Fan Credits/i.test(error.message||'')){ notEnoughFC(); return; }
      toast(error.message||'Forecast failed','error');return;
    }
    if(data&&data.balance!=null)state.balance=Number(data.balance);
    const av=Number((data&&data.alloc_a)||0)+100,bv=Number((data&&data.alloc_b)||0)+100;
    lz.yes=Math.round(av/(av+bv)*100);                 // reconcile the question's live odds
    const pe=state.predictions.find(p=>p.market===qTitle); if(pe){pe.curPct=lz.yes;pe.sidePct=lz.yes;}
    syncBalance();
    if(typeof _activeQuestionRender==='function')_activeQuestionRender();
    loadPredictions(); if(typeof loadTransactions==="function")loadTransactions(); // refresh history + FC ledger
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
// Player questions rendered with the same stacked-bar market card as the Predictions page.
function playerQCardHTML(q){
  _questionMap[q.id]=q;
  const yes=q.yes||50, no=100-yes;
  const pick=(state.predictions||[]).find(x=>x.market===q.q); const pn=pick&&pick.pick; // active = user's pick
  const engaged=pick?Number(pick.fc||0):0;
  const closes=(typeof VOTING_CLOSES!=='undefined')?VOTING_CLOSES.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):'Jul 19';
  // player YES/NO questions: NO country flag (flags are only for country-based markets) —
  // just the YES/NO label + predictor avatars, like the Predictions page.
  const bar=(label,pct,active,big)=>{
    let voters='';
    if(active&&state.user){
      const av=(state.profile&&state.profile.avatar_url)||'';
      voters=`<span class="mk-voters"><span class="mk-stack">${mkAvatar({name:(typeof pName==='function'?pName():'You'),photo:av})}</span></span>`;
    }
    return `<button class="mk-opt ${active?'active':'inactive'}${big?'':' sm'}" onclick="openQuestionPred('${q.id}','${label==='No'?'b':'a'}')">
      <span class="mk-fill" style="--fill:${pct}%"><img class="mk-yn-img" src="assets/${label.toLowerCase()}_${active?'active':'inactive'}.svg?v=20260623a" alt="${label}">${voters}</span>
      <span class="mk-pct">${pct}%</span>
    </button>`;
  };
  return `<div class="card market-card">
    <div class="market-top"><span class="market-type">Yes / No</span>
      <span class="market-closes"><span class="material-icons-outlined">schedule</span>Closes ${closes}</span></div>
    <div class="market-title">${q.q}</div>
    <div class="market-pool"><span>Pool: <strong>${fmt(q.pool||0)} FC</strong></span>${engaged?`<span class="mk-engaged">FC Engaged: <strong>${fmt(engaged)} FC</strong></span>`:''}</div>
    <div class="mk-opts">${bar('Yes',yes,pn==='Yes',yes>=no)}${bar('No',no,pn==='No',no>yes)}</div>
  </div>`;
}
function playerQListHTML(arr){return arr.map(playerQCardHTML).join('');}
function openQuestionPred(id,side){
  const q=_questionMap[id]; if(!q)return;
  closeModal('teamPredModal'); // hide the question list so the forecast modal is on top
  openPredModal(q.id,q.q,q.yes,q.labelA||'Yes',q.labelB||'No',null,q,side); // q = lazy-market descriptor
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
      const realA=Number((a&&a.fc_allocated)||0),realB=Number((b&&b.fc_allocated)||0);
      const av=realA+100,bv=realB+100;                 // virtual liquidity
      q.pool=realA+realB;                              // real engaged pool (0 → no pool line)
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
// Figma leaderboard row — frosted card: rank · avatar · name+meta · votes+trend · heart.
function lbRowHTML(p,rank){
  const medal = rank<=3 ? ' lb-r'+rank : '';
  const fav = !!(state.favs&&state.favs.has(p.id));
  const av = p.photo
    ? `<img src="${p.photo}" alt="" loading="lazy" onerror="this.remove()">`
    : `<span class="lb-av-i">${p.short||(p.name||'').slice(0,2).toUpperCase()}</span>`;
  const meta = [
    (flagImg(p.country,12)||'') + (p.country?`<span>${p.country}</span>`:''),
    (p.num?`<span class="lb-dot"></span><span class="lb-num">#${p.num}</span>`:'')
  ].join('');
  const t = Number(p.trend)||0;
  const rankEl = rank<=4
    ? `<span class="lb-rank lb-rank-badge"><img src="assets/leader${rank}.png?v=20260627r" alt="${rank}"></span>`
    : `<span class="lb-rank">${rank}</span>`;
  return `<div class="lb-row${medal}" onclick="openPlayer('${p.id}','leaderboard')">
    ${rankEl}
    <span class="lb-av">${av}</span>
    <div class="lb-body">
      <div class="lb-name-col"><div class="lb-name">${p.name}</div><div class="lb-meta">${meta}</div></div>
      <div class="lb-stat"><div class="lb-votes">${fmtV(p.votes)}</div><div class="lb-trend ${t>=0?'up':'down'}">${t>0?'+':''}${t.toFixed(1)}%</div></div>
    </div>
    <button class="lb-heart${fav?' on':''}" aria-label="Favourite" onclick="event.stopPropagation();toggleFav('${p.id}',this);this.classList.toggle('on',state.favs.has('${p.id}'));this.querySelector('span').textContent=state.favs.has('${p.id}')?'favorite':'favorite_border'"><span class="material-icons-round">${fav?'favorite':'favorite_border'}</span></button>
  </div>`;
}
function renderLeaderboard(){
  const lg=document.getElementById('lbLogo');if(lg&&!lg.getAttribute('src'))lg.src='assets/word_logo.svg?v=20260627r';
  if(state.ltab==='players'){
    lbList.innerHTML=players.slice(0,25).map((p,i)=>lbRowHTML(p,i+1)).join('');
  }else if(state.ltab==='fans'){
    lbList.innerHTML=fans.map((f,i)=>`
    <div class="lb-row${i<3?' lb-r'+(i+1):''}${f.me?' lb-me':''}" style="cursor:default;">
      <span class="lb-rank">${i+1}</span>
      <span class="lb-av"><span class="lb-av-i">${f.short}</span></span>
      <div class="lb-body">
        <div class="lb-name-col"><div class="lb-name">${f.name}${f.me?' <span class="lb-you">YOU</span>':''}</div><div class="lb-meta"><span>${f.c}</span></div></div>
        <div class="lb-stat"><div class="lb-votes">${fmt(f.votes)}</div></div>
      </div>
    </div>`).join('');
  }else{
    lbList.innerHTML=countriesLB.map((c,i)=>{const fi=flagImg(c.name,18);return `
    <div class="lb-row${i<3?' lb-r'+(i+1):''}" onclick="openTeamPreds('${c.name}')">
      <span class="lb-rank">${i+1}</span>
      <span class="lb-av" style="background:transparent;">${fi||`<span style="font-size:22px;">${c.f}</span>`}</span>
      <div class="lb-body">
        <div class="lb-name-col"><div class="lb-name">${c.name}</div><div class="lb-meta"><span>Tap for predictions</span></div></div>
        <div class="lb-stat"><div class="lb-votes">${fmtV(c.votes)}</div></div>
      </div>
    </div>`}).join('');
  }
}

