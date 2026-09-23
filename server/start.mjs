import { createServerConfig } from "./config/serverConfig.mjs";
import { createStaticFileHandler } from "./http/staticFileHandler.mjs";
import { createRegistrationHandler } from "./register.mjs";
import { configureServerTimeouts, createApplicationServer } from "./server.mjs";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const config = createServerConfig();
const registrationHandler = createRegistrationHandler({
  failOnConfigurationError: true,
});
const staticFileHandler = createStaticFileHandler(config.static);
const server = createApplicationServer({
  registrationHandler,
  staticFileHandler,
});

configureServerTimeouts(server, config.timeouts);
server.listen(config.port, config.host);
