// Marcador en vivo
function gm(t){try{return LM?getM(t,LM.r,LM.i,LM.g):null}catch(e){return null}}
function gpar(t){try{return LM?getM(t,LM.r,LM.i):null}catch(e){return null}}
function newLive(t){
  var k=t.sport||"gen",L={k:k,st:"on",h:[],ev:[],ts0:Date.now()};
  if(k=="beis"){L.r={a:[0],b:[0]};L.inn=0;L.half="a";L.o=0}
  else if(k=="bas3"){L.p={a:0,b:0};L.f={a:0,b:0};L.rem=600000;L.run=false;L.t0=0}
  else if(k=="vol"){L.sets=[];L.cur=[0,0];L.w={a:0,b:0}}
  else L.p={a:0,b:0};
  return L;
}
function sync(m){
  var L=m.live,sum=function(a){return a.reduce(function(x,y){return x+y},0)};
  if(L.k=="beis"){m.sa=sum(L.r.a);m.sb=sum(L.r.b)}
  else if(L.k=="vol"){m.sa=L.w.a;m.sb=L.w.b}
  else{m.sa=L.p.a;m.sb=L.p.b}
}
function half(L){L.o=0;if(L.half=="a")L.half="b";else{L.half="a";L.inn++;L.r.a.push(0);L.r.b.push(0)}}
function evLab(L){
  if(L.k=="beis")return"Entrada "+(L.inn+1);
  if(L.k=="bas3")return fmt(remT(L));
  if(L.k=="vol")return"Set "+(L.sets.length+1);
  var d=new Date();return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
}
function liveAct(t,m,x,k,v){
  var L=m.live,h=L.h||[],ev=L.ev||[];delete L.h;delete L.ev;
  var snap=JSON.stringify(L),ch=x!="clk",lab=evLab(L),pl=(LPL&&LPL[k])||"",ent={a:0,r:null,ri:0};
  if(x=="undo"){
    var e=h.pop();if(!e){L.h=h;L.ev=ev;return}
    var nl=JSON.parse(typeof e=="string"?e:e.s);nl.h=h;
    if(typeof e!="string"){if(e.a)ev.pop();if(e.r)ev.splice(e.ri,0,e.r)}
    nl.ev=ev;m.live=nl;sync(m);return;
  }
  function addEv(o){o.k=k;o.p=pl;o.lab=lab;o.ts=Date.now();ev.push(o);ent.a=1}
  function popEv(xs){for(var j=ev.length-1;j>=0;j--)if(ev[j].k==k&&xs.indexOf(ev[j].x)>=0){ent.r=ev.splice(j,1)[0];ent.ri=j;return}}
  if(x=="yc"||x=="rc")addEv({x:x});
  else if(L.k=="beis"){
    if(x=="run"||x=="unrun"){var ar=L.r[k];while(ar.length<=L.inn)ar.push(0);ar[L.inn]=Math.max(0,ar[L.inn]+(x=="run"?1:-1));if(x=="run")addEv({x:"run",v:1});else popEv(["run"])}
    else if(x=="out"){L.o++;if(L.o>=3)half(L)}
    else if(x=="half")half(L);
  }else if(L.k=="bas3"){
    if(x=="pt"){L.p[k]+=v;addEv({x:"pt",v:v})}
    else if(x=="pm"){L.p[k]=Math.max(0,L.p[k]-1);popEv(["pt"])}
    else if(x=="foul"){L.f[k]+=1;addEv({x:"foul"})}
    else if(x=="clk"){if(L.run){L.rem=remT(L);L.run=false}else{L.t0=Date.now();L.run=true}}
  }else if(L.k=="vol"){
    var i=k=="a"?0:1,o=1-i;
    if(x=="pt"||x=="ace"||x=="blk"){addEv({x:x,v:1});L.cur[i]++;var tg=(L.w.a==NEED-1&&L.w.b==NEED-1)?15:25;
      if(L.cur[i]>=tg&&L.cur[i]-L.cur[o]>=2){L.sets.push(L.cur.slice());L.w[k]++;L.cur=[0,0];if(L.w[k]>=NEED)L.over=true}}
    else if(x=="pm"){L.cur[i]=Math.max(0,L.cur[i]-1);popEv(["pt","ace","blk"])}
  }else{if(x=="pt"){L.p[k]+=1;addEv({x:"pt",v:1})}else if(x=="pm"){L.p[k]=Math.max(0,L.p[k]-1);popEv(["pt"])}}
  if(ch){h.push({s:snap,a:ent.a,r:ent.r,ri:ent.ri});if(h.length>25)h.shift()}
  L.h=h;L.ev=ev;sync(m);
}
function finishLive(t,m){
  var L=m.live;sync(m);
  if(m.sa===m.sb&&(!sp(t).tie||isK(t,LM.r)||LM.g!=null)){toast("No puede terminar empatado. Sigue jugando o define el desempate.");return false}
  if(L.k=="vol"&&!L.over&&!confirm("El partido aún no termina. ¿Finalizar de todas formas?"))return false;
  if(L.run){L.rem=remT(L);L.run=false}
  L.st="fin";
  if(LM.g!=null)serie(t,LM.r,LM.i);else if(isK(t,LM.r))setRes(t,LM.r,LM.i,m.sa>m.sb?m.a:m.b);
  return true;
}
function liveList(){
  var o=[];
  function chk(t,r,i,m){if(m.bo>1&&m.g)m.g.forEach(function(g,gi){if(g.live&&g.live.st=="on")o.push({t:t,r:r,i:i,g:gi,m:m,x:g})});else if(m.live&&m.live.st=="on")o.push({t:t,r:r,i:i,g:null,m:m,x:m})}
  S.list.forEach(function(t){allKeyed(t).forEach(function(x){chk(t,x[0],x[1],x[2])})});
  return o;
}
function liveBlock(){
  var lv=liveList();if(!lv.length)return"";
  return'<h2>En vivo ahora</h2><div class="grid">'+lv.map(function(q){var t=q.t;return'<button class="tc" data-a="openlive" data-id="'+t.id+'" data-r="'+q.r+'" data-i="'+q.i+'"'+(q.g!=null?' data-g="'+q.g+'"':"")+' data-s="'+(t.sport||"gen")+'"><span class="ti">🔴</span><b>'+esc(q.m.a)+' '+q.x.sa+' - '+q.x.sb+' '+esc(q.m.b)+'</b><small>'+esc(t.name||"Torneo sin nombre")+(q.g!=null?", juego "+(q.g+1):"")+'</small></button>'}).join("")+'</div>';
}
function cb(x,k,v,l,c){return'<button'+(c?' class="'+c+'"':"")+' data-a="la" data-x="'+x+'" data-k="'+k+'"'+(v?' data-v="'+v+'"':"")+'>'+l+'</button>'}
function vVivo0(t){
  var m=gm(t),P=gpar(t)||m,h='<div class="row"><button data-a="go" data-s="dep">← Volver a la temporada</button></div>';
  if(!m||!P.a||!P.b)return h+'<p class="empty">Elige un partido desde la pestaña Torneo.</p>';
  var L=m.live,sc=canScore();if(LM.g!=null)h+='<p class="hint">Serie al mejor de '+P.bo+', juego '+(LM.g+1)+'.</p>';
  if(!L)return h+'<div class="rs"><b>'+esc(P.a)+' vs '+esc(P.b)+'</b><p class="hint">'+(sc?"Inicia el marcador en vivo. Todos verán los cambios al instante.":"El partido aún no empieza. Esta pantalla se actualiza sola.")+'</p>'+(sc?'<button class="pri" data-a="lstart">Iniciar partido en vivo</button>':"")+'</div>';
  var k=L.k,fn=L.st=="fin",d="",c="",A=esc(P.a),B=esc(P.b);
  function two(x1,l1,x2,l2){return'<span class="tn">'+A+'</span>'+cb(x1,"a",0,l1,"pri")+cb(x2,"a",0,l2)+'<span class="tn">'+B+'</span>'+cb(x1,"b",0,l1,"pri")+cb(x2,"b",0,l2)}
  if(k=="beis"){
    var n=Math.max(5,L.r.a.length),hd="<tr><th></th>",ra="<tr><td>"+A+"</td>",rb="<tr><td>"+B+"</td>";
    for(var j=0;j<n;j++){hd+="<th>"+(j+1)+"</th>";ra+="<td>"+(L.r.a[j]==null?"-":L.r.a[j])+"</td>";rb+="<td>"+(L.r.b[j]==null?"-":L.r.b[j])+"</td>"}
    var bt=L.half=="a"?A:B;
    d='<div class="tw"><table>'+hd+'</tr>'+ra+'</tr>'+rb+'</tr></table></div><p>Entrada '+(L.inn+1)+', batea '+bt+'. Outs: '+"●".repeat(L.o)+"○".repeat(3-L.o)+'</p>';
    c=cb("run",L.half,0,"+1 carrera "+bt,"pri")+cb("unrun",L.half,0,"−1 carrera")+cb("out",L.half,0,"Out")+cb("half",L.half,0,"Siguiente mitad");
  }else if(k=="bas3"){
    d='<div class="clk" id="clk">'+fmt(remT(L))+'</div><p>Faltas: '+A+' '+L.f.a+', '+B+' '+L.f.b+'</p>'+(m.sa>=21||m.sb>=21?'<p>Un equipo llegó a 21 puntos. Ya puedes finalizar.</p>':"");
    c='<span class="tn">'+A+'</span>'+cb("pt","a",1,"+1","pri")+cb("pt","a",2,"+2","pri")+cb("pm","a",0,"−1")+cb("foul","a",0,"Falta")+'<span class="tn">'+B+'</span>'+cb("pt","b",1,"+1","pri")+cb("pt","b",2,"+2","pri")+cb("pm","b",0,"−1")+cb("foul","b",0,"Falta")+cb("clk","a",0,L.run?"Pausar reloj":"Iniciar reloj","pri");
  }else if(k=="vol"){
    var dec=L.w.a==NEED-1&&L.w.b==NEED-1;
    d=(L.sets.length?'<p>'+L.sets.map(function(q,j){return"Set "+(j+1)+": "+q[0]+" - "+q[1]}).join("<br>")+'</p>':"")+(L.over?'<p>Terminó el partido. Ya puedes finalizar.</p>':'<p>Set '+(L.sets.length+1)+' en juego: <b>'+L.cur[0]+' - '+L.cur[1]+'</b> (a '+(dec?15:25)+', ganando por 2)</p>');
    c='<span class="tn">'+A+'</span>'+cb("pt","a",0,"+1 punto","pri")+cb("ace","a",0,"Ace")+cb("blk","a",0,"Bloqueo")+cb("pm","a",0,"−1")+'<span class="tn">'+B+'</span>'+cb("pt","b",0,"+1 punto","pri")+cb("ace","b",0,"Ace")+cb("blk","b",0,"Bloqueo")+cb("pm","b",0,"−1");
  }else c=two("pt","+1","pm","−1");
  h+='<div class="sb"><div class="st">'+(fn?"Final":"🔴 En vivo")+(k=="vol"?" (sets ganados)":"")+'</div><div class="sbr"><span>'+crest(t,P.a)+A+'</span><b>'+m.sa+'</b></div><div class="sbr"><span>'+crest(t,P.b)+B+'</span><b>'+m.sb+'</b></div>'+d+'</div>';
  if(sc&&!fn)h+=pickHtml(t,P,L)+'<div class="ctl">'+c+'</div>'+discHtml(A,B)+'<div class="ctl"><button data-a="lundo"'+((L.h||[]).length?"":" disabled")+'>Deshacer</button><button class="pri" data-a="lfin">Finalizar partido</button></div>';
  else if(sc)h+='<div class="ctl"><button data-a="lre">Reabrir partido</button></div>';
  else if(!fn)h+='<p class="hint">Marcador en vivo: se actualiza solo.</p>';
  return h+timeHtml(L,P);
}
function bos(v){v=+v||1;return[[1,"Partido único"],[3,"Mejor de 3"],[5,"Mejor de 5"],[7,"Mejor de 7"]].map(function(x){return'<option value="'+x[0]+'"'+(v==x[0]?" selected":"")+'>'+x[1]+'</option>'}).join("")}
function notifyDiff(){
  var now={},team=(UID&&ROLES[UID]&&ROLES[UID].team)||"",msgs=[];
  liveList().forEach(function(q){
    var k=q.t.id+"|"+q.r+"|"+q.i+"|"+q.g,x=q.x,sc=x.sa+"-"+x.sb;now[k]=sc;
    if(!(ALERTALL||(team&&(q.m.a===team||q.m.b===team))))return;
    if(LASTL&&LASTL[k]===undefined)msgs.push("🔴 Empieza: "+q.m.a+" vs "+q.m.b);
    else if(LASTL&&LASTL[k]!==sc)msgs.push("🔔 "+q.m.a+" "+x.sa+" - "+x.sb+" "+q.m.b);
  });
  LASTL=now;if(msgs.length)toast(msgs[msgs.length-1]);
}
function pickHtml(t,P,L){
  var Dn=discipline(t,L.ts0||Infinity);
  function sel(k,team){
    var R=((t.ro||{})[team]||{pl:[]}).pl||[],o='<option value="">'+esc(team)+': sin jugador</option>';
    R.filter(function(p){return p.st}).concat(R.filter(function(p){return !p.st})).forEach(function(p){
      var d=Dn[team+"|"+p.n];
      o+='<option value="'+esc(p.n)+'"'+(LPL[k]===p.n?" selected":"")+'>'+(p.num?p.num+" ":"")+esc(p.n)+(p.st?"":" (banca)")+(d&&d.pend>0?" - suspendido":"")+'</option>';
    });
    return'<div class="row"><select data-a="lp" data-k="'+k+'" aria-label="Jugador de '+esc(team)+'">'+o+'</select></div>';
  }
  return'<p class="hint">Elige quién anota para que cuente en las estadísticas.</p>'+sel("a",P.a)+sel("b",P.b);
}
function discHtml(A,B){return'<div class="ctl"><span class="tn">Tarjetas</span>'+cb("yc","a",0,"🟨 "+A)+cb("rc","a",0,"🟥 "+A)+cb("yc","b",0,"🟨 "+B)+cb("rc","b",0,"🟥 "+B)+'</div>'}
function timeHtml(L,P){
  var ev=(L.ev||[]).slice().reverse();
  if(!ev.length)return"";
  return'<h2>Línea de tiempo</h2><div class="rs">'+ev.map(function(e){
    return'<div class="pl"><b class="nu">'+esc(e.lab||"")+'</b><span class="pn">'+EVI[e.x]+" "+EVN[e.x]+(e.x=="pt"&&e.v>1?" +"+e.v:"")+(e.p&&!pub()?": "+esc(e.p):"")+'</span><span>'+esc(e.k=="a"?P.a:P.b)+'</span></div>';
  }).join("")+'</div>';
}
function vStats(t){
  var a=statsOf(t),D=discipline(t),u=t.sport=="vol"?"Puntos":sp(t).u,vo=t.sport=="vol";
  if(!a.length)return'<p class="empty">Aún no hay estadísticas. Se llenan al anotar en vivo eligiendo al jugador.</p>';
  var top=a.filter(function(x){return x.sc>0}).sort(function(x,y){return y.sc-x.sc}).slice(0,10);
  var h='<h2>Líderes de '+u.toLowerCase()+'</h2>'+(top.length?'<div class="tw"><table><tr><th>#</th><th>Jugador</th><th>'+u+'</th>'+(vo?"<th>Aces</th><th>Bloq.</th>":"")+'</tr>'+top.map(function(x,i){return'<tr'+(i==0?' class="top"':"")+'><td>'+(i+1)+'</td><td>'+esc(x.p)+' <small>'+esc(x.team)+'</small></td><td><b>'+x.sc+'</b></td>'+(vo?"<td>"+x.ace+"</td><td>"+x.blk+"</td>":"")+'</tr>'}).join("")+'</table></div>':'<p class="empty">Todavía nadie ha anotado.</p>');
  var dis=a.filter(function(x){return x.yc||x.rc||x.foul}).sort(function(x,y){return y.rc-x.rc||y.yc-x.yc||y.foul-x.foul});
  if(dis.length)h+='<h2>Disciplina</h2><div class="tw"><table><tr><th>#</th><th>Jugador</th><th>🟨</th><th>🟥</th><th>Faltas</th><th>Estado</th></tr>'+dis.map(function(x,i){var d=D[x.team+"|"+x.p];return'<tr><td>'+(i+1)+'</td><td>'+esc(x.p)+' <small>'+esc(x.team)+'</small></td><td>'+x.yc+'</td><td>'+x.rc+'</td><td>'+x.foul+'</td><td>'+(d&&d.pend>0?"⛔ Suspendido":"Habilitado")+'</td></tr>'}).join("")+'</table></div><p class="hint">Dos amarillas o una roja suspenden al jugador en su siguiente partido anotado en vivo.</p>';
  return h;
}
function vVivo(t){
  var out=vVivo0(t),P=gpar(t)||gm(t);
  if(!P||!P.a||!P.b||!LM)return out;
  var m=gm(t),mk=mkey(t,LM.r,LM.i,LM.g),done=m&&m.live&&m.live.st=="fin";
  var extra=done?"":(pub()?"":attHtml(P,mk))+predHtml(t,P,m);
  return out.replace("</div>","</div>"+extra)+comHtml(mk);
}
