import React from "react";
import { Box } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

const GREEN = "#4caf50";
const BLUE = "#0585E0";

/**
 * A green circle with a tick. The circle pops in and the tick is drawn, so the
 * moment of finishing feels acknowledged without being loud.
 */
const AnimatedCheck = ({ size = 44, delay = 0, onBlue = false }) => {
  const reduceMotion = useReducedMotion();
  // On the blue panel a green circle would clash: it becomes a white disc with a blue tick.
  const tick = onBlue ? BLUE : GREEN;

  return (
    <Box
      component={motion.div}
      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay }}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: onBlue ? "#ffffff" : "rgba(76, 175, 80, 0.16)",
        border: onBlue ? "none" : "1px solid rgba(76, 175, 80, 0.3)",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke={tick}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2, ease: "easeOut" }}
        />
      </svg>
    </Box>
  );
};

export default AnimatedCheck;
