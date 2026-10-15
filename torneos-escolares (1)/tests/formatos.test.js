const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");

// Juega todos los partidos pendientes de una edición con ganadores al azar.
function jugarTodo(app, ctxName) {
  const BYE = app.run("BYE");
  let guard = 0, jugados = 0;
  const perdidas = {};
  while (guard++ < 600) {
    const pend = app.run(ctxName + "&&allKeyed(T)").filter(([, , m]) => m.a && m.b && m.a !== BYE && m.b !== BYE && !m.w);
    if (!pend.length) break;
    const [r, i, m] = pend[Math.floor(Math.random() * pend.length)];
    const w = Math.random() < .5 ? m.a : m.b, l = w === m.a ? m.b : m.a;
    app.ctx._a = [r, i, w]; app.run("setRes(T,_a[0],_a[1],_a[2])");
    perdidas[l] = (perdidas[l] || 0) + 1; jugados++;
  }
  return { jugados, perdidas };
}

test("doble eliminación: de 3 a 17 equipos siempre hay campeón y nadie pierde más de 2 veces", () => {
  const app = load();
  for (let n = 3; n <= 17; n++) {
    app.ctx.T = app.season("dele", n); app.run("generate(T)");
    const { jugados, perdidas } = jugarTodo(app, "true");
    assert.ok(app.run("champ(T)"), "n=" + n + " sin campeón");
    assert.ok(Math.max(...Object.values(perdidas)) <= 2);
    assert.ok(jugados === 2 * n - 2 || jugados === 2 * n - 1, "n=" + n + " partidos=" + jugados);
  }
});

test("doble eliminación: corregir un resultado reajusta lo que dependía de él", () => {
  const app = load();
  app.ctx.T = app.season("dele", 8); app.run("generate(T)");
  const T = app.ctx.T;
  app.ctx._a = ["W0", 0, T.de.W[0][0].a]; app.run("setRes(T,_a[0],_a[1],_a[2])");
  app.ctx._a = ["W0", 1, T.de.W[0][1].a]; app.run("setRes(T,_a[0],_a[1],_a[2])");
  assert.ok(T.de.W[1][0].a && T.de.W[1][0].b);
  app.ctx._a = ["W0", 0, null]; app.run("setRes(T,_a[0],_a[1],_a[2])");
  assert.strictEqual(T.de.W[1][0].a, undefined);
});

test("grupos + llaves + tercer lugar: se completa y hay campeón y tercero", () => {
  const app = load();
  for (const n of [4, 5, 6, 8, 10, 12, 16]) {
    app.ctx.T = app.season("grupos", n, { third: true }); app.run("generate(T)");
    app.ctx.T.gr.forEach(g => g.matches.forEach(m => { m.sa = 1 + Math.floor(Math.random() * 4); m.sb = m.sa + 1 + Math.floor(Math.random() * 3); if (Math.random() < .5) [m.sa, m.sb] = [m.sb, m.sa]; }));
    app.run("genKO(T)");
    let g = 0;
    while (g++ < 100) {
      const pend = app.run("allKeyed(T)").filter(x => (typeof x[0] !== "string" || x[0] === "T") && x[2].a && x[2].b && !x[2].w);
      if (!pend.length) break;
      const [r, i, m] = pend[0]; app.ctx._a = [r, i, m.a]; app.run("setRes(T,_a[0],_a[1],_a[2])");
    }
    assert.ok(app.run("champ(T)"), "n=" + n);
    if (app.ctx.T.rounds.length >= 2) assert.ok(app.ctx.T.tp && app.ctx.T.tp.w, "tercer lugar n=" + n);
  }
});

test("series: cada ronda toma su 'mejor de' y la final puede ser distinta", () => {
  const app = load();
  app.ctx.T = app.season("elim", 8, { bo: 3, boF: 5 }); app.run("generate(T)");
  assert.strictEqual(JSON.stringify(app.ctx.T.rounds.map(r => r[0].bo)), "[3,3,5]");
});

test("liga ida y vuelta duplica los partidos con local invertido", () => {
  const app = load();
  app.ctx.T = app.season("liga", 5, { dbl: true }); app.run("generate(T)");
  assert.strictEqual(app.ctx.T.matches.length, 20);
});

test("eliminación directa con número impar de equipos usa pases libres", () => {
  const app = load();
  app.ctx.T = app.season("elim", 5); app.run("generate(T)");
  const { jugados } = jugarTodo(app, "true");
  assert.ok(app.run("champ(T)"));
  assert.strictEqual(jugados, 4);
});
