const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function escenario(rol) {
  const app = load(); app.login(rol || { admin: true });
  const a = app.season("liga", 3, { sport: "beis", rama: "f", name: "Edición 1" });
  a.matches = [{ a: "T1", b: "T2", sa: 3, sb: 1, date: "2026-10-20", time: "08:00" }, { a: "T1", b: "T3", date: "2026-10-21", time: "09:00" }, { a: "T2", b: "T3", est: "aplazado" }];
  a.ro = { T1: { coach: "Profe Luis", pl: [{ n: "Ana", num: "9", pos: "Central", st: true, cap: true }] } };
  const b = app.season("liga", 3, { sport: "vol", rama: "m", name: "Edición 1" });
  b.matches = [{ a: "T1", b: "T2", sa: 2, sb: 0 }, { a: "T1", b: "T3", sa: 2, sb: 1 }, { a: "T2", b: "T3", sa: 0, sb: 2 }];
  const c = app.season("elim", 4, { sport: "bas3", rama: "f", name: "Copa" });
  const v = app.season("liga", 3, { sport: "beis", name: "Antigua" }); delete v.rama;
  app.ctx._l = [a, b, c, v]; app.run("S.list=_l;S.cur=null;BOOT=true;SC='inicio'");
  app.run("generate(S.list[2]);ANU=[{id:'1',txt:'Aviso publicado',ts:2,st:'publicado'},{id:'2',txt:'Borrador secreto',ts:1,st:'borrador'}]");
  return { app, a, b, c, v };
}
const vista = (app, sc) => { if (sc) app.run("SC='" + sc + "'"); app.run("render()"); return app.els.app.innerHTML; };
const ver = app => app.run("menuHtml()");

