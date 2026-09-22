// CPU microbenchmark only. This is not a substitute for browser Web Vitals.
import fs from "node:fs";
import vm from "node:vm";
import { performance } from "node:perf_hooks";
import { createCanvas } from "@napi-rs/canvas";
const baseline = fs.readFileSync(
    "work/performance-baseline/script-4.js",
    "utf8",
  ),
  current = fs.readFileSync("src/animation/scene.js", "utf8");
function benchmark(source, copy) {
  const start = source.indexOf("// Bake the scattering profile"),
    end = source.indexOf("let lastAmbientFrame", start);
  let block = source
    .slice(start, end)
    .replace(/function updateButton\([^\n]+\n/, "");
  const canvas = createCanvas(1152, 720),
    buffer = copy ? createCanvas(1152, 720) : canvas;
  const context = {
    document: { createElement: () => createCanvas(1, 1) },
    canvas,
    ctx: buffer.getContext("2d"),
    lightOutput: canvas.getContext("2d"),
    lightBuffer: buffer,
    w: 1440,
    h: 900,
    p: 1,
    sourceX: 720,
    sourceY: 55,
    targetX: 720,
    targetY: 1530,
    beamWidth: 580,
    programmeSpread: 1,
    firstExit: 0,
    rawScrollChapter: 4.09,
    scrollChapter: 2.29,
    photoFadeStart: 1.16,
    photoFadeDuration: 0.42,
    layout: { fpw: 515 },
    time: 0,
    ease: (v) => v * v * (3 - 2 * v),
    clamp: (v) => Math.max(0, Math.min(1, v)),
    beamArrival: () => 1,
    openingPhotoScale: () => 1,
    drawFloorSignals() {},
  };
  context.ctx.scale(0.8, 0.8);
  vm.createContext(context);
  vm.runInContext(block, context);
  for (let i = 0; i < 15; i++) {
    context.time = i / 30;
    context.draw();
    canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  }
  const times = [];
  for (let i = 0; i < 80; i++) {
    context.time = i / 30;
    const t = performance.now();
    context.draw();
    canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  return {
    stats: { medianMs: times[40], p95Ms: times[76] },
    pixels: canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data,
  };
}
const before = benchmark(baseline, true),
  after = benchmark(current, false);
let squared = 0,
  max = 0;
for (let i = 0; i < before.pixels.length; i += 4) {
  for (let channel = 0; channel < 3; channel++) {
    const delta = Math.abs(
      (before.pixels[i + channel] * before.pixels[i + 3]) / 255 -
        (after.pixels[i + channel] * after.pixels[i + 3]) / 255,
    );
    squared += delta * delta;
    max = Math.max(max, delta);
  }
}
const results = {
  description:
    "Native 2D canvas, programme beam at 1440×900, .8 resolution; 15 warmup + 80 frames with identical full pixel readback. Not browser FPS or CWV.",
  before: before.stats,
  after: after.stats,
  pixelComparison: {
    premultipliedRgbRmse: Math.sqrt(squared / ((before.pixels.length / 4) * 3)),
    maxDifference: max,
  },
};
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(
  "reports/canvas-benchmark.json",
  JSON.stringify(results, null, 2),
);
console.log(results);
