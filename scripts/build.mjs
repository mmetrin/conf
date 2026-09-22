import { build } from "esbuild";
import fs from "node:fs/promises";
import crypto from "node:crypto";
const output = "outputs";
await fs.mkdir(output, { recursive: true });
const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["chrome100", "safari15.4"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  metafile: true,
  legalComments: "eof",
});
const js = result.outputFiles[0].contents;
const css = (
  await build({
    entryPoints: ["src/styles/site.css"],
    bundle: false,
    write: false,
    minify: true,
    loader: { ".css": "css" },
  })
).outputFiles[0].contents;
const hash = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 10);
await fs.mkdir(output + "/app", { recursive: true });
for (const file of await fs.readdir(output + "/app"))
  await fs.rm(output + "/app/" + file, { recursive: true, force: true });
const jsPath = `app/site-${hash(js)}.js`,
  cssPath = `site-${hash(css)}.css`;
for (const file of await fs.readdir(output))
  if (/^site-.*\.css$/.test(file)) await fs.rm(output + "/" + file);
await fs.writeFile(output + "/" + jsPath, js);
await fs.writeFile(output + "/" + cssPath, css);
await fs.rm(output + "/assets", { recursive: true, force: true });
await fs.cp("public/assets", output + "/assets", { recursive: true });
await fs.writeFile(
  output + "/mts-ads-portrait-frames-current.html",
  `<!doctype html>
<html lang="ru" class="opening-locked"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Свет становится данными — МТС Ads</title>
<link rel="preload" href="assets/MTSWide-Medium.otf" as="font" type="font/otf" crossorigin><link rel="preload" href="assets/MTSText-Regular.otf" as="font" type="font/otf" crossorigin>
<link rel="icon" type="image/svg+xml" href="assets/logos/main-mts.svg">
<link rel="preload" href="assets/projector-realistic.webp" as="image"><link rel="preload" href="assets/projector-downward.webp" as="image"><link rel="preload" href="assets/receiver-frames/01.png?v=tinified-30-v2" as="image">
<link rel="stylesheet" href="${cssPath}"><script defer src="${jsPath}"></script></head><body><div id="root"></div><noscript>Для интерактивной страницы включите JavaScript.</noscript></body></html>`,
);
await fs.mkdir("reports", { recursive: true });
await fs.writeFile(
  "reports/bundle.json",
  JSON.stringify(
    { jsBytes: js.length, cssBytes: css.length, metafile: result.metafile },
    null,
    2,
  ),
);
console.log(
  `Built ${js.length} bytes JS / ${css.length} bytes CSS → ${output}/mts-ads-portrait-frames-current.html`,
);
