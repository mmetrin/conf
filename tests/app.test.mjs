import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { parseHTML } from "linkedom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
const built = await build({
  entryPoints: ["src/App.jsx"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  external: ["react", "react-dom", "react-dom/client"],
  define: {
    __REGISTRATION_PUBLIC_CONFIG__: JSON.stringify({
      apiUrl: "/api/register",
    }),
    __SENDSAY_PUBLIC_CONFIG__: JSON.stringify({
      account: "test-account",
      formId: "test-form",
      useTestForm: false,
      fields: {
        name: "field_name",
        phone: "field_phone",
        company: "field_company",
        role: "field_role",
      },
    }),
  },
});
await fs.mkdir("work/test-build", { recursive: true });
await fs.writeFile("work/test-build/app.mjs", built.outputFiles[0].contents);
const { default: App } = await import("../work/test-build/app.mjs");
function environment(width, height, reduced = false, options = {}) {
  const { window, document } = parseHTML(
    '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
  );
  const pending = new Map();
  let now = 0,
    next = 0,
    scrollY = 0;
  Object.assign(globalThis, {
    window,
    document,
    history: {},
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 1,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const media = {
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.matchMedia = (query) =>
    query === "(max-width: 599px)"
      ? {
          ...media,
          get matches() {
            return width <= 599;
          },
        }
      : media;
  window.matchMedia = globalThis.matchMedia;
  Object.defineProperty(window, "scrollY", {
    get: () => scrollY,
    configurable: true,
  });
  window.scrollTo = ({ top }) => {
    scrollY = top;
    window.dispatchEvent(new window.Event("scroll"));
  };
  window.requestAnimationFrame = (fn) => {
    pending.set(++next, fn);
    return next;
  };
  window.cancelAnimationFrame = (id) => pending.delete(id);
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame;
  document.fonts = {
    load: () => Promise.resolve([]),
    ready: Promise.resolve(),
  };
  const gradient = { addColorStop() {} };
  const context = new Proxy(
    {
      measureText: (text) => ({ width: text.length * 9 }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x, y, w, h) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    },
    {
      get: (obj, key) => (key in obj ? obj[key] : () => {}),
      set: (obj, key, value) => ((obj[key] = value), true),
    },
  );
  const gl = new Proxy(
    {
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
    },
    { get: (obj, key) => (key in obj ? obj[key] : () => ({})) },
  );
  window.HTMLCanvasElement.prototype.getContext = function (type) {
    return type === "webgl" ? gl : context;
  };
  const Img = window.HTMLImageElement;
  Img.prototype.decode = function () {
    return options.decodeImage?.(this) || Promise.resolve();
  };
  Object.defineProperties(Img.prototype, {
    complete: { get: () => true, configurable: true },
    naturalWidth: { get: () => 1777, configurable: true },
    naturalHeight: { get: () => 885, configurable: true },
  });
  globalThis.Image = class {
    constructor() {
      return document.createElement("img");
    }
  };
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.IntersectionObserver = class {
    constructor(fn) {
      this.fn = fn;
    }
    observe() {
      this.fn([{ isIntersecting: true }]);
    }
    disconnect() {}
  };
  function rect(node) {
    let w = width,
      h = height,
      x = 0,
      y = 0;
    const journeyHeight = height * 2.8,
      programmeTop = journeyHeight - scrollY;
    if (node.id === "journey") {
      y = -scrollY;
      h = journeyHeight;
    } else if (node.id === "programme") {
      y = programmeTop;
      h = 2800;
    } else if (node.id === "programme-title") {
      y = programmeTop + 64;
      h = 30;
    } else if (node.id === "registration") {
      y = programmeTop + 2800;
      h = 940;
    } else if (node.id === "registration-title") {
      const entryOffset = Number.parseFloat(
        document
          .querySelector("#registration")
          ?.style.getPropertyValue("--registration-entry-y") || "0",
      );
      y =
        programmeTop +
        2800 +
        181 +
        (Number.isFinite(entryOffset) ? entryOffset : 0);
      h = 53;
    } else if (node.classList.contains("lens-loader")) {
      w = h = 108;
      x = (width - w) / 2;
      y = (height - h) / 2;
    } else if (node.id === "projector") {
      w = Math.max(400, Math.min(760, width * 0.54));
      h = w / 2;
      x = width / 2;
      y = 27;
    } else if (node.id === "projector-final") {
      w = Math.max(276, Math.min(515, width * 0.368));
      h = w / 2;
      x = width / 2;
      y = 27;
    } else if (node.classList.contains("object")) {
      w = Math.min(1130, width * 1.02);
      h = (w * 1132) / 2012;
      x = width / 2;
      y = height * 0.62;
    } else if (node.classList.contains("receiver-picture")) {
      w = Math.min(1130, width * 1.02);
      h = (w * 1132) / 2012;
    } else if (node.classList.contains("programme__inner")) {
      w = 870;
      y = programmeTop + 100;
      h = 2600;
    } else if (node.classList.contains("programme__track")) {
      w = 560;
      y = programmeTop + 300;
      h = 2400;
    } else if (node.classList.contains("programme__item")) {
      w = 560;
      h = 100;
      y =
        programmeTop +
        300 +
        [...document.querySelectorAll(".programme__item")].indexOf(node) * 210;
    } else if (node.id === "conference-register") {
      w = 240;
      h = 50;
    }
    return {
      left: x,
      top: y,
      width: w,
      height: h,
      right: x + w,
      bottom: y + h,
    };
  }
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return rect(this);
  };
  window.HTMLElement.prototype.scrollIntoView = function () {
    window.scrollTo({ top: scrollY + rect(this).top });
  };
  window.HTMLElement.prototype.focus = function () {
    document.focused = this;
  };
  for (const [prop, key] of Object.entries({
    clientWidth: "width",
    clientHeight: "height",
    offsetWidth: "width",
    offsetHeight: "height",
    offsetLeft: "left",
    offsetTop: "top",
  }))
    Object.defineProperty(window.HTMLElement.prototype, prop, {
      get() {
        return rect(this)[key];
      },
      configurable: true,
    });
  globalThis.getComputedStyle = (node) => {
    const r = rect(node);
    return {
      width: r.width + "px",
      height: r.height + "px",
      left: r.left + "px",
      top: r.top + "px",
      getPropertyValue: () => "",
    };
  };
  const errors = [];
  process.on("unhandledRejection", onError);
  function onError(e) {
    errors.push(e);
  }
  async function step(count, frameMs = 1000 / 60) {
    for (let i = 0; i < count; i++) {
      now += frameMs;
      const callbacks = [...pending.values()];
      pending.clear();
      await act(async () => {
        for (const fn of callbacks) fn(now);
        await Promise.resolve();
      });
    }
  }
  return {
    window,
    document,
    pending,
    step,
    errors,
    get scrollY() {
      return scrollY;
    },
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      globalThis.innerWidth = width;
      globalThis.innerHeight = height;
      window.dispatchEvent(new window.Event("resize"));
    },
    dispose() {
      process.off("unhandledRejection", onError);
    },
  };
}

async function finishConsentModalClose() {
  const modal = document.querySelector(".consent-modal");
  if (!modal) return;
  assert(
    modal.classList.contains("is-closing"),
    "the modal remains mounted for its closing animation",
  );
  await act(async () => {
    modal.dispatchEvent(new window.Event("animationend", { bubbles: true }));
  });
}

test("mobile loader waits for the second projector image to decode", async () => {
  let releaseProjector;
  const projectorReady = new Promise((resolve) => {
    releaseProjector = resolve;
  });
  const env = environment(375, 812, false, {
    decodeImage: (image) =>
      image.classList?.contains("projector-final-render")
        ? projectorReady
        : Promise.resolve(),
  });
  document.body.insertAdjacentHTML(
    "afterbegin",
    await fs.readFile("src/loading-shell.html", "utf8"),
  );
  assert(
    document.querySelector("#bootstrap-loader"),
    "HTML includes a loader before React starts",
  );
  const root = createRoot(document.getElementById("root"));

  try {
    await act(async () => {
      root.render(React.createElement(App));
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });
    await env.step(3);
    assert(!document.documentElement.classList.contains("content-ready"));
    assert(!document.documentElement.classList.contains("loader-finished"));
    assert(document.querySelector("#page-loader"));
    assert.equal(
      document.querySelector("#bootstrap-loader"),
      null,
      "React takes over the loading screen without leaving two overlays",
    );

    await act(async () => {
      releaseProjector();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await env.step(5);
    assert(
      document.documentElement.classList.contains("content-ready"),
      JSON.stringify({
        pendingFrames: env.pending.size,
        classes: document.documentElement.className,
        errors: env.errors.map(String),
      }),
    );
  } finally {
    await act(async () => root.unmount());
    env.dispose();
  }
});

test("later screens prepare while background sequence is still pending", async () => {
  let releaseFrames;
  const framesReady = new Promise((resolve) => {
    releaseFrames = resolve;
  });
  const env = environment(1600, 940, false, {
    decodeImage: (image) =>
      /receiver-frames\/(?!01\.)/.test(image.src)
        ? framesReady
        : Promise.resolve(),
  });
  const root = createRoot(document.getElementById("root"));
  let prefetched = false;
  let completed = false;
  window.addEventListener("audience-prefetch", () => {
    prefetched = true;
  });
  window.addEventListener("sequence-background-complete", () => {
    completed = true;
  });
  try {
    await act(async () => {
      root.render(React.createElement(App));
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });
    await env.step(100);
    assert.equal(
      prefetched,
      false,
      "optional animation work waits until opening finishes",
    );
    await env.step(130);
    assert(document.documentElement.classList.contains("loader-finished"));
    assert.equal(completed, false);
    assert.equal(prefetched, true);
    assert(document.querySelector("#programme"));
    assert.equal(
      document.querySelector(".programme__portrait").getAttribute("loading"),
      "eager",
    );
  } finally {
    await act(async () => {
      root.unmount();
      releaseFrames();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    env.dispose();
  }
});

test("a quick registration jump suppresses unfinished opening symbols", async () => {
  const env = environment(1600, 940);
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => {
      root.render(React.createElement(App));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await env.step(5);
    assert(
      document.documentElement.classList.contains("opening-locked"),
      "the opening is still in progress before the jump",
    );
    window.scrollTo({ top: 940 * 6 });
    await env.step(1);
    assert(
      document
        .querySelector("#scene")
        .classList.contains("opening-content-suppressed"),
      "the opening canvas is hidden as soon as the sticky hero is left",
    );
    await env.step(1);
    assert(
      !document.documentElement.classList.contains("opening-locked"),
      "the unfinished opening settles instead of continuing over the form",
    );
    window.scrollTo({ top: 0 });
    await env.step(2);
    assert(
      !document
        .querySelector("#scene")
        .classList.contains("opening-content-suppressed"),
      "the hero can be shown again after returning to the top",
    );
    assert.deepEqual(env.errors, []);
  } finally {
    await act(async () => root.unmount());
    env.dispose();
  }
});

for (const frameMs of [1000 / 60, 100])
  test(`mobile starts without delay and preserves animation timing at ${Math.round(1000 / frameMs)} fps`, async () => {
    const requestedFrames = [];
    const env = environment(375, 812, false, {
      decodeImage: (image) => {
        if (image.src?.includes("receiver-frames/"))
          requestedFrames.push(image.src);
        return Promise.resolve();
      },
    });
    const root = createRoot(document.getElementById("root"));
    try {
      await act(async () => {
        root.render(React.createElement(App));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await env.step(4);
      assert(
        document.documentElement.classList.contains("content-ready"),
        "cached assets do not incur a minimum 500ms loading delay",
      );
      assert.equal(
        requestedFrames.length,
        1,
        "only the initial frame is loaded during opening",
      );
      assert.match(requestedFrames[0], /receiver-frames\/mobile\/01\.webp/);
      await env.step(Math.ceil(1650 / frameMs), frameMs);
      assert(
        document.documentElement.classList.contains("opening-locked"),
        "the opening animation keeps its original pace instead of finishing in 1.5 seconds",
      );
      assert.equal(
        requestedFrames.length,
        1,
        "background frames still wait for the full opening animation",
      );
      await env.step(Math.ceil(1500 / frameMs), frameMs);
      assert(
        !document.documentElement.classList.contains("opening-locked"),
        "opening finishes without stretching its timing on dropped frames",
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      assert(
        document.querySelector("#programme"),
        "lower content is available after opening",
      );
      assert.equal(env.errors.length, 0);
    } finally {
      await act(async () => root.unmount());
      env.dispose();
    }
  });

test("critical resource failure keeps loader closed and offers recovery", async () => {
  const env = environment(375, 812);
  document.fonts.load = () => Promise.reject(new Error("font network failure"));
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () => {
      root.render(React.createElement(App));
      await Promise.resolve();
    });
    await env.step(5);
    assert(!document.documentElement.classList.contains("content-ready"));
    assert(document.querySelector(".loader-retry"));
    assert.equal(env.errors.length, 0);
  } finally {
    await act(async () => root.unmount());
    env.dispose();
  }
});

for (const [width, height, reduced] of [
  [1600, 940, false],
  [768, 1024, false],
  [375, 812, true],
  [599, 812, false],
  [600, 812, false],
])
  test(`React scene lifecycle ${width}×${height}, reduced=${reduced}`, async () => {
    const originalFetch = globalThis.fetch,
      originalFormData = globalThis.FormData;
    globalThis.location = { protocol: "http:", hostname: "127.0.0.1" };
    globalThis.FormData = class {
      constructor(form) {
        this.items = [...form.querySelectorAll("input")].map((el) => [
          el.name,
          el.value || "",
        ]);
      }
      [Symbol.iterator]() {
        return this.items[Symbol.iterator]();
      }
    };
    let calls = 0,
      sendsayCalls = 0,
      apiCalls = 0;
    const apiBodies = [];
    globalThis.fetch = async (url, request) => {
      calls++;
      if (String(url).startsWith("https://sendsay.ru/form/")) {
        sendsayCalls++;
        return { ok: true, status: 200, json: async () => ({ obj: {} }) };
      }
      apiBodies.push(JSON.parse(request.body));
      apiCalls++;
      if (apiCalls === 1)
        return { ok: false, status: 503, json: async () => ({ ok: false }) };
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    const env = environment(width, height, reduced);
    const root = createRoot(document.getElementById("root"));
    try {
      await act(async () => {
        root.render(React.createElement(App));
        await Promise.resolve();
      });
      await env.step(3);
      if (width < 599) {
        const trigger = document.querySelector(".menu-trigger");
        const menu = document.querySelector(".scene-menu");
        assert(
          menu,
          "closed mobile menu remains mounted for its exit animation",
        );
        assert.equal(trigger.getAttribute("aria-expanded"), "false");
        assert.equal(menu.getAttribute("aria-hidden"), "true");
        assert(
          trigger.querySelector(
            '.menu-trigger__close-icon[src="assets/cross.svg"]',
          ),
        );
        assert(
          menu.querySelector(
            ".scene-menu__panel > .scene-menu__links + .scene-menu__details",
          ),
          "mobile menu centers links before its facts and CTA group",
        );
        assert(
          menu.querySelector(
            ".scene-menu__details > .scene-menu__facts + .scene-menu__register",
          ),
          "facts stay above the registration button",
        );
        await act(async () => {
          trigger.dispatchEvent(new window.Event("click", { bubbles: true }));
        });
        assert(trigger.classList.contains("is-open"));
        assert(menu.classList.contains("is-open"));
        assert.equal(trigger.getAttribute("aria-expanded"), "true");
        assert.equal(menu.getAttribute("aria-hidden"), "false");
        await act(async () => {
          trigger.dispatchEvent(new window.Event("click", { bubbles: true }));
        });
        assert.equal(document.querySelector(".scene-menu"), menu);
        assert(!trigger.classList.contains("is-open"));
        assert(!menu.classList.contains("is-open"));
        assert.equal(menu.getAttribute("aria-hidden"), "true");
      }
      assert.equal(
        document.querySelector("#programme"),
        null,
        "below-fold DOM is not part of the critical render",
      );
      await act(async () => {
        window.dispatchEvent(new window.Event("lower-content-request"));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await env.step(3);
      for (const registerButton of document.querySelectorAll(
        ".scene-menu__register, #conference-register",
      )) {
        window.scrollTo({ top: 0 });
        await env.step(2);
        const registration = document.querySelector("#registration");
        const title = document.querySelector("#registration-title");
        const entryOffset = Number.parseFloat(
          registration.style.getPropertyValue("--registration-entry-y") || "0",
        );
        const expectedTop =
          window.scrollY +
          title.getBoundingClientRect().top -
          (Number.isFinite(entryOffset) ? entryOffset : 0) -
          120;
        await act(async () => {
          registerButton.dispatchEvent(
            new window.Event("click", { bubbles: true }),
          );
        });
        assert.equal(
          env.scrollY,
          expectedTop,
          "every registration CTA leaves a 120px gap above the untransformed H2",
        );
      }
      window.scrollTo({ top: 0 });
      await env.step(2);
      // Exercise the scene state machine independently of async asset readiness.
      document.documentElement.classList.add("content-ready");
      window.dispatchEvent(new window.Event("opening-ready"));
      await env.step(380);
      assert(!document.documentElement.classList.contains("opening-locked"));
      assert(document.documentElement.classList.contains("loader-finished"));
      assert.equal(
        document.querySelector("#projector").style.visibility,
        "hidden",
      );
      assert(
        document
          .querySelector("#projector-final")
          .style.getPropertyValue("--final-opacity") === "1",
      );
      assert.equal(
        document.querySelectorAll(".programme__focus-content").length,
        11,
      );
      const businessHeading = document.querySelector(
        ".programme__business-heading",
      );
      const evening = document.querySelector(".programme__evening");
      const business = document.querySelector(".programme__business");
      assert.equal(
        businessHeading.parentElement,
        document.querySelector(".programme__track"),
      );
      assert.equal(businessHeading.nextElementSibling, evening);
      assert.equal(evening.nextElementSibling, business);
      assert.equal(
        business.querySelector(".programme__business-heading"),
        null,
        "the business heading stays outside the reordered topic group",
      );
      const stickyDistance = height * 1.8;
      window.scrollTo({ top: stickyDistance });
      await env.step(4);
      assert.equal(
        document.querySelector("#photo-dimmer").style.opacity,
        width <= 599 ? "0.000" : "1.000",
        "only desktop scroll advances the hero timeline",
      );
      if (width <= 599) {
        assert(
          !document
            .querySelector("#scene")
            .classList.contains("programme-pinned"),
        );
        assert(
          !document
            .querySelector("#scene")
            .classList.contains("programme-exiting"),
        );
        for (const selector of [
          "#photo-title",
          "#photo-subtitle",
          "#photo-roles",
        ]) {
          assert.equal(
            document.querySelector(selector).getAttribute("aria-hidden"),
            "false",
          );
          assert.equal(
            document.querySelector(selector).style.visibility,
            "visible",
          );
        }
      }
      window.scrollTo({ top: 0 });
      await env.step(4);
      assert.equal(
        document.querySelector("#photo-dimmer").style.opacity,
        "0.000",
        "the scroll timeline is reversible",
      );
      for (const top of [
        height,
        height * 2.8 - 100,
        height * 2.8,
        3 * height,
        5 * height,
        7 * height,
        height,
        0,
      ]) {
        window.scrollTo({ top });
        await env.step(4);
        if (width <= 599) {
          const track = document.querySelector(".programme__track");
          assert.equal(
            track.style.getPropertyValue("--programme-line-y"),
            (height * 0.5 - track.getBoundingClientRect().top).toFixed(1) +
              "px",
            "mobile line highlight follows scrolling at the viewport focus",
          );
          const smoke = document.querySelector("#abstract-lights");
          assert.equal(
            smoke.parentElement,
            document.body,
            "the smoke background is outside the clipped mobile scene",
          );
          const titleTop = document
            .querySelector("#programme-title")
            .getBoundingClientRect().top;
          if (titleTop >= 80) {
            assert.equal(
              Number(smoke.style.opacity || 0),
              0,
              "smoke stays hidden until the programme heading reaches the top zone",
            );
          } else if (titleTop > 0) {
            assert(
              Number(smoke.style.opacity) > 0 &&
                Number(smoke.style.opacity) < 0.55,
              "smoke appears gradually as the heading crosses the top zone",
            );
          }
          if (top >= 3 * height) {
            assert.equal(
              smoke.style.opacity,
              "0.55",
              "smoke remains visible from programme through footer",
            );
          } else if (top === 0) {
            assert.equal(
              smoke.style.opacity,
              "0",
              "smoke hides when returning above programme",
            );
          }
        }
        if (width > 599) {
          assert(
            !document
              .querySelector("#scene")
              .classList.contains("is-suspended"),
            "registration and footer must not suspend the fixed beam",
          );
          if (top === 3 * height) {
            const focusLevels = [
              ...document.querySelectorAll(".programme__item"),
            ].map((item) => item.style.getPropertyValue("--focus"));
            assert.equal(
              focusLevels.filter((value) => value === "1.000").length,
              1,
              "exactly one desktop programme item is fully opaque",
            );
            assert(
              focusLevels
                .filter((value) => value !== "1.000")
                .every((value) => value === "0.500"),
              "every non-central desktop programme item is 50% opaque",
            );
          }
        }
      }
      if (width > 599) {
        window.scrollTo({ top: height * 2.8 });
        await env.step(4);
        // The DOM fixture does not apply CSS transforms; settle entry offsets.
        window.dispatchEvent(new window.Event("scroll"));
        await env.step(4);
        const content = document.querySelector(".programme__inner");
        const litEdge = parseFloat(
          content.style.getPropertyValue("--programme-lit-edge"),
        );
        const darkEdge = parseFloat(
          content.style.getPropertyValue("--programme-dark-edge"),
        );
        assert(
          Math.abs(
            litEdge + content.getBoundingClientRect().top - height * 0.18,
          ) < 1,
          "fading begins near the top edge",
        );
        assert(
          Math.abs(litEdge - darkEdge - height * 0.36) < 1,
          "fading has a broad gradual range",
        );
        window.scrollTo({ top: height * 2.8 + 2800 + 940 });
        await env.step(4);
      }
      env.resize(height, width);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
      });
      await env.step(4);
      if (width > 599) {
        assert(
          !document.querySelector("#scene").classList.contains("is-suspended"),
          "resizing at the footer keeps the beam renderer active",
        );
      }
      for (const node of document.querySelectorAll("[style]"))
        assert(!/NaN|undefinedpx/.test(node.getAttribute("style")), node.id);
      assert.equal(
        document.querySelectorAll("#page-loader").length,
        1,
        "loader geometry remains available on resize",
      );
      assert.equal(document.querySelectorAll("#light").length, 1);
      const form = document.querySelector("#registration-form");
      Object.defineProperty(form, "elements", {
        value: { namedItem: (name) => form.querySelector(`[name="${name}"]`) },
      });
      const reminderCheckbox = form.querySelector(
        "#registration-reminder-consent",
      );
      const privacyPolicyButton = form.querySelector(".registration__policy a");
      assert.equal(
        form.querySelector(".registration__policy").textContent,
        "Продолжая, я соглашаюсь с Политикой обработки персональных данных",
      );
      assert.equal(privacyPolicyButton.textContent.includes("\u00a0"), false);
      assert.equal(reminderCheckbox.checked, true);
      await act(async () => {
        form
          .querySelector("#registration-reminder-link")
          .dispatchEvent(new window.Event("click", { bubbles: true }));
      });
      const consentDialog = document.querySelector(".consent-modal__dialog");
      assert(consentDialog);
      assert.equal(
        consentDialog.parentElement.dataset.cursor,
        "pointer",
        "the dismissible desktop backdrop exposes its pointer cursor state",
      );
      assert.match(
        consentDialog.textContent,
        /Согласие на\s+рекламное взаимодействие/,
      );
      assert.match(consentDialog.textContent, /ООО\s+«МТС АДС ВИДЕО»/);
      assert(
        consentDialog.querySelector(
          '.consent-modal__close img[src="assets/cross.svg"]',
        ),
        "the modal reuses the menu close icon",
      );
      await act(async () => {
        const escape = new window.Event("keydown", { bubbles: true });
        escape.key = "Escape";
        document.dispatchEvent(escape);
      });
      await finishConsentModalClose();
      assert.equal(document.querySelector(".consent-modal"), null);

      for (const triggerSelector of [
        ".registration__policy a",
        ".site-footer__policy",
      ]) {
        await act(async () => {
          document
            .querySelector(triggerSelector)
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        });
        const personalDataDialog = document.querySelector(
          ".consent-modal__dialog",
        );
        assert(personalDataDialog);
        assert.match(
          personalDataDialog.textContent,
          /Согласие на\s+обработку персональных\s+данных/,
        );
        assert.match(personalDataDialog.textContent, /с\s+настоящего сайта/);
        assert.doesNotMatch(
          personalDataDialog.textContent,
          /Тильда|flagman_event/,
        );
        assert.match(personalDataDialog.textContent, /срок 3\s+года/);
        assert.match(personalDataDialog.textContent, /info@stream.ru/);
        assert.match(personalDataDialog.textContent, /а\)\s+фамилия, имя,/);
        assert.match(
          personalDataDialog.textContent,
          /4\.3\.\s+поставщики услуг/,
        );
        await act(async () => {
          const closeTarget =
            triggerSelector === ".registration__policy a"
              ? document.querySelector(".consent-modal")
              : personalDataDialog.querySelector(".consent-modal__close");
          closeTarget.dispatchEvent(
            new window.Event(
              closeTarget.classList.contains("consent-modal")
                ? "pointerdown"
                : "click",
              { bubbles: true },
            ),
          );
        });
        await finishConsentModalClose();
        assert.equal(document.querySelector(".consent-modal"), null);
      }
      const footerLegalLinks = [
        ...document.querySelectorAll(".site-footer__legal-link"),
      ];
      assert.deepEqual(
        footerLegalLinks.map((link) => link.textContent.trim()),
        [
          "Политика обработки персональных данных",
          "Согласие на анонс-рассылку",
        ],
      );
      await act(async () => {
        document
          .querySelector(".site-footer__advertising-consent")
          .dispatchEvent(new window.Event("click", { bubbles: true }));
      });
      assert.match(
        document.querySelector(".consent-modal__dialog").textContent,
        /Согласие на\s+рекламное взаимодействие/,
      );
      await act(async () => {
        document
          .querySelector(".consent-modal__close")
          .dispatchEvent(new window.Event("click", { bubbles: true }));
      });
      await finishConsentModalClose();
      assert.equal(document.querySelector(".consent-modal"), null);
      reminderCheckbox.checked = true;
      await act(async () => {
        reminderCheckbox.dispatchEvent(
          new window.Event("click", { bubbles: true }),
        );
      });
      window.dispatchEvent(
        new window.CustomEvent("scene-effects-active", {
          detail: { active: false },
        }),
      );
      const pointerMove = new window.Event("pointermove", { bubbles: true });
      pointerMove.pointerType = "mouse";
      pointerMove.clientX = 420;
      pointerMove.clientY = 640;
      form.elements.namedItem("name").dispatchEvent(pointerMove);
      await env.step(1);
      const cursorDot = document.querySelector("#cursor-dot");
      assert.equal(cursorDot.parentElement, document.body);
      assert.equal(
        cursorDot.style.transform,
        "translate3d(420px,640px,0) translate(-50%,-50%)",
        "custom cursor keeps moving after scene effects are suspended",
      );
      assert(cursorDot.classList.contains("is-text"));
      assert(document.body.classList.contains("cursor-active"));
      const pointerOverButton = new window.Event("pointermove", {
        bubbles: true,
      });
      pointerOverButton.pointerType = "mouse";
      pointerOverButton.clientX = 450;
      pointerOverButton.clientY = 40;
      document.querySelector(".menu-trigger").dispatchEvent(pointerOverButton);
      assert(cursorDot.classList.contains("is-pointer"));
      assert(!cursorDot.classList.contains("is-text"));
      assert(document.body.classList.contains("cursor-pointer"));
      await act(async () => {
        form.dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
      });
      assert.equal(form.querySelectorAll(".is-invalid").length, 5);
      assert.equal(document.focused.id, "registration-name");
      const values = {
        name: "Анна Петрова",
        email: "anna@example.ru",
        phone: "+7 (999) 123-45-67",
        company: "МТС",
        role: "Маркетолог",
      };
      for (const [name, value] of Object.entries(values))
        form.elements.namedItem(name).value = value;
      await act(async () => {
        form.dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
      });
      assert.equal(
        sendsayCalls,
        0,
        "a consented registration bypasses the public Form API",
      );
      assert(document.querySelector("#registration-form"));
      assert(document.querySelector(".registration__status").textContent);
      assert.equal(form.elements.namedItem("email").value, values.email);
      await act(async () => {
        form.dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
        form.dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
      });
      assert.equal(
        sendsayCalls,
        0,
        "a consented registration never creates an unconfirmed Form API contact",
      );
      assert.equal(
        calls,
        2,
        "double submit sends only one retry to the server webhook",
      );
      assert.equal(apiBodies[0].reminderConsent, true);
      assert.equal(document.querySelector("#registration-form"), null);
      const success = document.querySelector(".registration__success");
      assert.equal(success.getAttribute("role"), "status");
      assert.match(success.textContent, /Вы зарегистрированы/);
      assert.match(success.textContent, /19 ноября/);
      assert.equal(success.querySelectorAll("img").length, 5);
      assert.equal(success.querySelectorAll(".site-footer__fact").length, 4);
      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new window.Event("visibilitychange"));
      await env.step(3);
      assert.equal(env.pending.size, 0, "hidden page stops RAF");
      document.hidden = false;
      document.dispatchEvent(new window.Event("visibilitychange"));
      await env.step(3);
      assert.deepEqual(env.errors, []);
      await act(async () => root.unmount());
      await env.step(2);
      assert.equal(env.pending.size, 0, "all RAF callbacks stopped on unmount");
    } finally {
      env.dispose();
      globalThis.fetch = originalFetch;
      globalThis.FormData = originalFormData;
    }
  });
