import { buildRegistrationEmail } from "../email/registrationEmail.mjs";
import { ConfigurationError } from "../errors.mjs";

export function createRegistrationService({
  emailService,
  sendsayImporter,
  now = Date.now,
}) {
  return {
    async registerConferenceParticipant({
      fields,
      reminderConsent,
      idempotencyKey,
    }) {
      const message = buildRegistrationEmail(fields);
      const tasks = [emailService.sendEmail({ ...message, idempotencyKey })];

      if (reminderConsent) {
        tasks.push(
          sendsayImporter
            ? sendsayImporter.importParticipant({
                fields,
                acceptedAt: new Date(now()).toISOString(),
              })
            : Promise.reject(
                new ConfigurationError(
                  "SENDSAY_IMPORT_WEBHOOK_URL is required for reminder consent",
                ),
              ),
        );
      }

      const results = await Promise.allSettled(tasks);
      const requiredResult = reminderConsent ? results[1] : results[0];
      const failure =
        requiredResult.status === "rejected" ? requiredResult : undefined;
      if (failure) throw failure.reason;
    },
  };
}
