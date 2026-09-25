import assert from "node:assert/strict";
import test from "node:test";
import {
  SendsayFormError,
  submitRegistrationToSendsay,
} from "../src/services/sendsay/sendsayFormClient.js";
import { getSendsayConfig } from "../src/services/sendsay/sendsayConfig.js";
import {
  prepareConferenceRegistration,
  submitConferenceRegistration,
  submitReminderConsent,
} from "../src/services/registration/registrationSubmission.js";

const fields = {
  name: "Анна Петрова",
  email: "anna@example.ru",
  phone: "+7 999 123-45-67",
  company: "МТС",
  role: "Маркетолог",
};

const config = getSendsayConfig({
  account: "account-code",
  formId: "production-form",
  testFormId: "test-form",
  useTestForm: true,
  fields: {
    name: "real_name_code",
    phone: "real_phone_code",
    company: "real_company_code",
    role: "real_role_code",
    eventDateTime: "real_event_datetime_code",
    eventId: "real_event_id_code",
  },
  eventDateTime: "2026-11-19 17:00:00",
  eventId: "mts-ads-2026",
});

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

test("valid registration uses the selected test form and configured field codes", async () => {
  let captured;
  const result = await submitRegistrationToSendsay(fields, {
    config,
    fetchImpl: async (url, request) => {
      captured = { url, request };
      return jsonResponse({ redirect: "https://example.test/thanks" });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(captured.url, "https://sendsay.ru/form/account-code/test-form/");
  assert.equal(captured.request.method, "POST");
  assert.deepEqual(captured.request.headers, {
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(captured.request.body), {
    _member_email: fields.email,
    real_name_code: fields.name,
    real_phone_code: fields.phone,
    real_company_code: fields.company,
    real_role_code: fields.role,
    real_event_datetime_code: "2026-11-19 17:00:00",
    real_event_id_code: "mts-ads-2026",
  });
  assert.equal("website" in JSON.parse(captured.request.body), false);
});

test("honeypot and invalid frontend data never call Sendsay", async () => {
  for (const input of [
    { fields, honeypot: "https://bot.test" },
    { fields: { ...fields, email: "not-an-email" }, honeypot: "" },
  ]) {
    let calls = 0;
    const result = await submitConferenceRegistration(input, {
      config,
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ obj: {} });
      },
    });
    assert.equal(result.ok, false);
    assert.equal(calls, 0);
  }
});

test("Sendsay validation and invalid-email errors are controlled failures", async () => {
  const cases = [
    [[{ id: "wrong_member_email", explain: "invalid" }], "invalid_email"],
    [[{ id: "required_field", explain: "missing" }], "form_error"],
    [
      [
        { id: "error/draft/emptyfromemail" },
        { id: "required_field", explain: "missing" },
      ],
      "form_error",
    ],
  ];
  for (const [errors, kind] of cases) {
    await assert.rejects(
      submitRegistrationToSendsay(fields, {
        config,
        fetchImpl: async () => jsonResponse({ errors }),
      }),
      (error) => error instanceof SendsayFormError && error.kind === kind,
    );
  }
});

test("a post-save empty draft sender warning still completes registration", async () => {
  const result = await submitRegistrationToSendsay(fields, {
    config,
    fetchImpl: async () =>
      jsonResponse({ errors: [{ id: "error/draft/emptyfromemail" }] }),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, [{ id: "error/draft/emptyfromemail" }]);
});

test("network errors and timeouts are distinguished", async () => {
  await assert.rejects(
    submitRegistrationToSendsay(fields, {
      config,
      fetchImpl: async () => {
        throw new TypeError("offline");
      },
    }),
    (error) => error instanceof SendsayFormError && error.kind === "network",
  );

  await assert.rejects(
    submitRegistrationToSendsay(fields, {
      config,
      timeoutMs: 5,
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    }),
    (error) => error instanceof SendsayFormError && error.kind === "timeout",
  );
});

test("HTTP, malformed JSON and unknown success responses are not successful", async () => {
  const cases = [
    [async () => jsonResponse({ obj: {} }, { ok: false, status: 503 }), "http"],
    [
      async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError();
        },
      }),
      "unexpected_response",
    ],
    [async () => jsonResponse({}), "unexpected_response"],
  ];
  for (const [fetchImpl, kind] of cases) {
    await assert.rejects(
      submitRegistrationToSendsay(fields, { config, fetchImpl }),
      (error) => error instanceof SendsayFormError && error.kind === kind,
    );
  }
});

test("missing public identifiers fail before a network request", async () => {
  let calls = 0;
  await assert.rejects(
    submitRegistrationToSendsay(fields, {
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ obj: {} });
      },
    }),
    (error) =>
      error instanceof SendsayFormError && error.kind === "configuration",
  );
  assert.equal(calls, 0);
});

test("reserved and duplicate field codes are rejected as configuration errors", () => {
  const base = {
    account: "account",
    formId: "form",
    useTestForm: false,
    fields: {
      name: "name_code",
      phone: "phone_code",
      company: "company_code",
      role: "role_code",
    },
  };
  assert.throws(() =>
    getSendsayConfig({
      ...base,
      fields: { ...base.fields, name: "_member_email" },
    }),
  );
  assert.throws(() =>
    getSendsayConfig({
      ...base,
      fields: { ...base.fields, role: "company_code" },
    }),
  );
  for (const invalidCode of ["field.name", "field-name"]) {
    assert.throws(() =>
      getSendsayConfig({
        ...base,
        fields: { ...base.fields, name: invalidCode },
      }),
    );
  }
});

test("reminder consent is validated without creating a Form API contact", async () => {
  const registered = prepareConferenceRegistration({ fields, honeypot: "" });
  assert.equal(registered.ok, true);
  let captured;
  const sent = await submitReminderConsent(registered.fields, {
    fetchImpl: async (url, request) => {
      captured = { url, request };
      return jsonResponse({ ok: true });
    },
  });

  assert.equal(sent, true);
  assert.equal(captured.url, "/api/register");
  assert.deepEqual(captured.request.headers, {
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(captured.request.body), {
    ...fields,
    website: "",
    reminderConsent: true,
  });
});

test("reminder consent request reports backend failures without throwing", async () => {
  assert.equal(
    await submitReminderConsent(fields, {
      fetchImpl: async () => jsonResponse({ ok: false }, { ok: false }),
    }),
    false,
  );
  assert.equal(
    await submitReminderConsent(fields, {
      fetchImpl: async () => {
        throw new Error("Sendsay unavailable");
      },
    }),
    false,
  );
});
