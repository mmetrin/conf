import { cancelSharedFrame, requestSharedFrame } from "./frameHost.js";
import { waitForDecodedImage } from "../utils/imageReady.js";

const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => value * value * (3 - 2 * value);
const players = new Set();
let sharedFrame = 0;

function schedulePlayers() {
  if (
    !sharedFrame &&
    !document.hidden &&
    [...players].some((player) => player.needsFrame())
  )
    sharedFrame = requestSharedFrame(drawPlayers);
}

function drawPlayers(now) {
  sharedFrame = 0;
  for (const player of players) {
    if (player.needsFrame()) player.draw(now);
  }
  schedulePlayers();
}

function visibilityChange() {
  if (document.hidden) {
    cancelSharedFrame(sharedFrame);
    sharedFrame = 0;
  } else schedulePlayers();
}

let referencePixelsPromise;
function loadReferencePixels() {
  if (referencePixelsPromise) return referencePixelsPromise;
  referencePixelsPromise = (async () => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = "assets/particle-human-reference.webp";
    await waitForDecodedImage(image);
    const width = 800,
      height = 773,
      map = document.createElement("canvas");
    map.width = width;
    map.height = height;
    const context = map.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    map.width = map.height = 1;
    return { pixels, width, height };
  })().catch((error) => {
    // A transient network error must not poison the shared cache forever.
    referencePixelsPromise = null;
    throw error;
  });
  return referencePixelsPromise;
}

