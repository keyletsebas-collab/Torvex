// Une los archivos de src/ en un solo index.html (la página se publica como un archivo único).
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "src");
const tpl = fs.readFileSync(path.join(src, "index.template.html"), "utf8");
const css = ["styles.css", "gate.css"].map(f => fs.readFileSync(path.join(src, f), "utf8").trimEnd()).join("\n");
const js = fs.readdirSync(path.join(src, "js")).filter(f => f.endsWith(".js")).sort()
  .map(f => fs.readFileSync(path.join(src, "js", f), "utf8").trimEnd()).join("\n");
const out = tpl.replace("/*@@CSS@@*/", () => css).replace("/*@@JS@@*/", () => js);
fs.writeFileSync(path.join(__dirname, "index.html"), out);
// Sincroniza el mismo sitio que carga MAUI mediante HybridWebView.
const mauiIndex = path.resolve(__dirname, "../src/Torvex.App/wwwroot/index.html");
fs.writeFileSync(mauiIndex, out);
console.log("index.html generado: " + out.length + " caracteres");
