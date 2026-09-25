import { SendsayImportError } from "../errors.mjs";
import { writeServerLog } from "../logging.mjs";

export const REMINDER_CONSENT_VERSION = "2026-09-24";
export const EVENT_DATE_TIME = "2026-11-19 17:00:00";

export function createSendsayImportWebhook({
  fetchImpl = fetch,
  webhookUrl,
  timeoutMs,
  logger = console,
}) {
  return {
    async importParticipant({ fields, acceptedAt, requestId }) {
      const startedAt = Date.now();
      writeServerLog(logger, "info", "sendsay.request.started", {
        requestId,
      });
      let response;
      try {
        response = await fetchImpl(webhookUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberemail: fields.email,
            anketa: {
              event: {
                fullName: fields.name,
                phone: fields.phone,
                company: fields.company,
                jobTitle: fields.role,
                eventDate: EVENT_DATE_TIME,
              },
            },
            reminder_consent: true,
            reminder_consent_version: REMINDER_CONSENT_VERSION,
            reminder_consent_at: acceptedAt,
            source: "mts-ads-conference",
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        writeServerLog(logger, "error", "sendsay.request.failed", {
          requestId,
          durationMs: Date.now() - startedAt,
          reason:
            error?.name === "TimeoutError" || error?.name === "AbortError"
              ? "timeout"
              : "network",
        });
        throw new SendsayImportError("Sendsay import request failed", {
          cause: error,
        });
      }

      if (!response.ok) {
        writeServerLog(logger, "error", "sendsay.response.rejected", {
          requestId,
          durationMs: Date.now() - startedAt,
          status: response.status ?? null,
        });
        throw new SendsayImportError("Sendsay import was rejected");
      }

      if (
        response.headers?.get?.("content-type")?.includes("application/json")
      ) {
        let payload;
        try {
          payload = await response.json();
        } catch (error) {
          writeServerLog(logger, "error", "sendsay.response.invalid_json", {
            requestId,
            durationMs: Date.now() - startedAt,
            status: response.status ?? null,
          });
          throw new SendsayImportError("Sendsay returned invalid JSON", {
            cause: error,
          });
        }
        if (Array.isArray(payload?.errors) && payload.errors.length) {
          writeServerLog(logger, "error", "sendsay.response.errors", {
            requestId,
            durationMs: Date.now() - startedAt,
            status: response.status ?? null,
            errorIds: payload.errors
              .map((error) => error?.id)
              .filter((id) => typeof id === "string"),
          });
          throw new SendsayImportError("Sendsay import returned an error");
        }
      }
      writeServerLog(logger, "info", "sendsay.request.succeeded", {
        requestId,
        durationMs: Date.now() - startedAt,
        status: response.status ?? 200,
      });
    },
  };
}
