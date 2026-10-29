import React, { useState } from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";
import Reveal from "../../setup/Reveal";
import QuestionHeader from "./QuestionHeader";
import QuestionTabs from "./QuestionTabs";
import OverviewTab from "./tabs/OverviewTab";
import TranscriptionTab from "./tabs/TranscriptionTab";
import PronunciationTab from "./tabs/PronunciationTab";
import FluencyTab from "./tabs/FluencyTab";
import LanguageTab from "./tabs/LanguageTab";
import AnswerTab from "./tabs/AnswerTab";

const LABELS = {
  overview: "Overview",
  transcription: "Transcription",
  pronunciation: "Pronunciation",
  language: "Language",
  fluency: "Fluency",
};

// Typed and chosen answers get a tab named after what the student produced.
const ANSWER_LABELS = { fill_blank: "Your answer", mcq: "Options", email: "Your email" };

/** Everything under an open question: its score line and the tabbed breakdown. */
const QuestionDetail = ({ question }) => {
  const { divider } = useSurface();
  const { analysis } = question;
  const [tab, setTab] = useState("overview");

  const tabs = analysis.tabs.map((key) => ({
    key,
    label:
      key === "answer"
        ? ANSWER_LABELS[analysis.answer?.kind] || "Answer"
        : // An open answer has no target sentence, so its first text view is the transcript.
        key === "transcription" && !analysis.transcription?.rows
        ? "Transcript"
        : LABELS[key],
  }));

  return (
    <Box sx={{ px: 2.5, pb: 2.5 }}>
      <Box sx={{ py: 1.75, borderTop: `1px solid ${divider}` }}>
        <QuestionHeader question={question} />
      </Box>

      <QuestionTabs tabs={tabs} value={tab} onChange={setTab} />

      {/* Keyed by tab, so each tab fades in fresh when chosen. */}
      <Reveal key={tab} y={8} duration={0.3} sx={{ pt: 2.25 }}>
        {tab === "overview" && <OverviewTab analysis={analysis} />}
        {tab === "transcription" && analysis.transcription && <TranscriptionTab transcription={analysis.transcription} />}
        {tab === "pronunciation" && analysis.pronunciation && <PronunciationTab pronunciation={analysis.pronunciation} />}
        {tab === "answer" && analysis.answer && <AnswerTab answer={analysis.answer} />}
        {tab === "language" && analysis.language && <LanguageTab language={analysis.language} />}
        {tab === "fluency" && analysis.fluency && <FluencyTab fluency={analysis.fluency} />}
      </Reveal>
    </Box>
  );
};

export default QuestionDetail;
