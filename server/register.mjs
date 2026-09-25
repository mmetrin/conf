import { getRegistrationConfig } from "./config/registrationConfig.mjs";
import { ConfigurationError } from "./errors.mjs";
import { writeServerLog } from "./logging.mjs";
import { createRegistrationHttpHandler } from "./registration/registrationHandler.mjs";
import { createRegistrationService } from "./registration/registrationService.mjs";
import { createSendsayImportWebhook } from "./sendsay/sendsayImportWebhook.mjs";
import { createClientIdentifier } from "./security/clientIp.mjs";
import { createRateLimiter } from "./security/rateLimiter.mjs";

export function createRegistrationHandler({
  env = process.env,
  fetchSendsay = fetch,
  now = Date.now,
  logger = console,
  failOnConfigurationError = false,
} = {}) {
  try {
    const config = getRegistrationConfig(env);
    const sendsayImporter = config.sendsayImport.webhookUrl
      ? createSendsayImportWebhook({
          fetchImpl: fetchSendsay,
          webhookUrl: config.sendsayImport.webhookUrl,
          timeoutMs: config.sendsayImport.timeoutMs,
          logger,
        })
      : undefined;
    const registrationService = createRegistrationService({
      sendsayImporter,
      now,
    });
    const rateLimiter = createRateLimiter({ ...config.rateLimit, now });

    return createRegistrationHttpHandler({
      appOrigin: config.appOrigin,
      maxBodyBytes: config.maxBodyBytes,
      trustLocalProxy: config.trustLocalProxy,
      rateLimiter,
      identifyClient: createClientIdentifier(),
      registrationService,
      logger,
    });
  } catch (error) {
    if (!(error instanceof ConfigurationError)) throw error;
    if (failOnConfigurationError) throw error;
    writeServerLog(logger, "error", "configuration.rejected", {
      code: error.code,
    });
    return createRegistrationHttpHandler({
      configurationError: error,
      logger,
    });
  }
}
