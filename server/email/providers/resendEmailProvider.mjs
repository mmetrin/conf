import { ConfigurationError, EmailDeliveryError } from "../../errors.mjs";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

export function createResendEmailProvider({
  fetchImpl = fetch,
  apiKey,
  timeoutMs,
}) {
  if (typeof fetchImpl !== "function") {
    throw new ConfigurationError("A fetch implementation is required");
  }
  if (typeof apiKey !== "string" || apiKey === "") {
    throw new ConfigurationError("EMAIL_API_KEY is required");
  }

  return {
    async sendEmail({ from, to, subject, text, idempotencyKey }) {
      try {
        const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `register-${idempotencyKey}`,
          },
          body: JSON.stringify({ from, to, subject, text }),
        });
        if (!response.ok) throw new EmailDeliveryError();
      } catch (error) {
        if (error instanceof EmailDeliveryError) throw error;
        throw new EmailDeliveryError("Resend request failed", { cause: error });
      }
    },
  };
}
