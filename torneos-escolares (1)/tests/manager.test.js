const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function hoy(d) { const x = new Date(); x.setDate(x.getDate() + (d || 0)); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
function escenario(role, team) {
  const app = load(); app.login({ admin: false, roles: { u1: { role, team: team === undefined ? "T1" : team } } });
  const a = app.season("liga", 3, { sport: "bas3", rama: "f", name: "Edición 1" });
  a.matches = [{ a: "T1", b: "T2", date: hoy(1), time: "17:00", court: "Cancha 1" }, { a: "T3", b: "T1", date: hoy(3), time: "09:00" }, { a: "T2", b: "T3", date: hoy(2) }, { a: "T1", b: "T3", sa: 2, sb: 1 }];
  a.ro = { T1: { coach: "Profe", pl: [{ n: "Ana", num: "9", pos: "Base", st: true, cap: true }, { n: "Beto", num: "4", pos: "Alero", st: false, cap: false }] } };
  const b = app.season("liga", 2, { sport: "vol", rama: "m", name: "Edición 1" }); b.matches = [{ a: "T1", b: "T2" }];
  app.ctx._l = [a, b]; app.run("S.list=_l;S.cur=" + a.id + ";BOOT=true;SC='miequipo'");
  return { app, a, b };
}
const vista = app => { app.run("render()"); return app.els.app.innerHTML; };

test("los roles manager y capitán tienen nombre propio", () => {
  assert.strictEqual(escenario("entrenador").app.run("roleName()"), "Manager de equipo");
  assert.strictEqual(escenario("capitan").app.run("roleName()"), "Capitán");
  assert.strictEqual(escenario("capitan").app.run("myModeName()"), "Modo capitán");
});
test("el menú muestra Mi equipo con el modo y el equipo, y solo a quien tiene equipo", () => {
  for (const r of ["entrenador", "capitan", "jugador"]) { const { app } = escenario(r); assert.ok(app.run("menuHtml()").includes('data-s="miequipo"'), r); }
  assert.ok(escenario("entrenador").app.run("menuHtml()").includes("Modo manager: T1"));
  assert.ok(!escenario("arbitro").app.run("menuHtml()").includes("miequipo"));
  assert.ok(!escenario("espectador").app.run("menuHtml()").includes("miequipo"));
  assert.ok(!escenario("entrenador", "").app.run("menuHtml()").includes("miequipo"));
});
test("el contador del menú cuenta los partidos sin confirmar asistencia", () => {
  const { app } = escenario("entrenador"); assert.strictEqual(app.run("pendAtt()"), 3);
  app.click("attm", { id: String(app.ctx.S.list[0].id), r: "L", i: "0", k: "a" });
  app.run("ATT={}"); app.ctx._k = app.run("mkey(S.list[0],'L',0,null)+'_a'"); app.run("ATT[_k]={team:'T1'}");
  assert.strictEqual(app.run("pendAtt()"), 2); assert.ok(app.run("menuHtml()").includes('class="bd">2<'));
});
test("manager: ve la plantilla completa para editar y agregar jugadores", () => {
  const h = vista(escenario("entrenador").app);
  assert.ok(h.includes("Modo manager") && h.includes("Plantilla y alineación")); assert.ok(h.includes('data-a="ap"') && h.includes('data-a="st"') && h.includes('data-a="rp"'));
  assert.ok(!h.includes('data-a="ot"'));
});
test("capitán: arma la alineación pero no agrega ni quita jugadores", () => {
  const h = vista(escenario("capitan").app);
  assert.ok(h.includes("Modo capitán") && h.includes("Alineación") && h.includes('data-a="st"')); assert.ok(!h.includes('data-a="ap"') && !h.includes('data-a="rp"') && !h.includes('data-a="logo"'));
});
test("jugador: solo mira su equipo", () => {
  const h = vista(escenario("jugador").app);
  assert.ok(h.includes("Modo jugador") && h.includes("Ana")); assert.ok(!h.includes('data-a="st"') && !h.includes('data-a="ap"') && !h.includes('data-a="attm"'));
});
test("el capitán pasa jugadores entre titulares y banca; el jugador no", () => {
  const c = escenario("capitan"); vista(c.app); c.app.click("st", { i: "1" }); assert.strictEqual(c.a.ro.T1.pl[1].st, true);
  const j = escenario("jugador"); vista(j.app); j.app.click("st", { i: "1" }); assert.strictEqual(j.a.ro.T1.pl[1].st, false);
});
test("el capitán respeta el máximo de titulares", () => {
  const { app, a } = escenario("capitan"); a.ro.T1.pl = [1, 2, 3].map(n => ({ n: "J" + n, num: String(n), pos: "", st: n < 4, cap: false })); a.ro.T1.pl.push({ n: "J4", num: "4", pos: "", st: false, cap: false });
  vista(app); app.click("st", { i: "3" }); assert.strictEqual(a.ro.T1.pl[3].st, false);
});
test("solo el manager agrega y quita jugadores", () => {
  const m = escenario("entrenador"); vista(m.app); m.app.els.pnm.value = "Dani"; m.app.els.pnu.value = "11"; m.app.els.ppo.value = "Pívot"; m.app.click("ap");
  assert.strictEqual(m.a.ro.T1.pl.length, 3);
  const c = escenario("capitan"); vista(c.app); c.app.els.pnm.value = "Dani"; c.app.click("ap"); c.app.click("rp", { i: "0" }); assert.strictEqual(c.a.ro.T1.pl.length, 2);
});
test("manager y capitán confirman la asistencia solo de su equipo", () => {
  for (const r of ["entrenador", "capitan"]) {
    const { app, a } = escenario(r); const id = String(a.id);
    app.click("attm", { id, r: "L", i: "0", k: "a" });
    assert.ok(app.state.writes.some(w => w[0] === "asistencia" && w[2].team === "T1"), r);
    const n = app.state.writes.length; app.click("attm", { id, r: "L", i: "0", k: "b" }); assert.strictEqual(app.state.writes.length, n, r + " no puede confirmar por el rival");
  }
  const j = escenario("jugador"); j.app.click("attm", { id: String(j.a.id), r: "L", i: "0", k: "a" }); assert.ok(!j.app.state.writes.some(w => w[0] === "asistencia"));
});
test("las tarjetas de próximos partidos muestran el estado de asistencia y el botón según el rol", () => {
  const { app } = escenario("capitan"); app.run("ATT={};"); app.ctx._k = app.run("mkey(S.list[0],'L',0,null)+'_a'"); app.run("ATT[_k]={team:'T1'}");
  const h = vista(app); assert.ok(h.includes("Asistencia confirmada") && h.includes("Sin confirmar")); assert.ok(h.includes("Quitar confirmación") && h.includes("Confirmar asistencia"));
  assert.ok(!vista(escenario("jugador").app).includes("Confirmar asistencia"));
});
test("pendientes: suspendidos, titulares faltantes y plantilla vacía", () => {
  const { app, a } = escenario("entrenador");
  const m = a.matches[3]; m.live = app.run("newLive(S.list[0])"); m.live.st = "fin"; m.live.ts0 = 1; m.live.ev = [{ k: "a", x: "rc", p: "Ana", lab: "", ts: 1 }];
  let h = vista(app); assert.ok(h.includes("Suspendidos para el próximo partido: Ana")); assert.ok(h.includes("Faltan titulares"));
  a.ro.T1.pl = []; h = vista(app); assert.ok(h.includes("La plantilla está vacía"));
});
test("se puede cambiar entre las ediciones donde juega el equipo", () => {
  const { app, a, b } = escenario("entrenador"); let h = vista(app);
  assert.strictEqual((h.match(/data-a="medi"/g) || []).length, 2);
  app.click("medi", { id: String(b.id) }); h = vista(app); assert.strictEqual(app.run("cur().id"), b.id); assert.ok(h.includes("Edición 1"));
});
test("sin equipo asignado o sin ediciones se explica qué falta", () => {
  assert.ok(vista(escenario("entrenador", "").app).includes("todavía no tiene un equipo asignado"));
  const { app } = escenario("entrenador", "T9"); assert.ok(vista(app).includes("todavía no está inscrito"));
});
test("Inicio ofrece entrar a Mi equipo", () => {
  const { app } = escenario("capitan"); app.run("SC='inicio'"); const h = vista(app);
  assert.ok(h.includes("Mi equipo: T1") && h.includes('data-s="miequipo"') && h.includes("Modo capitán"));
  const o = escenario("arbitro").app; o.run("SC='inicio'"); assert.ok(!vista(o).includes("Mi equipo:"));
});
test("el capitán y el manager pueden pedirse desde la cuenta y exigen equipo", () => {
  const { app } = escenario("espectador", ""); app.run("SC='cuenta'"); const h = vista(app);
  assert.ok(h.includes('value="capitan"') && h.includes("Quiero ser capitán de mi equipo") && h.includes("Quiero ser manager de equipo"));
  app.els.cn.value = "Ana"; app.els.cc.value = "3B"; app.els.cq.value = "capitan"; app.els.ct.value = "Equipo inexistente"; app.click("sol");
  assert.ok(!app.state.writes.some(w => w[0] === "solicitudes"));
});
test("el administrador puede asignar capitán y manager", () => {
  const app = load(); app.login({ admin: true }); app.run("BOOT=true;SC='roles';U={search:function(){return Promise.resolve([])},profiles:function(){return Promise.resolve({})}};PICK={id:'x',name:'Zoe'}");
  assert.ok(vista(app).includes('value="capitan"'));
});
