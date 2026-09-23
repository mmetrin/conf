import { buildRegistrationEmail } from "../email/registrationEmail.mjs";

export function createRegistrationService({ emailService }) {
  return {
    async registerConferenceParticipant({ fields, idempotencyKey }) {
      const message = buildRegistrationEmail(fields);
      await emailService.sendEmail({ ...message, idempotencyKey });
    },
  };
}
