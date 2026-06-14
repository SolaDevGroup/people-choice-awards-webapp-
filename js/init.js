/* ════════ INIT ════════ */
function renderAll(){
  renderFeatured();renderHomePodium();renderHomeTrending();renderHomeMarkets();renderHomeExtra();
  renderVoteList();renderMarkets();renderPredHistory();renderLeaderboard();
  renderNotifs();renderProfile();renderAnalytics();renderFcPacks();renderCompare();renderStoreChips();renderMerch();renderCust();renderProfileHero();renderGames();setSettingsPanel(state.setPanel||'account');renderTx();renderDaily();updateLevelUI();updateNotifBadges();syncBalance();renderAuthUI();
}
tick(); // first countdown paint (moved here so flipIfChanged, defined in a later module, exists)
// hydrate brand assets
navLogo.src=ASSETS.pca;heroLogo.src=ASSETS.logo;
var sbl=document.getElementById('sbLogo');if(sbl)sbl.src=ASSETS.pca;
var wc=document.getElementById('welcomeCoin');if(wc)wc.src=ASSETS.fc;
var dcd=document.getElementById('dailyCtaDay');if(dcd)dcd.textContent=state.streak+1;
var ml=document.getElementById('mLogo');if(ml)ml.src=ASSETS.pca;var mc2=document.getElementById('mCoin');if(mc2)mc2.src=ASSETS.fc;
[document.getElementById('sbCoin'),document.getElementById('hdrCoin')].forEach(el=>{if(el)el.src=ASSETS.fc;});
document.documentElement.style.setProperty('--decor-img',"url('"+ASSETS.decor+"')");
initSplash();
[navCoin,homeCoin,statCoin].forEach(el=>{if(el)el.src=ASSETS.fc;});
document.querySelectorAll('.fc-coin').forEach(el=>{if(!el.src)el.src=ASSETS.fc;});
buildXISlots();renderXI();fillDropdowns();fillCompareSelects();renderAll();observeReveals();
loadCatalog(); // replace seed data with live Supabase catalog, then re-render
setInterval(simulateOdds,16000);
setTimeout(runWelcome,5200); // after splash
setTimeout(custPromoPop,9000); // promote customization
