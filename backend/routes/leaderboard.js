const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { 
      department, 
      section, 
      graduatingYear, 
      gender,
      sortBy = 'totalScore',
      order = 'desc',
      leaderboardType = 'score',
      includeUserData = 'false',
      includePlatformDetails = 'false',
      fields = '',
      debug = 'true'
    } = req.query;

    if (debug === 'true') {
      console.log(`Leaderboard request with type ${leaderboardType}, sortBy: ${sortBy}, order: ${order}`);
      console.log(`Including user data: ${includeUserData}, platform details: ${includePlatformDetails}`);
    }

    // Build filter object
    const filter = {};
    if (department && department !== 'ALL') filter.department = department;
    if (section && section !== 'All') filter.section = section;
    if (graduatingYear && graduatingYear !== 'All') filter.graduatingYear = parseInt(graduatingYear);
    if (gender && gender !== 'All') filter.gender = gender;
    if (req.user.userType !== 'admin') {
      filter.userType = { $ne: 'admin' };
    }

    // Define the projection based on fields and includeUserData
    const projection = {
      _id: 1,
      name: 1,
      rollNumber: 1,
      email: 1,
      department: 1,
      section: 1,
      graduatingYear: 1,
      gender: 1,
      profilePicture: { $ifNull: ['$profilePicture', ''] },
      totalScore: { $ifNull: ['$totalScore', 0] }
    };

    // Include the platformData field from users collection if requested
    if (includeUserData === 'true') {
      projection.platforms = '$platformData'; // Rename platformData to platforms for consistency with frontend
    }

    // Include platform scores with details if requested
    if (includePlatformDetails === 'true') {
      projection.codechefScore = {
        $ifNull: [{
          $reduce: {
            input: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'codechef'] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.score', 0] }] }
          }
        }, 0]
      };
      projection.hackerrankScore = {
        $ifNull: [{
          $reduce: {
            input: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'hackerrank'] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.score', 0] }] }
          }
        }, 0]
      };
      projection.leetcodeScore = {
        $ifNull: [{
          $reduce: {
            input: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'leetcode'] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.score', 0] }] }
          }
        }, 0]
      };
      projection.codeforcesScore = {
        $ifNull: [{
          $reduce: {
            input: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'codeforces'] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.score', 0] }] }
          }
        }, 0]
      };
      projection.githubScore = {
        $ifNull: [{
          $reduce: {
            input: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'github'] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.score', 0] }] }
          }
        }, 0]
      };
      projection.geeksforgeeksScore = {
        $ifNull: [{
          $reduce: {
            input: {
              $filter: {
                input: '$profilesArray',
                as: 'profile',
                cond: { $eq: ['$$profile.platform', 'geeksforgeeks'] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.score', 0] }] }
          }
        }, 0]
      };
      projection.platformScores = {
        $arrayToObject: {
          $map: {
            input: '$profilesArray',
            as: 'profile',
            in: {
              k: '$$profile.platform',
              v: {
                score: { $ifNull: ['$$profile.score', 0] },
                problemsSolved: { $ifNull: ['$$profile.problemsSolved', 0] },
                easyProblemsSolved: { $ifNull: ['$$profile.easyProblemsSolved', 0] },
                mediumProblemsSolved: { $ifNull: ['$$profile.mediumProblemsSolved', 0] },
                hardProblemsSolved: { $ifNull: ['$$profile.hardProblemsSolved', 0] },
                contestsParticipated: { $ifNull: ['$$profile.contestsParticipated', 0] },
                rating: { $ifNull: ['$$profile.rating', 0] },
                details: '$$profile.details'
              }
            }
          }
        }
      };
    }

    // Add problemsSolved to the projection
    projection.problemsSolved = {
      $reduce: {
        input: '$profilesArray',
        initialValue: 0,
        in: { $add: ['$$value', { $ifNull: ['$$this.problemsSolved', 0] }] }
      }
    };

    // Get users with their profiles
    const users = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profilesArray'
        }
      },
      {
        $project: projection
      },
      {
        $addFields: {
          totalScore: {
            $add: [
              { $ifNull: ['$codechefScore', 0] },
              { $ifNull: ['$hackerrankScore', 0] },
              { $ifNull: ['$leetcodeScore', 0] },
              { $ifNull: ['$codeforcesScore', 0] },
              { $ifNull: ['$githubScore', 0] },
              { $ifNull: ['$geeksforgeeksScore', 0] }
            ]
          }
        }
      },
      { $sort: { [sortBy]: order === 'desc' ? -1 : 1 } }
    ]);

    // If debug is enabled, log the first user's data
    if (debug === 'true' && users.length > 0) {
      console.log(`First user in leaderboard: ${users[0].name}`);
      console.log(`Has platforms data: ${users[0].platforms ? 'Yes' : 'No'}`);
      if (users[0].platforms) {
        console.log('Platforms data keys:', Object.keys(users[0].platforms));
        // Log platform data for specific platforms
        ['codechef', 'leetcode', 'codeforces'].forEach(platform => {
          if (users[0].platforms[platform]) {
            console.log(`${platform} data:`, {
              contestsParticipated: users[0].platforms[platform].contestsParticipated,
              rating: users[0].platforms[platform].rating
            });
          }
        });
      }
      console.log(`Has platformScores data: ${users[0].platformScores ? 'Yes' : 'No'}`);
    }

    // Add ranks
    const usersWithRanks = users.map((user, index) => ({
      ...user,
      overallRank: index + 1
    }));

    // Calculate department ranks
    const departmentGroups = {};
    usersWithRanks.forEach(user => {
      if (!departmentGroups[user.department]) {
        departmentGroups[user.department] = [];
      }
      departmentGroups[user.department].push(user);
    });

    const usersWithDepartmentRanks = usersWithRanks.map(user => {
      const deptUsers = departmentGroups[user.department];
      const deptRank = deptUsers.findIndex(u => u._id.toString() === user._id.toString()) + 1;
      return {
        ...user,
        departmentRank: deptRank,
        // Make sure profilePicture is always defined (empty string if null/undefined)
        profilePicture: user.profilePicture || ''
      };
    });

    // Log profile picture status for debugging
    if (debug === 'true') {
      // Count users with profile pictures
      const withPicture = usersWithDepartmentRanks.filter(u => u.profilePicture && u.profilePicture.trim() !== '').length;
      console.log(`Users with profile pictures: ${withPicture}/${usersWithDepartmentRanks.length}`);
      
      // Log the first few users' profile pictures
      usersWithDepartmentRanks.slice(0, 5).forEach((user, index) => {
        console.log(`User ${index+1} (${user.name}): Profile picture = ${user.profilePicture || 'None'}`);
      });
      
      // Add a log for all profile picture values to help diagnose issues
      console.log('All profile picture values:');
      const profilePicTypes = {};
      usersWithDepartmentRanks.forEach(user => {
        const type = typeof user.profilePicture;
        const value = user.profilePicture;
        
        if (!profilePicTypes[type]) {
          profilePicTypes[type] = [];
        }
        
        // Only collect a few examples of each type to avoid massive logs
        if (profilePicTypes[type].length < 3) {
          profilePicTypes[type].push(value);
        }
      });
      
      // Log the types and examples
      console.log(profilePicTypes);
    }

    // Ensure all users have a populated profilePicture field before returning
    const usersWithFixedProfilePics = usersWithDepartmentRanks.map(user => ({
      ...user,
      // Always ensure profilePicture is a string (not null or undefined)
      profilePicture: user.profilePicture || ''
    }));

    res.json(usersWithFixedProfilePics);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/export', auth, async (req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { userType: { $ne: 'admin' } } },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profilesArray'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          rollNumber: 1,
          department: 1,
          section: 1,
          totalScore: { $ifNull: ['$totalScore', 0] },
          totalProblemsSolved: { $ifNull: ['$totalProblemsSolved', 0] },
          // Create a codingProfiles object with full profile details
          codingProfiles: {
            $arrayToObject: {
              $map: {
                input: '$profilesArray',
                as: 'profile',
                in: {
                  k: '$$profile.platform',
                  v: {
                    $cond: {
                      if: { $eq: ['$$profile.platform', 'github'] },
                      then: {
                        // Special handling for GitHub which stores data in the details field
                        username: '$$profile.username',
                        score: { $ifNull: ['$$profile.score', 0] },
                        problemsSolved: { $ifNull: ['$$profile.problemsSolved', 0] },
                        // Extract GitHub-specific fields from details
                        totalCommits: { $ifNull: ['$$profile.details.totalCommits', 0] },
                        publicRepos: { $ifNull: ['$$profile.details.publicRepos', 0] },
                        followers: { $ifNull: ['$$profile.details.followers', 0] },
                        following: { $ifNull: ['$$profile.details.following', 0] },
                        starsReceived: { $ifNull: ['$$profile.details.starsReceived', 0] },
                        lastUpdated: '$$profile.lastUpdated'
                      },
                      else: {
                        // Standard handling for other platforms
                        username: '$$profile.username',
                        problemsSolved: { $ifNull: ['$$profile.problemsSolved', 0] },
                        rating: { $ifNull: ['$$profile.rating', 0] },
                        rank: { $ifNull: ['$$profile.rank', ""] },
                        score: { $ifNull: ['$$profile.score', 0] },
                        maxRating: { $ifNull: ['$$profile.maxRating', 0] },
                        contestsParticipated: { $ifNull: ['$$profile.contestsParticipated', 0] },
                        easyProblemsSolved: { $ifNull: ['$$profile.easyProblemsSolved', 0] },
                        mediumProblemsSolved: { $ifNull: ['$$profile.mediumProblemsSolved', 0] },
                        hardProblemsSolved: { $ifNull: ['$$profile.hardProblemsSolved', 0] },
                        globalRank: { $ifNull: ['$$profile.globalRank', 0] },
                        countryRank: { $ifNull: ['$$profile.countryRank', 0] },
                        instituteRank: { $ifNull: ['$$profile.instituteRank', 0] },
                        lastUpdated: '$$profile.lastUpdated'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    const usersWithRanks = users.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json(usersWithRanks);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;