import React, { useState } from "react";
import { Reveal } from "../../shared";
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
  const { analysis } = question;
  const [tab, setTab] = useState("overview");
  const idPrefix = `sxe-q${question.number}`;

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
    <div className="sxe-detail">
      <QuestionHeader question={question} />
      <QuestionTabs tabs={tabs} value={tab} onChange={setTab} idPrefix={idPrefix} label={`Analysis of question ${question.number}`} />
      {/* Keyed by tab, so each tab fades in fresh when chosen. */}
      <Reveal
        key={tab}
        y={8}
        duration={0.28}
        className="sxe-detail__panel"
        role="tabpanel"
        id={`${idPrefix}-panel-${tab}`}
        aria-labelledby={`${idPrefix}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && <OverviewTab analysis={analysis} />}
        {tab === "transcription" && analysis.transcription && <TranscriptionTab transcription={analysis.transcription} />}
        {tab === "pronunciation" && analysis.pronunciation && <PronunciationTab pronunciation={analysis.pronunciation} />}
        {tab === "answer" && analysis.answer && <AnswerTab answer={analysis.answer} />}
        {tab === "language" && analysis.language && <LanguageTab language={analysis.language} />}
        {tab === "fluency" && analysis.fluency && <FluencyTab fluency={analysis.fluency} />}
      </Reveal>
    </div>
  );
};

export default QuestionDetail;
