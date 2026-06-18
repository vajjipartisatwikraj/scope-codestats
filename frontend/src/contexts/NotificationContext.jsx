import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { apiUrl } from "../config/apiConfig";
import axios from "axios";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { token, user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!token || !isAuthenticated) {
      // Clean up socket if no token
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Get base URL without /api for Socket.IO connection
    const socketUrl = apiUrl.replace('/api', '');

    // Create socket connection with JWT auth
    const newSocket = io(socketUrl, {
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    // Connection event handlers
    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("connect_error", () => {
      setConnected(false);
    });

    // Notification event handlers
    newSocket.on("notification:new", (notification) => {
      // Add notification to the beginning of the list
      setNotifications((prev) => [notification, ...prev]);

      // Increment unread count if notification is unread
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }

      // Optional: Show browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/codestats.png",
          badge: "/codestats.png",
        });
      }
    });

    newSocket.on("notification:updated", (notification) => {
      // Update the notification in the list
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? notification : n))
      );
    });

    newSocket.on("notification:deleted", (notificationId) => {
      // Remove notification from list
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    newSocket.on("notification:allMarkedRead", () => {
      // Mark all as read in local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });

    newSocket.on("notification:error", () => {
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [token, isAuthenticated]);

  // Fetch initial notifications on mount
  useEffect(() => {
    if (token && isAuthenticated) {
      fetchNotifications();
    } else {
      // Clear notifications when logged out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [token, isAuthenticated]);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      // fetch failed silently
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!socket || !socket.connected) {
        // Fallback to HTTP if socket not connected
        try {
          await axios.put(
            `${apiUrl}/notifications/${notificationId}/read`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n._id === notificationId ? { ...n, read: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
          // mark-read failed silently
        }
        return;
      }

      // Use socket for real-time update
      socket.emit("notification:markRead", notificationId);

      // Optimistically update UI
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [socket, token]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!socket || !socket.connected) {
      // Fallback to HTTP if socket not connected
      try {
        await axios.put(
          `${apiUrl}/notifications/read-all`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      } catch (error) {
        // mark-all-read failed silently
      }
      return;
    }

    // Use socket for real-time update
    socket.emit("notification:markAllRead");

    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [socket, token]);

  // Refresh notifications manually
  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    connected,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    socket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook for using notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};
