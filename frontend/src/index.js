import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './fonts.css';
import './utils/axiosConfig';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { registerServiceWorker } from './utils/pushNotificationUtil';

// Register service worker for push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  try {
    registerServiceWorker();
  } catch (error) {
    // Silently fail if service worker registration fails
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
