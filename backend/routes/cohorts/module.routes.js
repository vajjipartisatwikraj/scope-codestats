/**
 * Modules routes. The modules of a cohort: viewing them, and adding, editing and deleting them.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/moduleController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const moduleController = require("../../controllers/cohorts/moduleController");

const router = express.Router();

// ─── Browse ──────────────────────────────────────────────────────────────────

// The modules of a cohort
router.get("/:id/modules", auth, moduleController.getModules);
// One module
router.get("/:id/modules/:moduleId", auth, moduleController.getModule);

// ─── Manage (admin or teacher) ───────────────────────────────────────────────

// Add a module. It is shared by all related cohorts
router.post("/:cohortId/modules", [auth, adminAuth], moduleController.createModule);
// Edit a module. This affects all related cohorts
router.put("/:cohortId/modules/:moduleId", [auth, adminAuth], moduleController.updateModule);
// Delete a module and its questions from all related cohorts
router.delete("/:cohortId/modules/:moduleId", [auth, adminAuth], moduleController.deleteModule);

module.exports = router;
