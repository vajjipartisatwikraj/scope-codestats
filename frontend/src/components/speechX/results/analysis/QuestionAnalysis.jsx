import React, { useState } from "react";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { EmptyState } from "../../../ui";
import { Reveal } from "../../shared";
import { STAGE } from "../resultsMeta";
import QuestionRow from "./QuestionRow";
import QuestionDetail from "./QuestionDetail";

/** The score columns, taken from the first question that has a breakdown. */
const columnsOf = (questions) => {
  const sample = questions.find((question) => question.analysis?.rings?.length);
  return sample ? sample.analysis.rings.map((ring) => ({ key: ring.key, label: ring.label })) : [];
};

/**
 * "Question level analysis": a heading, then one expandable row per question. One row is open
 * at a time; the first scored one starts open. A section with no questions gets an empty state.
 */
const QuestionAnalysis = ({ questions }) => {
  const columns = columnsOf(questions);
  const [openId, setOpenId] = useState(() => questions.find((question) => question.answered && question.analysis)?.questionId || null);

  return (
    <section className="sxe-analysis" aria-labelledby="sxe-analysis-title">
      <Reveal y={10} delay={STAGE.list} className="sxe-analysis__head">
        <h2 className="sxe-analysis__title" id="sxe-analysis-title">
          Question level analysis
        </h2>
        <p className="sxe-analysis__hint">Open any question to see its transcription, pronunciation and fluency details.</p>
      </Reveal>

      {questions.length === 0 ? (
        <EmptyState
          icon={<ListChecksIcon size={28} weight="regular" />}
          title="No questions to analyse"
          text="This section has no questions, so there is nothing to break down."
        />
      ) : (
        <ul className="sxe-qlist">
          {questions.map((question, index) => {
            const expandable = Boolean(question.answered && question.analysis);
            const open = expandable && openId === question.questionId;
            return (
              // The rows appear one after another (the first ten; later ones together).
              <Reveal as="li" key={question.questionId} y={12} duration={0.28} delay={STAGE.list + 0.08 + Math.min(index, 10) * 0.04}>
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
        </ul>
      )}
    </section>
  );
};

export default QuestionAnalysis;
