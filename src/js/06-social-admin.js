// Roles, historial de cambios, calendario y funciones de comunidad
function viewR(nolog){
  var me=myRole(),h='<div class="rs"><b>Tu rol: '+RL[me][0]+'</b><p class="hint">'+RL[me][1]+'</p>'+(DB?"":'<p class="hint">Modo local: los datos se guardan solo en este dispositivo. Al compartir la página podrás asignar roles a otras personas.</p>')+'</div>';
  h+='<h2>Roles disponibles</h2><div class="grid">'+Object.keys(RL).map(function(k){return'<div class="rs"><b>'+RL[k][0]+'</b><p class="hint">'+RL[k][1]+'</p></div>'}).join("")+'</div>';
  if(!DB)return h;
  var ids=Object.keys(ROLES);
  h+=pend()+'<h2>Personas con rol</h2><div class="rs">'+(ids.length?ids.map(function(id){var r=ROLES[id];return'<div class="pl">'+av(id)+'<span class="pn" data-pid="'+esc(id)+'">Persona</span><span>'+(RL[r.role]?RL[r.role][0]:esc(r.role))+(r.team?" de "+esc(r.team):"")+'</span>'+(ADMIN?'<button data-a="rrm" data-id="'+esc(id)+'" aria-label="Quitar rol">×</button>':"")+'</div>'}).join(""):'<p class="empty">Nadie tiene rol asignado todavía. Quien no tenga rol entra como espectador.</p>')+'</div>';
  if(ADMIN&&U){
    var tn=[];S.list.forEach(function(t){t.teams.forEach(function(n){if(tn.indexOf(n)<0)tn.push(n)})});
    h+='<h2>Asignar rol</h2><div class="rs"><label for="rq">Buscar persona</label><div class="row"><input type="text" id="rq" data-a="rq" placeholder="Escribe un nombre"></div><div class="tp" id="rres"></div>'+
    (PICK?'<p>Persona elegida: <b>'+esc(PICK.name)+'</b></p><div class="pa"><select id="rrole"><option value="arbitro">Árbitro</option><option value="entrenador">Entrenador</option><option value="jugador">Jugador</option><option value="organizador">Organizador</option></select><input type="text" id="rteam" list="tl" placeholder="Equipo (entrenador o jugador)"><button class="pri" data-a="rset">Asignar rol</button></div><datalist id="tl">'+tn.map(function(n){return'<option value="'+esc(n)+'">'}).join("")+'</datalist>':'<p class="hint">Busca a alguien con acceso a esta página y elígelo.</p>')+'</div>';
  }else h+='<p class="hint">Solo el dueño y los editores de la página pueden asignar roles.</p>';
  return h+(nolog?"":logHtml(null));
}
function addToRoster(name,team,uid){S.list.forEach(function(t){if(t.teams.indexOf(team)<0)return;var R=RO(t,team);if(R.pl.some(function(p){return p.uid===uid}))return;R.pl.push({n:name,num:"",pos:"",st:false,cap:false,uid:uid});put(t)})}
function alertCard(){return'<div class="rs"><b>Alertas</b><p class="hint">Aviso dentro de la página cuando empieza o cambia el marcador de los partidos de tu equipo. No son notificaciones push: la página debe estar abierta.</p><button data-a="alall">'+(ALERTALL?"Avisarme solo de mi equipo":"Avisarme de todos los partidos")+'</button></div>'}
function schedule(t,o){
  var list=ms(t).filter(function(m){return m.a&&m.b&&m.a!==BYE&&m.b!==BYE&&!m.date&&!m.w&&!(m.bo>1)&&m.est!="cancelado"});
  var tot=list.length,d=new Date(o.date+"T00:00"),cur=o.start,guard=0;
  function iso(x){return x.getFullYear()+"-"+("0"+(x.getMonth()+1)).slice(-2)+"-"+("0"+x.getDate()).slice(-2)}
  function wk(){while(o.skip&&(d.getDay()==0||d.getDay()==6))d.setDate(d.getDate()+1)}
  wk();if(o.end-o.start<o.dur)o.end=o.start+o.dur;
  while(list.length&&guard++<1000){
    var used={},cnt=0,k=0;
    while(k<list.length&&cnt<o.courts){
      var m=list[k];
      if(used[m.a]||used[m.b]){k++;continue}
      used[m.a]=used[m.b]=1;m.date=iso(d);m.time=hm(cur);m.court="Cancha "+(cnt+1);if(m.est=="aplazado")delete m.est;cnt++;list.splice(k,1);
    }
    cur+=o.dur;
    if(cur+o.dur>o.end){cur=o.start;d.setDate(d.getDate()+1);wk()}
  }
  return tot;
}
function schedForm(t){
  var d=new Date(),i0=d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
  return'<div class="rs"><b>Programar partidos automáticamente</b><p class="hint">Asigna fecha, hora y cancha a los partidos que aún no tienen. Puedes repetirlo cuando se definan nuevos cruces.</p><div class="pa"><label class="fl">Fecha inicial<input type="date" id="sd" value="'+i0+'"></label><label class="fl">Desde<input type="time" id="ss" value="08:00"></label><label class="fl">Hasta<input type="time" id="se" value="14:00"></label><label class="fl">Minutos por partido<input type="number" id="sm" min="10" max="180" value="40"></label><label class="fl">Canchas<input type="number" id="sk" min="1" max="12" value="1"></label></div><label class="ck"><input type="checkbox" id="sw" checked> Saltar sábados y domingos</label><button class="pri" data-a="sched">Programar</button></div>';
}
function badge(team,n){var d=DISC[team+"|"+n];if(!d)return"";return(d.pend>0?' <small class="sus">⛔ Suspendido</small>':"")+(d.yc?" 🟨"+d.yc:"")+(d.rc?" 🟥"+d.rc:"")}
function av(uid,name){
  var p=PERF[uid];
  if(p&&typeof p.foto=="string"&&p.foto.length<60000&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(p.foto))return'<img class="av" alt="" src="'+p.foto+'">';
  var n=String(name||(p&&p.name)||"?").trim();
  return'<span class="av">'+esc(n.slice(0,1).toUpperCase())+'</span>';
}
function attHtml(P,mk){
  function one(k,team){
    var a=ATT[mk+"_"+k],ok=a&&a.team===team;
    return'<div class="pl"><span class="pn">'+(ok?"✅ ":"⏳ ")+esc(team)+'</span><span>'+(ok?"Confirmado":"Sin confirmar")+'</span>'+(UID&&DB&&canConf(team)?'<button data-a="att" data-k="'+k+'">'+(ok?"Quitar":"Confirmar que llegamos")+'</button>':"")+'</div>';
  }
  return'<div class="rs"><b>Asistencia</b>'+one("a",P.a)+one("b",P.b)+'</div>';
}
function predHtml(t,P,m){
  if(!DB||!UID||LM.g!=null||!m)return"";
  var mk=mkey(t,LM.r,LM.i,null),started=m.live||m.sa!=null||m.sb!=null||m.w,mine=(PREDS[UID]||{})[mk],na=0,nb=0;
  Object.keys(PREDS).forEach(function(u){var v=(PREDS[u]||{})[mk];if(v=="a")na++;else if(v=="b")nb++});
  var h='<div class="rs"><b>¿Quién gana?</b>';
  if(!started)h+='<div class="ctl"><button data-a="pred" data-k="a" class="'+(mine=="a"?"pri":"")+'">'+esc(P.a)+'</button><button data-a="pred" data-k="b" class="'+(mine=="b"?"pri":"")+'">'+esc(P.b)+'</button></div>';
  return h+'<p class="hint">'+((na+nb)?esc(P.a)+": "+na+" voto(s), "+esc(P.b)+": "+nb+" voto(s). ":"Aún nadie ha votado. ")+(mine?"Tu voto: "+esc(mine=="a"?P.a:P.b)+". ":"")+(started?"Votación cerrada.":"Cierra cuando empieza el partido.")+'</p></div>';
}
function comHtml(mk){
  if(!DB)return"";
  var cs=COM.filter(function(c){return c.mk===mk&&!c.e}),rs=COM.filter(function(c){return c.mk===mk&&c.e});
  var h='<h2>Reacciones y comentarios</h2><div class="ctl">'+REM.map(function(e,j){
    var n=rs.filter(function(c){return c.e===e}).length,mine=rs.some(function(c){return c.e===e&&c.uid===UID});
    return'<button data-a="rea" data-j="'+j+'" class="'+(mine?"pri":"")+'"'+(UID?"":" disabled")+'>'+e+" "+n+'</button>';
  }).join("")+'</div>';
  if(UID)h+='<div class="row"><input type="text" id="cmt" maxlength="140" placeholder="Escribe un comentario"><button class="pri" data-a="cmt">Enviar</button></div>';
  else h+='<p class="hint">Inicia sesión para comentar y reaccionar.</p>';
  return h+cs.slice(-15).reverse().map(function(c){
    return'<div class="rs ann"><div class="pl">'+av(c.uid,c.by)+'<span class="pn">'+esc(c.by||"Anónimo")+'</span>'+((isOrg()||c.uid===UID)?'<button data-a="cdel" data-id="'+esc(c.id)+'" aria-label="Borrar comentario">×</button>':"")+'</div><p>'+esc(c.txt)+'</p></div>';
  }).join("");
}
function perfCard(){
  if(!DB||!UID)return"";
  var p=PERF[UID]||{},tm=(ROLES[UID]&&ROLES[UID].team)||"";
  var tr=S.list.filter(function(t){return tm&&champ(t)===tm}).map(function(t){return"🏆 Campeón de "+esc(t.name||"un torneo")});
  return'<h2>Mi perfil</h2><div class="rs"><div class="pl">'+av(UID,p.name||NAME)+'<span class="pn">'+esc(p.name||NAME||"Sin nombre")+'</span></div>'+
  '<label for="pf_n">Nombre</label><div class="row"><input type="text" id="pf_n" maxlength="40" value="'+esc(p.name||NAME||"")+'"></div>'+
  '<label for="pf_c">Curso o grupo</label><div class="row"><input type="text" id="pf_c" maxlength="30" value="'+esc(p.curso||"")+'"></div>'+
  '<label for="pf_b">Sobre mí</label><div class="row"><input type="text" id="pf_b" maxlength="120" value="'+esc(p.bio||"")+'"></div>'+
  '<label for="pf_f">Foto</label><div class="row"><input type="file" id="pf_f" accept="image/*" data-a="pfoto"></div>'+
  '<button class="pri" data-a="psave">Guardar perfil</button>'+(tr.length?'<p class="hint">'+tr.join("<br>")+'</p>':"")+'</div>';
}
function photo(inp){
  var f=inp.files&&inp.files[0];if(!f||!DB||!UID)return;
  var fr=new FileReader();
  fr.onload=function(){
    var im=new Image();
    im.onload=function(){
      var c=document.createElement("canvas");c.width=c.height=128;
      var x=c.getContext("2d"),q=Math.min(im.width,im.height);
      x.drawImage(im,(im.width-q)/2,(im.height-q)/2,q,q,0,0,128,128);
      DB.doc("perfiles/"+UID).set(Object.assign({},PERF[UID]||{},{foto:c.toDataURL("image/jpeg",.7)})).then(function(){toast("Foto guardada")}).catch(fail);
    };
    im.onerror=function(){toast("No se pudo leer la imagen")};
    im.src=fr.result;
  };
  fr.readAsDataURL(f);
}
function rulesHtml(t){
  return'<label for="trules">Reglamento de la temporada</label><div class="row"><textarea id="trules" data-a="trules" rows="5" maxlength="1500" placeholder="Reglas propias de tu escuela (se muestran en la pestaña Reglas)">'+esc(t.rules||"")+'</textarea></div>'+
  '<div class="pa"><label class="fl">Máx. jugadores por equipo<input type="number" min="0" max="50" data-a="tmaxp" value="'+(t.maxp||0)+'"></label><label class="fl">Cupo de equipos<input type="number" min="0" max="64" data-a="tcupo" value="'+(t.cupo||0)+'"></label></div>'+
  '<label for="topen">Inscripción abierta</label><div class="row"><select id="topen" data-a="topen"><option value="0"'+(t.open?"":" selected")+'>No</option><option value="1"'+(t.open?" selected":"")+'>Sí</option></select></div><p class="hint">Con inscripción abierta, quienes inicien sesión pueden pedir inscribir su equipo. Un 0 significa sin límite.</p>';
}
function inscHtml(t){
  if(!t.open||G(t))return"";
  if(!UID||!DB)return'<div class="rs"><b>Inscripciones abiertas</b><p class="hint">Inicia sesión para inscribir a tu equipo.</p></div>';
  var full=t.cupo&&t.teams.length>=t.cupo,mine=INSC[UID]&&INSC[UID].tid===t.id?INSC[UID]:null;
  return'<div class="rs"><b>Inscripciones abiertas</b><p class="hint">'+(t.cupo?"Cupo: "+t.teams.length+" de "+t.cupo+" equipos. ":"")+(full?"El cupo está lleno.":"Escribe el nombre de tu equipo y el organizador lo aprobará.")+'</p>'+(mine?'<p class="hint">Solicitud enviada: '+esc(mine.team)+' (pendiente).</p>':"")+(full?"":'<div class="row"><input type="text" id="insn" maxlength="40" placeholder="Nombre del equipo"><button class="pri" data-a="insc">Inscribir</button></div>')+'</div>';
}
function inscPend(t){
  var ks=Object.keys(INSC).filter(function(u){return INSC[u].tid===t.id});
  if(!t.open&&!ks.length)return"";
  return'<h2>Inscripciones pendientes</h2><div class="rs">'+(ks.length?ks.map(function(u){var q=INSC[u];return'<div class="pl">'+av(u,q.name)+'<span class="pn">'+esc(q.team)+' <small>'+esc(q.name||"")+'</small></span><button class="pri" data-a="iapr" data-id="'+esc(u)+'">Aprobar</button><button data-a="irej" data-id="'+esc(u)+'">Rechazar</button></div>'}).join(""):'<p class="empty">No hay solicitudes.</p>')+'</div>';
}
function logAct(t,a,d){
  if(!DB||!UID)return;
  var ts=Date.now();
  DB.collection("historial").doc(ts+"_"+Math.floor(Math.random()*10000)).set({ts:ts,uid:UID,by:NAME||"",tid:t?t.id:null,tn:t?(t.name||""):"",sp:t?(t.sport||""):"",a:a,d:String(d||"").slice(0,200)}).catch(function(){});
}
function ptxt(t,r,i,g){
  var P=getM(t,r,i),m=getM(t,r,i,g);
  return P.a+" "+(m.sa==null?"-":m.sa)+" - "+(m.sb==null?"-":m.sb)+" "+P.b+((g!=null&&g!=="")?" (juego "+(+g+1)+")":"");
}
function logHtml(tid){
  if(!isOrg())return"";
  var L=LOGS.filter(function(x){return tid==null||x.tid===tid}).slice(0,60);
  return'<h2>Historial de cambios</h2>'+(L.length?'<div class="rs">'+L.map(function(x){
    return'<div class="pl"><b class="nu">'+new Date(x.ts).toLocaleString("es",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+'</b><span class="pn">'+esc(x.a)+(x.d?": "+esc(x.d):"")+'<br><span class="hint">'+esc(x.by||"Alguien")+(tid==null&&x.tn?", "+esc(x.tn):"")+'</span></span></div>';
  }).join("")+'</div>':'<p class="empty">Todavía no hay cambios registrados.</p>')+'<p class="hint">Se registran los cambios importantes (resultados, partidos, equipos, temporadas y roles). No es a prueba de manipulaciones: quien tenga permiso de colaborador podría alterarlo.</p>';
}
function crest(t,n){
  var u=(ESC[String(t.id)]||{})[lkey(n)];
  if(typeof u=="string"&&u.length<30000&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(u))return'<img class="cr" alt="" src="'+u+'">';
  var c=String(n).trim();
  return'<span class="cr c'+((c.charCodeAt(0)||0)%4)+'">'+esc(c.slice(0,1).toUpperCase())+'</span>';
}
function logoHtml(t){
  if(!DB||!canRoster(OT))return"";
  return'<label for="lg">Escudo del equipo</label><div class="row">'+crest(t,OT)+'<input type="file" id="lg" accept="image/*" data-a="logo"><button data-a="logodel">Quitar</button></div>';
}
function logoUp(inp,t){
  var f=inp.files&&inp.files[0];if(!f||!DB||!canRoster(OT))return;
  var team=OT,fr=new FileReader();
  fr.onload=function(){
    var im=new Image();
    im.onload=function(){
      var c=document.createElement("canvas");c.width=c.height=96;
      var x=c.getContext("2d"),k=Math.min(96/im.width,96/im.height);
      x.drawImage(im,(96-im.width*k)/2,(96-im.height*k)/2,im.width*k,im.height*k);
      var u=c.toDataURL("image/png");if(u.length>12000)u=c.toDataURL("image/jpeg",.6);
      var all=Object.assign({},ESC[String(t.id)]||{});all[lkey(team)]=u;
      if(JSON.stringify(all).length>230000){toast("Se superó el espacio para escudos de esta temporada.");return}
      DB.doc("escudos/"+t.id).set({logos:all}).then(function(){toast("Escudo guardado")}).catch(fail);
      logAct(t,"Escudo actualizado",team);
    };
    im.onerror=function(){toast("No se pudo leer la imagen")};
    im.src=fr.result;
  };
  fr.readAsDataURL(f);
}
function pend(){
  if(!ADMIN)return"";var sk=Object.keys(SOL);
  return'<h2>Solicitudes pendientes</h2><div class="rs">'+(sk.length?sk.map(function(id){var q=SOL[id];return'<div class="pl"><span class="pn">'+esc(q.name||"Sin nombre")+(q.curso?' <small>'+esc(q.curso)+'</small>':"")+'</span><span>'+(RL[q.quiere]?RL[q.quiere][0]:"")+(q.team?" de "+esc(q.team):"")+'</span><button class="pri" data-a="apr" data-id="'+esc(id)+'">Aprobar</button><button data-a="rej" data-id="'+esc(id)+'">Rechazar</button></div>'}).join(""):'<p class="empty">No hay solicitudes pendientes.</p>')+'</div>';
}
