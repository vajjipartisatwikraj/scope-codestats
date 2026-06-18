import React from "react";
import {
  Box,
  Typography,
  Button,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  getLiquidGlassStyle,
  getButtonGlassStyle,
  formatTooltipDate,
} from "./dashboardUtils";

/**
 * Dashboard Platform Performance Component
 * Displays multi-platform score progression over time with interactive filters
 *
 * Props:
 * - platformPerformance: Array containing performance data for all platforms over time
 * - platformLoading: Boolean indicating if data is being fetched
 * - platformTimeFilter: String ('daily', 'monthly', 'yearly')
 * - setPlatformTimeFilter: Function to update time filter
 * - darkMode: Boolean for theme styling
 * - loading: Boolean for overall loading state
 * - platformData: Object containing platform data
 */
const DashboardPlatformPerformance = ({
  platformPerformance,
  platformLoading,
  platformTimeFilter,
  setPlatformTimeFilter,
  darkMode,
  loading,
  platformData,
}) => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  // Always render the component - show loading, empty state, or data
  // Removed the check that hides the component when platformData is empty

  return (
    <Box
      sx={{
        ...getLiquidGlassStyle(darkMode),
        width: "100%",
        maxWidth: "1200px",
        mx: "auto",
        mb: 0,
        p: 0,
      }}
    >
      {/* Header with Left-aligned Heading and Separator */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5, md: 3 },
          pb: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: { xs: 1.5, sm: 0 },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.87)",
              fontWeight: 600,
              fontSize: { xs: "1rem", sm: "1.1rem" },
            }}
          >
            Platform Performance Over Time
          </Typography>

          {/* Filter Buttons */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {["daily", "monthly", "yearly"].map((period) => (
              <Button
                key={period}
                size="small"
                variant={
                  platformTimeFilter === period ? "contained" : "outlined"
                }
                onClick={() => setPlatformTimeFilter(period)}
                sx={{
                  ...getButtonGlassStyle(
                    darkMode,
                    platformTimeFilter === period
                  ),
                  borderRadius: "12px",
                  textTransform: "capitalize",
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  px: { xs: 1.5, sm: 2 },
                  py: 0.5,
                  minWidth: "auto",
                  fontWeight: 500,
                }}
              >
                {period}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Separator Line */}
        <Box
          sx={{
            width: "100%",
            height: "0.5px",
            background: darkMode
              ? "linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)"
              : "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)",
            mt: { xs: 1.5, sm: 2 },
          }}
        />
      </Box>

      {/* Content Wrapper */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.5, md: 3 },
          pt: { xs: 2, sm: 2.5, md: 3 },
          pb: { xs: 2, sm: 2.5, md: 3 },
        }}
      >
        {/* Chart Container */}
        <Box
          sx={{
            height: { xs: 350, sm: 400, md: 480 },
            width: "100%",
            position: "relative",
          }}
        >
          {platformPerformance && platformPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={platformPerformance}
                margin={
                  isMobile
                    ? { top: 5, right: 5, left: 0, bottom: 5 }
                    : { top: 10, right: 15, left: 5, bottom: 15 }
                }
              >
                <defs>
                  <linearGradient
                    id="colorLeetcode"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#FFA116" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#FFA116" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorCodeforces"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#1E88E5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1E88E5" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorCodechef"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#8B4513" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8B4513" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: isMobile ? 9 : 11,
                    angle: -45,
                    textAnchor: "end",
                  }}
                  height={isMobile ? 35 : 40}
                  interval={Math.max(
                    Math.floor(platformPerformance.length / (isMobile ? 6 : 8)),
                    0
                  )}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 8 : 9 }}
                  width={isMobile ? 28 : 35}
                  label={
                    !isMobile
                      ? {
                          value: "Score",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 10 },
                        }
                      : undefined
                  }
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      // Get pastDate from the first payload item
                      const pastDate = payload[0]?.payload?.pastDate;

                      return (
                        <Box
                          sx={{
                            background: darkMode
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(255, 255, 255, 0.15)",
                            backdropFilter: "blur(100px) saturate(180%)",
                            WebkitBackdropFilter: "blur(100px) saturate(180%)",
                            border: darkMode
                              ? "1px solid rgba(255, 255, 255, 0.18)"
                              : "1px solid rgba(255, 255, 255, 0.4)",
                            borderRadius: "16px",
                            padding: "16px 18px",
                            boxShadow: darkMode
                              ? "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                              : "0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
                            minWidth: "180px",
                          }}
                        >
                          {/* Header */}
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: darkMode
                                ? "#FFFFFF"
                                : "rgba(0, 0, 0, 0.9)",
                              mb: 0.5,
                            }}
                          >
                            {label}
                          </Typography>

                          {/* Date Info */}
                          {pastDate && (
                            <Typography
                              sx={{
                                fontSize: "0.7rem",
                                fontWeight: 500,
                                color: darkMode
                                  ? "rgba(255,255,255,0.6)"
                                  : "rgba(0,0,0,0.5)",
                                mb: 1.25,
                                pb: 1,
                                borderBottom: darkMode
                                  ? "0.5px solid rgba(255, 255, 255, 0.2)"
                                  : "0.5px solid rgba(0, 0, 0, 0.15)",
                              }}
                            >
                              Compared to: {formatTooltipDate(pastDate)}
                            </Typography>
                          )}

                          {/* Content */}
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.75,
                            }}
                          >
                            {payload.map((entry, index) => (
                              <Box
                                key={index}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 2,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: "10px",
                                      height: "10px",
                                      borderRadius: "50%",
                                      backgroundColor: entry.color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <Typography
                                    sx={{
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                      color: darkMode
                                        ? "rgba(255,255,255,0.85)"
                                        : "rgba(0,0,0,0.7)",
                                      filter: darkMode
                                        ? "brightness(1.2)"
                                        : "brightness(0.95)",
                                    }}
                                  >
                                    {entry.name}
                                  </Typography>
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: darkMode
                                      ? "#FFFFFF"
                                      : "rgba(0, 0, 0, 0.9)",
                                  }}
                                >
                                  {entry.value}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: isMobile ? "0.65rem" : "0.75rem",
                    paddingTop: isMobile ? "8px" : "12px",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="codechef"
                  stroke="#8B4513"
                  fillOpacity={1}
                  fill="url(#colorCodechef)"
                  name="CodeChef"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="codeforces"
                  stroke="#1E88E5"
                  fillOpacity={1}
                  fill="url(#colorCodeforces)"
                  name="CodeForces"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="leetcode"
                  stroke="#FFA116"
                  fillOpacity={1}
                  fill="url(#colorLeetcode)"
                  name="LeetCode"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }}
              >
                No Platform Performance Data
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                }}
              >
                Platform performance data will appear here once you start
                solving problems.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPlatformPerformance;
