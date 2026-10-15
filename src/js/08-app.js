// Arranque, eventos y conexión con la base de datos
function addTeam(){
  var t=cur(),i=$("team"),v=i.value.trim();if(!v)return;
  if(t.teams.some(function(x){return x.toLowerCase()===v.toLowerCase()})){i.select();return}
  if(G(t)&&!confirm("Agregar un equipo borra los partidos ya generados y sus resultados. ¿Continuar?"))return;
  logAct(t,"Equipo agregado",v);
  t.teams.push(v);t.rounds=[];t.matches=[];t.gr=[];t.tp=null;t.de=null;save();render();
  var n=$("team");if(n)n.focus();
}
async function boot(){
  load();LOCAL=S.list.slice();
  try{if(window.claude&&claude.use){DL=await claude.use("downloads")}}catch(e){}
  if(DB){
    S={cur:null,list:[]};
    DB.collection("torneos").onSnapshot(function(q){S.list=q.docs.map(function(d){return JSON.parse(JSON.stringify(d.data()))});if(!cur())S.cur=null;notifyDiff();soft()},function(){toast("Sin conexión con los datos compartidos")});
    DB.collection("roles").onSnapshot(function(q){ROLES={};q.docs.forEach(function(d){ROLES[d.id]=d.data()});soft()},function(){});
    DB.collection("asistencia").onSnapshot(function(q){ATT={};q.docs.forEach(function(d){ATT[d.id]=d.data()});soft()},function(){});
    DB.collection("comentarios").onSnapshot(function(q){COM=q.docs.map(function(d){var x=d.data();x.id=d.id;return x}).sort(function(a,b){return a.ts-b.ts});soft()},function(){});
    DB.collection("predicciones").onSnapshot(function(q){PREDS={};PNAME={};q.docs.forEach(function(d){var x=d.data();PREDS[d.id]=x.p||{};PNAME[d.id]=x.name||""});soft()},function(){});
    DB.collection("perfiles").onSnapshot(function(q){PERF={};q.docs.forEach(function(d){PERF[d.id]=d.data()});soft()},function(){});
    DB.collection("inscripciones").onSnapshot(function(q){INSC={};q.docs.forEach(function(d){INSC[d.id]=d.data()});soft()},function(){});
    DB.collection("historial").orderBy("ts","desc").limit(200).onSnapshot(function(q){LOGS=q.docs.map(function(d){return d.data()});if(SC=="roles"||(SC=="dep"&&V=="l")||(SC=="admin"&&AV=="c"))soft()},function(){});
    DB.collection("escudos").onSnapshot(function(q){ESC={};q.docs.forEach(function(d){ESC[d.id]=(d.data()||{}).logos||{}});soft()},function(){});
    DB.collection("anuncios").onSnapshot(function(q){ANU=q.docs.map(function(d){var x=d.data();return{id:d.id,txt:x.txt,ts:x.ts,by:x.by,st:x.st}}).sort(function(a,b){return b.ts-a.ts});soft()},function(){});
    if(ADMIN)DB.collection("solicitudes").onSnapshot(function(q){SOL={};q.docs.forEach(function(d){SOL[d.id]=d.data()});soft()},function(){});
    else if(UID)DB.doc("solicitudes/"+UID).onSnapshot(function(d){MYREQ=d.exists?d.data():null;soft()},function(){});
  }
  BOOT=true;render();
}
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-a]");if(!b||b.tagName!="BUTTON"||b.disabled)return;
  var t=cur(),a=b.dataset.a,d=b.dataset,sv=true;
  if(a=="go"){SC=d.s;if(d.sp){SPORT=d.sp;S.cur=null;V="p";FILT={est:"",team:""}}sv=false}
  else if(a=="open"){S.cur=+d.id;SC="torneo";V=G(cur())?"p":(isOrg()?"a":"p");sv=false}
  else if(a=="newseason"){if(!isOrg())return;makeSeason();SC="dep"}
  else if(a=="arch"){t.arch=!t.arch;logAct(t,t.arch?"Temporada archivada":"Temporada restaurada",t.name||"")}
  else if(a=="seasopen"){S.cur=+d.id;V="p";sv=false}
  else if(a=="deltor"){if(!confirm("¿Eliminar esta temporada? No se puede deshacer. Si solo quieres ocultarla, usa Archivar."))return;var id=S.cur;logAct(t,"Temporada eliminada",t.name||"");S.list=S.list.filter(function(x){return x.id!=id});S.cur=null;SC="dep";if(DB)DB.collection("torneos").doc(String(id)).delete().catch(fail)}
  else if(a=="imp"){LOCAL.forEach(put);LOCAL=[];toast("Importando torneos…");sv=false}
  else if(a=="addt"){addTeam();return}
  else if(a=="gen"){if(G(t)&&!confirm("Se volverán a sortear los partidos y se perderán los resultados. ¿Continuar?"))return;t.rounds=[];t.matches=[];t.gr=[];t.tp=null;t.de=null;if(t.type=="dele"&&t.teams.length<3){toast("La doble eliminación necesita al menos 3 equipos.");return}generate(t);V="p";logAct(t,"Partidos generados",fmtN(t)+", "+t.teams.length+" equipos")}
  else if(a=="win"){var m=getM(t,d.r,d.i),w0=m[d.k],nw=m.w===w0?null:w0;if(m.w&&!confirm("Este partido ya tiene ganador oficial ("+m.w+"). ¿Quieres cambiarlo? Se recalculan las llaves y el cambio queda en el historial."))return;setRes(t,d.r,+d.i,nw);logAct(t,nw?"Ganador marcado":"Ganador quitado",m.a+" vs "+m.b+(nw?": "+nw:""))}
  else if(a=="rm"){if(G(t)&&!confirm("Quitar un equipo borra los partidos ya generados y sus resultados. ¿Continuar?"))return;logAct(t,"Equipo quitado",t.teams[+d.i]);t.teams.splice(+d.i,1);t.rounds=[];t.matches=[];t.gr=[];t.tp=null;t.de=null}
  else if(a=="ot"){OT=t.teams[+d.i];sv=false}
  else if(a=="ap"){var nm=$("pnm").value.trim();if(!nm)return;if(t.maxp&&RO(t,OT).pl.length>=t.maxp){toast("Límite de "+t.maxp+" jugadores por equipo");return}RO(t,OT).pl.push({n:nm,num:$("pnu").value.trim(),pos:$("ppo").value.trim(),st:false,cap:false});setTimeout(function(){var f=$("pnm");if(f)f.focus()},0)}
  else if(a=="st"){var R=RO(t,OT),p=R.pl[+d.i],mx=sp(t).max;if(!p.st&&mx&&R.pl.filter(function(q){return q.st}).length>=mx)MSG="Ya hay "+mx+" titulares. Pasa a alguien a la banca primero.";else p.st=!p.st}
  else if(a=="cap"){RO(t,OT).pl.forEach(function(q,j){q.cap=j==+d.i?!q.cap:false})}
  else if(a=="rp")RO(t,OT).pl.splice(+d.i,1);
  else if(a=="tab"){V=d.v;sv=false}
  else if(a=="pick"){PICK={id:d.id,name:d.n};sv=false}
  else if(a=="rset"){if(!PICK||!DB)return;var ro=$("rrole").value,tm=($("rteam").value||"").trim();if(ro=="jugador"&&tm)addToRoster(PICK.name,tm,PICK.id);DB.collection("roles").doc(PICK.id).set({role:ro,team:(ro=="entrenador"||ro=="jugador")?tm:""}).then(function(){toast("Rol asignado")}).catch(fail);logAct(null,"Rol asignado",PICK.name+": "+ro+((ro=="entrenador"||ro=="jugador")&&tm?" de "+tm:""));PICK=null;sv=false}
  else if(a=="live"){LPL={a:"",b:""};LM={r:d.r,i:+d.i,g:d.g==null?null:+d.g};SC="vivo";sv=false}
  else if(a=="openlive"){S.cur=+d.id;var q0=cur();if(q0&&SPN[q0.sport])SPORT=q0.sport;LPL={a:"",b:""};LM={r:d.r,i:+d.i,g:d.g==null?null:+d.g};SC="vivo";sv=false}
  else if(a=="lstart"||a=="la"||a=="lundo"||a=="lfin"||a=="lre"){
    var lm=gm(t);if(!canScore()||!lm)return;
    if(a=="lstart"){var pp=gpar(t);if(!pp||!pp.a||!pp.b)return;lm.live=newLive(t);sync(lm);logAct(t,"Partido iniciado en vivo",pp.a+" vs "+pp.b)}
    else if(!lm.live)return;
    else if(a=="la")liveAct(t,lm,d.x,d.k,+d.v||1);
    else if(a=="lundo")liveAct(t,lm,"undo");
    else if(a=="lfin"){if(!finishLive(t,lm))return;logAct(t,"Partido finalizado",ptxt(t,LM.r,LM.i,LM.g))}
    else if(a=="lre"){if(!confirm("Reabrir un partido finalizado cambia el resultado oficial y recalcula tablas y llaves. ¿Continuar?"))return;logAct(t,"Partido reabierto",ptxt(t,LM.r,LM.i,LM.g));lm.live.st="on";if(LM.g!=null)serie(t,LM.r,LM.i);else if(isK(t,LM.r))setRes(t,LM.r,LM.i,null)}
  }
  else if(a=="genko"){if(!canScore())return;var dn=t.gr.every(function(g){return g.matches.every(function(m){return m.est=="cancelado"||fin(t,m)})});if(!dn&&!confirm("Aún hay partidos de grupos sin terminar. ¿Generar las llaves de todas formas?"))return;genKO(t);logAct(t,"Llaves generadas","a partir de los grupos")}
  else if(a=="cpy"){var tx2=shareText(t);try{navigator.clipboard.writeText(tx2).then(function(){toast("Resumen copiado")},function(){toast("No se pudo copiar")})}catch(e){toast("No se pudo copiar")}sv=false}
  else if(a=="apub"){var tx=$("antxt").value.trim();if(!tx||!DB)return;DB.collection("anuncios").doc(String(Date.now())).set({txt:tx,ts:Date.now(),by:NAME||"",st:"publicado"}).catch(fail);sv=false}
  else if(a=="adel"){DB.collection("anuncios").doc(d.id).delete().catch(fail);sv=false}
  else if(a=="alall"){ALERTALL=!ALERTALL;try{localStorage.setItem("torneo-alerts-all",ALERTALL?"1":"0")}catch(e){}sv=false}
  else if(a=="sched"){if(!isOrg())return;var sd=$("sd").value;if(!sd){toast("Elige la fecha inicial");return}var nsc=schedule(t,{date:sd,start:tm2($("ss").value||"08:00"),end:tm2($("se").value||"14:00"),dur:+$("sm").value||40,courts:Math.max(1,+$("sk").value||1),skip:$("sw").checked});toast(nsc?nsc+" partidos programados":"No hay partidos pendientes de programar")}
  else if(a=="att"){var P0=gpar(t)||gm(t);if(!P0||!DB||!UID)return;var tm0=d.k=="a"?P0.a:P0.b;if(!canConf(tm0))return;var aid=mkey(t,LM.r,LM.i,LM.g)+"_"+d.k;if(ATT[aid]&&ATT[aid].team===tm0)DB.collection("asistencia").doc(aid).delete().catch(fail);else DB.collection("asistencia").doc(aid).set({team:tm0,by:NAME||"",ts:Date.now()}).catch(fail);sv=false}
  else if(a=="pred"){var m1=gm(t);if(!DB||!UID||!m1||LM.g!=null||m1.live||m1.sa!=null||m1.w)return;var mp=Object.assign({},PREDS[UID]||{});mp[mkey(t,LM.r,LM.i,null)]=d.k;DB.doc("predicciones/"+UID).set({p:mp,name:NAME||""}).catch(fail);sv=false}
  else if(a=="rea"){if(!DB||!UID)return;var mk1=mkey(t,LM.r,LM.i,LM.g),rid="r_"+mk1+"_"+d.j+"_"+UID;if(COM.some(function(c){return c.id===rid}))DB.collection("comentarios").doc(rid).delete().catch(fail);else DB.collection("comentarios").doc(rid).set({mk:mk1,e:REM[+d.j],uid:UID,ts:Date.now()}).catch(fail);sv=false}
  else if(a=="cmt"){var tx3=($("cmt").value||"").trim().slice(0,140);if(!tx3||!DB||!UID)return;var mk2=mkey(t,LM.r,LM.i,LM.g);DB.collection("comentarios").doc(mk2+"_"+Date.now()).set({mk:mk2,txt:tx3,uid:UID,by:NAME||"",ts:Date.now()}).catch(fail);sv=false}
  else if(a=="cdel"){DB.collection("comentarios").doc(d.id).delete().catch(fail);sv=false}
  else if(a=="psave"){if(!DB||!UID)return;DB.doc("perfiles/"+UID).set(Object.assign({},PERF[UID]||{},{name:$("pf_n").value.trim(),curso:$("pf_c").value.trim(),bio:$("pf_b").value.trim()})).then(function(){toast("Perfil guardado")}).catch(fail);sv=false}
  else if(a=="insc"){var nm2=($("insn").value||"").trim();if(!nm2||!DB||!UID)return;if(t.teams.some(function(q){return q.toLowerCase()===nm2.toLowerCase()})){toast("Ese equipo ya está inscrito");return}DB.doc("inscripciones/"+UID).set({tid:t.id,team:nm2,name:NAME||"",ts:Date.now()}).then(function(){toast("Solicitud enviada")}).catch(fail);sv=false}
  else if(a=="iapr"){if(!isOrg())return;var q2=INSC[d.id];if(!q2)return;S.cur=q2.tid;t=cur();if(!t)return;if(G(t)){toast("El torneo ya tiene partidos generados");return}if(t.cupo&&t.teams.length>=t.cupo){toast("El cupo está lleno");return}if(!t.teams.some(function(q){return q.toLowerCase()===q2.team.toLowerCase()})){t.teams.push(q2.team);RO(t,q2.team).coach=q2.name||"";logAct(t,"Equipo inscrito",q2.team)}DB.doc("inscripciones/"+d.id).delete().catch(fail)}
  else if(a=="irej"){DB.doc("inscripciones/"+d.id).delete().catch(fail);sv=false}
  else if(a=="dip"){var tm9=$("dpt").value,who=($("dpn").value||"").trim()||tm9;try{outFile(drawCert(who,placeOf(t,tm9),t),"diploma-"+tm9.replace(/[^\w]+/g,"-"),d.f)}catch(e){toast("No se pudo crear el diploma")}sv=false}
  else if(a=="simg"){try{outFile(drawSummary(t),"resumen-"+(t.name||"torneo").replace(/[^\w]+/g,"-"),d.f)}catch(e){toast("No se pudo crear la imagen")}sv=false}
  else if(a=="logodel"){if(!DB||!canRoster(OT))return;var lg0=Object.assign({},ESC[String(t.id)]||{});delete lg0[lkey(OT)];DB.doc("escudos/"+t.id).set({logos:lg0}).catch(fail);logAct(t,"Escudo quitado",OT);sv=false}
  else if(a=="adraft"){var tx4=($("antxt").value||"").trim();if(!tx4||!DB||!isOrg())return;DB.collection("anuncios").doc(String(Date.now())).set({txt:tx4,ts:Date.now(),by:NAME||"",st:"borrador"}).catch(fail);sv=false}
  else if(a=="apubl"){if(!DB||!isOrg())return;DB.collection("anuncios").doc(d.id).update({st:"publicado",ts:Date.now()}).catch(fail);sv=false}
  else if(a=="atab"){AV=d.v;sv=false}
  else if(a=="seasgo"){var sg=S.list.filter(function(x){return x.id==d.id})[0];if(!sg)return;S.cur=sg.id;SPORT=sg.sport;V=d.v||"p";FILT={est:"",team:""};SC="dep";sv=false}
  else if(a=="admlive"){var sl=S.list.filter(function(x){return x.id==d.id})[0];if(!sl)return;S.cur=sl.id;SPORT=sl.sport;LPL={a:"",b:""};LM={r:d.r,i:+d.i,g:(d.g==null||d.g==="")?null:+d.g};SC="vivo";sv=false}
  else if(a=="admarch"){if(!isOrg())return;var sa=S.list.filter(function(x){return x.id==d.id})[0];if(!sa)return;S.cur=sa.id;sa.arch=!sa.arch;logAct(sa,sa.arch?"Temporada archivada":"Temporada restaurada",sa.name||"")}
  else if(a=="admnew"){if(!isOrg())return;SPORT=d.sp;makeSeason();SC="dep"}
  else if(a=="bkp"){if(!isOrg())return;backup();sv=false}
  else if(a=="sol"){var nn=$("cn").value.trim();if(!nn||!DB||!UID){toast("Escribe tu nombre para continuar");return}var qq=$("cq").value,tq=(qq=="jugador"||qq=="entrenador")?$("ct").value.trim():"";if((qq=="jugador"||qq=="entrenador")&&allTeams().indexOf(tq)<0){toast("Elige tu equipo de la lista");return}DB.doc("solicitudes/"+UID).set({name:nn,curso:$("cc").value.trim(),quiere:qq,team:tq,ts:Date.now()}).then(function(){toast("Solicitud enviada")}).catch(fail);sv=false}
  else if(a=="apr"){var rq=SOL[d.id];if(!rq)return;if(rq.quiere=="jugador"&&rq.team)addToRoster(rq.name||"Jugador",rq.team,d.id);DB.collection("roles").doc(d.id).set({role:rq.quiere,team:(rq.quiere=="entrenador"||rq.quiere=="jugador")?(rq.team||""):""}).then(function(){return DB.collection("solicitudes").doc(d.id).delete()}).then(function(){toast("Rol asignado a "+(rq.name||"la persona"));logAct(null,"Solicitud aprobada",(rq.name||"Persona")+": "+rq.quiere+(rq.team?" de "+rq.team:""))}).catch(fail);sv=false}
  else if(a=="rej"){logAct(null,"Solicitud rechazada",(SOL[d.id]&&SOL[d.id].name)||"");DB.collection("solicitudes").doc(d.id).delete().catch(fail);sv=false}
  else if(a=="rrm"){logAct(null,"Rol quitado",ROLES[d.id]?ROLES[d.id].role:"");DB.collection("roles").doc(d.id).delete().catch(fail);sv=false}
  else return;
  if(sv)save();
  render();
});
document.addEventListener("change",function(e){
  var x=e.target,a=x.dataset&&x.dataset.a,t=cur(),m;
  if(a=="sc"||a=="dt"){
    m=getM(t,x.dataset.r,x.dataset.i,x.dataset.g);if(a=="sc"&&m.live){toast("Este partido tiene marcador en vivo. Usa la pantalla En vivo.");render();return}
    if(a=="dt")m[x.dataset.k]=x.value;
    else{
      var nv=x.value===""?null:Math.max(0,Math.floor(+x.value)),had=m.sa!=null&&m.sb!=null,old=ptxt(t,x.dataset.r,x.dataset.i,x.dataset.g);
      if(nv===m["s"+x.dataset.k]){render();return}
      if(had&&!confirm("Este partido ya tiene resultado oficial ("+old+"). ¿Quieres corregirlo? Se recalculan tablas y llaves y el cambio queda en el historial.")){render();return}
      m["s"+x.dataset.k]=nv;
      logAct(t,had?"Resultado corregido":"Resultado anotado",ptxt(t,x.dataset.r,x.dataset.i,x.dataset.g)+(had?" (antes "+old+")":""));
      if(x.dataset.g!=null)serie(t,x.dataset.r,+x.dataset.i);else if(isK(t,x.dataset.r)&&m.sa!=null&&m.sb!=null&&m.sa!==m.sb)setRes(t,x.dataset.r,+x.dataset.i,m.sa>m.sb?m.a:m.b)}
  }
  else if(a=="cq"){var w=$("tw");if(w)w.hidden=!(x.value=="jugador"||x.value=="entrenador");return}
  else if(a=="coach")RO(t,OT).coach=x.value.trim();
  else if(a=="pp")RO(t,OT).pl[+x.dataset.i].pos=x.value.trim();
  else if(a=="lp"){LPL[x.dataset.k]=x.value;return}
  else if(a=="pfoto"){photo(x);return}
  else if(a=="tmaxp")t.maxp=Math.max(0,Math.floor(+x.value||0));
  else if(a=="tcupo")t.cupo=Math.max(0,Math.floor(+x.value||0));
  else if(a=="topen")t.open=x.value=="1";
  else if(a=="tname")t.name=x.value.trim();
  else if(a=="seas"){S.cur=+x.value;V="p";FILT={est:"",team:""};render();return}
  else if(a=="ttb"){var tb=(t.tb&&t.tb.length?t.tb.slice():["dif","fav"]);while(tb.length<3)tb.push("");tb[+x.dataset.j]=x.value;t.tb=tb}
  else if(a=="est"){var em=getM(t,x.dataset.r,x.dataset.i),ov=x.value;if(!canScore()||!em||em.live)return;if(ov=="aplazado"){delete em.date;delete em.time;delete em.court}if(ov)em.est=ov;else delete em.est;logAct(t,ov?"Partido "+ov:"Partido en estado programado",em.a+" vs "+em.b);if(ov=="cancelado"&&isK(t,x.dataset.r))toast("En llaves, el ganador se elige tocando su nombre (decisión de la organización).")}
  else if(a=="fest"){FILT.est=x.value;render();return}
  else if(a=="fteam"){FILT.team=x.value;render();return}
  else if(a=="logo"){logoUp(x,t);return}
  else if(a=="bkpin"){restore(x);return}
  else if(a=="trules")t.rules=x.value.trim().slice(0,1500);
  else if(a=="ttype")t.type=x.value;
  else if(a=="tdbl")t.dbl=x.value=="2";
  else if(a=="tng")t.ng=+x.value;
  else if(a=="tpw")t.pw=Math.max(0,Math.floor(+x.value||0));
  else if(a=="tpd")t.pd=Math.max(0,Math.floor(+x.value||0));
  else if(a=="tthird")t.third=x.value=="1";
  else if(a=="tbo")t.bo=+x.value;
  else if(a=="tbof")t.boF=+x.value;
  else return;
  save();render();
});
document.addEventListener("input",function(e){
  var x=e.target;if(!x.dataset||x.dataset.a!="rq"||!U)return;
  clearTimeout(RT);var q=x.value;
  RT=setTimeout(function(){U.search(q).then(function(r){RES=r.slice(0,8);var el=$("rres");if(el)el.innerHTML=RES.map(function(p){return'<button data-a="pick" data-id="'+esc(p.id)+'" data-n="'+esc(p.name||"Persona")+'">'+esc(p.name||"Persona")+'</button>'}).join("")}).catch(function(){})},250);
});
document.addEventListener("keydown",function(e){
  if(e.key!=="Enter")return;
  if(e.target.id==="pnm"){var b=document.querySelector("[data-a=ap]");if(b)b.click()}
  else if(e.target.id==="team")addTeam();
  else if(e.target.id==="cmt"){var bc=document.querySelector("[data-a=cmt]");if(bc)bc.click()}
  else if(e.target.id==="insn"){var bi=document.querySelector("[data-a=insc]");if(bi)bi.click()}
});
document.addEventListener("focusout",function(){if(PEND){PEND=false;setTimeout(render,80)}});
setInterval(function(){var c=$("clk");if(!c||SC!="vivo")return;var t=cur(),m=t?gm(t):null;if(m&&m.live&&m.live.k=="bas3")c.textContent=fmt(remT(m.live))},250);
render();boot();
