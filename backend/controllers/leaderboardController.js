/**
 * Leaderboard controller.
 *
 * Scores and per-platform stats come from the Profile collection; the User
 * collection only supplies who the person is (name, department, ...) and the 7-day
 * consistency index and score change (User.weeklyActivity). Wired up in routes/leaderboard.js.
 */
const User = require("../models/User");
const Profile = require("../models/Profile");
const AcademicYearConfig = require("../models/AcademicYearConfig");
const log = require("../utils/logger").scope("LEADERBOARD");

const MAX_TOP_COUNT = 500;
const EXCLUDED_USER_TYPES = ["admin", "teacher"];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Graduation years that are marked "Graduated" in the academic year config. */
async function getGraduatedYears() {
  try {
    const config = await AcademicYearConfig.getConfig();
    return config.yearMappings
      .filter((mapping) => mapping.academicYear === "Graduated")
      .map((mapping) => mapping.graduationYear);
  } catch (err) {
    log.warn("Could not load AcademicYearConfig for graduated filter:", err.message);
    return [];
  }
}

/** Match stage that keeps only students who have not graduated. */
async function notGraduatedFilter() {
  const graduatedYears = await getGraduatedYears();
  if (graduatedYears.length === 0) return {};
  return {
    $or: [
      { graduatingYear: { $exists: false } },
      { graduatingYear: { $nin: graduatedYears } },
    ],
  };
}

const compareDesc = (field) => (a, b) => (b[field] || 0) - (a[field] || 0);

/** Turns the query string of GET /leaderboard into a User filter. */
async function buildLeaderboardFilter(query) {
  const { department, section, graduatingYear, gender } = query;

  // Admin and teacher accounts never appear on the leaderboard.
  const filter = { userType: { $nin: EXCLUDED_USER_TYPES } };
  if (department && department !== "ALL") filter.department = String(department);
  if (section && section !== "All") filter.section = String(section);
  if (gender && gender !== "All") filter.gender = String(gender);

  if (graduatingYear && graduatingYear !== "All") {
    filter.graduatingYear = parseInt(graduatingYear, 10);
  } else {
    // Graduated students are excluded unless a specific year was requested
    // (consistent with the nightly ranking).
    Object.assign(filter, await notGraduatedFilter());
  }
  return filter;
}

// What GET /api/leaderboard sends. The leaderboard page (frontend/src/components/leaderboard/)
// reads exactly these and nothing else, so nothing else is loaded or sent:
//  - ranks, the problem total, contest and rating totals are computed in the page
//  - the page shows six platforms
//  - from each platform it reads five numbers
const LEADERBOARD_USER_FIELDS =
  "_id name rollNumber email username department section graduatingYear profilePicture weeklyActivity";
const LEADERBOARD_PROFILE_FIELDS =
  "userId platform score problemsSolved rating maxRating contestsParticipated";
const LEADERBOARD_PLATFORMS = ["leetcode", "codechef", "codeforces", "hackerrank", "github", "scopecodestats"];
const LEADERBOARD_SORT_FIELDS = new Set([
  "totalScore",
  "name",
  "rollNumber",
  "department",
  "section",
  "graduatingYear",
  "consistencyIndex",
  "scoreChange",
  "scopeScore",
]);

/** The five numbers the page reads from one platform. */
const toPlatformStats = (profile) => ({
  score: profile.score || 0,
  problemsSolved: profile.problemsSolved || 0,
  rating: profile.rating || 0,
  maxRating: profile.maxRating || 0,
  contestsParticipated: profile.contestsParticipated || 0,
});

/**
 * Joins each user with their Profile totals and platform stats.
 * `totalScore` counts every platform a student has linked, including ones the
 * page does not show.
 */
function buildEntries(users, summaries) {
  return users.map((user) => {
    const summary = summaries.get(String(user._id)) || Profile.emptySummary();

    const platforms = {};
    for (const platform of LEADERBOARD_PLATFORMS) {
      if (summary.platforms[platform]) platforms[platform] = toPlatformStats(summary.platforms[platform]);
    }

    return {
      _id: user._id,
      name: user.name,
      rollNumber: user.rollNumber,
      email: user.email,
      username: user.username || undefined,
      department: user.department,
      section: user.section,
      graduatingYear: user.graduatingYear,
      profilePicture: user.profilePicture,
      totalScore: summary.totalScore,
      // The last 7 days (services/weeklyActivity)
      consistencyIndex: user.weeklyActivity?.consistencyIndex || 0,
      scoreChange: user.weeklyActivity?.scoreChange || 0,
      scopeScore: platforms.scopecodestats?.score || 0,
      platforms,
    };
  });
}

/**
 * Best score first by default. `sortBy` can name any field in LEADERBOARD_SORT_FIELDS;
 * anything else keeps the default order.
 */
function sortEntries(entries, sortBy, order) {
  entries.sort(compareDesc("totalScore"));
  if (!LEADERBOARD_SORT_FIELDS.has(sortBy) || (sortBy === "totalScore" && order !== "asc")) return;

  const direction = order === "asc" ? 1 : -1;
  entries.sort((a, b) => {
    const x = a[sortBy] ?? 0;
    const y = b[sortBy] ?? 0;
    if (typeof x === "string" || typeof y === "string") {
      return direction * String(x).localeCompare(String(y));
    }
    return direction * (x - y);
  });
}

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/leaderboard
 * Every student with total score and the stats of the platforms the page shows.
 * Ranks are worked out by the page, which re-ranks after every filter.
 */
