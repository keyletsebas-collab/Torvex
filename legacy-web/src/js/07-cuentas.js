// Cuentas con Supabase: acceso obligatorio, colegios, aprobación de miembros y conexión con los datos
var REQ_LOGIN=typeof SIN_LOGIN==="undefined",AUTH="carga",SB=null,MYP=null,MYMAIL="",COLEGIOS=[],COLEERR="";
var GMODE="login",GORG=false,GNEW=false,GCOL="",GCOLN="",GOPEN=false,GERR="",GBUSY=false;
var GF={nombre:"",email:"",pass:"",pass2:"",codigo:"",cnom:"",cclave:""};
var MEM=[],MEMERR="",APR=null,MEMT=null,WAITT=null,MYCODE="",MYSCHOOLPASS="",PASS_EDIT=false;

/* ---------- utilidades ---------- */
async function rpc(n,a){var r=await SB.rpc(n,a||{});if(r.error)throw r.error;return r.data}
function gerr(e){
  var m=String((e&&e.message)||e||""),c=e&&e.code;
  if(c==="google_cancelled"||e&&e.cancelled)return"Cancelaste el acceso con Google.";
  if(c==="google_timeout"||e&&e.timeout)return"El acceso con Google tardó demasiado. Inténtalo de nuevo.";
  if(c==="user_already_exists"||/already (been )?registered|already exists/i.test(m))return"Ese correo ya tiene una cuenta. Inicia sesión.";
  if(c==="invalid_credentials"||/invalid login/i.test(m))return"Correo o contraseña incorrectos.";
  if(c==="email_not_confirmed"||/not confirmed/i.test(m))return"Falta desactivar «Confirm email» en Supabase (Authentication, Providers, Email).";
  if(c==="weak_password"||/at least 6|weak password/i.test(m))return"La contraseña debe tener al menos 6 caracteres.";
  if(c==="over_request_rate_limit"||c==="over_email_send_rate_limit"||/rate limit|too many/i.test(m))return"Demasiados intentos. Espera un momento.";
  if(c==="email_address_invalid"||/email.*invalid|invalid.*email/i.test(m))return"Escribe un correo válido.";
  if(/provider.*not enabled|unsupported provider|google.*not enabled/i.test(m))return"Google todavía no está activado en la configuración de Supabase.";
  if(/Could not find the function public\.(clave_visible_mi_colegio|establecer_clave_colegio)/i.test(m))return"Activa esta opción ejecutando el SQL actualizado en Supabase.";
  if(/redirect.*(not allowed|url)|redirect_uri/i.test(m))return"La dirección de regreso de Torvex no está permitida en Supabase.";
  if(/failed to fetch|network|load failed/i.test(m))return"No hay conexión con el servidor. Revisa tu internet.";
  return m||"Ocurrió un error. Inténtalo de nuevo.";
}
function colegioNombre(){var c=COLEGIOS.filter(function(x){return MYP&&x.id===MYP.colegio_id})[0];return c?c.nombre:"tu colegio"}
async function cargarColegios(){try{var r=await SB.from("colegios").select("id,nombre").order("nombre");COLEERR=r.error?"No se pudo cargar la lista de colegios. Revisa tu conexión e inténtalo de nuevo.":"";COLEGIOS=r.data||[]}catch(e){COLEGIOS=[];COLEERR="No se pudo cargar la lista de colegios. Revisa tu conexión e inténtalo de nuevo."}}
function clearWait(){if(WAITT){clearInterval(WAITT);WAITT=null}}
function gateShow(on){document.body.classList.toggle("gating",!!on);var g=$("gate");if(g)g.hidden=!on}

