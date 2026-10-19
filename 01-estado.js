// Estado, datos base, permisos y utilidades
var KEY="torneo-escolar-v2",S={cur:null,list:[]},V="p";
var $=function(id){return document.getElementById(id)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var ID0=0;function nid(){var n=Date.now();if(n<=ID0)n=ID0+1;ID0=n;return n}
var SP={beis:{i:"⚾",u:"Carreras",tie:0,r:"Baseball5: 5 entradas por equipo. Si hay empate, se juegan entradas extra."},
bas3:{i:"🏀",u:"Puntos",tie:0,r:"Basket 3x3: gana quien llegue a 21 puntos o vaya arriba a los 10 minutos. Si hay empate, tiempo extra."},
vol:{i:"🏐",u:"Sets",tie:0,r:"Voleibol: el marcador es en sets ganados. En liga, ganar por 2 o más sets da 3 puntos; ganar por 1 set da 2 y perder por 1 set da 1."},
gen:{i:"🏆",u:"Marcador",tie:1,r:"Se permiten empates. En liga: victoria 3 puntos, empate 1."}};
SP.beis.pos=["Primera base","Segunda base","Tercera base","Campocorto","Jardinero","Suplente"];SP.beis.max=5;
SP.bas3.pos=["Base","Alero","Pívot","Suplente"];SP.bas3.max=3;
SP.vol.pos=["Colocador","Opuesto","Central","Receptor-atacante","Líbero","Suplente"];SP.vol.max=6;
SP.gen.pos=["Portero","Defensa","Medio","Delantero","Suplente"];SP.gen.max=0;
var TBO=[["","Sin criterio"],["dif","Mayor diferencia"],["fav","Más a favor"],["con","Menos en contra"],["gan","Más victorias"],["h2h","Resultado entre ellos"],["alf","Orden alfabético"]];
var ACC="login",BYE="__bye__",NAME="",SOL={},MYREQ=null,SC="inicio",BOOT=false,DB=null,U=null,UID=null,ADMIN=false,ROLES={},Q=null,PICK=null,RES=[],PEND=false,LOCAL=[],TO,RT;
var RL={organizador:["Coordinador deportivo","Administra ediciones, partidos, equipos y noticias."],anotador:["Anotador","Registra marcadores y estadísticas de los partidos."],arbitro:["Árbitro","Gestiona los partidos que le corresponden y registra resultados."],entrenador:["Manager de equipo","Administra su equipo: plantilla, alineación y asistencia."],capitan:["Capitán","Confirma la asistencia y arma la alineación de su equipo."],jugador:["Jugador","Juega en un equipo. Ve todo y no edita marcadores."],espectador:["Visitante","Consulta partidos, tablas, equipos y calendario."]};
var LM=null,NEED=2;
var LPL={a:"",b:""};
var ANU=[],LASTL=null,ALERTALL=false;
try{ALERTALL=localStorage.getItem("torneo-alerts-all")=="1"}catch(e){}
var DISC={};
var EVN={run:"Carrera",pt:"Punto",ace:"Ace",blk:"Bloqueo",foul:"Falta",yc:"Tarjeta amarilla",rc:"Tarjeta roja","1b":"Sencillo (1B)","2b":"Doble (2B)","3b":"Triple (3B)",hr:"Jonrón / Vuelta Completa",err:"Error Defensivo (E)",out:"Out en Base",fly:"Elevado Capturado",tag:"Corredor Tocado",ilg:"Golpe Ilegal (Out)",slide:"Deslizamiento Ilegal (Out)",dp:"Doble Play (DP)"},EVI={run:"🏃",pt:"🎯",ace:"⚡",blk:"🛡️",foul:"⚠️",yc:"🟨",rc:"🟥","1b":"🟢","2b":"🟢","3b":"🟢",hr":"💥",err:"⚠️",out:"🔴",fly:"🤲",tag:"🖐️",ilg:"❌",slide:"🚫",dp:"🛑"};
var DL=null,ATT={},COM=[],PREDS={},PNAME={},PERF={},INSC={},REM=["🔥","👏","😮","😢"];
var SPORT="beis",SPN={beis:"Baseball5",bas3:"Basket 3x3",vol:"Voleibol",gen:"Otro deporte"},SPI={beis:"⚾",bas3:"🏀",vol:"🏐",gen:"🏆"};
var REG={
  beis:["Se juega con 5 jugadores por equipo y una pelota, sin bate ni guante.","El partido dura 5 entradas y cada mitad termina con 3 outs.","Si hay empate al terminar, se juegan entradas extra.","En la página el marcador son las carreras y no se aceptan empates."],
  bas3:["Cada equipo juega con 3 jugadores en cancha y puede tener 1 suplente.","El partido dura 10 minutos o termina cuando un equipo llega a 21 puntos.","Los tiros valen 1 punto, o 2 si son detrás del arco.","Si hay empate, se juega tiempo extra. En la página no se aceptan empates."],
  vol:["Los sets se juegan a 25 puntos, con diferencia de 2.","El set decisivo se juega a 15 puntos, también con diferencia de 2.","El partido se gana con 2 sets.","En liga, ganar por 2 o más sets da 3 puntos; ganar por 1 set da 2 puntos y perder por 1 set da 1."]
};
var LOGS=[];
var FILT={est:"",team:""};
var EST={"programado":["🗓","Programado"],"en curso":["🔴","En curso"],"finalizado":["✅","Finalizado"],"aplazado":["⏸","Aplazado"],"cancelado":["✖","Cancelado"]};
var ESC={};
var OT=null,MSG="";
function load(){try{var d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.list))S=d}catch(e){}}

