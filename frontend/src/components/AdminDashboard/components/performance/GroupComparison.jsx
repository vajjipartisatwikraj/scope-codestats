import React, { useState } from "react";
import { Box, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartBox, Panel, useChartTheme } from "./Panel";
import { GROUP_BY, formatNumber, signed } from "./performanceFormat";

const METRICS = [
  { key: "avgScore", label: "Avg score" },
  { key: "avgProblems", label: "Avg problems" },
  { key: "avgContests", label: "Avg contests" },
  { key: "avgCommits", label: "Avg GitHub commits" },
  { key: "avgScoreGain", label: "Avg score change", signed: true },
  { key: "avgProblemsGain", label: "Avg problems change", signed: true },
  { key: "activeRate", label: "Active students %", suffix: "%" },
];

const COLORS = ["#6b73ff", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#ec4899", "#0ea5e9"];

const cellSx = { whiteSpace: "nowrap", py: 1 };

/**
 * Departments, graduating years or sections side by side. The group being compared is not
 * limited by its own filter, so the selected department is shown among the others.
 *
 * @param {{groupBy: string, items: Array<object>}} comparison
 * @param {(groupBy: string) => void} onGroupByChange
 */
const GroupComparison = ({ comparison, onGroupByChange, selected }) => {
  const theme = useChartTheme();
  const [metricKey, setMetricKey] = useState("avgScore");
  const metric = METRICS.find((m) => m.key === metricKey);
  const format = (value) => (metric.signed ? signed(value) : `${formatNumber(value)}${metric.suffix || ""}`);

  const groupLabel = GROUP_BY.find((g) => g.key === comparison.groupBy)?.label || "Group";
  const items = comparison.items;

  return (
    <Panel
      title="Comparison"
      subtitle={`Students grouped by ${groupLabel.toLowerCase()}`}
      actions={
        <Select size="small" value={comparison.groupBy} onChange={(event) => onGroupByChange(event.target.value)} aria-label="Group by">
          {GROUP_BY.map((g) => (
            <MenuItem key={g.key} value={g.key}>{`By ${g.label.toLowerCase()}`}</MenuItem>
          ))}
        </Select>
      }
    >
      <ToggleButtonGroup exclusive size="small" value={metricKey} onChange={(_e, key) => key && setMetricKey(key)} sx={{ flexWrap: "wrap", mb: 2 }}>
        {METRICS.map((m) => (
          <ToggleButton key={m.key} value={m.key} sx={{ textTransform: "none", px: 1.5 }}>
            {m.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <ChartBox height={300} empty={items.length === 0 ? "No students to compare." : null}>
        <ResponsiveContainer>
          <BarChart data={items} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="label" stroke={theme.text} fontSize={11} tickLine={false} interval={0} />
            <YAxis stroke={theme.text} fontSize={11} tickLine={false} width={56} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={theme.tooltip}
              labelStyle={{ color: theme.tooltip.color }}
              cursor={{ fill: theme.grid }}
              formatter={(value) => [format(value), metric.label]}
            />
            <Bar dataKey={metricKey} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {items.map((item, index) => (
                <Cell key={item.key} fill={selected && String(selected) === item.key ? "#6b73ff" : COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small" aria-label="Comparison table">
          <TableHead>
            <TableRow>
              {[groupLabel, "Students", "Linked", "Avg score", "Avg problems", "Avg contests", "Avg commits", "Avg score change", "Active"].map((heading, index) => (
                <TableCell key={heading} align={index === 0 ? "left" : "right"} sx={{ ...cellSx, fontWeight: 700 }}>
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.key} hover>
                <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{item.label}</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(item.students)}</TableCell>
                <TableCell align="right" sx={cellSx}>{item.linkedRate}%</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(item.avgScore)}</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(item.avgProblems)}</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(item.avgContests)}</TableCell>
                <TableCell align="right" sx={cellSx}>{formatNumber(item.avgCommits)}</TableCell>
                <TableCell align="right" sx={cellSx}>{signed(item.avgScoreGain)}</TableCell>
                <TableCell align="right" sx={cellSx}>{item.activeRate}%</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="body2" color="text.secondary">No students match.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Averages are per student, including students with no platform linked. "Active" is the share who made progress in the period.
        </Typography>
      </Box>
    </Panel>
  );
};

export default GroupComparison;
