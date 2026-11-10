/**
 * Monitoring controller (admins only): API traffic and database size for the admin panel.
 *
 * Wired to URLs in routes/monitoring.js, which applies the login and admin checks. The numbers
 * come from services/monitoring/; this file only reads the query string and sends the answer.
 */
const monitoring = require("../services/monitoring");
const { respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("MONITORING");

// Runs a service call and sends its result, or the error it raised.
const handle = (action, work) => async (req, res) => {
  try {
    res.json(await work(req));
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

/** GET /api/admin/monitoring/api?range=1h|24h|7d|30d|all */
const apiOverview = handle("reading the API traffic", (req) =>
  monitoring.api.getOverview({ range: req.query.range || "24h" })
);

/** GET /api/admin/monitoring/api/events?limit=25&before=<date>&minStatus=400 */
const apiEvents = handle("reading the API events", (req) =>
  monitoring.api.listEvents({
    limit: req.query.limit,
    before: req.query.before,
    minStatus: req.query.minStatus,
  })
);

/** GET /api/admin/monitoring/vocalq?range=1h|6h|24h|7d|30d|90d (SpeechJudge's own usage reports) */
const vocalqOverview = handle("reading the VocalQ API usage", (req) =>
  monitoring.vocalq.getOverview({ range: req.query.range || "24h" })
);

/** GET /api/admin/monitoring/judge0?refresh=1 (Judge0's own statistics, workers and limits) */
const judge0Overview = handle("reading the Judge0 usage", (req) =>
  monitoring.judge0.getOverview({ refresh: req.query.refresh === "1" })
);

/** GET /api/admin/monitoring/database?range=30d|90d|1y|all&refresh=1 */
const database = handle("reading the database size", async (req) => {
  const range = monitoring.database.parseHistoryRange(req.query.range || "90d");
  const [live, history] = await Promise.all([
    monitoring.database.getLive({ force: req.query.refresh === "1" }),
    monitoring.database.getHistory({ range }),
  ]);
  return { live, history };
});

module.exports = { apiOverview, apiEvents, vocalqOverview, judge0Overview, database };
