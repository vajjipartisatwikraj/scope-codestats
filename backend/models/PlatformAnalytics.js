const mongoose = require('mongoose');

// Schema for platform analytics data
const platformAnalyticsSchema = new mongoose.Schema({
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
  
  // LeetCode analytics
  leetcode: {
    problemsSolved: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalContests: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    weeklyRatings: {
      week1: { type: Number, default: 0 },
      week2: { type: Number, default: 0 },
      week3: { type: Number, default: 0 },
      week4: { type: Number, default: 0 }
    },
    lastContest: {
      name: { type: String, default: '' },
      rank: { type: Number, default: 0 },
      date: { type: Date, default: null }
    }
  },
  
  // CodeChef analytics
  codechef: {
    problemsSolved: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalContests: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    weeklyRatings: {
      week1: { type: Number, default: 0 },
      week2: { type: Number, default: 0 },
      week3: { type: Number, default: 0 },
      week4: { type: Number, default: 0 }
    },
    lastContest: {
      name: { type: String, default: '' },
      rank: { type: Number, default: 0 },
      date: { type: Date, default: null }
    }
  },
  
  // CodeForces analytics
  codeforces: {
    problemsSolved: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalContests: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    weeklyRatings: {
      week1: { type: Number, default: 0 },
      week2: { type: Number, default: 0 },
      week3: { type: Number, default: 0 },
      week4: { type: Number, default: 0 }
    },
    lastContest: {
      name: { type: String, default: '' },
      rank: { type: Number, default: 0 },
      date: { type: Date, default: null }
    }
  },
  
  // GeeksforGeeks analytics (only problems and score)
  geeksforgeeks: {
    problemsSolved: { type: Number, default: 0 },
    score: { type: Number, default: 0 }
  },
  
  // HackerRank analytics (only problems and score)
  hackerrank: {
    problemsSolved: { type: Number, default: 0 },
    score: { type: Number, default: 0 }
  },
  
  // GitHub analytics
  github: {
    commits: { type: Number, default: 0 },
    repos: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    contributions: {
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      thisYear: { type: Number, default: 0 }
    },
    languages: [{
      name: { type: String },
      percentage: { type: Number }
    }]
  },
  
  // ScopeCODESTATS analytics
  scopecodestats: {
    problemsSolved: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalPracticeArenaContests: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalCohortsCompleted: { type: Number, default: 0 },
    totalCohortProblemsSolved: { type: Number, default: 0 },
    totalCohortScore: { type: Number, default: 0 },
    consistencyIndex: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0 },
    rank: { type: mongoose.Schema.Types.Mixed, default: 0 } // Can be "unrated" or number
  },
  
  // Overall analytics
  totalScore: { type: Number, default: 0 },
  totalProblems: { type: Number, default: 0 },
  activePlatforms: { type: Number, default: 0 },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
platformAnalyticsSchema.index({ userId: 1, lastUpdated: -1 });
platformAnalyticsSchema.index({ email: 1, lastUpdated: -1 });

// Instance method to calculate totals
platformAnalyticsSchema.methods.calculateTotals = function() {
  this.totalScore = (this.leetcode.score || 0) + 
                   (this.codechef.score || 0) + 
                   (this.codeforces.score || 0) + 
                   (this.geeksforgeeks.score || 0) + 
                   (this.hackerrank.score || 0) + 
                   (this.github.score || 0) +
                   (this.scopecodestats.score || 0);
                   
  this.totalProblems = (this.leetcode.problemsSolved || 0) + 
                      (this.codechef.problemsSolved || 0) + 
                      (this.codeforces.problemsSolved || 0) + 
                      (this.geeksforgeeks.problemsSolved || 0) + 
                      (this.hackerrank.problemsSolved || 0) +
                      (this.scopecodestats.problemsSolved || 0);
                      
  // Count active platforms (platforms with score > 0)
  this.activePlatforms = 0;
  if (this.leetcode.score > 0) this.activePlatforms++;
  if (this.codechef.score > 0) this.activePlatforms++;
  if (this.codeforces.score > 0) this.activePlatforms++;
  if (this.geeksforgeeks.score > 0) this.activePlatforms++;
  if (this.hackerrank.score > 0) this.activePlatforms++;
  if (this.github.score > 0) this.activePlatforms++;
  if (this.scopecodestats.score > 0) this.activePlatforms++;
};

// Instance method to update platform data
platformAnalyticsSchema.methods.updatePlatform = function(platform, data) {
  if (!this[platform]) {
    console.warn(`Platform ${platform} not found in schema`);
    return;
  }
  
  // Update platform-specific data
  Object.assign(this[platform], data);
  
  // Calculate totals
  this.calculateTotals();
  this.lastUpdated = new Date();
};

// Static method to update or create platform analytics
platformAnalyticsSchema.statics.updatePlatformAnalytics = async function(userId, email, platform, data) {
  let analytics = await this.findOne({ userId });
  
  if (!analytics) {
    // Create new analytics document
    analytics = new this({
      userId,
      email,
      leetcode: { weeklyRatings: {} },
      codechef: { weeklyRatings: {} },
      codeforces: { weeklyRatings: {} },
      geeksforgeeks: {},
      hackerrank: {},
      github: { contributions: {}, languages: [] }
    });
  }
  
  analytics.updatePlatform(platform, data);
  return await analytics.save();
};

// Static method to get formatted analytics
platformAnalyticsSchema.statics.getPlatformAnalytics = async function(userId) {
  const analytics = await this.findOne({ userId });
  
  if (!analytics) {
    return {
      leetcode: { problemsSolved: 0, score: 0, totalContests: 0, rating: 0, weeklyRatings: {} },
      codechef: { problemsSolved: 0, score: 0, totalContests: 0, rating: 0, weeklyRatings: {} },
      codeforces: { problemsSolved: 0, score: 0, totalContests: 0, rating: 0, weeklyRatings: {} },
      geeksforgeeks: { problemsSolved: 0, score: 0 },
      hackerrank: { problemsSolved: 0, score: 0 },
      github: { commits: 0, repos: 0, score: 0, contributions: {} },
      scopecodestats: { problemsSolved: 0, score: 0, totalPracticeArenaContests: 0, rating: 0, totalCohortsCompleted: 0, totalCohortProblemsSolved: 0, totalCohortScore: 0, consistencyIndex: 0, consistencyScore: 0, rank: 0 },
      totalScore: 0,
      totalProblems: 0,
      activePlatforms: 0,
      lastUpdated: null
    };
  }
  
  return {
    leetcode: analytics.leetcode,
    codechef: analytics.codechef,
    codeforces: analytics.codeforces,
    geeksforgeeks: analytics.geeksforgeeks,
    hackerrank: analytics.hackerrank,
    github: analytics.github,
    scopecodestats: analytics.scopecodestats,
    totalScore: analytics.totalScore,
    totalProblems: analytics.totalProblems,
    activePlatforms: analytics.activePlatforms,
    lastUpdated: analytics.lastUpdated
  };
};

module.exports = mongoose.model('PlatformAnalytics', platformAnalyticsSchema);