const getLeaderboard = async (req, res) => {
  try {
    const { sortBy = "totalScore", order = "desc" } = req.query;

    const users = await User.find(await buildLeaderboardFilter(req.query))
      .select(LEADERBOARD_USER_FIELDS)
      .lean();
    const summaries = await Profile.getSummaries(
      users.map((u) => u._id),
      { fields: LEADERBOARD_PROFILE_FIELDS }
    );

    const entries = buildEntries(users, summaries);
    sortEntries(entries, sortBy, order);

    res.json(entries);
  } catch (err) {
    log.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/leaderboard/export
 * Every student with full profile details, for the admin export.
 */
const exportLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ userType: { $nin: EXCLUDED_USER_TYPES } })
      .select(
        "_id name email rollNumber department section graduatingYear mobileNumber weeklyActivity skills interests about linkedinUrl resumeLink"
      )
      .lean();
    const summaries = await Profile.getSummaries(
      users.map((u) => u._id),
      { full: true }
    );

    const rows = users.map((user) => {
      const summary = summaries.get(String(user._id)) || Profile.emptySummary();
      const codingProfiles = {};
      for (const [platform, profile] of Object.entries(summary.platforms)) {
        codingProfiles[platform] = Profile.toClient(profile);
      }
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        department: user.department,
        section: user.section,
        graduatingYear: user.graduatingYear,
        mobileNumber: user.mobileNumber,
        totalScore: summary.totalScore,
        totalProblemsSolved: summary.totalProblemsSolved,
        consistencyIndex: user.weeklyActivity?.consistencyIndex || 0,
        scoreChange: user.weeklyActivity?.scoreChange || 0,
        codingProfiles,
        skills: user.skills || [],
        interests: user.interests || [],
        about: user.about || "",
        linkedinUrl: user.linkedinUrl || "",
        resumeLink: user.resumeLink || "",
      };
    });

    rows.sort(compareDesc("totalScore"));
    rows.forEach((row, index) => {
      row.rank = index + 1;
    });
    res.json(rows);
  } catch (err) {
    log.error("Export error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/leaderboard/top/:count
 * Top N users by total score (used for cohort eligibility).
 */
const getTopUsers = async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count, 10) || 50, MAX_TOP_COUNT);
    const { includeGraduated = "false" } = req.query;

    const filter = { userType: { $nin: EXCLUDED_USER_TYPES } };
    if (includeGraduated !== "true") {
      filter.graduatingYear = { $nin: await getGraduatedYears() };
    }

    const users = await User.aggregate([
      { $match: filter },
      ...Profile.totalsLookupStages(),
      { $sort: { totalScore: -1 } },
      { $limit: count },
      { $project: { name: 1, email: 1, rollNumber: 1, department: 1, totalScore: 1 } },
    ]);

    res.json({
      leaderboard: users.map((user, index) => ({
        rank: index + 1,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          rollNumber: user.rollNumber,
          department: user.department,
        },
        totalScore: user.totalScore,
      })),
    });
  } catch (error) {
    log.error("Error fetching top users:", error);
    res.status(500).json({ message: "Error fetching top users" });
  }
};

/**
 * GET /api/leaderboard/academic-year-config
 */
const getAcademicYearConfig = async (req, res) => {
  try {
    const config = await AcademicYearConfig.getConfig();
    res.json({
      success: true,
      config: {
        academicYearStartMonth: config.academicYearStartMonth,
        currentAcademicYear: config.currentAcademicYear,
        yearMappings: config.yearMappings,
      },
    });
  } catch (error) {
    log.error("Error fetching academic year config:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching academic year configuration",
    });
  }
};

/**
 * GET /api/leaderboard/public/top10
 * Public by design: the landing page shows the top 10 to visitors who are not
 * signed in. Only name, roll number (for the profile link), department, year and score are exposed. The institution
 * is not part of the answer: the page that shows it knows its own name.
 */
const getPublicTop10 = async (req, res) => {
  try {
    const filter = {
      userType: { $nin: EXCLUDED_USER_TYPES },
      ...(await notGraduatedFilter()),
    };

    const users = await User.aggregate([
      { $match: filter },
      ...Profile.totalsLookupStages(),
      { $sort: { totalScore: -1 } },
      { $limit: 10 },
      { $project: { name: 1, rollNumber: 1, department: 1, graduatingYear: 1, totalScore: 1 } },
    ]);

    res.json(
      users.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        rollNumber: user.rollNumber,
        department: user.department,
        graduatingYear: user.graduatingYear,
        score: user.totalScore,
      }))
    );
  } catch (error) {
    log.error("Error fetching public top 10:", error);
    res.status(500).json({ message: "Error fetching top users" });
  }
};

module.exports = {
  getLeaderboard,
  exportLeaderboard,
  getTopUsers,
  getAcademicYearConfig,
  getPublicTop10,
};
