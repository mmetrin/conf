import { randomUUID } from "node:crypto";
import { ApplicationError, BadRequestError } from "../errors.mjs";
import { readJsonBody } from "../http/requestBody.mjs";
import { sendRegistrationResponse } from "../http/response.mjs";
import { writeServerLog } from "../logging.mjs";
import { resolveClientIp } from "../security/clientIp.mjs";
import {
  validateAndNormalizeRegistration,
} from "./registrationValidation.mjs";

const JSON_CONTENT_TYPE = /^application\/json(?:\s*;.*)?$/i;
const CORS_REQUEST_HEADERS = new Set(["content-type"]);

function setCorsResponseHeaders(res, appOrigin) {
  res.setHeader("Access-Control-Allow-Origin", appOrigin);
  res.setHeader("Vary", "Origin");
}

function handlePreflight(req, res, appOrigin) {
  if (
    req.headers.origin !== appOrigin ||
    req.headers["access-control-request-method"] !== "POST"
  ) {
    return sendRegistrationResponse(res, 400);
  }

  const requestedHeaders = (req.headers["access-control-request-headers"] || "")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  if (requestedHeaders.some((header) => !CORS_REQUEST_HEADERS.has(header))) {
    return sendRegistrationResponse(res, 400);
  }

  setCorsResponseHeaders(res, appOrigin);
  res.writeHead(204, {
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
  });
  res.end();
}

export function createRegistrationHttpHandler({
  appOrigin,
  maxBodyBytes,
  trustLocalProxy,
  rateLimiter,
  identifyClient,
  registrationService,
  configurationError,
  logger = console,
}) {
  return async function registrationHandler(req, res) {
    if (req.method === "OPTIONS") {
      return handlePreflight(req, res, appOrigin);
    }
    const requestId = randomUUID();
    const startedAt = Date.now();
    res.setHeader("X-Request-ID", requestId);
    const respond = (status, event, level = "info", details = {}) => {
      writeServerLog(logger, level, event, {
        requestId,
        status,
        durationMs: Date.now() - startedAt,
        ...details,
      });
      return sendRegistrationResponse(res, status);
    };

    writeServerLog(logger, "info", "api.request.received", {
      requestId,
      method: req.method,
    });

    if (req.method !== "POST") {
      return respond(405, "api.request.rejected", "warn", {
        reason: "method_not_allowed",
      });
    }
    if (!JSON_CONTENT_TYPE.test(req.headers["content-type"] || "")) {
      return respond(400, "api.request.rejected", "warn", {
        reason: "invalid_content_type",
      });
    }
    if (configurationError) {
      return respond(500, "api.request.failed", "error", {
        reason: "configuration",
      });
    }
    if (req.headers.origin !== appOrigin) {
      return respond(400, "api.request.rejected", "warn", {
        reason: "origin",
      });
    }
    setCorsResponseHeaders(res, appOrigin);
    try {
      const address = resolveClientIp(req, { trustLocalProxy });
      const identifier = identifyClient(address);
      if (!rateLimiter.consume(identifier)) {
        return respond(429, "api.request.rejected", "warn", {
          reason: "rate_limit",
        });
      }

      const input = await readJsonBody(req, { maxBytes: maxBodyBytes });
      const { fields } = validateAndNormalizeRegistration(input);
      await registrationService.registerConferenceParticipant({
        fields,
        requestId,
      });
      return respond(200, "api.request.succeeded");
    } catch (error) {
      if (error instanceof BadRequestError) {
        return respond(400, "api.request.rejected", "warn", {
          reason: "validation",
        });
      }
      if (error instanceof ApplicationError) {
        return respond(500, "api.request.failed", "error", {
          reason: error.code,
        });
      }
      return respond(500, "api.request.failed", "error", {
        reason: "internal",
      });
    }
  };
}
