const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const User = require("../models/User");
const DailyStats = require("../models/DailyStats");
const PerformanceOverview = require("../models/PerformanceOverview");
const DailyActivityHeatmap = require("../models/DailyActivityHeatmap");
const RankTrend = require("../models/RankTrend");
const PlatformAnalytics = require("../models/PlatformAnalytics");
const PlatformPerformance = require("../models/PlatformPerformance");

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORMS = [
  "leetcode",
  "codechef",
  "codeforces",
  "hackerrank",
  "github",
  "scopecodestats",
];
const CONTEST_PLATFORMS = new Set(["leetcode", "codechef", "codeforces"]);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─── Rate Limiter ────────────────────────────────────────────────────────────
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: "Too many dashboard requests, please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(dashboardLimiter);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build analytics payload for any platform from a DailyStats platformStats entry. */
function buildPlatformAnalyticsData(platform, pd) {
  const base = {
    problemsSolved: pd.totalSolved || 0,
    score: pd.scopeScore || 0,
  };

  if (CONTEST_PLATFORMS.has(platform)) {
    return {
      ...base,
      totalContests: pd.contestsAttended || pd.contestsRated || 0,
      rating: pd.rating || 0,
      weeklyRatings: {
        week1: pd.rating || 0,
        week2: pd.rating || 0,
        week3: pd.rating || 0,
        week4: pd.rating || 0,
      },
    };
  }

  if (platform === "github") {
    return {
      problemsSolved: 0,
      score: base.score,
      commits: pd.totalCommits || 0,
      repos: pd.publicRepos || 0,
      contributions: {
        thisWeek: Array.isArray(pd.weeklyContributions)
          ? pd.weeklyContributions.reduce(
              (s, d) =>
                s + ((typeof d === "number" ? d : d?.contributions) || 0),
              0,
            )
          : 0,
        thisMonth: pd.monthlyContributions || 0,
        thisYear: pd.yearlyContributions || 0,
      },
    };
  }

  if (platform === "scopecodestats") {
    return {
      ...base,
      totalPracticeArenaContests: pd.totalPracticeArenaContests || 0,
      rating: pd.rating || 0,
      totalCohortsCompleted: pd.totalCohortsCompleted || 0,
      totalCohortProblemsSolved: pd.totalCohortProblemsSolved || 0,
      totalCohortScore: pd.totalCohortScore || 0,
      consistencyIndex: pd.consistencyIndex || 0,
      consistencyScore: pd.consistencyScore || 0,
      rank: pd.rank || "unrated",
    };
  }

  // hackerrank
  return base;
}

// ─── 1. Performance Overview ─────────────────────────────────────────────────
router.get("/performance-overview/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const latestStats = await DailyStats.findOne({ userId })
      .sort({ date: -1 })
      .select("scopeMetrics problemStats date")
      .lean();

    if (!latestStats) {
      return res.json({
        currentScore: 0,
        currentRank: 0,
        currentProblems: 0,
        totalActiveDays: 0,
        scoreChangeLastMonth: 0,
        rankChangeLastMonth: 0,
        problemsChangeLastMonth: 0,
        lastUpdated: null,
      });
    }

    // Find closest document to exactly 30 days ago (±1 day tolerance)
    const thirtyDaysAgo = new Date(Date.now() - 30 * ONE_DAY_MS);
    const candidates = await DailyStats.find({
      userId,
      date: {
        $gte: new Date(thirtyDaysAgo.getTime() - ONE_DAY_MS),
        $lte: new Date(thirtyDaysAgo.getTime() + ONE_DAY_MS),
      },
    })
      .sort({ date: -1 })
      .limit(3)
      .select("scopeMetrics problemStats date")
      .lean();

    let oldStats = null;
    let minDiff = Infinity;
    for (const c of candidates) {
      const diff = Math.abs(c.date - thirtyDaysAgo);
      if (diff < minDiff) {
        minDiff = diff;
        oldStats = c;
      }
    }

    // Parallel fetch: heatmap active days + user rank/email
    const [heatmapData, userDoc] = await Promise.all([
      DailyActivityHeatmap.getFormattedHeatmap(userId),
      User.findById(userId).select("rankingInfo email").lean(),
    ]);

    const totalActiveDays = heatmapData.activeDays;
    const currentRank = userDoc?.rankingInfo?.overallRank || 0;
    const currentScore = latestStats.scopeMetrics.totalScore || 0;
    const currentProblems = latestStats.problemStats.totalProblems || 0;
    const oldScore = oldStats?.scopeMetrics?.totalScore || 0;
    const oldRank = oldStats?.scopeMetrics?.overallRank || 0;
    const oldProblems = oldStats?.problemStats?.totalProblems || 0;

    const scoreChangeLastMonth = currentScore - oldScore;
    const rankChangeLastMonth = oldRank - currentRank;
    const problemsChangeLastMonth = currentProblems - oldProblems;

    // Persist PerformanceOverview (only with valid rank)
    if (userDoc?.email && currentRank > 0) {
      await PerformanceOverview.updatePerformance(userId, userDoc.email, {
        currentScore,
        currentRank,
        currentProblems,
        totalActiveDays,
        lastMonthScore: oldScore,
        lastMonthRank: oldRank,
        lastMonthProblems: oldProblems,
        scoreChangeLastMonth,
        rankChangeLastMonth,
        problemsChangeLastMonth,
        presentDate: latestStats.date,
        pastDate: oldStats?.date || null,
      });
    }

    console.log(
      `[Dashboard] performance-overview | user=${userId} score=${currentScore} rank=${currentRank} problems=${currentProblems} activeDays=${totalActiveDays} Δscore=${scoreChangeLastMonth} Δrank=${rankChangeLastMonth}`,
    );

    res.json({
      currentScore,
      currentRank,
      currentProblems,
      totalActiveDays,
      scoreChangeLastMonth,
      rankChangeLastMonth,
      problemsChangeLastMonth,
      lastUpdated: latestStats.date,
      presentDate: latestStats.date,
      pastDate: oldStats?.date || null,
    });
  } catch (error) {
    console.error(
      `[Dashboard] performance-overview FAILED | user=${req.params.userId}`,
      error.message,
      "\n",
      error.stack,
    );
    res.status(500).json({ error: "Failed to fetch performance overview" });
  }
});

