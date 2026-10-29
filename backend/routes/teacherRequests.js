/**
 * /api/teacher-requests
 *
 * Teacher access: someone who signed in from the teacher sign-in page asks for it, an
 * admin approves or rejects. This file only wires URLs to controllers/teacherRequestController
 * and applies the login and admin checks. Every route needs a login; the review routes
 * need an admin (teachers are refused, so they cannot approve other teachers).
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const teacherRequestController = require("../controllers/teacherRequestController");

const router = express.Router();

// ─── The signed-in person ───────────────────────────────────────────────────

// Can I ask for teacher access, and what happened to my last request?
router.get("/me", auth, teacherRequestController.getMine);
// Ask for teacher access: { note? }
router.post("/", auth, teacherRequestController.submit);

// ─── Admin only ─────────────────────────────────────────────────────────────

// Number of requests waiting, for the sidebar badge
router.get("/pending-count", auth, adminOnly, teacherRequestController.pendingCount);
// Requests, optionally ?status=pending|approved|rejected
router.get("/", auth, adminOnly, teacherRequestController.list);
// The person becomes a teacher
router.post("/:id/approve", auth, adminOnly, teacherRequestController.approve);
// Decline: { reason? }
router.post("/:id/reject", auth, adminOnly, teacherRequestController.reject);

module.exports = router;
