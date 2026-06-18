import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Card,
  Avatar,
  Grid,
  Chip,
  Button,
  Stack,
  Zoom,
  InputBase,
} from "@mui/material";
import {
  Search,
  FilterList,
  EmojiEvents,
  School,
  WorkspacePremium,
  LocalFireDepartment,
  Code,
  ArrowUpward,
  ArrowDownward,
  ArrowBack,
  ArrowForward,
  Close,
  Public,
  Group,
  Refresh,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/apiConfig";
import {
  getAcademicYearConfig,
  getAcademicYearForGraduation,
  getDisplayNameForGraduation,
  getAllAcademicYears,
} from "../utils/academicYearConfig";

const departments = [
  "ALL",
  "CSE",
  "CSC",
  "CSD",
  "ECE",
  "IT",
  "CSM",
  "CSIT",
  "AERO",
  "MECH",
  "OTHER",
];

const platforms = {
  leetcode: "LeetCode",
  hackerrank: "HackerRank",
  codechef: "CodeChef",
  codeforces: "CodeForces",
  github: "GitHub",
  scopecodestats: "Scope-CodeStats",
};

const platformColors = {
  leetcode: "#ffa116",
  hackerrank: "#00ab6c",
  codechef: "#5b4638",
  codeforces: "#1f8acb",
  github: "#2dba4e",
  scopecodestats: "#4503fc",
};

const getProfileImageUrl = (profilePicture) => {
  if (!profilePicture) return null;

  // If it's already a full URL, return as is
  if (profilePicture.startsWith("http") || profilePicture.startsWith("data:")) {
    return profilePicture;
  }

  // If it's a relative path, construct the full URL
  return `${apiUrl}/${profilePicture}`;
};

// Calculate student year from graduation year
const getStudentYear = (graduatingYear, config) => {
  if (!graduatingYear) return "-";

  // Use config-based lookup if available (returns academicYear like "First Year")
  if (config && config.yearMappings) {
    return getAcademicYearForGraduation(graduatingYear, config);
  }

  // Fallback to default logic
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 3 = April)

  // Academic year logic: Academic year runs from April to March
  // If we've crossed April (month >= 3), students advance to next academic year
  // If we haven't crossed April (month < 3), still in previous academic year
  let yearsToGraduation;
  if (currentMonth >= 3) {
    // April or later (new academic year has started)
    yearsToGraduation = graduatingYear - currentYear;
  } else {
    // Before April (still in previous academic year)
    yearsToGraduation = graduatingYear - currentYear + 1;
  }

  switch (yearsToGraduation) {
    case 4:
      return "First Year";
    case 3:
      return "Second Year";
    case 2:
      return "Third Year";
    case 1:
      return "Fourth Year";
    case 0:
    case -1:
    case -2:
    case -3:
    case -4:
      return "Graduated";
    default:
      return "Graduated"; // Simplified to only show specified years
  }
};

// Get display name for showing in UI (e.g., "I Year", "II Year")
const getStudentYearDisplay = (graduatingYear, config) => {
  if (!graduatingYear) return "-";

  // Use config-based display name if available
  if (config && config.yearMappings) {
    return getDisplayNameForGraduation(graduatingYear, config);
  }

  // Fallback - just return the academic year
  return getStudentYear(graduatingYear, config);
};

