/* ════════ INIT ════════ */
function renderAll(){
  renderFeatured();renderHomePodium();renderHomeTrending();renderHomeMarkets();renderHomeExtra();
  renderVoteList();renderMarkets();renderPredHistory();renderLeaderboard();
  renderNotifs();renderProfile();renderAnalytics();renderFcPacks();renderCompare();renderStoreChips();renderMerch();renderCust();renderProfileHero();renderGames();renderXI();setSettingsPanel(state.setPanel||'account');renderTx();renderDaily();updateLevelUI();updateNotifBadges();syncBalance();renderAuthUI();
}
tick(); // first countdown paint (moved here so flipIfChanged, defined in a later module, exists)
// hydrate brand assets
navLogo.src=ASSETS.pca;heroLogo.src=ASSETS.logo;
var sbl=document.getElementById('sbLogo');if(sbl)sbl.src=ASSETS.pca;
var wc=document.getElementById('welcomeCoin');if(wc)wc.src=ASSETS.fc;
if(typeof renderDailyCta==='function')renderDailyCta();
var ml=document.getElementById('mLogo');if(ml)ml.src=ASSETS.pca;var mc2=document.getElementById('mCoin');if(mc2)mc2.src=ASSETS.fc;
[document.getElementById('sbCoin'),document.getElementById('hdrCoin')].forEach(el=>{if(el)el.src=ASSETS.fc;});
document.documentElement.style.setProperty('--decor-img',"url('"+ASSETS.decor+"')");
initSplash();
[navCoin,homeCoin,statCoin].forEach(el=>{if(el)el.src=ASSETS.fc;});
document.querySelectorAll('.fc-coin').forEach(el=>{if(!el.src)el.src=ASSETS.fc;});
buildXISlots();renderXI();fillDropdowns();fillCompareSelects();renderAll();observeReveals();
if(typeof renderStoreTicker==='function')renderStoreTicker(); // seed the Fan Store schedule ticker
// Header progressive blur only kicks in once the page has scrolled under it.
// scrollRestoration:manual stops Safari restoring a scroll position on load (which would
// otherwise flag the page as "scrolled" and show the blur before the user scrolls).
(function(){try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(e){}
 var onScroll=function(){document.body.classList.toggle('hdr-scrolled',(window.scrollY||document.documentElement.scrollTop||0)>8);};
 window.addEventListener('scroll',onScroll,{passive:true});
 window.scrollTo(0,0);onScroll();})();
loadCatalog(); // live catalog (player photos come from photo_hd → FotMob, set by scripts/enrich-photos.mjs)
setInterval(refreshOdds,20000); // real odds refresh (no fake simulation)
setInterval(refreshLeaderboard,60000); // real leaderboard rank movement (matches "every 60s")
setInterval(refreshFixtures,45000); // keep today's games + LIVE badges current
setTimeout(runWelcome,5200); // after splash
setTimeout(custPromoPop,9000); // promote customization

// Returning from Stripe-hosted Checkout (success_url / cancel_url carry ?pass=…).
// The webhook is what actually grants the pass server-side; here we just confirm + tidy up.
(function handlePassReturn(){
  try{
    const q=new URLSearchParams(location.search);
    const p=q.get('pass'), fc=q.get('fc');
    if(!p&&!fc)return;
    history.replaceState(null,'',location.pathname+location.hash); // don't repeat on refresh
    // FC coin-pack purchase → reload the profile a couple times (webhook lag) so the new
    // balance shows, then confirm. The webhook is what actually credits the FC.
    if(fc){
      if(fc==='cancelled'){setTimeout(()=>toast('Purchase cancelled','info'),700);return;}
      const refresh=async()=>{ if(state.user)await loadProfile(state.user.id); };
      setTimeout(refresh,1200);
      setTimeout(async()=>{await refresh();toast('Fan Credits added to your balance 🎉','toll');},3600);
      return;
    }
    if(p==='cancelled'){setTimeout(()=>toast('Checkout cancelled','info'),700);return;}
    if(p!=='success')return;
    // The webhook grants the pass (and tries to cast the initial vote). Auth restores
    // asynchronously after the redirect, so poll until the pass shows up, then make sure
    // the vote is recorded — casting it ourselves as a fallback if the webhook didn't.
    let tries=0;
    const sync=async()=>{
      await loadVoteState();
      if(state.hasPass){
        const pend=(()=>{try{return localStorage.getItem('pendingVotePlayer')||'';}catch(e){return'';}})();
        if(!state.myVote && pend){
          try{
            const {data,error}=await _sb.rpc('cast_pass_vote',{p_player:pend});
            if(!error&&data&&data.player_id)state.myVote={player_id:data.player_id,changes_used:Number(data.changes_used)||0};
            else if(error)console.warn('[pass-vote fallback]',error.message);
          }catch(e){}
        }
        try{localStorage.removeItem('pendingVotePlayer');}catch(e){}
        await loadVoteCounts();players.sort(rankCmp);
        renderVoteList();renderFeatured();renderHomePodium();renderHomeTrending();renderLeaderboard();
        toast('Supporter Pass active — your vote now counts! 🎉','celebration');
        return;
      }
      if(tries>=6){toast('Payment received — finalizing your pass…','lock');return;}
      tries++;setTimeout(sync,1500);
    };
    setTimeout(sync,1200);
  }catch(e){}
})();

// Shared player deep-link: ?player=<id> opens that player's detail page. The roster loads
// async (loadCatalog), so poll briefly until the player exists, then open it.
(function handlePlayerDeepLink(){
  try{
    const id=new URLSearchParams(location.search).get('player');
    if(!id)return;
    history.replaceState(null,'',location.pathname+location.hash); // tidy the URL, don't reopen on refresh
    const tryOpen=()=>{
      if(typeof players!=='undefined' && players.find(x=>x.id===id) && typeof openPlayer==='function'){
        openPlayer(id,'home'); return true;
      }
      return false;
    };
    if(tryOpen())return;
    let n=0; const iv=setInterval(()=>{ if(tryOpen()||++n>40)clearInterval(iv); },300); // up to ~12s for the catalog
  }catch(e){}
})();
