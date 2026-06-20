/* ════════ STATE ════════ */
const state={balance:2450,votesToday:0,totalVotes:128,pos:'all',mtab:'all',ltab:'players',nf:'all',
 favs:new Set((()=>{try{return JSON.parse(localStorage.getItem('wc26_favs'))||[];}catch(e){return[];}})()),votingFor:null,backTo:'vote',
 myVotes:[{player:'Kylian Mbappé',short:'KM',fc:850,date:'May 16, 2026'},{player:'Jude Bellingham',short:'JB',fc:370,date:'May 16, 2026'},{player:'Vinícius Jr',short:'VJ',fc:210,date:'May 13, 2026'}],
 xp:2410,streak:6,dailyClaimed:false,unread:3,upStreak:{},user:null,profile:null,
 hasPass:false,myVote:null, // Supporter Pass + the user's single (changeable-once) vote
 predictions:[
   {market:'Who lifts the trophy?',pick:'Argentina',fc:300,status:'open',sidePct:48,curPct:48},
   {market:'Who wins the Golden Boot?',pick:'Haaland',fc:150,status:'open',sidePct:45,curPct:45},
   {market:'Spain to top Group E',pick:'Yes',fc:200,status:'won',reward:430,sidePct:62,curPct:62}
 ]};

// Ranking order: most votes first, then last name A→Z. So with no votes the board is
// alphabetical (and diverse), and players climb to 1/2/3 as real votes come in.
function rankCmp(a,b){return (b.votes-a.votes)||String(a.last||a.name||'').localeCompare(String(b.last||b.name||''));}


/* real futuristic flag chips */
// Real flag images in assets/flags/*.png. Country name (as in the DB) → file name.
// Full 50-flag pack present (incl. Colombia/Iran/IvoryCoast); flagFallback shows an
// emoji only if a country isn't mapped here.
const FLAG_FILE={Algeria:'Algeria',Argentina:'Argentina',Australia:'Australia',Austria:'Austria',Belgium:'Belgium','Bosnia & Herzegovina':'Bosnia',Brazil:'Brazil',Canada:'Canada','Cape Verde Islands':'CapoVerde',Colombia:'Colombia','Congo DR':'RDCongo',Croatia:'Croatia','Curaçao':'Curacao',Czechia:'Czechia',Ecuador:'Ecuador',Egypt:'Egypt',England:'England',France:'France',Germany:'Germany',Ghana:'Ghana',Haiti:'Haiti',Iran:'Iran',Iraq:'Iraq',Ireland:'Ireland','Ivory Coast':'IvoryCoast',Japan:'Japon',Jordan:'Jordan',Mexico:'Mexico',Morocco:'Morocco',Netherlands:'Netherlands','New Zealand':'NewZealand','North Korea':'NorthKorea',Norway:'Norway',Panama:'Panama',Paraguay:'Paraguay',Portugal:'Portugal',Qatar:'Qatar','Saudi Arabia':'SaudiArabia',Scotland:'Scotland',Senegal:'Senegal','South Africa':'SouthAfrica','South Korea':'SouthKorea',Spain:'Spain',Sweden:'Sweden',Switzerland:'Switzerland',Tunisia:'Tunisia','Türkiye':'Turkey',Turkey:'Turkey',USA:'UnitedStatesofAmerica','United States':'UnitedStatesofAmerica',Uruguay:'Uruguay',Uzbekistan:'Ouzbekistan'};
function flagImg(country,h){const f=FLAG_FILE[country];h=h||14;
  if(f)return `<img class="flag-img" src="assets/flags/${f}.png" alt="${country}" style="height:${h}px;" onerror="flagFallback(this,'${String(country).replace(/'/g,'')}')">`;
  return '';}
// If a flag image is missing/fails, swap it for the country's emoji flag (no broken icon).
function flagFallback(img,country){img.onerror=null;const e=(typeof flagEmoji==='function'?flagEmoji(country):'')||'';
  if(e){const s=document.createElement('span');s.className='flag';s.style.fontSize=((parseInt(img.style.height,10)||14))+'px';s.textContent=e;img.replaceWith(s);}else img.remove();}

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
  // Player Detail has no footer / decor-bar in the design — hide them there, show elsewhere.
  const fb=document.querySelector('.footer'),db=document.querySelector('.decor-bar');
  if(fb)fb.style.display=(v==='player')?'none':'';
  if(db)db.style.display=(v==='player')?'none':'';
  window.scrollTo({top:0,behavior:'instant'});
  setTimeout(observeReveals,30);
  if(v==='transactions'&&typeof loadTransactions==='function')loadTransactions(); // fresh ledger
}

/* ════════ COUNTDOWN + TICKER ════════ */
// Voting closes at the FIFA World Cup 2026 final (MetLife Stadium, Jul 19, 2026).
// Fixed real date → the countdown ticks down live from the current date/time.
const VOTING_CLOSES=new Date('2026-07-19T19:00:00Z');
const closeAt=VOTING_CLOSES.getTime();
function tick(){
  const vcd=document.getElementById('votingClosesDate');
  if(vcd&&!vcd.textContent)vcd.textContent='· '+VOTING_CLOSES.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
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
// "Total Votes Cast" = the real sum of every player's votes (updated by updateTotalVotes()
// whenever vote counts refresh). No fake auto-incrementing counter.

/* ════════ SHARED PIECES ════════ */
const avatarHTML=(p,size)=>{const s=size||42;const fh=Math.max(11,Math.round(s*.34));const fi=flagImg(p.country,fh);
  // real player photo on top of the initials (which show through if the photo is missing/fails)
  const photo=(p&&p.photo)?`<img class="avatar-img" src="${p.photo}" alt="" loading="lazy" onerror="this.remove()">`:'';
  return `<div class="avatar" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.32)}px;">${p.short||''}${photo}${fi?`<span class="flag-chip">${fi}</span>`:`<span class="flag">${p.flag}</span>`}</div>`;};
const trendHTML=t=>t>0?`<div class="p-trend up">+${t.toFixed(1)}%</div>`:t<0?`<div class="p-trend down">${t.toFixed(1)}%</div>`:`<div class="p-trend flat-t">—</div>`;

/* dark player card */
function pcardHTML(p,markSize){
  const fi=flagImg(p.country,18);
  // real player photo fills the card; fall back to the big jersey number when there's none
  const photo=(p&&p.photo)?`<img class="pcard-img" src="${p.photo}" alt="${(p.name||'').replace(/"/g,'')}" loading="lazy" onerror="this.remove();this.closest('.pcard')&&this.closest('.pcard').classList.remove('has-photo')">`:'';
  return `${photo}<div class="pcard-shine"></div>
    <span class="pcard-flag">${fi||p.flag}</span>
    ${photo?'':`<div class="pcard-mark" style="font-size:${markSize}px;">${p.num}</div>`}`;
}

