/**
 * /api/user-groups
 *
 * Named lists of roll numbers, created by admins and teachers and attached to cohorts
 * (see routes/cohorts/userGroup.routes.js). This file only wires URLs to
 * controllers/userGroupController and applies the login and admin checks.
 */
const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/auth");
const userGroupController = require("../controllers/userGroupController");

const router = express.Router();

// Every route here is for admins and teachers.
router.use(auth, adminAuth);

// All groups, with member and cohort counts
router.get("/", userGroupController.listUserGroups);
// Create from a name and roll numbers: { name, description?, rollNumbers: [] }
router.post("/", userGroupController.createUserGroup);
// One group: matched students, unmatched roll numbers, cohorts it is attached to
router.get("/:id", userGroupController.getUserGroup);
// Rename or change the description
router.put("/:id", userGroupController.updateUserGroup);
// Add roll numbers: { rollNumbers: [] }. Cohorts the group is attached to receive the new students
router.post("/:id/members", userGroupController.addMembers);
// Remove roll numbers: { rollNumbers: [] }. Refused while the group is attached to a cohort
router.delete("/:id/members", userGroupController.removeMembers);
// Delete the group. Refused while it is attached to a cohort
router.delete("/:id", userGroupController.deleteUserGroup);

module.exports = router;
