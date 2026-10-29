/**
 * /api/platform-progress: the dashboard Progress tab.
 *
 * Charts-ready history of the signed-in user's coding platforms (stored daily, see
 * models/PlatformSnapshot.js) and their GitHub timeline (fetched from GitHub, not stored).
 * This file only wires URLs to controllers/platformProgressController and applies the
 * security middleware. Every route needs a valid token and only reads the caller's data.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const platformProgressParams = require("../middleware/platformProgressParams");
const platformProgressController = require("../controllers/platformProgressController");

const router = express.Router();

const perUser = (req) => req.user.id;
const limiter = (limit, windowMs, message) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator: perUser,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

router.use(auth);
router.use(limiter(120, 60 * 1000, "Too many requests. Please slow down."));

// One line per platform (linked?, state, current numbers) and the problems-by-platform pie
router.get("/me/overview", platformProgressController.getOverview);

// Total score, every platform's score, and ranks (overall, department, each platform) over
// time: ?days=7|30|90|180|365. Before /me/:platform, which would refuse "scores".
router.get("/me/scores", platformProgressParams.rangeOnly, platformProgressController.getScores);

// One platform over a range: ?days=7|30|90|180|365 (default 90).
// GitHub asks GitHub's API, so it gets a tighter limit.
const githubLimiter = limiter(20, 60 * 1000, "Too many GitHub timeline requests. Please wait a moment.");

router.get(
  "/me/:platform",
  platformProgressParams,
  (req, res, next) => (req.progress.platform === "github" ? githubLimiter(req, res, next) : next()),
  platformProgressController.getPlatformProgress
);

module.exports = router;
