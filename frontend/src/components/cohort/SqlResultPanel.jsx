import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SpeedIcon from "@mui/icons-material/Speed";
import ScoreIcon from "@mui/icons-material/Score";
import Button from "@mui/material/Button";
import RocketAnimation from "../RocketAnimation";

const MONO = '"Consolas", "Monaco", "Courier New", monospace';

/**
 * Header tints for a result table. Expected output always uses `info` because
 * it is a reference, never a verdict. The student's own output switches to
 * `success` or `error`, reusing the green/red pair from the programming
 * testcase panel so both question types read the same way.
 */
const HEADER_TONES = {
  info: {
    bgDark: "rgba(33,150,243,0.16)",
    bgLight: "rgba(33,150,243,0.10)",
    textDark: "#90caf9",
    textLight: "#1565c0",
  },
  success: {
    bgDark: "rgba(76,175,80,0.16)",
    bgLight: "rgba(76,175,80,0.10)",
    textDark: "#4caf50",
    textLight: "#2e7d32",
  },
  error: {
    bgDark: "rgba(244,67,54,0.16)",
    bgLight: "rgba(244,67,54,0.10)",
    textDark: "#f44336",
    textLight: "#c62828",
  },
};

/**
 * Renders a `{ columns, rows }` result set as a table, exactly as compared.
 *
 * Styling is deliberately flat: a translucent blue header, transparent body so
 * the panel surface shows through, and thin grey rules between rows and
 * columns. The same treatment works in both themes because every colour is an
 * alpha value over whatever sits behind it.
 */