// ─── 2. Daily Activity Heatmap ───────────────────────────────────────────────
router.get("/heatmap/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    res.json(await DailyActivityHeatmap.getFormattedHeatmap(userId, year));
  } catch (error) {
    console.error(
      `[Dashboard] heatmap FAILED | user=${req.params.userId}`,
      error.message,
      "\n",
      error.stack,
    );
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
});

// Regenerate heatmap from DailyStats
router.post("/heatmap/generate/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.body.year) || new Date().getFullYear();
    const user = await User.findById(userId).select("email").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    await DailyActivityHeatmap.createFromDailyStats(userId, user.email, year);
    const formattedData = await DailyActivityHeatmap.getFormattedHeatmap(
      userId,
      year,
    );

    console.log(
      `[Dashboard] heatmap regenerated | user=${userId} year=${year} activeDays=${formattedData.activeDays}`,
    );
    res.json({
      success: true,
      message: `Heatmap generated for ${year}`,
      data: formattedData,
    });
  } catch (error) {
    console.error(
      `[Dashboard] heatmap/generate FAILED | user=${req.params.userId}`,
      error.message,
      "\n",
      error.stack,
    );
    res.status(500).json({ error: "Failed to generate heatmap data" });
  }
});

// ─── 3-5. Rank Trends (weekly / monthly / yearly) ───────────────────────────
for (const period of ["weekly", "monthly", "yearly"]) {
  router.get(`/${period}-rank-trend/:userId`, auth, async (req, res) => {
    try {
      const trends = await RankTrend.getRankTrends(req.params.userId, period);
      res.json(trends[period] || {});
    } catch (error) {
      console.error(
        `[Dashboard] ${period}-rank-trend FAILED | user=${req.params.userId}`,
        error.message,
        "\n",
        error.stack,
      );
      res.status(500).json({ error: `Failed to fetch ${period} rank trend` });
    }
  });
}

// ─── 6. Platform Analytics ───────────────────────────────────────────────────
router.get("/platform-analytics/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    let analytics = await PlatformAnalytics.getPlatformAnalytics(userId);

    // Bootstrap from latest DailyStats when empty
    if (analytics.totalScore === 0) {
      const [user, latestStats] = await Promise.all([
        User.findById(userId).select("email").lean(),
        DailyStats.findOne({ userId }).sort({ date: -1 }).lean(),
      ]);

      if (latestStats && user) {
        let bootstrappedCount = 0;
        for (const platform of PLATFORMS) {
          const pd = latestStats.platformStats?.[platform];
          if (pd) {
            await PlatformAnalytics.updatePlatformAnalytics(
              userId,
              user.email,
              platform,
              buildPlatformAnalyticsData(platform, pd),
            );
            bootstrappedCount++;
          }
        }
        console.log(
          `[Dashboard] platform-analytics bootstrapped | user=${userId} platforms=${bootstrappedCount}`,
        );
        analytics = await PlatformAnalytics.getPlatformAnalytics(userId);
      }
    }

    res.json(analytics);
  } catch (error) {
    console.error(
      `[Dashboard] platform-analytics FAILED | user=${req.params.userId}`,
      error.message,
      "\n",
      error.stack,
    );
    res.status(500).json({ error: "Failed to fetch platform analytics" });
  }
});

// ─── 7-9. Platform Performance (daily / monthly / yearly) ────────────────────
for (const period of ["daily", "monthly", "yearly"]) {
  router.get(
    `/${period}-platform-performance/:userId`,
    auth,
    async (req, res) => {
      try {
        const performance = await PlatformPerformance.getPlatformPerformance(
          req.params.userId,
          period,
        );
        res.json(performance[period] || {});
      } catch (error) {
        console.error(
          `[Dashboard] ${period}-platform-performance FAILED | user=${req.params.userId}`,
          error.message,
          "\n",
          error.stack,
        );
        res
          .status(500)
          .json({ error: `Failed to fetch ${period} platform performance` });
      }
    },
  );
}

module.exports = router;
