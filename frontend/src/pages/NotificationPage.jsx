import React, { useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton,
  Chip,
  Divider,
  Button,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon,
  Circle as CircleIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";

// Decode the obfuscated ID back to MongoDB _id
const decodeNotificationId = (encoded) => {
  try {
    return atob(encoded);
  } catch {
    return null;
  }
};

// Encode MongoDB _id to URL-safe param
export const encodeNotificationId = (id) => {
  try {
    return btoa(id);
  } catch {
    return id;
  }
};

const NotificationPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id: encodedId } = useParams();
  const { notifications, markAsRead } = useNotifications();
  const { user } = useAuth();

  const darkMode = theme.palette.mode === "dark";

  // Decode the URL param to get the real notification _id
  const notificationId = useMemo(() => decodeNotificationId(encodedId), [encodedId]);

  // Find the notification from context
  const notification = useMemo(() => {
    if (!notificationId) return null;
    return notifications.find((n) => n._id === notificationId);
  }, [notifications, notificationId]);

  // Mark as read on mount
  React.useEffect(() => {
    if (notification && !notification.read) {
      markAsRead(notification._id);
    }
  }, [notification, markAsRead]);

  // Format full date & time
  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatFullDate(dateString);
  };

  if (!user) return null;

  // Not found state
  if (!notification) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: "center" }}>
          <NotificationsActiveIcon
            sx={{
              fontSize: 64,
              color: darkMode
                ? "rgba(255,255,255,0.2)"
                : "rgba(0,0,0,0.15)",
              mb: 2,
            }}
          />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: darkMode
                ? "rgba(255,255,255,0.8)"
                : "rgba(0,0,0,0.8)",
              mb: 1,
            }}
          >
            Notification not found
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: darkMode
                ? "rgba(255,255,255,0.5)"
                : "rgba(0,0,0,0.5)",
              mb: 3,
            }}
          >
            This notification may have been deleted or is no longer available.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 500,
              borderColor: darkMode
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.12)",
              color: darkMode
                ? "rgba(255,255,255,0.7)"
                : "rgba(0,0,0,0.7)",
              "&:hover": {
                borderColor: darkMode
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(0,0,0,0.25)",
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
              },
            }}
          >
            Go back
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      {/* Back button + notification card in a row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        {/* Sticky wrapper for the back arrow */}
        <Box
          sx={{
            position: "sticky",
            top: 80,
            flexShrink: 0,
            zIndex: 10,
            alignSelf: "flex-start",
          }}
        >
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              color: darkMode
                ? "rgba(255,255,255,0.7)"
                : "rgba(0,0,0,0.6)",
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              borderRadius: "12px",
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
              },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Box>

      {/* Main notification card */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "20px",
          overflow: "hidden",
          flex: 1,
          background: darkMode
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.9)",
          border: `1px solid ${
            darkMode
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)"
          }`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header accent bar */}
        <Box
          sx={{
            height: 4,
            background: "linear-gradient(90deg, #0088cc, #00bbff, #0088cc)",
          }}
        />

        {/* Content */}
        <Box sx={{ p: { xs: 3, md: 4 } }}>
          {/* Profile row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 3,
            }}
          >
            {/* App icon */}
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
                background: darkMode
                  ? "linear-gradient(135deg, rgba(0,136,204,0.2), rgba(0,187,255,0.15))"
                  : "linear-gradient(135deg, rgba(0,136,204,0.12), rgba(0,187,255,0.08))",
                border: `1px solid ${
                  darkMode
                    ? "rgba(0,136,204,0.3)"
                    : "rgba(0,136,204,0.15)"
                }`,
                flexShrink: 0,
              }}
            >
              <img
                src="/scope-blac.png"
                alt="ScopeClub"
                style={{
                  width: 34,
                  height: 34,
                  objectFit: "contain",
                }}
              />
            </Box>

            {/* Sender & meta */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: darkMode ? "#fff" : "#0B0B0B",
                  lineHeight: 1.3,
                }}
              >
                ScopeClub
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: darkMode
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(0,0,0,0.45)",
                  fontSize: "0.78rem",
                }}
              >
                {formatRelativeTime(notification.createdAt)}
              </Typography>
            </Box>

            {/* Read status */}
            {!notification.read && (
              <Chip
                icon={
                  <CircleIcon
                    sx={{ fontSize: "8px !important", color: "#0088cc !important" }}
                  />
                }
                label="New"
                size="small"
                sx={{
                  height: 24,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  backgroundColor: darkMode
                    ? "rgba(0,136,204,0.15)"
                    : "rgba(0,136,204,0.08)",
                  color: "#0088cc",
                  border: `1px solid ${
                    darkMode
                      ? "rgba(0,136,204,0.3)"
                      : "rgba(0,136,204,0.15)"
                  }`,
                  "& .MuiChip-icon": {
                    ml: "6px",
                  },
                }}
              />
            )}
          </Box>

          <Divider
            sx={{
              mb: 3,
              borderColor: darkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.05)",
            }}
          />

          {/* Title */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.25rem", md: "1.4rem" },
              color: darkMode ? "#fff" : "#0B0B0B",
              lineHeight: 1.4,
              mb: 2,
              letterSpacing: "-0.01em",
            }}
          >
            {notification.title}
          </Typography>

          {/* Message body */}
          <Typography
            variant="body1"
            sx={{
              color: darkMode
                ? "rgba(255,255,255,0.75)"
                : "rgba(0,0,0,0.7)",
              fontSize: "0.95rem",
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {notification.message}
          </Typography>
        </Box>

        {/* Footer: timestamp details */}
        <Box
          sx={{
            px: { xs: 3, md: 4 },
            py: 2.5,
            borderTop: `1px solid ${
              darkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.05)"
            }`,
            background: darkMode
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.015)",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <AccessTimeIcon
            sx={{
              fontSize: 16,
              color: darkMode
                ? "rgba(255,255,255,0.35)"
                : "rgba(0,0,0,0.35)",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: darkMode
                ? "rgba(255,255,255,0.45)"
                : "rgba(0,0,0,0.45)",
              fontSize: "0.8rem",
            }}
          >
            {formatFullDate(notification.createdAt)} at{" "}
            {formatTime(notification.createdAt)}
          </Typography>
        </Box>
      </Paper>
      </Box>
    </Container>
  );
};

export default NotificationPage;
