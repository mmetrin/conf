const BUILD_CONFIG =
  typeof __SENDSAY_PUBLIC_CONFIG__ === "undefined"
    ? {}
    : __SENDSAY_PUBLIC_CONFIG__;

const FIELD_CODE = /^[A-Za-z0-9_]+$/;

export class SendsayConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SendsayConfigurationError";
  }
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new SendsayConfigurationError(`${name} is required`);
  }
  return value.trim();
}

function fieldCode(value, name) {
  const code = requiredString(value, name);
  if (!FIELD_CODE.test(code)) {
    throw new SendsayConfigurationError(
      `${name} is not a valid Sendsay field code`,
    );
  }
  if (["_member_email", "_member_id"].includes(code)) {
    throw new SendsayConfigurationError(
      `${name} uses a reserved Form API parameter`,
    );
  }
  return code;
}

function optionalMappedValue(code, value, name) {
  const hasCode = typeof code === "string" && code.trim() !== "";
  const hasValue = typeof value === "string" && value.trim() !== "";
  if (!hasCode && !hasValue) return null;
  if (!hasCode || !hasValue) {
    throw new SendsayConfigurationError(
      `${name} code and value must be configured together`,
    );
  }
  return {
    code: fieldCode(code, `${name} code`),
    value: value.trim(),
  };
}

export function getSendsayConfig(source = BUILD_CONFIG) {
  const useTestForm = source.useTestForm === true;
  const selectedFormId = useTestForm ? source.testFormId : source.formId;
  const eventDateTime = optionalMappedValue(
    source.fields?.eventDateTime,
    source.eventDateTime,
    "Sendsay event datetime",
  );
  const eventId = optionalMappedValue(
    source.fields?.eventId,
    source.eventId,
    "Sendsay event identifier",
  );

  const fields = Object.freeze({
    name: fieldCode(source.fields?.name, "SENDSAY_FIELD_NAME"),
    phone: fieldCode(source.fields?.phone, "SENDSAY_FIELD_PHONE"),
    company: fieldCode(source.fields?.company, "SENDSAY_FIELD_COMPANY"),
    role: fieldCode(source.fields?.role, "SENDSAY_FIELD_ROLE"),
  });
  const codes = [
    ...Object.values(fields),
    eventDateTime?.code,
    eventId?.code,
  ].filter(Boolean);
  if (new Set(codes).size !== codes.length) {
    throw new SendsayConfigurationError("Sendsay field codes must be unique");
  }

  return Object.freeze({
    account: requiredString(source.account, "SENDSAY_ACCOUNT"),
    formId: requiredString(
      selectedFormId,
      useTestForm ? "SENDSAY_TEST_FORM_ID" : "SENDSAY_FORM_ID",
    ),
    mode: useTestForm ? "test" : "production",
    fields,
    eventDateTime,
    eventId,
  });
}
