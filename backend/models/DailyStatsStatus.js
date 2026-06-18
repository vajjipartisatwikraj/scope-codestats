const mongoose = require('mongoose');

const dailyStatsStatusSchema = new mongoose.Schema({
  // Execution timing
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: false
  },
  duration: {
    type: Number, // Duration in seconds
    required: false
  },
  
  // Execution status
  status: {
    type: String,
    enum: ['running', 'success', 'partial', 'failed'],
    required: true
  },
  
  // User processing stats
  totalUsers: {
    type: Number,
    default: 0
  },
  totalUsersProcessed: {
    type: Number,
    default: 0
  },
  successfulUsers: {
    type: Number,
    default: 0
  },
  failedUsers: {
    type: Number,
    default: 0
  },
  
  // Document counts
  documentCounts: {
    dailyStats: {
      type: Number,
      default: 0
    },
    dailyActivityHeatmaps: {
      type: Number,
      default: 0
    },
    performanceOverviews: {
      type: Number,
      default: 0
    },
    platformAnalytics: {
      type: Number,
      default: 0
    },
    platformPerformances: {
      type: Number,
      default: 0
    },
    rankTrends: {
      type: Number,
      default: 0
    }
  },
  
  // Rank calculation stats
  rankCalculation: {
    totalRankedUsers: {
      type: Number,
      default: 0
    },
    departmentsProcessed: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0
    }
  },
  
  // Error details (renamed from 'errors' to avoid Mongoose reserved keyword warning)
  errorLog: [{
    phase: String, // e.g., 'user-processing', 'rank-calculation', 'analytics'
    message: String,
    userId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  }],
  
  // Summary message
  summary: {
    type: String,
    default: ''
  },
  
  // Cron job type
  jobType: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  
  // Triggered by (for manual runs)
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
dailyStatsStatusSchema.index({ startTime: -1 });
dailyStatsStatusSchema.index({ status: 1 });
dailyStatsStatusSchema.index({ jobType: 1 });

// Static method to get latest status
dailyStatsStatusSchema.statics.getLatestStatus = async function() {
  return await this.findOne().sort({ startTime: -1 }).exec();
};

// Static method to get execution history
dailyStatsStatusSchema.statics.getHistory = async function(limit = 30) {
  return await this.find()
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('triggeredBy', 'name email')
    .exec();
};

// Static method to cleanup old records (keep only last 3)
dailyStatsStatusSchema.statics.cleanupOldRecords = async function() {
  try {
    // Count total records
    const totalCount = await this.countDocuments();
    
    // If we have more than 3 records, delete the oldest ones
    if (totalCount > 3) {
      // Get the IDs of records to keep (last 3)
      const recordsToKeep = await this.find()
        .sort({ startTime: -1 })
        .limit(3)
        .select('_id');
      
      const idsToKeep = recordsToKeep.map(record => record._id);
      
      // Delete all records except the ones we want to keep
      const result = await this.deleteMany({ _id: { $nin: idsToKeep } });
      
      console.log(`DailyStatsStatus cleanup: Deleted ${result.deletedCount} old records, kept last 3`);
      return result.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error cleaning up DailyStatsStatus:', error);
    throw error;
  }
};

module.exports = mongoose.model('DailyStatsStatus', dailyStatsStatusSchema);
