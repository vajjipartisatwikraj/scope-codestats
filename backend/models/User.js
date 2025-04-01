const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  newUser: {
    type: Boolean,
    default: true
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/(@mlrit\.ac\.in|@mlrinstitutions\.ac\.in)$/, 'Please use your MLRIT college email address']
  },
  department: {
    type: String,
    required: true,
    enum: ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE']
  },
  section: {
    type: String,
    enum: ['None', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
  },
  graduatingYear: {
    type: Number,
    min: 2024,
    max: 2030,
    validate: {
      validator: Number.isInteger,
      message: 'Graduating year must be a 4-digit number'
    }
  },
  mobileNumber: {
    type: String,
    unique: false,
    required: false,
    validate: {
      validator: function(v) {
        // Skip validation if empty or undefined
        if (!v || v.length === 0) return true;
        
        // Remove any spaces or special characters
        const cleanNumber = v.replace(/[\s-]/g, '');
        
        // Accept 10-digit numbers starting with 6-9
        if (/^[6-9]\d{9}$/.test(cleanNumber)) return true;
        
        // Accept 11-digit numbers starting with 0 (like 09XXXXXXXXX)
        if (/^0[6-9]\d{9}$/.test(cleanNumber)) return true;
        
        // If none of the above patterns match, validation fails
        return false;
      },
      message: 'Please enter a valid 10-digit mobile number (or 11-digit with leading 0)'
    }
  },
  password: {
    type: String,
    required: false
  },
  profiles: {
    geeksforgeeks: {
      type: String,
      default: ''
    },
    codechef: {
      type: String,
      default: ''
    },
    codeforces: {
      type: String,
      default: ''
    },
    leetcode: {
      type: String,
      default: ''
    },
    hackerrank: {
      type: String,
      default: ''
    },
    github: {
      type: String,
      default: ''
    }
  },
  platformData: {
    codechef: {
      username: String,
      global_rank: Number,
      country_rank: Number,
      problemsSolved: Number,
      contestsParticipated: Number,
      rating: Number,
      score: Number,
      lastUpdated: Date
    },
    codeforces: {
      username: String,
      rating: Number,
      rank: String,
      maxRating: Number,
      contestsParticipated: Number,
      problemsSolved: Number,
      score: Number,
      lastUpdated: Date
    },
    leetcode: {
      username: String,
      ranking: Number,
      totalSolved: Number,
      easySolved: Number,
      mediumSolved: Number,
      hardSolved: Number,
      score: Number,
      rating: Number,
      lastUpdated: Date
    },
    geeksforgeeks: {
      username: String,
      codingScore: Number,
      problemsSolved: Number,
      instituteRank: Number,
      score: Number,
      lastUpdated: Date
    },
    hackerrank: {
      username: String,
      problemsSolved: Number,
      badges: Number,
      certificates: Number,
      score: Number,
      lastUpdated: Date
    }
  },
  platformScores: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  githubStats: {
    totalCommits: {
      type: Number,
      default: 0
    },
    publicRepos: {
      type: Number,
      default: 0
    },
    starsReceived: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    },
    contributionsLastYear: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },
  contestStats: {
    totalContestsParticipated: {
      type: Number,
      default: 0
    },
    bestRank: {
      type: Number,
      default: 0
    },
    lastContestDate: {
      type: Date,
      default: null
    },
    contestsByPlatform: {
      codeforces: { type: Number, default: 0 },
      codechef: { type: Number, default: 0 },
      leetcode: { type: Number, default: 0 },
      hackerrank: { type: Number, default: 0 },
      geeksforgeeks: { type: Number, default: 0 }
    }
  },
  totalScore: {
    type: Number,
    default: 0
  },
  totalProblemsSolved: {
    type: Number,
    default: 0
  },
  problemStats: {
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 }
  },
  lastProfileSync: {
    type: Date,
    default: null
  },
  skills: {
    type: [String],
    default: []
  },
  interests: {
    type: [String],
    default: []
  },
  about: {
    type: String,
    default: ''
  },
  linkedinUrl: {
    type: String,
    default: ''
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  problemsSolved: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  profilePicture: String
}, {
  timestamps: true
});

// Update lastActive whenever the user document is modified
userSchema.pre('save', async function(next) {
  this.lastActive = new Date();
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
