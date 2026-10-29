/**
 * Admin management of the course and opportunity catalogues, mounted at /api/admin:
 *
 *   /api/admin/courses        controllers/courseController (adminList, adminCreate, ...)
 *   /api/admin/opportunities  controllers/opportunityController
 *
 * Admins and teachers only. The student-facing URLs are in routes/courses.js
 * and routes/opportunities.js.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const courseController = require("../controllers/courseController");
const opportunityController = require("../controllers/opportunityController");

const router = express.Router();
const adminOnly = [auth, adminAuth];

// ─── Courses ────────────────────────────────────────────────────────────────

router.get("/courses", adminOnly, courseController.adminList);
router.post("/courses", adminOnly, courseController.adminCreate);
router.put("/courses/:id", adminOnly, courseController.adminUpdate);
router.delete("/courses/:id", adminOnly, courseController.adminDelete);

// ─── Opportunities ──────────────────────────────────────────────────────────

router.get("/opportunities", adminOnly, opportunityController.adminList);
router.post("/opportunities", adminOnly, opportunityController.adminCreate);
router.put("/opportunities/:id", adminOnly, opportunityController.adminUpdate);
router.delete("/opportunities/:id", adminOnly, opportunityController.adminDelete);

module.exports = router;
