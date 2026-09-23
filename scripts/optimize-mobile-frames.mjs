import fs from "node:fs/promises";
import sharp from "sharp";

// Separate source family: mobile never downloads or decodes desktop frames.
const target = new URL("../public/assets/receiver-frames/mobile/", import.meta.url);
await fs.mkdir(target, { recursive: true });
let bytes = 0;
for (let index = 1; index <= 30; index++) {
  const name = String(index).padStart(2, "0");
  const source = new URL(`../assets-source/receiver-frames/${name}.png`, import.meta.url);
  const image = await sharp(source.pathname)
    .resize({ width: 720 })
    .webp({ quality: 88, alphaQuality: 100, effort: 5 })
    .toBuffer();
  await fs.writeFile(new URL(`${name}.webp`, target), image);
  bytes += image.length;
}
console.log(`30 mobile frames: ${bytes} bytes, 720px wide`);
