import test from "node:test";
import assert from "node:assert/strict";
import {
  getDesktopScale,
  getHeroScale,
} from "../src/utils/desktopScale.js";

test("desktop scale is continuous from 600px through 1399px", () => {
  assert.equal(getDesktopScale(599), 1);
  assert.equal(getDesktopScale(600), 600 / 1400);
  assert.equal(getDesktopScale(900), 900 / 1400);
  assert.equal(getDesktopScale(1399), 1399 / 1400);
  assert.equal(getDesktopScale(1400), 1);
  assert.equal(getDesktopScale(1920), 1);
});

test("only short desktop Hero viewports receive height safety", () => {
  assert.equal(getHeroScale(1280, 800), 1280 / 1400);
  assert.equal(getHeroScale(1280, 600), 600 / 700);
  assert.equal(getHeroScale(1399, 500), 500 / 700);
  assert.equal(getHeroScale(1400, 500), 1);
  assert.equal(getHeroScale(599, 500), 1);
});