test("menú lateral: las 9 secciones públicas, el acceso y el panel solo para personal autorizado", () => {
  const { app } = escenario(); const m = ver(app);
  for (const s of ["inicio", "torneos", "deportes", "calendario", "resultados", "clasif", "equipos", "noticias", "liga", "cuenta", "admin"]) assert.ok(m.includes('data-s="' + s + '"'), s);
  const p = escenario({ admin: false, roles: {} }).app; assert.ok(!ver(p).includes('data-s="admin"'));
  assert.ok(ver(p).includes("Mi cuenta")); p.run("UID=null"); assert.ok(ver(p).includes("Acceso"));
});
test("el menú se abre y se cierra y se cierra al navegar", () => {
  const { app } = escenario(); assert.ok(!app.classes.has("menu-open"));
  app.click("menu"); app.run("render()"); assert.ok(app.classes.has("menu-open"));
  app.click("go", { s: "torneos" }); app.run("render()"); assert.ok(!app.classes.has("menu-open"));
});
test("el panel usa un tema oscuro independiente", () => {
  const { app } = escenario(); vista(app, "admin"); assert.ok(app.classes.has("admin"));
  vista(app, "inicio"); assert.ok(!app.classes.has("admin"));
});
test("inicio: próximos partidos, resultados recientes, torneos activos, clasificaciones destacadas y deportes", () => {
  const { app } = escenario(); const h = vista(app, "inicio");
  for (const t of ["Resultados recientes", "Torneos activos", "Clasificaciones destacadas", "Deportes"]) assert.ok(h.includes(t), t);
  assert.ok(h.includes("<b>3</b>") && h.includes("class=\"mrow\""));
});
test("torneos: lista las ediciones con filtros y oculta las que no tienen rama a quien no es organizador", () => {
  const { app } = escenario(); let h = vista(app, "torneos");
  assert.strictEqual((h.match(/class="edc"/g) || []).length, 4);
  app.change("pf", { k: "dep" }, "vol"); h = vista(app); assert.strictEqual((h.match(/class="edc"/g) || []).length, 1);
  app.change("pf", { k: "dep" }, ""); app.change("pf", { k: "rama" }, "f"); h = vista(app); assert.strictEqual((h.match(/class="edc"/g) || []).length, 2);
  const p = escenario({ admin: false, roles: {} }); assert.strictEqual((vista(p.app, "torneos").match(/class="edc"/g) || []).length, 3);
});
test("torneos: el botón abre la edición en la pestaña elegida", () => {
  const { app, b } = escenario(); app.click("edopen", { id: String(b.id), v: "t" });
  assert.strictEqual(app.run("SC"), "dep"); assert.strictEqual(app.run("SPORT"), "vol"); assert.strictEqual(app.run("RAMA"), "m"); assert.strictEqual(app.run("V"), "t");
});
test("deportes: cada deporte con sus reglas y las dos ramas", () => {
  const { app } = escenario(); app.run("CFG.reglas={vol:'Sets cortos a 21'}"); const h = vista(app, "deportes");
  for (const n of ["Baseball5", "Basket 3x3", "Voleibol"]) assert.ok(h.includes(n));
  assert.ok(h.includes("Sets cortos a 21")); assert.strictEqual((h.match(/data-ra="f"/g) || []).length, 3);
});
test("calendario: agrupa por fecha y filtra por deporte, equipo, estado y fecha", () => {
  const { app } = escenario(); let h = vista(app, "calendario");
  assert.ok(h.includes("martes") || h.includes("20 de octubre")); assert.ok(h.includes("08:00"));
  app.change("pf", { k: "est" }, "aplazado"); h = vista(app); assert.strictEqual((h.match(/class="mrow"/g) || []).length, 1);
  app.change("pf", { k: "est" }, ""); app.change("pf", { k: "fecha" }, "2026-10-21"); h = vista(app); assert.strictEqual((h.match(/class="mrow"/g) || []).length, 1);
  app.click("pfclear"); app.change("pf", { k: "dep" }, "beis"); h = vista(app); assert.strictEqual((h.match(/class="mrow"/g) || []).length, 3);
  assert.ok(h.includes("Sin fecha (1)"));
  app.change("pf", { k: "team" }, "T3"); h = vista(app); assert.strictEqual((h.match(/class="mrow"/g) || []).length, 2);
});
test("resultados: solo partidos con resultado oficial o en curso", () => {
  const { app } = escenario(); const h = vista(app, "resultados");
  assert.strictEqual((h.match(/class="mrow"/g) || []).length, 4);
  assert.ok(!h.includes("aplazado") && !h.includes("Aplazado"));
});
test("clasificaciones: tabla de cada edición con tabla y tarjeta para las de llaves", () => {
  const { app } = escenario(); const h = vista(app, "clasif");
  assert.ok(h.includes("<table")); assert.ok(h.includes("Torneos con llaves"));
  app.change("pf", { k: "dep" }, "vol"); assert.ok(!vista(app).includes("Torneos con llaves"));
});
test("equipos: directorio con registro y ficha con resultados", () => {
  const { app, a } = escenario(); let h = vista(app, "equipos");
  assert.ok(h.includes('data-a="team"')); assert.ok(h.includes("PJ 1, G 1, P 0"));
  app.click("team", { id: String(a.id), n: "T1" }); h = vista(app);
  assert.strictEqual(app.run("SC"), "equipo"); assert.ok(h.includes("Partidos jugados") && h.includes("Resultados y partidos"));
  assert.ok(h.includes("Profe Luis") && h.includes("Ana"));
});
test("ficha de equipo: la plantilla no se publica a visitantes", () => {
  const { app, a } = escenario({ admin: false, roles: {} }); app.click("team", { id: String(a.id), n: "T1" });
  const h = vista(app); assert.ok(!h.includes("Ana") && !h.includes("Profe Luis")); assert.ok(h.includes("privacidad"));
});
test("equipos: la posición en la tabla de la ficha", () => {
  const { app, b } = escenario(); app.click("team", { id: String(b.id), n: "T1" });
  assert.ok(vista(app).includes("1º"));
});
test("noticias: los borradores solo los ve el personal autorizado", () => {
  const { app } = escenario(); assert.ok(vista(app, "noticias").includes("Borrador secreto"));
  const p = escenario({ admin: false, roles: {} }).app; const h = vista(p, "noticias");
  assert.ok(h.includes("Aviso publicado") && !h.includes("Borrador secreto"));
});
test("información de la liga: refleja la configuración y explica los roles", () => {
  const { app } = escenario(); app.run("CFG.nombre='Liga Sol';CFG.desc='Deporte escolar';CFG.reglamento='Respeto ante todo';CFG.contacto='sol@escuela.mx'");
  const h = vista(app, "liga");
  for (const t of ["Liga Sol", "Deporte escolar", "Respeto ante todo", "sol@escuela.mx", "Superadministrador", "Coordinador deportivo", "Anotador", "Manager de equipo", "Capitán", "Visitante"]) assert.ok(h.includes(t), t);
  assert.strictEqual(app.els.lname.textContent, "Liga Sol");
});
test("configuración: la guarda el superadministrador y no un coordinador", () => {
  const { app } = escenario(); app.run("SC='admin';AV='k'");
  app.els.cf_n.value = "Liga Norte"; app.els.cf_d.value = "D"; app.els.cf_c.value = "c"; app.els.cf_r.value = "r"; app.click("cfgsave");
  assert.strictEqual(app.run("CFG.nombre"), "Liga Norte");
  assert.ok(app.state.writes.some(w => w[0] === "config" && w[2].nombre === "Liga Norte"));
  const c = escenario({ admin: false, roles: { u1: { role: "organizador" } } }).app; c.els.cf_n.value = "Hackeada"; c.click("cfgsave");
  assert.notStrictEqual(c.run("CFG.nombre"), "Hackeada");
});
test("reglamentos por deporte: los guarda un coordinador y no un anotador", () => {
  const c = escenario({ admin: false, roles: { u1: { role: "organizador" } } }).app; c.els.rg_vol.value = "Mejor de 5"; c.els.rg_beis.value = ""; c.els.rg_bas3.value = ""; c.click("reglassave");
  assert.strictEqual(c.run("CFG.reglas.vol"), "Mejor de 5");
  const n = escenario({ admin: false, roles: { u1: { role: "anotador" } } }).app; n.els.rg_vol.value = "X"; n.click("reglassave"); assert.notStrictEqual(n.run("CFG.reglas.vol"), "X");
});
test("roles nuevos: el anotador registra marcadores pero no administra", () => {
  const { app, a } = escenario({ admin: false, roles: { u1: { role: "anotador" } } });
  assert.strictEqual(app.run("canScore()"), true); assert.strictEqual(app.run("isOrg()"), false); assert.strictEqual(app.run("canAdmin()"), true);
  app.run("SC='dep';SPORT='beis';RAMA='f';S.cur=" + a.id + ";V='p'");
  app.change("sc", { r: "L", i: "1", k: "a" }, "4"); assert.strictEqual(a.matches[1].sa, 4);
  app.click("gen"); app.click("arch"); assert.ok(!a.arch);
});
test("etiquetas de roles: superadministrador, coordinador, manager y visitante", () => {
  const { app } = escenario(); assert.strictEqual(app.run("roleName()"), "Superadministrador");
  const c = escenario({ admin: false, roles: { u1: { role: "organizador" } } }).app; assert.strictEqual(c.run("roleName()"), "Coordinador deportivo");
  const r = escenario({ admin: false, roles: { u1: { role: "entrenador", team: "T1" } } }).app; assert.strictEqual(r.run("roleName()"), "Manager de equipo");
  const v = escenario({ admin: false, roles: {} }).app; assert.strictEqual(v.run("roleName()"), "Visitante");
});
test("panel: resultados y marcadores, equipos y jugadores, clasificaciones y deportes", () => {
  const { app } = escenario(); app.run("SC='admin'");
  app.run("AV='m'"); assert.ok(app.run("vAdmin()").includes("Resultados recientes") && app.run("vAdmin()").includes("Corregir"));
  app.run("AV='q'"); assert.ok(app.run("vAdmin()").includes("Gestionar"));
  app.click("edopen", { id: String(app.run("S.list[0].id")), v: "e", n: "T1" }); assert.strictEqual(app.run("OT"), "T1"); assert.strictEqual(app.run("V"), "e");
  app.run("SC='admin';AV='c'"); assert.ok(app.run("vAdmin()").includes("<table"));
  app.run("AV='d'"); assert.ok(app.run("vAdmin()").includes('data-a="reglassave"'));
});

