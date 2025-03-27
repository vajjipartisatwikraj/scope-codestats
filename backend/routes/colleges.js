const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/colleges/search
// Search colleges by name (case-insensitive)
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery || searchQuery.length < 3) {
      return res.json([]);
    }

    // Find unique college names from users that match the search query
    const colleges = await User.distinct('college', {
      college: { 
        $regex: searchQuery, 
        $options: 'i' 
      }
    });

    // Sort colleges alphabetically and limit to 10 results
    const sortedColleges = colleges
      .filter(college => college && college.trim()) // Remove empty/null values
      .sort()
      .slice(0, 10);

    res.json(sortedColleges);
  } catch (error) {
    console.error('College search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
