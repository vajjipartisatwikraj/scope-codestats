import React, { useCallback, useMemo, useState } from 'react';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
import { Button, Card, EmptyState, Notice, SkeletonRows, pluralize } from '../../../../ui';
import { EMPTY_FILTERS, describeFilters, filterQuestions, hasFilters } from '../model/questions';
import DifficultyStats from './DifficultyStats';
import ModuleHeader from './ModuleHeader';
import QuestionFilters from './QuestionFilters';
import QuestionRow from './QuestionRow';
import './questions.css';

/** "search "graph" and solved" */
function joinWords(parts) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The right column for the open module: its header, the solved-by-difficulty bars, the filters and
 * the list of questions. The first three are fixed at the top of the card and only the list scrolls
 * (from 900px; on a phone the page scrolls as a whole). Every state of the list has its own treatment: loading (row-shaped
 * skeletons), a failed load (a Retry notice), a module without questions, and filters that remove
 * everything (named, with "Clear filters").
 *
 * The filters belong to the open module, so choosing another module starts them afresh: the parent
 * gives this panel a `key` of the module's id.
 *
 *   module       the open module
 *   questions    { questions, loading, error, reload } from useModuleQuestions
 *   byQuestion   the student's progress by question
 *   sameTab      questions open in this tab (an exam session)
 *   onOpenQuestion, onNotes, onBack   see QuestionRow and ModuleHeader
 */
export default function QuestionsPanel({ module, questions: state, byQuestion, sameTab, onOpenQuestion, onNotes, onBack }) {
  const { questions, loading, error, reload } = state;
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const setFilter = useCallback((key, value) => setFilters((current) => ({ ...current, [key]: value })), []);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const visible = useMemo(() => filterQuestions(questions, filters, byQuestion), [questions, filters, byQuestion]);

  let list;
  if (loading) {
    list = <SkeletonRows count={5} height={92} />;
  } else if (error) {
    list = (
      <Notice
        tone="danger"
        title="Questions did not load"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (questions.length === 0) {
    list = <EmptyState compact icon={<QuestionIcon size={28} weight="regular" />} title="No questions yet" text="Your teacher has not added questions to this module. Check back soon." />;
  } else if (visible.length === 0) {
    list = (
      <EmptyState
        compact
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No questions match"
        text={`Nothing fits ${joinWords(describeFilters(filters))}. Try a different search or clear the filters.`}
        action={
          <Button variant="primary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    list = (
      <ul className="cdqi-list" aria-label={`Questions in ${module.title}`}>
        {visible.map((question) => (
          <QuestionRow key={question._id} question={question} byQuestion={byQuestion} sameTab={sameTab} onOpen={onOpenQuestion} />
        ))}
      </ul>
    );
  }

  return (
    <Card as="section" flush className="cdq" aria-labelledby="cdq-title">
      {/* The top stays in place: the module, its bars and the filters. Only the list below scrolls. */}
      <div className="cdq-top">
        <ModuleHeader module={module} onNotes={onNotes} onBack={onBack} />

        {!loading && !error && questions.length > 0 ? (
          <>
            <DifficultyStats questions={questions} byQuestion={byQuestion} />
            <QuestionFilters filters={filters} onChange={setFilter} onClear={clearFilters} />
            <p className="ui-sr" role="status">
              {hasFilters(filters) ? `Showing ${pluralize(visible.length, 'question')} of ${questions.length}` : `Showing ${pluralize(visible.length, 'question')}`}
            </p>
          </>
        ) : null}
      </div>

      <div className="cdq-body">{list}</div>
    </Card>
  );
}
