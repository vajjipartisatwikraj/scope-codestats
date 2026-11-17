/**
 * /api/admin/announcements
 *
 * Announcements: the card that opens after sign-in. Admins write one with a title, a rich text
 * description, an image, an audience, a start and end time and an optional button, switch it on or
 * off, and see how many people closed it or pressed its button. This file only wires URLs to
 * controllers/announcementController and applies the login and admin checks. Everyone else reads them
 * through routes/notices.js.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const announcementController = require("../controllers/announcementController");

const router = express.Router();

router.use(auth, adminOnly);

// All announcements, with their status, audience and click counts
router.get("/", announcementController.listAnnouncements);
// Create: { title, description, imageUrl?, audience, userGroups?, startsAt, endsAt, buttonText?, buttonUrl?, isActive? }
router.post("/", announcementController.createAnnouncement);
// Edit the same fields
router.put("/:id", announcementController.updateAnnouncement);
// Switch on or off: { isActive }
router.put("/:id/active", announcementController.setAnnouncementActive);
// Delete, with the records of who closed it
router.delete("/:id", announcementController.deleteAnnouncement);

module.exports = router;
