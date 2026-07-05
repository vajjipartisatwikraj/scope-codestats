import React from "react";
import { Box, Typography, Chip, Grid, Divider, TextField, Button } from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import DeveloperBoardIcon from "@mui/icons-material/DeveloperBoard";
import ScoreIcon from "@mui/icons-material/Score";
import BugReportIcon from "@mui/icons-material/BugReport";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import RocketAnimation from "../RocketAnimation";

const TestCasesPanel = ({
  question,
  testResults,
  darkMode,
  testCasesPanelHeight,
  testPanelResizerRef,
  startTestPanelResize,
  isResizingTestPanel,
  output,
  isSubmission = false, // Flag to indicate submission mode
  submitting = false, // Flag to indicate submission in progress
  testResultsSummary = null, // Summary from backend (total, passed, failed)
  // Custom Input props
  activeInputTab = 0, // 0 = Test Cases, 1 = Custom Input
  onInputTabChange, // Callback to parent when tab changes
  customInput = "", // Custom input text
  onCustomInputChange, // Callback when custom input text changes
  customOutput = null, // Raw output from custom input run { output, error, time, memory, status }
  running = false, // Whether code is currently running
  panelMode = "testrun", // "debug" | "testrun" — controls tabs, raw vs parsed test cases, and submit availability
  onPanelModeChange, // Callback to toggle the panel mode
  fillHeight = false, // When true, the panel fills its parent instead of using testCasesPanelHeight
  collapsed = false, // When true, only the header is shown (folded)
  onToggleCollapse = null, // Callback for the fold/unfold button
  showResizer = true, // Whether to render the drag-to-resize bar
}) => {
  // State to track if animation has completed
  const [animationCompleted, setAnimationCompleted] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);

  // Determine rocket animation state
  // Check testResults FIRST so rocket transitions to success/failure as soon as
  // code execution finishes, without waiting for the backend submission to complete.
  // Determine failure using the AUTHORITATIVE backend summary in submission
  // mode (visible-only testResults would miss failing HIDDEN test cases).
  const computeHasFailures = () => {
    if (isSubmission && testResultsSummary) {
      return (
        (testResultsSummary.failed || 0) > 0 ||
        (testResultsSummary.passed || 0) !== (testResultsSummary.total || 0)
      );
    }
    return testResults.some((r) => !r.passed || r.error);
  };

  const getRocketAnimationState = () => {
    if (testResults && testResults.length > 0) {
      return computeHasFailures() ? "failure" : "success";
    }
    if (submitting) return "submitting";
    return "idle";
  };

  const rocketState = getRocketAnimationState();
  // Show rocket while submitting with no results yet, or while results exist but animation hasn't finished
  const showRocketAnimation =
    (submitting && (!testResults || testResults.length === 0)) ||
    (!animationCompleted && testResults && testResults.length > 0);

  // Reset animation state when a new submission starts
  React.useEffect(() => {
    if (submitting) {
      setAnimationCompleted(false);
      setShowResults(false);
    }
  }, [submitting]);

  // Fallback: if onAnimationComplete never fires, force-show results after a safe timeout
  React.useEffect(() => {
    if (testResults && testResults.length > 0 && !animationCompleted) {
      const hasFailures = computeHasFailures();
      // Success flyaway = 2s + 300ms buffer + 500ms extra safety = 2.8s
      // Failure tumble  = 1.5s + 600ms buffer + 500ms extra safety = 2.6s
      const fallbackDelay = hasFailures ? 2600 : 2800;
      const timer = setTimeout(() => {
        if (!animationCompleted) {
          setAnimationCompleted(true);
          setShowResults(true);
        }
      }, fallbackDelay);
      return () => clearTimeout(timer);
    }
  }, [testResults, animationCompleted]);

  // Calculate pass/fail counts based on mode:
  // - In RUN mode: testResults contains only visible test cases, count from those
  // - In SUBMIT mode: Use testResultsSummary if available (contains all test cases count)
  const visibleTestResults = testResults
    ? testResults.filter((r) => !r.hidden)
    : [];

  // Count passed tests based on submission mode
  const passedCount = isSubmission && testResultsSummary
    ? testResultsSummary.passed // Use backend summary for submit mode
    : visibleTestResults.filter((r) => r.passed).length; // Count only visible passed

  const visibleCount = visibleTestResults.length;

  // Get total test case count based on mode:
  // - SUBMIT mode: Use testResultsSummary.total if available (backend sends summary)
  // - RUN mode: Use question.testCases.length (for consistency)
  const totalTestCases = isSubmission && testResultsSummary
    ? testResultsSummary.total // Use backend summary
    : question?.testCases
    ? question.testCases.length
    : 0;

  // Get the combined expected outputs - only show unhidden test cases
  const getExpectedOutput = () => {
    if (!question?.testCases) return "";

    // Always show only non-hidden test cases in the panel
    const visibleTestCases = question.testCases.filter((tc) => !tc.hidden);

    return visibleTestCases
      .map((tc) => tc.output)
      .join("\n")
      .trim();
  };

  const getActualOutput = () => {
    if (!visibleTestResults || visibleTestResults.length === 0) return "";
    return visibleTestResults
      .map((result) => result.actualOutput || "")
      .join("\n")
      .trim();
  };

  // Get the combined inputs - only show unhidden test cases
  const getInput = () => {
    if (!question?.testCases) return "";

    // Always show only non-hidden test cases in the panel
    const visibleTestCases = question.testCases.filter((tc) => !tc.hidden);

    return visibleTestCases
      .map((tc) => tc.input)
      .join("\n")
      .trim();
  };

  // Get the raw stdin exactly as the judge feeds it: the test-case count (T)
  // on the first line, followed by each visible test case's input.
  // Mirrors the backend combined-stdin format: `${totalCases}\n${inputs.join("\n")}`.
  const getRawStdin = () => {
    if (!question?.testCases) return "";
    const visibleTestCases = question.testCases.filter((tc) => !tc.hidden);
    if (visibleTestCases.length === 0) return "";
    const inputs = visibleTestCases.map((tc) => tc.input || "");
    return `${visibleTestCases.length}\n${inputs.join("\n")}`;
  };

  // Scoring Tiers component - Shows which tier was achieved
  const ScoringTiersDisplay = ({ question, executionTime, darkMode }) => {
    if (!question || !executionTime) return null;

    // Find the current language's scoring tiers
    const currentLanguage = question.languages?.find(
      (lang) => lang.scoringTiers && lang.scoringTiers.length > 0
    );

    if (!currentLanguage || !currentLanguage.scoringTiers || currentLanguage.scoringTiers.length === 0) {
      return null; // No scoring tiers configured
    }

    const scoringTiers = currentLanguage.scoringTiers;
    const minimumPoints = currentLanguage.minimumPoints || 0;

    // Determine which tier was achieved
    let achievedTierIndex = -1;
    let pointsEarned = minimumPoints;

    for (let i = 0; i < scoringTiers.length; i++) {
      if (executionTime <= scoringTiers[i].maxTime) {
        achievedTierIndex = i;
        pointsEarned = scoringTiers[i].points;
        break;
      }
    }

    // If no tier was achieved but within time limit, use minimum points
    const withinTimeLimit = executionTime <= (question.constraints?.timeLimit || Infinity);

    return (
      <Box sx={{ width: "100%", mt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 2,
            color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          Scoring Tiers Performance
        </Typography>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            border: "1px solid",
            borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          }}
        >
          {/* Points Earned Summary */}
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: achievedTierIndex >= 0
                ? darkMode
                  ? "rgba(76, 175, 80, 0.15)"
                  : "rgba(76, 175, 80, 0.1)"
                : darkMode
                ? "rgba(255, 152, 0, 0.15)"
                : "rgba(255, 152, 0, 0.1)",
              border: "1px solid",
              borderColor: achievedTierIndex >= 0
                ? darkMode
                  ? "rgba(76, 175, 80, 0.3)"
                  : "rgba(76, 175, 80, 0.3)"
                : darkMode
                ? "rgba(255, 152, 0, 0.3)"
                : "rgba(255, 152, 0, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: "bold",
                color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
              }}
            >
              Points Earned
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: achievedTierIndex >= 0
                  ? darkMode
                    ? "#4caf50"
                    : "#2e7d32"
                  : darkMode
                  ? "#ff9800"
                  : "#ed6c02",
              }}
            >
              {pointsEarned} / {question.marks} pts
            </Typography>
          </Box>

          {/* Tier Breakdown */}
          <Box sx={{ mt: 2 }}>
            {scoringTiers.map((tier, index) => {
              // If achieved tier 0 (fastest), all tiers are achieved
              // If achieved tier 1, tiers 1, 2, 3... are achieved
              // Logic: current tier is achieved if achievedTierIndex is valid AND current index >= achievedTierIndex
              const isAchieved = achievedTierIndex >= 0 && index >= achievedTierIndex;
              
              // Missed: faster tiers that weren't achieved (only if a tier was achieved but not this one)
              const isMissed = achievedTierIndex >= 0 && index < achievedTierIndex;
              
              // Not reached: slower tiers when no tier was achieved (fallback case)
              const isNotReached = achievedTierIndex === -1 && withinTimeLimit;

              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: isAchieved
                      ? darkMode
                        ? "rgba(76, 175, 80, 0.1)"
                        : "rgba(76, 175, 80, 0.08)"
                      : isMissed
                      ? darkMode
                        ? "rgba(244, 67, 54, 0.08)"
                        : "rgba(244, 67, 54, 0.05)"
                      : darkMode
                      ? "rgba(158, 158, 158, 0.05)"
                      : "rgba(158, 158, 158, 0.03)",
                    border: "1px solid",
                    borderColor: isAchieved
                      ? darkMode
                        ? "rgba(76, 175, 80, 0.3)"
                        : "rgba(76, 175, 80, 0.3)"
                      : isMissed
                      ? darkMode
                        ? "rgba(244, 67, 54, 0.2)"
                        : "rgba(244, 67, 54, 0.2)"
                      : darkMode
                      ? "rgba(158, 158, 158, 0.15)"
                      : "rgba(158, 158, 158, 0.15)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Chip
                      label={`Tier ${index + 1}`}
                      size="small"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.7rem",
                        bgcolor: isAchieved
                          ? darkMode
                            ? "#4caf50"
                            : "#2e7d32"
                          : isMissed
                          ? darkMode
                            ? "#f44336"
                            : "#c62828"
                          : darkMode
                          ? "#757575"
                          : "#9e9e9e",
                        color: "#fff",
                      }}
                    />
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: darkMode
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                          fontSize: "0.7rem",
                        }}
                      >
                        Max Runtime
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: "medium",
                          color: darkMode
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.9)",
                        }}
                      >
                        {tier.maxTime} ms
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={
                        isAchieved
                          ? "Achieved"
                          : isMissed
                          ? "Not Achieved"
                          : "Not Reached"
                      }
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.65rem",
                        borderColor: isAchieved
                          ? darkMode
                            ? "#4caf50"
                            : "#2e7d32"
                          : isMissed
                          ? darkMode
                            ? "#f44336"
                            : "#c62828"
                          : darkMode
                          ? "#757575"
                          : "#9e9e9e",
                        color: isAchieved
                          ? darkMode
                            ? "#4caf50"
                            : "#2e7d32"
                          : isMissed
                          ? darkMode
                            ? "#f44336"
                            : "#c62828"
                          : darkMode
                          ? "#757575"
                          : "#9e9e9e",
                      }}
                    />
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: "bold",
                        color: isAchieved
                          ? darkMode
                            ? "#4caf50"
                            : "#2e7d32"
                          : isMissed
                          ? darkMode
                            ? "#f44336"
                            : "#c62828"
                          : darkMode
                          ? "#757575"
                          : "#9e9e9e",
                        minWidth: "60px",
                        textAlign: "right",
                      }}
                    >
                      {tier.points} pts
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {/* Minimum Points Tier */}
            {minimumPoints > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  mt: 2,
                  borderRadius: 1,
                  bgcolor: achievedTierIndex === -1 && withinTimeLimit
                    ? darkMode
                      ? "rgba(255, 152, 0, 0.1)"
                      : "rgba(255, 152, 0, 0.08)"
                    : darkMode
                    ? "rgba(158, 158, 158, 0.05)"
                    : "rgba(158, 158, 158, 0.03)",
                  border: "1px dashed",
                  borderColor: achievedTierIndex === -1 && withinTimeLimit
                    ? darkMode
                      ? "rgba(255, 152, 0, 0.3)"
                      : "rgba(255, 152, 0, 0.3)"
                    : darkMode
                    ? "rgba(158, 158, 158, 0.2)"
                    : "rgba(158, 158, 158, 0.2)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Chip
                    label="Fallback"
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      fontSize: "0.7rem",
                      bgcolor: achievedTierIndex === -1 && withinTimeLimit
                        ? darkMode
                          ? "#ff9800"
                          : "#ed6c02"
                        : darkMode
                        ? "#757575"
                        : "#9e9e9e",
                      color: "#fff",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: "medium",
                      color: darkMode
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Exceeds all tiers
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {achievedTierIndex === -1 && withinTimeLimit && (
                    <Chip
                      label="Achieved"
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.65rem",
                        borderColor: darkMode ? "#ff9800" : "#ed6c02",
                        color: darkMode ? "#ff9800" : "#ed6c02",
                      }}
                    />
                  )}
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      color: achievedTierIndex === -1 && withinTimeLimit
                        ? darkMode
                          ? "#ff9800"
                          : "#ed6c02"
                        : darkMode
                        ? "#757575"
                        : "#9e9e9e",
                      minWidth: "60px",
                      textAlign: "right",
                    }}
                  >
                    {minimumPoints} pts
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Performance Insight */}
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: darkMode ? "rgba(33, 150, 243, 0.08)" : "rgba(33, 150, 243, 0.05)",
              border: "1px solid",
              borderColor: darkMode ? "rgba(33, 150, 243, 0.2)" : "rgba(33, 150, 243, 0.2)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: darkMode ? "rgba(33, 150, 243, 0.9)" : "rgba(25, 118, 210, 0.9)",
                fontWeight: "medium",
                fontSize: "0.75rem",
              }}
            >
              Your solution executed in {executionTime} ms
              {achievedTierIndex >= 0 && achievedTierIndex < scoringTiers.length - 1 && (
                <>
                  {" "}• Optimize to reach {scoringTiers[achievedTierIndex - 1]?.maxTime || scoringTiers[0]?.maxTime} ms for {scoringTiers[achievedTierIndex - 1]?.points || scoringTiers[0]?.points} points
                </>
              )}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  // Performance stats component
  const PerformanceStats = ({ testResults, darkMode }) => {
    if (!visibleTestResults || visibleTestResults.length === 0) {
      return null;
    }

    // Get execution time and memory from first visible result
    const executionTime = visibleTestResults[0]?.executionTime || 0;
    const memoryUsed = Math.max(
      ...visibleTestResults.map((r) => r.memoryUsed || r.memory || 0)
    );

    return (
      <Box sx={{ width: "100%", mt: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 2,
            color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          Performance Summary
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: darkMode
                  ? "rgba(0, 136, 204, 0.1)"
                  : "rgba(0, 136, 204, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <SpeedIcon sx={{ color: darkMode ? "#0088cc" : "#0077b6" }} />
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Runtime
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: "medium",
                    color: darkMode ? "#0088cc" : "#0077b6",
                  }}
                >
                  {executionTime} ms
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={4}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: darkMode
                  ? "rgba(156, 39, 176, 0.1)"
                  : "rgba(156, 39, 176, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <DeveloperBoardIcon
                sx={{ color: darkMode ? "#9c27b0" : "#7b1fa2" }}
              />
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Memory Used
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: "medium",
                    color: darkMode ? "#9c27b0" : "#7b1fa2",
                  }}
                >
                  {memoryUsed} KB
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={4}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor:
                  passedCount === totalTestCases
                    ? darkMode
                      ? "rgba(76, 175, 80, 0.1)"
                      : "rgba(76, 175, 80, 0.05)"
                    : darkMode
                    ? "rgba(255, 152, 0, 0.1)"
                    : "rgba(255, 152, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <ScoreIcon
                sx={{
                  color:
                    passedCount === totalTestCases
                      ? darkMode
                        ? "#4caf50"
                        : "#2e7d32"
                      : darkMode
                      ? "#ff9800"
                      : "#ed6c02",
                }}
              />
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: darkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Test Cases
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: "medium",
                    color:
                      passedCount === totalTestCases
                        ? darkMode
                          ? "#4caf50"
                          : "#2e7d32"
                        : darkMode
                        ? "#ff9800"
                        : "#ed6c02",
                  }}
                >
                  {passedCount}/{totalTestCases} passed
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Add Scoring Tiers Display after Performance Summary */}
        {isSubmission && passedCount === totalTestCases && (
          <ScoringTiersDisplay
            question={question}
            executionTime={executionTime}
            darkMode={darkMode}
          />
        )}
      </Box>
    );
  };

  // Renders raw output text line-by-line, coloring each line green when it
  // matches the corresponding line of the other output and red when it differs.
  // Used in Debug mode to diff expected vs actual output after a run.
  const RawOutputDiff = ({ text, otherText, hasRun, darkMode }) => {
    const lines = (text || "").split("\n");
    const otherLines = (otherText || "").split("\n");
    return (
      <>
        {lines.map((line, i) => {
          const matched = (line ?? "").trim() === (otherLines[i] ?? "").trim();
          const color = hasRun
            ? matched
              ? darkMode
                ? "#4caf50"
                : "#2e7d32"
              : darkMode
              ? "#f44336"
              : "#c62828"
            : darkMode
            ? "rgba(255,255,255,0.9)"
            : "rgba(0,0,0,0.9)";
          const bg = hasRun
            ? matched
              ? darkMode
                ? "rgba(76,175,80,0.12)"
                : "rgba(76,175,80,0.1)"
              : darkMode
              ? "rgba(244,67,54,0.12)"
              : "rgba(244,67,54,0.1)"
            : "transparent";
          return (
            <Box
              key={i}
              sx={{
                px: 0.5,
                borderRadius: "2px",
                bgcolor: bg,
                color,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {line === "" ? "\u00A0" : line}
            </Box>
          );
        })}
      </>
    );
  };

  // Renders the raw stdin with per-test-case coloring in Debug mode:
  // - line 0 (the T value) is white
  // - the remaining lines are split into T blocks of K = (totalLines - 1) / T
  //   lines each, and consecutive blocks alternate between a dark-blue and a
  //   light-blue shade so each test case is visually distinct.
  const RawInputColored = ({ text, testCaseCount, darkMode }) => {
    const lines = (text || "").split("\n");
    const total = lines.length;
    const T = testCaseCount > 0 ? testCaseCount : 1;
    const K = Math.max(1, Math.round((total - 1) / T)); // lines per test case
    return (
      <>
        {lines.map((line, i) => {
          let bg = "transparent";
          let color = darkMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.9)";
          if (i === 0) {
            // First line = number of test cases (T) → white
            color = darkMode ? "#ffffff" : "#111111";
            bg = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
          } else {
            const tcIndex = Math.floor((i - 1) / K);
            const isDarkShade = tcIndex % 2 === 0;
            bg = isDarkShade
              ? darkMode
                ? "rgba(40,66,104,0.45)" // muted dark blue
                : "rgba(21,101,192,0.10)"
              : darkMode
              ? "rgba(70,100,140,0.22)" // muted light blue
              : "rgba(100,181,246,0.06)";
          }
          return (
            <Box
              key={i}
              sx={{
                px: 0.5,
                borderRadius: "2px",
                bgcolor: bg,
                color,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {line === "" ? "\u00A0" : line}
            </Box>
          );
        })}
      </>
    );
  };

  return (
    <>
      {/* Test panel resizer — fills the full gap between editor and test panel */}
      {showResizer && (
      <Box
        ref={testPanelResizerRef}
        sx={{
          height: "8px",
          width: "100%",
          flexShrink: 0,
          bgcolor: "transparent",
          cursor: "row-resize",
          zIndex: 20,
          m: 0,
          p: 0,
        }}
        onMouseDown={startTestPanelResize}
      />
      )}

      {/* Test Cases Panel */}
      <Box
        sx={{
          border: "1px solid",
          borderColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
          borderRadius: "12px",
          overflow: "hidden",
          bgcolor: darkMode ? "#0A0A0A" : "#F5F7FA",
          height: fillHeight ? "auto" : `${testCasesPanelHeight}%`,
          flexGrow: fillHeight ? 1 : 0,
          minHeight: fillHeight ? 0 : "auto",
          display: "flex",
          flexDirection: "column",
          m: 0,
          mt: 0,
          p: 0,
          position: "relative",
          transition: isResizingTestPanel ? "none" : "height 0.1s ease",
        }}
      >
        {/* Header with Tabs */}
        <Box
          sx={{
            borderBottom: "1px solid",
            borderTop: "1px solid",
            borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            position: "sticky",
            top: 0,
            left: 0,
            right: 0,
            bgcolor: darkMode ? "#0A0A0A" : "#FFFFFF",
            zIndex: 50,
            width: "100%",
            flexShrink: 0,
            minHeight: "40px",
            maxHeight: "40px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            alignItems: "center",
            px: 0,
            justifyContent: "space-between",
            display:
              panelMode !== "debug" &&
              testResults &&
              testResults.some(
                (r) =>
                  r.error &&
                  (r.error.toLowerCase().includes("compilation") ||
                    r.error.toLowerCase().includes("runtime error"))
              )
                ? "none"
                : "flex",
          }}
        >
          {/* Section switcher — buttons separated by |, styled like the
              question-description tabs. Test Cases is always shown (left); in
              Debug mode the Custom Input button appears to its right. */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              px: 2,
              minHeight: "40px",
            }}
          >
            {[
              { value: 0, label: isSubmission ? "Hidden Test Cases" : "Test Cases" },
              ...(panelMode === "debug"
                ? [{ value: 1, label: "Custom Input" }]
                : []),
            ].map((t, i) => (
              <React.Fragment key={t.value}>
                {i > 0 && (
                  <Box
                    component="span"
                    sx={{
                      mx: 0.5,
                      color: darkMode
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(0,0,0,0.25)",
                      userSelect: "none",
                    }}
                  >
                    |
                  </Box>
                )}
                <Button
                  onClick={() => onInputTabChange && onInputTabChange(t.value)}
                  disableRipple
                  sx={{
                    minWidth: "auto",
                    textTransform: "none",
                    fontSize: "0.875rem",
                    fontWeight: activeInputTab === t.value ? 700 : 500,
                    px: 1,
                    py: 0.25,
                    borderRadius: "4px",
                    color:
                      activeInputTab === t.value
                        ? darkMode
                          ? "#fff"
                          : "#1976d2"
                        : darkMode
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    "&:hover": {
                      bgcolor: "transparent",
                      color: darkMode ? "#fff" : "#1976d2",
                    },
                  }}
                >
                  {t.label}
                </Button>
              </React.Fragment>
            ))}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: onToggleCollapse ? 0.5 : 0 }}>
          {/* Debug / Test Run mode toggle */}
          <Button
            size="small"
            disabled={running || submitting}
            onClick={() =>
              onPanelModeChange &&
              onPanelModeChange(panelMode === "debug" ? "testrun" : "debug")
            }
            startIcon={
              panelMode === "debug" ? null : (
                <BugReportIcon sx={{ fontSize: "1rem" }} />
              )
            }
            sx={{
              mr: 1.5,
              height: "28px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.72rem",
              borderRadius: "6px",
              px: 1.5,
              color: darkMode ? "#42a5f5" : "#1976d2",
              border: "1px solid",
              borderColor: darkMode
                ? "rgba(66,165,245,0.4)"
                : "rgba(25,118,210,0.4)",
              bgcolor: darkMode
                ? "rgba(66,165,245,0.08)"
                : "rgba(25,118,210,0.06)",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(66,165,245,0.16)"
                  : "rgba(25,118,210,0.12)",
              },
            }}
          >
            {panelMode === "debug" ? "Test Run" : "Debug"}
          </Button>

          {onToggleCollapse && (
            <Button
              size="small"
              aria-label={collapsed ? "Unfold test cases" : "Fold test cases"}
              onClick={onToggleCollapse}
              sx={{
                minWidth: "auto",
                p: 0.5,
                bgcolor: "transparent",
                color: darkMode ? "#aaa" : "#555",
                border: "none",
                "&:hover": {
                  bgcolor: "transparent",
                  color: darkMode ? "#fff" : "#000",
                },
              }}
            >
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: "1.3rem",
                  transition: "transform 0.2s ease",
                  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Button>
          )}
          </Box>
        </Box>

        {/* Content */}
        <Box
          sx={{
            display: collapsed ? "none" : "block",
            height: "calc(100% - 40px)",
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.15)",
              borderRadius: "4px",
            },
          }}
        >
          {/* Tab 0 — Test Run mode: parsed, test-case-wise display (existing behavior — untouched) */}
          {activeInputTab === 0 && panelMode !== "debug" && (
          <Box sx={{ p: 2 }}>
            {/* Rocket Animation - Show during submission and until animation completes */}
            {showRocketAnimation && (
              <RocketAnimation
                submissionState={rocketState}
                darkMode={darkMode}
                onAnimationComplete={() => {
                  // Rocket animation finished — now show results
                  setAnimationCompleted(true);
                  setShowResults(true);
                }}
              />
            )}

            {/* Show results after animation completes, OR show default test cases if no results yet */}
            {/* NEVER show results while rocket animation is still playing */}
            {!showRocketAnimation && (showResults || (!submitting && (!testResults || testResults.length === 0))) && (
                <>
                  {/* Check if there are compilation or runtime errors */}
                  {testResults &&
                  testResults.some(
                    (r) =>
                      r.error &&
                      (r.error.toLowerCase().includes("compilation") ||
                        r.error.toLowerCase().includes("runtime error"))
                  ) ? (
                    // ONLY show the error, nothing else
                    <Box sx={{ mt: 2, mb: 3 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 2,
                          color: darkMode
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(0,0,0,0.85)",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                        }}
                      >
                        {testResults[0].error
                          .toLowerCase()
                          .includes("compilation")
                          ? "🔴 Compilation Error"
                          : "🔴 Runtime Error"}
                      </Typography>

                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          bgcolor: darkMode
                            ? "rgba(244, 67, 54, 0.1)"
                            : "rgba(244, 67, 54, 0.05)",
                          border: "1px solid",
                          borderColor: "#f44336",
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          whiteSpace: "pre-wrap",
                          overflowX: "auto",
                          color: "#f44336",
                        }}
                      >
                        {testResults[0].error}
                      </Box>

                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 1,
                          color: darkMode
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                          fontStyle: "italic",
                        }}
                      >
                        {testResults[0].error
                          .toLowerCase()
                          .includes("compilation")
                          ? "Fix the compilation errors above before running your code."
                          : "Your code encountered a runtime error. Check the error message above for details."}
                      </Typography>
                    </Box>
                  ) : (
                    // No compilation/runtime errors - show normal results
                    <>
                      {/* Performance Summary for hidden test cases */}
                      {isSubmission &&
                        visibleTestResults &&
                        visibleTestResults.length > 0 && (
                          <PerformanceStats
                            testResults={visibleTestResults}
                            darkMode={darkMode}
                          />
                        )}

                      {/* Test Case Content - Only show if there are NO compilation/runtime errors */}
                      {!isSubmission &&
                      visibleTestResults &&
                      visibleTestResults.length > 0 &&
                      !testResults.some(
                        (r) =>
                          r.error &&
                          (r.error.toLowerCase().includes("compilation") ||
                            r.error.toLowerCase().includes("runtime error"))
                      ) ? (
                        // Show individual test case results for run mode (only when no compilation/runtime errors)
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              mb: 2,
                              color: darkMode
                                ? "rgba(255,255,255,0.85)"
                                : "rgba(0,0,0,0.85)",
                              fontWeight: "bold",
                              fontSize: "0.9rem",
                            }}
                          >
                            Test Case Results
                          </Typography>

                          {visibleTestResults.map((result, index) => (
                            <Box key={index} sx={{ mb: 3 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mb: 1.5,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: result.passed
                                    ? darkMode
                                      ? "rgba(76, 175, 80, 0.1)"
                                      : "rgba(76, 175, 80, 0.05)"
                                    : darkMode
                                    ? "rgba(244, 67, 54, 0.1)"
                                    : "rgba(244, 67, 54, 0.05)",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: "bold",
                                    color: result.passed
                                      ? darkMode
                                        ? "#4caf50"
                                        : "#2e7d32"
                                      : darkMode
                                      ? "#f44336"
                                      : "#c62828",
                                  }}
                                >
                                  Test Case {index + 1}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={
                                    result.error &&
                                    result.error
                                      .toLowerCase()
                                      .includes("compilation")
                                      ? "COMPILATION ERROR"
                                      : result.error &&
                                        result.error
                                          .toLowerCase()
                                          .includes("runtime")
                                      ? "RUNTIME ERROR"
                                      : result.error &&
                                        result.error
                                          .toLowerCase()
                                          .includes("time")
                                      ? "TLE"
                                      : result.error &&
                                        result.error
                                          .toLowerCase()
                                          .includes("memory")
                                      ? "MLE"
                                      : result.passed
                                      ? "PASSED"
                                      : "FAILED"
                                  }
                                  color={
                                    result.error &&
                                    (result.error
                                      .toLowerCase()
                                      .includes("compilation") ||
                                      result.error
                                        .toLowerCase()
                                        .includes("runtime"))
                                      ? "error"
                                      : result.error &&
                                        (result.error
                                          .toLowerCase()
                                          .includes("time") ||
                                          result.error
                                            .toLowerCase()
                                            .includes("memory"))
                                      ? "warning"
                                      : result.passed
                                      ? "success"
                                      : "error"
                                  }
                                  variant="outlined"
                                  sx={{
                                    ml: 2,
                                    fontWeight: 600,
                                    fontSize: "0.7rem",
                                  }}
                                />
                                {/* Show execution time for TLE cases */}
                                {result.error &&
                                  result.error.toLowerCase().includes("time") &&
                                  result.executionTime && (
                                    <Chip
                                      size="small"
                                      label={`${result.executionTime}ms`}
                                      color="error"
                                      variant="filled"
                                      sx={{
                                        ml: 1,
                                        fontWeight: 600,
                                        fontSize: "0.65rem",
                                        bgcolor: "#ff5722",
                                      }}
                                    />
                                  )}
                              </Box>

                              {/* Input */}
                              <Box sx={{ mb: 2 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: darkMode
                                      ? "rgba(255,255,255,0.6)"
                                      : "rgba(0,0,0,0.6)",
                                    fontWeight: "bold",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  Input:
                                </Typography>
                                <Box
                                  sx={{
                                    p: 1,
                                    mt: 0.5,
                                    borderRadius: 1,
                                    bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                                    border: "1px solid",
                                    borderColor: darkMode
                                      ? "rgba(255,255,255,0.1)"
                                      : "rgba(0,0,0,0.1)",
                                    fontFamily: "monospace",
                                    color: darkMode
                                      ? "rgba(255,255,255,0.9)"
                                      : "rgba(0,0,0,0.9)",
                                    fontSize: "0.8rem",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {result.input || "No input"}
                                </Box>
                              </Box>

                              {/* Expected vs Actual Output */}
                              <Grid container spacing={2}>
                                <Grid item xs={6}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: darkMode
                                        ? "rgba(255,255,255,0.6)"
                                        : "rgba(0,0,0,0.6)",
                                      fontWeight: "bold",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    Expected:
                                  </Typography>
                                  <Box
                                    sx={{
                                      p: 1,
                                      mt: 0.5,
                                      borderRadius: 1,
                                      bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                                      border: "1px solid",
                                      borderColor: darkMode
                                        ? "rgba(255,255,255,0.1)"
                                        : "rgba(0,0,0,0.1)",
                                      fontFamily: "monospace",
                                      color: darkMode
                                        ? "rgba(255,255,255,0.9)"
                                        : "rgba(0,0,0,0.9)",
                                      fontSize: "0.8rem",
                                      whiteSpace: "pre-wrap",
                                      minHeight: "40px",
                                    }}
                                  >
                                    {result.expectedOutput ||
                                      "No expected output"}
                                  </Box>
                                </Grid>

                                <Grid item xs={6}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: darkMode
                                        ? "rgba(255,255,255,0.6)"
                                        : "rgba(0,0,0,0.6)",
                                      fontWeight: "bold",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    Got:
                                  </Typography>
                                  <Box
                                    sx={{
                                      p: 1,
                                      mt: 0.5,
                                      borderRadius: 1,
                                      bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                                      border: "1px solid",
                                      borderColor: result.passed
                                        ? darkMode
                                          ? "rgba(76, 175, 80, 0.3)"
                                          : "rgba(76, 175, 80, 0.3)"
                                        : darkMode
                                        ? "rgba(244, 67, 54, 0.3)"
                                        : "rgba(244, 67, 54, 0.3)",
                                      fontFamily: "monospace",
                                      color: result.passed
                                        ? darkMode
                                          ? "#4caf50"
                                          : "#2e7d32"
                                        : darkMode
                                        ? "#f44336"
                                        : "#c62828",
                                      fontSize: "0.8rem",
                                      whiteSpace: "pre-wrap",
                                      minHeight: "40px",
                                    }}
                                  >
                                    {result.error &&
                                    result.error
                                      .toLowerCase()
                                      .includes("compilation")
                                      ? result.error.startsWith(
                                          "Compilation Error:"
                                        )
                                        ? result.error
                                        : `🔴 COMPILATION ERROR\n${result.error}`
                                      : result.error &&
                                        result.error
                                          .toLowerCase()
                                          .includes("runtime")
                                      ? result.error.startsWith("Runtime Error")
                                        ? result.error
                                        : `❌ RUNTIME ERROR\n${result.error}`
                                      : result.error &&
                                        result.error
                                          .toLowerCase()
                                          .includes("time limit")
                                      ? `⏱️ TIME LIMIT EXCEEDED\nExecution Time: ${
                                          result.executionTime || "N/A"
                                        }ms\nTime Limit: 3000ms`
                                      : result.error &&
                                        result.error
                                          .toLowerCase()
                                          .includes("memory limit")
                                      ? `💾 MEMORY LIMIT EXCEEDED\nMemory Used: ${
                                          result.memoryUsed || "N/A"
                                        }KB\nMemory Limit: 256MB`
                                      : result.actualOutput || "No output"}
                                  </Box>
                                </Grid>
                              </Grid>

                              {index < testResults.length - 1 && (
                                <Divider
                                  sx={{
                                    mt: 2,
                                    bgcolor: darkMode
                                      ? "rgba(255,255,255,0.1)"
                                      : "rgba(0,0,0,0.1)",
                                  }}
                                />
                              )}
                            </Box>
                          ))}

                          {/* Performance Summary for run mode */}
                          <PerformanceStats
                            testResults={testResults}
                            darkMode={darkMode}
                          />
                        </Box>
                      ) : !isSubmission ? (
                        // Show individual test cases when no test results in run mode (before running)
                        <>
                          {question?.testCases &&
                          question.testCases.filter((tc) => !tc.hidden).length >
                            0 ? (
                            <Box sx={{ mt: 2 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  mb: 2,
                                  color: darkMode
                                    ? "rgba(255,255,255,0.85)"
                                    : "rgba(0,0,0,0.85)",
                                  fontWeight: "bold",
                                  fontSize: "0.9rem",
                                }}
                              >
                                Test Cases
                              </Typography>

                              {question.testCases
                                .filter((tc) => !tc.hidden)
                                .map((testCase, index) => (
                                  <Box key={index} sx={{ mb: 3 }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 1.5,
                                        p: 1,
                                        borderRadius: 1,
                                        bgcolor: darkMode
                                          ? "rgba(255,255,255,0.05)"
                                          : "rgba(0,0,0,0.02)",
                                      }}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        sx={{
                                          fontWeight: "bold",
                                          color: darkMode
                                            ? "rgba(255,255,255,0.85)"
                                            : "rgba(0,0,0,0.85)",
                                        }}
                                      >
                                        Test Case {index + 1}
                                      </Typography>
                                    </Box>

                                    <Grid container spacing={2}>
                                      <Grid item xs={6}>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: darkMode
                                              ? "rgba(255,255,255,0.6)"
                                              : "rgba(0,0,0,0.6)",
                                            fontWeight: "bold",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Input:
                                        </Typography>
                                        <Box
                                          sx={{
                                            p: 1.5,
                                            mt: 0.5,
                                            borderRadius: 1,
                                            bgcolor: darkMode
                                              ? "#0F0F0F"
                                              : "#FFFFFF",
                                            border: "1px solid",
                                            borderColor: darkMode
                                              ? "rgba(255,255,255,0.1)"
                                              : "rgba(0,0,0,0.1)",
                                            fontFamily: "monospace",
                                            color: darkMode
                                              ? "rgba(255,255,255,0.9)"
                                              : "rgba(0,0,0,0.9)",
                                            fontSize: "0.8rem",
                                            whiteSpace: "pre-wrap",
                                            minHeight: "40px",
                                          }}
                                        >
                                          {testCase.input || "No input"}
                                        </Box>
                                      </Grid>
                                      <Grid item xs={6}>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: darkMode
                                              ? "rgba(255,255,255,0.6)"
                                              : "rgba(0,0,0,0.6)",
                                            fontWeight: "bold",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Expected Output:
                                        </Typography>
                                        <Box
                                          sx={{
                                            p: 1.5,
                                            mt: 0.5,
                                            borderRadius: 1,
                                            bgcolor: darkMode
                                              ? "#0F0F0F"
                                              : "#FFFFFF",
                                            border: "1px solid",
                                            borderColor: darkMode
                                              ? "rgba(255,255,255,0.1)"
                                              : "rgba(0,0,0,0.1)",
                                            fontFamily: "monospace",
                                            color: darkMode
                                              ? "rgba(255,255,255,0.9)"
                                              : "rgba(0,0,0,0.9)",
                                            fontSize: "0.8rem",
                                            whiteSpace: "pre-wrap",
                                            minHeight: "40px",
                                          }}
                                        >
                                          {testCase.output ||
                                            "No expected output"}
                                        </Box>
                                      </Grid>
                                    </Grid>

                                    {index <
                                      question.testCases.filter(
                                        (tc) => !tc.hidden
                                      ).length -
                                        1 && (
                                      <Divider
                                        sx={{
                                          mt: 2,
                                          bgcolor: darkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)",
                                        }}
                                      />
                                    )}
                                  </Box>
                                ))}
                            </Box>
                          ) : (
                            // Fallback when no test cases available
                            <Box sx={{ mt: 2 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: darkMode
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.6)",
                                  textAlign: "center",
                                  fontStyle: "italic",
                                }}
                              >
                                No test cases available
                              </Typography>
                            </Box>
                          )}
                        </>
                      ) : null}
                    </>
                  )}
                </>
              )}
          </Box>
          )}

          {/* Tab 0 — Debug mode: RAW test case input, no parsing/formatting */}
          {activeInputTab === 0 && panelMode === "debug" && (
            <Box sx={{ p: 2 }}>
              {/* Raw combined input */}
              <Typography
                variant="caption"
                sx={{
                  color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  fontWeight: "bold",
                  fontSize: "0.8rem",
                }}
              >
                Input:
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  mt: 0.5,
                  mb: 2,
                  borderRadius: 1,
                  bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                  border: "1px solid",
                  borderColor: darkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                  fontFamily: "'Consolas', 'Source Code Pro', monospace",
                  color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  fontSize: "0.82rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {getRawStdin() ? (
                  <RawInputColored
                    text={getRawStdin()}
                    testCaseCount={
                      question?.testCases
                        ? question.testCases.filter((tc) => !tc.hidden).length
                        : 0
                    }
                    darkMode={darkMode}
                  />
                ) : (
                  "No input"
                )}
              </Box>

              {/* Raw expected vs actual output, side by side */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                    }}
                  >
                    Expected Output:
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      mt: 0.5,
                      borderRadius: 1,
                      bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                      border: "1px solid",
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                      fontFamily: "'Consolas', 'Source Code Pro', monospace",
                      fontSize: "0.82rem",
                      minHeight: "48px",
                    }}
                  >
                    {getExpectedOutput() ? (
                      <RawOutputDiff
                        text={getExpectedOutput()}
                        otherText={getActualOutput()}
                        hasRun={!!getActualOutput()}
                        darkMode={darkMode}
                      />
                    ) : (
                      <Box
                        sx={{
                          color: darkMode
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.9)",
                        }}
                      >
                        No expected output
                      </Box>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                    }}
                  >
                    Your Output:
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      mt: 0.5,
                      borderRadius: 1,
                      bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                      border: "1px solid",
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                      fontFamily: "'Consolas', 'Source Code Pro', monospace",
                      fontSize: "0.82rem",
                      minHeight: "48px",
                    }}
                  >
                    {getActualOutput() ? (
                      <RawOutputDiff
                        text={getActualOutput()}
                        otherText={getExpectedOutput()}
                        hasRun={true}
                        darkMode={darkMode}
                      />
                    ) : (
                      <Box
                        sx={{
                          color: darkMode
                            ? "rgba(255,255,255,0.4)"
                            : "rgba(0,0,0,0.4)",
                          fontStyle: "italic",
                        }}
                      >
                        Run your code to see the output
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 1: Custom Input */}
          {activeInputTab === 1 && (
            <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Custom Input Area */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      mb: 0.5,
                      display: "block",
                    }}
                  >
                    Input:
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode ? "#ffb74d" : "#ed6c02",
                      fontSize: "0.72rem",
                      mb: 0.75,
                      display: "block",
                      fontStyle: "italic",
                    }}
                  >
                    Note: Don't forget to add the T (number of test cases) value
                    as the first line of your input.
                  </Typography>
                  <TextField
                    multiline
                    minRows={3}
                    maxRows={8}
                    fullWidth
                    placeholder="Enter your custom input here..."
                    value={customInput}
                    onChange={(e) => onCustomInputChange && onCustomInputChange(e.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontFamily: "'Consolas', 'Source Code Pro', monospace",
                        fontSize: "0.85rem",
                        bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                        color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                        "& fieldset": {
                          borderColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                        },
                        "&:hover fieldset": {
                          borderColor: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: darkMode ? "rgba(255,255,255,0.3)" : "#1976d2",
                        },
                      },
                      "& .MuiInputBase-input::placeholder": {
                        color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>

                {/* Custom Output Area — shows raw stdout as-is */}
                {customOutput && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                        fontWeight: "bold",
                        fontSize: "0.8rem",
                        mb: 0.5,
                        display: "block",
                      }}
                    >
                      Output:
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: darkMode ? "#0F0F0F" : "#FFFFFF",
                        border: "1px solid",
                        borderColor: customOutput.error
                          ? "#f44336"
                          : darkMode
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                        fontFamily: "'Consolas', 'Source Code Pro', monospace",
                        fontSize: "0.85rem",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: customOutput.error
                          ? "#f44336"
                          : darkMode
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                        minHeight: "50px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        "&::-webkit-scrollbar": {
                          width: "6px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: darkMode
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.15)",
                          borderRadius: "4px",
                        },
                      }}
                    >
                      {customOutput.error
                        ? customOutput.error
                        : customOutput.output || "No output"}
                    </Box>

                    {/* Execution metadata */}
                    {!customOutput.error && (customOutput.time || customOutput.memory) && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          mt: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {customOutput.time && (
                          <Chip
                            size="small"
                            icon={<SpeedIcon sx={{ fontSize: "0.8rem !important" }} />}
                            label={`${customOutput.time}s`}
                            variant="outlined"
                            sx={{
                              fontSize: "0.7rem",
                              height: "24px",
                              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                              borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                            }}
                          />
                        )}
                        {customOutput.memory && (
                          <Chip
                            size="small"
                            icon={<DeveloperBoardIcon sx={{ fontSize: "0.8rem !important" }} />}
                            label={`${Math.round(customOutput.memory / 1024 * 100) / 100} MB`}
                            variant="outlined"
                            sx={{
                              fontSize: "0.7rem",
                              height: "24px",
                              color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                              borderColor: darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                            }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={customOutput.status || "Completed"}
                          variant="outlined"
                          color={customOutput.status === "Accepted" ? "success" : "default"}
                          sx={{
                            fontSize: "0.7rem",
                            height: "24px",
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Running indicator */}
                {running && activeInputTab === 1 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: 1,
                      color: darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: darkMode ? "#fff" : "#1976d2",
                        animation: "pulse 1.2s ease-in-out infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 0.4 },
                          "50%": { opacity: 1 },
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                      Running with custom input...
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default TestCasesPanel;
