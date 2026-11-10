const express = require("express");

const auth = require("../middleware/auth");
const searchController = require("../controllers/searchController");

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Search across users, cohorts, opportunities, courses and speech tests
 * @access  Private
 */
router.get("/", auth, searchController.search);

module.exports = router;
