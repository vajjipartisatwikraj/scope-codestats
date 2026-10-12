import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import Reveal from "../../setup/Reveal";
import { STAGE } from "../motion/motionTokens";
import QuestionRow, { rowColumns } from "./QuestionRow";
import QuestionDetail from "./QuestionDetail";

/** The score columns, taken from the first question that has a breakdown. */
const columnsOf = (questions) => {
  const sample = questions.find((q) => q.analysis?.rings?.length);
  return sample ? sample.analysis.rings.map((ring) => ({ key: ring.key, label: ring.label })) : [];
};

/**
 * "Question level analysis": a header line, then one expandable row per
 * question. One row is open at a time; the first scored one starts open.
 */
const QuestionAnalysis = ({ questions }) => {
  const { muted } = useSurface();
  const columns = columnsOf(questions);

  const [openId, setOpenId] = useState(() => questions.find((q) => q.answered && q.analysis)?.questionId || null);

  return (
    <Box>
      <Reveal y={10} delay={STAGE.list}>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
          Question level analysis
        </Typography>
        <Typography sx={{ color: muted, fontSize: "0.85rem", mt: 0.25, mb: 2 }}>
          Open any question to see its transcription, pronunciation and fluency details.
        </Typography>
      </Reveal>

      <Reveal
        y={6}
        delay={STAGE.list + 0.08}
        sx={{
          display: "grid",
          gridTemplateColumns: rowColumns(columns.length),
          gap: 1.5,
          px: 2.5,
          pb: 1,
          color: muted,
          fontSize: "0.72rem",
          fontWeight: 700,
        }}
      >
        <span />
        <span>Q</span>
        <span>Question</span>
        {columns.map((column) => (
          <Box key={column.key} sx={{ display: { xs: "none", md: "block" }, textAlign: "center" }}>
            {column.label}
          </Box>
        ))}
        <Box sx={{ textAlign: "right" }}>Score</Box>
      </Reveal>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {questions.map((question, i) => {
          const expandable = Boolean(question.answered && question.analysis);
          const open = expandable && openId === question.questionId;
          return (
            // The rows appear one after another (the first ten; later ones together).
            <Reveal key={question.questionId} y={12} duration={0.45} delay={STAGE.list + 0.12 + Math.min(i, 10) * 0.05}>
              <QuestionRow
                question={question}
                columns={columns}
                open={open}
                expandable={expandable}
                onToggle={() => setOpenId(open ? null : question.questionId)}
              >
                {expandable && <QuestionDetail question={question} />}
              </QuestionRow>
            </Reveal>
          );
        })}
      </Box>
    </Box>
  );
};

export default QuestionAnalysis;
