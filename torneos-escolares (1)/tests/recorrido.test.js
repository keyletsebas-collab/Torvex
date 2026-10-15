// Recorridos completos por rol y revisiones automáticas de las pantallas.
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const { load } = require("./harness");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "js", "08-app.js"), "utf8");

const vista = app => { app.run("render()"); return app.els.app.innerHTML; };
const ir = (app, s, sp) => app.click("go", Object.assign({ s }, sp ? { sp } : {}));

test("recorrido del organizador: de crear la edición hasta el campeón y el panel", () => {
  const app = load(); app.login({ admin: true, uid: "org1", name: "Olga" });
  app.run("S.list=[];S.cur=null;BOOT=true;SC='inicio'");
  ir(app, "dep", "beis"); app.click("newseason");
  app.change("tname", {}, "Copa Otoño"); app.change("ttype", {}, "liga");
  for (const n of ["Rayos", "Tigres", "Águilas", "Lobos"]) { app.els.team.value = n; app.click("addt"); }
  assert.strictEqual(app.run("cur().teams.length"), 4);
  app.click("gen"); assert.strictEqual(app.run("cur().matches.length"), 6);
  Object.assign(app.els.sd, { value: "2026-10-19" }); app.els.ss.value = "08:00"; app.els.se.value = "12:00"; app.els.sm.value = "40"; app.els.sk.value = "2"; app.els.sw.checked = true;
  app.click("sched"); assert.strictEqual(app.run("cur().matches.filter(m=>m.date).length"), 6);
  for (let i = 0; i < 6; i++) {
    app.click("live", { r: "L", i: String(i) }); app.click("lstart");
    app.ctx._i = i; for (let k = 0; k < 3 + i; k++) app.run("liveAct(cur(),cur().matches[_i],'run','a')");
    app.run("liveAct(cur(),cur().matches[_i],'run','b')"); app.click("lfin");
  }
  ir(app, "dep", "beis");
  assert.ok(app.run("champ(cur())")); assert.strictEqual(app.run("table(cur())").length, 4);
  assert.ok(/6 de 6/.test(app.run("prog(cur())")));
  app.run("SC='inicio'"); const inicio = vista(app);
  assert.ok(inicio.includes("Resultados recientes") && inicio.includes("Clasificaciones destacadas"));
  app.run("SC='torneos'"); assert.ok(vista(app).includes("Salón de la fama"));
  ir(app, "admin"); assert.ok(vista(app).includes("Todo en orden"));
  app.click("admarch", { id: String(app.run("cur().id")) }); assert.strictEqual(app.run("cur().arch"), true);
});

test("recorrido del árbitro: anota y programa, pero no administra", () => {
  const app = load(); app.login({ admin: false, roles: { u1: { role: "arbitro" } } });
  const T = app.season("liga", 3, { sport: "bas3", name: "X" }); app.ctx._T = T; app.run("S.list=[_T];S.cur=_T.id;generate(_T);SC='dep';SPORT='bas3';V='p';BOOT=true");
  app.click("live", { r: "L", i: "0" }); app.click("lstart"); assert.ok(T.matches[0].live);
  app.ctx._m = T.matches[0]; app.run("liveAct(_T,_m,'pt','a',2)"); app.click("lfin"); assert.strictEqual(T.matches[0].live.st, "fin");
  app.change("sc", { r: "L", i: "1", k: "a" }, "4"); assert.strictEqual(T.matches[1].sa, 4);
  app.click("gen"); app.click("arch"); app.click("deltor");
  assert.ok(!T.arch && app.ctx.S.list.length === 1 && T.matches.length === 3);
  ir(app, "admin"); assert.ok(vista(app).includes("Avisos")); const menu = app.run("menuHtml()"); assert.ok(menu.includes('data-v="r"') && !menu.includes('data-v="k"') && !menu.includes('data-v="u"'));
});

test("recorrido del espectador: ve lo público y no puede cambiar nada", () => {
  const app = load(); app.login({ admin: false, roles: {} });
  const T = app.season("liga", 3, { sport: "vol", name: "X" }); T.ro = { T1: { coach: "", pl: [{ n: "Ana", num: "9", pos: "", st: true, cap: false }] } };
  app.ctx._T = T; app.run("S.list=[_T];S.cur=_T.id;generate(_T);SC='dep';SPORT='vol';V='e';BOOT=true");
  assert.ok(!vista(app).includes("Ana"));
  const antes = JSON.stringify(T);
  for (const a of ["gen", "rm", "addt", "arch", "deltor", "lstart", "win"]) app.click(a, { i: "0", r: "L" });
  app.change("sc", { r: "L", i: "0", k: "a" }, "9"); app.change("tname", {}, "Hackeado"); app.change("coach", {}, "Otro");
  assert.strictEqual(JSON.stringify(T), antes);
  ir(app, "admin"); assert.ok(vista(app).includes("solo para personal autorizado"));
});

