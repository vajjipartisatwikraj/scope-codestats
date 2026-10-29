import React, { useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
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
  SCORE_PLATFORMS,
  SERIES,
  bucketLabel,
  bucketRange,
  changeColor,
  chartColor,
  chartTheme,
  formatNumber,
  formatRank,
  placesText,
  shortDate,
  signed,
  topPercentText,
} from "../Dashboard/progress/progressFormat";
import { ChartCard, ChartGrid, EmptyChart, KpiRow, KpiTile } from "./deprecated_ProgressWidgets";
import { ScoreAreaChart, ScoreFootnote, ScoreLines, StaleRanksAlert } from "./deprecated_ScoreCharts";

const OVERALL_COLOR = "#0585E0";
const DEPARTMENT_COLOR = "#a855f7";

const cell = { py: 1, px: 1.5, whiteSpace: "nowrap" };

/**
 * The "Scores & ranks" page: total score, overall and department rank, and every platform's
 * score and rank, over the chosen range. Only for answers with `state: "ok"`.
 *
 * Changes are measured from the first day of the range (or from the last reading before it),
 * so "Up 12 places" means 12 places better than at the start of the range.
 */
const ScoreProgress = ({ answer, darkMode }) => {
  const theme = chartTheme(darkMode);
  const { series, summary, buckets, range } = answer;

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

  const axis = { stroke: theme.text, fontSize: 11, tickLine: false };
  const tooltipStyle = { contentStyle: theme.tooltip, labelStyle: { color: theme.tooltip.color } };
  const unit = buckets.granularity === "day" ? "day" : buckets.granularity === "week" ? "week" : "month";

  const shown = SCORE_PLATFORMS.filter((p) => summary.platforms[p.key]);
  const colorOf = (p) => chartColor(p, darkMode);
  const scoreLines = shown.map((p) => ({ dataKey: `scores.${p.key}`, name: p.name, color: colorOf(p) }));
  const rankLines = shown
    .filter((p) => series.some((point) => point.platformRanks[p.key] !== null))
    .map((p) => ({ dataKey: `platformRanks.${p.key}`, name: p.name, color: colorOf(p) }));
  const shareData = shown
    .map((p) => ({ name: p.name, value: summary.platforms[p.key].score || 0, color: colorOf(p) }))
    .filter((slice) => slice.value > 0);

  const { overall, departmentRank } = summary;
  const hasDepartment = departmentRank.rank !== null && series.some((point) => point.departmentRank !== null);

  return (
    <Box>
      <StaleRanksAlert answer={answer} />

      <KpiRow>
        <KpiTile
          darkMode={darkMode}
          color={OVERALL_COLOR}
          label="Total score"
          value={formatNumber(summary.totalScore)}
          hint={`${signed(summary.scoreChange)} in this range`}
        />
        <KpiTile
          darkMode={darkMode}
          label="Overall rank"
          value={formatRank(overall.rank)}
          hint={
            overall.rank
              ? `of ${formatNumber(overall.of)} · ${topPercentText(overall.percentile)} · ${placesText(overall.rankChange)}`
              : "Not ranked yet"
          }
        />
        <KpiTile
          darkMode={darkMode}
          color={DEPARTMENT_COLOR}
          label="Department rank"
          value={formatRank(departmentRank.rank)}
          hint={
            hasDepartment
              ? `of ${formatNumber(departmentRank.of)} in ${summary.department || "your department"} · ${placesText(departmentRank.rankChange)}`
              : "No department on your profile"
          }
        />
        <KpiTile
          darkMode={darkMode}
          label="Best overall rank"
          value={formatRank(overall.best?.rank)}
          hint={overall.best ? `Reached on ${shortDate(overall.best.date)}` : `In ${range.days} days`}
        />
      </KpiRow>

      <ChartGrid>
        <ChartCard darkMode={darkMode} title="Total score" subtitle={`Sum of all your platform scores, ${range.days} days`}>
          <ScoreAreaChart
            data={series}
            dataKey="totalScore"
            name="Total score"
            color={OVERALL_COLOR}
            darkMode={darkMode}
            gradientId="fill-total-score"
          />
        </ChartCard>

        <ChartCard
          darkMode={darkMode}
          title="Overall rank"
          subtitle={overall.rank ? `Among all students. Rank 1 is at the top.` : undefined}
        >
          {series.some((point) => point.overallRank !== null) ? (
            <ScoreLines
              data={series}
              ranks
              darkMode={darkMode}
              lines={[{ dataKey: "overallRank", name: "Overall rank", color: OVERALL_COLOR }]}
            />
          ) : (
            <EmptyChart darkMode={darkMode} message="No overall rank recorded in this range." />
          )}
        </ChartCard>

        <ChartCard
          darkMode={darkMode}
          title="Department rank"
          subtitle={hasDepartment ? `Among students of ${summary.department}. Rank 1 is at the top.` : undefined}
        >
          {hasDepartment ? (
            <ScoreLines
              data={series}
              ranks
              darkMode={darkMode}
              lines={[{ dataKey: "departmentRank", name: "Department rank", color: DEPARTMENT_COLOR }]}
            />
          ) : (
            <EmptyChart darkMode={darkMode} message="Add your department on your profile to see your department rank." />
          )}
        </ChartCard>

        <ChartCard darkMode={darkMode} title="Score by platform" subtitle="Gaps mean the platform was not linked yet">
          {scoreLines.length > 0 ? (
            <ScoreLines data={series} lines={scoreLines} darkMode={darkMode} />
          ) : (
            <EmptyChart darkMode={darkMode} message="Link a platform to see its score here." />
          )}
        </ChartCard>

        <ChartCard darkMode={darkMode} title="Rank by platform" subtitle="Only platforms where you have a score. Rank 1 is at the top.">
          {rankLines.length > 0 ? (
            <ScoreLines data={series} lines={rankLines} ranks darkMode={darkMode} />
          ) : (
            <EmptyChart darkMode={darkMode} message="A platform is ranked once you have a score on it." />
          )}
        </ChartCard>

        <ChartCard darkMode={darkMode} title="Where your score comes from" subtitle="Latest score of each platform">
          {shareData.length > 0 ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={shareData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="80%"
                  paddingAngle={2}
                  isAnimationActive={false}
                  label={({ name, value }) => `${name} ${formatNumber(value)}`}
                  labelLine={false}
                >
                  {shareData.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value, name) => [formatNumber(value), name]} />
                <Legend wrapperStyle={{ color: theme.text, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart darkMode={darkMode} message="You have no platform score yet." />
          )}
        </ChartCard>

        <ChartCard
          darkMode={darkMode}
          title={`Score change per ${unit}`}
          subtitle={
            buckets.items.some((b) => b.partial) ? "The first and last bars cover part of a full period" : "Red bars are a drop in score"
          }
        >
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
              <YAxis {...axis} allowDecimals={false} width={48} />
              <Tooltip
                {...tooltipStyle}
                cursor={{ fill: theme.grid }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.range}
                formatter={(value) => [signed(value), "Score change"]}
              />
              <Bar dataKey="scoreChange" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {barData.map((bucket) => (
                  <Cell key={bucket.start} fill={bucket.scoreChange < 0 ? SERIES.hard : SERIES.gain} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </ChartGrid>

      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mt: 3, mb: 1 }}>Platforms</Typography>
      <TableContainer>
        <Table size="small" aria-label="Score and rank of each platform">
          <TableHead>
            <TableRow>
              {["Platform", "Score", "Score change", "Rank", "Rank change", "Best rank"].map((heading, index) => (
                <TableCell key={heading} align={index === 0 ? "left" : "right"} sx={{ ...cell, fontWeight: 700 }}>
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((p) => {
              const row = summary.platforms[p.key];
              return (
                <TableRow key={p.key}>
                  <TableCell sx={{ ...cell, fontWeight: 600, color: colorOf(p) }}>{p.name}</TableCell>
                  <TableCell align="right" sx={cell}>
                    {formatNumber(row.score)}
                  </TableCell>
                  <TableCell align="right" sx={{ ...cell, color: changeColor(row.scoreChange) }}>
                    {signed(row.scoreChange)}
                  </TableCell>
                  <TableCell align="right" sx={cell}>
                    {row.rank ? `${formatRank(row.rank)} of ${formatNumber(row.of)}` : "Not ranked"}
                  </TableCell>
                  <TableCell align="right" sx={{ ...cell, color: changeColor(row.rankChange) }}>
                    {row.rank ? placesText(row.rankChange) : "-"}
                  </TableCell>
                  <TableCell align="right" sx={cell}>
                    {row.bestRank ? formatRank(row.bestRank.rank) : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ ...cell, textAlign: "center" }}>
                  No platform linked yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ScoreFootnote answer={answer} darkMode={darkMode} />
    </Box>
  );
};

export default ScoreProgress;
