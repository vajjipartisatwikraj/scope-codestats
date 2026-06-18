const mongoose = require('mongoose');

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'userId' field.
 * When a User is deleted, all DailyStats documents with matching 'userId' field
 * are automatically deleted via cascade deletion middleware in User.js
 * 
 * Related deletion query: DailyStats.deleteMany({ userId: userId })
 */

const dailyStatsSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Date for this stats snapshot (midnight UTC)
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Overall SCOPE metrics (matching your dashboard requirements)
  scopeMetrics: {
    totalScore: { type: Number, default: 0, index: true },
    scoreChange: { type: Number, default: 0 },
    overallRank: { type: Number, required: true, index: true },
    rankChange: { type: Number, default: 0 },
    departmentRank: { type: Number, required: true },
    departmentRankChange: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 },
    totalUsers: { type: Number, required: true },
    departmentUsers: { type: Number, required: true }
  },
  
  // Aggregated problem-solving stats
  problemStats: {
    totalProblems: { type: Number, default: 0, index: true },
    problemsChange: { type: Number, default: 0 },
    easyProblems: { type: Number, default: 0 },
    mediumProblems: { type: Number, default: 0 },
    hardProblems: { type: Number, default: 0 },
    dailyStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    weeklyActivity: [{
      day: String, // 'Mon', 'Tue', etc.
      problems: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    }]
  },
  
  // Contest participation stats
  contestStats: {
    totalContests: { type: Number, default: 0 },
    contestsChange: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    maxRating: { type: Number, default: 0 },
    recentContests: [{
      platform: String,
      contestName: String,
      rank: Number,
      rating: Number,
      date: Date
    }]
  },
  
  // Platform-specific detailed stats (matching your Dashboard.jsx)
  platformStats: {
    leetcode: {
      // Problem solving
      totalSolved: { type: Number, default: 0 },
      solvedChange: { type: Number, default: 0 },
      easySolved: { type: Number, default: 0 },
      mediumSolved: { type: Number, default: 0 },
      hardSolved: { type: Number, default: 0 },
      
      // Contest & Rating
      rating: { type: Number, default: 0 },
      ratingChange: { type: Number, default: 0 },
      maxRating: { type: Number, default: 0 },
      globalRanking: { type: Number, default: 0 },
      contestsAttended: { type: Number, default: 0 },
      
      // Submission stats
      totalSubmissions: { type: Number, default: 0 },
      acceptedSubmissions: { type: Number, default: 0 },
      acceptanceRate: { type: Number, default: 0 },
      
      // SCOPE scoring
      scopeScore: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      lastUpdated: Date
    },
    
    codechef: {
      totalSolved: { type: Number, default: 0 },
      solvedChange: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      ratingChange: { type: Number, default: 0 },
      maxRating: { type: Number, default: 0 },
      globalRank: { type: Number, default: 0 },
      stars: { type: String, default: '' },
      contestsRated: { type: Number, default: 0 },
      countryRank: { type: Number, default: 0 },
      scopeScore: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      lastUpdated: Date
    },
    
    codeforces: {
      totalSolved: { type: Number, default: 0 },
      solvedChange: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      ratingChange: { type: Number, default: 0 },
      maxRating: { type: Number, default: 0 },
      rank: { type: String, default: '' },
      contestsRated: { type: Number, default: 0 },
      contributionPoints: { type: Number, default: 0 },
      scopeScore: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      lastUpdated: Date
    },
    
    geeksforgeeks: {
      totalSolved: { type: Number, default: 0 },
      solvedChange: { type: Number, default: 0 },
      codingScore: { type: Number, default: 0 },
      instituteRank: { type: Number, default: 0 },
      overallRank: { type: Number, default: 0 },
      monthlyCodingScore: { type: Number, default: 0 },
      practiceScore: { type: Number, default: 0 },
      scopeScore: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      lastUpdated: Date
    },
    
    hackerrank: {
      totalSolved: { type: Number, default: 0 },
      solvedChange: { type: Number, default: 0 },
      hackos: { type: Number, default: 0 },
      badges: { type: Number, default: 0 },
      certifications: { type: Number, default: 0 },
      contests: { type: Number, default: 0 },
      domains: [{
        name: String,
        score: Number,
        problems: Number
      }],
      scopeScore: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      lastUpdated: Date
    },
    
    github: {
      totalCommits: { type: Number, default: 0 },
      commitsChange: { type: Number, default: 0 },
      publicRepos: { type: Number, default: 0 },
      reposChange: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      followersChange: { type: Number, default: 0 },
      starsReceived: { type: Number, default: 0 },
      starsChange: { type: Number, default: 0 },
      contributionStreak: { type: Number, default: 0 },
      yearlyContributions: { type: Number, default: 0 },
      weeklyContributions: [{
        day: String,
        contributions: Number
      }],
      scopeScore: { type: Number, default: 0 },
      scoreChange: { type: Number, default: 0 },
      lastUpdated: Date
    },
    
        scopecodestats: {
          // Problem solving
          totalSolved: { type: Number, default: 0 },
          solvedChange: { type: Number, default: 0 },
          
          // Practice Arena contests
          totalPracticeArenaContests: { type: Number, default: 0 },
          contestsChange: { type: Number, default: 0 },
          
          // Rating
          rating: { type: Number, default: 0 },
          ratingChange: { type: Number, default: 0 },
          maxRating: { type: Number, default: 0 },
          
          // Cohort metrics
          totalCohortsCompleted: { type: Number, default: 0 },
          cohortsChange: { type: Number, default: 0 },
          totalCohortProblemsSolved: { type: Number, default: 0 },
          cohortProblemsChange: { type: Number, default: 0 },
          totalCohortScore: { type: Number, default: 0 },
          cohortScoreChange: { type: Number, default: 0 },
          
          // Consistency metrics
          consistencyIndex: { type: Number, default: 0 },
          consistencyChange: { type: Number, default: 0 },
          consistencyScore: { type: Number, default: 0 },
          consistencyScoreChange: { type: Number, default: 0 },
          
          // Rank - can be string like "unrated" or number
          rank: { type: mongoose.Schema.Types.Mixed, default: 0 },
          rankChange: { type: Number, default: 0 },
          
          // SCOPE scoring
          scopeScore: { type: Number, default: 0 },
          scoreChange: { type: Number, default: 0 },
          lastUpdated: Date
        }
      },  // User context snapshot
  userSnapshot: {
    name: String,
    department: String,
    rollNumber: String,
    graduatingYear: Number,
    userType: { type: String, default: 'user' }
  },
  
  // Activity indicators
  activityFlags: {
    wasActive: { type: Boolean, default: false },
    activePlatforms: [String],
    inactivityDays: { type: Number, default: 0 },
    lastActiveDate: Date
  }
}, {
  timestamps: true
});

