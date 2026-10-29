import React from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";
import useEntered from "../motion/useEntered";

const SWEEP_MS = 1000;

/**
 * A ring split into coloured arcs, with anything passed as children in the
 * middle. `segments` is [{ value, color }]; zero-sized ones are skipped.
 * On appearing, the arcs are drawn one after another around the ring.
 */
const Donut = ({ segments, size = 148, thickness = 14, delayMs = 0, children }) => {
  const { border } = useSurface();
  const entered = useEntered(delayMs);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const gap = visible.length > 1 ? 3 : 0;

  let offset = 0;
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={border} strokeWidth={thickness} />
        {total > 0 &&
          visible.map((segment) => {
            const share = segment.value / total;
            const length = share * circumference;
            const dash = Math.max(0, length - gap);
            const startsAt = offset / circumference;
            offset += length;

            return (
              <circle
                key={segment.color}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDashoffset={-(startsAt * circumference)}
                // Each arc grows from nothing, starting where the previous one ended.
                strokeDasharray={`${entered ? dash : 0} ${circumference - (entered ? dash : 0)}`}
                style={{
                  transition: `stroke-dasharray ${Math.round(share * SWEEP_MS)}ms linear ${Math.round(
                    startsAt * SWEEP_MS
                  )}ms`,
                }}
              />
            );
          })}
      </svg>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Donut;
