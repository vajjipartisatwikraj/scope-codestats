import React, { useState } from "react";
import { Alert, Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartBox, Panel, StatTile, useChartTheme } from "./Panel";
import { PLATFORM_LIST, chartColor, formatNumber, platformMeta, signed } from "./performanceFormat";

const STAT_LABELS = {
  score: "Score",
  problems: "Problems solved",
  easy: "Easy problems",
  medium: "Medium problems",
  hard: "Hard problems",
  contests: "Contests attended",
  badges: "Badges",
  certificates: "Certificates",
  commits: "Total commits",
  contributions: "Contributions (last year)",
  repos: "Public repositories",
  stars: "Stars received",
  followers: "Followers",
  lifetimeScore: "Lifetime score",
  cohortScore: "Cohort score",
  cohortProblems: "Cohort problems solved",
  cohortsCompleted: "Cohorts completed",
  practiceContests: "Practice arena contests",
};
// Ratings have their own section: a total or an average over unrated students means nothing.
const SKIP_IN_STATS = ["rating", "maxRating"];

const cellSx = { whiteSpace: "nowrap", py: 1 };

const ComparisonTable = ({ platforms, selected, onSelect }) => (
  <Panel title="All platforms" subtitle="Averages are over the students who linked the platform. Select a row for details.">
    <TableContainer>
      <Table size="small" aria-label="Platform comparison">
        <TableHead>
          <TableRow>
            {["Platform", "Linked", "Avg score", "Problems solved", "Avg problems", "Contests", "Avg rating", "Score change", "Problems change", "Active", "Sync errors"].map((h, i) => (
              <TableCell key={h} align={i === 0 ? "left" : "right"} sx={{ ...cellSx, fontWeight: 700 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {platforms.map((p) => {
            const meta = platformMeta(p.platform);
            return (
              <TableRow key={p.platform} hover selected={p.platform === selected} onClick={() => onSelect(p.platform)} sx={{ cursor: "pointer" }}>
                <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{meta.name}</TableCell>
                <TableCell align="right" sx={cellSx}>{`${formatNumber(p.linked)} (${p.linkedRate}%)`}</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(p.stats.score.avg)}</TableCell>
                <TableCell align="right" sx={cellSx}>{p.stats.problems ? formatNumber(p.stats.problems.total) : "-"}</TableCell>
                <TableCell align="right" sx={cellSx}>{p.stats.problems ? formatNumber(p.stats.problems.avg) : "-"}</TableCell>
                <TableCell align="right" sx={cellSx}>
                  {p.contestParticipants === null ? "-" : formatNumber(p.stats[p.platform === "scopecodestats" ? "practiceContests" : "contests"].total)}
                </TableCell>
                <TableCell align="right" sx={cellSx}>{p.rating ? (p.rating.rated ? formatNumber(p.rating.avg) : "-") : "-"}</TableCell>
                <TableCell align="right" sx={cellSx}>{signed(p.gains.score)}</TableCell>
                <TableCell align="right" sx={cellSx}>{p.gains.problems === null ? "-" : signed(p.gains.problems)}</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(p.active)}</TableCell>
                <TableCell align="right" sx={{ ...cellSx, color: p.syncFailing ? "error.main" : undefined }}>{formatNumber(p.syncFailing)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Panel>
);

const PlatformDetail = ({ platform, darkMode }) => {
  const theme = useChartTheme();
  const meta = platformMeta(platform.platform);
  const color = chartColor(meta, darkMode);
  const { stats, rating } = platform;
  const rows = Object.keys(stats).filter((stat) => !SKIP_IN_STATS.includes(stat));
  const difficulty = platform.platform === "leetcode"
    ? [
        { name: "Easy", value: stats.easy.total, color: "#22c55e" },
        { name: "Medium", value: stats.medium.total, color: "#f59e0b" },
        { name: "Hard", value: stats.hard.total, color: "#ef4444" },
      ].filter((slice) => slice.value > 0)
    : [];

  if (platform.linked === 0) {
    return (
      <Panel title={meta.name}>
        <Typography color="text.secondary">No student in this selection has linked {meta.name}.</Typography>
      </Panel>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <StatTile label="Linked" value={formatNumber(platform.linked)} hint={`${platform.linkedRate}% of the selected students`} color={color} />
        <StatTile label="Average score" value={formatNumber(stats.score.avg)} hint={`Highest ${formatNumber(stats.score.max)}`} />
        <StatTile label="Score change" value={signed(platform.gains.score)} hint={`${formatNumber(platform.active)} students made progress`} color="#22c55e" />
        <StatTile
          label="Sync errors"
          value={formatNumber(platform.syncFailing)}
          hint={platform.syncFailing ? "Their numbers may be out of date" : "All profiles synced"}
          color={platform.syncFailing ? "#ef4444" : undefined}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
        <Panel title={`${meta.name} statistics`} subtitle="Totals and averages over the linked students">
          <TableContainer>
            <Table size="small" aria-label={`${meta.name} statistics`}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Number</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Average</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Highest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((stat) => (
                  <TableRow key={stat}>
                    <TableCell>{STAT_LABELS[stat] || stat}</TableCell>
                    <TableCell align="right">{formatNumber(stats[stat].total)}</TableCell>
                    <TableCell align="right">{formatNumber(stats[stat].avg)}</TableCell>
                    <TableCell align="right">{formatNumber(stats[stat].max)}</TableCell>
                  </TableRow>
                ))}
                {platform.gains.problems !== null && (
                  <TableRow>
                    <TableCell>Problems change (period)</TableCell>
                    <TableCell align="right">{signed(platform.gains.problems)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                )}
                {platform.gains.contests !== null && (
                  <TableRow>
                    <TableCell>Contests change (period)</TableCell>
                    <TableCell align="right">{signed(platform.gains.contests)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {platform.platform === "github" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Commits are today's totals as read from GitHub. They are not stored over time, so there is no commit change
              per period. GitHub's score change is shown above.
            </Alert>
          )}
        </Panel>

        <Panel title={`Top students on ${meta.name}`} subtitle="By score">
          <TableContainer>
            <Table size="small" aria-label={`Top students on ${meta.name}`}>
              <TableBody>
                {platform.top.map((person, index) => (
                  <TableRow key={person.id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{person.name}</TableCell>
                    <TableCell>{person.rollNumber}</TableCell>
                    <TableCell>{person.department}</TableCell>
                    <TableCell align="right">{formatNumber(person.value)}</TableCell>
                  </TableRow>
                ))}
                {platform.top.length === 0 && (
                  <TableRow>
                    <TableCell sx={{ textAlign: "center", py: 3 }}>
                      <Typography variant="body2" color="text.secondary">Nobody has a score yet.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Panel>

        {rating && (
          <Panel
            title={`${meta.name} ratings`}
            subtitle={`${formatNumber(rating.rated)} of ${formatNumber(platform.linked)} linked students are rated`}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, mb: 2 }}>
              <StatTile label="Average" value={formatNumber(rating.avg)} />
              <StatTile label="Median" value={formatNumber(rating.median)} />
              <StatTile label="Highest" value={formatNumber(rating.max)} hint={`Peak ${formatNumber(rating.peakMax)}`} />
              <StatTile label="Avg change" value={signed(rating.avgChange)} hint={`${rating.improved} up · ${rating.declined} down`} color="#22c55e" />
            </Box>
            <ChartBox height={240} empty={rating.rated === 0 ? "Nobody is rated yet." : null}>
              <ResponsiveContainer>
                <BarChart data={rating.bands} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" stroke={theme.text} fontSize={11} tickLine={false} interval={0} />
                  <YAxis stroke={theme.text} fontSize={11} tickLine={false} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={theme.tooltip} labelStyle={{ color: theme.tooltip.color }} cursor={{ fill: theme.grid }} formatter={(v) => [formatNumber(v), "Students"]} />
                  <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>
        )}

        {rating && (
          <Panel title={`Highest rated on ${meta.name}`}>
            <TableContainer>
              <Table size="small" aria-label={`Highest rated on ${meta.name}`}>
                <TableBody>
                  {rating.top.map((person, index) => (
                    <TableRow key={person.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{person.name}</TableCell>
                      <TableCell>{person.rollNumber}</TableCell>
                      <TableCell>{person.department}</TableCell>
                      <TableCell align="right">{formatNumber(person.value)}</TableCell>
                    </TableRow>
                  ))}
                  {rating.top.length === 0 && (
                    <TableRow>
                      <TableCell sx={{ textAlign: "center", py: 3 }}>
                        <Typography variant="body2" color="text.secondary">Nobody is rated yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Panel>
        )}

        {difficulty.length > 0 && (
          <Panel title="Problems by difficulty" subtitle="All selected students together">
            <ChartBox height={260}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={difficulty} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} isAnimationActive={false} label={({ name, value }) => `${name} ${formatNumber(value)}`} labelLine={false}>
                    {difficulty.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={theme.tooltip} formatter={(v, name) => [formatNumber(v), name]} />
                  <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>
          </Panel>
        )}
      </Box>
    </Box>
  );
};

/** Platform by platform: a comparison table, then the details of the chosen platform. */
const PlatformsView = ({ platforms, darkMode }) => {
  const [selected, setSelected] = useState(PLATFORM_LIST[0].key);
  const platform = platforms.find((p) => p.platform === selected) || platforms[0];

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <ComparisonTable platforms={platforms} selected={selected} onSelect={setSelected} />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {PLATFORM_LIST.map((meta) => (
          <Chip
            key={meta.key}
            label={meta.name}
            color={meta.key === selected ? "primary" : "default"}
            variant={meta.key === selected ? "filled" : "outlined"}
            onClick={() => setSelected(meta.key)}
          />
        ))}
      </Box>
      <PlatformDetail platform={platform} darkMode={darkMode} />
    </Box>
  );
};

export default PlatformsView;
