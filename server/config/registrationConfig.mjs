import { ConfigurationError } from "../errors.mjs";

export const MAX_BODY_BYTES = 8192;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const MAX_RATE_LIMIT_BUCKETS = 10000;
export const SENDSAY_IMPORT_TIMEOUT_MS = 10000;

function readRequired(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigurationError(`${name} is required`);
  }
  return value.trim();
}

function readBoolean(env, name, defaultValue) {
  const value = env[name];
  if (value === undefined || value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ConfigurationError(`${name} must be true or false`);
}

function readAppOrigin(env) {
  const value = readRequired(env, "APP_ORIGIN");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError("APP_ORIGIN must be a valid URL");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.origin !== value
  ) {
    throw new ConfigurationError("APP_ORIGIN must be an exact HTTP(S) origin");
  }
  return value;
}

function readOptionalSendsayWebhookUrl(env) {
  const value = env.SENDSAY_IMPORT_WEBHOOK_URL?.trim();
  if (!value) return undefined;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigurationError(
      "SENDSAY_IMPORT_WEBHOOK_URL must be a valid URL",
    );
  }

  const isSendsayHost =
    parsed.hostname === "sendsay.ru" || parsed.hostname.endsWith(".sendsay.ru");
  if (
    parsed.protocol !== "https:" ||
    !isSendsayHost ||
    !parsed.pathname.startsWith("/backend/api/") ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new ConfigurationError(
      "SENDSAY_IMPORT_WEBHOOK_URL must be an HTTPS Sendsay JSON import URL",
    );
  }

  return value;
}

export function getRegistrationConfig(env = process.env) {
  return {
    appOrigin: readAppOrigin(env),
    maxBodyBytes: MAX_BODY_BYTES,
    trustLocalProxy: readBoolean(env, "TRUST_LOCAL_PROXY", false),
    rateLimit: {
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxEntries: MAX_RATE_LIMIT_BUCKETS,
    },
    sendsayImport: {
      webhookUrl: readOptionalSendsayWebhookUrl(env),
      timeoutMs: SENDSAY_IMPORT_TIMEOUT_MS,
    },
  };
}
