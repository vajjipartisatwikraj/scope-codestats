/**
 * Feedback routes. Ratings and reviews of a cohort. A review applies to the whole group of related cohorts (clones).
 *
 * Mounted under /api/cohorts by routes/cohorts/index.js. This file only wires URLs to
 * controllers/cohorts/feedbackController and applies login and admin checks.
 */
const express = require("express");
const auth = require("../../middleware/auth");
const feedbackController = require("../../controllers/cohorts/feedbackController");

const router = express.Router();

// ─── Feedback ────────────────────────────────────────────────────────────────

// Add or update the student's review. There is one per group of related cohorts
router.post("/:id/feedback", auth, feedbackController.submitFeedback);
// All reviews for the cohort's group, with the average rating
router.get("/:id/feedback", auth, feedbackController.getFeedback);
// The signed-in student's own review, if there is one
router.get("/:id/feedback/user", auth, feedbackController.getMyFeedback);
// Delete a review. Its owner or staff can do this
router.delete("/:id/feedback/:feedbackId", auth, feedbackController.deleteFeedback);

module.exports = router;
