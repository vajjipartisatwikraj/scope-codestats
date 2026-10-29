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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PIE_COLORS,
  SERIES,
  bucketLabel,
  bucketRange,
  chartTheme,
  formatNumber,
  longDate,
  pluralize,
  shortDate,
} from "../Dashboard/progress/progressFormat";
import { ChartCard, ChartGrid, EmptyChart, KpiRow, KpiTile } from "./deprecated_ProgressWidgets";

/**
 * GitHub activity for the range. Nothing here is stored by the app: the server asks GitHub's
 * own contribution timeline when the page opens (and caches the answer for a few minutes).
 * Days are GitHub's (UTC), the same as the contribution graph on github.com.
 */
const GithubProgress = ({ answer, color, darkMode }) => {
  const theme = chartTheme(darkMode);
  const { daily, totals, summary, breakdown, buckets, range } = answer;
  const axis = { stroke: theme.text, fontSize: 11, tickLine: false };
  const tooltipStyle = { contentStyle: theme.tooltip, labelStyle: { color: theme.tooltip.color } };
  const unit = buckets.granularity;

  const barData = useMemo(
    () =>
      buckets.items.map((bucket) => ({
        ...bucket,
        label: bucketLabel(bucket, buckets.granularity),
        range: bucketRange(bucket),
      })),
    [buckets]
  );

  const anyActivity = totals.contributions > 0;
  const rangeTooltip = (_, payload) => payload?.[0]?.payload?.range;

  return (
    <Box>
      {answer.truncated && (
        <Alert severity="info" sx={{ mb: 2 }}>
          GitHub returned more items than it allows in one answer, so a few counts may be slightly low.
        </Alert>
      )}

      <KpiRow>
        <KpiTile darkMode={darkMode} color={SERIES.commits} label="Commits" value={formatNumber(totals.commits)} hint={`Last ${range.days} days`} />
        <KpiTile darkMode={darkMode} color={SERIES.pullRequests} label="Pull requests opened" value={formatNumber(totals.pullRequests)} hint={`${formatNumber(totals.merged)} merged`} />
        <KpiTile darkMode={darkMode} color={SERIES.repos} label="Repositories created" value={formatNumber(totals.reposCreated)} hint={`${formatNumber(totals.reviews)} code reviews`} />
        <KpiTile
          darkMode={darkMode}
          label="Active days"
          value={formatNumber(summary.activeDays)}
          hint={`Streak ${pluralize(summary.current, "day")} · longest ${pluralize(summary.longest, "day")}`}
        />
      </KpiRow>

      {!anyActivity ? (
        <ChartCard darkMode={darkMode} title="Contributions" height={160}>
          <EmptyChart
            darkMode={darkMode}
            message="No public contributions in this range. Private activity only shows if you enabled it in your GitHub profile settings."
          />
        </ChartCard>
      ) : (
        <ChartGrid>
          <ChartCard darkMode={darkMode} title="Contributions per day" subtitle="Everything GitHub counts on your graph">
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gh-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="date" {...axis} minTickGap={28} tickFormatter={shortDate} />
                <YAxis {...axis} allowDecimals={false} width={40} />
                <Tooltip {...tooltipStyle} labelFormatter={longDate} formatter={(v) => [formatNumber(v), "Contributions"]} />
                <Area type="monotone" dataKey="contributions" stroke={color} strokeWidth={2} fill="url(#gh-fill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard darkMode={darkMode} title={`Commits per ${unit}`}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
                <YAxis {...axis} allowDecimals={false} width={40} />
                <Tooltip {...tooltipStyle} cursor={{ fill: theme.grid }} labelFormatter={rangeTooltip} formatter={(v) => [formatNumber(v), "Commits"]} />
                <Bar dataKey="commits" fill={SERIES.commits} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard darkMode={darkMode} title={`Pull requests per ${unit}`} subtitle="Opened and merged">
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
                <YAxis {...axis} allowDecimals={false} width={40} />
                <Tooltip {...tooltipStyle} cursor={{ fill: theme.grid }} labelFormatter={rangeTooltip} />
                <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />
                <Bar dataKey="pullRequests" name="Opened" fill={SERIES.pullRequests} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="merged" name="Merged" fill={SERIES.merged} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard darkMode={darkMode} title="Where your activity comes from" subtitle="Share of each kind of contribution">
            {breakdown.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
                    {breakdown.map((slice, index) => (
                      <Cell key={slice.name} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, name) => [formatNumber(v), name]} />
                  <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart darkMode={darkMode} message="Nothing to split yet." />
            )}
          </ChartCard>

          {totals.reposCreated > 0 && (
            <ChartCard darkMode={darkMode} title={`Repositories created per ${unit}`}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis {...axis} allowDecimals={false} width={40} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: theme.grid }} labelFormatter={rangeTooltip} formatter={(v) => [formatNumber(v), "Repositories"]} />
                  <Bar dataKey="reposCreated" fill={SERIES.repos} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </ChartGrid>
      )}

      <Typography variant="caption" sx={{ display: "block", mt: 2, color: theme.text }}>
        Live from GitHub (refreshed at most every few minutes). Days are UTC, like the graph on github.com. Public
        activity only, plus private activity if you show it on your profile.
        {summary.bestDay ? ` Busiest day: ${longDate(summary.bestDay.date)} with ${pluralize(summary.bestDay.contributions, "contribution")}.` : ""}
      </Typography>
    </Box>
  );
};

export default GithubProgress;