test("inicio: tarjetas de resumen, torneos activos, actividad y próximos partidos en tarjetas", () => {
  const { app, c } = escenario(); app.run("var d=new Date();d.setDate(d.getDate()+1);var iso=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);S.list[0].matches[1].date=iso;S.list[0].matches[1].time='17:00'");
  app.run("S.list[1].matches[0].live=newLive({sport:'vol'});S.list[1].matches[0].live.ts0=Date.now();S.list[1].matches[0].live.st='on';sync(S.list[1].matches[0])");
  const h = vista(app, "inicio");
  assert.strictEqual((h.match(/class="kpi"/g) || []).length, 4);
  assert.ok(h.includes('data-l="Torneos"') && h.includes('data-l="En juego"') && h.includes('data-l="Equipos"') && h.includes('data-l="Próximos partidos"'));
  assert.ok(h.includes('class="er"')); assert.ok(h.includes("Actividad reciente") && h.includes("En vivo:"));
  assert.ok(h.includes('class="upc"') && h.includes("Mañana") && h.includes("17:00"));
});
test("el menú se agrupa por secciones con iconos y el pie muestra a la persona", () => {
  const { app } = escenario(); const m = ver(app);
  for (const g of ["Explorar", "Competencia", "Liga", "Cuenta"]) assert.ok(m.includes('class="mh">' + g), g);
  assert.ok(m.includes("<svg") && m.includes('class="ms"'));
  app.run("NAME='Olga Pérez'"); vista(app, "inicio"); assert.ok(app.els.rb.innerHTML.includes("Olga Pérez") && app.els.rb.innerHTML.includes("Superadministrador"));
  app.run("UID=null"); vista(app, "inicio"); assert.ok(app.els.rb.innerHTML.includes("Iniciar sesión"));
});
test("el menú del panel agrupa y muestra contadores de pendientes", () => {
  const { app } = escenario(); app.run("SC='admin';AV='r';ANU=[{id:'1',txt:'x',ts:1,st:'borrador'}];SOL={a:{},b:{}};INSC={c:{}}");
  const m = ver(app); for (const g of ["Resumen", "Competencia", "Comunidad", "Sistema"]) assert.ok(m.includes('class="mh">' + g), g);
  assert.ok(/class="bd">3</.test(m)); assert.ok(/class="bd">1</.test(m));
});
test("clasificaciones: encabezado de color con el nombre del grupo y posiciones con ceros", () => {
  const { app } = escenario(); const g = app.season("grupos", 8, { sport: "bas3", rama: "m", name: "Mundialito" }); app.ctx._g = g; app.run("S.list.push(_g);generate(_g)");
  const h = app.run("viewT(_g)");
  assert.ok(h.includes('class="tw stb g0"') && h.includes('class="tw stb g1"')); assert.ok(h.includes("Grupo A") && h.includes("Grupo B")); assert.ok(h.includes('class="rk">01<'));
  const l = vista(app, "clasif"); assert.ok(l.includes("stb g0"));
});
test("ficha de equipo: banner con escudo, tarjetas de estadísticas y plantilla con número", () => {
  const { app, a } = escenario(); app.click("team", { id: String(a.id), n: "T1" }); const h = vista(app);
  assert.ok(h.includes("hero2 team") && h.includes('data-l="Partidos jugados"') && h.includes("#9") && h.includes("Central"));
});
test("página de la edición: banner con estado, equipos y partidos", () => {
  const { app, a } = escenario(); app.click("edopen", { id: String(a.id), v: "p" }); const h = vista(app);
  assert.ok(h.includes('class="hero2"') && h.includes("equipos") && h.includes("partidos"));
});
test("panel: resumen con tarjetas, próximos eventos, clasificación y acciones rápidas", () => {
  const { app } = escenario(); app.run("NAME='Olga';SC='admin';AV='r'");
  const h = vista(app); assert.ok(h.includes("Bienvenido, Olga")); assert.ok(h.includes("Próximos eventos") && h.includes("Clasificación") && h.includes("Acciones rápidas") && h.includes("Requiere atención"));
  assert.ok(h.includes('data-a="bkp"') && h.includes("Nueva edición"));
  const a = escenario({ admin: false, roles: { u1: { role: "arbitro" } } }).app; a.run("SC='admin';AV='r'"); const ha = vista(a);
  assert.ok(!ha.includes('data-a="bkp"') && ha.includes("Resultados y marcadores"));
});
