import { ConfigurationError, EmailDeliveryError } from "../errors.mjs";

const HEADER_BREAK = /[\r\n]/;

function validateHeaderValue(value, name) {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    HEADER_BREAK.test(value)
  ) {
    throw new ConfigurationError(`${name} is invalid`);
  }
  return value;
}

export function createEmailService({
  provider,
  fromAddress,
  organizerAddress,
  testMode = false,
  testRecipient,
}) {
  if (!provider || typeof provider.sendEmail !== "function") {
    throw new ConfigurationError(
      "Email provider must implement sendEmail(message)",
    );
  }

  const from = validateHeaderValue(fromAddress, "EMAIL_FROM");
  const recipient = validateHeaderValue(
    testMode ? testRecipient : organizerAddress,
    testMode ? "EMAIL_TEST_RECIPIENT" : "organizer address",
  );

  return {
    async sendEmail({ subject, text, idempotencyKey }) {
      validateHeaderValue(subject, "email subject");
      if (typeof text !== "string" || text === "") {
        throw new EmailDeliveryError("Email text is invalid");
      }
      await provider.sendEmail({
        from,
        to: [recipient],
        subject,
        text,
        idempotencyKey,
      });
    },
  };
}
