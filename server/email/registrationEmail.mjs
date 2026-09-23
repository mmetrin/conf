import { registrationFields } from "../../shared/registrationValidation.js";

export const REGISTRATION_EMAIL_SUBJECT = "Новая регистрация на конференцию";

export function buildRegistrationEmail(fields) {
  const lines = registrationFields.map((field) => {
    const label = field.label.replace(/\*$/, "");
    return `${label}: ${fields[field.name]}`;
  });
  return {
    subject: REGISTRATION_EMAIL_SUBJECT,
    text: `${REGISTRATION_EMAIL_SUBJECT}\n\n${lines.join("\n")}`,
  };
}
