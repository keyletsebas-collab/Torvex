// Menú lateral y páginas públicas: torneos, deportes, calendario, resultados, clasificaciones, equipos, noticias e información
var CFG={nombre:"",desc:"",contacto:"",reglamento:"",reglas:{}},PF={dep:"",rama:"",ed:"",team:"",est:"",fecha:"",q:""},TEAM=null,MENU=false,COLL=false;
var MENUP=[["Explorar",[["inicio","home","Inicio","Resumen de la liga"],["torneos","trophy","Torneos","Todas las ediciones"],["deportes","ball","Deportes","Reglas y ramas"]]],["Competencia",[["calendario","calendar","Calendario","Partidos por fecha"],["resultados","check","Resultados","Marcadores oficiales"],["clasif","chart","Clasificaciones","Posiciones"],["equipos","users","Equipos","Fichas y escudos"]]],["Liga",[["noticias","news","Noticias y anuncios","Comunicados"],["liga","info","Información de la liga","Reglas y contacto"]]]];
var ADMS=[["r","home","Resumen","Vista general","Resumen"],["t","trophy","Torneos y ediciones","Todas las ediciones","Competencia"],["d","ball","Deportes y reglamentos","Reglas por deporte","Competencia"],["q","users","Equipos y jugadores","Plantillas","Competencia"],["p","calendar","Calendarios y partidos","Programación","Competencia"],["m","check","Resultados y marcadores","Anotación en vivo","Competencia"],["c","chart","Clasificaciones y estadísticas","Tablas y líderes","Competencia"],["n","news","Noticias y anuncios","Comunicados","Comunidad"],["u","key","Usuarios y permisos","Roles y solicitudes","Comunidad"],["h","clock","Historial","Cambios realizados","Sistema"],["k","settings","Configuración","Datos y respaldos","Sistema"]];
function capi(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1)}
function isSuper(){return !DB||!!ADMIN}
function roleName(){return DB&&ADMIN?"Superadministrador":RL[myRole()][0]}
function admOk(k){
  if(!canAdmin())return false;
  if("rpm".indexOf(k)>=0)return true;
  if(!isOrg())return false;
  if(k=="u"||k=="k")return isSuper();
  return true;
}
function saveCfg(){
  if(DB)DB.doc("config/liga").set(JSON.parse(JSON.stringify(CFG))).catch(fail);
  else try{localStorage.setItem("torneo-cfg",JSON.stringify(CFG))}catch(e){}
}
function eds(){return S.list.filter(function(t){return SPN[t.sport]&&t.sport!="gen"&&(t.rama||isOrg())}).sort(function(a,b){return b.id-a.id})}
function edFilter(L){return L.filter(function(t){return(!PF.dep||t.sport===PF.dep)&&(!PF.rama||t.rama===PF.rama)&&(!PF.ed||String(t.id)===PF.ed)})}
function selHtml(k,opts,label){return'<select data-a="pf" data-k="'+k+'" aria-label="'+label+'">'+opts.map(function(o){return'<option value="'+esc(o[0])+'"'+(PF[k]===o[0]?" selected":"")+'>'+esc(o[1])+'</option>'}).join("")+'</select>'}
function filtros(keys,ph){
  var has=function(k){return keys.indexOf(k)>=0},h='<div class="flt">';
  if(has("q"))h+='<input type="text" data-a="pf" data-k="q" placeholder="'+(ph||"Buscar")+'" value="'+esc(PF.q)+'" aria-label="Buscar">';
  if(has("dep"))h+=selHtml("dep",[["","Todos los deportes"]].concat(["beis","bas3","vol"].map(function(k){return[k,SPN[k]]})),"Deporte");
  if(has("rama"))h+=selHtml("rama",[["","Ambas ramas"],["f","Femenino"],["m","Masculino"]],"Rama");
  var base=edFilter(eds().filter(function(t){return(!PF.dep||t.sport===PF.dep)&&(!PF.rama||t.rama===PF.rama)}));
  var all=eds().filter(function(t){return(!PF.dep||t.sport===PF.dep)&&(!PF.rama||t.rama===PF.rama)});
  if(has("ed"))h+=selHtml("ed",[["","Todos los torneos"]].concat(all.map(function(t){return[String(t.id),SPN[t.sport]+" "+rl(t)+", "+(t.name||"Edición")]})),"Torneo");
  if(has("team")){var tm=[];base.forEach(function(t){t.teams.forEach(function(n){if(tm.indexOf(n)<0)tm.push(n)})});tm.sort();h+=selHtml("team",[["","Todos los equipos"]].concat(tm.map(function(n){return[n,n]})),"Equipo")}
  if(has("est"))h+=selHtml("est",[["","Todos los estados"],["programado","Programados"],["en curso","En curso"],["finalizado","Finalizados"],["aplazado","Aplazados"],["cancelado","Cancelados"]],"Estado");
  if(has("fecha"))h+='<input type="date" data-a="pf" data-k="fecha" value="'+esc(PF.fecha)+'" aria-label="Fecha">';
  return h+'<button data-a="pfclear">Limpiar</button></div>';
}
function matchRows(){
  var o=[];
  edFilter(eds()).forEach(function(t){allKeyed(t).forEach(function(k){
    var m=k[2];if(!(m.a&&m.b&&m.a!==BYE&&m.b!==BYE))return;
    var e=estOf(t,m);
    if(PF.est&&e!==PF.est)return;
    if(PF.team&&m.a!==PF.team&&m.b!==PF.team)return;
    if(PF.q&&(m.a+" "+m.b).toLowerCase().indexOf(PF.q.toLowerCase())<0)return;
    if(PF.fecha&&m.date!==PF.fecha)return;
    o.push({t:t,r:k[0],i:k[1],m:m,e:e});
  })});
  return o;
}
function tagFor(e){return e=="finalizado"?"ok":e=="en curso"?"live":e=="programado"?"acc":""}
function dayTitle(d){return new Date(d+"T00:00").toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}
function edEstado(t){
  if(t.arch)return["Archivada",""];
  if(champ(t))return["Finalizado","ok"];
  if(!G(t))return["Por iniciar",""];
  return ms(t).some(function(m){return estOf(t,m)=="en curso"})?["En curso","live"]:["En juego","acc"];
}
function edCard(t){
  var e=edEstado(t),c=champ(t),btn=function(v,l){return'<button data-a="edopen" data-id="'+t.id+'" data-v="'+v+'">'+l+'</button>'};
  return'<div class="edc"><span class="tag '+e[1]+'">'+e[0]+'</span><b>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport]||"")+" "+esc(capi(rl(t)))+'</b><span>'+esc(t.name||"Edición")+'</span><small>'+fmtN(t)+", "+t.teams.length+" equipos"+(G(t)?", "+prog(t):"")+'</small>'+(c?'<small>🏆 '+esc(c)+'</small>':"")+'<div class="ctl">'+btn("p","Ver torneo")+btn("c","Calendario")+((t.type=="liga"||t.type=="grupos")&&G(t)?btn("t","Clasificación"):"")+'</div></div>';
}
function tile(k,q){
  var ss=seasons(k,q),cs=ss.filter(function(x){return !x.arch})[0]||ss[0],st=!cs?"Sin edición":champ(cs)?"🏆 "+esc(champ(cs)):G(cs)?prog(cs):"Sin generar";
  return'<button class="tc" data-a="go" data-s="dep" data-sp="'+k+'" data-ra="'+q+'"><span class="ti">'+(q=="f"?"♀":"♂")+'</span><b>'+(q=="f"?"Femenino":"Masculino")+'</b><small>'+(cs?esc(cs.name||"Edición")+", "+fmtN(cs):"Aún no hay ediciones")+(ss.length>1?" ("+ss.length+" ediciones)":"")+'</small><em>'+st+'</em></button>';
}
function vTorneos(){
  var L=edFilter(eds()).filter(function(t){return !PF.q||(t.name||"").toLowerCase().indexOf(PF.q.toLowerCase())>=0});
  var act=L.filter(function(t){return !t.arch&&!champ(t)}),fin=L.filter(function(t){return !t.arch&&champ(t)}),arc=L.filter(function(t){return t.arch});
  var sec=function(ti,A){return A.length?'<h2>'+ti+' ('+A.length+')</h2><div class="grid">'+A.map(edCard).join("")+'</div>':""};
  var h=filtros(["q","dep","rama"],"Buscar torneo");
  if(!L.length)return h+'<div class="rs"><p class="empty">Todavía no hay torneos con esos filtros.</p></div>';
  return h+sec("En juego o por iniciar",act)+sec("Finalizados",fin)+sec("Archivados",arc)+hallHtml();
}
function vDeportes(){
  return["beis","bas3","vol"].map(function(k){
    var lv=liveList().filter(function(q){return(q.t.sport||"gen")===k}).length;
    return'<div class="rs"><h2>'+SPI[k]+" "+SPN[k]+(lv?' <span class="tag live">'+lv+" en vivo</span>":"")+'</h2><p class="hint">'+(REG[k]||[]).map(esc).join(" ")+'</p>'+(CFG.reglas&&CFG.reglas[k]?'<p><b>Reglamento de la liga:</b> '+esc(CFG.reglas[k]).replace(/\n/g,"<br>")+'</p>':"")+'<div class="grid">'+tile(k,"f")+tile(k,"m")+'</div></div>';
  }).join("");
}
function vCalendario(){
  var all=matchRows(),dated=all.filter(function(x){return x.m.date}),
      sin=PF.fecha?[]:all.filter(function(x){return !x.m.date&&(x.e=="programado"||x.e=="aplazado"||x.e=="cancelado")});
  dated.sort(function(a,b){return(a.m.date+(a.m.time||"99")).localeCompare(b.m.date+(b.m.time||"99"))});
  var h=filtros(["dep","rama","ed","team","est","fecha"]),last="";
  if(!dated.length&&!sin.length)h+='<div class="rs"><p class="empty">No hay partidos para esos filtros.</p></div>';
  dated.forEach(function(x){if(x.m.date!==last){last=x.m.date;h+='<div class="dayh">'+esc(dayTitle(last))+'</div>'}h+=mrow(x)});
  if(sin.length)h+='<div class="dayh">Sin fecha ('+sin.length+')</div>'+sin.slice(0,40).map(mrow).join("");
  return h;
}
function vResultados(){
  var L=matchRows().filter(function(x){return x.e=="finalizado"||x.e=="en curso"});
  L.sort(function(a,b){return((b.m.live&&b.m.live.ts0)||0)-((a.m.live&&a.m.live.ts0)||0)||(b.m.date||"").localeCompare(a.m.date||"")||b.t.id-a.t.id});
  return filtros(["dep","rama","ed","team","fecha"])+(L.length?L.slice(0,80).map(mrow).join(""):'<div class="rs"><p class="empty">Todavía no hay resultados oficiales con esos filtros.</p></div>');
}
function vClasif(){
  var L=edFilter(eds()).filter(function(t){return G(t)}),h=filtros(["dep","rama","ed"]);
  var tabs=L.filter(function(t){return t.type=="liga"||t.type=="grupos"}),otros=L.filter(function(t){return t.type!="liga"&&t.type!="grupos"});
  if(!L.length)return h+'<div class="rs"><p class="empty">Todavía no hay clasificaciones. Se calculan solas cuando hay resultados oficiales.</p></div>';
  h+=tabs.map(function(t){return'<h2>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport])+" "+esc(capi(rl(t)))+", "+esc(t.name||"Edición")+'</h2>'+viewT(t)+'<div class="ctl"><button data-a="edopen" data-id="'+t.id+'" data-v="p">Ver partidos</button></div>'}).join("");
  if(otros.length)h+='<h2>Torneos con llaves</h2><div class="grid">'+otros.map(edCard).join("")+'</div>';
  return h;
}
function teamStats(t,n){
  var o={pj:0,g:0,e:0,p:0,gf:0,gc:0};
  ms(t).forEach(function(m){
    if(!(m.a===n||m.b===n)||estOf(t,m)!="finalizado"||m.sa==null||m.sb==null)return;
    var mine=m.a===n?m.sa:m.sb,rival=m.a===n?m.sb:m.sa;
    o.pj++;o.gf+=mine;o.gc+=rival;
    if(mine>rival)o.g++;else if(mine<rival)o.p++;else o.e++;
  });
  return o;
}
function vEquipos(){
  var C=[];
  edFilter(eds()).forEach(function(t){t.teams.forEach(function(n){if(PF.q&&n.toLowerCase().indexOf(PF.q.toLowerCase())<0)return;C.push({t:t,n:n})})});
  C.sort(function(a,b){return a.n.localeCompare(b.n)});
  var h=filtros(["q","dep","rama","ed"],"Buscar equipo");
  if(!C.length)return h+'<div class="rs"><p class="empty">No hay equipos con esos filtros.</p></div>';
  return h+'<div class="grid">'+C.map(function(x){
    var s=teamStats(x.t,x.n);
    return'<button class="tc" data-a="team" data-id="'+x.t.id+'" data-n="'+esc(x.n)+'"><span class="ti">'+crest(x.t,x.n)+'</span><b>'+esc(x.n)+'</b><small>'+(SPI[x.t.sport]||"")+" "+esc(capi(rl(x.t)))+", "+esc(x.t.name||"Edición")+'</small><em>PJ '+s.pj+", G "+s.g+", P "+s.p+'</em></button>';
  }).join("")+'</div>';
}
function matchRows0(t){
  var o=[];allKeyed(t).forEach(function(k){var m=k[2];if(m.a&&m.b&&m.a!==BYE&&m.b!==BYE)o.push({t:t,r:k[0],i:k[1],m:m,e:estOf(t,m)})});
  o.sort(function(a,b){return(a.m.date||"9999").localeCompare(b.m.date||"9999")});
  return o;
}
function vNoticias(){
  if(!DB)return'<div class="rs"><p class="empty">Las noticias necesitan la base de datos compartida. En modo local no están disponibles.</p></div>';
  var org=isOrg(),L=ANU.filter(function(a){return org||a.st!="borrador"});
  return(org?'<div class="rs"><b>Nueva noticia</b><div style="margin-top:8px">'+annForm()+'</div></div>':"")+(L.length?L.map(function(a){return annItem(a,org)}).join(""):'<div class="rs"><p class="empty">Todavía no hay noticias publicadas.</p></div>');
}
function vLiga(){
  var h='<div class="banner"><h2>'+esc(CFG.nombre||"Liga escolar de deportes")+'</h2><p>'+esc(CFG.desc||"Torneos de Baseball5, Basket 3x3 y Voleibol, en ramas femenina y masculina.")+'</p></div>';
  h+='<div class="rs"><b>Cómo funciona</b><ul class="rl"><li>Cada deporte se juega en dos ramas: femenino y masculino.</li><li>Cada edición es un torneo nuevo, con sus propios equipos, calendario y clasificación.</li><li>Las clasificaciones se calculan solas con los resultados oficiales.</li><li>Los resultados oficiales solo los registra personal autorizado.</li></ul></div>';
  if(CFG.reglamento)h+='<div class="rs"><b>Reglamento general</b><p style="margin-top:8px">'+esc(CFG.reglamento).replace(/\n/g,"<br>")+'</p></div>';
  h+=["beis","bas3","vol"].map(function(k){return'<div class="rs"><b>'+SPI[k]+" "+SPN[k]+'</b><ul class="rl">'+(REG[k]||[]).map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul>'+(CFG.reglas&&CFG.reglas[k]?'<p class="hint">'+esc(CFG.reglas[k]).replace(/\n/g,"<br>")+'</p>':"")+'</div>'}).join("");
  h+='<div class="rs"><b>Privacidad</b><p class="hint" style="margin-top:6px">No se publican datos personales de estudiantes. Las plantillas de jugadores solo son visibles para participantes con cuenta.</p></div>';
  h+='<div class="rs"><b>Quién puede hacer qué</b>'+Object.keys(RL).map(function(k){return'<div class="pl"><span class="pn">'+RL[k][0]+'</span><span class="hint">'+RL[k][1]+'</span></div>'}).join("")+'<div class="pl"><span class="pn">Superadministrador</span><span class="hint">Controla la plataforma: usuarios, permisos, configuración y respaldos.</span></div></div>';
  if(CFG.contacto)h+='<div class="rs"><b>Contacto</b><p style="margin-top:6px">'+esc(CFG.contacto)+'</p></div>';
  return h;
}
function topTables(){
  var L=eds().filter(function(t){return !t.arch&&G(t)&&(t.type=="liga"||t.type=="grupos")}).slice(0,4);
  if(!L.length)return"";
  return'<h2>Clasificaciones destacadas</h2><div class="grid">'+L.map(function(t){
    var rows=t.type=="liga"?table(t).slice(0,3):[].concat.apply([],t.gr.map(function(g){return table({teams:g.teams,matches:g.matches,sport:t.sport,type:"liga",pw:t.pw,pd:t.pd,tb:t.tb,id:t.id}).slice(0,1)}));
    return'<div class="rs"><b>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport])+" "+esc(capi(rl(t)))+'</b><p class="hint">'+esc(t.name||"Edición")+(t.type=="grupos"?", líderes de cada grupo":"")+'</p><div class="tw"><table><tr><th>#</th><th>Equipo</th><th>Pts</th></tr>'+rows.map(function(r,i){return'<tr'+(i==0?' class="top"':"")+'><td>'+(i+1)+'</td><td>'+crest(t,r.n)+esc(r.n)+'</td><td>'+r.pt+'</td></tr>'}).join("")+'</table></div><button data-a="edopen" data-id="'+t.id+'" data-v="t">Ver clasificación</button></div>';
  }).join("")+'</div>';
}
var ICO={home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 3 15 0 18M3 12h18M5 6c4 2 10 2 14 0M5 18c4-2 10-2 14 0"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',chart:'<path d="M5 21V10M12 21V4M19 21v-8"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/>',news:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',settings:'<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',plus:'<path d="M12 5v14M5 12h14"/>',bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',pin:'<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'};
function ic(n){return'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[n]||"")+'</svg>'}
function pl(n,a,b){return n+" "+(n==1?a:b)}
function ago(ts){if(!ts)return"";var m=Math.floor((Date.now()-ts)/60000);if(m<1)return"hace un momento";if(m<60)return"hace "+m+" min";var h=Math.floor(m/60);if(h<24)return"hace "+h+" h";return"hace "+Math.floor(h/24)+" d"}
function dayLbl(d){var h=todayISO(),t=new Date(h+"T00:00");t.setDate(t.getDate()+1);var m=t.getFullYear()+"-"+("0"+(t.getMonth()+1)).slice(-2)+"-"+("0"+t.getDate()).slice(-2);return d==h?"Hoy":d==m?"Mañana":new Date(d+"T00:00").toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})}
function mi(attr,icon,title,sub,on,bd){return'<button '+attr+' class="'+(on?"on":"")+'"><span class="mic">'+ic(icon)+'</span><span class="mtx"><b>'+title+'</b>'+(sub?'<span class="ms">'+sub+'</span>':"")+'</span>'+(bd?'<em class="bd">'+bd+'</em>':"")+'</button>'}
function menuHtml(){
  if(SC=="admin"){
    var bad={t:S.list.filter(function(t){return !t.arch}).length,n:ANU.filter(function(a){return a.st=="borrador"}).length,u:Object.keys(SOL).length+Object.keys(INSC).length};
    var h=mi('data-a="go" data-s="inicio"',"arrow","Volver al sitio","Salir del panel",false),gr="";
    ADMS.filter(function(x){return admOk(x[0])}).forEach(function(x){
      if(x[4]!==gr){gr=x[4];h+='<div class="mh">'+gr+'</div>'}
      h+=mi('data-a="atab" data-v="'+x[0]+'"',x[1],x[2],x[3],AV==x[0],bad[x[0]]||"");
    });
    return h;
  }
  var on={dep:"deportes",vivo:"deportes",equipo:"equipos",tv:""}[SC];if(on==null)on=SC;
  var m=MENUP.map(function(g){return'<div class="mh">'+g[0]+'</div>'+g[1].map(function(x){return mi('data-a="go" data-s="'+x[0]+'"',x[1],x[2],x[3],on==x[0],"")}).join("")}).join("");
  if(myTeam())m='<div class="mh">Mi equipo</div>'+mi('data-a="go" data-s="miequipo"',"users","Mi equipo",myModeName()+": "+esc(myTeam()),SC=="miequipo",pendAtt()||"")+m;
  m+='<div class="mh">Cuenta</div>'+mi('data-a="go" data-s="cuenta"',"key",UID?"Mi cuenta":"Acceso",UID?"Perfil y alertas":"Entrar o crear cuenta",SC=="cuenta","");
  if(canAdmin())m+=mi('data-a="go" data-s="admin"',"settings","Panel de administración","Gestión de la liga",false,"");
  return m;
}
function kpi(label,val,sub,icon,tone,attr){
  var inner='<div class="kh"><span>'+label+'</span><i class="chip '+tone+'">'+ic(icon)+'</i></div><b>'+val+'</b><small>'+sub+'</small>';
  return attr?'<button class="kpi" '+attr+' data-l="'+esc(label)+'">'+inner+'</button>':'<div class="kpi" data-l="'+esc(label)+'">'+inner+'</div>';
}
function edRow(t){
  var e=edEstado(t);
  return'<button class="er" data-a="edopen" data-id="'+t.id+'" data-v="p"><span class="eic">'+ic("trophy")+'</span><span class="etx"><b>'+esc(t.name||"Edición")+' <span class="tag '+e[1]+'">'+e[0]+'</span></b><small>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport]||"")+" "+esc(capi(rl(t)))+", "+fmtN(t)+'</small><small>'+pl(t.teams.length,"equipo","equipos")+(G(t)?", "+prog(t):"")+'</small></span><span class="arr">'+ic("arrow")+'</span></button>';
}
function feedItems(){
  var o=[];
  homeMatches().forEach(function(x){
    var m=x.m,ts=m.live&&m.live.ts0;
    if(x.e=="en curso")o.push({ts:ts||Date.now(),ic:"bolt",tone:"t5",tx:"En vivo: "+esc(m.a)+" "+m.sa+" - "+m.sb+" "+esc(m.b)});
    else if(x.e=="finalizado"&&m.sa!=null&&m.sb!=null&&ts)o.push({ts:ts,ic:"check",tone:"t2",tx:"Finalizado: "+esc(m.a)+" "+m.sa+" - "+m.sb+" "+esc(m.b)});
  });
  ANU.filter(function(a){return a.st!="borrador"&&a.ts}).forEach(function(a){o.push({ts:a.ts,ic:"news",tone:"t1",tx:"Noticia: "+esc(a.txt)})});
  return o.sort(function(a,b){return b.ts-a.ts}).slice(0,6);
}
function upcCards(prox){
  if(!prox.length)return"";
  return'<h2>Próximos partidos</h2><div class="upc">'+prox.slice(0,8).map(function(x){
    var m=x.m,t=x.t;
    return'<button class="uc" data-a="openlive" data-id="'+t.id+'" data-r="'+x.r+'" data-i="'+x.i+'"><span class="ut"><span class="tg">Partido</span><span class="tg2">'+esc(dayLbl(m.date))+'</span></span><span class="ub"><span class="um"><span class="un">'+crest(t,m.a)+esc(m.a)+'</span><span class="un">'+crest(t,m.b)+esc(m.b)+'</span></span><span class="uh">'+esc(m.time||"--:--")+'</span></span><span class="uf"><span>'+(SPI[t.sport]||"")+" "+esc(capi(rl(t)))+", "+esc(t.name||"Edición")+'</span><span>'+esc(m.court||"")+'</span></span></button>';
  }).join("")+'</div>';
}
function vEquipo(){
  var t=TEAM&&S.list.filter(function(x){return x.id===TEAM.id})[0];
  if(!t||t.teams.indexOf(TEAM.n)<0)return'<div class="rs"><p class="empty">No se encontró el equipo.</p><button data-a="go" data-s="equipos">Volver a equipos</button></div>';
  var n=TEAM.n,s=teamStats(t,n),pos="",gg=(t.gr||[]).filter(function(g){return g.teams.indexOf(n)>=0})[0];
  if(G(t)&&(t.type=="liga"||t.type=="grupos")){
    var tb=t.type=="liga"?table(t):table({teams:(gg||{teams:[]}).teams,matches:(gg||{matches:[]}).matches,sport:t.sport,type:"liga",pw:t.pw,pd:t.pd,tb:t.tb,id:t.id});
    for(var i=0;i<tb.length;i++)if(tb[i].n===n)pos=(i+1)+"º";
  }
  var rows=matchRows0(t).filter(function(x){return x.m.a===n||x.m.b===n}),R=((t.ro||{})[n]||{pl:[]});
  var h='<div class="ctl"><button data-a="go" data-s="equipos">Volver a equipos</button><button data-a="edopen" data-id="'+t.id+'" data-v="p">Ver el torneo</button></div>';
  h+='<div class="hero2 team"><div class="big">'+crest(t,n)+'</div><div><h2>'+esc(n)+'</h2><p>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport])+" "+esc(rl(t))+", "+esc(t.name||"Edición")+'</p></div></div>';
  h+='<div class="kpis">'+kpi("Partidos jugados",s.pj,"En esta edición","calendar","t1")+kpi("Ganados",s.g,s.e?pl(s.e,"empate","empates"):"Sin empates","check","t2")+kpi("Perdidos",s.p,"En esta edición","bolt","t5")+kpi("A favor - en contra",s.gf+" - "+s.gc,"Diferencia "+(s.gf-s.gc),"chart","t3")+(pos?kpi("Posición",pos,"En la tabla","trophy","t4"):"")+'</div>';
  h+='<h2>Resultados y partidos</h2>'+(rows.length?rows.map(mrow).join(""):'<div class="rs"><p class="empty">Este equipo todavía no tiene partidos.</p></div>');
  h+='<h2>Plantilla</h2>';
  if(pub())h+='<div class="rs"><p class="hint">Por privacidad, la plantilla solo la ven jugadores, representantes, anotadores y personal de la liga con cuenta.</p></div>';
  else h+='<div class="rs">'+(R.coach?'<p class="hint">Entrenador: '+esc(R.coach)+'</p>':"")+((R.pl||[]).length?R.pl.map(function(p){return'<div class="pl rr"><span class="av">'+esc(String(p.n||"?").slice(0,1).toUpperCase())+'</span><span class="pn">'+esc(p.n)+(p.cap?" <small>Capitán</small>":"")+(p.st?"":" <small>Banca</small>")+'<br><span class="hint">'+esc(p.pos||"Sin posición")+'</span></span><b class="num">#'+esc(p.num||"-")+'</b></div>'}).join(""):'<p class="empty">Todavía no hay jugadores registrados.</p>')+'</div>';
  return h;
}
var CRC=[["#F5B301","#B07A00"],["#10B981","#047857"],["#EF4444","#B91C1C"],["#3B82F6","#1D4ED8"],["#8B5CF6","#6D28D9"],["#84CC16","#4D7C0F"],["#06B6D4","#0E7490"],["#94A3B8","#475569"]];
function shield(n){
  var c=String(n).trim(),k=CRC[(c.charCodeAt(0)||0)%8];
  return'<svg class="cr sh" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1.5l9.500 3.200v8.600c0 6.200-4.200 10.500-9.500 13.200C6.700 23.800 2.500 19.500 2.500 13.300V4.700L12 1.500z" fill="'+k[0]+'" stroke="'+k[1]+'" stroke-width="1.600"/><path d="M12 5v19" stroke="rgba(255,255,255,.28)" stroke-width="1"/><text x="12" y="17" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Inter,sans-serif">'+esc(c.slice(0,1).toUpperCase())+'</text></svg>';
}
function crest(t,n){
  var u=(ESC[String(t.id)]||{})[lkey(n)];
  if(typeof u=="string"&&u.length<30000&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(u))return'<img class="cr" alt="" src="'+u+'">';
  return shield(n);
}
function toprHtml(){
  var u=UID?'<button class="uchip" data-a="go" data-s="cuenta"><span class="av">'+esc((NAME||"?").trim().slice(0,1).toUpperCase())+'</span><span class="un2"><b>'+esc(NAME||"Mi cuenta")+'</b><small>'+esc(roleName())+'</small></span></button>':'<button class="pri" data-a="go" data-s="cuenta">Iniciar sesión</button>';
  return(SC=="admin"?'<span class="orgc">'+esc(CFG.nombre||"Liga escolar")+'<em>admin</em></span>':"")+u;
}
function ctaHtml(){
  if(SC=="admin"&&!isOrg())return'<button class="ctab" data-a="adminopen" data-v="m">'+ic("check")+'<span>Abrir marcadores</span></button>';
  return isOrg()?'<button class="ctab" data-a="adminopen" data-v="t">'+ic("plus")+'<span>Nueva edición</span></button>':'<button class="ctab" data-a="go" data-s="calendario">'+ic("calendar")+'<span>Ver calendario</span></button>';
}
function mrow(x){
  var m=x.m,t=x.t,inf=EST[x.e],sc=(x.e=="finalizado"||x.e=="en curso")&&m.sa!=null&&m.sb!=null;
  return'<div class="mrow"><div class="mt1"><span class="tn">'+crest(t,m.a)+esc(m.a)+'</span>'+(sc?'<span class="scr"><b>'+m.sa+'</b><i>:</i><b>'+m.sb+'</b></span>':'<span class="vs">VS</span>')+'<span class="tn">'+crest(t,m.b)+esc(m.b)+'</span></div>'+
    '<div class="mt2"><span class="tag '+tagFor(x.e)+'">'+inf[0]+" "+inf[1]+'</span>'+((m.date||m.time||x.e=="programado"||x.e=="aplazado")?'<span>'+ic("clock")+(m.date?esc(m.date.slice(5))+" ":"")+esc(m.time||(m.date?"":"Sin fecha"))+'</span>':"")+(m.court?'<span>'+ic("pin")+esc(m.court)+'</span>':"")+'</div>'+
    '<div class="mi"><span>'+(SPI[t.sport]||"")+" "+esc(capi(rl(t)))+", "+esc(t.name||"Edición")+'</span><button class="vd" data-a="openlive" data-id="'+t.id+'" data-r="'+x.r+'" data-i="'+x.i+'">Ver detalles'+ic("arrow")+'</button></div></div>';
}
function livePanel(){
  var lv=liveList().filter(function(q){return !q.t.arch});
  return'<h2>Partidos en vivo</h2><div class="rs live">'+(lv.length?lv.slice(0,5).map(function(q){
    return'<button class="lp" data-a="openlive" data-id="'+q.t.id+'" data-r="'+q.r+'" data-i="'+q.i+'"'+(q.g!=null?' data-g="'+q.g+'"':"")+'><span class="lpt">'+crest(q.t,q.m.a)+'<b class="num">'+q.x.sa+'</b><i>:</i><b class="num">'+q.x.sb+'</b>'+crest(q.t,q.m.b)+'</span><small>'+esc(q.m.a)+" vs "+esc(q.m.b)+(q.g!=null?", juego "+(q.g+1):"")+'</small></button>';
  }).join(""):'<p class="empty">No hay partidos en vivo ahora.</p>')+'</div>';
}
function vInicio(){
  var E=eds(),act=E.filter(function(t){return !t.arch&&G(t)&&!champ(t)}),hm=homeMatches(),hoy=todayISO();
  var prox=hm.filter(function(x){return x.e=="programado"&&x.m.date&&x.m.date>=hoy}).sort(function(a,b){return(a.m.date+(a.m.time||"99")).localeCompare(b.m.date+(b.m.time||"99"))});
  var live=hm.filter(function(x){return x.e=="en curso"}).length,eq=0;
  E.forEach(function(t){if(!t.arch)eq+=t.teams.length});
  var h='<div class="banner"><h2>'+(UID&&NAME?"Hola, "+esc(NAME.split(" ")[0])+" 👋":esc(CFG.nombre||"Liga escolar de deportes"))+'</h2><p>'+(act.length||prox.length?"Hay "+pl(act.length,"torneo activo","torneos activos")+" y "+pl(prox.length,"partido próximo","partidos próximos")+".":esc(CFG.desc||"Resultados, calendarios y clasificaciones de Baseball5, Basket 3x3 y Voleibol."))+'</p></div>';
  h+='<div class="kpis">'+kpi("Torneos",E.length,"En todas las ramas","trophy","t5")+kpi("En juego",act.length,live?pl(live,"partido en vivo","partidos en vivo"):"Sin partidos en vivo","bolt","t2")+kpi("Equipos",eq,"Inscritos","users","t1")+kpi("Próximos partidos",prox.length,"Programados","calendar","t4")+'</div>';
  if(myTeam())h+=mini();
  if(!UID)h+='<div class="rs"><b>Estás sin sesión</b><p class="hint">Inicia sesión o crea tu cuenta para participar.</p><div class="ctl"><button class="pri" data-a="acc" data-v="login">Iniciar sesión</button><button data-a="acc" data-v="crear">Crear cuenta</button></div></div>';
  var fd=feedItems(),best=pub()?[]:eds().filter(function(t){return !t.arch}).reduce(function(a,t){return a.concat(statsOf(t))},[]).filter(function(x){return x.sc>0}).sort(function(a,b){return b.sc-a.sc}).slice(0,4);
  var rec=hm.filter(function(x){return(x.e=="finalizado"||x.e=="en curso")&&x.m.sa!=null&&x.m.sb!=null}).sort(function(x,y){return((y.m.live&&y.m.live.ts0)||0)-((x.m.live&&x.m.live.ts0)||0)||y.t.id-x.t.id}).slice(0,5);
  var left=annHtml()+upcCards(prox)+'<h2>Resultados recientes</h2>'+(rec.length?rec.map(mrow).join(""):'<div class="rs"><p class="empty">Todavía no hay resultados oficiales.</p></div>')+
    '<h2>Torneos activos</h2>'+(act.length?'<div class="ers">'+act.slice(0,5).map(edRow).join("")+'</div>':'<div class="rs"><p class="empty">Todavía no hay torneos en juego.</p></div>')+'<div class="ctl"><button data-a="go" data-s="torneos">Ver todos los torneos</button></div>';
  var right=livePanel()+'<h2>Actividad reciente</h2><div class="rs feed">'+(fd.length?fd.map(function(f){return'<div class="fi"><i class="chip '+f.tone+'">'+ic(f.ic)+'</i><span>'+f.tx+'<small>'+ago(f.ts)+'</small></span></div>'}).join(""):'<p class="empty">Todavía no hay actividad.</p>')+'</div>'+
    (best.length?'<h2>Mejores jugadores</h2><div class="rs">'+best.map(function(x,i){return'<div class="pl"><span class="rkc r'+(i+1)+'">'+(i+1)+'</span><span class="pn">'+esc(x.p)+' <small>'+esc(x.team)+'</small></span><b class="num">'+x.sc+'</b></div>'}).join("")+'</div>':"")+topTables();
  h+='<div class="two"><div>'+left+'</div><div>'+right+'</div></div>';
  h+='<h2>Deportes</h2><div class="grid">'+["beis","bas3","vol"].map(function(k){return'<button class="tc" data-a="go" data-s="dep" data-sp="'+k+'" data-ra="'+RAMA+'"><span class="ti">'+SPI[k]+'</span><b>'+SPN[k]+'</b><small>Femenino y masculino</small></button>'}).join("")+'</div>';
  return h+(S.list.length?'<div class="ctl"><button data-a="go" data-s="tv">Pantalla grande</button></div>':"")+rankHtml();
}
