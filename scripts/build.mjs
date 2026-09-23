import { build } from "esbuild";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";
const output = "outputs";
const rootStaticFiles = [
  "favicon.svg",
  "favicon.ico",
  "favicon-16.png",
  "favicon-32.png",
  "favicon-48.png",
  "apple-touch-icon.png",
];
const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const compressibleExtensions = new Set([".css", ".html", ".js", ".svg"]);

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

function publicSendsayConfig(env = process.env) {
  const read = (name) =>
    typeof env[name] === "string" ? env[name].trim() : "";
  return {
    account: read("SENDSAY_ACCOUNT"),
    formId: read("SENDSAY_FORM_ID"),
    testFormId: read("SENDSAY_TEST_FORM_ID"),
    useTestForm: read("SENDSAY_USE_TEST_FORM") === "true",
    fields: {
      name: read("SENDSAY_FIELD_NAME"),
      phone: read("SENDSAY_FIELD_PHONE"),
      company: read("SENDSAY_FIELD_COMPANY"),
      role: read("SENDSAY_FIELD_ROLE"),
      eventDateTime: read("SENDSAY_FIELD_EVENT_DATETIME"),
      eventId: read("SENDSAY_FIELD_EVENT_ID"),
    },
    eventDateTime: read("SENDSAY_EVENT_DATETIME"),
    eventId: read("SENDSAY_EVENT_ID"),
  };
}

async function precompressFile(path) {
  const extension = extname(path).toLowerCase();
  if (!compressibleExtensions.has(extension)) return [];

  const original = await fs.readFile(path);
  if (original.length <= 1024) return [];
  const compressed = await Promise.all([
    brotli(original, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
    gzipAsync(original, { level: 6 }),
  ]);
  const outputs = [];
  for (const [suffix, contents] of [
    [".br", compressed[0]],
    [".gz", compressed[1]],
  ]) {
    if (contents.length >= original.length) continue;
    await fs.writeFile(`${path}${suffix}`, contents);
    outputs.push({ path: `${path}${suffix}`, bytes: contents.length });
  }
  return outputs;
}

async function precompressOutputDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const compressed = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory())
      compressed.push(...(await precompressOutputDirectory(path)));
    else if (entry.isFile()) compressed.push(...(await precompressFile(path)));
  }
  return compressed;
}
await fs.mkdir(output, { recursive: true });
const result = await build({
  entryPoints: { site: "src/main.jsx" },
  bundle: true,
  write: false,
  minify: true,
  format: "esm",
  splitting: true,
  outdir: output + "/app",
  entryNames: "[name]-[hash]",
  chunkNames: "chunks/[name]-[hash]",
  target: ["chrome100", "safari15.4"],
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    __SENDSAY_PUBLIC_CONFIG__: JSON.stringify(publicSendsayConfig()),
  },
  metafile: true,
  legalComments: "eof",
});
const entryOutput = Object.entries(result.metafile.outputs).find(
  ([, metadata]) => metadata.entryPoint === "src/main.jsx",
);
if (!entryOutput) throw new Error("JavaScript entry output was not generated");
const jsPath = entryOutput[0].replace(/^outputs\//, "");
const jsBytes = entryOutput[1].bytes;
const totalJsBytes = result.outputFiles.reduce(
  (sum, file) => sum + file.contents.length,
  0,
);
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
for (const file of result.outputFiles) {
  await fs.mkdir(file.path.slice(0, file.path.lastIndexOf("/")), {
    recursive: true,
  });
  await fs.writeFile(file.path, file.contents);
}
const cssPath = `site-${hash(css)}.css`;
for (const file of await fs.readdir(output))
  if (/^site-.*\.css(?:\.br|\.gz)?$/.test(file))
    await fs.rm(output + "/" + file);
await fs.writeFile(output + "/" + cssPath, css);
await fs.rm(output + "/assets", { recursive: true, force: true });
await fs.cp("public/assets", output + "/assets", { recursive: true });
for (const file of rootStaticFiles)
  await fs.copyFile(`public/${file}`, `${output}/${file}`);
const entryHtml = `<!doctype html>
<html lang="ru" class="opening-locked" style="background:#030307"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#030307"><title>Свет становится данными — МТС Ads</title><style>html,body{margin:0;background:#030307;color-scheme:dark}</style>
<link rel="preload" href="assets/MTSWide-Regular.otf" as="font" type="font/otf" crossorigin><link rel="preload" href="assets/MTSWide-Medium.otf" as="font" type="font/otf" crossorigin><link rel="preload" href="assets/MTSUltraExtended-Bold.otf" as="font" type="font/otf" crossorigin>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="assets/projector-realistic.webp" as="image" fetchpriority="high"><link rel="preload" href="assets/projector-downward.webp" as="image" fetchpriority="high"><link rel="preload" href="assets/receiver-frames/01.webp?v=webp-q92-v2" as="image" fetchpriority="high">
<link rel="stylesheet" href="${cssPath}"><script type="module" src="${jsPath}"></script></head><body style="margin:0;background:#030307"><div id="root"></div><noscript>Для интерактивной страницы включите JavaScript.</noscript></body></html>`;
await Promise.all([
  fs.writeFile(output + "/mts-ads-portrait-frames-current.html", entryHtml),
  fs.writeFile(output + "/index.html", entryHtml),
  fs.writeFile(output + "/.nojekyll", ""),
]);
const compressedAssets = await precompressOutputDirectory(output);
await fs.mkdir("reports", { recursive: true });
await fs.writeFile(
  "reports/bundle.json",
  JSON.stringify(
    {
      jsBytes,
      initialJsBytes: jsBytes,
      asyncJsBytes: totalJsBytes - jsBytes,
      totalJsBytes,
      cssBytes: css.length,
      precompressedAssets: compressedAssets.map(({ path, bytes }) => ({
        path: path.replace(/^outputs\//, ""),
        bytes,
      })),
      metafile: result.metafile,
    },
    null,
    2,
  ),
);
console.log(
  `Built ${jsBytes} bytes initial JS + ${totalJsBytes - jsBytes} bytes async JS / ${css.length} bytes CSS → ${output}/mts-ads-portrait-frames-current.html`,
);
