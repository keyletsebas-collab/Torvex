// Clasificación, desempates, campeones, estadísticas y disciplina
function tbList(t){return(t.tb&&t.tb.length?t.tb:["dif","fav"]).filter(Boolean)}
function tbName(c){var q=TBO.filter(function(x){return x[0]==c})[0];return q?q[1]:c}
function awardPts(t,m){
  var pd=t.pd!=null?t.pd:1,pw=t.pw!=null?t.pw:3,d=Math.abs(m.sa-m.sb);
  if(!d)return[pd,pd];
  var v=t.sport=="vol"&&d<2,win=v?2:pw,lose=v?1:0;
  return m.sa>m.sb?[win,lose]:[lose,win];
}
function table(t){
  var o={};
  t.teams.forEach(function(n){o[n]={n:n,pj:0,g:0,e:0,p:0,gf:0,gc:0,pt:0}});
  t.matches.forEach(function(m){
    if(!fin(t,m))return;
    var A=o[m.a],B=o[m.b],pp=awardPts(t,m),d=Math.abs(m.sa-m.sb);
    A.pj++;B.pj++;A.gf+=m.sa;A.gc+=m.sb;B.gf+=m.sb;B.gc+=m.sa;A.pt+=pp[0];B.pt+=pp[1];
    if(!d){A.e++;B.e++}else if(m.sa>m.sb){A.g++;B.p++}else{B.g++;A.p++}
  });
  var rows=Object.keys(o).map(function(k){return o[k]}).sort(function(x,y){return y.pt-x.pt}),out=[],i=0;
  while(i<rows.length){var j=i;while(j<rows.length&&rows[j].pt==rows[i].pt)j++;out=out.concat(rank(rows.slice(i,j),tbList(t),t));i=j}
  return out;
}
function rank(rows,crit,t){
  if(rows.length<2||!crit.length)return rows;
  var c=crit[0],rest=crit.slice(1),key;
  if(c=="alf")return rows.slice().sort(function(x,y){return x.n.localeCompare(y.n)});
  if(c=="h2h"){
    var nm={},mini={};
    rows.forEach(function(q){nm[q.n]=1;mini[q.n]=0});
    t.matches.forEach(function(m){if(!nm[m.a]||!nm[m.b]||!fin(t,m))return;var pp=awardPts(t,m);mini[m.a]+=pp[0];mini[m.b]+=pp[1]});
    key=function(q){return mini[q.n]};
  }else key={dif:function(q){return q.gf-q.gc},fav:function(q){return q.gf},con:function(q){return -q.gc},gan:function(q){return q.g}}[c]||function(){return 0};
  var sr=rows.slice().sort(function(x,y){return key(y)-key(x)}),out=[],i=0;
  while(i<sr.length){var j=i;while(j<sr.length&&key(sr[j])==key(sr[i]))j++;out=out.concat(rank(sr.slice(i,j),rest,t));i=j}
  return out;
}
function champ(t){if(!G(t))return"";if(t.type=="dele"){var f=t.de.F[0];return f.w&&f.w!==BYE?f.w:""}if(t.type=="elim"||t.type=="grupos"){var rs=t.rounds||[];return rs.length?(rs[rs.length-1][0].w||""):""}return t.matches.every(function(m){return m.est=="cancelado"||fin(t,m)})?table(t)[0].n:""}
function prog(t){var all=ms(t).filter(function(m){return m.a&&m.b&&m.a!==BYE&&m.b!==BYE});var pl=all.filter(function(m){return m.w||(t.type!="elim"&&t.type!="dele"&&fin(t,m))}).length;if(t.type=="liga"||t.type=="elim")return pl+" de "+(t.type=="elim"?t.teams.length-1:t.matches.filter(function(m){return m.est!="cancelado"}).length)+" partidos jugados";return pl+" partidos jugados"}

