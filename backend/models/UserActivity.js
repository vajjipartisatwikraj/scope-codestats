const mongoose = require('mongoose');

/**
 * Lightweight activity tracking - stores only changes/events
 * Instead of full daily snapshots, store only when activity occurs
 */
const userActivitySchema = new mongoose.Schema({
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
  
  // Only store what changed today
  dailyChanges: {
    scoreIncrease: { type: Number, default: 0 },
    problemsIncrease: { type: Number, default: 0 },
    rankChange: { type: Number, default: 0 }
  },
  
  // Platform-specific changes (only non-zero values)
  platformChanges: {
    leetcode: {
      scoreIncrease: { type: Number, default: 0 },
      problemsIncrease: { type: Number, default: 0 }
    },
    codechef: {
      scoreIncrease: { type: Number, default: 0 },
      problemsIncrease: { type: Number, default: 0 }
    },
    // ... other platforms
  },
  
  // Lightweight activity flag
  hasActivity: { type: Boolean, default: false }
}, {
  timestamps: false // Save space
});

// Compound index for efficient queries
userActivitySchema.index({ userId: 1, date: -1 });
userActivitySchema.index({ date: -1, hasActivity: true }); // Active days only

// TTL - Auto-delete after 2 years
userActivitySchema.index({ date: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('UserActivity', userActivitySchema);