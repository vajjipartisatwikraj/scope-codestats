/**
 * /api/courses
 *
 * This file only wires URLs to controllers/courseController and applies
 * authentication. (Admin course management is in routes/adminCatalog.js. Code
 * execution is in routes/compiler.js, routes/cohorts/ and routes/practiceArena.js.)
 *
 * Order matters: "/saved" comes before "/:id", which matches any single segment.
 */
const express = require("express");
const auth = require("../middleware/auth");
const courseController = require("../controllers/courseController");

const router = express.Router();

router.get("/", auth, courseController.list);
router.get("/saved", auth, courseController.listSaved);
router.get("/:id", auth, courseController.getOne);
router.post("/:id/save", auth, courseController.save);
router.delete("/:id/save", auth, courseController.unsave);

module.exports = router;
