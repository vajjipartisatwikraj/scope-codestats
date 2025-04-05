const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
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
    const { title, description, link, deadline, organizer, status, category, difficulty, registrationOpen, location, tags, prize, eligibility, applicationLink } = req.body;
    
    console.log('Received tags in create request:', tags);
    
    if (!title || !description || !link || !deadline || !organizer || !status) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'link', 'deadline', 'organizer', 'status']
      });
    }

    // Format tags properly
    const formattedTags = Array.isArray(tags) ? tags : [];
    console.log('Formatted tags for creation:', formattedTags);

    const opportunity = new Opportunity({
      title,
      description,
      link,
      deadline,
      organizer,
      status,
      category,
      difficulty,
      registrationOpen,
      location,
      tags: formattedTags,
      prize,
      eligibility,
      applicationLink,
      createdBy: req.user.id
    });
    
    console.log('Creating opportunity with data:', opportunity);
    await opportunity.save();
    res.status(201).json(opportunity);
  } catch (err) {
    console.error('Error creating opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/opportunities/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, link, deadline, organizer, status, category, difficulty, registrationOpen, location, tags, prize, eligibility, applicationLink } = req.body;
    
    console.log('Received tags in update request:', tags);
    
    if (!title || !description || !link || !deadline || !organizer || !status) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'link', 'deadline', 'organizer', 'status']
      });
    }

    // Create an update object with all provided fields
    const updateFields = {
      title, 
      description, 
      link, 
      deadline,
      organizer,
      status,
      applicationLink: applicationLink || link
    };

    // Add optional fields if provided
    if (category) updateFields.category = category;
    if (difficulty) updateFields.difficulty = difficulty;
    if (registrationOpen !== undefined) updateFields.registrationOpen = registrationOpen;
    if (location) updateFields.location = location;
    if (tags) updateFields.tags = Array.isArray(tags) ? tags : []; // Ensure tags is an array
    if (prize) updateFields.prize = prize;
    if (eligibility) updateFields.eligibility = eligibility;

    console.log('Update fields for opportunity:', updateFields);

    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    
    console.log('Updated opportunity:', opportunity);
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
    
    // Get top 5 users by total problems solved - EXCLUDE admin users
    const topUsers = await User.find({ userType: { $ne: 'admin' } })
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
    console.log(`Admin ${req.user.id} initiating manual profile sync`);

    // Create an abort controller for cancellation
    const abortController = new AbortController();
    
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
      lastUpdated: Date.now(),
      // Add flag to indicate this job is initiated from admin panel
      isAdminInitiated: true,
      // Store in global state so it can be accessed by the status endpoint
      id: Date.now().toString(),
      cancelled: false,
      completedTime: null,
      // Store the abort controller for cancellation
      abortController: abortController
    };
    
    // Store in global app state for status check endpoint
    if (!req.app.locals.syncProgress) {
      req.app.locals.syncProgress = {};
    }
    req.app.locals.syncProgress[progressState.id] = progressState;
    
    // Start the profile update process in the background
    console.log(`Admin ${req.user.id} initiated manual profile sync with job ID: ${progressState.id}`);
    
    // Set up a timeout to clear the progress state after 24 hours to prevent memory leaks
    const cleanupTimeout = setTimeout(() => {
      if (req.app.locals.syncProgress && req.app.locals.syncProgress[progressState.id]) {
        console.log(`Cleaning up expired sync job ${progressState.id} after 24 hours`);
        delete req.app.locals.syncProgress[progressState.id];
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Make the timeout unref() so it doesn't keep the process alive if it's the only thing left
    if (cleanupTimeout.unref) {
      cleanupTimeout.unref();
    }
    
    // Start profile update in background with proper error handling
    try {
      console.log(`Starting profile update process for job ${progressState.id}`);
      
      // Pass the abort controller to the update function
      const updatePromise = updateAllUserProfiles(progressState, abortController.signal);
      
      updatePromise
        .then((result) => {
          progressState.inProgress = false;
          progressState.completedTime = Date.now();
          progressState.result = result;
          console.log(`Profile sync ${progressState.id} completed successfully`);
          
          // Once completed, clean up the abort controller reference to avoid memory leaks
          if (progressState.abortController) {
            delete progressState.abortController;
          }
        })
        .catch(err => {
          progressState.inProgress = false;
          progressState.error = err.message || "Unknown error occurred";
          progressState.completedTime = Date.now();
          console.error(`Profile sync ${progressState.id} failed:`, err.message);
          
          // Clean up the abort controller reference on error
          if (progressState.abortController) {
            delete progressState.abortController;
          }
        });
    } catch (syncError) {
      // Handle any immediate errors in starting the sync
      progressState.inProgress = false;
      progressState.error = syncError.message || "Failed to start sync";
      progressState.completedTime = Date.now();
      console.error(`Failed to start profile sync ${progressState.id}:`, syncError);
      
      // Clean up the abort controller reference on immediate error
      if (progressState.abortController) {
        delete progressState.abortController;
      }
    }
    
    // Immediately return to client with job ID
    console.log(`Returning sync job ID ${progressState.id} to client`);
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
    console.log(`Received sync-status request for job ${syncId}`);
    
    // Check MongoDB connection and reconnect if needed
    if (mongoose.connection.readyState !== 1) { // 1 = connected
      console.log('MongoDB connection check in sync-status: Disconnected. Reconnecting...');
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully reconnected to MongoDB in sync-status');
      } catch (mongoError) {
        console.error('Failed to reconnect to MongoDB in sync-status:', mongoError);
      }
    }
    
    // Get progress state
    const progressState = req.app.locals.syncProgress && req.app.locals.syncProgress[syncId];
    
    if (!progressState) {
      console.log(`Sync job ${syncId} not found in app.locals.syncProgress`);
      return res.status(404).json({ message: 'Sync job not found' });
    }
    
    // Check for stalled processes (no updates for over 2 minutes but still marked as in progress)
    const now = Date.now();
    if (progressState.inProgress && progressState.lastUpdated && 
        (now - progressState.lastUpdated > 120000)) { // 2 minutes
      console.log(`Sync job ${syncId} appears to be stalled (no updates for ${Math.round((now - progressState.lastUpdated)/1000)} seconds)`);
      
      // Check if the process is actually stalled or if it's completed but failed to update
      if (progressState.processedUsers > 0 && progressState.totalUsers > 0 && 
          progressState.processedUsers >= progressState.totalUsers) {
        // If all users have been processed, mark as complete
        console.log(`All ${progressState.processedUsers}/${progressState.totalUsers} users processed - marking sync job ${syncId} as complete`);
        progressState.inProgress = false;
        progressState.completedTime = progressState.lastUpdated || now;
      } else {
        // Log warning but continue - we don't automatically mark as failed
        console.log(`WARNING: Sync job ${syncId} may be stalled at ${progressState.processedUsers}/${progressState.totalUsers} users`);
      }
    }
    
    // If sync is already complete, add a cache control header to prevent excessive polling
    if (!progressState.inProgress) {
      // Add cache control header (1 hour) for completed sync jobs
      res.set('Cache-Control', 'private, max-age=3600');
      console.log(`Sync job ${syncId} is complete - adding cache header to prevent excessive polling`);
    }
    
    // Calculate progress percentage
    let progress = 0;
    if (progressState.totalUsers > 0) {
      progress = Math.floor((progressState.processedUsers / progressState.totalUsers) * 100);
    }
    
    // Calculate elapsed time
    const elapsedSeconds = Math.floor((Date.now() - progressState.startTime) / 1000);
    
    console.log(`Returning sync status for job ${syncId}: Progress ${progress}%, Users ${progressState.processedUsers}/${progressState.totalUsers}`);
    
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
      failedProfilesList: progressState.failedProfilesList || [],
      elapsedTime: elapsedSeconds,
      error: progressState.error,
      lastUpdated: progressState.lastUpdated ? new Date(progressState.lastUpdated).toISOString() : null,
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
    
    // Mark the job as cancelled - this needs to happen before aborting to prevent race conditions
    progressState.inProgress = false;
    progressState.cancelled = true;
    progressState.completedTime = Date.now();
    progressState.error = "Cancelled by admin";
    
    // Abort the process if there's an abort controller
    if (progressState.abortController && typeof progressState.abortController.abort === 'function') {
      try {
        progressState.abortController.abort();
        console.log(`Abort controller triggered for sync job ${syncId}`);
      } catch (abortError) {
        console.error(`Error triggering abort controller for sync job ${syncId}:`, abortError);
        // Continue even if abort controller fails - we've already set the cancelled flag
      }
    }

    // Force GC if possible to help free memory
    if (global.gc) {
      try {
        global.gc();
        console.log('Garbage collection triggered after cancellation');
      } catch (gcError) {
        console.error('Error triggering garbage collection:', gcError);
      }
    }
    
    // Check MongoDB connection and reconnect if needed
    if (mongoose.connection.readyState !== 1) { // 1 = connected
      console.log('MongoDB connection check after cancellation: Disconnected. Reconnecting...');
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully reconnected to MongoDB after cancellation');
      } catch (mongoError) {
        console.error('Failed to reconnect to MongoDB after cancellation:', mongoError);
      }
    } else {
      console.log('MongoDB connection check after cancellation: Still connected');
    }
    
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
