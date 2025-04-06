const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Notification = require('../models/Notification');
const User = require('../models/User');

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

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Mark all notifications as read for a user
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
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
    const { title, message } = req.body;
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
      message
    });
    
    await notification.save();
    
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
    const { title, message } = req.body;
    
    // Validate request
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    // Create global notification
    const notifications = await Notification.createGlobalNotification(title, message);
    
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
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
          message: 1,
          createdAt: 1,
          recipientCount: '$count',
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
      user: n.userId,
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
    const { title, message } = req.body;
    
    // Validate request
    if (!title && !message) {
      return res.status(400).json({ message: 'Title or message is required' });
    }
    
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // If global notification, update all matching notifications
    if (notification.global) {
      await Notification.updateMany(
        { 
          title: notification.title, 
          message: notification.message,
          global: true
        },
        { 
          $set: { 
            title: title || notification.title,
            message: message || notification.message
          }
        }
      );
      
      res.json({ message: 'Global notification updated' });
    } else {
      // Update individual notification
      notification.title = title || notification.title;
      notification.message = message || notification.message;
      await notification.save();
      
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

module.exports = router; 