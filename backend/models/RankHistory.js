const mongoose = require('mongoose');

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'userId' field.
 * When a User is deleted, all RankHistory documents with matching 'userId' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: RankHistory.deleteMany({ userId: userId })
 */

const rankHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  overallRank: {
    type: Number,
    required: true
  },
  departmentRank: {
    type: Number,
    required: true
  },
  totalScore: {
    type: Number,
    required: true
  },
  totalProblemsSolved: {
    type: Number,
    default: 0
  },
  // Store user department for filtering
  department: {
    type: String,
    required: true,
    enum: ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE']
  },
  // Platform-specific data for analytics
  platformData: {
    leetcode: {
      score: { type: Number, default: 0 },
      problemsSolved: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 }, // Daily change
      problemsChange: { type: Number, default: 0 }
    },
    codechef: {
      score: { type: Number, default: 0 },
      problemsSolved: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      problemsChange: { type: Number, default: 0 }
    },
    codeforces: {
      score: { type: Number, default: 0 },
      problemsSolved: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      problemsChange: { type: Number, default: 0 }
    },
    geeksforgeeks: {
      score: { type: Number, default: 0 },
      problemsSolved: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      problemsChange: { type: Number, default: 0 }
    },
    hackerrank: {
      score: { type: Number, default: 0 },
      problemsSolved: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      problemsChange: { type: Number, default: 0 }
    },
    github: {
      score: { type: Number, default: 0 },
      problemsSolved: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      problemsChange: { type: Number, default: 0 }
    }
  },
  // Daily score changes
  totalScoreChange: {
    type: Number,
    default: 0
  },
  totalProblemsChange: {
    type: Number,
    default: 0
  },
  // Store additional metadata for debugging
  totalUsers: {
    type: Number,
    default: 0
  },
  totalDepartmentUsers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient querying by user and date range
rankHistorySchema.index({ userId: 1, date: -1 });

// Index for efficient cleanup queries
rankHistorySchema.index({ date: 1 });

// Compound index for department-wise queries
rankHistorySchema.index({ department: 1, date: -1 });

// Static method to get last N days of ranks for a user
rankHistorySchema.statics.getLastNDaysRanks = async function(userId, days = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    userId: userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 }).lean();
};

// Static method to cleanup old rank history (keep only last 30 days)
rankHistorySchema.statics.cleanupOldHistory = async function() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  
  const result = await this.deleteMany({
    date: { $lt: cutoffDate }
  });
  
  console.log(`Cleaned up ${result.deletedCount} old rank history records`);
  return result;
};

// Static method to save daily ranks for all users
rankHistorySchema.statics.saveDailyRanks = async function(rankData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  // Delete existing records for today (in case we're re-running)
  await this.deleteMany({ date: today });
  
  // Insert new rank data
  const bulkOps = rankData.map(rank => ({
    insertOne: {
      document: {
        ...rank,
        date: today
      }
    }
  }));
  
  if (bulkOps.length > 0) {
    const result = await this.bulkWrite(bulkOps);
    console.log(`Saved ${result.insertedCount} rank history records for ${today.toDateString()}`);
    return result;
  }
  
  return null;
};

// Static method to get last N days ranks for a specific user
rankHistorySchema.statics.getLastNDaysRanks = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  const ranks = await this.find({
    userId: userId,
    date: { $gte: startDate }
  })
  .sort({ date: 1 }) // Ascending order (oldest first)
  .lean();
  
  return ranks;
};

module.exports = mongoose.model('RankHistory', rankHistorySchema); 