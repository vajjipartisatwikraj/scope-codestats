const mongoose = require('mongoose');

const performanceOverviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  // Current metrics
  currentScore: {
    type: Number,
    default: 0
  },
  currentRank: {
    type: Number,
    default: 0
  },
  currentProblems: {
    type: Number,
    default: 0
  },
  totalActiveDays: {
    type: Number,
    default: 0
  },
  
  // Changes over last month
  scoreChangeLastMonth: {
    type: Number,
    default: 0
  },
  rankChangeLastMonth: {
    type: Number,
    default: 0
  },
  problemsChangeLastMonth: {
    type: Number,
    default: 0
  },
  
  // Historical data for calculations
  lastMonthScore: {
    type: Number,
    default: 0
  },
  lastMonthRank: {
    type: Number,
    default: 0
  },
  lastMonthProblems: {
    type: Number,
    default: 0
  },
  
  // Date tracking for debugging and verification
  presentDate: {
    type: Date,
    default: null,
    description: 'Date of the latest DailyStats document used for current values'
  },
  pastDate: {
    type: Date,
    default: null,
    description: 'Date of the 30-day-old DailyStats document used for past values'
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
performanceOverviewSchema.index({ userId: 1, lastUpdated: -1 });
performanceOverviewSchema.index({ email: 1, lastUpdated: -1 });

// Instance method to calculate changes
performanceOverviewSchema.methods.calculateChanges = function() {
  this.scoreChangeLastMonth = this.currentScore - this.lastMonthScore;
  this.rankChangeLastMonth = this.lastMonthRank - this.currentRank; // Positive means rank improved (e.g., 412 - 1 = +411)
  this.problemsChangeLastMonth = this.currentProblems - this.lastMonthProblems;
};

// Static method to update or create performance overview
performanceOverviewSchema.statics.updatePerformance = async function(userId, email, data) {
  const existing = await this.findOne({ userId });
  
  if (existing) {
    // Update existing document
    Object.assign(existing, data);
    existing.lastUpdated = new Date();
    existing.calculateChanges();
    return await existing.save();
  } else {
    // Create new document
    const newPerformance = new this({
      userId,
      email,
      ...data,
      lastUpdated: new Date()
    });
    newPerformance.calculateChanges();
    return await newPerformance.save();
  }
};

module.exports = mongoose.model('PerformanceOverview', performanceOverviewSchema);