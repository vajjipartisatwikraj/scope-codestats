/**
 * Admin performance analytics, mounted under /api/admin/analytics.
 *
 * This file only wires URLs to controllers/adminAnalyticsController and applies
 * authentication (admin or teacher, like the other admin tools), rate limiting and
 * parameter validation.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const adminAnalyticsParams = require("../middleware/adminAnalyticsParams");
const controller = require("../controllers/adminAnalyticsController");

const router = express.Router();
router.use(auth, adminAuth);

// Each filter change is a request; the data behind them is cached, so this is generous.
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    keyGenerator: (req) => req.user.id,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
  })
);

router.get("/filters", controller.getFilters);
router.get("/overview", adminAnalyticsParams, controller.getOverview);
router.get("/students", adminAnalyticsParams, controller.getStudents);

module.exports = router;
