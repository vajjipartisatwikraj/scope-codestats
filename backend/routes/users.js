const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Profile = require('../models/Profile');

// Get current authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    // Add log to verify userType is included
    console.log(`GET /users/me - User ${req.user.id} (type: ${req.user.userType || 'user'})`);
    
    const user = await User.findById(req.user.id).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure userType is included
    if (!user.userType) {
      user.userType = 'user';
    }

    // Fetch user's achievements
    const achievements = await Achievement.find({ user: user._id });

    // Fetch user's coding profiles
    const profiles = await Profile.find({ userId: user._id });

    // Format coding profiles data
    const codingProfiles = {};
    profiles.forEach(profile => {
      codingProfiles[profile.platform] = {
        username: typeof profile.username === 'object' ? 
                  (profile.username.username || '') : 
                  (profile.username || ''),
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
    console.error('Error fetching current user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
        username: typeof profile.username === 'object' ? 
                  (profile.username.username || '') : 
                  (profile.username || ''),
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

// Admin-only: Check and set user type
router.post('/set-user-type', auth, async (req, res) => {
  try {
    // Ensure the current user is an admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ 
        message: 'Forbidden: Only admins can access this endpoint' 
      });
    }

    const { userId, userType } = req.body;
    
    // Validate input
    if (!userId || !userType) {
      return res.status(400).json({ 
        message: 'Missing required fields: userId and userType are required'
      });
    }
    
    // Validate userType value
    if (!['user', 'admin'].includes(userType)) {
      return res.status(400).json({
        message: 'Invalid userType: Must be "user" or "admin"'
      });
    }
    
    // Find and update the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the change
    console.log(`User type change by admin ${req.user.email}: ${user.email} from ${user.userType || 'user'} to ${userType}`);
    
    // Update user type
    user.userType = userType;
    await user.save();
    
    // Return success message
    res.json({
      message: `User ${user.email} updated successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType
      }
    });
    
  } catch (err) {
    console.error('Error setting user type:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 