import { validateField } from "../../shared/registrationValidation.js";
import { BadRequestError } from "../errors.mjs";

export const REGISTRATION_FIELD_LIMITS = Object.freeze({
  name: 160,
  email: 254,
  phone: 40,
  company: 200,
  role: 200,
});

const ALLOWED_FIELDS = new Set([
  ...Object.keys(REGISTRATION_FIELD_LIMITS),
  "website",
]);
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;
const IDEMPOTENCY_KEY = /^[a-zA-Z0-9-]{16,80}$/;

export function validateAndNormalizeRegistration(input) {
  if (!input || Array.isArray(input) || typeof input !== "object") {
    throw new BadRequestError();
  }
  if (Object.keys(input).some((key) => !ALLOWED_FIELDS.has(key))) {
    throw new BadRequestError();
  }
  if (typeof input.website !== "string" || input.website !== "") {
    throw new BadRequestError();
  }

  const fields = {};
  for (const [name, maxLength] of Object.entries(REGISTRATION_FIELD_LIMITS)) {
    const value = input[name];
    if (
      typeof value !== "string" ||
      value.length > maxLength ||
      CONTROL_CHARACTERS.test(value)
    ) {
      throw new BadRequestError();
    }
    const normalized = value.normalize("NFC").trim().replace(/\s+/g, " ");
    if (validateField(name, normalized)) throw new BadRequestError();
    fields[name] = normalized;
  }
  return fields;
}

export function validateIdempotencyKey(value) {
  if (typeof value !== "string" || !IDEMPOTENCY_KEY.test(value)) {
    throw new BadRequestError();
  }
  return value;
}
