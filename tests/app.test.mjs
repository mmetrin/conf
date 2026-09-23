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
function environment(width, height, reduced = false) {
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
  globalThis.matchMedia = () => media;
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
    return Promise.resolve();
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
    } else if (node.id === "registration") {
      y = programmeTop + 2800;
      h = 940;
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
  async function step(count) {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
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
for (const [width, height, reduced] of [
  [1600, 940, false],
  [768, 1024, false],
  [375, 812, true],
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
      sendsayCalls = 0;
    globalThis.fetch = async (url) => {
      calls++;
      if (String(url).startsWith("https://sendsay.ru/form/")) {
        sendsayCalls++;
        return sendsayCalls === 1
          ? {
              ok: true,
              status: 200,
              json: async () => ({ errors: [{ id: "temporary_form_error" }] }),
            }
          : { ok: true, status: 200, json: async () => ({ obj: {} }) };
      }
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
      // Loader timing is wall-clock based; bypass only the wait, not the scene's state machine.
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
      const stickyDistance = height * 1.8;
      window.scrollTo({ top: stickyDistance });
      await env.step(4);
      assert.equal(
        document.querySelector("#photo-dimmer").style.opacity,
        "1.000",
        "the hero timeline finishes exactly as the sticky section releases",
      );
      window.scrollTo({ top: 0 });
      await env.step(4);
      assert.equal(
        document.querySelector("#photo-dimmer").style.opacity,
        "0.000",
        "the scroll timeline is reversible",
      );
      for (const top of [
        height,
        3 * height,
        5 * height,
        7 * height,
        height,
        0,
      ]) {
        window.scrollTo({ top });
        await env.step(4);
      }
      env.resize(height, width);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
      });
      await env.step(4);
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
      assert.equal(sendsayCalls, 1);
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
        2,
        "double submit sends only one Sendsay request",
      );
      assert.equal(
        calls,
        3,
        "organizer notification is sent after Sendsay success",
      );
      assert.equal(document.querySelector("#registration-form"), null);
      const success = document.querySelector(".registration__success");
      assert.equal(success.getAttribute("role"), "status");
      assert.match(success.textContent, /Вы зарегистрированы/);
      assert.match(success.textContent, /19 ноября/);
      assert.equal(success.querySelectorAll("img").length, 5);
      assert.equal(
        success.querySelectorAll(".registration__success-fact").length,
        4,
      );
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
