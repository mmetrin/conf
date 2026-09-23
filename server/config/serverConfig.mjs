import { resolve } from "node:path";

const DEFAULT_PORT = 53860;
const DEFAULT_HOST = "127.0.0.1";

function readPort(env) {
  const value = env.PORT;
  if (value === undefined || value === "") return DEFAULT_PORT;
  if (!/^\d+$/.test(value))
    throw new Error("PORT must be an integer between 1 and 65535");

  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function readHost(env) {
  const host = env.SERVER_HOST ?? DEFAULT_HOST;
  if (typeof host !== "string" || host.trim() === "") {
    throw new Error("SERVER_HOST must be a non-empty hostname or IP address");
  }
  return host.trim();
}

export function createServerConfig(env = process.env) {
  return {
    host: readHost(env),
    port: readPort(env),
    static: {
      root: resolve("outputs"),
      entryDocument: "mts-ads-portrait-frames-current.html",
    },
    timeouts: {
      requestTimeoutMs: 15000,
      headersTimeoutMs: 10000,
      keepAliveTimeoutMs: 5000,
    },
  };
}
