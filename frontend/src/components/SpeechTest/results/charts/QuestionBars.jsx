import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import ResultCard from "../ResultCard";
import useEntered from "../motion/useEntered";
import { CSS_EASE } from "../motion/motionTokens";
import { BAND_COLORS, bandOf } from "../resultsTheme";

const BAR = 20;
const GAP = 12;
const TOP = 22;
const BASE = 146;
const MAX_BAR = BASE - TOP;
const HEIGHT = 168;
const STAGGER_MS = 55;

/**
 * One bar per question, coloured by band, with a dashed line at the section
 * average. Bars rise from the baseline one after another, then their values
 * and the average line fade in.
 */
const QuestionBars = ({ questions, average, delayMs = 0 }) => {
  const { border, muted } = useSurface();
  const entered = useEntered(delayMs);

  const slot = BAR + GAP;
  const width = questions.length * slot + GAP;
  const averageY = typeof average === "number" ? BASE - (average / 100) * MAX_BAR : null;
  const barsDoneMs = 700 + questions.length * STAGGER_MS;

  return (
    <ResultCard title="Question-wise scores" caption="Out of 100">
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1 }}>
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" style={{ maxHeight: 190 }} role="img" aria-label="Score of each question">
          <line x1="0" x2={width} y1={BASE} y2={BASE} stroke={border} strokeWidth="1" />
          {averageY !== null && (
            <line
              x1="0"
              x2={width}
              y1={averageY}
              y2={averageY}
              stroke={muted}
              strokeWidth="1"
              strokeDasharray="4 3"
              style={{ opacity: entered ? 1 : 0, transition: `opacity 0.5s ease ${barsDoneMs - 200}ms` }}
            />
          )}

          {questions.map((q, i) => {
            const x = GAP + i * slot;
            const band = bandOf(q);
            const height = q.answered ? Math.max(2, (q.score / 100) * MAX_BAR) : 0;
            const stagger = i * STAGGER_MS;
            return (
              <g key={q.questionId}>
                {q.answered ? (
                  <>
                    <rect
                      x={x}
                      y={BASE - height}
                      width={BAR}
                      height={height}
                      rx="3"
                      fill={BAND_COLORS[band]}
                      style={{
                        transformOrigin: `${x + BAR / 2}px ${BASE}px`,
                        transform: entered ? "scaleY(1)" : "scaleY(0)",
                        transition: `transform 0.8s ${CSS_EASE} ${stagger}ms`,
                      }}
                    />
                    <text
                      x={x + BAR / 2}
                      y={BASE - height - 5}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={muted}
                      style={{ opacity: entered ? 1 : 0, transition: `opacity 0.4s ease ${stagger + 450}ms` }}
                    >
                      {Math.round(q.score)}
                    </text>
                  </>
                ) : (
                  <text
                    x={x + BAR / 2}
                    y={BASE - 5}
                    textAnchor="middle"
                    fontSize="11"
                    fill={muted}
                    style={{ opacity: entered ? 1 : 0, transition: `opacity 0.4s ease ${stagger}ms` }}
                  >
                    -
                  </text>
                )}
                <text x={x + BAR / 2} y={BASE + 15} textAnchor="middle" fontSize="9" fontWeight="600" fill={muted}>
                  Q{q.number}
                </text>
              </g>
            );
          })}
        </svg>
        {averageY !== null && (
          <Typography
            sx={{
              color: muted,
              fontSize: "0.72rem",
              fontWeight: 600,
              opacity: entered ? 1 : 0,
              transition: `opacity 0.5s ease ${barsDoneMs}ms`,
            }}
          >
            Dashed line is your section average, {average}
          </Typography>
        )}
      </Box>
    </ResultCard>
  );
};

export default QuestionBars;
