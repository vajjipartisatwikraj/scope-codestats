import React, { useCallback, useRef, useState } from "react";
import { Box, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { getLiquidGlassStyle } from "../Dashboard/dashboardUtils";
import { platformProgressApi } from "../../services/platformProgressApi";
import CodingPlatformProgress from "./deprecated_CodingPlatformProgress";
import GithubProgress from "./deprecated_GithubProgress";
import ProgressOverview from "./deprecated_ProgressOverview";
import PlatformScoreCharts from "./deprecated_PlatformScoreCharts";
import ProgressStateNotice, { isNoticeState } from "./deprecated_ProgressStateNotice";
import { LoadError, LoadingBlock } from "./deprecated_ProgressWidgets";
import ScoreProgress from "./deprecated_ScoreProgress";
import { ScoreStateNotice } from "./deprecated_ScoreCharts";
import useProgressData from "../Dashboard/progress/useProgressData";
import {
  DEFAULT_RANGE_DAYS,
  PROGRESS_PLATFORMS,
  RANGE_OPTIONS,
  chartColor,
  chartTheme,
} from "../Dashboard/progress/progressFormat";

const OVERVIEW = "overview";
const SCORES = "scores";
const SCORES_COLOR = "#7c4dff";

/**
 * The dashboard "Progress" tab: an overview of every platform, a "Scores & ranks" page,
 * then one page per platform with its history charts (LeetCode, Codeforces, CodeChef,
 * HackerRank) or its live GitHub timeline, followed by that platform's score and rank.
 * Only the signed-in user's own data is shown.
 *
 * @param {boolean} darkMode
 * @param {() => void} onManagePlatforms opens the Platforms tab (to add or fix a username)
 */
const PlatformProgress = ({ darkMode, onManagePlatforms }) => {
  const [selected, setSelected] = useState(OVERVIEW);
  const [days, setDays] = useState(DEFAULT_RANGE_DAYS);
  const cache = useRef(new Map());
  const theme = chartTheme(darkMode);

  const isOverview = selected === OVERVIEW;
  const isScores = selected === SCORES;
  const platform = PROGRESS_PLATFORMS.find((p) => p.key === selected);

  const key = isOverview ? OVERVIEW : isScores ? `${SCORES}:${days}` : `${selected}:${days}`;
  const load = useCallback(
    (signal) =>
      isOverview
        ? platformProgressApi.overview({ signal })
        : isScores
          ? platformProgressApi.scores(days, { signal })
          : platformProgressApi.platform(selected, days, { signal }),
    [isOverview, isScores, selected, days]
  );
  const { data, loading, error, reload } = useProgressData(cache.current, key, load);

  // A platform page also shows that platform's score and rank. They come from the same
  // answer as the Scores & ranks page, so the two pages share one cached request. The
  // other pages need nothing here (key null).
  const scoresKey = isOverview || isScores ? null : `${SCORES}:${days}`;
  const loadScores = useCallback((signal) => platformProgressApi.scores(days, { signal }), [days]);
  const scoreData = useProgressData(cache.current, scoresKey, loadScores);

  const renderBody = () => {
    if (loading) return <LoadingBlock label="Loading your progress..." />;
    if (error) return <LoadError message={error} onRetry={reload} />;
    if (!data) return null;

    // Never draw an answer that belongs to a different page (defence in depth; the hook
    // already hands out only the answer for the current key).
    const belongsHere = isOverview
      ? Array.isArray(data.platforms)
      : isScores
        ? typeof data.state === "string" && (data.state !== "ok" || data.range?.days === days)
        : data.platform === selected;
    if (!belongsHere) return <LoadingBlock label="Loading your progress..." />;

    if (isScores) {
      return data.state === "ok" ? (
        <ScoreProgress answer={data} darkMode={darkMode} />
      ) : (
        <ScoreStateNotice answer={data} darkMode={darkMode} />
      );
    }

    if (isOverview) {
      return <ProgressOverview data={data} darkMode={darkMode} onSelectPlatform={setSelected} />;
    }
    if (isNoticeState(data)) {
      return (
        <ProgressStateNotice
          answer={data}
          platformName={platform.name}
          darkMode={darkMode}
          onManagePlatforms={onManagePlatforms}
          onRetry={reload}
        />
      );
    }

    const color = chartColor(platform, darkMode);
    return (
      <>
        {selected === "github" ? (
          <GithubProgress answer={data} color={color} darkMode={darkMode} />
        ) : (
          <CodingPlatformProgress answer={data} color={color} darkMode={darkMode} />
        )}
        <PlatformScoreCharts
          platform={platform}
          answer={scoreData.data}
          loading={scoreData.loading}
          error={scoreData.error}
          onRetry={scoreData.reload}
          color={color}
          darkMode={darkMode}
        />
      </>
    );
  };

  return (
    <Box sx={{ ...getLiquidGlassStyle(darkMode), p: { xs: 2, sm: 3 }, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>Platform progress</Typography>
          <Typography variant="body2" sx={{ color: theme.text }}>
            How your numbers, scores and ranks changed over time.
          </Typography>
        </Box>

        {!isOverview && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={days}
            onChange={(_event, value) => value && setDays(value)}
            aria-label="Date range"
          >
            {RANGE_OPTIONS.map((option) => (
              <ToggleButton key={option.days} value={option.days} sx={{ px: 1.75, textTransform: "none" }}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      <Tabs
        value={selected}
        onChange={(_event, value) => setSelected(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          minHeight: 40,
          "& .MuiTab-root": { textTransform: "none", minHeight: 40, fontWeight: 600 },
          "& .MuiTabs-indicator": {
            backgroundColor: isOverview ? "#0585E0" : isScores ? SCORES_COLOR : chartColor(platform, darkMode),
          },
        }}
      >
        <Tab value={OVERVIEW} label="All platforms" />
        <Tab value={SCORES} label="Scores & ranks" />
        {PROGRESS_PLATFORMS.map((p) => (
          <Tab key={p.key} value={p.key} label={p.name} />
        ))}
      </Tabs>

      {renderBody()}
    </Box>
  );
};

export default PlatformProgress;
