import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getInnerGlassStyle } from "../Dashboard/dashboardUtils";
import { PROGRESS_PLATFORMS, chartColor, chartTheme, formatNumber } from "../Dashboard/progress/progressFormat";
import { ChartCard, EmptyChart } from "./deprecated_ProgressWidgets";

const STATE_CHIP = {
  ok: { label: "Connected", color: "success" },
  not_linked: { label: "Not linked", color: "default" },
  pending: { label: "Waiting for first sync", color: "info" },
  invalid_username: { label: "Account not found", color: "error" },
  sync_failed: { label: "First sync failed", color: "warning" },
};

const platformOf = (key) => PROGRESS_PLATFORMS.find((p) => p.key === key);

/** One platform's card: state and the numbers that are known without any history. */
const PlatformCard = ({ entry, darkMode, onSelect }) => {
  const platform = platformOf(entry.platform);
  const chip = STATE_CHIP[entry.state] || STATE_CHIP.not_linked;
  const theme = chartTheme(darkMode);
  const color = chartColor(platform, darkMode);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry.platform)}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect(entry.platform)}
      sx={{
        ...getInnerGlassStyle(darkMode),
        p: 2,
        cursor: "pointer",
        borderLeft: `4px solid ${color}`,
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
        <Typography sx={{ fontWeight: 700 }}>{platform.name}</Typography>
        <Chip size="small" label={chip.label} color={chip.color} variant="outlined" />
      </Box>
      <Typography variant="caption" sx={{ color: theme.text, fontFamily: "monospace" }}>
        {entry.username || "No username"}
      </Typography>

      {entry.state === "ok" && entry.platform !== "github" && (
        <Box sx={{ display: "flex", gap: 2.5, mt: 1.5, flexWrap: "wrap" }}>
          <Stat label="Solved" value={formatNumber(entry.current.problemsSolved)} />
          {entry.capabilities?.rating && (
            <Stat label="Rating" value={entry.current.rating === null ? "Unrated" : formatNumber(entry.current.rating)} />
          )}
          {entry.capabilities?.contests && <Stat label="Contests" value={formatNumber(entry.current.contests)} />}
        </Box>
      )}
      {entry.state === "ok" && entry.platform === "github" && (
        <Box sx={{ display: "flex", gap: 2.5, mt: 1.5 }}>
          <Stat label="Public repos" value={formatNumber(entry.current.repos)} />
        </Box>
      )}
      {entry.warning && (
        <Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.main" }}>
          {entry.warning.accountMissing ? "Account no longer found" : "Latest update failed"}
        </Typography>
      )}
    </Box>
  );
};

const Stat = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.2 }}>{value}</Typography>
    <Typography variant="caption" sx={{ opacity: 0.7 }}>
      {label}
    </Typography>
  </Box>
);

/** All platforms at a glance plus how the solved problems split between them. */
const ProgressOverview = ({ data, darkMode, onSelectPlatform }) => {
  const theme = chartTheme(darkMode);
  const slices = data.problemsByPlatform.map((item) => {
    const platform = platformOf(item.platform);
    return { name: platform.name, value: item.value, color: chartColor(platform, darkMode) };
  });

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 5fr) minmax(0, 7fr)" }, gap: 2.5 }}>
      <ChartCard
        darkMode={darkMode}
        title="Problems solved by platform"
        subtitle={slices.length > 0 ? `${formatNumber(data.totalProblemsSolved)} in total` : undefined}
        height={300}
      >
        {slices.length > 0 ? (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={2}
                isAnimationActive={false}
                label={({ value }) => value}
                labelLine={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={theme.tooltip} formatter={(v, name) => [formatNumber(v), name]} />
              <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart darkMode={darkMode} message="No solved problems to show yet. Link a platform and sync it." />
        )}
      </ChartCard>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2, alignContent: "start" }}>
        {data.platforms.map((entry) => (
          <PlatformCard key={entry.platform} entry={entry} darkMode={darkMode} onSelect={onSelectPlatform} />
        ))}
      </Box>
    </Box>
  );
};

export default ProgressOverview;
