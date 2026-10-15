const test = require("node:test"), assert = require("node:assert");
const { load } = require("./harness");
const app = load();
const L = n => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
function liga(n, sport, extra) {
  const tm = L(n), ms = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) ms.push({ a: tm[i], b: tm[j], sa: Math.floor(Math.random() * 4), sb: Math.floor(Math.random() * 4) });
  return Object.assign({ id: 1, sport, type: "liga", teams: tm, matches: ms }, extra || {});
}
const tabla = t => { app.ctx._t = t; return JSON.parse(JSON.stringify(app.run("table(_t)"))); };

test("puntos por defecto: victoria 3, empate 1, derrota 0", () => {
  const t = liga(2, "gen"); t.matches = [{ a: "A", b: "B", sa: 2, sb: 1 }];
  const r = tabla(t); assert.deepStrictEqual(r.map(x => [x.n, x.pt]), [["A", 3], ["B", 0]]);
});
test("los puntos por victoria y empate se pueden cambiar", () => {
  const t = liga(2, "gen", { pw: 2, pd: 0 }); t.matches = [{ a: "A", b: "B", sa: 1, sb: 1 }, { a: "A", b: "B", sa: 3, sb: 0 }];
  assert.strictEqual(tabla(t)[0].pt, 2);
});
test("voleibol: ganar por 2 sets o más da 3; por 1 set da 2 y perder por 1 set da 1", () => {
  const t = liga(2, "vol"); t.matches = [{ a: "A", b: "B", sa: 2, sb: 0 }, { a: "A", b: "B", sa: 1, sb: 2 }];
  const r = Object.fromEntries(tabla(t).map(x => [x.n, x.pt]));
  assert.deepStrictEqual(r, { A: 4, B: 2 });
});
test("un empate no se cuenta en deportes que no lo permiten", () => {
  const t = liga(2, "bas3"); t.matches = [{ a: "A", b: "B", sa: 5, sb: 5 }];
  assert.strictEqual(tabla(t).every(x => x.pj === 0), true);
});
test("desempate 'menos en contra'", () => {
  const t = liga(3, "gen", { tb: ["con"] });
  t.matches = [{ a: "A", b: "B", sa: 1, sb: 1 }, { a: "A", b: "C", sa: 3, sb: 3 }, { a: "B", b: "C", sa: 2, sb: 2 }];
  assert.strictEqual(tabla(t).map(x => x.n).join(""), "BAC");
});
test("desempate alfabético y sin criterios (orden de inscripción)", () => {
  let t = liga(3, "gen", { tb: ["alf"] }); t.matches = []; t.teams = ["Zorros", "Águilas", "Búhos"];
  assert.strictEqual(tabla(t).map(x => x.n).join(), "Águilas,Búhos,Zorros");
  t = liga(3, "gen", { tb: ["", "", ""] }); t.matches = []; t.teams = ["Z", "A", "B"];
  assert.strictEqual(tabla(t).map(x => x.n).join(""), "ZAB");
});
test("desempate 'resultado entre ellos': en empates de 2 gana quien ganó el directo", () => {
  let casos = 0;
  for (let k = 0; k < 600; k++) {
    const t = liga(4, "bas3", { tb: ["h2h"] }); t.matches.forEach(m => { if (m.sa === m.sb) m.sb++; });
    const por = {}; tabla(t).forEach(r => (por[r.pt] = por[r.pt] || []).push(r.n));
    Object.values(por).forEach(g => {
      if (g.length !== 2) return; casos++;
      const m = t.matches.find(m => (m.a === g[0] && m.b === g[1]) || (m.a === g[1] && m.b === g[0]));
      assert.strictEqual(m.sa > m.sb ? m.a : m.b, g[0]);
    });
  }
  assert.ok(casos > 20);
});
test("una tabla con los mismos resultados siempre da el mismo orden", () => {
  const t = liga(5, "gen"); const a = tabla(t).map(x => x.n).join(), b = tabla(t).map(x => x.n).join();
  assert.strictEqual(a, b);
});
