/* ════════ MODALS / SHEET / TOAST ════════ */
function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';
  // pre-warm the checkout Edge Function when a purchase modal opens, so the Buy click is fast
  if((id==='creditsModal'||id==='voteModal')&&typeof warmCheckout==='function')warmCheckout();}
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
let merch=[]; // populated from public.store_products (DB) by loadStoreProducts()
state.storeFilter='all';state.owned=new Set();
async function loadStoreProducts(){
  if(typeof _sb==='undefined'||!_sb)return;
  try{
    const {data,error}=await _sb.from('store_products')
      .select('product_id,grp,team,jersey_type,product_name,custom_name,custom_number,official_badges,image_url,buy_url,price_fc')
      .eq('active',true).order('sort_order');
    if(error||!data||!data.length)return;
    merch=data.map(p=>({id:p.product_id,team:p.team,grp:p.grp,type:p.jersey_type,
      name:(p.jersey_type||'')+' Jersey',title:p.product_name,fc:Number(p.price_fc)||1800,
      image:p.image_url||'',buy_url:p.buy_url||'',
      custom_name:p.custom_name,custom_number:p.custom_number,official_badges:p.official_badges}));
    if(typeof renderStoreChips==='function')renderStoreChips();
    if(typeof renderMerch==='function')renderMerch();
  }catch(e){}
}
function renderStoreChips(){
  const teams=[...new Set(merch.map(m=>m.team))]; // country filter, from the catalog
  storeChips.innerHTML=`<button class="chip ${state.storeFilter==='all'?'active':''}" onclick="setStoreFilter('all')">All Nations</button>`+
    teams.map(t=>{const fi=flagImg(t,16);return `<button class="chip ${state.storeFilter===t?'active':''}" onclick="setStoreFilter('${t.replace(/'/g,"\\'")}')" style="display:inline-flex;align-items:center;gap:6px;">${fi||''}${t}</button>`;}).join('');
}
function setStoreFilter(f){state.storeFilter=f;renderStoreChips();renderMerch();}
function renderMerch(){
  if(typeof merchGrid==='undefined'||!merchGrid)return;
  const list=merch.filter(m=>state.storeFilter==='all'||m.team===state.storeFilter);
  if(!list.length){merchGrid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--ink-3);padding:28px 0;font-size:14px;">No jerseys here yet.</div>';return;}
  merchGrid.innerHTML=list.map(m=>{const fi=flagImg(m.team,16);const owned=state.owned.has(m.id);
    const status=owned?'<span class="cust-state on">Owned ✓</span>':'';
    // real product photo if we have it, else the jersey emoji on the gradient
    const art=m.image
      ? `<img class="merch-photo" src="${m.image}" alt="" loading="lazy" onerror="this.remove();this.parentElement.innerHTML='<span class=\\'merch-emoji\\'>👕</span>'">`
      : `<span class="merch-emoji">👕</span>`;
    return `<button class="cust-card2" onclick="openProduct('${m.id}')">
    <div class="cust-img">
      <div class="cust-badges">${fi?`<span class="merch-flag-chip">${fi}</span>`:'<span></span>'}</div>
      <div class="cust-art">${art}</div>
    </div>
    <div class="cust-meta">
      <div class="cust-nm">${m.name}</div>
      <div class="cust-sub">${m.team}</div>
      <div class="cust-price">${fcCoin}<span class="cust-amt">${fmt(m.fc)}</span><span class="cust-fcu">FC</span><span class="cust-usd">$${(m.fc/100).toFixed(2)}</span>${status}</div>
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

/* ── Product detail page (store merch → jersey customization, 1:1 Figma) ── */
const PD_ADDON_FC=350; // each customization add-on
let pdProduct=null;
let pdOpts={badge:true,name:true,num:true,size:'M'};
function openProduct(id){
  const m=merch.find(x=>x.id===id); if(!m)return;
  pdProduct=m; pdOpts={badge:m.official_badges!==false,name:m.custom_name!==false,num:m.custom_number!==false,size:'M'};
  renderProduct(); go('product');
}
// jersey size picker (XS–XXL); M is the default
function pdSize(btn,size){
  pdOpts.size=size;
  document.querySelectorAll('#pdSizes .pd2-size').forEach(b=>b.classList.toggle('on',b===btn));
}
function syncPdSize(){
  document.querySelectorAll('#pdSizes .pd2-size').forEach(b=>b.classList.toggle('on',b.dataset.size===pdOpts.size));
}
function renderProduct(){
  const m=pdProduct; if(!m)return;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('pdTitle', m.title||m.name);
  // the real store product ID (trailing number in the buy link); fall back to our SKU
  const storeId=((m.buy_url||'').match(/\/(\d+)\/?$/)||[])[1];
  set('pdId', storeId||m.id);
  set('pdDesc', '100% polyester');
  pdRenderPrice();
  // hero: real product photo if we have it, else the jersey emoji on the gradient
  const img=document.getElementById('pdImg'), emo=document.getElementById('pdEmoji');
  if(m.image){ if(img){img.src=m.image;img.style.display='';} if(emo)emo.textContent=''; }
  else { if(img){img.style.display='none';img.removeAttribute('src');} if(emo)emo.textContent='👕'; }
  const nameInp=document.getElementById('pdNameInp'), numInp=document.getElementById('pdNumInp');
  if(nameInp)nameInp.value=''; if(numInp)numInp.value='';
  // delivery estimate = 7 days from today
  const ar=document.getElementById('pdArrive');
  if(ar){const d=new Date(Date.now()+7*24*3600*1000);ar.textContent='Arrives as soon as '+d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});}
  syncPdSwitches();
  syncPdSize();
  pdUpdateCTA();
}
function syncPdSwitches(){
  const map={badge:'pdSwBadge',name:'pdSwName',num:'pdSwNum'};
  Object.keys(map).forEach(k=>{const sw=document.getElementById(map[k]);if(sw){sw.classList.toggle('on',!!pdOpts[k]);sw.setAttribute('aria-checked',pdOpts[k]?'true':'false');}});
  const nb=document.getElementById('pdNameBox'), xb=document.getElementById('pdNumBox');
  if(nb)nb.style.display=pdOpts.name?'flex':'none';
  if(xb)xb.style.display=pdOpts.num?'flex':'none';
}
// total add-on credits for the toggles currently on (each = PD_ADDON_FC)
function pdAddons(){return (pdOpts.badge?PD_ADDON_FC:0)+(pdOpts.name?PD_ADDON_FC:0)+(pdOpts.num?PD_ADDON_FC:0);}
// price shown live = jersey + selected add-ons, so toggling visibly adds the credits
function pdRenderPrice(){
  const m=pdProduct, pp=document.getElementById('pdPrice'); if(!m||!pp)return;
  const total=m.fc+pdAddons();
  pp.innerHTML=`${fcCoin}<span class="pd2-price-amt">${fmt(total)}</span><span class="pd2-price-fcu">FC</span><span class="pd2-price-usd">$${(total/100).toFixed(2)}</span>`;
}
function pdToggle(k){pdOpts[k]=!pdOpts[k];syncPdSwitches();pdRenderPrice();pdUpdateCTA();}
function pdSync(){pdUpdateCTA();}
// Button stays disabled until every ON toggle that has an input is filled.
function pdReady(){
  if(pdOpts.name){const v=document.getElementById('pdNameInp');if(!v||!v.value.trim())return false;}
  if(pdOpts.num){const v=document.getElementById('pdNumInp');if(!v||!v.value.trim())return false;}
  return true;
}
function pdUpdateCTA(){const b=document.getElementById('pdCta');if(b)b.disabled=!pdReady();}
function getYourItems(){
  if(!pdReady())return; // guard (button is disabled, but just in case)
  if(!requireAuth('Sign in to order'))return;
  const m=pdProduct; if(!m)return;
  const nm=pdOpts.name?(((document.getElementById('pdNameInp')||{}).value)||'').replace(/\b\w/g,c=>c.toUpperCase()):'';
  const nu=pdOpts.num?((document.getElementById('pdNumInp')||{}).value||''):'';
  orderCtx={ product:m, base:m.fc,
    addons:(pdOpts.badge?PD_ADDON_FC:0)+(pdOpts.name?PD_ADDON_FC:0)+(pdOpts.num?PD_ADDON_FC:0),
    badges:pdOpts.badge, name:nm, number:nu, size:pdOpts.size };
  ordOpts={express:true,insurance:true};
  renderOrder(); go('order');
}

/* ── Order / checkout detail (opened from "Get Your Items Now!") ── */
let orderCtx=null;
let ordOpts={express:true,insurance:true};
function ordCompute(){
  if(!orderCtx)return null;
  const item=orderCtx.base, extras=orderCtx.addons;
  const express=ordOpts.express?2000:0, insurance=ordOpts.insurance?350:0;
  const service=Math.round(item*0.10); // service fee = 10% of the item credits
  const subtotal=item+extras+express+insurance+service;
  return {item,extras,express,insurance,service,subtotal,net:subtotal};
}
function renderOrder(){
  if(!orderCtx)return;
  const m=orderCtx.product;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  const fcf=n=>fmt(Math.abs(n))+' FC';
  set('ordTitle', m.title||m.name); // full product name, same as the product detail header
  // prefill email (editable); the other shipping fields are empty inputs the user fills in
  const emInp=document.getElementById('ordEmail'); if(emInp&&!emInp.value)emInp.value=(state.user&&state.user.email)||'';
  // default country + phone dial code to Switzerland (persists once the user picks another)
  if(!orderCtx.countryIso){orderCtx.countryIso='ch';orderCtx.country='Switzerland';}
  if(!orderCtx.dialIso){orderCtx.dialIso=orderCtx.countryIso;orderCtx.dial='+'+((COUNTRIES.find(x=>x[1]===orderCtx.dialIso)||[])[2]||'41');}
  const cc=COUNTRIES.find(x=>x[1]===orderCtx.countryIso);
  const fl=document.getElementById('ordFlag'); if(fl&&cc){fl.src=cflag(cc[1]);fl.style.visibility='';}
  const cn=document.getElementById('ordCountryName'); if(cn&&cc)cn.textContent=cc[0];
  const dc=COUNTRIES.find(x=>x[1]===orderCtx.dialIso);
  const ccf=document.getElementById('ordCCFlag'); if(ccf&&dc){ccf.src=cflag(dc[1]);ccf.style.visibility='';}
  const ccd=document.getElementById('ordCCDial'); if(ccd&&dc)ccd.textContent='+'+dc[2];
  const coin=document.getElementById('ordCoin'); if(coin&&typeof ASSETS!=='undefined')coin.src=ASSETS.fc;
  const c=ordCompute();
  set('ordItem', fcf(c.item)); set('ordExtras', fcf(c.extras));
  set('ordExpress', fcf(c.express)); set('ordInsurance', fcf(c.insurance));
  set('ordService', fcf(c.service));
  set('ordNet', fcf(c.net));
  set('ordBalance', Number(state.balance||0).toLocaleString('en-US',{minimumFractionDigits:2})+' FC');
  const days=ordOpts.express?7:14, d=new Date(Date.now()+days*24*3600*1000);
  set('ordEstDate', d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}));
  set('ordArrive', 'Arrives as soon as '+d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}));
  // any field edit re-checks the CTA (delegated, wired once)
  const body=document.querySelector('#view-order .pd2-body');
  if(body&&!body._ordWired){body._ordWired=true;body.addEventListener('input',function(e){ordFilterField(e.target);ordUpdateCTA();});}
  ordSyncSwitches();
  ordUpdateCTA();
}
function ordSyncSwitches(){
  const e=document.getElementById('ordSwExpress'),i=document.getElementById('ordSwInsurance');
  if(e){e.classList.toggle('on',!!ordOpts.express);e.setAttribute('aria-checked',ordOpts.express?'true':'false');}
  if(i){i.classList.toggle('on',!!ordOpts.insurance);i.setAttribute('aria-checked',ordOpts.insurance?'true':'false');}
}
function ordToggle(k){ ordOpts[k]=!ordOpts[k]; renderOrder(); }
// Full order payload (product + chosen add-ons + shipping) — stored on the order row
// and emailed to fulfilment. No prices here; the email omits credits/price entirely.
function ordBuildOrder(){
  const m=orderCtx.product;
  const v=id=>(((document.getElementById(id)||{}).value)||'').trim();
  const storeId=((m.buy_url||'').match(/\/(\d+)\/?$/)||[])[1]||m.id;
  return {
    product_id:storeId, product_name:m.title||m.name, image:m.image||'', team:m.team||'', jersey_type:m.type||'', size:orderCtx.size||'M',
    addons:{ badges:!!orderCtx.badges, name:orderCtx.name||'', number:orderCtx.number||'' },
    express:!!ordOpts.express, insurance:!!ordOpts.insurance,
    contact:{ email:v('ordEmail'), phone:((orderCtx&&orderCtx.dial)||'')+' '+ordPhoneDigits() },
    shipping:{ firstname:v('ordFirst'), lastname:v('ordLast'), country:(orderCtx&&orderCtx.country)||'',
      state:v('ordState'), city:v('ordCity'), zip:v('ordZip'), street:v('ordStreet'),
      street_number:v('ordStreetNo'), building_number:v('ordBuildNo'), floor:v('ordFloor') }
  };
}
async function placeOrder(){
  if(!orderReady()||!orderCtx)return; // guard (button is disabled, but just in case)
  if(!requireAuth('Sign in to order'))return;
  const c=ordCompute();
  if(state.balance<c.net){toast('Not enough Fan Credits','error');openModal('creditsModal');return;}
  const btn=document.getElementById('ordCta'); if(btn)btn.disabled=true;
  const order=ordBuildOrder();
  try{
    // Server-authoritative: deducts the credits + records it in the ledger (transaction
    // history) + stores the order, all atomically. Returns the new balance + order id.
    const {data,error}=await _sb.rpc('place_merch_order',{p_order:order,p_fc:c.net});
    if(error){toast(error.message||'Could not place order','error'); if(btn)btn.disabled=false; return;}
    if(data&&typeof data.balance!=='undefined'){state.balance=Number(data.balance);syncBalance();}
    if(state.owned)state.owned.add(orderCtx.product.id);
    if(typeof grantXP==='function')grantXP(5,'merch');
    if(typeof loadTransactions==='function')loadTransactions(); // refresh history with the purchase
    // Fulfilment email — fire-and-forget, never blocks the confirmation.
    try{ _sb.functions.invoke('send-order-email',{body:{order:Object.assign({order_id:(data&&data.order_id)||''},order)}}).catch(()=>{}); }catch(e){}
    showOrderSuccess(order.product_name);
  }catch(e){ toast('Could not place order','error'); if(btn)btn.disabled=false; }
}
function showOrderSuccess(name){
  const e=document.getElementById('osProduct'); if(e)e.textContent=name||'jersey';
  if(typeof openModal==='function')openModal('orderSuccessModal');
}
function closeOrderSuccess(){
  if(typeof closeModal==='function')closeModal('orderSuccessModal');
  orderCtx=null; go('store');
}

/* ── Country / dial-code picker (full-screen searchable modal) ── */
const COUNTRIES=[['Afghanistan','af','93'],['Åland Islands','ax','358'],['Albania','al','355'],['Algeria','dz','213'],['American Samoa','as','1'],['Andorra','ad','376'],['Angola','ao','244'],['Anguilla','ai','1'],['Antarctica','aq','672'],['Antigua & Barbuda','ag','1'],['Argentina','ar','54'],['Armenia','am','374'],['Aruba','aw','297'],['Australia','au','61'],['Austria','at','43'],['Azerbaijan','az','994'],['Bahamas','bs','1'],['Bahrain','bh','973'],['Bangladesh','bd','880'],['Barbados','bb','1'],['Belarus','by','375'],['Belgium','be','32'],['Belize','bz','501'],['Benin','bj','229'],['Bermuda','bm','1'],['Bhutan','bt','975'],['Bolivia','bo','591'],['Bosnia & Herzegovina','ba','387'],['Botswana','bw','267'],['Brazil','br','55'],['Brunei','bn','673'],['Bulgaria','bg','359'],['Burkina Faso','bf','226'],['Burundi','bi','257'],['Cambodia','kh','855'],['Cameroon','cm','237'],['Canada','ca','1'],['Cape Verde','cv','238'],['Cayman Islands','ky','1'],['Central African Republic','cf','236'],['Chad','td','235'],['Chile','cl','56'],['China','cn','86'],['Colombia','co','57'],['Comoros','km','269'],['Congo - Brazzaville','cg','242'],['Congo - Kinshasa','cd','243'],['Cook Islands','ck','682'],['Costa Rica','cr','506'],["Côte d’Ivoire",'ci','225'],['Croatia','hr','385'],['Cuba','cu','53'],['Cyprus','cy','357'],['Czechia','cz','420'],['Denmark','dk','45'],['Djibouti','dj','253'],['Dominica','dm','1'],['Dominican Republic','do','1'],['Ecuador','ec','593'],['Egypt','eg','20'],['El Salvador','sv','503'],['Equatorial Guinea','gq','240'],['Eritrea','er','291'],['Estonia','ee','372'],['Eswatini','sz','268'],['Ethiopia','et','251'],['Fiji','fj','679'],['Finland','fi','358'],['France','fr','33'],['French Guiana','gf','594'],['French Polynesia','pf','689'],['Gabon','ga','241'],['Gambia','gm','220'],['Georgia','ge','995'],['Germany','de','49'],['Ghana','gh','233'],['Gibraltar','gi','350'],['Greece','gr','30'],['Greenland','gl','299'],['Grenada','gd','1'],['Guadeloupe','gp','590'],['Guam','gu','1'],['Guatemala','gt','502'],['Guinea','gn','224'],['Guinea-Bissau','gw','245'],['Guyana','gy','592'],['Haiti','ht','509'],['Honduras','hn','504'],['Hong Kong','hk','852'],['Hungary','hu','36'],['Iceland','is','354'],['India','in','91'],['Indonesia','id','62'],['Iran','ir','98'],['Iraq','iq','964'],['Ireland','ie','353'],['Israel','il','972'],['Italy','it','39'],['Jamaica','jm','1'],['Japan','jp','81'],['Jordan','jo','962'],['Kazakhstan','kz','7'],['Kenya','ke','254'],['Kiribati','ki','686'],['Kuwait','kw','965'],['Kyrgyzstan','kg','996'],['Laos','la','856'],['Latvia','lv','371'],['Lebanon','lb','961'],['Lesotho','ls','266'],['Liberia','lr','231'],['Libya','ly','218'],['Liechtenstein','li','423'],['Lithuania','lt','370'],['Luxembourg','lu','352'],['Macao','mo','853'],['Madagascar','mg','261'],['Malawi','mw','265'],['Malaysia','my','60'],['Maldives','mv','960'],['Mali','ml','223'],['Malta','mt','356'],['Marshall Islands','mh','692'],['Martinique','mq','596'],['Mauritania','mr','222'],['Mauritius','mu','230'],['Mexico','mx','52'],['Micronesia','fm','691'],['Moldova','md','373'],['Monaco','mc','377'],['Mongolia','mn','976'],['Montenegro','me','382'],['Montserrat','ms','1'],['Morocco','ma','212'],['Mozambique','mz','258'],['Myanmar','mm','95'],['Namibia','na','264'],['Nauru','nr','674'],['Nepal','np','977'],['Netherlands','nl','31'],['New Caledonia','nc','687'],['New Zealand','nz','64'],['Nicaragua','ni','505'],['Niger','ne','227'],['Nigeria','ng','234'],['North Korea','kp','850'],['North Macedonia','mk','389'],['Norway','no','47'],['Oman','om','968'],['Pakistan','pk','92'],['Palau','pw','680'],['Palestine','ps','970'],['Panama','pa','507'],['Papua New Guinea','pg','675'],['Paraguay','py','595'],['Peru','pe','51'],['Philippines','ph','63'],['Poland','pl','48'],['Portugal','pt','351'],['Puerto Rico','pr','1'],['Qatar','qa','974'],['Réunion','re','262'],['Romania','ro','40'],['Russia','ru','7'],['Rwanda','rw','250'],['Samoa','ws','685'],['San Marino','sm','378'],['Saudi Arabia','sa','966'],['Senegal','sn','221'],['Serbia','rs','381'],['Seychelles','sc','248'],['Sierra Leone','sl','232'],['Singapore','sg','65'],['Slovakia','sk','421'],['Slovenia','si','386'],['Solomon Islands','sb','677'],['Somalia','so','252'],['South Africa','za','27'],['South Korea','kr','82'],['South Sudan','ss','211'],['Spain','es','34'],['Sri Lanka','lk','94'],['Sudan','sd','249'],['Suriname','sr','597'],['Sweden','se','46'],['Switzerland','ch','41'],['Syria','sy','963'],['Taiwan','tw','886'],['Tajikistan','tj','992'],['Tanzania','tz','255'],['Thailand','th','66'],['Timor-Leste','tl','670'],['Togo','tg','228'],['Tonga','to','676'],['Trinidad & Tobago','tt','1'],['Tunisia','tn','216'],['Turkey','tr','90'],['Turkmenistan','tm','993'],['Tuvalu','tv','688'],['Uganda','ug','256'],['Ukraine','ua','380'],['United Arab Emirates','ae','971'],['United Kingdom','gb','44'],['United States','us','1'],['Uruguay','uy','598'],['Uzbekistan','uz','998'],['Vanuatu','vu','678'],['Vatican City','va','39'],['Venezuela','ve','58'],['Vietnam','vn','84'],['Yemen','ye','967'],['Zambia','zm','260'],['Zimbabwe','zw','263']];
let _cpickTarget='country';
function cflag(iso){return 'https://flagcdn.com/w80/'+iso+'.png';}
function openCountryPicker(target){
  _cpickTarget=target||'country';
  const s=document.getElementById('cpickSearch'); if(s)s.value='';
  renderCountryList('');
  openModal('countryPickerModal');
  setTimeout(()=>{const sf=document.getElementById('cpickSearch');if(sf)sf.focus();},120);
}
function renderCountryList(q){
  const box=document.getElementById('cpickList'); if(!box)return;
  q=(q||'').toLowerCase().trim();
  const sel=(_cpickTarget==='phone')?(orderCtx&&orderCtx.dialIso):(orderCtx&&orderCtx.countryIso);
  const qd=q.replace(/[^0-9]/g,'');
  const list=COUNTRIES.filter(c=>!q||c[0].toLowerCase().indexOf(q)>=0||('+'+c[2]).indexOf(q)===0||(qd&&c[2].indexOf(qd)===0));
  box.innerHTML=list.length?list.map(c=>`<button class="cpick-row" onclick="selectCountry('${c[1]}')">
      <img class="cpick-flag" src="${cflag(c[1])}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <span class="cpick-info"><span class="cpick-name">${c[0]}</span><span class="cpick-dial">+${c[2]}</span></span>
      <span class="cpick-radio${c[1]===sel?' on':''}"></span>
    </button>`).join(''):'<div class="cpick-empty">No country found</div>';
}
function selectCountry(iso){
  const c=COUNTRIES.find(x=>x[1]===iso); if(!c)return;
  if(!orderCtx)orderCtx={};
  if(_cpickTarget==='phone'){
    orderCtx.dialIso=iso; orderCtx.dial='+'+c[2];
    const f=document.getElementById('ordCCFlag'); if(f){f.src=cflag(iso);f.style.visibility='';}
    const d=document.getElementById('ordCCDial'); if(d)d.textContent='+'+c[2];
  }else{
    orderCtx.countryIso=iso; orderCtx.country=c[0];
    const f=document.getElementById('ordFlag'); if(f){f.src=cflag(iso);f.style.visibility='';}
    const n=document.getElementById('ordCountryName'); if(n)n.textContent=c[0];
  }
  if(typeof ordUpdateCTA==='function')ordUpdateCTA();
  closeModal('countryPickerModal');
}
// Expected national-number digit count per country (exact where well-defined; others fall back to 6–14).
const PHONE_LEN={us:10,ca:10,gb:10,in:10,de:11,fr:9,it:10,es:9,au:9,br:11,mx:10,ru:10,cn:11,jp:10,kr:10,za:9,ng:10,eg:10,sa:9,ae:9,pk:10,bd:10,id:11,ph:10,vn:9,th:9,tr:10,pl:9,nl:9,be:9,ch:9,se:9,no:8,dk:8,fi:9,at:10,pt:9,gr:10,ie:9,nz:9,ar:10,cl:9,co:10,pe:9,ve:10,ua:9,ro:9,ma:9,dz:9,tn:8,ke:9,gh:9,ng:10,ch:9};
function ordPhoneDigits(){const i=document.getElementById('ordPhoneInp');return((i&&i.value)||'').replace(/\D/g,'');}
function phoneValid(){
  const iso=(orderCtx&&orderCtx.dialIso)||'ch';
  const d=ordPhoneDigits(); if(!d)return false;
  const exp=PHONE_LEN[iso];
  return exp?d.length===exp:(d.length>=6&&d.length<=14);
}
function orderReady(){
  const val=id=>(((document.getElementById(id)||{}).value)||'').trim();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val('ordEmail')))return false;     // real email
  if(!phoneValid())return false;                                          // digits, correct length per country
  if(val('ordFirst').length<2||val('ordLast').length<2)return false;      // names need ≥2 letters
  if(val('ordZip').length<3)return false;                                 // postal code ≥3 chars
  return ['ordState','ordCity','ordStreet','ordStreetNo','ordBuildNo','ordFloor'].every(id=>val(id).length>0);
}
function ordUpdateCTA(){const b=document.getElementById('ordCta');if(b)b.disabled=!orderReady();}
// Per-field input sanitisation — each field only keeps characters relevant to it.
const ORD_FILTER={ordFirst:'name',ordLast:'name',ordState:'name',ordCity:'name',ordZip:'zip',ordStreet:'street',ordStreetNo:'alnum',ordBuildNo:'alnum',ordFloor:'alnum',ordPhoneInp:'digits'};
function ordFilterField(el){
  if(!el||!el.id) return;
  const t=ORD_FILTER[el.id]; if(!t) return;
  let v=el.value;
  if(t==='name')        v=v.replace(/[^\p{L} '.\-]/gu,'');         // letters, space, apostrophe, dot, hyphen
  else if(t==='digits') v=v.replace(/\D/g,'');                     // 0-9 only (phone)
  else if(t==='alnum')  v=v.replace(/[^a-zA-Z0-9]/g,'').toUpperCase(); // 10, 12A
  else if(t==='zip')    v=v.replace(/[^a-zA-Z0-9 \-]/g,'').toUpperCase(); // international postal codes
  else if(t==='street') v=v.replace(/[^\p{L}0-9 '.,\-\/#]/gu,'');  // street name (may carry numbers)
  if(v!==el.value){ const p=Math.max(0,(el.selectionStart||v.length)-(el.value.length-v.length)); el.value=v; try{el.setSelectionRange(p,p);}catch(_){} }
}

/* ════════ STARTING XI (4-3-3) ════════ */
const XI_FORMATION=[
  {row:'FWD',count:3},{row:'MID',count:3},{row:'DEF',count:4},{row:'GK',count:1}
];
// "actual" most-voted per position (top by votes) — used to score predictions
function topByPos(pos,n){return players.filter(p=>p.pos===pos).sort((a,b)=>b.votes-a.votes).slice(0,n);}
state.xi=(()=>{try{return JSON.parse(localStorage.getItem('wc26_xi'))||{};}catch(e){return{};}})();
state.xiSubmitted=(()=>{try{return localStorage.getItem('wc26_xi_sub')==='1';}catch(e){return false;}})();
function saveXI(){try{localStorage.setItem('wc26_xi',JSON.stringify(state.xi||{}));localStorage.setItem('wc26_xi_sub',state.xiSubmitted?'1':'0');}catch(e){}}
let xiSlots=[];
function buildXISlots(){
  xiSlots=[];
  XI_FORMATION.forEach(line=>{for(let i=0;i<line.count;i++)xiSlots.push({pos:line.row,key:line.row+i});});
}
function renderXI(){
  const pr=document.getElementById('pitchRows'); if(!pr)return;
  pr.innerHTML=XI_FORMATION.map(line=>`
  <div class="pitch-line">
    ${Array.from({length:line.count}).map((_,i)=>{
      const key=line.row+i;const pid=state.xi[key];const p=pid&&players.find(x=>x.id===pid);
      const correct=state.xiSubmitted&&p&&topByPos(line.row,line.count).some(tp=>tp.id===pid);
      const inner=p?(p.photo?`<img src="${p.photo}" alt="" loading="lazy" onerror="this.remove()">`:p.short):'<span class="material-icons-round">add</span>';
      return `<button class="xi-slot" onclick="openXIPicker('${line.row}','${key}')">
        <div class="xi-dot ${p?'filled':''} ${correct?'correct':''}">${inner}</div>
        <div class="xi-pos">${({FWD:'Forward',MID:'Midfield',DEF:'Defence',GK:'Keeper'}[line.row])||line.row}</div>
        ${p?`<div class="xi-name">${p.last||(p.name||'').split(' ').slice(-1)[0]}</div>`:''}
      </button>`;
    }).join('')}
  </div>`).join('');
  const n=Object.keys(state.xi).filter(k=>state.xi[k]).length;
  const lbl=document.getElementById('xiProgressLbl'); if(lbl)lbl.textContent=`${n} / 11 selected`;
  const btn=document.getElementById('xiSubmitBtn'); if(btn){btn.textContent=state.xiSubmitted?'XI Submitted ✓':'Submit Predicted XI';btn.style.opacity=state.xiSubmitted?'.6':'1';}
}
function openXIPicker(pos,key){
  if(state.xiSubmitted){toast('Your XI is locked in','lock');return;}
  document.getElementById('xiPickerTitle').textContent='Pick '+({FWD:'Forward',MID:'Midfielder',DEF:'Defender',GK:'Goalkeeper'}[pos]);
  const used=new Set(Object.entries(state.xi).filter(([k])=>k!==key).map(([,v])=>v));
  const cands=players.filter(p=>p.pos===pos).sort((a,b)=>b.votes-a.votes); // most-voted first
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
  state.xi[key]=pid;saveXI();
  document.getElementById('xiPicker').classList.remove('open');document.body.style.overflow='';
  renderXI();
}
// remove a pick (long-press / clear from the picker)
function clearXI(key){if(state.xiSubmitted)return;delete state.xi[key];saveXI();document.getElementById('xiPicker').classList.remove('open');document.body.style.overflow='';renderXI();}
async function submitXI(){
  if(!requireAuth('Sign in to submit your Starting XI'))return;
  if(state.xiSubmitted)return;
  if(Object.keys(state.xi).filter(k=>state.xi[k]).length<11){toast('Pick all 11 positions first','sports_soccer');return;}
  state.xiSubmitted=true;saveXI();renderXI();
  // persist to Supabase — submit-once (one row per user; no UPDATE/DELETE allowed)
  if(state.user&&typeof _sb!=='undefined'&&_sb){
    try{const {error}=await _sb.from('predicted_xi').insert({user_id:state.user.id,picks:state.xi});
      if(error&&!/duplicate|unique|already exists/i.test(error.message))console.warn('[xi] save failed:',error.message);
    }catch(e){console.warn('[xi]',e);}
  }
  // score against the current most-voted player per position
  let correct=0;
  XI_FORMATION.forEach(line=>{const top=topByPos(line.row,line.count).map(p=>p.id);
    for(let i=0;i<line.count;i++){const pid=state.xi[line.row+i];if(top.includes(pid))correct++;}});
  if(correct===11)toast('Perfect XI! You\u2019re in the running for the special prize 🏆','military_tech');
  else toast(`XI submitted · ${correct}/11 match the current most-voted`,'sports_soccer');
}
// Restore a user's submitted XI from the DB (locked) on login / reload.
async function loadPredictedXI(uid){
  try{const {data}=await _sb.from('predicted_xi').select('picks').eq('user_id',uid).maybeSingle();
    if(data&&data.picks){state.xi=data.picks;state.xiSubmitted=true;if(typeof saveXI==='function')saveXI();if(typeof renderXI==='function')renderXI();}
  }catch(e){/* table not deployed yet */}
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
  // Show from the current point in the schedule onward: drop games that have already been
  // PLAYED (so if 2 of a day's 3 games are done, only the rest remain), but keep games that
  // are ONGOING — kicked off and still inside the ~2.5h match window — plus all upcoming.
  const now=Date.now(), WINDOW=2.5*3600e3;
  let fx=all.filter(f=>{
    if(!f.kickoff_at)return false;
    if(f.status==='finished')return false;                    // already played
    return now <= new Date(f.kickoff_at).getTime()+WINDOW;     // upcoming OR ongoing (live)
  }).sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at)).slice(0,12);
  // fallback (e.g. tournament over): show the most recent games so the bar isn't empty.
  if(!fx.length)fx=all.filter(f=>f.kickoff_at).sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at)).slice(0,12).reverse();
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
  // Safari computes translateX(-50%) against the track's width at the moment the animation
  // STARTED — which was at page load while #stTrack was still empty (width 0 → -50% = 0px),
  // so it stays frozen. Restart the animation now that real content gives the track a width.
  tr.style.animation='none'; void tr.offsetWidth; /* force reflow */ tr.style.animation='';
  const st=document.getElementById('storeTicker');if(st)st.classList.toggle('paused',_stPaused);
}
function toggleStoreTicker(){
  _stPaused=!_stPaused;
  const st=document.getElementById('storeTicker');if(st)st.classList.toggle('paused',_stPaused);
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

