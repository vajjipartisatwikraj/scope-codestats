import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { Badge, Button, EmptyState, IconButton, Notice, PillTabs, SkeletonRows } from '../../../../ui';
import SectionFrame from '../shared/SectionFrame';
import { languageName } from '../model/languages';
import CodeViewer from '../workspace/editor/CodeViewer';
import './sections.css';

/** One reference solution: the language, a copy button and the code, read only */
function SolutionCode({ code, language }) {
  return (
    <section className="ps-code-view" aria-label={`Solution in ${languageName(language)}`}>
      <header className="ps-code-view__head">
        <Badge tone="neutral">{languageName(language)}</Badge>
        <IconButton label="Copy the solution" size="sm" tone="plain" onClick={() => navigator.clipboard.writeText(code || '').then(() => toast.info('Solution copied to clipboard'))}>
          <CopyIcon size={20} weight="regular" aria-hidden="true" />
        </IconButton>
      </header>
      <div className="ps-code-view__editor ps-code-view__editor--tall">
        <CodeViewer code={code} language={language} />
      </div>
    </section>
  );
}

/** The solutions of a programming question, one tab per language that has one */
function ProgrammingSolutions({ languages }) {
  const [picked, setPicked] = useState(languages[0].name);
  const current = languages.find((entry) => entry.name === picked) || languages[0];
  return (
    <div className="ps-stack">
      {languages.length > 1 ? <PillTabs items={languages.map((entry) => ({ key: entry.name, label: languageName(entry.name) }))} value={current.name} onChange={setPicked} label="Solution language" size="sm" /> : null}
      <SolutionCode code={current.solutionCode} language={current.name} />
    </div>
  );
}

/**
 * The Solutions section, for admins and teachers only (the tab is not offered to students and the
 * server answers them 403): the reference solution of the question. A programming question shows the
 * solution code of each language that has one; a SQL question, its reference query; a multiple
 * choice question, the correct options.
 *
 *   data       { solutions, loading, failed, load } from useSolutions
 *   embedded   inside the statement pane (a phone)
 */
export default function SolutionsSection({ data, embedded }) {
  const { solutions, loading, failed, load } = data;
  let body;
  if (loading) {
    body = <SkeletonRows count={4} height={48} />;
  } else if (failed) {
    body = (
      <Notice
        tone="danger"
        title="The solutions did not load"
        action={
          <Button variant="ghost" size="sm" onClick={load}>
            Retry
          </Button>
        }
      >
        Check your connection and try again.
      </Notice>
    );
  } else if (!solutions) {
    body = null;
  } else if (solutions.type === 'mcq') {
    body =
      solutions.correctOptions.length > 0 ? (
        <ul className="ps-stack" aria-label="Correct options">
          {solutions.correctOptions.map((option) => (
            <li key={option._id} className="ps-picked">
              <Badge tone="success" icon={<CheckCircleIcon size={14} weight="fill" aria-hidden="true" />}>
                Correct
              </Badge>{' '}
              {option.text}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={<CodeIcon size={28} weight="regular" />} title="No correct option marked" text="This question has no option marked as correct." />
      );
  } else if (solutions.type === 'sql') {
    body = solutions.solutionSql ? <SolutionCode code={solutions.solutionSql} language="sql" /> : <EmptyState compact icon={<CodeIcon size={28} weight="regular" />} title="No solution yet" text="This question has no reference query." />;
  } else if (solutions.languages.length > 0) {
    // Keyed by the language list, so a new question starts on its first language
    body = <ProgrammingSolutions key={solutions.languages.map((entry) => entry.name).join(',')} languages={solutions.languages} />;
  } else {
    body = <EmptyState compact icon={<CodeIcon size={28} weight="regular" />} title="No solution yet" text="No language of this question has a solution code." />;
  }

  return (
    <SectionFrame label="Solutions" lead={<h2 className="ps-pane__title">Solutions</h2>} embedded={embedded}>
      {body}
    </SectionFrame>
  );
}
