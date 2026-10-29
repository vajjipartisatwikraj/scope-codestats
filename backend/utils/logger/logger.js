/**
 * LogsEnhancer reference logger.
 *
 * Dependency free (Node built-ins only). Copy this folder's files into the
 * backend when adopting the skill; see ../SKILL.md for the rules this follows.
 *
 *   logger.info("DB", "connected")
 *   logger.warn("AUTH", "token expired", { user: id })
 *   logger.error("CRON", err)                       // one line, main error only
 *   await logger.timed("github.fetch", () => ...)   // async wait, per request or standalone
 *   const job = logger.job("profile-sync", { total })   // progress + green completion
 *   const log = logger.scope("COHORTS")             // drop-in for console.* in legacy code
 *   log.debug("fetching") / log.warn("slow") / log.error("failed:", err)
 *
 * Environment:
 *   LOG_LEVEL   error | warn | info (default) | debug
 *   LOG_FORMAT  pretty (default) | json   (json = one object per event, for log shippers)
 *   NO_COLOR    disables colors; FORCE_COLOR forces them
 */
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");

// --- Configuration ----------------------------------------------------------

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const config = {
  level: LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info,
  json: process.env.LOG_FORMAT === "json",
  color:
    !process.env.NO_COLOR &&
    (Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY)),
  separatorWidth: 60,
  // Thresholds in milliseconds. Anything below a "wait" threshold is not logged.
  slowRequestMs: 1000,
  minWaitMs: 50, // async waits shorter than this are not worth a line
  slowWaitMs: 500, // async waits at least this long are highlighted as slow
  largeResponseBytes: 1024 * 1024, // a response this big (as sent to the client) is marked LARGE
  maxMessageLength: 160,
  jobProgressStepPercent: 10, // print job progress every 10 %
  jobProgressMinIntervalMs: 15000, // ...or after this long without a line
  repeatWindowMs: 60000, // identical warn/error lines inside this window are collapsed
};

// --- Colors (no emojis, plain ANSI) -----------------------------------------

const CODES = {
  white: "\x1b[97m", // requests and normal events
  red: "\x1b[31m", // errors and failed requests (5xx)
  green: "\x1b[32m", // a service or job finished successfully
  yellow: "\x1b[33m", // warnings, slow work, client errors (4xx), cancelled
  gray: "\x1b[90m", // separators and secondary details
  reset: "\x1b[0m",
};

const paint = (color, text) =>
  config.color && color ? `${CODES[color]}${text}${CODES.reset}` : text;

// --- Request context (lets timed() attach waits to the current request) -----

const requestContext = new AsyncLocalStorage();

// --- Helpers ----------------------------------------------------------------

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|otp|pin|cvv|card|session/i;

