// Modo manager y capitán: pantalla "Mi equipo"
function wantsTeam(r){return r=="jugador"||r=="entrenador"||r=="capitan"}
function myTeam(){var r=UID&&DB?ROLES[UID]:null;return r&&wantsTeam(r.role)?(r.team||""):""}
function myModeName(){return{entrenador:"Modo manager",capitan:"Modo capitán",jugador:"Modo jugador"}[myRole()]||""}
function canLineup(n){var r=ROLES[UID];return canRoster(n)||(!!r&&r.role=="capitan"&&r.team===n)}
function myEds(){var n=myTeam();return n?eds().filter(function(t){return !t.arch&&t.teams.indexOf(n)>=0}):[]}
function myMatches(t,n){return matchRows0(t).filter(function(x){return x.m.a===n||x.m.b===n})}
function attOk(t,x,n){var side=x.m.a===n?"a":"b",a=ATT[mkey(t,x.r,x.i,null)+"_"+side];return !!(a&&a.team===n)}
function pendAtt(){
  var n=myTeam(),c=0;if(!n)return 0;
  myEds().forEach(function(t){myMatches(t,n).forEach(function(x){if((x.e=="programado"||x.e=="aplazado")&&!attOk(t,x,n))c++})});
  return c;
}
function posOf(t,n){
  if(!G(t)||(t.type!="liga"&&t.type!="grupos"))return"";
  var gg=(t.gr||[]).filter(function(g){return g.teams.indexOf(n)>=0})[0];
  var tb=t.type=="liga"?table(t):table({teams:(gg||{teams:[]}).teams,matches:(gg||{matches:[]}).matches,sport:t.sport,type:"liga",pw:t.pw,pd:t.pd,tb:t.tb,id:t.id});
  for(var i=0;i<tb.length;i++)if(tb[i].n===n)return(i+1)+"º";
  return"";
}
function mini(){
  var n=myTeam(),p=pendAtt();
  return'<div class="rs"><div class="pl" style="border:0"><i class="chip t1">'+ic("users")+'</i><span class="pn"><b>Mi equipo: '+esc(n)+'</b><br><span class="hint">'+myModeName()+(p?". "+pl(p,"partido sin confirmar asistencia","partidos sin confirmar asistencia")+".":".")+'</span></span><button class="pri" data-a="go" data-s="miequipo">Abrir Mi equipo</button></div></div>';
}
function mmRow(t,x,n){
  var m=x.m,side=m.a===n?"a":"b",ok=attOk(t,x,n),inf=EST[x.e];
  return'<div class="mrow"><div class="mt1"><span class="tn">'+crest(t,m.a)+esc(m.a)+'</span><span class="vs">VS</span><span class="tn">'+crest(t,m.b)+esc(m.b)+'</span></div>'+
    '<div class="mt2"><span class="tag '+tagFor(x.e)+'">'+inf[0]+" "+inf[1]+'</span><span>'+ic("clock")+(m.date?esc(m.date.slice(5))+" ":"")+esc(m.time||(m.date?"":"Sin fecha"))+'</span>'+(m.court?'<span>'+ic("pin")+esc(m.court)+'</span>':"")+'</div>'+
    '<div class="mi"><span>'+(ok?"✅ Asistencia confirmada":"⏳ Sin confirmar")+'</span>'+(canConf(n)?'<button class="'+(ok?"":"pri")+'" data-a="attm" data-id="'+t.id+'" data-r="'+x.r+'" data-i="'+x.i+'" data-k="'+side+'">'+(ok?"Quitar confirmación":"Confirmar asistencia")+'</button>':"")+'</div></div>';
}
function capLineup(t,n){
  var R=RO(t,n),X=sp(t),ms=MSG,D=discipline(t),st=R.pl.filter(function(p){return p.st}).length;MSG="";
  return'<div class="rs"><b>Alineación</b><p class="hint">Titulares: '+st+(X.max?" de "+X.max:"")+'. Toca el botón para pasar a un jugador entre titulares y banca.</p>'+(ms?'<p class="hint">'+esc(ms)+'</p>':"")+
    (R.pl.length?R.pl.map(function(p,i){var d=D[n+"|"+p.n];return'<div class="pl rr"><span class="av">'+esc(String(p.n||"?").slice(0,1).toUpperCase())+'</span><span class="pn">'+esc(p.n)+(p.cap?" <small>Capitán</small>":"")+(d&&d.pend>0?' <small class="sus">Suspendido</small>':"")+'<br><span class="hint">'+esc(p.pos||"Sin posición")+'</span></span><b class="num">#'+esc(p.num||"-")+'</b><button data-a="st" data-i="'+i+'" class="'+(p.st?"pri":"")+'">'+(p.st?"Titular":"Banca")+'</button></div>'}).join(""):'<p class="empty">La plantilla está vacía. El manager puede agregar jugadores.</p>')+'</div>';
}
function roLineup(t,n){
  var R=RO(t,n);
  return'<div class="rs">'+((R.pl||[]).length?R.pl.map(function(p){return'<div class="pl rr"><span class="av">'+esc(String(p.n||"?").slice(0,1).toUpperCase())+'</span><span class="pn">'+esc(p.n)+(p.cap?" <small>Capitán</small>":"")+(p.st?"":" <small>Banca</small>")+'<br><span class="hint">'+esc(p.pos||"Sin posición")+'</span></span><b class="num">#'+esc(p.num||"-")+'</b></div>'}).join(""):'<p class="empty">Todavía no hay jugadores registrados.</p>')+'</div>';
}
function vMiEquipo(){
  var n=myTeam();
  if(!n)return'<div class="rs"><b>Mi equipo</b><p class="hint">Tu cuenta todavía no tiene un equipo asignado. Pide al coordinador que te asigne como manager, capitán o jugador de un equipo.</p></div>';
  var E=myEds();
  if(!E.length)return'<div class="rs"><b>'+esc(n)+'</b><p class="hint">Tu equipo todavía no está inscrito en ninguna edición activa.</p></div>';
  var t=E.filter(function(x){return x.id===S.cur})[0]||E[0];S.cur=t.id;OT=n;
  var md=myRole(),s=teamStats(t,n),pos=posOf(t,n),rows=myMatches(t,n),hoy=todayISO(),R=RO(t,n),X=sp(t),D=discipline(t);
  var prox=rows.filter(function(x){return x.e=="programado"||x.e=="aplazado"||x.e=="en curso"}),rec=rows.filter(function(x){return x.e=="finalizado"&&x.m.sa!=null&&x.m.sb!=null}).slice(-5).reverse();
  var h='<div class="tp">'+E.map(function(x){return'<button data-a="medi" data-id="'+x.id+'" class="'+(x.id===t.id?"on":"")+'">'+(SPI[x.sport]||"")+" "+esc(capi(rl(x)))+", "+esc(x.name||"Edición")+'</button>'}).join("")+'</div>';
  h+='<div class="hero2 team"><div class="big">'+crest(t,n)+'</div><div><span class="tag acc">'+myModeName()+'</span><h2>'+esc(n)+'</h2><p>'+(SPI[t.sport]||"")+" "+esc(SPN[t.sport])+" "+esc(rl(t))+", "+esc(t.name||"Edición")+'</p></div></div>';
  h+='<div class="kpis">'+(pos?kpi("Posición",pos,"En la tabla","trophy","t4"):"")+kpi("Partidos jugados",s.pj,"En esta edición","calendar","t1")+kpi("Ganados",s.g,s.e?pl(s.e,"empate","empates"):"Sin empates","check","t2")+kpi("Perdidos",s.p,"A favor "+s.gf+", en contra "+s.gc,"bolt","t5")+'</div>';
  var al=[],sinc=prox.filter(function(x){return(x.e=="programado"||x.e=="aplazado")&&!attOk(t,x,n)}).length;
  if(sinc)al.push(pl(sinc,"partido sin confirmar asistencia","partidos sin confirmar asistencia"));
  var sus=Object.keys(D).filter(function(k){return k.indexOf(n+"|")==0&&D[k].pend>0}).map(function(k){return D[k].p});
  if(sus.length)al.push("Suspendidos para el próximo partido: "+sus.join(", "));
  var nst=(R.pl||[]).filter(function(p){return p.st}).length;
  if(!(R.pl||[]).length)al.push("La plantilla está vacía.");else if(X.max&&nst<X.max)al.push("Faltan titulares: "+nst+" de "+X.max);
  h+='<h2>Pendientes</h2><div class="rs">'+(al.length?al.map(function(a){return'<div class="pl"><i class="chip t4">'+ic("bolt")+'</i><span class="pn">'+esc(a)+'</span></div>'}).join(""):'<p class="empty">Todo al día.</p>')+'</div>';
  h+='<h2>Próximos partidos</h2>'+(prox.length?prox.map(function(x){return mmRow(t,x,n)}).join(""):'<div class="rs"><p class="empty">Tu equipo no tiene partidos pendientes.</p></div>');
  h+='<h2>'+(md=="entrenador"?"Plantilla y alineación":"Alineación")+'</h2>';
  h+=md=="entrenador"?viewE(t,true):md=="capitan"?capLineup(t,n):roLineup(t,n);
  h+='<h2>Resultados recientes</h2>'+(rec.length?rec.map(mrow).join(""):'<div class="rs"><p class="empty">Todavía no hay resultados.</p></div>');
  var dc=Object.keys(D).filter(function(k){return k.indexOf(n+"|")==0&&(D[k].yc||D[k].rc||D[k].pend)}).map(function(k){return D[k]});
  if(dc.length)h+='<h2>Disciplina</h2><div class="rs">'+dc.map(function(d){return'<div class="pl"><span class="pn">'+esc(d.p)+(d.pend>0?' <small class="sus">Suspendido</small>':"")+'</span><span class="hint">'+d.yc+" amarillas, "+d.rc+" rojas</span></div>"}).join("")+'</div>';
  return h;
}
