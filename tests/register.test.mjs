import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createEmailService } from "../server/email/emailService.mjs";
import { createResendEmailProvider } from "../server/email/providers/resendEmailProvider.mjs";
import { EmailDeliveryError } from "../server/errors.mjs";
import { createRegistrationHandler } from "../server/register.mjs";
import { createRegistrationService } from "../server/registration/registrationService.mjs";
import { createRateLimiter } from "../server/security/rateLimiter.mjs";

const data = {
  name: "Тест Тестов",
  email: "test@example.ru",
  phone: "+7 913 123-45-67",
  company: "Example",
  role: "Test",
  website: "",
  reminderConsent: false,
};

const defaultEnv = {
  APP_ORIGIN: "https://example.test",
  EMAIL_API_KEY: "test-only",
  EMAIL_FROM: "events@example.test",
};

async function fixture(t, options = {}) {
  const requests = [];
  const sendsayRequests = [];
  const fetchEmail =
    options.fetchEmail ||
    (async (url, request) => {
      requests.push({ url, ...request, json: JSON.parse(request.body) });
      return { ok: true };
    });
  const handler = createRegistrationHandler({
    env: options.env || defaultEnv,
    fetchEmail,
    fetchSendsay:
      options.fetchSendsay ||
      (async (url, request) => {
        sendsayRequests.push({
          url,
          ...request,
          json: JSON.parse(request.body),
        });
        return { ok: true };
      }),
    now: options.now,
  });
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/api/register`;

  return {
    requests,
    sendsayRequests,
    async request(body = data, extra = {}) {
      const method = extra.method || "POST";
      const headers = {
        Origin: "https://example.test",
        "Content-Type": "application/json",
        "Idempotency-Key": "test-request-12345678",
        ...extra.headers,
      };
      for (const [name, value] of Object.entries(headers)) {
        if (value === null) delete headers[name];
      }
      const requestBody =
        extra.body !== undefined ? extra.body : JSON.stringify(body);
      return fetch(url, {
        method,
        headers,
        body: ["GET", "HEAD"].includes(method) ? undefined : requestBody,
      });
    },
    requestChunked(body) {
      return new Promise((resolve, reject) => {
        const request = http.request(
          url,
          {
            method: "POST",
            headers: {
              Origin: "https://example.test",
              "Content-Type": "application/json",
              "Idempotency-Key": "test-request-12345678",
            },
          },
          (response) => {
            response.resume();
            response.on("end", () => resolve(response));
          },
        );
        request.on("error", reject);
        request.write(body.slice(0, 5000));
        request.end(body.slice(5000));
      });
    },
  };
}

test("valid POST keeps the public response and sends every normalized field", async (t) => {
  const context = await fixture(t);
  const response = await context.request({
    ...data,
    name: "  Тест   Тестов  ",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(context.requests.length, 1);
  const message = context.requests[0].json;
  assert.deepEqual(message.to, ["mmetrindesign@gmail.com"]);
  assert.equal(message.from, "events@example.test");
  assert.equal(message.subject, "Новая регистрация на конференцию");
  assert.match(message.text, /Тест Тестов/);
  for (const field of ["email", "phone", "company", "role"]) {
    assert(message.text.includes(data[field]));
  }
});

test("test and production recipient selection is provider-independent", async () => {
  const productionMessages = [];
  const testMessages = [];
  const provider = (messages) => ({
    sendEmail: async (message) => messages.push(message),
  });
  const production = createEmailService({
    provider: provider(productionMessages),
    fromAddress: "events@example.test",
    organizerAddress: "organizer@example.test",
    testMode: false,
    testRecipient: "ignored@example.test",
  });
  const testing = createEmailService({
    provider: provider(testMessages),
    fromAddress: "events@example.test",
    organizerAddress: "organizer@example.test",
    testMode: true,
    testRecipient: "qa@example.test",
  });

  await production.sendEmail({
    subject: "Subject",
    text: "Body",
    idempotencyKey: "request-key-123456",
  });
  await testing.sendEmail({
    subject: "Subject",
    text: "Body",
    idempotencyKey: "request-key-123456",
  });
  assert.deepEqual(productionMessages[0].to, ["organizer@example.test"]);
  assert.deepEqual(testMessages[0].to, ["qa@example.test"]);
});

test("EMAIL_TEST_MODE sends only to the server-side test recipient", async (t) => {
  const context = await fixture(t, {
    env: {
      ...defaultEnv,
      EMAIL_TEST_MODE: "true",
      EMAIL_TEST_RECIPIENT: "qa-recipient@example.test",
    },
  });
  assert.equal((await context.request()).status, 200);
  assert.deepEqual(context.requests[0].json.to, ["qa-recipient@example.test"]);
});

test("Sendsay fallback is accepted only in email test mode", async (t) => {
  const production = await fixture(t);
  assert.equal(
    (
      await production.request(data, {
        headers: { "X-Sendsay-Fallback": "true" },
      })
    ).status,
    400,
  );
  assert.equal(production.requests.length, 0);

  const testing = await fixture(t, {
    env: {
      ...defaultEnv,
      EMAIL_TEST_MODE: "true",
      EMAIL_TEST_RECIPIENT: "qa-recipient@example.test",
    },
  });
  assert.equal(
    (
      await testing.request(data, {
        headers: { "X-Sendsay-Fallback": "true" },
      })
    ).status,
    200,
  );
  assert.deepEqual(testing.requests[0].json.to, ["qa-recipient@example.test"]);
});

test("client cannot override recipient or sender", async (t) => {
  for (const patch of [
    { to: "other@example.test" },
    { recipient: "other@example.test" },
    { emailTo: "other@example.test" },
    { from: "attacker@example.test" },
  ]) {
    const context = await fixture(t);
    assert.equal((await context.request({ ...data, ...patch })).status, 400);
    assert.equal(context.requests.length, 0);
  }
});

test("rejects unknown fields, honeypot, control characters and invalid fields", async (t) => {
  for (const patch of [
    { unexpected: "value" },
    { website: "bot" },
    { name: "x\r\nBcc: x@example.test" },
    { email: "akk@vm" },
    { phone: "123" },
    { company: "" },
    { name: "Я" },
    { company: "X" },
    { role: "Я" },
    { reminderConsent: "true" },
  ]) {
    const context = await fixture(t);
    assert.equal((await context.request({ ...data, ...patch })).status, 400);
    assert.equal(context.requests.length, 0);
  }
});

test("reminder consent imports the contact through the server-only Sendsay webhook", async (t) => {
  const webhookUrl =
    "https://be.sendsay.ru/backend/api/test-key/member.set/email/-/member.email,set.copy,email/";
  const context = await fixture(t, {
    env: { ...defaultEnv, SENDSAY_IMPORT_WEBHOOK_URL: webhookUrl },
    now: () => Date.parse("2026-09-24T12:00:00.000Z"),
  });

  assert.equal((await context.request()).status, 200);
  assert.equal(context.sendsayRequests.length, 0);

  assert.equal(
    (await context.request({ ...data, reminderConsent: true })).status,
    200,
  );
  assert.equal(context.sendsayRequests.length, 1);
  assert.equal(context.sendsayRequests[0].url, webhookUrl);
  assert.equal(context.sendsayRequests[0].method, "POST");
  assert.equal(
    context.sendsayRequests[0].headers["Content-Type"],
    "application/json",
  );
  assert.deepEqual(context.sendsayRequests[0].json, {
    email: data.email,
    name: data.name,
    phone: data.phone,
    company: data.company,
    role: data.role,
    event_datetime: "2026-11-19 17:00:00",
    reminder_consent: true,
    reminder_consent_version: "2026-09-24",
    reminder_consent_at: "2026-09-24T12:00:00.000Z",
    source: "mts-ads-conference",
  });
});

test("reminder consent requires a configured working Sendsay webhook", async (t) => {
  const missing = await fixture(t);
  assert.equal(
    (await missing.request({ ...data, reminderConsent: true })).status,
    500,
  );
  assert.equal(
    missing.requests.length,
    1,
    "organizer email is still attempted",
  );

  const rejected = await fixture(t, {
    env: {
      ...defaultEnv,
      SENDSAY_IMPORT_WEBHOOK_URL:
        "https://be.sendsay.ru/backend/api/test-key/member.set/email/-/member.email,set.copy,email/",
    },
    fetchSendsay: async () => ({ ok: false }),
  });
  assert.equal(
    (await rejected.request({ ...data, reminderConsent: true })).status,
    500,
  );

  const applicationError = await fixture(t, {
    env: {
      ...defaultEnv,
      SENDSAY_IMPORT_WEBHOOK_URL:
        "https://be.sendsay.ru/backend/api/test-key/member.set/email/-/member.email,set.copy,email/",
    },
    fetchSendsay: async () =>
      new Response(JSON.stringify({ errors: [{ id: "error/test" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  assert.equal(
    (await applicationError.request({ ...data, reminderConsent: true })).status,
    500,
  );
});

test("requires a valid idempotency key", async (t) => {
  for (const key of [null, "short", "invalid_header_value!"]) {
    const context = await fixture(t);
    const response = await context.request(data, {
      headers: { "Idempotency-Key": key },
    });
    assert.equal(response.status, 400);
    assert.equal(context.requests.length, 0);
  }
});

test("enforces method, content type, origin and JSON parsing", async (t) => {
  const cases = [
    [{ method: "GET" }, 405],
    [{ headers: { "Content-Type": "text/plain" } }, 400],
    [{ headers: { Origin: "https://evil.test" } }, 400],
    [{ body: "{" }, 400],
  ];
  for (const [extra, status] of cases) {
    const context = await fixture(t);
    const response = await context.request(data, extra);
    assert.equal(response.status, status);
    assert.equal(context.requests.length, 0);
    if (status === 405) assert.equal(response.headers.get("allow"), "POST");
  }
});

test("rejects oversized bodies by Content-Length and actual chunk count", async (t) => {
  const byLength = await fixture(t);
  assert.equal(
    (await byLength.request(data, { body: "x".repeat(9000) })).status,
    400,
  );

  const chunked = await fixture(t);
  assert.equal(
    (await chunked.requestChunked("x".repeat(9000))).statusCode,
    400,
  );
  assert.equal(chunked.requests.length, 0);
});

test("rate limit cannot be bypassed with an untrusted forwarding header", async (t) => {
  const context = await fixture(t);
  for (let index = 0; index < 5; index += 1) {
    assert.equal(
      (
        await context.request(data, {
          headers: { "X-Real-IP": `203.0.113.${index}` },
        })
      ).status,
      200,
    );
  }
  const response = await context.request(data, {
    headers: { "X-Real-IP": "198.51.100.1" },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "600");
});

test("rate limiter uses the injected clock and expires buckets", () => {
  let time = 0;
  const limiter = createRateLimiter({
    maxRequests: 1,
    windowMs: 100,
    maxEntries: 1,
    now: () => time,
  });
  assert.equal(limiter.consume("client-a"), true);
  assert.equal(limiter.consume("client-a"), false);
  assert.equal(limiter.consume("client-b"), false);
  time = 100;
  assert.equal(limiter.consume("client-b"), true);
});

test("missing or unsafe server configuration returns a generic 500", async (t) => {
  for (const env of [
    { APP_ORIGIN: "https://example.test", EMAIL_FROM: "events@example.test" },
    {
      ...defaultEnv,
      EMAIL_FROM: "events@example.test\r\nBcc: victim@example.test",
    },
    { ...defaultEnv, EMAIL_TEST_MODE: "true" },
    {
      ...defaultEnv,
      SENDSAY_IMPORT_WEBHOOK_URL: "http://be.sendsay.ru/backend/api/key",
    },
    {
      ...defaultEnv,
      SENDSAY_IMPORT_WEBHOOK_URL: "https://evil.test/backend/api/key",
    },
    {
      ...defaultEnv,
      SENDSAY_IMPORT_WEBHOOK_URL: "https://sendsay.ru/backend/tilda/test-token",
    },
  ]) {
    const context = await fixture(t, { env });
    const response = await context.request();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { ok: false });
  }
});

test("provider HTTP and network failures remain generic", async (t) => {
  for (const fetchEmail of [
    async () => ({ ok: false }),
    async () => {
      throw new Error("secret provider error");
    },
  ]) {
    const context = await fixture(t, { fetchEmail });
    const response = await context.request();
    assert.equal(response.status, 500);
    assert.equal(await response.text(), '{"ok":false}');
  }
});

test("Resend provider times out and converts the failure", async () => {
  const provider = createResendEmailProvider({
    apiKey: "test-only",
    timeoutMs: 5,
    fetchImpl: async (_url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  });
  await assert.rejects(
    provider.sendEmail({
      from: "events@example.test",
      to: ["organizer@example.test"],
      subject: "Subject",
      text: "Body",
      idempotencyKey: "request-key-123456",
    }),
    EmailDeliveryError,
  );
});

test("Resend provider owns its endpoint, headers and payload", async () => {
  let captured;
  const provider = createResendEmailProvider({
    apiKey: "secret-test-key",
    timeoutMs: 100,
    fetchImpl: async (url, request) => {
      captured = { url, request };
      return { ok: true };
    },
  });
  const message = {
    from: "events@example.test",
    to: ["organizer@example.test"],
    subject: "Subject",
    text: "Body",
    idempotencyKey: "request-key-123456",
  };
  await provider.sendEmail(message);

  assert.equal(captured.url, "https://api.resend.com/emails");
  assert.equal(captured.request.method, "POST");
  assert.equal(
    captured.request.headers.Authorization,
    "Bearer secret-test-key",
  );
  assert.equal(
    captured.request.headers["Idempotency-Key"],
    "register-request-key-123456",
  );
  assert.deepEqual(JSON.parse(captured.request.body), {
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
});

test("registration service works with a provider-agnostic fake email service", async () => {
  const messages = [];
  const registrationService = createRegistrationService({
    emailService: {
      sendEmail: async (message) => messages.push(message),
    },
  });
  await registrationService.registerConferenceParticipant({
    fields: data,
    idempotencyKey: "request-key-123456",
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].subject, "Новая регистрация на конференцию");
  assert.equal(messages[0].idempotencyKey, "request-key-123456");
  assert.match(messages[0].text, /Тест Тестов/);
  assert.equal("to" in messages[0], false);
  assert.equal("from" in messages[0], false);
});

test("a successful consent import is not blocked by an organizer email failure", async () => {
  const imports = [];
  const registrationService = createRegistrationService({
    emailService: {
      sendEmail: async () => {
        throw new Error("email unavailable");
      },
    },
    sendsayImporter: {
      importParticipant: async (input) => imports.push(input),
    },
    now: () => Date.parse("2026-09-24T12:00:00.000Z"),
  });

  await registrationService.registerConferenceParticipant({
    fields: data,
    reminderConsent: true,
    idempotencyKey: "request-key-123456",
  });
  assert.equal(imports.length, 1);
  assert.equal(imports[0].acceptedAt, "2026-09-24T12:00:00.000Z");
});
