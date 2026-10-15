const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function liga() {
  const app = load(); app.login({ admin: true });
  const T = app.season("liga", 3); T.matches = [{ a: "T1", b: "T2", date: "2026-10-20", time: "08:00" }, { a: "T1", b: "T3" }, { a: "T2", b: "T3" }];
  app.ctx.T = T; app.run("S.list=[T];S.cur=T.id;SC='dep';SPORT='bas3';V='p'");
  return { app, T };
}
const logs = app => app.state.writes.filter(w => w[0] === "historial").map(w => w[2].a + ": " + w[2].d);

test("anotar un resultado por primera vez no pide confirmación y queda registrado", () => {
  const { app, T } = liga();
  app.change("sc", { r: "L", i: "0", k: "a" }, "3"); app.change("sc", { r: "L", i: "0", k: "b" }, "2");
  assert.strictEqual(app.state.confirms.length, 0); assert.strictEqual(T.matches[0].sa, 3);
  assert.ok(logs(app).some(l => l.startsWith("Resultado anotado")));
});
test("corregir un resultado oficial pide confirmación; si se cancela no cambia", () => {
  const { app, T } = liga();
  app.change("sc", { r: "L", i: "0", k: "a" }, "3"); app.change("sc", { r: "L", i: "0", k: "b" }, "2");
  app.state.answer = false; app.change("sc", { r: "L", i: "0", k: "a" }, "9");
  assert.ok(/resultado oficial/.test(app.state.confirms.at(-1))); assert.strictEqual(T.matches[0].sa, 3);
  app.state.answer = true; app.change("sc", { r: "L", i: "0", k: "a" }, "9");
  assert.strictEqual(T.matches[0].sa, 9);
  assert.ok(logs(app).some(l => l.startsWith("Resultado corregido") && l.includes("antes T1 3 - 2 T2")));
});
test("quitar un equipo con partidos generados pide confirmación", () => {
  const { app, T } = liga();
  app.state.answer = false; app.click("rm", { i: "0" });
  assert.strictEqual(T.teams.length, 3); assert.strictEqual(T.matches.length, 3);
  app.state.answer = true; app.click("rm", { i: "0" });
  assert.strictEqual(T.teams.length, 2); assert.strictEqual(T.matches.length, 0);
  assert.ok(logs(app).some(l => l.startsWith("Equipo quitado")));
});
test("el historial escapa el texto y solo lo ve el organizador", () => {
  const { app } = liga();
  app.run("LOGS=[{ts:Date.now(),uid:'u1',by:'Ana',tid:S.cur,tn:'x',a:'<b>x</b>',d:''}]");
  assert.ok(app.run("logHtml(S.cur)").includes("&lt;b&gt;"));
  app.run("ADMIN=false;ROLES={}"); assert.strictEqual(app.run("logHtml(null)"), "");
});
test("estados: aplazar limpia fecha y hora; el programador lo reasigna; cancelar lo excluye", () => {
  const { app, T } = liga();
  app.change("est", { r: "L", i: "0" }, "aplazado");
  assert.strictEqual(app.run("estOf(T,T.matches[0])"), "aplazado"); assert.ok(!T.matches[0].date);
  app.change("est", { r: "L", i: "1" }, "cancelado");
  const n = app.run("schedule(T,{date:'2026-10-21',start:480,end:840,dur:40,courts:1,skip:false})");
  assert.ok(T.matches[0].date && !T.matches[0].est); assert.ok(!T.matches[1].date); assert.strictEqual(n, 2);
});
test("un partido cancelado no impide que haya campeón ni cuenta en el avance", () => {
  const { app, T } = liga();
  T.matches[1].est = "cancelado"; T.matches[0].sa = 1; T.matches[0].sb = 0; T.matches[2].sa = 2; T.matches[2].sb = 1;
  assert.ok(app.run("champ(T)")); assert.ok(/2 de 2/.test(app.run("prog(T)")));
});
test("tarjetas: aplazado bloquea el marcador; finalizado no muestra selector de estado", () => {
  const { app, T } = liga();
  T.matches[0].est = "aplazado"; assert.ok(app.run("card(T,T.matches[0],'L',0)").includes('data-a="sc" disabled'));
  T.matches[0] = { a: "T1", b: "T2", sa: 1, sb: 0 };
  assert.ok(!app.run("card(T,T.matches[0],'L',0)").includes('data-a="est"'));
});
test("filtros por estado y equipo", () => {
  const { app, T } = liga();
  T.matches[0].sa = 1; T.matches[0].sb = 0; T.matches[1].est = "cancelado";
  const n = () => (app.run("listFiltered(T)").match(/class="match"/g) || []).length;
  app.run("FILT={est:'finalizado',team:''}"); assert.strictEqual(n(), 1);
  app.run("FILT={est:'',team:'T3'}"); assert.strictEqual(n(), 2);
  app.run("FILT={est:'cancelado',team:'T3'}"); assert.strictEqual(n(), 1);
  app.run("FILT={est:'en curso',team:''}"); assert.ok(app.run("listFiltered(T)").includes("Ningún partido"));
});
