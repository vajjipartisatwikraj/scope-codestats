const mongoose = require('mongoose');

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'user' field.
 * When a User is deleted, all UserCohort documents with matching 'user' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: UserCohort.deleteMany({ user: userId })
 */

const userCohortSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cohort',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'enrolled', 'completed', 'dropped'],
    default: 'applied'
  },
  enrolledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  moduleProgress: [{
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    },
    questionsCompleted: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  }],
  questionProgress: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    attempts: {
      type: Number,
      default: 0
    },
    solved: {
      type: Boolean,
      default: false
    },
    bestScore: {
      type: Number,
      default: 0
    },
    solvedAt: {
      type: Date
    }
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number
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

// Create a compound index for efficient querying
userCohortSchema.index({ user: 1, cohort: 1 }, { unique: true });
userCohortSchema.index({ cohort: 1, totalScore: -1 });

// Update timestamps and total score on save
userCohortSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total score from module progress
  if (this.moduleProgress && this.moduleProgress.length > 0) {
    this.totalScore = this.moduleProgress.reduce((total, module) => total + module.score, 0);
  }
  
  next();
});

module.exports = mongoose.model('UserCohort', userCohortSchema); 