import { resolve } from "node:path";

const DEFAULT_PORT = 53860;
const DEFAULT_API_PORT = 53861;
const DEFAULT_HOST = "127.0.0.1";

function readPort(env, name, defaultPort) {
  const value = env[name];
  if (value === undefined || value === "") return defaultPort;
  if (!/^\d+$/.test(value))
    throw new Error(`${name} must be an integer between 1 and 65535`);

  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

function readHost(env, name, fallbackName) {
  const host = env[name] ?? env[fallbackName] ?? DEFAULT_HOST;
  if (typeof host !== "string" || host.trim() === "") {
    throw new Error(`${name} must be a non-empty hostname or IP address`);
  }
  return host.trim();
}

export function createServerConfig(env = process.env) {
  return {
    host: readHost(env, "SERVER_HOST", "SERVER_HOST"),
    port: readPort(env, "PORT", DEFAULT_PORT),
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

export function createSpaServerConfig(env = process.env) {
  const base = createServerConfig(env);
  return {
    ...base,
    host: readHost(env, "SPA_HOST", "SERVER_HOST"),
    port: readPort(env, "SPA_PORT", DEFAULT_PORT),
  };
}

export function createApiServerConfig(env = process.env) {
  const base = createServerConfig(env);
  return {
    ...base,
    host: readHost(env, "API_HOST", "SERVER_HOST"),
    port: readPort(env, "API_PORT", DEFAULT_API_PORT),
  };
}
