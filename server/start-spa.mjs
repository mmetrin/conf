import { createSpaServerConfig } from "./config/serverConfig.mjs";
import { createStaticFileHandler } from "./http/staticFileHandler.mjs";
import { configureServerTimeouts, createStaticServer } from "./server.mjs";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const config = createSpaServerConfig();
const server = createStaticServer({
  staticFileHandler: createStaticFileHandler(config.static),
});

configureServerTimeouts(server, config.timeouts);
server.listen(config.port, config.host);
