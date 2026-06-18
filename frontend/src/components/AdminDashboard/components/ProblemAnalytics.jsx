import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  IconButton,
  CircularProgress,
  Avatar,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import { PLATFORM_COLORS, CHART_COLORS } from "../utils/constants";
import { capitalize } from "../utils/helpers";
import { apiUrl } from "../../../config/apiConfig";

const ProblemAnalytics = ({ onRefresh = () => {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // State management
  const [selectedPeriod, setSelectedPeriod] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Fetch advanced analytics data
  const fetchAdvancedAnalytics = async (period = selectedPeriod) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${apiUrl}/stats/admin/advanced-analytics?period=${period}&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching advanced analytics:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // LAZY LOAD: Only fetch data when component first mounts
  useEffect(() => {
    if (!hasLoadedData) {
      try {
        fetchAdvancedAnalytics();
        setHasLoadedData(true);
      } catch (error) {
        console.error("Error in useEffect:", error);
        setError("Failed to initialize analytics component");
      }
    }
  }, [hasLoadedData]);

  // Fetch new data when period changes (only if already loaded)
  useEffect(() => {
    if (hasLoadedData) {
      fetchAdvancedAnalytics();
    }
  }, [selectedPeriod]);

  const handleTimeframeChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  const handleRefresh = () => {
    fetchAdvancedAnalytics();
  };

  // Format bar chart data for scores
  const formatBarChartData = () => {
    if (!analyticsData?.barChart?.length) return [];

    return analyticsData.barChart.map((item, index) => {
      let formattedName = item.period;

      // Format based on selected period
      if (selectedPeriod === "daily") {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (6 - index));
        formattedName = dayNames[targetDate.getDay()];
      } else if (selectedPeriod === "weekly") {
        formattedName = `Week ${index + 1}`;
      } else if (selectedPeriod === "monthly") {
        const monthNames = [
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
        const targetMonth = new Date(
          today.getFullYear(),
          today.getMonth() - (11 - index),
          1,
        );
        formattedName = monthNames[targetMonth.getMonth()];
      }

      return {
        name: formattedName,
        LeetCode_Avg: item.leetcode.avg,
        LeetCode_Max: item.leetcode.max,
        CodeChef_Avg: item.codechef.avg,
        CodeChef_Max: item.codechef.max,
        CodeForces_Avg: item.codeforces.avg,
        CodeForces_Max: item.codeforces.max,
        HackerRank_Avg: item.hackerrank.avg,
        HackerRank_Max: item.hackerrank.max,
        ScopeCODESTATS_Avg: item.scopecodestats?.avg || 0,
        ScopeCODESTATS_Max: item.scopecodestats?.max || 0,
      };
    });
  };

  // Format line chart data with proper labels based on period
  const formatLineChartData = (data, labelKey) => {
    if (!data?.length) return [];

    return data.map((item, index) => {
      let formattedName = item.period;

      // Format based on selected period
      if (selectedPeriod === "daily") {
        // Show day names: Sun, Mon, Tue, Wed, Thu, Fri, Sat
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (6 - index)); // Last 7 days
        formattedName = dayNames[targetDate.getDay()];
      } else if (selectedPeriod === "weekly") {
        // Show week labels: Week 1, Week 2, Week 3, Week 4
        formattedName = `Week ${index + 1}`;
      } else if (selectedPeriod === "monthly") {
        // Show month names: Jan, Feb, Mar, etc.
        const monthNames = [
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
        const targetMonth = new Date(
          today.getFullYear(),
          today.getMonth() - (11 - index),
          1,
        );
        formattedName = monthNames[targetMonth.getMonth()];
      }

      return {
        name: formattedName,
        period: item.period,
        LeetCode: item.leetcode,
        CodeChef: item.codechef,
        CodeForces: item.codeforces,
        HackerRank: item.hackerrank,
        ScopeCODESTATS: item.scopecodestats || 0,
      };
    });
  };

  // Format timeline data for other charts (GitHub, Contests)
  const formatTimelineData = (data) => {
    if (!data?.length) return [];

    return data.map((item, index) => {
      let formattedName = item.period;

      if (selectedPeriod === "daily") {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (6 - index));
        formattedName = dayNames[targetDate.getDay()];
      } else if (selectedPeriod === "weekly") {
        formattedName = `Week ${index + 1}`;
      } else if (selectedPeriod === "monthly") {
        const monthNames = [
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
        const targetMonth = new Date(
          today.getFullYear(),
          today.getMonth() - (11 - index),
          1,
        );
        formattedName = monthNames[targetMonth.getMonth()];
      }

      return {
        ...item,
        period: formattedName,
      };
    });
  };

  return (
    <Grid container spacing={3}>
      {/* Header with Time Period Filter */}
      <Grid item xs={12}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <AssessmentIcon
                sx={{ color: theme.palette.primary.main, fontSize: 28 }}
              />
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{
                  color:
                    theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
                }}
              >
                Advanced Platform Analytics
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="period-select-label">Time Period</InputLabel>
                <Select
                  labelId="period-select-label"
                  value={selectedPeriod}
                  label="Time Period"
                  onChange={handleTimeframeChange}
                  size="small"
                >
                  <MenuItem value="overall">Overall</MenuItem>
                  <MenuItem value="daily">Daily (7 days)</MenuItem>
                  <MenuItem value="weekly">Weekly (4 weeks)</MenuItem>
                  <MenuItem value="monthly">Monthly (12 months)</MenuItem>
                </Select>
              </FormControl>

              <Tooltip title="Refresh analytics data">
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Error Display */}
      {error && (
        <Grid item xs={12}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Grid>
      )}

      {/* Loading State */}
      {loading && (
        <Grid item xs={12}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={40} />
            <Typography
              variant="body1"
              sx={{
                ml: 2,
                color:
                  theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
              }}
            >
              Loading advanced analytics...
            </Typography>
          </Box>
        </Grid>
      )}

      {/* Platform Scores Bar Chart */}
      {!loading && analyticsData && (
        <>
          <Grid item xs={12} lg={8}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                height: "100%",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #232323"
                    : "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <TrendingUpIcon
                  sx={{ color: theme.palette.primary.main, mr: 1 }}
                />
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    color:
                      theme.palette.mode === "dark"
                        ? "#ffffff"
                        : "text.primary",
                  }}
                >
                  Platform Scores Comparison
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === "dark"
                      ? "#cccccc"
                      : "text.secondary",
                  mb: 3,
                }}
              >
                Average vs Maximum scores across all platforms
              </Typography>

              <Box sx={{ height: isTablet ? 350 : 450, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={formatBarChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={
                        theme.palette.mode === "dark" ? "#333" : "#e0e0e0"
                      }
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: isMobile ? 10 : 12,
                        fill:
                          theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: isMobile ? 10 : 12,
                        fill:
                          theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                      }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor:
                          theme.palette.mode === "dark" ? "#1a1a1a" : "white",
                        border: `1px solid ${
                          theme.palette.mode === "dark"
                            ? "#333"
                            : "rgba(0,0,0,0.1)"
                        }`,
                        borderRadius: "4px",
                        color:
                          theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                      }}
                    />
                    <Legend />

                    {/* Average Scores */}
                    <Bar
                      dataKey="LeetCode_Avg"
                      name="LeetCode Avg"
                      fill={PLATFORM_COLORS.leetcode}
                      opacity={0.7}
                    />
                    <Bar
                      dataKey="CodeChef_Avg"
                      name="CodeChef Avg"
                      fill={PLATFORM_COLORS.codechef}
                      opacity={0.7}
                    />
                    <Bar
                      dataKey="CodeForces_Avg"
                      name="CodeForces Avg"
                      fill={PLATFORM_COLORS.codeforces}
                      opacity={0.7}
                    />
                    <Bar
                      dataKey="HackerRank_Avg"
                      name="HackerRank Avg"
                      fill={PLATFORM_COLORS.hackerrank}
                      opacity={0.7}
                    />
                    <Bar
                      dataKey="ScopeCODESTATS_Avg"
                      name="ScopeCODESTATS Avg"
                      fill={PLATFORM_COLORS.scopecodestats}
                      opacity={0.7}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Top Performers */}
          <Grid item xs={12} lg={4}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                height: "100%",
                minHeight: "500px",
                maxHeight: "650px",
                display: "flex",
                flexDirection: "column",
                backgroundColor:
                  theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid #232323"
                    : "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PeopleIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    color:
                      theme.palette.mode === "dark"
                        ? "#ffffff"
                        : "text.primary",
                  }}
                >
                  Top 5 Performers
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === "dark"
                      ? "#cccccc"
                      : "text.secondary",
                  mb: 3,
                }}
              >
                Highest scoring students in selected period
              </Typography>

              <Box
                sx={{
                  flexGrow: 1,
                  overflow: "auto",
                  pr: 1,
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background:
                      theme.palette.mode === "dark" ? "#1a1a1a" : "#f1f1f1",
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: theme.palette.mode === "dark" ? "#555" : "#888",
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    background: theme.palette.mode === "dark" ? "#777" : "#555",
                  },
                }}
              >
                {analyticsData?.topUsers?.map((user, index) => (
                  <Card
                    key={user.id || index}
                    sx={{
                      mb: 2,
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#1a1a1a" : "#f8f9fa",
                      border:
                        index === 0
                          ? "2px solid #FFC107"
                          : `1px solid ${
                              theme.palette.mode === "dark" ? "#333" : "#e0e0e0"
                            }`,
                      boxShadow:
                        index === 0
                          ? "0 4px 12px rgba(255, 193, 7, 0.2)"
                          : "none",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow:
                          index === 0
                            ? "0 6px 16px rgba(255, 193, 7, 0.3)"
                            : "0 4px 12px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor:
                              index === 0
                                ? "#FFC107"
                                : index === 1
                                  ? "#C0C0C0"
                                  : index === 2
                                    ? "#CD7F32"
                                    : theme.palette.primary.main,
                            color: "white",
                            width: 44,
                            height: 44,
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </Avatar>
                        <Box
                          sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight={index === 0 ? "bold" : "medium"}
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? "#ffffff"
                                  : "text.primary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {user.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? "#cccccc"
                                  : "text.secondary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {user.department || "No Department"}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? "#999"
                                  : "text.secondary",
                            }}
                          >
                            {user.totalProblems} problems solved
                          </Typography>
                        </Box>
                        <Chip
                          label={`${user.totalScore} pts`}
                          size="small"
                          sx={{
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            height: "28px",
                            flexShrink: 0,
                            bgcolor:
                              index === 0
                                ? "rgba(255, 193, 7, 0.2)"
                                : theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(0, 0, 0, 0.1)",
                            color:
                              index === 0
                                ? "#FF6D00"
                                : theme.palette.mode === "dark"
                                  ? "#ffffff"
                                  : "text.primary",
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Platform Scores Timeline */}
          {selectedPeriod !== "overall" &&
            analyticsData?.scoresTimeline?.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid #232323"
                        : "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary",
                    }}
                  >
                    Platform Scores Over Time
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#cccccc"
                          : "text.secondary",
                      mb: 3,
                    }}
                  >
                    Average scores progression across platforms
                  </Typography>

                  <Box sx={{ height: isMobile ? 300 : 400, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatLineChartData(
                          analyticsData.scoresTimeline,
                          "period",
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={
                            theme.palette.mode === "dark" ? "#333" : "#e0e0e0"
                          }
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "#1a1a1a"
                                : "white",
                            border: `1px solid ${
                              theme.palette.mode === "dark"
                                ? "#333"
                                : "rgba(0,0,0,0.1)"
                            }`,
                            borderRadius: "4px",
                            color:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="LeetCode"
                          stroke={PLATFORM_COLORS.leetcode}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="CodeChef"
                          stroke={PLATFORM_COLORS.codechef}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="CodeForces"
                          stroke={PLATFORM_COLORS.codeforces}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="HackerRank"
                          stroke={PLATFORM_COLORS.hackerrank}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ScopeCODESTATS"
                          stroke={PLATFORM_COLORS.scopecodestats}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

          {/* GitHub Commits Timeline */}
          {selectedPeriod !== "overall" &&
            analyticsData?.githubCommitsTimeline?.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid #232323"
                        : "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary",
                    }}
                  >
                    GitHub Commits Over Time
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#cccccc"
                          : "text.secondary",
                      mb: 3,
                    }}
                  >
                    Total commits made by all users across the selected time
                    period
                  </Typography>

                  <Box sx={{ height: isMobile ? 300 : 400, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatTimelineData(
                          analyticsData.githubCommitsTimeline,
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={
                            theme.palette.mode === "dark" ? "#333" : "#e0e0e0"
                          }
                        />
                        <XAxis
                          dataKey="period"
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "#1a1a1a"
                                : "white",
                            border: `1px solid ${
                              theme.palette.mode === "dark"
                                ? "#333"
                                : "rgba(0,0,0,0.1)"
                            }`,
                            borderRadius: "4px",
                            color:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                          formatter={(value, name) => {
                            if (name === "totalCommits")
                              return [`${value} commits`, "Total Commits"];
                            if (name === "activeUsers")
                              return [`${value} users`, "Active Users"];
                            return [value, name];
                          }}
                        />
                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="totalCommits"
                          stroke="#28a745"
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          name="Total Commits"
                        />
                        <Line
                          type="monotone"
                          dataKey="activeUsers"
                          stroke="#17a2b8"
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          strokeDasharray="3 3"
                          name="Active Users"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

          {/* Contests Timeline */}
          {selectedPeriod !== "overall" &&
            analyticsData?.contestsTimeline?.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid #232323"
                        : "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary",
                    }}
                  >
                    Contest Participation Over Time
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#cccccc"
                          : "text.secondary",
                      mb: 3,
                    }}
                  >
                    Total contests attended/rated by all users across LeetCode,
                    CodeChef, and CodeForces
                  </Typography>

                  <Box sx={{ height: isMobile ? 300 : 400, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatTimelineData(
                          analyticsData.contestsTimeline,
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={
                            theme.palette.mode === "dark" ? "#333" : "#e0e0e0"
                          }
                        />
                        <XAxis
                          dataKey="period"
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "#1a1a1a"
                                : "white",
                            border: `1px solid ${
                              theme.palette.mode === "dark"
                                ? "#333"
                                : "rgba(0,0,0,0.1)"
                            }`,
                            borderRadius: "4px",
                            color:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                          formatter={(value, name) => {
                            if (name === "leetcode")
                              return [`${value} contests`, "LeetCode"];
                            if (name === "codechef")
                              return [`${value} contests`, "CodeChef"];
                            if (name === "codeforces")
                              return [`${value} contests`, "CodeForces"];
                            if (name === "totalContests")
                              return [`${value} contests`, "Total"];
                            return [value, name];
                          }}
                        />
                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="leetcode"
                          stroke={PLATFORM_COLORS.leetcode}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          name="LeetCode"
                        />
                        <Line
                          type="monotone"
                          dataKey="codechef"
                          stroke={PLATFORM_COLORS.codechef}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          name="CodeChef"
                        />
                        <Line
                          type="monotone"
                          dataKey="codeforces"
                          stroke={PLATFORM_COLORS.codeforces}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          name="CodeForces"
                        />
                        <Line
                          type="monotone"
                          dataKey="totalContests"
                          stroke="#dc3545"
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          strokeDasharray="5 5"
                          name="Total Contests"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

          {/* Platform Problems Timeline */}
          {selectedPeriod !== "overall" &&
            analyticsData?.problemsTimeline?.length > 0 && (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid #232323"
                        : "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    gutterBottom
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary",
                    }}
                  >
                    Problems Solved Over Time
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "#cccccc"
                          : "text.secondary",
                      mb: 3,
                    }}
                  >
                    Average problems solved progression across platforms
                  </Typography>

                  <Box sx={{ height: isMobile ? 300 : 400, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={formatLineChartData(
                          analyticsData.problemsTimeline,
                          "period",
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={
                            theme.palette.mode === "dark" ? "#333" : "#e0e0e0"
                          }
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: isMobile ? 10 : 12,
                            fill:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor:
                              theme.palette.mode === "dark"
                                ? "#1a1a1a"
                                : "white",
                            border: `1px solid ${
                              theme.palette.mode === "dark"
                                ? "#333"
                                : "rgba(0,0,0,0.1)"
                            }`,
                            borderRadius: "4px",
                            color:
                              theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#000000",
                          }}
                          formatter={(value, name) => [
                            `${Math.round(value)} problems`,
                            name,
                          ]}
                        />
                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="LeetCode"
                          stroke={PLATFORM_COLORS.leetcode}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="CodeChef"
                          stroke={PLATFORM_COLORS.codechef}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="CodeForces"
                          stroke={PLATFORM_COLORS.codeforces}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="HackerRank"
                          stroke={PLATFORM_COLORS.hackerrank}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="ScopeCODESTATS"
                          stroke={PLATFORM_COLORS.scopecodestats}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}
        </>
      )}

      {/* No Data State */}
      {!loading && !error && !analyticsData && (
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              backgroundColor:
                theme.palette.mode === "dark" ? "#0A0A0A" : "white",
              border:
                theme.palette.mode === "dark"
                  ? "1px solid #232323"
                  : "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color:
                  theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
                mb: 1,
              }}
            >
              No Analytics Data Available
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color:
                  theme.palette.mode === "dark" ? "#cccccc" : "text.secondary",
              }}
            >
              Please try refreshing or check back later when more data is
              available.
            </Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default ProblemAnalytics;
