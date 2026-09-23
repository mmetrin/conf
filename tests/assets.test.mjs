import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadImage } from "@napi-rs/canvas";
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
  const dirs = ["src/components", "src/animation"];
  let sources = await fs.readFile("src/styles/site.css", "utf8");
  for (const dir of dirs)
    for (const name of await fs.readdir(dir))
      sources += await fs.readFile(path.join(dir, name), "utf8");
  for (const match of sources.matchAll(
    /assets\/[A-Za-z0-9_./-]+\.(?:avif|svg|png|webp|otf|woff2)/g,
  ))
    await fs.access("public/" + match[0]);
});
