// Une los archivos de src/ en un solo index.html (la página se publica como un archivo único).
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "src");
const tpl = fs.readFileSync(path.join(src, "index.template.html"), "utf8");
const css = fs.readFileSync(path.join(src, "styles.css"), "utf8").trimEnd();
const js = fs.readdirSync(path.join(src, "js")).filter(f => f.endsWith(".js")).sort()
  .map(f => fs.readFileSync(path.join(src, "js", f), "utf8").trimEnd()).join("\n");
const out = tpl.replace("/*@@CSS@@*/", () => css).replace("/*@@JS@@*/", () => js);
fs.writeFileSync(path.join(__dirname, "index.html"), out);
console.log("index.html generado: " + out.length + " caracteres");