// Compound indexes for ultra-fast queries
dailyStatsSchema.index({ userId: 1, date: -1 }); // User timeline
dailyStatsSchema.index({ date: -1, 'scopeMetrics.overallRank': 1 }); // Daily leaderboard
dailyStatsSchema.index({ date: -1, 'scopeMetrics.departmentRank': 1, 'userSnapshot.department': 1 }); // Dept leaderboard
dailyStatsSchema.index({ 'userSnapshot.department': 1, date: -1 }); // Department analytics
dailyStatsSchema.index({ date: -1, 'scopeMetrics.totalScore': -1 }); // Score-based queries
dailyStatsSchema.index({ date: -1, 'problemStats.totalProblems': -1 }); // Problem-based queries

// TTL index for automatic cleanup (keep 2 years of data)
dailyStatsSchema.index({ date: 1 }, { expireAfterSeconds: 63072000 });

// Static methods for efficient data retrieval
dailyStatsSchema.statics.getUserStats = async function(userId, days = 30) {
  return await this.find({
    userId: userId,
    date: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  })
  .sort({ date: 1 })
  .lean();
};

dailyStatsSchema.statics.getLatestUserStats = async function(userId) {
  return await this.findOne({
    userId: userId
  })
  .sort({ date: -1 })
  .lean();
};