// Emoji, pictographs and arrows: logs are plain text, color carries the meaning.
const DECORATION = /[\u{1F000}-\u{1FFFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

/** Single line, no emoji, trimmed, never longer than maxMessageLength. */
function clip(text, max = config.maxMessageLength) {
  const line = String(text ?? "").replace(DECORATION, "").replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

/** 1250 -> "1.25 s", 182 -> "182 ms" */
function formatMs(ms) {
  if (ms >= 60000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

/** 512 -> "512 B", 3440 -> "3.4 KB", 5242880 -> "5.0 MB" */
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

/** First application stack frame, as "relative/file.js:line". Skips node_modules and internals. */
function originOf(err) {
  const lines = String(err?.stack || "").split("\n").slice(1);
  for (const line of lines) {
    const match = line.match(/\(?([^()\s]+):(\d+):\d+\)?$/);
    if (!match) continue;
    const file = match[1].replace(/^file:\/\//, "");
    if (file.includes("node_modules") || file.startsWith("node:")) continue;
    return `${path.relative(process.cwd(), file).replace(/\\/g, "/")}:${match[2]}`;
  }
  return null;
}

/**
 * The main error only: "Name: message (where)". The full stack is never
 * printed unless LOG_LEVEL=debug.
 */
function summarizeError(err) {
  if (!err || typeof err !== "object") {
    return { text: clip(err || "Unknown error"), where: null };
  }

  const name = err.name && err.name !== "Error" ? `${err.name}: ` : "";
  let message = clip(String(err.message || err).split("\n")[0]);

  // HTTP client errors (axios and similar): say which call failed, without the query string.
  const status = err.response?.status;
  const url = err.config?.url || err.config?.baseURL;
  if (status || url) {
    const target = url ? String(url).split("?")[0] : "";
    message = `${message}${status ? ` [HTTP ${status}]` : ""}${target ? ` ${target}` : ""}`;
  }
  if (err.code && !message.includes(err.code)) message = `${message} [${err.code}]`;

  return { text: `${name}${message}`, where: originOf(err) };
}

/** Keys and size of a body, never its values. For debug level only. */
function summarizeBody(body) {
  if (body == null || typeof body !== "object") return null;
  const keys = Object.keys(body);
  const size = Buffer.byteLength(JSON.stringify(body) || "");
  const shown = keys.slice(0, 8).map((key) => (SENSITIVE_KEY.test(key) ? `${key}(hidden)` : key));
  return `${keys.length} keys [${shown.join(", ")}${keys.length > 8 ? ", ..." : ""}] ${size} B`;
}

/** Last 4 characters of an id, enough to correlate without exposing it. */
const shortId = (id) => (id ? String(id).slice(-6) : "anonymous");

// --- Output -----------------------------------------------------------------

const recent = new Map(); // key -> { at, suppressed }

/**
 * Collapses identical warn/error lines so a failing loop cannot flood the log.
 * Returns the repeat count to append, or null when the line must be skipped.
 */
function throttle(level, key) {
  if (level !== "warn" && level !== "error") return 0;
  const now = Date.now();
  const entry = recent.get(key);
  if (entry && now - entry.at < config.repeatWindowMs) {
    entry.suppressed += 1;
    return null;
  }
  const suppressed = entry ? entry.suppressed : 0;
  recent.set(key, { at: now, suppressed: 0 });
  if (recent.size > 500) recent.delete(recent.keys().next().value);
  return suppressed;
}

const LEVEL_COLOR = { error: "red", warn: "yellow", info: "white", debug: "gray" };

function write(level, color, lines, event) {
  if (LEVELS[level] > config.level) return;
  const out = level === "error" ? console.error : console.log;
  if (config.json) {
    out(JSON.stringify({ ts: new Date().toISOString(), level, ...event }));
  } else {
    for (const line of lines) out(paint(color, line));
  }
}

/**
 * One log line. `fields` are extra key/values: shown as "k=v" (pretty) or merged (json).
 * An Error logged at error level while a request is being handled is not printed
 * here: it is attached to that request and appears once, inside its block.
 */
function emit(level, tag, message, fields = {}, where = null) {
  if (level === "error" && message instanceof Error) {
    const ctx = requestContext.getStore();
    if (ctx && !ctx.error) {
      ctx.error = message;
      return;
    }
  }
  const text = message instanceof Error ? summarizeError(message) : { text: clip(message), where };
  const repeats = throttle(level, `${tag}|${text.text}`);
  if (repeats === null) return;

  const extra = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${SENSITIVE_KEY.test(key) ? "hidden" : clip(value, 60)}`)
    .join(" ");
  const suffix = repeats > 0 ? ` (repeated ${repeats} more times)` : "";

  const header = `[${tag}] ${text.text}${extra ? ` | ${extra}` : ""}${suffix}`;
  const lines = [header];
  if (text.where) lines.push(`  at ${text.where}`);
  if (message instanceof Error && config.level >= LEVELS.debug && message.stack) {
    lines.push(...message.stack.split("\n").slice(1, 8).map((l) => `  ${l.trim()}`));
  }

  write(level, LEVEL_COLOR[level], lines, { tag, msg: text.text, at: text.where, ...fields });
}

// --- Timing async work ------------------------------------------------------

/**
 * Runs `work` (a promise or a function returning one), measures how long it
 * waited and records it. Inside a request the wait is added to that request's
 * block; outside a request it is logged on its own when slow.
 *
 *   const user = await logger.timed("mongo.findUser", () => User.findById(id));
 *
 * Waits under `minWaitMs` are dropped. A failing call is always recorded,
 * and the original error is rethrown unchanged.
 */
async function timed(label, work, { slowMs = config.slowWaitMs } = {}) {
  const started = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - started) / 1e6;
  const record = (failed) => {
    const ms = elapsed();
    const ctx = requestContext.getStore();
    if (ctx) {
      if (failed || ms >= config.minWaitMs) ctx.waits.push({ label, ms, failed, slow: ms >= slowMs });
    } else if (failed || ms >= slowMs) {
      emit("warn", "WAIT", `${label} ${failed ? "failed after" : "waited"} ${formatMs(ms)}`);
    }
  };
  try {
    const result = await (typeof work === "function" ? work() : work);
    record(false);
    return result;
  } catch (err) {
    record(true);
    throw err;
  }
}

// --- HTTP request block -----------------------------------------------------

/** Maps a status code to the color of its response line. */
function statusColor(status, flagged) {
  if (status >= 500) return "red";
  if (status >= 400 || flagged) return "yellow"; // flagged = slow or large
  return "white";
}

/**
 * One block per request:
 *
 *   ____________________________________________________________
 *   POST /api/profiles/leetcode
 *     user 6add1f (student) | ip 127.0.0.1 | req 3fa9c2
 *     200 OK | 182 ms | Profile updated
 *     waited: mongo.findProfile 41 ms, leetcode.fetch 120 ms
 *
 * The status line also shows the response size ("200 OK | 182 ms | 3.4 MB (0.9 MB gzip)").
 * On failure a red "error:" line follows the status line.
 */
function request(entry) {
  const { method, route, status, ms, message, user, ip, requestId, waits = [], error } = entry;
  // bytes: the body as the handler produced it. bytesSent: what went over the wire
  // after compression (null when it was not measured). encoding: "gzip", "br" or null.
  const { bytes = 0, bytesSent = null, encoding = null } = entry;
  const slow = ms >= config.slowRequestMs;
  const large = (bytesSent ?? bytes) >= config.largeResponseBytes;
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  const statusText = require("http").STATUS_CODES[status] || "";

  if (config.json) {
    return write(level, null, [], {
      tag: "HTTP", method, route, status, ms: Math.round(ms), bytes: bytes || undefined,
      bytesSent: bytesSent ?? undefined, encoding: encoding || undefined, large: large || undefined,
      msg: message, user, ip, req: requestId,
      waits: waits.map((w) => ({ label: w.label, ms: Math.round(w.ms), failed: w.failed || undefined })),
      error: error ? `${error.note ? `${error.note} | ` : ""}${error.text}` : undefined, at: error?.where,
    });
  }

  const color = statusColor(status, slow || large);
  // "3.4 MB" or, when compressed, "3.4 MB (0.9 MB gzip)". Left out for empty responses.
  const sizeText = !bytes
    ? ""
    : ` | ${formatBytes(bytes)}${
        encoding && bytesSent != null ? ` (${formatBytes(bytesSent)} ${encoding})` : ""
      }${large ? " (LARGE)" : ""}`;
  const lines = [
    { color: "gray", text: "_".repeat(config.separatorWidth) },
    { color: "white", text: `${method} ${route}` },
    { color: "gray", text: `  user ${user || "anonymous"} | ip ${ip || "-"} | req ${requestId}` },
    {
      color,
      // The response text is left out when it only repeats the status ("200 OK | 29 ms | OK").
      text: `  ${status} ${statusText} | ${formatMs(ms)}${slow ? " (SLOW)" : ""}${sizeText}${
        message && message !== statusText ? ` | ${clip(message)}` : ""
      }`,
    },
  ];

  if (waits.length > 0) {
    const detail = waits
      .map((w) => `${w.label} ${w.failed ? "FAILED after " : ""}${formatMs(w.ms)}`)
      .join(", ");
    lines.push({ color: waits.some((w) => w.failed || w.slow) ? "yellow" : "gray", text: `  waited: ${detail}` });
  }
  if (error) {
    const note = error.note ? `${error.note.replace(/[\s:|-]+$/, "")} | ` : "";
    lines.push({ color: "red", text: `  error: ${note}${error.text}` });
    if (error.where) lines.push({ color: "red", text: `  at ${error.where}` });
  }

  if (LEVELS[level] > config.level) return;
  const out = level === "error" ? console.error : console.log;
  for (const line of lines) out(paint(line.color, line.text));
}

// --- Background jobs and services -------------------------------------------

/**
 * Tracks one run of a background job (cron, sync, import).
 * Per-item failures are counted by reason, never printed one by one.
 *
 *   const job = logger.job("profile-sync", { total: users.length });
 *   job.progress(done);                  // prints at 10 % steps or every 15 s
 *   job.fail("github", err);             // counted, grouped by reason
 *   job.complete();                      // green summary
 */
function job(name, { total = 0 } = {}) {
  const tag = `JOB ${name}`;
  const started = Date.now();
  let done = 0;
  let failedItems = 0;
  let lastPrintedStep = 0;
  let lastPrintedAt = started;
  const reasons = new Map(); // reason -> { count, example }

  const percent = () => (total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0);
  const counts = () => `${done}/${total || "?"} (${percent()}%)`;
  const line = (level, color, text) => {
    write(level, color, [`[${tag}] ${text}`], { tag, msg: text, done, total, failed: failedItems });
  };

  line("info", "white", `started${total ? ` | ${total} items` : ""}`);

  return {
    progress(count) {
      done = count;
      const step = Math.floor(percent() / config.jobProgressStepPercent);
      const quiet = Date.now() - lastPrintedAt >= config.jobProgressMinIntervalMs;
      if (step > lastPrintedStep || quiet) {
        lastPrintedStep = Math.max(step, lastPrintedStep);
        lastPrintedAt = Date.now();
        line("info", "white", `progress ${counts()} | failed ${failedItems} | ${formatMs(Date.now() - started)}`);
      }
    },
    /** Records one failed item. `item` is a short label such as "github" or a user id. */
    fail(item, err) {
      failedItems += 1;
      const reason = summarizeError(err).text;
      const entry = reasons.get(reason) || { count: 0, example: item };
      entry.count += 1;
      reasons.set(reason, entry);
    },
    complete(extra = "") {
      done = total || done;
      line("info", "green", `COMPLETED ${counts()} | ok ${done - failedItems} | failed ${failedItems} | ${formatMs(Date.now() - started)}${extra ? ` | ${extra}` : ""}`);
      [...reasons.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .forEach(([reason, { count, example }]) => line("info", "yellow", `  ${count} x ${reason} (e.g. ${clip(example, 40)})`));
    },
    cancel() {
      line("warn", "yellow", `CANCELLED at ${counts()} | ${formatMs(Date.now() - started)}`);
    },
    error(err) {
      const { text, where } = summarizeError(err);
      line("error", "red", `FAILED at ${counts()} | ${formatMs(Date.now() - started)} | ${text}${where ? ` (${where})` : ""}`);
    },
  };
}

/** A service that came up (database, cache, socket server): one green line. */
function ready(service, detail = "") {
  write("info", "green", [`[${service}] ready${detail ? ` | ${detail}` : ""}`], { tag: service, msg: "ready", detail });
}

// ---- Drop-in replacement for console.* in legacy code ----------------------

/** Safe text for any console argument: objects become their key names, never their values. */
function describe(arg) {
  if (arg instanceof Error) return summarizeError(arg).text;
  if (arg === null || arg === undefined) return String(arg);
  if (Array.isArray(arg)) return `[${arg.length} items]`;
  if (typeof arg === "object") {
    const keys = Object.keys(arg);
    return `{${keys.slice(0, 6).join(", ")}${keys.length > 6 ? ", ..." : ""}}`;
  }
  return String(arg);
}

/**
 * `const log = logger.scope("COHORTS")` then `log.debug(...)`, `log.warn(...)`,
 * `log.error("failed:", err)`. Arguments of any kind are accepted; objects are
 * reduced to key names and errors to their main message, so a careless call
 * cannot dump a body or a document. `debug` is hidden unless LOG_LEVEL=debug.
 */
function scope(tag) {
  const write = (level) => (...args) => {
    const err = args.find((arg) => arg instanceof Error);
    // The tag already names the source, so a legacy "[SyncJob]" or "[Heatmap]" prefix is dropped.
    const text = args
      .filter((arg) => !(arg instanceof Error))
      .map(describe)
      .join(" ")
      .replace(/^[^\w\[]*\[[^\]\n]{1,30}\][\s:|-]*/, "");

    if (level === "error" && err) {
      const ctx = requestContext.getStore();
      if (ctx && !ctx.error) {
        ctx.error = err;
        ctx.errorNote = clip(text);
        return;
      }
    }
    const message = err ? `${text}${text ? " | " : ""}${summarizeError(err).text}` : text;
    emit(level, tag, message, {}, err ? originOf(err) : null);
  };
  return {
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    /** A service of this scope came up: one green line. */
    ready: (detail) => ready(tag, detail),
  };
}

/** Marks the error to print in the request block of `res` (so it is logged once, with its request). */
function captureError(res, err) {
  res.locals.logError = err;
}

const logger = {
  config,
  error: (tag, message, fields) => emit("error", tag, message, fields),
  warn: (tag, message, fields) => emit("warn", tag, message, fields),
  info: (tag, message, fields) => emit("info", tag, message, fields),
  debug: (tag, message, fields) => emit("debug", tag, message, fields),
  timed,
  job,
  ready,
  request,
  captureError,
  scope,
  requestContext,
  // exposed for the middleware and for tests
  util: { clip, formatMs, formatBytes, summarizeError, summarizeBody, shortId, paint },
};

module.exports = logger;
