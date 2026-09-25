export function writeServerLog(logger, level, event, details = {}) {
  const write = logger?.[level];
  if (typeof write !== "function") return;
  write.call(
    logger,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      scope: "registration",
      event,
      ...details,
    }),
  );
}
