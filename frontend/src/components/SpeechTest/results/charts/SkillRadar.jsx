import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import ResultCard from "../ResultCard";
import SkillBars from "./SkillBars";
import useEntered from "../motion/useEntered";
import { CSS_EASE } from "../motion/motionTokens";

const SIZE = { width: 280, height: 236, cx: 140, cy: 114, radius: 78 };
const LEVELS = [0.25, 0.5, 0.75, 1];

const pointAt = (index, count, fraction) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return [SIZE.cx + Math.cos(angle) * SIZE.radius * fraction, SIZE.cy + Math.sin(angle) * SIZE.radius * fraction];
};

const toPath = (points) => `${points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;

/** Starts a shape small at the centre and lets it grow to full size. */
const growFromCentre = (entered, delayMs) => ({
  transformOrigin: `${SIZE.cx}px ${SIZE.cy}px`,
  transform: entered ? "scale(1)" : "scale(0.1)",
  opacity: entered ? 1 : 0,
  transition: `transform 0.95s ${CSS_EASE} ${delayMs}ms, opacity 0.5s ease ${delayMs}ms`,
});

/** Legend entry: a short line sample and its name. */
const LegendItem = ({ color, dashed, children }) => {
  const { muted } = useSurface();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
      <Box
        aria-hidden
        sx={{ width: 16, height: 0, borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      <Typography sx={{ color: muted, fontSize: "0.75rem", fontWeight: 600 }}>{children}</Typography>
    </Box>
  );
};

/**
 * The student's skills against the batch average. `skills` is
 * { axes: [{ key, label }], you: {key: 0..100}, batch: {key: 0..100} | null }.
 * The web fades in, then the shapes grow out from the centre.
 */
const SkillRadar = ({ skills, delayMs = 0 }) => {
  const { border, accent, muted } = useSurface();
  const entered = useEntered(delayMs);

  const axes = skills.axes.filter((axis) => typeof skills.you[axis.key] === "number");
  const batch = skills.batch;

  return (
    <ResultCard title="Skill profile" caption={batch ? "You vs batch" : "Your skills"}>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
        {axes.length < 3 ? (
          axes.length > 0 ? (
            <SkillBars axes={axes} you={skills.you} delayMs={delayMs} />
          ) : (
            <Typography sx={{ color: muted, fontSize: "0.85rem" }}>No skill data for this section.</Typography>
          )
        ) : (
          <svg viewBox={`0 0 ${SIZE.width} ${SIZE.height}`} width="100%" style={{ maxWidth: 300 }} role="img" aria-label="Skill profile">
            <g style={{ opacity: entered ? 1 : 0, transition: "opacity 0.6s ease" }}>
              {LEVELS.map((level) => (
                <path
                  key={level}
                  d={toPath(axes.map((_, i) => pointAt(i, axes.length, level)))}
                  fill="none"
                  stroke={border}
                  strokeWidth="1"
                />
              ))}
              {axes.map((axis, i) => {
                const [x, y] = pointAt(i, axes.length, 1);
                const [lx, ly] = pointAt(i, axes.length, 1.2);
                return (
                  <g key={axis.key}>
                    <line x1={SIZE.cx} y1={SIZE.cy} x2={x} y2={y} stroke={border} strokeWidth="1" />
                    <text
                      x={lx}
                      y={ly}
                      fill={muted}
                      fontSize="9.5"
                      fontWeight="600"
                      textAnchor={Math.abs(lx - SIZE.cx) < 6 ? "middle" : lx > SIZE.cx ? "start" : "end"}
                      dominantBaseline="middle"
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}
            </g>

            {batch && (
              <path
                d={toPath(axes.map((axis, i) => pointAt(i, axes.length, (batch[axis.key] ?? 0) / 100)))}
                fill="none"
                stroke={muted}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                style={growFromCentre(entered, 250)}
              />
            )}
            <path
              d={toPath(axes.map((axis, i) => pointAt(i, axes.length, skills.you[axis.key] / 100)))}
              fill={accent}
              fillOpacity="0.2"
              stroke={accent}
              strokeWidth="2"
              style={growFromCentre(entered, 100)}
            />
          </svg>
        )}

        {axes.length >= 3 && (
          <Box sx={{ display: "flex", gap: 2.5, opacity: entered ? 1 : 0, transition: "opacity 0.6s ease 0.5s" }}>
            <LegendItem color={accent}>You</LegendItem>
            {batch && (
              <LegendItem color={muted} dashed>
                Batch average
              </LegendItem>
            )}
          </Box>
        )}
      </Box>
    </ResultCard>
  );
};

export default SkillRadar;
