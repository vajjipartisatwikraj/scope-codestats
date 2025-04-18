const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   POST /api/issues/report
// @desc    Report a new issue
// @access  Private
router.post('/report', auth, async (req, res) => {
  try {
    const { type, page, description } = req.body;
    
    if (!type || !page || !description) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    const newIssue = new Issue({
      user: req.user.id,
      type,
      page,
      description
    });
    
    await newIssue.save();
    
    return res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      issueId: newIssue._id
    });
  } catch (error) {
    console.error('Error reporting issue:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/issues
// @desc    Get all issues (admin only)
// @access  Private (Admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const { status, type, page, limit = 50, skip = 0 } = req.query;
    
    // Build query object based on filters
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (page) query.page = page;
    
    // Get total count for pagination
    const total = await Issue.countDocuments(query);
    
    // Get issues with populated user data
    const issues = await Issue.find(query)
      .populate('user', 'name email username department')
      .populate('resolvedBy', 'name email username')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    return res.json({
      success: true,
      total,
      issues
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/issues/:id
// @desc    Get issue by ID
// @access  Private (Admin or issue creator)
router.get('/:id', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('user', 'name email username department')
      .populate('resolvedBy', 'name email username');
    
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    // Check if user is admin or the issue creator
    const user = await User.findById(req.user.id);
    if (!user.isAdmin && issue.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this issue' });
    }
    
    return res.json({
      success: true,
      issue
    });
  } catch (error) {
    console.error('Error fetching issue:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/issues/:id
// @desc    Update issue status (admin only)
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    // Update fields
    if (status) issue.status = status;
    if (adminResponse) issue.adminResponse = adminResponse;
    
    // Set resolvedBy if status is resolved
    if (status === 'resolved' && !issue.resolvedBy) {
      issue.resolvedBy = req.user.id;
    }
    
    await issue.save();
    
    return res.json({
      success: true,
      message: 'Issue updated successfully',
      issue
    });
  } catch (error) {
    console.error('Error updating issue:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/issues/user/me
// @desc    Get current user's reported issues
// @access  Private
router.get('/user/me', auth, async (req, res) => {
  try {
    const issues = await Issue.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      issues
    });
  } catch (error) {
    console.error('Error fetching user issues:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/issues/:id
// @desc    Delete an issue (admin only)
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    
    await Issue.deleteOne({ _id: req.params.id });
    
    return res.json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting issue:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 