export async function startParticleShape(
  canvas,
  { side = "right", seedOffset = 0 } = {},
) {
  const {
    pixels,
    width: portraitW,
    height: portraitH,
  } = await loadReferencePixels();
  const ctx = canvas.getContext("2d"),
    points = [],
    rows = [];
  let seed = 1947 + seedOffset;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const palette = [
    "#ffffff",
    "#fff5ff",
    "#efbfff",
    "#cf79ff",
    "#ff3d68",
    "#ff0032",
    "#ffb0c0",
  ];
  const glyphs = "01{}[]<>/+=:λΣ#";
  const isLeft = side === "left",
    mobile = matchMedia("(max-width: 599px)"),
    mobileAtStart = mobile.matches,
    atlasScale = mobileAtStart ? 2 : 1;
  const scanNames = isLeft
    ? mobileAtStart
      ? ["signal.vector", "data.field", "node.scan"]
      : ["signal.vector", "data.field"]
    : ["data.core", "signal.map", "node.scan"];
  const scanEdges = isLeft && !mobileAtStart ? [[0, 1]] : [[0, 1], [1, 2], [2, 0]];
  const atlas = document.createElement("canvas"),
    monoAtlas = document.createElement("canvas");
  const softAtlas = mobileAtStart ? document.createElement("canvas") : atlas,
    softMonoAtlas = mobileAtStart ? document.createElement("canvas") : monoAtlas;
  atlas.width = monoAtlas.width = 512 * atlasScale;
  atlas.height = monoAtlas.height = 224 * atlasScale;
  softAtlas.width = softMonoAtlas.width = 512 * atlasScale;
  softAtlas.height = softMonoAtlas.height = 224 * atlasScale;
  const atlasCtx = atlas.getContext("2d"),
    monoAtlasCtx = monoAtlas.getContext("2d");
  // Rasterize larger glyphs once at 2x resolution instead of blurring each frame.
  atlasCtx.scale(atlasScale, atlasScale);
  monoAtlasCtx.scale(atlasScale, atlasScale);
  palette.forEach((color, index) => {
    atlasCtx.fillStyle = color;
    atlasCtx.font = `600 ${mobileAtStart ? 13 : 11}px monospace`;
    [...glyphs].forEach((glyph, glyphIndex) =>
      atlasCtx.fillText(glyph, glyphIndex * 24 + 5, index * 32 + 17),
    );
    atlasCtx.fillRect(365, index * 32 + 12, 1.4, 1.4);
    atlasCtx.fillRect(389, index * 32 + 12, 3.4, 1.1);
    if (!mobileAtStart) {
      atlasCtx.shadowColor = color;
      atlasCtx.shadowBlur = 5;
    }
    atlasCtx.fillRect(437, index * 32 + 11, 2, 2);
    atlasCtx.shadowBlur = 0;

    monoAtlasCtx.fillStyle = index === 0 ? "#ffffff" : "#d9d9e0";
    monoAtlasCtx.font = `600 ${mobileAtStart ? 13 : 11}px monospace`;
    [...glyphs].forEach((glyph, glyphIndex) =>
      monoAtlasCtx.fillText(glyph, glyphIndex * 24 + 5, index * 32 + 17),
    );
    monoAtlasCtx.fillRect(365, index * 32 + 12, 1.4, 1.4);
    monoAtlasCtx.fillRect(389, index * 32 + 12, 3.4, 1.1);
    if (!mobileAtStart) {
      monoAtlasCtx.shadowColor = "#ffffff";
      monoAtlasCtx.shadowBlur = 3;
    }
    monoAtlasCtx.fillRect(437, index * 32 + 11, 2, 2);
    monoAtlasCtx.shadowBlur = 0;
  });
  // The soft variants are prepared once. Only symbols at the bottom edge use
  // them, so the active central part stays sharp and cheap to draw.
  if (mobileAtStart)
    for (const [target, source] of [
      [softAtlas, atlas],
      [softMonoAtlas, monoAtlas],
    ]) {
      const softContext = target.getContext("2d");
      softContext.filter = "blur(1.5px)";
      softContext.drawImage(source, 0, 0);
      softContext.filter = "none";
    }

  const sample = (x, y) => {
    // Average a small patch once at setup so isolated source pixels do not
    // break up the brow, nose and jaw. No image sampling happens per frame.
    const color = [0, 0, 0];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const offset = ((Math.floor(y) + dy) * portraitW + Math.floor(x) + dx) * 4;
        for (let channel = 0; channel < 3; channel += 1)
          color[channel] += pixels[offset + channel] / 9;
      }
    }
    return color;
  };
  const addPoint = (x, y, color, tile, size) =>
    points.push({
      x,
      y,
      color,
      tile,
      size,
      row: Math.round(y / 12.5),
      start: random() * 0.48 + (y / portraitH) * 0.19,
      speed: 0.24 + random() * 0.55,
      direction: random() < 0.5 ? -1 : 1,
      amplitudeX: 2 + random() * 3,
      amplitudeY: 1 + random() * 2,
      phase: random() * Math.PI * 2,
    });
  const colour = (r, g, b) =>
    Math.max(r, g, b) - Math.min(r, g, b) < 24
      ? 0
      : g > r * 1.17
        ? g > b * 0.88
          ? 2
          : 3
        : r > b * 1.2
          ? 6
          : r > g * 1.15
            ? 5
            : 4;
  for (let y = 6; y < portraitH - 6; y += 7.5) {
    for (let x = 6; x < portraitW - 6; x += 7.5) {
      const [r, g, b] = sample(x + random() * 0.7, y + random() * 0.7);
      const light = Math.max(r, g, b) / 255;
      if (light < 0.1 || random() > 0.3 + light * 0.6) continue;
      const glyph = random() > 0.3;
      addPoint(
        x,
        y,
        colour(r, g, b),
        glyph ? Math.floor(random() * glyphs.length) : random() > 0.5 ? 16 : 15,
        glyph ? 0.62 + random() * 0.16 : 0.68 + random() * 0.24,
      );
    }
  }
  for (let index = 0; index < 64; index += 1)
    rows.push({
      phase: random() * Math.PI * 2,
      speed: 0.3 + random() * 0.25,
      direction: random() < 0.5 ? -1 : 1,
      amplitude: 3 + random() * 4,
      x: 0,
      y: 0,
    });

  const rectanglesSeparate = (a, b, gap = 22) =>
    a[0] + a[2] + gap < b[0] ||
    b[0] + b[2] + gap < a[0] ||
    a[1] + a[3] + gap < b[1] ||
    b[1] + b[3] + gap < a[1];
  const nextScanPose = (from) => {
    const to = from.map((frame) => frame.slice());
    for (const index of from.map((_, index) => index)) {
      let candidate = to[index];
      for (let attempt = 0; attempt < 180; attempt += 1) {
        const large = isLeft ? index === 0 : index === 1;
        const width = large ? 182 + random() * 74 : 62 + random() * 72;
        const height = large ? 126 + random() * 64 : 46 + random() * 52;
        const verticalLimit = window.innerWidth < 600 ? 500 : 650;
        const proposal = [
          42 + random() * (716 - width),
          52 + random() * Math.max(1, verticalLimit - height - 52),
          width,
          height,
        ];
        if (
          to.every(
            (frame, otherIndex) =>
              otherIndex === index || rectanglesSeparate(proposal, frame, 18),
          )
        ) {
          candidate = proposal;
          break;
        }
      }
      to[index] = candidate;
    }
    return to;
  };

  let scanStep = -1;
  let scanFrom = isLeft
    ? mobileAtStart
      ? [
          [426, 96, 204, 142],
          [166, 416, 94, 66],
          [440, 368, 118, 78],
        ]
      : [
          [426, 96, 204, 142],
          [166, 416, 94, 66],
        ]
    : [
        [168, 154, 92, 64],
        [444, 224, 212, 150],
        [336, 448, 118, 78],
      ];
  let scanTo = nextScanPose(scanFrom);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = false,
    inView = true,
    disposed = false,
    dirty = true,
    lastDraw = 0,
    motionTime = 0,
    displayWidth = 1,
    displayHeight = 1;

  function resize() {
    const dpr = mobile.matches ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
    displayWidth = Math.max(1, canvas.clientWidth);
    displayHeight = Math.max(1, canvas.clientHeight);
    const nextWidth = Math.max(1, Math.round(displayWidth * dpr));
    const nextHeight = Math.max(1, Math.round(displayHeight * dpr));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      dirty = true;
    }
    schedulePlayers();
  }

  function draw(now) {
    if (!dirty && now - lastDraw < 1000 / (mobile.matches ? 20 : 30)) return;
    // Advance only by a bounded rendered step: resuming an offscreen canvas or
    // a busy main thread must never jump to a distant animation phase.
    if (lastDraw && !reduced.matches && !mobile.matches)
      motionTime += Math.min(50, Math.max(0, now - lastDraw));
    lastDraw = now;
    dirty = false;
    const dpr = mobile.matches ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
    const width = displayWidth,
      height = displayHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const shapeReveal = clamp(
      Number.parseFloat(
        canvas.style.getPropertyValue("--three-particle-reveal"),
      ) || 0,
    );
    if (shapeReveal <= 0) return;
    const visiblePortraitHeight = mobile.matches
      ? portraitH * (2 / 3)
      : portraitH;
    const scale =
      Math.min(width / portraitW, height / visiblePortraitHeight) * dpr;
    const offsetX = (canvas.width - portraitW * scale) * 0.5;
    const offsetY = mobile.matches
      ? 0
      : (canvas.height - portraitH * scale) * 0.5;
    const time = (reduced.matches || mobile.matches ? 0 : motionTime) * 0.0025;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.globalCompositeOperation = "source-over";
    for (const row of rows) {
      row.x =
        Math.sin(time * row.speed * row.direction + row.phase) * row.amplitude;
      row.y = Math.cos(time * row.speed * 0.7 + row.phase) * 0.8;
    }
    const isMobile = mobile.matches;
    const rotation = reduced.matches || isMobile
      ? 0
      : Math.sin(time * 0.22 + (isLeft ? Math.PI : 0)) * 0.035;
    const rotationCos = Math.cos(rotation);
    const rotationSin = Math.sin(rotation);
    const drawPortrait = (source, softSource, opacity, frames = null) => {
      const step = isMobile ? 3 : 1;
      for (let pointIndex = 0; pointIndex < points.length; pointIndex += step) {
        const point = points[pointIndex];
        if (isMobile && point.y > visiblePortraitHeight) continue;
        if (
          frames &&
          !frames.some(
            (frame) =>
              point.x >= frame.x &&
              point.x <= frame.x + frame.w &&
              point.y >= frame.y &&
              point.y <= frame.y + frame.h,
          )
        )
          continue;
        const row = rows[point.row];
        const dx = point.x - portraitW / 2;
        const dy = point.y - portraitH / 2;
        const x =
          portraitW / 2 + dx * rotationCos - dy * rotationSin +
          (row?.x || 0) +
          Math.sin(time * point.speed * point.direction + point.phase) *
            point.amplitudeX;
        const y =
          portraitH / 2 + dx * rotationSin + dy * rotationCos +
          (row?.y || 0) +
          Math.cos(time * point.speed * point.direction + point.phase) *
            point.amplitudeY;
        const reveal = ease(clamp((shapeReveal - point.start) / 0.34));
        if (reveal <= 0) continue;
        const lowerFade = isMobile
          ? ease(
              clamp(
                (point.y / visiblePortraitHeight - 0.52) / 0.48,
              ),
            )
          : 0;
        ctx.globalAlpha = reveal * opacity * (1 - lowerFade * 0.78);
        const pointSize = point.size * (isMobile ? 1.35 : 1);
        ctx.drawImage(
          lowerFade > 0.12 ? softSource : source,
          point.tile * 24 * atlasScale,
          point.color * 32 * atlasScale,
          24 * atlasScale,
          32 * atlasScale,
          x - 5 * pointSize,
          y - 12 * pointSize,
          24 * pointSize,
          32 * pointSize,
        );
      }
    };
    drawPortrait(monoAtlas, softMonoAtlas, isMobile ? 0.42 : 0.2);

    // Mobile uses a compositor-only overlay for the moving scan frames. Keep
    // this canvas as a single static portrait paint so scrolling does not have
    // to redraw thousands of glyph sprites every animation frame.
    if (isMobile) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    const scanHold = 1.9,
      scanMove = 1.55,
      cycle = time / (scanHold + scanMove),
      step = Math.floor(cycle),
      phase = (cycle % 1) * (scanHold + scanMove);
    if (scanStep < 0) scanStep = step;
    if (step !== scanStep) {
      scanFrom = scanTo;
      scanTo = nextScanPose(scanFrom);
      scanStep = step;
    }
    const movement = ease(clamp((phase - scanHold) / scanMove));
    const scanFrames = scanFrom.map((from, index) => {
      const destination = scanTo[index];
      const [x, y, w, h] = from.map(
        (value, dimension) =>
          value + (destination[dimension] - value) * movement,
      );
      return { x, y, w, h, label: scanNames[index] };
    });

    // Remove the monochrome portrait from the scanning windows before drawing
    // their saturated color content. Otherwise the screen blend washes it out.
    ctx.save();
    ctx.beginPath();
    scanFrames.forEach((frame) => ctx.rect(frame.x, frame.y, frame.w, frame.h));
    ctx.clip();
    ctx.clearRect(0, 0, portraitW, portraitH);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    scanFrames.forEach((frame) => ctx.rect(frame.x, frame.y, frame.w, frame.h));
    ctx.clip();
    drawPortrait(atlas, softAtlas, isMobile ? 0.88 : 0.78, scanFrames);
    ctx.restore();

    ctx.globalCompositeOperation = isMobile ? "source-over" : "screen";
    ctx.globalAlpha = ease(shapeReveal);
    ctx.lineWidth = isMobile ? 1.8 : 1.25;
    ctx.font = "600 12px monospace";
    const overlayOpacity = isMobile ? 0.58 : 1;
    scanEdges.forEach(([fromIndex, toIndex], index) => {
      const from = scanFrames[fromIndex],
        to = scanFrames[toIndex];
      const dx = to.x + to.w / 2 - from.x - from.w / 2;
      const dy = to.y + to.h / 2 - from.y - from.h / 2;
      const fromScale = Math.max(
        Math.abs(dx) / (from.w / 2),
        Math.abs(dy) / (from.h / 2),
        1,
      );
      const toScale = Math.max(
        Math.abs(dx) / (to.w / 2),
        Math.abs(dy) / (to.h / 2),
        1,
      );
      const ax = from.x + from.w / 2 + dx / fromScale,
        ay = from.y + from.h / 2 + dy / fromScale,
        bx = to.x + to.w / 2 - dx / toScale,
        by = to.y + to.h / 2 - dy / toScale,
        mx = (ax + bx) / 2 + (index % 2 ? 16 : -16),
        my = (ay + by) / 2;
      ctx.globalAlpha = (isMobile ? 1 : 0.42) * overlayOpacity;
      ctx.strokeStyle = "#f8f4ff";
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(mx, my);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
      ctx.stroke();
    });
    scanFrames.forEach((frame, index) => {
      const perimeter = 2 * (frame.w + frame.h);
      let edge =
        (((time * 24 + index * 97) % perimeter) + perimeter) % perimeter;
      let handleX = frame.x,
        handleY = frame.y;
      if (edge < frame.w) handleX += edge;
      else if ((edge -= frame.w) < frame.h) {
        handleX += frame.w;
        handleY += edge;
      } else if ((edge -= frame.h) < frame.w) {
        handleX += frame.w - edge;
        handleY += frame.h;
      } else {
        edge -= frame.w;
        handleY += frame.h - edge;
      }
      ctx.globalAlpha = (isMobile ? 1 : 0.68) * overlayOpacity;
      ctx.strokeStyle = "#f8f4ff";
      ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
      ctx.strokeRect(handleX - 6, handleY - 6, 12, 12);
      const label = `${frame.label} / ${Math.round(frame.x)}.${Math.round(frame.y)}`;
      const labelWidth = ctx.measureText(label).width + 12;
      ctx.fillStyle = isMobile ? "#04040a" : "rgba(4, 4, 10, 0.78)";
      ctx.fillRect(frame.x + 7, frame.y + 7, labelWidth, 20);
      ctx.fillStyle = "#faf7ff";
      ctx.fillText(label, frame.x + 13, frame.y + 21);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  const player = {
    needsFrame: () =>
      !disposed && active && inView &&
      (dirty || (!reduced.matches && !mobile.matches)),
    draw,
  };
  players.add(player);
  if (players.size === 1) {
    document.addEventListener("visibilitychange", visibilityChange);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting;
          lastDraw = 0;
          dirty = true;
          schedulePlayers();
        })
      : null;
  intersectionObserver?.observe(canvas);
  const motionChange = () => {
    dirty = true;
    schedulePlayers();
  };
  reduced.addEventListener("change", motionChange);
  mobile.addEventListener("change", resize);
  // Mobile has no ambient RAF loop. Repaint only when scroll reveal changes.
  const revealObserver = typeof MutationObserver === "function"
    ? new MutationObserver(() => {
        if (!mobile.matches) return;
        dirty = true;
        schedulePlayers();
      })
    : null;
  revealObserver?.observe(canvas, { attributes: true, attributeFilter: ["style"] });
  resize();

  return {
    setActive(value) {
      if (active !== value) lastDraw = 0;
      active = value;
      dirty = true;
      schedulePlayers();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      resizeObserver.disconnect();
      revealObserver?.disconnect();
      intersectionObserver?.disconnect();
      reduced.removeEventListener("change", motionChange);
      mobile.removeEventListener("change", resize);
      players.delete(player);
      atlas.width = atlas.height = 1;
      monoAtlas.width = monoAtlas.height = 1;
      softAtlas.width = softAtlas.height = 1;
      softMonoAtlas.width = softMonoAtlas.height = 1;
      canvas.width = canvas.height = 1;
      if (!players.size) {
        cancelSharedFrame(sharedFrame);
        sharedFrame = 0;
        document.removeEventListener("visibilitychange", visibilityChange);
      }
    },
  };
}
