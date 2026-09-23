import { getDesktopScale, getHeroScale } from "../utils/desktopScale.js";

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
  const heroScale = getHeroScale(w, h),
    desktopScale = getDesktopScale(w),
    mobile = w < 600,
    headingWidth = mobile
      ? Math.min(
          w - 16,
          270 +
            Math.max(0, Math.min(54, w - 360)) * (128 / 54),
        )
      : Math.min(900 * heroScale, w - 48 * heroScale),
    subtitleWidth = mobile
      ? Math.min(328, w - 32)
      : Math.min(870 * heroScale, w - 48 * heroScale);
  const headingSize = mobile ? 21.5 : 44 * heroScale;
  const subtitleSize = mobile ? 17 : 23 * heroScale;
  const factSize = mobile ? 14 : Math.max(10, 15 * desktopScale),
    factLineHeight = mobile ? 20 : Math.max(14, 24 * desktopScale),
    iconSize = mobile ? 18 : 18 * desktopScale,
    iconGap = mobile ? 8 : 8 * desktopScale,
    factGap = mobile ? 4 : 4 * desktopScale,
    factPaddingX = mobile ? 13 : 16 * desktopScale,
    factPaddingY = mobile ? 4 : 4 * desktopScale;
  let y = mobile
    ? Math.max(95, Math.min(109, h * 0.19))
    : h * (192 / 940);
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
  function textRow(text, font, lineHeight, gradientText, rowWidth) {
    for (let i = 0; i < contexts.length; i++) {
      const ctx = contexts[i];
      ctx.font = font;
      if (gradientText) {
        const left = (w - rowWidth) / 2;
        const gradient = ctx.createLinearGradient(
          left,
          0,
          left + rowWidth,
          0,
        );
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
  const headingText = mobile
    ? blocks[0].text.replace(/Ads\b/i, "ADS")
    : blocks[0].text;
  for (const line of wrapped(headingText, headingFont, headingWidth))
    textRow(
      line,
      headingFont,
      mobile ? 29.7 : headingSize * 1.1,
      true,
      headingWidth,
    );
  y += mobile ? 12 : 30 * heroScale;
  const subtitleFont = `400 ${subtitleSize}px 'MTS Wide', Arial`;
  for (const line of wrapped(blocks[1].text, subtitleFont, subtitleWidth))
    textRow(
      line,
      subtitleFont,
      mobile ? 22 : 29 * heroScale,
      true,
      subtitleWidth,
    );
  y = mobile ? Math.max(y + 16, h - 178) : y + 60 * desktopScale;
  const factsRaster = document.createElement("canvas");
  factsRaster.width = raster.width;
  factsRaster.height = raster.height;
  const factsCtx = factsRaster.getContext("2d");
  factsCtx.scale(dpr, dpr);
  factsCtx.textBaseline = "middle";
  factsCtx.imageSmoothingEnabled = true;
  const factFont = `400 ${factSize}px 'MTS Wide', Arial`;
  c.font = factFont;
  const factItems = blocks.slice(2).map((block, index) => {
    const textWidth = c.measureText(block.text).width;
    return {
      block,
      side: index % 2 === 0 ? "left" : "right",
      textWidth,
      width: factPaddingX * 2 + iconSize + iconGap + textWidth,
    };
  });
  const factRows = mobile
    ? [
        factItems.slice(0, 1),
        factItems.slice(1, 2),
        factItems.slice(2, 4),
      ].map((items) => ({
        items,
        width:
          items.reduce((sum, item) => sum + item.width, 0) +
          factGap * Math.max(0, items.length - 1),
      }))
    : Array.from({ length: Math.ceil(factItems.length / 2) }, (_, index) => {
        const items = factItems.slice(index * 2, index * 2 + 2);
        return {
          items,
          width:
            items.reduce((sum, item) => sum + item.width, 0) +
            factGap * Math.max(0, items.length - 1),
        };
      });

  factRows.forEach((row, rowIndex) => {
    let frameX = (w - row.width) / 2;
    for (const item of row.items) {
      const { block } = item;
      const frameY = y - factPaddingY;
      const frameHeight = factLineHeight + factPaddingY * 2;
      const pillFill = factsCtx.createLinearGradient(
        frameX,
        0,
        frameX + item.width,
        0,
      );
      const lightFill = "rgba(28, 26, 32, 0.84)";
      const darkFill = "rgba(3, 2, 5, 0.90)";
      pillFill.addColorStop(0, item.side === "left" ? lightFill : darkFill);
      pillFill.addColorStop(1, item.side === "left" ? darkFill : lightFill);
      factsCtx.save();
      factsCtx.fillStyle = pillFill;
      factsCtx.beginPath();
      factsCtx.roundRect(
        frameX,
        frameY,
        item.width,
        frameHeight,
        frameHeight / 2,
      );
      factsCtx.fill();
      factsCtx.restore();
      factsCtx.font = factFont;
      factsCtx.textAlign = "left";
      factsCtx.fillStyle = "rgba(255, 255, 255, 0.80)";
      let x = frameX + factPaddingX;
      if (icons[block.icon] && icons[block.icon].complete) {
        factsCtx.save();
        factsCtx.globalAlpha = 0.6;
        factsCtx.drawImage(
          icons[block.icon],
          x,
          y + (factLineHeight - iconSize) / 2 - desktopScale,
          iconSize,
          iconSize,
        );
        factsCtx.restore();
      }
      x += iconSize + iconGap;
      factsCtx.fillText(block.text, x, y + factLineHeight / 2);
      factsCtx.textAlign = "center";
      rows.push({ text: block.text, top: y, bottom: y + factLineHeight });
      frameX += item.width + factGap;
    }
    y += factLineHeight + factPaddingY * 2;
    if (rowIndex < factRows.length - 1) y += factGap;
  });
  c.drawImage(factsRaster, 0, 0, w, h);
  return { raster, bottom: y };
}
