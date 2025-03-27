const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Achievement = require('../models/Achievement');

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

// Create a new achievement
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, description, tags, link, imageUrl, startDate, endDate } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['type', 'title', 'description']
      });
    }

    const achievement = new Achievement({
      user: req.user.id,
      type,
      title,
      description,
      tags: tags || [],
      link,
      imageUrl,
      startDate,
      endDate
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
    const { type, title, description, tags, link, imageUrl, startDate, endDate } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['type', 'title', 'description']
      });
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
        description,
        tags: tags || [],
        link,
        imageUrl,
        startDate,
        endDate
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