import test from "node:test";
import assert from "node:assert/strict";
import { createScheduler } from "../src/animation/scheduler.js";
import {
  receiverFrameAt,
  FRAME_DURATION,
  FRAME_PAUSE,
} from "../src/animation/receiver.js";
import { validateField } from "../src/utils/validation.js";
test("one RAF groups all measurements before canvas/style writes and can dispose", () => {
  let id = 0;
  const callbacks = new Map(),
    host = {
      requestAnimationFrame(fn) {
        callbacks.set(++id, fn);
        return id;
      },
      cancelAnimationFrame(id) {
        callbacks.delete(id);
      },
    };
  const scheduler = createScheduler(host),
    order = [];
  scheduler.request(() => order.push("write"));
  scheduler.request(() => {
    order.push("read");
    scheduler.request(() => order.push("write2"));
  }, "read");
  assert.equal(callbacks.size, 1);
  const flush = [...callbacks.values()][0];
  callbacks.clear();
  flush(0);
  assert.deepEqual(order, ["read", "write", "write2"]);
  scheduler.request(() => order.push("cancelled"));
  scheduler.dispose();
  assert.equal(callbacks.size, 0);
});
test("all 30 frames play forward, hold, reverse and loop with the original timing", () => {
  const order = [];
  for (let t = 0; t < 6.63; t += 0.01) {
    const i = receiverFrameAt(t);
    assert(i >= 0 && i < 30);
    if (order.at(-1) !== i) order.push(i);
  }
  assert.deepEqual(order, [
    ...Array(30).keys(),
    ...Array.from({ length: 29 }, (_, i) => 28 - i),
  ]);
  assert.equal(FRAME_DURATION, 0.08);
  assert.equal(FRAME_PAUSE, 1);
  assert.equal(receiverFrameAt(0.99), 0);
  assert.equal(receiverFrameAt(3.4), 29);
  assert.equal(receiverFrameAt(4.0), 29);
});
test("registration validates whitespace, email and phone without sending data", () => {
  assert(validateField("name", "  "));
  assert(validateField("email", "test"));
  assert(validateField("phone", "123"));
  assert(validateField("phone", "+7invalid123456789"));
  assert.equal(validateField("email", "test@example.ru"), "");
  assert.equal(validateField("phone", "+7 (999) 123-45-67"), "");
  assert.equal(validateField("name", "Анна Петрова"), "");
});

 test("registration matches Figma email and phone errors", () => {
  assert.equal(validateField("email", ""), "Укажите почту");
  assert.equal(validateField("email", "akk@vm", { typeMismatch: false }), "Проверьте адрес почты");
  assert.equal(validateField("phone", "+7 "), "Укажите телефон");
  assert.equal(validateField("phone", "+7 121 718-72-8"), "Номер телефона должен быть из 10 цифр");
  assert.equal(validateField("phone", "+7 121 718-72-88"), "Номер телефона может начинаться на 3, 4, 5, 6, 8, 9");
  assert.equal(validateField("phone", "+7 913-123-45-67"), "");
});