/* ---------- pantalla de acceso ---------- */
var GREM=false,GDIR="",GFOCUS="",PWL=["","Muy corta (mínimo 6)","Aceptable","Buena","Fuerte"];
try{var gse=localStorage.getItem("torneo-email");if(gse){GF.email=gse;GREM=true}}catch(e){}
var EYE='<svg class="eye-o" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-c" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>';
var GICON='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6v-5.3H5.9a20 20 0 0 0 0 18.2l6.9-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.9 14.9l6.9 5.3C14.4 15.5 18.8 12 24 12Z"/></svg>';
function gGoogleEntry(){return'<button type="button" class="ggoogle" data-ac="google"'+(GBUSY?' disabled':'')+'>'+GICON+'<span>'+(GBUSY?'Conectando con Google…':'Continuar con Google')+'</span></button><div class="gdivider"><span>o con tu correo</span></div>'}
function gField(id,label,type,val,extra){
  var inp='<input class="gin" id="'+id+'" data-gf="'+id.slice(2)+'" type="'+type+'" value="'+esc(val||"")+'" '+(extra||"")+'>';
  if(type==="password")inp='<div class="gpw">'+inp+'<button type="button" class="geye" data-ac="ver" data-for="'+id+'" aria-label="Mostrar contraseña" title="Mostrar u ocultar">'+EYE+'</button></div><small class="gcaps" hidden>⇪ Bloq Mayús está activado</small>';
  return'<label for="'+id+'">'+label+'</label>'+inp;
}
function pwScore(p){p=p||"";if(!p)return 0;if(p.length<6)return 1;var c=[/[a-z]/,/[A-Z]/,/\d/,/[^A-Za-z0-9]/].filter(function(r){return r.test(p)}).length,s=2;if(p.length>=9&&c>=2)s=3;if(p.length>=11&&c>=3)s=4;return s}
function gMeter(){var s=pwScore(GF.pass);return'<div class="gpinfo"><div class="gmeter" id="gmeter" data-s="'+s+'"><i></i><i></i><i></i><i></i></div><small class="gmeterl" id="gmeterl">'+(PWL[s]||"&nbsp;")+'</small><small class="gmatch" id="gmatch">&nbsp;</small></div>'}
function pwUpdate(){
  var m=$("gmeter");if(m){var s=pwScore(GF.pass);m.dataset.s=s;var l=$("gmeterl");if(l)l.textContent=PWL[s]||"\u00a0"}
  var q=$("gmatch");if(q){
    if(!GF.pass2){q.textContent="\u00a0";q.className="gmatch"}
    else if(GF.pass===GF.pass2){q.textContent="✓ Coinciden";q.className="gmatch ok"}
    else{q.textContent="No coinciden";q.className="gmatch no"}
  }
}
function gVisual(){return'<aside class="gauth-visual" aria-hidden="true"><div class="gauth-kicker"><i></i> TORVEX <span>/</span> DEPORTE ESCOLAR</div><div class="gauth-scene"><svg class="gauth-art" viewBox="0 0 460 250" fill="none"><defs><linearGradient id="field" x1="60" y1="90" x2="400" y2="230" gradientUnits="userSpaceOnUse"><stop stop-color="#4CC9B0"/><stop offset="1" stop-color="#4184C7"/></linearGradient><radialGradient id="stadiumGlow"><stop stop-color="#90F0D2" stop-opacity=".62"/><stop offset="1" stop-color="#90F0D2" stop-opacity="0"/></radialGradient></defs><circle cx="310" cy="112" r="142" fill="url(#stadiumGlow)"/><path class="gstadium" d="M36 154c6-58 64-95 194-95s188 37 194 95" stroke="rgba(255,255,255,.18)" stroke-width="2"/><path d="M69 152c9-39 54-63 161-63s152 24 161 63" stroke="rgba(255,255,255,.24)" stroke-width="2"/><path d="M95 153c12-24 50-38 135-38s123 14 135 38" stroke="rgba(255,255,255,.22)" stroke-width="2"/><path d="M54 145 86 69M406 145l-32-76M89 111 121 60M371 111l-32-51" stroke="rgba(255,255,255,.14)" stroke-width="2"/><path class="gfield" d="M74 148c29-18 83-28 156-28s127 10 156 28l30 71c-42 17-104 26-186 26s-144-9-186-26l30-71Z" fill="url(#field)" fill-opacity=".82" stroke="rgba(225,255,248,.66)" stroke-width="2"/><path d="M230 122v123M74 148c35 19 90 29 156 29s121-10 156-29M44 219c42-17 104-26 186-26s144 9 186 26" stroke="rgba(235,255,250,.58)" stroke-width="1.5"/><ellipse cx="230" cy="177" rx="48" ry="18" stroke="rgba(235,255,250,.58)" stroke-width="1.5"/><circle cx="230" cy="177" r="3" fill="#F4FFF9"/><path d="M58 171h27v32H48v-21c0-6 4-11 10-11Zm317 0h27c6 0 10 5 10 11v21h-37v-32Z" stroke="rgba(235,255,250,.55)" stroke-width="1.5"/><circle class="gorb orb-a" cx="90" cy="63" r="4" fill="#A9F3D8"/><circle class="gorb orb-b" cx="370" cy="52" r="3" fill="#9AC7FF"/><circle class="gorb orb-c" cx="415" cy="113" r="2.5" fill="#F4D990"/><g class="gball"><circle cx="326" cy="151" r="25" fill="#FFF6E7"/><path d="m326 136 9 7-3 11h-12l-3-11 9-7Zm-10 7-9 2-4 9 8 3m28-12 8 2 4 9-8 3m-22 7-1 9 7 6 7-6-1-9" stroke="#53617C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg><div class="gauth-orbit orbit-one"></div><div class="gauth-orbit orbit-two"></div></div><div class="gauth-tagline"><small>UNA TEMPORADA. MIL HISTORIAS.</small><strong>Tu liga.<br>Tu historia.</strong><span>Todo el juego escolar, en un solo lugar.</span></div><div class="gauth-foot"><span class="gauth-foot-mark">✦</span> BASEBALL5 <i></i> BASKET 3X3 <i></i> VOLEIBOL</div></aside>'}
function gCard(inner){return'<div class="gbox">'+gVisual()+'<div class="gauth-content"><div class="gbrand"><span class="glogo">🏆</span><div><b>Torvex</b><small>Liga deportiva escolar</small></div></div>'+inner+'</div></div>'}
/* ---------- colegio animado: aparece sin nombre y se va editando con lo que se escribe o elige ---------- */
var SCHSEEN=false,SCHLAST="";
function schName(){return GNEW?(GF.cnom||"").trim():(GCOL?GCOLN:"")}
function schHue(n){if(!n)return 215;var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%360;return h}
function schLit(n){return n?Math.min(8,1+Math.floor(n.length/2)):0}
function schLetters(n,mode){
  if(!n)return"Colegio sin nombre";
  var a=Array.from(n);
  return a.map(function(c,i){
    var cls=mode==="all"?"st":(mode==="last"&&i===a.length-1?"pop":"");
    return'<span'+(cls?' class="'+cls+'"':"")+(mode==="all"?' style="--d:'+Math.min(i*32,700)+'ms"':"")+'>'+esc(c)+'</span>';
  }).join("");
}
function schPaint(n){
  var w=$("gsch");if(!w)return;
  w.style.setProperty("--sh",schHue(n));
  var lit=schLit(n);
  w.querySelectorAll(".gs-win").forEach(function(e,i){e.classList.toggle("on",i<lit)});
  var ini=$("gschi");if(ini)ini.textContent=n?n.trim().charAt(0).toUpperCase():"?";
}
function schChoiceLabel(){var n=schName();return GNEW?(n||"Escribe el nombre del colegio"):(GCOL?GCOLN:"Elige tu colegio")}
function schUpdate(){
  var n=schName(),el=$("gschn");if(!el)return;
  var prev=SCHLAST;SCHLAST=n;
  var label=schChoiceLabel();
  el.className="gsch-sign-text"+(n?"":" empty")+(label.length>22?" long":"")+(GNEW?" edit":"");
  el.innerHTML=schLetters(label,n.length>prev.length?"last":"none");
  var btn=el.closest("button");if(btn)btn.setAttribute("aria-label","Colegio: "+label);
  schPaint(n);
}
function gSchoolPicker(first,changed){
  var n=schName(),label=schChoiceLabel(),mode=first||changed?"all":"none";
  var cls="gsch-sign-text"+(n?"":" empty")+(label.length>22?" long":"")+(GNEW?" edit":"");
  var h='<div class="gdd gsch-dd'+(GOPEN?" open":"")+'"><button type="button" class="gddb gsch-picker" data-ac="col_abrir" aria-haspopup="listbox" aria-label="Colegio: '+esc(label)+'" aria-expanded="'+(GOPEN?"true":"false")+'"><span class="gsch-pick-label">Colegio</span><span class="'+cls+'" id="gschn" aria-live="polite">'+schLetters(label,mode)+'</span><i aria-hidden="true">▾</i></button><div class="gddl" role="listbox">';
  h+=COLEGIOS.length?COLEGIOS.map(function(c){var selected=c.id===GCOL&&!GNEW;return'<button type="button" role="option" aria-selected="'+(selected?"true":"false")+'" data-ac="col_pick" data-id="'+esc(c.id)+'" data-n="'+esc(c.nombre)+'" class="'+(selected?"on":"")+'">'+esc(c.nombre)+'</button>'}).join(""):'<p class="gempty">Todavía no hay colegios registrados.</p>';
  return h+'<button type="button" class="gnew" data-ac="col_nuevo">➕ Mi colegio no está: crear uno nuevo</button></div></div>';
}
function gSchool(first){
  var n=schName(),ch=n!==SCHLAST,lit=schLit(n);SCHLAST=n;
  var W=[[60,76],[86,76],[154,76],[180,76],[60,106],[86,106],[154,106],[180,106]].map(function(p,i){
    return'<rect class="gs-win'+(!first&&i<lit?" on":"")+'" style="--i:'+i+'" x="'+p[0]+'" y="'+p[1]+'" width="14" height="18" rx="2"/>';
  }).join("");
  return'<div class="gsch'+(first?" enter":"")+(GOPEN?" picker-open":"")+'" id="gsch" style="--sh:'+schHue(n)+'">'+
    '<svg class="gsch-svg" viewBox="0 0 240 150" aria-hidden="true">'+
    '<ellipse class="gs-cl c1" cx="38" cy="26" rx="18" ry="6"/><ellipse class="gs-cl c2" cx="196" cy="20" rx="22" ry="7"/><circle class="gs-star s1" cx="20" cy="60" r="1.4"/><circle class="gs-star s2" cx="220" cy="54" r="1.2"/><circle class="gs-star s3" cx="160" cy="14" r="1.1"/>'+
    '<rect class="gs-ground" x="0" y="134" width="240" height="16"/>'+
    '<g class="gs-bld"><rect class="gs-wall" x="48" y="64" width="144" height="70" rx="3"/>'+
    '<path class="gs-roof" d="M38 64 L120 26 L202 64 Z"/>'+
    '<g class="gs-flag"><line x1="120" y1="26" x2="120" y2="6"/><path class="gs-fl" d="M120 6 L144 12 L120 19 Z"/></g>'+
    '<circle class="gs-crest" cx="120" cy="50" r="11"/><text class="gs-init" id="gschi" x="120" y="55" text-anchor="middle">'+esc(n?n.trim().charAt(0).toUpperCase():"?")+'</text>'+
    W+'<rect class="gs-door" x="106" y="102" width="28" height="32" rx="3"/><rect class="gs-step" x="100" y="131" width="40" height="4" rx="1"/></g></svg>'+
    gSchoolPicker(first,ch)+'</div>';
}
function gColegio(){
  var first=!SCHSEEN;SCHSEEN=true;
  var h='<div class="gcol'+(first?" enter":"")+'">'+gSchool(first);
  if(GNEW)h+=gField("g_cnom","Nombre del colegio","text",GF.cnom,'maxlength="60" autocomplete="off"')+gField("g_cclave","Contraseña del colegio (mínimo 6)","password",GF.cclave,'maxlength="128" autocomplete="new-password"')+'<p class="gs">Los organizadores que la conozcan podrán solicitar unirse; tú aprobarás su acceso. Los estudiantes usan el código que verás en Ajustes.</p>';
  else if(GCOL)h+=gField("g_cclave","Contraseña del colegio","password",GF.cclave,'maxlength="128" autocomplete="off"')+'<p class="gs">La puso quien creó el colegio.</p>';
  return h+'</div>';
}
function gForm(){
  var comp=AUTH==="completar",lg=GMODE==="login"&&!comp,h="";
  if(comp)h+='<h2 class="gh">Termina tu registro</h2><p class="gs gsub">Tu cuenta ya existe ('+esc(MYMAIL)+'). Falta elegir tu colegio.</p>';
  else h+='<div class="gtabs" data-m="'+(lg?"login":"crear")+'"><button type="button" data-ac="modo" data-m="login" class="'+(lg?"on":"")+'">Iniciar sesión</button><button type="button" data-ac="modo" data-m="crear" class="'+(lg?"":"on")+'">Crear cuenta</button></div>';
  var err=GERR?'<p class="gerr" role="alert">'+esc(GERR)+'</p>':"",dis=GBUSY?" disabled":"",dir=GDIR,cls="gbody"+(dir?" sl-"+dir:"");
  GDIR="";
  if(lg){
    return gCard(h+'<div class="'+cls+'"><h2 class="gh">Bienvenido de nuevo</h2><p class="gs gsub">Entra con tu correo y tu contraseña.</p>'+
      gGoogleEntry()+
      gField("g_email","Correo electrónico","email",GF.email,'autocomplete="email" placeholder="tu@correo.com"')+
      gField("g_pass","Contraseña","password",GF.pass,'autocomplete="current-password"')+
      '<label class="grem"><input type="checkbox" data-ac="rem"'+(GREM?" checked":"")+'><span>Recordar mi correo en este equipo</span></label>'+err+
      '<button type="button" class="gpri" data-ac="entrar"'+dis+'>'+(GBUSY?"Entrando…":"Entrar")+'</button>'+
      '<button type="button" class="glink" data-ac="modo" data-m="crear">¿No tienes cuenta? Crear una</button></div>');
  }
  var b='<div class="'+cls+'">';
  if(!comp)b+='<h2 class="gh">Crea tu cuenta</h2><p class="gs gsub">Solo toma un minuto.</p>'+gGoogleEntry()+'<div class="gsec"><span>1</span>Tus datos</div>'+
    gField("g_nombre","Nombre","text",GF.nombre,'maxlength="40" autocomplete="name" placeholder="Tu nombre"')+
    gField("g_email","Correo electrónico","email",GF.email,'autocomplete="email" placeholder="tu@correo.com"')+
    '<div class="g2"><div>'+gField("g_pass","Contraseña","password",GF.pass,'autocomplete="new-password" placeholder="Mínimo 6"')+'</div><div>'+gField("g_pass2","Repítela","password",GF.pass2,'autocomplete="new-password"')+'</div></div>'+gMeter()+
    '<div class="gsec"><span>2</span>Tu colegio</div>';
  b+='<button type="button" class="gorg'+(GORG?" on":"")+'" data-ac="org" aria-pressed="'+(GORG?"true":"false")+'"><span class="gsw"><i></i></span><span class="got"><b>Organizador</b><small>'+(GORG?"Elige tu colegio o crea uno nuevo":"Si no lo marcas, necesitas el código de tu colegio")+'</small></span></button>';
  b+=GORG?gColegio():gField("g_codigo","Código del colegio","text",GF.codigo,'maxlength="30" autocapitalize="characters" autocomplete="off" placeholder="Ej. SANJ-3F9A27C1"')+'<p class="gs">Te lo da el organizador de tu colegio.</p>';
  b+=err+'<button type="button" class="gpri" data-ac="'+(comp?"completar":"crear")+'"'+dis+'>'+(GBUSY?"Un momento…":(comp?"Continuar":"Crear cuenta"))+'</button>';
  if(comp)b+='<button type="button" class="glink" data-ac="salir">Cerrar sesión</button>';
  return gCard(h+b+'</div>');
}
function gWait(){return'<div class="gwait"><div class="gpulse"><i></i></div><h2>Esperando aprobación</h2><p>El organizador de <b>'+esc(colegioNombre())+'</b> debe darte permiso para entrar. Esta pantalla se actualiza sola.</p><button type="button" class="glink" data-ac="salir">Cerrar sesión</button></div>'}
function gateRender(){
  gateShow(true);
  var g=$("gate"),h;
  if(AUTH==="carga")h=gCard('<p class="gs gload">Cargando…</p>');
  else if(AUTH==="config")h=gCard('<h2 class="gh">Falta configurar la conexión</h2><p class="gs">'+(SB_URL&&SB_KEY?"No se pudo cargar la librería de Supabase. Revisa tu conexión a internet y recarga la página.":"Escribe la URL y la clave publishable de Supabase en src/js/00-config.js.")+'</p>');
  else if(AUTH==="pendiente")h=gWait();
  else h=gForm();
  g.className=AUTH==="pendiente"?"gate wait":"gate";
  g.innerHTML=h;
  setTimeout(function(){
    schPaint(schName());pwUpdate();
    if(GFOCUS){var f=$(GFOCUS);if(f){try{f.focus()}catch(e){}}GFOCUS=""}
  },150);
}

