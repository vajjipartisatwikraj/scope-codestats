const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Profile = require("../models/Profile");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

router.get("/", auth, async (req, res) => {
  try {
    const {
      department,
      section,
      graduatingYear,
      gender,
      sortBy = "totalScore",
      order = "desc",
      leaderboardType = "score",
      search = "",
      // Add pagination parameters
      page = 1,
      limit = 10, // Changed default from 25 to 10
      // Add performance flags
      skipUserRank = "false",
      minimal = "false",
      debug = "false",
    } = req.query;

    // Convert pagination params to numbers
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Cap at 100
    const skip = (pageNum - 1) * limitNum;

    if (debug === "true") {
      console.log(
        `Leaderboard request - Page: ${pageNum}, Limit: ${limitNum}, Type: ${leaderboardType}`
      );
    }

    // Build filter object
    const filter = {};
    if (department && department !== "ALL") filter.department = department;
    if (section && section !== "All") filter.section = section;
    if (graduatingYear && graduatingYear !== "All")
      filter.graduatingYear = parseInt(graduatingYear);
    if (gender && gender !== "All") filter.gender = gender;
    if (req.user.userType !== "admin") {
      filter.userType = { $ne: "admin" };
    }

    // Add search filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { rollNumber: searchRegex },
      ];
    }

    // Optimize projection based on requirements
    const baseProjection = {
      _id: 1,
      name: 1,
      rollNumber: 1,
      email: 1,
      department: 1,
      section: 1,
      graduatingYear: 1,
      profilePicture: { $ifNull: ["$profilePicture", ""] },
      totalScore: { $ifNull: ["$totalScore", 0] },
      problemsSolved: { $ifNull: ["$problemsSolved", 0] },
    };

    // Add platform-specific fields only if not minimal
    if (minimal !== "true") {
      baseProjection.platforms = "$platformData"; // Include platformData for frontend compatibility
      baseProjection.platformScores = {
        $arrayToObject: {
          $map: {
            input: "$profilesArray",
            as: "profile",
            in: {
              k: "$$profile.platform",
              v: {
                score: { $ifNull: ["$$profile.score", 0] },
                problemsSolved: { $ifNull: ["$$profile.problemsSolved", 0] },
                contestsParticipated: {
                  $ifNull: ["$$profile.contestsParticipated", 0],
                },
                rating: { $ifNull: ["$$profile.rating", 0] },
                easyProblemsSolved: {
                  $ifNull: ["$$profile.easyProblemsSolved", 0],
                },
                mediumProblemsSolved: {
                  $ifNull: ["$$profile.mediumProblemsSolved", 0],
                },
                hardProblemsSolved: {
                  $ifNull: ["$$profile.hardProblemsSolved", 0],
                },
              },
            },
          },
        },
      };
    }

    // Calculate total count for pagination (optimized)
    const totalCountPipeline = [{ $match: filter }, { $count: "total" }];

    const totalCountResult = await User.aggregate(totalCountPipeline);
    const totalUsers =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // Main aggregation pipeline with pagination
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profilesArray",
        },
      },
      {
        $addFields: {
          // Calculate total score efficiently
          totalScore: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.score", 0] }] },
            },
          },
          problemsSolved: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: {
                $add: ["$$value", { $ifNull: ["$$this.problemsSolved", 0] }],
              },
            },
          },
          totalContestsParticipated: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  { $ifNull: ["$$this.contestsParticipated", 0] },
                ],
              },
            },
          },
          totalRating: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.rating", 0] }] },
            },
          },
          highestRating: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: { $max: ["$$value", { $ifNull: ["$$this.rating", 0] }] },
            },
          },
        },
      },
      { $project: baseProjection },
      { $sort: { [sortBy]: order === "desc" ? -1 : 1, _id: 1 } }, // Add _id for consistent sorting
      { $skip: skip },
      { $limit: limitNum },
    ];

    const users = await User.aggregate(pipeline);

    // Calculate ranks efficiently (only for returned users)
    const usersWithRanks = users.map((user, index) => ({
      ...user,
      overallRank: skip + index + 1,
      rank: skip + index + 1, // For compatibility
      departmentRank: "-", // Will be calculated separately if needed
      profilePicture: user.profilePicture || "",
    }));

    // Get current user's data and rank if requested
    let currentUserData = null;
    let currentUserRank = null;

    if (skipUserRank !== "true" && req.user) {
      try {
        console.log("Fetching current user data for user ID:", req.user.id);

        // Convert user ID to ObjectId if it's a string
        const userId = mongoose.Types.ObjectId.isValid(req.user.id)
          ? new mongoose.Types.ObjectId(req.user.id)
          : req.user.id;

        // Step 1: Get current user's data with the same calculation as the main pipeline
        // NOTE: Don't apply filters here - we want the user's global data
        const currentUserPipeline = [
          { $match: { _id: userId } },
          {
            $lookup: {
              from: "profiles",
              localField: "_id",
              foreignField: "userId",
              as: "profilesArray",
            },
          },
          {
            $addFields: {
              totalScore: {
                $reduce: {
                  input: "$profilesArray",
                  initialValue: 0,
                  in: { $add: ["$$value", { $ifNull: ["$$this.score", 0] }] },
                },
              },
              problemsSolved: {
                $reduce: {
                  input: "$profilesArray",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      { $ifNull: ["$$this.problemsSolved", 0] },
                    ],
                  },
                },
              },
              totalContestsParticipated: {
                $reduce: {
                  input: "$profilesArray",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      { $ifNull: ["$$this.contestsParticipated", 0] },
                    ],
                  },
                },
              },
              totalRating: {
                $reduce: {
                  input: "$profilesArray",
                  initialValue: 0,
                  in: { $add: ["$$value", { $ifNull: ["$$this.rating", 0] }] },
                },
              },
            },
          },
          { $project: baseProjection },
        ];

        const userResult = await User.aggregate(currentUserPipeline);
        currentUserData = userResult.length > 0 ? userResult[0] : null;

        console.log("Current user data found:", !!currentUserData);
        if (currentUserData) {
          console.log("Current user name:", currentUserData.name);
          console.log("Current user department:", currentUserData.department);
        } else {
          console.log("No user found with ID:", userId);
        }

        // Step 2: Calculate current user's rank within the filtered dataset
        if (currentUserData) {
          // Check if current user matches the applied filters
          let userMatchesFilters = true;

          if (
            department &&
            department !== "ALL" &&
            currentUserData.department !== department
          ) {
            userMatchesFilters = false;
          }
          if (
            section &&
            section !== "All" &&
            currentUserData.section !== section
          ) {
            userMatchesFilters = false;
          }
          if (
            graduatingYear &&
            graduatingYear !== "All" &&
            currentUserData.graduatingYear !== parseInt(graduatingYear)
          ) {
            userMatchesFilters = false;
          }
          if (search.trim()) {
            const searchLower = search.trim().toLowerCase();
            const nameMatch = currentUserData.name
              ?.toLowerCase()
              .includes(searchLower);
            const emailMatch = currentUserData.email
              ?.toLowerCase()
              .includes(searchLower);
            const rollMatch = currentUserData.rollNumber
              ?.toLowerCase()
              .includes(searchLower);
            if (!nameMatch && !emailMatch && !rollMatch) {
              userMatchesFilters = false;
            }
          }

          if (userMatchesFilters) {
            // Get the user's sort value
            const userSortValue = currentUserData[sortBy] || 0;

            // Count users that rank higher (simpler approach)
            const rankPipeline = [
              { $match: filter },
              {
                $lookup: {
                  from: "profiles",
                  localField: "_id",
                  foreignField: "userId",
                  as: "profilesArray",
                },
              },
              {
                $addFields: {
                  totalScore: {
                    $reduce: {
                      input: "$profilesArray",
                      initialValue: 0,
                      in: {
                        $add: ["$$value", { $ifNull: ["$$this.score", 0] }],
                      },
                    },
                  },
                  problemsSolved: {
                    $reduce: {
                      input: "$profilesArray",
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          { $ifNull: ["$$this.problemsSolved", 0] },
                        ],
                      },
                    },
                  },
                },
              },
              {
                $match:
                  order === "desc"
                    ? { [sortBy]: { $gt: userSortValue } }
                    : { [sortBy]: { $lt: userSortValue } },
              },
              { $count: "higherRanked" },
            ];

            const rankResult = await User.aggregate(rankPipeline);
            const higherRankedCount =
              rankResult.length > 0 ? rankResult[0].higherRanked : 0;
            currentUserRank = higherRankedCount + 1;

            console.log("Current user rank calculated:", currentUserRank);
          } else {
            // User doesn't match current filters, but still provide their data
            currentUserRank = null;
            console.log("Current user does not match current filters");
          }

          // Make sure currentUserData has the same structure as regular users
          currentUserData = {
            ...currentUserData,
            profilePicture: currentUserData.profilePicture || "",
          };
        }
      } catch (rankError) {
        console.error("Error calculating user rank:", rankError);
        console.warn("Could not calculate user rank:", rankError.message);
      }
    } else {
      console.log(
        "Skipping current user data fetch - no user or skipUserRank is true"
      );
    }

    res.json({
      users: usersWithRanks,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalUsers,
        usersPerPage: limitNum,
        hasNextPage: skip + limitNum < totalUsers,
        hasPrevPage: pageNum > 1,
      },
      currentUserData,
      currentUserRank,
      filters: {
        department,
        section,
        graduatingYear,
        search,
        sortBy,
        order,
        leaderboardType,
      },
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add a new endpoint for user stats (cached and optimized)
router.get("/stats", auth, async (req, res) => {
  try {
    const statsPromise = User.aggregate([
      { $match: { userType: { $ne: "admin" } } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          departments: { $addToSet: "$department" },
          sections: { $addToSet: "$section" },
          years: { $addToSet: "$graduatingYear" },
        },
      },
    ]);

    const platformStatsPromise = User.aggregate([
      { $match: { userType: { $ne: "admin" } } },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profiles",
        },
      },
      {
        $addFields: {
          totalScore: {
            $reduce: {
              input: "$profiles",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.score", 0] }] },
            },
          },
          totalProblems: {
            $reduce: {
              input: "$profiles",
              initialValue: 0,
              in: {
                $add: ["$$value", { $ifNull: ["$$this.problemsSolved", 0] }],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalScore: { $sum: "$totalScore" },
          totalProblems: { $sum: "$totalProblems" },
          activePlatforms: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$profiles" }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const [stats, platformStats] = await Promise.all([
      statsPromise,
      platformStatsPromise,
    ]);

    const result = {
      totalUsers: stats[0]?.totalUsers || 0,
      departments: stats[0]?.departments || [],
      sections: stats[0]?.sections || [],
      years: stats[0]?.years || [],
      totalScore: platformStats[0]?.totalScore || 0,
      totalProblems: platformStats[0]?.totalProblems || 0,
      activePlatforms: 6, // Fixed number of platforms we track
    };

    res.json(result);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Top performers endpoint (for top 3 cards)
router.get("/top", auth, async (req, res) => {
  try {
    const {
      leaderboardType = "score",
      department,
      section,
      graduatingYear,
      limit = 3,
    } = req.query;

    // Build filter
    const filter = {};
    if (department && department !== "ALL") filter.department = department;
    if (section && section !== "All") filter.section = section;
    if (graduatingYear && graduatingYear !== "All")
      filter.graduatingYear = parseInt(graduatingYear);
    if (req.user.userType !== "admin") {
      filter.userType = { $ne: "admin" };
    }

    const sortField =
      leaderboardType === "score" ? "totalScore" : "problemsSolved";

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profilesArray",
        },
      },
      {
        $addFields: {
          totalScore: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.score", 0] }] },
            },
          },
          problemsSolved: {
            $reduce: {
              input: "$profilesArray",
              initialValue: 0,
              in: {
                $add: ["$$value", { $ifNull: ["$$this.problemsSolved", 0] }],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          department: 1,
          section: 1,
          graduatingYear: 1,
          profilePicture: { $ifNull: ["$profilePicture", ""] },
          totalScore: 1,
          problemsSolved: 1,
          platformScores: {
            $arrayToObject: {
              $map: {
                input: "$profilesArray",
                as: "profile",
                in: {
                  k: "$$profile.platform",
                  v: {
                    score: { $ifNull: ["$$profile.score", 0] },
                    problemsSolved: {
                      $ifNull: ["$$profile.problemsSolved", 0],
                    },
                  },
                },
              },
            },
          },
        },
      },
      { $sort: { [sortField]: -1, _id: 1 } },
      { $limit: parseInt(limit) },
    ];

    const topUsers = await User.aggregate(pipeline);

    const usersWithRanks = topUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
      profilePicture: user.profilePicture || "",
    }));

    res.json(usersWithRanks);
  } catch (err) {
    console.error("Top performers error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Keep the export endpoint for backward compatibility
router.get("/export", auth, async (req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { userType: { $ne: "admin" } } },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profilesArray",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          rollNumber: 1,
          department: 1,
          section: 1,
          totalScore: { $ifNull: ["$totalScore", 0] },
          totalProblemsSolved: { $ifNull: ["$totalProblemsSolved", 0] },
          codingProfiles: {
            $arrayToObject: {
              $map: {
                input: "$profilesArray",
                as: "profile",
                in: {
                  k: "$$profile.platform",
                  v: {
                    username: "$$profile.username",
                    problemsSolved: {
                      $ifNull: ["$$profile.problemsSolved", 0],
                    },
                    rating: { $ifNull: ["$$profile.rating", 0] },
                    score: { $ifNull: ["$$profile.score", 0] },
                    contestsParticipated: {
                      $ifNull: ["$$profile.contestsParticipated", 0],
                    },
                    lastUpdated: "$$profile.lastUpdated",
                  },
                },
              },
            },
          },
        },
      },
    ]);

    const usersWithRanks = users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json(usersWithRanks);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
