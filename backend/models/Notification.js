const mongoose = require('mongoose');

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
  }
});

// Static method to create a notification for all users
notificationSchema.statics.createGlobalNotification = async function(title, message) {
  try {
    const User = mongoose.model('User');
    const users = await User.find({ userType: 'user' }).select('_id');
    
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      global: true
    }));
    
    return this.insertMany(notifications);
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