function summary(t,c){
  var all=ms(t).filter(function(m){return m.a&&m.b&&m.a!==BYE&&m.b!==BYE&&m.sa!=null&&m.sb!=null&&(!m.live||m.live.st=="fin")});
  if(!all.length)return"";
  var tot=0,cl=null,bg=null;
  all.forEach(function(m){tot+=m.sa+m.sb;var d=Math.abs(m.sa-m.sb);if(!cl||d<cl.d)cl={m:m,d:d};if(!bg||d>bg.d)bg={m:m,d:d}});
  var ru="";
  if(t.type=="liga"){var tb=table(t);ru=tb[1]?tb[1].n:""}
  else{var f=t.type=="dele"?t.de.F[0]:t.rounds[t.rounds.length-1][0];ru=f.w===f.a?f.b:f.a}
  function ml(x){return esc(x.m.a)+" "+x.m.sa+" - "+x.m.sb+" "+esc(x.m.b)}
  var sl=statsOf(t).sort(function(x,y){return y.sc-x.sc})[0];
  return'<div class="rs"><b>Resumen del torneo</b><p class="hint">Campeón: '+esc(c)+(ru&&ru!==BYE?". Subcampeón: "+esc(ru):"")+". Partidos con marcador: "+all.length+". Total de "+sp(t).u.toLowerCase()+": "+tot+'.</p><p class="hint">Partido más cerrado: '+ml(cl)+". Mayor diferencia: "+ml(bg)+"."+(sl&&sl.sc>0&&!pub()?" Máximo anotador: "+esc(sl.p)+" ("+esc(sl.team)+", "+sl.sc+").":"")+'</p></div>';
}
function liveObjs(t){
  var o=[];
  allKeyed(t).forEach(function(k){var m=k[2];if(m.live)o.push({x:m,a:m.a,b:m.b});(m.g||[]).forEach(function(g){if(g.live)o.push({x:g,a:m.a,b:m.b})})});
  o.sort(function(p,q){return(p.x.live.ts0||0)-(q.x.live.ts0||0)});
  return o;
}
function discipline(t,before){
  var D={};
  liveObjs(t).forEach(function(q){
    if(before!=null&&(q.x.live.ts0||0)>=before)return;
    [q.a,q.b].forEach(function(team){Object.keys(D).forEach(function(kk){if(D[kk].team===team&&D[kk].pend>0)D[kk].pend--})});
    (q.x.live.ev||[]).forEach(function(e){
      if(!e.p)return;
      var team=e.k=="a"?q.a:q.b,kk=team+"|"+e.p,d=D[kk]||(D[kk]={team:team,p:e.p,yc:0,rc:0,pend:0});
      if(e.x=="yc"){d.yc++;if(d.yc%2==0)d.pend++}else if(e.x=="rc"){d.rc++;d.pend++}
    });
  });
  return D;
}
function statsOf(t){
  var Z={};
  liveObjs(t).forEach(function(q){(q.x.live.ev||[]).forEach(function(e){
    if(!e.p)return;
    var team=e.k=="a"?q.a:q.b,kk=team+"|"+e.p,d=Z[kk]||(Z[kk]={team:team,p:e.p,sc:0,ace:0,blk:0,foul:0,yc:0,rc:0});
    if(e.x=="run"||e.x=="pt"||e.x=="ace"||e.x=="blk")d.sc+=(e.v||1);
    if(e.x=="ace")d.ace++;if(e.x=="blk")d.blk++;if(e.x=="foul")d.foul++;if(e.x=="yc")d.yc++;if(e.x=="rc")d.rc++;
  })});
  return Object.keys(Z).map(function(k){return Z[k]});
}
function winOf(t,m){
  if(!m)return null;
  if(m.w&&m.w!==BYE)return m.w===m.a?"a":"b";
  if(!(m.bo>1)&&fin(t,m)&&m.sa!==m.sb)return m.sa>m.sb?"a":"b";
  return null;
}
function predRank(){
  var sc={};
  S.list.forEach(function(t){allKeyed(t).forEach(function(k){
    var w=winOf(t,k[2]);if(!w)return;
    var key=mkey(t,k[0],k[1],null);
    Object.keys(PREDS).forEach(function(u){var v=(PREDS[u]||{})[key];if(!v)return;var o=sc[u]||(sc[u]={ok:0,n:0});o.n++;if(v==w)o.ok++})
  })});
  return Object.keys(sc).map(function(u){return{u:u,ok:sc[u].ok,n:sc[u].n,name:PNAME[u]||""}}).sort(function(a,b){return b.ok-a.ok||a.n-b.n}).slice(0,10);
}
function runner(t){
  if(!champ(t))return"";
  if(t.type=="liga"){var tb=table(t);return tb[1]?tb[1].n:""}
  var f=t.type=="dele"?t.de.F[0]:t.rounds[t.rounds.length-1][0],q=f.w===f.a?f.b:f.a;
  return q===BYE?"":q;
}
function placeOf(t,team){
  var c=champ(t);
  if(c&&team===c)return"Campeón";
  if(c&&team===runner(t))return"Subcampeón";
  if(t.tp&&t.tp.w&&team===t.tp.w)return"Tercer lugar";
  return"Participación";
}
function estOf(t,m){
  if(m.est=="cancelado")return"cancelado";
  if(m.bo>1?!!m.w:(!!m.w||fin(t,m)))return"finalizado";
  if((m.live&&m.live.st=="on")||(m.g||[]).some(function(g){return g&&g.live&&g.live.st=="on"}))return"en curso";
  return m.est=="aplazado"?"aplazado":"programado";
}
function seasonInfo(t){
  var pl=ms(t).filter(function(m){return m.a&&m.b&&m.a!==BYE&&m.b!==BYE&&estOf(t,m)=="finalizado"}),tot=0,c=champ(t);
  pl.forEach(function(m){if(m.sa!=null&&m.sb!=null)tot+=m.sa+m.sb});
  var st=pub()?null:statsOf(t).sort(function(x,y){return y.sc-x.sc})[0];
  return{c:c,ru:c?runner(t):"",third:(t.tp&&t.tp.w)||"",n:pl.length,tot:tot,top:st&&st.sc>0?st:null};
}
function palmares(k){
  var o={};seasons(k).forEach(function(t){var c=champ(t);if(c)o[c]=(o[c]||0)+1});
  return Object.keys(o).map(function(n){return[n,o[n]]}).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0])});
}
