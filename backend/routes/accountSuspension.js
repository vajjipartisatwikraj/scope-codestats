/**
 * /api/admin/suspend-accounts
 *
 * Admin only (teachers are refused). Removes the coding profiles and all stored coding history
 * of a student. This file only wires URLs to controllers/accountSuspensionController and applies
 * the login and admin checks.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/accountSuspensionController");

const router = express.Router();

// Accounts, with ?search=&linkedOnly=true&page=&limit=
router.get("/", auth, adminOnly, controller.list);
// What suspending this account would delete
router.get("/:userId", auth, adminOnly, controller.preview);
// Delete the coding profiles and all history of this account
router.delete("/:userId", auth, adminOnly, controller.suspend);

module.exports = router;
