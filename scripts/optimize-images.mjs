import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceRoot = path.join(root, "assets-source");
const publicRoot = path.join(root, "public/assets");
const reportRoot = path.join(root, "reports");
const verifyOnly = process.argv.includes("--verify");
const rebuildSequence = process.argv.includes("--rebuild-sequence");

const WEBP_OPTIONS = {
  quality: 82,
  alphaQuality: 100,
  smartSubsample: true,
  effort: 5,
};
const AVIF_OPTIONS = {
  quality: 60,
  effort: 5,
  chromaSubsampling: "4:4:4",
};
const AVIF_MINIMUM_SAVING = 0.15;
const SEQUENCE_WEBP_OPTIONS = {
  quality: 92,
  alphaQuality: 100,
  smartSubsample: true,
  effort: 5,
};

const regularImages = [
  {
    source: "particle-human-reference.png",
    output: "particle-human-reference",
    widths: [800],
    usage: ["src/animation/particles.js (canvas sampling source)"],
    avif: false,
    decision:
      "WebP retained: this image is decoded into a runtime canvas; the AVIF candidate was smaller but materially slower to decode.",
  },
  ...["first-frame", "new-light", "public-talk", "big-data", "campaign"].map(
    (name) => ({
      source: `programme/${name}.png`,
      output: `programme/${name}`,
      widths: [96, 192],
      usage: ["src/components/Programme.jsx (responsive <img srcset>)"],
      avif: true,
    }),
  ),
  {
    source: "programme/light-on-mobile.png",
    output: "programme/light-on-mobile",
    widths: [96, 192],
    usage: [
      "src/components/Programme.jsx (responsive programme portrait)",
    ],
    avif: false,
  },
  {
    source: "registration/light-ribbon.png",
    output: "registration/light-ribbon",
    widths: [700, 1400],
    usage: ["src/styles/site.css (.registration__ribbon)"],
    avif: true,
  },
];

const unusedImages = [
  {
    source: "main-mts-particle.png",
    decision:
      "Unused: no production reference; original retained in assets-source.",
  },
  {
    source: "programme/light-on.png",
    decision:
      "Unused: the programme uses light-on-mobile.png; original PNG retained.",
  },
];

const passthroughImages = [
  {
    path: "inline-9537aceeaf6a.webp",
    usage: "src/components/StageOverlay.jsx (loader)",
  },
  {
    path: "projector-realistic.webp",
    usage: "src/components/Hero.jsx and src/styles/site.css",
  },
  {
    path: "projector-downward.webp",
    usage: "src/components/StageOverlay.jsx",
  },
];

const sequence = {
  sourceDirectory: "receiver-frames",
  outputDirectory: "receiver-frames",
  extension: ".webp",
  width: 1440,
  height: 810,
  usage: [
    "src/animation/receiver.js (30-frame canvas sequence)",
    "scripts/build.mjs (frame 01 preload)",
  ],
  decision:
    "WebP q92 sequence generated consistently from the PNG originals; normal pipeline runs validate it without another lossy encode.",
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

function percentage(before, after) {
  return before ? ((1 - after / before) * 100).toFixed(1) : "0.0";
}

async function walk(directory) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(absolute)));
    else if (entry.isFile()) found.push(absolute);
  }
  return found;
}

async function fileInfo(absolute) {
  const [metadata, stats] = await Promise.all([
    sharp(absolute).metadata(),
    fs.stat(absolute),
  ]);
  return {
    path: path.relative(root, absolute),
    bytes: stats.size,
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha,
    format: metadata.format,
  };
}

function variantPath(image, width, format) {
  const largest = Math.max(...image.widths);
  const suffix = width === largest ? "" : `-${width}`;
  return path.join(publicRoot, `${image.output}${suffix}.${format}`);
}

async function encodeBuffer(sourcePath, width, format) {
  const pipeline = sharp(sourcePath)
    .rotate()
    .resize({ width, withoutEnlargement: true, fit: "inside" });
  if (format === "webp") return pipeline.webp(WEBP_OPTIONS).toBuffer();
  return pipeline.avif(AVIF_OPTIONS).toBuffer();
}

async function hasVisibleTransparency(absolute, metadata) {
  if (!metadata.hasAlpha) return false;
  const stats = await sharp(absolute).stats();
  return stats.channels.at(-1)?.min < 255;
}