/* ---------- inicio, registro y sesión ---------- */
async function authInit(){
  AUTH="carga";render();
  if(!SB_URL||!SB_KEY||!window.supabase||!window.supabase.createClient){AUTH="config";render();return}
  try{
    SB=window.supabase.createClient(SB_URL,SB_KEY,{auth:{flowType:"pkce"}});
    await cargarColegios();
    var r=await SB.auth.getSession(),s=r&&r.data&&r.data.session;
    if(s)await resolverSesion(s);else{AUTH="fuera";GFOCUS="g_email";render()}
  }catch(e){GERR=gerr(e);AUTH="fuera";GFOCUS="g_email";render()}
}
async function resolverSesion(s){
  clearWait();
  MYMAIL=(s.user&&s.user.email)||"";
  var r=await SB.from("perfiles").select("id,nombre,colegio_id,estado,rol,equipo").eq("id",s.user.id).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data){
    try{await SB.auth.signOut({scope:"local"})}catch(e){}
    MYP=null;AUTH="fuera";GMODE="login";GERR="No encontramos el perfil de esta cuenta. Si solicitaron acceso a un colegio, contacta al organizador para confirmar el estado de tu cuenta antes de registrarte otra vez.";render();return;
  }
  MYP=r.data;
  if(MYP.estado==="aprobado"){await entrarApp()}
  else if(MYP.estado==="pendiente"){AUTH="pendiente";GERR="";vigilar();render()}
  else{AUTH="completar";render()}
}
function vigilar(){
  clearWait();
  WAITT=setInterval(async function(){
    try{var r=await SB.auth.getSession(),s=r&&r.data&&r.data.session;if(s)await resolverSesion(s)}catch(e){}
  },4000);
}
async function entrarApp(){
  clearWait();
  UID=MYP.id;NAME=MYP.nombre;ADMIN=MYP.rol==="organizador";
  U=mkU(MYP.colegio_id);DB=mkDB(MYP.colegio_id);
  suscribir();
  AUTH="ok";gateShow(false);BOOT=true;
  cargarClaveColegio();
  if(ADMIN){cargarMiembros();cargarCodigo();MEMT=setInterval(cargarMiembros,10000)}
  render();
}
function gEmailOk(v){return/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)}
function gValidarColegio(){
  if(!GORG)return GF.codigo.trim()?"":"Escribe el código de tu colegio.";
  if(GNEW){
    if(GF.cnom.trim().length<2)return"Escribe el nombre del colegio.";
    if(COLEGIOS.some(function(c){return c.nombre.trim().toLowerCase()===GF.cnom.trim().toLowerCase()}))return"Ese colegio ya está registrado: elígelo en la lista.";
    return(GF.cclave||"").length<6?"La contraseña del colegio debe tener al menos 6 caracteres.":(GF.cclave||"").length>128?"La contraseña del colegio no puede superar 128 caracteres.":"";
  }
  if(!GCOL)return COLEERR||"Elige tu colegio en la lista o crea uno nuevo.";
  return GF.cclave?(GF.cclave.length>128?"La contraseña del colegio no puede superar 128 caracteres.":""):"Escribe la contraseña del colegio.";
}
async function gUnirme(){
  if(!GORG)await rpc("unirme_con_codigo",{p_codigo:GF.codigo});
  else if(GNEW)await rpc("crear_colegio_y_unirme",{p_nombre:GF.cnom.trim(),p_clave:GF.cclave});
  else await rpc("unirme_como_organizador",{p_colegio:GCOL,p_clave:GF.cclave});
}
async function crearCuenta(){
  if(GBUSY)return;
  var nombre=GF.nombre.trim(),email=GF.email.trim().toLowerCase();
  var e=!nombre?"Escribe tu nombre.":!gEmailOk(email)?"Escribe un correo válido.":(GF.pass||"").length<6?"La contraseña debe tener al menos 6 caracteres.":GF.pass!==GF.pass2?"Las contraseñas no coinciden.":gValidarColegio();
  if(e){GERR=e;gateRender();return}
  GBUSY=true;GERR="";gateRender();
  try{
    if(!GORG&&!(await rpc("validar_codigo",{p_codigo:GF.codigo})))throw new Error("Código de colegio no válido. Pídeselo al organizador de tu colegio.");
    var r=await SB.auth.signUp({email:email,password:GF.pass,options:{data:{nombre:nombre}}});
    if(r.error)throw r.error;
    if(!r.data||!r.data.session)throw new Error("Supabase no inició una sesión al crear la cuenta. Revisa que «Confirm email» esté desactivado. Si ya tenías cuenta, cambia a Iniciar sesión.");
    try{await gUnirme()}catch(e2){GERR=gerr(e2)}
    GF.pass=GF.pass2=GF.cclave="";
    await resolverSesion(r.data.session);
  }catch(e3){GERR=gerr(e3)}
  GBUSY=false;if(AUTH!=="ok")gateRender();
}
async function completarRegistro(){
  if(GBUSY)return;
  var e=gValidarColegio();if(e){GERR=e;gateRender();return}
  GBUSY=true;GERR="";gateRender();
  try{
    if(!GORG&&!(await rpc("validar_codigo",{p_codigo:GF.codigo})))throw new Error("Código de colegio no válido. Pídeselo al organizador de tu colegio.");
    await gUnirme();GF.cclave="";
    var r=await SB.auth.getSession();await resolverSesion(r.data.session);
  }catch(e3){GERR=gerr(e3)}
  GBUSY=false;if(AUTH!=="ok")gateRender();
}
async function iniciarSesion(){
  if(GBUSY)return;
  var email=GF.email.trim().toLowerCase();
  if(!gEmailOk(email)||!GF.pass){GERR="Escribe tu correo y tu contraseña.";gateRender();return}
  GBUSY=true;GERR="";gateRender();
  try{
    var r=await SB.auth.signInWithPassword({email:email,password:GF.pass});
    if(r.error)throw r.error;
    try{if(GREM)localStorage.setItem("torneo-email",email);else localStorage.removeItem("torneo-email")}catch(e2){}
    GF.pass="";await resolverSesion(r.data.session);
  }catch(e){GERR=gerr(e)}
  GBUSY=false;if(AUTH!=="ok")gateRender();
}
async function iniciarConGoogle(){
  if(GBUSY)return;
  GBUSY=true;GERR="";gateRender();
  try{
    var bridge=window.HybridWebView,invoke=bridge&&bridge.InvokeDotNet;
    if(typeof invoke==="function"){
      var redirectTo=await invoke.call(bridge,"PrepareGoogleRedirectUri");
      var inicio=await SB.auth.signInWithOAuth({provider:"google",options:{redirectTo:redirectTo,skipBrowserRedirect:true}});
      if(inicio.error)throw inicio.error;
      if(!inicio.data||!inicio.data.url)throw new Error("Supabase no devolvió el enlace de Google.");
      var raw=await invoke.call(bridge,"AuthenticateGoogleAsync",[inicio.data.url]);
      var cb=typeof raw==="string"?JSON.parse(raw):raw;
      if(cb&&cb.cancelled)throw{code:"google_cancelled",cancelled:true};
      if(cb&&cb.timeout)throw{code:"google_timeout",timeout:true};
      if(cb&&cb.error)throw new Error(cb.error_description||cb.error);
      if(!cb||!cb.code)throw new Error("Google no devolvió el código de acceso.");
      var ses=await SB.auth.exchangeCodeForSession(cb.code);
      if(ses.error)throw ses.error;
      await resolverSesion(ses.data.session);
    }else{
      var callback=new URL(location.href);callback.hash="";callback.search="";
      var web=await SB.auth.signInWithOAuth({provider:"google",options:{redirectTo:callback.toString()}});
      if(web.error)throw web.error;
      return;
    }
  }catch(e){GERR=gerr(e)}
  GBUSY=false;if(AUTH!=="ok")gateRender();
}
async function cerrarSesion(){
  clearWait();if(MEMT){clearInterval(MEMT);MEMT=null}
  try{await SB.auth.signOut()}catch(e){}
  location.reload();
}

