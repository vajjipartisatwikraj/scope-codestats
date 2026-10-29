/**
 * Admin endpoints for score and rank calculation, mounted under /api/admin/rankings.
 *
 * This file only wires URLs to controllers/rankingController and applies authentication
 * (admin or teacher, like the profile sync jobs) and rate limiting.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const rankingController = require("../controllers/rankingController");

const router = express.Router();
router.use(auth, adminAuth);

// A calculation reads every student's scores, so starts are limited per admin.
const recomputeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many recalculations. Please wait a few minutes." },
});

router.get("/status", rankingController.getStatus);
router.post("/recompute", recomputeLimiter, rankingController.recompute);

module.exports = router;
