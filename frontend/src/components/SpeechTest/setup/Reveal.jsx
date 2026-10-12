import React from "react";
import { Box } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Gentle entrance for a block: it fades in while rising a few pixels. Blocks
 * given increasing `delay` values appear one after another. With `leaving` set
 * it fades back out, used just before navigating away. With `still` set it
 * renders in place without any entrance, for blocks that a parent animation
 * (such as the step slide) already moves.
 *
 * Renders a motion.div through MUI's Box, so `sx` works as usual. Users who
 * prefer reduced motion get no movement, only a plain fade.
 */
const Reveal = ({ children, delay = 0, y = 14, duration = 0.45, leaving = false, still = false, sx, ...rest }) => {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : y;

  return (
    <Box
      component={motion.div}
      initial={still ? false : { opacity: 0, y: offset }}
      animate={leaving ? { opacity: 0, y: -offset / 2 } : { opacity: 1, y: 0 }}
      transition={leaving ? { duration: 0.22, ease: "easeIn" } : { duration, delay, ease: EASE }}
      sx={sx}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Reveal;
