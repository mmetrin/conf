import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadImage } from "@napi-rs/canvas";
test("all 30 supplied frames decode and every static asset reference resolves", async () => {
  const names = (await fs.readdir("public/assets/receiver-frames"))
    .filter((n) => /\.png$/.test(n))
    .sort();
  assert.deepEqual(
    names,
    Array.from(
      { length: 30 },
      (_, i) => String(i + 1).padStart(2, "0") + ".png",
    ),
  );
  for (const name of names) {
    const image = await loadImage("public/assets/receiver-frames/" + name);
    assert.equal(image.width, 2012);
    assert.equal(image.height, 1132);
  }
  const dirs = ["src/components", "src/animation"];
  let sources = await fs.readFile("src/styles/site.css", "utf8");
  for (const dir of dirs)
    for (const name of await fs.readdir(dir))
      sources += await fs.readFile(path.join(dir, name), "utf8");
  for (const match of sources.matchAll(
    /assets\/[A-Za-z0-9_./-]+\.(?:svg|png|webp|otf)/g,
  ))
    await fs.access("public/" + match[0]);
});
