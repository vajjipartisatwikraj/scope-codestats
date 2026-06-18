const mongoose = require('mongoose');

/**
 * Stores ONLY current state of each user - no historical data
 * Updated daily with latest totals
 */
const currentUserStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Current totals (not historical)
  currentStats: {
    totalScore: { type: Number, default: 0 },
    totalProblems: { type: Number, default: 0 },
    currentRank: { type: Number, default: null },
    activeDays: { type: Number, default: 0 }
  },
  
  // Platform totals
  platforms: {
    leetcode: {
      totalScore: { type: Number, default: 0 },
      totalProblems: { type: Number, default: 0 }
    },
    codechef: {
      totalScore: { type: Number, default: 0 },
      totalProblems: { type: Number, default: 0 }
    }
    // ... other platforms
  },
  
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Static method to update user stats
currentUserStatsSchema.statics.updateUserStats = async function(userId, newData) {
  return await this.findOneAndUpdate(
    { userId },
    { 
      $set: { 
        currentStats: newData.currentStats,
        platforms: newData.platforms,
        lastUpdated: new Date()
      }
    },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('CurrentUserStats', currentUserStatsSchema);