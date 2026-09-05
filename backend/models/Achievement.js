const mongoose = require('mongoose');
const { DESCRIPTION_LIMITS } = require('../utils/descriptionPoints');

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
  // Bullet points, 2-5 entries. See utils/descriptionPoints.js for the
  // per-point word/character limits enforced by the routes.
  description: {
    type: [String],
    default: [],
    validate: {
      validator: (points) =>
        Array.isArray(points) &&
        points.length >= DESCRIPTION_LIMITS.minPoints &&
        points.length <= DESCRIPTION_LIMITS.maxPoints,
      message: `Description must have between ${DESCRIPTION_LIMITS.minPoints} and ${DESCRIPTION_LIMITS.maxPoints} points`
    }
  },
  // Internships: the position held
  role: {
    type: String,
    trim: true,
    default: ''
  },
  // Certifications: who issued it, and its validity window
  issuer: {
    type: String,
    trim: true,
    default: ''
  },
  /**
   * True when the title matches the curated catalogue in
   * constants/certifications.js. Always derived on the server - never taken
   * from the request - so it cannot be forged. Recognised certificates are
   * highlighted in gold on the profile.
   */
  recognized: {
    type: Boolean,
    default: false
  },
  issuedDate: {
    type: Date
  },
  expiryDate: {
    type: Date
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