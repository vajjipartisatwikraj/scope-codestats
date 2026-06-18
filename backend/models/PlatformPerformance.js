const mongoose = require("mongoose");

// Schema for platform performance tracking (daily, monthly, yearly)
const platformPerformanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },

    // Daily platform performance (current week)
    dailyPerformance: {
      sunday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      monday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      tuesday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      wednesday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      thursday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      friday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      saturday: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
    },

    // Monthly platform performance (current month by weeks)
    monthlyPerformance: {
      week1: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      week2: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      week3: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      week4: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
    },

    // Yearly platform performance (current year by months)
    yearlyPerformance: {
      january: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      february: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      march: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      april: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      may: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      june: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      july: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      august: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      september: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      october: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      november: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
      december: {
        leetcode: { type: Number, default: 0 },
        codechef: { type: Number, default: 0 },
        codeforces: { type: Number, default: 0 },
        geeksforgeeks: { type: Number, default: 0 },
        hackerrank: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        scopecodestats: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        presentDate: { type: Date, default: null },
        pastDate: { type: Date, default: null },
      },
    },

    // Metadata
    currentYear: {
      type: Number,
      default: new Date().getFullYear(),
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
platformPerformanceSchema.index({ userId: 1, currentYear: 1 });
platformPerformanceSchema.index({ email: 1, currentYear: 1 });

// Helper methods to calculate totals for each period
platformPerformanceSchema.methods.calculateDayTotal = function (day) {
  const dayData = this.dailyPerformance[day];
  dayData.total =
    (dayData.leetcode || 0) +
    (dayData.codechef || 0) +
    (dayData.codeforces || 0) +
    (dayData.geeksforgeeks || 0) +
    (dayData.hackerrank || 0) +
    (dayData.github || 0) +
    (dayData.scopecodestats || 0);
};

platformPerformanceSchema.methods.calculateWeekTotal = function (week) {
  const weekData = this.monthlyPerformance[week];
  weekData.total =
    (weekData.leetcode || 0) +
    (weekData.codechef || 0) +
    (weekData.codeforces || 0) +
    (weekData.geeksforgeeks || 0) +
    (weekData.hackerrank || 0) +
    (weekData.github || 0) +
    (weekData.scopecodestats || 0);
};

platformPerformanceSchema.methods.calculateMonthTotal = function (month) {
  const monthData = this.yearlyPerformance[month];
  monthData.total =
    (monthData.leetcode || 0) +
    (monthData.codechef || 0) +
    (monthData.codeforces || 0) +
    (monthData.geeksforgeeks || 0) +
    (monthData.hackerrank || 0) +
    (monthData.github || 0) +
    (monthData.scopecodestats || 0);
};

// Instance method to update daily performance
platformPerformanceSchema.methods.updateDailyPerformance = function (
  day,
  platformScores
) {
  Object.assign(this.dailyPerformance[day], platformScores);
  this.calculateDayTotal(day);
  this.lastUpdated = new Date();
};

// Instance method to update monthly performance
platformPerformanceSchema.methods.updateMonthlyPerformance = function (
  week,
  platformScores
) {
  Object.assign(this.monthlyPerformance[week], platformScores);
  this.calculateWeekTotal(week);
  this.lastUpdated = new Date();
};

// Instance method to update yearly performance
platformPerformanceSchema.methods.updateYearlyPerformance = function (
  month,
  platformScores
) {
  Object.assign(this.yearlyPerformance[month], platformScores);
  this.calculateMonthTotal(month);
  this.lastUpdated = new Date();
};

// Static method to update or create platform performance
platformPerformanceSchema.statics.updatePlatformPerformance = async function (
  userId,
  email,
  platformScores,
  updateType = "all"
) {
  const currentYear = new Date().getFullYear();
  let performance = await this.findOne({ userId, currentYear });

  if (!performance) {
    // Create new performance document
    performance = new this({
      userId,
      email,
      currentYear,
      dailyPerformance: {},
      monthlyPerformance: {},
      yearlyPerformance: {},
    });
  }

  // Helper functions to get current periods
  const getCurrentDay = () => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[new Date().getDay()];
  };

  const getCurrentWeek = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return `week${Math.ceil((dayOfMonth + startingDayOfWeek) / 7)}`;
  };

  const getCurrentMonth = () => {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    return months[new Date().getMonth()];
  };

  // Update based on type
  if (updateType === "all" || updateType === "daily") {
    performance.updateDailyPerformance(getCurrentDay(), platformScores);
  }

  if (updateType === "all" || updateType === "monthly") {
    performance.updateMonthlyPerformance(getCurrentWeek(), platformScores);
  }

  if (updateType === "all" || updateType === "yearly") {
    performance.updateYearlyPerformance(getCurrentMonth(), platformScores);
  }

  return await performance.save();
};

// Static method to get platform performance data
platformPerformanceSchema.statics.getPlatformPerformance = async function (
  userId,
  type = "all"
) {
  const currentYear = new Date().getFullYear();
  const performance = await this.findOne({ userId, currentYear }).lean();

  if (!performance) {
    return {
      daily: {},
      monthly: {},
      yearly: {},
      lastUpdated: null,
    };
  }

  const result = {
    lastUpdated: performance.lastUpdated,
  };

  if (type === "all" || type === "daily") {
    result.daily = performance.dailyPerformance;
  }

  if (type === "all" || type === "monthly") {
    result.monthly = performance.monthlyPerformance;
  }

  if (type === "all" || type === "yearly") {
    result.yearly = performance.yearlyPerformance;
  }

  return result;
};

module.exports = mongoose.model(
  "PlatformPerformance",
  platformPerformanceSchema
);
