const mongoose = require('mongoose');

// Schema for daily activity heatmap data - single document with 365 cells
const dailyActivityHeatmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  strict: false // Allow dynamic cell1-cell365 fields
});

// Add dynamic cell fields (cell1 to cell365)
for (let i = 1; i <= 365; i++) {
  dailyActivityHeatmapSchema.add({
    [`cell${i}`]: {
      date: {
        type: Date,
        default: null
      },
      score: {
        type: Number,
        default: 0
      }
    }
  });
}

// Compound indexes for efficient queries
dailyActivityHeatmapSchema.index({ userId: 1, year: 1 });
dailyActivityHeatmapSchema.index({ userEmail: 1, year: 1 });

// Instance method to update a specific cell
dailyActivityHeatmapSchema.methods.updateCell = function(cellNumber, date, score) {
  if (cellNumber < 1 || cellNumber > 365) {
    throw new Error('Cell number must be between 1 and 365');
  }
  
  this[`cell${cellNumber}`] = {
    date: date,
    score: score || 0
  };
  
  this.markModified(`cell${cellNumber}`);
};

// Instance method to get all cells data
dailyActivityHeatmapSchema.methods.getAllCells = function() {
  const cells = {};
  for (let i = 1; i <= 365; i++) {
    const cellData = this[`cell${i}`];
    if (cellData && cellData.date) {
      cells[`cell${i}`] = cellData;
    }
  }
  return cells;
};

// Static method to create heatmap from DailyStats
dailyActivityHeatmapSchema.statics.createFromDailyStats = async function(userId, userEmail, year = new Date().getFullYear()) {
  const DailyStats = require('./DailyStats');
  
  // Remove existing heatmap for this user and year
  await this.deleteOne({ userId, year });
  
  // Create new heatmap document
  const heatmap = new this({
    userId,
    userEmail,
    year
  });
  
  // Calculate date range for exactly 365 days ending on current date
  const currentDate = new Date();
  
  // Set current date to start of day
  const yearEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
  
  // Calculate yearStart as exactly 365 days before current date
  const yearStart = new Date(currentDate);
  yearStart.setDate(yearStart.getDate() - 364); // 364 days back + current day = 365 total days
  yearStart.setHours(0, 0, 0, 0); // Set to start of day
  
  const dailyStats = await DailyStats.find({
    userId,
    date: { $gte: yearStart, $lt: yearEnd }
  }).sort({ date: 1 });
  
  let previousDayScore = null;
  let cellsWritten = 0;

  for (let i = 0; i < dailyStats.length; i++) {
    const stat = dailyStats[i];
    const currentDayScore = stat.scopeMetrics?.totalScore || 0;

    // Calculate daily score change (difference from previous day)
    let dailyScoreChange = 0;
    if (previousDayScore !== null) {
      dailyScoreChange = currentDayScore - previousDayScore;
    } else {
      // First day: use scoreChange from DailyStats if available
      dailyScoreChange = stat.scopeMetrics?.scoreChange || currentDayScore;
    }

    // Calculate which cell this date maps to (days from yearStart)
    const daysSinceStart = Math.floor((stat.date - yearStart) / (24 * 60 * 60 * 1000)) + 1;

    if (daysSinceStart >= 1 && daysSinceStart <= 365) {
      heatmap.updateCell(daysSinceStart, stat.date, Math.max(0, dailyScoreChange));
      cellsWritten++;
    }

    previousDayScore = currentDayScore;
  }

  console.log(`[Heatmap] user=${userEmail} year=${year} | stats=${dailyStats.length} cells=${cellsWritten}`);
  
  return await heatmap.save();
};

// Static method to get formatted heatmap data
dailyActivityHeatmapSchema.statics.getFormattedHeatmap = async function(userId, year = new Date().getFullYear()) {
  const heatmap = await this.findOne({ userId, year });
  
  if (!heatmap) {
    return {
      year,
      userEmail: '',
      cells: {},
      totalScore: 0,
      activeDays: 0
    };
  }
  
  const cells = heatmap.getAllCells();
  let totalScore = 0;
  let activeDays = 0;
  
  Object.values(cells).forEach(cell => {
    totalScore += cell.score || 0;
    if (cell.score > 0) activeDays++;
  });
  
  return {
    year: heatmap.year,
    userEmail: heatmap.userEmail,
    cells,
    totalScore,
    activeDays,
    lastUpdated: heatmap.updatedAt
  };
};

module.exports = mongoose.model('DailyActivityHeatmap', dailyActivityHeatmapSchema);