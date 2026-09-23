import {
  getSendsayConfig,
  SendsayConfigurationError,
} from "./sendsayConfig.js";

export const SENDSAY_FORM_TIMEOUT_MS = 20_000;

export class SendsayFormError extends Error {
  constructor(kind, message, options) {
    super(message, options);
    this.name = "SendsayFormError";
    this.kind = kind;
  }
}

export function buildSendsayPayload(registration, config) {
  const payload = {
    _member_email: registration.email,
    [config.fields.name]: registration.name,
    [config.fields.phone]: registration.phone,
    [config.fields.company]: registration.company,
    [config.fields.role]: registration.role,
  };
  for (const mapped of [config.eventDateTime, config.eventId]) {
    if (mapped) payload[mapped.code] = mapped.value;
  }
  return payload;
}

function hasSuccessShape(body) {
  if (!body || Array.isArray(body) || typeof body !== "object") return false;
  return ["obj", "page", "redirect"].some((key) =>
    Object.prototype.hasOwnProperty.call(body, key),
  );
}

function formErrorKind(errors) {
  return errors.some((error) => error?.id === "wrong_member_email")
    ? "invalid_email"
    : "form_error";
}

export async function submitRegistrationToSendsay(
  registration,
  {
    config: explicitConfig,
    fetchImpl = fetch,
    timeoutMs = SENDSAY_FORM_TIMEOUT_MS,
  } = {},
) {
  let config;
  try {
    config = explicitConfig || getSendsayConfig();
  } catch (error) {
    if (error instanceof SendsayConfigurationError) {
      throw new SendsayFormError(
        "configuration",
        "Sendsay form is not configured",
        {
          cause: error,
        },
      );
    }
    throw error;
  }

  const endpoint = `https://sendsay.ru/form/${encodeURIComponent(config.account)}/${encodeURIComponent(config.formId)}/`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildSendsayPayload(registration, config)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut =
      error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new SendsayFormError(
      timedOut ? "timeout" : "network",
      timedOut ? "Sendsay request timed out" : "Sendsay request failed",
      { cause: error },
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new SendsayFormError(
      "unexpected_response",
      "Sendsay returned invalid JSON",
      {
        cause: error,
      },
    );
  }

  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new SendsayFormError(
      formErrorKind(body.errors),
      "Sendsay rejected the form",
    );
  }
  if (!response.ok) {
    throw new SendsayFormError("http", "Sendsay returned an HTTP error");
  }
  if (!hasSuccessShape(body)) {
    throw new SendsayFormError(
      "unexpected_response",
      "Sendsay response has no success data",
    );
  }

  return { ok: true, response: body };
}
