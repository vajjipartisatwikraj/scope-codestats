const mongoose = require('mongoose');

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'user' field.
 * When a User is deleted, all Achievement documents with matching 'user' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: Achievement.deleteMany({ user: userId })
 */

const achievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['internship', 'achievement', 'project', 'certification'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  link: {
    type: String,
    trim: true
  },
  domainLink: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  certificateId: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps before saving
achievementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Achievement', achievementSchema); 