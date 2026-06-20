/* ════════ DATA ════════ */
let players=[
 {id:'mbappe',name:'Kylian Mbappé',first:'Kylian',last:'MBAPPÉ',short:'KM',num:10,pos:'FWD',country:'France',flag:'🇫🇷',club:'Real Madrid',votes:18200000,trend:4.3,goals:52,assists:23,matches:68,wc:9,winRate:61,gpm:.74,speed:36.1,trophies:13},
 {id:'bellingham',name:'Jude Bellingham',first:'Jude',last:'BELLINGHAM',short:'JB',num:5,pos:'MID',country:'England',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',club:'Real Madrid',votes:17700000,trend:5.1,goals:23,assists:19,matches:64,wc:7,winRate:63,gpm:.36,speed:33.8,trophies:9},
 {id:'vinicius',name:'Vinícius Jr',first:'Vinícius',last:'JR',short:'VJ',num:7,pos:'FWD',country:'Brazil',flag:'🇧🇷',club:'Real Madrid',votes:16600000,trend:4.1,goals:38,assists:21,matches:66,wc:8,winRate:60,gpm:.58,speed:36.4,trophies:11},
 {id:'haaland',name:'Erling Haaland',first:'Erling',last:'HAALAND',short:'EH',num:9,pos:'FWD',country:'Norway',flag:'🇳🇴',club:'Man City',votes:14800000,trend:3.7,goals:45,assists:11,matches:61,wc:4,winRate:58,gpm:.64,speed:35.3,trophies:16},
 {id:'musiala',name:'Jamal Musiala',first:'Jamal',last:'MUSIALA',short:'JM',num:42,pos:'MID',country:'Germany',flag:'🇩🇪',club:'Bayern',votes:11300000,trend:2.1,goals:21,assists:17,matches:58,wc:6,winRate:57,gpm:.36,speed:33.2,trophies:7},
 {id:'yamal',name:'Lamine Yamal',first:'Lamine',last:'YAMAL',short:'LY',num:19,pos:'FWD',country:'Spain',flag:'🇪🇸',club:'Barcelona',votes:9600000,trend:1.1,goals:19,assists:25,matches:60,wc:5,winRate:62,gpm:.32,speed:34.6,trophies:6},
 {id:'rodri',name:'Rodri',first:'Rodri',last:'HERNÁNDEZ',short:'R',num:16,pos:'MID',country:'Spain',flag:'🇪🇸',club:'Man City',votes:7200000,trend:0,goals:9,assists:12,matches:62,wc:6,winRate:66,gpm:.15,speed:31.9,trophies:12},
 {id:'kane',name:'Harry Kane',first:'Harry',last:'KANE',short:'HK',num:9,pos:'FWD',country:'England',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',club:'Bayern',votes:6000000,trend:.8,goals:48,assists:14,matches:63,wc:8,winRate:59,gpm:.76,speed:32.4,trophies:3},
 {id:'lautaro',name:'Lautaro Martínez',first:'Lautaro',last:'MARTÍNEZ',short:'LM',num:10,pos:'FWD',country:'Argentina',flag:'🇦🇷',club:'Inter',votes:5600000,trend:-1.2,goals:33,assists:9,matches:59,wc:7,winRate:61,gpm:.56,speed:33.5,trophies:8},
 {id:'wirtz',name:'Florian Wirtz',first:'Florian',last:'WIRTZ',short:'FW',num:10,pos:'MID',country:'Germany',flag:'🇩🇪',club:'Leverkusen',votes:4900000,trend:2.8,goals:18,assists:20,matches:57,wc:3,winRate:60,gpm:.32,speed:33,trophies:4},
 {id:'saka',name:'Bukayo Saka',first:'Bukayo',last:'SAKA',short:'BS',num:7,pos:'FWD',country:'England',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',club:'Arsenal',votes:4400000,trend:1.6,goals:20,assists:16,matches:60,wc:6,winRate:58,gpm:.33,speed:34.1,trophies:2},
 {id:'hakimi',name:'Achraf Hakimi',first:'Achraf',last:'HAKIMI',short:'AH',num:2,pos:'DEF',country:'Morocco',flag:'🇲🇦',club:'PSG',votes:3900000,trend:1.9,goals:7,assists:13,matches:61,wc:8,winRate:62,gpm:.11,speed:36.2,trophies:10},
 {id:'vandijk',name:'Virgil van Dijk',first:'Virgil',last:'VAN DIJK',short:'VD',num:4,pos:'DEF',country:'Netherlands',flag:'🇳🇱',club:'Liverpool',votes:3500000,trend:-.4,goals:5,assists:2,matches:60,wc:5,winRate:64,gpm:.08,speed:32.8,trophies:9},
 {id:'martinez',name:'Emi Martínez',first:'Emi',last:'MARTÍNEZ',short:'EM',num:23,pos:'GK',country:'Argentina',flag:'🇦🇷',club:'Aston Villa',votes:3100000,trend:.6,goals:0,assists:1,matches:58,wc:9,winRate:60,gpm:0,speed:29.5,trophies:6},
 {id:'courtois',name:'Thibaut Courtois',first:'Thibaut',last:'COURTOIS',short:'TC',num:1,pos:'GK',country:'Belgium',flag:'🇧🇪',club:'Real Madrid',votes:2800000,trend:-.8,goals:0,assists:0,matches:55,wc:4,winRate:65,gpm:0,speed:28.9,trophies:14},
 {id:'alisson',name:'Alisson',first:'Alisson',last:'BECKER',short:'AB',num:1,pos:'GK',country:'Brazil',flag:'🇧🇷',club:'Liverpool',votes:2600000,trend:.4,goals:0,assists:0,matches:54,wc:8,winRate:63,gpm:0,speed:29.2,trophies:11},
 {id:'pickford',name:'Jordan Pickford',first:'Jordan',last:'PICKFORD',short:'JP',num:1,pos:'GK',country:'England',flag:'🏴',club:'Everton',votes:2300000,trend:.2,goals:0,assists:0,matches:52,wc:9,winRate:58,gpm:0,speed:28.6,trophies:1},
 {id:'saliba',name:'William Saliba',first:'William',last:'SALIBA',short:'WS',num:5,pos:'DEF',country:'France',flag:'🇫🇷',club:'Arsenal',votes:3300000,trend:1.4,goals:3,assists:2,matches:55,wc:3,winRate:62,gpm:.05,speed:34.2,trophies:4},
 {id:'marquinhos',name:'Marquinhos',first:'Marquinhos',last:'CORREA',short:'MC',num:4,pos:'DEF',country:'Brazil',flag:'🇧🇷',club:'PSG',votes:3000000,trend:.5,goals:6,assists:1,matches:58,wc:8,winRate:64,gpm:.10,speed:33.1,trophies:13},
 {id:'gvardiol',name:'Joško Gvardiol',first:'Joško',last:'GVARDIOL',short:'JG',num:24,pos:'DEF',country:'Croatia',flag:'🇭🇷',club:'Man City',votes:2700000,trend:2.2,goals:5,assists:4,matches:50,wc:4,winRate:60,gpm:.10,speed:35.0,trophies:6},
 {id:'stones',name:'John Stones',first:'John',last:'STONES',short:'JS',num:5,pos:'DEF',country:'England',flag:'🏴',club:'Man City',votes:2500000,trend:.3,goals:4,assists:3,matches:53,wc:8,winRate:61,gpm:.08,speed:33.4,trophies:9},
 {id:'pedri',name:'Pedri',first:'Pedri',last:'GONZÁLEZ',short:'PG',num:8,pos:'MID',country:'Spain',flag:'🇪🇸',club:'Barcelona',votes:5200000,trend:2.6,goals:11,assists:18,matches:52,wc:5,winRate:62,gpm:.21,speed:32.7,trophies:6},
 {id:'debruyne',name:'Kevin De Bruyne',first:'Kevin',last:'DE BRUYNE',short:'KDB',num:7,pos:'MID',country:'Belgium',flag:'🇧🇪',club:'Napoli',votes:6300000,trend:.9,goals:16,assists:34,matches:60,wc:9,winRate:59,gpm:.27,speed:33.0,trophies:10}
];

let markets=[
 {id:'fra_qf',cat:'country',kind:'yn',type:'Knockout Stage',title:'Will France pass the quarter-finals?',pool:1840000,closes:'Jul 11',options:[{n:'Yes',p:57},{n:'No',p:43}]},
 {id:'ball_mbappe',cat:'player',kind:'yn',type:'Golden Ball',title:'Will Mbappé win the Golden Ball?',pool:1240000,closes:'Jul 19',options:[{n:'Yes',p:38},{n:'No',p:62}]},
 {id:'boot_race',cat:'player',kind:'vs',type:'Golden Boot Race',title:'Who will score more goals?',pool:920000,closes:'Jul 19',options:[{n:'Mbappé',pid:'mbappe',p:55},{n:'Haaland',pid:'haaland',p:45}]},
 {id:'arg_win',cat:'tournament',kind:'yn',type:'Tournament Winner',title:'Will Argentina win the World Cup?',pool:1320000,closes:'Jul 19',options:[{n:'Yes',p:21},{n:'No',p:79}]},
 {id:'assist_king',cat:'player',kind:'vs',type:'Assist King',title:'Who will register more assists?',pool:540000,closes:'Jul 19',options:[{n:'Bellingham',pid:'bellingham',p:46},{n:'De Bruyne',pid:'debruyne',p:54}]},
 {id:'bra_final',cat:'country',kind:'yn',type:'Reach The Final',title:'Will Brazil reach the final?',pool:760000,closes:'Jul 16',options:[{n:'Yes',p:41},{n:'No',p:59}]},
 {id:'glove_race',cat:'player',kind:'vs',type:'Golden Glove',title:'Who will keep more clean sheets?',pool:280000,closes:'Jul 19',options:[{n:'E. Martínez',pid:'martinez',p:53},{n:'Courtois',pid:'courtois',p:47}]},
 {id:'mar_group',cat:'country',kind:'yn',type:'Group Stage',title:'Will Morocco escape the group stage?',pool:310000,closes:'Jun 27',options:[{n:'Yes',p:64},{n:'No',p:36}]},
 {id:'young_yamal',cat:'player',kind:'yn',type:'Young Player',title:'Will Yamal win the Young Player award?',pool:430000,closes:'Jul 19',options:[{n:'Yes',p:62},{n:'No',p:38}]},
 {id:'eng_group',cat:'country',kind:'yn',type:'Group Stage',title:'Will England win their group?',pool:520000,closes:'Jun 27',options:[{n:'Yes',p:58},{n:'No',p:42}]},
 {id:'goals_vs2',cat:'player',kind:'vs',type:'Top Scorer Duel',title:'Who will score more goals?',pool:360000,closes:'Jul 19',options:[{n:'Kane',pid:'kane',p:49},{n:'Vinícius Jr',pid:'vinicius',p:51}]},
 {id:'esp_win',cat:'tournament',kind:'yn',type:'Tournament Winner',title:'Will Spain win the World Cup?',pool:880000,closes:'Jul 19',options:[{n:'Yes',p:18},{n:'No',p:82}]}
];

const fcPacks=[
 {name:'Starter Pack',fc:500,price:'$4.99',pop:false,badge:'Good to start',badgeType:'green'},
 {name:'Fan Pack',fc:1200,price:'$9.99',pop:true,badge:'Most Popular',badgeType:'purple'},
 {name:'Ultra Pack',fc:2500,price:'$19.99',pop:false},
 {name:'Legend Pack',fc:6500,price:'$49.99',pop:false},
 {name:'Champion Pack',fc:15000,price:'$99.99',pop:false,badge:'Best value',badgeType:'purple'}
];

const badges=[
 {e:'🏆',n:'Quarter-Fan',locked:false},{e:'🥈',n:'Silver Fan',locked:false},
 {e:'🥇',n:'Gold Fan',locked:false},{e:'👑',n:'Legend Fan',locked:true},{e:'💎',n:'Hall of Fame',locked:true}
];

const achievements=[
 {i:'check_circle',n:'7-Day Voting Streak',s:'Vote every day for 7 days',done:true},
 {i:'military_tech',n:'Top 10% Global Rank',s:"You're in the top 10% of voters",done:true},
 {i:'workspace_premium',n:'Premium Supporter',s:'Unlock premium benefits',done:true},
 {i:'how_to_vote',n:'1000 Votes',s:'128 / 1000 votes cast',done:false}
];

const notifs=[
 {cat:'rankings',icon:'leaderboard',color:'var(--orange)',bg:'rgba(255,134,0,.12)',t:'Mbappé enters Top 3!',s:"He's now #3 in the leaderboard.",time:'1m ago'},
 {cat:'updates',icon:'schedule',color:'var(--orange)',bg:'rgba(255,134,0,.12)',t:'Voting closes in 24 hours',s:"Don't miss your chance to vote!",time:'1h ago'},
 {cat:'news',icon:'person_add',color:'var(--teal)',bg:'rgba(0,230,196,.12)',t:'New player added',s:'Oliver Mbappé is now available for voting.',time:'3h ago'},
 {cat:'updates',icon:'check_circle',color:'var(--green)',bg:'rgba(11,168,74,.10)',t:'Your vote was counted',s:'Thanks for supporting Mbappé!',time:'14h ago'},
 {cat:'rankings',icon:'emoji_events',color:'var(--purple-2)',bg:'var(--purple-a)',t:'Weekly Leaderboard Update',s:'Check out the latest rankings.',time:'1d ago'}
];

const fans=[
 {name:'Marco R.',short:'MR',c:'🇧🇷',votes:9412,move:1},{name:'Aisha K.',short:'AK',c:'🇦🇪',votes:9180,move:0},
 {name:'Tomás L.',short:'TL',c:'🇦🇷',votes:8854,move:2},{name:'Yuki S.',short:'YS',c:'🇯🇵',votes:8420,move:-1},
 {name:'Lena M.',short:'LM',c:'🇩🇪',votes:8011,move:3},{name:'Alex Fan',short:'AF',c:'🇦🇪',votes:7642,move:1,me:true},
 {name:'Omar H.',short:'OH',c:'🇲🇦',votes:7100,move:-2},{name:'Grace W.',short:'GW',c:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',votes:6890,move:0}
];
const countriesLB=[
 {name:'France',f:'🇫🇷',votes:41200000,move:0},{name:'Brazil',f:'🇧🇷',votes:38900000,move:1},
 {name:'England',f:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',votes:36400000,move:-1},{name:'Argentina',f:'🇦🇷',votes:31800000,move:0},
 {name:'Spain',f:'🇪🇸',votes:28600000,move:2},{name:'Germany',f:'🇩🇪',votes:24100000,move:-1},
 {name:'Morocco',f:'🇲🇦',votes:19700000,move:3},{name:'Norway',f:'🇳🇴',votes:16200000,move:1}
];