// Add platform groupings for each leaderboard type
const leaderboardConfigs = {
  problems: {
    title: "Problems Solved Leaderboard",
    platforms: [
      "leetcode",
      "hackerrank",
      "codechef",
      "codeforces",
      "scopecodestats", // Added scopecodestats platform
    ],
    valueKey: "problemsSolved",
    label: "Problems Solved",
  },
  score: {
    title: "Score Leaderboard",
    // Use explicit array instead of Object.keys to ensure all platforms are included
    platforms: [
      "leetcode",
      "codechef",
      "hackerrank",
      "codeforces",
      "github",
      "scopecodestats",
    ],
    valueKey: "totalScore",
    label: "Total Score",
  },
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("totalScore");
  const [sortOrder, setSortOrder] = useState("desc");
  const [department, setDepartment] = useState("ALL");
  const [year, setYear] = useState("ALL");
  const [section, setSection] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [leaderboardType, setLeaderboardType] = useState("score");
  const [currentUserData, setCurrentUserData] = useState(null);
  const [academicYearConfig, setAcademicYearConfig] = useState(null);
  const { token, user: currentAuthUser } = useAuth();
  const { darkMode } = useTheme();

  // Fetch academic year configuration
  useEffect(() => {
    const fetchConfig = async () => {
      if (token) {
        const config = await getAcademicYearConfig(token);
        setAcademicYearConfig(config);
      }
    };
    fetchConfig();
  }, [token]);

  // Reload config when navigating back to leaderboard (e.g., from admin page)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && token) {
        // Clear cache and reload to get fresh data
        const { clearConfigCache } =
          await import("../utils/academicYearConfig");
        clearConfigCache();
        const config = await getAcademicYearConfig(token);
        setAcademicYearConfig(config);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [token]);

  // Memoized theme-dependent styles
  const scrollbarStyles = useMemo(
    () => ({
      "&::-webkit-scrollbar": {
        width: "10px",
        height: "10px",
      },
      "&::-webkit-scrollbar-track": {
        backgroundColor: darkMode
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 136, 204, 0.05)",
        borderRadius: "10px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: darkMode
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(0, 136, 204, 0.4)",
        borderRadius: "10px",
        "&:hover": {
          backgroundColor: darkMode
            ? "rgba(255, 255, 255, 0.3)"
            : "rgba(0, 136, 204, 0.6)",
        },
      },
    }),
    [darkMode],
  );

  const dropdownScrollbarStyles = useMemo(
    () => ({
      "&::-webkit-scrollbar": {
        width: "4px",
      },
      "&::-webkit-scrollbar-track": {
        background: darkMode ? "transparent" : "rgba(0, 0, 0, 0.05)",
        marginTop: "4px",
        marginBottom: "4px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: darkMode
          ? "rgba(61, 61, 61, 0.5)"
          : "rgba(0, 0, 0, 0.3)",
        borderRadius: "10px",
      },
      "&::-webkit-scrollbar-thumb:hover": {
        backgroundColor: darkMode
          ? "rgba(61, 61, 61, 0.7)"
          : "rgba(0, 0, 0, 0.5)",
      },
      scrollbarWidth: "thin",
      scrollbarColor: `${
        darkMode ? "rgba(61, 61, 61, 0.5)" : "rgba(0, 0, 0, 0.3)"
      } ${darkMode ? "transparent" : "rgba(0, 0, 0, 0.05)"}`,
    }),
    [darkMode],
  );

  const dropdownThemeColors = useMemo(
    () => ({
      menuBg: darkMode ? "#0A0A0A" : "#ffffff",
      menuBorder: darkMode ? "#131313" : "rgba(0, 0, 0, 0.1)",
      menuShadow: darkMode
        ? "0 4px 20px rgba(0, 0, 0, 0.5)"
        : "0 4px 20px rgba(0, 0, 0, 0.1)",
      hoverBg: darkMode ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.04)",
      selectedBg: darkMode
        ? "rgba(0, 136, 204, 0.3)"
        : "rgba(0, 136, 204, 0.1)",
      itemText: darkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
    }),
    [darkMode],
  );

  // Update the getPlatformDataValue helper function to check data sources correctly
  const getPlatformDataValue = useCallback((user, platform, key) => {
    if (!user) return 0;

    // Special handling for scopecodestats - calculate total
    if (platform === "scopecodestats") {
      if (key === "problemsSolved") {
        // Sum all platform problems except github
        const platforms = ["leetcode", "codechef", "codeforces", "hackerrank"];
        let total = 0;
        platforms.forEach((p) => {
          if (user.platforms && user.platforms[p]) {
            const val =
              user.platforms[p].problemsSolved ||
              user.platforms[p].totalSolved ||
              0;
            total += parseInt(val) || 0;
          }
          if (user.platformScores && user.platformScores[p]) {
            const val = user.platformScores[p].problemsSolved || 0;
            total += parseInt(val) || 0;
          }
        });
        return total;
      }
      if (key === "totalScore") {
        // Sum all platform scores
        const platforms = [
          "leetcode",
          "codechef",
          "codeforces",
          "hackerrank",
          "github",
        ];
        let total = 0;
        platforms.forEach((p) => {
          if (user.platforms && user.platforms[p]) {
            const val = user.platforms[p].score || 0;
            total += parseInt(val) || 0;
          }
          if (user.platformScores && user.platformScores[p]) {
            const val = user.platformScores[p].score || 0;
            total += parseInt(val) || 0;
          }
        });
        return total;
      }
    }

    // First check in user.platforms (from users collection - platformData in backend)
    if (user.platforms && user.platforms[platform]) {
      const platformData = user.platforms[platform];

      // Check for direct property match
      if (platformData[key] !== undefined && platformData[key] !== null) {
        return parseInt(platformData[key]) || 0;
      }

      // Special case for totalSolved in LeetCode -> problemsSolved
      if (key === "problemsSolved" && platformData.totalSolved !== undefined) {
        return parseInt(platformData.totalSolved) || 0;
      }

      // Special case for contests in various platforms
      if (key === "contestsParticipated") {
        const contestsValue =
          platformData.contestsParticipated ||
          platformData.contests ||
          platformData.attendedContestsCount ||
          0;
        return parseInt(contestsValue) || 0;
      }

      // Special case for ratings
      if (key === "rating") {
        const ratingValue =
          platformData.rating ||
          platformData.contestRating ||
          platformData.currentRating ||
          platformData.maxRating ||
          platformData.ratingHistory?.[
            (platformData.ratingHistory?.length || 0) - 1
          ]?.rating ||
          0;

        return parseInt(ratingValue) || 0;
      }
    }

    // Then check in platformScores (from profiles collection) as fallback
    if (user.platformScores && user.platformScores[platform]) {
      const platformData = user.platformScores[platform];

      // For leaderboard sorting, match what's displayed in the table
      // Check for 'problemsSolved' key for problems leaderboard
      if (
        key === "problemsSolved" &&
        platformData.problemsSolved !== undefined
      ) {
        return parseInt(platformData.problemsSolved) || 0;
      }

      // Check for 'score' key for score leaderboard
      if (key === "totalScore" && platformData.score !== undefined) {
        return parseInt(platformData.score) || 0;
      }

      // Check for direct property match
      if (platformData[key] !== undefined && platformData[key] !== null) {
        return parseInt(platformData[key]) || 0;
      }

      // Special handling for rating in profiles
      if (key === "rating" && platformData.rating !== undefined) {
        const ratingValue = platformData.rating;
        return parseInt(ratingValue) || 0;
      }

      // Check if the key is in details
      if (platformData.details && platformData.details[key] !== undefined) {
        const detailValue = platformData.details[key];
        return parseInt(detailValue) || 0;
      }
    }

    return 0;
  }, []);

  // Fetch data only once on component mount or leaderboard type change
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchLeaderboard();
  }, [leaderboardType, token]); // Only refetch when leaderboard type changes

  // Filter and sort users based on current filter states
  useEffect(() => {
    let filtered = [...users];

    // By default, exclude graduated users unless specifically filtered
    if (year !== "Graduated") {
      filtered = filtered.filter((user) => {
        const studentYear = getStudentYear(
          user.graduatingYear,
          academicYearConfig,
        );
        return studentYear !== "Graduated";
      });
    }

    // Apply filters
    if (department !== "ALL") {
      filtered = filtered.filter((user) => user.department === department);
    }

    if (section !== "All") {
      filtered = filtered.filter((user) => user.section === section);
    }

    if (year !== "ALL") {
      filtered = filtered.filter((user) => {
        const studentYear = getStudentYear(
          user.graduatingYear,
          academicYearConfig,
        );
        return studentYear === year;
      });
    }

    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((user) => {
        const name = (user.name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const rollNumber = (user.rollNumber || "").toLowerCase();

        return (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          rollNumber.includes(searchLower)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;

      // Get the correct values based on sort field
      if (sortBy === "name") {
        valueA = (a.name || "").toLowerCase();
        valueB = (b.name || "").toLowerCase();
      } else if (sortBy === "department") {
        valueA = a.department || "";
        valueB = b.department || "";
      } else if (sortBy === "section") {
        valueA = a.section || "";
        valueB = b.section || "";
      } else if (sortBy === "rollNumber") {
        valueA = (a.rollNumber || "").toLowerCase();
        valueB = (b.rollNumber || "").toLowerCase();
      } else if (sortBy === "graduatingYear") {
        valueA = a.graduatingYear || 0;
        valueB = b.graduatingYear || 0;
      } else if (sortBy === "totalScore") {
        valueA = a.totalScore || 0;
        valueB = b.totalScore || 0;
      } else if (sortBy === "problemsSolved") {
        valueA = a.problemsSolved || 0;
        valueB = b.problemsSolved || 0;
      } else if (sortBy === "scopeScore") {
        valueA = a.scopeScore || 0;
        valueB = b.scopeScore || 0;
      } else if (sortBy === "scoreChange") {
        valueA = (a.totalScore || 0) - (a.sevenDayScore || 0);
        valueB = (b.totalScore || 0) - (b.sevenDayScore || 0);
      } else if (sortBy === "consistencyIndex") {
        valueA = a.consistencyIndex || 0;
        valueB = b.consistencyIndex || 0;
      } else if (sortBy.startsWith("platform_")) {
        // Handle platform-specific sorting
        const platform = sortBy.replace("platform_", "");
        const config = leaderboardConfigs[leaderboardType];
        const valueKey = config.valueKey;

        // Get platform data value based on leaderboard type
        valueA = Number(getPlatformDataValue(a, platform, valueKey)) || 0;
        valueB = Number(getPlatformDataValue(b, platform, valueKey)) || 0;
      } else {
        valueA = a[sortBy] || 0;
        valueB = b[sortBy] || 0;
      }

      // Handle string vs numeric comparison
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "desc"
          ? valueB.localeCompare(valueA)
          : valueA.localeCompare(valueB);
      } else {
        // Ensure numeric comparison
        const numA = Number(valueA) || 0;
        const numB = Number(valueB) || 0;
        return sortOrder === "desc" ? numB - numA : numA - numB;
      }
    });

    // Update filtered users with new ranks based on filtered data
    const filteredWithRanks = filtered.map((user, index) => ({
      ...user,
      filteredRank: index + 1,
    }));

    setFilteredUsers(filteredWithRanks);
    setPage(1); // Reset to first page when filters change
  }, [
    users,
    department,
    section,
    year,
    searchTerm,
    sortBy,
    sortOrder,
    leaderboardType,
    getPlatformDataValue,
  ]);

  const fetchLeaderboard = useCallback(async () => {
    if (!token) return;

    try {
      setError("");
      // Only show full loading on initial load (when users array is empty)
      if (users.length === 0) {
        setLoading(true);
      } else {
        // Show subtle refreshing indicator for subsequent loads
        setRefreshing(true);
      }

      // Determine the sort field based on leaderboard type
      const config = leaderboardConfigs[leaderboardType];
      const sortField = config.valueKey;

      const params = new URLSearchParams({
        sortBy: sortField,
        order: "desc", // Always fetch in descending order, we'll sort client-side
        leaderboardType,
        includeUserData: "true",
        includePlatformDetails: "true",
        fields: "contestsParticipated,rating,problemsSolved,score,totalScore",
        debug: "true",
      });

      const res = await axios.get(`${apiUrl}/leaderboard?${params}`, {
        headers: { "x-auth-token": token },
      });

      // Process the data to handle both users and profiles collections
      const processedData = res.data.map((user) => {
        // Calculate totals for all platforms
        let totalContests = 0;
        let highestRating = 0;
        let totalRating = 0;
        let totalProblemsSolved = 0;

        // Process platform data from both collections
        const allPlatforms = leaderboardConfigs.problems.platforms;

        // First, check the user.platforms (from users collection) for data
        if (user.platforms) {
          allPlatforms.forEach((platform) => {
            if (!user.platforms[platform]) return;

            const platformData = user.platforms[platform];

            // For all platforms including scopecodestats, use problemsSolved
            const problemsValue =
              platformData.problemsSolved || platformData.totalSolved || 0;
            totalProblemsSolved += parseInt(problemsValue) || 0;

            let contestsValue =
              platformData.contestsParticipated || platformData.contests || 0;
            let ratingValue =
              platformData.rating || platformData.maxRating || 0;

            totalContests += parseInt(contestsValue) || 0;
            if (parseInt(ratingValue) > 0) {
              totalRating += parseInt(ratingValue) || 0;
              highestRating = Math.max(
                highestRating,
                parseInt(ratingValue) || 0,
              );
            }
          });
        }

        // Also check platformScores (from profiles collection) for platforms not already counted
        if (user.platformScores) {
          allPlatforms.forEach((platform) => {
            if (!user.platforms?.[platform] && user.platformScores[platform]) {
              const platformData = user.platformScores[platform];

              // For all platforms including scopecodestats, use problemsSolved
              const problemsValue = platformData.problemsSolved || 0;
              totalProblemsSolved += parseInt(problemsValue) || 0;

              const contestsValue = platformData.contestsParticipated || 0;
              totalContests += parseInt(contestsValue) || 0;

              const ratingValue = platformData.rating || 0;
              if (parseInt(ratingValue) > 0) {
                totalRating += parseInt(ratingValue) || 0;
                highestRating = Math.max(
                  highestRating,
                  parseInt(ratingValue) || 0,
                );
              }
            }
          });
        }

        return {
          ...user,
          problemsSolved: totalProblemsSolved,
          totalContestsParticipated: totalContests,
          highestRating: highestRating,
          totalRating: totalRating,
        };
      });

      // Ensure the data is sorted correctly in the frontend
      const sortedData = [...processedData].sort((a, b) => {
        let valueA, valueB;

        // Get the correct values based on leaderboard type
        if (leaderboardType === "score") {
          valueA = a.totalScore || 0;
          valueB = b.totalScore || 0;
        } else if (leaderboardType === "problems") {
          valueA = a.problemsSolved || 0;
          valueB = b.problemsSolved || 0;
        } else if (leaderboardType === "contests") {
          valueA = a.totalContestsParticipated || 0;
          valueB = b.totalContestsParticipated || 0;
        } else if (leaderboardType === "rating") {
          // Use total rating for sorting in the rating leaderboard
          valueA = a.totalRating || 0;
          valueB = b.totalRating || 0;
        } else if (sortBy === "scoreChange") {
          // Special handling for score change calculation
          valueA = (a.totalScore || 0) - (a.sevenDayScore || 0);
          valueB = (b.totalScore || 0) - (b.sevenDayScore || 0);
        } else if (sortBy === "consistencyIndex") {
          valueA = a.consistencyIndex || 0;
          valueB = b.consistencyIndex || 0;
        } else {
          valueA = a[sortBy] || 0;
          valueB = b[sortBy] || 0;
        }

        // Sort in the requested order
        return sortOrder === "desc" ? valueB - valueA : valueA - valueB;
      });

      // Calculate overall ranks with PROPER TIE HANDLING
      // Users with the same score get the same rank (standard competition ranking)
      let currentRank = 0;
      let lastScore = null;
      const usersWithRanks = sortedData.map((user, index) => {
        const userScore =
          leaderboardType === "score"
            ? user.totalScore || 0
            : leaderboardType === "problems"
              ? user.problemsSolved || 0
              : leaderboardType === "contests"
                ? user.totalContestsParticipated || 0
                : leaderboardType === "rating"
                  ? user.totalRating || 0
                  : user.totalScore || 0;

        if (userScore !== lastScore) {
          currentRank = index + 1;
          lastScore = userScore;
        }
        return {
          ...user,
          overallRank: currentRank,
        };
      });

      // Calculate department-specific ranks with PROPER TIE HANDLING
      const departmentRanks = {};
      departments.forEach((dept) => {
        if (dept !== "ALL") {
          const deptUsers = usersWithRanks.filter((u) => u.department === dept);
          let deptCurrentRank = 0;
          let deptLastScore = null;
          deptUsers.forEach((user, index) => {
            const userScore =
              leaderboardType === "score"
                ? user.totalScore || 0
                : leaderboardType === "problems"
                  ? user.problemsSolved || 0
                  : leaderboardType === "contests"
                    ? user.totalContestsParticipated || 0
                    : leaderboardType === "rating"
                      ? user.totalRating || 0
                      : user.totalScore || 0;

            if (userScore !== deptLastScore) {
              deptCurrentRank = index + 1;
              deptLastScore = userScore;
            }
            if (!departmentRanks[user._id]) departmentRanks[user._id] = {};
            departmentRanks[user._id][dept] = deptCurrentRank;
          });
        }
      });

      // Add department ranks to users
      const usersWithAllRanks = usersWithRanks.map((user) => ({
        ...user,
        departmentRank: departmentRanks[user._id]?.[user.department] || "-",
      }));

      setUsers(usersWithAllRanks);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to fetch leaderboard";
      setError(message);
      toast.error(message);
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, leaderboardType, users.length]);

  // Calculate paginated users for display
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, page, rowsPerPage]);

  // Find current user in leaderboard data
  const findCurrentUserInLeaderboard = useCallback(
    (leaderboardData) => {
      if (!currentAuthUser || !leaderboardData.length) return null;

      // First try to find by email
      let userData = leaderboardData.find(
        (u) => u.email === currentAuthUser.email,
      );

      // If not found by email, try by rollNumber if available
      if (!userData && currentAuthUser.rollNumber) {
        userData = leaderboardData.find(
          (u) =>
            u.rollNumber &&
            u.rollNumber.toLowerCase() ===
              currentAuthUser.rollNumber.toLowerCase(),
        );
      }

      return userData;
    },
    [currentAuthUser],
  );

  // Handle page change with scroll to top
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    // Scroll to the leaderboard table
    const leaderboardTable = document.getElementById("leaderboard-table");
    if (leaderboardTable) {
      leaderboardTable.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  // Memoized callback functions to prevent unnecessary re-renders
  const handleFilterChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      switch (name) {
        case "department":
          setDepartment(value);
          break;
        case "section":
          setSection(value);
          break;
        case "year":
          setYear(value);
          break;
        case "sortBy":
          setSortBy(value);
          break;
        case "sortOrder":
          setSortOrder(value);
          break;
        default:
          break;
      }
      handlePageChange(1); // Reset to first page when filters change
    },
    [handlePageChange],
  );

  const handleSort = useCallback(
    (field) => {
      const actualField = field === "year" ? "graduatingYear" : field;

      if (sortBy === actualField) {
        if (sortOrder === "desc") {
          // Second click: switch to ascending
          setSortOrder("asc");
        } else if (sortOrder === "asc") {
          // Third click: return to default
          setSortBy("totalScore");
          setSortOrder("desc");
        }
      } else {
        // First click on a new column: sort descending
        setSortBy(actualField);
        setSortOrder("desc");
      }
    },
    [sortBy, sortOrder],
  );

  const handleLeaderboardTypeChange = useCallback(
    (type) => {
      setLeaderboardType(type);

      // Reset to default sort (totalScore descending)
      setSortBy("totalScore");
      setSortOrder("desc");

      handlePageChange(1);
    },
    [handlePageChange],
  );

  const handleUserClick = useCallback((email) => {
    if (!email) return;
    const username = email.split("@")[0];
    const url = `/user-view/${username}`;
    window.open(url, "_blank");
  }, []);

  // Memoized SortIcon component
  const SortIcon = React.memo(({ field }) => {
    const actualField = field === "year" ? "graduatingYear" : field;
    if (sortBy !== actualField) return null;
    return sortOrder === "asc" ? (
      <ArrowUpward fontSize="small" />
    ) : (
      <ArrowDownward fontSize="small" />
    );
  });

  // Memoized StatsCard component
  const StatsCard = React.memo(({ title, value, icon: Icon, color }) => (
    <Card
      sx={{
        bgcolor: darkMode ? "rgba(23, 23, 23, 0.45)" : "#ffffff",
        p: 2,
        borderRadius: 3,
        border: darkMode
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        boxShadow: darkMode ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: `${color}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon sx={{ color: color }} />
      </Box>
      <Box>
        <Typography
          variant="body2"
          sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
        >
          {title}
        </Typography>
        <Typography
          variant="h6"
          sx={{ color: darkMode ? "white" : "black", fontWeight: 600 }}
        >
          {value}
        </Typography>
      </Box>
    </Card>
  ));

  // Memoized TopThreeCard component
  const TopThreeCard = React.memo(({ user, rank, delay, leaderboardType }) => {
    const [profileImage, setProfileImage] = useState("");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      // Set profile image from user data or default
      setProfileImage(getProfileImageUrl(user.profilePicture));

      // Sequential animation timing
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);

      return () => clearTimeout(timer);
    }, [user.email, user.profilePicture, delay]);

    const colors = ["#FF8C00", "#4CAF50", "#2196F3"]; // Orange, Green, Blue
    const icons = [WorkspacePremium, EmojiEvents, LocalFireDepartment];
    const Icon = icons[rank - 1];
    const config = leaderboardConfigs[leaderboardType];

    // Get the value and label based on leaderboard type
    const getValue = () => {
      if (leaderboardType === "score") {
        return user.totalScore || 0;
      } else if (leaderboardType === "problems") {
        return user.problemsSolved || 0;
      } else if (leaderboardType === "contests") {
        return user.totalContestsParticipated || 0;
      } else if (leaderboardType === "rating") {
        return user.totalRating || 0;
      }

      return 0;
    };

    // Get platform-specific values based on leaderboard type
    const getPlatformValues = () => {
      return config.platforms
        .map((platform) => {
          let value = 0;

          if (leaderboardType === "problems") {
            value = getPlatformDataValue(user, platform, "problemsSolved");
          } else if (leaderboardType === "contests") {
            value = getPlatformDataValue(
              user,
              platform,
              "contestsParticipated",
            );
          } else if (leaderboardType === "rating") {
            value = getPlatformDataValue(user, platform, "rating");
          } else {
            // For score leaderboard
            value = getPlatformDataValue(user, platform, "score");
          }

          return {
            platform,
            value,
          };
        })
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value); // Show highest values first
    };

    const platformValues = getPlatformValues();

    // Determine sizes based on rank
    const isFirstPlace = rank === 1;

    return (
      <Zoom
        in={isVisible}
        style={{
          transformOrigin: "center",
        }}
        timeout={250}
      >
        <Card
          sx={{
            p: { xs: isFirstPlace ? 2 : 1.5, sm: isFirstPlace ? 3 : 2 },
            pt: { xs: isFirstPlace ? 3 : 2, sm: isFirstPlace ? 4 : 3 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: darkMode
              ? `linear-gradient(135deg, ${
                  colors[rank - 1]
                }22 0%, #1a1a1a 100%)`
              : `linear-gradient(135deg, ${
                  colors[rank - 1]
                }22 0%, #ffffff 100%)`,
            border: darkMode
              ? `3px solid ${colors[rank - 1]}70`
              : `3px solid ${colors[rank - 1]}`,
            borderRadius: "24px",
            position: "relative",
            overflow: "visible",
            boxShadow: `0 8px 32px ${colors[rank - 1]}22`,
            transform: isFirstPlace ? { sm: "scale(1.05)" } : "none",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            "&:hover": {
              transform: {
                sm: isFirstPlace
                  ? "translateY(-8px) scale(1.05)"
                  : "translateY(-8px)",
              },
              boxShadow: `0 12px 40px ${colors[rank - 1]}33`,
            },
            mt: 6,
            height: {
              xs: isFirstPlace ? 520 : 460,
              sm: isFirstPlace ? 580 : 510,
            },
            maxWidth: isFirstPlace ? "100%" : "90%",
            mx: "auto",
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Trophy Icon Badge */}
          <Box
            sx={{
              position: "absolute",
              top: -25,
              left: "50%",
              transform: "translateX(-50%)",
              width: isFirstPlace ? 50 : 40,
              height: isFirstPlace ? 50 : 40,
              borderRadius: "50%",
              bgcolor: colors[rank - 1],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 20px ${colors[rank - 1]}66`,
              zIndex: 2,
              border: `3px solid ${darkMode ? "#1a1a1a" : "#ffffff"}`,
            }}
          >
            <Icon
              sx={{
                fontSize: isFirstPlace ? 28 : 22,
                color: darkMode ? "#1a1a1a" : "#ffffff",
              }}
            />
          </Box>

          <Box sx={{ height: isFirstPlace ? 35 : 30, width: "100%" }} />

          {/* Rank Badge */}
          <Box
            sx={{
              width: isFirstPlace ? 80 : 70,
              height: isFirstPlace ? 36 : 32,
              borderRadius: 20,
              bgcolor: colors[rank - 1],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 10px rgba(0,0,0,0.3)`,
              border: `2px solid ${darkMode ? "#1a1a1a" : "#ffffff"}`,
              zIndex: 3,
              fontWeight: "bold",
              fontSize: isFirstPlace ? "1rem" : "0.9rem",
              color: "#ffffff",
              mb: isFirstPlace ? 1.5 : 1,
            }}
          >
            Rank: {rank}
          </Box>

          <Avatar
            alt={user.name}
            src={profileImage}
            sx={{
              width: {
                xs: isFirstPlace ? 65 : 55,
                sm: isFirstPlace ? 75 : 65,
                md: isFirstPlace ? 90 : 75,
              },
              height: {
                xs: isFirstPlace ? 65 : 55,
                sm: isFirstPlace ? 75 : 65,
                md: isFirstPlace ? 90 : 75,
              },
              border: `4px solid ${
                ["#FFD700", "#C0C0C0", "#CD7F32"][rank - 1]
              }`,
              boxShadow: `0 2px 10px ${
                ["#FFD700", "#C0C0C0", "#CD7F32"][rank - 1]
              }50`,
              mb: isFirstPlace ? 2 : 1.5,
              position: "relative",
              zIndex: 1,
            }}
          />

          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 1,
              textAlign: "center",
              color: darkMode ? "white" : "rgba(0,0,0,0.87)",
              width: "100%",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.3,
              minHeight: isFirstPlace ? "3.9em" : "3.6em",
              px: 1,
              fontSize: {
                xs: isFirstPlace ? "0.95rem" : "0.85rem",
                sm: isFirstPlace ? "1.1rem" : "0.95rem",
              },
            }}
          >
            {user.name}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              mb: 2,
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 0.5,
              px: 1,
            }}
          >
            <Chip
              label={user.department}
              size="small"
              sx={{
                bgcolor: `${colors[rank - 1]}22`,
                color: colors[rank - 1],
                fontWeight: 500,
                m: 0.5,
                fontSize: isFirstPlace ? "0.7rem" : "0.65rem",
                height: isFirstPlace ? 20 : 18,
              }}
            />
            <Chip
              label={user.section}
              size="small"
              sx={{
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.07)",
                color: darkMode ? "white" : "rgba(0,0,0,0.7)",
                m: 0.5,
                fontSize: isFirstPlace ? "0.7rem" : "0.65rem",
                height: isFirstPlace ? 20 : 18,
              }}
            />
          </Stack>

          <Box
            sx={{
              display: "flex",
              gap: isFirstPlace ? 2 : 1.5,
              mb: 2,
              flexWrap: "wrap",
              justifyContent: "center",
              maxHeight: isFirstPlace ? 90 : 80,
              overflow: "auto",
              width: "100%",
              px: 1,
              ...scrollbarStyles,
            }}
          >
            {platformValues.length > 0 ? (
              platformValues.map(({ platform, value }) => (
                <Tooltip
                  key={platform}
                  title={`${platforms[platform]}: ${value}`}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      bgcolor: `${platformColors[platform]}22`,
                      color: platformColors[platform],
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: isFirstPlace ? "0.7rem" : "0.65rem",
                    }}
                  >
                    <Box
                      sx={{
                        width: isFirstPlace ? 5 : 4,
                        height: isFirstPlace ? 5 : 4,
                        borderRadius: "50%",
                        bgcolor: platformColors[platform],
                      }}
                    />
                    {value}
                  </Box>
                </Tooltip>
              ))
            ) : (
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  fontStyle: "italic",
                  fontSize: isFirstPlace ? "0.7rem" : "0.65rem",
                }}
              >
                No platform data available
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: colors[rank - 1],
                fontSize: {
                  xs: isFirstPlace ? "1.8rem" : "1.5rem",
                  sm: isFirstPlace ? "2.2rem" : "1.8rem",
                },
                textAlign: "center",
              }}
            >
              {getValue()}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                mt: 1,
                fontSize: isFirstPlace ? "0.75rem" : "0.7rem",
                textAlign: "center",
              }}
            >
              {config.label}
            </Typography>

            {/* Scope Score Display */}
            {user.scopeScore !== undefined && user.scopeScore > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  px: 2,
                  py: 0.8,
                  borderRadius: 2,
                  bgcolor: darkMode
                    ? "rgba(76, 175, 80, 0.15)"
                    : "rgba(46, 125, 50, 0.1)",
                  border: darkMode
                    ? "1px solid rgba(76, 175, 80, 0.3)"
                    : "1px solid rgba(46, 125, 50, 0.2)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.5)",
                    fontSize: "0.65rem",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  Scope Score
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: darkMode ? "#4CAF50" : "#2E7D32",
                    fontSize: isFirstPlace ? "1rem" : "0.9rem",
                    textAlign: "center",
                  }}
                >
                  {user.scopeScore}
                </Typography>
              </Box>
            )}

            {/* Add Consistency and Score Change indicators */}
            <Box
              sx={{
                display: "flex",
                gap: 3,
                mt: 2,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                px: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ConsistencyStar
                  consistencyIndex={user.consistencyIndex || 0}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ScoreChange
                  currentScore={user.totalScore || 0}
                  previousScore={user.sevenDayScore || 0}
                />
              </Box>
            </Box>
          </Box>
        </Card>
      </Zoom>
    );
  });

  // Update the TableHead to show only relevant platforms
  const renderTableHead = useCallback(() => {
    const config = leaderboardConfigs[leaderboardType];

    return (
      <TableHead>
        <TableRow
          sx={{
            bgcolor: darkMode ? "rgba(0, 136, 204, 0.35)" : "#ffffff",
            borderRadius: 2,
            "& .MuiTableCell-root": {
              fontWeight: 700,
              whiteSpace: "nowrap",
              color: darkMode ? "#ffffff" : "#000000",
              py: 2,
              borderBottom: darkMode
                ? "1px solid rgba(0, 136, 204, 0.3)"
                : "1px solid rgba(0, 0, 0, 0.1)",
            },
          }}
        >
          <TableCell>Rank</TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort("name")}
            >
              Name <SortIcon field="name" />
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort("consistencyIndex")}
            >
              <Tooltip title="Consistency Index (0-5) based on last 7 days performance">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Consistency <SortIcon field="consistencyIndex" />
                </Box>
              </Tooltip>
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort("scoreChange")}
            >
              <Tooltip title="Score change from 7 days ago">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Score Change <SortIcon field="scoreChange" />
                </Box>
              </Tooltip>
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                color: darkMode ? "white" : "black",
              }}
              onClick={() => handleSort("rollNumber")}
            >
              Roll No <SortIcon field="rollNumber" />
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort("department")}
            >
              Dept <SortIcon field="department" />
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort("section")}
            >
              Sec <SortIcon field="section" />
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort("year")}
            >
              Year <SortIcon field="year" />
            </Box>
          </TableCell>
          <TableCell>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => handleSort(config.valueKey)}
            >
              {config.label} <SortIcon field={config.valueKey} />
            </Box>
          </TableCell>

          {/* Platform headers */}
          {config.platforms.map((platform) => (
            <TableCell key={platform}>
              <Tooltip title={platforms[platform]}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: `${platformColors[platform]} !important`,
                  }}
                  onClick={() => handleSort(`platform_${platform}`)}
                >
                  <span
                    style={{
                      color: platformColors[platform],
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      textShadow: darkMode ? "none" : "0 0 2px rgba(0,0,0,0.2)",
                    }}
                  >
                    {platforms[platform]}
                  </span>
                  <SortIcon field={`platform_${platform}`} />
                </Box>
              </Tooltip>
            </TableCell>
          ))}

          <TableCell>Department Rank</TableCell>
        </TableRow>
      </TableHead>
    );
  }, [leaderboardType, darkMode, handleSort]);

  // Professional Gold Consistency Star Component with varying glow and opacity
  const ConsistencyStar = React.memo(({ consistencyIndex = 0 }) => {
    const getStarConfig = () => {
      // Use darker blue colors for light mode, gold for dark mode
      const baseColor = darkMode ? "#FFD700" : "#1565C0"; // Gold for dark, darker blue for light
      const lightColor = darkMode ? "#FFF8DC" : "#BBDEFB"; // Light gold/blue
      const darkColor = darkMode ? "#DAA520" : "#0D47A1"; // Dark gold/darker blue
      const intensity = consistencyIndex / 5;

      return {
        color: baseColor,
        lightGold: lightColor,
        darkGold: darkColor,
        opacity:
          consistencyIndex === 0
            ? 0.4
            : consistencyIndex === 1
              ? 0.2 // More transparent for level 1
              : consistencyIndex === 3
                ? 0.85 // Higher opacity for level 3
                : 0.2 + intensity * 0.8, // Low opacity for outline, then 0.2 to 1.0
        glowIntensity: intensity,
        animation:
          consistencyIndex === 0
            ? "none"
            : consistencyIndex <= 3
              ? "none"
              : consistencyIndex === 4
                ? "mediumStarGlow 2.5s ease-in-out infinite"
                : "epicStarGlow 1.5s ease-in-out infinite",
        glowSize: consistencyIndex === 4 ? 16 : consistencyIndex === 5 ? 18 : 8, // Same base glow size for all
        brightness: consistencyIndex >= 4 ? 1.2 : 0.8, // Enhanced brightness for levels 4-5
        scale: 1.0, // Same size for all stars
        isOutlineOnly: consistencyIndex === 0,
      };
    };

    const config = getStarConfig();
    const starId = `goldstar-${consistencyIndex}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return (
      <>
        <style>{`
          @keyframes softStarGlow {
            0%, 100% { 
              filter: drop-shadow(0 0 3px ${
                config.color
              }40) drop-shadow(0 0 6px ${config.color}20) brightness(${
                config.brightness
              });
              transform: scale(${config.scale});
            }
            50% { 
              filter: drop-shadow(0 0 6px ${
                config.color
              }60) drop-shadow(0 0 12px ${config.color}30) brightness(${
                config.brightness + 0.1
              });
              transform: scale(${config.scale * 1.05});
            }
          }
          
          @keyframes mediumStarGlow {
            0%, 100% { 
              filter: drop-shadow(0 0 7px ${
                config.color
              }70) drop-shadow(0 0 14px ${
                config.color
              }50) drop-shadow(0 0 21px ${config.color}30) drop-shadow(0 0 28px ${
                config.color
              }15) brightness(${config.brightness});
              transform: scale(${config.scale});
            }
            50% { 
              filter: drop-shadow(0 0 12px ${
                config.color
              }90) drop-shadow(0 0 24px ${
                config.color
              }70) drop-shadow(0 0 36px ${config.color}45) drop-shadow(0 0 48px ${
                config.color
              }25) brightness(${config.brightness + 0.2});
              transform: scale(${config.scale * 1.12});
            }
          }
          
          @keyframes strongStarGlow {
            0%, 100% { 
              filter: drop-shadow(0 0 10px ${
                config.color
              }80) drop-shadow(0 0 20px ${
                config.color
              }65) drop-shadow(0 0 30px ${config.color}45) drop-shadow(0 0 40px ${
                config.color
              }30) drop-shadow(0 0 50px ${config.color}20) brightness(${
                config.brightness + 0.1
              });
              transform: scale(${config.scale});
            }
            50% { 
              filter: drop-shadow(0 0 16px ${
                config.color
              }95) drop-shadow(0 0 32px ${
                config.color
              }80) drop-shadow(0 0 48px ${config.color}60) drop-shadow(0 0 64px ${
                config.color
              }40) drop-shadow(0 0 80px ${config.color}25) brightness(${
                config.brightness + 0.35
              });
              transform: scale(${config.scale * 1.15});
            }
          }
          
          @keyframes epicStarGlow {
            0%, 100% { 
              filter: drop-shadow(0 0 8px ${
                config.color
              }80) drop-shadow(0 0 16px ${
                config.color
              }60) drop-shadow(0 0 24px ${config.color}40) drop-shadow(0 0 32px ${
                config.color
              }25) drop-shadow(0 0 40px ${config.color}15) brightness(${
                config.brightness + 0.2
              });
              transform: scale(${config.scale}) rotate(0deg);
            }
            25% { 
              filter: drop-shadow(0 0 12px ${
                config.color
              }90) drop-shadow(0 0 24px ${
                config.color
              }70) drop-shadow(0 0 36px ${config.color}50) drop-shadow(0 0 48px ${
                config.color
              }30) drop-shadow(0 0 60px ${config.color}20) brightness(${
                config.brightness + 0.3
              });
              transform: scale(${config.scale * 1.15}) rotate(2deg);
            }
            50% { 
              filter: drop-shadow(0 0 15px ${
                config.color
              }95) drop-shadow(0 0 30px ${
                config.color
              }75) drop-shadow(0 0 45px ${config.color}55) drop-shadow(0 0 60px ${
                config.color
              }35) drop-shadow(0 0 75px ${config.color}25) brightness(${
                config.brightness + 0.35
              });
              transform: scale(${config.scale * 1.2}) rotate(0deg);
            }
            75% { 
              filter: drop-shadow(0 0 12px ${
                config.color
              }90) drop-shadow(0 0 24px ${
                config.color
              }70) drop-shadow(0 0 36px ${config.color}50) drop-shadow(0 0 48px ${
                config.color
              }30) drop-shadow(0 0 60px ${config.color}20) brightness(${
                config.brightness + 0.3
              });
              transform: scale(${config.scale * 1.15}) rotate(-2deg);
            }
          }
          
          .consistency-star-${consistencyIndex} {
            width: 26px;
            height: 26px;
            position: relative;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            animation: ${config.animation};
            opacity: ${config.opacity};
          }
          
          .consistency-star-${consistencyIndex}:hover {
            transform: scale(${config.scale * 1.3}) !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .consistency-star-${consistencyIndex} svg {
            width: 100%;
            height: 100%;
            overflow: visible;
          }
        `}</style>

        <Tooltip
          title={`Consistency Level: ${consistencyIndex}/5`}
          arrow
          placement="top"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              width: 32,
              height: 32,
            }}
          >
            <div className={`consistency-star-${consistencyIndex}`}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Main gold gradient */}
                  <radialGradient
                    id={`goldGradient-${starId}`}
                    cx="50%"
                    cy="30%"
                    r="70%"
                  >
                    <stop
                      offset="0%"
                      stopColor={config.lightGold}
                      stopOpacity="1"
                    />
                    <stop
                      offset="40%"
                      stopColor={config.color}
                      stopOpacity="0.95"
                    />
                    <stop
                      offset="80%"
                      stopColor={config.darkGold}
                      stopOpacity="0.9"
                    />
                    <stop
                      offset="100%"
                      stopColor={config.darkGold}
                      stopOpacity="0.8"
                    />
                  </radialGradient>

                  {/* Highlight gradient for premium look */}
                  <linearGradient
                    id={`goldHighlight-${starId}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                    <stop
                      offset="30%"
                      stopColor={config.lightGold}
                      stopOpacity="0.3"
                    />
                    <stop
                      offset="70%"
                      stopColor={config.color}
                      stopOpacity="0.1"
                    />
                    <stop
                      offset="100%"
                      stopColor="transparent"
                      stopOpacity="0"
                    />
                  </linearGradient>

                  {/* Shadow filter */}
                  <filter
                    id={`goldShadow-${starId}`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="2"
                      stdDeviation="1"
                      floodColor={config.darkGold}
                      floodOpacity="0.4"
                    />
                  </filter>
                </defs>

                {/* Main star shape */}
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill={
                    config.isOutlineOnly
                      ? "transparent"
                      : `url(#goldGradient-${starId})`
                  }
                  filter={
                    config.isOutlineOnly ? "none" : `url(#goldShadow-${starId})`
                  }
                  stroke={config.color}
                  strokeWidth={config.isOutlineOnly ? "0.8" : "0.3"}
                  strokeOpacity={config.isOutlineOnly ? "0.5" : "0.8"}
                />

                {/* Highlight overlay for premium effect - only for filled stars */}
                {!config.isOutlineOnly && (
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill={`url(#goldHighlight-${starId})`}
                  />
                )}

                {/* Enhanced sparkle effects for level 5 */}
                {consistencyIndex === 5 && (
                  <>
                    {/* Main sparkles - larger and brighter */}
                    <circle cx="8" cy="6" r="1.2" fill="#FFFFFF" opacity="1">
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="2s"
                        repeatCount="indefinite"
                        begin="0s"
                      />
                    </circle>
                    <circle cx="16" cy="8" r="1.0" fill="#FFFFFF" opacity="0.9">
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="2.5s"
                        repeatCount="indefinite"
                        begin="0.5s"
                      />
                    </circle>
                    <circle cx="6" cy="12" r="0.9" fill="#FFFFFF" opacity="1">
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="1.8s"
                        repeatCount="indefinite"
                        begin="1s"
                      />
                    </circle>
                    <circle
                      cx="18"
                      cy="14"
                      r="1.1"
                      fill="#FFFFFF"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="2.2s"
                        repeatCount="indefinite"
                        begin="1.5s"
                      />
                    </circle>

                    {/* Additional sparkles for more effect */}
                    <circle cx="4" cy="8" r="0.7" fill="#FFD700" opacity="0.8">
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="1.5s"
                        repeatCount="indefinite"
                        begin="0.3s"
                      />
                    </circle>
                    <circle cx="20" cy="6" r="0.8" fill="#FFD700" opacity="0.7">
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="2.8s"
                        repeatCount="indefinite"
                        begin="0.8s"
                      />
                    </circle>
                    <circle cx="12" cy="4" r="0.6" fill="#FFFFFF" opacity="0.9">
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="2.1s"
                        repeatCount="indefinite"
                        begin="1.2s"
                      />
                    </circle>
                    <circle
                      cx="14"
                      cy="16"
                      r="0.9"
                      fill="#FFD700"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="1.9s"
                        repeatCount="indefinite"
                        begin="1.7s"
                      />
                    </circle>
                  </>
                )}
              </svg>
            </div>
          </Box>
        </Tooltip>
      </>
    );
  });

  // Score Change Component with platform theme blue color and no animations
  const ScoreChange = React.memo(({ currentScore = 0, previousScore = 0 }) => {
    const scoreDiff = currentScore - previousScore;

    const getChangeConfig = () => {
      if (scoreDiff > 0) {
        // Green for positive values
        const green = "#4caf50";
        return {
          color: green,
          bgColor: `${green}10`,
          borderColor: `${green}30`,
          icon: ArrowUpward,
          text: `+${scoreDiff.toLocaleString()}`,
        };
      } else if (scoreDiff < 0) {
        // Red for negative values
        const red = "#f44336";
        return {
          color: red,
          bgColor: `${red}10`,
          borderColor: `${red}30`,
          icon: ArrowDownward,
          text: `${scoreDiff.toLocaleString()}`,
        };
      } else {
        // Yellow for stable (zero) values
        const yellow = "#ff9800";
        return {
          color: yellow,
          bgColor: `${yellow}10`,
          borderColor: `${yellow}30`,
          icon: () => (
            <Box
              sx={{
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "bold",
                color: yellow,
              }}
            >
              =
            </Box>
          ),
          text: "0",
        };
      }
    };

    const config = getChangeConfig();
    const IconComponent = config.icon;
    return (
      <Tooltip
        title={`Score change from 7 days ago: ${
          scoreDiff >= 0 ? "+" : ""
        }${scoreDiff.toLocaleString()}`}
        arrow
        placement="top"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderRadius: "12px",
            backgroundColor: config.bgColor,
            border: `1px solid ${config.borderColor}`,
            cursor: "pointer",
            minWidth: "60px",
            justifyContent: "center",
          }}
        >
          <IconComponent
            sx={{
              fontSize: "1.1rem",
              color: config.color,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: config.color,
              fontWeight: "bold",
              fontSize: "0.8rem",
            }}
          >
            {config.text}
          </Typography>
        </Box>
      </Tooltip>
    );
  });

  // Memoized LeaderboardRow component
  const LeaderboardRow = React.memo(({ user, index }) => {
    // Add a state to track profile image loading
    const [profileImage, setProfileImage] = useState("");
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      // Set profile image from user data or default
      const imageUrl = getProfileImageUrl(user.profilePicture);
      setProfileImage(imageUrl);
      setImageError(false);
    }, [user, index]);

    const config = leaderboardConfigs[leaderboardType];

    // Get the value for the current leaderboard type
    const getLeaderboardCellValue = () => {
      if (leaderboardType === "score") {
        return user.totalScore || 0;
      } else if (leaderboardType === "problems") {
        return user.problemsSolved || 0;
      }
      return 0;
    };

    // Get the platform-specific value for a given platform
    const getPlatformValue = (platform) => {
      // Access platform data directly from platformScores
      if (user.platformScores && user.platformScores[platform]) {
        if (leaderboardType === "problems") {
          // For scopecodestats, both problemsSolved and totalCohortProblemsolved are now same
          // Using problemsSolved for consistency with other platforms
          return user.platformScores[platform].problemsSolved || 0;
        }
        if (leaderboardType === "score") {
          return user.platformScores[platform].score || 0;
        }
      }
      return 0;
    };

    return (
      <TableRow
        hover
        onClick={() => handleUserClick(user.email)}
        sx={{
          "&:last-child td, &:last-child th": { border: 0 },
          bgcolor: darkMode
            ? index % 2 === 0
              ? "rgba(255,255,255,0.03)"
              : "transparent"
            : "#ffffff",
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            bgcolor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
          ...(index < 3 && {
            bgcolor: darkMode
              ? "rgba(0, 136, 204, 0.1)"
              : "rgba(0, 136, 204, 0.05)",
          }),
        }}
      >
        <TableCell
          align="center"
          sx={{
            p: 1,
            width: "60px",
            borderBottom: `1px solid ${
              darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
            }`,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor:
                index < 3
                  ? ["#FFD700", "#C0C0C0", "#CD7F32"][index]
                  : "transparent",
              color:
                index < 3 ? "#000" : darkMode ? "white" : "rgba(0,0,0,0.8)",
              fontWeight: "bold",
            }}
          >
            {index + 1}
          </Box>
        </TableCell>

        <TableCell
          sx={{
            borderBottom: `1px solid ${
              darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
            }`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              alt={user.name || "User"}
              src={!imageError && profileImage ? profileImage : undefined}
              onError={() => setImageError(true)}
              sx={{
                width: 40,
                height: 40,
                border: `2px solid ${
                  darkMode ? "rgba(0,136,204,0.5)" : "rgba(0,136,204,0.3)"
                }`,
              }}
            >
              {(!profileImage || imageError) && user.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : ""}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {user.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {user.department} -{" "}
                {getStudentYearDisplay(user.graduatingYear, academicYearConfig)}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        <TableCell
          sx={{
            borderBottom: `1px solid ${
              darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
            }`,
            textAlign: "center",
          }}
        >
          <ConsistencyStar consistencyIndex={user.consistencyIndex || 0} />
        </TableCell>

        <TableCell
          sx={{
            borderBottom: `1px solid ${
              darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
            }`,
            textAlign: "center",
          }}
        >
          <ScoreChange
            currentScore={user.totalScore || 0}
            previousScore={user.sevenDayScore || 0}
          />
        </TableCell>

        <TableCell>
          <Typography variant="body2">
            {user.rollNumber ? user.rollNumber.toUpperCase() : "-"}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{user.department || "-"}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{user.section || "-"}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{user.graduatingYear}</Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            sx={{ color: "#0088cc", fontWeight: 600 }}
          >
            {getLeaderboardCellValue()}
          </Typography>
        </TableCell>

        {/* Platform-specific cells */}
        {config.platforms.map((platform) => (
          <TableCell key={platform}>
            <Typography
              variant="body2"
              sx={{
                color: platformColors[platform],
                opacity: getPlatformValue(platform) > 0 ? 1 : 0.4,
                fontWeight: getPlatformValue(platform) > 0 ? 600 : 400,
              }}
            >
              {getPlatformValue(platform)}
            </Typography>
          </TableCell>
        ))}

        <TableCell>
          <Typography variant="body2">{user.departmentRank}</Typography>
        </TableCell>
      </TableRow>
    );
  });

  // Memoized PaginationControls component
  const PaginationControls = React.memo(
    ({ page, totalPages, rowsPerPage, onPageChange, onRowsPerPageChange }) => (
      <Box
        sx={{
          mt: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          borderRadius: "8px",
          p: 2,
        }}
      >
        {/* Left side - Entries per page */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(e.target.value)}
            size="small"
            sx={{
              minWidth: 65,
              height: 32,
              color: darkMode ? "white" : "black",
              ".MuiOutlinedInput-notchedOutline": { border: "none" },
              bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              },
              "& .MuiSelect-icon": {
                color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.54)",
              },
            }}
          >
            {[5, 10, 25, 50, 100].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
          <Typography
            variant="body2"
            sx={{
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
            }}
          >
            per page
          </Typography>
        </Box>

        {/* Center - Page numbers */}
        <Stack direction="row" spacing={0.5}>
          {/* Previous page button */}
          <Button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            sx={{
              minWidth: 32,
              height: 32,
              p: 0,
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              },
              "&.Mui-disabled": {
                color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              },
            }}
          >
            <ArrowBack fontSize="small" />
          </Button>

          {(() => {
            const pageButtons = [];
            const maxVisiblePages = 5;

            // Calculate start and end page numbers to display
            let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            // Adjust if we're near the end
            if (endPage - startPage + 1 < maxVisiblePages) {
              startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            // Add first page button if needed
            if (startPage > 1) {
              pageButtons.push(
                <Button
                  key="first-page"
                  onClick={() => onPageChange(1)}
                  variant={page === 1 ? "contained" : "text"}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    p: 0,
                    bgcolor: page === 1 ? "#0088cc !important" : "transparent",
                    color:
                      page === 1
                        ? "white"
                        : darkMode
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                    "&:hover": {
                      bgcolor:
                        page === 1
                          ? "#0088cc"
                          : darkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                    },
                  }}
                >
                  1
                </Button>,
              );

              // Add ellipsis if there's a gap
              if (startPage > 2) {
                pageButtons.push(
                  <Box
                    key="ellipsis-start"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      color: darkMode
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    ...
                  </Box>,
                );
              }
            }

            // Add page buttons
            for (let i = startPage; i <= endPage; i++) {
              // Skip first and last page buttons if they're handled separately
              if (
                (i === 1 && startPage > 1) ||
                (i === totalPages && endPage < totalPages)
              )
                continue;

              pageButtons.push(
                <Button
                  key={i}
                  onClick={() => onPageChange(i)}
                  variant={page === i ? "contained" : "text"}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    p: 0,
                    bgcolor: page === i ? "#0088cc !important" : "transparent",
                    color:
                      page === i
                        ? "white"
                        : darkMode
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                    "&:hover": {
                      bgcolor:
                        page === i
                          ? "#0088cc"
                          : darkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                    },
                  }}
                >
                  {i}
                </Button>,
              );
            }

            // Add last page button if needed
            if (endPage < totalPages) {
              // Add ellipsis if there's a gap
              if (endPage < totalPages - 1) {
                pageButtons.push(
                  <Box
                    key="ellipsis-end"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      color: darkMode
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    ...
                  </Box>,
                );
              }

              pageButtons.push(
                <Button
                  key="last-page"
                  onClick={() => onPageChange(totalPages)}
                  variant={page === totalPages ? "contained" : "text"}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    p: 0,
                    bgcolor:
                      page === totalPages
                        ? "#0088cc !important"
                        : "transparent",
                    color:
                      page === totalPages
                        ? "white"
                        : darkMode
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                    "&:hover": {
                      bgcolor:
                        page === totalPages
                          ? "#0088cc"
                          : darkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                    },
                  }}
                >
                  {totalPages}
                </Button>,
              );
            }

            return pageButtons;
          })()}

          {/* Next page button */}
          <Button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            sx={{
              minWidth: 32,
              height: 32,
              p: 0,
              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              },
              "&.Mui-disabled": {
                color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              },
            }}
          >
            <ArrowForward fontSize="small" />
          </Button>
        </Stack>

        {/* Right side - Current range display */}
        <Typography
          variant="body2"
          sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
        >
          {totalPages === 0
            ? "No results"
            : `${(page - 1) * rowsPerPage + 1}-${Math.min(
                page * rowsPerPage,
                filteredUsers.length,
              )} of ${filteredUsers.length}`}
        </Typography>
      </Box>
    ),
  );

  // Update getStatsCardInfo to use correct values
  const getStatsCardInfo = useMemo(() => {
    const baseStats = [
      {
        title: "Total Users",
        value: users.length,
        icon: Group,
        color: "#0088cc",
      },
    ];

    // Add leaderboard type specific stats
    if (leaderboardType === "score") {
      return [
        ...baseStats,
        {
          title: "Active Platforms",
          value: Object.keys(platforms).length,
          icon: Public,
          color: "#00bfff",
        },
        {
          title: "Total Score",
          value: users
            .reduce((sum, user) => sum + (user.totalScore || 0), 0)
            .toLocaleString(),
          icon: EmojiEvents,
          color: "#ff9800",
        },
      ];
    } else if (leaderboardType === "problems") {
      return [
        ...baseStats,
        {
          title: "Platforms Tracked",
          value: leaderboardConfigs.problems.platforms.length,
          icon: Code,
          color: "#00bfff",
        },
        {
          title: "Total Problems Solved",
          value: users
            .reduce((sum, user) => sum + (user.problemsSolved || 0), 0)
            .toLocaleString(),
          icon: Code,
          color: "#ff9800",
        },
      ];
    }

    return baseStats;
  }, [users, leaderboardType]);

  // Update the ProblemsSolvedSummary component to work for any user
  const ProblemsSolvedSummary = React.memo(({ users, leaderboardConfig }) => {
    // Only show for problems leaderboard type
    if (!users.length || leaderboardConfig.valueKey !== "problemsSolved") {
      return null;
    }

    // Get the user (current user or top user)
    // If we wanted to show for the logged-in user, we'd need to filter the users array
    const topUser = users[0]; // For now, just use the top user

    // Get all platform values for the user
    const platformValues = leaderboardConfig.platforms
      .map((platform) => {
        // We use this function to ensure consistent access to platform data
        const value = getPlatformDataValue(topUser, platform, "problemsSolved");
        return {
          platform,
          value: value,
          color: platformColors[platform],
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value); // Show highest values first

    // Calculate the total
    const total = platformValues.reduce((sum, item) => sum + item.value, 0);

    return (
      <Card
        sx={{
          bgcolor: darkMode ? "#1a1a1a" : "#ffffff",
          p: 2,
          borderRadius: 3,
          border: darkMode
            ? "1px solid rgba(255,255,255,0.1)"
            : "1px solid rgba(0,0,0,0.1)",
          mb: 3,
          boxShadow: darkMode ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
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
            variant="h6"
            sx={{ color: darkMode ? "white" : "black", fontWeight: 600 }}
          >
            Problems Solved
          </Typography>
          <Typography variant="h4" sx={{ color: "#0088cc", fontWeight: 700 }}>
            {total}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {platformValues.map(({ platform, value, color }) => (
            <Box
              key={platform}
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: `${color}22`,
                py: 0.5,
                px: 1.5,
                borderRadius: 2,
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: color, fontWeight: 600 }}
              >
                {platforms[platform]}
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: darkMode ? "white" : "black", fontWeight: 700 }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>
    );
  });

  // Add effect to ensure sortBy is synchronized with leaderboardType
  useEffect(() => {
    // Update sortBy if it doesn't match the current leaderboard type
    const config = leaderboardConfigs[leaderboardType];
    if (config && config.valueKey && sortBy !== config.valueKey) {
      if (leaderboardType === "score") {
        setSortBy("totalScore");
      } else if (leaderboardType === "problems") {
        setSortBy("problemsSolved");
      } else if (leaderboardType === "contests") {
        setSortBy("totalContestsParticipated");
      } else if (leaderboardType === "rating") {
        setSortBy("totalRating");
      }
    }
  }, [leaderboardType]);

  // Add this to the existing useEffect after fetchLeaderboard
  useEffect(() => {
    if (users.length > 0 && currentAuthUser) {
      const userData = findCurrentUserInLeaderboard(users);
      setCurrentUserData(userData);
    }
  }, [users, currentAuthUser, findCurrentUserInLeaderboard]);

  // Add this function before the return statement
  const getCurrentUserFilteredRank = useCallback(() => {
    if (!currentUserData || !filteredUsers.length)
      return { rank: "-", isVisible: false };

    // Find the current user in the filtered data
    const userIndex = filteredUsers.findIndex(
      (user) => user._id === currentUserData._id,
    );

    // If found, return the rank (index + 1)
    if (userIndex > -1) {
      return {
        rank: userIndex + 1,
        isVisible:
          userIndex >= (page - 1) * rowsPerPage &&
          userIndex < page * rowsPerPage,
      };
    }

    // If not found in filtered data, check if user exists in unfiltered data
    const userExistsInAll = users.some(
      (user) => user._id === currentUserData._id,
    );
    if (userExistsInAll) {
      // User exists but is filtered out
      return { rank: "Filtered out", isVisible: false };
    }

    // User doesn't exist at all
    return { rank: "-", isVisible: false };
  }, [currentUserData, filteredUsers, page, rowsPerPage, users]);

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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Container
        maxWidth={false}
        sx={{
          py: 6,
          px: { xs: 2, sm: 10 },
          flexGrow: 1, // Allow content to grow
        }}
      >
        {/* Programming Cohorts Section */}
        <Box
          sx={{
            maxWidth: "100%",
            mx: "auto",
            mt: { xs: 0, sm: 2, md: 4 },
            mb: 6,
            bgcolor: "#0585E0",
            border: `1px solid ${darkMode ? "#232323" : "transparent"}`,
            borderRadius: "20px",
            position: "relative",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            minHeight: { xs: "200px", md: "100px" },
            overflow: "visible",
            pb: { xs: 4, md: 0 },
          }}
        >
          {/* Content Section (75% on desktop, 100% on mobile) */}
          <Box
            sx={{
              width: { xs: "100%", md: "85%" },
              p: { xs: 3, md: 3 },
              position: "relative",
              zIndex: 2,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                color: "#ffffff",
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: "1.75rem", sm: "1.7rem" },
              }}
            >
              Leaderboard
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#ffffff",
                fontWeight: 200,
                fontSize: { xs: "0.9rem", sm: "0.9rem" },
                lineHeight: 1.6,
                maxWidth: "600px",
              }}
            >
              Climb the ranks and track the best — explore the leaderboard to
              see where you stand among top coders across all competitive
              programming platforms!
            </Typography>
          </Box>

          {/* Image Section */}
          <Box
            sx={{
              width: { xs: "100%", md: "18%" },
              position: { xs: "relative", md: "absolute" },
              right: { xs: "auto", md: "5%" },
              bottom: { xs: "-20px", md: 0 },
              zIndex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              overflow: "visible",
              height: { xs: "120px", md: "80%" },
              mt: { xs: 2, md: 0 },
            }}
          >
            <Box
              component="img"
              src="/leaderboard.png"
              alt="Programming Cohorts"
              sx={{
                width: { xs: "150px", md: "90%" },
                height: "auto",
                maxWidth: "none",
                objectFit: "contain",
                objectPosition: "bottom",
                filter: darkMode
                  ? "drop-shadow(-10px 10px 20px rgba(50, 50, 50, 0.6))"
                  : "none",
                animation:
                  "gentleFloat 6s ease-in-out infinite, simpleFadeIn 0.8s ease-out",
                transformOrigin: "center bottom",
                "@keyframes gentleFloat": {
                  "0%, 100%": {
                    transform: "translateY(0)",
                    filter: darkMode
                      ? "drop-shadow(-10px 10px 20px rgba(50, 50, 50, 0.6))"
                      : "none",
                  },
                  "50%": {
                    transform: "translateY(-12px)",
                    filter: darkMode
                      ? "drop-shadow(-10px 10px 20px rgba(50, 50, 50, 0.7))"
                      : "none",
                  },
                },
                "@keyframes simpleFadeIn": {
                  "0%": {
                    opacity: 0,
                    transform: "translateY(15px)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "translateY(0)",
                  },
                },
                "&:hover": {
                  animation: "none",
                  transform: "translateY(-8px)",
                  transition: "all 0.4s ease-out",
                  filter: darkMode
                    ? "drop-shadow(-12px 12px 24px rgba(50, 50, 50, 0.7))"
                    : "brightness(1.05)",
                },
              }}
            />
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {getStatsCardInfo.map((stat, index) => (
            <Grid item xs={6} sm={4} key={index}>
              <StatsCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            </Grid>
          ))}
        </Grid>

        {/* Problems Solved Summary */}
        <ProblemsSolvedSummary
          users={users}
          leaderboardConfig={leaderboardConfigs[leaderboardType]}
        />

        {/* Top 3 Section - Below stats cards */}
        {users.length > 0 &&
          filteredUsers.slice(0, 3).length > 0 &&
          !searchTerm && (
            <Box
              sx={{
                mb: { xs: 3, sm: 4 },
                width: "100%",
                mx: "auto",
                boxSizing: "border-box",
              }}
            >
              <Grid
                container
                spacing={2}
                justifyContent="center"
                alignItems="flex-start"
              >
                {filteredUsers.length > 1 && (
                  <Grid
                    item
                    xs={12}
                    sm={4}
                    md={3}
                    order={{ xs: 2, sm: 1 }}
                    sx={{ mt: { sm: 4 } }}
                  >
                    <TopThreeCard
                      user={filteredUsers[1]}
                      rank={2}
                      delay={350}
                      leaderboardType={leaderboardType}
                    />
                  </Grid>
                )}
                {filteredUsers.length > 0 && (
                  <Grid
                    item
                    xs={12}
                    sm={4}
                    md={3}
                    order={{ xs: 1, sm: 2 }}
                    sx={{ mt: { sm: -3 } }}
                  >
                    <TopThreeCard
                      user={filteredUsers[0]}
                      rank={1}
                      delay={30}
                      leaderboardType={leaderboardType}
                    />
                  </Grid>
                )}
                {filteredUsers.length > 2 && (
                  <Grid
                    item
                    xs={12}
                    sm={4}
                    md={3}
                    order={{ xs: 3, sm: 3 }}
                    sx={{ mt: { sm: 4 } }}
                  >
                    <TopThreeCard
                      user={filteredUsers[2]}
                      rank={3}
                      delay={500}
                      leaderboardType={leaderboardType}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

        {/* Search and Filter Bar */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            gap: 2,
          }}
        >
          <Paper
            component="form"
            onSubmit={(e) => e.preventDefault()}
            sx={{
              p: "0px 4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "20px",
              backgroundColor: darkMode
                ? "rgba(23, 23, 23, 0.45)"
                : "rgba(0, 0, 0, 0.05)",
              border: `1px solid ${
                darkMode ? "#232323" : "rgba(0, 0, 0, 0.1)"
              }`,
              "&:hover": {
                backgroundColor: darkMode
                  ? "rgba(35, 35, 35, 0.4)"
                  : "rgba(0, 0, 0, 0.08)",
              },
              boxShadow: "none",
              height: "40px",
              position: "relative",
              width: "100%",
              maxWidth: "350px",
            }}
          >
            <IconButton
              sx={{
                p: "5px",
                color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.5)",
              }}
              aria-label="search"
            >
              <Search sx={{ fontSize: 20 }} />
            </IconButton>
            <InputBase
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                ml: 0.5,
                flex: 1,
                color: darkMode
                  ? "rgba(255, 255, 255, 0.9)"
                  : "rgba(0, 0, 0, 0.9)",
                fontSize: "0.9rem",
                "& input": {
                  padding: "0px",
                },
              }}
            />
            {refreshing && (
              <CircularProgress
                size={16}
                sx={{
                  mr: 1,
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.7)",
                }}
              />
            )}
            {searchTerm && (
              <IconButton
                size="small"
                onClick={() => setSearchTerm("")}
                sx={{
                  p: "5px",
                  mr: 0.5,
                  color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.5)",
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Paper>

          {/* Refresh Button */}
          <Tooltip title="Refresh Leaderboard">
            <IconButton
              onClick={fetchLeaderboard}
              disabled={refreshing}
              sx={{
                ml: 1,
                color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.7)",
                bgcolor: darkMode
                  ? "rgba(23, 23, 23, 0.45)"
                  : "rgba(0, 0, 0, 0.05)",
                border: `1px solid ${
                  darkMode ? "#232323" : "rgba(0, 0, 0, 0.1)"
                }`,
                "&:hover": {
                  bgcolor: darkMode
                    ? "rgba(35, 35, 35, 0.4)"
                    : "rgba(0, 0, 0, 0.08)",
                },
                "&:disabled": {
                  color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                },
              }}
            >
              <Refresh sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Filters and Sorting UI */}
        <Box
          sx={{
            mt: 2,
            mb: 3,
            px: 2,
            py: 2.5,
            borderRadius: 2,
            bgcolor: darkMode ? "rgba(23, 23, 23, 0.45)" : "#fffff",
            border: `1px solid ${
              darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
            }`,
            boxShadow: darkMode
              ? "0 2px 10px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.05)",
            width: "100%",
            mx: "auto",
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
            }}
          >
            <FilterList sx={{ color: "#0088cc", mr: 1 }} />
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
              }}
            >
              Filters & Sorting
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setDepartment("ALL");
                setSection("All");
                setYear("ALL");
                setSearchTerm("");
                setSortBy("totalScore");
                setSortOrder("desc");
              }}
              startIcon={<Refresh />}
              sx={{
                borderColor: "#0088cc",
                color: "#0088cc",
                "&:hover": {
                  borderColor: "#006699",
                  bgcolor: "rgba(0,136,204,0.1)",
                },
                textTransform: "none",
              }}
            >
              Reset Filters
            </Button>

            {/* Admin Only: Academic Year Settings Button */}
            {currentAuthUser && currentAuthUser.userType === "admin" && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate("/admin/academic-year-config")}
                startIcon={<School />}
                sx={{
                  borderColor: "#ff9800",
                  color: "#ff9800",
                  "&:hover": {
                    borderColor: "#f57c00",
                    bgcolor: "rgba(255,152,0,0.1)",
                  },
                  textTransform: "none",
                  ml: 2, // Add left margin for gap
                }}
              >
                Academic Year Settings
              </Button>
            )}
          </Box>

          <Grid container spacing={2}>
            {/* Department Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel
                  id="department-filter-label"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Department
                </InputLabel>
                <Select
                  labelId="department-filter-label"
                  id="department-filter"
                  name="department"
                  value={department}
                  label="Department"
                  onChange={handleFilterChange}
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.8)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#0088cc",
                    },
                    "& .MuiSvgIcon-root": {
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.54)",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: dropdownThemeColors.menuBg,
                        boxShadow: dropdownThemeColors.menuShadow,
                        borderRadius: "10px",
                        border: `1px solid ${dropdownThemeColors.menuBorder}`,
                        maxHeight: "60vh",
                        overflow: "auto",
                        ...dropdownScrollbarStyles,
                        mt: 0.5,
                        "& .MuiMenuItem-root": {
                          fontSize: "0.9rem",
                          py: 1,
                          px: 2,
                          "&:hover": {
                            bgcolor: dropdownThemeColors.hoverBg,
                          },
                          "&.Mui-selected": {
                            bgcolor: dropdownThemeColors.selectedBg,
                            color: "#0088cc",
                            fontWeight: 500,
                            "&:hover": {
                              bgcolor: darkMode
                                ? "rgba(0, 136, 204, 0.35)"
                                : "rgba(0, 136, 204, 0.15)",
                            },
                          },
                        },
                      },
                    },
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "center",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "center",
                    },
                  }}
                >
                  <MenuItem value="ALL">All Departments</MenuItem>
                  {departments
                    .filter((d) => d !== "ALL")
                    .map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Academic Year Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel
                  id="year-filter-label"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Year of Study
                </InputLabel>
                <Select
                  labelId="year-filter-label"
                  id="year-filter"
                  name="year"
                  value={year}
                  label="Year of Study"
                  onChange={handleFilterChange}
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.8)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#0088cc",
                    },
                    "& .MuiSvgIcon-root": {
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.54)",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: dropdownThemeColors.menuBg,
                        boxShadow: dropdownThemeColors.menuShadow,
                        borderRadius: "10px",
                        border: `1px solid ${dropdownThemeColors.menuBorder}`,
                        maxHeight: "60vh",
                        overflow: "auto",
                        ...dropdownScrollbarStyles,
                        mt: 0.5,
                        "& .MuiMenuItem-root": {
                          fontSize: "0.9rem",
                          py: 1,
                          px: 2,
                          "&:hover": {
                            bgcolor: dropdownThemeColors.hoverBg,
                          },
                          "&.Mui-selected": {
                            bgcolor: dropdownThemeColors.selectedBg,
                            color: "#0088cc",
                            fontWeight: 500,
                            "&:hover": {
                              bgcolor: darkMode
                                ? "rgba(0, 136, 204, 0.35)"
                                : "rgba(0, 136, 204, 0.15)",
                            },
                          },
                        },
                      },
                    },
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "center",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "center",
                    },
                  }}
                >
                  <MenuItem value="ALL">All Students</MenuItem>
                  {academicYearConfig &&
                    getAllAcademicYears(academicYearConfig).map((yearName) => (
                      <MenuItem key={yearName} value={yearName}>
                        {yearName}
                      </MenuItem>
                    ))}
                  {!academicYearConfig && (
                    <>
                      <MenuItem value="First Year">First Year</MenuItem>
                      <MenuItem value="Second Year">Second Year</MenuItem>
                      <MenuItem value="Third Year">Third Year</MenuItem>
                      <MenuItem value="Fourth Year">Fourth Year</MenuItem>
                      <MenuItem value="Graduated">Graduated</MenuItem>
                    </>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Section Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel
                  id="section-filter-label"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Section
                </InputLabel>
                <Select
                  labelId="section-filter-label"
                  id="section-filter"
                  name="section"
                  value={section}
                  label="Section"
                  onChange={handleFilterChange}
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.8)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#0088cc",
                    },
                    "& .MuiSvgIcon-root": {
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.54)",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: dropdownThemeColors.menuBg,
                        boxShadow: dropdownThemeColors.menuShadow,
                        borderRadius: "10px",
                        border: `1px solid ${dropdownThemeColors.menuBorder}`,
                        maxHeight: "60vh",
                        overflow: "auto",
                        ...dropdownScrollbarStyles,
                        mt: 0.5,
                        "& .MuiMenuItem-root": {
                          fontSize: "0.9rem",
                          py: 1,
                          px: 2,
                          "&:hover": {
                            bgcolor: dropdownThemeColors.hoverBg,
                          },
                          "&.Mui-selected": {
                            bgcolor: dropdownThemeColors.selectedBg,
                            color: "#0088cc",
                            fontWeight: 500,
                            "&:hover": {
                              bgcolor: darkMode
                                ? "rgba(0, 136, 204, 0.35)"
                                : "rgba(0, 136, 204, 0.15)",
                            },
                          },
                        },
                      },
                    },
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "center",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "center",
                    },
                  }}
                >
                  <MenuItem value="All">All Sections</MenuItem>
                  {["A", "B", "C", "D", "E", "F", "G"].map((sect) => (
                    <MenuItem key={sect} value={sect}>
                      Section {sect}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Sort Order */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel
                  id="sort-order-label"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Sort Order
                </InputLabel>
                <Select
                  labelId="sort-order-label"
                  id="sort-order"
                  name="sortOrder"
                  value={sortOrder}
                  label="Sort Order"
                  onChange={handleFilterChange}
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.8)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#0088cc",
                    },
                    "& .MuiSvgIcon-root": {
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.54)",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: dropdownThemeColors.menuBg,
                        boxShadow: dropdownThemeColors.menuShadow,
                        borderRadius: "10px",
                        border: `1px solid ${dropdownThemeColors.menuBorder}`,
                        maxHeight: "60vh",
                        overflow: "auto",
                        ...dropdownScrollbarStyles,
                        mt: 0.5,
                        "& .MuiMenuItem-root": {
                          fontSize: "0.9rem",
                          py: 1,
                          px: 2,
                          "&:hover": {
                            bgcolor: dropdownThemeColors.hoverBg,
                          },
                          "&.Mui-selected": {
                            bgcolor: dropdownThemeColors.selectedBg,
                            color: "#0088cc",
                            fontWeight: 500,
                            "&:hover": {
                              bgcolor: darkMode
                                ? "rgba(0, 136, 204, 0.35)"
                                : "rgba(0, 136, 204, 0.15)",
                            },
                          },
                        },
                      },
                    },
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "center",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "center",
                    },
                  }}
                >
                  <MenuItem value="desc">Highest First</MenuItem>
                  <MenuItem value="asc">Lowest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {(department !== "ALL" ||
            section !== "All" ||
            year !== "ALL" ||
            searchTerm.trim() !== "") && (
            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  mr: 1,
                }}
              >
                Active Filters:
              </Typography>

              {department !== "ALL" && (
                <Chip
                  size="small"
                  label={`Department: ${department}`}
                  onDelete={() => setDepartment("ALL")}
                  sx={{
                    bgcolor: darkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                    color: "#0088cc",
                  }}
                />
              )}

              {section !== "All" && (
                <Chip
                  size="small"
                  label={`Section: ${section}`}
                  onDelete={() => setSection("All")}
                  sx={{
                    bgcolor: darkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                    color: "#0088cc",
                  }}
                />
              )}

              {year !== "ALL" && (
                <Chip
                  size="small"
                  label={`Year: ${year}`}
                  onDelete={() => setYear("ALL")}
                  sx={{
                    bgcolor: darkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                    color: "#0088cc",
                  }}
                />
              )}

              {searchTerm.trim() !== "" && (
                <Chip
                  size="small"
                  label={`Search: "${searchTerm}"`}
                  onDelete={() => setSearchTerm("")}
                  sx={{
                    bgcolor: darkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                    color: "#0088cc",
                  }}
                />
              )}
            </Box>
          )}

          {/* Results count */}
          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Showing {filteredUsers.length} of {users.length} users
            </Typography>

            {filteredUsers.length === 0 && users.length > 0 && (
              <Typography variant="body2" sx={{ color: "warning.main" }}>
                No users match the current filters
              </Typography>
            )}
          </Box>
        </Box>

        {/* Navigation Tabs */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Button
            variant={leaderboardType === "score" ? "contained" : "outlined"}
            startIcon={<EmojiEvents />}
            onClick={() => handleLeaderboardTypeChange("score")}
            sx={{
              borderColor: darkMode
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.23)",
              color:
                leaderboardType === "score"
                  ? "white"
                  : darkMode
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.7)",
              borderRadius: 2,
              "&.MuiButton-contained": {
                bgcolor: "#0088cc",
                "&:hover": {
                  bgcolor: "#006699",
                },
              },
              "&.MuiButton-outlined": {
                "&:hover": {
                  borderColor: "#0088cc",
                  bgcolor: "rgba(0,136,204,0.1)",
                },
              },
            }}
          >
            By Score
          </Button>
          <Button
            variant={leaderboardType === "problems" ? "contained" : "outlined"}
            startIcon={<Code />}
            onClick={() => handleLeaderboardTypeChange("problems")}
            sx={{
              borderColor: darkMode
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.23)",
              color:
                leaderboardType === "problems"
                  ? "white"
                  : darkMode
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.7)",
              borderRadius: 2,
              "&.MuiButton-contained": {
                bgcolor: "#0088cc",
                "&:hover": {
                  bgcolor: "#006699",
                },
              },
              "&.MuiButton-outlined": {
                "&:hover": {
                  borderColor: "#0088cc",
                  bgcolor: "rgba(0,136,204,0.1)",
                },
              },
            }}
          >
            By Problems Solved
          </Button>
        </Box>

        {/* Main Leaderboard */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: darkMode ? "transparent" : "#ffffff",
            borderRadius: 2,
            overflow: "visible",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            ...scrollbarStyles,
          }}
        >
          <TableContainer
            id="leaderboard-table"
            sx={{
              borderRadius: 2,
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              overflowY: "visible",
              ...scrollbarStyles,
              position: "relative", // Added to make relative positioning context for sticky row
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              boxSizing: "border-box",
            }}
          >
            <Table
              sx={{
                width: "100%",
                "& .MuiTableCell-root": {
                  color: darkMode ? "#ffffff" : "#000000",
                  borderBottom: darkMode
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.1)",
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap",
                },
              }}
            >
              {renderTableHead()}
              <TableBody>
                {refreshing && users.length > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10 + Object.keys(platforms).length}
                      align="center"
                      sx={{
                        py: 1,
                        bgcolor: darkMode
                          ? "rgba(0, 136, 204, 0.05)"
                          : "rgba(0, 136, 204, 0.02)",
                        borderBottom: `1px solid ${
                          darkMode
                            ? "rgba(0, 136, 204, 0.2)"
                            : "rgba(0, 136, 204, 0.1)"
                        }`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        <CircularProgress size={14} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: darkMode
                              ? "rgba(255,255,255,0.7)"
                              : "rgba(0,0,0,0.7)",
                          }}
                        >
                          Updating leaderboard...
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10 + Object.keys(platforms).length}
                      align="center"
                    >
                      <Box
                        sx={{
                          py: 4,
                          color: darkMode
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      >
                        <Typography variant="h6" gutterBottom>
                          No users found
                        </Typography>
                        <Typography variant="body2">
                          Try adjusting your filters
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <LeaderboardRow
                      key={user._id}
                      user={user}
                      index={index + (page - 1) * rowsPerPage}
                    />
                  ))
                )}

                {/* Current User Row - Inside the table */}
                {currentUserData && (
                  <TableRow
                    onClick={() => handleUserClick(currentUserData.email)}
                    sx={{
                      position: "sticky",
                      bottom: 0,
                      zIndex: 10,
                      bgcolor: darkMode
                        ? (() => {
                            const { rank } = getCurrentUserFilteredRank();
                            if (rank === "Filtered out")
                              return "rgba(255, 193, 7, 0.2)"; // Yellow for filtered out
                            if (rank === "-") return "rgba(128, 128, 128, 0.2)"; // Gray for not found
                            return "rgba(0, 136, 204, 0.2)"; // Blue if visible
                          })()
                        : (() => {
                            const { rank } = getCurrentUserFilteredRank();
                            if (rank === "Filtered out")
                              return "rgba(255, 193, 7, 0.1)"; // Light yellow for filtered out
                            if (rank === "-") return "rgba(128, 128, 128, 0.1)"; // Light gray for not found
                            return "rgba(0, 136, 204, 0.1)"; // Light blue if visible
                          })(),
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
                      "& .MuiTableCell-root": {
                        borderTop: `1px solid ${
                          darkMode
                            ? (() => {
                                const { rank } = getCurrentUserFilteredRank();
                                if (rank === "Filtered out")
                                  return "rgba(255, 193, 7, 0.3)"; // Yellow border
                                if (rank === "-")
                                  return "rgba(128, 128, 128, 0.3)"; // Gray border
                                return "rgba(0, 136, 204, 0.3)"; // Blue border
                              })()
                            : (() => {
                                const { rank } = getCurrentUserFilteredRank();
                                if (rank === "Filtered out")
                                  return "rgba(255, 193, 7, 0.2)"; // Light yellow border
                                if (rank === "-")
                                  return "rgba(128, 128, 128, 0.2)"; // Light gray border
                                return "rgba(0, 136, 204, 0.2)"; // Light blue border
                              })()
                        }`,
                        py: 1.5,
                      },
                      "&:hover": {
                        bgcolor: darkMode
                          ? (() => {
                              const { rank } = getCurrentUserFilteredRank();
                              if (rank === "Filtered out")
                                return "rgba(255, 193, 7, 0.25)"; // Darker yellow
                              if (rank === "-")
                                return "rgba(128, 128, 128, 0.25)"; // Darker gray
                              return "rgba(0, 136, 204, 0.25)"; // Darker blue
                            })()
                          : (() => {
                              const { rank } = getCurrentUserFilteredRank();
                              if (rank === "Filtered out")
                                return "rgba(255, 193, 7, 0.15)"; // Darker light yellow
                              if (rank === "-")
                                return "rgba(128, 128, 128, 0.15)"; // Darker light gray
                              return "rgba(0, 136, 204, 0.15)"; // Darker light blue
                            })(),
                      },
                      cursor: "pointer", // Add cursor pointer to indicate clickable
                    }}
                  >
                    <TableCell align="center">
                      {(() => {
                        const { rank, isVisible } =
                          getCurrentUserFilteredRank();
                        const isFilteredOut = rank === "Filtered out";
                        return (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              label={
                                rank !== "-" && !isFilteredOut
                                  ? `#${rank}`
                                  : isFilteredOut
                                    ? "Filtered out"
                                    : "Not found"
                              }
                              color={
                                rank !== "-" && !isFilteredOut
                                  ? "primary"
                                  : "default"
                              }
                              size="small"
                              sx={{
                                fontWeight: "bold",
                                bgcolor: isFilteredOut
                                  ? darkMode
                                    ? "rgba(255, 193, 7, 0.2)"
                                    : "rgba(255, 193, 7, 0.1)"
                                  : undefined,
                                color: isFilteredOut
                                  ? darkMode
                                    ? "#ffb74d"
                                    : "#f57c00"
                                  : undefined,
                              }}
                            />
                            {rank !== "-" && !isFilteredOut && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.6rem",
                                  mt: 0.5,
                                  opacity: 0.7,
                                }}
                              >
                                {isVisible
                                  ? "(on this page)"
                                  : "(filtered rank)"}
                              </Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Avatar
                          alt={currentUserData.name || "User"}
                          src={getProfileImageUrl(
                            currentUserData.profilePicture,
                          )}
                          sx={{
                            width: 36,
                            height: 36,
                            border: `2px solid ${
                              darkMode
                                ? "rgba(0,136,204,0.5)"
                                : "rgba(0,136,204,0.3)"
                            }`,
                          }}
                        />
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body1" fontWeight="medium">
                              {currentUserData.name}
                            </Typography>
                            <Chip
                              size="small"
                              label="YOU"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {currentUserData.department} -{" "}
                            {getStudentYearDisplay(
                              currentUserData.graduatingYear,
                              academicYearConfig,
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell
                      sx={{
                        borderBottom: `1px solid ${
                          darkMode
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)"
                        }`,
                        textAlign: "center",
                      }}
                    >
                      <ConsistencyStar
                        consistencyIndex={currentUserData.consistencyIndex || 0}
                      />
                    </TableCell>

                    <TableCell
                      sx={{
                        borderBottom: `1px solid ${
                          darkMode
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)"
                        }`,
                        textAlign: "center",
                      }}
                    >
                      <ScoreChange
                        currentScore={currentUserData.totalScore || 0}
                        previousScore={currentUserData.sevenDayScore || 0}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {currentUserData.rollNumber
                          ? currentUserData.rollNumber.toUpperCase()
                          : "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {currentUserData.department || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {currentUserData.section || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {currentUserData.graduatingYear}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: "#0088cc", fontWeight: 600 }}
                      >
                        {leaderboardType === "score"
                          ? currentUserData.totalScore || 0
                          : currentUserData.problemsSolved || 0}
                      </Typography>
                    </TableCell>

                    {/* Platform cells for current user */}
                    {leaderboardConfigs[leaderboardType].platforms.map(
                      (platform) => {
                        const value =
                          currentUserData.platformScores &&
                          currentUserData.platformScores[platform]
                            ? (leaderboardType === "score"
                                ? currentUserData.platformScores[platform].score
                                : currentUserData.platformScores[platform]
                                    .problemsSolved) || 0
                            : 0;

                        return (
                          <TableCell key={platform}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: platformColors[platform],
                                opacity: value > 0 ? 1 : 0.4,
                                fontWeight: value > 0 ? 600 : 400,
                              }}
                            >
                              {value}
                            </Typography>
                          </TableCell>
                        );
                      },
                    )}

                    <TableCell>
                      <Typography variant="body2">
                        {currentUserData.departmentRank || "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination and Entries Count */}
          <PaginationControls
            page={page}
            totalPages={Math.ceil(filteredUsers.length / rowsPerPage)}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              handlePageChange(1);
            }}
          />
        </Paper>
      </Container>
    </Box>
  );
};

export default Leaderboard;
