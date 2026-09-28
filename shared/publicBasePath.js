export function readPublicBasePath(env = process.env) {
  const value = env.PUBLIC_BASE_PATH?.trim() || "/";
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value)) {
    throw new Error(
      "PUBLIC_BASE_PATH must be a root-relative directory ending with /",
    );
  }
  return value;
}
