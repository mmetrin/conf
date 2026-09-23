import assert from "node:assert/strict";
import { brotliCompress, gzip } from "node:zlib";
import http from "node:http";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { createStaticFileHandler } from "../server/http/staticFileHandler.mjs";
import { createApplicationServer } from "../server/server.mjs";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

function request(port, pathname, { method = "GET", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: pathname,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function staticFixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "mts-static-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "app"), { recursive: true });
  await mkdir(join(root, "assets", "receiver-frames"), { recursive: true });
  await writeFile(
    join(root, "index.html"),
    "<!doctype html>" + " home".repeat(500),
  );
  await writeFile(
    join(root, "app", "site-ABCDEFGH.js"),
    "export const app = true;\n".repeat(100),
  );
  await writeFile(
    join(root, "site-a83fc21d.css"),
    ".site { color: white; }\n".repeat(100),
  );
  await writeFile(
    join(root, "assets", "site.js"),
    "export const stable = true;\n".repeat(100),
  );
  await writeFile(join(root, "assets", "hero.webp"), "webp");
  await writeFile(join(root, "assets", "ribbon.avif"), "avif");
  await writeFile(join(root, "assets", "receiver-frames", "01.webp"), "frame");
  await writeFile(join(root, "favicon-32.png"), "png");
  await writeFile(join(root, "favicon.ico"), "ico");
  await writeFile(join(root, ".env"), "secret");

  const jsPath = join(root, "app", "site-ABCDEFGH.js");
  const contents = Buffer.from("export const app = true;\n".repeat(100));
  await writeFile(`${jsPath}.br`, await brotli(contents));
  await writeFile(`${jsPath}.gz`, await gzipAsync(contents));
  const fallbackPath = join(root, "assets", "fallback.svg");
  await writeFile(fallbackPath, "<svg>" + "x".repeat(2000) + "</svg>");
  await writeFile(
    `${fallbackPath}.gz`,
    await gzipAsync(await readFile(fallbackPath)),
  );

  const staticFileHandler = createStaticFileHandler({
    root,
    entryDocument: "index.html",
    ...options,
  });
  const registrations = [];
  const server = createApplicationServer({
    staticFileHandler,
    registrationHandler(req, res) {
      registrations.push(req.method);
      res.writeHead(204);
      res.end();
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  return {
    root,
    registrations,
    request: (pathname, requestOptions) =>
      request(server.address().port, pathname, requestOptions),
  };
}

test("serves entry document, static MIME types and conservative cache policies", async (t) => {
  const fixture = await staticFixture(t);

  const home = await fixture.request("/");
  assert.equal(home.status, 200);
  assert.equal(home.headers["content-type"], "text/html; charset=utf-8");
  assert.equal(home.headers["cache-control"], "no-cache");
  assert.equal(home.headers["x-content-type-options"], "nosniff");
  assert.equal(
    home.headers["referrer-policy"],
    "strict-origin-when-cross-origin",
  );

  const js = await fixture.request("/app/site-ABCDEFGH.js");
  assert.equal(js.status, 200);
  assert.equal(js.headers["content-type"], "text/javascript; charset=utf-8");
  assert.equal(
    js.headers["cache-control"],
    "public, max-age=31536000, immutable",
  );

  const css = await fixture.request("/site-a83fc21d.css");
  assert.equal(css.headers["content-type"], "text/css; charset=utf-8");
  assert.equal(
    css.headers["cache-control"],
    "public, max-age=31536000, immutable",
  );

  const image = await fixture.request("/assets/hero.webp");
  assert.equal(image.headers["content-type"], "image/webp");
  assert.equal(image.headers["cache-control"], "public, max-age=86400");

  const avif = await fixture.request("/assets/ribbon.avif");
  assert.equal(avif.headers["content-type"], "image/avif");
  assert.equal(avif.headers["cache-control"], "public, max-age=86400");

  const faviconPng = await fixture.request("/favicon-32.png");
  assert.equal(faviconPng.headers["content-type"], "image/png");

  const faviconIco = await fixture.request("/favicon.ico");
  assert.equal(faviconIco.headers["content-type"], "image/x-icon");

  const frame = await fixture.request("/assets/receiver-frames/01.webp");
  assert.equal(frame.headers["cache-control"], "public, max-age=86400");

  const stableJs = await fixture.request("/assets/site.js");
  assert.equal(stableJs.headers["cache-control"], "public, max-age=86400");
});

test("HEAD sends the selected representation headers without a body", async (t) => {
  const fixture = await staticFixture(t);
  const get = await fixture.request("/app/site-ABCDEFGH.js", {
    headers: { "Accept-Encoding": "br" },
  });
  const head = await fixture.request("/app/site-ABCDEFGH.js", {
    method: "HEAD",
    headers: { "Accept-Encoding": "br" },
  });

  assert.equal(get.headers["content-encoding"], "br");
  assert.equal(get.headers.vary, "Accept-Encoding");
  assert.equal(head.status, 200);
  assert.equal(head.headers["content-encoding"], "br");
  assert.equal(head.headers["content-length"], get.headers["content-length"]);
  assert.equal(head.body.length, 0);
});

test("selects precompressed Brotli, gzip fallback and handles conditional requests", async (t) => {
  const fixture = await staticFixture(t);
  const brotliResponse = await fixture.request("/app/site-ABCDEFGH.js", {
    headers: { "Accept-Encoding": "gzip;q=0.5, br;q=1" },
  });
  assert.equal(brotliResponse.headers["content-encoding"], "br");
  assert.equal(brotliResponse.headers.vary, "Accept-Encoding");

  const gzipFallback = await fixture.request("/assets/fallback.svg", {
    headers: { "Accept-Encoding": "br, gzip" },
  });
  assert.equal(gzipFallback.headers["content-encoding"], "gzip");

  const unchanged = await fixture.request("/", {
    headers: { "If-None-Match": (await fixture.request("/")).headers.etag },
  });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body.length, 0);
});

test("rejects unsupported methods, missing files, traversal, malformed URLs and dotfiles", async (t) => {
  const fixture = await staticFixture(t);
  const post = await fixture.request("/assets/hero.webp", { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
  assert.equal((await fixture.request("/does-not-exist.js")).status, 404);
  assert.equal((await fixture.request("/%2e%2e/secret.txt")).status, 404);
  assert.equal((await fixture.request("/%2e%2e%2fsecret.txt")).status, 404);
  assert.equal((await fixture.request("/%E0%A4%A")).status, 400);
  assert.equal((await fixture.request("/.env")).status, 404);
  assert.equal((await fixture.request("/app/site-ABCDEFGH.js.br")).status, 404);
  assert.equal((await fixture.request("/assets")).status, 404);
});

test("routes /api/register before static handling", async (t) => {
  const fixture = await staticFixture(t);
  const response = await fixture.request("/api/register", { method: "POST" });
  assert.equal(response.status, 204);
  assert.deepEqual(fixture.registrations, ["POST"]);
});

test("returns 500 rather than disguising unexpected filesystem errors as 404", async (t) => {
  const errors = [];
  const fixture = await staticFixture(t, {
    statFile: async (path) => {
      if (path.endsWith("assets/hero.webp")) {
        const error = new Error("disk failure");
        error.code = "EIO";
        throw error;
      }
      return stat(path);
    },
    onError: (error) => errors.push(error.code),
  });
  const response = await fixture.request("/assets/hero.webp");
  assert.equal(response.status, 500);
  assert.deepEqual(errors, ["EIO"]);
});
