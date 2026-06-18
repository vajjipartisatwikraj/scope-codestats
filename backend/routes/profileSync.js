const express = require('express');
const router = express.Router();
const ProfileSyncHistory = require('../models/ProfileSyncHistory');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/profile-sync/history
// @desc    Get profile sync history (paginated)
// @access  Admin
router.get('/history', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await ProfileSyncHistory.find()
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('triggeredBy', 'name email')
      .populate('cancelledBy', 'name email')
      .select('-failedProfileDetails') // Exclude detailed failed profiles for list view
      .lean();

    const total = await ProfileSyncHistory.countDocuments();

    res.json({
      history,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching profile sync history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile-sync/latest
// @desc    Get latest profile sync
// @access  Admin
router.get('/latest', auth, adminAuth, async (req, res) => {
  try {
    const latestSync = await ProfileSyncHistory.getLatestSync();
    
    if (!latestSync) {
      return res.json({ message: 'No sync history found' });
    }

    res.json(latestSync);
  } catch (error) {
    console.error('Error fetching latest sync:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile-sync/active
// @desc    Get currently active profile sync
// @access  Admin
router.get('/active', auth, adminAuth, async (req, res) => {
  try {
    const activeSync = await ProfileSyncHistory.getActiveSync();
    
    if (!activeSync) {
      return res.json({ active: false, message: 'No active sync found' });
    }

    res.json({
      active: true,
      sync: activeSync
    });
  } catch (error) {
    console.error('Error fetching active sync:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile-sync/:id
// @desc    Get specific profile sync by ID (with full details)
// @access  Admin
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const sync = await ProfileSyncHistory.findById(req.params.id)
      .populate('triggeredBy', 'name email')
      .populate('cancelledBy', 'name email')
      .lean();

    if (!sync) {
      return res.status(404).json({ message: 'Sync record not found' });
    }

    res.json(sync);
  } catch (error) {
    console.error('Error fetching sync details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile-sync/statistics
// @desc    Get profile sync statistics
// @access  Admin
router.get('/stats/summary', auth, adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await ProfileSyncHistory.getSyncStatistics(parseInt(days));
    
    if (!stats) {
      return res.json({
        message: 'No statistics available',
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        cancelledSyncs: 0
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching sync statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile-sync/:id/failed-profiles
// @desc    Get failed profiles for a specific sync
// @access  Admin
router.get('/:id/failed-profiles', auth, adminAuth, async (req, res) => {
  try {
    const sync = await ProfileSyncHistory.findById(req.params.id)
      .select('failedProfileDetails')
      .lean();

    if (!sync) {
      return res.status(404).json({ message: 'Sync record not found' });
    }

    res.json({
      syncId: req.params.id,
      failedProfiles: sync.failedProfileDetails || [],
      count: sync.failedProfileDetails?.length || 0
    });
  } catch (error) {
    console.error('Error fetching failed profiles:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/profile-sync/platform-stats/:platform
// @desc    Get platform-specific statistics
// @access  Admin
router.get('/platform-stats/:platform', auth, adminAuth, async (req, res) => {
  try {
    const { platform } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const platformStats = await ProfileSyncHistory.aggregate([
      {
        $match: {
          startTime: { $gte: startDate },
          status: { $in: ['completed', 'failed', 'cancelled'] }
        }
      },
      { $unwind: '$platformStats' },
      {
        $match: {
          'platformStats.platform': platform
        }
      },
      {
        $group: {
          _id: null,
          totalProfiles: { $sum: '$platformStats.totalProfiles' },
          successfulProfiles: { $sum: '$platformStats.successfulProfiles' },
          failedProfiles: { $sum: '$platformStats.failedProfiles' },
          skippedProfiles: { $sum: '$platformStats.skippedProfiles' },
          averageResponseTime: { $avg: '$platformStats.averageResponseTime' },
          syncCount: { $sum: 1 }
        }
      }
    ]);

    if (!platformStats || platformStats.length === 0) {
      return res.json({
        platform,
        message: 'No statistics available',
        totalProfiles: 0,
        successfulProfiles: 0,
        failedProfiles: 0
      });
    }

    res.json({
      platform,
      ...platformStats[0]
    });
  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/profile-sync/:id
// @desc    Delete a specific sync record
// @access  Admin
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const sync = await ProfileSyncHistory.findByIdAndDelete(req.params.id);

    if (!sync) {
      return res.status(404).json({ message: 'Sync record not found' });
    }

    res.json({ message: 'Sync record deleted successfully' });
  } catch (error) {
    console.error('Error deleting sync record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/profile-sync/cleanup
// @desc    Clean up old sync records (keep last N records)
// @access  Admin
router.post('/cleanup', auth, adminAuth, async (req, res) => {
  try {
    const { keepLast = 50 } = req.body;

    // Get all sync records sorted by date
    const allSyncs = await ProfileSyncHistory.find()
      .sort({ startTime: -1 })
      .select('_id')
      .lean();

    if (allSyncs.length <= keepLast) {
      return res.json({
        message: 'No cleanup needed',
        total: allSyncs.length,
        kept: allSyncs.length,
        deleted: 0
      });
    }

    // Get IDs to delete
    const idsToDelete = allSyncs.slice(keepLast).map(s => s._id);

    // Delete old records
    const result = await ProfileSyncHistory.deleteMany({
      _id: { $in: idsToDelete }
    });

    res.json({
      message: 'Cleanup completed successfully',
      total: allSyncs.length,
      kept: keepLast,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up sync records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
