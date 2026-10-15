// Pantallas y vistas
function card0(t,m,r,i){if(m.bo>1&&m.g)return serieCard(t,m,r,i);
  var el=isK(t,r),ok=m.a&&m.b&&m.a!==BYE&&m.b!==BYE,at=' data-r="'+r+'" data-i="'+i+'"';
  function row(k){
    var n=m[k];
    if(!n)return'<div class="team '+(r===0?"bye":"wait")+'"><span class="nm">'+(r===0?"Pase libre":"Por definir")+'</span></div>';
    if(n===BYE)return'<div class="team bye"><span class="nm">Pase libre</span></div>';var c=m.w===n?" w":m.w?" l":"",s=m["s"+k];
    return'<div class="team'+c+'">'+(el&&ok?'<button class="nm" data-a="win" data-k="'+k+'"'+at+'>'+crest(t,n)+esc(n)+'</button>':'<span class="nm">'+crest(t,n)+esc(n)+'</span>')+
      (ok?'<input class="sc" type="number" min="0" inputmode="numeric" aria-label="'+sp(t).u+' de '+esc(n)+'" data-a="sc" data-k="'+k+'"'+at+' value="'+(s==null?"":s)+'">':"")+'</div>';
  }
  var h='<div class="match">'+row("a")+row("b");
  if(el&&ok&&!m.w&&m.sa!=null&&m.sa===m.sb)h+='<div class="note">Empate: toca al ganador.</div>';
  if(!el&&ok&&m.sa!=null&&m.sa===m.sb&&!sp(t).tie)h+='<div class="note">No hay empates en este deporte.</div>';
  if(ok)h+='<div class="dt"><input type="date" aria-label="Fecha" data-a="dt" data-k="date"'+at+' value="'+(m.date||"")+'"><input type="time" aria-label="Hora" data-a="dt" data-k="time"'+at+' value="'+(m.time||"")+'"><input type="text" class="ct" maxlength="12" placeholder="Cancha" aria-label="Cancha" data-a="dt" data-k="court"'+at+' value="'+esc(m.court||"")+'"></div>';
  var lvOn=m.live&&m.live.st=='on';if(ok&&(m.live||canScore()))h+='<button class="lv'+(lvOn?' on':'')+'" data-a="live" data-r="'+r+'" data-i="'+i+'">'+(lvOn?'🔴 En vivo':m.live?'Ver resumen':'Anotar en vivo')+'</button>';
  return h+'</div>';
}

function viewP(t){
  if(t.type=="liga")return'<div class="grid">'+t.matches.map(function(m,i){return card(t,m,"L",i)}).join("")+'</div>';
  return'<p class="hint">Escribe el marcador o toca un nombre para marcar al ganador (toca otra vez para deshacer).</p><div class="bracket">'+
    t.rounds.map(function(rd,r){return'<div class="round"><h3>'+rname(r,t.rounds.length)+'</h3>'+rd.map(function(m,i){return card(t,m,r,i)}).join("")+'</div>'}).join("")+'</div>';
}
function viewC0(t){
  var all=gl(t),sch=all.filter(function(m){return m.date});
  sch.sort(function(x,y){return(x.date+(x.time||"99")).localeCompare(y.date+(y.time||"99"))});
  var h="",last="";
  sch.forEach(function(m){
    if(m.date!==last){if(last)h+="</div>";last=m.date;h+='<div class="cal"><h2>'+new Date(m.date+"T00:00").toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})+'</h2>'}
    h+='<div><b>'+(m.time||"Sin hora")+'</b><span>'+esc(m.a)+(m.sa!=null&&m.sb!=null?" "+m.sa+" - "+m.sb+" ":" vs ")+esc(m.b)+esc(m.n||"")+(m.court?" ("+esc(m.court)+")":"")+(m.est?" ["+esc(m.est)+"]":"")+'</span></div>';
  });
  if(last)h+="</div>";
  var n=all.length-sch.length;
  return(h||'<p class="empty">Aún no hay partidos con fecha.</p>')+(n?'<p class="hint">'+n+' partido(s) sin fecha. Asígnala en la pestaña Partidos.</p>':"");
}


