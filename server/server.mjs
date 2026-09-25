import http from "node:http";

export function createApplicationServer({
  registrationHandler,
  staticFileHandler,
}) {
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api/register") return registrationHandler(req, res);
    return staticFileHandler(req, res);
  });
}

export function createStaticServer({ staticFileHandler }) {
  return http.createServer(staticFileHandler);
}

export function createApiServer({ registrationHandler }) {
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api/register") return registrationHandler(req, res);
    res.writeHead(404, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end('{"ok":false}');
  });
}

export function configureServerTimeouts(server, timeouts) {
  server.requestTimeout = timeouts.requestTimeoutMs;
  server.headersTimeout = timeouts.headersTimeoutMs;
  server.keepAliveTimeout = timeouts.keepAliveTimeoutMs;
}
