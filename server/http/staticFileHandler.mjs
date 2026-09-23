import { createReadStream as defaultCreateReadStream } from "node:fs";
import { stat as defaultStat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const COMPRESSIBLE_EXTENSIONS = new Set([".css", ".html", ".js", ".svg"]);
const NOT_FOUND_CODES = new Set(["ENOENT", "ENOTDIR"]);

function extensionFor(path) {
  const position = path.lastIndexOf(".");
  return position === -1 ? "" : path.slice(position).toLowerCase();
}

function isInsideRoot(root, path) {
  const pathFromRoot = relative(root, path);
  return (
    pathFromRoot !== "" &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  );
}

function hasDotfileSegment(pathname) {
  return pathname.split("/").some((segment) => segment.startsWith("."));
}

function selectEncodings(acceptEncoding) {
  const supported = new Map();
  for (const entry of String(acceptEncoding || "").split(",")) {
    const [token, ...parameters] = entry.trim().toLowerCase().split(";");
    if (!token) continue;
    const qualityParameter = parameters.find((parameter) =>
      parameter.trim().startsWith("q="),
    );
    const quality = qualityParameter
      ? Number(qualityParameter.trim().slice(2))
      : 1;
    supported.set(token, Number.isFinite(quality) ? quality : 0);
  }
  return ["br", "gzip"]
    .map((name) => ({
      name,
      quality: supported.get(name) ?? supported.get("*") ?? 0,
    }))
    .filter(({ quality }) => quality > 0)
    .sort(
      (left, right) =>
        right.quality - left.quality || (left.name === "br" ? -1 : 1),
    )
    .map(({ name }) => name);
}

function isFingerprintedAsset(relativePath) {
  return (
    /^app\/(?:chunks\/)?[A-Za-z0-9_-]+-[A-Za-z0-9]{8,}\.js$/.test(
      relativePath,
    ) || /^site-[a-f0-9]{8,}\.css$/i.test(relativePath)
  );
}

function cacheControlFor(relativePath, extension) {
  if (extension === ".html") return "no-cache";
  if (isFingerprintedAsset(relativePath))
    return "public, max-age=31536000, immutable";
  return "public, max-age=86400";
}

function createEtag(fileStat) {
  return `\"${fileStat.size.toString(16)}-${Math.trunc(fileStat.mtimeMs).toString(16)}\"`;
}

function notModified(req, etag, modifiedAt) {
  if (req.headers["if-none-match"] === etag) return true;
  const since = req.headers["if-modified-since"];
  if (typeof since !== "string") return false;
  const sinceTime = Date.parse(since);
  return Number.isFinite(sinceTime) && modifiedAt.getTime() <= sinceTime + 999;
}

function send(res, statusCode, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end();
}

function logStaticError(error, pathname) {
  console.error("Static file delivery failed", {
    code: error?.code,
    pathname,
  });
}

export function createStaticFileHandler({
  root,
  entryDocument,
  statFile = defaultStat,
  createReadStream = defaultCreateReadStream,
  onError = logStaticError,
}) {
  const staticRoot = resolve(root);

  async function findRepresentation(filePath, encodings) {
    for (const encoding of encodings) {
      const suffix = encoding === "br" ? ".br" : ".gz";
      try {
        const compressedPath = `${filePath}${suffix}`;
        const compressedStat = await statFile(compressedPath);
        if (compressedStat.isFile()) {
          return { path: compressedPath, encoding, stat: compressedStat };
        }
      } catch (error) {
        if (!NOT_FOUND_CODES.has(error.code)) throw error;
      }
    }
    return { path: filePath };
  }

  return async function staticFileHandler(req, res) {
    if (!["GET", "HEAD"].includes(req.method)) {
      return send(res, 405, { Allow: "GET, HEAD" });
    }

    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      return send(res, 400);
    }

    const requestedPath = pathname === "/" ? `/${entryDocument}` : pathname;
    if (
      requestedPath.includes("\0") ||
      hasDotfileSegment(requestedPath) ||
      requestedPath.endsWith(".br") ||
      requestedPath.endsWith(".gz")
    ) {
      return send(res, 404);
    }

    const filePath = resolve(staticRoot, `.${requestedPath}`);
    if (!isInsideRoot(staticRoot, filePath)) return send(res, 404);

    const extension = extensionFor(filePath);
    let originalStat;
    try {
      originalStat = await statFile(filePath);
    } catch (error) {
      if (NOT_FOUND_CODES.has(error.code)) return send(res, 404);
      onError(error, requestedPath);
      return send(res, 500);
    }
    if (!originalStat.isFile()) return send(res, 404);

    let representation;
    try {
      const encodings = COMPRESSIBLE_EXTENSIONS.has(extension)
        ? selectEncodings(req.headers["accept-encoding"])
        : undefined;
      representation = await findRepresentation(filePath, encodings || []);
      representation.stat ||= originalStat;
    } catch (error) {
      onError(error, requestedPath);
      return send(res, 500);
    }

    const relativePath = relative(staticRoot, filePath).split(sep).join("/");
    const etag = createEtag(representation.stat);
    const headers = {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Content-Length": representation.stat.size,
      "Cache-Control": cacheControlFor(relativePath, extension),
      ETag: etag,
      "Last-Modified": representation.stat.mtime.toUTCString(),
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    };
    if (COMPRESSIBLE_EXTENSIONS.has(extension))
      headers.Vary = "Accept-Encoding";
    if (representation.encoding)
      headers["Content-Encoding"] = representation.encoding;

    if (notModified(req, etag, representation.stat.mtime)) {
      delete headers["Content-Length"];
      return send(res, 304, headers);
    }
    if (req.method === "HEAD") return send(res, 200, headers);

    const stream = createReadStream(representation.path);
    stream.once("error", (error) => {
      onError(error, requestedPath);
      if (!res.headersSent) send(res, 500);
      else res.destroy(error);
    });
    stream.once("open", () => {
      res.writeHead(200, headers);
      stream.pipe(res);
    });
  };
}
