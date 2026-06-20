/* ════════ PROFILE CUSTOMIZATION SHOP (Discord-style) ════════ */
const CUST_TEAMS={
  France:['#1B3A8C','#EF4135','#FFFFFF'],Brazil:['#009C3B','#FFDF00','#1B5E20'],England:['#CF142B','#1D3D8F','#FFFFFF'],
  Argentina:['#75AADB','#FFFFFF','#F6B40E'],Spain:['#C60B1E','#FFC400','#7A0512'],Germany:['#111111','#DD0000','#FFCE00'],
  Morocco:['#C1272D','#006233','#0E3B27'],Portugal:['#006600','#FF0000','#003300'],Netherlands:['#AE1C28','#21468B','#FF7F00'],
  Belgium:['#111111','#FDDA24','#EF3340'],Japan:['#BC002D','#FFFFFF','#7A001D'],USA:['#3C3B6E','#B22234','#FFFFFF'],
  Mexico:['#006847','#CE1126','#FFFFFF'],Canada:['#FF0000','#FFFFFF','#A00000'],Croatia:['#FF0000','#171796','#FFFFFF'],
  Uruguay:['#0038A8','#FCD116','#001E5C'],Switzerland:['#FF0000','#FFFFFF','#A00000'],Norway:['#BA0C2F','#00205B','#FFFFFF']
};
const WC26_THEMES={
  'Golden Trophy':['#FFB600','#FF8600','#7A4F00'],'Champions Confetti':['#4000FF','#00E6C4','#FF2065'],
  'Host Unite 26':['#3C3B6E','#006847','#CE1126'],'Pitch Perfect':['#0C6B2E','#0A5526','#A6E5CA'],
  'Neon Goal':['#4000FF','#00E6C4','#6640FF'],'Stadium Lights':['#101010','#FFB600','#4000FF']
};
const CUST_CATS=[
  {key:'avatar',slot:'avatar',cat:'avatars',label:'Avatar',price:600,anim:false,rar:'Common'},
  {key:'avatar_anim',slot:'avatar',cat:'avatars',label:'Animated Avatar',price:1200,anim:true,rar:'Epic'},
  {key:'decoration',slot:'decoration',cat:'decorations',label:'Decoration',price:900,anim:false,rar:'Rare'},
  {key:'decoration_anim',slot:'decoration',cat:'decorations',label:'Animated Decoration',price:1800,anim:true,rar:'Legendary'},
  {key:'nameplate',slot:'nameplate',cat:'nameplates',label:'Name Plate',price:750,anim:false,rar:'Rare'},
  {key:'banner',slot:'banner',cat:'banners',label:'Banner',price:1500,anim:false,rar:'Epic'}
];
const RARITY={Common:'#73737D',Rare:'#3D6BFF',Epic:'#A855F7',Legendary:'#FFB600'};
let custItems=[];
(function buildCust(){
  const mk=(themeName,colors,team)=>CUST_CATS.forEach(c=>{
    custItems.push({id:(team||'wc26')+'_'+c.key+'_'+themeName.replace(/\s/g,''),name:themeName+' '+c.label,
      themeName,colors,cat:c.cat,slot:c.slot,anim:c.anim,team:team||'WC26',price:c.price+(team?0:100),rar:c.rar});
  });
  Object.entries(CUST_TEAMS).forEach(([t,c])=>mk(t,c,t));
  Object.entries(WC26_THEMES).forEach(([n,c])=>mk(n,c,null));
})();

// Signed-out baseline: own/equip nothing. Real ownership loads from Supabase on sign-in.
state.ownedCust=new Set();
state.equipped={avatar:null,decoration:null,nameplate:null,banner:null};
state.stab='merch';state.custCat='avatars';state.custTeam='all';

/* ---- visual builders (CSS-driven, no images) ---- */
function gradFromColors(c){return `linear-gradient(135deg,${c[0]},${c[1]} 70%,${c[2]||c[0]})`;}
function custAvatarHTML(item,size){
  size=size||64;const c=item.colors;const a=item.anim?'cust-anim':'';
  return `<div class="cust-av ${a}" style="width:${size}px;height:${size}px;background:${gradFromColors(c)};font-size:${Math.round(size*.4)}px;">⚽</div>`;
}
function decoRing(item,inner,size){
  size=size||64;const c=item.colors;const a=item.anim?'deco-anim':'';
  return `<div class="deco-wrap ${a}" style="width:${size+14}px;height:${size+14}px;"><div class="deco-ring" style="background:conic-gradient(from 0deg,${c[0]},${c[1]},${c[2]||c[0]},${c[0]});"></div><div class="deco-inner" style="width:${size}px;height:${size}px;">${inner}</div></div>`;
}
function nameplateHTML(item,name){
  const c=item.colors;return `<span class="cust-nameplate" style="background:${gradFromColors(c)};">${name}</span>`;
}
function bannerHTML(item,h){
  const c=item.colors;h=h||58;
  return `<div class="cust-banner" style="height:${h}px;background:${gradFromColors(c)};"><div class="cust-banner-shine"></div></div>`;
}
function custPreview(item){
  const initials='AF';
  if(item.slot==='avatar')return custAvatarHTML(item,60);
  if(item.slot==='decoration')return decoRing(item,`<div class="profile-avatar" style="width:60px;height:60px;font-size:18px;">${initials}</div>`,60);
  if(item.slot==='nameplate')return `<div style="padding:8px 0;">${nameplateHTML(item,'Alex Fan')}</div>`;
  if(item.slot==='banner')return bannerHTML(item,70);
}

