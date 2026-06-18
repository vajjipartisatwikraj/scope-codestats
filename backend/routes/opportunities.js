const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

// @route   GET /api/opportunities
// @desc    Get all opportunities
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const opportunities = await Opportunity.find().sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/opportunities/saved
// @desc    Get user's saved opportunities
// @access  Private
router.get('/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const opportunities = await Opportunity.find({ savedBy: req.user.id });
    res.json(opportunities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/opportunities/:id
// @desc    Get opportunity by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ msg: 'Opportunity not found' });
    }
    
    res.json(opportunity);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Opportunity not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/opportunities/:id/save
// @desc    Save an opportunity
// @access  Private
router.post('/:id/save', auth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ msg: 'Opportunity not found' });
    }
    
    // Check if already saved
    if (opportunity.savedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Opportunity already saved' });
    }
    
    opportunity.savedBy.push(req.user.id);
    await opportunity.save();
    
    res.json(opportunity);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Opportunity not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/opportunities/:id/save
// @desc    Unsave an opportunity
// @access  Private
router.delete('/:id/save', auth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ msg: 'Opportunity not found' });
    }
    
    // Check if not saved
    if (!opportunity.savedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Opportunity not saved' });
    }
    
    opportunity.savedBy = opportunity.savedBy.filter(id => id.toString() !== req.user.id);
    await opportunity.save();
    
    res.json(opportunity);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Opportunity not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/opportunities/debug/count
// @desc    Get count of opportunities in the database
// @access  Public
router.get('/debug/count', async (req, res) => {
  try {
    const count = await Opportunity.countDocuments();
    const opportunities = await Opportunity.find().select('title').limit(5);
    res.json({ 
      count, 
      message: `Found ${count} opportunities in the database`,
      sampleOpportunities: opportunities
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 