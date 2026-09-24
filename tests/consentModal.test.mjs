import test from "node:test";
import assert from "node:assert/strict";
import {
  getSheetDragDistance,
  SHEET_CLOSE_DISTANCE,
} from "../src/utils/bottomSheet.js";

test("bottom sheet counts only downward drag distance", () => {
  assert.equal(getSheetDragDistance(100, 40), 0);
  assert.equal(getSheetDragDistance(100, 179), SHEET_CLOSE_DISTANCE - 1);
  assert.equal(getSheetDragDistance(100, 180), SHEET_CLOSE_DISTANCE);
});