dailyStatsSchema.statics.getLeaderboard = async function(date, limit = 100, department = null) {
  const query = { date: date };
  
  // Exclude admin and teacher accounts from leaderboard
  query['userSnapshot.userType'] = { $nin: ['admin', 'teacher'] };
  
  if (department) {
    query['userSnapshot.department'] = department;
  }
  
  return await this.find(query)
    .sort({ 'scopeMetrics.overallRank': 1 })
    .limit(limit)
    .lean();
};

dailyStatsSchema.statics.getPlatformLeaderboard = async function(platform, date, limit = 100) {
  const sortField = `platformStats.${platform}.scopeScore`;
  const query = { date: date };
  
  // Exclude admin and teacher accounts from leaderboard
  query['userSnapshot.userType'] = { $nin: ['admin', 'teacher'] };
  query[sortField] = { $gt: 0 };
  
  return await this.find(query)
    .sort({ [sortField]: -1 })
    .limit(limit)
    .lean();
};

dailyStatsSchema.statics.getDepartmentAnalytics = async function(department, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { 
      'userSnapshot.department': department,
      date: { $gte: startDate }
    }},
    { $group: {
      _id: '$date',
      avgScore: { $avg: '$scopeMetrics.totalScore' },
      avgProblems: { $avg: '$problemStats.totalProblems' },
      totalUsers: { $sum: 1 },
      topScore: { $max: '$scopeMetrics.totalScore' },
      activeUsers: { $sum: { $cond: ['$activityFlags.wasActive', 1, 0] } }
    }},
    { $sort: { _id: 1 } }
  ]);
};

dailyStatsSchema.statics.getGlobalAnalytics = async function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { date: { $gte: startDate } } },
    { $group: {
      _id: '$date',
      totalUsers: { $sum: 1 },
      avgScore: { $avg: '$scopeMetrics.totalScore' },
      totalProblems: { $sum: '$problemStats.problemsChange' },
      activeUsers: { $sum: { $cond: ['$activityFlags.wasActive', 1, 0] } },
      leetcodeProblems: { $sum: '$platformStats.leetcode.problemsChange' },
      codechefProblems: { $sum: '$platformStats.codechef.problemsChange' },
      codeforcesProblems: { $sum: '$platformStats.codeforces.problemsChange' },
      geeksforgeeksProblems: { $sum: '$platformStats.geeksforgeeks.problemsChange' },
      hackerrankProblems: { $sum: '$platformStats.hackerrank.problemsChange' },
      githubContributions: { $sum: '$platformStats.github.problemsChange' }
    }},
    { $addFields: {
      platformBreakdown: {
        leetcode: '$leetcodeProblems',
        codechef: '$codechefProblems',
        codeforces: '$codeforcesProblems',
        geeksforgeeks: '$geeksforgeeksProblems',
        hackerrank: '$hackerrankProblems',
        github: '$githubContributions'
      }
    }},
    { $project: {
      _id: 1,
      totalUsers: 1,
      avgScore: 1,
      totalProblems: 1,
      activeUsers: 1,
      platformBreakdown: 1
    }},
    { $sort: { _id: 1 } }
  ]);
};

dailyStatsSchema.statics.getWeeklyActivity = async function(userId, weeks = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  
  return await this.find({
    userId: userId,
    date: { $gte: startDate }
  })
  .select('date problemStats.weeklyActivity scopeMetrics.totalScore activityFlags')
  .sort({ date: 1 })
  .lean();
};

module.exports = mongoose.model('DailyStats', dailyStatsSchema);