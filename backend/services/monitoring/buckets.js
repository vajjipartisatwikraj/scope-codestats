/**
 * Small pure helpers of the API monitoring: which time bucket a moment falls in, which latency
 * bucket a time falls in, and how a request is described (route pattern, kind of response).
 */
const config = require("../../config/monitoring");

const UNMATCHED = "(unmatched)";
const OTHER_ROUTES = "(other)";
const BUCKETS = Object.keys(config.buckets); // minute, hour, day
const LATENCY_BUCKETS = config.latencyBoundsMs.length + 1;
const OFFSET_MS = config.utcOffsetMinutes * 60 * 1000;

/** The start (ms since 1970) of the bucket of the given size that holds `when`. Days start at 00:00 IST. */
function bucketStart(when, bucket) {
  const ms = new Date(when).getTime();
  const size = config.buckets[bucket].sizeMs;
  if (bucket === "day") return Math.floor((ms + OFFSET_MS) / size) * size - OFFSET_MS;
  return Math.floor(ms / size) * size;
}

/** Index of the latency bucket for a time in ms: 0 for under 25 ms ... the last one for the slowest. */
function latencyIndex(ms) {
  const bounds = config.latencyBoundsMs;
  for (let i = 0; i < bounds.length; i += 1) {
    if (ms < bounds[i]) return i;
  }
  return bounds.length;
}

/** Label of a latency bucket: "under 25 ms", "25 to 50 ms", ..., "10 s or more". */
function latencyLabel(index) {
  const bounds = config.latencyBoundsMs;
  const text = (ms) => (ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`);
  if (index === 0) return `under ${text(bounds[0])}`;
  if (index >= bounds.length) return `${text(bounds[bounds.length - 1])} or more`;
  return `${text(bounds[index - 1])} to ${text(bounds[index])}`;
}

/** "text/html; charset=utf-8" -> "html". The kind is what kind of thing the response was. */
function kindOfContentType(header) {
  const type = String(header || "").split(";")[0].trim().toLowerCase();
  if (!type) return "empty";
  if (type === "application/json" || type.endsWith("+json")) return "json";
  if (type === "text/html") return "html";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("text/")) return "text";
  return "file"; // spreadsheets, PDFs, downloads, anything else binary
}

const OBJECT_ID = /^[a-f\d]{24}$/i;
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const NUMBER = /^\d{1,}$/;

/**
 * "/api/cohorts/64f1.../modules" -> "/api/cohorts/:id/modules". A router mounted under a path with
 * a parameter reports the real value in req.baseUrl, and one value per student would otherwise
 * become its own row.
 */
function normalizeRoute(route) {
  return route
    .split("/")
    .map((part) => (OBJECT_ID.test(part) || UUID.test(part) ? ":id" : NUMBER.test(part) ? ":n" : part))
    .join("/");
}

const statusClass = (status) => Math.floor(status / 100);

module.exports = {
  UNMATCHED,
  OTHER_ROUTES,
  BUCKETS,
  LATENCY_BUCKETS,
  bucketStart,
  latencyIndex,
  latencyLabel,
  kindOfContentType,
  normalizeRoute,
  statusClass,
};
