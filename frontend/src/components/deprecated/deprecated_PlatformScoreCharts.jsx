import React from "react";
import { Box, Typography } from "@mui/material";
import { chartTheme, formatNumber, formatRank, placesText, shortDate, signed } from "../Dashboard/progress/progressFormat";
import { ChartCard, ChartGrid, EmptyChart, KpiRow, KpiTile, LoadError, LoadingBlock } from "./deprecated_ProgressWidgets";
import { ScoreAreaChart, ScoreFootnote, ScoreLines, StaleRanksAlert } from "./deprecated_ScoreCharts";

/**
 * Score and rank of ONE platform, shown under that platform's progress charts. It reads the
 * same scores answer as the "Scores & ranks" page (one request for both).
 *
 * @param {object} platform the platform ({ key, name }) being shown
 * @param {object|null} answer the scores answer, null while loading or when it failed
 */
const PlatformScoreCharts = ({ platform, answer, loading, error, onRetry, color, darkMode }) => {
  const theme = chartTheme(darkMode);

  const heading = (
    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", mt: 4, mb: 1.5 }}>
      {platform.name} score and rank
    </Typography>
  );

  const note = (text) => (
    <Box>
      {heading}
      <Typography variant="body2" sx={{ color: theme.text }}>
        {text}
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box>
        {heading}
        <LoadingBlock label="Loading score history..." />
      </Box>
    );
  }
  if (error) {
    return (
      <Box>
        {heading}
        <LoadError message={error} onRetry={onRetry} />
      </Box>
    );
  }
  if (!answer) return null;
  if (answer.state !== "ok") return note(answer.message);

  const row = answer.summary.platforms[platform.key];
  if (!row) {
    return note(`No ${platform.name} score has been recorded yet. It appears after your next profile sync.`);
  }

  const hasRank = answer.series.some((point) => point.platformRanks[platform.key] !== null);

  return (
    <Box>
      {heading}
      <StaleRanksAlert answer={answer} />

      <KpiRow>
        <KpiTile
          darkMode={darkMode}
          color={color}
          label="Score"
          value={formatNumber(row.score)}
          hint={`${signed(row.scoreChange)} in this range`}
        />
        <KpiTile
          darkMode={darkMode}
          label="Rank"
          value={formatRank(row.rank)}
          hint={row.rank ? `of ${formatNumber(row.of)} students on ${platform.name}` : "Ranked once you have a score"}
        />
        <KpiTile
          darkMode={darkMode}
          label="Rank change"
          value={row.rank ? placesText(row.rankChange) : "-"}
          hint={`Over the last ${answer.range.days} days`}
        />
        <KpiTile
          darkMode={darkMode}
          label="Best rank"
          value={formatRank(row.bestRank?.rank)}
          hint={row.bestRank ? `Reached on ${shortDate(row.bestRank.date)}` : "No rank yet"}
        />
      </KpiRow>

      <ChartGrid>
        <ChartCard darkMode={darkMode} title={`${platform.name} score`} subtitle={`Last ${answer.range.days} days`}>
          <ScoreAreaChart
            data={answer.series}
            dataKey={`scores.${platform.key}`}
            name={`${platform.name} score`}
            color={color}
            darkMode={darkMode}
            gradientId={`fill-score-${platform.key}`}
          />
        </ChartCard>

        <ChartCard
          darkMode={darkMode}
          title={`${platform.name} rank`}
          subtitle={hasRank ? "Among students with a score on this platform. Rank 1 is at the top." : undefined}
        >
          {hasRank ? (
            <ScoreLines
              data={answer.series}
              ranks
              darkMode={darkMode}
              lines={[{ dataKey: `platformRanks.${platform.key}`, name: `${platform.name} rank`, color }]}
            />
          ) : (
            <EmptyChart darkMode={darkMode} message={`You are ranked on ${platform.name} once you have a score on it.`} />
          )}
        </ChartCard>
      </ChartGrid>

      <ScoreFootnote answer={answer} darkMode={darkMode} />
    </Box>
  );
};

export default PlatformScoreCharts;
