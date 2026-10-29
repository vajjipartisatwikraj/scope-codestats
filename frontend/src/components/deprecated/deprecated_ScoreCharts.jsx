import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getInnerGlassStyle } from "../Dashboard/dashboardUtils";
import { chartTheme, formatNumber, formatRank, longDate, pluralize, shortDate } from "../Dashboard/progress/progressFormat";

/**
 * Chart building blocks shared by the "Scores & ranks" page and the score / rank charts on
 * each platform's page. All of them take the daily `series` of the scores answer, which has
 * one point per day, with `null` before the first reading and for platforms or ranks that do
 * not exist, so lines show gaps there instead of false zeros.
 */

const margin = { top: 8, right: 12, left: -8, bottom: 0 };

const commonAxes = (theme) => ({
  axis: { stroke: theme.text, fontSize: 11, tickLine: false },
  ticks: { minTickGap: 28, tickFormatter: shortDate },
});

/** One area: a running score. `dataKey` may be nested, e.g. "scores.leetcode". */
export const ScoreAreaChart = ({ data, dataKey, color, name, darkMode, gradientId }) => {
  const theme = chartTheme(darkMode);
  const { axis, ticks } = commonAxes(theme);
  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={margin}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.45} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis dataKey="date" {...axis} {...ticks} />
        <YAxis {...axis} allowDecimals={false} domain={["dataMin", "dataMax"]} width={52} />
        <Tooltip
          contentStyle={theme.tooltip}
          labelStyle={{ color: theme.tooltip.color }}
          labelFormatter={longDate}
          formatter={(value) => [formatNumber(value), name]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          connectNulls={false}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Several lines on one chart.
 * @param {Array<{dataKey: string, name: string, color: string}>} lines
 * @param {boolean} ranks draw ranks: the axis is upside down so rank 1 is at the top, and
 *   only whole places are shown
 */
export const ScoreLines = ({ data, lines, darkMode, ranks = false, legend = lines.length > 1 }) => {
  const theme = chartTheme(darkMode);
  const { axis, ticks } = commonAxes(theme);
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={margin}>
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis dataKey="date" {...axis} {...ticks} />
        {ranks ? (
          <YAxis {...axis} reversed allowDecimals={false} domain={[1, (max) => Math.max(max, 2)]} width={44} />
        ) : (
          <YAxis {...axis} allowDecimals={false} domain={[0, (max) => Math.max(max, 1)]} width={52} />
        )}
        <Tooltip
          contentStyle={theme.tooltip}
          labelStyle={{ color: theme.tooltip.color }}
          labelFormatter={longDate}
          formatter={(value, name) => [ranks ? formatRank(value) : formatNumber(value), name]}
        />
        {legend && <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/** A note under the charts about where the numbers come from. */
export const ScoreFootnote = ({ answer, darkMode }) => (
  <Typography variant="caption" sx={{ display: "block", mt: 2, color: chartTheme(darkMode).text }}>
    {answer.trackingSince ? `Tracked since ${longDate(answer.trackingSince)}. Days are in IST. ` : ""}
    Scores and ranks are recorded after each profile sync. Ties share a rank, and a platform rank counts only
    students who have a score on that platform.
  </Typography>
);

/** Warning shown when the ranks were last calculated a while ago. */
export const StaleRanksAlert = ({ answer }) =>
  answer.staleDays >= 2 ? (
    <Alert severity="warning" sx={{ mb: 2 }}>
      Ranks were last calculated {pluralize(answer.staleDays, "day")} ago. The numbers below are carried forward
      from then.
    </Alert>
  ) : null;

/**
 * What to say when the scores answer has nothing to chart (`not_ranked` or `no_history`).
 * Returns null for an answer with data.
 */
export const ScoreStateNotice = ({ answer, darkMode }) => {
  if (answer.state === "ok") return null;
  const title = answer.state === "not_ranked" ? "Scores and ranks are for students" : "No scores or ranks recorded yet";
  return (
    <Box sx={{ ...getInnerGlassStyle(darkMode), p: { xs: 2, sm: 3 }, "&:hover": { transform: "none" } }}>
      <Alert severity="info" variant="outlined">
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</Typography>
        <Typography variant="body2">{answer.message}</Typography>
      </Alert>
    </Box>
  );
};
