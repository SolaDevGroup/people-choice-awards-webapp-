/* ════════ STATE ════════ */
const state={balance:2450,votesToday:0,totalVotes:128,pos:'all',mtab:'all',ltab:'players',nf:'all',
 favs:new Set(['mbappe']),votingFor:null,backTo:'vote',
 myVotes:[{player:'Kylian Mbappé',short:'KM',fc:850,date:'May 16, 2026'},{player:'Jude Bellingham',short:'JB',fc:370,date:'May 16, 2026'},{player:'Vinícius Jr',short:'VJ',fc:210,date:'May 13, 2026'}],
 xp:2410,streak:6,dailyClaimed:false,unread:3,upStreak:{},user:null,profile:null,
 predictions:[
   {market:'Who lifts the trophy?',pick:'Argentina',fc:300,status:'open',sidePct:48,curPct:48},
   {market:'Who wins the Golden Boot?',pick:'Haaland',fc:150,status:'open',sidePct:45,curPct:45},
   {market:'Spain to top Group E',pick:'Yes',fc:200,status:'won',reward:430,sidePct:62,curPct:62}
 ]};


/* real futuristic flag chips */
const FLAGKEY={'France':'France','Croatia':'Croatia','England':'England','Brazil':'Brazil','Norway':'Norway','Germany':'Germany','Spain':'Spain','Argentina':'Argentina','Morocco':'Morocco','Netherlands':'Netherlands','Belgium':'Belgium','Japan':'Japan','Netherlands ':'Netherlands'};
function flagImg(country,h){const k=FLAGKEY[country];const u=k&&ASSETS.flags[k];h=h||14;
  if(u)return `<img class="flag-img" src="${u}" alt="${country}" style="height:${h}px;">`;
  return '';}

const fmt=n=>n.toLocaleString('en-US');
const fcCoin='<img class="fc-coin" src="'+ASSETS.fc+'" alt="FC">';
const fmtV=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':''+n;


/* ════════ SLIDE MENU (mobile/tablet) ════════ */
function openMenu(){document.querySelector('.sidebar').classList.add('open');document.getElementById('menuBackdrop').classList.add('open');document.body.style.overflow='hidden';}
function closeMenu(){document.querySelector('.sidebar').classList.remove('open');document.getElementById('menuBackdrop').classList.remove('open');document.body.style.overflow='';}

/* ════════ NAV ════════ */
function go(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  const tabViews={home:'home',vote:'vote',leaderboard:'leaderboard',profile:'profile',compare:'compare',markets:'markets',store:'store',startingxi:'startingxi',games:'games',notifications:'notifications',analytics:'analytics',settings:'settings',transactions:'transactions'};
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===tabViews[v]));
  const inMore=['markets','compare','notifications','analytics','signup','login','profile','startingxi','games','settings','transactions'].includes(v);
  document.getElementById('moreBtn').classList.toggle('active',inMore);
  if(window.innerWidth<1024)closeMenu();
  window.scrollTo({top:0,behavior:'instant'});
  setTimeout(observeReveals,30);
}

/* ════════ COUNTDOWN + TICKER ════════ */
const closeAt=Date.now()+(12*864e5+8*36e5+47*6e4+19e3);
function tick(){
  let d=Math.max(0,closeAt-Date.now());
  const dd=Math.floor(d/864e5);d-=dd*864e5;
  const hh=Math.floor(d/36e5);d-=hh*36e5;
  const mm=Math.floor(d/6e4);d-=mm*6e4;
  flipIfChanged('cdSecs',Math.floor(d/1e3));
  cdDays.textContent=String(dd).padStart(2,'0');cdHours.textContent=String(hh).padStart(2,'0');
  cdMins.textContent=String(mm).padStart(2,'0');cdSecs.textContent=String(Math.floor(d/1e3)).padStart(2,'0');
  const xc=document.getElementById('xiCountdown');if(xc){let g=Math.max(0,closeAt-Date.now());const gd=Math.floor(g/864e5),gh=Math.floor((g-gd*864e5)/36e5);xc.textContent=gd+'d '+String(gh).padStart(2,'0')+'h';}
}
setInterval(tick,1000); // first immediate tick() is invoked from init.js (after flipIfChanged is defined)
let liveTotal=248532163;
setInterval(()=>{liveTotal+=Math.floor(Math.random()*900)+100;document.getElementById('totalVotes').textContent=fmt(liveTotal);},2500);

/* ════════ SHARED PIECES ════════ */
const avatarHTML=(p,size)=>{const s=size||42;const fh=Math.max(11,Math.round(s*.34));const fi=flagImg(p.country,fh);return `<div class="avatar" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.32)}px;">${p.short}${fi?`<span class="flag-chip">${fi}</span>`:`<span class="flag">${p.flag}</span>`}</div>`;};
const trendHTML=t=>t>0?`<div class="p-trend up">+${t.toFixed(1)}%</div>`:t<0?`<div class="p-trend down">${t.toFixed(1)}%</div>`:`<div class="p-trend flat-t">—</div>`;

/* dark player card */
function pcardHTML(p,markSize){
  const fi=flagImg(p.country,18);
  return `<div class="pcard-shine"></div>
    <span class="pcard-flag">${fi||p.flag}</span>
    <div class="pcard-mark" style="font-size:${markSize}px;">${p.num}</div>`;
}

