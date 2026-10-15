// Formatos de competición: ligas, llaves, grupos y doble eliminación
function generate(t){
  var tm=shuffle(t.teams);
  if(t.type=="grupos"){genGroups(t,tm);return}
  if(t.type=="dele"){genDE(t,tm);return}
  if(t.type=="liga"){t.matches=[];for(var i=0;i<tm.length;i++)for(var j=i+1;j<tm.length;j++)t.matches.push({a:tm[i],b:tm[j]});if(t.dbl){var n0=t.matches.length;for(var q=0;q<n0;q++)t.matches.push({a:t.matches[q].b,b:t.matches[q].a})}return}
  var size=1;while(size<tm.length)size*=2;
  while(tm.length<size)tm.push(null);
  var first=[],rs=[first],n=size/2,i;
  for(i=0;i<n;i++)first.push({a:tm[i],b:tm[size-1-i],w:null});
  while(n>1){n/=2;var r=[];for(i=0;i<n;i++)r.push({a:null,b:null,w:null});rs.push(r)}
  t.rounds=rs;
  rs.forEach(function(rd,ri){var b=ri==rs.length-1?(+t.boF||+t.bo||1):(+t.bo||1);rd.forEach(function(m){if(b>1&&(ri>0||(m.a&&m.b))){m.bo=b;m.g=[{}]}else m.bo=1})});
  first.forEach(function(m,i){if(!m.a||!m.b)setWin(t,0,i,m.a||m.b)});
  t.tp=null;syncThird(t);
}
function setWin(t,r,i,name){
  var m=t.rounds[r][i];m.w=name;
  if(r+1<t.rounds.length){
    var nx=t.rounds[r+1][i>>1],sl=i%2?"b":"a",chg=nx[sl]!==name;nx[sl]=name;
    if(chg&&nx.bo>1){nx.g=[{}];nx.sa=null;nx.sb=null;if(nx.w)setWin(t,r+1,i>>1,null)}
    if(nx.w&&nx.w!==nx.a&&nx.w!==nx.b)setWin(t,r+1,i>>1,null);
  }
  syncThird(t);
}
function gdone(x){return x.sa!=null&&x.sb!=null&&x.sa!==x.sb&&(!x.live||x.live.st=="fin")}
function serie(t,r,i){
  var m=getM(t,r,i),need=Math.ceil(m.bo/2),wa=0,wb=0,g=m.g;
  g.forEach(function(x){if(gdone(x)){if(x.sa>x.sb)wa++;else wb++}});
  m.sa=wa;m.sb=wb;
  var w=wa>=need?m.a:wb>=need?m.b:null;
  if(w){while(g.length>1&&!g[g.length-1].live&&g[g.length-1].sa==null&&g[g.length-1].sb==null)g.pop()}
  else if(g.every(function(x){return gdone(x)})&&g.length<m.bo)g.push({});
  setWin(t,+r,+i,w);
}
function gl(t){
  var o=[];
  ms(t).forEach(function(m){
    if(!m.a||!m.b||m.a===BYE||m.b===BYE)return;
    if(m.bo>1&&m.g)m.g.forEach(function(g,gi){o.push({a:m.a,b:m.b,date:g.date,time:g.time,sa:g.sa,sb:g.sb,n:" (juego "+(gi+1)+")"})});
    else o.push(m);
  });
  return o;
}
function setRes(t,r,i,name){
  if(r==="T"){t.tp.w=name;return}
  if(t.type=="dele"){deWin(t,r,+i,name);deAuto(t);return}
  setWin(t,+r,+i,name);
}
function syncThird(t){
  if(!t.third||!t.rounds||t.rounds.length<2||(t.type!="elim"&&t.type!="grupos"))return;
  var sf=t.rounds[t.rounds.length-2],ls=sf.map(function(m){return m.w?(m.w===m.a?m.b:m.a):null});
  var tp=t.tp||(t.tp={a:null,b:null,w:null,bo:1});
  if(tp.a!==ls[0]||tp.b!==ls[1]){tp.a=ls[0];tp.b=ls[1];tp.sa=null;tp.sb=null;tp.w=null;tp.live=null}
}
function setBo(t,rs){rs.forEach(function(rd,ri){var b=ri==rs.length-1?(+t.boF||+t.bo||1):(+t.bo||1);rd.forEach(function(m){if(b>1&&(ri>0||(m.a&&m.b))){m.bo=b;m.g=[{}]}else m.bo=1})})}
function genGroups(t,tm){
  var ng=+t.ng||(tm.length>=12?4:2);ng=Math.max(1,Math.min(ng,Math.floor(tm.length/2)));if(ng==3)ng=2;
  var gr=[],q;
  for(q=0;q<ng;q++)gr.push({n:"Grupo "+String.fromCharCode(65+q),teams:[],matches:[]});
  tm.forEach(function(n,k){var row=Math.floor(k/ng),c=k%ng;gr[row%2?ng-1-c:c].teams.push(n)});
  gr.forEach(function(g){
    for(var i=0;i<g.teams.length;i++)for(var j=i+1;j<g.teams.length;j++)g.matches.push({a:g.teams[i],b:g.teams[j]});
    if(t.dbl){var n0=g.matches.length;for(var z=0;z<n0;z++)g.matches.push({a:g.matches[z].b,b:g.matches[z].a})}
  });
  t.gr=gr;t.rounds=[];t.tp=null;
}
function genKO(t){
  var st=t.gr.map(function(g){return table({teams:g.teams,matches:g.matches,sport:t.sport,type:"liga",pw:t.pw,pd:t.pd,tb:t.tb,id:t.id})}),ng=st.length,first=[],q;
  function nm(q,k){return st[q][k]?st[q][k].n:null}
  if(ng==1)first.push({a:nm(0,0),b:nm(0,1)});
  else{for(q=0;q<ng;q+=2)first.push({a:nm(q,0),b:nm(q+1,1)});for(q=0;q<ng;q+=2)first.push({a:nm(q+1,0),b:nm(q,1)})}
  var n=first.length,rs=[first.map(function(m){return{a:m.a,b:m.b,w:null}})];
  while(n>1){n/=2;var rd=[];for(var i=0;i<n;i++)rd.push({a:null,b:null,w:null});rs.push(rd)}
  t.rounds=rs;setBo(t,rs);t.tp=null;
  rs[0].forEach(function(m,i){if(!m.a||!m.b)setWin(t,0,i,m.a||m.b)});
  syncThird(t);
}
function deM(t,key,i){return key=="F"?t.de.F[0]:t.de[key[0]][+key.slice(1)][i]}
function dm(t,key,i){
  var k=t.de.W.length;
  if(key=="F")return{w:null,l:null};
  var ty=key[0],r=+key.slice(1);
  if(ty=="W"){
    var w=r==k-1?["F",0,"a"]:["W"+(r+1),i>>1,i%2?"b":"a"],l;
    if(r==0)l=["L0",i>>1,i%2?"b":"a"];
    else l=["L"+(2*r-1),t.de.W[r].length-1-i,"b"];
    return{w:w,l:l};
  }
  var q=r+1,tot=2*(k-1),w2;
  if(q==tot)w2=["F",0,"b"];
  else if(q%2==1)w2=["L"+q,i,"a"];
  else w2=["L"+q,i>>1,i%2?"b":"a"];
  return{w:w2,l:null};
}
function dput(t,d,v){
  if(!d)return;
  var m=deM(t,d[0],d[1]),s=d[2];
  if(m[s]===v)return;
  if(v===undefined)delete m[s];else m[s]=v;
  if(m.w!==undefined){m.sa=null;m.sb=null;m.live=null;deWin(t,d[0],d[1],undefined)}
}
function deWin(t,key,i,name){
  if(name==null)name=undefined;
  var m=deM(t,key,i),d=dm(t,key,i);
  if(name===undefined)delete m.w;else m.w=name;
  var lo=name===undefined?undefined:(name===m.a?m.b:m.a);
  dput(t,d.w,name);dput(t,d.l,lo);
}
function deAuto(t){
  var ch=true,g=0;
  function auto(key,i,m){if(m.w!==undefined||m.a===undefined||m.b===undefined)return;if(m.a===BYE||m.b===BYE){ch=true;deWin(t,key,i,m.a===BYE?m.b:m.a)}}
  while(ch&&g++<60){
    ch=false;
    ["W","L"].forEach(function(ty){t.de[ty].forEach(function(rd,r){rd.forEach(function(m,i){auto(ty+r,i,m)})})});
    auto("F",0,t.de.F[0]);
  }
}
function genDE(t,tm){
  var N=2;while(N<tm.length)N*=2;
  var k=Math.round(Math.log(N)/Math.LN2),W=[],L=[],i,n;
  tm=tm.slice();while(tm.length<N)tm.push(BYE);
  for(var r=0;r<k;r++){n=N/Math.pow(2,r+1);var rd=[];for(i=0;i<n;i++)rd.push({});W.push(rd)}
  for(i=0;i<N/2;i++){W[0][i].a=tm[i];W[0][i].b=tm[N-1-i]}
  for(var q=1;q<=2*(k-1);q++){n=N/Math.pow(2,Math.ceil(q/2)+1);var r2=[];for(i=0;i<n;i++)r2.push({});L.push(r2)}
  t.de={W:W,L:L,F:[{}]};t.rounds=[];t.tp=null;
  deAuto(t);
}
function allKeyed(t){
  var o=[];
  if(t.type=="liga")t.matches.forEach(function(m,i){o.push(["L",i,m])});
  if(t.type=="grupos")(t.gr||[]).forEach(function(g,gi){g.matches.forEach(function(m,i){o.push(["G"+gi,i,m])})});
  (t.rounds||[]).forEach(function(rd,r){rd.forEach(function(m,i){o.push([r,i,m])})});
  if(t.de){["W","L"].forEach(function(k){t.de[k].forEach(function(rd,r){rd.forEach(function(m,i){o.push([k+r,i,m])})})});o.push(["F",0,t.de.F[0]])}
  if(t.tp)o.push(["T",0,t.tp]);
  return o;
}
