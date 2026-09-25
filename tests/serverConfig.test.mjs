import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiServerConfig,
  createServerConfig,
  createSpaServerConfig,
} from "../server/config/serverConfig.mjs";

test("server configuration uses safe defaults and validates PORT", () => {
  const defaults = createServerConfig({});
  assert.equal(defaults.host, "127.0.0.1");
  assert.equal(defaults.port, 53860);
  assert.equal(createSpaServerConfig({}).port, 53860);
  assert.equal(createApiServerConfig({}).port, 53861);
  assert.deepEqual(
    {
      host: createSpaServerConfig({
        SERVER_HOST: "0.0.0.0",
        SPA_HOST: "127.0.0.1",
      }).host,
      port: createSpaServerConfig({ SPA_PORT: "3000" }).port,
    },
    { host: "127.0.0.1", port: 3000 },
  );
  assert.deepEqual(
    {
      host: createApiServerConfig({
        SERVER_HOST: "0.0.0.0",
        API_HOST: "127.0.0.1",
      }).host,
      port: createApiServerConfig({ API_PORT: "4000" }).port,
    },
    { host: "127.0.0.1", port: 4000 },
  );
  assert.equal(
    createServerConfig({ PORT: "3000", SERVER_HOST: "0.0.0.0" }).port,
    3000,
  );
  assert.throws(() => createServerConfig({ PORT: "0" }), /PORT/);
  assert.throws(() => createServerConfig({ PORT: "not-a-number" }), /PORT/);
  assert.throws(() => createServerConfig({ SERVER_HOST: "  " }), /SERVER_HOST/);
  assert.throws(() => createSpaServerConfig({ SPA_PORT: "0" }), /SPA_PORT/);
  assert.throws(() => createApiServerConfig({ API_PORT: "nope" }), /API_PORT/);
});
