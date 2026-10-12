import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

const SLIDE = 56;
const EASE = [0.22, 1, 0.36, 1];

/** Users who prefer reduced motion get a plain fade instead of a slide. */
const distance = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : SLIDE;

/**
 * `custom` is the direction: 1 moves forward (the old step leaves to the left,
 * the new one arrives from the right) and -1 moves back.
 */
const variants = {
  enter: (direction) => ({ opacity: 0, x: direction * distance() }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: -direction * distance() }),
};

/**
 * Slides one setup step in and the previous one out. Wrap each step in this,
 * keyed by the step name, inside an AnimatePresence that is given the same
 * `direction` as its `custom` prop (so a leaving step uses the latest one).
 */
const StepTransition = ({ direction, children }) => (
  <Box
    component={motion.div}
    custom={direction}
    variants={variants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.3, ease: EASE }}
    sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", width: "100%" }}
  >
    {children}
  </Box>
);

export default StepTransition;