/* ---- store tabs ---- */
function setStoreTab(t){state.stab=t;
  document.querySelectorAll('#storeTabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.stab===t));
  document.getElementById('storeMerch').style.display=t==='merch'?'':'none';
  document.getElementById('storeCustom').style.display=t==='custom'?'':'none';
  if(t==='custom'){renderCust();}
  go('store');
}
function setCustCat(c){state.custCat=c;renderCust();}
function setCustTeam(t){state.custTeam=t;renderCust();}
function renderCust(){
  const cats=[['avatars','Avatars','face'],['decorations','Decorations','auto_awesome'],['nameplates','Name Plates','badge'],['banners','Banners','panorama']];
  document.getElementById('custCatChips').innerHTML=cats.map(([k,l,ic])=>`<button class="chip ${state.custCat===k?'active':''}" onclick="setCustCat('${k}')" style="display:inline-flex;align-items:center;gap:6px;"><span class="material-icons-round" style="font-size:15px;">${ic}</span>${l}</button>`).join('');
  const teams=['all',...Object.keys(CUST_TEAMS),'WC26'];
  document.getElementById('custTeamChips').innerHTML=teams.map(t=>{const fi=t!=='all'&&t!=='WC26'?flagImg(t,15):'';const lbl=t==='all'?'All':t==='WC26'?'✦ WC26 Specials':t;return `<button class="chip ${state.custTeam===t?'active':''}" onclick="setCustTeam('${t}')" style="display:inline-flex;align-items:center;gap:6px;">${fi||''}${lbl}</button>`;}).join('');
  const list=custItems.filter(i=>i.cat===state.custCat&&(state.custTeam==='all'||i.team===state.custTeam));
  document.getElementById('custGrid').innerHTML=list.map(custCardHTML).join('');
}
function custCardHTML(item){
  const owned=state.ownedCust.has(item.id);
  const equipped=state.equipped[item.slot]===item.id;
  const rc=RARITY[item.rar];
  let btn;
  if(equipped)btn=`<button class="merch-buy equipped" onclick="custEquip('${item.id}')">Equipped ✓</button>`;
  else if(owned)btn=`<button class="merch-buy own" onclick="custEquip('${item.id}')">Equip</button>`;
  else btn=`<button class="merch-buy" onclick="custBuy('${item.id}')">Buy</button>`;
  const flag=item.team!=='WC26'?flagImg(item.team,16):'';
  return `<div class="merch-card cust-card ${equipped?'is-equipped':''}">
    <div class="cust-rar" style="color:${rc};border-color:${rc};">${item.rar}</div>
    <div class="cust-preview">${item.anim?'<span class="cust-animtag">●&nbsp;Animated</span>':''}${custPreview(item)}</div>
    <div class="merch-body">
      <div class="merch-name">${item.themeName}</div>
      <div class="merch-team">${flag||'✦'} ${item.team==='WC26'?'WC26 Special':item.team} · ${item.slot.charAt(0).toUpperCase()+item.slot.slice(1)}</div>
      <div class="merch-foot"><div class="merch-price">${fcCoin}${fmt(item.price)}</div>${btn}</div>
    </div></div>`;
}
async function custBuy(id){
  if(!requireAuth('Sign in to unlock profile items'))return;
  const item=custItems.find(x=>x.id===id);
  if(!item||state.ownedCust.has(id))return;
  if(!item.dbId){toast('Item unavailable','error');return;}
  if(state.balance<item.price){toast('Not enough Fan Credits','error');openModal('creditsModal');return;}
  // Server-authoritative: spends FC + records ownership, returns the new balance.
  const {data,error}=await _sb.rpc('buy_cosmetic',{p_cosmetic:item.dbId});
  if(error){toast(error.message,'error');return;}
  state.balance=data;state.ownedCust.add(id);syncBalance();grantXP(8,'cust');
  txData.unshift({date:'Today',time:'now',desc:'Profile Item',sub:item.name,type:'redemption',amt:-item.price,bal:state.balance,ic:'auto_awesome',col:'var(--purple)',bg:'var(--purple-a)'});
  renderTx();
  await custEquip(id,true);
  addNotif('updates','auto_awesome','var(--purple)','var(--purple-a)','Unlocked: '+item.name,'Tap to equip it on your profile.');
  toast(item.name+' unlocked!','redeem');
}
async function custEquip(id,silent){
  if(!requireAuth('Sign in to equip profile items'))return;
  const item=custItems.find(x=>x.id===id);
  if(!item)return;
  // Server toggles the slot (sets it, or clears if already equipped); must own it.
  if(item.dbId){
    const {error}=await _sb.rpc('equip_cosmetic',{p_cosmetic:item.dbId});
    if(error){toast(error.message,'error');return;}
  }
  if(state.equipped[item.slot]===id){state.equipped[item.slot]=null;if(!silent)toast(item.themeName+' '+item.slot+' removed','close');}
  else{state.equipped[item.slot]=id;if(!silent)toast(item.themeName+' '+item.slot+' equipped on your profile','check');}
  renderCust();renderProfile();renderProfileHero();updateChromeAvatars();
}

/* ---- apply equipped items to the profile ---- */
function renderProfileHero(){
  const el=document.getElementById('profileHero');if(!el)return;
  const eq=state.equipped;
  const banner=eq.banner&&custItems.find(i=>i.id===eq.banner);
  const deco=eq.decoration&&custItems.find(i=>i.id===eq.decoration);
  const av=eq.avatar&&custItems.find(i=>i.id===eq.avatar);
  const np=eq.nameplate&&custItems.find(i=>i.id===eq.nameplate);
  // Real profile data
  const p=state.profile;
  const name=(p&&p.display_name)||(state.user&&state.user.user_metadata&&state.user.user_metadata.display_name)||(state.user&&state.user.email&&state.user.email.split('@')[0])||'Guest';
  const initials=((name.match(/[A-Za-z0-9]+/g)||['F','C']).map(w=>w[0]).join('').slice(0,2)||'FC').toUpperCase();
  const handle=(p&&p.username)?('@'+p.username):(state.user?('@'+name.toLowerCase().replace(/[^a-z0-9]+/g,'')):'');
  const country=p&&p.country_code;
  const flag=country?(flagImg(country,14)||''):'';
  const level=(p&&typeof REP_LEVEL_NAMES!=='undefined'&&REP_LEVEL_NAMES[p.reputation_level])||'Rookie';
  // "Plan" badge = the FC pack they bought (highest), else Supporter Pass, else nothing.
  let badge='';
  if(state.plan&&typeof PACK_KEYS!=='undefined'){
    const i=PACK_KEYS.indexOf(state.plan.pack);
    badge=`<span class="premium-pill">${(i>=0&&typeof fcPacks!=='undefined')?fcPacks[i].name:'Plan'}</span>`;
  } else if(state.hasPass){ badge=`<span class="premium-pill">Supporter</span>`; }

  const avInner=av?`<div class="cust-av ${av.anim?'cust-anim':''}" style="width:72px;height:72px;background:${gradFromColors(av.colors)};font-size:30px;">⚽</div>`:`<div class="profile-avatar" style="width:72px;height:72px;font-size:26px;">${initials}</div>`;
  const avatarBlock=deco?decoRing(deco,avInner,72):avInner;
  const nameBlock=np?nameplateHTML(np,name):`<span class="h3" style="font-size:22px;">${name}</span>`;
  el.innerHTML=`
    ${banner?`<div class="profile-banner" style="background:${gradFromColors(banner.colors)};"><div class="cust-banner-shine"></div></div>`:''}
    <div class="profile-id ${banner?'with-banner':''}">
      ${avatarBlock}
      <div style="min-width:0;">
        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;">${nameBlock}${badge}</div>
        <div class="caption" style="color:var(--ink-3);margin-top:4px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">${flag}<span>${level}${handle?' · '+handle:''}</span></div>
      </div>
    </div>`;
}
function updateChromeAvatars(){
  // reflect equipped avatar + decoration on sidebar profile + bottom-nav not needed; keep sidebar in sync
  const av=state.equipped.avatar&&custItems.find(i=>i.id===state.equipped.avatar);
  document.querySelectorAll('.sb-profile .profile-avatar').forEach(el=>{
    if(av){el.style.background=gradFromColors(av.colors);el.textContent='⚽';}
    else{el.style.background='';el.textContent='AF';}
  });
}
function previewMyProfile(){go('profile');}

/* one-time promo */
function custPromoPop(){
  if(sessionStorage.getItem('wc26_custpromo'))return;
  try{sessionStorage.setItem('wc26_custpromo','1');}catch(e){}
  addNotif('news','auto_awesome','var(--purple)','var(--purple-a)','New: Profile Customization','WC26 national-team themes — avatars, decorations, name plates & banners.');
  setTimeout(()=>openModal('custPromoModal'),900);
}

