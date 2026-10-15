const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function hoy() { const d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function escenario(rol) {
  const app = load();
  const a = app.season("liga", 3, { sport: "beis", name: "Edición 1" });
  a.matches = [
    { a: "T1", b: "T2", date: hoy(), time: "09:00" },      // hoy
    { a: "T1", b: "T3" },                                   // sin fecha
    { a: "T2", b: "T3", est: "aplazado" }                  // aplazado
  ];
  const b = app.season("liga", 2, { sport: "vol", name: "Edición 1" });
  b.matches = [{ a: "T1", b: "T2" }];
  b.matches[0].live = app.run("(function(){var t={sport:'vol'};return newLive(t)})()"); b.matches[0].live.ts0 = 5; app.ctx._b = b; app.run("sync(_b.matches[0])");
  const c = app.season("elim", 4, { sport: "bas3", name: "Sin generar" });
  app.ctx._l = [a, b, c]; app.run("S.list=_l;S.cur=null;BOOT=true;SC='admin';AV='r'");
  app.login(rol === "org" ? { admin: true } : { admin: false, roles: { u1: { role: rol } } });
  return { app, a, b, c };
}
const tabs = app => { app.run("SC='admin'"); return [...app.run("menuHtml()").matchAll(/data-a="atab" data-v="(\w)"/g)].map(m => m[1]).join(""); };

test("solo organizadores y árbitros entran al panel; el resto ve un aviso", () => {
  for (const rol of ["espectador", "jugador", "entrenador"]) {
    const { app } = escenario(rol); assert.ok(app.run("vAdmin()").includes("solo para personal autorizado"), rol);
    assert.strictEqual(app.run("canAdmin()"), false);
  }
});
test("cada rol ve solo las secciones del panel que le corresponden", () => {
  assert.strictEqual(tabs(escenario("arbitro").app), "rpm");
  assert.strictEqual(tabs(escenario("anotador").app), "rpm");
  const { app } = escenario("org");
  assert.strictEqual(tabs(app), "rtdqpmcnuhk");
  app.login({ admin: false, roles: { u1: { role: "organizador" } } });
  assert.strictEqual(tabs(app), "rtdqpmcnh");
});
test("resumen: cuenta partidos en vivo, de hoy, sin fecha y aplazados", () => {
  const { app } = escenario("org"); const h = app.run("admResumen()");
  const box = l => +new RegExp('data-l="' + l + '"[\\s\\S]*?<b>(\\d+)</b>').exec(h)[1];
  assert.strictEqual(box("En vivo"), 1); assert.strictEqual(box("Hoy"), 1);
  assert.strictEqual(box("Sin fecha"), 1); assert.strictEqual(box("Aplazados"), 1);
  assert.strictEqual(box("Ediciones activas"), 3);
});
test("resumen: avisa de ediciones sin equipos generados", () => {
  const { app } = escenario("org"); const h = app.run("admResumen()");
  assert.ok(h.includes("aún no se generan los partidos"));
});
test("partidos: secciones en vivo, hoy, sin fecha y aplazados con botón para abrir", () => {
  const { app } = escenario("org"); app.run("AV='p'"); const h = app.run("admPartidos()");
  assert.ok(h.includes("En vivo ahora (1)") && h.includes("Hoy (1)") && h.includes("Sin fecha (1)") && h.includes("Aplazados (1)"));
  assert.ok(h.includes('data-a="admlive"'));
  app.click("admlive", { id: String(app.ctx.S.list[1].id), r: "L", i: "0", g: "" });
  assert.strictEqual(app.run("SC"), "vivo"); assert.strictEqual(app.run("SPORT"), "vol");
});
test("partidos: un árbitro puede abrir un marcador desde el panel", () => {
  const { app } = escenario("arbitro"); app.run("AV='p'");
  assert.ok(app.run("vAdmin()").includes('data-a="admlive"'));
});
test("ediciones: lista todas, crea una por deporte y archiva/restaura", () => {
  const { app } = escenario("org"); app.run("AV='t'");
  assert.ok(app.run("admEdiciones()").split("<tr>").length === 5);
  app.click("admnew", { sp: "vol" });
  assert.strictEqual(app.run("seasons('vol').length"), 2); assert.strictEqual(app.run("SC"), "dep");
  const id = String(app.ctx.S.list[0].id); app.click("admarch", { id });
  assert.strictEqual(app.ctx.S.list[0].arch, true);
  app.click("admarch", { id }); assert.ok(!app.ctx.S.list[0].arch);
});
test("ediciones: un árbitro no puede crear ni archivar", () => {
  const { app } = escenario("arbitro"); const n = app.ctx.S.list.length;
  app.click("admnew", { sp: "vol" }); app.click("admarch", { id: String(app.ctx.S.list[0].id) });
  assert.strictEqual(app.ctx.S.list.length, n); assert.ok(!app.ctx.S.list[0].arch);
});
test("personas: Roles vuelve a ser alcanzable desde el panel y sin el historial duplicado", () => {
  const { app } = escenario("org"); app.run("AV='u'");
  const h = app.run("vAdmin()");
  assert.ok(h.includes("Roles disponibles") && h.includes("Inscripciones pendientes"));
  assert.ok(!h.includes("Historial de cambios"));
});
test("el panel es accesible desde el menú y desde Cuenta para quien puede administrar", () => {
  const { app } = escenario("org"); app.run("SC='inicio'");
  assert.ok(app.run("menuHtml()").includes('data-s="admin"'));
  app.run("UID='u1'"); assert.ok(app.run("vCuenta()").includes('data-s="admin"'));
  const p = escenario("jugador").app; p.run("SC='inicio'"); assert.ok(!p.run("menuHtml()").includes('data-s="admin"'));
});
test("inscripciones: se aprueban en la edición correcta aunque se esté viendo otra", () => {
  const { app, c } = escenario("org");
  app.run("DB=DBs;INSC={u9:{tid:" + c.id + ",team:'Rayos',name:'Zoe'}}"); app.run("S.cur=S.list[0].id");
  const antes = c.teams.length; app.click("iapr", { id: "u9" });
  assert.strictEqual(c.teams.length, antes + 1); assert.ok(c.teams.includes("Rayos"));
  assert.strictEqual(app.run("cur().id"), c.id);
});
test("noticias: el panel lista todas, incluidos los borradores", () => {
  const { app } = escenario("org"); app.run("DB=DBs;AV='n';ANU=[{id:'1',txt:'Uno',ts:2,st:'publicado'},{id:'2',txt:'Dos',ts:1,st:'borrador'},{id:'3',txt:'Tres',ts:0},{id:'4',txt:'Cuatro',ts:-1},{id:'5',txt:'Cinco',ts:-2},{id:'6',txt:'Seis',ts:-3},{id:'7',txt:'Siete',ts:-4}]");
  const h = app.run("admNoticias()"); assert.ok(h.includes("Siete") && h.includes("Borrador"));
  assert.ok(!app.run("annHtml()").includes("Siete"));
});
test("respaldo: descarga un JSON con las ediciones", async () => {
  const { app } = escenario("org"); const guardado = [];
  app.ctx._dl = { save: o => { guardado.push(o); return Promise.resolve(); } }; app.run("DL=_dl");
  app.click("bkp"); assert.strictEqual(guardado.length, 1);
  assert.ok(/^respaldo-torneos-\d{4}-\d{2}-\d{2}\.json$/.test(guardado[0].filename));
  const d = JSON.parse(await guardado[0].data.text());
  assert.strictEqual(d.app, "torneos-escolares"); assert.strictEqual(d.temporadas.length, 3);
});
test("respaldo: restaurar agrega copias nuevas y rechaza archivos inválidos", () => {
  const { app } = escenario("org");
  app.ctx.FileReader = class { readAsText(f) { this.result = f.text; this.onload(); } };
  const bueno = JSON.stringify({ app: "torneos-escolares", temporadas: [{ id: 1, sport: "vol", type: "liga", name: "Vieja", teams: ["A", "B"], matches: [], rounds: [], gr: [], ro: {} }, { basura: true }] });
  const n = app.ctx.S.list.length;
  app.ctx._f = { files: [{ size: 10, text: "no es json" }] }; app.change("bkpin", {}, ""); 
  app.run("restore(_f)"); assert.strictEqual(app.ctx.S.list.length, n);
  app.ctx._f = { files: [{ size: 10, text: JSON.stringify({ app: "otra-cosa", temporadas: [] }) }] }; app.run("restore(_f)"); assert.strictEqual(app.ctx.S.list.length, n);
  app.ctx._f = { files: [{ size: 10, text: bueno }] }; app.run("restore(_f)");
  assert.strictEqual(app.ctx.S.list.length, n + 1);
  const nueva = app.ctx.S.list.at(-1); assert.ok(nueva.name.includes("restaurada")); assert.ok(app.ctx.S.list.slice(0, -1).every(t => t.id !== nueva.id));
});
test("respaldo: un archivo demasiado grande se rechaza", () => {
  const { app } = escenario("org"); app.ctx.FileReader = class { readAsText() { throw new Error("no debe leerse"); } };
  app.ctx._f = { files: [{ size: 9e6, text: "" }] }; assert.doesNotThrow(() => app.run("restore(_f)"));
});

test("renombrar: las ediciones llamadas «Temporada N» pasan a «Edición N» y las personalizadas no se tocan", () => {
  const { app } = escenario("org"); app.run("AV='t'");
  app.ctx.S.list[0].name = "Temporada 1"; app.ctx.S.list[1].name = "Temporada 7"; app.ctx.S.list[2].name = "Copa Otoño";
  assert.ok(app.run("admEdiciones()").includes('data-a="admren"'));
  app.click("admren");
  assert.deepStrictEqual(app.ctx.S.list.map(t => t.name), ["Edición 1", "Edición 7", "Copa Otoño"]);
  assert.ok(!app.run("admEdiciones()").includes('data-a="admren"'));
});
test("renombrar: un árbitro no puede", () => {
  const { app } = escenario("arbitro"); app.ctx.S.list[0].name = "Temporada 1"; app.click("admren");
  assert.strictEqual(app.ctx.S.list[0].name, "Temporada 1");
});
test("una edición nueva se llama «Edición N»", () => {
  const { app } = escenario("org"); app.run("SC='dep';SPORT='vol';RAMA='f';V='p'");
  app.click("newseason"); assert.ok(/^Edición \d+$/.test(app.run("cur().name")));
});