export const SqlResultTable = ({
  result,
  darkMode,
  emptyLabel = "No rows",
  tone = "info", // "info" | "success" | "error" — colours the header only
}) => {
  const theme = useTheme();
  const isDark = darkMode ?? theme.palette.mode === "dark";
  const columns = result?.columns || [];
  const rows = result?.rows || [];

  // Grid rules and outer frame: light grey in both themes.
  const gridLine = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const headerTone = HEADER_TONES[tone] || HEADER_TONES.info;
  const headerBg = isDark ? headerTone.bgDark : headerTone.bgLight;
  const headerText = isDark ? headerTone.textDark : headerTone.textLight;

  if (columns.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <TableContainer
      sx={{
        maxHeight: 260,
        border: `1px solid ${gridLine}`,
        borderRadius: "5px",
        backgroundColor: "transparent",
        // The rounded frame draws the outer edge, so the cells never repeat it.
        "& td, & th": { borderBottom: `1px solid ${gridLine}` },
        "& tr:last-of-type td": { borderBottom: "none" },
        "& td:not(:last-of-type), & th:not(:last-of-type)": {
          borderRight: `1px solid ${gridLine}`,
        },
      }}
    >
      <Table size="small" stickyHeader sx={{ backgroundColor: "transparent" }}>
        <TableHead>
          <TableRow>
            {columns.map((column, i) => (
              <TableCell
                key={`${column}-${i}`}
                sx={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  py: 1,
                  color: headerText,
                  backgroundColor: headerBg,
                  // stickyHeader needs an opaque-looking layer; the translucent
                  // tint is composited over the panel via backdrop blur instead
                  // of a solid fill so the "no background" look is preserved.
                  backdropFilter: "blur(6px)",
                }}
              >
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ backgroundColor: "transparent" }}>
                <Typography variant="caption" color="text.secondary">
                  0 rows returned
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, r) => (
              <TableRow key={r} sx={{ backgroundColor: "transparent" }}>
                {columns.map((_, c) => (
                  <TableCell
                    key={c}
                    sx={{
                      fontFamily: MONO,
                      fontSize: "0.78rem",
                      whiteSpace: "nowrap",
                      py: 0.85,
                      backgroundColor: "transparent",
                      color: isDark ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.82)",
                    }}
                  >
                    {row?.[c] === null || row?.[c] === undefined ? (
                      <em style={{ opacity: 0.55 }}>NULL</em>
                    ) : (
                      String(row[c])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * Results panel for SQL questions.
 *
 * Run shows per-testcase tables for the visible testcases, including the
 * expected rows and the mismatch explanation. Submit is graded against the
 * hidden testcases too and therefore reports an aggregate only: the engine
 * never returns hidden rows, so there is nothing more to display.
 */
const SqlResultPanel = ({
  darkMode,
  running = false,
  mode = null, // "RUN" | "SUBMIT"
  result = null,
  context = null, // schema + visible testcases for the idle state
  // Layout controls, mirroring TestCasesPanel so the SQL panel behaves the
  // same way: a drag bar to resize and a fold button to collapse.
  testPanelResizerRef = null,
  startTestPanelResize = null,
  isResizingTestPanel = false,
  showResizer = true,
  collapsed = false,
  onToggleCollapse = null,
}) => {
  const theme = useTheme();
  const isDark = darkMode ?? theme.palette.mode === "dark";
  const border = theme.palette.divider;
  const codeSurface = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  // ── launch animation ────────────────────────────────────────────────
  // Mirrors the programming flow: the rocket launches while the query is being
  // graded, then flies away on success or tumbles on failure. Results are held
  // back until the animation finishes so the two never overlap.
  const [animationCompleted, setAnimationCompleted] = useState(false);

  useEffect(() => {
    if (running) setAnimationCompleted(false);
  }, [running]);

  const rocketState = running
    ? "submitting"
    : result
    ? result.status === "PASSED"
      ? "success"
      : "failure"
    : "idle";

  const showRocket =
    rocketState !== "idle" && (running || !animationCompleted);

  /**
   * Submit verdict summary, mirroring the programming panel's performance
   * summary. Hidden testcase rows are never returned by the engine, so this is
   * the only feedback a submission can show. There is no memory tile because
   * SQLJudge does not report memory usage.
   */
  const renderSubmitSummary = () => {
    const passed = Number(result?.passed) || 0;
    const total = Number(result?.total) || 0;
    const executionTime = Number(result?.executionTimeMs) || 0;
    // The server decides correctness; only fall back to the counts when the
    // verdict did not carry an explicit flag (a transport error, for example).
    const allPassed =
      typeof result?.isCorrect === "boolean"
        ? result.isCorrect
        : total > 0 && passed === total;

    const runtimeColor = isDark ? "#0088cc" : "#0077b6";
    const casesColor = allPassed
      ? isDark
        ? "#4caf50"
        : "#2e7d32"
      : isDark
      ? "#ff9800"
      : "#ed6c02";

    const tileSx = (rgb) => ({
      p: 1.5,
      borderRadius: 1,
      bgcolor: isDark ? `rgba(${rgb}, 0.1)` : `rgba(${rgb}, 0.05)`,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
    });

    const labelSx = {
      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
    };

    return (
      <Box sx={{ width: "100%" }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 2,
            color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          Performance Summary
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={tileSx("0, 136, 204")}>
              <SpeedIcon sx={{ color: runtimeColor }} />
              <Box>
                <Typography variant="caption" sx={labelSx}>
                  Runtime
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "medium", color: runtimeColor }}
                >
                  {executionTime} ms
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box sx={tileSx(allPassed ? "76, 175, 80" : "255, 152, 0")}>
              <ScoreIcon sx={{ color: casesColor }} />
              <Box>
                <Typography variant="caption" sx={labelSx}>
                  Test Cases
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "medium", color: casesColor }}
                >
                  {passed}/{total} passed
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Typography
          variant="body2"
          sx={{ mt: 2, fontWeight: 700, color: casesColor }}
        >
          {allPassed ? "Accepted" : "Wrong Answer"}
        </Typography>
      </Box>
    );
  };

  /** Panel body: launch animation, idle schema view, or the latest verdict. */
  const renderBody = () => {
  // The rocket covers both the in-flight phase and the hand-off to the verdict.
  if (showRocket) {
    return (
      <Box sx={{ p: 2 }}>
        <RocketAnimation
          submissionState={rocketState}
          darkMode={isDark}
          onAnimationComplete={() => setAnimationCompleted(true)}
        />
        {running && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 1 }}
          >
            {mode === "SUBMIT"
              ? "Grading against all testcases…"
              : "Running against the sample testcases…"}
          </Typography>
        )}
      </Box>
    );
  }

  // ── idle: show the table definitions the query can use ───────────────
  if (!result) {
    return (
      <Box sx={{ p: 2 }}>
        {context?.schemaSql ? (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Tables available to your query
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 2,
                borderColor: border,
                backgroundColor: codeSurface,
              }}
            >
              <Box
                component="pre"
                sx={{ m: 0, fontFamily: MONO, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}
              >
                {context.schemaSql}
              </Box>
            </Paper>
          </>
        ) : null}

        {!context?.schemaSql && (
          <Typography variant="body2" color="text.secondary">
            Write your query and press Run to test it against the sample data.
          </Typography>
        )}
      </Box>
    );
  }

  // ── result ───────────────────────────────────────────────────────────
  // Deliberately minimal, matching the programming panel: numbered testcases
  // with expected and actual output, plus the elapsed time. No verdict cards,
  // progress bars, counts or engine testcase ids.
  const isSubmit = (result.mode || mode) === "SUBMIT";
  const testcases = result.testcases || [];

  // The engine attaches `expected` only to a FAILING testcase, so a passing one
  // would otherwise render as empty. The published expected.json for every
  // visible testcase is already in the question context, so use that as the
  // source and fall back to whatever the verdict carried.
  const expectedById = new Map(
    (context?.testcases || []).map((tc) => [tc.id, tc.expected])
  );
  const expectedFor = (testcase) =>
    testcase.expected ?? expectedById.get(testcase.id) ?? null;

  return (
    <Box sx={{ p: 2 }}>
      {result.error && (
        <Alert severity={result.status === "TIMEOUT" ? "warning" : "error"} sx={{ mb: 2 }}>
          <Box component="pre" sx={{ m: 0, fontFamily: MONO, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
            {result.error}
          </Box>
        </Alert>
      )}

      {/* Submit is graded against visible + hidden testcases and the engine
          returns an aggregate only, so this mirrors the programming panel's
          performance summary instead of per-testcase tables. */}
      {isSubmit && renderSubmitSummary()}

      {!isSubmit &&
        testcases.map((testcase, index) => {
          // The engine stops at the first failure, so anything after it carries
          // no verdict. Only an explicit PASSED or FAILED tints the header;
          // untested cases stay neutral.
          const outputTone =
            testcase.status === "PASSED"
              ? "success"
              : testcase.status === "FAILED" || testcase.status === "ERROR"
              ? "error"
              : "info";

          return (
          <Box key={testcase.id || index} sx={{ mb: 3 }}>
            {/* Header container — label on the left, elapsed time on the right */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                mb: 1.5,
                p: 1,
                borderRadius: 1,
                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: "bold",
                  color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                }}
              >
                Test Case {index + 1}
              </Typography>
              {typeof testcase.executionTimeMs === "number" && (
                <Typography variant="caption" color="text.secondary">
                  {testcase.executionTimeMs} ms
                </Typography>
              )}
            </Box>

            {/* Expected first, actual stacked below it */}
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, display: "block", mb: 0.5 }}
            >
              Expected Output:
            </Typography>
            <SqlResultTable
              result={expectedFor(testcase)}
              darkMode={darkMode}
              tone="info"
              emptyLabel="Expected output is not available for this testcase"
            />

            <Typography
              variant="caption"
              sx={{ fontWeight: 700, display: "block", mt: 2, mb: 0.5 }}
            >
              Your Output:
            </Typography>
            <SqlResultTable
              result={testcase.actual}
              darkMode={darkMode}
              tone={outputTone}
              emptyLabel="No columns returned"
            />
          </Box>
          );
        })}
    </Box>
    );
  };

  return (
    <>
      {/* Drag bar between the editor and this panel */}
      {showResizer && startTestPanelResize && (
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

      <Box
        sx={{
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
          borderRadius: "12px",
          overflow: "hidden",
          bgcolor: isDark ? "#0A0A0A" : "#F5F7FA",
          flexGrow: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          transition: isResizingTestPanel ? "none" : "height 0.1s ease",
        }}
      >
        {/* Header — title, summary and the fold control */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 1.5,
            borderBottom: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            bgcolor: isDark ? "#0A0A0A" : "#FFFFFF",
            minHeight: "40px",
            maxHeight: "40px",
            flexShrink: 0,
            zIndex: 50,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
          >
            Test Cases
          </Typography>

          {onToggleCollapse && (
            <Button
              size="small"
              aria-label={collapsed ? "Unfold test cases" : "Fold test cases"}
              onClick={onToggleCollapse}
              sx={{
                minWidth: "auto",
                p: 0.5,
                color: isDark ? "#aaa" : "#555",
                "&:hover": {
                  bgcolor: "transparent",
                  color: isDark ? "#fff" : "#000",
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

        {/* Body — hidden while folded, scrollable otherwise */}
        <Box
          sx={{
            display: collapsed ? "none" : "block",
            flexGrow: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          {renderBody()}
        </Box>
      </Box>
    </>
  );
};

export default SqlResultPanel;
