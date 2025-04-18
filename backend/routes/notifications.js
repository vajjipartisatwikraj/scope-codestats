const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const webPushUtil = require('../utils/webPushUtil');

// Get all notifications for the current user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mark a notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Increment views count only if the notification hasn't been read yet
    if (!notification.read) {
      notification.views = (notification.views || 0) + 1;
    }

    // Check if this notification should be auto-deleted
    if (notification.autoDelete) {
      // Delete the notification instead of marking it as read
      // We still incremented the views count for tracking purposes
      await notification.save();
      await Notification.deleteOne({ _id: req.params.id });
      res.json({ message: 'Notification deleted' });
    } else {
      // Mark the notification as read
      notification.read = true;
      await notification.save();
      res.json({ message: 'Notification marked as read' });
    }
  } catch (error) {
    console.error('Error handling notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mark all notifications as read for a user
router.put('/read-all', auth, async (req, res) => {
  try {
    // Find unread notifications first to increment their views
    const unreadNotifications = await Notification.find({
      userId: req.user.id,
      read: false
    });
    
    // Increment views for all unread notifications
    for (const notification of unreadNotifications) {
      notification.views = (notification.views || 0) + 1;
      await notification.save();
    }
    
    // Find auto-delete notifications
    const autoDeleteNotifications = await Notification.find({
      userId: req.user.id,
      read: false,
      autoDelete: true
    });
    
    // Delete auto-delete notifications if any
    if (autoDeleteNotifications.length > 0) {
      await Notification.deleteMany({
        userId: req.user.id,
        autoDelete: true
      });
    }
    
    // Mark remaining notifications as read
    await Notification.updateMany(
      { userId: req.user.id, read: false, autoDelete: false },
      { $set: { read: true } }
    );

    res.json({ 
      message: 'All notifications processed',
      deleted: autoDeleteNotifications.length,
      markedAsRead: true 
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Admin routes

// Get all users for notification targeting
router.get('/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({ userType: 'user' })
      .select('name email rollNumber department')
      .sort({ name: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users for notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create a notification for a specific user
router.post('/admin/user/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { title, message, deletionTime } = req.body;
    const userId = req.params.userId;
    
    // Validate request
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create notification
    const notification = new Notification({
      userId,
      title,
      message,
      deletionTime: deletionTime ? new Date(deletionTime) : null
    });
    
    await notification.save();
    
    // Send push notification if user has push subscriptions
    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      const payload = {
        title,
        body: message,
        icon: '/codestats.png',
        badge: '/codestats.png',
        data: {
          type: 'notification',
          notificationId: notification._id
        }
      };
      
      // Send to all of the user's subscriptions
      await Promise.all(
        user.pushSubscriptions.map(subscription => 
          webPushUtil.sendPushNotification({
            endpoint: subscription.endpoint,
            keys: subscription.keys
          }, payload)
        )
      );
    }
    
    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create a global notification for all users
router.post('/admin/global', auth, adminAuth, async (req, res) => {
  try {
    const { title, message, deletionTime } = req.body;
    
    // Validate request
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    // Create global notification with deletion time
    const notifications = await Notification.createGlobalNotification(
      title, 
      message, 
      deletionTime ? new Date(deletionTime) : null
    );
    
    res.status(201).json({
      message: `Global notification created for ${notifications.length} users`,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error creating global notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all notifications (admin view)
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    // Get global notifications - using findOne for each unique global notification
    const globalNotifications = await Notification.aggregate([
      { 
        $match: { 
          global: true 
        }
      },
      {
        $group: {
          _id: {
            title: '$title',
            message: '$message'
          },
          id: { $first: '$_id' },
          title: { $first: '$title' },
          message: { $first: '$message' },
          createdAt: { $first: '$createdAt' },
          deletionTime: { $first: '$deletionTime' },
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      },
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
          message: 1,
          createdAt: 1,
          deletionTime: 1,
          recipientCount: '$count',
          views: '$totalViews',
          type: { $literal: 'global' }
        }
      },
      { 
        $sort: { 
          createdAt: -1 
        }
      },
      { 
        $limit: 10 
      }
    ]);
    
    // Get individual user notifications
    const userNotifications = await Notification.find({ 
      global: false 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'name email rollNumber')
    .lean();
    
    // Format user notifications
    const formattedUserNotifications = userNotifications.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      deletionTime: n.deletionTime,
      user: n.userId,
      views: n.views || 0,
      type: 'individual'
    }));
    
    // Combine and sort all notifications by creation date
    const allNotifications = [...globalNotifications, ...formattedUserNotifications]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(allNotifications);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a notification (admin)
router.put('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const { title, message, deletionTime } = req.body;
    
    // Validate request
    if (!title && !message && deletionTime === undefined) {
      return res.status(400).json({ message: 'Title, message, or deletion time is required' });
    }
    
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Prepare update object
    const updateFields = {};
    if (title) updateFields.title = title;
    if (message) updateFields.message = message;
    if (deletionTime !== undefined) {
      updateFields.deletionTime = deletionTime ? new Date(deletionTime) : null;
    }
    
    // If global notification, update all matching notifications
    if (notification.global) {
      await Notification.updateMany(
        { 
          title: notification.title, 
          message: notification.message,
          global: true
        },
        { $set: updateFields }
      );
      
      res.json({ message: 'Global notification updated' });
    } else {
      // Update individual notification
      await Notification.findByIdAndUpdate(
        notification._id, 
        { $set: updateFields }
      );
      
      res.json({ message: 'Notification updated' });
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete a notification (admin)
router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // If global notification, delete all matching notifications
    if (notification.global) {
      const result = await Notification.deleteMany({
        title: notification.title,
        message: notification.message,
        global: true
      });
      
      res.json({ 
        message: 'Global notification deleted',
        count: result.deletedCount
      });
    } else {
      // Delete individual notification
      await Notification.deleteOne({ _id: notification._id });
      
      res.json({ message: 'Notification deleted' });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Clean up expired notifications (can be called by cron job)
router.post('/cleanup', auth, adminAuth, async (req, res) => {
  try {
    const now = new Date();
    
    // Find and delete notifications that have passed their deletion time
    const result = await Notification.deleteMany({
      deletionTime: { $ne: null, $lte: now }
    });
    
    res.json({
      message: 'Expired notifications cleanup completed',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Automatically clean up expired notifications
const cleanupExpiredNotifications = async () => {
  try {
    const now = new Date();
    
    // Find and delete notifications that have passed their deletion time
    const result = await Notification.deleteMany({
      deletionTime: { $ne: null, $lte: now }
    });
    
    if (result.deletedCount > 0) {
      console.log(`Auto-cleanup: Deleted ${result.deletedCount} expired notifications`);
    }
  } catch (error) {
    console.error('Error during auto-cleanup of expired notifications:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredNotifications, 60 * 60 * 1000);

// Run an initial cleanup when the server starts
cleanupExpiredNotifications();

// Push Notification Routes

// Subscribe to push notifications
router.post('/push/subscribe', auth, async (req, res) => {
  try {
    const subscription = req.body;
    const deviceInfo = req.body.deviceInfo || '';
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if this subscription already exists
    const existingSubscription = user.pushSubscriptions.find(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existingSubscription) {
      return res.json({ message: 'Subscription already exists' });
    }
    
    // Add the new subscription
    user.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      deviceInfo
    });
    
    await user.save();
    
    // Send a test notification
    const testPayload = {
      title: 'Notification Enabled',
      body: 'You will now receive push notifications from SCOPE',
      icon: '/codestats.png'
    };
    
    webPushUtil.sendPushNotification(subscription, testPayload);
    
    res.status(201).json({ message: 'Push notification subscription saved successfully' });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Unsubscribe from push notifications
router.post('/push/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove the subscription
    user.pushSubscriptions = user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    await user.save();
    
    res.json({ message: 'Push notification subscription removed successfully' });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get user's push notification subscriptions
router.get('/push/subscriptions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      subscriptions: user.pushSubscriptions.map(sub => ({
        endpoint: sub.endpoint,
        deviceInfo: sub.deviceInfo,
        createdAt: sub.createdAt
      }))
    });
  } catch (error) {
    console.error('Error retrieving push notification subscriptions:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete a single notification for a user
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.deleteOne({ _id: req.params.id });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router; 