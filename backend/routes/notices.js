/**
 * /api/notices
 *
 * What every signed-in user (student, teacher or admin) sees of alerts and announcements. One request
 * on app start gives the ones that are live for them and not yet closed; closing a notice or pressing
 * its button is recorded so it does not come back and so admins can see the counts. This file only
 * wires URLs to controllers/noticeController and applies the login check. Admins manage the notices
 * through routes/alerts.js and routes/announcements.js.
 */
const express = require("express");
const auth = require("../middleware/auth");
const noticeController = require("../controllers/noticeController");

const router = express.Router();

router.use(auth);

// { alerts: [...], announcements: [...] }: live now, for this user, not closed by them
router.get("/active", noticeController.getActive);

// The user pressed the cross of an alert
router.post("/alerts/:id/close", noticeController.alert.close);
// The user pressed the button of an alert (this closes it too)
router.post("/alerts/:id/click", noticeController.alert.click);

// The user pressed the cross of an announcement
router.post("/announcements/:id/close", noticeController.announcement.close);
// The user pressed the button of an announcement (this closes it too)
router.post("/announcements/:id/click", noticeController.announcement.click);

module.exports = router;
