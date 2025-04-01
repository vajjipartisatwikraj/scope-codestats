const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Course = require('../models/Course');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Profile = require('../models/Profile');
const mongoose = require('mongoose');
const updateAllUserProfiles = require('../scripts/updateUserProfiles');

// Course Management Routes
router.get('/courses', [auth, adminAuth], async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/courses', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, courseLink, image, instructor, level, category, duration, topics, prerequisites, resources, isActive } = req.body;
    
    if (!title || !description || !courseLink) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'courseLink']
      });
    }
 
    const course = new Course({
      title,
      description,
      courseLink,
      image,
      instructor,
      level,
      category,
      duration,
      topics,
      prerequisites,
      resources,
      isActive,
      createdBy: req.user.id
    });

    await course.save();
    res.status(201).json(course);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/courses/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, courseLink, image, instructor, level, category, duration, topics, prerequisites, resources, isActive } = req.body;
    
    if (!title || !description || !courseLink) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'courseLink']
      });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        courseLink,
        image,
        instructor,
        level,
        category,
        duration,
        topics,
        prerequisites,
        resources,
        isActive
      },
      { new: true }
    );
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/courses/:id', [auth, adminAuth], async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Opportunity Management Routes
router.get('/opportunities', [auth, adminAuth], async (req, res) => {
  try {
    const opportunities = await Opportunity.find();
    res.json(opportunities);
  } catch (err) {
    console.error('Error fetching opportunities:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/opportunities', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, link, deadline } = req.body;
    
    if (!title || !description || !link || !deadline) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'link', 'deadline']
      });
    }

    const opportunity = new Opportunity({
      title,
      description,
      link,
      deadline,
      createdBy: req.user.id
    });
    
    await opportunity.save();
    res.status(201).json(opportunity);
  } catch (err) {
    console.error('Error creating opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/opportunities/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, link, deadline } = req.body;
    
    if (!title || !description || !link || !deadline) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'link', 'deadline']
      });
    }

    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        link, 
        deadline,
        applicationLink: link
      },
      { new: true }
    );
    
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    
    res.json(opportunity);
  } catch (err) {
    console.error('Error updating opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/opportunities/:id', [auth, adminAuth], async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (err) {
    console.error('Error deleting opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin Dashboard Statistics
router.get('/stats', [auth, adminAuth], async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // Summary statistics
    const totalUsers = await User.countDocuments() || 0;
    const activeUsers = await User.countDocuments({ lastActive: { $gte: oneWeekAgo } }) || 0;
    
    // Get top 5 users by total problems solved
    const topUsers = await User.find()
      .sort({ totalScore: -1 })
      .limit(5)
      .select('name totalScore department')
      .lean();
    
    // Get new user registrations over time
    const userGrowthData = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]) || [];

    // Platform-wise problems solved statistics
    const platformStats = await Profile.aggregate([
      {
        $group: {
          _id: "$platform",
          totalProblems: { $sum: { $ifNull: ["$problemsSolved", 0] } },
          userCount: { $count: {} },
          avgProblems: { $avg: { $ifNull: ["$problemsSolved", 0] } }
        }
      },
      {
        $project: {
          platform: "$_id",
          totalProblems: 1,
          userCount: 1,
          avgProblems: { $round: ["$avgProblems", 1] },
          _id: 0
        }
      },
      { $sort: { totalProblems: -1 } }
    ]);

    // Weekly problems solved by platform
    const weeklyProblemsByPlatform = await Profile.aggregate([
      {
        $match: {
          lastUpdated: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: { 
            platform: "$platform",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$lastUpdated" } }
          },
          problemsSolved: { $sum: "$problemsSolved" }
        }
      },
      {
        $group: {
          _id: "$_id.platform",
          data: { 
            $push: { 
              date: "$_id.date", 
              problemsSolved: "$problemsSolved" 
            } 
          }
        }
      },
      {
        $project: {
          platform: "$_id",
          data: 1,
          _id: 0
        }
      }
    ]);

    // Monthly problems solved by platform
    const monthlyProblemsByPlatform = await Profile.aggregate([
      {
        $match: {
          lastUpdated: { $gte: threeMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            platform: "$platform",
            month: { $dateToString: { format: "%Y-%m", date: "$lastUpdated" } }
          },
          problemsSolved: { $sum: "$problemsSolved" }
        }
      },
      {
        $group: {
          _id: "$_id.platform",
          data: { 
            $push: { 
              month: "$_id.month", 
              problemsSolved: "$problemsSolved" 
            } 
          }
        }
      },
      {
        $project: {
          platform: "$_id",
          data: 1,
          _id: 0
        }
      }
    ]);

    // Yearly/All-time problems solved by platform
    const yearlyProblemsByPlatform = await Profile.aggregate([
      {
        $group: {
          _id: { 
            platform: "$platform",
            month: { $dateToString: { format: "%Y-%m", date: "$lastUpdated" } }
          },
          problemsSolved: { $sum: "$problemsSolved" }
        }
      },
      {
        $group: {
          _id: "$_id.platform",
          data: { 
            $push: { 
              month: "$_id.month", 
              problemsSolved: "$problemsSolved" 
            } 
          }
        }
      },
      {
        $project: {
          platform: "$_id",
          data: 1,
          _id: 0
        }
      }
    ]);

    // Calculate total problems solved across all platforms
    const totalProblems = platformStats.reduce((sum, platform) => sum + platform.totalProblems, 0);

    // Department statistics
    const departmentStats = await User.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$department",
          userCount: { $sum: 1 },
          avgScore: { $avg: "$totalScore" }
        }
      },
      {
        $project: {
          department: "$_id",
          userCount: 1,
          avgScore: { $round: ["$avgScore", 2] },
          _id: 0
        }
      },
      { $sort: { userCount: -1 } }
    ]);

    // Overall platform engagement
    const overallPlatformEngagement = await Profile.aggregate([
      {
        $group: {
          _id: "$platform",
          userCount: { $count: {} }
        }
      },
      {
        $project: {
          platform: "$_id",
          userCount: 1,
          _id: 0
        }
      },
      { $sort: { userCount: -1 } }
    ]);

    res.json({
      userStats: {
        totalUsers,
        activeUsers,
        topUsers,
        userGrowthData: userGrowthData.map(item => ({
          month: item._id,
          count: item.count
        }))
      },
      problemsStats: {
        totalProblems,
        platformStats,
        weeklyProblemsByPlatform,
        monthlyProblemsByPlatform,
        yearlyProblemsByPlatform
      },
      departmentStats,
      platformEngagement: overallPlatformEngagement
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      message: 'Error fetching admin statistics',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get detailed problems solved by platform
router.get('/problems-by-platform/:platform', [auth, adminAuth], async (req, res) => {
  try {
    const { platform } = req.params;
    const { timeframe } = req.query; // 'weekly', 'monthly', 'all'
    
    let timeFilter = {};
    const now = new Date();
    
    if (timeframe === 'weekly') {
      timeFilter = { lastUpdated: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
    } else if (timeframe === 'monthly') {
      timeFilter = { lastUpdated: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
    }
    
    const platformQuery = platform !== 'all' ? { platform } : {};
    
    const problemsData = await Profile.aggregate([
      {
        $match: {
          ...platformQuery,
          ...timeFilter
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: 1,
          problemsSolved: 1,
          platform: 1,
          lastUpdated: 1,
          userName: '$user.name',
          department: '$user.department'
        }
      },
      {
        $sort: { problemsSolved: -1 }
      }
    ]);
    
    res.json({
      platform: platform,
      timeframe: timeframe || 'all',
      data: problemsData
    });
  } catch (error) {
    console.error('Error fetching platform problems data:', error);
    res.status(500).json({ 
      message: 'Error fetching platform problems data',
      error: error.message
    });
  }
});

// Get department analytics
router.get('/department-analytics', [auth, adminAuth], async (req, res) => {
  try {
    // Department statistics with platform breakdown
    const departmentPlatformBreakdown = await User.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'userProfiles'
        }
      },
      {
        $unwind: {
          path: '$userProfiles',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            department: '$department',
            platform: '$userProfiles.platform'
          },
          totalProblems: { $sum: '$userProfiles.problemsSolved' },
          userCount: { $addToSet: '$_id' }
        }
      },
      {
        $group: {
          _id: '$_id.department',
          platforms: {
            $push: {
              platform: '$_id.platform',
              totalProblems: '$totalProblems',
              userCount: { $size: '$userCount' }
            }
          },
          totalUsers: { $addToSet: '$userCount' }
        }
      },
      {
        $project: {
          department: '$_id',
          platforms: 1,
          totalUsers: { $size: { $reduce: { input: '$totalUsers', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } } },
          _id: 0
        }
      }
    ]);

    // Department performance metrics
    const departmentPerformance = await User.aggregate([
      {
        $match: {
          department: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: '$department',
          avgScore: { $avg: '$totalScore' },
          maxScore: { $max: '$totalScore' },
          userCount: { $sum: 1 }
        }
      },
      {
        $sort: { avgScore: -1 }
      },
      {
        $project: {
          department: '$_id',
          avgScore: { $round: ['$avgScore', 2] },
          maxScore: 1,
          userCount: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      departmentPlatformBreakdown,
      departmentPerformance
    });
  } catch (error) {
    console.error('Error fetching department analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching department analytics',
      error: error.message
    });
  }
});

