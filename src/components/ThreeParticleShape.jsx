import { useEffect, useRef } from "react";

const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => value * value * (3 - 2 * value);

// Ported from the supplied demo: a local image is sampled once, then every
// visible detail is drawn as an independently animated canvas particle.
export function ThreeParticleShape({ side = "right", seedOffset = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reference = new Image();
    const portraitW = 800;
    const portraitH = 773;
    const points = [];
    const rows = [];
    let seed = 1947 + seedOffset;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const palette = ["#ffffff", "#fff5ff", "#efbfff", "#cf79ff", "#ff3d68", "#ff0032", "#ffb0c0"];
    const glyphs = "01{}[]<>/+=:·";
    const isLeft = side === "left";
    const scanNames = isLeft ? ["signal.vector", "data.field"] : ["data.core", "signal.map", "node.scan"];
    const scanEdges = isLeft ? [[0, 1]] : [[0, 1], [1, 2], [2, 0]];
    const atlas = document.createElement("canvas");
    const monoAtlas = document.createElement("canvas");
    atlas.width = 512;
    atlas.height = 224;
    monoAtlas.width = 512;
    monoAtlas.height = 224;
    const atlasCtx = atlas.getContext("2d");
    const monoAtlasCtx = monoAtlas.getContext("2d");
    palette.forEach((color, index) => {
      atlasCtx.fillStyle = color;
      atlasCtx.font = "600 11px monospace";
      [...glyphs].forEach((glyph, glyphIndex) => atlasCtx.fillText(glyph, glyphIndex * 24 + 5, index * 32 + 17));
      atlasCtx.fillRect(365, index * 32 + 12, 1.4, 1.4);
      atlasCtx.fillRect(389, index * 32 + 12, 3.4, 1.1);
      atlasCtx.shadowColor = color;
      atlasCtx.shadowBlur = 5;
      atlasCtx.fillRect(437, index * 32 + 11, 2, 2);
      atlasCtx.shadowBlur = 0;

      // The base portrait stays monochrome. A second colour pass is clipped
      // by the moving scan windows below.
      monoAtlasCtx.fillStyle = index === 0 ? "#ffffff" : "#d9d9e0";
      monoAtlasCtx.font = "600 11px monospace";
      [...glyphs].forEach((glyph, glyphIndex) => monoAtlasCtx.fillText(glyph, glyphIndex * 24 + 5, index * 32 + 17));
      monoAtlasCtx.fillRect(365, index * 32 + 12, 1.4, 1.4);
      monoAtlasCtx.fillRect(389, index * 32 + 12, 3.4, 1.1);
      monoAtlasCtx.shadowColor = "#ffffff";
      monoAtlasCtx.shadowBlur = 3;
      monoAtlasCtx.fillRect(437, index * 32 + 11, 2, 2);
      monoAtlasCtx.shadowBlur = 0;
    });

    let ready = false;
    let raf = 0;
    let disposed = false;
    let scanStep = -1;
    let scanFrom = isLeft
      ? [[426, 96, 204, 142], [166, 416, 94, 66]]
      : [[168, 154, 92, 64], [444, 224, 212, 150], [336, 448, 118, 78]];
    let scanTo = null;
    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    const addPoint = (x, y, color, tile, size, alpha, glyph) => points.push({
      x, y, color, tile, size, alpha, glyph, row: Math.round(y / 12.5),
      start: random() * 0.48 + y / portraitH * 0.19,
      speed: 0.24 + random() * 0.55,
      direction: random() < 0.5 ? -1 : 1,
      amplitudeX: glyph ? 0.22 : 0.5 + random() * 0.7,
      amplitudeY: glyph ? 0.12 : 0.25 + random() * 0.45,
      phase: random() * Math.PI * 2,
      phaseY: random() * Math.PI * 2,
    });
    const colour = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 24 ? 0 : g > r * 1.17 ? (g > b * 0.88 ? 2 : 3) : r > b * 1.2 ? 6 : r > g * 1.15 ? 5 : 4;
    const rectanglesSeparate = (a, b, gap = 22) => a[0] + a[2] + gap < b[0] || b[0] + b[2] + gap < a[0] || a[1] + a[3] + gap < b[1] || b[1] + b[3] + gap < a[1];
    const nextScanPose = (from) => {
      const to = from.map((frame) => frame.slice());
      // The original frames hold, then glide together to a new network pose.
      // Choose destinations as a set, so their links never become detached.
      for (const index of from.map((_, index) => index)) {
        let candidate = to[index];
        for (let attempt = 0; attempt < 180; attempt += 1) {
          const large = isLeft ? index === 0 : index === 1;
          const width = large ? 182 + random() * 74 : 62 + random() * 72;
          const height = large ? 126 + random() * 64 : 46 + random() * 52;
          const proposal = [42 + random() * (716 - width), 52 + random() * (650 - height), width, height];
          if (to.every((frame, otherIndex) => otherIndex === index || rectanglesSeparate(proposal, frame, 18))) {
            candidate = proposal;
            break;
          }
        }
        to[index] = candidate;
      }
      return to;
    };
    scanTo = nextScanPose(scanFrom);

    reference.onload = () => {
      const map = document.createElement("canvas");
      map.width = portraitW;
      map.height = portraitH;
      const mapCtx = map.getContext("2d", { willReadFrequently: true });
      mapCtx.drawImage(reference, 0, 0, portraitW, portraitH);
      const pixels = mapCtx.getImageData(0, 0, portraitW, portraitH).data;
      const sample = (x, y) => {
        const offset = (Math.floor(y) * portraitW + Math.floor(x)) * 4;
        return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
      };
      for (let y = 6; y < portraitH - 6; y += 5.2) {
        for (let x = 6; x < portraitW - 6; x += 5.2) {
          const [r, g, b] = sample(x + random() * 0.7, y + random() * 0.7);
          const light = Math.max(r, g, b) / 255;
          if (light < 0.12 || random() > 0.22 + light * 0.54) continue;
          const glyph = random() > 0.72;
          addPoint(x, y, colour(r, g, b), glyph ? Math.floor(random() * glyphs.length) : random() > 0.5 ? 16 : 15, 0.78 + random() * 0.46, Math.min(1, 0.32 + Math.pow(light, 0.6) * 0.8), glyph);
        }
      }
      for (let index = 0; index < 64; index += 1) rows.push({ phase: random() * Math.PI * 2, speed: 0.3 + random() * 0.25, direction: random() < 0.5 ? -1 : 1, amplitude: 3 + random() * 4 });
      ready = true;
    };
    reference.src = "assets/particle-human-reference.png";

    const draw = (now) => {
      if (disposed) return;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (ready) {
        const scale = Math.min(width / portraitW, height / portraitH) * dpr;
        const offsetX = (canvas.width - portraitW * scale) * 0.5;
        const offsetY = (canvas.height - portraitH * scale) * 0.5;
        const time = now * 0.0025;
        const shapeReveal = clamp(Number.parseFloat(canvas.style.getPropertyValue("--three-particle-reveal")) || 0);
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        ctx.globalCompositeOperation = "screen";
        const offsets = rows.map((row) => ({ x: Math.sin(time * row.speed * row.direction + row.phase) * row.amplitude, y: Math.cos(time * row.speed * 0.7 + row.phase) * 0.3 }));
        const drawPortrait = (source, colourOnly = false) => {
          for (const point of points) {
            const row = offsets[point.row] || { x: 0, y: 0 };
            const x = point.x + row.x + Math.sin(time * point.speed * point.direction + point.phase) * point.amplitudeX;
            const y = point.y + row.y + Math.cos(time * point.speed * point.direction + point.phaseY) * point.amplitudeY;
            const reveal = ease(clamp((shapeReveal - point.start) / 0.34));
            if (reveal <= 0) continue;
            ctx.globalAlpha = point.alpha * reveal * (0.76 + 0.24 * Math.sin(time * 1.5 + point.phase)) * (colourOnly ? 1 : 0.3);
            ctx.drawImage(source, point.tile * 24, point.color * 32, 24, 32, x - 5 * point.size, y - 12 * point.size, 24 * point.size, 32 * point.size);
          }
        };
        drawPortrait(monoAtlas);

        // Native canvas port of the scan frames: their windows reveal the
        // original colour portrait while the rest remains black and white.
        const scanHold = 1.9;
        const scanMove = 1.55;
        const cycle = time / (scanHold + scanMove);
        const step = Math.floor(cycle);
        const phase = (cycle % 1) * (scanHold + scanMove);
        if (scanStep < 0) scanStep = step;
        if (step !== scanStep) {
          scanFrom = scanTo;
          scanTo = nextScanPose(scanFrom);
          scanStep = step;
        }
        const movement = ease(clamp((phase - scanHold) / scanMove));
        const scanFrames = scanFrom.map((from, index) => {
          const destination = scanTo[index];
          const [x, y, w, h] = from.map((value, dimension) => value + (destination[dimension] - value) * movement);
          return { x, y, w, h, label: scanNames[index] };
        });

        ctx.save();
        ctx.beginPath();
        scanFrames.forEach((frame) => ctx.rect(frame.x, frame.y, frame.w, frame.h));
        ctx.clip();
        drawPortrait(atlas, true);
        ctx.restore();

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = ease(shapeReveal);
        ctx.lineWidth = 1.25;
        ctx.font = "600 12px monospace";
        scanEdges.forEach(([fromIndex, toIndex], index) => {
          const from = scanFrames[fromIndex];
          const to = scanFrames[toIndex];
          const dx = to.x + to.w / 2 - from.x - from.w / 2;
          const dy = to.y + to.h / 2 - from.y - from.h / 2;
          const fromScale = Math.max(Math.abs(dx) / (from.w / 2), Math.abs(dy) / (from.h / 2), 1);
          const toScale = Math.max(Math.abs(dx) / (to.w / 2), Math.abs(dy) / (to.h / 2), 1);
          const ax = from.x + from.w / 2 + dx / fromScale;
          const ay = from.y + from.h / 2 + dy / fromScale;
          const bx = to.x + to.w / 2 - dx / toScale;
          const by = to.y + to.h / 2 - dy / toScale;
          const mx = (ax + bx) / 2 + (index % 2 ? 16 : -16);
          const my = (ay + by) / 2;
          ctx.globalAlpha = 0.52;
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
          let edge = ((time * 24 + index * 97) % perimeter + perimeter) % perimeter;
          let handleX = frame.x;
          let handleY = frame.y;
          if (edge < frame.w) handleX += edge;
          else if ((edge -= frame.w) < frame.h) { handleX += frame.w; handleY += edge; }
          else if ((edge -= frame.h) < frame.w) { handleX += frame.w - edge; handleY += frame.h; }
          else { edge -= frame.w; handleY += frame.h - edge; }
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = "#f8f4ff";
          ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
          ctx.strokeRect(handleX - 6, handleY - 6, 12, 12);
          const label = `${frame.label} / ${Math.round(frame.x)}.${Math.round(frame.y)}`;
          const labelWidth = ctx.measureText(label).width + 12;
          ctx.fillStyle = "rgba(4, 4, 10, 0.78)";
          ctx.fillRect(frame.x + 7, frame.y + 7, labelWidth, 20);
          ctx.fillStyle = "#faf7ff";
          ctx.fillText(label, frame.x + 13, frame.y + 21);
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) raf = requestAnimationFrame(draw); };
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    raf = requestAnimationFrame(draw);
    return () => { disposed = true; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  return <canvas ref={canvasRef} className={`three-particle-shape three-particle-shape--${side}`} aria-hidden="true" />;
}
