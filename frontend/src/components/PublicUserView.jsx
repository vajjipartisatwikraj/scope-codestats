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
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
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
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  Home,
  Login,
  AccountCircle,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { useTheme } from "../contexts/ThemeContext";
import { apiUrl } from "../config/apiConfig";
import { normalizeSkillSets } from "../utils/skillSets";
import { normalizeDescriptionPoints } from "../utils/descriptionPoints";

const achievementTypes = [
  { value: "project", label: "Project" },
  { value: "internship", label: "Internship" },
  { value: "certification", label: "Certification" },
  { value: "achievement", label: "Achievement" },
];

const LIMITED_TYPES = ["project", "internship"];

const getYear = (graduationYear) => {
  const currentYear = new Date().getFullYear();
  // Parse graduation year to ensure it's an integer
  const gradYear = parseInt(graduationYear, 10);
  const yearsToGraduation = gradYear - currentYear;

  switch (yearsToGraduation) {
    case 3:
      return "First";
    case 2:
      return "Second";
    case 1:
      return "Third";
    case 0:
      return "Fourth";
    case -1:
    case -2:
    case -3:
    case -4:
      return "Graduated";
    case 4:
      return "Incoming Student";
    default:
      if (yearsToGraduation > 4) {
        return "Future Student";
      } else if (yearsToGraduation < -4) {
        return "Alumni";
      } else {
        return `Year ${4 - yearsToGraduation}`;
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

const PublicUserView = () => {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("project");
  const [activeChartTab, setActiveChartTab] = useState("overall");
  const [profilePicError, setProfilePicError] = useState(false);
  const calendarRef = useRef(null);
  const currentUsernameRef = useRef(null); // Ref to track current username being fetched
  const navigate = useNavigate();

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

  // Liquid Glass Navbar Style
  const getNavbarStyle = () => ({
    background: darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.3) 0%,
          rgba(10, 15, 30, 0.5) 30%,
          rgba(0, 0, 0, 0.6) 70%,
          rgba(5, 10, 20, 0.4) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.7) 0%,
          rgba(248, 252, 255, 0.6) 30%,
          rgba(255, 255, 255, 0.8) 70%,
          rgba(250, 254, 255, 0.5) 100%
        )
      `,
    backdropFilter: "blur(40px) saturate(120%)",
    WebkitBackdropFilter: "blur(40px) saturate(120%)",
    borderBottom: darkMode
      ? "1px solid rgba(255, 255, 255, 0.15)"
      : "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow: darkMode
      ? `
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 4px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(255, 255, 255, 0.1),
        inset 0 -1px 1px rgba(0, 0, 0, 0.1)
      `
      : `
        0 8px 32px rgba(0, 0, 0, 0.08),
        0 4px 16px rgba(0, 0, 0, 0.06),
        inset 0 2px 3px rgba(255, 255, 255, 0.9),
        inset 0 -1px 1px rgba(0, 0, 0, 0.03)
      `,
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1100,
    color: darkMode ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.9)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "10%",
      right: "10%",
      height: "1px",
      background: darkMode
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
    },
  });

  // Navbar Button Style
  const getNavbarButtonStyle = (isPrimary = false) => ({
    background: isPrimary
      ? "linear-gradient(145deg, #0088cc 0%, #005580 100%)"
      : darkMode
        ? `
          linear-gradient(135deg, 
            rgba(0, 0, 0, 0.2) 0%,
            rgba(15, 25, 45, 0.3) 50%,
            rgba(0, 0, 0, 0.4) 100%
          )
        `
        : `
          linear-gradient(135deg, 
            rgba(255, 255, 255, 0.6) 0%,
            rgba(248, 252, 255, 0.5) 50%,
            rgba(255, 255, 255, 0.7) 100%
          )
        `,
    backdropFilter: "blur(20px) saturate(110%)",
    WebkitBackdropFilter: "blur(20px) saturate(110%)",
    border: isPrimary
      ? "1px solid rgba(0, 136, 204, 0.3)"
      : darkMode
        ? "1px solid rgba(255, 255, 255, 0.2)"
        : "1px solid rgba(255, 255, 255, 0.5)",
    borderRadius: "12px",
    color: isPrimary
      ? "white"
      : darkMode
        ? "rgba(255, 255, 255, 0.9)"
        : "rgba(0, 0, 0, 0.8)",
    boxShadow: isPrimary
      ? "0 4px 20px rgba(0, 136, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
      : darkMode
        ? `
          0 4px 16px rgba(0, 0, 0, 0.4),
          0 2px 8px rgba(0, 0, 0, 0.3),
          inset 0 1px 1px rgba(255, 255, 255, 0.1)
        `
        : `
          0 4px 16px rgba(0, 0, 0, 0.06),
          0 2px 8px rgba(0, 0, 0, 0.04),
          inset 0 1px 2px rgba(255, 255, 255, 0.8)
        `,
    fontWeight: 600,
    px: { xs: 2, sm: 3 },
    py: { xs: 0.75, sm: 1 },
    fontSize: { xs: "0.875rem", sm: "1rem" },
    textTransform: "none",
    position: "relative",
    overflow: "hidden",
    minWidth: { xs: "80px", sm: "100px" },
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
      transform: "translateY(-1px) scale(1.02)",
      background: isPrimary
        ? "linear-gradient(145deg, #0077bb 0%, #004470 100%)"
        : darkMode
          ? `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.25) 0%,
              rgba(20, 35, 55, 0.4) 50%,
              rgba(0, 0, 0, 0.45) 100%
            )
          `
          : `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.7) 0%,
              rgba(245, 250, 255, 0.6) 50%,
              rgba(255, 255, 255, 0.8) 100%
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
            0 6px 20px rgba(0, 0, 0, 0.08),
            0 3px 12px rgba(0, 0, 0, 0.06),
            inset 0 2px 3px rgba(255, 255, 255, 0.9)
          `,
    },
    transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
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
    let isCancelled = false;
    const abortController = new AbortController();

    const fetchUserData = async () => {
      console.log("🔄 fetchUserData called for username:", username);

      if (!username) {
        setError("Username is required");
        setLoading(false);
        return;
      }

      // If username hasn't changed and we already have data, skip
      if (currentUsernameRef.current === username && userData && !error) {
        console.log(
          "✅ Already have data for this username, using existing data",
        );
        return;
      }

      currentUsernameRef.current = username;

      // Check cache first
      const cacheKey = `publicUser_${username}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;

          console.log("💾 Checking cached data for username:", username);
          console.log("📅 Cache age (seconds):", Math.round(cacheAge / 1000));

          // Cache is valid for 5 minutes (300000 ms)
          const CACHE_DURATION = 5 * 60 * 1000;

          // Validate cache data structure and freshness
          if (cacheAge < CACHE_DURATION && data && typeof data === "object") {
            console.log("✅ Cache is valid and fresh, using cached data");
            if (!isCancelled) {
              setUserData(data);
              setLoading(false);
              setError(null);
              setProfilePicError(false);
            }
            return; // Exit early, don't make API request
          } else {
            if (cacheAge >= CACHE_DURATION) {
              console.log(
                "⏰ Cache expired (age:",
                Math.round(cacheAge / 1000),
                "s)",
              );
            } else {
              console.log("❌ Cache data structure invalid");
            }
            localStorage.removeItem(cacheKey);
          }
        } catch (error) {
          console.log("🗑️ Error parsing cache, removing:", error.message);
          localStorage.removeItem(cacheKey);
        }
      } else {
        console.log("� No cache found for username:", username);
      }

      // Reset states before making request
      if (!isCancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        console.log("🌐 Making API request for username:", username);
        const response = await axios.get(`${apiUrl}/users/public/${username}`, {
          signal: abortController.signal,
        });

        console.log("✅ Response received for:", username);

        const userData = response.data;
        console.log("✅ Successfully fetched data for:", username);

        // Log the first achievement to verify domainLink is present
        if (userData.achievements && userData.achievements.length > 0) {
          console.log("First achievement data:", userData.achievements[0]);
        }

        let processedUserData;
        if (userData.codingProfiles?.github?.username) {
          // Use the data we already have from the backend
          processedUserData = {
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
          };
        } else {
          processedUserData = userData;
        }

        // Cache the response with timestamp
        try {
          const cacheData = {
            data: processedUserData,
            timestamp: Date.now(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log(
            "💾 Successfully cached user data (expires in 5 minutes)",
          );
        } catch (cacheError) {
          console.warn("⚠️ Failed to cache data:", cacheError.message);
          // Continue even if caching fails
        }

        if (!isCancelled) {
          console.log("🎯 Setting user data and completing load");
          setUserData(processedUserData);
          setProfilePicError(false);
          setLoading(false);
        }
      } catch (err) {
        // Ignore abort errors (component unmounted)
        if (err.name === "CanceledError" || err.name === "AbortError") {
          console.log("🚫 Request aborted (component unmounted)");
          return;
        }

        console.error("❌ Error fetching user data for:", username, err);

        if (!isCancelled) {
          const errorMessage =
            err.response?.data?.message ||
            err.message ||
            "Failed to load user profile";
          setError(errorMessage);

          if (err.response?.status === 404) {
            setError("User not found");
          } else if (err.response?.status === 429) {
            setError("Too many requests. Please wait a moment and try again.");
          }

          setLoading(false);
        }
      }
    };

    fetchUserData();

    // Cleanup function to abort request and mark as cancelled
    return () => {
      isCancelled = true;
      abortController.abort();
    };
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
              zIndex: 1000,
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
    <>
      {/* Liquid Glass Navbar */}
      <AppBar position="fixed" elevation={0} sx={getNavbarStyle()}>
        <Toolbar
          sx={{
            justifyContent: "space-between",
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 0.5, sm: 1 },
            minHeight: { xs: "50px", sm: "60px" },
          }}
        >
          {/* Left side - Logo and Brand */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            {/* Logo */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                position: "relative",
              }}
            >
              <img
                src="/scope-blac.png"
                alt="SCOPE"
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "32px",
                  maxHeight: "32px",
                  objectFit: "contain",
                  transition: "all 0.3s ease",
                }}
              />
            </Box>

            {/* Brand Text */}
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: { sm: "1.25rem", md: "1.35rem" },
                  color: darkMode ? "#fff" : "#101010",
                  letterSpacing: "0.5px",
                  lineHeight: 1,
                }}
              >
                C{"<>"}destats
              </Typography>
            </Box>

            {/* Mobile Brand */}
            <Box sx={{ display: { xs: "block", sm: "none" } }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: darkMode ? "#fff" : "#101010",
                  letterSpacing: "0.5px",
                }}
              >
                C{"<>"}destats
              </Typography>
            </Box>
          </Box>

          {/* Right side - Action Buttons */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            {/* Home Button */}
            <Button
              onClick={() => navigate("/")}
              startIcon={<Home />}
              sx={getNavbarButtonStyle(false)}
            >
              <Box sx={{ display: { xs: "none", sm: "block" } }}>Home</Box>
            </Button>

            {/* Login Button */}
            <Button
              onClick={() => navigate("/login")}
              startIcon={<Login />}
              sx={getNavbarButtonStyle(true)}
            >
              Login
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content with Navbar Spacing */}
      <Box sx={{ pt: { xs: "70px", sm: "80px" } }}>
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

                <Grid container spacing={3}>
                  <Grid
                    item
                    xs={12}
                    sm={3}
                    md={2}
                    sx={{ position: "relative" }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <Box
                        sx={{
                          width: { xs: 80, sm: 120, md: 150 },
                          height: { xs: 80, sm: 120, md: 150 },
                          borderRadius: "50%",
                          bgcolor: "#0088cc",
                          border: `4px solid ${
                            darkMode ? "#1a1a1a" : "#ffffff"
                          }`,
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
                        {userData.profilePicture && !profilePicError ? (
                          <img
                            src={userData.profilePicture}
                            alt={userData.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              console.error(
                                "Profile picture failed to load:",
                                userData.profilePicture,
                              );
                              setProfilePicError(true);
                            }}
                            onLoad={() =>
                              console.log(
                                "Profile picture loaded successfully:",
                                userData.profilePicture,
                              )
                            }
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "3rem",
                              fontWeight: 600,
                              color: "#ffffff",
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            }}
                          >
                            {userData.name?.charAt(0).toUpperCase() || "?"}
                          </Box>
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
                        {userData.department} • {userData.section}
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
                  sx={{
                    fontWeight: 600,
                    color: darkMode ? "#fff" : "#000",
                    mb: 3,
                  }}
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
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {userData.codingProfiles?.leetcode?.username && (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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

            {/* Right Section */}
            <Grid
              item
              xs={12}
              md={8}
              sx={{
                order: { xs: 3, md: 2 },
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Profile Section */}
              <Paper
                sx={{
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  ...getStatsCardStyle(),
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
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
                                  filter="url(#filter0_f_rank_total)"
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
                                    id="filter0_f_rank_total"
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
                                      filter="url(#filter0_f_rank_overall)"
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
                                        id="filter0_f_rank_overall"
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
                                      filter="url(#filter0_f_rank_dept)"
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
                                        id="filter0_f_rank_dept"
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
                  variant="h5"
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
                  Coding Profiles
                </Typography>

                {/* Pie Charts Section */}
                <Box sx={{ mt: 3 }}>
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
                    sx={{ position: "relative", height: 400, width: "100%" }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
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
                            zIndex: 1000,
                          }}
                          labelStyle={{
                            fontWeight: "bold",
                            marginBottom: "6px",
                            color: "#0088cc",
                          }}
                          wrapperStyle={{
                            outline: "none",
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
                          iconSize={10}
                          wrapperStyle={{
                            fontSize: "12px",
                            paddingTop: "20px",
                            color: getTextColor(0.9),
                          }}
                          formatter={(value, entry) => (
                            <span
                              style={{
                                color: getTextColor(0.9),
                                fontWeight: 500,
                                padding: "4px 8px",
                                cursor: "pointer",
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
                        top: "45%", // Adjusted to account for legend at bottom
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        width: isMobile ? "100px" : "120px",
                        height: isMobile ? "100px" : "120px",
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
                          fontSize: isMobile ? "1.8rem" : "2.2rem",
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
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
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
            <Grid item xs={12} sx={{ order: { xs: 4, md: 3 } }}>
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
                                height: "100%",
                                minHeight: "220px",
                                flexShrink: 0,
                                position: "relative",
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
                                            bgcolor: darkMode
                                              ? "rgba(0, 136, 204, 0.1)"
                                              : "rgba(0, 136, 204, 0.05)",
                                            color: "#0088cc",
                                            border:
                                              "1px solid rgba(0, 136, 204, 0.2)",
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
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default PublicUserView;
