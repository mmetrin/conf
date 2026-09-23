import { ConfigurationError } from "../errors.mjs";

export const MAX_BODY_BYTES = 8192;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const MAX_RATE_LIMIT_BUCKETS = 10000;
export const EMAIL_TIMEOUT_MS = 10000;
export const PRODUCTION_ORGANIZER_ADDRESS = "mmetrindesign@gmail.com";

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

export function getRegistrationConfig(env = process.env) {
  const testMode = readBoolean(env, "EMAIL_TEST_MODE", false);
  const testRecipient = testMode
    ? readRequired(env, "EMAIL_TEST_RECIPIENT")
    : undefined;

  return {
    appOrigin: readAppOrigin(env),
    maxBodyBytes: MAX_BODY_BYTES,
    trustLocalProxy: readBoolean(env, "TRUST_LOCAL_PROXY", false),
    rateLimit: {
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxEntries: MAX_RATE_LIMIT_BUCKETS,
    },
    email: {
      apiKey: readRequired(env, "EMAIL_API_KEY"),
      fromAddress: readRequired(env, "EMAIL_FROM"),
      organizerAddress: PRODUCTION_ORGANIZER_ADDRESS,
      testMode,
      testRecipient,
      timeoutMs: EMAIL_TIMEOUT_MS,
    },
  };
}
