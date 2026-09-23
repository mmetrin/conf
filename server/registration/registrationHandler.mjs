import { ApplicationError, BadRequestError } from "../errors.mjs";
import { readJsonBody } from "../http/requestBody.mjs";
import { sendRegistrationResponse } from "../http/response.mjs";
import { resolveClientIp } from "../security/clientIp.mjs";
import {
  validateAndNormalizeRegistration,
  validateIdempotencyKey,
} from "./registrationValidation.mjs";

const JSON_CONTENT_TYPE = /^application\/json(?:\s*;.*)?$/i;

export function createRegistrationHttpHandler({
  appOrigin,
  allowSendsayFallback = false,
  maxBodyBytes,
  trustLocalProxy,
  rateLimiter,
  identifyClient,
  registrationService,
  configurationError,
}) {
  return async function registrationHandler(req, res) {
    if (req.method !== "POST") return sendRegistrationResponse(res, 405);
    if (!JSON_CONTENT_TYPE.test(req.headers["content-type"] || "")) {
      return sendRegistrationResponse(res, 400);
    }
    if (configurationError) return sendRegistrationResponse(res, 500);
    if (req.headers.origin !== appOrigin)
      return sendRegistrationResponse(res, 400);
    const sendsayFallback = req.headers["x-sendsay-fallback"];
    if (
      ![undefined, "true"].includes(sendsayFallback) ||
      (sendsayFallback === "true" && !allowSendsayFallback)
    )
      return sendRegistrationResponse(res, 400);

    try {
      const address = resolveClientIp(req, { trustLocalProxy });
      const identifier = identifyClient(address);
      if (!rateLimiter.consume(identifier))
        return sendRegistrationResponse(res, 429);

      const input = await readJsonBody(req, { maxBytes: maxBodyBytes });
      const fields = validateAndNormalizeRegistration(input);
      const idempotencyKey = validateIdempotencyKey(
        req.headers["idempotency-key"],
      );
      await registrationService.registerConferenceParticipant({
        fields,
        idempotencyKey,
      });
      return sendRegistrationResponse(res, 200);
    } catch (error) {
      if (error instanceof BadRequestError)
        return sendRegistrationResponse(res, 400);
      if (error instanceof ApplicationError)
        return sendRegistrationResponse(res, 500);
      return sendRegistrationResponse(res, 500);
    }
  };
}
