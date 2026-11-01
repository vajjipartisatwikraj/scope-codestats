/**
 * Cohort user group routes. Which user groups are attached to a cohort; the students in
 * them are the cohort's eligible students.
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/userGroupController and applies login and admin checks.
 */
const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const auth = require("../../middleware/auth");
const userGroupController = require("../../controllers/cohorts/userGroupController");

const router = express.Router();

// ─── User groups of a cohort (admin or teacher) ──────────────────────────────

// Who can access the cohort: { accessType: "global" | "userGroups" }. Going back to "userGroups" removes students no group covers; ?preview=true shows what would go
router.put("/:id/access", [auth, adminAuth], userGroupController.setAccessType);
// The groups attached to a cohort
router.get("/:id/user-groups", [auth, adminAuth], userGroupController.listCohortUserGroups);
// Add students that joined the attached groups since they were attached. Never removes anyone
router.post("/:id/user-groups/sync", [auth, adminAuth], userGroupController.syncUserGroups);
// Attach a group: its students become eligible
router.put("/:id/user-groups/:groupId", [auth, adminAuth], userGroupController.attachUserGroup);
// Detach a group. Students no other group covers lose their data for this cohort; ?preview=true shows what would go
router.delete("/:id/user-groups/:groupId", [auth, adminAuth], userGroupController.detachUserGroup);

module.exports = router;
