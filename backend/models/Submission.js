const mongoose = require('mongoose');

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'user' field.
 * When a User is deleted, all Submission documents with matching 'user' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: Submission.deleteMany({ user: userId })
 */

const testCaseResultSchema = new mongoose.Schema({
  testCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false  // Make optional - not needed for new secure execution flow
  },
  passed: {
    type: Boolean,
    required: true
  },
  executionTime: {
    type: Number // in milliseconds
  },
  memoryUsed: {
    type: Number // in KB
  },
  output: String,
  error: String
});

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cohort',
    required: true
  },
  submissionType: {
    type: String,
    enum: ['mcq', 'programming'],
    required: true
  },
  // For MCQ questions
  selectedOption: {
    type: mongoose.Schema.Types.ObjectId
  },
  // For programming questions
  code: {
    type: String
  },
  language: {
    type: String,
    enum: ['c', 'cpp', 'java', 'python', 'javascript']
  },
  status: {
    type: String,
    enum: ['accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'pending'],
    default: 'wrong_answer'
  },
  testCaseResults: [testCaseResultSchema],
  executionTime: {
    type: Number // in milliseconds
  },
  memoryUsed: {
    type: Number // in KB
  },
  score: {
    type: Number,
    default: 0
  },
  // Points earned based on scoring tiers (for performance-based scoring)
  pointsEarned: {
    type: Number,
    default: 0
  },
  // Which scoring tier was achieved (for display/analytics)
  tierAchieved: {
    type: Number, // Index of the tier in scoringTiers array, or -1 for minimum points
    default: -1
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
submissionSchema.index({ user: 1, question: 1, cohort: 1 });
submissionSchema.index({ cohort: 1, submittedAt: -1 });

/**
 * Static method to enforce submission limit per user per question
 * Maintains a maximum of 5 submissions per user per question using FIFO queue
 * @param {ObjectId} userId - The user's ID
 * @param {ObjectId} questionId - The question's ID
 * @returns {Promise<void>}
 */
submissionSchema.statics.enforceSubmissionLimit = async function(userId, questionId) {
  const MAX_SUBMISSIONS = 5;
  
  // Quick count check — avoids fetching full documents
  const count = await this.countDocuments({ user: userId, question: questionId });
  
  // If we have 5 or more submissions, delete the oldest ones to make room for the new one
  if (count >= MAX_SUBMISSIONS) {
    const numToDelete = count - MAX_SUBMISSIONS + 1;
    
    // Find and delete the oldest submission(s) using lean IDs only
    const oldest = await this.find({ user: userId, question: questionId })
      .sort({ submittedAt: 1 })
      .limit(numToDelete)
      .select('_id')
      .lean();
    
    if (oldest.length > 0) {
      await this.deleteMany({ _id: { $in: oldest.map(s => s._id) } });
      console.log(`Deleted ${oldest.length} old submission(s) for user ${userId} on question ${questionId}`);
    }
  }
};

module.exports = mongoose.model('Submission', submissionSchema); 