const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Profile = require('../models/Profile');

// Get user by username (from email)
router.get('/:username', async (req, res) => {
  try {
    // Find user by email prefix (username)
    const user = await User.findOne({ 
      email: new RegExp(`^${req.params.username}@`, 'i') 
    }).select('-password').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch user's achievements
    const achievements = await Achievement.find({ user: user._id });

    // Fetch user's coding profiles
    const profiles = await Profile.find({ userId: user._id });

    // Format coding profiles data
    const codingProfiles = {};
    profiles.forEach(profile => {
      codingProfiles[profile.platform] = {
        username: profile.username,
        rating: profile.rating || 0,
        rank: profile.rank || 'unrated',
        problemsSolved: profile.problemsSolved || 0,
        score: profile.score || 0,
        contestsParticipated: profile.contestsParticipated || 0,
        easyProblemsSolved: profile.easyProblemsSolved || 0,
        mediumProblemsSolved: profile.mediumProblemsSolved || 0,
        hardProblemsSolved: profile.hardProblemsSolved || 0
      };
    });

    // Format the response
    const userData = {
      ...user,
      skills: user.skills || [],
      interests: user.interests || [],
      about: user.about || '',
      linkedinUrl: user.linkedinUrl || '',
      graduatingYear: user.graduatingYear,
      achievements: achievements.map(achievement => ({
        title: achievement.title,
        description: achievement.description,
        type: achievement.type,
        tags: achievement.tags || [],
        link: achievement.link || '',
        imageUrl: achievement.imageUrl || '',
        startDate: achievement.startDate,
        endDate: achievement.endDate
      })),
      codingProfiles,
      totalScore: user.totalScore || 0,
      leetcode: codingProfiles.leetcode || { rating: 0 },
      codechef: codingProfiles.codechef || { rating: 0 },
      codeforces: codingProfiles.codeforces || { rating: 0 },
      hackerrank: codingProfiles.hackerrank || { rating: 0 },
      geeksforgeeks: codingProfiles.geeksforgeeks || { rating: 0 }
    };

    res.json(userData);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 