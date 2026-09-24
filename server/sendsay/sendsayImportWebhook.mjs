import { SendsayImportError } from "../errors.mjs";

export const REMINDER_CONSENT_VERSION = "2026-09-24";
export const EVENT_DATE_TIME = "2026-11-19 17:00:00";

export function createSendsayImportWebhook({
  fetchImpl = fetch,
  webhookUrl,
  timeoutMs,
}) {
  return {
    async importParticipant({ fields, acceptedAt }) {
      let response;
      try {
        response = await fetchImpl(webhookUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: fields.email,
            name: fields.name,
            phone: fields.phone,
            company: fields.company,
            role: fields.role,
            event_datetime: EVENT_DATE_TIME,
            reminder_consent: true,
            reminder_consent_version: REMINDER_CONSENT_VERSION,
            reminder_consent_at: acceptedAt,
            source: "mts-ads-conference",
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new SendsayImportError("Sendsay import request failed", {
          cause: error,
        });
      }

      if (!response.ok) {
        throw new SendsayImportError("Sendsay import was rejected");
      }

      if (
        response.headers?.get?.("content-type")?.includes("application/json")
      ) {
        let payload;
        try {
          payload = await response.json();
        } catch (error) {
          throw new SendsayImportError("Sendsay returned invalid JSON", {
            cause: error,
          });
        }
        if (Array.isArray(payload?.errors) && payload.errors.length) {
          throw new SendsayImportError("Sendsay import returned an error");
        }
      }
    },
  };
}
