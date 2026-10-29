/**
 * DEPRECATED. The student dashboard is now StudentDashboard (components/StudentDashboard).
 *
 * This is the previous dashboard, kept whole because it holds code that has not been rebuilt
 * yet: linking and unlinking platform usernames, the 6 hour update cooldown, and the Platforms
 * and Progress tabs. ConditionalDashboard still renders it for /dashboard?view=platforms and
 * /dashboard?view=progress, and the new dashboard links to those two views. Choosing the
 * Overview tab here clears the view and returns to the new dashboard.
 *
 * Do not add features here. Move what is needed into the new dashboard, then delete this file
 * together with ./deprecated_Dashboard.css and the other files in this folder.
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import "./deprecated_Dashboard.css";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Tabs,
  Tab,
} from "@mui/material";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../../config/apiConfig";

// Import shared utilities and constants
import {
  platforms,
  getLiquidGlassStyle,
  getInnerGlassStyle,
  getButtonGlassStyle,
} from "../Dashboard/dashboardUtils";

// Import modular dashboard components
import DashboardHeatmap from "../Dashboard/DashboardHeatmap";
import PlatformProgress from "./deprecated_PlatformProgress";
import UsernameConfirmDialog from "./deprecated_UsernameConfirmDialog";
import { removeLinkedPlatform } from "../../services/platformProgressApi";

// Dashboard sub pages. The active one is kept in the URL (?view=...) so a sub page
// can be bookmarked / refreshed, while all data state stays shared in <Dashboard />.
const DASHBOARD_VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "platforms", label: "Platforms" },
  { key: "progress", label: "Progress" },
];
const DEFAULT_DASHBOARD_VIEW = DASHBOARD_VIEWS[0].key;

// Platforms with stored history (progress snapshots, and the platform's score and rank
// history), so replacing their username deletes it. GitHub has no progress snapshots (its
// timeline is read live) but its score and rank history is stored.
const PLATFORMS_WITH_HISTORY = ["leetcode", "codeforces", "codechef", "hackerrank", "github"];

// Function to render platform-specific details (Dashboard-specific, not in dashboardUtils)
const renderPlatformDetails = (platform, details) => {
  if (!details) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Common details for all platforms (all of it comes from the Profile)
  const commonDetails = [
    { label: "Score", value: details.score || "0" },
    { label: "Problems Solved", value: details.problemsSolved || "0" },
    { label: "Last Updated", value: formatDate(details.lastUpdated) },
  ];

  // Why the last sync failed (not found, rate limited, timeout, ...)
  if (details.lastUpdateStatus === "error" && details.lastUpdateError) {
    commonDetails.push({
      label: "Last Sync Error",
      value: details.lastUpdateError,
    });
  }

  // Platform-specific details
  let platformDetails = [];

  switch (platform) {
    case "github":
      platformDetails = [
        { label: "Public Repos", value: details.publicRepos || "0" },
        { label: "Total Commits", value: details.totalCommits || "0" },
        { label: "Followers", value: details.followers || "0" },
        { label: "Following", value: details.following || "0" },
        { label: "Stars Received", value: details.starsReceived || "0" },
      ];
      break;
    case "leetcode":
      platformDetails = [
        {
          label: "Ranking",
          value: details.globalRank || details.ranking || "N/A",
        },
        { label: "Contest Rating", value: details.rating || "0" },
        { label: "Reputation", value: details.reputation || "0" },
        { label: "Easy Problems", value: details.easyProblemsSolved || "0" },
        {
          label: "Medium Problems",
          value: details.mediumProblemsSolved || "0",
        },
        { label: "Hard Problems", value: details.hardProblemsSolved || "0" },
        {
          label: "Contests Participated",
          value: details.contestsParticipated || "0",
        },
      ];
      break;

    case "codeforces":
      platformDetails = [
        { label: "Rating", value: details.rating || "0" },
        { label: "Max Rating", value: details.maxRating || "0" },
        { label: "Rank", value: details.rank || "Unrated" },
        { label: "Contribution", value: details.contribution || "0" },
        {
          label: "Contests Participated",
          value: details.contestsParticipated || "0",
        },
      ];
      break;

    case "codechef":
      platformDetails = [
        { label: "Rating", value: details.rating || "0" },
        {
          label: "Global Rank",
          value: details.global_rank || details.globalRank || "N/A",
        },
        {
          label: "Country Rank",
          value: details.country_rank || details.countryRank || "N/A",
        },
        {
          label: "Problems Solved",
          value: details.problemsSolved || "0",
          highlight: true,
          description: "Used as your total problems solved count",
        },
        {
          label: "Contests Participated",
          value: details.contestsParticipated || "0",
        },
        { label: "Partially Solved", value: details.partialSolved || "0" },
      ];
      break;

    case "hackerrank":
      platformDetails = [
        {
          label: "Badges",
          value: details.badges || details.badgesCount || "0",
        },
        {
          label: "Certificates",
          value: details.certificates || details.certificatesCount || "0",
        },
        {
          label: "Contests Participated",
          value: details.contestsParticipated || "0",
        },
      ];
      break;

    default:
      break;
  }

  return [...commonDetails, ...platformDetails];
};

const Dashboard = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedView = searchParams.get("view");
  const activeView = DASHBOARD_VIEWS.some((v) => v.key === requestedView)
    ? requestedView
    : DEFAULT_DASHBOARD_VIEW;

  const handleViewChange = (_event, newView) => {
    setSearchParams(
      newView === DEFAULT_DASHBOARD_VIEW ? {} : { view: newView },
      { replace: true },
    );
  };

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [profileDetails, setProfileDetails] = useState({});
  const [expandedProfiles, setExpandedProfiles] = useState({});
  const [platformData, setPlatformData] = useState({});
  const [updatingPlatforms, setUpdatingPlatforms] = useState({});
  const [cooldowns, setCooldowns] = useState({});
  // Asks before a username is removed or replaced by another account (see UsernameConfirmDialog)
  const [usernameConfirm, setUsernameConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [remainingTimes, setRemainingTimes] = useState({});
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapRequested, setHeatmapRequested] = useState(false);

  // The heatmap loads the first time it scrolls into view.
  const heatmapRef = useRef(null);
  const observerRef = useRef(null);

  const loadHeatmap = useCallback(() => {
    if (!heatmapRequested && auth?.token && (auth?.user?._id || auth?.user?.id)) {
      setHeatmapRequested(true);
      fetchHeatmap();
    }
  }, [heatmapRequested, auth?.token, auth?.user?._id, auth?.user?.id]);

  // Intersection Observer for lazy loading - only set up after initial loading completes
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.target === heatmapRef.current) {
              loadHeatmap();
            }
          });
        },
        { root: null, rootMargin: "100px", threshold: 0.1 }
      );
      if (heatmapRef.current) observer.observe(heatmapRef.current);
      observerRef.current = observer;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
    // activeView: the heatmap only exists on the Overview sub page, so the
    // observer is re-attached whenever the sub page changes.
  }, [loading, activeView, loadHeatmap]);

  useEffect(() => {
    if (!auth?.token) {
      navigate("/login");
      return;
    }
    fetchUserData();
  }, [auth?.token]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      let updatedTimes = {};
      let hasActiveCooldowns = false;

      Object.keys(cooldowns).forEach((platform) => {
        const cooldownEnd = cooldowns[platform];
        if (cooldownEnd && cooldownEnd > now) {
          const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
          updatedTimes[platform] = remainingSeconds;
          hasActiveCooldowns = true;
        } else if (cooldowns[platform]) {
          setCooldowns((prev) => {
            const updated = { ...prev };
            delete updated[platform];
            return updated;
          });
        }
      });

      if (hasActiveCooldowns) {
        setRemainingTimes(updatedTimes);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldowns]);

  // Daily activity heatmap (problems solved per day)
  const fetchHeatmap = async () => {
    const userId = auth?.user?._id || auth?.user?.id;
    if (!auth?.token || !userId) return;

    try {
      setHeatmapLoading(true);
      const response = await axios.get(`${apiUrl}/dashboard/heatmap/${userId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      // The endpoint returns per-day problem counts with intensity levels (0-4).
      const dailyActivity = Array.isArray(response.data.dailyActivity)
        ? response.data.dailyActivity.map((d) => ({
            date: d.date,
            count: d.count || 0,
            level: d.level || 0,
            sources: d.sources || {},
            wasActive: (d.count || 0) > 0,
          }))
        : [];

      setHeatmapData({
        dailyActivity,
        error: false,
        empty: false,
        summary: {
          totalDays: dailyActivity.length,
          activeDays: response.data.activeDays || 0,
          totalProblemsSolved: response.data.totalCount || 0,
        },
      });
    } catch (error) {
      setHeatmapData({ error: true, empty: true });
    } finally {
      setHeatmapLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!auth?.token) return;

    try {
      setLoading(true);

      // Try multiple endpoints to get the most complete user data
      let userData = null;
      let meResponse = null;
      let profilesResponse = null;
      let statsResponse = null;

      // 1. Try to get main user data from /me endpoint
      try {
        meResponse = await axios.get(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        userData = meResponse.data;
      } catch (meError) {
        // Silent error handling
      }

      // 2. Try to get profiles data if me endpoint failed or returned incomplete data
      if (!userData || !userData.codingProfiles) {
        try {
          profilesResponse = await axios.get(`${apiUrl}/profiles/me`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          });
          userData = { ...userData, ...profilesResponse.data };
        } catch (profilesError) {
          // Silent error handling
        }
      }

      // 3. Get current stats data to ensure we have the latest
      try {
        statsResponse = await axios.get(`${apiUrl}/profiles/stats`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
      } catch (statsError) {
        // Silent error handling
      }

      // If we couldn't get any data at all, show error
      if (!userData && !statsResponse) {
        throw new Error("Failed to retrieve any user data");
      }

      // Process data from all sources to build a complete profile picture
      const platformDataObj = {};
      const profileDetailsObj = {};
      const profilesObj = {};
      const cooldownsObj = {};
      const remainingTimesObj = {};
      const now = Date.now();

      platforms.forEach((platform) => {
        const key = platform.key;
        let username = "";
        let details = null;

        // Extract username from userData (various formats)
        if (userData) {
          if (userData.profiles && userData.profiles[key]) {
            username = userData.profiles[key];
          } else if (userData.codingProfiles && userData.codingProfiles[key]) {
            username = userData.codingProfiles[key].username || "";
          } else if (userData[key]) {
            username = userData[key];
          }

          // Normalize username format - ensure we only store the actual username string
          if (typeof username === "object") {
            username = username.username || "";
          }

          // Make sure username is a string and not undefined/null
          username = username ? String(username) : "";

          // Extract details from userData (the user's Profile documents)
          if (userData.codingProfiles && userData.codingProfiles[key]) {
            details = userData.codingProfiles[key];
          } else if (userData.profiles?.[key]?.details) {
            details = userData.profiles[key].details;
          }
        }

        // Add null check for details
        if (!details) {
          details = {
            score: 0,
            problemsSolved: 0,
            lastUpdated: new Date(),
          };
        }

        // Update with stats data if available
        if (statsResponse && statsResponse.data && statsResponse.data.success) {
          const platformStats = statsResponse.data.profiles.find(
            (p) => p.platform === key,
          );
          if (platformStats) {
            details = { ...details, ...platformStats };

            // Update the username from stats if needed for consistency
            if (platformStats.username && !username) {
              username =
                typeof platformStats.username === "object"
                  ? platformStats.username.username || ""
                  : platformStats.username || "";
            }

          }
        }

        // Special handling for GitHub - always allow editing
        if (key === "github") {
          // Don't set cooldown for GitHub
        } else {
          // The server tells us when this platform can be updated again
          // (6 hours after the last successful update).
          const cooldownEndsAt = details?.cooldownEndsAt
            ? new Date(details.cooldownEndsAt).getTime()
            : null;
          if (cooldownEndsAt && cooldownEndsAt > now) {
            cooldownsObj[key] = cooldownEndsAt;
            remainingTimesObj[key] = Math.ceil((cooldownEndsAt - now) / 1000);
          }
        }

        // Ensure details has a username property
        if (details && username && !details.username) {
          details.username = username;
        }

        // Store extracted data
        platformDataObj[key] = { username, details };
        profileDetailsObj[key] = details;
        profilesObj[key] = username;
      });

      // Update state with all the data we've collected
      setPlatformData(platformDataObj);
      setProfileDetails(profileDetailsObj);
      setProfiles(profilesObj);
      setCooldowns(cooldownsObj);
      setRemainingTimes(remainingTimesObj);

      // Initialize all profiles as collapsed by default
      const expandedState = {};
      Object.keys(profilesObj).forEach((key) => {
        expandedState[key] = false; // Always collapsed by default
      });
      setExpandedProfiles(expandedState);

      setLoading(false);
    } catch (error) {
      toast.error("Failed to load profile data. Please try again later.");
      setLoading(false);
    }
  };

  // Entry point of the update button: switching to a different account deletes the stored
  // progress history of the old one, so that case is confirmed first.
  const handleSubmit = (platform) => {
    const saved = (platformData[platform]?.username || "").trim();
    const typed = (profiles[platform] || "").trim();
    const switchingAccount = saved && typed && saved.toLowerCase() !== typed.toLowerCase();

    if (switchingAccount && PLATFORMS_WITH_HISTORY.includes(platform)) {
      setUsernameConfirm({
        action: "change",
        platform,
        platformName: platforms.find((p) => p.key === platform)?.name || platform,
        username: saved,
        newUsername: typed,
        hasHistory: true,
      });
      return;
    }
    submitUsername(platform);
  };

  // Removes the saved username of a platform together with its stats and history.
  const removeUsername = async (platform) => {
    setConfirmBusy(true);
    try {
      const result = await removeLinkedPlatform(platform);
      const empty = { score: 0, problemsSolved: 0, lastUpdated: new Date() };

      setProfiles((prev) => ({ ...prev, [platform]: "" }));
      setPlatformData((prev) => ({ ...prev, [platform]: { username: "", details: empty } }));
      setProfileDetails((prev) => ({ ...prev, [platform]: empty }));
      setCooldowns((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
      setRemainingTimes((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
      const deleted = (result.historyDeleted || 0) + (result.scoreHistoryCleared || 0);
      toast.success(
        deleted > 0
          ? `Username removed and ${deleted} history record(s) deleted.`
          : "Username removed.",
      );
      setUsernameConfirm(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove the username. Please try again.");
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleConfirmUsernameAction = async () => {
    if (!usernameConfirm) return;
    const { action, platform } = usernameConfirm;
    if (action === "remove") {
      await removeUsername(platform);
      return;
    }
    setUsernameConfirm(null);
    await submitUsername(platform);
  };

  const submitUsername = async (platform) => {
    if (!auth?.token) return;

    try {
      setUpdatingPlatforms((prev) => ({ ...prev, [platform]: true }));
      const username = profiles[platform] || "";

      if (!username.trim()) {
        toast.error("Username cannot be empty");
        setUpdatingPlatforms((prev) => ({ ...prev, [platform]: false }));
        return;
      }

      const response = await axios.post(
        `${apiUrl}/profiles/${platform}`,
        { username },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
        },
      );

      if (response.data.success) {
        // Success handling - always show success toast if we get here
        toast.success(`${platform} profile updated successfully!`);

        // Only update the username in profiles state if API confirmed it's valid
        setProfiles((prev) => ({
          ...prev,
          [platform]: username,
        }));

        // Update platforms data with the new data
        setPlatformData((prev) => ({
          ...prev,
          [platform]: response.data.data,
        }));

        // Update profile details with the new data
        setProfileDetails((prev) => ({
          ...prev,
          [platform]: response.data.data.details,
        }));

        // Only set cooldown after successful updates for non-GitHub platforms
        if (platform !== "github") {
          const cooldownEnd = Date.now() + 6 * 60 * 60 * 1000; // 6 hours in milliseconds
          setCooldowns((prev) => ({ ...prev, [platform]: cooldownEnd }));
          setRemainingTimes((prev) => ({ ...prev, [platform]: 6 * 60 * 60 })); // 6 hours in seconds
        }
      } else {
        // If the update wasn't successful, don't set a cooldown
        toast.error(response.data.message || "Failed to update profile");

        // Reset the input field to the previous valid username
        // This ensures incorrect usernames don't replace correct ones
        setProfiles((prev) => ({
          ...prev,
          [platform]: platformData[platform.key]?.username || prev[platform],
        }));
      }
    } catch (error) {
      // Check if this is a rate limit error (429)
      if (error.response?.status === 429) {
        // Use the formatted time from the API response if available
        const formattedTime = error.response.data.formattedTime || "some time";

        // Show toast with formatted time
        toast.error(
          error.response.data.message ||
            `Please wait ${formattedTime} before updating your ${platform} profile again.`,
        );

        // Only set a cooldown for rate limit errors if not GitHub
        if (platform !== "github") {
          const remainingTime =
            error.response.data.remainingTime || 6 * 60 * 60;
          const cooldownEnd = Date.now() + remainingTime * 1000;
          setCooldowns((prev) => ({ ...prev, [platform]: cooldownEnd }));
          setRemainingTimes((prev) => ({ ...prev, [platform]: remainingTime }));
        }
      } else if (error.response?.status === 404) {
        // Clear error for profile not found - show a clear message
        const platformName =
          platforms.find((p) => p.key === platform)?.name || platform;
        toast.error(
          error.response.data.message ||
            `User not found on ${platformName}. Please check the username and try again.`,
        );

        // Don't change the input value to allow the user to fix it
      } else if (platform === "github" && error.response?.status === 400) {
        // Special handling for GitHub validation errors
        const errorMessage =
          error.response?.data?.message || "Invalid GitHub username format.";
        toast.error(errorMessage);
      } else {
        // For all other errors, don't set a cooldown
        let errorMessage =
          error.response?.data?.message ||
          `Failed to update ${platform} profile. Please try again.`;

        // Format profile not found errors more clearly
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("Profile Not Found")
        ) {
          const platformName =
            platforms.find((p) => p.key === platform)?.name || platform;

          // Add specific troubleshooting tips based on the platform
          if (platform === "codeforces") {
            errorMessage = `${errorMessage}. Please check that the username exists and is spelled correctly.`;
          } else if (platform === "hackerrank") {
            errorMessage = `${errorMessage}. Please verify your HackerRank username is correct.`;
          } else if (platform === "github") {
            errorMessage = `${errorMessage}. Please verify that your GitHub username is correct and your profile is public.`;
          } else {
            errorMessage = `${errorMessage}. Please verify the username and try again.`;
          }
        }

        toast.error(errorMessage);

        // Reset the input field to the previous valid username
        // This ensures incorrect usernames don't replace correct ones
        setProfiles((prev) => ({
          ...prev,
          [platform]: platformData[platform.key]?.username || prev[platform],
        }));
      }
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, [platform]: false }));
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        height: "auto", // Allow height to expand with content
        bgcolor: darkMode ? "#000000" : "#f5f5f5", // Theme-responsive background
        backgroundImage: darkMode
          ? "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)"
          : "radial-gradient(circle at 20% 50%, rgba(0,0,0,0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,0,0,0.02) 0%, transparent 50%)",
        overflowY: "auto", // Ensure vertical scrolling is enabled
        overflowX: "hidden", // Prevent horizontal scrolling
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          py: 6,
          px: { xs: 2, sm: 3, md: 4, lg: 6 }, // Responsive padding
          width: "100%",
          maxWidth: "1240px", // Standard max width with padding
          mx: "auto", // Center the container
          height: "auto",
          minHeight: "auto",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: { xs: 3, sm: 4, md: 5 }, // Responsive gap
        }}
      >
        {/* Programming Cohorts Section */}
        <Box
          sx={{
            ...getLiquidGlassStyle(darkMode),
            width: "100%",
            maxWidth: "1200px",
            mx: "auto",
            mt: 0,
            mb: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            minHeight: "100px",
            overflow: "visible",
            // Solid blue background without gradient
            background: "#0585E0",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.6) 80%, transparent 100%)",
              borderRadius: "20px 20px 0 0",
            },
          }}
        >
          {/* Content Section (75%) */}
          <Box
            sx={{
              width: "85%",
              p: { xs: 3, md: 3 },
              position: "relative",
              zIndex: 2,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: "#FFFFFF",
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: "1.75rem", sm: "1.7rem" },
              }}
            >
              Dashboard
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255, 255, 255, 0.95)",
                fontWeight: 400,
                fontSize: { xs: "0.9rem", sm: "0.9rem" },
                lineHeight: 1.6,
                maxWidth: "600px",
              }}
            >
              Unify your entire coding journey with one powerful dashboard —
              seamlessly monitor your progress across all competitive
              programming platforms!"
            </Typography>
          </Box>

          {/* Image Section */}
          <Box
            sx={{
              width: "18%",
              position: "absolute",
              right: "5%",
              bottom: 0,
              zIndex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              overflow: "visible",
              height: "80%",
            }}
          >
            <Box
              component="img"
              src="/carousel1.png"
              alt="Programming Cohorts"
              sx={{
                width: "100%",
                height: "auto",
                maxWidth: "none",
                objectFit: "contain",
                objectPosition: "bottom",
                filter: darkMode
                  ? "drop-shadow(-20px 20px 40px rgba(50, 50, 50, 0.9))"
                  : "drop-shadow(-10px 10px 30px rgba(5, 133, 224, 0.2))",
                animation:
                  "floatAnimation 8s ease-in-out infinite, fadeIn 1s ease-out",
                "@keyframes floatAnimation": {
                  "0%": {
                    transform: "translate(0px, 0px) rotate(0deg)",
                  },
                  "25%": {
                    transform: "translate(8px, -8px) rotate(1deg)",
                  },
                  "50%": {
                    transform: "translate(0px, -12px) rotate(2deg)",
                  },
                  "75%": {
                    transform: "translate(-8px, -8px) rotate(1deg)",
                  },
                  "100%": {
                    transform: "translate(0px, 0px) rotate(0deg)",
                  },
                },
                "@keyframes fadeIn": {
                  "0%": {
                    opacity: 0,
                    transform: "scale(0.95) translateY(20px)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "scale(1) translateY(0)",
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Dashboard sub page navigation */}
        <Box
          sx={{
            width: "100%",
            maxWidth: "1200px",
            mx: "auto",
            borderBottom: 1,
            borderColor: darkMode
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.12)",
          }}
        >
          <Tabs
            value={activeView}
            onChange={handleViewChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Dashboard sub pages"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: darkMode
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(0,0,0,0.6)",
              },
              "& .Mui-selected": { color: "#0585E0 !important" },
              "& .MuiTabs-indicator": { backgroundColor: "#0585E0" },
            }}
          >
            {DASHBOARD_VIEWS.map((view) => (
              <Tab key={view.key} value={view.key} label={view.label} />
            ))}
          </Tabs>
        </Box>

        {/* Sub page 1: Daily Activity Heatmap (lazy loaded when scrolled into view) */}
        {activeView === "overview" && (
          <div ref={heatmapRef}>
            <DashboardHeatmap
              analyticsData={heatmapData}
              loading={heatmapLoading}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Sub page 3: platform progress (history charts, GitHub timeline) */}
        {activeView === "progress" && (
          <PlatformProgress
            darkMode={darkMode}
            onManagePlatforms={() => handleViewChange(null, "platforms")}
          />
        )}

        {/* Sub page 2: Platform cards */}
        {activeView === "platforms" && (
        <Grid
          container
          spacing={3}
          sx={{
            width: "100%",
            maxWidth: "1200px",
            mx: "auto",
            justifyContent: "center",
            mt: 0, // Remove margin since Container has gap
            mb: 0, // Remove margin since Container has gap
            pl: { xs: 0 },
            pr: { xs: 0 },
          }}
        >
          {platforms
            .filter((platform) => platform.key !== "scopecodestats") // Hide Scope-CodeStats card
            .map((platform) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={platform.key}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Card
                  sx={{
                    ...getLiquidGlassStyle(darkMode),
                    width: "100%",
                    maxWidth: { xs: "100%", sm: "100%" },
                    borderTop: `1px solid ${platform.color}`,
                    transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: `0 20px 40px rgba(0,0,0,0.25), 0 0 0 2px ${platform.color}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
                      "&::before": {
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.9) 70%, transparent 100%)",
                      },
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 0,
                      pb: "0 !important",
                      display: "flex",
                      flexDirection: "column",
                      background: "transparent",
                    }}
                  >
                    {/* Platform Header */}
                    <Box
                      sx={{
                        ...getInnerGlassStyle(darkMode),
                        display: "flex",
                        alignItems: "center",
                        px: 3,
                        py: 2.5,
                        borderBottom: darkMode
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.08)",
                        borderRadius: "20px 20px 0 0",
                        background: darkMode
                          ? "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.3) 100%)"
                          : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.8) 100%)",
                      }}
                    >
                      <Box
                        component="img"
                        src={platform.logo}
                        alt={platform.name}
                        sx={{
                          height: 30,
                          width: 30,
                          mr: 2,
                          objectFit: "contain",
                        }}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: platform.color,
                          fontSize: "1.2rem",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {platform.name}
                      </Typography>
                    </Box>

                    {/* Card Body Content */}
                    <Box
                      sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        flexGrow: 1,
                        overflow: "visible",
                      }}
                    >
                      {/* Username Input Field */}
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            mb: 1,
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            color: darkMode
                              ? "rgba(255,255,255,0.7)"
                              : "rgba(0,0,0,0.7)",
                          }}
                        >
                          Username
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            bgcolor: darkMode
                              ? "rgba(0,0,0,0.3)"
                              : "rgba(255,255,255,0.6)",
                            borderRadius: 3,
                            border: `1px solid ${
                              darkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.15)"
                            }`,
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:focus-within": {
                              border: `1px solid ${platform.color}`,
                              boxShadow: `0 0 0 3px ${platform.color}25`,
                              bgcolor: darkMode
                                ? "rgba(0,0,0,0.4)"
                                : "rgba(255,255,255,0.9)",
                            },
                          }}
                        >
                          <input
                            value={
                              platform.key === "github"
                                ? profiles[platform.key] || ""
                                : typeof profiles[platform.key] === "object"
                                  ? ""
                                  : profiles[platform.key] || ""
                            }
                            onChange={(e) => {
                              // Only update the input field, don't persist to backend until submission
                              setProfiles((prev) => ({
                                ...prev,
                                [platform.key]: e.target.value,
                              }));
                            }}
                            placeholder={`Enter ${platform.name} username`}
                            disabled={
                              platform.key !== "github" &&
                              (updatingPlatforms[platform.key] ||
                                Boolean(cooldowns[platform.key]))
                            }
                            style={{
                              width: "100%",
                              height: "46px",
                              padding: "0 15px",
                              paddingRight: "50px",
                              background: "transparent",
                              color: darkMode ? "white" : "#000000",
                              border: "none",
                              outline: "none",
                              fontSize: "15px",
                              fontWeight: "500",
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSubmit(platform.key);
                              }
                            }}
                          />

                          {/* Add reset button if text field value differs from stored valid username */}
                          {profiles[platform.key] !==
                            platformData[platform.key]?.username &&
                            platformData[platform.key]?.username && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "absolute",
                                  right: "48px",
                                  height: "100%",
                                  width: "48px",
                                  color: darkMode
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.5)",
                                  transition: "0.2s",
                                  cursor: "pointer",
                                  "&:hover": {
                                    color: platform.color,
                                    bgcolor: darkMode
                                      ? "rgba(255,255,255,0.05)"
                                      : "rgba(0,0,0,0.05)",
                                  },
                                }}
                                onClick={() => {
                                  // Reset to the last valid username
                                  setProfiles((prev) => ({
                                    ...prev,
                                    [platform.key]:
                                      platformData[platform.key]?.username ||
                                      "",
                                  }));
                                  toast.info(
                                    `Reset to last valid ${platform.name} username`,
                                  );
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                  <path d="M3 3v5h5" />
                                </svg>
                              </Box>
                            )}

                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "absolute",
                              right: 0,
                              height: "100%",
                              width: "48px",
                              bgcolor:
                                cooldowns[platform.key] &&
                                platform.key !== "github"
                                  ? `${platform.color}40`
                                  : platform.color,
                              color: "#fff",
                              opacity:
                                cooldowns[platform.key] &&
                                platform.key !== "github"
                                  ? 0.5
                                  : 0.9,
                              transition: "0.2s",
                              cursor:
                                cooldowns[platform.key] &&
                                platform.key !== "github"
                                  ? "not-allowed"
                                  : "pointer",
                              "&:hover": {
                                opacity:
                                  cooldowns[platform.key] &&
                                  platform.key !== "github"
                                    ? 0.5
                                    : 1,
                              },
                            }}
                            onClick={
                              cooldowns[platform.key] &&
                              platform.key !== "github"
                                ? null
                                : () => handleSubmit(platform.key)
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Box>
                        </Box>
                      </Box>

                      {/* Current Username Display - Always show */}
                      <Box
                        sx={{
                          ...getInnerGlassStyle(darkMode),
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 3,
                          p: 2,
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: "50%",
                            bgcolor: profiles[platform.key]
                              ? platform.color
                              : darkMode
                                ? "rgba(255,80,80,0.8)"
                                : "rgba(255,60,60,0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            color: "#fff",
                            boxShadow: profiles[platform.key]
                              ? `0 2px 8px ${platform.color}40`
                              : "none",
                          }}
                        >
                          {profiles[platform.key] ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: profiles[platform.key]
                                ? platform.color
                                : darkMode
                                  ? "rgba(255,255,255,0.5)"
                                  : "rgba(0,0,0,0.4)",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Current Username
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.9rem",
                              color: profiles[platform.key]
                                ? darkMode
                                  ? "rgba(255,255,255,0.9)"
                                  : "rgba(0,0,0,0.85)"
                                : darkMode
                                  ? "rgba(255,255,255,0.5)"
                                  : "rgba(0,0,0,0.4)",
                              fontWeight: profiles[platform.key] ? 600 : 400,
                              fontStyle: profiles[platform.key]
                                ? "normal"
                                : "italic",
                            }}
                          >
                            {profiles[platform.key]
                              ? profiles[platform.key]
                              : "Not provided"}
                          </Typography>
                        </Box>

                        {/* Unlink the saved username (asks first: it deletes the history) */}
                        {platform.key !== "scopecodestats" &&
                          platformData[platform.key]?.username && (
                            <Button
                              size="small"
                              color="error"
                              sx={{ ml: "auto", textTransform: "none", fontWeight: 600 }}
                              onClick={() =>
                                setUsernameConfirm({
                                  action: "remove",
                                  platform: platform.key,
                                  platformName: platform.name,
                                  username: platformData[platform.key].username,
                                  hasHistory: PLATFORMS_WITH_HISTORY.includes(platform.key),
                                })
                              }
                            >
                              Remove
                            </Button>
                          )}
                      </Box>

                      {/* Action Buttons */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          mt: "auto",
                          flexDirection: "column",
                        }}
                      >
                        <Button
                          variant="contained"
                          onClick={() => handleSubmit(platform.key)}
                          disabled={
                            platform.key !== "github" &&
                            (updatingPlatforms[platform.key] ||
                              Boolean(cooldowns[platform.key]))
                          }
                          sx={{
                            ...getButtonGlassStyle(darkMode, true),
                            py: 1.6,
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            width: "100%",
                            position: "relative",
                            overflow: "hidden",
                            // Override with platform specific colors
                            background:
                              platform.key !== "github" &&
                              cooldowns[platform.key]
                                ? `linear-gradient(135deg, ${platform.color}70 0%, rgba(0,0,0,0.4) 100%)`
                                : `linear-gradient(135deg, ${platform.color} 0%, rgba(0,0,0,0.3) 100%)`,
                            borderColor: platform.color,
                            "&:hover": {
                              transform:
                                platform.key !== "github" &&
                                cooldowns[platform.key]
                                  ? "none"
                                  : "translateY(-4px) scale(1.02)",
                              cursor:
                                platform.key !== "github" &&
                                cooldowns[platform.key]
                                  ? "not-allowed"
                                  : "pointer",
                              boxShadow:
                                platform.key !== "github" &&
                                cooldowns[platform.key]
                                  ? "none"
                                  : `0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px ${platform.color}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
                            },
                          }}
                        >
                          {updatingPlatforms[platform.key] ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : platform.key !== "github" &&
                            cooldowns[platform.key] ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <CircularProgress
                                variant="determinate"
                                value={
                                  (remainingTimes[platform.key] /
                                    (6 * 60 * 60)) *
                                  100
                                }
                                size={20}
                                sx={{
                                  color: "rgba(255,255,255,0.9)",
                                  position: "absolute",
                                  left: "15px",
                                }}
                              />
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                  letterSpacing: "0.01em",
                                }}
                              >
                                {remainingTimes[platform.key] > 3600
                                  ? `${Math.floor(
                                      remainingTimes[platform.key] / 3600,
                                    )}h ${Math.floor(
                                      (remainingTimes[platform.key] % 3600) /
                                        60,
                                    )}m`
                                  : remainingTimes[platform.key] > 60
                                    ? `${Math.floor(
                                        remainingTimes[platform.key] / 60,
                                      )}m`
                                    : `${remainingTimes[platform.key]}s`}
                              </Typography>
                            </Box>
                          ) : platform.key === "github" ? (
                            "Update GitHub"
                          ) : (
                            "Update Profile"
                          )}
                        </Button>

                        <Button
                          variant="outlined"
                          onClick={() => {
                            setExpandedProfiles((prev) => ({
                              ...prev,
                              [platform.key]: !prev[platform.key],
                            }));
                          }}
                          sx={{
                            ...getButtonGlassStyle(darkMode, false),
                            py: 1.4,
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            borderWidth: "1px",
                            // Custom colors for this button
                            borderColor: expandedProfiles[platform.key]
                              ? darkMode
                                ? "rgba(255,255,255,0.3)"
                                : "rgba(0,0,0,0.2)"
                              : `${platform.color}60`,
                            color: expandedProfiles[platform.key]
                              ? darkMode
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(0,0,0,0.7)"
                              : platform.color,
                            "&:hover": {
                              ...getButtonGlassStyle(darkMode, false)[
                                "&:hover"
                              ],
                              borderColor: platform.color,
                              color: darkMode ? "#ffffff" : platform.color,
                              bgcolor: darkMode
                                ? "rgba(255,255,255,0.05)"
                                : `${platform.color}10`,
                            },
                          }}
                        >
                          {expandedProfiles[platform.key]
                            ? "Hide Stats"
                            : "Show Stats"}
                        </Button>
                      </Box>
                    </Box>

                    {/* Profile Stats (Collapsed) */}
                    <Collapse
                      in={expandedProfiles[platform.key]}
                      timeout="auto"
                    >
                      <Box
                        sx={{
                          p: 3,
                          pt: 0,
                          pb: 3,
                          overflow: "visible",
                        }}
                      >
                        {profileDetails[platform.key] ? (
                          <Box
                            sx={{
                              ...getInnerGlassStyle(darkMode),
                              borderRadius: 2,
                            }}
                          >
                            {/* Stats header */}
                            <Box
                              sx={{
                                background: darkMode
                                  ? `linear-gradient(135deg, ${platform.color}40 0%, rgba(0,0,0,0.6) 100%)`
                                  : `linear-gradient(135deg, ${platform.color}15 0%, rgba(255,255,255,0.8) 100%)`,
                                px: 2.5,
                                py: 1.5,
                                borderBottom: darkMode
                                  ? "1px solid rgba(255,255,255,0.1)"
                                  : "1px solid rgba(0,0,0,0.08)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                sx={{
                                  color: platform.color,
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.03em",
                                }}
                              >
                                {platform.name} Stats
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: darkMode
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.5)",
                                  fontSize: "0.7rem",
                                }}
                              >
                                {profileDetails[platform.key].lastUpdated
                                  ? `Last updated: ${new Date(
                                      profileDetails[platform.key].lastUpdated,
                                    ).toLocaleDateString()}`
                                  : "Not synced yet"}
                              </Typography>
                            </Box>

                            {/* Stats body */}
                            <Box sx={{ p: 0 }}>
                              {(() => {
                                const details = renderPlatformDetails(
                                  platform.key,
                                  profileDetails[platform.key],
                                  
                                ).filter(
                                  (detail) => detail.label !== "Last Updated",
                                );
                                return details.map((detail, index) => (
                                  <Box
                                    key={index}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      px: 2.5,
                                      py: 1.8,
                                      borderBottom:
                                        index !== details.length - 1
                                          ? `1px solid ${
                                              darkMode
                                                ? "rgba(255,255,255,0.03)"
                                                : "rgba(0,0,0,0.03)"
                                            }`
                                          : "none",
                                      transition: "all 0.2s ease",
                                      "&:hover": {
                                        bgcolor: darkMode
                                          ? "rgba(255,255,255,0.03)"
                                          : "rgba(0,0,0,0.015)",
                                      },
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: "50%",
                                          bgcolor: platform.color,
                                          mr: 1.5,
                                          opacity: 0.7,
                                        }}
                                      />
                                      <Typography
                                        sx={{
                                          color: darkMode
                                            ? "rgba(255,255,255,0.7)"
                                            : "rgba(0,0,0,0.7)",
                                          fontSize: "0.8rem",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {detail.label}
                                      </Typography>
                                    </Box>

                                    <Typography
                                      sx={{
                                        fontFamily: "nekst, monospace",
                                        color: platform.color,
                                        fontWeight:
                                          detail.label === "Score" ||
                                          detail.label === "Problems Solved" ||
                                          detail.label.includes("Rating")
                                            ? 700
                                            : 600,
                                        fontSize:
                                          detail.label === "Score" ||
                                          detail.label === "Problems Solved" ||
                                          detail.label.includes("Rating")
                                            ? "1.15rem"
                                            : "0.95rem",
                                        lineHeight: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        pl: 1,
                                      }}
                                    >
                                      {detail.value}
                                    </Typography>
                                  </Box>
                                ));
                              })()}
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 2,
                              bgcolor: darkMode
                                ? "rgba(0,0,0,0.3)"
                                : "rgba(255,255,255,0.8)",
                              border: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.05)"
                                  : "rgba(0,0,0,0.05)"
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "column",
                            }}
                          >
                            {profiles[platform.key] ? (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="30"
                                  height="30"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={platform.color + "90"}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line
                                    x1="12"
                                    y1="16"
                                    x2="12.01"
                                    y2="16"
                                  ></line>
                                </svg>
                                <Typography
                                  sx={{
                                    color: platform.color,
                                    textAlign: "center",
                                    fontWeight: 500,
                                    fontSize: "0.85rem",
                                    mt: 2,
                                  }}
                                >
                                  Profile found but not synced yet
                                </Typography>
                                <Typography
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                    textAlign: "center",
                                    fontWeight: 400,
                                    fontSize: "0.75rem",
                                    mt: 1,
                                  }}
                                >
                                  Click "Update Profile" to sync your stats
                                </Typography>
                              </>
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="30"
                                  height="30"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={platform.color + "90"}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                                  <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                                </svg>
                                <Typography
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255,255,255,0.7)"
                                      : "rgba(0,0,0,0.7)",
                                    textAlign: "center",
                                    fontWeight: 500,
                                    fontSize: "0.85rem",
                                    mt: 2,
                                  }}
                                >
                                  No stats available yet
                                </Typography>
                              </>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
        )}

        <UsernameConfirmDialog
          request={usernameConfirm}
          darkMode={darkMode}
          busy={confirmBusy}
          onCancel={() => setUsernameConfirm(null)}
          onConfirm={handleConfirmUsernameAction}
        />
      </Container>
    </Box>
  );
};

export default Dashboard;
