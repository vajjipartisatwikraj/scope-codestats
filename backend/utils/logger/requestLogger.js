/**
 * LogsEnhancer reference middleware: one log block per HTTP request.
 *
 *   const { requestLogger, errorCapture } = require("./requestLogger");
 *   app.use(requestLogger());          // first, before the routes
 *   ...routes...
 *   app.use(errorCapture);             // last, before your own error handler
 *
 * The request is logged when the response finishes, so the block holds the
 * status, the time and any error together, instead of several scattered lines.
 */
const crypto = require("crypto");
const logger = require("./logger");

const { clip, summarizeError, summarizeBody, shortId } = logger.util;

// Paths that would only add noise.
const DEFAULT_SKIP = [/^\/api\/health/, /^\/socket\.io\//, /^\/favicon\.ico$/, /^\/static\//, /\.(js|css|map|png|jpg|svg|ico|woff2?)$/];

/** Bytes in one written chunk. Only strings and buffers count (end(callback) has no body). */
function chunkBytes(chunk, encoding) {
  if (typeof chunk === "string") return Buffer.byteLength(chunk, typeof encoding === "string" ? encoding : "utf8");
  if (chunk instanceof Uint8Array) return chunk.length;
  return 0;
}

/** Calls `add(bytes)` for everything written to `res`, without changing what is written. */
function meterBytes(res, add) {
  const write = res.write;
  const end = res.end;
  res.write = function meteredWrite(chunk, encoding, ...rest) {
    add(chunkBytes(chunk, encoding));
    return write.call(this, chunk, encoding, ...rest);
  };
  res.end = function meteredEnd(chunk, encoding, ...rest) {
    add(chunkBytes(chunk, encoding));
    return end.call(this, chunk, encoding, ...rest);
  };
}

/**
 * Measures what is really sent to the client. Register it BEFORE compression():
 *
 *   app.use(logger.responseMeter());
 *   app.use(compression());
 *   app.use(logger.requestLogger());   // sees the uncompressed body
 *
 * The request log then shows both sizes ("3.4 MB (0.9 MB gzip)"). Without it the
 * log shows only the uncompressed size.
 */
function responseMeter() {
  return function responseMeterMiddleware(req, res, next) {
    res.locals.logBytesSent = 0;
    meterBytes(res, (bytes) => {
      res.locals.logBytesSent += bytes;
    });
    next();
  };
}

/** The route as the developer wrote it ("/api/users/:id"), never the raw URL with ids and queries. */
function routeOf(req) {
  const pattern = req.route?.path;
  if (pattern) return `${req.baseUrl || ""}${pattern}`;
  return (req.originalUrl || req.url).split("?")[0];
}

/** Short sentence for the response: explicit message, then body.message / body.error, then nothing. */
function messageOf(res, body) {
  if (res.locals.logMessage) return res.locals.logMessage;
  if (body && typeof body === "object") {
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
  }
  return null;
}

function requestLogger({ skip = DEFAULT_SKIP, logBodyKeys = false } = {}) {
  return function requestLoggerMiddleware(req, res, next) {
    if (req.method === "OPTIONS" || skip.some((pattern) => pattern.test(req.path))) return next();

    const started = process.hrtime.bigint();
    const requestId = req.get("x-request-id") || crypto.randomBytes(3).toString("hex");
    res.setHeader("x-request-id", requestId);

    const context = { waits: [] };
    let responseBody;
    let bytes = 0; // the body as the handler wrote it, before compression
    meterBytes(res, (count) => {
      bytes += count;
    });

    // Read the message from the body; the body itself is not kept or printed.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      // The error comes from errorCapture / captureError, or from a log.error(err)
      // call made while this request was running.
      const thrown = res.locals.logError || context.error;
      const error = thrown ? { ...summarizeError(thrown), note: context.errorNote } : undefined;

      logger.request({
        method: req.method,
        route: routeOf(req),
        status: res.statusCode,
        ms,
        message: messageOf(res, responseBody),
        user: req.user ? `${shortId(req.user.id)} (${req.user.userType || "user"})` : null,
        ip: (req.ip || "").replace(/^::ffff:/, ""),
        requestId,
        waits: context.waits,
        error,
        bytes,
        bytesSent: res.locals.logBytesSent ?? null, // set by responseMeter, when it is installed
        encoding: res.getHeader("content-encoding") || null,
      });

      // Debug only: names of the body fields, never their values.
      if (logBodyKeys && req.body && Object.keys(req.body).length > 0) {
        logger.debug("HTTP", `body ${clip(summarizeBody(req.body), 120)}`, { req: requestId });
      }
    });

    // Everything awaited inside this request reports its wait into `context`.
    logger.requestContext.run(context, next);
  };
}

/**
 * Error middleware: remembers the error so the request block prints it, then
 * hands it on. It does not print anything itself, so nothing is logged twice.
 */
function errorCapture(err, req, res, next) {
  logger.captureError(res, err);
  next(err);
}

module.exports = { requestLogger, responseMeter, errorCapture, routeOf };
