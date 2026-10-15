const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function nuevo() {
  const app = load();
  const a = app.season("liga", 4, { sport: "beis", name: "Edición 1" }), b = app.season("elim", 4, { sport: "beis", name: "Edición 2" }), c = app.season("grupos", 4, { sport: "bas3" });
  a.ro = b.ro = { T1: { coach: "", pl: [{ n: "Ana", num: "9", pos: "", st: true, cap: false }] } };
  app.ctx._l = [a, b, c]; app.run("S.list=_l;S.cur=null;BOOT=true");
  return app;
}
test("cada deporte muestra su propia edición", () => {
  const app = nuevo();
  app.run("SC='dep';SPORT='beis';S.cur=null;render()"); assert.strictEqual(app.run("cur().sport"), "beis");
  app.run("SPORT='bas3';render()"); assert.strictEqual(app.run("cur().sport"), "bas3");
});
test("todas las pantallas y pestañas se dibujan sin errores", () => {
  const app = nuevo();
  for (const sc of ["inicio", "cuenta", "roles", "tv"]) { app.run("SC='" + sc + "'"); app.run("render()"); }
  for (const sp of ["beis", "bas3", "vol"]) for (const v of ["p", "t", "e", "c", "s", "h", "r", "a", "l"]) { app.run("SC='dep';SPORT='" + sp + "';V='" + v + "'"); app.run("render()"); }
});
test("el organizador crea y archiva ediciones; la archivada no es la elegida por defecto", () => {
  const app = nuevo();
  app.run("SC='dep';SPORT='vol';V='p';S.cur=null");
  app.click("newseason"); app.click("newseason");
  assert.strictEqual(app.run("seasons('vol').length"), 2);
  assert.strictEqual(app.run("seasons('vol')[0].name"), "Edición 2");
  app.click("arch"); assert.strictEqual(app.run("cur().arch"), true);
  app.run("S.cur=null"); assert.strictEqual(app.run("pickSeason('vol').arch"), undefined);
});
test("una edición nueva puede copiar equipos y plantillas de la anterior", () => {
  const app = nuevo();
  app.run("SC='dep';SPORT='beis';S.cur=S.list.filter(t=>t.sport=='beis')[0].id");
  app.click("newseason");
  assert.strictEqual(app.run("cur().teams.length"), 4);
  assert.strictEqual(app.run("cur().ro.T1.pl[0].n"), "Ana");
});
test("los ids de ediciones nunca se repiten", () => {
  const app = nuevo(); const ids = new Set();
  for (let i = 0; i < 50; i++) ids.add(app.run("mk().id"));
  assert.strictEqual(ids.size, 50);
});
test("vista pública: no se ven jugadores ni estadísticas", () => {
  const app = nuevo();
  app.run("DB={};UID=null;ROLES={};SC='dep';SPORT='beis';S.cur=seasons('beis')[1].id;V='e'");
  const h = app.run("equiposView(cur())");
  assert.ok(!h.includes("Ana") && h.includes("T1"));
  assert.ok(!app.run("vTorneo(cur())").includes('data-v="s"'));
});
test("sin permiso de organizador no se muestran controles de administración", () => {
  const app = nuevo(); app.login({ admin: false, roles: { u1: { role: "espectador" } } });
  app.run("SC='dep';SPORT='beis';S.cur=seasons('beis')[1].id;V='p'");
  const h = app.run("vTorneo(cur())");
  assert.ok(!h.includes('data-v="a"') && !h.includes('data-v="l"'));
  assert.strictEqual(app.run("isOrg()"), false);
  assert.strictEqual(app.run("canScore()"), false);
});
test("permisos por rol", () => {
  const app = nuevo();
  const caso = (role, team) => { app.login({ admin: false, roles: { u1: { role, team } } }); return { org: app.run("isOrg()"), score: app.run("canScore()"), t1: app.run("canRoster('T1')"), t2: app.run("canRoster('T2')") }; };
  assert.deepStrictEqual(caso("arbitro"), { org: false, score: true, t1: false, t2: false });
  assert.deepStrictEqual(caso("entrenador", "T1"), { org: false, score: false, t1: true, t2: false });
  assert.deepStrictEqual(caso("jugador", "T1"), { org: false, score: false, t1: false, t2: false });
  assert.deepStrictEqual(caso("organizador"), { org: true, score: true, t1: true, t2: true });
});
