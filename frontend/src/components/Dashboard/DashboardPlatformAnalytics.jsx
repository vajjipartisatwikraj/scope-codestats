import React from "react";
import {
  Box,
  Typography,
  Grid,
  Tooltip,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  getLiquidGlassStyle,
  getInnerGlassStyle,
  platforms,
} from "./dashboardUtils";

/**
 * Dashboard Platform Analytics Component
 * Displays weekly rating trends, distribution pie chart, and problem-solving bar chart
 *
 * Props:
 * - analyticsData: Object containing platform analytics (weeklyRatings, platformDistribution, problemsDistribution)
 * - analyticsLoading: Boolean indicating if data is being fetched
 * - darkMode: Boolean for theme styling
 */
const DashboardPlatformAnalytics = ({
  analyticsData,
  analyticsLoading,
  darkMode,
  compact = false, // New prop to control compact view
}) => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  if (
    analyticsLoading ||
    !analyticsData ||
    analyticsData.error ||
    analyticsData.empty
  ) {
    return null;
  }

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
      {/* Header Section - Matching Performance Overview */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: { xs: 1.5, sm: 1.5 },
          borderBottom: darkMode
            ? "0.5px solid rgba(255, 255, 255, 0.10)"
            : "0.5px solid rgba(0, 0, 0, 0.08)",
          background: "transparent",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: { xs: "1rem", sm: "1.1rem" },
            color: darkMode ? "#FFFFFF" : "rgba(0, 0, 0, 0.75)",
            letterSpacing: "-0.01em",
          }}
        >
          Platform Analytics
        </Typography>
      </Box>

      {/* Content Section */}
      <Box
        sx={{
          p: { xs: 2, md: 3 },
        }}
      >
        {/* Weekly Rating Trends Line Charts - Last 4 Weeks */}
        {analyticsData?.platformTrends ? (
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            sx={{ mb: { xs: 2, md: 3 } }}
          >
            {["leetcode", "codechef", "codeforces"].map((platform, index) => {
              const platformColor =
                platforms.find((p) => p.key === platform)?.color || "#0585E0";

              // Use real data from API response, fallback to empty weeks
              const weeklyRatingData = analyticsData?.platformTrends?.[platform]
                ?.ratingData || [
                { week: "Week 1", rating: 0, change: 0 },
                { week: "Week 2", rating: 0, change: 0 },
                { week: "Week 3", rating: 0, change: 0 },
                { week: "Week 4", rating: 0, change: 0 },
              ];

              // Get current rating and change from real data
              const currentRating =
                analyticsData?.platformTrends?.[platform]?.currentRating ||
                weeklyRatingData[weeklyRatingData.length - 1]?.rating ||
                0;
              const ratingChange =
                analyticsData?.platformTrends?.[platform]?.ratingChange ||
                weeklyRatingData[weeklyRatingData.length - 1]?.change ||
                0;

              return (
                <Grid item xs={12} md={4} key={platform}>
                  <Box
                    sx={{
                      ...getInnerGlassStyle(darkMode),
                      p: { xs: 2, md: 2.5 },
                      height: { xs: "260px", sm: "280px", md: "300px" },
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header with platform name and current rating */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: { xs: 2, md: 2.5 },
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.87)",
                            fontWeight: 600,
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            textTransform: "capitalize",
                            mb: 0.5,
                          }}
                        >
                          {platform}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: darkMode
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
                          }}
                        >
                          Last 4 Weeks Rating
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="h5"
                          sx={{
                            color: platformColor,
                            fontWeight: 700,
                            fontSize: { xs: "1.2rem", sm: "1.4rem" },
                            lineHeight: 1,
                          }}
                        >
                          {typeof currentRating === "number"
                            ? currentRating.toFixed(2)
                            : currentRating}
                        </Typography>
                        {ratingChange !== 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: ratingChange > 0 ? "#4CAF50" : "#f44336",
                              fontWeight: 600,
                              fontSize: { xs: "0.65rem", sm: "0.7rem" },
                            }}
                          >
                            {ratingChange > 0 ? "+" : ""}
                            {ratingChange}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Line Chart */}
                    <Box
                      sx={{
                        flexGrow: 1,
                        height: { xs: "160px", sm: "180px" },
                      }}
                    >
                      {weeklyRatingData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={weeklyRatingData}
                            margin={
                              isMobile
                                ? { top: 5, right: 5, left: 0, bottom: 5 }
                                : { top: 5, right: 15, left: 5, bottom: 5 }
                            }
                          >
                            <defs>
                              <linearGradient
                                id={`areaGradient${platform}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor={platformColor}
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="50%"
                                  stopColor={platformColor}
                                  stopOpacity={0.4}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={platformColor}
                                  stopOpacity={0.1}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }
                            />
                            <XAxis
                              dataKey="week"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fontSize: isMobile ? 9 : 11,
                                fill: darkMode
                                  ? "rgba(255,255,255,0.7)"
                                  : "rgba(0,0,0,0.7)",
                              }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fontSize: isMobile ? 8 : 9,
                                fill: darkMode
                                  ? "rgba(255,255,255,0.6)"
                                  : "rgba(0,0,0,0.6)",
                              }}
                              domain={[
                                (dataMin) => {
                                  const minValue = Math.min(
                                    ...weeklyRatingData.map((d) => d.rating),
                                  );
                                  return Math.max(0, minValue - 100);
                                },
                                (dataMax) => {
                                  const maxValue = Math.max(
                                    ...weeklyRatingData.map((d) => d.rating),
                                  );
                                  return maxValue + 100;
                                },
                              ]}
                              tickFormatter={(value) => Math.round(value)}
                              width={isMobile ? 32 : 35}
                            />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const ratingValue = payload[0].value;
                                  const changeValue = payload[0].payload.change;

                                  return (
                                    <Box
                                      sx={{
                                        background: darkMode
                                          ? "rgba(255, 255, 255, 0.05)"
                                          : "rgba(255, 255, 255, 0.15)",
                                        backdropFilter:
                                          "blur(100px) saturate(180%)",
                                        WebkitBackdropFilter:
                                          "blur(100px) saturate(180%)",
                                        border: darkMode
                                          ? "1px solid rgba(255, 255, 255, 0.18)"
                                          : "1px solid rgba(255, 255, 255, 0.4)",
                                        borderRadius: "14px",
                                        overflow: "hidden",
                                        boxShadow: darkMode
                                          ? `
                                          0 8px 32px rgba(0, 0, 0, 0.4),
                                          0 2px 8px rgba(0, 0, 0, 0.2),
                                          inset 0 1px 0 rgba(255, 255, 255, 0.15),
                                          inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                        `
                                          : `
                                          0 8px 32px rgba(0, 0, 0, 0.12),
                                          0 2px 8px rgba(0, 0, 0, 0.08),
                                          inset 0 1px 0 rgba(255, 255, 255, 0.6),
                                          inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                                        `,
                                        minWidth: "140px",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          px: 2,
                                          py: 1.25,
                                          borderBottom: darkMode
                                            ? "0.5px solid rgba(255, 255, 255, 0.2)"
                                            : "0.5px solid rgba(0, 0, 0, 0.15)",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontWeight: 600,
                                            fontSize: "0.8rem",
                                            color: darkMode
                                              ? "#FFFFFF"
                                              : "rgba(0, 0, 0, 0.9)",
                                            letterSpacing: "-0.01em",
                                            textShadow: darkMode
                                              ? "0 2px 8px rgba(0,0,0,0.3)"
                                              : "0 1px 2px rgba(255,255,255,0.8)",
                                          }}
                                        >
                                          {label}
                                        </Typography>
                                      </Box>

                                      <Box sx={{ px: 2, py: 1.5 }}>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 2,
                                            mb:
                                              changeValue !== undefined &&
                                              changeValue !== 0
                                                ? 1
                                                : 0,
                                          }}
                                        >
                                          <Typography
                                            sx={{
                                              fontSize: "0.75rem",
                                              color: darkMode
                                                ? "rgba(255,255,255,0.85)"
                                                : "rgba(0,0,0,0.7)",
                                              fontWeight: 500,
                                              textShadow: darkMode
                                                ? "0 1px 4px rgba(0,0,0,0.2)"
                                                : "none",
                                            }}
                                          >
                                            Rating
                                          </Typography>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 0.75,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                width: "6px",
                                                height: "6px",
                                                borderRadius: "50%",
                                                bgcolor: platformColor,
                                                boxShadow: `0 0 8px ${platformColor}cc`,
                                              }}
                                            />
                                            <Typography
                                              sx={{
                                                fontSize: "0.85rem",
                                                color: platformColor,
                                                fontFamily: "nekst, monospace",
                                                fontWeight: 700,
                                                textShadow: darkMode
                                                  ? "0 1px 4px rgba(0,0,0,0.3)"
                                                  : "none",
                                                filter: darkMode
                                                  ? "brightness(1.2)"
                                                  : "brightness(0.95)",
                                              }}
                                            >
                                              {ratingValue}
                                            </Typography>
                                          </Box>
                                        </Box>

                                        {changeValue !== undefined &&
                                          changeValue !== 0 && (
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 2,
                                              }}
                                            >
                                              <Typography
                                                sx={{
                                                  fontSize: "0.75rem",
                                                  color: darkMode
                                                    ? "rgba(255,255,255,0.85)"
                                                    : "rgba(0,0,0,0.7)",
                                                  fontWeight: 500,
                                                  textShadow: darkMode
                                                    ? "0 1px 4px rgba(0,0,0,0.2)"
                                                    : "none",
                                                }}
                                              >
                                                Change
                                              </Typography>
                                              <Typography
                                                sx={{
                                                  fontSize: "0.75rem",
                                                  color:
                                                    changeValue > 0
                                                      ? "#4CAF50"
                                                      : "#f44336",
                                                  fontWeight: 600,
                                                  textShadow: darkMode
                                                    ? "0 1px 4px rgba(0,0,0,0.3)"
                                                    : "none",
                                                }}
                                              >
                                                {changeValue > 0 ? "+" : ""}
                                                {changeValue}
                                              </Typography>
                                            </Box>
                                          )}
                                      </Box>
                                    </Box>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="rating"
                              stroke={platformColor}
                              strokeWidth={3}
                              fill={`url(#areaGradient${platform})`}
                              fillOpacity={1}
                              dot={{
                                fill: platformColor,
                                strokeWidth: 2,
                                stroke: darkMode ? "#1e1e1e" : "white",
                                r: 5,
                              }}
                              activeDot={{
                                r: 7,
                                fill: platformColor,
                                stroke: darkMode ? "#1e1e1e" : "white",
                                strokeWidth: 3,
                                filter: `drop-shadow(0 0 6px ${platformColor}40)`,
                              }}
                              connectNulls={true}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: darkMode
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.4)",
                              textAlign: "center",
                            }}
                          >
                            📈
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: darkMode
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.4)",
                              mt: 1,
                            }}
                          >
                            No rating data
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
            }}
          >
            <Typography variant="body2">
              Platform analytics will be available after data sync
            </Typography>
          </Box>
        )}

        {/* Middle Row - Gauge and Bar Chart */}
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* Score Distribution Gauge */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                ...getInnerGlassStyle(darkMode),
                p: compact ? { xs: 1.25, md: 1.5 } : { xs: 2, md: 2.5 },
                height: compact
                  ? { xs: "190px", sm: "205px", md: "240px" }
                  : { xs: "280px", sm: "300px", md: "320px" },
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.87)",
                  fontWeight: 600,
                  mb: compact ? { xs: 0.75, md: 1 } : { xs: 2, md: 2.5 },
                  textAlign: "center",
                  fontSize: compact
                    ? { xs: "0.75rem", sm: "0.8rem", md: "0.85rem" }
                    : { xs: "0.9rem", sm: "0.95rem", md: "1rem" },
                  letterSpacing: "-0.01em",
                }}
              >
                Score Distribution
              </Typography>

              <Box
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {analyticsData?.scoreDistribution &&
                Object.values(analyticsData.scoreDistribution).some(
                  (val) => val > 0,
                ) ? (
                  <PieChart
                    series={[
                      {
                        data: Object.entries(analyticsData.scoreDistribution)
                          .filter(([platform, score]) => score > 0)
                          .map(([platform, score], index) => ({
                            id: platform,
                            value: score,
                            label:
                              platform === "scopecodestats"
                                ? "ScopeCODESTATS"
                                : platform.charAt(0).toUpperCase() +
                                  platform.slice(1),
                            color:
                              platforms.find((p) => p.key === platform)
                                ?.color ||
                              [
                                "#0585E0",
                                "#FFA116",
                                "#5B4638",
                                "#2F8D46",
                                "#00AB6C",
                                "#333333",
                              ][index],
                            actualScore: score,
                            percentage:
                              analyticsData.scorePercentages?.[platform] || 0,
                          })),
                        innerRadius: compact
                          ? isMobile
                            ? 20
                            : 28
                          : isMobile
                            ? 35
                            : 45,
                        outerRadius: compact
                          ? isMobile
                            ? 42
                            : 52
                          : isMobile
                            ? 65
                            : 90,
                        paddingAngle: 2,
                        cornerRadius: 4,
                        highlightScope: {
                          faded: "global",
                          highlighted: "item",
                        },
                        faded: {
                          innerRadius: isMobile ? 25 : 33,
                          additionalRadius: -10,
                          color: "gray",
                        },
                      },
                    ]}
                    width={
                      compact ? (isMobile ? 165 : 190) : isMobile ? 260 : 300
                    }
                    height={
                      compact ? (isMobile ? 120 : 140) : isMobile ? 200 : 240
                    }
                    margin={
                      compact
                        ? isMobile
                          ? { top: 5, bottom: 5, left: 5, right: 5 }
                          : { top: 5, bottom: 5, left: 5, right: 5 }
                        : isMobile
                          ? { top: 5, bottom: 5, left: 5, right: 5 }
                          : { top: 20, bottom: 20, left: 20, right: 20 }
                    }
                    slotProps={{
                      pieArcLabel: {
                        style: {
                          fontSize: compact
                            ? isMobile
                              ? "0.4rem"
                              : "0.5rem"
                            : isMobile
                              ? "0.55rem"
                              : "0.65rem",
                          fontWeight: 700,
                          fill: "#ffffff",
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        },
                      },
                      legend: {
                        padding: compact
                          ? isMobile
                            ? 0
                            : 5
                          : isMobile
                            ? 0
                            : 10,
                      },
                    }}
                    tooltip={{
                      trigger: "item",
                      content: ({ datum }) => (
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
                            borderRadius: "14px",
                            overflow: "hidden",
                            boxShadow: darkMode
                              ? `
                              0 8px 32px rgba(0, 0, 0, 0.4),
                              0 2px 8px rgba(0, 0, 0, 0.2),
                              inset 0 1px 0 rgba(255, 255, 255, 0.15),
                              inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                            `
                              : `
                              0 8px 32px rgba(0, 0, 0, 0.12),
                              0 2px 8px rgba(0, 0, 0, 0.08),
                              inset 0 1px 0 rgba(255, 255, 255, 0.6),
                              inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                            `,
                            minWidth: "160px",
                          }}
                        >
                          <Box
                            sx={{
                              px: 2,
                              py: 1.25,
                              borderBottom: darkMode
                                ? "0.5px solid rgba(255, 255, 255, 0.2)"
                                : "0.5px solid rgba(0, 0, 0, 0.15)",
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.8rem",
                                color: darkMode
                                  ? "#FFFFFF"
                                  : "rgba(0, 0, 0, 0.9)",
                                letterSpacing: "-0.01em",
                                textShadow: darkMode
                                  ? "0 2px 8px rgba(0,0,0,0.3)"
                                  : "0 1px 2px rgba(255,255,255,0.8)",
                              }}
                            >
                              {datum.label}
                            </Typography>
                          </Box>

                          <Box sx={{ px: 2, py: 1.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                mb: 1,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: darkMode
                                    ? "rgba(255,255,255,0.85)"
                                    : "rgba(0,0,0,0.7)",
                                  fontWeight: 500,
                                  textShadow: darkMode
                                    ? "0 1px 4px rgba(0,0,0,0.2)"
                                    : "none",
                                }}
                              >
                                Score
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    bgcolor: datum.color,
                                    boxShadow: `0 0 8px ${datum.color}cc`,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: datum.color,
                                    fontFamily: "nekst, monospace",
                                    fontWeight: 700,
                                    textShadow: darkMode
                                      ? "0 1px 4px rgba(0,0,0,0.3)"
                                      : "none",
                                    filter: darkMode
                                      ? "brightness(1.2)"
                                      : "brightness(0.95)",
                                  }}
                                >
                                  {datum.value.toLocaleString()}
                                </Typography>
                              </Box>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: darkMode
                                    ? "rgba(255,255,255,0.85)"
                                    : "rgba(0,0,0,0.7)",
                                  fontWeight: 500,
                                  textShadow: darkMode
                                    ? "0 1px 4px rgba(0,0,0,0.2)"
                                    : "none",
                                }}
                              >
                                Percentage
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: darkMode
                                    ? "rgba(255,255,255,0.9)"
                                    : "rgba(0,0,0,0.85)",
                                  fontWeight: 600,
                                  textShadow: darkMode
                                    ? "0 1px 4px rgba(0,0,0,0.3)"
                                    : "none",
                                }}
                              >
                                {datum.percentage?.toFixed(1) || 0}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      ),
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: darkMode
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(0,0,0,0.3)",
                      textAlign: "center",
                    }}
                  >
                    <Box sx={{ fontSize: "2rem", mb: 1 }}>📊</Box>
                    <Typography variant="caption">
                      No score data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Problems Solved Bar Chart */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                ...getInnerGlassStyle(darkMode),
                p: compact ? { xs: 1.25, md: 1.5 } : { xs: 2, md: 2.5 },
                height: compact
                  ? { xs: "190px", sm: "200px", md: "240px" }
                  : { xs: "280px", sm: "300px", md: "320px" },
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  color: darkMode ? "#ffffff" : "rgba(0, 0, 0, 0.87)",
                  fontWeight: 600,
                  mb: compact ? { xs: 0.75, md: 1 } : { xs: 2, md: 2.5 },
                  textAlign: "center",
                  fontSize: compact
                    ? { xs: "0.75rem", sm: "0.8rem", md: "0.85rem" }
                    : { xs: "0.9rem", sm: "0.95rem", md: "1rem" },
                  letterSpacing: "-0.01em",
                }}
              >
                Problems Solved by Platform
              </Typography>

              <Box
                sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
              >
                {analyticsData?.problemsSolvedByPlatform &&
                Object.values(analyticsData.problemsSolvedByPlatform).some(
                  (val) => val > 0,
                ) ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Enhanced Bar Chart */}
                    <Box
                      sx={{
                        flexGrow: 1,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-evenly",
                        gap: compact ? { xs: 0.5, sm: 1 } : { xs: 1, sm: 2 },
                        px: compact ? { xs: 1, sm: 1.5 } : { xs: 1.5, sm: 2.5 },
                        pb: compact ? { xs: 0.5, sm: 1 } : { xs: 1.5, sm: 3 },
                        pt: compact ? { xs: 0.25, sm: 0.5 } : { xs: 1, sm: 2 },
                        minHeight: compact
                          ? { xs: "70px", sm: "90px" }
                          : { xs: "150px", sm: "200px" },
                        position: "relative",
                      }}
                    >
                      {Object.entries(analyticsData.problemsSolvedByPlatform)
                        .filter(([platform, count]) => platform !== "github") // Exclude GitHub
                        .map(([platform, count]) => {
                          const filteredData = Object.fromEntries(
                            Object.entries(
                              analyticsData.problemsSolvedByPlatform,
                            ).filter(([p]) => p !== "github"),
                          );
                          const maxValue = Math.max(
                            ...Object.values(filteredData),
                          );
                          const baseHeight = compact
                            ? isMobile
                              ? 60
                              : 80
                            : isMobile
                              ? 135
                              : 180;
                          const height =
                            maxValue > 0 ? (count / maxValue) * baseHeight : 0;
                          const platformColor =
                            platforms.find((p) => p.key === platform)?.color ||
                            "#0585E0";

                          return (
                            <Tooltip
                              key={platform}
                              title={
                                <Box
                                  sx={{
                                    background: darkMode
                                      ? "rgba(255, 255, 255, 0.05)"
                                      : "rgba(255, 255, 255, 0.15)",
                                    backdropFilter:
                                      "blur(100px) saturate(180%)",
                                    WebkitBackdropFilter:
                                      "blur(100px) saturate(180%)",
                                    border: darkMode
                                      ? "1px solid rgba(255, 255, 255, 0.18)"
                                      : "1px solid rgba(255, 255, 255, 0.4)",
                                    borderRadius: "14px",
                                    overflow: "hidden",
                                    boxShadow: darkMode
                                      ? `
                                    0 8px 32px rgba(0, 0, 0, 0.4),
                                    0 2px 8px rgba(0, 0, 0, 0.2),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.15),
                                    inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                  `
                                      : `
                                    0 8px 32px rgba(0, 0, 0, 0.12),
                                    0 2px 8px rgba(0, 0, 0, 0.08),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.6),
                                    inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                                  `,
                                    minWidth: "140px",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      px: 2,
                                      py: 1.25,
                                      borderBottom: darkMode
                                        ? "0.5px solid rgba(255, 255, 255, 0.2)"
                                        : "0.5px solid rgba(0, 0, 0, 0.15)",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.8rem",
                                        color: darkMode
                                          ? "#FFFFFF"
                                          : "rgba(0, 0, 0, 0.9)",
                                        letterSpacing: "-0.01em",
                                        textShadow: darkMode
                                          ? "0 2px 8px rgba(0,0,0,0.3)"
                                          : "0 1px 2px rgba(255,255,255,0.8)",
                                        textTransform: "capitalize",
                                      }}
                                    >
                                      {platform === "scopecodestats"
                                        ? "ScopeCODESTATS"
                                        : platform}
                                    </Typography>
                                  </Box>

                                  <Box sx={{ px: 2, py: 1.5 }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 2,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: compact
                                            ? "0.7rem"
                                            : "0.7rem",
                                          color: darkMode
                                            ? "rgba(255,255,255,0.85)"
                                            : "rgba(0,0,0,0.7)",
                                          fontWeight: 500,
                                          textShadow: darkMode
                                            ? "0 1px 4px rgba(0,0,0,0.2)"
                                            : "none",
                                        }}
                                      >
                                        Problems Solved
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.7,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            bgcolor: platformColor,
                                            boxShadow: `0 0 8px ${platformColor}cc`,
                                          }}
                                        />
                                        <Typography
                                          sx={{
                                            fontSize: compact
                                              ? "0.75rem"
                                              : "0.75rem",
                                            color: platformColor,
                                            fontFamily: "nekst, monospace",
                                            fontWeight: 700,
                                            textShadow: darkMode
                                              ? "0 1px 4px rgba(0,0,0,0.3)"
                                              : "none",
                                            filter: darkMode
                                              ? "brightness(1.2)"
                                              : "brightness(0.95)",
                                          }}
                                        >
                                          {count}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>
                              }
                              placement="top"
                              arrow
                              componentsProps={{
                                tooltip: {
                                  sx: {
                                    bgcolor: "transparent",
                                    p: 0,
                                    m: 0,
                                    boxShadow: "none",
                                    "& .MuiTooltip-arrow": {
                                      color: darkMode
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(255, 255, 255, 0.15)",
                                      "&::before": {
                                        border: darkMode
                                          ? "1px solid rgba(255, 255, 255, 0.18)"
                                          : "1px solid rgba(255, 255, 255, 0.4)",
                                      },
                                    },
                                  },
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  width: { xs: "45px", sm: "55px", md: "65px" },
                                  position: "relative",
                                  cursor: "pointer",
                                }}
                              >
                                {/* Simple Bar - No 3D Effect */}
                                <Box
                                  sx={{
                                    width: "100%",
                                    height: `${height}px`,
                                    background: platformColor,
                                    borderRadius: {
                                      xs: "4px 4px 0 0",
                                      sm: "8px 8px 0 0",
                                    },
                                    transition: "all 0.3s ease",
                                    position: "relative",
                                    "&:hover": {
                                      transform: "scaleY(1.05)",
                                      filter: "brightness(1.1)",
                                    },
                                  }}
                                />

                                {/* Simple Platform Label */}
                                <Box
                                  sx={{
                                    mt: { xs: 0.75, sm: 1.5 },
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: compact
                                        ? { xs: "0.5rem", sm: "0.6rem" }
                                        : { xs: "0.6rem", sm: "0.7rem" },
                                      fontWeight: 600,
                                      color: platformColor,
                                      textAlign: "center",
                                      textTransform: "capitalize",
                                      lineHeight: 1,
                                      letterSpacing: "-0.01em",
                                    }}
                                  >
                                    {platform === "scopecodestats"
                                      ? "ScopeCODESTATS"
                                      : platform}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: compact
                                        ? { xs: "0.45rem", sm: "0.55rem" }
                                        : { xs: "0.55rem", sm: "0.65rem" },
                                      fontWeight: 500,
                                      color: darkMode
                                        ? "rgba(255,255,255,0.5)"
                                        : "rgba(0,0,0,0.5)",
                                      mt: 0.2,
                                    }}
                                  >
                                    {count} solved
                                  </Typography>
                                </Box>
                              </Box>
                            </Tooltip>
                          );
                        })}
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      height: 250,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: darkMode
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(0,0,0,0.3)",
                      textAlign: "center",
                    }}
                  >
                    <Box sx={{ fontSize: "2rem", mb: 1 }}>📈</Box>
                    <Typography variant="caption">
                      No problems data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPlatformAnalytics;
