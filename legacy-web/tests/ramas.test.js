const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function escenario(rol) {
  const app = load(); app.login(rol || { admin: true });
  const f1 = app.season("liga", 3, { sport: "vol", rama: "f", name: "Edición 1" });
  const m1 = app.season("liga", 3, { sport: "vol", rama: "m", name: "Edición 1" });
  const m2 = app.season("liga", 3, { sport: "vol", rama: "m", name: "Edición 2" });
  const viejo = app.season("liga", 3, { sport: "vol", name: "Antigua" }); delete viejo.rama;
  app.ctx._l = [f1, m1, m2, viejo]; app.run("S.list=_l;S.cur=null;BOOT=true;SC='dep';SPORT='vol';RAMA='f';V='p'");
  return { app, f1, m1, m2, viejo };
}
const vista = app => { app.run("render()"); return app.els.app.innerHTML; };

test("cada rama muestra solo sus propias ediciones", () => {
  const { app } = escenario();
  assert.strictEqual(app.run("seasons('vol','f').length"), 1);
  assert.strictEqual(app.run("seasons('vol','m').length"), 2);
  vista(app); assert.strictEqual(app.run("cur().rama"), "f");
  app.click("rama", { v: "m" }); vista(app);
  assert.strictEqual(app.run("cur().rama"), "m"); assert.strictEqual(app.run("RAMA"), "m");
});
test("el selector de edición solo lista la rama actual", () => {
  const { app } = escenario(); app.click("rama", { v: "m" });
  const h = vista(app); assert.strictEqual((h.match(/<option value="\d+"/g) || []).length >= 2, true);
  assert.ok(h.includes("Edición 2")); app.click("rama", { v: "f" });
  assert.ok(!vista(app).includes("Edición 2"));
});
test("una edición nueva nace en la rama que se está viendo y numera dentro de ella", () => {
  const { app } = escenario(); app.click("rama", { v: "m" }); app.click("newseason");
  const n = app.run("cur()"); assert.strictEqual(n.rama, "m"); assert.strictEqual(n.name, "Edición 3");
  app.click("rama", { v: "f" }); app.click("newseason");
  assert.strictEqual(app.run("cur().rama"), "f"); assert.strictEqual(app.run("cur().name"), "Edición 2");
});
test("el título y la página de deportes muestran las dos ramas de cada deporte", () => {
  const { app } = escenario(); app.run("SC='dep'"); vista(app);
  assert.strictEqual(app.els.title.textContent, "🏐 Voleibol femenino");
  app.click("rama", { v: "m" }); vista(app); assert.strictEqual(app.els.title.textContent, "🏐 Voleibol masculino");
  app.run("SC='deportes'"); const h = vista(app);
  assert.strictEqual((h.match(/data-ra="f"/g) || []).length, 3); assert.strictEqual((h.match(/data-ra="m"/g) || []).length, 3);
});
test("entrar desde Deportes a la rama elegida", () => {
  const { app } = escenario(); app.run("SC='deportes'"); app.click("go", { s: "dep", sp: "vol", ra: "m" });
  vista(app); assert.strictEqual(app.run("RAMA"), "m"); assert.strictEqual(app.run("cur().rama"), "m");
});
test("palmarés e historial se calculan por rama", () => {
  const { app, f1, m1 } = escenario();
  for (const t of [f1, m1]) t.matches = [{ a: "T1", b: "T2", sa: 2, sb: 0 }, { a: "T1", b: "T3", sa: 2, sb: 0 }, { a: "T2", b: "T3", sa: 2, sb: 0 }];
  m1.matches[0].sa = 0; m1.matches[0].sb = 2; m1.matches[1].sa = 0; m1.matches[1].sb = 2; m1.matches[2].sa = 0; m1.matches[2].sb = 2; // en la rama m gana T3
  app.run("RAMA='f'"); assert.strictEqual(JSON.stringify(app.run("palmares('vol')")), '[["T1",1]]');
  app.run("RAMA='m'"); assert.strictEqual(JSON.stringify(app.run("palmares('vol')")), '[["T3",1]]');
});
test("las ediciones sin rama se ocultan a los demás y el organizador las asigna", () => {
  const { app, viejo } = escenario();
  assert.ok(vista(app).includes("Ediciones sin rama"));
  app.click("setrama", { id: String(viejo.id), v: "m" }); assert.strictEqual(viejo.rama, "m");
  assert.ok(!vista(app).includes("Ediciones sin rama"));
  const p = escenario({ admin: false, roles: { u1: { role: "espectador" } } }); assert.ok(!vista(p.app).includes("Ediciones sin rama"));
  p.app.click("setrama", { id: String(p.viejo.id), v: "f" }); assert.ok(!p.viejo.rama);
});
test("el organizador cambia la rama en Ajustes y un no organizador no puede", () => {
  const { app, f1 } = escenario(); app.run("V='a';S.cur=" + f1.id);
  assert.ok(vista(app).includes('data-a="trama"'));
  app.change("trama", {}, "m"); assert.strictEqual(f1.rama, "m"); assert.strictEqual(app.run("RAMA"), "m");
  const p = escenario({ admin: false, roles: { u1: { role: "arbitro" } } }); p.app.run("S.cur=" + p.f1.id); p.app.change("trama", {}, "m");
  assert.strictEqual(p.f1.rama, "f");
});
test("panel: crear por rama, tabla con rama y aviso de ediciones sin rama", () => {
  const { app } = escenario(); app.run("SC='admin';AV='t'");
  assert.ok(app.run("admEdiciones()").includes('data-ra="m"'));
  const n = app.ctx.S.list.length; app.click("admnew", { sp: "bas3", ra: "m" });
  assert.strictEqual(app.ctx.S.list.length, n + 1); assert.strictEqual(app.run("cur().rama"), "m"); assert.strictEqual(app.run("cur().sport"), "bas3");
  app.run("AV='r'"); assert.ok(app.run("admResumen()").includes("no tienen rama"));
});
test("compartir y diploma indican la rama", () => {
  const { app, m1 } = escenario(); app.ctx._t = m1;
  assert.ok(app.run("shareText(_t)").split("\n")[0].includes("masculino"));
});
