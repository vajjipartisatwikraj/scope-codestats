/**
 * /api/admin/emails-history
 *
 * Every email the platform sent to a person (account removals, teacher requests and role changes), with its status: sending, sent
 * or failed. Admin only. This file only wires URLs to controllers/emailHistoryController and applies
 * the login and admin checks.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/emailHistoryController");

const router = express.Router();

router.use(auth, adminOnly);

// A page of emails, newest first: ?status=&type=&search=&page=&limit=
router.get("/", controller.list);
// One email with its body, for the preview
router.get("/:id", controller.get);

module.exports = router;
