/**
 * /api/opportunities
 *
 * This file only wires URLs to controllers/opportunityController and applies
 * authentication. (Admin management is in routes/adminCatalog.js.)
 *
 * Order matters: "/saved" comes before "/:id", which matches any single segment.
 */
const express = require("express");
const auth = require("../middleware/auth");
const opportunityController = require("../controllers/opportunityController");

const router = express.Router();

router.get("/", auth, opportunityController.list);
router.get("/saved", auth, opportunityController.listSaved);
router.get("/:id", auth, opportunityController.getOne);
router.post("/:id/save", auth, opportunityController.save);
router.delete("/:id/save", auth, opportunityController.unsave);

module.exports = router;
