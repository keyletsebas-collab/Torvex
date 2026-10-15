const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
function base() {
  const app = load(); const T = app.season("liga", 3, { name: "Temporada 1", sport: "bas3" });
  T.matches = [{ a: "T1", b: "T2", sa: 2, sb: 1 }, { a: "T1", b: "T3", sa: 1, sb: 0 }, { a: "T2", b: "T3", sa: 3, sb: 1 }];
  app.ctx.T = T; app.run("S.list=[T];S.cur=T.id;SC='dep';SPORT='bas3';V='p'"); app.login({ admin: true });
  return { app, T };
}

test("escudos: imagen válida se muestra; direcciones peligrosas y textos se escapan", () => {
  const { app, T } = base();
  app.ctx._esc = { [String(T.id)]: { T1: PNG, T2: "javascript:alert(1)" } }; app.run("ESC=_esc");
  assert.ok(app.run("crest(T,'T1')").includes("<img"));
  assert.ok(!app.run("crest(T,'T2')").includes("<img"));
  assert.ok(app.run("crest(T,'<b>x')").includes("&lt;"));
  assert.ok(app.run("crest(T,'Zorros')").includes(">Z<"));
});
test("escudos: las claves con puntos o espacios son seguras", () => {
  const { app } = base();
  assert.ok(!app.run("lkey('Águilas 1.0')").includes("."));
});
test("escudos: aparecen en tarjetas y tabla", () => {
  const { app, T } = base(); app.ctx._esc = { [String(T.id)]: { T1: PNG } }; app.run("ESC=_esc");
  assert.ok(app.run("card(T,T.matches[0],'L',0)").includes("<img"));
  assert.ok(app.run("viewT(T)").includes("<img"));
});
test("escudos: solo los autorizados ven el control de subida y pueden quitarlo", () => {
  const { app, T } = base();
  app.run("OT='T1'"); assert.ok(app.run("logoHtml(T)").includes('data-a="logo"'));
  app.ctx._esc = { [String(T.id)]: { T1: PNG, T2: PNG } }; app.run("ESC=_esc");
  app.click("logodel");
  const w = app.state.writes.find(x => x[0] === "escudos"); assert.ok(w && Object.keys(w[2].logos).length === 1 && !w[2].logos.T1);
  app.login({ admin: false, roles: { u1: { role: "entrenador", team: "T2" } } });
  assert.strictEqual(app.run("logoHtml(T)"), "");
});
test("noticias: los borradores solo los ve el organizador", () => {
  const { app } = base();
  app.run("ANU=[{id:'1',txt:'Publicado',ts:2,by:'Ana',st:'publicado'},{id:'2',txt:'Borrador secreto',ts:1,by:'Ana',st:'borrador'},{id:'3',txt:'Antiguo',ts:0}]");
  let h = app.run("annHtml()"); assert.ok(h.includes("Borrador secreto") && h.includes("Guardar borrador"));
  app.login({ admin: false, roles: { u1: { role: "jugador", team: "T1" } } });
  h = app.run("annHtml()"); assert.ok(h.includes("Publicado") && h.includes("Antiguo") && !h.includes("Borrador secreto") && !h.includes("Guardar borrador"));
});
test("noticias: publicar, guardar borrador y publicar un borrador", () => {
  const { app } = base(); app.els.antxt = app.els.antxt || null;
  app.run("$('antxt')"); app.els.antxt.value = " Aviso uno ";
  app.click("apub"); app.click("adraft"); app.click("apubl", { id: "99" });
  const w = app.state.writes.filter(x => x[0] === "anuncios");
  assert.strictEqual(w[0][2].st, "publicado"); assert.strictEqual(w[1][2].st, "borrador");
  assert.strictEqual(w[2][3], "update"); assert.strictEqual(w[2][2].st, "publicado");
});
test("historial de temporadas: palmarés, subcampeón y totales", () => {
  const { app, T } = base();
  const T2 = app.season("liga", 3, { name: "Temporada 2", sport: "bas3" });
  T2.matches = [{ a: "T1", b: "T2", sa: 0, sb: 2 }, { a: "T1", b: "T3", sa: 0, sb: 1 }, { a: "T2", b: "T3", sa: 3, sb: 1 }];
  app.ctx._l = [T, T2]; app.run("S.list=_l");
  const pm = JSON.parse(JSON.stringify(app.run("palmares('bas3')")));
  assert.deepStrictEqual(pm.sort(), [["T1", 1], ["T2", 1]].sort());
  const info = app.run("seasonInfo(T)"); assert.strictEqual(info.c, "T1"); assert.strictEqual(info.n, 3); assert.strictEqual(info.tot, 8);
  const h = app.run("histHtml('bas3')"); assert.ok(h.includes("Palmarés") && h.includes("Campeón: T1") && h.includes("Subcampeón"));
});
test("historial de temporadas: el máximo anotador no se muestra en la vista pública", () => {
  const { app, T } = base();
  T.matches[0].live = app.run("newLive(T)"); T.matches[0].live.st = "fin"; T.matches[0].live.ts0 = 1;
  T.matches[0].live.ev = [{ k: "a", x: "pt", v: 2, p: "Ana", lab: "", ts: 1 }];
  assert.ok(app.run("histHtml('bas3')").includes("Máximo anotador: Ana"));
  app.run("DB={};UID=null;ROLES={}"); assert.ok(!app.run("histHtml('bas3')").includes("Máximo anotador"));
});
