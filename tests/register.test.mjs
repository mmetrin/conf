import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { ConfigurationError } from "../server/errors.mjs";
import { createRegistrationHandler } from "../server/register.mjs";
import { createRegistrationService } from "../server/registration/registrationService.mjs";
import { createRateLimiter } from "../server/security/rateLimiter.mjs";

const WEBHOOK_URL =
  "https://be.sendsay.ru/backend/api/test-key/member.set/email/-/member.email,set.copy,email/";

const data = {
  name: "Тест Тестов",
  email: "test@example.ru",
  phone: "+7 913 123-45-67",
  company: "Example",
  role: "Test",
  website: "",
  reminderConsent: true,
};

const defaultEnv = {
  APP_ORIGIN: "https://example.test",
  SENDSAY_IMPORT_WEBHOOK_URL: WEBHOOK_URL,
};

async function fixture(t, options = {}) {
  const sendsayRequests = [];
  const logs = [];
  const logger =
    options.logger ||
    Object.fromEntries(
      ["info", "warn", "error"].map((level) => [
        level,
        (message) => logs.push({ level, ...JSON.parse(message) }),
      ]),
    );
  const handler = createRegistrationHandler({
    env: options.env || defaultEnv,
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
    now:
      options.now || (() => Date.parse("2026-09-24T12:00:00.000Z")),
    logger,
  });
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/api/register`;

  return {
    logs,
    sendsayRequests,
    async request(body = data, extra = {}) {
      const method = extra.method || "POST";
      const headers = {
        Origin: "https://example.test",
        "Content-Type": "application/json",
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

test("valid POST imports normalized consent data into Sendsay", async (t) => {
  const context = await fixture(t);
  const response = await context.request({
    ...data,
    name: "  Тест   Тестов  ",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://example.test",
  );
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(context.sendsayRequests.length, 1);
  assert.equal(context.sendsayRequests[0].url, WEBHOOK_URL);
  assert.equal(context.sendsayRequests[0].method, "POST");
  assert.equal(
    context.sendsayRequests[0].headers["Content-Type"],
    "application/json",
  );
  assert.deepEqual(context.sendsayRequests[0].json, {
    memberemail: data.email,
    anketa: {
      event: {
        fullName: data.name,
        phone: data.phone,
        company: data.company,
        jobTitle: data.role,
        eventDate: "2026-11-19 17:00:00",
      },
    },
    reminder_consent: true,
    reminder_consent_version: "2026-09-24",
    reminder_consent_at: "2026-09-24T12:00:00.000Z",
    source: "mts-ads-conference",
  });
  assert.deepEqual(
    context.logs.map(({ event }) => event),
    [
      "api.request.received",
      "sendsay.request.started",
      "sendsay.request.succeeded",
      "api.request.succeeded",
    ],
  );
  assert.equal(
    JSON.stringify(context.logs).includes(data.email),
    false,
    "server logs do not contain participant data",
  );
  assert.equal(
    JSON.stringify(context.logs).includes(WEBHOOK_URL),
    false,
    "server logs do not contain the webhook URL",
  );
});

test("accepts only the configured SPA origin for CORS preflight", async (t) => {
  const context = await fixture(t);
  const allowed = await context.request(undefined, {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
      "Content-Type": null,
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "https://example.test",
  );
  assert.equal(allowed.headers.get("access-control-allow-methods"), "POST");
  assert.equal(
    allowed.headers.get("access-control-allow-headers"),
    "Content-Type",
  );

  const blockedOrigin = await context.request(undefined, {
    method: "OPTIONS",
    headers: {
      Origin: "https://evil.test",
      "Access-Control-Request-Method": "POST",
      "Content-Type": null,
    },
  });
  assert.equal(blockedOrigin.status, 400);
  assert.equal(blockedOrigin.headers.get("access-control-allow-origin"), null);

  const blockedHeader = await context.request(undefined, {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization",
      "Content-Type": null,
    },
  });
  assert.equal(blockedHeader.status, 400);
});

test("rejects unknown fields, honeypot, missing consent and invalid fields", async (t) => {
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
    { reminderConsent: false },
    { reminderConsent: "true" },
  ]) {
    const context = await fixture(t);
    assert.equal((await context.request({ ...data, ...patch })).status, 400);
    assert.equal(context.sendsayRequests.length, 0);
  }
});

test("requires a configured working Sendsay webhook", async (t) => {
  const missing = await fixture(t, {
    env: { APP_ORIGIN: "https://example.test" },
  });
  assert.equal((await missing.request()).status, 500);
  assert.equal(missing.sendsayRequests.length, 0);

  const rejected = await fixture(t, {
    fetchSendsay: async () => ({ ok: false }),
  });
  assert.equal((await rejected.request()).status, 500);

  const applicationError = await fixture(t, {
    fetchSendsay: async () =>
      new Response(JSON.stringify({ errors: [{ id: "error/test" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  assert.equal((await applicationError.request()).status, 500);
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
    assert.equal(context.sendsayRequests.length, 0);
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
  assert.equal(chunked.sendsayRequests.length, 0);
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
    { SENDSAY_IMPORT_WEBHOOK_URL: WEBHOOK_URL },
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

test("Sendsay webhook HTTP and network failures remain generic", async (t) => {
  for (const fetchSendsay of [
    async () => ({ ok: false }),
    async () => {
      throw new Error("secret provider error");
    },
  ]) {
    const context = await fixture(t, { fetchSendsay });
    const response = await context.request();
    assert.equal(response.status, 500);
    assert.equal(await response.text(), '{"ok":false}');
  }
});

test("registration service imports through the Sendsay-only adapter", async () => {
  const imports = [];
  const registrationService = createRegistrationService({
    sendsayImporter: {
      importParticipant: async (input) => imports.push(input),
    },
    now: () => Date.parse("2026-09-24T12:00:00.000Z"),
  });

  await registrationService.registerConferenceParticipant({
    fields: data,
    requestId: "request-test",
  });
  assert.equal(imports.length, 1);
  assert.deepEqual(imports[0], {
    fields: data,
    acceptedAt: "2026-09-24T12:00:00.000Z",
    requestId: "request-test",
  });
});

test("registration service requires a Sendsay importer", async () => {
  const registrationService = createRegistrationService({});
  await assert.rejects(
    registrationService.registerConferenceParticipant({ fields: data }),
    ConfigurationError,
  );
});