/* ---------- adaptadores: la app habla con Supabase igual que con la base compartida anterior ---------- */
function mkU(cid){
  return{
    id:async function(){return MYP.id},name:async function(){return MYP.nombre},
    isOwner:async function(){return false},canEdit:async function(){return ADMIN},
    search:async function(q){
      var r=await SB.from("perfiles").select("id,nombre").eq("colegio_id",cid).eq("estado","aprobado").ilike("nombre","%"+String(q||"").replace(/[%_,]/g,"")+"%").limit(8);
      return(r.data||[]).map(function(p){return{id:p.id,name:p.nombre}});
    },
    profiles:async function(ids){
      var r=await SB.from("perfiles").select("id,nombre").in("id",ids),o={};
      (r.data||[]).forEach(function(p){o[p.id]={name:p.nombre}});return o;
    }
  };
}
function mkDB(cid){
  var cache={},subs={},cargado={};
  function lista(c){var m=cache[c]||{};return Object.keys(m).map(function(id){return{id:id,exists:true,data:function(){return m[id]}}})}
  function snapCol(c,o){
    var d=lista(c);
    if(o.f)d.sort(function(a,b){var x=a.data()[o.f],y=b.data()[o.f];return(x>y?1:x<y?-1:0)*(o.d==="desc"?-1:1)});
    if(o.n)d=d.slice(0,o.n);
    return{docs:d,size:d.length,empty:!d.length};
  }
  function docSnap(c,id){var m=cache[c]||{},ok=Object.prototype.hasOwnProperty.call(m,id);return{id:id,exists:ok,data:function(){return ok?m[id]:undefined}}}
  function avisar(c){(subs[c]||[]).forEach(function(s){try{s.cb(s.snap())}catch(e){}})}
  function cargar(c){
    if(cargado[c])return cargado[c];
    var q=c==="roles"
      ?SB.from("perfiles").select("id,rol,equipo").eq("colegio_id",cid).eq("estado","aprobado").neq("rol","espectador")
      :SB.from("docs").select("id,data").eq("colegio_id",cid).eq("col",c);
    cargado[c]=Promise.resolve(q).then(function(r){
      if(r.error){delete cargado[c];throw r.error}
      var m={};(r.data||[]).forEach(function(x){m[x.id]=c==="roles"?{role:x.rol,team:x.equipo||""}:x.data});
      cache[c]=m;
    });
    return cargado[c];
  }
  function suscribirA(c,s,eb){
    (subs[c]=subs[c]||[]).push(s);
    cargar(c).then(function(){s.cb(s.snap())},function(e){if(eb)eb(e)});
    return function(){subs[c]=(subs[c]||[]).filter(function(x){return x!==s})};
  }
  function escribir(c,id,v,mezclar){
    var antes=(cache[c]||{})[id],hay=cache[c]&&Object.prototype.hasOwnProperty.call(cache[c],id);
    var nuevo=JSON.parse(JSON.stringify(mezclar?Object.assign({},antes||{},v):v));
    cache[c]=cache[c]||{};cache[c][id]=nuevo;avisar(c);
    var p=c==="roles"
      ?rpc("aprobar_miembro",{p_uid:id,p_cargo:nuevo.role,p_equipo:nuevo.team||""})
      :Promise.resolve(SB.from("docs").upsert({colegio_id:cid,col:c,id:id,data:nuevo})).then(function(r){if(r.error)throw r.error});
    return p.catch(function(e){if(hay)cache[c][id]=antes;else delete cache[c][id];avisar(c);throw e});
  }
  function borrar(c,id){
    var antes=(cache[c]||{})[id],hay=cache[c]&&Object.prototype.hasOwnProperty.call(cache[c],id);
    if(hay){delete cache[c][id];avisar(c)}
    var p=c==="roles"
      ?rpc("aprobar_miembro",{p_uid:id,p_cargo:"espectador",p_equipo:""})
      :Promise.resolve(SB.from("docs").delete().eq("colegio_id",cid).eq("col",c).eq("id",id)).then(function(r){if(r.error)throw r.error});
    return p.catch(function(e){if(hay){cache[c][id]=antes;avisar(c)}throw e});
  }
  function docRef(c,id){
    return{
      id:id,
      get:function(){return cargar(c).then(function(){return docSnap(c,id)})},
      onSnapshot:function(cb,eb){return suscribirA(c,{cb:cb,snap:function(){return docSnap(c,id)}},eb)},
      set:function(v){return escribir(c,id,v,false)},
      update:function(v){return escribir(c,id,v,true)},
      delete:function(){return borrar(c,id)}
    };
  }
  function colRef(c,o){
    o=o||{};
    return{
      doc:function(id){return docRef(c,String(id))},
      orderBy:function(f,d){return colRef(c,Object.assign({},o,{f:f,d:d||"asc"}))},
      limit:function(n){return colRef(c,Object.assign({},o,{n:n}))},
      get:function(){return cargar(c).then(function(){return snapCol(c,o)})},
      onSnapshot:function(cb,eb){return suscribirA(c,{cb:cb,snap:function(){return snapCol(c,o)}},eb)}
    };
  }
  // tiempo real: los cambios de otras personas aparecen sin recargar
  try{
    SB.channel("colegio-"+cid)
      .on("postgres_changes",{event:"*",schema:"public",table:"docs",filter:"colegio_id=eq."+cid},function(p){
        var n=p.eventType==="DELETE"?p.old:p.new;if(!n||!n.col||!cargado[n.col])return;
        var c=n.col;cache[c]=cache[c]||{};
        if(p.eventType==="DELETE")delete cache[c][n.id];else cache[c][n.id]=n.data;
        avisar(c);
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"perfiles",filter:"colegio_id=eq."+cid},function(){
        if(cargado.roles){delete cargado.roles;cargar("roles").then(function(){avisar("roles")},function(){})}
        if(ADMIN)cargarMiembros();
      })
      .subscribe();
  }catch(e){}
  return{
    collection:function(c){return colRef(c)},
    doc:function(path){var i=String(path).indexOf("/");return docRef(path.slice(0,i),path.slice(i+1))}
  };
}

