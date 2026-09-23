export const FRAME_COUNT = 30,
  FRAME_DURATION = 0.08,
  FRAME_PAUSE = 1;

const FRAME_VERSION = "webp-q92-v2";
const FRAME_SOURCE_WIDTH = 1440;

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
  // Keep the selected family for this session, including orientation changes.
  const mobile = globalThis.innerWidth <= 599;
  const sourceWidth = mobile ? 720 : FRAME_SOURCE_WIDTH;
  const ctx = canvas.getContext("2d"),
    frames = new Array(FRAME_COUNT);
  let last = -1,
    elapsed = FRAME_PAUSE - FRAME_DURATION,
    ready = false,
    backgroundStarted = false;

  const requestedWidth = () =>
    Math.min(
      sourceWidth,
      navigator.deviceMemory && navigator.deviceMemory <= 4
        ? 1130
        : FRAME_SOURCE_WIDTH,
      Math.ceil(Math.max(1, canvas.clientWidth) * (devicePixelRatio || 1)),
    );
  let width = requestedWidth(),
    height = Math.round((width * 1132) / 2012);
  let desiredWidth = width,
    upgrading = false,
    resizeTimer = 0;
  canvas.width = width;
  canvas.height = height;

  const frameUrl = (index, attempt = 0) =>
    `assets/receiver-frames/${mobile ? "mobile/" : ""}${String(index + 1).padStart(2, "0")}.webp?v=${mobile ? "webp-720-q88-v1" : FRAME_VERSION}${attempt ? `&retry=${attempt}` : ""}`;

  function timed(promise, timeoutMs, onTimeout) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        onTimeout?.();
        reject(new Error("Receiver frame timed out"));
      }, timeoutMs);
      promise.then(
        (value) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          reject(error);
        },
      );
    });
  }

  function releaseFrame(frame) {
    frame?.close?.();
    if (frame?.tagName === "CANVAS") frame.width = frame.height = 1;
  }

  async function decodeFrame(index, frameWidth, priority, attempt) {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = priority;
    image.src = frameUrl(index, attempt);
    await timed(image.decode(), index === 0 ? 15000 : 30000, () => {
      image.src = "";
    });
    if (scope.disposed) return null;

    const frameHeight = Math.round((frameWidth * 1132) / 2012);
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(image, {
          resizeWidth: frameWidth,
          resizeHeight: frameHeight,
          resizeQuality: "high",
        });
      } catch {
        // Safari versions without bitmap resize support use the bounded canvas below.
      }
    }
    const buffer = document.createElement("canvas");
    buffer.width = frameWidth;
    buffer.height = frameHeight;
    const bufferContext = buffer.getContext("2d");
    bufferContext.imageSmoothingEnabled = true;
    bufferContext.imageSmoothingQuality = "high";
    bufferContext.drawImage(image, 0, 0, frameWidth, frameHeight);
    return buffer;
  }

  async function load(index, frameWidth = width, priority = "low") {
    let error;
    for (let attempt = 0; attempt < 2 && !scope.disposed; attempt++) {
      try {
        const frame = await decodeFrame(index, frameWidth, priority, attempt);
        if (!frame || scope.disposed) {
          releaseFrame(frame);
          return;
        }
        const previous = frames[index];
        frames[index] = frame;
        releaseFrame(previous);
        return;
      } catch (nextError) {
        error = nextError;
      }
    }
    throw error || new Error(`Receiver frame ${index + 1} failed`);
  }

  function paint(index) {
    if (index === last || !frames[index]) return;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(frames[index], 0, 0, width, height);
    last = index;
  }

  function paintFallback() {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height * 0.46,
      0,
      width / 2,
      height * 0.46,
      width * 0.32,
    );
    gradient.addColorStop(0, "#17151f");
    gradient.addColorStop(1, "#030307");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const firstReady = load(0, width, "high").then(
    () => {
      paint(0);
      return true;
    },
    () => {
      paintFallback();
      return false;
    },
  );

  let resolveAll;
  const allReady = new Promise((resolve) => {
    resolveAll = resolve;
  });

  async function yieldToMain() {
    if (globalThis.scheduler?.yield) await globalThis.scheduler.yield();
    else await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  function startBackground() {
    if (backgroundStarted) return allReady;
    backgroundStarted = true;
    firstReady.then(async (hasFirstFrame) => {
      if (!hasFirstFrame || scope.disposed) {
        resolveAll({ ready: false, failed: [0] });
        return;
      }
      if (
        navigator.connection?.saveData ||
        /(^|-)2g$/.test(navigator.connection?.effectiveType || "")
      ) {
        resolveAll({ ready: false, failed: [], static: true });
        return;
      }
      let next = 1;
      const failed = [];
      const concurrency = 2;
      async function worker() {
        while (next < FRAME_COUNT && !scope.disposed) {
          const index = next++;
          try {
            await load(index, width, "low");
          } catch {
            failed.push(index);
          }
          await yieldToMain();
        }
      }
      await Promise.all(Array.from({ length: concurrency }, worker));
      ready = !scope.disposed && failed.length === 0;
      if (!ready) {
        for (let index = 1; index < frames.length; index++) {
          releaseFrame(frames[index]);
          frames[index] = null;
        }
      } else upgradeResolution();
      resolveAll({ ready, failed });
    });
    return allReady;
  }

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
      for (let index = 0; index < FRAME_COUNT && !scope.disposed; index++) {
        await load(index, width, "low");
        if (last === index) {
          last = -1;
          paint(index);
        }
        await yieldToMain();
      }
    } catch {
      // Existing bitmaps remain usable if a resolution upgrade fails.
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
    for (const frame of frames) releaseFrame(frame);
    frames.length = 0;
    canvas.width = canvas.height = 1;
  });
  return {
    firstReady,
    allReady,
    startBackground,
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
