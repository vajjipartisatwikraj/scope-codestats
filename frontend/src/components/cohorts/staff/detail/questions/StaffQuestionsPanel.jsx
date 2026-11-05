import React, { useMemo, useState } from 'react';
import { BugIcon } from '@phosphor-icons/react/dist/csr/Bug';
import { CloudArrowDownIcon } from '@phosphor-icons/react/dist/csr/CloudArrowDown';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/csr/UploadSimple';
import { Button, Card, EmptyState, Notice, SearchField, SelectField, SkeletonRows, Toolbar, pluralize } from '../../../../ui';
import ModuleHeader from '../../../student/detail/questions/ModuleHeader';
import { DIFFICULTIES } from '../../../student/detail/model/questions';
import '../../../student/detail/questions/questions.css';
import { filterStaffQuestions } from '../model/staffContent';
import StaffQuestionRow from './StaffQuestionRow';
import './staffQuestions.css';

const NO_FILTER = { search: '', difficulty: 'all' };

/**
 * The right column of the staff page for the open module, in the student panel's frame: the module's
 * header (its name, description, Video and Notes) with the staff buttons beside them, a search and a
 * difficulty filter, and the questions as rows. The top stays in place and only the rows scroll.
 *
 * Staff buttons: Issues (reports on the questions), Import (topics and questions from the bank
 * library) and Export for everyone; Upload JSON and Add question for admins (teachers manage content
 * elsewhere).
 *
 *   cohortId, module, questions   the open module and { questions, loading, error, reload } from useModuleQuestions
 *   isAdmin    the viewer is an admin (not a teacher)
 *   onNotes, onBack               as ModuleHeader
 *   onAdd(), onUpload(), onImport(), onExport(), onIssues()
 *   onEdit(question), onDelete(question)
 */
export default function StaffQuestionsPanel({ cohortId, module, questions: state, isAdmin, onNotes, onBack, onAdd, onUpload, onImport, onExport, onIssues, onEdit, onDelete }) {
  const { questions, loading, error, reload } = state;
  const [filters, setFilters] = useState(NO_FILTER);
  const visible = useMemo(() => filterStaffQuestions(questions, filters), [questions, filters]);
  const filtering = Boolean(filters.search.trim()) || filters.difficulty !== 'all';
  const viewBase = isAdmin ? '/admin' : '';

  const actions = (
    <>
      <Button size="sm" startIcon={<BugIcon size={18} weight="regular" aria-hidden="true" />} onClick={onIssues}>
        Issues
      </Button>
      {questions.length > 0 ? (
        <Button size="sm" startIcon={<DownloadSimpleIcon size={18} weight="regular" aria-hidden="true" />} onClick={onExport}>
          Export
        </Button>
      ) : null}
      <Button size="sm" startIcon={<CloudArrowDownIcon size={18} weight="regular" aria-hidden="true" />} onClick={onImport}>
        Import
      </Button>
      {isAdmin ? (
        <>
          <Button size="sm" startIcon={<UploadSimpleIcon size={18} weight="regular" aria-hidden="true" />} onClick={onUpload}>
            Upload JSON
          </Button>
          <Button size="sm" variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={onAdd}>
            Add question
          </Button>
        </>
      ) : null}
    </>
  );

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
    list = (
      <EmptyState
        compact
        icon={<QuestionIcon size={28} weight="regular" />}
        title="No questions in this module"
        text={isAdmin ? 'Add the first question, upload several as JSON, or import a topic from the bank library.' : 'No questions have been added to this module yet. You can import a topic from the bank library.'}
        action={
          <div className="cad-empty-actions">
            {isAdmin ? (
              <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={onAdd}>
                Add question
              </Button>
            ) : null}
            <Button variant={isAdmin ? 'secondary' : 'primary'} startIcon={<CloudArrowDownIcon size={18} weight="regular" aria-hidden="true" />} onClick={onImport}>
              Import from the library
            </Button>
          </div>
        }
      />
    );
  } else if (visible.length === 0) {
    list = (
      <EmptyState
        compact
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No questions match"
        text="Try a different search or clear the filters."
        action={
          <Button variant="primary" onClick={() => setFilters(NO_FILTER)}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    list = (
      <ul className="cdqi-list" aria-label={`Questions in ${module.title}`}>
        {visible.map((question) => (
          <StaffQuestionRow key={question._id} question={question} canEdit={isAdmin} viewPath={`${viewBase}/cohorts/${cohortId}/modules/${module._id}/questions/${question._id}/view`} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>
    );
  }

  return (
    <Card as="section" flush className="cdq" aria-labelledby="cdq-title">
      <div className="cdq-top">
        <ModuleHeader module={module} onNotes={onNotes} onBack={onBack} actions={actions} />

        {!loading && !error && questions.length > 0 ? (
          <>
            <p className="cad-count">{filtering ? `${pluralize(visible.length, 'question')} of ${questions.length}` : pluralize(questions.length, 'question')}</p>
            <Toolbar
              className="cdq-filters"
              label="Filter questions"
              search={<SearchField value={filters.search} onChange={(search) => setFilters((current) => ({ ...current, search }))} placeholder="Search questions" label="Search questions by title or tag" />}
              end={
                <>
                  {filtering ? (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTER)}>
                      Clear filters
                    </Button>
                  ) : null}
                  <SelectField
                    variant="pill"
                    aria-label="Difficulty"
                    value={filters.difficulty}
                    onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}
                    options={[{ value: 'all', label: 'All difficulties' }, ...DIFFICULTIES.map((entry) => ({ value: entry.key, label: entry.label }))]}
                  />
                </>
              }
            />
          </>
        ) : null}
      </div>

      <div className="cdq-body">{list}</div>
    </Card>
  );
}
