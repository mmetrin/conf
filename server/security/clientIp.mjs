import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

const LOCAL_PROXY_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function resolveClientIp(req, { trustLocalProxy }) {
  const remoteAddress = req.socket.remoteAddress;
  const realIp = req.headers["x-real-ip"];
  const canTrustRealIp =
    trustLocalProxy &&
    LOCAL_PROXY_ADDRESSES.has(remoteAddress) &&
    typeof realIp === "string" &&
    isIP(realIp) !== 0;

  return canTrustRealIp ? realIp : remoteAddress || "unknown";
}

export function createClientIdentifier({ salt = randomBytes(32) } = {}) {
  return function identifyClient(address) {
    return createHmac("sha256", salt).update(address).digest("hex");
  };
}
