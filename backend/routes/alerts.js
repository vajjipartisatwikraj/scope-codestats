/**
 * /api/admin/alerts
 *
 * Alerts: the band across the top of the app. Admins write one with a message, a start and end time
 * and an optional button, switch it on or off, and see how many people closed it or pressed its
 * button. This file only wires URLs to controllers/alertController and applies the login and admin
 * checks. Everyone else reads them through routes/notices.js.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const alertController = require("../controllers/alertController");

const router = express.Router();

router.use(auth, adminOnly);

// All alerts, with their status and click counts
router.get("/", alertController.listAlerts);
// Create: { message, startsAt, endsAt, buttonText?, buttonUrl?, isActive? }
router.post("/", alertController.createAlert);
// Edit the same fields
router.put("/:id", alertController.updateAlert);
// Switch on or off: { isActive }
router.put("/:id/active", alertController.setAlertActive);
// Delete, with the records of who closed it
router.delete("/:id", alertController.deleteAlert);

module.exports = router;
