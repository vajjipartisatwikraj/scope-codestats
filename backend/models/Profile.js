const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['leetcode', 'codeforces', 'codechef', 'geeksforgeeks', 'hackerrank', 'github']
  },
  username: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  problemsSolved: {
    type: Number,
    default: 0
  },
  // Fields for coding platforms
  easyProblemsSolved: {
    type: Number,
    default: 0
  },
  mediumProblemsSolved: {
    type: Number,
    default: 0
  },
  hardProblemsSolved: {
    type: Number,
    default: 0
  },
  // New fields for GeeksforGeeks
  basicProblemsSolved: {
    type: Number,
    default: 0
  },
  schoolProblemsSolved: {
    type: Number,
    default: 0
  },
  monthlyScore: {
    type: Number,
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  maxStreak: {
    type: Number,
    default: 0
  },
  // Contest participation details
  contestsParticipated: {
    type: Number,
    default: 0
  },
  contestRanking: {
    type: Number,
    default: 0
  },
  contestBadge: {
    type: String,
    default: ''
  },
  // Additional contest fields
  recentContests: {
    type: [{
      contestName: String,
      contestDate: Date,
      rank: Number,
      score: Number,
      problemsSolved: Number,
      totalParticipants: Number
    }],
    default: []
  },
  bestContestRank: {
    type: Number,
    default: 0
  },
  lastContestDate: {
    type: Date,
    default: null
  },
  rating: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    default: 'unrated'
  },
  maxRating: {
    type: Number,
    default: 0
  },
  globalRank: {
    type: Number,
    default: 0
  },
  countryRank: {
    type: Number,
    default: 0
  },
  instituteRank: {
    type: Number,
    default: 0
  },
  // GitHub specific fields
  details: {
    type: {
      publicRepos: { type: Number, default: 0 },
      totalCommits: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
      starsReceived: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      // Additional GitHub details
      repoLanguages: { type: Map, of: Number, default: {} }, // Languages used and byte count
      contributionsLastYear: { type: Number, default: 0 },
      topRepos: { 
        type: [{
          name: String,
          stars: Number,
          forks: Number,
          language: String
        }],
        default: []
      }
    },
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  autoSynced: {
    type: Boolean,
    default: false
  },
  lastUpdateStatus: {
    type: String,
    enum: ['success', 'error', 'pending', 'updating', 'skipped'],
    default: 'pending'
  },
  lastUpdateError: {
    type: String,
    default: null
  },
  lastUpdateAttempt: {
    type: Date,
    default: null
  },
  updateAttempts: {
    type: Number,
    default: 0
  }
});

// Index for faster queries
ProfileSchema.index({ userId: 1, platform: 1 }, { unique: true });

// Validate score before saving
ProfileSchema.pre('save', function(next) {
  // Ensure score is a valid number
  if (typeof this.score !== 'number' || isNaN(this.score)) {
    this.score = 0;
  }
  next();
});

// Update user's total score when profile score changes
ProfileSchema.post('save', async function(doc) {
  try {
    const scoreAggregator = require('../services/scoreAggregator');
    const totalScore = await scoreAggregator.updateUserTotalScore(doc.userId);
    console.log(`Updated total score for user ${doc.userId}: ${totalScore}`);
  } catch (err) {
    console.error('Error updating total score after profile save:', err);
  }
});

ProfileSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    try {
      const scoreAggregator = require('../services/scoreAggregator');
      await scoreAggregator.updateUserTotalScore(doc.userId);
    } catch (err) {
      console.error('Error updating total score after profile update:', err);
    }
  }
});

// Add validation to the Profile model

// Pre-save middleware to validate profiles
ProfileSchema.pre('save', function(next) {
  // Check if username matches expected patterns for the platform
  const isValid = this.validateProfileFormat();
  if (!isValid) {
    const error = new Error('Invalid profile format');
    return next(error);
  }
  next();
});

ProfileSchema.methods.validateProfileFormat = function() {
  // Add platform-specific validation logic
  switch (this.platform) {
    case 'leetcode':
      // LeetCode usernames are alphanumeric
      return /^[a-zA-Z0-9_-]+$/.test(this.username);
    case 'github':
      // GitHub usernames have specific requirements
      return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(this.username);
    // Add cases for other platforms
    default:
      return true;
  }
};

module.exports = mongoose.model('Profile', ProfileSchema);
