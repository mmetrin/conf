export function sendRegistrationResponse(res, statusCode) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (statusCode === 405) headers.Allow = "POST";
  if (statusCode === 429) headers["Retry-After"] = "600";

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify({ ok: statusCode === 200 }));
}
