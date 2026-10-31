/**
 * /api/admin/access-list
 *
 * The addresses allowed to sign in when LOGIN_MODE=allowlist (config/loginAccess.js). Admins
 * only: `adminOnly` refuses teachers, even though teachers can be listed on it. This file only
 * wires URLs to controllers/accessListController.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const accessListController = require("../controllers/accessListController");

const router = express.Router();

router.use(auth, adminOnly);

// One page of the list: ?search=&role=student|teacher&page=&pageSize=
router.get("/", accessListController.list);
// Add one address: { email, role?, note? }
router.post("/", accessListController.addOne);
// Add many from a CSV: { entries: [{ email, role?, note? }] } (up to 5000)
router.post("/bulk", accessListController.addBulk);
// Add every existing student and teacher account (the first switch to allowlist mode)
router.post("/import-existing", accessListController.importExisting);
// Take addresses off the list, which blocks those people: { ids: [] }
router.post("/remove", accessListController.remove);
// Change an entry between student and teacher: { role }
router.patch("/:id", accessListController.setRole);

module.exports = router;
