const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

function partido(sport) {
  const app = load(); const T = app.season("liga", 3, { sport });
  T.matches = [{ a: "T1", b: "T2" }, { a: "T1", b: "T3" }];
  T.ro = { T1: { coach: "", pl: [{ n: "Ana", num: "9", pos: "", st: true, cap: false }] }, T2: { coach: "", pl: [{ n: "Carla", num: "7", pos: "", st: true, cap: false }] } };
  app.ctx.T = T; app.run("S.list=[T];S.cur=T.id;BOOT=true;SC='vivo';LM={r:'L',i:0,g:null}");
  const m = T.matches[0]; m.live = app.run("newLive(T)"); m.live.ts0 = 1000; app.run("sync(T.matches[0])");
  const act = (x, k, v, mm) => { app.ctx._m = mm || m; app.ctx._x = x; app.ctx._k = k; app.ctx._v = v; app.run("liveAct(T,_m,_x,_k,_v)"); };
  return { app, T, m, act };
}
test("en vivo: los puntos se registran como eventos con el jugador y 'deshacer' los revierte", () => {
  const { app, m, act } = partido("gen"); app.run("LPL.a='Ana';LPL.b='Carla'");
  act("pt", "a", 1); act("pt", "a", 1); act("pt", "b", 1);
  assert.strictEqual(m.live.ev.length, 3); assert.deepStrictEqual([m.sa, m.sb], [2, 1]);
  act("pm", "a"); assert.strictEqual(m.live.ev.length, 2);
  act("undo"); assert.strictEqual(m.live.ev.length, 3);
  act("undo"); assert.deepStrictEqual([m.sa, m.sb], [2, 0]);
});
test("estadísticas por jugador salen de los eventos", () => {
  const { app, m, act } = partido("bas3"); app.run("LPL.a='Ana'");
  act("pt", "a", 2); act("pt", "a", 1); act("foul", "a");
  const a = app.run("statsOf(T)").find(s => s.p === "Ana"); assert.strictEqual(a.sc, 3); assert.strictEqual(a.foul, 1);
});
test("béisbol 5: carreras por entrada y cambio de mitad con 3 outs", () => {
  const { m, act } = partido("beis");
  act("run", "a"); act("out", "a"); act("out", "a"); act("out", "a");
  assert.strictEqual(m.live.half, "b"); assert.deepStrictEqual([m.sa, m.sb], [1, 0]);
});
test("voleibol: el set termina a 25 con diferencia de 2 y el partido a 2 sets", () => {
  const { m, act } = partido("vol");
  for (let i = 0; i < 25; i++) act("pt", "a"); assert.strictEqual(m.live.w.a, 1);
  for (let i = 0; i < 25; i++) act("pt", "a"); assert.strictEqual(m.live.over, true);
});
test("el historial de deshacer no crece sin límite", () => {
  const { m, act } = partido("gen");
  for (let i = 0; i < 100; i++) act("pt", "a", 1);
  assert.ok(m.live.h.length <= 25); assert.ok(JSON.stringify(m).length < 30000);
});
test("disciplina: 2 amarillas o 1 roja suspenden un partido y se cumple al jugar el siguiente", () => {
  const { app, T, m, act } = partido("gen"); app.run("LPL.a='Ana';LPL.b='Carla'");
  act("yc", "a"); act("yc", "a"); act("rc", "b"); m.live.st = "fin";
  let D = app.run("discipline(T)"); assert.strictEqual(D["T1|Ana"].pend, 1); assert.strictEqual(D["T2|Carla"].pend, 1);
  const m2 = T.matches[1]; m2.live = app.run("newLive(T)"); m2.live.ts0 = 2000;
  D = app.run("discipline(T)"); assert.strictEqual(D["T1|Ana"].pend, 0); assert.strictEqual(D["T2|Carla"].pend, 1);
  assert.strictEqual(app.run("discipline(T,2000)")["T1|Ana"].pend, 1);
});
test("calendario automático: sin choques de equipo, sin fines de semana y dentro del horario", () => {
  const app = load(); const T = app.season("liga", 6); app.ctx.T = T; app.run("generate(T)");
  app.ctx._o = { date: "2026-10-16", start: 480, end: 840, dur: 40, courts: 2, skip: true };
  assert.strictEqual(app.run("schedule(T,_o)"), 15);
  const slots = {};
  T.matches.forEach(m => { (slots[m.date + " " + m.time] = slots[m.date + " " + m.time] || []).push(m); const d = new Date(m.date + "T00:00").getDay(); assert.ok(d !== 0 && d !== 6); assert.ok(m.time >= "08:00" && m.time <= "13:20"); });
  Object.values(slots).forEach(a => { const ts = a.flatMap(m => [m.a, m.b]); assert.strictEqual(new Set(ts).size, ts.length); assert.ok(a.length <= 2); });
});
test("predicciones: el ranking cuenta aciertos y nunca premia votos tardíos", () => {
  const app = load(); const T = app.season("elim", 4, { sport: "gen" }); app.ctx.T = T; app.run("generate(T)"); app.run("S.list=[T]");
  const k0 = app.run("mkey(T,0,0,null)"), k1 = app.run("mkey(T,0,1,null)"); app.ctx._k = [k0, k1];
  app.run("PREDS={u1:{},u2:{}};PNAME={u1:'Ana',u2:'Beto'}");
  app.run("PREDS.u1[_k[0]]='a';PREDS.u2[_k[0]]='b';PREDS.u1[_k[1]]='a'");
  app.ctx._a = [0, 0, T.rounds[0][0].a]; app.run("setRes(T,_a[0],_a[1],_a[2])");
  app.ctx._a = [0, 1, T.rounds[0][1].b]; app.run("setRes(T,_a[0],_a[1],_a[2])");
  const r = app.run("predRank()"); assert.deepStrictEqual(r.map(x => x.name + " " + x.ok + "/" + x.n), ["Ana 1/2", "Beto 0/1"]);
});
test("comentarios: el texto se escapa; los avatares inseguros no se usan", () => {
  const app = load(); app.login({ admin: true });
  app.run("COM=[{id:'c',mk:'x',txt:'<b>hola</b>',uid:'u1',by:'Ana',ts:1}]");
  const h = app.run("comHtml('x')"); assert.ok(h.includes("&lt;b&gt;hola") && !h.includes("<b>hola"));
  app.run("PERF={u1:{foto:'javascript:alert(1)'},u2:{foto:'data:image/jpeg;base64,AAAA'}}");
  assert.ok(app.run("av('u1','Ana')").includes("<span")); assert.ok(app.run("av('u2','B')").includes("<img"));
});
test("PDF: el archivo generado tiene una tabla de referencias válida", async () => {
  const app = load();
  // JPEG mínimo de 1x1
  const jpg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  app.ctx._cv = { width: 1600, height: 1131, toDataURL: () => "data:image/jpeg;base64," + jpg };
  const buf = Buffer.from(await app.run("pdfBlob(_cv)").arrayBuffer()), txt = buf.toString("latin1");
  assert.ok(txt.startsWith("%PDF-1.4") && txt.trimEnd().endsWith("%%EOF"));
  const start = +/startxref\n(\d+)/.exec(txt)[1]; assert.ok(txt.slice(start).startsWith("xref"));
  const offs = [...txt.slice(start).matchAll(/(\d{10}) 00000 n/g)].map(m => +m[1]);
  offs.forEach((o, i) => assert.ok(txt.slice(o).startsWith((i + 1) + " 0 obj"), "objeto " + (i + 1)));
});
