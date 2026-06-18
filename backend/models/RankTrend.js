const mongoose = require('mongoose');

// Schema for rank trend data (weekly, monthly, yearly)
const rankTrendSchema = new mongoose.Schema({
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
  
  // Weekly rank trends (current week)
  weeklyRanks: {
    sunday: { type: Number, default: null },
    monday: { type: Number, default: null },
    tuesday: { type: Number, default: null },
    wednesday: { type: Number, default: null },
    thursday: { type: Number, default: null },
    friday: { type: Number, default: null },
    saturday: { type: Number, default: null }
  },
  
  // Monthly rank trends (current month by weeks)
  monthlyRanks: {
    week1: { type: Number, default: null },
    week2: { type: Number, default: null },
    week3: { type: Number, default: null },
    week4: { type: Number, default: null }
  },
  
  // Yearly rank trends (current year by months)
  yearlyRanks: {
    january: { type: Number, default: null },
    february: { type: Number, default: null },
    march: { type: Number, default: null },
    april: { type: Number, default: null },
    may: { type: Number, default: null },
    june: { type: Number, default: null },
    july: { type: Number, default: null },
    august: { type: Number, default: null },
    september: { type: Number, default: null },
    october: { type: Number, default: null },
    november: { type: Number, default: null },
    december: { type: Number, default: null }
  },
  
  // Metadata
  currentWeek: {
    type: Number,
    default: 1
  },
  currentMonth: {
    type: Number,
    default: 1
  },
  currentYear: {
    type: Number,
    default: new Date().getFullYear()
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
rankTrendSchema.index({ userId: 1, currentYear: 1 });
rankTrendSchema.index({ email: 1, currentYear: 1 });

// Helper methods to get current time periods
rankTrendSchema.methods.getCurrentDayOfWeek = function() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

rankTrendSchema.methods.getCurrentWeekOfMonth = function() {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  return Math.ceil((dayOfMonth + startingDayOfWeek) / 7);
};

rankTrendSchema.methods.getCurrentMonth = function() {
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];
  return months[new Date().getMonth()];
};

// Instance method to update weekly rank
rankTrendSchema.methods.updateWeeklyRank = function(rank, dayOfWeek = null) {
  const day = dayOfWeek || this.getCurrentDayOfWeek();
  this.weeklyRanks[day] = rank;
  this.lastUpdated = new Date();
};

// Instance method to update monthly rank
rankTrendSchema.methods.updateMonthlyRank = function(rank, week = null) {
  const weekOfMonth = week || this.getCurrentWeekOfMonth();
  this.monthlyRanks[`week${weekOfMonth}`] = rank;
  this.currentWeek = weekOfMonth;
  this.lastUpdated = new Date();
};

// Instance method to update yearly rank
rankTrendSchema.methods.updateYearlyRank = function(rank, month = null) {
  const monthName = month || this.getCurrentMonth();
  this.yearlyRanks[monthName] = rank;
  this.currentMonth = new Date().getMonth() + 1;
  this.currentYear = new Date().getFullYear();
  this.lastUpdated = new Date();
};

// Static method to update or create rank trend
rankTrendSchema.statics.updateRankTrend = async function(userId, email, rank, updateType = 'all') {
  let rankTrend = await this.findOne({ userId, currentYear: new Date().getFullYear() });
  
  if (!rankTrend) {
    // Create new rank trend for the year
    rankTrend = new this({
      userId,
      email,
      currentYear: new Date().getFullYear(),
      weeklyRanks: {},
      monthlyRanks: {},
      yearlyRanks: {}
    });
  }
  
  // Update based on type
  if (updateType === 'all' || updateType === 'weekly') {
    rankTrend.updateWeeklyRank(rank);
  }
  
  if (updateType === 'all' || updateType === 'monthly') {
    rankTrend.updateMonthlyRank(rank);
  }
  
  if (updateType === 'all' || updateType === 'yearly') {
    rankTrend.updateYearlyRank(rank);
  }
  
  return await rankTrend.save();
};

// Static method to get formatted rank trends
rankTrendSchema.statics.getRankTrends = async function(userId, type = 'all') {
  const rankTrend = await this.findOne({ userId, currentYear: new Date().getFullYear() });
  
  if (!rankTrend) {
    return {
      weekly: {},
      monthly: {},
      yearly: {},
      lastUpdated: null
    };
  }
  
  const result = {
    lastUpdated: rankTrend.lastUpdated
  };
  
  if (type === 'all' || type === 'weekly') {
    result.weekly = rankTrend.weeklyRanks;
  }
  
  if (type === 'all' || type === 'monthly') {
    result.monthly = rankTrend.monthlyRanks;
  }
  
  if (type === 'all' || type === 'yearly') {
    result.yearly = rankTrend.yearlyRanks;
  }
  
  return result;
};

module.exports = mongoose.model('RankTrend', rankTrendSchema);