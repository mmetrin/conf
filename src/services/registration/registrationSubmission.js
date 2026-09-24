import {
  registrationFields,
  validateField,
} from "../../../shared/registrationValidation.js";
import {
  SendsayFormError,
  submitRegistrationToSendsay,
} from "../sendsay/sendsayFormClient.js";

const SENDSAY_TECHNICAL_ERROR_KINDS = new Set([
  "configuration",
  "network",
  "timeout",
  "http",
  "unexpected_response",
]);

export function canUseTestModeFallback(error) {
  return (
    error instanceof SendsayFormError &&
    SENDSAY_TECHNICAL_ERROR_KINDS.has(error.kind)
  );
}

export function normalizeRegistrationFields(input) {
  return Object.fromEntries(
    registrationFields.map(({ name }) => [
      name,
      typeof input?.[name] === "string"
        ? input[name].normalize("NFC").trim().replace(/\s+/g, " ")
        : "",
    ]),
  );
}

export async function submitConferenceRegistration(
  { fields, honeypot = "" },
  options = {},
) {
  if (honeypot !== "") return { ok: false, kind: "honeypot" };

  const normalized = normalizeRegistrationFields(fields);
  const fieldErrors = Object.fromEntries(
    registrationFields.map(({ name }) => [
      name,
      validateField(name, normalized[name]),
    ]),
  );
  if (Object.values(fieldErrors).some(Boolean)) {
    return { ok: false, kind: "validation", fieldErrors };
  }

  await submitRegistrationToSendsay(normalized, options);
  return { ok: true, fields: normalized };
}

export async function notifyOrganizer(
  fields,
  idempotencyKey,
  {
    fetchImpl = fetch,
    timeoutMs = 15_000,
    sendsayFallback = false,
    reminderConsent = false,
  } = {},
) {
  try {
    const headers = {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    };
    if (sendsayFallback) headers["X-Sendsay-Fallback"] = "true";
    const response = await fetchImpl("/api/register", {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify({ ...fields, website: "", reminderConsent }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true;
  } catch {
    return false;
  }
}
