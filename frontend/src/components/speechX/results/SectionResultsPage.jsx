import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ResultsNavbar from "./ResultsNavbar";
import ResultsRibbon from "./details/ResultsRibbon";
import ResultsState from "./ResultsState";
import ScoreSummary from "./charts/ScoreSummary";
import Donut from "./charts/Donut";
import SkillRadar from "./charts/SkillRadar";
import QuestionBars from "./charts/QuestionBars";
import QuestionAnalysis from "./analysis/QuestionAnalysis";
import useSectionResults from "./useSectionResults";
import useCollapseOnScroll from "./useCollapseOnScroll";
import "./results.css";

/**
 * Detailed results of one scored section (route
 * /speech-tests/:id/sections/:sectionId/results), opened from "View scores" on the section list.
 *
 * Layout (Read mode): the shared top bar, a flat details band with the way back, then the area
 * with the score tile (the one spotlight), the score summary, the skill profile, the
 * question-wise scores and the question-by-question analysis. From 900px the top bar, the band and
 * the app footer stay in place and only the area between them scrolls, which folds the band to a
 * slim strip; under 900px the page scrolls as a whole. The first row holds the section score, the
 * skill profile and the score summary side by side. The app footer comes from the shell.
 *
 * Entrance: the band settles first, the cards follow one after another and their charts draw as
 * each card settles, then the question rows cascade in (see STAGE in resultsMeta.js).
 */
const SectionResultsPage = () => {
  const { id, sectionId } = useParams();
  const navigate = useNavigate();
  const { report, loading, error, notReady, reload } = useSectionResults(id, sectionId);

  // The band folds to a slim strip once the content below it is scrolled.
  const scrollRef = useRef(null);
  const ribbonCollapsed = useCollapseOnScroll(scrollRef, Boolean(report));


  const back = () => navigate(`/speech-tests/${id}`);

  if (loading || error || !report) {
    return <ResultsState loading={loading} notReady={notReady} error={error} onRetry={reload} onBack={back} />;
  }

  const { section, questions, skills } = report;

  return (
    <>
      <ResultsNavbar title={section.title} />
      <main className="sxe-stage">
        <ResultsRibbon report={report} collapsed={ribbonCollapsed} onBack={back} />

        <div className="sxe-scroll" ref={scrollRef}>
          <div className="sxe-content">
            {/* The section score, the skill profile and the score summary share one row */}
            <div className="sxe-overview">
              <ScoreSummary questions={questions} score={section.score} />
              <SkillRadar skills={skills} />
              <Donut questions={questions} />
            </div>

            <div className="sxe-slot">
              <QuestionBars questions={questions} average={section.score} />
            </div>

            <QuestionAnalysis questions={questions} />
          </div>
        </div>
      </main>
    </>
  );
};

export default SectionResultsPage;
