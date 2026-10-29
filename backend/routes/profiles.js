/**
 * /api/profiles: the signed-in user's own profile page and platform profiles.
 *
 * This file only wires URLs to controllers/profileController and applies the
 * security middleware. Every route needs a valid token and only ever touches
 * the caller's own data.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const profileController = require("../controllers/profileController");

const router = express.Router();

// ─── Security ───────────────────────────────────────────────────────────────

router.use(auth);

const perUser = (req) => req.user.id;

// Every request on this router.
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    keyGenerator: perUser,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please slow down." },
  })
);

// Updating a platform calls an external site, so it is limited much harder on
// top of the per-platform cooldown enforced by the sync service.
const platformUpdateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: perUser,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many profile updates. Please try again in a few minutes.",
  },
});

// ─── Routes ─────────────────────────────────────────────────────────────────

// Profile page
router.get("/me", profileController.getMyProfile);
router.put("/me", profileController.updateMyProfile);

// Platform profiles
router.get("/stats", profileController.getMyStats);
router.get("/sync-info", profileController.getSyncInfo);
router.post("/:platform", platformUpdateLimiter, profileController.updatePlatform);
// Unlink a platform and delete its history (the body must say { confirm: true })
router.delete("/:platform", profileController.removePlatform);

module.exports = router;
