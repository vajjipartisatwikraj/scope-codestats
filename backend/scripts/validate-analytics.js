const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const PlatformAnalytics = require("../models/PlatformAnalytics");
const RankTrend = require("../models/RankTrend");
const DailyStats = require("../models/DailyStats");
const User = require("../models/User");

async function validateAnalytics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get a random user with data
    const user = await User.findOne({ userType: "user" }).limit(1);
    if (!user) {
      console.log("❌ No users found");
      return;
    }

    console.log(`📊 Testing with user: ${user.name} (${user.email})\n`);
    console.log("=".repeat(80));

    // Check DailyStats availability
    const dailyStatsCount = await DailyStats.countDocuments({
      userId: user._id,
    });
    console.log(`\n📈 DailyStats: ${dailyStatsCount} documents found`);

    if (dailyStatsCount === 0) {
      console.log(
        "❌ No DailyStats found for this user. Run cron job first.\n"
      );
      return;
    }

    // Test PlatformAnalytics
    console.log("\n" + "=".repeat(80));
    console.log("=== PlatformAnalytics Validation ===");
    console.log("=".repeat(80));

    const analytics = await PlatformAnalytics.findOne({ userId: user._id });

    if (!analytics) {
      console.log("❌ No PlatformAnalytics found. Run cron job to generate.");
    } else {
      let hasIssues = false;

      ["leetcode", "codechef", "codeforces"].forEach((platform) => {
        const ratings = analytics[platform]?.weeklyRatings;
        const currentRating = analytics[platform]?.rating || 0;

        console.log(`\n📱 ${platform.toUpperCase()}:`);
        console.log(`  Current Rating: ${currentRating}`);
        console.log(`  Week 1 (21 days back): ${ratings?.week1 || 0}`);
        console.log(`  Week 2 (14 days back): ${ratings?.week2 || 0}`);
        console.log(`  Week 3 (7 days back): ${ratings?.week3 || 0}`);
        console.log(`  Week 4 (current): ${ratings?.week4 || 0}`);

        // Validation 1: Week4 should match current rating
        const week4 = ratings?.week4 || 0;

        if (week4 === currentRating && week4 > 0) {
          console.log(`  ✅ Week4 matches current rating`);
        } else if (week4 === 0 && currentRating === 0) {
          console.log(
            `  ⚠️  No rating data available (user may not have this platform)`
          );
        } else {
          console.log(
            `  ❌ ERROR: Week4 (${week4}) doesn't match current rating (${currentRating})`
          );
          hasIssues = true;
        }

        // Validation 2: Check if storing differences (bug) or actual ratings (correct)
        const allWeeks = [
          ratings?.week1,
          ratings?.week2,
          ratings?.week3,
          ratings?.week4,
        ].filter((w) => w > 0);

        if (allWeeks.length > 0) {
          const maxWeek = Math.max(...allWeeks);
          const minWeek = Math.min(...allWeeks);

          if (maxWeek < 500) {
            console.log(
              `  ❌ CRITICAL BUG DETECTED: Values too small (max: ${maxWeek})`
            );
            console.log(
              `     This indicates the system is storing DIFFERENCES instead of ACTUAL RATINGS`
            );
            console.log(
              `     Expected: Values should be in 1000-2500 range for ratings`
            );
            hasIssues = true;
          } else {
            console.log(
              `  ✅ Values look like actual ratings (range: ${minWeek} - ${maxWeek})`
            );
          }
        }
      });

      if (!hasIssues) {
        console.log(`\n✅ PlatformAnalytics: ALL CHECKS PASSED`);
      } else {
        console.log(
          `\n❌ PlatformAnalytics: ISSUES DETECTED - Re-run cron job after fixes`
        );
      }
    }

    // Test RankTrend
    console.log("\n" + "=".repeat(80));
    console.log("=== RankTrend Validation ===");
    console.log("=".repeat(80));

    const rankTrend = await RankTrend.findOne({ userId: user._id });

    if (!rankTrend) {
      console.log("❌ No RankTrend found. Run cron job to generate.");
    } else {
      const weeklyCount = Object.values(rankTrend.weeklyRanks).filter(
        (r) => r !== null
      ).length;
      const monthlyCount = Object.values(rankTrend.monthlyRanks).filter(
        (r) => r !== null
      ).length;
      const yearlyCount = Object.values(rankTrend.yearlyRanks).filter(
        (r) => r !== null
      ).length;

      console.log(`\n📅 Weekly Ranks (${weeklyCount}/7 days populated):`);
      Object.entries(rankTrend.weeklyRanks).forEach(([day, rank]) => {
        const status = rank !== null ? "✅" : "❌";
        console.log(
          `  ${status} ${day.padEnd(10)}: ${
            rank !== null ? `#${rank}` : "null"
          }`
        );
      });

      console.log(`\n📅 Monthly Ranks (${monthlyCount}/4 weeks populated):`);
      Object.entries(rankTrend.monthlyRanks).forEach(([week, rank]) => {
        const status = rank !== null ? "✅" : "❌";
        console.log(
          `  ${status} ${week}: ${rank !== null ? `#${rank}` : "null"}`
        );
      });

      console.log(`\n📅 Yearly Ranks (${yearlyCount}/12 months populated):`);
      Object.entries(rankTrend.yearlyRanks).forEach(([month, rank]) => {
        if (rank !== null) {
          console.log(`  ✅ ${month.padEnd(10)}: #${rank}`);
        }
      });

      // Validation
      let hasIssues = false;

      if (dailyStatsCount >= 7 && weeklyCount < 5) {
        console.log(
          `\n❌ ISSUE: User has ${dailyStatsCount} DailyStats but only ${weeklyCount}/7 weekly ranks`
        );
        console.log(`   Expected: At least 5-7 days should be populated`);
        hasIssues = true;
      } else if (weeklyCount >= 5) {
        console.log(`\n✅ Weekly ranks are well populated (${weeklyCount}/7)`);
      } else {
        console.log(
          `\n⚠️  Only ${weeklyCount}/7 weekly ranks (user may have <7 days of data)`
        );
      }

      if (dailyStatsCount >= 28 && monthlyCount < 3) {
        console.log(
          `❌ ISSUE: User has ${dailyStatsCount} DailyStats but only ${monthlyCount}/4 monthly ranks`
        );
        console.log(`   Expected: All 4 weeks should be populated`);
        hasIssues = true;
      } else if (monthlyCount >= 3) {
        console.log(`✅ Monthly ranks are well populated (${monthlyCount}/4)`);
      } else {
        console.log(
          `⚠️  Only ${monthlyCount}/4 monthly ranks (user may have <28 days of data)`
        );
      }

      if (yearlyCount >= 1) {
        console.log(`✅ Yearly ranks are populated (${yearlyCount}/12 months)`);
      }

      // Special check for the old bug
      if (weeklyCount === 1 && monthlyCount === 1 && dailyStatsCount >= 28) {
        console.log(
          `\n❌ CRITICAL BUG DETECTED: Only 1 rank per category despite sufficient data`
        );
        console.log(
          `   This indicates the OLD BUG where only current day/week/month was filled`
        );
        console.log(`   ACTION REQUIRED: Re-run cron job after applying fixes`);
        hasIssues = true;
      }

      if (!hasIssues) {
        console.log(`\n✅ RankTrend: ALL CHECKS PASSED`);
      }
    }

    // Final Summary
    console.log("\n" + "=".repeat(80));
    console.log("=== Validation Summary ===");
    console.log("=".repeat(80));

    const analyticsExists = !!analytics;
    const rankTrendExists = !!rankTrend;
    const analyticsValid =
      analytics &&
      ["leetcode", "codechef", "codeforces"].some(
        (p) =>
          analytics[p]?.weeklyRatings?.week1 > 500 ||
          analytics[p]?.weeklyRatings?.week1 === 0
      );
    const rankTrendValid =
      rankTrend &&
      Object.values(rankTrend.weeklyRanks).filter((r) => r !== null).length >=
        1;

    console.log(`\n✅ DailyStats: ${dailyStatsCount} documents`);
    console.log(
      `${analyticsExists ? "✅" : "❌"} PlatformAnalytics: ${
        analyticsExists ? "EXISTS" : "MISSING"
      }`
    );
    console.log(
      `${analyticsValid ? "✅" : "❌"} PlatformAnalytics: ${
        analyticsValid ? "VALID DATA" : "INVALID DATA"
      }`
    );
    console.log(
      `${rankTrendExists ? "✅" : "❌"} RankTrend: ${
        rankTrendExists ? "EXISTS" : "MISSING"
      }`
    );
    console.log(
      `${rankTrendValid ? "✅" : "❌"} RankTrend: ${
        rankTrendValid ? "VALID DATA" : "INVALID DATA"
      }`
    );

    if (
      analyticsExists &&
      analyticsValid &&
      rankTrendExists &&
      rankTrendValid
    ) {
      console.log(
        `\n🎉 ALL VALIDATIONS PASSED - Analytics system is working correctly!`
      );
    } else {
      console.log(
        `\n⚠️  Some checks failed - Review the output above for details`
      );
      console.log(
        `   Run: node scripts/daily-maintenance-cron.js to regenerate analytics`
      );
    }

    console.log("\n" + "=".repeat(80));
    console.log("Validation Complete\n");
  } catch (error) {
    console.error("❌ Validation Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run validation
validateAnalytics();
