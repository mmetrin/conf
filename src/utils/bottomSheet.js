export const SHEET_CLOSE_DISTANCE = 80;

export function getSheetDragDistance(startY, currentY) {
  return Math.max(0, currentY - startY);
}
