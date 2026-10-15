// Panel de administración (organizadores y árbitros)
var AV="r";
function canAdmin(){return isOrg()||myRole()=="arbitro"}
function todayISO(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
function admData(){
  var all=[];
  S.list.forEach(function(t){allKeyed(t).forEach(function(k){var m=k[2];if(m.a&&m.b&&m.a!==BYE&&m.b!==BYE)all.push({t:t,r:k[0],i:k[1],m:m,e:estOf(t,m)})})});
  return all;
}
function makeSeason(){
  var ss0=seasons(SPORT),prev=ss0[0],ns=mk();
  ns.sport=SPORT;ns.name="Temporada "+(ss0.length+1);
  if(prev){
    ["type","bo","boF","dbl","ng","third","pw","pd","tb","maxp","cupo","rules"].forEach(function(k){if(prev[k]!=null)ns[k]=prev[k]});
    if(confirm("¿Copiar los equipos y plantillas de la temporada anterior?")){ns.teams=prev.teams.slice();ns.ro=JSON.parse(JSON.stringify(prev.ro||{}))}
  }
  S.list.push(ns);S.cur=ns.id;V="a";logAct(ns,"Temporada creada",ns.name);
  return ns;
}
function vAdmin(){
  if(!canAdmin())return'<p class="empty">Este panel es solo para organizadores y árbitros.</p>';
  var org=isOrg(),tabs=[["r","Resumen"],["p","Partidos"]];
  if(org)tabs.push(["t","Temporadas"],["g","Personas"],["n","Noticias"],["c","Cambios"],["b","Respaldo"]);
  if(!tabs.some(function(x){return x[0]==AV}))AV="r";
  return'<nav class="tabs">'+tabs.map(function(x){return'<button data-a="atab" data-v="'+x[0]+'" class="'+(AV==x[0]?"on":"")+'">'+x[1]+'</button>'}).join("")+'</nav>'+
    (AV=="r"?admResumen():AV=="p"?admPartidos():AV=="t"?admTemporadas():AV=="g"?viewR(true)+admInsc():AV=="n"?admNoticias():AV=="c"?logHtml(null):admRespaldo());
}
function admResumen(){
  var all=admData().filter(function(x){return !x.t.arch}),hoy=todayISO(),org=isOrg();
  var n=function(f){return all.filter(f).length};
  var live=n(function(x){return x.e=="en curso"}),hoyN=n(function(x){return x.m.date===hoy&&x.e=="programado"}),
      sinf=n(function(x){return x.e=="programado"&&!x.m.date}),apl=n(function(x){return x.e=="aplazado"});
  function box(v,l,tab){return'<button class="stat" data-a="atab" data-v="'+tab+'"><b>'+v+'</b><span>'+l+'</span></button>'}
  var h='<div class="grid">'+box(live,"En vivo","p")+box(hoyN,"Hoy","p")+box(sinf,"Sin fecha","p")+box(apl,"Aplazados","p");
  if(org)h+=box(S.list.filter(function(t){return !t.arch}).length,"Temporadas activas","t")+box(Object.keys(SOL).length,"Solicitudes de rol","g")+box(Object.keys(INSC).length,"Inscripciones","g")+box(ANU.filter(function(a){return a.st=="borrador"}).length,"Borradores","n");
  h+='</div><h2>Avisos</h2>';
  var av=[];
  S.list.forEach(function(t){
    if(t.arch)return;
    var nm=esc((SPN[t.sport]||"")+", "+(t.name||"Temporada"));
    if(!t.teams.length)av.push([t,nm+": no tiene equipos.","a"]);
    else if(!G(t))av.push([t,nm+": tiene "+t.teams.length+" equipos y aún no se generan los partidos.","a"]);
    else if(t.type=="grupos"&&!t.rounds.length&&t.gr.every(function(g){return g.matches.every(function(m){return m.est=="cancelado"||fin(t,m)})}))av.push([t,nm+": terminaron los grupos, falta generar las llaves.","p"]);
  });
  if(sinf)av.push([null,sinf+" partido(s) listos para jugar no tienen fecha. Usa la pestaña Fechas de cada temporada.","p"]);
  if(apl)av.push([null,apl+" partido(s) aplazados esperan nueva fecha.","p"]);
  return h+(av.length?'<div class="rs">'+av.map(function(x){return'<div class="pl"><span class="pn">'+(x[0]?x[1]:esc(x[1]))+'</span>'+(x[0]?'<button data-a="seasgo" data-id="'+x[0].id+'" data-v="'+x[2]+'">Abrir</button>':"")+'</div>'}).join("")+'</div>':'<div class="rs"><p class="empty">Todo en orden.</p></div>');
}
function admPartidos(){
  var all=admData().filter(function(x){return !x.t.arch}),hoy=todayISO();
  function info(t,m){return esc(t.name||"Temporada")+(m.date?", "+esc(m.date)+(m.time?" "+esc(m.time):""):"")+(m.court?", "+esc(m.court):"")}
  function row(x){return'<div class="pl"><span class="pn">'+(SPI[x.t.sport]||"")+" "+esc(x.m.a)+" vs "+esc(x.m.b)+'<br><span class="hint">'+info(x.t,x.m)+'</span></span><button data-a="seasgo" data-id="'+x.t.id+'" data-v="p">Abrir</button></div>'}
  function sec(title,L,f){return'<h2>'+title+' ('+L.length+')</h2>'+(L.length?'<div class="rs">'+L.slice(0,30).map(f||row).join("")+'</div>':'<div class="rs"><p class="empty">Ninguno.</p></div>')}
  var live=liveList().filter(function(q){return !q.t.arch});
  return sec("En vivo ahora",live,function(q){return'<div class="pl"><span class="pn">🔴 '+(SPI[q.t.sport]||"")+" "+esc(q.m.a)+" "+q.x.sa+" - "+q.x.sb+" "+esc(q.m.b)+'<br><span class="hint">'+esc(q.t.name||"Temporada")+'</span></span><button class="pri" data-a="admlive" data-id="'+q.t.id+'" data-r="'+q.r+'" data-i="'+q.i+'" data-g="'+(q.g==null?"":q.g)+'">Abrir marcador</button></div>'})+
    sec("Hoy",all.filter(function(x){return x.m.date===hoy&&x.e=="programado"}))+
    sec("Sin fecha",all.filter(function(x){return x.e=="programado"&&!x.m.date}))+
    sec("Aplazados",all.filter(function(x){return x.e=="aplazado"}));
}
function admTemporadas(){
  var h='<div class="ctl"><span class="tn">Nueva temporada</span>'+["beis","bas3","vol"].map(function(k){return'<button class="pri" data-a="admnew" data-sp="'+k+'">'+SPI[k]+" "+SPN[k]+'</button>'}).join("")+'</div>';
  var ss=S.list.slice().sort(function(a,b){return b.id-a.id});
  if(!ss.length)return h+'<p class="empty">Aún no hay temporadas.</p>';
  return h+'<div class="tw"><table><tr><th>Dep.</th><th>Temporada</th><th>Formato</th><th>Equipos</th><th>Estado</th><th></th></tr>'+ss.map(function(t){
    var c=champ(t);
    return'<tr><td>'+(SPI[t.sport]||"")+'</td><td>'+esc(t.name||"Temporada")+'</td><td>'+fmtN(t)+'</td><td>'+t.teams.length+'</td><td>'+(t.arch?"Archivada":c?"🏆 "+esc(c):G(t)?prog(t):"Sin generar")+'</td><td><button data-a="seasgo" data-id="'+t.id+'" data-v="a">Abrir</button> <button data-a="admarch" data-id="'+t.id+'">'+(t.arch?"Restaurar":"Archivar")+'</button></td></tr>';
  }).join("")+'</table></div>';
}
function admInsc(){
  var ks=Object.keys(INSC);
  return'<h2>Inscripciones pendientes</h2><div class="rs">'+(ks.length?ks.map(function(u){
    var q=INSC[u],t=S.list.filter(function(x){return x.id===q.tid})[0];
    return'<div class="pl">'+av(u,q.name)+'<span class="pn">'+esc(q.team)+' <small>'+esc(q.name||"")+'</small><br><span class="hint">'+esc(t?(SPN[t.sport]||"")+", "+(t.name||"Temporada"):"Temporada eliminada")+'</span></span><button class="pri" data-a="iapr" data-id="'+esc(u)+'">Aprobar</button><button data-a="irej" data-id="'+esc(u)+'">Rechazar</button></div>';
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
    if(!L.length){toast("El respaldo no contiene temporadas válidas.");return}
    if(!confirm("Se agregarán "+L.length+" temporada(s) como copias nuevas. No se borra ni se cambia nada de lo actual. ¿Continuar?"))return;
    L.forEach(function(t){var c=JSON.parse(JSON.stringify(t));c.id=nid();c.name=(c.name||"Temporada")+" (restaurada)";S.list.push(c);if(DB)put(c);logAct(c,"Temporada restaurada desde respaldo",c.name)});
    if(!DB){S.cur=S.list[S.list.length-1].id;save()}
    toast(L.length+" temporada(s) restauradas");render();
  };
  fr.readAsText(f);
}
function admRespaldo(){
  return'<div class="rs"><b>Respaldo de datos</b><p class="hint">Descarga una copia de todas las temporadas, noticias, roles y escudos. Hazlo al terminar cada temporada y antes de cambios grandes.</p><button class="pri" data-a="bkp">Descargar respaldo (JSON)</button></div>'+
  '<div class="rs"><b>Restaurar desde un respaldo</b><p class="hint">Agrega las temporadas del archivo como copias nuevas. No borra ni modifica lo que ya existe. Esta versión restaura temporadas; las noticias, roles y escudos quedan guardados en el archivo pero no se restauran solos.</p><input type="file" accept="application/json,.json" data-a="bkpin"></div>'+
  '<div class="rs"><b>Seguridad</b><p class="hint">Quien tenga permiso de colaborador en la página puede escribir datos. Los roles se aplican en la pantalla, no en el servidor. Comparte el permiso de editor solo con personas de confianza.</p></div>';
}
