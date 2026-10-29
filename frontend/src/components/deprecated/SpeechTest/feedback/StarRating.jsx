import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import useSurface from "../setup/useSurface";
import { RATING_LABELS } from "./feedbackMeta";

const GOLD = "#f5b942";
const STARS = [1, 2, 3, 4, 5];

/**
 * Five stars for the overall rating. Hovering previews a rating; choosing one
 * makes the stars up to it fill in a ripple and shows what the rating means.
 */
const StarRating = ({ value, onChange, disabled = false }) => {
  const { muted, isDark } = useSurface();
  const reduceMotion = useReducedMotion();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Box role="radiogroup" aria-label="Overall rating" sx={{ display: "flex", gap: 0.5 }} onMouseLeave={() => setHover(0)}>
        {STARS.map((star) => {
          const filled = star <= shown;
          return (
            <Box
              key={star}
              component={motion.button}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}, ${RATING_LABELS[star]}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(0)}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + star * 0.06, type: "spring", stiffness: 300, damping: 20 }}
              whileHover={reduceMotion ? undefined : { scale: 1.12 }}
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              sx={{
                p: 0.25,
                lineHeight: 0,
                bgcolor: "transparent",
                border: "none",
                cursor: "pointer",
                color: filled ? GOLD : isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)",
                transition: "color 0.15s",
                "&:focus-visible": { outline: `2px solid ${GOLD}`, outlineOffset: 2, borderRadius: "8px" },
                "&:disabled": { cursor: "default" },
              }}
            >
              {/* The chosen star gives a small pulse when it is picked. */}
              <motion.span
                style={{ display: "inline-flex" }}
                animate={reduceMotion ? undefined : { scale: value === star ? [1, 1.28, 1] : 1 }}
                transition={{ duration: 0.35 }}
              >
                <StarRoundedIcon sx={{ fontSize: 40 }} />
              </motion.span>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ minWidth: 80, height: 22, position: "relative" }}>
        <AnimatePresence mode="wait" initial={false}>
          {shown > 0 && (
            <Typography
              key={shown}
              component={motion.span}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              sx={{ position: "absolute", left: 0, color: muted, fontSize: "0.88rem", fontWeight: 600 }}
            >
              {RATING_LABELS[shown]}
            </Typography>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default StarRating;
