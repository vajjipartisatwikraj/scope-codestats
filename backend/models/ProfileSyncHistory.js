const mongoose = require('mongoose');

const profileSyncHistorySchema = new mongoose.Schema({
  // Basic sync info
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled'],
    default: 'running',
    required: true
  },
  jobType: {
    type: String,
    enum: ['manual', 'scheduled'],
    default: 'scheduled',
    required: true
  },

  // Timing information
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },

  // User statistics
  totalUsers: {
    type: Number,
    default: 0
  },
  processedUsers: {
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

  // Profile statistics
  totalProfiles: {
    type: Number,
    default: 0
  },
  updatedProfiles: {
    type: Number,
    default: 0
  },
  failedProfiles: {
    type: Number,
    default: 0
  },
  skippedProfiles: {
    type: Number,
    default: 0
  },

  // Platform-wise statistics
  platformStats: [{
    platform: {
      type: String,
      enum: ['leetcode', 'codeforces', 'codechef', 'geeksforgeeks', 'hackerrank'],
      required: true
    },
    totalProfiles: {
      type: Number,
      default: 0
    },
    successfulProfiles: {
      type: Number,
      default: 0
    },
    failedProfiles: {
      type: Number,
      default: 0
    },
    skippedProfiles: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number, // in milliseconds
      default: 0
    }
  }],

  // Failed profiles details
  failedProfileDetails: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userEmail: String,
    userDepartment: String,
    userSection: String,
    userYear: Number,
    platform: {
      type: String,
      enum: ['leetcode', 'codeforces', 'codechef', 'geeksforgeeks', 'hackerrank']
    },
    platformUsername: String,
    error: String,
    errorCode: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Progress tracking
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentPhase: {
    type: String,
    enum: ['initializing', 'fetching_users', 'syncing_profiles', 'calculating_stats', 'completed', 'cancelled'],
    default: 'initializing'
  },

  // Error tracking (renamed from 'errors' to avoid Mongoose reserved keyword warning)
  errorLog: [{
    phase: String,
    message: String,
    userId: mongoose.Schema.Types.ObjectId,
    platform: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Performance metrics
  performanceMetrics: {
    averageUserProcessingTime: Number, // in milliseconds
    averageProfileUpdateTime: Number,
    peakMemoryUsage: Number, // in MB
    totalApiCalls: Number,
    apiCallsPerPlatform: {
      leetcode: Number,
      codeforces: Number,
      codechef: Number,
      geeksforgeeks: Number,
      hackerrank: Number
    }
  },

  // Summary and notes
  summary: String,
  notes: String,

  // Cancellation info
  cancelled: {
    type: Boolean,
    default: false
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancellationReason: String,

  // Triggered by
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
profileSyncHistorySchema.index({ startTime: -1 });
profileSyncHistorySchema.index({ status: 1 });
profileSyncHistorySchema.index({ jobType: 1 });
profileSyncHistorySchema.index({ createdAt: -1 });

// Virtual for elapsed time (when still running)
profileSyncHistorySchema.virtual('elapsedTime').get(function() {
  if (this.endTime) {
    return this.duration;
  }
  return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
});

// Method to calculate duration
profileSyncHistorySchema.methods.calculateDuration = function() {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  return this.duration;
};

// Method to update progress
profileSyncHistorySchema.methods.updateProgress = function(processed, total) {
  if (total > 0) {
    this.progress = Math.round((processed / total) * 100);
  }
  this.processedUsers = processed;
  this.totalUsers = total;
};

// Method to add failed profile
profileSyncHistorySchema.methods.addFailedProfile = function(userId, userName, userEmail, platform, platformUsername, error, errorCode) {
  this.failedProfileDetails.push({
    userId,
    userName,
    userEmail,
    platform,
    platformUsername,
    error,
    errorCode,
    timestamp: new Date()
  });
  this.failedProfiles = this.failedProfileDetails.length;
};

// Method to update platform stats
profileSyncHistorySchema.methods.updatePlatformStats = function(platform, success, failed, responseTime) {
  let platformStat = this.platformStats.find(ps => ps.platform === platform);
  
  if (!platformStat) {
    platformStat = {
      platform,
      totalProfiles: 0,
      successfulProfiles: 0,
      failedProfiles: 0,
      skippedProfiles: 0,
      averageResponseTime: 0
    };
    this.platformStats.push(platformStat);
  }

  platformStat.totalProfiles += 1;
  if (success) {
    platformStat.successfulProfiles += 1;
  } else if (failed) {
    platformStat.failedProfiles += 1;
  }

  // Update average response time
  if (responseTime) {
    const totalTime = platformStat.averageResponseTime * (platformStat.totalProfiles - 1);
    platformStat.averageResponseTime = Math.round((totalTime + responseTime) / platformStat.totalProfiles);
  }
};

// Static method to get recent sync history
profileSyncHistorySchema.statics.getRecentHistory = function(limit = 10) {
  return this.find()
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('triggeredBy', 'name email')
    .populate('cancelledBy', 'name email')
    .select('-failedProfileDetails.userId') // Exclude full user IDs for privacy
    .lean();
};

// Static method to get latest sync
profileSyncHistorySchema.statics.getLatestSync = function() {
  return this.findOne()
    .sort({ startTime: -1 })
    .populate('triggeredBy', 'name email')
    .populate('cancelledBy', 'name email')
    .lean();
};

// Static method to get active sync
profileSyncHistorySchema.statics.getActiveSync = function() {
  return this.findOne({ status: 'running' })
    .sort({ startTime: -1 })
    .populate('triggeredBy', 'name email')
    .lean();
};

// Static method to get sync statistics
profileSyncHistorySchema.statics.getSyncStatistics = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        startTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSyncs: { $sum: 1 },
        successfulSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        cancelledSyncs: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalUsersProcessed: { $sum: '$processedUsers' },
        totalProfilesUpdated: { $sum: '$updatedProfiles' },
        totalProfilesFailed: { $sum: '$failedProfiles' },
        averageDuration: { $avg: '$duration' },
        averageSuccessRate: {
          $avg: {
            $cond: [
              { $gt: [{ $add: ['$updatedProfiles', '$failedProfiles'] }, 0] },
              { 
                $multiply: [
                  { 
                    $divide: [
                      '$updatedProfiles', 
                      { $add: ['$updatedProfiles', '$failedProfiles'] }
                    ] 
                  }, 
                  100
                ] 
              },
              0
            ]
          }
        }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : null;
};

// Static method to cleanup old records (keep only last 3)
profileSyncHistorySchema.statics.cleanupOldRecords = async function() {
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
      
      console.log(`ProfileSyncHistory cleanup: Deleted ${result.deletedCount} old records, kept last 3`);
      return result.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error cleaning up ProfileSyncHistory:', error);
    throw error;
  }
};

const ProfileSyncHistory = mongoose.model('ProfileSyncHistory', profileSyncHistorySchema);

module.exports = ProfileSyncHistory;
