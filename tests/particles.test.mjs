import test from 'node:test';
import assert from 'node:assert/strict';
import { configureFrameHost } from '../src/animation/frameHost.js';
import { startParticleShape } from '../src/animation/particles.js';

for (const mobile of [true, false]) {
  test(`particle canvas ${mobile ? 'mobile stops after paint' : 'desktop retains animation'}`, async () => {
    const keys = ['window', 'document', 'Image', 'matchMedia', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver'];
    const saved = keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
    let draws = 0, id = 0;
    const pending = new Map();
    const listeners = new Map();
    const host = {
      request(fn) { pending.set(++id, fn); return id; },
      cancel(id) { pending.delete(id); },
    };
    const reset = configureFrameHost(host);
    const context = new Proxy({
      drawImage() { draws++; },
      getImageData: () => ({ data: new Uint8ClampedArray(800 * 773 * 4).fill(180) }),
      measureText: () => ({ width: 70 }),
    }, { get: (target, key) => key in target ? target[key] : () => {} });
    const canvas = () => ({
      width: 800, height: 773, clientWidth: 400, clientHeight: 500,
      style: { getPropertyValue: () => '1' },
      getContext: () => context,
    });
    const media = query => ({
      matches: query.includes('max-width') ? mobile : false,
      addEventListener() {}, removeEventListener() {},
    });
    const values = {
      window: { innerWidth: mobile ? 375 : 1400, devicePixelRatio: 2, setTimeout,
        addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); } },
      document: { hidden: false, createElement: canvas, addEventListener() {}, removeEventListener() {} },
      Image: class { complete = true; naturalWidth = 800; naturalHeight = 773; decode() { return Promise.resolve(); } },
      matchMedia: media,
      ResizeObserver: class { observe() {} disconnect() {} },
      IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn([{ isIntersecting: true }]); } disconnect() {} },
      MutationObserver: undefined,
    };
    for (const [key, value] of Object.entries(values))
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    let controller;
    try {
      controller = await startParticleShape(canvas(), { side: 'left' });
      controller.setActive(true);
      assert.equal(pending.size, 1);
      const before = draws;
      const callbacks = [...pending.values()]; pending.clear();
      callbacks.forEach(fn => fn(1000));
      assert(draws > before, 'portrait must be painted, not left empty');
      assert.equal(pending.size, mobile ? 0 : 1, 'mobile must not retain an ambient RAF loop');
      if (!mobile) {
        listeners.get('scroll')?.();
        assert.equal(pending.size, 1, 'scroll must not cancel particle rendering or add a resume delay');
        const next = [...pending.values()]; pending.clear();
        const prior = draws;
        next.forEach(fn => fn(1040));
        assert(draws > prior, 'particles continue painting during scroll');
      }
      controller.setActive(false);
      controller.dispose(); controller = null;
      assert.equal(pending.size, 0);
    } finally {
      controller?.dispose(); reset();
      for (const [key, descriptor] of saved)
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    }
  });
}
