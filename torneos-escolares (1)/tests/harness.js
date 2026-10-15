// Carga el <script> de index.html en un entorno simulado (sin navegador)
// para poder probar la lógica: formatos, tablas, permisos, estados, etc.
const fs = require("fs"), vm = require("vm"), path = require("path");

function load() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const code = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
  const dummy = new Proxy(function () {}, { get: () => () => dummy, set: () => true, apply: () => dummy });
  const mkEl = () => {
    const store = { value: "", checked: false, hidden: false, disabled: false };
    return new Proxy(function () {}, {
      get: (t, p) => p in store ? store[p] : p === "classList" ? { toggle() {}, add() {}, remove() {} } : p === "dataset" ? {} : p === "forEach" ? undefined : () => dummy,
      set: (t, p, v) => { store[p] = v; return true; }, apply: () => dummy
    });
  };
  const store = {};
  const els = new Proxy(store, { get: (t, id) => t[id] || (t[id] = mkEl()), set: (t, id, v) => { t[id] = v; return true; } });
  const L = {}, classes = new Set();
  const doc = {
    getElementById: id => els[id], querySelectorAll: () => [], querySelector: () => null,
    createElement: () => mkEl(), addEventListener(n, f) { (L[n] = L[n] || []).push(f); },
    body: { dataset: {}, classList: { toggle(c, f) { f ? classes.add(c) : classes.delete(c); }, contains: c => classes.has(c) } }, activeElement: null
  };
  const state = { confirms: [], answer: true, writes: [] };
  const docRef = (n, id) => ({ set: v => { state.writes.push([n, id, v]); return Promise.resolve(); }, delete() { return Promise.resolve(); }, update: v => { state.writes.push([n, id, v, "update"]); return Promise.resolve(); } });
  const DBs = {
    collection: n => ({ doc: id => docRef(n, id), orderBy() { return this; }, limit() { return this; }, onSnapshot() {} }),
    doc: p => docRef(p.split("/")[0], p.split("/")[1])
  };
  const ctx = {
    atob, TextEncoder, Blob, Uint8Array, Object, document: doc, window: {},
    localStorage: { getItem: () => null, setItem() {} }, setInterval() {}, setTimeout() {}, clearTimeout() {},
    confirm: m => { state.confirms.push(m); return state.answer; }, alert() {}, console, Math, Date, JSON, location: {}, DBs
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const run = x => vm.runInContext(x, ctx);
  const click = (a, data) => { const b = { tagName: "BUTTON", disabled: false, dataset: Object.assign({ a }, data || {}) }; (L.click || []).forEach(f => f({ target: { closest: () => b } })); };
  const change = (a, data, value) => { const x = { dataset: Object.assign({ a }, data || {}), value }; (L.change || []).forEach(f => f({ target: x })); };
  const names = n => Array.from({ length: n }, (_, i) => "T" + (i + 1));
  let seq = 1000;
  const season = (type, n, extra) => Object.assign({ id: ++seq, name: "Edición", sport: "bas3", rama: "f", type, teams: names(n), rounds: [], matches: [], gr: [], ro: {} }, extra || {});
  const login = (o) => { ctx._o = o; run("BOOT=true;DB=DBs;UID=_o.uid||'u1';NAME=_o.name||'Ana';ADMIN=!!_o.admin;ROLES=_o.roles||{}"); };
  return { ctx, run, click, change, state, names, season, login, els, classes };
}
module.exports = { load };