async function validateVariant(
  sourceMetadata,
  sourceRequiresAlpha,
  absolute,
  requestedWidth,
) {
  const metadata = await sharp(absolute).metadata();
  if (!metadata.width || !metadata.height)
    throw new Error(`Could not read dimensions for ${absolute}`);
  if (metadata.width > requestedWidth || metadata.width > sourceMetadata.width)
    throw new Error(`Unexpected upscale in ${absolute}`);
  if (sourceRequiresAlpha && !metadata.hasAlpha)
    throw new Error(`Alpha channel was lost in ${absolute}`);
  return fileInfo(absolute);
}

async function optimizeRegularImage(image) {
  const sourcePath = path.join(sourceRoot, image.source);
  const sourceMetadata = await sharp(sourcePath).metadata();
  const sourceRequiresAlpha = await hasVisibleTransparency(
    sourcePath,
    sourceMetadata,
  );
  const candidates = [];

  for (const width of image.widths) {
    const webpPath = variantPath(image, width, "webp");
    const avifPath = variantPath(image, width, "avif");
    if (verifyOnly) {
      candidates.push({ width, webpPath, avifPath });
      continue;
    }
    const [webp, avif] = await Promise.all([
      encodeBuffer(sourcePath, width, "webp"),
      image.avif ? encodeBuffer(sourcePath, width, "avif") : null,
    ]);
    candidates.push({ width, webpPath, avifPath, webp, avif });
  }

  let useAvif = false;
  let avifSaving = 0;
  if (image.avif) {
    if (verifyOnly) {
      useAvif = await fs
        .access(candidates[0].avifPath)
        .then(() => true)
        .catch(() => false);
    } else {
      const webpBytes = candidates.reduce(
        (sum, item) => sum + item.webp.length,
        0,
      );
      const avifBytes = candidates.reduce(
        (sum, item) => sum + item.avif.length,
        0,
      );
      avifSaving = 1 - avifBytes / webpBytes;
      useAvif = avifSaving >= AVIF_MINIMUM_SAVING;
    }
  }

  if (!verifyOnly) {
    for (const candidate of candidates) {
      await fs.mkdir(path.dirname(candidate.webpPath), { recursive: true });
      await fs.writeFile(candidate.webpPath, candidate.webp);
      if (useAvif) await fs.writeFile(candidate.avifPath, candidate.avif);
      else await fs.rm(candidate.avifPath, { force: true });
    }
  }

  const outputs = [];
  for (const candidate of candidates) {
    outputs.push(
      await validateVariant(
        sourceMetadata,
        sourceRequiresAlpha,
        candidate.webpPath,
        candidate.width,
      ),
    );
    if (useAvif)
      outputs.push(
        await validateVariant(
          sourceMetadata,
          sourceRequiresAlpha,
          candidate.avifPath,
          candidate.width,
        ),
      );
  }

  return {
    source: await fileInfo(sourcePath),
    usage: image.usage,
    outputs,
    resized: outputs.some(
      (output) =>
        output.width < sourceMetadata.width ||
        output.height < sourceMetadata.height,
    ),
    avif: useAvif,
    avifSaving: avifSaving || null,
    decision:
      image.decision ||
      (useAvif
        ? `AVIF retained: aggregate variants are ${(avifSaving * 100).toFixed(1)}% smaller than WebP.`
        : `AVIF omitted: aggregate saving was below ${AVIF_MINIMUM_SAVING * 100}%.`),
  };
}

