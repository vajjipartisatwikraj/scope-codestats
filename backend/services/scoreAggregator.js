const User = require("../models/User");

/**
 * ScoreAggregator - Calculates and updates user total scores.
 *
 * SCORING RULES:
 * 1. External platforms (LeetCode, Codeforces, CodeChef, HackerRank, GitHub):
 *    Use LIVE scores directly from platformScores. No Math.max preservation.
 *
 * 2. Internal platform (scopecodestats):
 *    Uses Math.max(lifetimeScopeScore, currentActiveCohortScore) via platformAPIs.js
 *    BEFORE data reaches this aggregator. Lifetime preservation is built-in.
 *
 * 3. totalScore = sum of all current platform scores (no global Math.max).
 */
class ScoreAggregator {
  async updateUserTotalScore(userId) {
    try {
      const user = await User.findById(userId)
        .select("platformScores platformData totalScore")
        .lean();

      if (!user) {
        console.error(`[ScoreAggregator] user=${userId} not found`);
        throw new Error("User not found");
      }

      let totalScore = 0;
      const platformScores = user.platformScores || {};
      const entries = Object.entries(platformScores);

      if (entries.length > 0) {
        for (const [, data] of entries) {
          const score =
            typeof data.score === "number" && !isNaN(data.score)
              ? data.score
              : 0;
          totalScore += score;
        }
      } else {
        // Fallback to platformData if platformScores is empty
        for (const [, data] of Object.entries(user.platformData || {})) {
          const score =
            typeof data.score === "number" && !isNaN(data.score)
              ? data.score
              : 0;
          totalScore += score;
        }
      }

      const previousScore = user.totalScore || 0;
      const delta = totalScore - previousScore;

      // Only log when score actually changes
      if (delta !== 0) {
        console.log(
          `[ScoreAggregator] user=${userId} | ${previousScore} → ${totalScore} (${delta > 0 ? "+" : ""}${delta})`,
        );
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { totalScore },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        console.error(
          `[ScoreAggregator] user=${userId} disappeared during update`,
        );
        throw new Error("User not found");
      }

      return totalScore;
    } catch (err) {
      console.error(
        `[ScoreAggregator] updateUserTotalScore FAILED | user=${userId}:`,
        err.message,
        "\n",
        err.stack,
      );
      throw err;
    }
  }

  async updateAllUserScores() {
    try {
      const users = await User.find().select("_id").lean();
      const BATCH_SIZE = 50;
      let updated = 0;

      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((u) => this.updateUserTotalScore(u._id)));
        updated += batch.length;
      }

      console.log(
        `[ScoreAggregator] updateAllUserScores completed | users=${updated}`,
      );
      return true;
    } catch (err) {
      console.error(
        "[ScoreAggregator] updateAllUserScores FAILED:",
        err.message,
        "\n",
        err.stack,
      );
      throw err;
    }
  }
}

module.exports = new ScoreAggregator();
