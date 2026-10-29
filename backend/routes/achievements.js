/**
 * /api/achievements
 *
 * This file only wires URLs to controllers/achievementController and applies
 * authentication. The rules (limits, validation, the "recognized" flag) are in
 * services/achievementService.
 *
 * Order matters: the fixed paths come before "/:id", which matches any single segment.
 */
const express = require("express");
const auth = require("../middleware/auth");
const staffOnly = require("../middleware/staffOnly");
const achievementController = require("../controllers/achievementController");

const router = express.Router();

// ─── Signed-in student ──────────────────────────────────────────────────────

router.get("/certifications/catalog", auth, achievementController.getCertificationCatalog);
router.get("/", auth, achievementController.getMyAchievements);
router.post("/", auth, achievementController.createAchievement);
router.put("/:id", auth, achievementController.updateAchievement);
router.delete("/:id", auth, achievementController.deleteAchievement);

// ─── Staff only (admin or teacher) ──────────────────────────────────────────

router.get(
  "/export/all",
  auth,
  staffOnly("Access denied. Admin or Teacher only."),
  achievementController.exportAllAchievements,
);

module.exports = router;
