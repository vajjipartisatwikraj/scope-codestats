import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  useTheme as useMuiTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  IconButton,
  Button,
  Tooltip,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import axios from "axios";
import "github-calendar/dist/github-calendar.css";
import GitHubCalendar from "github-calendar";
import {
  OpenInNew,
  LinkedIn,
  GitHub,
  Code,
  Work,
  VerifiedUser,
  EmojiEvents,
  WorkspacePremium as RecognizedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  Person,
  Assessment,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl } from "../config/apiConfig";
import { normalizeSkillSets } from "../utils/skillSets";
import { normalizeDescriptionPoints } from "../utils/descriptionPoints";
import {
  GOLD,
  GOLD_SOFT,
  GOLD_BORDER,
} from "./profile/CertificationSuggestions";

// Import Dashboard components and utilities
import {
  platforms,
  getLiquidGlassStyle as getSharedLiquidGlassStyle,
  getInnerGlassStyle as getSharedInnerGlassStyle,
  getButtonGlassStyle,
} from "./Dashboard/dashboardUtils";
import DashboardPerformance from "./Dashboard/DashboardPerformance";
import DashboardHeatmap from "./Dashboard/DashboardHeatmap";
import DashboardRankTrend from "./Dashboard/DashboardRankTrend";
import DashboardPlatformAnalytics from "./Dashboard/DashboardPlatformAnalytics";
import DashboardPlatformPerformance from "./Dashboard/DashboardPlatformPerformance";

const achievementTypes = [
  { value: "project", label: "Project" },
  { value: "internship", label: "Internship" },
  { value: "certification", label: "Certification" },
  { value: "achievement", label: "Achievement" },
];

const LIMITED_TYPES = ["project", "internship"];

// platforms is now imported from './Dashboard/dashboardUtils'

const getYear = (graduationYear) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 3 = April)

  // Parse graduation year to ensure it's an integer
  const gradYear = parseInt(graduationYear, 10);

  // Academic year logic: Academic year runs from April to March
  // If we've crossed April (month >= 3), students advance to next academic year
  // If we haven't crossed April (month < 3), still in previous academic year
  let yearsToGraduation;
  if (currentMonth >= 3) {
    // April or later (new academic year has started)
    yearsToGraduation = gradYear - currentYear;
  } else {
    // Before April (still in previous academic year)
    yearsToGraduation = gradYear - currentYear + 1;
  }

  // yearsToGraduation indicates how many years until graduation
  // 4 years left = First year (I)
  // 3 years left = Second year (II)
  // 2 years left = Third year (III)
  // 1 year left = Fourth year (IV) - graduating next year
  // 0 years left = Fourth year (IV) - graduating this year
  switch (yearsToGraduation) {
    case 4:
      return "I";
    case 3:
      return "II";
    case 2:
      return "III";
    case 1:
      return "IV";
    case 0:
      return "IV"; // Fourth year - graduating this year
    case -1:
    case -2:
    case -3:
    case -4:
      return "Graduated";
    case 5:
      return "Incoming";
    default:
      if (yearsToGraduation > 5) {
        return "Future";
      } else if (yearsToGraduation < -4) {
        return "Alumni";
      } else {
        return `Year ${5 - yearsToGraduation}`;
      }
  }
};

const preparePieChartData = (codingProfiles, type) => {
  switch (type) {
    case "overall":
      return [
        {
          name: "LeetCode",
          value: codingProfiles?.leetcode?.score || 0,
          color: "#FFA116",
        },
        {
          name: "CodeChef",
          value: codingProfiles?.codechef?.score || 0,
          color: "#5B4638",
        },
        {
          name: "HackerRank",
          value: codingProfiles?.hackerrank?.score || 0,
          color: "#00EA64",
        },
        {
          name: "CodeForces",
          value: codingProfiles?.codeforces?.score || 0,
          color: "#1F8ACB",
        },
        {
          name: "GitHub",
          value: codingProfiles?.github?.score || 0,
          color: "#333",
        },
        {
          name: "ScopeCODESTATS",
          value: codingProfiles?.scopecodestats?.score || 0,
          color: "#4503fc",
        },
      ].filter((platform) => platform.value > 0);
    case "problems":
      return [
        {
          name: "LeetCode",
          value: codingProfiles?.leetcode?.problemsSolved || 0,
          color: "#FFA116",
        },
        {
          name: "CodeChef",
          value: codingProfiles?.codechef?.problemsSolved || 0,
          color: "#5B4638",
        },
        {
          name: "HackerRank",
          value: codingProfiles?.hackerrank?.problemsSolved || 0,
          color: "#00EA64",
        },
        {
          name: "CodeForces",
          value: codingProfiles?.codeforces?.problemsSolved || 0,
          color: "#1F8ACB",
        },
        {
          name: "ScopeCODESTATS",
          value: codingProfiles?.scopecodestats?.problemsSolved || 0,
          color: "#4503fc",
        },
      ].filter((platform) => platform.value > 0);

    case "contests":
      return [
        {
          name: "LeetCode",
          value: codingProfiles?.leetcode?.contestsParticipated || 0,
          color: "#FFA116",
        },
        {
          name: "CodeChef",
          value: codingProfiles?.codechef?.contestsParticipated || 0,
          color: "#5B4638",
        },
        {
          name: "CodeForces",
          value: codingProfiles?.codeforces?.contestsParticipated || 0,
          color: "#1F8ACB",
        },
        {
          name: "ScopeCODESTATS",
          value:
            codingProfiles?.scopecodestats?.totalPracticeArenaContests || 0,
          color: "#4503fc",
        },
      ].filter((platform) => platform.value > 0);

    case "rating":
      return [
        {
          name: "LeetCode",
          value: codingProfiles?.leetcode?.rating || 0,
          color: "#FFA116",
        },
        {
          name: "CodeChef",
          value: codingProfiles?.codechef?.rating || 0,
          color: "#5B4638",
        },
        {
          name: "CodeForces",
          value: codingProfiles?.codeforces?.rating || 0,
          color: "#1F8ACB",
        },
        {
          name: "ScopeCODESTATS",
          value: codingProfiles?.scopecodestats?.rating || 0,
          color: "#4503fc",
        },
      ].filter((platform) => platform.value > 0);

    default:
      return [];
  }
};

const fetchGitHubRepos = async (username) => {
  try {
    const response = await axios.get(
      `${apiUrl}/profiles/platform/github/${username}`,
    );
    return response.data.publicRepos || 0;
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return 0;
  }
};

const fetchGitHubContributions = async (username) => {
  try {
    const response = await axios.get(
      `${apiUrl}/profiles/platform/github/${username}`,
    );
    return response.data.totalCommits || 0;
  } catch (error) {
    console.error("Error fetching GitHub contributions:", error);
    return 0;
  }
};

