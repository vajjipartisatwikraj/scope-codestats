import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress, Typography, useTheme } from "@mui/material";
import SetupButton from "../setup/SetupButton";
import Reveal from "../setup/Reveal";
import ResultsNavbar from "./ResultsNavbar";
import ResultsRibbon from "./details/ResultsRibbon";
import ScoreSummary from "./charts/ScoreSummary";
import SkillRadar from "./charts/SkillRadar";
import QuestionBars from "./charts/QuestionBars";
import QuestionAnalysis from "./analysis/QuestionAnalysis";
import useSectionResults from "./useSectionResults";
import useCollapseOnScroll from "./useCollapseOnScroll";
import { STAGE } from "./motion/motionTokens";
import { FOOTER_HEIGHT } from "../runner/runnerTheme";

/** Wrapper that lets a chart card fill its grid cell while it fades in. */
const ChartSlot = ({ delay, children }) => (
  <Reveal y={16} duration={0.55} delay={delay} sx={{ display: "flex", minWidth: 0, "& > *": { flex: 1, minWidth: 0 } }}>
    {children}
  </Reveal>
);

/** A chart's own animation (rings drawing, bars rising) starts as its card settles. */
const startOf = (stage) => Math.round((stage + 0.2) * 1000);

/**
 * Detailed results of one scored section (route
 * /speech-tests/:id/sections/:sectionId/results), opened from "View scores" on
 * the section list. Layout: fixed top bar, a full-width blue details ribbon,
 * then a scrolling area with three charts and the question-by-question
 * analysis. The app footer comes from the shell and stays at the bottom.
 *
 * Entrance: the ribbon drops in, the three charts follow one after another and
 * animate their figures, then the question rows cascade in (see STAGE).
 */
const SectionResultsPage = () => {
  const { id, sectionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { report, loading, error } = useSectionResults(id, sectionId);

  // The ribbon folds to a slim strip once the content below it is scrolled.
  const scrollRef = useRef(null);
  const ribbonCollapsed = useCollapseOnScroll(scrollRef, Boolean(report));

  const back = () => navigate(`/speech-tests/${id}`);

  if (loading || error || !report) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          bgcolor: theme.palette.background.default,
        }}
      >
        <Reveal y={0} duration={0.3}>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Loading your results…
              </Typography>
            </Box>
          ) : (
            <Alert
              severity="error"
              sx={{ maxWidth: 560 }}
              action={
                <SetupButton variant="secondary" onClick={back}>
                  Back
                </SetupButton>
              }
            >
              {error || "Results not found"}
            </Alert>
          )}
        </Reveal>
      </Box>
    );
  }

  const { section, questions, skills } = report;

  return (
    <Reveal
      y={0}
      duration={0.35}
      sx={{
        // Top bar, ribbon and app footer stay in place; only the area between
        // them scrolls, so the page itself never does.
        height: {
          xs: `calc(100vh - ${FOOTER_HEIGHT.xs})`,
          sm: `calc(100vh - ${FOOTER_HEIGHT.sm})`,
        },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: theme.palette.background.default,
      }}
    >
      <ResultsNavbar title={section.title} />

      {/* The ribbon slides down from under the top bar. */}
      <Reveal y={-18} duration={0.6} delay={STAGE.ribbon} sx={{ flexShrink: 0 }}>
        <ResultsRibbon report={report} collapsed={ribbonCollapsed} onBack={back} />
      </Reveal>

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(5, 133, 224, 0.5)", borderRadius: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          scrollbarWidth: "thin",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1240,
            mx: "auto",
            boxSizing: "border-box",
            px: { xs: 2, md: 6 },
            py: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2.5 }}>
            <ChartSlot delay={STAGE.summary}>
              <ScoreSummary questions={questions} score={section.score} delayMs={startOf(STAGE.summary)} />
            </ChartSlot>
            <ChartSlot delay={STAGE.skills}>
              <SkillRadar skills={skills} delayMs={startOf(STAGE.skills)} />
            </ChartSlot>
            <ChartSlot delay={STAGE.bars}>
              <QuestionBars questions={questions} average={section.score} delayMs={startOf(STAGE.bars)} />
            </ChartSlot>
          </Box>

          <QuestionAnalysis questions={questions} />
        </Box>
      </Box>
    </Reveal>
  );
};

export default SectionResultsPage;
