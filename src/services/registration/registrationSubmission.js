import {
  registrationFields,
  validateField,
} from "../../../shared/registrationValidation.js";
import { submitRegistrationToSendsay } from "../sendsay/sendsayFormClient.js";

const REGISTRATION_API_URL =
  typeof __REGISTRATION_PUBLIC_CONFIG__ === "undefined"
    ? "/api/register"
    : __REGISTRATION_PUBLIC_CONFIG__.apiUrl;

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

export function prepareConferenceRegistration({ fields, honeypot = "" }) {
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

  return { ok: true, fields: normalized };
}

export async function submitConferenceRegistration(input, options = {}) {
  const prepared = prepareConferenceRegistration(input);
  if (!prepared.ok) return prepared;

  await submitRegistrationToSendsay(prepared.fields, options);
  return prepared;
}

export async function submitReminderConsent(
  fields,
  { fetchImpl = fetch, timeoutMs = 15_000 } = {},
) {
  try {
    const response = await fetchImpl(REGISTRATION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ...fields, website: "", reminderConsent: true }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true;
  } catch {
    return false;
  }
}
