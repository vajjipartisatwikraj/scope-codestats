import React from "react";
import { Box, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import useSurface from "../../../setup/useSurface";
import { TONE_COLORS } from "../../resultsTheme";

/** A small coloured tag. */
const Tag = ({ tone, children }) => {
  const color = TONE_COLORS[tone];
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.2,
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        color,
        bgcolor: `${color}1f`,
        border: `1px solid ${color}55`,
      }}
    >
      {children}
    </Box>
  );
};

/** A labelled line: the student's answer, or the expected one. */
const AnswerLine = ({ label, value, tag }) => {
  const { border, muted } = useSurface();
  return (
    <Box sx={{ p: 1.5, borderRadius: "10px", border: `1px solid ${border}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Typography sx={{ color: muted, fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em" }}>
          {label}
        </Typography>
        {tag}
      </Box>
      <Typography sx={{ fontSize: "0.92rem", fontWeight: 600, wordBreak: "break-word" }}>
        {value || <Box component="span" sx={{ color: muted, fontWeight: 500 }}>Nothing entered</Box>}
      </Typography>
    </Box>
  );
};

const FillBlank = ({ answer }) => {
  const { muted } = useSurface();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, maxWidth: 560 }}>
      <Typography sx={{ color: muted, fontSize: "0.85rem" }}>{answer.prompt}</Typography>
      <AnswerLine
        label="YOUR ANSWER"
        value={answer.submitted}
        tag={<Tag tone={answer.correct ? "good" : "warn"}>{answer.correct ? "Correct" : "Incorrect"}</Tag>}
      />
      {!answer.correct && <AnswerLine label="EXPECTED ANSWER" value={answer.expected} />}
      {answer.accepted.length > 0 && (
        <Typography sx={{ color: muted, fontSize: "0.78rem" }}>Also accepted: {answer.accepted.join(", ")}</Typography>
      )}
    </Box>
  );
};

const Mcq = ({ answer }) => {
  const { border, muted } = useSurface();
  return (
    <Box sx={{ maxWidth: 620 }}>
      <Typography sx={{ color: muted, fontSize: "0.85rem", mb: 1.5 }}>{answer.prompt}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {answer.options.map((option, i) => {
          const right = option.isCorrect;
          const wrongPick = option.selected && !right;
          const color = right ? TONE_COLORS.good : wrongPick ? TONE_COLORS.warn : null;
          return (
            <Box
              key={option.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.25,
                borderRadius: "10px",
                border: `1px solid ${color ? `${color}88` : border}`,
                bgcolor: color ? `${color}14` : "transparent",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: color || muted,
                  border: `1.5px solid ${color || border}`,
                }}
              >
                {right ? (
                  <CheckRoundedIcon sx={{ fontSize: 16 }} />
                ) : wrongPick ? (
                  <CloseRoundedIcon sx={{ fontSize: 16 }} />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </Box>
              <Typography sx={{ flex: 1, fontSize: "0.9rem", fontWeight: option.selected || right ? 600 : 500 }}>
                {option.text}
              </Typography>
              {option.selected && <Tag tone={right ? "good" : "warn"}>Your choice</Tag>}
              {right && !option.selected && <Tag tone="good">Correct answer</Tag>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const Email = ({ answer }) => {
  const { border, muted } = useSurface();
  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography sx={{ color: muted, fontSize: "0.85rem", mb: 1.25 }}>{answer.prompt}</Typography>
      <Box
        sx={{
          p: 1.75,
          borderRadius: "10px",
          border: `1px solid ${border}`,
          fontSize: "0.9rem",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        {answer.text || <Box component="span" sx={{ color: muted }}>No email was written.</Box>}
      </Box>
      <Typography sx={{ color: muted, fontSize: "0.74rem", fontWeight: 600, mt: 0.75 }}>{answer.words} words</Typography>
    </Box>
  );
};

/** What the student wrote or chose, set against the answer where one exists. */
const AnswerTab = ({ answer }) => {
  if (answer.kind === "fill_blank") return <FillBlank answer={answer} />;
  if (answer.kind === "mcq") return <Mcq answer={answer} />;
  return <Email answer={answer} />;
};

export default AnswerTab;
