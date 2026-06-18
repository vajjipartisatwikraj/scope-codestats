const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Cohort = require('../models/Cohort');
const Opportunity = require('../models/Opportunity');
const Course = require('../models/Course');

/**
 * @route   GET /api/search
 * @desc    Search across users, cohorts, opportunities, and courses
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || query.trim() === '') {
      return res.json({
        users: [],
        cohorts: [],
        opportunities: [],
        courses: []
      });
    }

    const searchRegex = new RegExp(query, 'i');
    const searchPromises = [];

    // Search users by username or name (exclude admin and teacher accounts)
    searchPromises.push(
      User.find({
        $and: [
          {
            $or: [
              { email: { $regex: searchRegex } },
              { name: { $regex: searchRegex } }
            ]
          },
          {
            userType: { $nin: ["admin", "teacher"] }
          }
        ]
      })
      .select('name email rollNumber department section profilePicture')
      .limit(limit)
      .lean()
    );

    // Search cohorts by title or description
    searchPromises.push(
      Cohort.find({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ]
      })
      .select('title description')
      .limit(limit)
      .lean()
    );

    // Search opportunities by title or company
    searchPromises.push(
      Opportunity.find({
        $or: [
          { title: { $regex: searchRegex } },
          { company: { $regex: searchRegex } }
        ]
      })
      .select('title company type')
      .limit(limit)
      .lean()
    );

    // Search courses by title or instructor
    searchPromises.push(
      Course.find({
        $or: [
          { title: { $regex: searchRegex } },
          { instructor: { $regex: searchRegex } }
        ]
      })
      .select('title instructor category')
      .limit(limit)
      .lean()
    );

    // Wait for all search queries to complete
    const [users, cohorts, opportunities, courses] = await Promise.all(searchPromises);

    // Format user results to extract username from email
    const formattedUsers = users.map(user => ({
      ...user,
      username: user.email.split('@')[0],
    }));

    res.json({
      users: formattedUsers,
      cohorts,
      opportunities,
      courses
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 