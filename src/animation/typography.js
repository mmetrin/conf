export function buildFigmaOpeningTypography(w, h, dpr, blocks, icons) {
  const raster = document.createElement("canvas");
  raster.width = Math.ceil(w * dpr);
  raster.height = Math.ceil(h * dpr);
  const contexts = [raster.getContext("2d")];
  for (const c of contexts) {
    c.scale(dpr, dpr);
    c.textBaseline = "middle";
    c.textAlign = "center";
    c.imageSmoothingEnabled = true;
  }
  const width = Math.min(900, w - 48),
    left = (w - width) / 2,
    mobile = w < 760;
  const headingSize = 44;
  const subtitleSize = 23;
  const factSize = 15,
    iconSize = 18,
    iconGap = 8;
  let y = h * (192 / 940),
    factsTop = 0;
  const rows = [],
    c = contexts[0];
  function wrapped(text, font, maxWidth) {
    c.font = font;
    const out = [];
    let line = "";
    for (const word of text.split(" ")) {
      const candidate = line ? line + " " + word : word;
      if (line && c.measureText(candidate).width > maxWidth) {
        out.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) out.push(line);
    return out;
  }
  function textRow(text, font, lineHeight, gradientText) {
    for (let i = 0; i < contexts.length; i++) {
      const ctx = contexts[i];
      ctx.font = font;
      if (gradientText) {
        const gradient = ctx.createLinearGradient(left, 0, left + width, 0);
        gradient.addColorStop(0, "rgba(255,255,255,.2)");
        gradient.addColorStop(0.10577, "rgba(255,255,255,.2)");
        gradient.addColorStop(0.4375, "#ffffff");
        gradient.addColorStop(0.61058, "#ffffff");
        gradient.addColorStop(0.89904, "rgba(255,255,255,.2)");
        gradient.addColorStop(1, "rgba(255,255,255,.2)");
        ctx.fillStyle = gradient;
      } else ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fillText(text, w / 2, y + lineHeight / 2);
    }
    rows.push({ text, top: y, bottom: y + lineHeight });
    y += lineHeight;
  }
  const headingFont = `700 ${headingSize}px 'MTS Ultra Extended', Arial`;
  for (const line of wrapped(blocks[0].text, headingFont, width))
    textRow(line, headingFont, headingSize * 1.1, true);
  y += 36;
  const subtitleFont = `400 ${subtitleSize}px 'MTS Wide', Arial`;
  for (const line of wrapped(blocks[1].text, subtitleFont, width))
    textRow(line, subtitleFont, mobile ? subtitleSize * 1.32 : 29, true);
  y += 60;
  factsTop = y;
  const factsRaster = document.createElement("canvas");
  factsRaster.width = raster.width;
  factsRaster.height = raster.height;
  const factsCtx = factsRaster.getContext("2d");
  factsCtx.scale(dpr, dpr);
  factsCtx.textBaseline = "middle";
  factsCtx.imageSmoothingEnabled = true;
  for (let rowIndex = 2; rowIndex < blocks.length; rowIndex++) {
    const block = blocks[rowIndex],
      parts = block.text.split(" · ");
    let fontSize = factSize;
    c.font = `400 ${fontSize}px 'MTS Wide', Arial`;
    const separatorWidth = 32;
    let textWidth =
      parts.reduce((sum, part) => sum + c.measureText(part).width, 0) +
      (parts.length - 1) * separatorWidth;
    // At narrow widths wrap only between semantic facts, keeping each label intact.
    let groups = [parts];
    if (textWidth + iconSize + iconGap > width && mobile)
      groups = parts.map((part) => [part]);
    else if (textWidth + iconSize + iconGap > width) {
      fontSize *= (width - iconSize - iconGap) / textWidth;
    }
    const lineHeight = 24;
    const pairIndex = (rowIndex - 2) % 2;
    const rowIndexInPairs = Math.floor((rowIndex - 2) / 2);
    groups.forEach((group, groupIndex) => {
      const font = `400 ${fontSize}px 'MTS Wide', Arial`;
      c.font = font;
      const lengths = group.map((part) => c.measureText(part).width);
      const hasIcon = groupIndex === 0,
        total =
          lengths.reduce((sum, n) => sum + n, 0) +
          (group.length - 1) * separatorWidth +
          (hasIcon ? iconSize + iconGap : 0);
      let rowTotal = total;
      if (!mobile && pairIndex === 0 && blocks[rowIndex + 1]) {
        const nextText = blocks[rowIndex + 1].text;
        c.font = font;
        const nextWidth = c.measureText(nextText).width + iconSize + iconGap;
        rowTotal = total + nextWidth + 28;
      } else if (!mobile && pairIndex === 1 && blocks[rowIndex - 1]) {
        const previousText = blocks[rowIndex - 1].text;
        c.font = font;
        const previousWidth = c.measureText(previousText).width + iconSize + iconGap;
        rowTotal = previousWidth + total + 28;
      }
      let start =
        (w - rowTotal) / 2 +
        (pairIndex === 1 ? rowTotal - total : 0);
      // Each fact is presented as its own pill: 4px vertical and 12px
      // horizontal padding, with a fully rounded border radius.
      const frameX = start - 12;
      const frameY = y - 4;
      const frameWidth = total + 24;
      const frameHeight = lineHeight + 8;
      factsCtx.save();
      factsCtx.fillStyle = "rgba(7, 6, 9, 0.84)";
      factsCtx.beginPath();
      factsCtx.roundRect(
        frameX,
        frameY,
        frameWidth,
        frameHeight,
        frameHeight / 2,
      );
      factsCtx.fill();
      factsCtx.restore();
      for (let i = 0; i < contexts.length; i++) {
        const ctx = factsCtx;
        ctx.font = font;
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255, 255, 255, 0.80)";
        let x = start;
        if (hasIcon) {
          if (icons[block.icon] && icons[block.icon].complete) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.drawImage(
              icons[block.icon],
              x,
              y + (lineHeight - iconSize) / 2,
              iconSize,
              iconSize,
            );
            ctx.restore();
          }
          x += iconSize + iconGap;
        }
        group.forEach((part, j) => {
          ctx.fillText(part, x, y + lineHeight / 2);
          x += lengths[j];
          if (j < group.length - 1) {
            const ctx = contexts[i];
            ctx.save();
            const dotX = x + separatorWidth / 2,
              dotY = y + lineHeight / 2;
            const glow = ctx.createRadialGradient(
              dotX,
              dotY,
              0,
              dotX,
              dotY,
              12,
            );
            glow.addColorStop(0, "#fffaff");
            glow.addColorStop(0.15, "#e5cfff");
            glow.addColorStop(0.4, "#b58aff88");
            glow.addColorStop(1, "#b58aff00");
            ctx.fillStyle = glow;
            ctx.fillRect(dotX - 12, dotY - 12, 24, 24);
            ctx.fillStyle = "#fffaff";
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            x += separatorWidth;
          }
        });
        ctx.textAlign = "center";
      }
      rows.push({ text: group.join(" · "), top: y, bottom: y + lineHeight });
      if (pairIndex === 1 || mobile) y += lineHeight + (groupIndex < groups.length - 1 ? 8 : 0);
    });
    if ((pairIndex === 1 || mobile) && rowIndex < blocks.length - 1) y += 12;
  }
  c.drawImage(factsRaster, 0, 0, w, h);
  return { raster, bottom: y };
}
