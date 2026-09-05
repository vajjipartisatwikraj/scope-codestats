const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const {
  normalizeDescriptionPoints,
  validateDescriptionPoints
} = require('../utils/descriptionPoints');
const {
  RECOGNIZED_CERTIFICATIONS,
  findRecognizedCertification
} = require('../constants/certifications');

// Only certifications can be recognised, and only by matching the catalogue
const resolveRecognized = (type, title) =>
  type === 'certification' && Boolean(findRecognizedCertification(title));

const MAX_ITEMS_PER_TYPE = 5;
// Types that have limits
const LIMITED_TYPES = ['project', 'internship'];

/**
 * Catalogue of globally recognised certifications, used for the suggestions
 * shown under the certificate name field.
 */
router.get('/certifications/catalog', auth, (req, res) => {
  res.json({ certifications: RECOGNIZED_CERTIFICATIONS });
});

// Get all achievements for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const achievements = await Achievement.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    console.error('Error fetching achievements:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all achievements for all users (for admin export)
router.get('/export/all', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all users (excluding admins/teachers)
    const users = await User.find({ userType: { $nin: ["admin", "teacher"] } })
      .select('_id name rollNumber email department')
      .lean();

    // Get all achievements
    const achievements = await Achievement.find()
      .populate('user', 'name rollNumber email department')
      .sort({ createdAt: -1 })
      .lean();

    // Group achievements by user
    const achievementsByUser = {};
    achievements.forEach(achievement => {
      if (achievement.user) {
        const userId = achievement.user._id.toString();
        if (!achievementsByUser[userId]) {
          achievementsByUser[userId] = [];
        }
        achievementsByUser[userId].push(achievement);
      }
    });

    res.json({
      users,
      achievements: achievementsByUser
    });
  } catch (err) {
    console.error('Error fetching all achievements for export:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new achievement
router.post('/', auth, async (req, res) => {
  try {
    const {
      type, title, description, tags, link, domainLink, imageUrl,
      startDate, endDate, role, issuer, issuedDate, expiryDate
    } = req.body;

    // Check if user has reached the limit for this type (only for limited types)
    if (LIMITED_TYPES.includes(type)) {
      const existingCount = await Achievement.countDocuments({
        user: req.user.id,
        type: type
      });

      if (existingCount >= MAX_ITEMS_PER_TYPE) {
        return res.status(400).json({
          message: `You can only add up to ${MAX_ITEMS_PER_TYPE} ${type}s. Please delete an existing one to add more.`
        });
      }
    }

    if (!type || !title || !description) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['type', 'title', 'description']
      });
    }

    // Description is a list of bullet points with per-point limits
    const descriptionPoints = normalizeDescriptionPoints(description);
    const descriptionError = validateDescriptionPoints(descriptionPoints);
    if (descriptionError) {
      return res.status(400).json({ message: descriptionError });
    }

    const achievement = new Achievement({
      user: req.user.id,
      type,
      title,
      description: descriptionPoints,
      tags: tags || [],
      link,
      domainLink,
      imageUrl,
      // Internship specific
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      role: role || '',
      // Certification specific
      issuer: issuer || '',
      issuedDate: issuedDate || undefined,
      expiryDate: expiryDate || undefined,
      recognized: resolveRecognized(type, title)
    });

    await achievement.save();
    res.status(201).json(achievement);
  } catch (err) {
    console.error('Error creating achievement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an achievement
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      type, title, description, tags, link, domainLink, imageUrl,
      startDate, endDate, role, issuer, issuedDate, expiryDate
    } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['type', 'title', 'description']
      });
    }

    // Description is a list of bullet points with per-point limits
    const descriptionPoints = normalizeDescriptionPoints(description);
    const descriptionError = validateDescriptionPoints(descriptionPoints);
    if (descriptionError) {
      return res.status(400).json({ message: descriptionError });
    }

    let achievement = await Achievement.findById(req.params.id);

    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if the achievement belongs to the user
    if (achievement.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      {
        type,
        title,
        description: descriptionPoints,
        tags: tags || [],
        link,
        domainLink,
        imageUrl,
        // Internship specific
        startDate: startDate || null,
        endDate: endDate || null,
        role: role || '',
        // Certification specific
        issuer: issuer || '',
        issuedDate: issuedDate || null,
        expiryDate: expiryDate || null,
        recognized: resolveRecognized(type, title)
      },
      { new: true }
    );

    res.json(achievement);
  } catch (err) {
    console.error('Error updating achievement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an achievement
router.delete('/:id', auth, async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);

    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Check if the achievement belongs to the user
    if (achievement.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Achievement deleted successfully' });
  } catch (err) {
    console.error('Error deleting achievement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 