test("revisión de pantallas: sin errores, etiquetas equilibradas y sin ids repetidos", () => {
  const roles = [{ admin: true }, { admin: false, roles: { u1: { role: "arbitro" } } }, { admin: false, roles: { u1: { role: "entrenador", team: "T1" } } }, { admin: false, roles: { u1: { role: "jugador", team: "T1" } } }, { admin: false, roles: {} }];
  const dataA = new Set(), dataS = new Set(); let vistas = 0;
  for (const rol of roles) {
    const app = load(); app.login(rol);
    const mk = (type, sport, n) => { const t = app.season(type, n, { sport, name: type + sport, third: type !== "liga", bo: type === "elim" ? 3 : 1 }); t.ro = { T1: { coach: "C", pl: [{ n: "Ana", num: "9", pos: "", st: true, cap: true }] } }; return t; };
    const L = [mk("liga", "beis", 4), mk("elim", "bas3", 5), mk("grupos", "vol", 8), mk("dele", "bas3", 6)];
    app.ctx._L = L; app.run("S.list=_L;S.cur=null;BOOT=true;ANU=[{id:'1',txt:'Aviso',ts:1,st:'borrador'}];LOGS=[];SOL={};INSC={}");
    L.forEach((t, i) => app.run("generate(S.list[" + i + "])"));
    L[0].matches[0].sa = 3; L[0].matches[0].sb = 1; L[0].matches[1].est = "aplazado";
    app.run("S.list[2].gr.forEach(function(g){g.matches.forEach(function(m){m.sa=2;m.sb=1})});genKO(S.list[2])");
    L[0].matches[2].live = app.run("newLive(S.list[0])"); L[0].matches[2].live.ts0 = 1; app.run("sync(S.list[0].matches[2])");
    const mirar = (etiqueta) => {
      const h = vista(app); vistas++;
      assert.strictEqual((h.match(/<div\b/g) || []).length, (h.match(/<\/div>/g) || []).length, "div sin cerrar en " + etiqueta);
      assert.strictEqual((h.match(/<button\b/g) || []).length, (h.match(/<\/button>/g) || []).length, "button sin cerrar en " + etiqueta);
      const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); assert.strictEqual(new Set(ids).size, ids.length, "id repetido en " + etiqueta + ": " + ids.join());
      [...h.matchAll(/data-a="(\w+)"/g)].forEach(m => dataA.add(m[1]));
      [...h.matchAll(/data-s="(\w+)"/g)].forEach(m => dataS.add(m[1]));
      return h;
    };
    for (const sc of ["inicio", "torneos", "deportes", "calendario", "resultados", "clasif", "equipos", "noticias", "liga", "miequipo", "cuenta", "roles", "tv", "admin"]) { app.run("SC='" + sc + "'"); mirar(rol.admin + sc); }
    app.run("TEAM={id:S.list[0].id,n:'T1'};SC='equipo'"); mirar("equipo");
    for (const v of ["r", "t", "d", "q", "p", "m", "c", "n", "u", "h", "k"]) { app.run("SC='admin';AV='" + v + "'"); mirar("admin-" + v); }
    for (const sp of ["beis", "bas3", "vol"]) for (const v of ["p", "t", "e", "c", "s", "h", "r", "a", "l"]) { app.run("SC='dep';SPORT='" + sp + "';S.cur=null;V='" + v + "'"); mirar("dep-" + sp + "-" + v); }
    app.run("SC='vivo';SPORT='beis';S.cur=S.list[0].id;LM={r:'L',i:2,g:null}"); mirar("vivo");
  }
  // 1) todos los botones que se dibujan tienen una acción que los atienda
  const atendidos = new Set([...SRC.matchAll(/a=="(\w+)"/g)].map(m => m[1]).concat(["rq"]));
  const huerfanos = [...dataA].filter(a => !atendidos.has(a));
  assert.deepStrictEqual(huerfanos, [], "botones sin acción: " + huerfanos.join());
  // 2) todos los destinos de navegación existen
  const validas = new Set(["inicio", "torneos", "deportes", "calendario", "resultados", "clasif", "equipos", "noticias", "liga", "miequipo", "dep", "cuenta", "roles", "tv", "vivo", "admin"]);
  assert.deepStrictEqual([...dataS].filter(s => !validas.has(s) && !["beis", "bas3", "vol"].includes(s)), []);
  assert.ok(vistas > 150);
});

test("todas las pantallas importantes se alcanzan con botones desde Inicio", () => {
  const app = load(); app.login({ admin: true });
  app.ctx._T = app.season("liga", 3, { sport: "beis" }); app.run("S.list=[_T];BOOT=true;SC='inicio'");
  const destinos = new Set();
  const explorar = () => { const h = vista(app); [...h.matchAll(/data-a="go"[^>]*data-s="(\w+)"/g)].forEach(m => destinos.add(m[1])); return h; };
  explorar(); document_nav(app, destinos);
  // desde Cuenta y desde el panel se llega a Roles (Personas)
  app.run("UID='u1';SC='cuenta'"); assert.ok(vista(app).includes('data-s="admin"'));
  app.run("SC='admin';AV='u'"); assert.ok(vista(app).includes("Roles disponibles"));
  assert.ok(destinos.has("tv"), "Inicio no enlaza a la pantalla grande");
});
function document_nav(app, destinos) {
  app.run("SC='inicio'");
  [...app.run("menuHtml()").matchAll(/data-a="go" data-s="(\w+)"/g)].forEach(m => destinos.add(m[1]));
  assert.ok(["inicio", "torneos", "deportes", "calendario", "resultados", "clasif", "equipos", "noticias", "liga", "cuenta", "admin"].every(s => destinos.has(s)), [...destinos].join());
}
