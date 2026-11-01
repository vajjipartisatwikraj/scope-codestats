import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { IconButton, Notice, PillTabs, SelectField, EmptyState } from '../../../../ui';
import { ProgressBar } from '../../../../custom-components';
import SectionFrame from '../shared/SectionFrame';
import { languageName } from '../model/languages';
import { SUBMISSION_LIMIT, acceptedShare, arrangeSubmissions, distinct, isAccepted, nextSort } from '../model/submissions';
import SubmissionDetail from './SubmissionDetail';
import SubmissionTable from './SubmissionTable';
import './sections.css';

const NO_SORT = { field: null, direction: 'asc' };

/** Submissions, accepted, and the share accepted, in one line of figures */
function Overview({ list, label }) {
  const accepted = list.filter(isAccepted).length;
  const share = acceptedShare(list);
  return (
    <div className="ps-overview">
      <p className="ps-overview__figures">
        <span><strong>{list.length}</strong> {label}</span>
        <span><strong>{accepted}</strong> accepted</span>
      </p>
      <ProgressBar value={share} max={100} label="Acceptance rate" valueLabel={`${share}%`} tone={share >= 80 ? 'success' : share >= 50 ? 'warning' : 'danger'} size="sm" />
    </div>
  );
}

/** Your own five submissions: a notice when the limit is near, then the table */
function MySubmissions({ list, mcq, onOpen }) {
  const [sort, setSort] = useState(NO_SORT);
  const rows = useMemo(() => arrangeSubmissions(list, { sort }), [list, sort]);
  if (list.length === 0) {
    return <EmptyState compact icon={<ClockCounterClockwiseIcon size={28} weight="regular" />} title="No submissions yet" text="Submit your solution and it will appear here." />;
  }
  const left = SUBMISSION_LIMIT - list.length;
  return (
    <div className="ps-stack">
      {!mcq && list.length >= SUBMISSION_LIMIT - 1 ? (
        <Notice tone={left <= 0 ? 'warning' : 'info'} title={left <= 0 ? `Submission limit reached (${SUBMISSION_LIMIT} of ${SUBMISSION_LIMIT})` : `${list.length} of ${SUBMISSION_LIMIT} submissions used`}>
          {left <= 0 ? 'Your next submission replaces the oldest one.' : `You have ${left} submission${left === 1 ? '' : 's'} left.`}
        </Notice>
      ) : null}
      <Overview list={list} label="submissions" />
      <SubmissionTable rows={rows} mcq={mcq} sort={sort} onSort={(field) => setSort((current) => nextSort(current, field))} onOpen={onOpen} />
    </div>
  );
}

/** Everyone's submissions, with a language and a status filter */
function AllSubmissions({ list, mcq, onOpen }) {
  const [sort, setSort] = useState(NO_SORT);
  const [language, setLanguage] = useState('all');
  const [status, setStatus] = useState('all');
  const rows = useMemo(() => arrangeSubmissions(list, { sort, language, status }), [list, sort, language, status]);
  if (list.length === 0) return <EmptyState compact icon={<ClockCounterClockwiseIcon size={28} weight="regular" />} title="No submissions from other students yet" text="Check back later." />;
  const languages = distinct(list, 'language');
  const statuses = distinct(list, 'status');
  return (
    <div className="ps-stack">
      <Overview list={rows} label="shown" />
      <div className="ps-filters">
        {mcq ? null : (
          <SelectField variant="pill" aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="all">All languages</option>
            {languages.map((key) => (
              <option key={key} value={key}>{languageName(key)}</option>
            ))}
          </SelectField>
        )}
        <SelectField variant="pill" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((key) => (
            <option key={key} value={key}>{key.replace('_', ' ')}</option>
          ))}
        </SelectField>
      </div>
      {rows.length === 0 ? (
        <EmptyState compact title="No submissions match" text="Try a different language or status." />
      ) : (
        <SubmissionTable rows={rows} showUser mcq={mcq} sort={sort} onSort={(field) => setSort((current) => nextSort(current, field))} onOpen={onOpen} />
      )}
    </div>
  );
}

/**
 * The Submissions section: your submissions, and (once you have solved the question, or if you are
 * staff) everyone's, each opening in full with its code. The list of all students is read the first
 * time that tab opens.
 *
 *   question      the question (its type and options)
 *   submissions   your submissions
 *   allUsers      { items, load } from useAllSubmissions
 *   unlocked      the student may see the others' submissions
 *   embedded      inside the statement pane (a phone)
 */
export default function SubmissionsSection({ question, submissions, allUsers, unlocked, embedded }) {
  const [tab, setTab] = useState('mine');
  const [open, setOpen] = useState(null);
  const mcq = question.type === 'mcq';

  useEffect(() => {
    if (tab === 'all') allUsers.load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseTab = (key) => {
    setOpen(null);
    setTab(key);
  };

  const lead = open ? (
    <>
      <IconButton label="Back to the submissions" size="sm" tone="plain" onClick={() => setOpen(null)}>
        <ArrowLeftIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>
      <h2 className="ps-pane__title">Submission details</h2>
    </>
  ) : (
    <PillTabs
      items={[
        { key: 'mine', label: 'My submissions' },
        { key: 'all', label: 'All students', disabled: !unlocked },
      ]}
      value={tab}
      onChange={chooseTab}
      label="Whose submissions"
      size="sm"
    />
  );

  return (
    <SectionFrame label="Submissions" lead={lead} embedded={embedded}>
      {open ? (
        <SubmissionDetail submission={open} mcq={mcq} options={question.options} />
      ) : (
        <div className="ps-stack">
          {!unlocked ? (
            <Notice tone="info" title="Solve this question first">
              The list of all students unlocks once you have an accepted solution.
            </Notice>
          ) : null}
          {tab === 'mine' ? <MySubmissions list={submissions} mcq={mcq} onOpen={setOpen} /> : <AllSubmissions list={allUsers.items} mcq={mcq} onOpen={setOpen} />}
        </div>
      )}
    </SectionFrame>
  );
}
