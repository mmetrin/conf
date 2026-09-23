import assert from "node:assert/strict";
import test from "node:test";
import { createServerConfig } from "../server/config/serverConfig.mjs";

test("server configuration uses safe defaults and validates PORT", () => {
  const defaults = createServerConfig({});
  assert.equal(defaults.host, "127.0.0.1");
  assert.equal(defaults.port, 53860);
  assert.equal(
    createServerConfig({ PORT: "3000", SERVER_HOST: "0.0.0.0" }).port,
    3000,
  );
  assert.throws(() => createServerConfig({ PORT: "0" }), /PORT/);
  assert.throws(() => createServerConfig({ PORT: "not-a-number" }), /PORT/);
  assert.throws(() => createServerConfig({ SERVER_HOST: "  " }), /SERVER_HOST/);
});
