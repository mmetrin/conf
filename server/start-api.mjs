import { createApiServerConfig } from "./config/serverConfig.mjs";
import { createRegistrationHandler } from "./register.mjs";
import { configureServerTimeouts, createApiServer } from "./server.mjs";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const config = createApiServerConfig();
const server = createApiServer({
  registrationHandler: createRegistrationHandler({
    failOnConfigurationError: true,
  }),
});

configureServerTimeouts(server, config.timeouts);
server.listen(config.port, config.host);