/* ---------- miembros: aprobar, rechazar y asignar cargo (solo organizadores) ---------- */
function pendCount(){return MEM.filter(function(p){return p.estado==="pendiente"}).length}
async function cargarMiembros(){
  if(!SB||!ADMIN)return;
  try{MEM=(await rpc("listar_miembros"))||[];MEMERR=""}catch(e){MEMERR=gerr(e)}
  soft();
}
async function cargarCodigo(){try{MYCODE=(await rpc("codigo_mi_colegio"))||""}catch(e){}soft()}
async function cargarClaveColegio(){
  if(!SB||!MYP||MYP.estado!=="aprobado"||!MYP.colegio_id)return;
  try{MYSCHOOLPASS=(await rpc("clave_visible_mi_colegio"))||""}
  catch(e){MYSCHOOLPASS=""}
  soft();
}
function codigoCard(){
  if(!SB||!MYP||!isOrg())return"";
  return'<div class="rs gcode"><b>Código del colegio</b><p class="hint">Compártelo con estudiantes y participantes para que creen su cuenta en <b>'+esc(colegioNombre())+'</b>. Cada persona nueva queda pendiente hasta que la apruebes.</p><div class="gcv"><code>'+(MYCODE?esc(MYCODE):"…")+'</code></div><div class="ctl"><button data-ac="c_copy">Copiar código</button><button data-ac="c_regen">Generar código nuevo</button></div></div>';
}
function claveColegioCard(){
  if(!SB||!MYP||MYP.estado!=="aprobado"||!MYP.colegio_id)return"";
  var h='<div class="rs gcode gschoolpass"><b>Contraseña del colegio</b><p class="hint">La pueden ver los miembros aprobados de <b>'+esc(colegioNombre())+'</b>.</p>';
  if(MYSCHOOLPASS)h+='<div class="gcv"><code>'+esc(MYSCHOOLPASS)+'</code></div><div class="ctl"><button data-ac="pass_copy">Copiar contraseña</button></div>';
  else h+='<p class="hint">No hay una contraseña visible todavía. La clave anterior no se puede recuperar; el organizador puede establecer una nueva.</p>';
  if(isOrg()){
    if(PASS_EDIT)h+='<label for="g_new_school_pass">'+(MYSCHOOLPASS?'Nueva contraseña':'Contraseña nueva')+'</label><div class="gpw"><input class="gin" id="g_new_school_pass" type="password" maxlength="128" autocomplete="new-password" placeholder="Mínimo 6 caracteres"><button type="button" class="geye" data-ac="ver" data-for="g_new_school_pass" aria-label="Mostrar contraseña" title="Mostrar u ocultar">'+EYE+'</button></div><div class="ctl"><button class="pri" data-ac="pass_set">Guardar contraseña</button><button data-ac="pass_cancel">Cancelar</button></div>';
    else h+='<div class="ctl"><button class="pri" data-ac="pass_edit">'+(MYSCHOOLPASS?'Cambiar contraseña':'Establecer contraseña')+'</button></div>';
  }
  return h+'</div>';
}
function cargoPanel(p){
  var ks=Object.keys(RL),tn=allTeams();
  return'<div class="mpan"><label for="m_cargo">¿Qué cargo le pones a '+esc(p.nombre)+'?</label><div class="row"><select id="m_cargo" data-ac="m_cargo">'+ks.map(function(k){return'<option value="'+k+'"'+(k===APR.cargo?" selected":"")+'>'+esc(RL[k][0])+'</option>'}).join("")+'</select></div>'+
  (wantsTeam(APR.cargo)?'<label for="m_equipo">Equipo</label><div class="row"><input type="text" id="m_equipo" data-ac="m_equipo" list="m_tl" maxlength="60" placeholder="Nombre del equipo" value="'+esc(APR.equipo||"")+'"></div><datalist id="m_tl">'+tn.map(function(n){return'<option value="'+esc(n)+'">'}).join("")+'</datalist>':"")+
  '<div class="ctl"><button class="pri" data-ac="m_aprobar">Aprobar</button><button data-ac="m_cancelar">Cancelar</button></div></div>';
}
function mRow(p){
  var pe=p.estado==="pendiente",open=APR&&APR.id===p.id;
  var h='<div class="rs mrw"><div class="pl"><span class="av">'+esc(String(p.nombre||"?").slice(0,1).toUpperCase())+'</span><span class="pn">'+esc(p.nombre)+(p.id===UID?' <small>Tú</small>':"")+'<br><span class="hint">'+esc(p.email||"")+'</span></span><span class="tag">'+(pe?"Pendiente"+(p.rol==="organizador"?" · Organizador":""):esc((RL[p.rol]||[p.rol])[0])+(p.equipo?" de "+esc(p.equipo):""))+'</span></div>';
  if(open)h+=cargoPanel(p);
  else if(pe)h+='<div class="mact"><button class="mok" data-ac="m_ok" data-id="'+esc(p.id)+'" aria-label="Aprobar a '+esc(p.nombre)+'">✓</button><button class="mno" data-ac="m_no" data-id="'+esc(p.id)+'" aria-label="Rechazar a '+esc(p.nombre)+'">✕</button></div>';
  else h+='<div class="mact"><button data-ac="m_cambiar" data-id="'+esc(p.id)+'">Cambiar cargo</button></div>';
  return h+'</div>';
}
function miembrosHtml(){
  if(!SB||!MYP||!isOrg())return"";
  var pe=MEM.filter(function(p){return p.estado==="pendiente"}),ok=MEM.filter(function(p){return p.estado!=="pendiente"});
  return(MEMERR?'<div class="rs"><p class="hint">'+esc(MEMERR)+'</p></div>':"")+
    '<h2>Pendientes de aprobar ('+pe.length+')</h2>'+(pe.length?pe.map(mRow).join(""):'<div class="rs"><p class="empty">Nadie espera aprobación.</p></div>')+
    '<h2>Miembros aprobados ('+ok.length+')</h2>'+(ok.length?ok.map(mRow).join(""):'<div class="rs"><p class="empty">Todavía no hay miembros.</p></div>');
}
function vMiembros(){
  if(!SB||!MYP||!isOrg())return'<div class="rs"><p class="empty">Solo el organizador puede ver los miembros.</p></div>';
  return codigoCard()+claveColegioCard()+miembrosHtml();
}

