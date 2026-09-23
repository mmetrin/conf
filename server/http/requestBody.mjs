import { TextDecoder } from "node:util";
import { BadRequestError } from "../errors.mjs";

function contentLengthExceedsLimit(value, maxBytes) {
  if (value === undefined) return false;
  if (Array.isArray(value) || !/^\d+$/.test(value)) throw new BadRequestError();
  return Number(value) > maxBytes;
}

export async function readJsonBody(req, { maxBytes }) {
  if (contentLengthExceedsLimit(req.headers["content-length"], maxBytes)) {
    throw new BadRequestError();
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBytes) throw new BadRequestError();
    chunks.push(buffer);
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    return JSON.parse(text);
  } catch (error) {
    throw new BadRequestError("Request body must be valid UTF-8 JSON", {
      cause: error,
    });
  }
}
