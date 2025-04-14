const mongoose = require('mongoose');
const webPushUtil = require('../utils/webPushUtil');
const User = mongoose.model('User');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // To support notification targeting to all users or specific user
  global: {
    type: Boolean,
    default: false
  },
  // Flag to determine if notification should auto-delete when read
  autoDelete: {
    type: Boolean,
    default: false
  },
  // Add deletionTime field to specify when a notification should be automatically deleted
  deletionTime: {
    type: Date,
    default: null
  }
});

// Pre-save middleware to handle deletionTime validation
notificationSchema.pre('save', function(next) {
  // If deletionTime is set, but it's in the past, set it to null
  if (this.deletionTime && new Date(this.deletionTime) < new Date()) {
    console.warn('Attempted to set a deletionTime in the past, resetting to null');
    this.deletionTime = null;
  }
  next();
});

// Pre-update middleware
notificationSchema.pre('updateOne', function(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.deletionTime) {
    // If deletionTime is set, but it's in the past, set it to null
    if (new Date(update.$set.deletionTime) < new Date()) {
      console.warn('Attempted to set a deletionTime in the past, resetting to null');
      update.$set.deletionTime = null;
    }
  }
  next();
});

// Static method to create a notification for all users
notificationSchema.statics.createGlobalNotification = async function(title, message, deletionTime = null) {
  try {
    const users = await User.find({ userType: 'user' }).select('_id pushSubscriptions');
    
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      global: true,
      deletionTime: deletionTime ? new Date(deletionTime) : null
    }));
    
    // Create database notifications
    const createdNotifications = await this.insertMany(notifications);
    
    // Send push notifications to all subscribed users
    const pushPromises = users
      .filter(user => user.pushSubscriptions && user.pushSubscriptions.length > 0)
      .map(user => {
        const payload = {
          title,
          body: message,
          icon: '/codestats.png',
          badge: '/codestats.png',
          data: {
            type: 'notification',
            notificationId: createdNotifications.find(n => n.userId.toString() === user._id.toString())?._id
          },
          actions: [
            {
              action: 'open',
              title: 'View'
            }
          ]
        };
        
        return Promise.all(
          user.pushSubscriptions.map(subscription => 
            webPushUtil.sendPushNotification({
              endpoint: subscription.endpoint,
              keys: subscription.keys
            }, payload)
          )
        );
      });
    
    // Execute all push notification sends in parallel
    await Promise.all(pushPromises);
    
    return createdNotifications;
  } catch (error) {
    console.error('Error creating global notification:', error);
    throw error;
  }
};

// Helper to get a sample of a global notification
notificationSchema.statics.findGlobalSample = async function(title, message) {
  return this.findOne({ title, message, global: true });
};

module.exports = mongoose.model('Notification', notificationSchema); 