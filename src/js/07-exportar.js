// Compartir, diplomas, imágenes y PDF
function shareText(t){
  var L=[sp(t).i+" "+(t.name||"Torneo")+" ("+fmtN(t)+")"],c=champ(t);
  if(c)L.push("🏆 Campeón: "+c);
  function tb(x,title){if(title)L.push(title);table(x).slice(0,8).forEach(function(r,i){L.push((i+1)+". "+r.n+" - "+r.pt+" pts ("+r.pj+" PJ)")})}
  if(t.type=="liga")tb(t);
  if(t.type=="grupos")t.gr.forEach(function(g){tb({teams:g.teams,matches:g.matches,sport:t.sport,type:"liga",pw:t.pw,pd:t.pd,tb:t.tb,id:t.id},g.n)});
  var f=ms(t).filter(function(m){return m.a&&m.b&&m.a!==BYE&&m.b!==BYE&&m.sa!=null&&m.sb!=null&&(!m.live||m.live.st=="fin")}).slice(-5);
  if(f.length){L.push("Últimos resultados:");f.forEach(function(m){L.push(m.a+" "+m.sa+" - "+m.sb+" "+m.b)})}
  return L.join("\n");
}
function shareBar(t){return'<div class="ctl"><button data-a="cpy">Copiar resumen</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(shareText(t))+'">Compartir por WhatsApp</a><button data-a="simg" data-f="png">Descargar imagen</button><button data-a="simg" data-f="pdf">Descargar PDF</button></div>'+dipHtml(t)}
function dipHtml(t){
  if(!G(t))return"";
  return'<h2>Diplomas</h2><div class="rs"><label for="dpt">Equipo</label><div class="row"><select id="dpt">'+t.teams.map(function(n){return'<option>'+esc(n)+'</option>'}).join("")+'</select></div><label for="dpn">Nombre en el diploma (opcional)</label><div class="row"><input type="text" id="dpn" maxlength="40" placeholder="Si lo dejas vacío usa el nombre del equipo"></div><div class="ctl"><button class="pri" data-a="dip" data-f="png">Descargar PNG</button><button data-a="dip" data-f="pdf">Descargar PDF</button></div></div>';
}
function fitFont(x,txt,w,size,fam,wt){while(size>24){x.font=wt+" "+size+"px "+fam;if(x.measureText(txt).width<=w)break;size-=4}return size}
function drawCert(who,place,t){
  var c=document.createElement("canvas");c.width=1600;c.height=1131;
  var x=c.getContext("2d"),F="'Bricolage Grotesque',sans-serif",C="'Chakra Petch',sans-serif";
  x.fillStyle="#ffffff";x.fillRect(0,0,1600,1131);
  x.fillStyle="#0f3d33";x.fillRect(0,0,1600,170);
  x.fillStyle="#ffb800";x.fillRect(0,170,1600,12);
  x.strokeStyle="#0f3d33";x.lineWidth=10;x.strokeRect(40,40,1520,1051);
  x.textAlign="center";x.textBaseline="alphabetic";
  x.fillStyle="#ffb800";x.font="700 80px "+C;x.fillText("DIPLOMA",800,115);
  x.fillStyle="#0d2b24";x.font="500 44px "+F;x.fillText("Se otorga a",800,320);
  fitFont(x,who,1300,120,F,800);x.fillText(who,800,470);
  x.font="500 44px "+F;x.fillText(place=="Participación"?"por su":"por obtener el",800,570);
  x.fillStyle="#0f3d33";x.font="800 110px "+F;x.fillText((place=="Campeón"?"🏆 ":"")+place,800,700);
  x.fillStyle="#0d2b24";x.font="500 44px "+F;x.fillText("en el torneo",800,790);
  var nm=sp(t).i+" "+(t.name||"Torneo escolar");fitFont(x,nm,1300,72,F,700);x.fillText(nm,800,880);
  x.fillStyle="#5f7a72";x.font="500 34px "+F;x.fillText(new Date(t.id).getFullYear()+"  |  "+fmtN(t),800,950);
  x.strokeStyle="#0d2b24";x.lineWidth=3;x.beginPath();x.moveTo(560,1030);x.lineTo(1040,1030);x.stroke();
  x.font="500 28px "+F;x.fillText("Organización del torneo",800,1068);
  return c;
}
function drawSummary(t){
  var c=document.createElement("canvas");c.width=1080;c.height=1350;
  var x=c.getContext("2d"),F="'Bricolage Grotesque',sans-serif",C="'Chakra Petch',sans-serif",L=shareText(t).split("\n");
  x.fillStyle="#eef3f1";x.fillRect(0,0,1080,1350);
  x.fillStyle="#0f3d33";x.fillRect(0,0,1080,230);
  x.fillStyle="#ffb800";x.fillRect(0,230,1080,10);
  x.textAlign="left";x.fillStyle="#ffb800";x.font="700 34px "+C;x.fillText("TORNEOS ESCOLARES",50,70);
  x.fillStyle="#ffffff";fitFont(x,L[0],980,64,F,800);x.fillText(L[0],50,170);
  x.fillStyle="#0d2b24";var y=310;
  L.slice(1,23).forEach(function(l){
    var head=/^(🏆|Grupo|Últimos)/.test(l);
    fitFont(x,l,980,head?42:38,F,head?800:500);x.fillText(l,50,y);y+=head?66:56;
  });
  x.fillStyle="#5f7a72";x.font="500 28px "+F;x.fillText(new Date().toLocaleDateString("es"),50,1300);
  return c;
}
function pdfBlob(cv){
  var u=cv.toDataURL("image/jpeg",.92).split(",")[1],bin=atob(u),n=bin.length,jb=new Uint8Array(n),i;
  for(i=0;i<n;i++)jb[i]=bin.charCodeAt(i);
  var pw=cv.width>cv.height?842:595,ph=Math.round(pw*cv.height/cv.width),enc=new TextEncoder(),out=[],off=[],pos=0;
  function put(b){if(typeof b=="string")b=enc.encode(b);out.push(b);pos+=b.length}
  function obj(k,body){off[k]=pos;put(k+" 0 obj\n"+body+"\nendobj\n")}
  put("%PDF-1.4\n");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+pw+" "+ph+"] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
  off[4]=pos;put("4 0 obj\n<< /Type /XObject /Subtype /Image /Width "+cv.width+" /Height "+cv.height+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+n+" >>\nstream\n");put(jb);put("\nendstream\nendobj\n");
  var cs="q "+pw+" 0 0 "+ph+" 0 0 cm /Im0 Do Q";
  obj(5,"<< /Length "+cs.length+" >>\nstream\n"+cs+"\nendstream");
  var xr=pos;put("xref\n0 6\n0000000000 65535 f \n");
  for(i=1;i<=5;i++)put(("0000000000"+off[i]).slice(-10)+" 00000 n \n");
  put("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF");
  return new Blob(out,{type:"application/pdf"});
}
function saveBlob(name,blob){
  if(!DL){toast("Las descargas no están disponibles aquí");return}
  DL.save({filename:name,data:blob}).then(function(){toast("Archivo guardado")}).catch(function(e){if(!e||e.code!="declined")toast("No se pudo guardar el archivo")});
}
function outFile(cv,base,fmt){
  if(fmt=="pdf")saveBlob(base+".pdf",pdfBlob(cv));
  else cv.toBlob(function(b){saveBlob(base+".png",b)},"image/png");
}
