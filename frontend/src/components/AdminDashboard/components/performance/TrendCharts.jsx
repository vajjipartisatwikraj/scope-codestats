import React from "react";
import { Alert, Box } from "@mui/material";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartBox, Panel, useChartTheme } from "./Panel";
import { chartColor, formatNumber, longDate, platformMeta, shortDate, signed } from "./performanceFormat";

const margin = { top: 8, right: 12, left: -4, bottom: 0 };

/** Which platforms have a change in the points (the others would only be flat lines at 0). */
const platformsWithChange = (trend, field) => {
  const keys = Object.keys(trend[0]?.[field] || {});
  return keys.filter((key) => trend.some((point) => point[field][key] !== 0));
};

/**
 * How much the selected students gained since the start of the period, day by day (week by
 * week for long periods). Each point is the total gained from the start of the period to
 * that date, so the last point equals the "change" tiles above.
 */
const TrendCharts = ({ trend, range, tracking, darkMode }) => {
  const theme = useChartTheme();
  const axis = { stroke: theme.text, fontSize: 11, tickLine: false };
  const xAxis = <XAxis dataKey="date" {...axis} minTickGap={28} tickFormatter={shortDate} />;
  const tooltip = (format) => (
    <Tooltip contentStyle={theme.tooltip} labelStyle={{ color: theme.tooltip.color }} labelFormatter={longDate} formatter={format} />
  );
  const legend = <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />;

  const lines = (field, platforms) =>
    platforms.map((key) => (
      <Line
        key={key}
        type="monotone"
        dataKey={`${field}.${key}`}
        name={platformMeta(key).name}
        stroke={chartColor(platformMeta(key), darkMode)}
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    ));

  const scorePlatforms = platformsWithChange(trend, "scoreByPlatform");
  const problemPlatforms = platformsWithChange(trend, "problemsByPlatform");
  const contestPlatforms = platformsWithChange(trend, "contestsByPlatform");
  const history = tracking?.platformHistory || tracking?.scoreHistory;

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {history && history > range.start && (
        <Alert severity="info">
          History is recorded from {longDate(history)}. Changes before that date are not available, so a long period
          can show less than students really did.
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
        <Panel title="Score gained" subtitle={`Total, since ${longDate(range.start)}`}>
          <ChartBox>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={margin}>
                <defs>
                  <linearGradient id="fill-admin-score" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b73ff" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6b73ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                {xAxis}
                <YAxis {...axis} width={56} tickFormatter={formatNumber} />
                {tooltip((value) => [signed(value), "Score gained"])}
                <Area type="monotone" dataKey="score" stroke="#6b73ff" strokeWidth={2} fill="url(#fill-admin-score)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>

        <Panel title="Score gained by platform" subtitle="Only platforms where scores changed">
          <ChartBox empty={scorePlatforms.length === 0 ? "No score changed in this period." : null}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={margin}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                {xAxis}
                <YAxis {...axis} width={56} tickFormatter={formatNumber} />
                {tooltip((value, name) => [signed(value), name])}
                {legend}
                {lines("scoreByPlatform", scorePlatforms)}
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>

        <Panel title="Problems solved" subtitle="Gained by platform (LeetCode, Codeforces, CodeChef, HackerRank)">
          <ChartBox empty={problemPlatforms.length === 0 ? "No problems were solved in this period." : null}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={margin}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                {xAxis}
                <YAxis {...axis} width={56} allowDecimals={false} tickFormatter={formatNumber} />
                {tooltip((value, name) => [signed(value), name])}
                {legend}
                {lines("problemsByPlatform", problemPlatforms)}
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>

        <Panel title="Contests attended" subtitle="Gained by platform (LeetCode, Codeforces, CodeChef)">
          <ChartBox empty={contestPlatforms.length === 0 ? "No contests were attended in this period." : null}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={margin}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                {xAxis}
                <YAxis {...axis} width={56} allowDecimals={false} tickFormatter={formatNumber} />
                {tooltip((value, name) => [signed(value), name])}
                {legend}
                {lines("contestsByPlatform", contestPlatforms)}
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>
      </Box>
    </Box>
  );
};

export default TrendCharts;
