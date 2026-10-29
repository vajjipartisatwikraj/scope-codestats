import React from "react";
import { Box } from "@mui/material";
import { StatTile } from "./Panel";
import { formatNumber, signed } from "./performanceFormat";

/** The headline numbers of the students currently selected by the filters. */
const SummaryCards = ({ summary, days }) => {
  const period = `last ${days} days`;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
      <StatTile
        label="Students"
        value={formatNumber(summary.students)}
        hint={`${formatNumber(summary.withLinkedPlatform)} linked a platform · ${summary.avgPlatformsLinked} on average`}
      />
      <StatTile
        label="Total score"
        value={formatNumber(summary.totalScore)}
        hint={`Average ${formatNumber(summary.avgScore)} · median ${formatNumber(summary.medianScore)}`}
        color="#6b73ff"
      />
      <StatTile
        label="Problems solved"
        value={formatNumber(summary.totalProblems)}
        hint={`Average ${formatNumber(summary.avgProblems)} per student`}
      />
      <StatTile
        label="Contests attended"
        value={formatNumber(summary.totalContests)}
        hint={`Average ${formatNumber(summary.avgContests)} per student`}
      />
      <StatTile label="Score change" value={signed(summary.scoreGain)} hint={period} color="#22c55e" />
      <StatTile label="Problems change" value={signed(summary.problemsGain)} hint={`${period}, on LeetCode, Codeforces, CodeChef, HackerRank`} color="#22c55e" />
      <StatTile label="Contests change" value={signed(summary.contestsGain)} hint={`${period}, on LeetCode, Codeforces, CodeChef`} color="#22c55e" />
      <StatTile
        label="Active students"
        value={`${summary.activeRate}%`}
        hint={`${formatNumber(summary.activeStudents)} made progress in the ${period}`}
      />
    </Box>
  );
};

export default SummaryCards;
