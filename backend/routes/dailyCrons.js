/**
 * Admin endpoints for the profile sync jobs, mounted under /api/admin.
 *
 * This file only wires URLs to controllers/dailyCronController and applies
 * authentication (admin only) and rate limiting.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const dailyCronController = require("../controllers/dailyCronController");

const router = express.Router();
router.use("/sync-jobs", auth, adminAuth);

// Starting a sync scrapes every student's platforms, so starts are limited per
// admin. Listing, status and cancel calls are not.
const startSyncLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sync starts. Please wait a few minutes." },
});

router.get("/sync-jobs", dailyCronController.listSyncs);
router.post("/sync-jobs", startSyncLimiter, dailyCronController.startSync);
router.get("/sync-jobs/stats", dailyCronController.getSyncStats); // before /:id
router.get("/sync-jobs/:id", dailyCronController.getSyncStatus);
router.post("/sync-jobs/:id/cancel", dailyCronController.cancelSync);

module.exports = router;
