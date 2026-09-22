export const FRAME_COUNT = 30,
  FRAME_DURATION = 0.08,
  FRAME_PAUSE = 1;
export function receiverFrameAt(elapsed, count = FRAME_COUNT) {
  const last = count - 1,
    moving = (last - 1) * FRAME_DURATION;
  const phase = elapsed % (2 * FRAME_PAUSE + 2 * moving);
  if (phase < FRAME_PAUSE) return 0;
  if (phase < FRAME_PAUSE + moving)
    return 1 + Math.floor((phase - FRAME_PAUSE) / FRAME_DURATION);
  if (phase < 2 * FRAME_PAUSE + moving) return last;
  return (
    last - 1 - Math.floor((phase - 2 * FRAME_PAUSE - moving) / FRAME_DURATION)
  );
}
export function createReceiverPlayer(canvas, scope) {
  const ctx = canvas.getContext("2d"),
    frames = new Array(FRAME_COUNT);
  let last = -1,
    elapsed = FRAME_PAUSE - FRAME_DURATION,
    ready = false;
  // Retain only enough decoded pixels for the rendered image at this device's DPR.
  const requestedWidth = () =>
    Math.min(
      2012,
      Math.ceil(Math.max(1, canvas.clientWidth) * (devicePixelRatio || 1)),
    );
  let width = requestedWidth(),
    height = Math.round((width * 1132) / 2012);
  let desiredWidth = width,
    upgrading = false,
    resizeTimer = 0;
  canvas.width = width;
  canvas.height = height;
  async function load(index, frameWidth = width) {
    const image = new Image();
    image.decoding = "async";
    image.src = `assets/receiver-frames/${String(index + 1).padStart(2, "0")}.png?v=tinified-30-v2`;
    await image.decode();
    if (scope.disposed) return;
    let frame = image;
    if (typeof createImageBitmap === "function") {
      try {
        frame = await createImageBitmap(image, {
          resizeWidth: frameWidth,
          resizeHeight: Math.round((frameWidth * 1132) / 2012),
          resizeQuality: "high",
        });
      } catch {
        /* Original decoded image is the compatible fallback. */
      }
    }
    if (scope.disposed) {
      frame.close?.();
      return;
    }
    const previous = frames[index];
    frames[index] = frame;
    previous?.close?.();
  }
  function paint(index) {
    if (index === last || !frames[index]) return;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(frames[index], 0, 0, width, height);
    last = index;
  }
  const firstReady = load(0).then(() => paint(0));
  // The remaining frames never block the loader or compete in a 30-image decode burst.
  firstReady
    .then(async () => {
      let next = 1;
      async function worker() {
        while (next < FRAME_COUNT && !scope.disposed) {
          await load(next++);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      await Promise.all([worker(), worker()]);
      ready = !scope.disposed;
      upgradeResolution();
    })
    .catch(() => {
      /* Keep the valid first frame when any later asset is unavailable. */
    });
  async function upgradeResolution() {
    if (!ready || upgrading || scope.disposed || desiredWidth <= width) return;
    upgrading = true;
    width = desiredWidth;
    height = Math.round((width * 1132) / 2012);
    canvas.width = width;
    canvas.height = height;
    const current = Math.max(0, last);
    last = -1;
    paint(current);
    try {
      // Replace one bitmap at a time; orientation changes never double the cache.
      for (let index = 0; index < FRAME_COUNT && !scope.disposed; index++) {
        await load(index, width);
        if (last === index) {
          last = -1;
          paint(index);
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch {
      /* Existing bitmaps remain usable if an upgrade fails. */
    }
    upgrading = false;
    if (!scope.disposed) upgradeResolution();
  }
  scope.observe(
    new ResizeObserver(() => {
      scope.clearTimeout(resizeTimer);
      resizeTimer = scope.timeout(() => {
        desiredWidth = Math.max(desiredWidth, requestedWidth());
        upgradeResolution();
      }, 200);
    }),
    canvas,
  );
  scope.defer(() => {
    for (const frame of frames) frame?.close?.();
    frames.length = 0;
    canvas.width = canvas.height = 1;
  });
  return {
    firstReady,
    advance(dt, reduced) {
      if (reduced) {
        paint(0);
        return;
      }
      if (ready) {
        elapsed += dt;
        paint(receiverFrameAt(elapsed));
      }
    },
  };
}
