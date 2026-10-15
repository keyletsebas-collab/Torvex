// Panel de administración (organizadores y árbitros)
var AV="r";
function canAdmin(){var r=myRole();return r=="organizador"||r=="arbitro"||r=="anotador"}
function todayISO(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
function admData(){
  var all=[];
  S.list.forEach(function(t){allKeyed(t).forEach(function(k){var m=k[2];if(m.a&&m.b&&m.a!==BYE&&m.b!==BYE)all.push({t:t,r:k[0],i:k[1],m:m,e:estOf(t,m)})})});
  return all;
}
function makeSeason(){
  var ss0=seasons(SPORT,RAMA),prev=ss0[0],ns=mk();
  ns.sport=SPORT;ns.rama=RAMA;ns.name="Edición "+(ss0.length+1);
  if(prev){
    ["type","bo","boF","dbl","ng","third","pw","pd","tb","maxp","cupo","rules"].forEach(function(k){if(prev[k]!=null)ns[k]=prev[k]});
    if(confirm("¿Copiar los equipos y plantillas de la edición anterior?")){ns.teams=prev.teams.slice();ns.ro=JSON.parse(JSON.stringify(prev.ro||{}))}
  }
  S.list.push(ns);S.cur=ns.id;V="a";logAct(ns,"Edición creada",ns.name);
  return ns;
}
function admPartidos(){
  var all=admData().filter(function(x){return !x.t.arch}),hoy=todayISO();
  function info(t,m){return esc(rl(t)+", "+(t.name||"Edición"))+(m.date?", "+esc(m.date)+(m.time?" "+esc(m.time):""):"")+(m.court?", "+esc(m.court):"")}
  function row(x){return'<div class="pl"><span class="pn">'+(SPI[x.t.sport]||"")+" "+esc(x.m.a)+" vs "+esc(x.m.b)+'<br><span class="hint">'+info(x.t,x.m)+'</span></span><button data-a="seasgo" data-id="'+x.t.id+'" data-v="p">Abrir</button></div>'}
  function sec(title,L,f){return'<h2>'+title+' ('+L.length+')</h2>'+(L.length?'<div class="rs">'+L.slice(0,30).map(f||row).join("")+'</div>':'<div class="rs"><p class="empty">Ninguno.</p></div>')}
  var live=liveList().filter(function(q){return !q.t.arch});
  return sec("En vivo ahora",live,function(q){return'<div class="pl"><span class="pn">🔴 '+(SPI[q.t.sport]||"")+" "+esc(q.m.a)+" "+q.x.sa+" - "+q.x.sb+" "+esc(q.m.b)+'<br><span class="hint">'+esc(q.t.name||"Edición")+'</span></span><button class="pri" data-a="admlive" data-id="'+q.t.id+'" data-r="'+q.r+'" data-i="'+q.i+'" data-g="'+(q.g==null?"":q.g)+'">Abrir marcador</button></div>'})+
    sec("Hoy",all.filter(function(x){return x.m.date===hoy&&x.e=="programado"}))+
    sec("Sin fecha",all.filter(function(x){return x.e=="programado"&&!x.m.date}))+
    sec("Aplazados",all.filter(function(x){return x.e=="aplazado"}));
}
function admEdiciones(){
  var h='<div class="ctl"><span class="tn">Nueva edición</span>'+["beis","bas3","vol"].map(function(k){return["f","m"].map(function(q){return'<button class="pri" data-a="admnew" data-sp="'+k+'" data-ra="'+q+'">'+SPI[k]+(q=="f"?" ♀":" ♂")+'</button>'}).join("")}).join("")+'</div>';
  var ss=S.list.slice().sort(function(a,b){return b.id-a.id});
  var viejas=ss.filter(function(t){return /^Temporada \d+$/.test(t.name||"")});
  if(viejas.length)h+='<div class="rs"><b>Nombres anteriores</b><p class="hint">'+viejas.length+' edición(es) todavía se llaman «Temporada N». Puedes cambiarlas a «Edición N». Los nombres personalizados no se tocan.</p><button class="pri" data-a="admren">Renombrar a «Edición N»</button></div>';
  if(!ss.length)return h+'<p class="empty">Aún no hay ediciones.</p>';
  return h+'<div class="tw"><table class="t3"><tr><th>Dep.</th><th>Rama</th><th>Edición</th><th>Formato</th><th>Equipos</th><th>Estado</th><th></th></tr>'+ss.map(function(t){
    var c=champ(t);
    return'<tr><td>'+(SPI[t.sport]||"")+'</td><td>'+(t.rama=="f"?"♀":t.rama=="m"?"♂":"?")+'</td><td>'+esc(t.name||"Edición")+'</td><td>'+fmtN(t)+'</td><td>'+t.teams.length+'</td><td>'+(t.arch?"Archivada":c?"🏆 "+esc(c):G(t)?prog(t):"Sin generar")+'</td><td><button data-a="seasgo" data-id="'+t.id+'" data-v="a">Abrir</button> <button data-a="admarch" data-id="'+t.id+'">'+(t.arch?"Restaurar":"Archivar")+'</button></td></tr>';
  }).join("")+'</table></div>';
}
function admInsc(){
  var ks=Object.keys(INSC);
  return'<h2>Inscripciones pendientes</h2><div class="rs">'+(ks.length?ks.map(function(u){
    var q=INSC[u],t=S.list.filter(function(x){return x.id===q.tid})[0];
    return'<div class="pl">'+av(u,q.name)+'<span class="pn">'+esc(q.team)+' <small>'+esc(q.name||"")+'</small><br><span class="hint">'+esc(t?(SPN[t.sport]||"")+", "+(t.name||"Edición"):"Edición eliminada")+'</span></span><button class="pri" data-a="iapr" data-id="'+esc(u)+'">Aprobar</button><button data-a="irej" data-id="'+esc(u)+'">Rechazar</button></div>';
  }).join(""):'<p class="empty">No hay solicitudes.</p>')+'</div>';
}
function annItem(a,org){
  var dr=a.st=="borrador";
  return'<div class="rs ann"><p>'+(dr?'<small class="sus">Borrador</small> ':"")+esc(a.txt)+'</p><small class="hint">'+new Date(a.ts).toLocaleString("es",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+(a.by?" - "+esc(a.by):"")+'</small>'+(org?(dr?' <button class="pri" data-a="apubl" data-id="'+esc(a.id)+'">Publicar</button>':"")+' <button data-a="adel" data-id="'+esc(a.id)+'" aria-label="Borrar anuncio">×</button>':"")+'</div>';
}
function annForm(){return'<div class="row"><input type="text" id="antxt" maxlength="200" placeholder="Ej. Se pospone el partido por lluvia"></div><div class="ctl"><button class="pri" data-a="apub">Publicar</button><button data-a="adraft">Guardar borrador</button></div>'}
function annHtml(){
  if(!DB)return"";
  var org=isOrg(),L=ANU.filter(function(a){return org||a.st!="borrador"});
  if(!L.length&&!org)return"";
  return'<h2>Noticias y anuncios</h2>'+(org?annForm():"")+L.slice(0,6).map(function(a){return annItem(a,org)}).join("");
}
function admNoticias(){
  if(!DB)return'<p class="empty">Las noticias necesitan la base de datos compartida.</p>';
  return annForm()+(ANU.length?ANU.map(function(a){return annItem(a,true)}).join(""):'<p class="empty">Todavía no hay noticias.</p>');
}
function backup(){
  var data={app:"torneos-escolares",version:1,fecha:new Date().toISOString(),temporadas:S.list,anuncios:ANU,roles:ROLES,escudos:ESC};
  saveBlob("respaldo-torneos-"+todayISO()+".json",new Blob([JSON.stringify(data)],{type:"application/json"}));
}
function restore(inp){
  var f=inp.files&&inp.files[0];if(!f||!isOrg())return;
  if(f.size>5000000){toast("El archivo es demasiado grande.");return}
  var fr=new FileReader();
  fr.onload=function(){
    var d;try{d=JSON.parse(fr.result)}catch(e){toast("El archivo no es un respaldo válido.");return}
    var L=(d&&d.app=="torneos-escolares"&&Array.isArray(d.temporadas))?d.temporadas.filter(function(t){return t&&Array.isArray(t.teams)&&SPN[t.sport]&&t.type}):[];
    if(!L.length){toast("El respaldo no contiene ediciones válidas.");return}
    if(!confirm("Se agregarán "+L.length+" edición(es) como copias nuevas. No se borra ni se cambia nada de lo actual. ¿Continuar?"))return;
    L.forEach(function(t){var c=JSON.parse(JSON.stringify(t));c.id=nid();c.name=(c.name||"Edición")+" (restaurada)";S.list.push(c);if(DB)put(c);logAct(c,"Edición restaurada desde respaldo",c.name)});
    if(!DB){S.cur=S.list[S.list.length-1].id;save()}
    toast(L.length+" edición(es) restauradas");render();
  };
  fr.readAsText(f);
}
function admRespaldo(){
  return'<div class="rs"><b>Respaldo de datos</b><p class="hint">Descarga una copia de todas las ediciones, noticias, roles y escudos. Hazlo al terminar cada edición y antes de cambios grandes.</p><button class="pri" data-a="bkp">Descargar respaldo (JSON)</button></div>'+
  '<div class="rs"><b>Restaurar desde un respaldo</b><p class="hint">Agrega las ediciones del archivo como copias nuevas. No borra ni modifica lo que ya existe. Esta versión restaura ediciones; las noticias, roles y escudos quedan guardados en el archivo pero no se restauran solos.</p><input type="file" accept="application/json,.json" data-a="bkpin"></div>'+
  '<div class="rs"><b>Seguridad</b><p class="hint">Quien tenga permiso de colaborador en la página puede escribir datos. Los roles se aplican en la pantalla, no en el servidor. Comparte el permiso de editor solo con personas de confianza.</p></div>';
}
function vAdmin(){
  if(!canAdmin())return'<p class="empty">Este panel es solo para personal autorizado.</p>';
  if(!admOk(AV))AV="r";
  var f={r:admResumen,t:admEdiciones,d:admDeportes,q:admEquipos,p:admPartidos,m:admResultados,c:admClasif,n:admNoticias,u:admUsuarios,h:function(){return logHtml(null)},k:admConfig}[AV];
  return f();
}
function admUsuarios(){return viewR(true)+admInsc()}
function arow(x,btn){
  var sc=(x.e=="finalizado"||x.e=="en curso")&&x.m.sa!=null&&x.m.sb!=null;
  return'<div class="pl"><span class="pn">'+(SPI[x.t.sport]||"")+" "+esc(x.m.a)+(sc?" "+x.m.sa+" - "+x.m.sb+" ":" vs ")+esc(x.m.b)+'<br><span class="hint">'+esc(capi(rl(x.t))+", "+(x.t.name||"Edición"))+(x.m.date?", "+esc(x.m.date)+(x.m.time?" "+esc(x.m.time):""):"")+'</span></span>'+btn+'</div>';
}
function admResultados(){
  var all=admData().filter(function(x){return !x.t.arch}),hoy=todayISO();
  function sec(ti,L,f){return'<h2>'+ti+' ('+L.length+')</h2>'+(L.length?'<div class="rs">'+L.slice(0,25).map(f).join("")+'</div>':'<div class="rs"><p class="empty">Ninguno.</p></div>')}
  var live=liveList().filter(function(q){return !q.t.arch});
  var rec=all.filter(function(x){return x.e=="finalizado"}).sort(function(a,b){return((b.m.live&&b.m.live.ts0)||0)-((a.m.live&&a.m.live.ts0)||0)||b.t.id-a.t.id});
  return sec("En vivo ahora",live,function(q){return'<div class="pl"><span class="pn">🔴 '+(SPI[q.t.sport]||"")+" "+esc(q.m.a)+" "+q.x.sa+" - "+q.x.sb+" "+esc(q.m.b)+'<br><span class="hint">'+esc(capi(rl(q.t))+", "+(q.t.name||"Edición"))+'</span></span><button class="pri" data-a="admlive" data-id="'+q.t.id+'" data-r="'+q.r+'" data-i="'+q.i+'" data-g="'+(q.g==null?"":q.g)+'">Abrir marcador</button></div>'})+
    sec("Por anotar hoy",all.filter(function(x){return x.m.date===hoy&&x.e=="programado"}),function(x){return arow(x,'<button class="pri" data-a="admlive" data-id="'+x.t.id+'" data-r="'+x.r+'" data-i="'+x.i+'" data-g="">Anotar</button>')})+
    sec("Resultados recientes",rec,function(x){return arow(x,'<button data-a="edopen" data-id="'+x.t.id+'" data-v="p">Corregir</button>')})+
    '<p class="hint">Corregir un resultado oficial pide confirmación y queda en el historial.</p>';
}
function admClasif(){
  var L=eds().filter(function(t){return G(t)&&(t.type=="liga"||t.type=="grupos")});
  if(!L.length)return'<div class="rs"><p class="empty">Todavía no hay clasificaciones. Se calculan solas con los resultados oficiales.</p></div>';
  return L.map(function(t){
    var st=statsOf(t).filter(function(x){return x.sc>0}).sort(function(a,b){return b.sc-a.sc}).slice(0,5);
    return'<h2>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport])+" "+esc(capi(rl(t)))+", "+esc(t.name||"Edición")+'</h2>'+viewT(t)+(st.length?'<div class="rs"><b>Líderes de anotación</b>'+st.map(function(x,i){return'<div class="pl"><b class="nu">'+(i+1)+'</b><span class="pn">'+esc(x.p)+' <small>'+esc(x.team)+'</small></span><b>'+x.sc+'</b></div>'}).join("")+'</div>':"");
  }).join("");
}
function admDeportes(){
  return["beis","bas3","vol"].map(function(k){
    return'<div class="rs"><b>'+SPI[k]+" "+SPN[k]+'</b><p class="hint">'+seasons(k).length+' edición(es). Reglas base que usa la página para anotar y calcular:</p><ul class="rl">'+(REG[k]||[]).map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul><label for="rg_'+k+'">Reglamento de la liga para este deporte (se muestra en Deportes e Información de la liga)</label><div class="row"><textarea id="rg_'+k+'" rows="4" maxlength="1500">'+esc((CFG.reglas||{})[k]||"")+'</textarea></div></div>';
  }).join("")+(isOrg()?'<button class="pri" data-a="reglassave">Guardar reglamentos</button>':"")+'<p class="hint" style="margin-top:10px">El texto del reglamento no cambia los cálculos de la página: las reglas de puntuación se configuran en los Ajustes de cada edición.</p>';
}
function admEquipos(){
  var rows=[];
  eds().forEach(function(t){t.teams.forEach(function(n){
    var R=(t.ro||{})[n]||{pl:[]},pl=R.pl||[];
    rows.push('<tr><td>'+crest(t,n)+esc(n)+'</td><td>'+(SPI[t.sport]||"")+" "+esc(capi(rl(t)))+'</td><td>'+esc(t.name||"Edición")+'</td><td>'+pl.filter(function(p){return p.st}).length+" / "+pl.length+'</td><td>'+esc(R.coach||"-")+'</td><td><button data-a="edopen" data-id="'+t.id+'" data-v="e" data-n="'+esc(n)+'">Gestionar</button></td></tr>');
  })});
  return rows.length?'<div class="tw"><table class="t1"><tr><th>Equipo</th><th>Deporte</th><th>Edición</th><th>Titulares / total</th><th>Entrenador</th><th></th></tr>'+rows.join("")+'</table></div>':'<div class="rs"><p class="empty">Todavía no hay equipos. Se agregan en los Ajustes de cada edición.</p></div>';
}
function admConfig(){
  if(!isSuper())return'<div class="rs"><p class="empty">Solo el superadministrador puede cambiar la configuración.</p></div>';
  return'<div class="rs"><b>Datos de la liga</b><label for="cf_n" style="margin-top:10px">Nombre de la liga</label><div class="row"><input type="text" id="cf_n" maxlength="60" value="'+esc(CFG.nombre||"")+'"></div><label for="cf_d">Descripción</label><div class="row"><textarea id="cf_d" rows="3" maxlength="400">'+esc(CFG.desc||"")+'</textarea></div><label for="cf_c">Contacto</label><div class="row"><input type="text" id="cf_c" maxlength="120" value="'+esc(CFG.contacto||"")+'"></div><label for="cf_r">Reglamento general</label><div class="row"><textarea id="cf_r" rows="6" maxlength="3000">'+esc(CFG.reglamento||"")+'</textarea></div><button class="pri" data-a="cfgsave">Guardar configuración</button></div>'+admRespaldo();
}
function admResumen(){
  var all=admData().filter(function(x){return !x.t.arch}),hoy=todayISO(),org=isOrg();
  var n=function(f){return all.filter(f).length};
  var live=n(function(x){return x.e=="en curso"}),hoyN=n(function(x){return x.m.date===hoy&&x.e=="programado"}),
      sinf=n(function(x){return x.e=="programado"&&!x.m.date}),apl=n(function(x){return x.e=="aplazado"});
  var prox=all.filter(function(x){return(x.e=="programado"||x.e=="en curso")&&x.m.date&&x.m.date>=hoy}).sort(function(a,b){return(a.m.date+(a.m.time||"99")).localeCompare(b.m.date+(b.m.time||"99"))});
  var act=S.list.filter(function(t){return !t.arch}),eq=0;act.forEach(function(t){eq+=t.teams.length});
  var h='<div class="wel"><h2>Bienvenido, '+esc(NAME||"administrador")+'</h2><p class="hint">'+esc(CFG.nombre||"Liga escolar")+', panel de administración</p></div>';
  h+='<div class="kpis">'+(org?kpi("Ediciones activas",act.length,"En todas las ramas","trophy","t1",'data-a="atab" data-v="t"'):"")+kpi("En vivo",live,live?"Partidos en curso":"Sin partidos en vivo","bolt","t5",'data-a="atab" data-v="m"')+(org?kpi("Equipos",eq,"Inscritos","users","t3",'data-a="atab" data-v="q"'):"")+kpi("Próximos partidos",prox.length,"Programados","calendar","t4",'data-a="atab" data-v="p"')+'</div>';
  h+='<h2>Requiere atención</h2><div class="kpis">'+kpi("Hoy",hoyN,"Partidos de hoy","clock","t1",'data-a="atab" data-v="p"')+kpi("Sin fecha",sinf,"Por programar","calendar","t4",'data-a="atab" data-v="p"')+kpi("Aplazados",apl,"Esperan nueva fecha","bolt","t5",'data-a="atab" data-v="p"')+(org?kpi("Solicitudes de rol",Object.keys(SOL).length,"Por revisar","key","t2",'data-a="atab" data-v="u"')+kpi("Inscripciones",Object.keys(INSC).length,"Por aprobar","users","t3",'data-a="atab" data-v="u"')+kpi("Borradores",ANU.filter(function(a){return a.st=="borrador"}).length,"Noticias sin publicar","news","t4",'data-a="atab" data-v="n"'):"")+'</div>';
  var lead=eds().filter(function(t){return !t.arch&&G(t)&&(t.type=="liga"||t.type=="grupos")})[0],tb=[];
  if(lead)tb=(lead.type=="liga"?table(lead):table({teams:lead.gr[0].teams,matches:lead.gr[0].matches,sport:lead.sport,type:"liga",pw:lead.pw,pd:lead.pd,tb:lead.tb,id:lead.id})).slice(0,5);
  h+='<div class="two"><div><h2>Próximos eventos</h2><div class="rs">'+(prox.length?prox.slice(0,5).map(function(x){return'<div class="pl"><span class="pn">'+esc(x.m.a)+" vs "+esc(x.m.b)+'<br><span class="hint">'+esc(dayLbl(x.m.date))+(x.m.time?", "+esc(x.m.time):"")+", "+esc(SPN[x.t.sport]||"")+" "+esc(rl(x.t))+'</span></span><span class="tag '+(x.e=="en curso"?"live":"acc")+'">'+(x.e=="en curso"?"En vivo":"Partido")+'</span></div>'}).join(""):'<p class="empty">No hay partidos programados.</p>')+'</div></div>'+
    '<div><h2>Clasificación</h2><div class="rs">'+(tb.length?'<p class="hint">'+esc((SPN[lead.sport]||"")+" "+rl(lead)+", "+(lead.name||"Edición"))+'</p>'+tb.map(function(r,i){return'<div class="pl"><span class="rkc r'+(i+1)+'">'+(i+1)+'</span><span class="pn">'+esc(r.n)+'</span><span class="hint">'+r.g+"-"+r.e+"-"+r.p+", "+(r.pj?Math.round(r.g*100/r.pj):0)+'%</span></div>'}).join(""):'<p class="empty">Todavía no hay clasificaciones.</p>')+'</div></div></div>';
  function qa(attr,icon,tone,t,s){return'<button class="qa" '+attr+'><i class="chip '+tone+'">'+ic(icon)+'</i><span><b>'+t+'</b><small>'+s+'</small></span></button>'}
  h+='<h2>Acciones rápidas</h2><div class="qas">'+(org?qa('data-a="atab" data-v="t"',"plus","t1","Nueva edición","Crea un torneo nuevo")+qa('data-a="atab" data-v="p"',"calendar","t4","Programar partidos","Calendario y canchas")+qa('data-a="atab" data-v="n"',"news","t2","Publicar noticia","Avisos oficiales")+qa('data-a="bkp"',"download","t3","Descargar respaldo","Copia de los datos"):qa('data-a="atab" data-v="m"',"check","t2","Resultados y marcadores","Abrir marcadores")+qa('data-a="atab" data-v="p"',"calendar","t4","Calendarios y partidos","Ver programación"))+'</div>';
  h+='<h2>Avisos</h2>';
  var av=[];
  S.list.forEach(function(t){
    if(t.arch)return;
    var nm=esc((SPN[t.sport]||"")+", "+(t.name||"Edición"));
    if(!t.teams.length)av.push([t,nm+": no tiene equipos.","a"]);
    else if(!G(t))av.push([t,nm+": tiene "+t.teams.length+" equipos y aún no se generan los partidos.","a"]);
    else if(t.type=="grupos"&&!t.rounds.length&&t.gr.every(function(g){return g.matches.every(function(m){return m.est=="cancelado"||fin(t,m)})}))av.push([t,nm+": terminaron los grupos, falta generar las llaves.","p"]);
  });
  var sr0=S.list.filter(function(t){return !t.arch&&!t.rama}).length;if(sr0)av.push([null,sr0+" edición(es) no tienen rama (femenino o masculino).","t"]);
  if(sinf)av.push([null,sinf+" partido(s) listos para jugar no tienen fecha. Usa la pestaña Fechas de cada edición.","p"]);
  if(apl)av.push([null,apl+" partido(s) aplazados esperan nueva fecha.","p"]);
  h+=av.length?'<div class="rs">'+av.map(function(x){return'<div class="pl"><span class="pn">'+(x[0]?x[1]:esc(x[1]))+'</span>'+(x[0]?'<button data-a="seasgo" data-id="'+x[0].id+'" data-v="'+x[2]+'">Abrir</button>':"")+'</div>'}).join("")+'</div>':'<div class="rs"><p class="empty">Todo en orden.</p></div>';
  if(org&&DB&&LOGS.length)h+='<h2>Actividad reciente</h2><div class="rs">'+LOGS.slice(0,6).map(function(x){return'<div class="pl"><span class="pn">'+esc(x.a)+(x.d?": "+esc(x.d):"")+'<br><span class="hint">'+esc(x.by||"Alguien")+", "+ago(x.ts)+'</span></span></div>'}).join("")+'</div>';
  return h;
}
