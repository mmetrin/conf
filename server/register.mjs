import { getRegistrationConfig } from "./config/registrationConfig.mjs";
import { createEmailService } from "./email/emailService.mjs";
import { createResendEmailProvider } from "./email/providers/resendEmailProvider.mjs";
import { ConfigurationError } from "./errors.mjs";
import { createRegistrationHttpHandler } from "./registration/registrationHandler.mjs";
import { createRegistrationService } from "./registration/registrationService.mjs";
import { createClientIdentifier } from "./security/clientIp.mjs";
import { createRateLimiter } from "./security/rateLimiter.mjs";

export function createRegistrationHandler({
  env = process.env,
  fetchEmail = fetch,
  now = Date.now,
  failOnConfigurationError = false,
} = {}) {
  try {
    const config = getRegistrationConfig(env);
    const provider = createResendEmailProvider({
      fetchImpl: fetchEmail,
      apiKey: config.email.apiKey,
      timeoutMs: config.email.timeoutMs,
    });
    const emailService = createEmailService({
      provider,
      fromAddress: config.email.fromAddress,
      organizerAddress: config.email.organizerAddress,
      testMode: config.email.testMode,
      testRecipient: config.email.testRecipient,
    });
    const registrationService = createRegistrationService({ emailService });
    const rateLimiter = createRateLimiter({ ...config.rateLimit, now });

    return createRegistrationHttpHandler({
      appOrigin: config.appOrigin,
      allowSendsayFallback: config.email.testMode,
      maxBodyBytes: config.maxBodyBytes,
      trustLocalProxy: config.trustLocalProxy,
      rateLimiter,
      identifyClient: createClientIdentifier(),
      registrationService,
    });
  } catch (error) {
    if (!(error instanceof ConfigurationError)) throw error;
    if (failOnConfigurationError) throw error;
    return createRegistrationHttpHandler({ configurationError: error });
  }
}
