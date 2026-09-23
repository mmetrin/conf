import test from "node:test";
import assert from "node:assert/strict";
import { waitForDecodedImage } from "../src/utils/imageReady.js";

test("required image resolves only after decoded pixels are available", async () => {
  let release;
  const decoded = new Promise((resolve) => {
    release = resolve;
  });
  const image = {
    complete: false,
    naturalWidth: 0,
    naturalHeight: 0,
    src: "projector.webp",
    decode: () => decoded,
  };
  let ready = false;
  const waiting = waitForDecodedImage(image).then(() => {
    ready = true;
  });

  await Promise.resolve();
  assert.equal(ready, false);
  image.complete = true;
  image.naturalWidth = 1200;
  image.naturalHeight = 599;
  release();
  await waiting;
  assert.equal(ready, true);
});

test("loaded pixels tolerate a browser decode rejection", async () => {
  const image = {
    complete: true,
    naturalWidth: 1200,
    naturalHeight: 599,
    src: "projector.webp",
    decode: () => Promise.reject(new Error("Safari decode quirk")),
  };

  await assert.doesNotReject(waitForDecodedImage(image));
});

test("broken required image never reports readiness", async () => {
  const image = {
    complete: true,
    naturalWidth: 0,
    naturalHeight: 0,
    src: "projector.webp",
    decode: () => Promise.reject(new Error("network error")),
  };

  await assert.rejects(waitForDecodedImage(image), /network error/);
});
