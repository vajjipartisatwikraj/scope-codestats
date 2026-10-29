import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import Reveal from "../setup/Reveal";
import SetupButton from "../setup/SetupButton";
import StarRating from "./StarRating";
import ScaleRow from "./ScaleRow";
import { COMMENT_LIMIT, CRITERIA } from "./feedbackMeta";

/** The right side of the feedback card: stars, four 1-5 questions, a comment, and the two buttons. */
const FeedbackForm = ({ form }) => {
  const { border, accent, muted, isDark } = useSurface();

  return (
    <Box sx={{ p: { xs: 3, md: 3.5 }, display: "flex", flexDirection: "column", gap: 2.25 }}>
      <Reveal y={8} delay={0.1}>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.3rem", lineHeight: 1.2 }}>
          How was your test?
        </Typography>
        <Typography sx={{ color: muted, fontSize: "0.88rem", mt: 0.5 }}>
          Your feedback helps us improve the experience.
        </Typography>
      </Reveal>

      <StarRating value={form.rating} onChange={form.setRating} disabled={form.busy} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {CRITERIA.map((criterion, i) => (
          <Reveal key={criterion.key} y={8} duration={0.4} delay={0.35 + i * 0.07}>
            <ScaleRow
              label={criterion.label}
              value={form.ratings[criterion.key] || 0}
              onChange={(value) => form.setCriterion(criterion.key, value)}
              disabled={form.busy}
            />
          </Reveal>
        ))}
      </Box>

      <Reveal y={8} delay={0.7}>
        <Box
          component="textarea"
          value={form.comment}
          onChange={(event) => form.setComment(event.target.value)}
          disabled={form.busy}
          rows={4}
          maxLength={COMMENT_LIMIT}
          placeholder="Please give your valuable suggestions to improve ourselves."
          aria-label="Suggestions"
          sx={{
            width: "100%",
            boxSizing: "border-box",
            resize: "none",
            font: "inherit",
            fontSize: "0.85rem",
            color: "text.primary",
            p: 1.5,
            borderRadius: "10px",
            bgcolor: "transparent",
            border: `1px solid ${border}`,
            transition: "border-color 0.15s, box-shadow 0.15s",
            "&::placeholder": { color: muted, opacity: 0.8 },
            "&:hover": { borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" },
            "&:focus": { outline: "none", borderColor: accent, boxShadow: `0 0 0 3px ${accent}26` },
          }}
        />
        {form.comment.length > COMMENT_LIMIT - 150 && (
          <Typography sx={{ color: muted, fontSize: "0.72rem", textAlign: "right", mt: 0.5 }}>
            {form.comment.length} / {COMMENT_LIMIT}
          </Typography>
        )}
      </Reveal>

      <Reveal y={8} delay={0.78} sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
        <SetupButton variant="secondary" onClick={form.skip} disabled={form.busy} sx={{ fontWeight: 700 }}>
          Skip
        </SetupButton>
        <SetupButton
          onClick={form.submit}
          loading={form.busy}
          disabled={!form.canSubmit}
          sx={{ fontWeight: 700, px: 3 }}
        >
          Submit feedback
        </SetupButton>
      </Reveal>
    </Box>
  );
};

export default FeedbackForm;
