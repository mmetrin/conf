import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadImage } from "@napi-rs/canvas";

async function readSourceTree(directory) {
  let source = "";
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    source += entry.isDirectory()
      ? await readSourceTree(entryPath)
      : await fs.readFile(entryPath, "utf8");
  }
  return source;
}

test("all 30 optimized frames decode and every static asset reference resolves", async () => {
  const names = (await fs.readdir("public/assets/receiver-frames"))
    .filter((n) => /\.webp$/.test(n))
    .sort();
  assert.deepEqual(
    names,
    Array.from(
      { length: 30 },
      (_, i) => String(i + 1).padStart(2, "0") + ".webp",
    ),
  );
  for (const name of names) {
    const image = await loadImage("public/assets/receiver-frames/" + name);
    assert.equal(image.width, 1440);
    assert.equal(image.height, 810);
    const mobilePath = "public/assets/receiver-frames/mobile/" + name;
    const mobile = await loadImage(mobilePath);
    assert.equal(mobile.width, 720);
    assert.equal(mobile.height, 405);
    assert((await fs.stat(mobilePath)).size < (await fs.stat("public/assets/receiver-frames/" + name)).size);
  }
  const dirs = ["src/components", "src/animation", "src/styles"];
  const sources = (await Promise.all(dirs.map(readSourceTree))).join("");
  assert.doesNotMatch(
    sources,
    /url\(["']?\/assets\//,
    "static CSS assets must stay relative for subpath deployments",
  );
  for (const match of sources.matchAll(
    /assets\/[A-Za-z0-9_./-]+\.(?:avif|svg|png|webp|otf|woff2)/g,
  ))
    await fs.access("public/" + match[0]);
});
