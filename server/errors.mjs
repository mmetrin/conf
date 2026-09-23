export class ApplicationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class BadRequestError extends ApplicationError {
  constructor(message = "Invalid request", options) {
    super("BAD_REQUEST", message, options);
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message = "Invalid server configuration", options) {
    super("CONFIGURATION_ERROR", message, options);
  }
}

export class EmailDeliveryError extends ApplicationError {
  constructor(message = "Email delivery failed", options) {
    super("EMAIL_DELIVERY_ERROR", message, options);
  }
}
