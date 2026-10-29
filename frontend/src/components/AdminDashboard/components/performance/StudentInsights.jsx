import React, { useState } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartBox, Panel, useChartTheme } from "./Panel";
import { formatNumber, signed } from "./performanceFormat";

const LISTS = [
  { key: "score", label: "Top scores" },
  { key: "scoreGain", label: "Biggest score change", signed: true },
  { key: "problems", label: "Most problems solved" },
  { key: "problemsGain", label: "Biggest problems change", signed: true },
  { key: "contests", label: "Most contests" },
];

const Histogram = ({ title, subtitle, bins, color }) => {
  const theme = useChartTheme();
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  return (
    <Panel title={title} subtitle={subtitle}>
      <ChartBox empty={total === 0 ? "No students to show." : null}>
        <ResponsiveContainer>
          <BarChart data={bins} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="label" stroke={theme.text} fontSize={11} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis stroke={theme.text} fontSize={11} tickLine={false} allowDecimals={false} width={44} />
            <Tooltip
              contentStyle={theme.tooltip}
              labelStyle={{ color: theme.tooltip.color }}
              cursor={{ fill: theme.grid }}
              formatter={(value) => [formatNumber(value), "Students"]}
            />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </Panel>
  );
};

/** How scores and problem counts are spread over the students, and the leaders. */
const StudentInsights = ({ distributions, leaders }) => {
  const [listKey, setListKey] = useState("score");
  const list = LISTS.find((l) => l.key === listKey);
  const people = leaders[listKey] || [];

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
        <Histogram title="Score distribution" subtitle="Students by total score" bins={distributions.score} color="#6b73ff" />
        <Histogram title="Problems solved distribution" subtitle="Students by total problems solved" bins={distributions.problems} color="#22c55e" />
      </Box>

      <Panel title="Leaders" subtitle="Top 10 of the selected students">
        <ToggleButtonGroup exclusive size="small" value={listKey} onChange={(_e, key) => key && setListKey(key)} sx={{ flexWrap: "wrap", mb: 2 }}>
          {LISTS.map((l) => (
            <ToggleButton key={l.key} value={l.key} sx={{ textTransform: "none", px: 1.5 }}>
              {l.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TableContainer>
          <Table size="small" aria-label={list.label}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Roll no.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dept</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{list.label}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {people.map((person, index) => (
                <TableRow key={person.id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{person.name}</TableCell>
                  <TableCell>{person.rollNumber}</TableCell>
                  <TableCell>{person.department}</TableCell>
                  <TableCell align="right">{list.signed ? signed(person.value) : formatNumber(person.value)}</TableCell>
                </TableRow>
              ))}
              {people.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", py: 3 }}>
                    <Typography variant="body2" color="text.secondary">Nobody yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>
    </Box>
  );
};

export default StudentInsights;
