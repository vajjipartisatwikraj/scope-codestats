import React, { useMemo } from "react";
import { Alert, Box, Typography } from "@mui/material";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SERIES,
  bucketLabel,
  bucketRange,
  chartTheme,
  formatNumber,
  longDate,
  pluralize,
  shortDate,
  signed,
} from "../Dashboard/progress/progressFormat";
import { ChartCard, ChartGrid, EmptyChart, KpiRow, KpiTile } from "./deprecated_ProgressWidgets";

const unitOf = (granularity) => (granularity === "day" ? "day" : granularity === "week" ? "week" : "month");

/**
 * Charts for a platform whose history is stored (LeetCode, Codeforces, CodeChef,
 * HackerRank). Only the charts the platform supports are drawn (`capabilities`).
 *
 * The series is already complete for every day of the range (the server carries values
 * forward over days with no stored snapshot), with `null` before the first reading and for
 * "unrated", so lines show gaps there instead of false zeros.
 */
const CodingPlatformProgress = ({ answer, color, darkMode }) => {
  const theme = chartTheme(darkMode);
  const { series, summary, buckets, capabilities, difficulty, range } = answer;
  const unit = unitOf(buckets?.granularity);

  const axis = { stroke: theme.text, fontSize: 11, tickLine: false };
  const ticks = { minTickGap: 28, tickFormatter: shortDate };

  const barData = useMemo(
    () =>
      (buckets?.items || []).map((bucket) => ({
        ...bucket,
        label: bucketLabel(bucket, buckets.granularity),
        range: bucketRange(bucket),
      })),
    [buckets]
  );

  // Not an answer with data (the page shows a notice for those); never crash on one.
  if (!series || !summary || !buckets) return null;

  const difficultyData = difficulty
    ? [
        { name: "Easy", value: difficulty.easy || 0, color: SERIES.easy },
        { name: "Medium", value: difficulty.medium || 0, color: SERIES.medium },
        { name: "Hard", value: difficulty.hard || 0, color: SERIES.hard },
      ].filter((slice) => slice.value > 0)
    : [];

  const hasRating = capabilities.rating && series.some((point) => point.rating !== null);
  const hasContests = capabilities.contests && (summary.contests > 0 || summary.contestsGained > 0);
  const tooltipStyle = { contentStyle: theme.tooltip, labelStyle: { color: theme.tooltip.color } };

  return (
    <Box>
      {answer.staleDays >= 2 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Last updated {pluralize(answer.staleDays, "day")} ago. The numbers below are carried forward from
          that update.
        </Alert>
      )}
      {answer.warning && (
        <Alert severity={answer.warning.accountMissing ? "error" : "warning"} sx={{ mb: 2 }}>
          {answer.warning.accountMissing
            ? "This account can no longer be found on the platform. Showing the last known data. "
            : "The latest update failed, so the numbers may be behind. "}
          {answer.warning.message}
        </Alert>
      )}

      <KpiRow>
        <KpiTile
          darkMode={darkMode}
          color={color}
          label="Problems solved"
          value={formatNumber(summary.problemsSolved)}
          hint={`${signed(summary.problemsGained)} in this range`}
        />
        {capabilities.rating && (
          <KpiTile
            darkMode={darkMode}
            color={SERIES.rating}
            label="Contest rating"
            value={summary.rating === null ? "Unrated" : formatNumber(summary.rating)}
            hint={
              summary.rating === null
                ? "No rated contest yet"
                : `${signed(summary.ratingChange)} in range · peak ${formatNumber(summary.peakRating)}`
            }
          />
        )}
        {capabilities.contests && (
          <KpiTile
            darkMode={darkMode}
            color={SERIES.contests}
            label="Contests attended"
            value={formatNumber(summary.contests)}
            hint={`${signed(summary.contestsGained)} in this range`}
          />
        )}
        <KpiTile
          darkMode={darkMode}
          label="Active days"
          value={formatNumber(summary.activeDays)}
          hint={
            summary.bestDay
              ? `Best day: ${pluralize(summary.bestDay.count, "problem")} on ${shortDate(summary.bestDay.date)}`
              : `Out of ${range.days} days`
          }
        />
      </KpiRow>

      <ChartGrid>
        <ChartCard
          darkMode={darkMode}
          title="Total problems solved"
          subtitle={`Running total, ${range.days} days`}
        >
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${answer.platform}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="date" {...axis} {...ticks} />
              <YAxis {...axis} allowDecimals={false} domain={["dataMin", "dataMax"]} width={48} />
              <Tooltip {...tooltipStyle} labelFormatter={longDate} formatter={(v) => [formatNumber(v), "Solved"]} />
              <Area
                type="monotone"
                dataKey="problemsSolved"
                stroke={color}
                strokeWidth={2}
                fill={`url(#fill-${answer.platform})`}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          darkMode={darkMode}
          title={`Problems solved per ${unit}`}
          subtitle={buckets.items.some((b) => b.partial) ? "The first and last bars cover part of a full period" : undefined}
        >
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
              <YAxis {...axis} allowDecimals={false} width={40} />
              <Tooltip
                {...tooltipStyle}
                cursor={{ fill: theme.grid }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.range}
                formatter={(v) => [formatNumber(v), "Solved"]}
              />
              <Bar dataKey="problemsSolved" fill={SERIES.gain} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {capabilities.rating && (
          <ChartCard
            darkMode={darkMode}
            title="Contest rating"
            subtitle={hasRating ? "Gaps mean unrated (no contest yet)" : undefined}
          >
            {hasRating ? (
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="date" {...axis} {...ticks} />
                  <YAxis {...axis} domain={[(min) => Math.floor(min - 30), (max) => Math.ceil(max + 30)]} width={48} />
                  <Tooltip {...tooltipStyle} labelFormatter={longDate} formatter={(v) => [formatNumber(v), "Rating"]} />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke={SERIES.rating}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart darkMode={darkMode} message="No rated contest yet. Your rating line appears after your first rated contest." />
            )}
          </ChartCard>
        )}

        {capabilities.contests && (
          <ChartCard
            darkMode={darkMode}
            title="Contests attended"
            subtitle={hasContests ? "Running total" : undefined}
          >
            {hasContests ? (
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="date" {...axis} {...ticks} />
                  <YAxis {...axis} allowDecimals={false} domain={[0, (max) => Math.max(max, 1)]} width={40} />
                  <Tooltip {...tooltipStyle} labelFormatter={longDate} formatter={(v) => [formatNumber(v), "Contests"]} />
                  <Line
                    type="stepAfter"
                    dataKey="contests"
                    stroke={SERIES.contests}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart darkMode={darkMode} message="No contests attended yet." />
            )}
          </ChartCard>
        )}

        {capabilities.difficulty && (
          <ChartCard darkMode={darkMode} title="Problems by difficulty" subtitle="As of the latest update">
            {difficultyData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={difficultyData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="80%"
                    paddingAngle={2}
                    isAnimationActive={false}
                    label={({ name, value }) => `${name} ${value}`}
                    labelLine={false}
                  >
                    {difficultyData.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, name) => [formatNumber(v), name]} />
                  <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart darkMode={darkMode} message="The platform did not report a difficulty split." />
            )}
          </ChartCard>
        )}

        {capabilities.contests && (
          <ChartCard darkMode={darkMode} title={`Contests per ${unit}`}>
            {barData.some((b) => b.contests > 0) ? (
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis {...axis} allowDecimals={false} width={40} />
                  <Tooltip
                    {...tooltipStyle}
                    cursor={{ fill: theme.grid }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.range}
                    formatter={(v) => [formatNumber(v), "Contests"]}
                  />
                  <Bar dataKey="contests" fill={SERIES.contests} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart darkMode={darkMode} message="No contests in this range." />
            )}
          </ChartCard>
        )}
      </ChartGrid>

      <Typography variant="caption" sx={{ display: "block", mt: 2, color: theme.text }}>
        {answer.trackingSince
          ? `History tracked since ${longDate(answer.trackingSince)}. Days are in IST. `
          : ""}
        Numbers are read when your profile syncs, so a day shows what the platform reported at that day's last
        update.
      </Typography>
    </Box>
  );
};

export default CodingPlatformProgress;
