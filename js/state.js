/* ════════ STATE ════════ */
const state={balance:(()=>{try{return Math.max(0,parseInt(localStorage.getItem('wc26_balance'),10))||0;}catch(e){return 0;}})(),votesToday:0,totalVotes:128,pos:'all',mtab:'all',ltab:'players',nf:'all',
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
const fmtV=n=>n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':''+n;

// Base "fan support" per player — a made-up global vote count (in the millions) seeded by
// the player's WC26 / club performance, so the leaderboard ranks the best performers with
// the biggest fan bases at the top. Displayed votes = this base + the real app votes,
// so every real user vote adds +1 on top of the base. Deterministic (stable across reloads).
function _hashStr(s){let h=2166136261>>>0;s=String(s||'');for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;}return h>>>0;}
// Who would realistically pull the most fan votes TODAY → leaderboard order. Curated by
// global popularity (the names fans actually search/vote for), each value in millions.
// First matching name fragment wins, so list mega-stars first.
const STAR_VOTES=[
  ['messi',32],['cristiano ronaldo',31],['ronaldo',31],['mbappé',30],['mbappe',30],['neymar',27],
  ['haaland',26],['vinícius',25],['vinicius',25],['bellingham',24],['lamine yamal',23],['yamal',23],
  ['mohamed salah',22],['musiala',20],['harry kane',18],['h. kane',18],['pedri',17.5],
  ['bruno fernandes',16.5],['lautaro',16],['julián álvarez',15.5],['j. álvarez',15.5],
  ['rafael leão',14.5],['leão',14.5],['gavi',14],['bukayo saka',14],['b. saka',14],
  ['son heung',13.5],['de bruyne',13.5],['rodrygo',13],['osimhen',13],['phil foden',13],['foden',13],
  ['modric',12.5],['rashford',12],['pulisic',12],['endrick',11.5],['wirtz',11],['kvaratskhelia',9.5],
  ['mac allister',9.5],['hakimi',9.5],['mitoma',9],['van dijk',8.5],['courtois',8],['saliba',8],
  ['emi martí',8],['e. martí',8],['marquinhos',7.5],['alisson',7],['gvardiol',7],['stones',6.5],['pickford',6]
];
// HIGH-RES PHOTOS — the API-Football headshots are only 150×150 (blurry when shown large).
// For the well-known players (the ones on the podium/featured/detail), pull a sharp portrait
// from Wikipedia by page title. Keyed by the same name-substrings as STAR_VOTES so matching is
// consistent. A miss (no title match, or Wikipedia returns nothing) just keeps the 150px photo —
// so we never risk showing the wrong face.
const STAR_PHOTOS=[
  ['messi','Lionel Messi'],['cristiano ronaldo','Cristiano Ronaldo'],['ronaldo','Cristiano Ronaldo'],
  ['mbappé','Kylian Mbappé'],['mbappe','Kylian Mbappé'],['neymar','Neymar'],['haaland','Erling Haaland'],
  ['vinícius','Vinícius Júnior'],['vinicius','Vinícius Júnior'],['bellingham','Jude Bellingham'],
  ['lamine yamal','Lamine Yamal'],['yamal','Lamine Yamal'],['mohamed salah','Mohamed Salah'],
  ['musiala','Jamal Musiala'],['harry kane','Harry Kane'],['h. kane','Harry Kane'],['pedri','Pedri'],
  ['bruno fernandes','Bruno Fernandes'],['lautaro','Lautaro Martínez'],['julián álvarez','Julián Álvarez'],['j. álvarez','Julián Álvarez'],
  ['rafael leão','Rafael Leão'],['leão','Rafael Leão'],['gavi','Gavi (footballer)'],['bukayo saka','Bukayo Saka'],['b. saka','Bukayo Saka'],
  ['son heung','Son Heung-min'],['de bruyne','Kevin De Bruyne'],['rodrygo','Rodrygo'],['osimhen','Victor Osimhen'],['phil foden','Phil Foden'],['foden','Phil Foden'],
  ['modric','Luka Modrić'],['rashford','Marcus Rashford'],['pulisic','Christian Pulisic'],['endrick','Endrick'],['wirtz','Florian Wirtz'],['kvaratskhelia','Khvicha Kvaratskhelia'],
  ['mac allister','Alexis Mac Allister'],['hakimi','Achraf Hakimi'],['mitoma','Kaoru Mitoma'],['van dijk','Virgil van Dijk'],['courtois','Thibaut Courtois'],['saliba','William Saliba'],
  ['emi martí','Emiliano Martínez'],['e. martí','Emiliano Martínez'],['marquinhos','Marquinhos'],['alisson','Alisson'],['gvardiol','Joško Gvardiol'],['stones','John Stones'],['pickford','Jordan Pickford']
];
function starWikiTitle(p){const nm=String(p.name||'').toLowerCase();for(let i=0;i<STAR_PHOTOS.length;i++){if(nm.indexOf(STAR_PHOTOS[i][0])>=0)return STAR_PHOTOS[i][1];}return null;}
const _wikiThumbCache={};
async function fetchWikiThumb(title,size){
  if(title in _wikiThumbCache)return _wikiThumbCache[title];
  try{const r=await fetch('https://en.wikipedia.org/w/api.php?action=query&titles='+encodeURIComponent(title)+'&prop=pageimages&piprop=thumbnail&pithumbsize='+size+'&format=json&origin=*');
    const j=await r.json();const pg=Object.values(j.query.pages)[0];
    const url=(pg&&pg.thumbnail&&pg.thumbnail.source)||null;_wikiThumbCache[title]=url;return url;
  }catch(e){_wikiThumbCache[title]=null;return null;}
}
// Resolve sharp Wikipedia portraits for the star players, then swap them into p.photo (keeping the
// original 150px as p.photoSd for fallback). One fetch per unique title; re-renders once when done.
async function enhanceStarPhotos(){
  if(typeof players==='undefined'||!players)return;
  const byTitle={};
  // skip players who already carry an HD portrait (photo_hd from the DB) — no need to re-fetch
  players.forEach(p=>{const t=starWikiTitle(p);if(t&&!p._hdDone&&!/wikimedia\.org|wikipedia\.org/.test(p.photo||'')){(byTitle[t]=byTitle[t]||[]).push(p);}});
  const titles=Object.keys(byTitle);if(!titles.length)return;
  let changed=false;
  await Promise.all(titles.map(async t=>{
    const url=await fetchWikiThumb(t,800);
    byTitle[t].forEach(p=>{p._hdDone=true;if(url){p.photoSd=p.photo;p.photo=url;changed=true;}});
  }));
  if(changed&&typeof renderAll==='function')renderAll();
}
function playerBaseVotes(p){
  const nm=String(p.name||'').toLowerCase();
  for(let i=0;i<STAR_VOTES.length;i++){ if(nm.indexOf(STAR_VOTES[i][0])>=0) return Math.round(STAR_VOTES[i][1]*1e6); }
  // non-stars sit well below the stars, lightly ordered by form so the mid-table isn't flat
  const perf=(Number(p.goals)||0)*1 + (Number(p.assists)||0)*0.7 + (Number(p.matches)||0)*0.2 + (Number(p.gpm)||0)*2;
  const spread=0.9 + (_hashStr(p.id||p.name||'')%1000)/1000*0.3; // 0.9–1.2 deterministic wobble
  return Math.round((120000 + perf*90000) * spread); // ~110K–1.6M
}
// Displayed/ranked vote count for a player = made-up performance base + real app votes.
function totalVotesFor(p){return (Number(p.base)||0) + (Number(p.realVotes)||0);}


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
  // Player Detail has its OWN header + no footer/decor — hide the global chrome there, show elsewhere.
  const isPlayer=(v==='player');
  const fb=document.querySelector('.footer'),db=document.querySelector('.decor-bar');
  const mh=document.querySelector('.m-header'),hd=document.querySelector('.header-decor');
  const st=document.getElementById('storeTicker');
  if(fb)fb.style.display=isPlayer?'none':'';
  if(db)db.style.display=isPlayer?'none':'';
  if(mh)mh.style.display=isPlayer?'none':'';
  if(hd)hd.style.display=isPlayer?'none':'';
  if(st)st.style.display=isPlayer?'none':'flex';
  document.body.classList.toggle('player-full',isPlayer);
  document.body.classList.toggle('lb-dark',v==='leaderboard'); // dark leaderboard → keep the header solid white
  window.scrollTo({top:0,behavior:'instant'});
  document.body.classList.remove('hdr-scrolled'); // header blur resets with the scroll position
  setTimeout(observeReveals,30);
  if(v==='transactions'&&typeof loadTransactions==='function')loadTransactions(); // fresh ledger
  if(v==='analytics'&&typeof renderAnalytics==='function')renderAnalytics(); // fresh system-wide aggregates
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
  // Leaderboard hero countdown — "25D 11H 45M"
  const lt=document.getElementById('lbTimeLeft');if(lt){let g=Math.max(0,closeAt-Date.now());const ld=Math.floor(g/864e5),lh=Math.floor((g-ld*864e5)/36e5),lm=Math.floor((g%36e5)/6e4);lt.textContent=ld+'D '+lh+'H '+lm+'M';}
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