// Date formatting function
const formatDate = (dateString) => {
  if (!dateString) return "";

  // Handle ISO dates or regular date strings
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid

  // Format as "Month DD, YYYY"
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Format date range
const formatDateRange = (startDate, endDate) => {
  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

  if (formattedStart && formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`;
  } else {
    return formattedStart || formattedEnd || "";
  }
};

// Domain Logo component to display organization logos
const DomainLogo = ({ domain, size = 24 }) => {
  const LOGO_TOKEN = "pk_RBjC8X-kSE2wrzZ-kFI4-g";

  if (!domain) return null;

  const logoUrl = `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}`;

  return (
    <Box
      component="img"
      sx={{
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: 1,
      }}
      src={logoUrl}
      alt={domain}
      onError={(e) => {
        e.target.src = "/placeholder-logo.png";
      }}
    />
  );
};

// Helper function to get organization logo when needed
const getOrganizationLogo = (achievement) => {
  // Use domainLink if available, otherwise try to extract from link
  const domain =
    achievement.domainLink || extractDomainFromUrl(achievement.link);

  if (!domain) return null;

  return (
    <Tooltip title={`Organization: ${domain}`}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <DomainLogo domain={domain} size={20} />
      </Box>
    </Tooltip>
  );
};

// Get the best domain to display for an achievement
const getBestDomain = (achievement) => {
  // Only use domainLink if it exists
  if (achievement.domainLink) {
    return achievement.domainLink;
  }
  return null;
};

const UserView = () => {
  const { username } = useParams();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState("overview"); // Main navigation: 'overview' or 'analytics'
  const [activeTab, setActiveTab] = useState("project");
  const [activeChartTab, setActiveChartTab] = useState("problems");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const calendarRef = useRef(null);
  const navigate = useNavigate();

  // Dashboard analytics state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [rankHistory, setRankHistory] = useState(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankTimeFilter, setRankTimeFilter] = useState("weekly");
  const [platformPerformance, setPlatformPerformance] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformTimeFilter, setPlatformTimeFilter] = useState("daily");

  const muiTheme = useMuiTheme();
  const { darkMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Helper functions for theme-aware styling
  const getTextColor = (opacity) =>
    darkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`;

  const getDividerColor = () =>
    darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  const getHoverBgColor = (baseColor) =>
    darkMode ? `${baseColor}30` : `${baseColor}15`;

  // iPhone-style Liquid Glass styling functions
  const getCardStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.1) 0%, 
          rgba(0, 0, 0, 0.35) 25%,
          rgba(15, 25, 45, 0.45) 50%,
          rgba(0, 0, 0, 0.4) 75%,
          rgba(0, 0, 0, 0.2) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.45) 0%,
          rgba(255, 255, 255, 0.25) 25%,
          rgba(240, 248, 255, 0.35) 50%,
          rgba(255, 255, 255, 0.3) 75%,
          rgba(255, 255, 255, 0.15) 100%
        )
      `,
    backdropFilter: "blur(60px) saturate(120%)",
    WebkitBackdropFilter: "blur(60px) saturate(120%)",
    borderRadius: "24px",
    boxShadow: darkMode
      ? `
        0 20px 60px rgba(0, 0, 0, 0.8),
        0 10px 30px rgba(0, 0, 0, 0.6),
        0 4px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(255, 255, 255, 0.15),
        inset 0 -1px 2px rgba(0, 0, 0, 0.1)
      `
      : `
        0 20px 60px rgba(0, 0, 0, 0.1),
        0 10px 30px rgba(0, 0, 0, 0.08),
        0 4px 16px rgba(0, 0, 0, 0.06),
        inset 0 2px 4px rgba(255, 255, 255, 0.9),
        inset 0 -1px 2px rgba(0, 0, 0, 0.05)
      `,
    border: darkMode
      ? `1px solid rgba(255, 255, 255, 0.25)`
      : `1px solid rgba(255, 255, 255, 0.6)`,
    color: darkMode ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.9)",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    animation: darkMode
      ? "liquidGlowDark 6s ease-in-out infinite"
      : "liquidGlowLight 6s ease-in-out infinite",
    "@keyframes liquidGlowDark": {
      "0%, 100%": {
        boxShadow: `
          0 20px 60px rgba(0, 0, 0, 0.8),
          0 10px 30px rgba(0, 0, 0, 0.6),
          0 4px 16px rgba(0, 0, 0, 0.4),
          inset 0 1px 2px rgba(255, 255, 255, 0.15),
          inset 0 -1px 2px rgba(0, 0, 0, 0.1)
        `,
      },
      "50%": {
        boxShadow: `
          0 25px 70px rgba(0, 136, 204, 0.3),
          0 12px 35px rgba(0, 0, 0, 0.7),
          0 6px 18px rgba(0, 0, 0, 0.5),
          inset 0 2px 3px rgba(255, 255, 255, 0.2),
          inset 0 -1px 2px rgba(0, 0, 0, 0.1)
        `,
      },
    },
    "@keyframes liquidGlowLight": {
      "0%, 100%": {
        boxShadow: `
          0 20px 60px rgba(0, 0, 0, 0.1),
          0 10px 30px rgba(0, 0, 0, 0.08),
          0 4px 16px rgba(0, 0, 0, 0.06),
          inset 0 2px 4px rgba(255, 255, 255, 0.9),
          inset 0 -1px 2px rgba(0, 0, 0, 0.05)
        `,
      },
      "50%": {
        boxShadow: `
          0 25px 70px rgba(0, 136, 204, 0.15),
          0 12px 35px rgba(0, 0, 0, 0.12),
          0 6px 18px rgba(0, 0, 0, 0.08),
          inset 0 3px 5px rgba(255, 255, 255, 1),
          inset 0 -1px 2px rgba(0, 0, 0, 0.05)
        `,
      },
    },
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
      animation: "shimmer 3s ease-in-out infinite",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: "2px",
      left: "10%",
      right: "10%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
      filter: "blur(0.5px)",
      animation: "shimmer 3s ease-in-out infinite 1s",
    },
    "@keyframes shimmer": {
      "0%, 100%": { opacity: 0.5 },
      "50%": { opacity: 1 },
    },
    "&:hover": {
      transform: "translateY(-6px) scale(1.01)",
      animation: "none",
      boxShadow: darkMode
        ? `
          0 30px 80px rgba(0, 0, 0, 0.9),
          0 15px 40px rgba(0, 0, 0, 0.7),
          0 6px 20px rgba(0, 0, 0, 0.5),
          inset 0 2px 4px rgba(255, 255, 255, 0.2),
          inset 0 -1px 2px rgba(0, 0, 0, 0.1)
        `
        : `
          0 30px 80px rgba(0, 0, 0, 0.15),
          0 15px 40px rgba(0, 0, 0, 0.12),
          0 6px 20px rgba(0, 0, 0, 0.1),
          inset 0 3px 6px rgba(255, 255, 255, 1),
          inset 0 -1px 2px rgba(0, 0, 0, 0.05)
        `,
      background: darkMode
        ? `
          linear-gradient(135deg, 
            rgba(0, 0, 0, 0.15) 0%, 
            rgba(15, 25, 45, 0.4) 25%,
            rgba(25, 40, 70, 0.5) 50%,
            rgba(0, 0, 0, 0.45) 75%,
            rgba(0, 0, 0, 0.25) 100%
          )
        `
        : `
          linear-gradient(135deg, 
            rgba(255, 255, 255, 0.5) 0%,
            rgba(255, 255, 255, 0.3) 25%,
            rgba(245, 250, 255, 0.4) 50%,
            rgba(255, 255, 255, 0.35) 75%,
            rgba(255, 255, 255, 0.2) 100%
          )
        `,
    },
  });

  const getInnerCardStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.2) 0%,
          rgba(10, 20, 40, 0.4) 30%,
          rgba(0, 0, 0, 0.5) 70%,
          rgba(0, 0, 0, 0.3) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.6) 0%,
          rgba(250, 252, 255, 0.5) 30%,
          rgba(255, 255, 255, 0.7) 70%,
          rgba(255, 255, 255, 0.4) 100%
        )
      `,
    backdropFilter: "blur(40px) saturate(110%)",
    WebkitBackdropFilter: "blur(40px) saturate(110%)",
    borderRadius: "18px",
    border: darkMode
      ? "1px solid rgba(255, 255, 255, 0.2)"
      : "1px solid rgba(255, 255, 255, 0.5)",
    boxShadow: darkMode
      ? `
        0 12px 32px rgba(0, 0, 0, 0.6),
        0 6px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(255, 255, 255, 0.1),
        inset 0 -1px 1px rgba(0, 0, 0, 0.1)
      `
      : `
        0 12px 32px rgba(0, 0, 0, 0.08),
        0 6px 16px rgba(0, 0, 0, 0.06),
        inset 0 2px 3px rgba(255, 255, 255, 0.8),
        inset 0 -1px 1px rgba(0, 0, 0, 0.03)
      `,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "15%",
      right: "15%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
    },
    "&:hover": {
      transform: "translateY(-4px) scale(1.005)",
      boxShadow: darkMode
        ? `
          0 18px 48px rgba(0, 0, 0, 0.7),
          0 8px 24px rgba(0, 0, 0, 0.5),
          inset 0 2px 3px rgba(255, 255, 255, 0.15),
          inset 0 -1px 1px rgba(0, 0, 0, 0.1)
        `
        : `
          0 18px 48px rgba(0, 0, 0, 0.12),
          0 8px 24px rgba(0, 0, 0, 0.08),
          inset 0 3px 4px rgba(255, 255, 255, 0.9),
          inset 0 -1px 1px rgba(0, 0, 0, 0.03)
        `,
      background: darkMode
        ? `
          linear-gradient(135deg, 
            rgba(0, 0, 0, 0.25) 0%,
            rgba(15, 25, 50, 0.45) 30%,
            rgba(0, 0, 0, 0.55) 70%,
            rgba(0, 0, 0, 0.35) 100%
          )
        `
        : `
          linear-gradient(135deg, 
            rgba(255, 255, 255, 0.7) 0%,
            rgba(248, 250, 255, 0.6) 30%,
            rgba(255, 255, 255, 0.8) 70%,
            rgba(255, 255, 255, 0.5) 100%
          )
        `,
    },
  });

  // iPhone-style Liquid Glass Chip Style
  const getChipStyle = (color = "#0088cc") => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.15) 0%,
          rgba(5, 15, 30, 0.35) 50%,
          rgba(0, 0, 0, 0.4) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.5) 0%,
          rgba(248, 252, 255, 0.4) 50%,
          rgba(255, 255, 255, 0.6) 100%
        )
      `,
    backdropFilter: "blur(20px) saturate(120%)",
    WebkitBackdropFilter: "blur(20px) saturate(120%)",
    border: darkMode
      ? `1px solid rgba(255, 255, 255, 0.2)`
      : `1px solid rgba(255, 255, 255, 0.4)`,
    borderRadius: "14px",
    color: color,
    boxShadow: darkMode
      ? `
        0 4px 16px rgba(0, 0, 0, 0.4),
        0 2px 8px rgba(0, 0, 0, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.1),
        inset 0 -1px 1px rgba(0, 0, 0, 0.05)
      `
      : `
        0 4px 16px rgba(0, 0, 0, 0.06),
        0 2px 8px rgba(0, 0, 0, 0.04),
        inset 0 1px 2px rgba(255, 255, 255, 0.8),
        inset 0 -1px 1px rgba(0, 0, 0, 0.02)
      `,
    fontWeight: 600,
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "20%",
      right: "20%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
    },
    "&:hover": {
      transform: "scale(1.08) translateY(-1px)",
      boxShadow: darkMode
        ? `
          0 8px 24px ${color}40,
          0 4px 12px rgba(0, 0, 0, 0.4),
          inset 0 2px 2px rgba(255, 255, 255, 0.15),
          inset 0 -1px 1px rgba(0, 0, 0, 0.05)
        `
        : `
          0 8px 24px ${color}30,
          0 4px 12px rgba(0, 0, 0, 0.08),
          inset 0 2px 3px rgba(255, 255, 255, 0.9),
          inset 0 -1px 1px rgba(0, 0, 0, 0.02)
        `,
      background: darkMode
        ? `
          linear-gradient(135deg, 
            rgba(0, 0, 0, 0.2) 0%,
            rgba(10, 20, 40, 0.4) 50%,
            rgba(0, 0, 0, 0.45) 100%
          )
        `
        : `
          linear-gradient(135deg, 
            rgba(255, 255, 255, 0.6) 0%,
            rgba(245, 250, 255, 0.5) 50%,
            rgba(255, 255, 255, 0.7) 100%
          )
        `,
    },
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  });

  // Share functionality helper functions
  const getPublicProfileUrl = () => {
    return `${window.location.origin}/public-profile/${userData.rollNumber}`;
  };

  const handleShareClick = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };

  const handleOpenLink = () => {
    const profileUrl = getPublicProfileUrl();
    window.open(profileUrl, "_blank");
    setSnackbarMessage("Profile opened in new tab!");
    setSnackbarOpen(true);
    setShareDialogOpen(false);
  };

  const handleShareOnLinkedIn = () => {
    const profileUrl = getPublicProfileUrl();
    const shareText = `Check out my coding profile and achievements on Scope Cohorts! See my projects, internships, and coding statistics.`;
    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      profileUrl,
    )}&summary=${encodeURIComponent(shareText)}`;
    window.open(linkedInShareUrl, "_blank");
    setShareDialogOpen(false);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Specialized Liquid Glass styles for different components
  const getProfileCardStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.05) 0%,
          rgba(0, 88, 204, 0.1) 15%,
          rgba(0, 0, 0, 0.4) 50%,
          rgba(0, 85, 128, 0.15) 85%,
          rgba(0, 0, 0, 0.3) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.6) 0%,
          rgba(0, 136, 204, 0.05) 15%,
          rgba(255, 255, 255, 0.4) 50%,
          rgba(0, 136, 204, 0.08) 85%,
          rgba(255, 255, 255, 0.5) 100%
        )
      `,
    backdropFilter: "blur(80px) saturate(130%)",
    WebkitBackdropFilter: "blur(80px) saturate(130%)",
    borderRadius: "28px",
    border: darkMode
      ? "1px solid rgba(255, 255, 255, 0.3)"
      : "1px solid rgba(255, 255, 255, 0.7)",
    boxShadow: darkMode
      ? `
        0 25px 70px rgba(0, 0, 0, 0.9),
        0 12px 35px rgba(0, 0, 0, 0.7),
        0 5px 18px rgba(0, 0, 0, 0.5),
        inset 0 2px 4px rgba(255, 255, 255, 0.2),
        inset 0 -2px 4px rgba(0, 0, 0, 0.1)
      `
      : `
        0 25px 70px rgba(0, 0, 0, 0.12),
        0 12px 35px rgba(0, 0, 0, 0.1),
        0 5px 18px rgba(0, 0, 0, 0.08),
        inset 0 3px 6px rgba(255, 255, 255, 1),
        inset 0 -2px 4px rgba(0, 0, 0, 0.04)
      `,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "2px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
    },
    "&:hover": {
      transform: "translateY(-8px) scale(1.015)",
      boxShadow: darkMode
        ? `
          0 35px 90px rgba(0, 0, 0, 1),
          0 18px 50px rgba(0, 0, 0, 0.8),
          0 8px 25px rgba(0, 0, 0, 0.6),
          inset 0 3px 6px rgba(255, 255, 255, 0.25),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1)
        `
        : `
          0 35px 90px rgba(0, 0, 0, 0.18),
          0 18px 50px rgba(0, 0, 0, 0.15),
          0 8px 25px rgba(0, 0, 0, 0.12),
          inset 0 4px 8px rgba(255, 255, 255, 1),
          inset 0 -2px 4px rgba(0, 0, 0, 0.04)
        `,
    },
  });

  const getStatsCardStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(145deg, 
          rgba(0, 0, 0, 0.2) 0%,
          rgba(20, 30, 50, 0.3) 40%,
          rgba(0, 0, 0, 0.45) 100%
        )
      `
      : `
        linear-gradient(145deg, 
          rgba(255, 255, 255, 0.55) 0%,
          rgba(250, 252, 255, 0.4) 40%,
          rgba(255, 255, 255, 0.65) 100%
        )
      `,
    backdropFilter: "blur(50px) saturate(115%)",
    WebkitBackdropFilter: "blur(50px) saturate(115%)",
    borderRadius: "20px",
    border: darkMode
      ? "1px solid rgba(255, 255, 255, 0.22)"
      : "1px solid rgba(255, 255, 255, 0.55)",
    boxShadow: darkMode
      ? `
        0 15px 45px rgba(0, 0, 0, 0.7),
        0 8px 25px rgba(0, 0, 0, 0.5),
        inset 0 1px 3px rgba(255, 255, 255, 0.12),
        inset 0 -1px 2px rgba(0, 0, 0, 0.08)
      `
      : `
        0 15px 45px rgba(0, 0, 0, 0.09),
        0 8px 25px rgba(0, 0, 0, 0.07),
        inset 0 2px 4px rgba(255, 255, 255, 0.85),
        inset 0 -1px 2px rgba(0, 0, 0, 0.03)
      `,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&:hover": {
      transform: "translateY(-5px) scale(1.008)",
      boxShadow: darkMode
        ? `
          0 22px 60px rgba(0, 0, 0, 0.8),
          0 12px 35px rgba(0, 0, 0, 0.6),
          inset 0 2px 4px rgba(255, 255, 255, 0.18),
          inset 0 -1px 2px rgba(0, 0, 0, 0.08)
        `
        : `
          0 22px 60px rgba(0, 0, 0, 0.12),
          0 12px 35px rgba(0, 0, 0, 0.1),
          inset 0 3px 5px rgba(255, 255, 255, 0.9),
          inset 0 -1px 2px rgba(0, 0, 0, 0.03)
        `,
    },
  });

  const getAchievementCardStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.15) 0%,
          rgba(15, 25, 45, 0.35) 30%,
          rgba(0, 0, 0, 0.4) 70%,
          rgba(0, 0, 0, 0.25) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.5) 0%,
          rgba(248, 252, 255, 0.45) 30%,
          rgba(255, 255, 255, 0.6) 70%,
          rgba(255, 255, 255, 0.4) 100%
        )
      `,
    backdropFilter: "blur(35px) saturate(110%)",
    WebkitBackdropFilter: "blur(35px) saturate(110%)",
    borderRadius: "16px",
    border: darkMode
      ? "1px solid rgba(255, 255, 255, 0.18)"
      : "1px solid rgba(255, 255, 255, 0.45)",
    boxShadow: darkMode
      ? `
        0 10px 30px rgba(0, 0, 0, 0.6),
        0 5px 15px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(255, 255, 255, 0.08),
        inset 0 -1px 1px rgba(0, 0, 0, 0.05)
      `
      : `
        0 10px 30px rgba(0, 0, 0, 0.07),
        0 5px 15px rgba(0, 0, 0, 0.05),
        inset 0 2px 3px rgba(255, 255, 255, 0.75),
        inset 0 -1px 1px rgba(0, 0, 0, 0.02)
      `,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "10%",
      right: "10%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)",
    },
    "&:hover": {
      transform: "translateY(-3px) scale(1.01)",
      boxShadow: darkMode
        ? `
          0 16px 40px rgba(0, 0, 0, 0.7),
          0 8px 20px rgba(0, 0, 0, 0.5),
          inset 0 2px 3px rgba(255, 255, 255, 0.12),
          inset 0 -1px 1px rgba(0, 0, 0, 0.05)
        `
        : `
          0 16px 40px rgba(0, 0, 0, 0.1),
          0 8px 20px rgba(0, 0, 0, 0.08),
          inset 0 3px 4px rgba(255, 255, 255, 0.8),
          inset 0 -1px 1px rgba(0, 0, 0, 0.02)
        `,
    },
  });

  // Helper function to format dates for tooltips
  const formatTooltipDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();

    const suffix = (day) => {
      if (day > 3 && day < 21) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${day}${suffix(day)} ${month} ${year}`;
  };

  // Helper functions from Dashboard for styling
  const getLiquidGlassStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.95) 0%, 
          rgba(0, 0, 0, 0.9) 25%,
          rgba(5, 5, 5, 0.92) 50%,
          rgba(0, 0, 0, 0.88) 75%,
          rgba(0, 0, 0, 0.95) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.95) 0%, 
          rgba(250, 250, 250, 0.9) 25%,
          rgba(245, 245, 245, 0.92) 50%,
          rgba(240, 240, 240, 0.88) 75%,
          rgba(255, 255, 255, 0.95) 100%
        )
      `,
    backdropFilter: "blur(60px) saturate(120%)",
    WebkitBackdropFilter: "blur(60px) saturate(120%)",
    borderRadius: "20px",
    boxShadow: darkMode
      ? `
        0 20px 60px rgba(0, 0, 0, 0.8),
        0 10px 30px rgba(0, 0, 0, 0.6),
        0 4px 16px rgba(0, 0, 0, 0.4),
        inset 0 2px 4px rgba(255, 255, 255, 0.15),
        inset 0 -1px 2px rgba(0, 0, 0, 0.1)
      `
      : `
        0 20px 60px rgba(0, 0, 0, 0.15),
        0 10px 30px rgba(0, 0, 0, 0.1),
        0 4px 16px rgba(0, 0, 0, 0.08),
        inset 0 2px 4px rgba(255, 255, 255, 0.8),
        inset 0 -1px 2px rgba(0, 0, 0, 0.05)
      `,
    border: `1px solid ${
      darkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.15)"
    }`,
    color: darkMode ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.9)",
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
        : "linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: "1px",
      left: "15%",
      right: "15%",
      height: "0.5px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
        : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
      filter: "blur(0.5px)",
    },
  });

  const getInnerGlassStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.8) 0%,
          rgba(10, 10, 10, 0.9) 30%,
          rgba(0, 0, 0, 0.85) 70%,
          rgba(5, 5, 5, 0.9) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(240, 240, 240, 0.8) 0%,
          rgba(250, 250, 250, 0.9) 30%,
          rgba(245, 245, 245, 0.85) 70%,
          rgba(255, 255, 255, 0.9) 100%
        )
      `,
    backdropFilter: "blur(40px) saturate(110%)",
    WebkitBackdropFilter: "blur(40px) saturate(110%)",
    borderRadius: "16px",
    border: `1px solid ${
      darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"
    }`,
    boxShadow: darkMode
      ? `
        0 12px 32px rgba(0, 0, 0, 0.6),
        0 6px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(255, 255, 255, 0.1),
        inset 0 -1px 1px rgba(0, 0, 0, 0.1)
      `
      : `
        0 12px 32px rgba(0, 0, 0, 0.1),
        0 6px 16px rgba(0, 0, 0, 0.08),
        inset 0 2px 3px rgba(255, 255, 255, 0.8),
        inset 0 -1px 1px rgba(0, 0, 0, 0.02)
      `,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "15%",
      right: "15%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
        : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
    },
    "&:hover": {
      transform: "translateY(-4px) scale(1.005)",
      boxShadow: darkMode
        ? `
          0 18px 48px rgba(0, 0, 0, 0.7),
          0 8px 24px rgba(0, 0, 0, 0.5),
          inset 0 2px 3px rgba(255, 255, 255, 0.15),
          inset 0 -1px 1px rgba(0, 0, 0, 0.1)
        `
        : `
          0 18px 48px rgba(0, 0, 0, 0.15),
          0 8px 24px rgba(0, 0, 0, 0.1),
          inset 0 3px 4px rgba(255, 255, 255, 0.9),
          inset 0 -1px 1px rgba(0, 0, 0, 0.02)
        `,
    },
  });

  const getButtonGlassStyle = (isPrimary = false) => ({
    background: isPrimary
      ? "linear-gradient(145deg, #0088cc 0%, #005580 100%)"
      : darkMode
        ? `
          linear-gradient(135deg, 
            rgba(0, 0, 0, 0.6) 0%,
            rgba(15, 15, 15, 0.8) 50%,
            rgba(0, 0, 0, 0.7) 100%
          )
        `
        : `
          linear-gradient(135deg, 
            rgba(240, 240, 240, 0.8) 0%,
            rgba(250, 250, 250, 0.9) 50%,
            rgba(255, 255, 255, 0.8) 100%
          )
        `,
    backdropFilter: "blur(20px) saturate(110%)",
    WebkitBackdropFilter: "blur(20px) saturate(110%)",
    border: isPrimary
      ? "1px solid rgba(0, 136, 204, 0.3)"
      : `1px solid ${
          darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"
        }`,
    borderRadius: "12px",
    color: isPrimary
      ? "white"
      : darkMode
        ? "rgba(255, 255, 255, 0.9)"
        : "rgba(0, 0, 0, 0.85)",
    boxShadow: isPrimary
      ? "0 4px 20px rgba(0, 136, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
      : darkMode
        ? `
          0 4px 16px rgba(0, 0, 0, 0.4),
          0 2px 8px rgba(0, 0, 0, 0.3),
          inset 0 1px 1px rgba(255, 255, 255, 0.1)
        `
        : `
          0 4px 16px rgba(0, 0, 0, 0.1),
          0 2px 8px rgba(0, 0, 0, 0.08),
          inset 0 1px 2px rgba(255, 255, 255, 0.8)
        `,
    fontWeight: 600,
    position: "relative",
    overflow: "hidden",
    transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "15%",
      right: "15%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
        : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
    },
    "&:hover": {
      transform: "translateY(-2px) scale(1.05)",
      background: isPrimary
        ? "linear-gradient(145deg, #0077bb 0%, #004470 100%)"
        : darkMode
          ? `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.7) 0%,
              rgba(20, 20, 20, 0.9) 50%,
              rgba(0, 0, 0, 0.8) 100%
            )
          `
          : `
            linear-gradient(135deg, 
              rgba(230, 230, 230, 0.9) 0%,
              rgba(240, 240, 240, 0.95) 50%,
              rgba(250, 250, 250, 0.9) 100%
            )
          `,
      boxShadow: isPrimary
        ? "0 6px 24px rgba(0, 136, 204, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
        : darkMode
          ? `
            0 6px 20px rgba(0, 0, 0, 0.5),
            0 3px 12px rgba(0, 0, 0, 0.4),
            inset 0 2px 2px rgba(255, 255, 255, 0.15)
          `
          : `
            0 6px 20px rgba(0, 0, 0, 0.15),
            0 3px 12px rgba(0, 0, 0, 0.1),
            inset 0 2px 3px rgba(255, 255, 255, 0.9)
          `,
    },
  });

  const [achievementCounts, setAchievementCounts] = useState({
    project: 0,
    internship: 0,
    certification: 0,
    achievement: 0,
  });

  useEffect(() => {
    if (userData?.achievements) {
      const counts = {
        project: 0,
        internship: 0,
        certification: 0,
        achievement: 0,
      };

      userData.achievements.forEach((achievement) => {
        if (counts.hasOwnProperty(achievement.type)) {
          counts[achievement.type]++;
        }
      });

      setAchievementCounts(counts);
    }
  }, [userData?.achievements]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/users/${username}`);
        const userData = response.data;
        console.log(userData);
        // Log the first achievement to verify domainLink is present
        if (userData.achievements && userData.achievements.length > 0) {
          console.log("First achievement data:", userData.achievements[0]);
        }

        if (userData.codingProfiles?.github?.username) {
          // Instead of making API calls that cause 401 errors,
          // just use the data we already have from the backend
          setUserData({
            ...userData,
            codingProfiles: {
              ...userData.codingProfiles,
              github: {
                ...userData.codingProfiles.github,
                // Use existing values or default to 0
                publicRepos: userData.codingProfiles.github.publicRepos || 0,
                totalContributions:
                  userData.codingProfiles.github.totalContributions || 0,
              },
            },
          });
        } else {
          setUserData(userData);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setLoading(false);
        setError("Failed to load user data. Please try again later.");
      }
    };

    fetchUserData();
  }, [username]);

  useEffect(() => {
    if (userData?.codingProfiles?.github?.username && calendarRef.current) {
      GitHubCalendar(
        calendarRef.current,
        userData.codingProfiles.github.username,
        {
          responsive: true,
          tooltips: true,
          global_stats: false,
        },
      );

      // Apply custom styles after calendar loads
      setTimeout(() => {
        const calendarElement = calendarRef.current;
        if (calendarElement) {
          // Create and inject custom styles
          const styleId = "github-calendar-custom-styles";
          let styleElement = document.getElementById(styleId);
          if (styleElement) {
            styleElement.remove();
          }

          styleElement = document.createElement("style");
          styleElement.id = styleId;
          styleElement.innerHTML = `
            /* Hide unwanted text elements */
            .calendar .float-left.text-gray,
            .calendar .text-small.text-gray,
            .calendar .contrib-footer,
            .calendar .js-year-link,
            .calendar .f6.text-gray {
              display: none !important;
            }
            
            /* Style contribution squares */
            .calendar rect {
              rx: 3 !important;
              ry: 3 !important;
              transition: all 0.2s ease !important;
            }
            
            .calendar rect:hover {
              transform: scale(1.1) !important;
              stroke: #0088cc !important;
              stroke-width: 1px !important;
            }
            
            /* Blue color scheme for contributions */
            .calendar rect[fill="#196127"],
            .calendar rect[fill="#239a3b"],
            .calendar rect[fill="#26a641"] {
              fill: #0088cc !important;
            }
            
            .calendar rect[fill="#7bc96f"],
            .calendar rect[fill="#39d353"] {
              fill: rgba(0, 136, 204, 0.6) !important;
            }
            
            .calendar rect[fill="#c6e48b"],
            .calendar rect[fill="#9be9a8"] {
              fill: rgba(0, 136, 204, 0.3) !important;
            }
            
            .calendar rect[fill="#ebedf0"],
            .calendar rect[fill="#f0f0f0"] {
              fill: ${
                darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"
              } !important;
            }
            
            /* Style month and day labels */
            .calendar .month,
            .calendar .wday {
              font-size: 11px !important;
              font-weight: 500 !important;
              fill: ${
                darkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"
              } !important;
            }
            
            /* Custom scrollbar for calendar container */
            .calendar {
              scrollbar-width: thin !important;
              scrollbar-color: #0088cc ${
                darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"
              } !important;
            }
            
            .calendar::-webkit-scrollbar {
              height: 4px !important;
              width: 4px !important;
            }
            
            .calendar::-webkit-scrollbar-track {
              background: ${
                darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"
              } !important;
              border-radius: 2px !important;
            }
            
            .calendar::-webkit-scrollbar-thumb {
              background: #0088cc !important;
              border-radius: 2px !important;
            }
            
            .calendar::-webkit-scrollbar-thumb:hover {
              background: #0077bb !important;
            }
          `;
          document.head.appendChild(styleElement);
        }
      }, 100);
    }
  }, [userData, darkMode]);

  // Fetch dashboard stats
  const fetchDashboardStats = async (userId) => {
    if (!userId || !auth?.token) return;
    try {
      setDashboardLoading(true);
      const response = await axios.get(
        `${apiUrl}/dashboard/performance-overview/${userId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      setDashboardStats({
        currentScore: response.data.currentScore || 0,
        currentRank: response.data.currentRank,
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
      console.error("Error fetching dashboard stats:", error);
      setDashboardStats(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (userId) => {
    if (!userId || !auth?.token) return;
    try {
      setAnalyticsLoading(true);

      // Fetch heatmap data from dashboard endpoint
      const heatmapResponse = await axios.get(
        `${apiUrl}/dashboard/heatmap/${userId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      // Fetch platform analytics from dashboard endpoint
      const platformResponse = await axios.get(
        `${apiUrl}/dashboard/platform-analytics/${userId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        },
      );

      const heatmapData = heatmapResponse.data;

      // New sparse heatmap: endpoint returns dailyActivity with per-day
      // problem counts and precomputed intensity buckets (level 0-4).
      // Built BEFORE the platform-analytics gate so the heatmap still renders
      // for users who solve only in-app (cohort/practice) problems and have no
      // external platform analytics yet.
      const dailyActivity = Array.isArray(heatmapData.dailyActivity)
        ? heatmapData.dailyActivity.map((d) => ({
            date: d.date,
            count: d.count || 0,
            level: d.level || 0,
            sources: d.sources || {},
            wasActive: (d.count || 0) > 0,
          }))
        : [];

      if (platformResponse.data.error || platformResponse.data.empty) {
        // Keep the heatmap; only the platform-dependent sections are empty.
        setAnalyticsData({
          dailyActivity,
          error: false,
          empty: true,
        });
        return;
      }

      const platformData = platformResponse.data;

      // Calculate platform problems distribution
      const problemsSolvedByPlatform = {
        leetcode: platformData.leetcode?.problemsSolved || 0,
        codechef: platformData.codechef?.problemsSolved || 0,
        codeforces: platformData.codeforces?.problemsSolved || 0,
        hackerrank: platformData.hackerrank?.problemsSolved || 0,
        github: platformData.github?.commits || 0,
        scopecodestats: platformData.scopecodestats?.problemsSolved || 0, // ScopeCODESTATS platform data
      };

      // Calculate score distribution
      const scoreDistribution = {
        leetcode: platformData.leetcode?.score || 0,
        codechef: platformData.codechef?.score || 0,
        codeforces: platformData.codeforces?.score || 0,
        hackerrank: platformData.hackerrank?.score || 0,
        github: platformData.github?.score || 0,
        scopecodestats: platformData.scopecodestats?.score || 0, // ScopeCODESTATS platform data
      };

      // Calculate score percentages
      const totalScore = Object.values(scoreDistribution).reduce(
        (sum, val) => sum + val,
        0,
      );
      const scorePercentages = {};
      Object.entries(scoreDistribution).forEach(([platform, score]) => {
        scorePercentages[platform] =
          totalScore > 0 ? (score / totalScore) * 100 : 0;
      });

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

      setAnalyticsData({
        dailyActivity,
        problemsSolvedByPlatform,
        scoreDistribution,
        scorePercentages,
        platformTrends,
        error: false,
        empty: false,
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setAnalyticsData({ error: true, empty: true });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch rank history
  const fetchRankHistory = async (userId, filterType = rankTimeFilter) => {
    if (!userId || !auth?.token) return;
    try {
      setRankLoading(true);
      const endpoint = `${apiUrl}/dashboard/${filterType}-rank-trend/${userId}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const rawData = response.data;
      let rankData = [];

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
        const today = new Date();
        const chronologicalDays = [];

        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() - i);
          const dayIndex = targetDate.getDay();
          chronologicalDays.push({
            name: dayNames[dayIndex],
            abbreviation: dayAbbreviations[dayIndex],
            date: targetDate,
          });
        }

        rankData = chronologicalDays.map((dayInfo, index) => ({
          period: dayInfo.abbreviation,
          rank: rawData[dayInfo.name] || null,
          day: index + 1,
          isToday: dayInfo.date.toDateString() === today.toDateString(),
        }));
      } else if (filterType === "monthly") {
        const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
        const weekKeys = ["week1", "week2", "week3", "week4", "week5"];

        rankData = weekKeys.map((key, index) => ({
          period: weekLabels[index],
          rank: rawData[key] || null,
          week: index + 1,
        }));
      } else if (filterType === "yearly") {
        const monthNames = [
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
        const monthAbbreviations = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const today = new Date();
        const currentMonth = today.getMonth();
        const last12Months = [];

        for (let i = 11; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          last12Months.push({
            name: monthNames[monthIndex],
            abbreviation: monthAbbreviations[monthIndex],
            monthNumber: monthIndex,
          });
        }

        rankData = last12Months.map((monthInfo, index) => ({
          period: monthInfo.abbreviation,
          rank: rawData[monthInfo.name] || null,
          month: index + 1,
        }));
      }

      setRankHistory({
        type: filterType,
        data: rankData,
        raw: rawData,
      });
    } catch (error) {
      console.error("Error fetching rank history:", error);
      setRankHistory(null);
    } finally {
      setRankLoading(false);
    }
  };

  // Fetch platform performance
  const fetchPlatformPerformance = async (
    userId,
    filterType = platformTimeFilter,
  ) => {
    if (!userId || !auth?.token) return;
    try {
      setPlatformLoading(true);
      const endpoint = `${apiUrl}/dashboard/${filterType}-platform-performance/${userId}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const rawData = response.data;

      // Transform data based on filter type (same as Dashboard.jsx)
      let performanceData = [];

      if (filterType === "daily") {
        // Show last 7 days EXCLUDING today (from 7 days ago to yesterday)
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
        const currentDayIndex = today.getDay();

        // Create array starting from 7 days ago to yesterday (excluding today)
        for (let i = 7; i >= 1; i--) {
          const dayIndex = (currentDayIndex - i + 7) % 7;
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
        // Show last 12 months in chronological order
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
        const currentMonth = new Date().getMonth();

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

      setPlatformPerformance(performanceData); // Store the array directly
    } catch (error) {
      console.error("Error fetching platform performance:", error);
      setPlatformPerformance([]); // Set empty array on error
    } finally {
      setPlatformLoading(false);
    }
  };

  // Helper function to calculate rank statistics from real data
  const calculateRankStats = () => {
    if (!rankHistory || !rankHistory.data || rankHistory.data.length === 0) {
      return {
        current: "N/A",
        best: "N/A",
        average: "N/A",
        trend: "stable",
        trendText: "No rank data available",
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
        trend: "stable",
        trendText: "No rank data available",
      };
    }

    // Find current rank (most recent non-null rank)
    let currentRank = null;
    for (let i = rankHistory.data.length - 1; i >= 0; i--) {
      if (rankHistory.data[i].rank !== null && rankHistory.data[i].rank > 0) {
        currentRank = rankHistory.data[i].rank;
        break;
      }
    }

    const bestRank = Math.min(...validRanks);
    const averageRank = Math.round(
      validRanks.reduce((a, b) => a + b, 0) / validRanks.length,
    );

    let trend = "stable";
    let trendText = "Rank is stable";

    if (validRanks.length >= 2) {
      const firstRank = validRanks[0];
      const lastRank = validRanks[validRanks.length - 1];
      const improvement = firstRank - lastRank;

      if (improvement > 5) {
        trend = "improving";
        trendText = `Improved ${improvement} positions`;
      } else if (improvement < -5) {
        trend = "declining";
        trendText = `Dropped ${Math.abs(improvement)} positions`;
      }
    }

    return {
      current: currentRank !== null ? `#${currentRank}` : "N/A",
      best: `#${bestRank}`,
      average: `#${averageRank}`,
      trend,
      trendText,
    };
  };

  // Helper function to calculate platform performance statistics
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

  // Calculate stats
  const rankStats = calculateRankStats();
  const platformStats = calculatePlatformStats();

  // Fetch dashboard data when userData is loaded
  useEffect(() => {
    if (userData && userData._id) {
      fetchDashboardStats(userData._id);
      fetchAnalyticsData(userData._id);
      fetchRankHistory(userData._id);
      fetchPlatformPerformance(userData._id);
    }
  }, [userData]);

  // Re-fetch rank history when filter changes
  useEffect(() => {
    if (userData && userData._id) {
      fetchRankHistory(userData._id, rankTimeFilter);
    }
  }, [rankTimeFilter]);

  // Re-fetch platform performance when filter changes
  useEffect(() => {
    if (userData && userData._id) {
      fetchPlatformPerformance(userData._id, platformTimeFilter);
    }
  }, [platformTimeFilter]);

  // Set default chart tab based on main tab
  useEffect(() => {
    if (mainTab === "overview") {
      setActiveChartTab("overall");
    } else if (mainTab === "analytics") {
      setActiveChartTab("problems");
    }
  }, [mainTab]);

  const filteredAchievements =
    userData?.achievements?.filter(
      (achievement) => achievement.type === activeTab,
    ) || [];

  const ScoreGauge = ({ platform, data }) => {
    const getPlatformMaxScore = (platform) => {
      if (typeof platform !== "string") {
        return 3000; // Default max score
      }

      switch (platform.toLowerCase()) {
        case "leetcode":
          return 3000;
        case "codechef":
          return 3000;
        case "codeforces":
          return 3500;
        case "hackerrank":
          return 1000;
        default:
          return 3000;
      }
    };

    const maxScore = getPlatformMaxScore(platform);
    const score = data?.score || 0;

    // Get additional stats for tooltip content
    const getTooltipContent = () => {
      let content = `Score: ${score}`;

      if (
        typeof platform === "string" &&
        platform.toLowerCase() === "codechef" &&
        data?.contestsParticipated
      ) {
        content += `\nContests Participated: ${data.contestsParticipated}`;
      }

      if (data?.problemsSolved) {
        content += `\nProblems Solved: ${data.problemsSolved}`;
      }

      if (data?.rating) {
        content += `\nRating: ${data.rating}`;
      }

      return content;
    };

    return (
      <Tooltip
        title={getTooltipContent()}
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: darkMode ? "#333" : "white",
              color: darkMode ? "white" : "#333",
              border: darkMode
                ? "1px solid rgba(255, 255, 255, 0.2)"
                : "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              boxShadow: darkMode
                ? "0 4px 12px rgba(0, 0, 0, 0.5)"
                : "0 4px 12px rgba(0, 0, 0, 0.1)",
              zIndex: 9999,
            },
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            minHeight: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            ...getInnerCardStyle(),
            p: 2,
          }}
        >
          <Box sx={{ position: "relative", width: 60, height: 60, mb: 1 }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={60}
              thickness={4}
              sx={{
                color: darkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                position: "absolute",
                left: 0,
              }}
            />
            <CircularProgress
              variant="determinate"
              value={(score / maxScore) * 100}
              size={60}
              thickness={5}
              sx={{
                color: "#0088cc", // Use primary color instead of orange
                position: "absolute",
                left: 0,
                "& .MuiCircularProgress-circle": {
                  strokeLinecap: "round",
                },
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: darkMode ? "#1a1a1a" : "#fff",
                width: 48,
                height: 48,
                borderRadius: "50%",
                margin: "auto",
                border: darkMode
                  ? "1px solid rgba(255, 255, 255, 0.05)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "bold",
                  color: "#0088cc",
                  fontSize: "0.9rem",
                }}
              >
                {score}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: getTextColor(0.7),
                  fontSize: "0.6rem",
                  lineHeight: 1,
                }}
              >
                Average
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: getTextColor(0.7),
                  fontSize: "0.6rem",
                  lineHeight: 1,
                }}
              >
                Rating
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: getTextColor(0.9),
                fontWeight: 500,
                textAlign: "center",
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {platform}
            </Typography>
          </Box>
        </Box>
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: "#0088cc" }} />
        <Typography variant="body1" sx={{ color: getTextColor(0.7) }}>
          Loading user profile...
        </Typography>
      </Box>
    );
  }

  if (error || !userData) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          flexDirection: "column",
          gap: 2,
          p: 3,
          mx: "auto",
          maxWidth: "600px",
          ...getCardStyle(),
          bgcolor: darkMode
            ? "rgba(26, 26, 26, 0.8)"
            : "rgba(255, 255, 255, 0.8)",
        }}
      >
        <Typography
          variant="h5"
          color="error"
          sx={{ mb: 2, textAlign: "center" }}
        >
          {error || "User not found"}
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: getTextColor(0.7), mb: 3, textAlign: "center" }}
        >
          We couldn't find the user profile you're looking for. The user may not
          exist or there might be a problem with the connection.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/")}
          sx={{
            bgcolor: "#0088cc",
            "&:hover": { bgcolor: "#006699" },
            px: 4,
            py: 1,
            borderRadius: "8px",
          }}
        >
          Go Back Home
        </Button>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}
    >
      <Grid container spacing={3}>
        {/* User Header - Always First on Mobile */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: { xs: 3, sm: 4 },
              ...getProfileCardStyle(),
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Liquid Glass Background Pattern with Floating Particles */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "120px",
                background:
                  "linear-gradient(135deg, #0088cc 0%, #005580 50%, #003355 100%)",
                opacity: darkMode ? 0.7 : 0.6,
                filter: "blur(1px)",
                animation: "breatheBackground 4s ease-in-out infinite",
                "@keyframes breatheBackground": {
                  "0%, 100%": {
                    transform: "scale(1)",
                    opacity: darkMode ? 0.7 : 0.6,
                  },
                  "50%": {
                    transform: "scale(1.01)",
                    opacity: darkMode ? 0.8 : 0.7,
                  },
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                  pointerEvents: "none",
                  animation: "liquidWave 8s ease-in-out infinite",
                },
                "@keyframes liquidWave": {
                  "0%, 100%": {
                    background:
                      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                  },
                  "25%": {
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(255,255,255,0.1) 100%)",
                  },
                  "50%": {
                    background:
                      "linear-gradient(225deg, rgba(255,255,255,0.12) 0%, transparent 60%, rgba(255,255,255,0.08) 100%)",
                  },
                  "75%": {
                    background:
                      "linear-gradient(315deg, rgba(255,255,255,0.08) 0%, transparent 30%, rgba(255,255,255,0.12) 100%)",
                  },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: "10px",
                  left: "20px",
                  width: "60px",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, transparent 100%)",
                  borderRadius: "1px",
                  filter: "blur(1px)",
                  animation: "floatingLight 3s ease-in-out infinite",
                },
                "@keyframes floatingLight": {
                  "0%, 100%": {
                    transform: "translateX(0) translateY(0)",
                    opacity: 0.6,
                  },
                  "50%": {
                    transform: "translateX(10px) translateY(-2px)",
                    opacity: 1,
                  },
                },
              }}
            />

            {/* Shine effect on top */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: "20%",
                width: "60%",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
              }}
            />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={3} md={2} sx={{ position: "relative" }}>
                <Box sx={{ position: "relative" }}>
                  <Box
                    sx={{
                      width: { xs: 80, sm: 120, md: 150 },
                      height: { xs: 80, sm: 120, md: 150 },
                      borderRadius: "50%",
                      bgcolor: "#0088cc",
                      border: `4px solid ${darkMode ? "#1a1a1a" : "#ffffff"}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                      color: "white",
                      mx: { xs: "auto", sm: 0 },
                      mt: { xs: 0, sm: 0 },
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                      textTransform: "uppercase",
                      overflow: "hidden",
                      position: "relative",
                      zIndex: 2,
                      animation: "profileBreathe 5s ease-in-out infinite",
                      "@keyframes profileBreathe": {
                        "0%, 100%": {
                          transform: "scale(1)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                        },
                        "50%": {
                          transform: "scale(1.03)",
                          boxShadow:
                            "0 8px 30px rgba(0, 136, 204, 0.6), 0 4px 20px rgba(0, 0, 0, 0.4)",
                        },
                      },
                    }}
                  >
                    {userData.profilePicture ? (
                      <img
                        src={
                          userData.profilePicture ||
                          "/assets/default-profile.png"
                        }
                        alt={userData.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      userData.name?.charAt(0).toUpperCase()
                    )}
                  </Box>
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                sm={9}
                md={10}
                sx={{ position: "relative", zIndex: 1 }}
              >
                <Box sx={{ mt: { xs: 6, sm: 10 } }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      color: darkMode ? "#ffffff" : "#000000",
                      textShadow: "none",
                      letterSpacing: "0.5px",
                      fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                      maxWidth: "100%",
                      textTransform: "capitalize",
                      mb: 1,
                    }}
                  >
                    {userData.name?.toLowerCase()}
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      color: darkMode
                        ? "rgba(255, 255, 255, 0.8)"
                        : "rgba(0, 0, 0, 0.8)",
                      textShadow: "none",
                      fontWeight: 500,
                      fontSize: { xs: "0.8rem", sm: "1rem" },
                    }}
                  >
                    {userData.graduatingYear &&
                      `${getYear(userData.graduatingYear)} Year, `}
                    {userData.department}
                    {userData.section && ` - ${userData.section}`}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: darkMode
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(0, 0, 0, 0.5)",
                          fontWeight: 400,
                          fontSize: { xs: "0.7rem", sm: "0.8rem" },
                        }}
                      >
                        Score
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          color: darkMode ? "#36a9e0" : "#0088cc",
                          fontWeight: 600,
                          fontSize: { xs: "0.9rem", sm: "1.1rem" },
                        }}
                      >
                        {userData.totalScore || 0}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                      }}
                    >
                      {userData.linkedinUrl && (
                        <IconButton
                          href={
                            userData.linkedinUrl.includes("linkedin.com")
                              ? userData.linkedinUrl
                              : `https://www.linkedin.com/in/${userData.linkedinUrl}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: "rgba(0,119,181,0.1)",
                            color: "#0077b5",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              backgroundColor: "rgba(0,119,181,0.2)",
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          <LinkedIn sx={{ fontSize: 22 }} />
                        </IconButton>
                      )}
                      {userData.resumeLink && (
                        <IconButton
                          href={userData.resumeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: "rgba(244,67,54,0.1)",
                            color: "#f44336",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              backgroundColor: "rgba(244,67,54,0.2)",
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          <DescriptionIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                      )}
                      {userData.codingProfiles?.github?.username && (
                        <IconButton
                          href={`https://github.com/${userData.codingProfiles.github.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(36,41,46,0.1)",
                            color: darkMode ? "#ffffff" : "#24292e",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              backgroundColor: darkMode
                                ? "rgba(255,255,255,0.2)"
                                : "rgba(36,41,46,0.2)",
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          <GitHub sx={{ fontSize: 22 }} />
                        </IconButton>
                      )}

                      {/* Share Button */}
                      <IconButton
                        onClick={handleShareClick}
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: darkMode
                            ? "rgba(33, 150, 243, 0.2)"
                            : "rgba(33, 150, 243, 0.1)",
                          color: "#2196f3",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            backgroundColor: darkMode
                              ? "rgba(33, 150, 243, 0.3)"
                              : "rgba(33, 150, 243, 0.2)",
                            transform: "scale(1.1)",
                          },
                        }}
                      >
                        <ShareIcon sx={{ fontSize: 22 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Left Section */}
        <Grid item xs={12} md={4} sx={{ order: { xs: 2, md: 1 } }}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              ...getStatsCardStyle(),
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* About Section */}
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 600, color: darkMode ? "#fff" : "#000", mb: 3 }}
            >
              About
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: getTextColor(0.7),
                mb: 3,
                whiteSpace: "pre-line",
                lineHeight: 1.7,
              }}
            >
              {userData.about || "No description provided."}
            </Typography>

            {/* Coding Profiles in About Section */}
            {(userData.codingProfiles?.leetcode?.username ||
              userData.codingProfiles?.codechef?.username ||
              userData.codingProfiles?.hackerrank?.username ||
              userData.codingProfiles?.codeforces?.username ||
              userData.codingProfiles?.github?.username) && (
              <>
                <Divider sx={{ my: 3, borderColor: getDividerColor() }} />
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: darkMode ? "#fff" : "#000",
                    mt: 1,
                    mb: 3,
                  }}
                >
                  Coding Profiles
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {userData.codingProfiles?.leetcode?.username && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: "#FFA116",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                          zIndex: 100,
                        }}
                      >
                        L
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: getTextColor(0.7) }}
                      >
                        LeetCode:{" "}
                        <Typography
                          component="a"
                          href={`https://leetcode.com/${userData.codingProfiles.leetcode.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: "#0088cc",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {userData.codingProfiles.leetcode.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}

                  {userData.codingProfiles?.codechef?.username && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: "#5B4638",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        C
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: getTextColor(0.7) }}
                      >
                        CodeChef:{" "}
                        <Typography
                          component="a"
                          href={`https://www.codechef.com/users/${userData.codingProfiles.codechef.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: "#0088cc",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {userData.codingProfiles.codechef.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}

                  {userData.codingProfiles?.hackerrank?.username && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: "#00EA64",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        H
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: getTextColor(0.7) }}
                      >
                        HackerRank:{" "}
                        <Typography
                          component="a"
                          href={`https://www.hackerrank.com/${userData.codingProfiles.hackerrank.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: "#0088cc",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {userData.codingProfiles.hackerrank.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}

                  {userData.codingProfiles?.codeforces?.username && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: "#1F8ACB",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        CF
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: getTextColor(0.7) }}
                      >
                        CodeForces:{" "}
                        <Typography
                          component="a"
                          href={`https://codeforces.com/profile/${userData.codingProfiles.codeforces.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: "#0088cc",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {userData.codingProfiles.codeforces.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}

                  {userData.codingProfiles?.github?.username && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: "#333",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        G
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: getTextColor(0.7) }}
                      >
                        GitHub:{" "}
                        <Typography
                          component="a"
                          href={`https://github.com/${userData.codingProfiles.github.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: "#0088cc",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {userData.codingProfiles.github.username}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}

            <Divider sx={{ my: 3, borderColor: getDividerColor() }} />

            {/* Details Section */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  mt: 2,
                  mb: 3,
                  fontWeight: 600,
                  color: darkMode ? "#fff" : "#000",
                }}
              >
                Details
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  width: "100%",
                  "& .MuiTypography-root": {
                    fontSize: "1rem",
                    color: darkMode ? "white" : "rgba(0, 0, 0, 0.87)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Email
                  </Typography>
                  <Typography>{userData.email}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Department
                  </Typography>
                  <Typography>{userData.department}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Section
                  </Typography>
                  <Typography>{userData.section}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Year
                  </Typography>
                  <Typography>
                    {userData.graduatingYear
                      ? `${getYear(userData.graduatingYear)}`
                      : "N/A"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography sx={{ color: getTextColor(0.5) }}>
                    Contact
                  </Typography>
                  <Typography>{userData.mobileNumber}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3, borderColor: getDividerColor() }} />

              {/* Skills Section */}
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  mt: 2,
                  mb: 3,
                  fontWeight: 600,
                  color: darkMode ? "#fff" : "#000",
                }}
              >
                Skills
              </Typography>
              {normalizeSkillSets(userData.skills).map((skillSet, setIndex) => (
                <Box key={`skill-set-${setIndex}`} sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 1,
                      fontWeight: 600,
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    {skillSet.name}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {skillSet.skills.map((skill, index) => (
                      <Chip
                        key={`skill-${skill}-${index}`}
                        label={skill}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                          ...getChipStyle("#0088cc"),
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}

              <Divider sx={{ my: 3, borderColor: getDividerColor() }} />

              {/* Interests Section */}
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  mt: 2,
                  mb: 3,
                  color: darkMode ? "#fff" : "#000",
                  fontWeight: 600,
                }}
              >
                Interests
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {userData.interests?.map((interest, index) => (
                  <Chip
                    key={`interest-${interest}-${index}`}
                    label={interest}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      ...getChipStyle("#0088cc"),
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Conditional Content Based on Main Tab */}
        {mainTab === "overview" && (
          <>
            {/* Main Navigation Tabs - Beside Left Sidebar */}
            <Grid item xs={12} md={8} sx={{ order: { xs: 2, md: 2 } }}>
              <Paper
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  mb: 3,
                  ...getInnerCardStyle(),
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: { xs: 1, sm: 2 },
                    alignItems: "center",
                  }}
                >
                  {[
                    {
                      value: "overview",
                      label: "Overview",
                      icon: <Person fontSize="small" />,
                    },
                    {
                      value: "analytics",
                      label: "Analytics",
                      icon: <Assessment fontSize="small" />,
                    },
                  ].map((tab) => {
                    const isActive = mainTab === tab.value;

                    return (
                      <Box
                        key={tab.value}
                        onClick={() => setMainTab(tab.value)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: { xs: 2, sm: 3 },
                          py: { xs: 1, sm: 1.25 },
                          borderRadius: "16px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          minWidth: "fit-content",
                          position: "relative",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          ...(isActive
                            ? {
                                background:
                                  "linear-gradient(145deg, #0088cc 0%, #005580 100%)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                boxShadow:
                                  "0 4px 20px rgba(0, 136, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                                border: "1px solid rgba(0, 136, 204, 0.3)",
                              }
                            : {
                                background: darkMode
                                  ? "linear-gradient(145deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)"
                                  : "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.5) 100%)",
                                border: darkMode
                                  ? "1px solid rgba(255, 255, 255, 0.15)"
                                  : "1px solid rgba(0, 0, 0, 0.08)",
                              }),
                          "&:hover": {
                            transform: "translateY(-2px) scale(1.02)",
                            ...(isActive
                              ? {
                                  background:
                                    "linear-gradient(145deg, #0077bb 0%, #004470 100%)",
                                  boxShadow:
                                    "0 6px 24px rgba(0, 136, 204, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                                }
                              : {
                                  boxShadow: `0 6px 20px rgba(0, 136, 204, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
                                }),
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: isActive ? "white" : "#0088cc",
                            "& svg": {
                              fontSize: "1.1rem",
                            },
                          }}
                        >
                          {tab.icon}
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                            color: isActive
                              ? "white"
                              : darkMode
                                ? "rgba(255, 255, 255, 0.9)"
                                : "rgba(0, 0, 0, 0.8)",
                          }}
                        >
                          {tab.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>

              {/* Daily Activity Heatmap — shown before the analytics/progress container */}
              <Box sx={{ mb: 3 }}>
                <DashboardHeatmap
                  analyticsData={analyticsData}
                  loading={analyticsLoading}
                  darkMode={darkMode}
                />
              </Box>

              {/* Profile Section */}
              <Paper
                sx={{
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  ...getStatsCardStyle(),
                }}
              >
                {/* Scope Stats */}
                {userData.rankingInfo &&
                  (userData.rankingInfo.overallRank !== null ||
                    userData.rankingInfo.departmentRank !== null) && (
                    <>
                      <Typography
                        variant="h6"
                        sx={{
                          color: darkMode ? "#ffffff" : "#000000",
                          fontWeight: 700,
                          mb: 3,
                          fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        }}
                      >
                        Scope Stats
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          gap: { xs: 1, sm: 2 },
                          mb: 4,
                          flexWrap: "nowrap",
                          alignItems: "stretch",
                          justifyContent: "stretch",
                          width: "100%",
                        }}
                      >
                        {/* Total Score Card */}
                        <Box
                          sx={{
                            bgcolor: darkMode
                              ? "rgba(0, 0, 0, 0.50)"
                              : "#FFFFFF",
                            borderRadius: "16px",
                            p: { xs: 2.5, sm: 3 },
                            textAlign: "center",
                            flex: "1",
                            minWidth: 0,
                            boxShadow: darkMode
                              ? "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)"
                              : "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                            backdropFilter: darkMode ? "blur(10px)" : "none",
                            border: `1px solid ${
                              darkMode
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.08)"
                            }`,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {/* Blue Gaussian Blur Effect - Only for dark mode */}
                          {darkMode && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: "100%",
                                height: "100%",
                                zIndex: 0,
                                borderRadius: "16px",
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="100%"
                                height="100%"
                                viewBox="0 0 400 220"
                                fill="none"
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  right: 0,
                                  opacity: 0.7,
                                  transform: "scale(2)",
                                }}
                              >
                                <g
                                  opacity="0.8"
                                  filter="url(#filter0_f_rank_total_user)"
                                >
                                  <path
                                    d="M500 -200L0 100L450 150L500 -200Z"
                                    fill="#1580CC"
                                  />
                                  <path
                                    d="M500 -200L0 100L450 150L500 -200Z"
                                    stroke="rgba(21, 128, 204, 0.6)"
                                  />
                                </g>
                                <defs>
                                  <filter
                                    id="filter0_f_rank_total_user"
                                    x="-100"
                                    y="-300"
                                    width="700"
                                    height="550"
                                    filterUnits="userSpaceOnUse"
                                    colorInterpolationFilters="sRGB"
                                  >
                                    <feFlood
                                      floodOpacity="0"
                                      result="BackgroundImageFix"
                                    />
                                    <feBlend
                                      mode="normal"
                                      in="SourceGraphic"
                                      in2="BackgroundImageFix"
                                      result="shape"
                                    />
                                    <feGaussianBlur
                                      stdDeviation="50"
                                      result="effect1_foregroundBlur"
                                    />
                                  </filter>
                                </defs>
                              </svg>
                            </Box>
                          )}

                          <Box sx={{ position: "relative", zIndex: 1 }}>
                            <Typography
                              variant="h4"
                              sx={{
                                color: darkMode ? "white" : "#000000",
                                fontWeight: 700,
                                fontSize: { xs: "1.5rem", sm: "1.75rem" },
                                mb: 0.5,
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {userData.totalScore || 0}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                color: darkMode
                                  ? "rgba(255, 255, 255, 0.9)"
                                  : "rgba(0, 0, 0, 0.8)",
                                fontSize: { xs: "0.875rem", sm: "1rem" },
                                fontWeight: 600,
                                mb: 0.5,
                                letterSpacing: "0.02em",
                              }}
                            >
                              Total Score
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                color: darkMode
                                  ? "rgba(255, 255, 255, 0.6)"
                                  : "rgba(0, 0, 0, 0.6)",
                                fontSize: "0.75rem",
                                display: "block",
                                mb: 1,
                              }}
                            >
                              across all platforms
                            </Typography>

                            <Box
                              sx={{
                                bgcolor: darkMode
                                  ? "rgba(21, 128, 204, 0.2)"
                                  : "rgba(21, 128, 204, 0.1)",
                                borderRadius: "20px",
                                px: 1.5,
                                py: 0.5,
                                display: "inline-block",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#1580CC",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              >
                                Points
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Overall Rank */}
                        {userData.rankingInfo.overallRank !== null &&
                          userData.rankingInfo.totalUsers > 0 && (
                            <Box
                              sx={{
                                bgcolor: darkMode
                                  ? "rgba(0, 0, 0, 0.50)"
                                  : "#FFFFFF",
                                borderRadius: "16px",
                                p: { xs: 2.5, sm: 3 },
                                textAlign: "center",
                                flex: "1",
                                minWidth: 0,
                                boxShadow: darkMode
                                  ? "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)"
                                  : "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                                backdropFilter: darkMode
                                  ? "blur(10px)"
                                  : "none",
                                border: `1px solid ${
                                  darkMode
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.08)"
                                }`,
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                position: "relative",
                                overflow: "hidden",
                              }}
                            >
                              {/* Blue Gaussian Blur Effect - Only for dark mode */}
                              {darkMode && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 0,
                                    borderRadius: "16px",
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="100%"
                                    height="100%"
                                    viewBox="0 0 400 220"
                                    fill="none"
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      right: 0,
                                      opacity: 0.7,
                                      transform: "scale(2)",
                                    }}
                                  >
                                    <g
                                      opacity="0.8"
                                      filter="url(#filter0_f_rank_overall_user)"
                                    >
                                      <path
                                        d="M500 -200L0 100L450 150L500 -200Z"
                                        fill="#1580CC"
                                      />
                                      <path
                                        d="M500 -200L0 100L450 150L500 -200Z"
                                        stroke="rgba(21, 128, 204, 0.6)"
                                      />
                                    </g>
                                    <defs>
                                      <filter
                                        id="filter0_f_rank_overall_user"
                                        x="-100"
                                        y="-300"
                                        width="700"
                                        height="550"
                                        filterUnits="userSpaceOnUse"
                                        colorInterpolationFilters="sRGB"
                                      >
                                        <feFlood
                                          floodOpacity="0"
                                          result="BackgroundImageFix"
                                        />
                                        <feBlend
                                          mode="normal"
                                          in="SourceGraphic"
                                          in2="BackgroundImageFix"
                                          result="shape"
                                        />
                                        <feGaussianBlur
                                          stdDeviation="50"
                                          result="effect1_foregroundBlur"
                                        />
                                      </filter>
                                    </defs>
                                  </svg>
                                </Box>
                              )}

                              <Box sx={{ position: "relative", zIndex: 1 }}>
                                <Typography
                                  variant="h4"
                                  sx={{
                                    color: darkMode ? "white" : "#000000",
                                    fontWeight: 700,
                                    fontSize: { xs: "1.5rem", sm: "1.75rem" },
                                    mb: 0.5,
                                    letterSpacing: "-0.02em",
                                  }}
                                >
                                  #{userData.rankingInfo.overallRank}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255, 255, 255, 0.9)"
                                      : "rgba(0, 0, 0, 0.8)",
                                    fontSize: { xs: "0.875rem", sm: "1rem" },
                                    fontWeight: 600,
                                    mb: 0.5,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  Overall Rank
                                </Typography>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255, 255, 255, 0.6)"
                                      : "rgba(0, 0, 0, 0.6)",
                                    fontSize: "0.75rem",
                                    display: "block",
                                    mb: 1,
                                  }}
                                >
                                  out of {userData.rankingInfo.totalUsers} users
                                </Typography>

                                {userData.rankingInfo.percentile > 0 && (
                                  <Box
                                    sx={{
                                      bgcolor: darkMode
                                        ? "rgba(21, 128, 204, 0.2)"
                                        : "rgba(21, 128, 204, 0.1)",
                                      borderRadius: "20px",
                                      px: 1.5,
                                      py: 0.5,
                                      display: "inline-block",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "#1580CC",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Top{" "}
                                      {Math.round(
                                        100 - userData.rankingInfo.percentile,
                                      )}
                                      %
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          )}

                        {/* Department Rank */}
                        {userData.rankingInfo.departmentRank !== null &&
                          userData.rankingInfo.departmentUsers > 0 && (
                            <Box
                              sx={{
                                bgcolor: darkMode
                                  ? "rgba(0, 0, 0, 0.50)"
                                  : "#FFFFFF",
                                borderRadius: "16px",
                                p: { xs: 2.5, sm: 3 },
                                textAlign: "center",
                                flex: "1",
                                minWidth: 0,
                                boxShadow: darkMode
                                  ? "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)"
                                  : "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
                                backdropFilter: darkMode
                                  ? "blur(10px)"
                                  : "none",
                                border: `1px solid ${
                                  darkMode
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.08)"
                                }`,
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                position: "relative",
                                overflow: "hidden",
                              }}
                            >
                              {/* Blue Gaussian Blur Effect - Only for dark mode */}
                              {darkMode && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 0,
                                    borderRadius: "16px",
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="100%"
                                    height="100%"
                                    viewBox="0 0 400 220"
                                    fill="none"
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      right: 0,
                                      opacity: 0.7,
                                      transform: "scale(2)",
                                    }}
                                  >
                                    <g
                                      opacity="0.8"
                                      filter="url(#filter0_f_rank_dept_user)"
                                    >
                                      <path
                                        d="M500 -200L0 100L450 150L500 -200Z"
                                        fill="#1580CC"
                                      />
                                      <path
                                        d="M500 -200L0 100L450 150L500 -200Z"
                                        stroke="rgba(21, 128, 204, 0.6)"
                                      />
                                    </g>
                                    <defs>
                                      <filter
                                        id="filter0_f_rank_dept_user"
                                        x="-100"
                                        y="-300"
                                        width="700"
                                        height="550"
                                        filterUnits="userSpaceOnUse"
                                        colorInterpolationFilters="sRGB"
                                      >
                                        <feFlood
                                          floodOpacity="0"
                                          result="BackgroundImageFix"
                                        />
                                        <feBlend
                                          mode="normal"
                                          in="SourceGraphic"
                                          in2="BackgroundImageFix"
                                          result="shape"
                                        />
                                        <feGaussianBlur
                                          stdDeviation="50"
                                          result="effect1_foregroundBlur"
                                        />
                                      </filter>
                                    </defs>
                                  </svg>
                                </Box>
                              )}

                              <Box sx={{ position: "relative", zIndex: 1 }}>
                                <Typography
                                  variant="h4"
                                  sx={{
                                    color: darkMode ? "white" : "#000000",
                                    fontWeight: 700,
                                    fontSize: { xs: "1.5rem", sm: "1.75rem" },
                                    mb: 0.5,
                                    letterSpacing: "-0.02em",
                                  }}
                                >
                                  #{userData.rankingInfo.departmentRank}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255, 255, 255, 0.9)"
                                      : "rgba(0, 0, 0, 0.8)",
                                    fontSize: { xs: "0.875rem", sm: "1rem" },
                                    fontWeight: 600,
                                    mb: 0.5,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  Department Rank
                                </Typography>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255, 255, 255, 0.6)"
                                      : "rgba(0, 0, 0, 0.6)",
                                    fontSize: "0.75rem",
                                    display: "block",
                                    mb: 1,
                                  }}
                                >
                                  out of {userData.rankingInfo.departmentUsers}{" "}
                                  in {userData.department}
                                </Typography>

                                <Box
                                  sx={{
                                    bgcolor: darkMode
                                      ? "rgba(21, 128, 204, 0.2)"
                                      : "rgba(21, 128, 204, 0.1)",
                                    borderRadius: "20px",
                                    px: 1.5,
                                    py: 0.5,
                                    display: "inline-block",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "#1580CC",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {userData.department} Dept.
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                      </Box>
                    </>
                  )}

                {/* Coding Profiles */}
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: darkMode ? "#fff" : "#000",
                    mb: 2,
                    mt:
                      userData.rankingInfo &&
                      (userData.rankingInfo.overallRank !== null ||
                        userData.rankingInfo.departmentRank !== null)
                        ? 2
                        : 0,
                  }}
                >
                  Detailed Breakdown
                </Typography>

                {/* Pie Charts Section */}
                <Box sx={{ mt: 2 }}>
                  <Tabs
                    value={activeChartTab}
                    onChange={(e, newValue) => setActiveChartTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      mb: 3,
                      "& .MuiTab-root": {
                        color: getTextColor(0.7),
                        "&.Mui-selected": {
                          color: "#0088cc",
                        },
                      },
                      "& .MuiTabs-indicator": {
                        backgroundColor: "#0088cc",
                      },
                    }}
                  >
                    <Tab
                      key="overall-tab"
                      label="Overall Score"
                      value="overall"
                    />
                    <Tab
                      key="problems-tab"
                      label="Problems Solved"
                      value="problems"
                    />
                    <Tab key="contests-tab" label="Contests" value="contests" />
                    <Tab key="rating-tab" label="Rating" value="rating" />
                  </Tabs>

                  <Box
                    sx={{
                      position: "relative",
                      height: { xs: 300, sm: 350 },
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart
                        margin={{
                          top: isMobile ? 5 : 10,
                          right: isMobile ? 5 : 10,
                          bottom: isMobile ? 5 : 10,
                          left: isMobile ? 5 : 10,
                        }}
                      >
                        <Pie
                          data={preparePieChartData(
                            userData.codingProfiles,
                            activeChartTab,
                          )}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 60 : 80}
                          outerRadius={isMobile ? 80 : 120}
                          paddingAngle={4}
                          dataKey="value"
                          activeIndex={-1}
                          animationBegin={200}
                          animationDuration={800}
                          activeShape={(props) => {
                            const {
                              cx,
                              cy,
                              innerRadius,
                              outerRadius,
                              startAngle,
                              endAngle,
                              fill,
                            } = props;
                            return (
                              <g>
                                <path
                                  d={`M ${cx},${cy} L ${
                                    cx + outerRadius * Math.cos(startAngle)
                                  },${
                                    cy + outerRadius * Math.sin(startAngle)
                                  } A ${outerRadius},${outerRadius} 0 0,1 ${
                                    cx + outerRadius * Math.cos(endAngle)
                                  },${cy + outerRadius * Math.sin(endAngle)} Z`}
                                  fill={fill}
                                  stroke={
                                    darkMode
                                      ? "rgba(255,255,255,0.1)"
                                      : "rgba(0,0,0,0.05)"
                                  }
                                  strokeWidth={1}
                                />
                              </g>
                            );
                          }}
                        >
                          {preparePieChartData(
                            userData.codingProfiles,
                            activeChartTab,
                          ).map((entry, index) => (
                            <Cell
                              key={`cell-${entry.name}-${index}`}
                              fill={entry.color}
                              style={{
                                cursor: "pointer",
                                filter: "brightness(1)",
                              }}
                              stroke={
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.05)"
                              }
                              strokeWidth={1}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: darkMode ? "#1E1E1E" : "white",
                            color: darkMode ? "white" : "#333",
                            border: darkMode
                              ? "1px solid rgba(255, 255, 255, 0.2)"
                              : "1px solid rgba(0, 0, 0, 0.1)",
                            borderRadius: "12px",
                            padding: "12px",
                            fontSize: "14px",
                            boxShadow: darkMode
                              ? "0 4px 12px rgba(0, 0, 0, 0.5)"
                              : "0 4px 12px rgba(0, 0, 0, 0.1)",
                            zIndex: 9999,
                          }}
                          labelStyle={{
                            fontWeight: "bold",
                            marginBottom: "6px",
                            color: "#0088cc",
                          }}
                          wrapperStyle={{
                            outline: "none",
                            zIndex: 9999,
                          }}
                          itemStyle={{
                            color: darkMode
                              ? "rgba(255, 255, 255, 0.9)"
                              : "rgba(0, 0, 0, 0.8)",
                            padding: "2px 0",
                          }}
                          isAnimationActive={true}
                          cursor={{ fill: "transparent" }}
                          formatter={(value, name) => {
                            let label = value;
                            switch (activeChartTab) {
                              case "overall":
                                label = `Score: ${value}`;
                                break;
                              case "problems":
                                label = `Problems: ${value}`;
                                break;
                              case "contests":
                                label = `Contests: ${value}`;
                                break;
                              case "rating":
                                label = `Rating: ${value}`;
                                break;
                            }
                            return [label, name];
                          }}
                        />
                        <Legend
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          iconSize={isMobile ? 8 : 10}
                          wrapperStyle={{
                            fontSize: isMobile ? "10px" : "11px",
                            paddingTop: isMobile ? "12px" : "16px",
                            color: getTextColor(0.9),
                            maxWidth: "100%",
                          }}
                          formatter={(value, entry) => (
                            <span
                              style={{
                                color: getTextColor(0.9),
                                fontWeight: 500,
                                padding: isMobile ? "2px 4px" : "4px 6px",
                                cursor: "pointer",
                                display: "inline-block",
                              }}
                            >
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text Overlay */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: "48%", // Adjusted to account for legend at bottom
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        width: isMobile ? "90px" : "110px",
                        height: isMobile ? "90px" : "110px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: darkMode
                          ? "rgba(18, 18, 18, 0.8)"
                          : "rgba(255, 255, 255, 0.9)",
                        boxShadow: darkMode
                          ? "0 4px 16px rgba(0, 0, 0, 0.4)"
                          : "0 4px 16px rgba(0, 0, 0, 0.1)",
                        borderRadius: "50%",
                        zIndex: 10,
                        pointerEvents: "none",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{
                          color: "#0088cc",
                          fontWeight: 700,
                          fontSize: isMobile ? "1.5rem" : "1.8rem",
                          lineHeight: 1,
                          mb: 0.5,
                          textShadow: darkMode
                            ? "0 2px 4px rgba(0, 136, 204, 0.3)"
                            : "0 2px 4px rgba(0, 136, 204, 0.1)",
                        }}
                      >
                        {activeChartTab === "rating"
                          ? Math.round(
                              preparePieChartData(
                                userData.codingProfiles,
                                activeChartTab,
                              ).reduce((sum, item) => sum + item.value, 0) /
                                preparePieChartData(
                                  userData.codingProfiles,
                                  activeChartTab,
                                ).length,
                            ) || 0
                          : preparePieChartData(
                              userData.codingProfiles,
                              activeChartTab,
                            ).reduce((sum, item) => sum + item.value, 0)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: darkMode
                            ? "rgba(255, 255, 255, 0.8)"
                            : "rgba(0, 0, 0, 0.7)",
                          fontSize: isMobile ? "0.75rem" : "0.85rem",
                          lineHeight: 1.2,
                          maxWidth: "90%",
                          fontWeight: 500,
                          textAlign: "center",
                        }}
                      >
                        {activeChartTab === "overall"
                          ? "Total Score"
                          : activeChartTab === "problems"
                            ? "Total Problems"
                            : activeChartTab === "contests"
                              ? "Total Contests"
                              : "Average Rating"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* GitHub Stats Section */}
              <Paper
                sx={{
                  p: { xs: 2, sm: 3 },
                  my: 3,
                  ...getStatsCardStyle(),
                }}
              >
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    mb: 3,
                    fontWeight: 600,
                    color: darkMode ? "#fff" : "#000",
                  }}
                >
                  GitHub Stats
                </Typography>

                {userData?.codingProfiles?.github?.username ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    {/* GitHub Stats Grid - No nested containers */}
                    <Grid container spacing={3} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Typography
                            variant="body1"
                            color={getTextColor(0.7)}
                            sx={{ mb: 1 }}
                          >
                            Public Repo's
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              color: "#0088cc",
                              fontWeight: 600,
                              fontSize: { xs: "1.5rem", sm: "1.75rem" },
                            }}
                          >
                            {userData.githubStats?.publicRepos || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Typography
                            variant="body1"
                            color={getTextColor(0.7)}
                            sx={{ mb: 1 }}
                          >
                            Total Commits
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              color: "#0088cc",
                              fontWeight: 600,
                              fontSize: { xs: "1.5rem", sm: "1.75rem" },
                            }}
                          >
                            {userData.githubStats?.totalCommits || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Typography
                            variant="body1"
                            color={getTextColor(0.7)}
                            sx={{ mb: 1 }}
                          >
                            Stars
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              color: "#0088cc",
                              fontWeight: 600,
                              fontSize: { xs: "1.5rem", sm: "1.75rem" },
                            }}
                          >
                            {userData.githubStats?.starsReceived || 0}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Typography
                            variant="body1"
                            color={getTextColor(0.7)}
                            sx={{ mb: 1 }}
                          >
                            Followers
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              color: "#0088cc",
                              fontWeight: 600,
                              textTransform: "capitalize",
                              fontSize: { xs: "1.5rem", sm: "1.75rem" },
                            }}
                          >
                            {userData.githubStats?.followers || 0}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Horizontal Separator */}
                    <Box
                      sx={{
                        width: "100%",
                        height: "1px",
                        backgroundColor: getDividerColor(),
                        my: 2,
                      }}
                    />

                    {/* GitHub Contribution Calendar */}
                    <Box sx={{ py: 2 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: darkMode ? "white" : "#000000",
                          fontWeight: 500,
                          mb: 3,
                        }}
                      >
                        Contribution Activity
                      </Typography>
                      <Box
                        sx={{
                          ".calendar": {
                            maxWidth: "100%",
                            overflow: "auto",
                            color: `${darkMode ? "white" : "#000"} !important`,
                            fontSize: "12px !important",
                            fontFamily:
                              '"Inter", -apple-system, BlinkMacSystemFont, sans-serif !important',
                          },
                        }}
                      >
                        <div ref={calendarRef}></div>
                      </Box>
                    </Box>

                    {/* Horizontal Separator */}
                    <Box
                      sx={{
                        width: "100%",
                        height: "1px",
                        backgroundColor: getDividerColor(),
                        my: 2,
                      }}
                    />

                    {/* Contribution Streak */}
                    <Box sx={{ py: 2 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 3,
                          color: darkMode ? "white" : "#000000",
                          fontWeight: 500,
                        }}
                      >
                        Contribution Streak
                      </Typography>
                      <Box
                        sx={{
                          height: "200px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <img
                          src={`https://github-readme-streak-stats.herokuapp.com/?user=${
                            userData.codingProfiles?.github?.username
                          }&theme=${
                            darkMode ? "dark" : "default"
                          }&hide_border=true&background=${
                            darkMode ? "0a0a0a" : "ffffff"
                          }&ring=0088cc&fire=0088cc&currStreakLabel=0088cc&sideLabels=${
                            darkMode ? "ffffff" : "333333"
                          }&dates=${
                            darkMode ? "ffffff" : "333333"
                          }&stroke=0088cc&card_width=850&sideNums=${
                            darkMode ? "ffffff" : "333333"
                          }&currStreakNum=${darkMode ? "ffffff" : "333333"}`}
                          alt="GitHub Streak"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            transform: "scale(1.15)",
                            transformOrigin: "center",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      color: getTextColor(0.7),
                      textAlign: "center",
                      py: 4,
                    }}
                  >
                    No GitHub username provided
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Achievements Section */}
            <Grid item xs={12} sx={{ order: { xs: 3, md: 3 } }}>
              <Paper
                sx={{
                  p: { xs: 2, sm: 3 },
                  ...getAchievementCardStyle(),
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      color: darkMode ? "#fff" : "#000",
                      fontWeight: 600,
                      mb: 3,
                    }}
                  >
                    Achievements
                  </Typography>
                </Box>

                {/* Achievement Type Tabs */}
                <Box
                  sx={{
                    mb: 3,
                    width: "100%",
                    overflowX: "auto",
                    position: "relative",
                    zIndex: 10,
                    "&::-webkit-scrollbar": {
                      height: "4px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: darkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                      borderRadius: "2px",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      gap: { xs: 0.5, sm: 1 },
                      minWidth: "min-content",
                      justifyContent: "flex-start",
                      width: "100%",
                      flexWrap: "nowrap",
                    }}
                  >
                    {[
                      {
                        value: "achievement",
                        label: "Achievements",
                        icon: <EmojiEvents fontSize="small" />,
                      },
                      {
                        value: "project",
                        label: "Projects",
                        icon: <Code fontSize="small" />,
                      },
                      {
                        value: "internship",
                        label: "Internships",
                        icon: <Work fontSize="small" />,
                      },
                      {
                        value: "certification",
                        label: "Certifications",
                        icon: <VerifiedUser fontSize="small" />,
                      },
                    ].map((type) => {
                      const isActive = activeTab === type.value;
                      const count = achievementCounts[type.value];

                      return (
                        <Box
                          key={type.value}
                          onClick={() => setActiveTab(type.value)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: { xs: 0.5, sm: 1 },
                            px: { xs: 1.5, sm: 2 },
                            py: { xs: 0.75, sm: 1 },
                            borderRadius: "20px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            minWidth: "fit-content",
                            position: "relative",
                            zIndex: 20,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            ...(isActive
                              ? {
                                  background:
                                    "linear-gradient(145deg, #0088cc 0%, #005580 100%)",
                                  backdropFilter: "blur(20px)",
                                  WebkitBackdropFilter: "blur(20px)",
                                  boxShadow:
                                    "0 4px 20px rgba(0, 136, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                                  border: "1px solid rgba(0, 136, 204, 0.3)",
                                }
                              : {
                                  ...getChipStyle("#0088cc"),
                                  background: darkMode
                                    ? "linear-gradient(145deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)"
                                    : "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.5) 100%)",
                                }),
                            "&:hover": {
                              transform: "translateY(-2px) scale(1.02)",
                              zIndex: 25,
                              ...(isActive
                                ? {
                                    background:
                                      "linear-gradient(145deg, #0077bb 0%, #004470 100%)",
                                    boxShadow:
                                      "0 6px 24px rgba(0, 136, 204, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                                  }
                                : {
                                    boxShadow: `0 6px 20px rgba(0, 136, 204, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
                                  }),
                            },
                          }}
                        >
                          {/* Icon */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: isActive ? "white" : "#0088cc",
                              "& svg": {
                                fontSize: "1rem",
                              },
                            }}
                          >
                            {type.icon}
                          </Box>

                          {/* Label */}
                          <Typography
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              fontWeight: 500,
                              color: isActive
                                ? "white"
                                : darkMode
                                  ? "rgba(255, 255, 255, 0.9)"
                                  : "rgba(0, 0, 0, 0.8)",
                              lineHeight: 1,
                            }}
                          >
                            {type.label}
                          </Typography>

                          {/* Count Badge */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: { xs: "18px", sm: "20px" },
                              height: { xs: "18px", sm: "20px" },
                              borderRadius: { xs: "9px", sm: "10px" },
                              bgcolor: isActive
                                ? "rgba(255, 255, 255, 0.2)"
                                : darkMode
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(0, 0, 0, 0.1)",
                              color: isActive
                                ? "white"
                                : darkMode
                                  ? "rgba(255, 255, 255, 0.9)"
                                  : "rgba(0, 0, 0, 0.8)",
                              fontSize: { xs: "0.65rem", sm: "0.75rem" },
                              fontWeight: 600,
                              px: { xs: 0.25, sm: 0.5 },
                            }}
                          >
                            {LIMITED_TYPES.includes(type.value)
                              ? `${count}/5`
                              : count}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {/* Achievements Cards Container */}
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                  }}
                >
                  {filteredAchievements.length > 0 ? (
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        mt: 2,
                      }}
                    >
                      {/* Vertical Grid Container */}
                      <Grid container spacing={3}>
                        {filteredAchievements.map((achievement, index) => (
                          <Grid
                            item
                            xs={12}
                            key={`achievement-${achievement._id || index}`}
                          >
                            <Paper
                              sx={{
                                width: "100%",
                                ...getInnerCardStyle(),
                                borderRadius: "16px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                minHeight: "220px",
                                position: "relative",
                                // Globally recognized certificates are marked in gold
                                ...(achievement.recognized && {
                                  border: `1px solid ${GOLD_BORDER}`,
                                  "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: "3px",
                                    zIndex: 2,
                                    background: `linear-gradient(90deg, ${GOLD} 0%, rgba(201,162,39,0.35) 100%)`,
                                  },
                                }),
                              }}
                            >
                              {/* Gaussian Blur Effect - Only for dark mode */}
                              {darkMode && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 0,
                                    borderRadius: "16px",
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="100%"
                                    height="100%"
                                    viewBox="0 0 400 220"
                                    fill="none"
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      right: 0,
                                      opacity: 0.7,
                                      transform: "scale(2)",
                                    }}
                                  >
                                    <g
                                      opacity="0.8"
                                      filter="url(#filter0_f_achievement)"
                                    >
                                      <path
                                        d="M500 -200L0 100L450 150L500 -200Z"
                                        fill="#1580CC"
                                      />
                                      <path
                                        d="M500 -200L0 100L450 150L500 -200Z"
                                        stroke="rgba(21, 128, 204, 0.6)"
                                      />
                                    </g>
                                    <defs>
                                      <filter
                                        id="filter0_f_achievement"
                                        x="-300"
                                        y="-500"
                                        width="1000"
                                        height="800"
                                        filterUnits="userSpaceOnUse"
                                        colorInterpolationFilters="sRGB"
                                      >
                                        <feFlood
                                          floodOpacity="0"
                                          result="BackgroundImageFix"
                                        />
                                        <feBlend
                                          mode="normal"
                                          in="SourceGraphic"
                                          in2="BackgroundImageFix"
                                          result="shape"
                                        />
                                        <feGaussianBlur
                                          stdDeviation="120"
                                          result="effect1_foregroundBlur_achievement"
                                        />
                                      </filter>
                                    </defs>
                                  </svg>
                                </Box>
                              )}

                              <Box
                                sx={{
                                  p: 3,
                                  display: "flex",
                                  flexDirection: "column",
                                  height: "100%",
                                  position: "relative",
                                  zIndex: 1,
                                }}
                              >
                                {/* Header with icon and title */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    mb: 2,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 2,
                                    }}
                                  >
                                    {/* Icon based on achievement type or domain logo if available */}
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minWidth: "40px",
                                        height: "40px",
                                        borderRadius: "10px",
                                        bgcolor: darkMode
                                          ? "rgba(0, 136, 204, 0.1)"
                                          : "rgba(0, 136, 204, 0.05)",
                                        color: "#0088cc",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {/* Try to use domainLink, or extract from link */}
                                      {getBestDomain(achievement) ? (
                                        <DomainLogo
                                          domain={getBestDomain(achievement)}
                                          size={30}
                                        />
                                      ) : (
                                        <>
                                          {achievement.type === "project" && (
                                            <Code fontSize="medium" />
                                          )}
                                          {achievement.type ===
                                            "internship" && (
                                            <Work fontSize="medium" />
                                          )}
                                          {achievement.type ===
                                            "certification" && (
                                            <VerifiedUser fontSize="medium" />
                                          )}
                                          {achievement.type ===
                                            "achievement" && (
                                            <EmojiEvents fontSize="medium" />
                                          )}
                                        </>
                                      )}
                                    </Box>

                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          fontWeight: 600,
                                          color: darkMode ? "white" : "#000000",
                                          fontSize: "1.1rem",
                                        }}
                                      >
                                        {achievement.title}
                                      </Typography>

                                      {achievement.recognized && (
                                        <Chip
                                          size="small"
                                          icon={
                                            <RecognizedIcon
                                              sx={{
                                                fontSize: 15,
                                                color: `${GOLD} !important`,
                                              }}
                                            />
                                          }
                                          label="Recognized"
                                          sx={{
                                            mt: 0.75,
                                            height: "22px",
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            bgcolor: GOLD_SOFT,
                                            color: GOLD,
                                            border: `1px solid ${GOLD_BORDER}`,
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Box>

                                  {/* External Link */}
                                  {achievement.link && (
                                    <IconButton
                                      href={achievement.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      size="medium"
                                      sx={{
                                        color: "white",
                                        bgcolor: darkMode
                                          ? "rgba(255, 255, 255, 0.1)"
                                          : "rgba(255, 255, 255, 0.8)",
                                        width: "40px",
                                        height: "40px",
                                        "&:hover": {
                                          bgcolor: darkMode
                                            ? "rgba(255, 255, 255, 0.2)"
                                            : "rgba(255, 255, 255, 0.9)",
                                          transform: "scale(1.1)",
                                        },
                                      }}
                                    >
                                      <OpenInNew fontSize="medium" />
                                    </IconButton>
                                  )}
                                </Box>

                                {/* Duration/Date - Make it more prominent for internships */}
                                {(achievement.duration ||
                                  achievement.startDate ||
                                  achievement.endDate) && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mb: 2,
                                      mt: 0.5,
                                      bgcolor: darkMode
                                        ? "rgba(0, 136, 204, 0.08)"
                                        : "rgba(0, 136, 204, 0.04)",
                                      borderRadius: "6px",
                                      px: 1.5,
                                      py: 0.75,
                                      border: "1px solid",
                                      borderColor: darkMode
                                        ? "rgba(0, 136, 204, 0.15)"
                                        : "rgba(0, 136, 204, 0.1)",
                                      width: "fit-content",
                                    }}
                                  >
                                    <CalendarMonth
                                      fontSize="small"
                                      sx={{
                                        color: "#0088cc",
                                        fontSize: "1rem",
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: darkMode
                                          ? "rgba(255, 255, 255, 0.9)"
                                          : "rgba(0, 0, 0, 0.8)",
                                        fontSize: "0.9rem",
                                        fontWeight: 500,
                                        lineHeight: 1.4,
                                        letterSpacing: "0.01em",
                                      }}
                                    >
                                      {achievement.duration
                                        ? achievement.duration
                                        : formatDateRange(
                                            achievement.startDate,
                                            achievement.endDate,
                                          )}
                                    </Typography>
                                  </Box>
                                )}

                                <Box
                                  component="ul"
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255, 255, 255, 0.7)"
                                      : "rgba(0, 0, 0, 0.7)",
                                    fontSize: "0.9rem",
                                    lineHeight: 1.6,
                                    flex: 1,
                                    pl: 2.5,
                                    my: 0,
                                    // Tailwind preflight removes list markers globally
                                    listStyleType: "disc",
                                    listStylePosition: "outside",
                                    "& li": { display: "list-item" },
                                  }}
                                >
                                  {normalizeDescriptionPoints(
                                    achievement.description,
                                  ).map((point, pointIdx) => (
                                    <Typography
                                      component="li"
                                      variant="body2"
                                      key={pointIdx}
                                      sx={{ mb: 0.5 }}
                                    >
                                      {point}
                                    </Typography>
                                  ))}
                                </Box>

                                <Divider
                                  sx={{
                                    my: 1.5,
                                    borderColor: darkMode
                                      ? "rgba(255, 255, 255, 0.1)"
                                      : "rgba(0, 0, 0, 0.1)",
                                  }}
                                />

                                {/* Organization domain and logo */}
                                {achievement.domainLink &&
                                  !achievement.tags?.length && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mt: "auto",
                                        opacity: 0.8,
                                      }}
                                    >
                                      <DomainLogo
                                        domain={achievement.domainLink}
                                        size={16}
                                      />
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: darkMode
                                            ? "rgba(255, 255, 255, 0.5)"
                                            : "rgba(0, 0, 0, 0.6)",
                                          fontSize: "0.75rem",
                                          fontStyle: "italic",
                                        }}
                                      >
                                        {achievement.domainLink}
                                      </Typography>
                                    </Box>
                                  )}

                                {achievement.tags &&
                                  achievement.tags.length > 0 && (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 1,
                                      }}
                                    >
                                      {/* Show domain as a special tag if it exists */}
                                      {achievement.domainLink && (
                                        <Tooltip
                                          title={`Organization: ${achievement.domainLink}`}
                                        >
                                          <Chip
                                            icon={
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  pl: 0.5,
                                                }}
                                              >
                                                <DomainLogo
                                                  domain={
                                                    achievement.domainLink
                                                  }
                                                  size={14}
                                                />
                                              </Box>
                                            }
                                            label={achievement.domainLink}
                                            size="small"
                                            sx={{
                                              ...getChipStyle("#0088cc"),
                                              height: "24px",
                                              fontSize: "0.75rem",
                                            }}
                                            onClick={() => {
                                              if (achievement.domainLink)
                                                window.open(
                                                  `https://${achievement.domainLink}`,
                                                  "_blank",
                                                );
                                            }}
                                          />
                                        </Tooltip>
                                      )}
                                      {achievement.tags.map((tag, tagIndex) => (
                                        <Chip
                                          key={`tag-${
                                            achievement._id || index
                                          }-${tagIndex}`}
                                          label={tag}
                                          size="small"
                                          sx={{
                                            ...getChipStyle("#0088cc"),
                                            height: "24px",
                                            fontSize: "0.75rem",
                                          }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: darkMode
                          ? "rgba(255, 255, 255, 0.5)"
                          : "rgba(0, 0, 0, 0.5)",
                        bgcolor: darkMode
                          ? "rgba(30, 30, 30, 0.5)"
                          : "rgba(240, 240, 240, 0.5)",
                        borderRadius: 2,
                        border: darkMode
                          ? "1px solid rgba(255, 255, 255, 0.1)"
                          : "1px solid rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <Typography>
                        No{" "}
                        {
                          achievementTypes.find((t) => t.value === activeTab)
                            ?.label
                        }
                        s found
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </>
        )}

        {/* Analytics Tab Content */}
        {mainTab === "analytics" && (
          <Grid item xs={12} md={8} sx={{ order: { xs: 2, md: 2 } }}>
            {/* Main Navigation Tabs */}
            <Paper
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 3,
                ...getInnerCardStyle(),
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 1, sm: 2 },
                  alignItems: "center",
                }}
              >
                {[
                  {
                    value: "overview",
                    label: "Overview",
                    icon: <Person fontSize="small" />,
                  },
                  {
                    value: "analytics",
                    label: "Analytics",
                    icon: <Assessment fontSize="small" />,
                  },
                ].map((tab) => {
                  const isActive = mainTab === tab.value;

                  return (
                    <Box
                      key={tab.value}
                      onClick={() => setMainTab(tab.value)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: { xs: 2, sm: 3 },
                        py: { xs: 1, sm: 1.25 },
                        borderRadius: "16px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        minWidth: "fit-content",
                        position: "relative",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        ...(isActive
                          ? {
                              background:
                                "linear-gradient(145deg, #0088cc 0%, #005580 100%)",
                              backdropFilter: "blur(20px)",
                              WebkitBackdropFilter: "blur(20px)",
                              boxShadow:
                                "0 4px 20px rgba(0, 136, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                              border: "1px solid rgba(0, 136, 204, 0.3)",
                            }
                          : {
                              background: darkMode
                                ? "linear-gradient(145deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)"
                                : "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.5) 100%)",
                              border: darkMode
                                ? "1px solid rgba(255, 255, 255, 0.15)"
                                : "1px solid rgba(0, 0, 0, 0.08)",
                            }),
                        "&:hover": {
                          transform: "translateY(-2px) scale(1.02)",
                          ...(isActive
                            ? {
                                background:
                                  "linear-gradient(145deg, #0077bb 0%, #004470 100%)",
                                boxShadow:
                                  "0 6px 24px rgba(0, 136, 204, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                              }
                            : {
                                boxShadow: `0 6px 20px rgba(0, 136, 204, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
                              }),
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isActive ? "white" : "#0088cc",
                          "& svg": {
                            fontSize: "1.1rem",
                          },
                        }}
                      >
                        {tab.icon}
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                          color: isActive
                            ? "white"
                            : darkMode
                              ? "rgba(255, 255, 255, 0.9)"
                              : "rgba(0, 0, 0, 0.8)",
                        }}
                      >
                        {tab.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* Daily Activity Heatmap */}
            <Box sx={{ mb: 3 }}>
              <DashboardHeatmap
                analyticsData={analyticsData}
                loading={analyticsLoading}
                darkMode={darkMode}
              />
            </Box>

            {/* Performance Overview */}
            <Box sx={{ mb: 3 }}>
              <DashboardPerformance
                stats={dashboardStats}
                loading={dashboardLoading}
                darkMode={darkMode}
              />
            </Box>

            {/* Rank Trend */}
            <Box sx={{ mb: 3 }}>
              <DashboardRankTrend
                rankHistory={rankHistory}
                rankLoading={rankLoading}
                rankTimeFilter={rankTimeFilter}
                setRankTimeFilter={setRankTimeFilter}
                darkMode={darkMode}
                rankStats={rankStats}
                loading={rankLoading}
              />
            </Box>

            {/* Platform Analytics */}
            <Box sx={{ mb: 3 }}>
              <DashboardPlatformAnalytics
                analyticsData={analyticsData}
                analyticsLoading={analyticsLoading}
                darkMode={darkMode}
                compact={true}
              />
            </Box>

            {/* Platform Performance Over Time */}
            <Box sx={{ mb: 3 }}>
              <DashboardPlatformPerformance
                platformPerformance={platformPerformance}
                platformLoading={platformLoading}
                platformTimeFilter={platformTimeFilter}
                setPlatformTimeFilter={setPlatformTimeFilter}
                darkMode={darkMode}
                platformStats={platformStats}
                loading={platformLoading}
                platformData={
                  platformPerformance && platformPerformance.length > 0
                    ? { hasData: true }
                    : {}
                }
              />
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Share Profile Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={handleCloseShareDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
        sx={{
          "& .MuiBackdrop-root": {
            backdropFilter: "blur(8px)",
            backgroundColor: darkMode
              ? "rgba(0, 0, 0, 0.6)"
              : "rgba(0, 0, 0, 0.3)",
          },
        }}
      >
        <Box
          sx={{
            // iPhone-style Liquid Glass effect - matching notification menu
            background: darkMode
              ? "rgba(10, 10, 12, 0.85)" // Dark blackish glass
              : "rgba(242, 242, 247, 0.60)", // iOS light glass
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)", // Safari support
            border: darkMode
              ? "0.5px solid rgba(255, 255, 255, 0.18)"
              : "0.5px solid rgba(0, 0, 0, 0.04)",
            borderRadius: "24px",
            overflow: "hidden",
            position: "relative",
            boxShadow: darkMode
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.10) inset"
              : "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.50) inset",
            animation: "dialogSpring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            "@keyframes dialogSpring": {
              "0%": {
                opacity: 0,
                transform: "scale(0.9) translateY(-10px)",
              },
              "50%": {
                transform: "scale(1.02) translateY(2px)",
              },
              "100%": {
                opacity: 1,
                transform: "scale(1) translateY(0)",
              },
            },
          }}
        >
          {/* Header - iOS style */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: darkMode
                ? "0.5px solid rgba(255, 255, 255, 0.10)"
                : "0.5px solid rgba(0, 0, 0, 0.08)",
              background: "transparent",
            }}
          >
            <Box sx={{ pr: 2, flex: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  color: darkMode ? "#FFFFFF" : "#000000",
                  fontWeight: 700,
                  fontSize: "1.35rem",
                  letterSpacing: "-0.02em",
                  mb: 0.5,
                }}
              >
                Share Your Profile
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontSize: "0.875rem",
                }}
              >
                Showcase your coding journey and achievements!
              </Typography>
            </Box>

            {/* Close Button - iOS style */}
            <IconButton
              onClick={handleCloseShareDialog}
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)",
                bgcolor: darkMode
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.04)",
                border: darkMode
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
                transition: "all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)",
                "&:hover": {
                  bgcolor: darkMode
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(0, 0, 0, 0.08)",
                  transform: "scale(1.05)",
                },
                "&:active": {
                  transform: "scale(0.95)",
                },
              }}
            >
              <Box sx={{ fontSize: 18, fontWeight: "bold", lineHeight: 1 }}>
                ×
              </Box>
            </IconButton>
          </Box>

          {/* Content Section with Glass Effect */}
          <DialogContent sx={{ p: 3, background: "transparent" }}>
            {/* Profile Preview Card with Liquid Glass */}
            <Box
              sx={{
                background: darkMode
                  ? "rgba(0, 0, 0, 0.2)"
                  : "rgba(255, 255, 255, 0.3)",
                backdropFilter: "blur(20px) saturate(110%)",
                WebkitBackdropFilter: "blur(20px) saturate(110%)",
                border: darkMode
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(255,255,255,0.3)",
                borderRadius: "16px",
                p: 3,
                mb: 3,
                position: "relative",
                overflow: "hidden",
                boxShadow: darkMode
                  ? "0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)"
                  : "0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)",
                transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "15%",
                  right: "15%",
                  height: "1px",
                  background: darkMode
                    ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)"
                    : "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                },
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: darkMode
                    ? "0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "0 12px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: darkMode
                      ? "linear-gradient(135deg, rgba(0,136,204,0.5) 0%, rgba(0,85,128,0.7) 100%)"
                      : "linear-gradient(135deg, #0088cc 0%, #005580 100%)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mr: 3,
                    color: "white",
                    fontSize: "1.4rem",
                    fontWeight: "600",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    boxShadow:
                      "0 4px 12px rgba(0,136,204,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                    border: darkMode
                      ? "1px solid rgba(255,255,255,0.15)"
                      : "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {userData?.name?.charAt(0)?.toUpperCase()}
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: darkMode
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(0,0,0,0.9)",
                      mb: 0.5,
                      fontSize: "1.1rem",
                    }}
                  >
                    {userData?.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.6)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {userData?.department} • {userData?.section} • Score:{" "}
                    {userData?.totalScore || 0}
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: darkMode
                    ? "rgba(255,255,255,0.75)"
                    : "rgba(0,0,0,0.7)",
                  fontStyle: "italic",
                  pl: 7.5,
                  fontSize: "0.9rem",
                }}
              >
                "Check out my coding achievements and projects!"
              </Typography>
            </Box>

            {/* URL Input Section with Glass Effect */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
                  fontSize: "0.9rem",
                }}
              >
                Your Public Profile Link
              </Typography>

              <TextField
                fullWidth
                variant="outlined"
                value={userData ? getPublicProfileUrl() : ""}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton
                      onClick={handleOpenLink}
                      sx={{
                        color: "#0088cc",
                        bgcolor: darkMode
                          ? "rgba(0,136,204,0.12)"
                          : "rgba(0,136,204,0.08)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: darkMode
                          ? "1px solid rgba(0,136,204,0.2)"
                          : "1px solid rgba(0,136,204,0.15)",
                        width: 36,
                        height: 36,
                        transition: "all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)",
                        "&:hover": {
                          bgcolor: darkMode
                            ? "rgba(0,136,204,0.20)"
                            : "rgba(0,136,204,0.12)",
                          transform: "scale(1.05)",
                          boxShadow: "0 4px 12px rgba(0,136,204,0.3)",
                        },
                        "&:active": {
                          transform: "scale(0.95)",
                        },
                      }}
                    >
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </IconButton>
                  ),
                  sx: {
                    background: darkMode
                      ? "rgba(0, 0, 0, 0.2)"
                      : "rgba(255, 255, 255, 0.25)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderRadius: "12px",
                    "& fieldset": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.1)",
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderColor: darkMode
                        ? "rgba(0,136,204,0.4)"
                        : "rgba(0,136,204,0.5)",
                    },
                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                      borderColor: "#0088cc",
                      borderWidth: "1.5px",
                    },
                  },
                }}
                sx={{
                  "& input": {
                    color: darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.8)",
                    fontSize: "0.85rem",
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", monospace',
                    fontWeight: 500,
                  },
                }}
              />
            </Box>

            {/* Action Buttons with Glass Effect */}
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                onClick={handleShareOnLinkedIn}
                variant="contained"
                startIcon={<LinkedIn />}
                sx={{
                  background:
                    "linear-gradient(135deg, #0077b5 0%, #005885 100%)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "white",
                  fontWeight: 600,
                  borderRadius: "12px",
                  textTransform: "none",
                  px: 3,
                  py: 1.2,
                  fontSize: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow:
                    "0 4px 15px rgba(0,119,181,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                  transition: "all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #005885 0%, #004466 100%)",
                    transform: "translateY(-1px) scale(1.02)",
                    boxShadow:
                      "0 6px 20px rgba(0,119,181,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                  },
                  "&:active": {
                    transform: "translateY(0) scale(0.98)",
                  },
                }}
              >
                Share on LinkedIn
              </Button>

              <Button
                onClick={handleOpenLink}
                variant="outlined"
                startIcon={<OpenInNew />}
                sx={{
                  background: darkMode
                    ? "rgba(0, 0, 0, 0.2)"
                    : "rgba(255, 255, 255, 0.3)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderColor: darkMode
                    ? "rgba(0,136,204,0.4)"
                    : "rgba(0,136,204,0.5)",
                  color: "#0088cc",
                  fontWeight: 600,
                  borderRadius: "12px",
                  textTransform: "none",
                  px: 3,
                  py: 1.2,
                  fontSize: "0.9rem",
                  borderWidth: "1.5px",
                  boxShadow: darkMode
                    ? "0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "0 4px 15px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
                  transition: "all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)",
                  "&:hover": {
                    borderColor: "#0088cc",
                    color: "#005580",
                    background: darkMode
                      ? "rgba(0,136,204,0.15)"
                      : "rgba(0,136,204,0.15)",
                    transform: "translateY(-1px) scale(1.02)",
                    boxShadow: darkMode
                      ? "0 6px 20px rgba(0,136,204,0.25), inset 0 1px 0 rgba(255,255,255,0.12)"
                      : "0 6px 20px rgba(0,136,204,0.2), inset 0 1px 0 rgba(255,255,255,0.7)",
                  },
                  "&:active": {
                    transform: "translateY(0) scale(0.98)",
                  },
                }}
              >
                Open Link
              </Button>
            </Box>
          </DialogContent>
        </Box>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          "& .MuiSnackbarContent-root": {
            minWidth: "auto",
          },
        }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          icon={<OpenInNew />}
          sx={{
            width: "100%",
            background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
            color: "white",
            borderRadius: "12px",
            fontWeight: 500,
            fontSize: "0.95rem",
            boxShadow: "0 4px 20px rgba(76,175,80,0.3)",
            "& .MuiAlert-icon": {
              color: "white",
            },
            "& .MuiAlert-action": {
              color: "white",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserView;