/* ---------- eventos de la pantalla de acceso y de miembros ---------- */
document.addEventListener("click",async function(e){
  var b=e.target&&e.target.closest&&e.target.closest("[data-ac]");
  if(!b||b.disabled||!b.dataset||!b.dataset.ac)return;
  var a=b.dataset.ac,d=b.dataset,p;
  try{
    if(a==="modo"){if(d.m!==GMODE)GDIR=d.m==="crear"?"r":"l";GMODE=d.m;GERR="";SCHSEEN=false;SCHLAST="";GFOCUS=d.m==="crear"?"g_nombre":"g_email";gateRender()}
    else if(a==="ver"){var iv=$(d["for"]);if(iv){var sh=iv.type==="password";iv.type=sh?"text":"password";b.classList.toggle("on",sh);b.setAttribute("aria-label",sh?"Ocultar contraseña":"Mostrar contraseña")}}
    else if(a==="org"){GORG=!GORG;GOPEN=false;GERR="";SCHSEEN=false;SCHLAST="";gateRender()}
    else if(a==="col_abrir"){GOPEN=!GOPEN;gateRender()}
    else if(a==="col_pick"){GCOL=d.id;GCOLN=d.n;GNEW=false;GOPEN=false;GERR="";gateRender()}
    else if(a==="col_nuevo"){GNEW=true;GCOL="";GCOLN="";GOPEN=false;GERR="";GFOCUS="g_cnom";gateRender()}
    else if(a==="entrar")await iniciarSesion();
    else if(a==="google")await iniciarConGoogle();
    else if(a==="crear")await crearCuenta();
    else if(a==="completar")await completarRegistro();
    else if(a==="salir")await cerrarSesion();
    else if(a==="m_ok"){
      p=MEM.filter(function(x){return x.id===d.id})[0];if(!p)return;
      if(!confirm("¿Seguro que quieres aprobar a "+p.nombre+"?"))return;
      APR={id:p.id,cargo:p.rol==="organizador"?"organizador":"jugador",equipo:""};render();
    }
    else if(a==="m_no"){
      p=MEM.filter(function(x){return x.id===d.id})[0];if(!p)return;
      if(!confirm("¿Rechazar a "+p.nombre+"? Su cuenta se eliminará de la base de datos y no podrá entrar."))return;
      await rpc("rechazar_miembro",{p_uid:p.id});toast("Entrada rechazada y cuenta eliminada");await cargarMiembros();
    }
    else if(a==="m_cambiar"){p=MEM.filter(function(x){return x.id===d.id})[0];if(!p)return;APR={id:p.id,cargo:p.rol,equipo:p.equipo||""};render()}
    else if(a==="m_cancelar"){APR=null;render()}
    else if(a==="m_cargo"){}
    else if(a==="m_aprobar"){
      if(!APR)return;p=MEM.filter(function(x){return x.id===APR.id})[0];if(!p)return;
      var eq=(APR.equipo||"").trim();
      if(wantsTeam(APR.cargo)&&!eq){toast("Escribe el equipo de esta persona.");return}
      await rpc("aprobar_miembro",{p_uid:p.id,p_cargo:APR.cargo,p_equipo:eq});
      if(APR.cargo==="jugador"&&eq)addToRoster(p.nombre,eq,p.id);
      logAct(null,"Miembro aprobado",p.nombre+": "+APR.cargo+(eq?" de "+eq:""));
      toast("Cargo asignado a "+p.nombre);APR=null;await cargarMiembros();
    }
    else if(a==="c_copy"){try{await navigator.clipboard.writeText(MYCODE);toast("Código copiado")}catch(x){toast("No se pudo copiar")}}
    else if(a==="c_regen"){
      if(!confirm("El código anterior dejará de servir. ¿Generar uno nuevo?"))return;
      MYCODE=await rpc("regenerar_codigo_colegio");toast("Código nuevo generado");render();
    }
    else if(a==="pass_edit"){PASS_EDIT=true;render()}
    else if(a==="pass_cancel"){PASS_EDIT=false;render()}
    else if(a==="pass_copy"){try{await navigator.clipboard.writeText(MYSCHOOLPASS);toast("Contraseña copiada")}catch(x){toast("No se pudo copiar")}}
    else if(a==="pass_set"){
      var np=$("g_new_school_pass"),nv=np?(np.value||""):"";
      if(nv.length<6||nv.length>128){toast("La contraseña debe tener entre 6 y 128 caracteres.");return}
      if(!confirm("La nueva contraseña quedará visible para todos los miembros aprobados del colegio y reemplazará la anterior. ¿Continuar?"))return;
      await rpc("establecer_clave_colegio",{p_clave:nv});
      MYSCHOOLPASS=nv;PASS_EDIT=false;toast("Contraseña del colegio actualizada");render();
    }
  }catch(err){toast(gerr(err))}
});
document.addEventListener("change",function(e){
  var x=e.target,d=x&&x.dataset;
  if(d&&d.ac==="m_cargo"&&APR){APR.cargo=x.value;render()}
  else if(d&&d.ac==="rem")GREM=x.checked;
});
document.addEventListener("input",function(e){
  var x=e.target,d=x&&x.dataset;if(!d)return;
  if(d.gf){GF[d.gf]=x.value;if(d.gf==="cnom")schUpdate();else if(d.gf==="pass"||d.gf==="pass2")pwUpdate();else if(d.gf==="email"&&x.classList.contains("bad")&&gEmailOk(x.value.trim()))x.classList.remove("bad")}
  else if(d.ac==="m_equipo"&&APR)APR.equipo=x.value;
});
document.addEventListener("keydown",function(e){
  if(e.key!=="Enter"||!e.target||!e.target.dataset||!e.target.dataset.gf)return;
  var b=document.querySelector("[data-ac=entrar],[data-ac=crear],[data-ac=completar]");if(b)b.click();
});
function capsChk(e){
  var x=e.target,w=x&&x.closest&&x.closest(".gpw");if(!w||!e.getModifierState)return;
  var c=w.nextElementSibling;if(c&&c.classList.contains("gcaps"))c.hidden=!e.getModifierState("CapsLock");
}
document.addEventListener("keydown",capsChk);
document.addEventListener("keyup",capsChk);
document.addEventListener("focusout",function(e){
  var x=e.target;if(x&&x.id==="g_email"){var v=x.value.trim();x.classList.toggle("bad",!!v&&!gEmailOk(v))}
});
