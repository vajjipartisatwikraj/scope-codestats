/**
 * VocalQ API usage for the admin Monitoring page.
 *
 * The numbers are not worked out here. SpeechJudge (the service that scores VocalQ recordings)
 * already measures its own usage and serves it from GET /api/v1/metrics/*. This service reads
 * those reports through services/speechJudgeClient.js, in parallel, and hands them to the page
 * as the judge answered them:
 *
 *   status          whether the judge records usage, and how its writer is doing
 *   summary         API calls, evaluations, Whisper audio and Gemini tokens for the range
 *   timeseries      the same over time
 *   routes          API calls by route (health and metrics calls left out)
 *   question-types  evaluations by question type
 *   storage         how much space the judge's usage database takes
 *
 * Every report is fetched independently, so one that fails (an older judge without /storage) is
 * reported on its own and the rest still show. The judge's address and key never leave the server.
 * The answer is kept for a few seconds, so switching tabs or several admins do not each trigger
 * five queries on the judge's database.
 *
 * Sample data: with SPEECHJUDGE_MOCK=true the reports are made up (vocalqMockData.js) instead of
 * asked from the judge, so the page can be seen while the judge is down. The answer is marked
 * `mock: true` and the page says so. It is never used unless that variable is set.
 */
const speechJudge = require("../speechJudgeClient");
const { buildSampleReports } = require("./vocalqMockData");
const { ServiceError } = require("../../utils/ServiceError");

const RANGES = ["1h", "6h", "24h", "7d", "30d", "90d"];
const CACHE_MS = 15 * 1000;

/** The services the judge reports on, in the words the page uses. */
const SERVICES = [
  { key: "whisper", label: "Speech to text" },
  { key: "gopt", label: "Pronunciation" },
  { key: "gemini", label: "AI feedback" },
  { key: "acoustic", label: "Acoustic analysis" },
];

const cache = new Map(); // range -> { at, value }
const pending = new Map(); // range -> Promise (one fetch at a time per range)

const useSampleData = () => process.env.SPEECHJUDGE_MOCK === "true";

/** The range from a query string; anything else is a 400. */
function parseRange(value = "24h") {
  if (!RANGES.includes(value)) throw new ServiceError(400, `range must be one of ${RANGES.join(", ")}`);
  return value;
}

/** Runs a call and answers { ok, data } or { ok: false, error, status } instead of throwing. */
async function settle(call) {
  try {
    return { ok: true, data: await call };
  } catch (error) {
    return { ok: false, error: error.message || "Request failed", status: error.status || null };
  }
}

/** What /ready says, as a list the page can show: one entry per service of the judge. */
function readiness(body) {
  const services = SERVICES.map(({ key, label }) => ({ key, label, ready: body[key] === true }));
  return {
    ready: services.every((service) => service.ready),
    services,
    // Services that run as placeholders: their scores are not real
    mocked: Array.isArray(body.mocked) ? body.mocked : [],
  };
}

/**
 * Turns the reports into the answer of the page. `reports` holds each report as settle() returns
 * it, so the same code serves the judge's real answers and the sample data.
 */
function assemble(range, generatedAt, { ready, status, summary, timeseries, routes, questionTypes, storage }) {
  const base = {
    range,
    generatedAt,
    configured: true,
    reachable: true,
    judge: ready.ok ? readiness(ready.data) : null,
  };

  if (!status.ok) {
    return { ...base, monitoring: { available: false, error: status.error, status: status.status } };
  }
  if (!status.data.enabled) {
    return { ...base, monitoring: { available: true, enabled: false, hint: status.data.hint || "" } };
  }

  // Without the totals and the time series there is nothing to show
  const failed = [summary, timeseries].find((report) => !report.ok);
  if (failed) return { ...base, monitoring: { available: false, error: failed.error, status: failed.status } };

  return {
    ...base,
    monitoring: { available: true, enabled: true, writer: status.data },
    summary: summary.data,
    timeseries: timeseries.data,
    routes: routes.ok ? routes.data.routes : null,
    questionTypes: questionTypes.ok ? questionTypes.data.question_types : null,
    storage: storage.ok ? storage.data : null,
    // Reports that failed on their own; the page says so next to the part that is missing
    problems: {
      ...(routes.ok ? {} : { routes: routes.error }),
      ...(questionTypes.ok ? {} : { questionTypes: questionTypes.error }),
      ...(storage.ok ? {} : { storage: storage.error }),
    },
  };
}

const ok = (data) => ({ ok: true, data });

async function load(range) {
  const generatedAt = new Date();

  if (useSampleData()) {
    const sample = buildSampleReports(range, generatedAt.getTime());
    return {
      ...assemble(range, generatedAt, {
        ready: ok(sample.ready),
        status: ok(sample.status),
        summary: ok(sample.summary),
        timeseries: ok(sample.timeseries),
        routes: ok(sample.routes),
        questionTypes: ok(sample.questionTypes),
        storage: ok(sample.storage),
      }),
      mock: true,
    };
  }

  if (!speechJudge.isConfigured()) return { range, generatedAt, configured: false };

  // /ready needs no key and answers even while the models load, so it tells "down" from "starting"
  const [ready, status] = await Promise.all([settle(speechJudge.ready()), settle(speechJudge.metrics("status"))]);
  if (!ready.ok && !status.ok) {
    return { range, generatedAt, configured: true, reachable: false, error: ready.error };
  }
  // Nothing more to ask when the judge does not record usage
  if (!status.ok || !status.data.enabled) {
    return assemble(range, generatedAt, { ready, status });
  }

  const [summary, timeseries, routes, questionTypes, storage] = await Promise.all([
    settle(speechJudge.metrics("summary", { range })),
    settle(speechJudge.metrics("timeseries", { range })),
    // The same way the other counts are made: the judge's own health and metrics calls are left out
    settle(speechJudge.metrics("routes", { range, include_monitoring: false })),
    settle(speechJudge.metrics("question-types", { range })),
    settle(speechJudge.metrics("storage")),
  ]);
  return assemble(range, generatedAt, { ready, status, summary, timeseries, routes, questionTypes, storage });
}

/**
 * Everything the VocalQ API tab shows for a range.
 * @param {{range?: string}} params
 */
async function getOverview({ range } = {}) {
  const key = parseRange(range);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  if (pending.has(key)) return pending.get(key);

  const request = load(key)
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

module.exports = { getOverview, parseRange, RANGES };