async function validateSequence(
  outputDirectory = path.join(publicRoot, sequence.outputDirectory),
) {
  const sourceDirectory = path.join(sourceRoot, sequence.sourceDirectory);
  const sourceNames = (await fs.readdir(sourceDirectory))
    .filter((name) => /\.(?:png|jpe?g)$/i.test(name))
    .sort();
  const outputNames = (await fs.readdir(outputDirectory))
    .filter((name) => name.endsWith(sequence.extension))
    .sort();
  const expectedNames = sourceNames.map((name) =>
    name.replace(/\.(?:png|jpe?g)$/i, sequence.extension),
  );
  if (JSON.stringify(outputNames) !== JSON.stringify(expectedNames))
    throw new Error(
      "Receiver frame numbering/order does not match the sources",
    );

  let sourceBytes = 0;
  let outputBytes = 0;
  let squaredError = 0;
  let sampleCount = 0;
  let decodeMs = 0;
  const frameMae = [];
  const outputs = [];
  let sourceWidth;
  let sourceHeight;

  for (let index = 0; index < sourceNames.length; index += 1) {
    const sourcePath = path.join(sourceDirectory, sourceNames[index]);
    const outputPath = path.join(outputDirectory, outputNames[index]);
    const [sourceInfo, outputInfo] = await Promise.all([
      fileInfo(sourcePath),
      fileInfo(outputPath),
    ]);
    sourceWidth ??= sourceInfo.width;
    sourceHeight ??= sourceInfo.height;
    if (sourceInfo.width !== sourceWidth || sourceInfo.height !== sourceHeight)
      throw new Error("Receiver sources do not all share one canvas size");
    if (
      outputInfo.width !== sequence.width ||
      outputInfo.height !== sequence.height
    )
      throw new Error(`Unexpected receiver dimensions in ${outputInfo.path}`);
    if (
      (await hasVisibleTransparency(
        sourcePath,
        await sharp(sourcePath).metadata(),
      )) &&
      !outputInfo.hasAlpha
    )
      throw new Error(`Alpha channel was lost in ${outputInfo.path}`);
    const sourceRatio = sourceInfo.width / sourceInfo.height;
    const outputRatio = outputInfo.width / outputInfo.height;
    if (Math.abs(sourceRatio - outputRatio) / sourceRatio > 1 / sequence.width)
      throw new Error(`Aspect ratio changed in ${outputInfo.path}`);

    const reference = await sharp(sourcePath)
      .resize({ width: sequence.width, withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const decodeStarted = performance.now();
    const decoded = await sharp(outputPath).ensureAlpha().raw().toBuffer();
    decodeMs += performance.now() - decodeStarted;
    if (reference.length !== decoded.length)
      throw new Error(`Decoded pixel count mismatch in ${outputInfo.path}`);

    let absoluteError = 0;
    for (let offset = 0; offset < reference.length; offset += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        const difference =
          reference[offset + channel] - decoded[offset + channel];
        squaredError += difference * difference;
        absoluteError += Math.abs(difference);
        sampleCount += 1;
      }
    }
    frameMae.push(absoluteError / (reference.length * 0.75));
    sourceBytes += sourceInfo.bytes;
    outputBytes += outputInfo.bytes;
    outputs.push(outputInfo);
  }

  const mse = squaredError / sampleCount;
  const psnr = 10 * Math.log10((255 * 255) / mse);
  const minMae = Math.min(...frameMae);
  const maxMae = Math.max(...frameMae);
  if (maxMae > 2 || maxMae - minMae > 0.75)
    throw new Error(
      `Receiver compression error varies too much (${minMae.toFixed(3)}–${maxMae.toFixed(3)} MAE)`,
    );

  return {
    frames: outputNames.length,
    sourceBytes,
    outputBytes,
    width: sequence.width,
    height: sequence.height,
    sourceWidth,
    sourceHeight,
    decodeMs: Number(decodeMs.toFixed(1)),
    averageDecodeMs: Number((decodeMs / outputNames.length).toFixed(1)),
    psnr: Number(psnr.toFixed(2)),
    frameMaeRange: [Number(minMae.toFixed(3)), Number(maxMae.toFixed(3))],
    outputs,
    usage: sequence.usage,
    decision: sequence.decision,
  };
}

async function rebuildSequenceFromOriginals() {
  const sourceDirectory = path.join(sourceRoot, sequence.sourceDirectory);
  const outputDirectory = path.join(publicRoot, sequence.outputDirectory);
  const candidateDirectory = path.join(
    publicRoot,
    `.receiver-frames-next-${process.pid}`,
  );
  const backupDirectory = path.join(
    publicRoot,
    `.receiver-frames-backup-${process.pid}`,
  );
  const sourceNames = (await fs.readdir(sourceDirectory))
    .filter((name) => /\.(?:png|jpe?g)$/i.test(name))
    .sort();

  await fs.mkdir(candidateDirectory, { recursive: true });
  for (const name of sourceNames) {
    const outputName = name.replace(/\.(?:png|jpe?g)$/i, sequence.extension);
    await sharp(path.join(sourceDirectory, name))
      .resize({ width: sequence.width, withoutEnlargement: true })
      .webp(SEQUENCE_WEBP_OPTIONS)
      .toFile(path.join(candidateDirectory, outputName));
  }
  await validateSequence(candidateDirectory);

  await fs.rename(outputDirectory, backupDirectory);
  try {
    await fs.rename(candidateDirectory, outputDirectory);
    await validateSequence(outputDirectory);
    await fs.rm(backupDirectory, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(outputDirectory, { recursive: true, force: true });
    await fs.rename(backupDirectory, outputDirectory);
    throw error;
  }
}

async function sourceInventory() {
  const files = (await walk(sourceRoot)).filter((file) =>
    /\.(?:png|jpe?g)$/i.test(file),
  );
  return Promise.all(files.sort().map(fileInfo));
}

function markdownReport(report) {
  const lines = [
    "# Image optimization report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Original PNG/JPG/JPEG inventory: **${formatBytes(report.totals.sourceBytes)}** (${report.totals.beforeFiles} files).`,
    `- Already-optimized passthrough WebP in the baseline: **${formatBytes(report.totals.passthroughBytes)}** (${report.passthrough.length} files).`,
    `- Public production raster after optimization: **${formatBytes(report.totals.afterBytes)}** (${report.totals.afterFiles} files, including responsive/format alternatives).`,
    `- Disk saving versus the complete production raster baseline: **${report.totals.savingPercent}%**.`,
    `- Used-source-only saving: **${report.totals.usedSavingPercent}%** (${formatBytes(report.totals.usedBeforeBytes)} → ${formatBytes(report.totals.afterBytes)}).`,
    "",
    "## Frame sequence",
    "",
    `- ${report.sequence.frames} WebP frames; numbering and order preserved; ${report.sequence.sourceWidth}×${report.sequence.sourceHeight} → ${report.sequence.width}×${report.sequence.height}.`,
    report.sequence.rebuilt
      ? `- Rebuilt once from PNG originals with one WebP q${SEQUENCE_WEBP_OPTIONS.quality} profile: ${formatBytes(report.sequence.sourceBytes)} → ${formatBytes(report.sequence.outputBytes)} (${percentage(report.sequence.sourceBytes, report.sequence.outputBytes)}% smaller).`
      : `- Existing first-screen frames were **not re-encoded** during this run: ${formatBytes(report.sequence.sourceBytes)} → ${formatBytes(report.sequence.outputBytes)} (${percentage(report.sequence.sourceBytes, report.sequence.outputBytes)}% smaller).`,
    `- Serial Sharp decode benchmark: ${report.sequence.decodeMs} ms total / ${report.sequence.averageDecodeMs} ms average per frame.`,
    `- Visual validation: ${report.sequence.psnr} dB PSNR; per-frame RGB MAE ${report.sequence.frameMaeRange[0]}–${report.sequence.frameMaeRange[1]}. Consistent dimensions and the narrow error range reduce flicker risk.`,
    "",
    "## Usage and format decisions",
    "",
  ];
  for (const image of report.images) {
    lines.push(
      `- \`${image.source.path}\` — ${image.usage.join(", ")}; ${image.decision}`,
    );
  }
  for (const image of report.unused)
    lines.push(`- \`${image.source.path}\` — ${image.decision}`);
  for (const image of report.passthrough)
    lines.push(
      `- \`${image.output.path}\` — ${image.usage}; already optimized WebP retained byte-for-byte.`,
    );
  lines.push(
    "- `work/**` PNG/WebP files are design/QA captures with no production references; they remain untouched and are excluded from delivery totals.",
  );

  lines.push("", "## Resized", "");
  for (const image of report.images.filter((item) => item.resized))
    lines.push(
      `- \`${image.source.path}\`: ${image.source.width}×${image.source.height} → ${[
        ...new Set(
          image.outputs.map((output) => `${output.width}×${output.height}`),
        ),
      ].join(", ")}`,
    );
  lines.push(
    `- \`assets-source/receiver-frames/*.png\`: ${report.sequence.sourceWidth}×${report.sequence.sourceHeight} → ${report.sequence.width}×${report.sequence.height}`,
    "",
    "## WebP outputs",
    "",
  );
  for (const output of report.outputs.filter((item) => item.format === "webp"))
    lines.push(`- \`${output.path}\` — ${formatBytes(output.bytes)}`);

  lines.push("", "## AVIF outputs", "");
  const avif = report.outputs.filter((item) => item.format === "heif");
  if (!avif.length)
    lines.push("- None: candidates did not clear the saving/decode threshold.");
  else
    for (const output of avif)
      lines.push(`- \`${output.path}\` — ${formatBytes(output.bytes)}`);

  lines.push("", "## Left in original format", "");
  for (const image of report.unused)
    lines.push(
      `- \`${image.source.path}\` — retained as an unused source only.`,
    );

  lines.push("", "## Heaviest remaining files", "");
  for (const output of report.heaviest)
    lines.push(`- \`${output.path}\` — ${formatBytes(output.bytes)}`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  sharp.cache(false);
  if (verifyOnly && rebuildSequence)
    throw new Error("--verify and --rebuild-sequence cannot be combined");
  if (rebuildSequence) await rebuildSequenceFromOriginals();
  const inventory = await sourceInventory();
  const [images, sequenceReport, passthrough] = await Promise.all([
    Promise.all(regularImages.map(optimizeRegularImage)),
    validateSequence(),
    Promise.all(
      passthroughImages.map(async (image) => ({
        ...image,
        output: await fileInfo(path.join(publicRoot, image.path)),
      })),
    ),
  ]);
  sequenceReport.rebuilt = rebuildSequence;
  const unused = unusedImages.map((item) => ({
    ...item,
    source: inventory.find(
      (source) => source.path === path.join("assets-source", item.source),
    ),
  }));
  if (unused.some((item) => !item.source))
    throw new Error("An unused source declared in the manifest is missing");

  const outputs = [
    ...images.flatMap((image) => image.outputs),
    ...sequenceReport.outputs,
    ...passthrough.map((image) => image.output),
  ].sort((a, b) => a.path.localeCompare(b.path));
  const sourceBytes = inventory.reduce((sum, item) => sum + item.bytes, 0);
  const passthroughBytes = passthrough.reduce(
    (sum, item) => sum + item.output.bytes,
    0,
  );
  const beforeBytes = sourceBytes + passthroughBytes;
  const usedBeforeBytes =
    images.reduce((sum, item) => sum + item.source.bytes, 0) +
    sequenceReport.sourceBytes +
    passthroughBytes;
  const afterBytes = outputs.reduce((sum, item) => sum + item.bytes, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    settings: {
      webp: WEBP_OPTIONS,
      avif: AVIF_OPTIONS,
      avifMinimumSaving: AVIF_MINIMUM_SAVING,
      metadata: "stripped by Sharp (withMetadata is intentionally not used)",
      sequence: rebuildSequence
        ? { action: "rebuilt from PNG originals", webp: SEQUENCE_WEBP_OPTIONS }
        : { action: "validated existing; no re-encode", webp: SEQUENCE_WEBP_OPTIONS },
    },
    totals: {
      beforeBytes,
      beforeFiles: inventory.length,
      sourceBytes,
      passthroughBytes,
      usedBeforeBytes,
      afterBytes,
      afterFiles: outputs.length,
      savingPercent: Number(percentage(beforeBytes, afterBytes)),
      usedSavingPercent: Number(percentage(usedBeforeBytes, afterBytes)),
    },
    inventory,
    images,
    sequence: sequenceReport,
    unused,
    passthrough,
    outputs,
    heaviest: [...outputs].sort((a, b) => b.bytes - a.bytes).slice(0, 10),
  };

  if (!verifyOnly) {
    await fs.mkdir(reportRoot, { recursive: true });
    await Promise.all([
      fs.writeFile(
        path.join(reportRoot, "image-optimization.json"),
        `${JSON.stringify(report, null, 2)}\n`,
      ),
      fs.writeFile(
        path.join(reportRoot, "image-optimization.md"),
        markdownReport(report),
      ),
    ]);
  }
  console.log(
    `${verifyOnly ? "Verified" : "Optimized"} production raster: ${formatBytes(beforeBytes)} → ${formatBytes(afterBytes)} (${report.totals.savingPercent}% saved across ${report.totals.beforeFiles} PNG/JPG sources plus ${passthrough.length} passthrough WebP).`,
  );
  console.log(
    `Sequence: ${sequenceReport.frames} frames, ${sequenceReport.averageDecodeMs} ms average decode, ${sequenceReport.psnr} dB PSNR; ${rebuildSequence ? "rebuilt from PNG originals" : "no re-encode"}.`,
  );
}

await main();
