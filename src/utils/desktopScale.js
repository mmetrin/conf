export const DESKTOP_BASE_WIDTH = 1400;
export const DESKTOP_SCALE_MIN_WIDTH = 600;
export const HERO_SAFE_HEIGHT = 700;

export function getDesktopScale(width) {
  return width >= DESKTOP_SCALE_MIN_WIDTH && width < DESKTOP_BASE_WIDTH
    ? width / DESKTOP_BASE_WIDTH
    : 1;
}

export function getHeroScale(width, height) {
  const widthScale = getDesktopScale(width);
  if (
    width < DESKTOP_SCALE_MIN_WIDTH ||
    width >= DESKTOP_BASE_WIDTH ||
    height >= HERO_SAFE_HEIGHT
  )
    return widthScale;
  return Math.min(widthScale, height / HERO_SAFE_HEIGHT);
}
