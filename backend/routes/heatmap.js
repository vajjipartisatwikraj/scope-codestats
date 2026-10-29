/**
 * Activity heatmap, mounted at /api/dashboard (the URL the frontend already uses).
 *
 * This file only wires URLs to controllers/heatmapController and applies
 * authentication and rate limiting.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const heatmapController = require("../controllers/heatmapController");

const router = express.Router();

router.use(auth);
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    keyGenerator: (req) => req.user.id,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many heatmap requests, please try again shortly." },
  })
);

router.get("/heatmap/:userId", heatmapController.getHeatmap);
router.post("/heatmap/generate/:userId", heatmapController.rebuildHeatmap);

module.exports = router;