// Manual profile synchronization for admin
router.post('/sync-profiles', [auth, adminAuth], async (req, res) => {
  try {
    // Create a shared state object for tracking progress
    const progressState = {
      totalUsers: 0,
      processedUsers: 0,
      updatedProfiles: 0,
      failedProfiles: 0,
      totalProfiles: 0,
      inProgress: true,
      error: null,
      startTime: Date.now(),
      // Store in global state so it can be accessed by the status endpoint
      id: Date.now().toString()
    };
    
    // Store in global app state for status check endpoint
    if (!req.app.locals.syncProgress) {
      req.app.locals.syncProgress = {};
    }
    req.app.locals.syncProgress[progressState.id] = progressState;
    
    // Start the profile update process in the background
    console.log(`Admin ${req.user.id} initiated manual profile sync with job ID: ${progressState.id}`);
    
    // Start profile update in background
    updateAllUserProfiles(progressState)
      .then(() => {
        progressState.inProgress = false;
        progressState.completedTime = Date.now();
        console.log(`Profile sync ${progressState.id} completed successfully`);
      })
      .catch(err => {
        progressState.inProgress = false;
        progressState.error = err.message;
        progressState.completedTime = Date.now();
        console.error(`Profile sync ${progressState.id} failed:`, err.message);
      });
    
    // Immediately return to client with job ID
    res.json({ 
      success: true, 
      message: 'Profile synchronization started',
      syncId: progressState.id
    });
  } catch (err) {
    console.error('Error starting profile sync:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check progress of profile synchronization
router.get('/sync-status/:syncId', [auth, adminAuth], async (req, res) => {
  try {
    const { syncId } = req.params;
    
    // Get progress state
    const progressState = req.app.locals.syncProgress && req.app.locals.syncProgress[syncId];
    
    if (!progressState) {
      return res.status(404).json({ message: 'Sync job not found' });
    }
    
    // Calculate progress percentage
    let progress = 0;
    if (progressState.totalUsers > 0) {
      progress = Math.floor((progressState.processedUsers / progressState.totalUsers) * 100);
    }
    
    // Calculate elapsed time
    const elapsedSeconds = Math.floor((Date.now() - progressState.startTime) / 1000);
    
    // Return status
    res.json({
      id: syncId,
      inProgress: progressState.inProgress,
      progress: progress,
      totalUsers: progressState.totalUsers,
      processedUsers: progressState.processedUsers,
      updatedProfiles: progressState.updatedProfiles,
      failedProfiles: progressState.failedProfiles,
      totalProfiles: progressState.totalProfiles,
      elapsedTime: elapsedSeconds,
      error: progressState.error,
      startTime: new Date(progressState.startTime).toISOString(),
      completedTime: progressState.completedTime ? new Date(progressState.completedTime).toISOString() : null
    });
  } catch (err) {
    console.error('Error checking sync status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel an ongoing profile synchronization
router.post('/cancel-sync/:syncId', [auth, adminAuth], async (req, res) => {
  try {
    const { syncId } = req.params;
    
    // Get progress state
    const progressState = req.app.locals.syncProgress && req.app.locals.syncProgress[syncId];
    
    if (!progressState) {
      return res.status(404).json({ message: 'Sync job not found' });
    }
    
    // If job is already completed, return appropriate message
    if (!progressState.inProgress) {
      return res.json({
        success: true,
        message: 'Sync job already completed, no need to cancel',
        cancelled: false
      });
    }
    
    // Mark the job as cancelled
    progressState.inProgress = false;
    progressState.cancelled = true;
    progressState.completedTime = Date.now();
    
    // Log the cancellation
    console.log(`Admin ${req.user.id} cancelled profile sync job ${syncId}`);
    
    // Return status
    res.json({
      success: true,
      message: 'Profile synchronization cancelled',
      cancelled: true
    });
  } catch (err) {
    console.error('Error cancelling sync job:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 