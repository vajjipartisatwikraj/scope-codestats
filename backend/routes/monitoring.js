/**
 * /api/admin/monitoring
 *
 * The numbers behind the admin Monitoring page: API traffic (requests, statuses, latency per route
 * over time) and database size (every collection, growth). Admins only: `adminOnly` refuses
 * teachers. This file only wires URLs to controllers/monitoringController.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const monitoringController = require("../controllers/monitoringController");

const router = express.Router();

router.use(auth, adminOnly);

// Counters for a range: ?range=1h|24h|7d|30d|all
router.get("/api", monitoringController.apiOverview);
// Errors and slow requests, newest first: ?limit=&before=&minStatus=
router.get("/api/events", monitoringController.apiEvents);
// VocalQ usage as SpeechJudge reports it: ?range=1h|6h|24h|7d|30d|90d
router.get("/vocalq", monitoringController.vocalqOverview);
// Judge0 as it reports itself: statistics, workers, limits, server: ?refresh=1 counts again
router.get("/judge0", monitoringController.judge0Overview);
// Every collection now, and the history of the database: ?range=30d|90d|1y|all&refresh=1
router.get("/database", monitoringController.database);

module.exports = router;