function vAjustes(t){
  var g=G(t);
  return'<div class="panel"><label for="tname">Nombre de la edición</label><div class="row"><input type="text" id="tname" data-a="tname" maxlength="60" placeholder="Ej. Edición 2026" value="'+esc(t.name)+'"></div>'+'<label for="trama">Rama</label><div class="row"><select id="trama" data-a="trama"><option value="">Sin rama</option><option value="f"'+(t.rama=="f"?" selected":"")+'>Femenino</option><option value="m"'+(t.rama=="m"?" selected":"")+'>Masculino</option></select></div>'+
  '<p class="hint">'+(SPI[t.sport]||"")+" "+(SPN[t.sport]||"")+": "+sp(t).r+'</p>'+
  '<label for="ttype">Formato</label><div class="row"><select id="ttype" data-a="ttype"'+(g?" disabled":"")+'><option value="elim"'+(t.type=="elim"?" selected":"")+'>Eliminación directa (llaves)</option><option value="liga"'+(t.type=="liga"?" selected":"")+'>Liga (todos contra todos)</option><option value="grupos"'+(t.type=="grupos"?" selected":"")+'>Fase de grupos + llaves</option><option value="dele"'+(t.type=="dele"?" selected":"")+'>Doble eliminación</option></select></div>'+
  (t.type=="liga"||t.type=="grupos"?'<label for="tdbl">Vueltas</label><div class="row"><select id="tdbl" data-a="tdbl"'+(g?" disabled":"")+'><option value="1"'+(t.dbl?"":" selected")+'>Una vuelta</option><option value="2"'+(t.dbl?" selected":"")+'>Ida y vuelta</option></select></div>':"")+rulesHtml(t)+(t.type=="liga"||t.type=="grupos"?ptsHtml(t)+tbHtml(t):"")+(t.type=="grupos"?ngHtml(t,g):"")+(t.type=="elim"||t.type=="grupos"?'<label for="tbo">Serie por ronda</label><div class="row"><select id="tbo" data-a="tbo"'+(g?" disabled":"")+'>'+bos(t.bo)+'</select></div><label for="tbof">Serie de la final</label><div class="row"><select id="tbof" data-a="tbof"'+(g?" disabled":"")+'>'+bos(t.boF||t.bo)+'</select></div>':"")+(t.type=="elim"||t.type=="grupos"?thirdSel(t,g):"")+'<label for="team">Agregar equipo o jugador</label><div class="row"><input type="text" id="team" placeholder="Nombre" maxlength="40"><button class="pri" data-a="addt">Agregar</button></div>'+
  (t.teams.length?"":'<p class="empty">Aún no hay equipos. Necesitas al menos 2.</p>')+
  '<ul class="chips">'+t.teams.map(function(n,i){return'<li>'+esc(n)+'<button data-a="rm" data-i="'+i+'" aria-label="Quitar '+esc(n)+'">×</button></li>'}).join("")+'</ul>'+
  '<div class="actions"><button class="pri" data-a="gen"'+(t.teams.length<2?" disabled":"")+'>'+(g?"Volver a sortear":"Generar partidos")+'</button><button data-a="arch">'+(t.arch?"Restaurar":"Archivar")+' edición</button><button data-a="deltor">Eliminar edición</button></div></div>';
}
function serieCard(t,m,r,i){
  var ok=m.a&&m.b,need=Math.ceil(m.bo/2);
  function row(k){
    var n=m[k];
    if(!n)return'<div class="team wait"><span class="nm">Por definir</span></div>';
    return'<div class="team'+(m.w===n?" w":m.w?" l":"")+'"><span class="nm">'+crest(t,n)+esc(n)+'</span><b class="wn">'+(m["s"+k]||0)+'</b></div>';
  }
  var h='<div class="match"><div class="note">Mejor de '+m.bo+': gana quien llegue a '+need+'</div>'+row("a")+row("b");
  if(ok)m.g.forEach(function(g,gi){
    var at=' data-r="'+r+'" data-i="'+i+'" data-g="'+gi+'"',on=g.live&&g.live.st=="on",n=gi+1;
    function sc(k,nm){return'<input class="sc" type="number" min="0" inputmode="numeric" aria-label="Marcador de '+esc(nm)+' en el juego '+n+'" data-a="sc" data-k="'+k+'"'+at+' value="'+(g["s"+k]==null?"":g["s"+k])+'">'}
    h+='<div class="gm"><span>Juego '+n+'</span>'+sc("a",m.a)+sc("b",m.b)+'<input type="date" aria-label="Fecha del juego '+n+'" data-a="dt" data-k="date"'+at+' value="'+(g.date||"")+'"><input type="time" aria-label="Hora del juego '+n+'" data-a="dt" data-k="time"'+at+' value="'+(g.time||"")+'">'+((g.live||canScore())?'<button class="lv'+(on?" on":"")+'" data-a="live"'+at+'>'+(on?"🔴 En vivo":g.live?"Ver resumen":"Anotar en vivo")+'</button>':"")+'</div>';
  });
  return h+'</div>';
}
function viewG(t){
  var h=t.gr.map(function(g,gi){return'<h2>'+esc(g.n)+'</h2><div class="grid">'+g.matches.map(function(m,i){return card(t,m,"G"+gi,i)}).join("")+'</div>'}).join("");
  if(!t.rounds.length){
    var dn=t.gr.every(function(g){return g.matches.every(function(m){return m.est=="cancelado"||fin(t,m)})});
    h+=canScore()?'<div class="ctl"><button class="pri" data-a="genko">Generar llaves con los 2 mejores de cada grupo</button></div>'+(dn?"":'<p class="hint">Aún hay partidos de grupos sin terminar.</p>'):'<p class="hint">Las llaves aparecen cuando el organizador las genera.</p>';
    return h;
  }
  return h+'<h2>Llaves</h2>'+viewP(t);
}
function thirdHtml(t){return t.tp?'<h2>Tercer lugar</h2><div class="grid">'+card(t,t.tp,"T",0)+'</div>':""}
function pv(t){return(t.type=="grupos"?viewG(t):t.type=="dele"?viewDE(t):viewP(t))+thirdHtml(t)}
function ngHtml(t,g){return'<label for="tng">Número de grupos</label><div class="row"><select id="tng" data-a="tng"'+(g?" disabled":"")+'><option value="0"'+(t.ng?"":" selected")+'>Automático</option><option value="2"'+(t.ng==2?" selected":"")+'>2 grupos</option><option value="4"'+(t.ng==4?" selected":"")+'>4 grupos</option></select></div>'}
function thirdSel(t,g){return'<label for="tthird">Partido por el tercer lugar</label><div class="row"><select id="tthird" data-a="tthird"'+(g?" disabled":"")+'><option value="0"'+(t.third?"":" selected")+'>No</option><option value="1"'+(t.third?" selected":"")+'>Sí</option></select></div>'}
function viewDE(t){
  function col(ty,rd,r){return'<div class="round"><h3>Ronda '+(r+1)+'</h3>'+rd.map(function(m,i){return card(t,m,ty+r,i)}).join("")+'</div>'}
  return'<h2>Cuadro de ganadores</h2><div class="bracket">'+t.de.W.map(function(rd,r){return col("W",rd,r)}).join("")+'</div><h2>Cuadro de perdedores</h2><div class="bracket">'+t.de.L.map(function(rd,r){return col("L",rd,r)}).join("")+'</div><h2>Gran final</h2><div class="grid">'+card(t,t.de.F[0],"F",0)+'</div><p class="hint">Cada equipo queda fuera al perder dos veces. La gran final es un solo partido.</p>';
}
function accGate(){
  var lg=ACC!="crear";
  return'<div class="tabs"><button data-a="acc" data-v="login" class="'+(lg?"on":"")+'">Iniciar sesión</button><button data-a="acc" data-v="crear" class="'+(lg?"":"on")+'">Crear cuenta</button></div><div class="rs">'+(lg?
  '<b>Inicia sesión</b><p class="hint">Esta página usa tu cuenta de Claude para identificarte. Si ya tienes una:</p><ol class="steps"><li>Abre el enlace del torneo que te compartió el organizador.</li><li>Inicia sesión con tu cuenta de Claude cuando te lo pida.</li><li>Vuelve aquí y pulsa el botón de abajo.</li></ol>':
  '<b>Crea tu cuenta</b><p class="hint">Necesitas una cuenta de Claude (es gratis) y luego completar tu perfil en el torneo:</p><ol class="steps"><li>Crea tu cuenta en claude.ai.</li><li>Abre el enlace del torneo con esa cuenta.</li><li>Entra a Mi cuenta y elige si solo vas a ver o vas a jugar.</li></ol><p><a class="btn" href="https://claude.ai" target="_blank" rel="noopener">Ir a claude.ai</a></p>')+
  '<button class="pri" data-a="reload">Ya inicié sesión, recargar</button>'+(DB?"":'<p class="hint">Mientras tanto estás en modo local: tus datos se guardan solo en este dispositivo.</p>')+'</div>';
}
function vTV(){
  var lv=liveList(),h='<div class="row"><button data-a="go" data-s="inicio">Salir de pantalla grande</button></div>';
  if(lv.length)h+=lv.map(function(q){var x=q.x;return'<div class="sb tvb"><div class="st">🔴 En vivo, '+rl(q.t)+", "+esc(q.t.name||"Torneo")+'</div><div class="sbr"><span>'+esc(q.m.a)+'</span><b>'+x.sa+'</b></div><div class="sbr"><span>'+esc(q.m.b)+'</span><b>'+x.sb+'</b></div></div>'}).join("");
  var nx=[];
  S.list.forEach(function(t){allKeyed(t).forEach(function(k){var m=k[2];if(m.a&&m.b&&m.a!==BYE&&m.b!==BYE&&m.date&&!m.w&&!m.live&&!m.est&&!(m.bo>1))nx.push({m:m,t:t})})});
  nx.sort(function(x,y){return(x.m.date+(x.m.time||"99")).localeCompare(y.m.date+(y.m.time||"99"))});
  h+='<h2>Próximos partidos</h2>'+(nx.length?'<div class="rs">'+nx.slice(0,8).map(function(x){var m=x.m;return'<div class="pl"><b class="nu">'+esc(m.time||"--:--")+'</b><span class="pn">'+esc(m.a)+' vs '+esc(m.b)+'</span><span>'+new Date(m.date+"T00:00").toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})+(m.court?", "+esc(m.court):"")+'</span></div>'}).join("")+'</div>':'<p class="empty">No hay partidos programados. Se pueden programar en la pestaña Fechas.</p>');
  return h;
}
function viewC(t){return(isOrg()&&G(t)?schedForm(t):"")+viewC0(t)}
function ptsHtml(t){return'<div class="pa"><label class="fl">Puntos por victoria<input type="number" min="0" max="9" data-a="tpw" value="'+(t.pw!=null?t.pw:3)+'"></label><label class="fl">Puntos por empate<input type="number" min="0" max="9" data-a="tpd" value="'+(t.pd!=null?t.pd:1)+'"></label></div><p class="hint">'+(t.sport=="vol"?"En voleibol, ganar por 1 set da 2 puntos y perder por 1 set da 1.":"Cambian cómo se calcula la tabla de posiciones.")+'</p>'}
function hallHtml(){
  var w=S.list.map(function(t){return[t,champ(t)]}).filter(function(x){return x[1]}).sort(function(a,b){return b[0].id-a[0].id});
  if(!w.length)return"";
  return'<h2>Salón de la fama</h2><div class="rs">'+w.map(function(x){var t=x[0];return'<div class="pl"><span class="pn">🏆 '+esc(x[1])+'</span><span>'+sp(t).i+" "+esc(t.name||"Torneo")+" ("+rl(t)+"), "+new Date(t.id).getFullYear()+'</span></div>'}).join("")+'</div>';
}
function rankHtml(){
  var rk=predRank();if(!rk.length)return"";
  return'<h2>Ranking de predicciones</h2><div class="rs">'+rk.map(function(x,i){return'<div class="pl">'+av(x.u,x.name)+'<span class="pn">'+(i+1)+". "+esc(x.name||"Anónimo")+'</span><span>'+x.ok+" de "+x.n+'</span></div>'}).join("")+'</div>';
}
function regHtml(k,t){
  var h='<div class="rs"><b>Reglas base de '+SPN[k]+'</b><ul class="rl">'+(REG[k]||[]).map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul><p class="hint">Son las reglas que usa la página para anotar y calcular. Si tu escuela juega distinto, escríbelo en el reglamento de la edición.</p></div>';
  if(t&&(t.type=="liga"||t.type=="grupos")){var tl=tbList(t);h+='<div class="rs"><b>Cómo se ordena la tabla</b><p class="hint">Puntos: victoria '+(t.pw!=null?t.pw:3)+', empate '+(t.pd!=null?t.pd:1)+'. '+(tl.length?"Si hay igualdad en puntos: "+tl.map(tbName).join(", luego ")+". ":"")+'Si sigue igual, se mantiene el orden de inscripción.</p></div>'}
  if(t&&t.rules)h+='<div class="rs"><b>Reglamento de la edición</b><p>'+esc(t.rules).replace(/\n/g,"<br>")+'</p></div>';
  return h;
}
function equiposView(t){
  if(!t.teams.length)return'<p class="empty">Esta edición aún no tiene equipos. Se agregan en Ajustes.</p>';
  if(pub())return'<div class="rs">'+t.teams.map(function(n){return'<div class="pl"><span class="pn">'+crest(t,n)+esc(n)+'</span></div>'}).join("")+'</div><p class="hint">Las plantillas de jugadores son visibles solo para jugadores, entrenadores y organizadores.</p>';
  if(OT==null&&myRole()=="entrenador"&&ROLES[UID]&&t.teams.indexOf(ROLES[UID].team)>=0)OT=ROLES[UID].team;
  var h=viewE(t);
  return canRoster(OT)?h:h+'<p class="hint">Solo el organizador o el entrenador de este equipo pueden editarlo.</p>';
}
function vTorneo(t){
  var g=G(t),pb=pub(),tabs=[];
  if(g){tabs.push(["p",t.type=="dele"?"Cuadro":"Partidos"]);if(t.type=="liga"||t.type=="grupos")tabs.push(["t","Tabla"])}
  tabs.push(["e","Equipos"]);
  if(g)tabs.push(["c","Fechas"]);
  if(g&&!pb)tabs.push(["s","Stats"]);
  tabs.push(["h","Historial"],["r","Reglas"]);
  if(isOrg())tabs.push(["l","Cambios"],["a","Ajustes"]);
  if(!tabs.some(function(x){return x[0]==V}))V=tabs[0][0];
  var c=champ(t),h=edBanner(t)+(c?'<div class="champ">Campeón<b>'+esc(c)+'</b></div>':"");
  if(c)h+=summary(t,c);
  h+=inscHtml(t)+(g?"":'<p class="hint">Esta edición aún no tiene partidos generados.</p>');
  h+='<nav class="tabs">'+tabs.map(function(x){return'<button data-a="tab" data-v="'+x[0]+'" class="'+(V==x[0]?"on":"")+'">'+x[1]+'</button>'}).join("")+'</nav>';
  if(V=="p"&&!canScore())h+='<p class="hint">Solo lectura: los marcadores los anotan el organizador y los árbitros.</p>';
  var body=V=="p"?filtHtml(t)+(FILT.est||FILT.team?listFiltered(t):pv(t)):V=="t"?viewT(t):V=="e"?equiposView(t):V=="c"?viewC(t):V=="s"?vStats(t):V=="h"?histHtml(t.sport||"gen"):V=="r"?regHtml(t.sport||"gen",t):V=="l"?logHtml(t.id):vAjustes(t)+inscPend(t);
  return h+body+(g&&(V=="p"||V=="t")?shareBar(t):"");
}
function ramaBar(){return'<nav class="tabs">'+["f","m"].map(function(q){return'<button data-a="rama" data-v="'+q+'" class="'+(RAMA==q?"on":"")+'">'+(q=="f"?"♀ Femenino":"♂ Masculino")+'</button>'}).join("")+'</nav>'}
function legacyBar(){
  var L=isOrg()?seasons(SPORT).filter(function(t){return !t.rama}):[];
  if(!L.length)return"";
  return'<div class="rs"><b>Ediciones sin rama</b><p class="hint">Se crearon antes de separar femenino y masculino. Asigna la rama de cada una para que aparezcan.</p>'+L.map(function(t){return'<div class="pl"><span class="pn">'+esc(t.name||"Edición")+'</span><button data-a="setrama" data-id="'+t.id+'" data-v="f">Femenino</button><button data-a="setrama" data-id="'+t.id+'" data-v="m">Masculino</button></div>'}).join("")+'</div>';
}
function vDep(t){
  var org=isOrg(),ss=seasons(SPORT,RAMA),bar=ramaBar()+legacyBar();
  if(!t)return bar+'<div class="rs"><b>'+SPI[SPORT]+" "+SPN[SPORT]+" "+RN[RAMA]+'</b><p class="hint">Todavía no hay ninguna edición en esta rama.</p>'+(org?'<button class="pri" data-a="newseason">Crear la primera edición</button>':"")+'</div>'+regHtml(SPORT,null);
  return bar+'<div class="row"><select data-a="seas" aria-label="Edición">'+ss.map(function(x){return'<option value="'+x.id+'"'+(x.id===t.id?" selected":"")+'>'+esc(x.name||"Edición")+(x.arch?" (archivada)":"")+'</option>'}).join("")+'</select>'+(org?'<button class="pri" data-a="newseason">Nueva edición</button>':"")+'</div>'+vTorneo(t);
}
function lock(){
  var q=null;
  if(SC=="dep"&&V=="e"){if(!canRoster(OT))q="#app [data-a]:not([data-a=ot]):not([data-a=seas]):not([data-a=tab]):not([data-a=newseason]):not([data-a=rama]):not([data-a=setrama])"}
  else if(SC=="dep"&&!canScore())q="[data-a=sc],[data-a=dt],[data-a=win],[data-a=gs],[data-a=addg]";
  if(q)document.querySelectorAll(q).forEach(function(e){e.disabled=true});
}
function tbHtml(t){
  var c=(t.tb&&t.tb.length?t.tb:["dif","fav"]).slice();while(c.length<3)c.push("");
  return'<label>Desempates (en este orden, si hay igualdad de puntos)</label><div class="pa">'+[0,1,2].map(function(j){return'<select data-a="ttb" data-j="'+j+'" aria-label="Desempate '+(j+1)+'">'+TBO.map(function(o){return'<option value="'+o[0]+'"'+(c[j]===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select>'}).join("")+'</div>';
}
function card(t,m,r,i){
  var h=card0(t,m,r,i);
  if(!(m.a&&m.b&&m.a!==BYE&&m.b!==BYE))return h;
  var e=estOf(t,m),inf=EST[e];
  if(e=="aplazado"||e=="cancelado"){
    h=h.replace(/data-a="sc"/g,'data-a="sc" disabled').replace(/data-a="live"/g,'data-a="live" disabled').replace(/data-a="addg"/g,'data-a="addg" disabled');
    if(e=="aplazado")h=h.replace(/data-a="win"/g,'data-a="win" disabled');
  }
  var sel="";
  if(canScore()&&(e=="programado"||e=="aplazado"||e=="cancelado"))sel='<select class="es" data-a="est" data-r="'+r+'" data-i="'+i+'" aria-label="Estado del partido"><option value="">Programado</option><option value="aplazado"'+(e=="aplazado"?" selected":"")+'>Aplazado</option><option value="cancelado"'+(e=="cancelado"?" selected":"")+'>Cancelado</option></select>';
  return h.replace('<div class="match">','<div class="match"><div class="est e-'+e.replace(" ","-")+'"><span>'+inf[0]+" "+inf[1]+(e=="programado"&&m.date?", "+esc(m.date.slice(5))+(m.time?" "+esc(m.time):""):"")+'</span>'+sel+'</div>');
}
function filtHtml(t){
  var es=[["","Todos los estados"],["programado","Programados"],["en curso","En curso"],["finalizado","Finalizados"],["aplazado","Aplazados"],["cancelado","Cancelados"]];
  return'<div class="pa"><select data-a="fest" aria-label="Filtrar por estado">'+es.map(function(o){return'<option value="'+o[0]+'"'+(FILT.est===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select><select data-a="fteam" aria-label="Filtrar por equipo"><option value="">Todos los equipos</option>'+t.teams.map(function(n){return'<option value="'+esc(n)+'"'+(FILT.team===n?" selected":"")+'>'+esc(n)+'</option>'}).join("")+'</select></div>';
}
function listFiltered(t){
  var L=allKeyed(t).filter(function(k){var m=k[2];return m.a&&m.b&&m.a!==BYE&&m.b!==BYE&&(!FILT.est||estOf(t,m)==FILT.est)&&(!FILT.team||m.a===FILT.team||m.b===FILT.team)});
  return L.length?'<div class="grid">'+L.map(function(k){return card(t,k[2],k[0],k[1])}).join("")+'</div>':'<p class="empty">Ningún partido coincide con el filtro.</p>';
}
function histHtml(k){
  var ss=seasons(k,RAMA);
  if(!ss.length)return'<p class="empty">Aún no hay ediciones en la rama '+RN[RAMA]+'.</p>';
  var pm=palmares(k),h="";
  if(pm.length)h+='<h2>Palmarés</h2><div class="rs">'+pm.map(function(x){return'<div class="pl"><span class="pn">🏆 '+esc(x[0])+'</span><span>'+x[1]+(x[1]==1?" título":" títulos")+'</span></div>'}).join("")+'</div>';
  return h+'<h2>Ediciones</h2>'+ss.map(function(t){
    var i=seasonInfo(t);
    return'<div class="rs"><div class="pl"><span class="pn">'+esc(t.name||"Edición")+(t.arch?" <small>archivada</small>":"")+'<br><span class="hint">'+new Date(t.id).getFullYear()+", "+fmtN(t)+", "+t.teams.length+' equipos</span></span><button data-a="seasopen" data-id="'+t.id+'">Ver</button></div><p class="hint">'+
    (i.c?"🏆 Campeón: "+esc(i.c)+(i.ru?". Subcampeón: "+esc(i.ru):"")+(i.third?". Tercer lugar: "+esc(i.third):"")+". ":(G(t)?prog(t)+". ":"Sin partidos generados. "))+
    "Partidos finalizados: "+i.n+". Total de "+sp(t).u.toLowerCase()+": "+i.tot+"."+(i.top?" Máximo anotador: "+esc(i.top.p)+" ("+esc(i.top.team)+", "+i.top.sc+").":"")+'</p></div>';
  }).join("");
}
function homeMatches(){
  var o=[];
  S.list.forEach(function(t){
    if(t.arch)return;
    allKeyed(t).forEach(function(k){var m=k[2];if(m.a&&m.b&&m.a!==BYE&&m.b!==BYE)o.push({t:t,m:m,e:estOf(t,m)})});
  });
  return o;
}
function vCuenta(){
  var me=myRole();
  if(!UID)return accGate();
  var h='<div class="rs"><b>Sesión iniciada'+(NAME?' como '+esc(NAME):"")+'</b><p class="hint">Rol actual: '+roleName()+'.'+(REQ_LOGIN?' Colegio: <b>'+esc(colegioNombre())+'</b>.':' Para cerrar sesión, sal de tu cuenta de Claude.')+'</p>'+(REQ_LOGIN?'<button data-ac="salir">Cerrar sesión</button>':'')+'</div>';
  h+=(canAdmin()?'<div class="rs"><b>Administración</b><p class="hint">Gestiona ediciones, partidos, personas, noticias y respaldos.</p><button class="pri" data-a="go" data-s="admin">Abrir panel de administración</button></div>':"")+alertCard()+perfCard()+(REQ_LOGIN&&isOrg()?vMiembros():"");if(!DB||me=="organizador"||REQ_LOGIN)return h;
  var q=MYREQ||{},tn=allTeams();
  return h+'<h2>Crear mi perfil en el torneo</h2><div class="rs"><p class="hint">Cuéntanos quién eres y qué rol quieres. El organizador revisará tu solicitud.</p>'+
  (MYREQ?'<p class="hint">Ya enviaste una solicitud (pendiente). Puedes actualizarla.</p>':"")+
  '<label for="cn">Nombre para mostrar</label><div class="row"><input type="text" id="cn" maxlength="40" value="'+esc(q.name||NAME||"")+'"></div>'+
  '<label for="cc">Curso o grupo</label><div class="row"><input type="text" id="cc" maxlength="30" placeholder="Ej. 3.º B" value="'+esc(q.curso||"")+'"></div>'+
  '<label for="cq">¿Solo vas a ver o vas a jugar?</label><div class="row"><select id="cq" data-a="cq">'+[["espectador","Solo voy a ver"],["jugador","Voy a jugar"],["entrenador","Quiero ser manager de equipo"],["capitan","Quiero ser capitán de mi equipo"],["arbitro","Quiero ser árbitro"],["anotador","Quiero ser anotador"],["organizador","Quiero ser coordinador deportivo"]].map(function(x){return'<option value="'+x[0]+'"'+((q.quiere||"espectador")==x[0]?" selected":"")+'>'+x[1]+'</option>'}).join("")+'</select></div>'+
  '<div id="tw"'+(wantsTeam(q.quiere)?"":" hidden")+'><label for="ct">Tu equipo</label><div class="row"><input type="text" id="ct" list="tl2" maxlength="40" placeholder="Elige de la lista" value="'+esc(q.team||"")+'"></div><datalist id="tl2">'+tn.map(function(n){return'<option value="'+esc(n)+'">'}).join("")+'</datalist></div>'+
  '<button class="pri" data-a="sol">Enviar solicitud</button></div>';
}
function fillNames(){
  if(!U||(SC!="roles"&&!(SC=="admin"&&AV=="g")))return;var ids=Object.keys(ROLES);if(!ids.length)return;
  U.profiles(ids).then(function(ps){document.querySelectorAll("[data-pid]").forEach(function(e){var p=ps[e.dataset.pid];e.textContent=(p&&p.name)||"Persona"})}).catch(function(){});
}
function viewE(t,solo){DISC=discipline(t);
  if(t.teams.indexOf(OT)<0)OT=t.teams[0];
  var R=RO(t,OT),X=sp(t),ms=MSG;MSG="";
  var st=R.pl.filter(function(p){return p.st}),bn=R.pl.filter(function(p){return !p.st});
  function row(p){var i=R.pl.indexOf(p);
    return'<div class="pl"><b class="nu">'+esc(p.num||"-")+'</b><span class="pn">'+esc(p.n)+(p.cap?' <small>Capitán</small>':"")+badge(OT,p.n)+'</span><input class="pp" list="posl" placeholder="Posición" aria-label="Posición de '+esc(p.n)+'" data-a="pp" data-i="'+i+'" value="'+esc(p.pos||"")+'"><button data-a="cap" data-i="'+i+'" class="'+(p.cap?"cp":"")+'" title="Capitán">C</button><button data-a="st" data-i="'+i+'">'+(p.st?"A banca":"A titular")+'</button><button data-a="rp" data-i="'+i+'" aria-label="Quitar a '+esc(p.n)+'">×</button></div>';
  }
  return(solo?"":'<div class="tp">'+t.teams.map(function(n,i){return'<button data-a="ot" data-i="'+i+'" class="'+(n===OT?"on":"")+'">'+crest(t,n)+esc(n)+'</button>'}).join("")+'</div>')+
  '<div class="rs"><label for="coach">Entrenador</label><div class="row"><input type="text" id="coach" data-a="coach" placeholder="Nombre del entrenador" maxlength="40" value="'+esc(R.coach||"")+'"></div>'+logoHtml(t)+
  '<label for="pnm">Agregar jugador</label><div class="pa"><input type="text" id="pnu" inputmode="numeric" placeholder="N.º" maxlength="3"><input type="text" id="pnm" placeholder="Nombre" maxlength="40"><input list="posl" id="ppo" placeholder="Posición" maxlength="30"><button class="pri" data-a="ap">Agregar</button></div>'+
  '<p class="hint">Puedes escribir cualquier posición o elegir una sugerida.</p></div>'+
  '<datalist id="posl">'+X.pos.map(function(x){return'<option value="'+x+'">'}).join("")+'</datalist>'+
  '<div class="rs">'+(ms?'<p class="hint">'+esc(ms)+'</p>':"")+'<h2>Titulares ('+st.length+(X.max?" de "+X.max:"")+')</h2>'+(st.length?st.map(row).join(""):'<p class="empty">Aún no hay titulares. Usa "A titular" en un jugador.</p>')+
  '<h2>Banca ('+bn.length+')</h2>'+(bn.length?bn.map(row).join(""):'<p class="empty">Sin jugadores en la banca.</p>')+'</div>';
}
function render(){
  var app=$("app");
  if(REQ_LOGIN&&AUTH!=="ok"){gateRender();return}
  if(!BOOT){app.innerHTML='<p class="empty">Cargando…</p>';return}
  var t=cur();
  if(SC=="dep"&&(!t||(t.sport||"gen")!==SPORT||t.rama!==RAMA)){t=pickSeason(SPORT);S.cur=t?t.id:null}
  var lm0=SC=="vivo"&&t?gpar(t):null,ttl="",sub="";
  var T={inicio:["Inicio","Resultados, calendarios y clasificaciones."],torneos:["Torneos","Todos los torneos por deporte y rama."],deportes:["Deportes","Baseball5, Basket 3x3 y Voleibol."],calendario:["Calendario","Partidos por fecha, deporte, torneo y equipo."],resultados:["Resultados","Marcadores oficiales."],clasif:["Clasificaciones","Posiciones calculadas con los resultados oficiales."],equipos:["Equipos","Escudos, resultados y estadísticas."],noticias:["Noticias y anuncios","Comunicados oficiales."],liga:["Información de la liga","Cómo funciona la liga."],cuenta:[UID?"Mi cuenta":"Acceso","Tu sesión y tu perfil."],tv:["Pantalla grande",""],roles:["Personas y roles",""]};
  if(SC=="dep"){ttl=SPI[SPORT]+" "+SPN[SPORT]+" "+RN[RAMA];sub=t?(t.name||"Edición")+", "+fmtN(t):"Sin ediciones todavía"}
  else if(SC=="vivo"){ttl=lm0?lm0.a+" vs "+lm0.b:"En vivo";sub=t?capi(rl(t))+", "+(t.name||"Edición"):""}
  else if(SC=="equipo"){ttl=TEAM?TEAM.n:"Equipo";sub="Ficha del equipo"}
  else if(SC=="miequipo"){ttl="Mi equipo";sub=myTeam()?myModeName()+", "+myTeam():"Sin equipo asignado"}
  else if(SC=="admin"){var as=ADMS.filter(function(x){return x[0]==AV})[0];ttl=as?as[2]:"Administración";sub="Panel de administración"}
  else{ttl=(T[SC]||["Inicio",""])[0];sub=(T[SC]||["",""])[1]}
  $("title").textContent=ttl;$("sub").textContent=sub;document.title=ttl+" - "+(CFG.nombre||"Liga escolar");
  $("lname").textContent=CFG.nombre||"Liga escolar";
  $("rb").innerHTML=UID?'<span class="av">'+esc((NAME||"?").trim().slice(0,1).toUpperCase())+'</span><span class="mtx"><b>'+esc(NAME||"Mi cuenta")+'</b><span class="ms">'+esc(roleName())+(DB?"":" (local)")+'</span></span>':'<span class="mic">'+ic("key")+'</span><span class="mtx"><b>Iniciar sesión</b><span class="ms">Entrar o crear cuenta</span></span>';
  $("menu").innerHTML=menuHtml();
  $("cta").innerHTML=ctaHtml();$("topr").innerHTML=toprHtml();$("lsub").textContent=SC=="admin"?"Panel de administración":"Liga deportiva escolar";
  document.body.classList.toggle("coll",COLL);
  document.body.classList.toggle("admin",SC=="admin");
  document.body.classList.toggle("tv",SC=="tv");
  document.body.classList.toggle("menu-open",MENU);
  var h;
  if(SC=="inicio")h=vInicio();
  else if(SC=="torneos")h=vTorneos();
  else if(SC=="deportes")h=vDeportes();
  else if(SC=="calendario")h=vCalendario();
  else if(SC=="resultados")h=vResultados();
  else if(SC=="clasif")h=vClasif();
  else if(SC=="equipos")h=vEquipos();
  else if(SC=="equipo")h=vEquipo();
  else if(SC=="miequipo")h=vMiEquipo();
  else if(SC=="noticias")h=vNoticias();
  else if(SC=="liga")h=vLiga();
  else if(SC=="roles")h=viewR();
  else if(SC=="cuenta")h=vCuenta();
  else if(SC=="admin")h=vAdmin();
  else if(SC=="tv")h=vTV();
  else if(SC=="dep")h=vDep(t);
  else if(!t)h='<p class="empty">Primero elige un deporte.</p>';
  else h=vVivo(t);
  app.innerHTML=h;lock();fillNames();
}
function viewT(t){return t.type=="grupos"?(t.gr||[]).map(function(g,i){return viewT0({teams:g.teams,matches:g.matches,sport:t.sport,type:"liga",pw:t.pw,pd:t.pd,tb:t.tb,id:t.id},g.n,i)}).join(""):viewT0(t,"Clasificación",0)}
function viewT0(t,ti,ci){
  var rows=table(t).map(function(x,i){return'<tr'+(i==0?' class="top"':"")+'><td><span class="rk">'+("0"+(i+1)).slice(-2)+'</span></td><td>'+crest(t,x.n)+esc(x.n)+'</td><td>'+x.pj+'</td><td>'+x.g+'</td><td>'+x.e+'</td><td>'+x.p+'</td><td>'+x.gf+'</td><td>'+x.gc+'</td><td>'+(x.gf-x.gc)+'</td><td><b>'+x.pt+'</b></td></tr>'}).join("");
  return'<div class="tw stb g'+((ci||0)%4)+'"><table><tr class="hc"><th colspan="2">'+esc(ti||"Clasificación")+'</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>AF</th><th>EC</th><th>Dif</th><th>Pts</th></tr>'+rows+'</table></div><p class="hint">AF = a favor, EC = en contra, Dif = diferencia.</p>';
}
function edBanner(t){
  var e=edEstado(t);
  return'<div class="hero2"><div><span class="tag '+e[1]+'">'+e[0]+'</span><h2>'+esc(t.name||"Edición")+'</h2><p>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport]||"")+" "+esc(rl(t))+", "+fmtN(t)+'</p></div><div class="hs"><span><b>'+t.teams.length+'</b>equipos</span><span><b>'+ms(t).filter(function(m){return m.a&&m.b&&m.a!==BYE&&m.b!==BYE}).length+'</b>partidos</span></div></div>';
}
