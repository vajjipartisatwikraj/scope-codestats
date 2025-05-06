import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

// Check if the browser supports service workers and push notifications
const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Convert a base64 string to a Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

// Register the service worker
const registerServiceWorker = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    throw error;
  }
};

// Get public VAPID key from the server
const getVapidPublicKey = async () => {
  try {
    const response = await axios.get(`${apiUrl}/push/vapidPublicKey`);
    if (response.data && response.data.publicKey) {
      return response.data.publicKey;
    }
    throw new Error('Invalid response from server');
  } catch (error) {
    throw error;
  }
};

// Subscribe to push notifications
const subscribeToPushNotifications = async (token) => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }
  
  try {
    // Register service worker if not already registered
    let registration;
    if (!navigator.serviceWorker.controller) {
      registration = await registerServiceWorker();
    } else {
      registration = await navigator.serviceWorker.ready;
    }
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // If already subscribed, return the subscription
    if (subscription) {
      return { subscription, existing: true };
    }
    
    // Get the VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    
    // Create a new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    // Get device info
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
    
    // Send the subscription to the server
    await axios.post(
      `${apiUrl}/notifications/push/subscribe`,
      {
        ...subscription.toJSON(),
        deviceInfo: JSON.stringify(deviceInfo)
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return { subscription, existing: false };
  } catch (error) {
    throw error;
  }
};

// Unsubscribe from push notifications
const unsubscribeFromPushNotifications = async (token) => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return { success: true, message: 'Already unsubscribed' };
    }
    
    // Unsubscribe locally
    const unsubscribed = await subscription.unsubscribe();
    
    if (unsubscribed) {
      // Remove subscription from server
      await axios.post(
        `${apiUrl}/notifications/push/unsubscribe`,
        { endpoint: subscription.endpoint },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return { success: true, message: 'Successfully unsubscribed' };
    } else {
      throw new Error('Failed to unsubscribe');
    }
  } catch (error) {
    throw error;
  }
};

// Check if currently subscribed to push notifications
const checkPushNotificationSubscription = async () => {
  if (!isPushNotificationSupported()) {
    return { subscribed: false };
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      subscribed: !!subscription,
      subscription: subscription ? subscription.toJSON() : null
    };
  } catch (error) {
    return { subscribed: false, error };
  }
};

// Get push notification permission status
const getPushNotificationPermission = () => {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }
  
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  
  return Notification.permission;
};

// Request permission for push notifications
const requestPushNotificationPermission = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }
  
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser');
  }
  
  const permission = await Notification.requestPermission();
  return permission;
};

export {
  isPushNotificationSupported,
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushNotificationSubscription,
  getPushNotificationPermission,
  requestPushNotificationPermission
}; 