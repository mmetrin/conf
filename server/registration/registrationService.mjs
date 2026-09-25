import { ConfigurationError } from "../errors.mjs";

export function createRegistrationService({
  sendsayImporter,
  now = Date.now,
}) {
  return {
    async registerConferenceParticipant({ fields, requestId }) {
      if (!sendsayImporter) {
        throw new ConfigurationError(
          "SENDSAY_IMPORT_WEBHOOK_URL is required for reminder consent",
        );
      }
      await sendsayImporter.importParticipant({
        fields,
        acceptedAt: new Date(now()).toISOString(),
        requestId,
      });
    },
  };
}
