const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Path to store VAPID keys
const VAPID_KEYS_PATH = path.join(__dirname, '../config/vapid-keys.json');

// Function to generate VAPID keys if they don't exist
const generateVapidKeys = () => {
  try {
    // Check if the keys already exist
    if (fs.existsSync(VAPID_KEYS_PATH)) {
      const keys = JSON.parse(fs.readFileSync(VAPID_KEYS_PATH, 'utf8'));
      return keys;
    }

    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();
    
    // Create config directory if it doesn't exist
    const configDir = path.dirname(VAPID_KEYS_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Save keys to file
    fs.writeFileSync(VAPID_KEYS_PATH, JSON.stringify(vapidKeys));
    
    return vapidKeys;
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    throw error;
  }
};

// Initialize web-push with VAPID keys
const initWebPush = () => {
  const vapidKeys = generateVapidKeys();
  
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:notifications@scopestats.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  
  return vapidKeys.publicKey;
};

// Send push notification to a subscription
const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Return false if the subscription is invalid (gone)
    if (error.statusCode === 410) {
      return { status: false, invalidSubscription: true };
    }
    
    return { status: false, invalidSubscription: false };
  }
};

// Send notification to multiple subscriptions
const sendPushNotificationToMultipleSubscriptions = async (subscriptions, payload) => {
  const results = await Promise.all(
    subscriptions.map(subscription => 
      sendPushNotification(subscription, payload)
    )
  );
  
  return results;
};

module.exports = {
  initWebPush,
  sendPushNotification,
  sendPushNotificationToMultipleSubscriptions,
  getVapidPublicKey: () => {
    const vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_PATH, 'utf8'));
    return vapidKeys.publicKey;
  }
}; 