import React from "react";
import { Box, Button, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import WordChip from "./WordChip";
import PromptText from "./PromptText";

const SAVE_LABEL = { saved: "Answer saved", error: "Not saved yet. Retrying…" };

/**
 * Scrambled-word exercise. In `interactive` mode the student taps words into an
 * answer line (saved as text); otherwise the words are only shown and the
 * student says the sentence aloud into the recorder.
 */
const JumbledBuilder = ({ words, arrangement, interactive, disabled, status, onArrange }) => {
  const { accent, divider } = useSurface();
  const placed = new Set(arrangement);

  return (
    <Box>
      <PromptText>
        {interactive
          ? "Tap the words in the correct order to build the sentence."
          : "Put these words in the correct order, then say the full sentence aloud."}
      </PromptText>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2.5 }} aria-label="Scrambled words">
        {words.map((word, i) => (
          <WordChip
            key={`${word}-${i}`}
            word={word}
            disabled={!interactive || placed.has(i) || disabled}
            onClick={() => onArrange([...arrangement, i])}
          />
        ))}
      </Box>

      {interactive && (
        <Box sx={{ mt: 2.5 }}>
          <Box
            aria-label="Your sentence"
            sx={{
              minHeight: 62,
              p: 1.5,
              borderRadius: "12px",
              border: `1.5px dashed ${arrangement.length ? accent : divider}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
            }}
          >
            {arrangement.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Your sentence will appear here
              </Typography>
            ) : (
              arrangement.map((wordIndex, position) => (
                <WordChip
                  key={`${wordIndex}-${position}`}
                  word={words[wordIndex]}
                  filled
                  disabled={disabled}
                  title="Tap to remove"
                  onClick={() => onArrange(arrangement.filter((_, p) => p !== position))}
                />
              ))
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, mt: 1, alignItems: "center", minHeight: 32 }}>
            <Button
              size="small"
              onClick={() => onArrange([])}
              disabled={arrangement.length === 0 || disabled}
              sx={{ textTransform: "none" }}
            >
              Clear
            </Button>
            {arrangement.length > 0 && status && (
              <Typography
                variant="caption"
                sx={{ color: status === "saved" ? "success.main" : "text.secondary", fontWeight: 600 }}
              >
                {SAVE_LABEL[status] || "Saving…"}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default JumbledBuilder;
