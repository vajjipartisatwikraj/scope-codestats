import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "./Dashboard.css";
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
} from "@mui/material";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/apiConfig";

// Import shared utilities and constants
import {
  platforms,
  getLiquidGlassStyle,
  getInnerGlassStyle,
  getButtonGlassStyle,
} from "./Dashboard/dashboardUtils";

// Import modular dashboard components
import DashboardPerformance from "./Dashboard/DashboardPerformance";
import DashboardHeatmap from "./Dashboard/DashboardHeatmap";
import DashboardRankTrend from "./Dashboard/DashboardRankTrend";
import DashboardPlatformAnalytics from "./Dashboard/DashboardPlatformAnalytics";
import DashboardPlatformPerformance from "./Dashboard/DashboardPlatformPerformance";

// Function to render platform-specific details (Dashboard-specific, not in dashboardUtils)
const renderPlatformDetails = (platform, details, latestStats = null) => {
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

  // Common details for all platforms - prioritize latest stats if available
  const currentScore = latestStats?.score || details.score || "0";
  const currentProblems =
    latestStats?.totalSolved || details.problemsSolved || "0";
  const scopeScore = latestStats?.scopeScore || "0";

  const commonDetails = [
    { label: "Score", value: currentScore },
    { label: "Problems Solved", value: currentProblems },
    { label: "SCOPE Score", value: scopeScore, highlight: true },
    { label: "Last Updated", value: formatDate(details.lastUpdated) },
  ];

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

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});
  const [profileDetails, setProfileDetails] = useState({});
  const [expandedProfiles, setExpandedProfiles] = useState({});
  const [platformData, setPlatformData] = useState({});
  const [updatingPlatforms, setUpdatingPlatforms] = useState({});
  const [cooldowns, setCooldowns] = useState({});
  const [remainingTimes, setRemainingTimes] = useState({});
  const [rankHistory, setRankHistory] = useState(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankTimeFilter, setRankTimeFilter] = useState("weekly"); // New state for rank trend filter
  const [platformPerformance, setPlatformPerformance] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformTimeFilter, setPlatformTimeFilter] = useState("daily"); // New state for platform performance filter
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Lazy loading flags for dashboard sections
  const [loadedSections, setLoadedSections] = useState({
    dashboardStats: false,
    rankHistory: false,
    platformPerformance: false,
    analytics: false,
  });

  // Refs for Intersection Observer (lazy loading)
  const rankTrendRef = useRef(null);
  const analyticsRef = useRef(null);
  const platformPerformanceRef = useRef(null);
  const heatmapRef = useRef(null);

  // Memoized fetch functions to prevent unnecessary re-renders
  const loadRankHistory = useCallback(() => {
    if (
      !loadedSections.rankHistory &&
      auth?.token &&
      (auth?.user?._id || auth?.user?.id)
    ) {
      fetchRankHistory(rankTimeFilter);
      setLoadedSections((prev) => ({ ...prev, rankHistory: true }));
    }
  }, [
    loadedSections.rankHistory,
    auth?.token,
    auth?.user?._id,
    auth?.user?.id,
  ]); // Stable dependencies

  const loadAnalytics = useCallback(() => {
    if (
      !loadedSections.analytics &&
      auth?.token &&
      (auth?.user?._id || auth?.user?.id)
    ) {
      fetchAnalyticsData();
      setLoadedSections((prev) => ({ ...prev, analytics: true }));
    }
  }, [loadedSections.analytics, auth?.token, auth?.user?._id, auth?.user?.id]);

  const loadPlatformPerformance = useCallback(() => {
    if (
      !loadedSections.platformPerformance &&
      auth?.token &&
      (auth?.user?._id || auth?.user?.id)
    ) {
      fetchPlatformPerformance();
      setLoadedSections((prev) => ({ ...prev, platformPerformance: true }));
    }
  }, [
    loadedSections.platformPerformance,
    auth?.token,
    auth?.user?._id,
    auth?.user?.id,
  ]);

  // Ref to store the Intersection Observer instance for proper cleanup
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading - only set up after initial loading completes
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      const options = {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target;

            if (target === rankTrendRef.current) {
              loadRankHistory();
            } else if (
              target === analyticsRef.current ||
              target === heatmapRef.current
            ) {
              loadAnalytics();
            } else if (target === platformPerformanceRef.current) {
              loadPlatformPerformance();
            }
          }
        });
      }, options);

      if (rankTrendRef.current) observer.observe(rankTrendRef.current);
      if (analyticsRef.current) observer.observe(analyticsRef.current);
      if (platformPerformanceRef.current)
        observer.observe(platformPerformanceRef.current);
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
  }, [loading, loadRankHistory, loadAnalytics, loadPlatformPerformance]);

  useEffect(() => {
    if (!auth?.token) {
      navigate("/login");
      return;
    }
    fetchUserData();
  }, [auth?.token]);

  // LAZY LOADING: Load dashboard sections on-demand (removed automatic loading)
  // Dashboard stats will be loaded when component mounts (kept for initial display)
  useEffect(() => {
    if (
      auth?.token &&
      (auth?.user?._id || auth?.user?.id) &&
      !loadedSections.dashboardStats
    ) {
      fetchDashboardStats();
      setLoadedSections((prev) => ({ ...prev, dashboardStats: true }));
    }
  }, [auth?.token, auth?.user?._id, auth?.user?.id]);

  // Removed automatic loading of analytics, rank history, and platform performance
  // These will be loaded when sections become visible via Intersection Observer

  // Re-fetch rank history when filter changes (only if already loaded)
  useEffect(() => {
    if (
      auth?.token &&
      (auth?.user?._id || auth?.user?.id) &&
      loadedSections.rankHistory
    ) {
      fetchRankHistory(rankTimeFilter);
    }
  }, [rankTimeFilter]);

  // Re-fetch platform performance when filter changes (only if already loaded)
  useEffect(() => {
    if (
      auth?.token &&
      (auth?.user?._id || auth?.user?.id) &&
      loadedSections.platformPerformance
    ) {
      fetchPlatformPerformance(platformTimeFilter);
    }
  }, [platformTimeFilter]);

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

  const fetchDashboardStats = async () => {
    if (!auth?.token) return;

    // Get user ID from auth.user._id or auth.user.id
    const userId = auth?.user?._id || auth?.user?.id;
    if (!userId) return;

    try {
      setDashboardLoading(true);

      // Fetch performance overview from new dashboard endpoint
      const response = await axios.get(
        `${apiUrl}/dashboard/performance-overview/${userId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      // Use the performance overview data directly from the model
      setDashboardStats({
        currentScore: response.data.currentScore || 0,
        currentRank: response.data.currentRank, // Don't fallback to 0 - preserve null/undefined for proper N/A display
        currentProblems: response.data.currentProblems || 0,
        totalActiveDays: response.data.totalActiveDays || 0,
        scoreChangeLastMonth: response.data.scoreChangeLastMonth || 0,
        rankChangeLastMonth: response.data.rankChangeLastMonth || 0,
        problemsChangeLastMonth: response.data.problemsChangeLastMonth || 0,
        lastUpdated: response.data.lastUpdated,
        pastDate: response.data.pastDate,
        presentDate: response.data.presentDate,
      });
    } catch (error) {
      setDashboardStats(null);
      setDashboardStats({
        currentScore: 0,
        currentRank: 0,
        currentProblems: 0,
        totalActiveDays: 0,
        scoreChangeLastMonth: 0,
        rankChangeLastMonth: 0,
        problemsChangeLastMonth: 0,
        lastUpdated: null,
        pastDate: null,
        presentDate: null,
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!auth?.token) {
      return;
    }

    // Get user ID from auth.user._id or auth.user.id
    const userId = auth?.user?._id || auth?.user?.id;
    if (!userId) {
      return;
    }

    try {
      setAnalyticsLoading(true);

      // Fetch heatmap data from new dashboard endpoint
      const heatmapResponse = await axios.get(
        `${apiUrl}/dashboard/heatmap/${userId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      // Fetch platform analytics from new dashboard endpoint
      const platformResponse = await axios.get(
        `${apiUrl}/dashboard/platform-analytics/${userId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      // Transform heatmap data for frontend consumption
      const heatmapData = heatmapResponse.data;
      const platformData = platformResponse.data;

      // Convert cells to daily activity array for heatmap
      const dailyActivity = [];
      if (heatmapData.cells) {
        Object.entries(heatmapData.cells).forEach(([cellKey, cell]) => {
          dailyActivity.push({
            date: new Date(cell.date).toISOString().split("T")[0],
            intensity:
              cell.score > 0 ? Math.min(95, Math.max(10, cell.score)) : 0,
            scoreChange: cell.score || 0,
            rank: "N/A",
            problems: 0, // Not tracked in new structure
            wasActive: cell.score > 0,
          });
        });
      }

      // Calculate platform problems distribution from platform analytics
      const platformProblems = {
        leetcode: platformData.leetcode?.problemsSolved || 0,
        codechef: platformData.codechef?.problemsSolved || 0,
        codeforces: platformData.codeforces?.problemsSolved || 0,
        hackerrank: platformData.hackerrank?.problemsSolved || 0,
        github: platformData.github?.commits || 0,
        scopecodestats: platformData.scopecodestats?.problemsSolved || 0, // ScopeCODESTATS platform data
      };

      // Calculate score distribution from platform analytics - use actual scores, not percentages
      let scoreDistribution = {
        leetcode: platformData.leetcode?.score || 0,
        codechef: platformData.codechef?.score || 0,
        codeforces: platformData.codeforces?.score || 0,
        hackerrank: platformData.hackerrank?.score || 0,
        github: platformData.github?.score || 0,
        scopecodestats: platformData.scopecodestats?.score || 0, // ScopeCODESTATS platform data
      };

      // Keep actual scores for display, calculate percentages only for the pie chart
      const totalScore = Object.values(scoreDistribution).reduce(
        (sum, score) => sum + score,
        0,
      );
      const scorePercentages = {};
      if (totalScore > 0) {
        Object.keys(scoreDistribution).forEach((platform) => {
          scorePercentages[platform] = Math.round(
            (scoreDistribution[platform] / totalScore) * 100,
          );
        });
      } else {
        // If no scores, set all to 0
        Object.keys(scoreDistribution).forEach((platform) => {
          scorePercentages[platform] = 0;
        });
      }

      // Create platform trends using real weekly rating data from PlatformAnalytics
      const platformTrends = {
        leetcode: {
          ratingData: [
            {
              week: "Week 1",
              rating: platformData.leetcode?.weeklyRatings?.week1 || 0,
            },
            {
              week: "Week 2",
              rating: platformData.leetcode?.weeklyRatings?.week2 || 0,
            },
            {
              week: "Week 3",
              rating: platformData.leetcode?.weeklyRatings?.week3 || 0,
            },
            {
              week: "Week 4",
              rating: platformData.leetcode?.weeklyRatings?.week4 || 0,
            },
          ],
          currentRating: platformData.leetcode?.rating || 0,
          ratingChange:
            (platformData.leetcode?.weeklyRatings?.week4 || 0) -
            (platformData.leetcode?.weeklyRatings?.week1 || 0),
          currentScore: platformData.leetcode?.score || 0,
          currentProblems: platformData.leetcode?.problemsSolved || 0,
        },
        codechef: {
          ratingData: [
            {
              week: "Week 1",
              rating: platformData.codechef?.weeklyRatings?.week1 || 0,
            },
            {
              week: "Week 2",
              rating: platformData.codechef?.weeklyRatings?.week2 || 0,
            },
            {
              week: "Week 3",
              rating: platformData.codechef?.weeklyRatings?.week3 || 0,
            },
            {
              week: "Week 4",
              rating: platformData.codechef?.weeklyRatings?.week4 || 0,
            },
          ],
          currentRating: platformData.codechef?.rating || 0,
          ratingChange:
            (platformData.codechef?.weeklyRatings?.week4 || 0) -
            (platformData.codechef?.weeklyRatings?.week1 || 0),
          currentScore: platformData.codechef?.score || 0,
          currentProblems: platformData.codechef?.problemsSolved || 0,
        },
        codeforces: {
          ratingData: [
            {
              week: "Week 1",
              rating: platformData.codeforces?.weeklyRatings?.week1 || 0,
            },
            {
              week: "Week 2",
              rating: platformData.codeforces?.weeklyRatings?.week2 || 0,
            },
            {
              week: "Week 3",
              rating: platformData.codeforces?.weeklyRatings?.week3 || 0,
            },
            {
              week: "Week 4",
              rating: platformData.codeforces?.weeklyRatings?.week4 || 0,
            },
          ],
          currentRating: platformData.codeforces?.rating || 0,
          ratingChange:
            (platformData.codeforces?.weeklyRatings?.week4 || 0) -
            (platformData.codeforces?.weeklyRatings?.week1 || 0),
          currentScore: platformData.codeforces?.score || 0,
          currentProblems: platformData.codeforces?.problemsSolved || 0,
        },
        hackerrank: {
          currentScore: platformData.hackerrank?.score || 0,
          currentProblems: platformData.hackerrank?.problemsSolved || 0,
        },
        github: {
          currentScore: platformData.github?.score || 0,
          commits: platformData.github?.commits || 0,
        },
      };

      const combinedData = {
        userStats: {
          totalScore: platformData.totalScore || 0,
          totalProblems: platformData.totalProblems || 0,
        },
        globalStats: {},
        userPosition: {},
        dailyActivity: dailyActivity,
        scoreDistribution: scoreDistribution, // Keep actual scores
        scorePercentages: scorePercentages, // Add percentages for pie chart
        problemsSolvedByPlatform: platformProblems,
        platformTrends: platformTrends,
        summary: {
          totalDays: Object.keys(heatmapData.cells || {}).length,
          activeDays: heatmapData.activeDays || 0,
          totalScore: platformData.totalScore || 0,
          totalProblems: platformData.totalProblems || 0,
        },
      };

      setAnalyticsData(combinedData);
    } catch (error) {
      setAnalyticsData({
        empty: true,
        message: "Failed to fetch analytics data",
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchPlatformPerformance = async (filterType = platformTimeFilter) => {
    if (!auth?.token) return;

    const userId = auth?.user?._id || auth?.user?.id;
    if (!userId) return;

    try {
      setPlatformLoading(true);

      // Select the appropriate endpoint based on filter
      let endpoint;
      switch (filterType) {
        case "daily":
          endpoint = `${apiUrl}/dashboard/daily-platform-performance/${userId}`;
          break;
        case "monthly":
          endpoint = `${apiUrl}/dashboard/monthly-platform-performance/${userId}`;
          break;
        case "yearly":
          endpoint = `${apiUrl}/dashboard/yearly-platform-performance/${userId}`;
          break;
        default:
          endpoint = `${apiUrl}/dashboard/daily-platform-performance/${userId}`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      // Transform the platform performance data based on filter type
      let performanceData = [];
      const rawData = response.data;

      if (filterType === "daily") {
        // Show last 7 days EXCLUDING today (from 7 days ago to yesterday)
        // Example: If today is Friday, show Fri, Sat, Sun, Mon, Tue, Wed, Thu (last week)
        const days = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const today = new Date();
        const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Create array starting from 7 days ago to yesterday (excluding today)
        for (let i = 7; i >= 1; i--) {
          const dayIndex = (currentDayIndex - i + 7) % 7; // Handle negative indices
          const dayName = days[dayIndex];
          performanceData.push({
            period:
              dayName.charAt(0).toUpperCase() +
              dayName.slice(1).substring(0, 3),
            label:
              dayName.charAt(0).toUpperCase() +
              dayName.slice(1).substring(0, 3),
            leetcode: rawData[dayName]?.leetcode || 0,
            codeforces: rawData[dayName]?.codeforces || 0,
            codechef: rawData[dayName]?.codechef || 0,
            presentDate: rawData[dayName]?.presentDate || null,
            pastDate: rawData[dayName]?.pastDate || null,
            day: dayIndex + 1,
          });
        }
      } else if (filterType === "monthly") {
        // Show last 4 weeks in chronological order
        const weeks = ["week1", "week2", "week3", "week4"];
        weeks.forEach((week, index) => {
          performanceData.push({
            period: `Week ${index + 1}`,
            label: `Week ${index + 1}`,
            leetcode: rawData[week]?.leetcode || 0,
            codeforces: rawData[week]?.codeforces || 0,
            codechef: rawData[week]?.codechef || 0,
            presentDate: rawData[week]?.presentDate || null,
            pastDate: rawData[week]?.pastDate || null,
            week: index + 1,
          });
        });
      } else if (filterType === "yearly") {
        // Show last 12 months in chronological order (Oct last year to Sept this year)
        const months = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];
        const currentMonth = new Date().getMonth(); // 0 = January, 8 = September

        // Create array starting from 12 months ago to current month
        for (let i = 11; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          const monthName = months[monthIndex];
          performanceData.push({
            period:
              monthName.charAt(0).toUpperCase() +
              monthName.slice(1).substring(0, 3),
            label:
              monthName.charAt(0).toUpperCase() +
              monthName.slice(1).substring(0, 3),
            leetcode: rawData[monthName]?.leetcode || 0,
            codeforces: rawData[monthName]?.codeforces || 0,
            codechef: rawData[monthName]?.codechef || 0,
            presentDate: rawData[monthName]?.presentDate || null,
            pastDate: rawData[monthName]?.pastDate || null,
            month: monthIndex + 1,
          });
        }
      }

      setPlatformPerformance(performanceData);
    } catch (error) {
      setPlatformPerformance([]);
    } finally {
      setPlatformLoading(false);
    }
  };

  const fetchRankHistory = async (filterType = rankTimeFilter) => {
    if (!auth?.token) return;

    // Get user ID from auth.user._id or auth.user.id
    const userId = auth?.user?._id || auth?.user?.id;
    if (!userId) return;

    try {
      setRankLoading(true);

      // Select the appropriate endpoint based on filter
      let endpoint;
      switch (filterType) {
        case "weekly":
          endpoint = `${apiUrl}/dashboard/weekly-rank-trend/${userId}`;
          break;
        case "monthly":
          endpoint = `${apiUrl}/dashboard/monthly-rank-trend/${userId}`;
          break;
        case "yearly":
          endpoint = `${apiUrl}/dashboard/yearly-rank-trend/${userId}`;
          break;
        default:
          endpoint = `${apiUrl}/dashboard/weekly-rank-trend/${userId}`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      // Transform the rank data based on filter type
      let rankData = [];
      const rawData = response.data;

      if (filterType === "weekly") {
        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const dayAbbreviations = [
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
        ];

        // Create chronological order for last 7 days ending with today
        const today = new Date();
        const chronologicalDays = [];

        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() - i);
          const dayIndex = targetDate.getDay();
          const dayName = dayNames[dayIndex];

          chronologicalDays.push({
            name: dayName,
            abbreviation: dayAbbreviations[dayIndex],
            date: new Date(targetDate),
          });
        }

        rankData = chronologicalDays.map((dayInfo, index) => ({
          period: dayInfo.abbreviation,
          rank: rawData[dayInfo.name] || null,
          day: index + 1,
          isToday: dayInfo.date.toDateString() === today.toDateString(),
        }));
      } else if (filterType === "monthly") {
        const weeks = ["week1", "week2", "week3", "week4", "week5"];
        rankData = weeks.map((week, index) => ({
          period: `Week ${index + 1}`,
          rank: rawData[week] || null,
          week: index + 1,
        }));
      } else if (filterType === "yearly") {
        // Show last 12 months in chronological order (Oct last year to Sept this year)
        const months = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];
        const currentMonth = new Date().getMonth(); // 0 = January, 8 = September

        // Create array starting from 12 months ago to current month (chronological order)
        rankData = [];
        for (let i = 11; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          const monthName = months[monthIndex];
          rankData.push({
            period:
              monthName.charAt(0).toUpperCase() +
              monthName.slice(1).substring(0, 3), // Oct, Nov, Dec, Jan, etc.
            rank: rawData[monthName] || null,
            month: monthIndex + 1,
          });
        }
      }

      setRankHistory({
        type: filterType,
        data: rankData,
        raw: rawData,
      });
    } catch (error) {
      setRankHistory({ type: filterType, data: [], raw: {} });
    } finally {
      setRankLoading(false);
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
        let lastUpdateAttempt = null;

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

          // Extract details from userData (various formats)
          if (userData.platformData && userData.platformData[key]) {
            details = userData.platformData[key];
          } else if (userData.codingProfiles && userData.codingProfiles[key]) {
            details = userData.codingProfiles[key];
          } else if (userData[`${key}Details`]) {
            details = userData[`${key}Details`];
          }

          // Check if we have lastUpdateAttempt in the data
          if (details && details.lastUpdateAttempt) {
            lastUpdateAttempt = new Date(details.lastUpdateAttempt).getTime();
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

            if (platformStats.lastUpdateAttempt) {
              lastUpdateAttempt = new Date(
                platformStats.lastUpdateAttempt,
              ).getTime();
            }
          }
        }

        // Special handling for GitHub - always allow editing
        if (key === "github") {
          // Don't set cooldown for GitHub
        } else {
          // Check if this platform is in cooldown period (updated in the last 6 hours)
          if (lastUpdateAttempt) {
            const timeSinceLastAttempt = now - lastUpdateAttempt;
            const cooldownPeriod = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

            if (timeSinceLastAttempt < cooldownPeriod) {
              // Calculate remaining cooldown time
              const remainingTimeMs = cooldownPeriod - timeSinceLastAttempt;
              const remainingTimeSec = Math.ceil(remainingTimeMs / 1000);

              // Set cooldown for this platform
              cooldownsObj[key] = now + remainingTimeMs;
              remainingTimesObj[key] = remainingTimeSec;
            }
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

      // Fetch platform stats (not lazy-loaded by Intersection Observer)
      fetchPlatformStats();

      setLoading(false);
    } catch (error) {
      toast.error("Failed to load profile data. Please try again later.");
      setLoading(false);
    }
  };

  const fetchPlatformStats = async () => {
    if (!auth?.token) return;

    try {
      // Fetch current user stats from existing stats API
      const currentStatsResponse = await axios.get(
        `${apiUrl}/stats/me/current`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      if (
        currentStatsResponse.data.success &&
        currentStatsResponse.data.data &&
        !currentStatsResponse.data.data.empty
      ) {
        const stats = currentStatsResponse.data.data;
        const platformStats = stats.platformStats || {};

        // Update platform data with latest stats
        setPlatformData((prevData) => {
          const updatedData = { ...prevData };

          Object.keys(platformStats).forEach((platform) => {
            if (updatedData[platform]) {
              updatedData[platform] = {
                ...updatedData[platform],
                latestStats: platformStats[platform],
              };
            }
          });

          return updatedData;
        });
      }
    } catch (error) {
      // Platform stats fetch failed silently
    }
  };

  // Helper function to calculate rank statistics from real data
  const calculateRankStats = () => {
    if (!rankHistory || !rankHistory.data) {
      return {
        current: "N/A",
        best: "N/A",
        average: "N/A",
        trend: "no-data",
        trendText: "No data available",
      };
    }

    const validRanks = rankHistory.data
      .map((item) => item.rank)
      .filter((rank) => rank !== null && rank !== undefined && rank > 0);

    if (validRanks.length === 0) {
      return {
        current: "N/A",
        best: "N/A",
        average: "N/A",
        trend: "no-data",
        trendText: "No rank data available",
      };
    }

    // Current rank is the most recent non-null value
    const current =
      rankHistory.data
        .slice()
        .reverse()
        .find(
          (item) =>
            item.rank !== null && item.rank !== undefined && item.rank > 0,
        )?.rank || "N/A";

    // Best rank is the lowest number (better position)
    const best = Math.min(...validRanks);

    // Average rank
    const average = Math.round(
      validRanks.reduce((sum, rank) => sum + rank, 0) / validRanks.length,
    );

    // Trend calculation
    let trend = "stable";
    let trendText = "Rank has remained stable";

    if (validRanks.length >= 2) {
      const firstRank = validRanks[0];
      const lastRank = validRanks[validRanks.length - 1];
      const improvement = firstRank - lastRank; // Positive = improvement (lower rank number)

      if (improvement > 5) {
        trend = "improving";
        trendText = `Rank improved by ${improvement} positions`;
      } else if (improvement < -5) {
        trend = "declining";
        trendText = `Rank decreased by ${Math.abs(improvement)} positions`;
      } else {
        trend = "stable";
        trendText = "Rank has remained relatively stable";
      }
    }

    return {
      current: current !== "N/A" ? `#${current}` : "N/A",
      best: `#${best}`,
      average: `#${average}`,
      trend,
      trendText,
    };
  };

  // Memoize rankStats to prevent unnecessary recalculations
  const rankStats = useMemo(() => {
    return calculateRankStats();
  }, [rankHistory]); // Only recalculate when rankHistory changes

  // Helper function to calculate platform performance statistics from real data
  const calculatePlatformStats = () => {
    if (!platformPerformance || platformPerformance.length === 0) {
      return {
        current: 0,
        best: 0,
        average: 0,
        trend: "no-data",
        trendText: "No data available",
        topPlatform: "N/A",
      };
    }

    const validData = platformPerformance.filter(
      (item) =>
        (item.leetcode || 0) + (item.codeforces || 0) + (item.codechef || 0) >
        0,
    );

    if (validData.length === 0) {
      return {
        current: 0,
        best: 0,
        average: 0,
        trend: "no-data",
        trendText: "No performance data available",
        topPlatform: "N/A",
      };
    }

    // Calculate totals for each period
    const dataWithTotals = validData.map((item) => ({
      ...item,
      total:
        (item.leetcode || 0) + (item.codeforces || 0) + (item.codechef || 0),
    }));

    // Current performance is the most recent data
    const current = dataWithTotals[dataWithTotals.length - 1]?.total || 0;

    // Best performance is the highest total
    const best = Math.max(...dataWithTotals.map((item) => item.total));

    // Average performance
    const average = Math.round(
      dataWithTotals.reduce((sum, item) => sum + item.total, 0) /
        dataWithTotals.length,
    );

    // Find top performing platform from current data
    const currentData = dataWithTotals[dataWithTotals.length - 1];
    let topPlatform = "N/A";
    let topScore = 0;

    if (currentData) {
      const platforms = ["leetcode", "codechef", "codeforces"];
      platforms.forEach((platform) => {
        if (currentData[platform] > topScore) {
          topScore = currentData[platform];
          topPlatform = platform;
        }
      });
    }

    // Trend calculation
    let trend = "stable";
    let trendText = "Performance has remained stable";

    if (dataWithTotals.length >= 2) {
      const firstTotal = dataWithTotals[0].total;
      const lastTotal = dataWithTotals[dataWithTotals.length - 1].total;
      const improvement = lastTotal - firstTotal;
      const improvementPercent = Math.round((improvement / firstTotal) * 100);

      if (improvement > firstTotal * 0.1) {
        // 10% improvement
        trend = "improving";
        trendText = `Performance improved by ${improvementPercent}%`;
      } else if (improvement < -(firstTotal * 0.1)) {
        // 10% decline
        trend = "declining";
        trendText = `Performance decreased by ${Math.abs(improvementPercent)}%`;
      } else {
        trend = "stable";
        trendText = "Performance has remained relatively stable";
      }
    }

    return {
      current,
      best,
      average,
      trend,
      trendText,
      topPlatform: topPlatform.charAt(0).toUpperCase() + topPlatform.slice(1),
    };
  };

  const platformStats = calculatePlatformStats();

  const handleSubmit = async (platform) => {
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

        {/* Performance Overview - Using Modular Component */}
        <DashboardPerformance
          dashboardStats={dashboardStats}
          loading={dashboardLoading}
          darkMode={darkMode}
        />

        {/* Daily Activity Heatmap - Using Modular Component with Lazy Loading */}
        <div ref={heatmapRef}>
          <DashboardHeatmap
            analyticsData={analyticsData}
            loading={analyticsLoading}
            darkMode={darkMode}
          />
        </div>

        {/* Rank Trend - Using Modular Component with Lazy Loading */}
        <div ref={rankTrendRef}>
          <DashboardRankTrend
            rankHistory={rankHistory}
            rankLoading={rankLoading}
            rankTimeFilter={rankTimeFilter}
            setRankTimeFilter={setRankTimeFilter}
            darkMode={darkMode}
            rankStats={rankStats}
          />
        </div>

        {/* Platform Analytics - Using Modular Component with Lazy Loading */}
        <div ref={analyticsRef}>
          <DashboardPlatformAnalytics
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            darkMode={darkMode}
          />
        </div>

        {/* Platform Performance - Using Modular Component with Lazy Loading */}
        <div ref={platformPerformanceRef}>
          <DashboardPlatformPerformance
            platformPerformance={platformPerformance}
            platformLoading={platformLoading}
            platformTimeFilter={platformTimeFilter}
            setPlatformTimeFilter={setPlatformTimeFilter}
            darkMode={darkMode}
            loading={loading}
            platformData={platformData}
          />
        </div>

        {/* Platforms Grid */}
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
                                  platformData[platform.key]?.latestStats,
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
      </Container>
    </Box>
  );
};

export default Dashboard;
