import { createScheduler } from "./scheduler.js";
export function createRuntime() {
  const scheduler = createScheduler(),
    disposers = [],
    frames = new Set(),
    timers = new Set();
  const scrollListeners = new Set();
  let disposed = false,
    scrollFrame = 0;
  function scroll() {
    if (!scrollFrame)
      scrollFrame = scheduler.request(() => {
        scrollFrame = 0;
        for (const fn of scrollListeners) fn();
      }, "read");
  }
  window.addEventListener("scroll", scroll, { passive: true });
  disposers.push(() => window.removeEventListener("scroll", scroll));
  function listen(target, type, fn, options) {
    const guarded = (...args) => {
      if (!disposed) fn(...args);
    };
    if (target === window && type === "scroll") {
      scrollListeners.add(guarded);
      return () => scrollListeners.delete(guarded);
    }
    target.addEventListener(type, guarded, options);
    const off = () => target.removeEventListener(type, guarded, options);
    disposers.push(off);
    return off;
  }
  return {
    get disposed() {
      return disposed;
    },
    listen,
    defer(fn) {
      disposers.push(fn);
    },
    request(callback, phase = "write") {
      let id = scheduler.request((now) => {
        frames.delete(id);
        if (!disposed) callback(now);
      }, phase);
      frames.add(id);
      return id;
    },
    cancel(id) {
      scheduler.cancel(id);
      frames.delete(id);
    },
    timeout(fn, delay) {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!disposed) fn();
      }, delay);
      timers.add(id);
      return id;
    },
    clearTimeout(id) {
      clearTimeout(id);
      timers.delete(id);
    },
    observe(observer, node) {
      observer.observe(node);
      disposers.push(() => observer.disconnect());
      return observer;
    },
    dispose() {
      disposed = true;
      for (const off of disposers.reverse()) off();
      for (const id of timers) clearTimeout(id);
      scrollListeners.clear();
      scheduler.dispose();
      frames.clear();
    },
  };
}
