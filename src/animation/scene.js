import { buildFigmaOpeningTypography } from "./typography.js";

import { createReceiverPlayer } from "./receiver.js";
import { getHeroScale } from "../utils/desktopScale.js";
import { waitForDecodedImage } from "../utils/imageReady.js";

export function startScene({
  scope,
  siteFontsReady,
  pagePreparationTasks,
  abstractLights,
}) {
  const requestAnimationFrame = (callback) => scope.request(callback);
  const cancelAnimationFrame = (id) => scope.cancel(id);
  const setTimeout = (fn, delay) => scope.timeout(fn, delay),
    clearTimeout = (id) => scope.clearTimeout(id);
  const scene = document.querySelector("#scene"),
    journey = document.querySelector("#journey"),
    canvas = document.querySelector("#light"),
    ctx = canvas.getContext("2d"),
    projector = document.querySelector("#projector"),
    finalProjector = document.querySelector("#projector-final"),
    object = document.querySelector(".object");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // Avoid invalidating style for values that are already committed to the DOM.
  const committedStyles = new WeakMap(),
    committedAttributes = new WeakMap(),
    committedFlags = new WeakMap();
  function setStyle(node, name, value) {
    value = String(value);
    let state = committedStyles.get(node);
    if (!state) {
      state = new Map();
      committedStyles.set(node, state);
    }
    if (state.get(name) === value) return;
    state.set(name, value);
    if (name.startsWith("--")) node.style.setProperty(name, value);
    else node.style[name] = value;
  }
  function setAttribute(node, name, value) {
    value = String(value);
    let state = committedAttributes.get(node);
    if (!state) {
      state = new Map();
      committedAttributes.set(node, state);
    }
    if (state.get(name) === value) return;
    state.set(name, value);
    node.setAttribute(name, value);
  }
  function setFlag(node, name, value) {
    let state = committedFlags.get(node);
    if (!state) {
      state = new Map();
      committedFlags.set(node, state);
    }
    if (state.get(name) === value) return;
    state.set(name, value);
    node[name] = value;
  }
  let finalImageReady = false;
  const finalImage = finalProjector.querySelector("img");
  // Optical centre measured in the 1774 × 887 source image; shared by lens and beam.
  const lensCenter = { x: 891 / 1782, y: 806 / 889 };
  finalProjector.style.setProperty("--lens-center-x", `${lensCenter.x * 100}%`);
  finalProjector.style.setProperty("--lens-center-y", `${lensCenter.y * 100}%`);
  const imageReady = finalImage
    ? waitForDecodedImage(finalImage)
    : Promise.reject(new Error("Final projector image is missing"));
  imageReady.then(
    () => {
      if (scope.disposed) return;
      finalImageReady = true;
      geometryDirty = true;
      dirty = true;
      wake();
    },
    () => {},
  );
  function lensArrival() {
    return finalImageReady ? ease(clamp((rawScrollChapter - 0.98) / 0.65)) : 0;
  }
  function beamArrival() {
    return finalImageReady ? ease(clamp((rawScrollChapter - 0.98) / 1.2)) : 0;
  }

  let layout = {},
    canvasLeft = 0,
    canvasWidth = 0;
  let targetScrollChapter = 0,
    rawScrollChapter = 0,
    renderInvitation = null,
    prepareInvitation = null,
    resizeExtras = null;
  let sceneInView = true,
    pageActive = true,
    contentEffectsActive = true,
    audiencePreparationRequested = false,
    audienceEffectActive = false;
  const automaticEnd = 2.65;
  const openingHoldDuration = 0.6;
  const projectorTravelDuration = 2.2,
    projectorBlendStart = projectorTravelDuration * 0.76,
    projectorBlendDuration = 0.6;
  const projectorMorphDuration = projectorBlendStart + projectorBlendDuration;
  const contentRevealDuration = 1.1;
  function projectorAssembly() {
    return clamp(
      (openingElapsed - openingHoldDuration) / projectorMorphDuration,
    );
  }
  function projectorImageReveal(assembly) {
    const t = clamp(
      (assembly * projectorMorphDuration - projectorBlendStart) /
        projectorBlendDuration,
    );
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  let openingElapsed = 0,
    openingReady = false,
    openingComplete = false,
    heroVisibleDispatched = false;
  scope.listen(
    window,
    "opening-ready",
    () => {
      openingReady = true;
      dirty = true;
      wake();
    },
    { once: true },
  );
  function advanceOpening(dt) {
    if (!openingReady || openingComplete) return;
    openingElapsed += dt;
    if (openingElapsed >= openingHoldDuration - 0.2) {
      document.documentElement.classList.add("loader-finished");
      if (!heroVisibleDispatched) {
        heroVisibleDispatched = true;
        window.dispatchEvent(new window.Event("hero-visible"));
      }
    }

    const elapsed = Math.max(0, openingElapsed - openingHoldDuration);
    // Start the light and content as the second projector begins to appear.
    rawScrollChapter =
      elapsed <= projectorBlendStart
        ? 0.98 * ease(clamp(elapsed / projectorBlendStart))
        : 0.98 +
          (automaticEnd - 0.98) *
            (1 -
              Math.pow(
                1 -
                  clamp(
                    (elapsed - projectorBlendStart) / contentRevealDuration,
                  ),
                2,
              ));
    if (elapsed >= projectorBlendStart + contentRevealDuration) {
      rawScrollChapter = automaticEnd;
      openingComplete = true;
    }
  }

  let w = 0,
    h = 0,
    p = 0,
    scrollChapter = 0,
    frameDelta = 0,
    paused = reduced.matches,
    last = 0,
    time = 0,
    raf = 0,
    dirty = true,
    geometryDirty = true,
    sourceX = 0,
    sourceY = 0,
    targetX = 0,
    targetY = 0,
    beamWidth = 0;
  const clamp = (v) => Math.min(1, Math.max(0, v)),
    ease = (v) => v * v * (3 - 2 * v);
  let seed = 838067037;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  // A sparse field of the same glyphs used by the cursor interaction. They drift
  // in from the photographed floor and dissolve once they reach the light axis.
  // Small light signals travel over the photographed floor toward the receiver.
  // Coordinates follow the floor seams in the 1006 × 566 reference photograph.
  const floorRunners = [
    [70, 335, 365, 421],
    [105, 405, 390, 446],
    [290, 550, 475, 450],
    [480, 557, 503, 455],
    [700, 550, 545, 440],
    [850, 480, 605, 420],
    [930, 320, 650, 389],
    [80, 285, 355, 391],
  ].flatMap((path, i) =>
    [0, 0.5].map((offset) => ({
      path,
      phase: (i / 10 + offset) % 1,
      speed: 0.075 + (i % 3) * 0.01,
      size: 1.25 + (i % 3) * 0.18,
      alpha: 0.58,
    })),
  );
  const photoTitle = document.querySelector("#photo-title");
  const photoSubtitle = document.querySelector("#photo-subtitle");
  const photoRoles = document.querySelector("#photo-roles");
  const photoCopy = document.querySelector(".photo-copy");
  const particleShapes = [
    ...document.querySelectorAll(".three-particle-shape"),
  ];
  const photoRoleItems = [...photoRoles.querySelectorAll(".photo-roles__item")];
  let audienceStarted = false,
    audienceElapsed = 0;
  const audienceRevealDuration = 1.25;
  function advanceAudience(dt) {
    if (scrollChapter <= photoFadeStart) {
      if (audienceStarted) {
        audienceStarted = false;
        audienceElapsed = 0;
        geometryDirty = true;
        dirty = true;
      }
      return;
    }
    if (
      !audienceStarted &&
      scrollChapter >= photoFadeStart + photoFadeDuration * 0.72
    )
      audienceStarted = true;
    if (audienceStarted && audienceElapsed < audienceRevealDuration) {
      audienceElapsed = reduced.matches
        ? audienceRevealDuration
        : Math.min(audienceRevealDuration, audienceElapsed + dt);
      geometryDirty = true;
      dirty = true;
    }
  }
  const photoDimmer = document.querySelector("#photo-dimmer");
  // Hold the fully revealed first screen briefly before the audience copy enters.
  const photoViewHold = 0.3;
  const introDuration = 1.8,
    photoFadeStart = 0.86 + photoViewHold,
    photoFadeDuration = 0.42,
    textRevealStart = photoFadeStart + photoFadeDuration,
    textRevealDuration = 0.36,
    firstScreenHold = 0.2,
    audienceExtraHold = 0.33,
    scrollEnd =
      introDuration +
      textRevealStart +
      textRevealDuration +
      firstScreenHold +
      audienceExtraHold,
    scrollChapterCount = scrollEnd - automaticEnd;
  // Extra data gathers toward the receiver, crossing the photograph's feathered edge.
  const lowerData = Array.from({ length: 72 }, () => ({
    x: random() + random() - 1,
    y: random(),
    speed: 0.06 + random() * 0.1,
    size: 0.6 + random() * 1.1,
    alpha: 0.25 + random() * 0.6,
    kind: random(),
    length: 6 + random() * 24,
  }));
  for (const a of lowerData) {
    const sprite = document.createElement("canvas");
    sprite.width = 24;
    sprite.height = 48;
    const c = sprite.getContext("2d");
    c.translate(8, 32);
    c.fillStyle = "#ebdcff";
    c.strokeStyle = "#ddc7ff";
    c.lineWidth = 0.8;
    if (a.kind < 0.27) {
      c.font = `${8 + a.size * 2}px monospace`;
      c.fillText(a.kind < 0.135 ? "0" : "1", 0, 0);
    } else if (a.kind < 0.56) {
      c.strokeStyle = "#e4d5ff";
      c.strokeRect(0, 0, 2 + a.size, a.length * 0.55);
    } else if (a.kind < 0.83) {
      c.fillStyle = "#e4d5ff";
      c.fillRect(0, -a.length, 0.9 + a.size * 0.4, a.length);
    } else c.fillRect(0, 0, a.size, a.size);
    a.sprite = sprite;
  }
  const conferenceRegister = document.querySelector("#conference-register");
  const receiver = createReceiverPlayer(
    object.querySelector(".receiver-picture"),
    scope,
  );
  pagePreparationTasks.push(
    receiver.firstReady.then((ready) => {
      if (!ready) throw new Error("The first receiver frame failed to decode");
    }),
  );
  function advanceReceiverFrames(dt) {
    if (
      !openingReady ||
      beamArrival() < 0.25 ||
      scrollChapter >= photoFadeStart + photoFadeDuration
    )
      return;
    receiver.advance(dt, reduced.matches);
  }
  const floorCanvas = object.querySelector(".floor-signals");
  floorCanvas.width = 2012;
  floorCanvas.height = 1132;
  Object.assign(floorCanvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "3",
    pointerEvents: "none",
    mixBlendMode: "screen",
  });
  const floorCtx = floorCanvas.getContext("2d");
  floorCtx.scale(2, 2);
  function drawFloorSignals() {
    floorCtx.clearRect(0, 0, 1006, 566);
    floorCtx.lineCap = "round";
    for (const signal of floorRunners) {
      const cycle =
        (signal.phase + (reduced.matches ? 0 : time * signal.speed)) % 1;
      if (cycle >= 0.9) continue;
      const travel = cycle / 0.9,
        [sx, sy, ex, ey] = signal.path;
      const x = sx + (ex - sx) * travel,
        y = sy + (ey - sy) * travel;
      const distance = Math.hypot(ex - sx, ey - sy),
        tail = Math.max(0, travel - 24 / distance);
      const tx = sx + (ex - sx) * tail,
        ty = sy + (ey - sy) * tail;
      const fade = ease(clamp(travel / 0.22)) * ease(clamp((1 - travel) / 0.3));
      floorCtx.globalAlpha = signal.alpha * fade;
      const trail = floorCtx.createLinearGradient(tx, ty, x + 0.001, y);
      trail.addColorStop(0, "#ddd5ee00");
      trail.addColorStop(1, "#f5edff9a");
      floorCtx.strokeStyle = trail;
      floorCtx.lineWidth = 1;
      floorCtx.beginPath();
      floorCtx.moveTo(tx, ty);
      floorCtx.lineTo(x, y);
      floorCtx.stroke();
      const glow = floorCtx.createRadialGradient(x, y, 0, x, y, 7);
      glow.addColorStop(0, "#ffffffb8");
      glow.addColorStop(0.25, "#d9c9ec70");
      glow.addColorStop(1, "#d9c9ec00");
      floorCtx.fillStyle = glow;
      floorCtx.fillRect(x - 7, y - 7, 14, 14);
      floorCtx.fillStyle = "#ede8f596";
      const angle = Math.atan2(ey - sy, ex - sx);
      floorCtx.beginPath();
      floorCtx.save();
      floorCtx.translate(x, y);
      floorCtx.rotate(angle);
      floorCtx.ellipse(
        0,
        0,
        signal.size,
        signal.size * 0.56,
        0,
        0,
        Math.PI * 2,
      );
      floorCtx.fill();
      floorCtx.restore();
    }
    floorCtx.globalAlpha = 1;
  }
  let resizeKey = "",
    fontRevision = 0;
  // Optical center measured in the original 1777 × 885 image.
  const openingLens = { x: 887 / 1777, y: 414 / 885 },
    openingScale = 0.75;
  function alignOpeningProjector() {
    const lensX =
      (layout.pw - layout.openingImageWidth) / 2 +
      openingLens.x * layout.openingImageWidth;
    const lensY =
      (layout.ph - layout.openingImageHeight) / 2 +
      openingLens.y * layout.openingImageHeight;
    const x =
      layout.openingCenterX -
      layout.px -
      (lensX - layout.pw / 2) * openingScale;
    const y = layout.openingCenterY - layout.py - lensY * openingScale;
    projector.style.setProperty(
      "transform",
      `translate3d(calc(-50% + ${x}px),${y}px,0) scale(${openingScale})`,
      "important",
    );
  }
  function resize() {
    const nextW = scene.clientWidth,
      nextH = scene.clientHeight;
    const nextKey = `${nextW}:${nextH}:${innerWidth}:${innerHeight}:${devicePixelRatio}:${fontRevision}`;
    if (nextKey === resizeKey) {
      readScroll();
      return;
    }
    resizeKey = nextKey;
    w = nextW;
    h = nextH;
    // Read layout once on resize, retaining fractional pixels for exact image registration.
    const objectStyle = getComputedStyle(object);
    layout = {
      top: window.scrollY + journey.getBoundingClientRect().top,
      pw: projector.clientWidth,
      ph: projector.offsetHeight,
      fpw: finalProjector.clientWidth,
      ow: parseFloat(objectStyle.width),
      oh: parseFloat(objectStyle.height),
      ox: parseFloat(objectStyle.left),
      oy: parseFloat(objectStyle.top),
      px: projector.offsetLeft,
      py: projector.offsetTop,
      fpx: finalProjector.offsetLeft,
      fpy: finalProjector.offsetTop,
      heroScale: getHeroScale(nextW, nextH),
    };
    layout.sceneBounds = scene.getBoundingClientRect();
    // Use the loader's real center, including viewport gutters and fractional CSS sizes.
    const loaderBounds = document
      .querySelector(".lens-loader")
      .getBoundingClientRect();
    const projectorStyle = getComputedStyle(projector);
    layout.pw = parseFloat(projectorStyle.width);
    layout.ph = parseFloat(projectorStyle.height);
    layout.px = parseFloat(projectorStyle.left);
    layout.py = parseFloat(projectorStyle.top);
    layout.openingCenterX =
      loaderBounds.left + loaderBounds.width / 2 - layout.sceneBounds.left;
    layout.openingCenterY =
      loaderBounds.top + loaderBounds.height / 2 - layout.sceneBounds.top;
    const openingImageFit = Math.min(layout.pw / 1777, layout.ph / 885);
    layout.openingImageWidth = 1777 * openingImageFit;
    layout.openingImageHeight = 885 * openingImageFit;
    layout.stickyEnd = layout.top + journey.offsetHeight - h;
    // Spread every scroll-driven chapter across the full sticky distance. The
    // former fixed 0.8vh/chapter scale completed early and left a dead pinned
    // tail, while also making the short transitions easy to skip on trackpads.
    layout.range =
      Math.max(1, layout.stickyEnd - layout.top) / scrollChapterCount;
    // Commit writes only after collecting geometry for this resize.
    alignOpeningProjector();
    canvasWidth = w;
    canvasLeft = 0;
    canvas.style.inset = "auto";
    canvas.style.top = "0";
    canvas.style.left = canvasLeft + "px";
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = h + "px";
    // Keep the volume inexpensive, but draw data marks above CSS-pixel resolution.
    const renderScale = Math.min(
      window.devicePixelRatio || 1,
      0.8,
      Math.sqrt(900000 / Math.max(1, w * h)),
    );
    canvas.width = Math.ceil(canvasWidth * renderScale);
    canvas.height = Math.ceil(h * renderScale);
    ctx.setTransform(
      renderScale,
      0,
      0,
      renderScale,
      -canvasLeft * renderScale,
      0,
    );
    ctx.imageSmoothingEnabled = false;
    // The old information canvas is hidden; do not rasterize its text or particles.
    if (prepareInvitation) prepareInvitation();
    if (resizeExtras) resizeExtras();
    dirty = true;
    geometryDirty = true;
    readScroll();
  }
  // The photograph settles into its final size during the opening, independently of scroll.
  function openingPhotoScale() {
    const responsiveScale = w < 600 ? (h > 750 ? 1.16 : 1.05) : 1;
    return reduced.matches
      ? responsiveScale
      : responsiveScale *
          (0.96 +
            0.04 *
              ease(
                clamp(
                  (openingElapsed - openingHoldDuration - projectorBlendStart) /
                    1.1,
                ),
              ));
  }
  function apply() {
    const reveal = ease(clamp(p / 0.85)) * beamArrival(),
      scale = openingPhotoScale();
    const assembly = projectorAssembly();
    const finalEntry = projectorImageReveal(assembly),
      lens = lensArrival();
    setStyle(scene, "--lens-power", lens);
    // The upward symbol stream assembles the second projector at its final position.
    const finalScale = 0.91;
    const finalY = -layout.fpw * 0.3 - 10;
    setStyle(finalProjector, "--final-scale", finalScale);
    setStyle(finalProjector, "--final-y", finalY + "px");
    setStyle(finalProjector, "--final-opacity", finalEntry);
    setStyle(finalProjector, "--final-lens-power", lens);
    setStyle(object, "opacity", reveal * (0.45 + 0.55 * reveal) * 1);
    const photoTitleReveal =
      ease(
        clamp((scrollChapter - photoFadeStart) / (photoFadeDuration * 0.85)),
      ) * 1;
    const photoFade = ease(
      clamp((scrollChapter - photoFadeStart) / photoFadeDuration),
    );
    setStyle(scene, "--photo-presence", reveal * (1 - photoFade));
    setStyle(
      scene,
      "--opening-exit-y",
      `${-h * 0.65 * layout.heroScale * photoFade}px`,
    );
    setStyle(scene, "--opening-light", 1 - 0.98 * photoFade);
    setStyle(
      scene,
      "--next-copy-y",
      `${h * 0.45 * layout.heroScale * (1 - photoTitleReveal)}px`,
    );
    setStyle(scene, "--next-copy-light", 0.12 + 0.88 * photoTitleReveal);
    setStyle(
      object,
      "transform",
      `translate3d(-50%,calc(-40% - ${h * 0.32 * layout.heroScale * photoFade}px),0) scale(${scale})`,
    );
    setStyle(object, "filter", `brightness(${1 - 0.85 * photoFade})`);
    setStyle(photoDimmer, "opacity", photoFade.toFixed(3));
    setStyle(photoTitle, "opacity", photoTitleReveal);
    setStyle(
      photoCopy,
      "--photo-copy-backdrop-opacity",
      ease(clamp(photoTitleReveal)).toFixed(3),
    );
    setStyle(
      photoTitle,
      "visibility",
      photoTitleReveal > 0 ? "visible" : "hidden",
    );
    // Reveal supporting copy only once the heading has entered the light.
    const subtitleAmount = ease(clamp(audienceElapsed / 0.42));
    const subtitleReveal = subtitleAmount * 1;
    const silhouetteReveal = ease(clamp((audienceElapsed - 0.32) / 0.76));
    particleShapes.forEach((particleShape) => {
      setStyle(particleShape, "--three-particle-opacity", silhouetteReveal);
      setStyle(particleShape, "--three-particle-reveal", silhouetteReveal);
    });
    setStyle(photoSubtitle, "opacity", subtitleReveal);
    setStyle(
      photoSubtitle,
      "filter",
      `brightness(${1 + 0.7 * Math.sin(Math.PI * subtitleAmount)})`,
    );
    setStyle(
      photoSubtitle,
      "transform",
      `translateY(${8 * (1 - subtitleAmount)}px)`,
    );
    setStyle(
      photoSubtitle,
      "visibility",
      subtitleReveal > 0 ? "visible" : "hidden",
    );
    setAttribute(photoSubtitle, "aria-hidden", subtitleReveal <= 0);
    let rolesVisible = false;
    photoRoleItems.forEach((item, index) => {
      const amount = ease(
        clamp((audienceElapsed - 0.32 - index * 0.15) / 0.42),
      );
      const visible = amount * 1;
      setStyle(item, "opacity", visible);
      setStyle(
        item,
        "filter",
        `brightness(${1 + 0.8 * Math.sin(Math.PI * amount)})`,
      );
      setStyle(item, "transform", `translateY(${6 * (1 - amount)}px)`);
      setAttribute(item, "aria-hidden", visible <= 0);
      if (visible > 0) rolesVisible = true;
    });
    setStyle(photoRoles, "opacity", 1);
    setStyle(photoRoles, "visibility", rolesVisible ? "visible" : "hidden");
    setAttribute(photoRoles, "aria-hidden", !rolesVisible);
    setAttribute(photoTitle, "aria-hidden", photoTitleReveal <= 0);
    setAttribute(object, "aria-hidden", false);
    const nextAudienceEffectActive =
      scrollChapter >= photoFadeStart - 0.3 && programmeSpread < 0.02;
    if (nextAudienceEffectActive !== audienceEffectActive) {
      audienceEffectActive = nextAudienceEffectActive;
      window.dispatchEvent(
        new window.CustomEvent("audience-active", {
          detail: { active: audienceEffectActive },
        }),
      );
    }
    sourceX = layout.fpx + layout.fpw * (lensCenter.x - 0.5) * finalScale;
    sourceY =
      layout.fpy + layout.fpw * 0.5 * lensCenter.y * finalScale + finalY;
    // Account for the object's 50% transform origin and -40% vertical translation.
    targetY = layout.oy + layout.oh * (-0.4 + 0.36) * scale;
    targetX = sourceX;
    beamWidth = layout.ow * 0.17;
    const receiverBlend = ease(clamp(p / 0.85));
    // Open only the lower cone for the list; the lens neck retains its original width.
    const listSpread =
      ease(clamp((rawScrollChapter - 0.95) / 0.5)) * (1 - receiverBlend);
    beamWidth += (Math.min(w * 0.26, 320) - beamWidth) * listSpread;
    beamWidth *= 0.88;
    // Preserve the same cone width through the audience and programme sections.
    targetX = w / 2 + (targetX - w / 2) * receiverBlend;
    targetY =
      h * (0.8 + 0.85 * listSpread) +
      (targetY - h * (0.8 + 0.85 * listSpread)) * receiverBlend;
    // Keep the beam geometry fixed when the programme section is scrolled.
    targetY += h * 0.07;
    window.programmeBeam = {
      x: sourceX,
      y: sourceY,
      targetX,
      targetY,
      width: beamWidth * 1.65,
      neck: Math.min(20, Math.max(8, layout.fpw * 0.025)),
    };
    geometryDirty = false;
    updateDecorativeState();
  }
  let programmeSpread = 0;
  function readScroll() {
    const nextSpread = ease(
      clamp((window.scrollY - layout.stickyEnd) / Math.max(1, h * 0.6)),
    );
    if (Math.abs(nextSpread - programmeSpread) > 0.00001) {
      programmeSpread = nextSpread;
      geometryDirty = true;
    }
    const next = Math.max(
      0,
      Math.min(
        scrollChapterCount,
        (window.scrollY - layout.top) / Math.max(1, layout.range),
      ),
    );
    if (
      !audiencePreparationRequested &&
      automaticEnd + next - introDuration >= photoFadeStart - 0.3
    ) {
      audiencePreparationRequested = true;
      window.dispatchEvent(new window.Event("audience-prepare"));
    }
    if (Math.abs(next - targetScrollChapter) > 0.00001 || geometryDirty) {
      targetScrollChapter = next;
      dirty = true;
      wake();
    }
  }
  function advanceScroll(dt) {
    const before = rawScrollChapter;
    if (openingComplete) rawScrollChapter = automaticEnd + targetScrollChapter;
    else advanceOpening(dt);
    scrollChapter =
      rawScrollChapter < automaticEnd
        ? 0.85 * clamp((rawScrollChapter - 0.98) / (automaticEnd - 0.98))
        : Math.max(0, rawScrollChapter - introDuration);
    if (rawScrollChapter === before) return false;
    p = clamp(scrollChapter);
    geometryDirty = true;
    dirty = true;
    return true;
  }
  // Bake the scattering profile once: smooth angular edges and distance falloff.
  const shaftTexture = document.createElement("canvas");
  shaftTexture.width = 384;
  shaftTexture.height = 512;
  const shaftCtx = shaftTexture.getContext("2d"),
    shaftPixels = shaftCtx.createImageData(384, 512);
  for (let y = 0; y < 512; y++) {
    const depth = y / 511,
      spread = Math.max(0.001, depth),
      falloff =
        Math.pow(1 - depth, 0.5) * (0.38 + 0.62 * ease(clamp(depth / 0.55)));
    for (let x = 0; x < 384; x++) {
      const lateral = ((x / 383 - 0.5) * 2) / spread,
        edge = 1 - Math.pow(Math.abs(x / 383 - 0.5) * 2, 6),
        profile = Math.exp(-lateral * lateral * 2.4) * edge,
        i = (y * 384 + x) * 4;
      shaftPixels.data[i] = 224;
      shaftPixels.data[i + 1] = 210;
      shaftPixels.data[i + 2] = 255;
      shaftPixels.data[i + 3] = Math.round(150 * profile * falloff);
    }
  }
  shaftCtx.putImageData(shaftPixels, 0, 0);
  // Resize the two light textures once per geometry change, not four times per
  // frame. The live shear, intensity, masks and particle movement stay intact.
  const shaftLayers = new Map();
  // Crop a triangular field at a fixed lens width, independent of the lower spread.
  function drawShaft(halfWidth, length) {
    const firstScreenNeck = 1 - programmeSpread;
    const neckWidth =
      Math.min(20, Math.max(8, layout.fpw * 0.025)) *
      (1 + 0.2 * firstScreenNeck);
    const crop = Math.min(0.8, neckWidth / halfWidth) * shaftTexture.height;
    const ratio = canvas.width / w;
    const width = halfWidth * 2 * ratio,
      fullHeight = length * 1.04 * ratio;
    const height = Math.max(1, Math.min(fullHeight, (h - sourceY) * ratio + 2));
    const slot = halfWidth > beamWidth ? "outer" : "inner";
    let layer = shaftLayers.get(slot);
    if (!layer) {
      const image = document.createElement("canvas");
      layer = { image, context: image.getContext("2d"), key: "" };
      shaftLayers.set(slot, layer);
    }
    const key = `${width}:${height}:${fullHeight}:${crop}`;
    if (layer.key !== key) {
      layer.key = key;
      layer.image.width = Math.max(1, Math.ceil(width));
      layer.image.height = Math.ceil(height);
      layer.context.imageSmoothingEnabled = true;
      layer.context.imageSmoothingQuality = "high";
      layer.context.drawImage(
        shaftTexture,
        0,
        crop,
        shaftTexture.width,
        shaftTexture.height - crop,
        0,
        0,
        width,
        fullHeight,
      );
    }
    ctx.drawImage(
      layer.image,
      -halfWidth,
      0,
      layer.image.width / ratio,
      layer.image.height / ratio,
    );
  }
  let beamEffectKey = "",
    beamEffects = {};
  function draw() {
    if (scrollChapter < photoFadeStart + photoFadeDuration && beamArrival() > 0)
      drawFloorSignals();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    drawLightFrame();
  }
  function drawLightFrame() {
    ctx.clearRect(0, 0, w, h);
    const length = Math.max(30, targetY - sourceY);
    const reveal = ease(clamp(p / 0.85));
    const arrival = beamArrival(),
      ignition = arrival,
      travel = arrival;
    const textSceneFade = programmeSpread;
    const power =
      arrival *
      (1 - 0.3 * textSceneFade) *
      (1 + 0.24 * textSceneFade * (1 - programmeSpread));
    // Light stays fixed while the two content screens move through it.
    const beamPresence = reveal * 1;
    // Data exists only while the photograph is revealed and not yet darkened.
    const photoData =
      reveal *
      1 *
      (1 - ease(clamp((scrollChapter - photoFadeStart) / photoFadeDuration)));
    // Only the upward stream inside the cone is active on the photograph.
    if (ignition === 0) return;
    const finalBeamFade = Math.max(
      ease(clamp((rawScrollChapter - 0.95) / 0.5)) * (1 - reveal),
      programmeSpread,
    );
    const nextEffectKey = `${canvas.width}:${canvas.height}:${sourceX}:${sourceY}:${targetX}:${targetY}:${beamWidth}:${travel}:${layout.fpw}:${finalBeamFade}:${textSceneFade}`;
    if (nextEffectKey !== beamEffectKey) {
      beamEffectKey = nextEffectKey;
      beamEffects = {};
    }
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = power * 0.28;

    // One continuous feathered field avoids visible boundaries between nested cones.
    const rayWidth = beamWidth * 1.65;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha =
      power * (0.54 + 0.4 * beamPresence + 0.025 * Math.sin(time * 0.22));
    ctx.translate(sourceX, sourceY);
    ctx.transform(1, 0, (targetX - sourceX) / length, 1, 0, 0);
    drawShaft(rayWidth, length);
    // Add light on the conference photograph; fade this boost with that screen.
    ctx.globalAlpha = power * 0.48 * beamPresence;
    drawShaft(rayWidth, length);
    ctx.restore();
    // Subtle inner shafts restore structure without hard cone boundaries.
    for (let ray = 0; ray < 2; ray++) {
      const phase = time * 0.22 + ray * 2.17;
      const offset =
        beamWidth * ((ray === 0 ? -0.46 : 0.46) + Math.sin(phase) * 0.025);
      const innerWidth = beamWidth * 0.72;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha =
        power *
        (0.14 + 0.1 * beamPresence + 0.015 * Math.sin(phase)) *
        (1 - 0.45 * finalBeamFade);
      ctx.translate(sourceX, sourceY);
      ctx.transform(1, 0, (targetX - sourceX + offset) / length, 1, 0, 0);
      drawShaft(innerWidth, length);
      ctx.restore();
    }
    // The light reveals the channel down from the lens; its data travels back upward.
    // Mask both the volume and particles together, so nothing appears ahead of the light.
    const feather = Math.min(120, length * 0.22),
      front = sourceY + (length + feather) * travel;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-in";
    let revealMask = beamEffects.revealMask;
    if (!revealMask) {
      revealMask = ctx.createLinearGradient(0, front - feather, 0, front);
      revealMask.addColorStop(0, "rgba(0,0,0,1)");
      revealMask.addColorStop(1, "rgba(0,0,0,0)");
      beamEffects.revealMask = revealMask;
    }
    ctx.fillStyle = revealMask;
    ctx.fillRect(0, 0, w, h);
    let bottomMask = beamEffects.bottomMask;
    if (!bottomMask) {
      const start = targetY - length * 0.12,
        end = targetY + 18;
      bottomMask = ctx.createLinearGradient(
        0,
        start + (h * 0.42 - start) * finalBeamFade,
        0,
        end + (h * 1.55 - end) * finalBeamFade,
      );
      bottomMask.addColorStop(0, "#000");
      bottomMask.addColorStop(0.15, "rgba(0,0,0,.94)");
      bottomMask.addColorStop(0.3, "rgba(0,0,0,.78)");
      bottomMask.addColorStop(0.5, "rgba(0,0,0,.5)");
      bottomMask.addColorStop(0.7, "rgba(0,0,0,.22)");
      bottomMask.addColorStop(0.85, "rgba(0,0,0,.06)");
      bottomMask.addColorStop(1, "#0000");
      beamEffects.bottomMask = bottomMask;
    }
    ctx.fillStyle = bottomMask;
    ctx.fillRect(0, 0, w, h);
    // Fade the lower first-screen volume before it washes out the photograph.
    if (beamPresence > 0) {
      const photoTail = ctx.createLinearGradient(
        0,
        sourceY + length * 0.35,
        0,
        targetY,
      );
      for (const [position, attenuation] of [
        [0, 0],
        [0.25, 0.06],
        [0.55, 0.24],
        [0.8, 0.46],
        [1, 0.65],
      ])
        photoTail.addColorStop(
          position,
          `rgba(0,0,0,${1 - attenuation * beamPresence})`,
        );
      ctx.fillStyle = photoTail;
      ctx.fillRect(0, 0, w, h);
    }
    // Stronger lower falloff on the audience and programme screens only.
    if (textSceneFade > 0) {
      let textTail = beamEffects.textTail;
      if (!textTail) {
        textTail = ctx.createLinearGradient(0, h * 0.3, 0, h * 1.04);
        textTail.addColorStop(0, "#000");
        textTail.addColorStop(0.25, `rgba(0,0,0,${1 - 0.28 * textSceneFade})`);
        textTail.addColorStop(0.5, `rgba(0,0,0,${1 - 0.7 * textSceneFade})`);
        textTail.addColorStop(0.75, `rgba(0,0,0,${1 - 0.94 * textSceneFade})`);
        textTail.addColorStop(1, `rgba(0,0,0,${1 - textSceneFade})`);
        beamEffects.textTail = textTail;
      }
      ctx.fillStyle = textTail;
      ctx.fillRect(0, 0, w, h);
    }

    // A faint neutral spill preserves contrast in the photograph.
    if (beamPresence > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = power * beamPresence * 0.2;
      ctx.translate(targetX, targetY);
      ctx.scale(1, 0.72);
      const radius = beamWidth * 1.65;
      let spill = beamEffects.photoSpill;
      if (!spill) {
        spill = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        spill.addColorStop(0, "rgba(235,235,235,.34)");
        spill.addColorStop(0.28, "rgba(190,190,190,.27)");
        spill.addColorStop(0.6, "rgba(155,155,155,.12)");
        spill.addColorStop(1, "rgba(155,155,155,0)");
        beamEffects.photoSpill = spill;
      }
      ctx.fillStyle = spill;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = ignition;
    ctx.save();
    ctx.translate(sourceX, sourceY);
    ctx.scale(1, 0.31);
    const glowRadius = layout.fpw * 0.105;
    let glow = beamEffects.glow;
    if (!glow) {
      glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
      glow.addColorStop(0, "#fff5ff80");
      glow.addColorStop(0.24, "#ddc2ff30");
      glow.addColorStop(1, "#ba80ff00");
      beamEffects.glow = glow;
    }
    ctx.fillStyle = glow;
    ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.restore();
    // Draw symbols last, above the beam and outside its fading masks.
    // Reuse cached glyph sprites for a restrained upward stream inside the beam.
    if (photoData > 0) {
      for (let i = 0; i < Math.min(36, lowerData.length); i++) {
        const a = lowerData[i],
          u = 1 - ((a.y + time * a.speed) % 1),
          y = 0.06 + 0.88 * u;
        const fade = Math.sin(u * Math.PI);
        const x =
            sourceX +
            (targetX - sourceX) * y +
            a.x * (10 + beamWidth * y * 0.52),
          py = sourceY + y * length;
        ctx.globalAlpha = power * photoData * a.alpha * fade * 1.3;
        ctx.drawImage(a.sprite, x - 8, py - 32);
      }
      // Extra glyphs emerge around the floating upper plates of the photograph.
      const photoScale = openingPhotoScale(),
        photoHeight = layout.oh * photoScale;
      const photoTop = layout.oy - photoHeight * 0.4;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 36; i < lowerData.length; i++) {
        const a = lowerData[i],
          t = (a.y + time * a.speed * 0.8) % 1;
        const x =
          layout.ox +
          a.x * layout.ow * photoScale * 0.17 +
          Math.sin(t * 4 + i) * 3;
        const y = photoTop + photoHeight * (0.43 - 0.3 * t);
        ctx.globalAlpha =
          power *
          photoData *
          a.alpha *
          Math.pow(Math.sin(t * Math.PI), 0.8) *
          0.85;
        ctx.fillStyle = "#e7ddef";
        ctx.font = `${9 + a.size * 3}px monospace`;
        ctx.fillText(["0", "1", "+", "▯", "·"][i % 5], x, y);
      }
    }
    // No oval light pool at the receiver: the platform stays neutral and receives
    // only the narrow vertical beam from the lens.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  let lastAmbientFrame = 0,
    ambientDelta = 0,
    lastScrollChangeAt = -Infinity;
  function frame(now) {
    raf = 0;
    const dt = Math.min(last ? (now - last) / 1000 : 1 / 60, 0.05);
    last = now;
    frameDelta = paused ? 0 : dt;
    if (!paused) time += dt;
    const scrollChanged = advanceScroll(dt);
    advanceAudience(dt);
    if (scrollChanged) {
      lastScrollChangeAt = now;
    }
    // All pointer geometry is measured before animation writes in this frame.
    if (geometryDirty) apply();
    advanceReceiverFrames(frameDelta);
    if (renderInvitation) renderInvitation();
    // Unlock only after all first-screen geometry and text have been rendered.
    if (
      openingComplete &&
      document.documentElement.classList.contains("opening-locked")
    ) {
      document.documentElement.classList.remove("opening-locked");
    }
    // Scroll transforms and text run at display refresh rate. Slow atmospheric
    // effects use 24 fps during scrolling and 30 fps at rest.
    ambientDelta += frameDelta;
    const ambientInterval = 1000 / (now - lastScrollChangeAt < 150 ? 24 : 30);
    if (now - lastAmbientFrame >= ambientInterval && (dirty || !paused)) {
      frameDelta = Math.min(ambientDelta, 0.1);
      ambientDelta = 0;
      lastAmbientFrame = now;
      draw();
      dirty = false;
    }
    if (
      (openingReady && !openingComplete) ||
      (audienceStarted && audienceElapsed < audienceRevealDuration) ||
      dirty ||
      !paused
    )
      wake();
    else last = 0;
  }
  function wake() {
    if (
      !raf &&
      !document.hidden &&
      sceneInView &&
      pageActive &&
      contentEffectsActive
    )
      raf = requestAnimationFrame(frame);
  }
  let resizeTimer;
  function scheduleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 100);
  }
  scope.listen(window, "scroll", readScroll, { passive: true });
  scope.listen(window, "resize", scheduleResize);
  scope.listen(reduced, "change", () => {
    paused = reduced.matches;
    dirty = true;
    updateDecorativeState();
    wake();
  });
  resize();
  readScroll();
  siteFontsReady.then(() => {
    if (scope.disposed) return;
    fontRevision++;
    resize();
    wake();
  }, () => {}); // Critical loading owns the error/retry UI.
  // Sample the real invitation glyphs once, then release their pixels as a controlled
  // field of crisp motes. The canvas exists only during the opening transition.
  const inviteCanvas = document.querySelector("#invitation-particles");

  function setupOpeningTypography() {
    let preparationReady = false;
    const stageCanvas = inviteCanvas,
      stageCtx = stageCanvas.getContext("2d");
    const stages = [
      [], // The invitation prelude was removed; start with the conference title.
      [
        {
          text: "Флагманская конференция МТС Ads",
          size: 64,
          gap: 26,
          bold: true,
        },
        {
          text: "о технологиях будущего рекламной индустрии",
          size: 32,
          gap: 24,
          wide: true,
        },
        {
          text: "Арбатская площадь, 14, строение 1",
          size: 22,
          gap: 14,
          icon: "address",
          fact: true,
        },
        {
          text: "Кинотеатр «Художественный»",
          size: 22,
          gap: 14,
          icon: "cinema",
          fact: true,
        },
        {
          text: "Только офлайн",
          size: 22,
          gap: 14,
          icon: "online",
          fact: true,
        },
        {
          text: "19 ноября 17:00",
          size: 22,
          gap: 0,
          icon: "time",
          fact: true,
        },
      ],
    ];
    const accessible = scene.querySelector(".intro-accessible");
    let rasters = [],
      lastStage = -1,
      dpr = 1,
      lastPaint = -1;
    let sampledSource = null,
      sampledTarget = null;
    let registrationTop = 0,
      morphParticles = [];
    // Cache tiny luminous stamps instead of blurring hundreds of paths every frame.
    const morphDot = document.createElement("canvas");
    morphDot.width = morphDot.height = 24;
    const dotCtx = morphDot.getContext("2d"),
      dotGlow = dotCtx.createRadialGradient(12, 12, 0, 12, 12, 12);
    dotGlow.addColorStop(0, "#f4edff");
    dotGlow.addColorStop(0.18, "#e7dfff");
    dotGlow.addColorStop(0.3, "#d8baff60");
    dotGlow.addColorStop(1, "#d8baff00");
    dotCtx.fillStyle = dotGlow;
    dotCtx.fillRect(0, 0, 24, 24);
    const morphGlyphs = Object.fromEntries(
      ["0", "1", "·", "+", "▯"].map((glyph) => {
        const stamp = document.createElement("canvas");
        stamp.width = stamp.height = 40;
        const c = stamp.getContext("2d");
        c.font = "24px monospace";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#e7dfff";
        c.shadowColor = "#d8baff";
        c.shadowBlur = 3;
        c.fillText(glyph, 20, 20);
        return [glyph, stamp];
      }),
    );
    const factIcons = {
      address: new Image(),
      cinema: new Image(),
      online: new Image(),
      time: new Image(),
    };
    factIcons.address.src = "assets/fact-address.svg";
    factIcons.cinema.src = "assets/fact-cinema.svg";
    factIcons.online.src = "assets/fact-online.svg";
    factIcons.time.src = "assets/fact-time.svg";
    pagePreparationTasks.push(
      Promise.all([
        siteFontsReady,
        ...Object.values(factIcons).map(waitForDecodedImage),
        imageReady,
        ...[...projector.querySelectorAll("img")].map(waitForDecodedImage),
      ]).then(() => {
        if (scope.disposed) return;
        preparationReady = true;
        prepare();
      }),
    );
    function prepare() {
      if (!preparationReady || scope.disposed) return;
      // Text needs native display resolution, independently of the low-resolution light.
      dpr = devicePixelRatio || 1;
      stageCanvas.width = Math.ceil(w * dpr);
      stageCanvas.height = Math.ceil(h * dpr);
      stageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rasters = [];
      lastPaint = -1;
      const typography = buildFigmaOpeningTypography(
        w,
        h,
        dpr,
        stages[1],
        factIcons,
      );
      rasters = [null, typography.raster];
      registrationTop = Math.round(typography.bottom + 70);
      conferenceRegister.style.setProperty(
        "--conference-register-top",
        `${registrationTop}px`,
      );
      // Match the two real silhouettes so symbols travel from one projector to the other.
      const source = document.querySelector("#projector .projector-front");
      const sample = document.createElement("canvas");
      sample.width = 240;
      sample.height = 120;
      const sc = sample.getContext("2d", { willReadFrequently: true }),
        sourcePoints = sampledSource || [];
      if (!sampledSource && source.complete && source.naturalWidth) {
        sc.drawImage(source, 0, 0, 240, 120);
        const pixels = sc.getImageData(0, 0, 240, 120).data;
        for (let y = 0; y < 120; y += 2)
          for (let x = 0; x < 240; x += 2) {
            const i = (y * 240 + x) * 4;
            if (
              pixels[i + 3] > 80 &&
              Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 15
            )
              sourcePoints.push({
                x: x / 240,
                y: y / 120,
                color: `rgb(${Math.min(255, pixels[i] + 45)},${Math.min(255, pixels[i + 1] + 45)},${Math.min(255, pixels[i + 2] + 50)})`,
              });
          }
      }
      if (!sourcePoints.length)
        for (let i = 0; i < 800; i++)
          sourcePoints.push({
            x: 0.12 + ((i % 40) / 40) * 0.76,
            y: 0.18 + (Math.floor(i / 40) / 20) * 0.64,
          });
      sampledSource = sourcePoints;
      const allTargetPoints = sampledTarget || [];
      if (!sampledTarget && finalImage.complete && finalImage.naturalWidth) {
        sample.width = 480;
        sample.height = 240;
        sc.drawImage(finalImage, 0, 0, 480, 240);
        const pixels = sc.getImageData(0, 0, 480, 240).data;
        const brightness = (x, y) => {
          const i = (y * 480 + x) * 4;
          return (
            ((0.2126 * pixels[i] +
              0.7152 * pixels[i + 1] +
              0.0722 * pixels[i + 2]) *
              pixels[i + 3]) /
            255
          );
        };
        // One strongest edge per cell outlines the casing, lens and vents, without filling the body.
        for (let cy = 2; cy < 238; cy += 4)
          for (let cx = 2; cx < 478; cx += 4) {
            let best = null,
              bestEdge = 13;
            for (let y = cy; y < Math.min(cy + 4, 238); y++)
              for (let x = cx; x < Math.min(cx + 4, 478); x++) {
                const i = (y * 480 + x) * 4;
                if (pixels[i + 3] < 80) continue;
                const silhouette = [
                  i - 8,
                  i + 8,
                  i - 480 * 8,
                  i + 480 * 8,
                ].some((n) => pixels[n + 3] < 60);
                const edge = Math.max(
                  Math.abs(brightness(x + 2, y) - brightness(x - 2, y)),
                  Math.abs(brightness(x, y + 2) - brightness(x, y - 2)),
                  silhouette ? 40 : 0,
                );
                if (edge > bestEdge) {
                  bestEdge = edge;
                  best = { x: x / 480, y: y / 240 };
                }
              }
            if (best) allTargetPoints.push(best);
          }
      }
      sampledTarget = allTargetPoints;
      const targetPoints = allTargetPoints.filter(
        (point) =>
          layout.fpy -
            layout.fpw * 0.3 -
            10 +
            point.y * layout.fpw * 0.5 * 0.91 >=
          -2,
      );
      if (!targetPoints.length) targetPoints.push(...sourcePoints);
      const morphCount = Math.min(
        w < 600 ? 70 : 140,
        sourcePoints.length,
        targetPoints.length,
      );
      const symbolCount = w < 600 ? 10 : 20,
        symbolStride = Math.ceil(morphCount / symbolCount);
      morphParticles = Array.from({ length: morphCount }, (_, i) => {
        const a =
          sourcePoints[Math.floor((i * sourcePoints.length) / morphCount)];
        const b =
          targetPoints[Math.floor((i * targetPoints.length) / morphCount)];
        const symbol =
          i % symbolStride === Math.floor(symbolStride / 2)
            ? ["0", "1", "·", "+", "▯"][Math.floor(i / symbolStride) % 5]
            : null;
        return {
          sx: a.x,
          sy: a.y,
          fx: b.x,
          fy: b.y,
          symbol,
          delay: symbol ? 0 : (((i * 37) % 101) / 101) * 0.14,
          arrival: 0.68 + (((i * 23) % 101) / 101) * 0.08,
          dx: Math.sin(a.x * Math.PI * 2) * 18,
          size: 0.55 + (i % 4) * 0.18,
        };
      });
      dirty = true;
      wake();
    }
    const cinematicEase = (u) => {
      u = clamp(u);
      return u * u * u * (u * (u * 6 - 15) + 10);
    };
    function paint() {
      if (!rasters.length) return;
      const q = rawScrollChapter;
      if (q === lastPaint) return;
      lastPaint = q;
      // Keep the CTA through the list, then dock its bottom 120px above the viewport edge.
      const departure = ease(
        clamp((scrollChapter - photoFadeStart) / photoFadeDuration),
      );
      const morph = projectorAssembly();
      const scatter = clamp(
        (morph * projectorMorphDuration) / projectorTravelDuration,
      );
      // The lettering follows behind the visible light front, never ahead of it.
      const textAssembly = beamArrival();
      const registrationIn = ease(clamp((q - 0.98) / 0.8));
      const registrationVisibility = registrationIn;
      setStyle(
        conferenceRegister,
        "opacity",
        registrationVisibility.toFixed(3),
      );
      setStyle(conferenceRegister, "transform", "translateX(-50%)");
      setStyle(
        conferenceRegister,
        "pointerEvents",
        registrationVisibility > 0.97 ? "auto" : "none",
      );
      setAttribute(
        conferenceRegister,
        "aria-hidden",
        String(registrationVisibility < 0.97),
      );
      setFlag(conferenceRegister, "inert", registrationVisibility < 0.97);
      projector.classList.toggle("lamp-loop-finished", q > 0.18);
      // Keep the optical center registered to the loader throughout the opening.
      if (morph > 0) {
        projector.style.setProperty("transition", "none");
        projector.style.setProperty(
          "opacity",
          String(1 - ease(clamp(scatter / 0.4))),
          "important",
        );
      }
      projector.style.visibility = scatter >= 0.4 ? "hidden" : "visible";
      const active = 1;
      if (active !== lastStage) {
        accessible.textContent = stages[active].map((b) => b.text).join(". ");
        lastStage = active;
      }
      accessible.setAttribute(
        "aria-hidden",
        String(departure >= 1 || textAssembly <= 0),
      );
      stageCtx.clearRect(0, 0, w, h);
      if (departure >= 1) return;
      // A sparse mix of symbols and light points sketches the second projector first.
      if (morph > 0 && morph < 1) {
        stageCtx.save();
        const dissolve = (1 - projectorImageReveal(morph)) * (1 - departure);
        const glyphPresence = 1 - ease(clamp((scatter - 0.36) / 0.34));
        for (const point of morphParticles) {
          const sx =
              layout.openingCenterX +
              (point.sx - openingLens.x) *
                layout.openingImageWidth *
                openingScale,
            sy =
              layout.openingCenterY +
              (point.sy - openingLens.y) *
                layout.openingImageHeight *
                openingScale;
          // Stagger lift-off and arrival; every path has zero speed at both ends.
          const travel = clamp(
            (scatter - point.delay) / (point.arrival - point.delay),
          );
          const drift = cinematicEase(travel);
          const tx = layout.fpx + (point.fx - 0.5) * layout.fpw * 0.91;
          const ty =
            layout.fpy -
            layout.fpw * 0.3 -
            10 +
            point.fy * layout.fpw * 0.5 * 0.91;
          const arc = Math.sin(Math.PI * drift) ** 2;
          const x = sx + (tx - sx) * drift + point.dx * arc,
            y = sy + (ty - sy) * drift;
          const emergence = ease(clamp((scatter - point.delay) / 0.2));
          const alpha = emergence * (0.62 + 0.38 * drift) * dissolve;
          if (alpha < 0.002) continue;
          if (point.symbol && glyphPresence > 0) {
            stageCtx.globalAlpha = alpha * glyphPresence;
            stageCtx.drawImage(
              morphGlyphs[point.symbol],
              x - 12,
              y - 12,
              24,
              24,
            );
          }
          const dotPresence = point.symbol ? 1 - glyphPresence : 1;
          if (dotPresence > 0) {
            stageCtx.globalAlpha = alpha * dotPresence;
            const diameter = 7 + point.size * 2;
            stageCtx.drawImage(
              morphDot,
              x - diameter / 2,
              y - diameter / 2,
              diameter,
              diameter,
            );
          }
        }
        stageCtx.restore();
      }
      if (textAssembly <= 0) return;
      stageCtx.save();

      stageCtx.globalAlpha = ease(textAssembly) * (1 - departure);
      // Use the Figma fill once, with no extra lighting or shadow layer.
      stageCtx.drawImage(
        rasters[1],
        0,
        0,
        rasters[1].width / dpr,
        rasters[1].height / dpr,
      );
      if (textAssembly < 1) {
        const lightLength = Math.max(30, targetY - sourceY),
          feather = Math.min(120, lightLength * 0.22);
        const front = sourceY + (lightLength + feather) * textAssembly;
        const textLight = stageCtx.createLinearGradient(
          0,
          front - feather,
          0,
          front,
        );
        textLight.addColorStop(0, "#000");
        textLight.addColorStop(1, "#0000");
        stageCtx.globalCompositeOperation = "destination-in";
        stageCtx.globalAlpha = 1;
        stageCtx.fillStyle = textLight;
        stageCtx.fillRect(0, 0, w, h);
      }
      stageCtx.restore();
    }
    renderInvitation = paint;
    prepareInvitation = prepare;
    // The shared font readiness callback performs the first measured preparation.
  }
  setupOpeningTypography();
  // Short-lived cursor data; stop painting when the last glyph has faded.
  const cursorCanvas = document.querySelector("#cursor-data");
  const cursorCtx = cursorCanvas.getContext("2d"),
    cursorGlyphs = [];
  const textCursorSelector =
      "input:not([type]), input[type='text'], input[type='email'], input[type='tel'], input[type='url'], input[type='search'], input[type='password'], input[type='number'], textarea, [contenteditable='true']",
    pointerCursorSelector =
      "a[href], button:not(:disabled), input[type='button']:not(:disabled), input[type='submit']:not(:disabled), input[type='reset']:not(:disabled), input[type='checkbox']:not(:disabled), input[type='radio']:not(:disabled), input[type='range']:not(:disabled), select:not(:disabled), summary, label[for], [role='button'], [role='link'], [data-cursor='pointer']";
  function cursorModeFor(target) {
    if (typeof target?.closest !== "function")
      return { isText: false, isPointer: false };
    const isText = !!target.closest(textCursorSelector);
    return {
      isText,
      isPointer: !isText && !!target.closest(pointerCursorSelector),
    };
  }
  let lastCursorSpawn = 0,
    cursorFrame = 0;
  function sizeCursor() {
    const dpr = Math.min(
      devicePixelRatio || 1,
      1,
      Math.sqrt(1200000 / Math.max(1, innerWidth * innerHeight)),
    );
    cursorCanvas.width = Math.round(innerWidth * dpr);
    cursorCanvas.height = Math.round(innerHeight * dpr);
    cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function paintCursor(now) {
    cursorFrame = 0;
    cursorCtx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = cursorGlyphs.length - 1; i >= 0; i--) {
      const g = cursorGlyphs[i],
        age = (now - g.born) / g.life;
      if (age >= 1) {
        cursorGlyphs.splice(i, 1);
        continue;
      }
      cursorCtx.globalAlpha =
        Math.sin((Math.min(1, age * 9) * Math.PI) / 2) *
        Math.pow(1 - age, 1.8) *
        0.85;
      cursorCtx.font = `${g.size}px monospace`;
      cursorCtx.fillStyle = g.color;
      cursorCtx.fillText(g.text, g.x + g.dx * age, g.y - 24 * age);
    }
    cursorCtx.globalAlpha = 1;
    if (
      cursorGlyphs.length &&
      pageActive &&
      !document.hidden &&
      !reduced.matches
    )
      cursorFrame = requestAnimationFrame(paintCursor);
  }
  function clearCursorTrail() {
    cancelAnimationFrame(cursorFrame);
    cursorFrame = 0;
    cursorGlyphs.length = 0;
    cursorCtx.clearRect(0, 0, innerWidth, innerHeight);
  }
  scope.listen(document, "pointermove", (event) => {
    if (
      event.pointerType === "touch" ||
      reduced.matches ||
      !pageActive ||
      document.hidden
    )
      return;
    if (cursorModeFor(event.target).isPointer) {
      clearCursorTrail();
      return;
    }
    const now = performance.now();
    if (now - lastCursorSpawn < 35) return;
    lastCursorSpawn = now;
    for (let i = 0; i < 2; i++) {
      cursorGlyphs.push({
        x: event.clientX + 9 + (Math.random() - 0.5) * 24,
        y: event.clientY + 7 + (Math.random() - 0.5) * 20,
        dx: (Math.random() - 0.5) * 30,
        born: now,
        life: 850 + Math.random() * 600,
        size: 10 + Math.random() * 5,
        text: ["0", "1", "·", "+", "▯"][Math.floor(Math.random() * 5)],
        color: Math.random() < 0.3 ? "#f4edff" : "#bfa1f5",
      });
    }
    if (cursorGlyphs.length > 100)
      cursorGlyphs.splice(0, cursorGlyphs.length - 100);
    if (!cursorFrame) cursorFrame = requestAnimationFrame(paintCursor);
  });
  scope.listen(reduced, "change", () => {
    if (!reduced.matches) return;
    clearCursorTrail();
  });
  sizeCursor();
  const cursorDot = document.querySelector("#cursor-dot");
  let glintFrame = 0,
    glintX = -1000,
    glintY = -1000;
  function paintGlint() {
    glintFrame = 0;
    cursorDot.style.transform = `translate3d(${glintX}px,${glintY}px,0) translate(-50%,-50%)`;
  }
  scope.listen(document, "pointermove", (event) => {
    if (event.pointerType === "touch" || !pageActive || document.hidden) return;
    glintX = event.clientX;
    glintY = event.clientY;
    const { isText, isPointer } = cursorModeFor(event.target);
    cursorDot.classList.toggle("is-text", isText);
    cursorDot.classList.toggle("is-pointer", isPointer);
    document.body.classList.add("cursor-active");
    document.body.classList.toggle("cursor-pointer", isPointer);
    if (!glintFrame) glintFrame = requestAnimationFrame(paintGlint);
  });
  function clearGlint() {
    glintX = glintY = -1000;
    cancelAnimationFrame(glintFrame);
    glintFrame = 0;
    document.body.classList.remove("cursor-active", "cursor-pointer");
    cursorDot.classList.remove("is-text", "is-pointer");
  }
  scope.listen(document.documentElement, "pointerleave", clearGlint);
  scope.listen(window, "blur", clearGlint);
  resizeExtras = sizeCursor;
  let decorationPaused = null,
    lastSceneSuspended = null;
  function updateDecorativeState() {
    const suspend =
      !sceneInView || !pageActive || !contentEffectsActive || document.hidden;
    if (suspend !== lastSceneSuspended) {
      lastSceneSuspended = suspend;
      scene.classList.toggle("is-suspended", suspend);
    }
    const stopped =
      suspend ||
      paused ||
      scrollChapter < 0 ||
      scrollChapter >= photoFadeStart + photoFadeDuration;
    if (stopped === decorationPaused) return;
    decorationPaused = stopped;
    object.classList.toggle("effects-paused", stopped);
  }
  function syncSceneActivity() {
    updateDecorativeState();
    last = 0;
    ambientDelta = 0;
    if (
      !sceneInView ||
      !pageActive ||
      !contentEffectsActive ||
      document.hidden
    ) {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!pageActive || document.hidden) {
        cancelAnimationFrame(cursorFrame);
        cursorFrame = 0;
        cursorGlyphs.length = 0;
        cursorCtx.clearRect(0, 0, innerWidth, innerHeight);
        clearGlint();
      }
    } else {
      dirty = true;
      readScroll();
      wake();
    }
  }
  const sceneObserver =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            const visible = entries[0].isIntersecting;
            if (visible === sceneInView) return;
            sceneInView = visible;
            syncSceneActivity();
          },
          { threshold: 0 },
        )
      : null;
  const sceneResizeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(scheduleResize)
      : null;
  if (sceneObserver) sceneObserver.observe(scene);
  if (sceneResizeObserver) sceneResizeObserver.observe(scene);
  scope.listen(document, "visibilitychange", syncSceneActivity);
  scope.listen(window, "scene-effects-active", (event) => {
    contentEffectsActive = !!event.detail?.active;
    syncSceneActivity();
  });
  scope.listen(window, "pagehide", () => {
    pageActive = false;
    clearTimeout(resizeTimer);
    if (sceneObserver) sceneObserver.disconnect();
    if (sceneResizeObserver) sceneResizeObserver.disconnect();
    syncSceneActivity();
  });
  scope.listen(window, "pageshow", () => {
    pageActive = true;
    if (sceneObserver) sceneObserver.observe(scene);
    if (sceneResizeObserver) sceneResizeObserver.observe(scene);
    resize();
    syncSceneActivity();
  });
  updateDecorativeState();

  scope.defer(() => {
    sceneObserver?.disconnect();
    sceneResizeObserver?.disconnect();
    cancelAnimationFrame(raf);
    cancelAnimationFrame(cursorFrame);
    cancelAnimationFrame(glintFrame);
    cursorCanvas.width = cursorCanvas.height = 1;
    floorCanvas.width = floorCanvas.height = 1;
    canvas.width = canvas.height = 1;
    inviteCanvas.width = inviteCanvas.height = 1;
    document.body.classList.remove("cursor-active", "cursor-pointer");
  });
  return {
    startBackground() {
      return receiver.startBackground();
    },
  };
}