function mk(){return{id:nid(),name:"",sport:"beis",ro:{},type:"elim",teams:[],rounds:[],matches:[]}}
function sp(t){return SP[t.sport]||SP.gen}
function fin(t,m){return m.sa!=null&&m.sb!=null&&(!m.live||m.live.st=="fin")&&(sp(t).tie||m.sa!==m.sb)}
function cur(){return S.list.filter(function(x){return x.id==S.cur})[0]}
function G(t){return t.type=="liga"?t.matches.length>0:t.type=="grupos"?(t.gr||[]).length>0:t.type=="dele"?!!t.de:t.rounds.length>0}
function ms(t){if(t.type=="liga")return t.matches;var o=[];if(t.type=="grupos")(t.gr||[]).forEach(function(g){o=o.concat(g.matches)});if(t.type=="dele"&&t.de){["W","L"].forEach(function(k){t.de[k].forEach(function(rd){o=o.concat(rd)})});o=o.concat(t.de.F)}return o.concat.apply(o,t.rounds||[])}
function getM(t,r,i,g){var m=r=="L"?t.matches[i]:r=="T"?t.tp:r=="F"?t.de.F[0]:/^G\d/.test(r)?t.gr[+String(r).slice(1)].matches[i]:/^[WL]\d/.test(r)?t.de[r[0]][+String(r).slice(1)][i]:t.rounds[+r][i];return(g!=null&&g!==""&&m.g)?m.g[+g]:m}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=a[i];a[i]=a[j];a[j]=x}return a}

function rname(r,total){var l=total-r;return l==1?"Final":l==2?"Semifinales":l==3?"Cuartos de final":"Ronda "+(r+1)}

function myRole(){if(!DB||ADMIN)return"organizador";var r=ROLES[UID];return r&&RL[r.role]?r.role:"espectador"}
function isOrg(){return myRole()=="organizador"}
function canScore(){var r=myRole();return r=="organizador"||r=="arbitro"||r=="anotador"}
function canRoster(n){var r=myRole();return r=="organizador"||(r=="entrenador"&&ROLES[UID].team===n)}
function toast(m){var e=$("toast");e.textContent=m;e.hidden=false;clearTimeout(TO);TO=setTimeout(function(){e.hidden=true},4500)}
function fail(e){toast("No se pudo guardar: "+((e&&e.message)||"revisa tus permisos"))}
function put(x){var body=JSON.parse(JSON.stringify(x));Q=(Q||Promise.resolve()).then(function(){return DB.collection("torneos").doc(String(x.id)).set(body)}).catch(fail)}
function save(){var t=cur();if(DB){if(t)put(t);return}try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function fmt(ms){var q=Math.ceil(ms/1000);return Math.floor(q/60)+":"+("0"+(q%60)).slice(-2)}
function remT(L){return L.run?Math.max(0,L.rem-(Date.now()-L.t0)):L.rem}
function fmtN(t){return{liga:"Liga",elim:"Eliminación directa",grupos:"Grupos y llaves",dele:"Doble eliminación"}[t.type]||"Torneo"}
function isK(t,r){return t.type=="elim"||t.type=="dele"||(t.type=="grupos"&&!/^G/.test(String(r)))}
function tm2(v){var p=String(v).split(":");return(+p[0])*60+(+p[1]||0)}
function hm(n){return("0"+Math.floor(n/60)).slice(-2)+":"+("0"+(n%60)).slice(-2)}
function mkey(t,r,i,g){return t.id+"_"+r+"_"+i+(g==null||g===""?"":"_"+g)}
var PERM={
  click:{org:"gen rm addt deltor arch newseason setrama admren admnew admarch genko iapr irej apub adraft apubl adel bkp sched reglassave",
         score:"la lstart lfin lre lundo win addg",roster:"ap cap rp logodel",lineup:"st",editor:"rset rrm apr rej pick cfgsave",panel:"atab admlive seasgo adminopen"},
  change:{org:"tname trama ttype trules ttb tpw tpd tng tthird tbo tboF tdbl tmaxp tcupo topen bkpin",score:"sc dt gs est",roster:"coach pp logo"}
};
function allowed(a,ch){
  var n=PERM[ch?"change":"click"],has=function(k){return n[k]&&(" "+n[k]+" ").indexOf(" "+a+" ")>=0};
  if(has("org"))return isOrg();
  if(has("score"))return canScore();
  if(has("roster"))return canRoster(OT);
  if(has("lineup"))return canLineup(OT);
  if(has("editor"))return !DB||!!ADMIN;
  if(has("panel"))return canAdmin();
  return true;
}
function canConf(team){var r=myRole();return r=="organizador"||((r=="entrenador"||r=="capitan")&&!!ROLES[UID]&&ROLES[UID].team===team)}
function pub(){return !UID||myRole()=="espectador"}
var RAMA="f",RN={f:"femenino",m:"masculino"};
function rl(t){return t.rama?RN[t.rama]:"sin rama"}
function seasons(k,r){return S.list.filter(function(t){return(t.sport||"gen")===k&&(r==null||t.rama===r)}).sort(function(a,b){return b.id-a.id})}
function pickSeason(k){var l=seasons(k,RAMA);return l.filter(function(x){return !x.arch})[0]||l[0]||null}
function lkey(n){return encodeURIComponent(String(n)).replace(/\./g,"%2E")}
function allTeams(){var tn=[];S.list.forEach(function(t){t.teams.forEach(function(n){if(tn.indexOf(n)<0)tn.push(n)})});return tn}
function RO(t,n){t.ro=t.ro||{};return t.ro[n]||(t.ro[n]={coach:"",pl:[]})}
function soft(){var a=document.activeElement;if(a&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)){PEND=true;return}render()}
