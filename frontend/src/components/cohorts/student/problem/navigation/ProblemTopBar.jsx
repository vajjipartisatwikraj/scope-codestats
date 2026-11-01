import React from 'react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { ListBulletsIcon } from '@phosphor-icons/react/dist/csr/ListBullets';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { Button, IconButton } from '../../../../ui';
import { RUN_HINT, SUBMIT_HINT } from '../model/shortcuts';
import './navigation.css';

/**
 * The 56px strip above the panes: the problem list at the left; at the right Run and Submit for a
 * coding question (a multiple choice question has its own Submit beside the options). Run is the
 * secondary button and Submit the one primary. On a phone the problem list is an icon.
 *
 *   onList           opens the problem list
 *   compact          a phone: the list button is an icon
 *   coding           the question is programming or SQL: show Run and Submit
 *   runner           the result of useCodeRunner
 *   onRun, onSubmit  the two actions (the page may switch the phone to the console first)
 *   sql              a SQL question (no custom input to wait for)
 */
export default function ProblemTopBar({ onList, compact, coding, runner, onRun, onSubmit, sql }) {
  const { busy, running, submitting, sqlBusy, inputTab, customInput } = runner;
  const customWaiting = !sql && inputTab === 1;
  const runDisabled = busy || (customWaiting && !customInput.trim());
  const runLabel = running && !submitting ? 'Running' : sqlBusy === 'RUN' ? 'Running' : 'Run';
  const submitLabel = submitting || sqlBusy === 'SUBMIT' ? 'Submitting' : 'Submit';

  return (
    <header className="ps-topbar">
      {compact ? (
        <IconButton label="Problem list" onClick={onList}>
          <ListBulletsIcon size={20} weight="regular" aria-hidden="true" />
        </IconButton>
      ) : (
        <Button variant="ghost" onClick={onList} startIcon={<ListBulletsIcon size={18} weight="regular" aria-hidden="true" />} endIcon={<CaretRightIcon size={14} weight="bold" aria-hidden="true" />}>
          Problem list
        </Button>
      )}
      <span className="ps-topbar__spacer" />
      {coding ? (
        <div className="ps-topbar__actions">
          {/* The shortcut is in the browser's own title, which waits a moment and never covers the button */}
          <Button variant="secondary" title={RUN_HINT} aria-keyshortcuts="Control+' Meta+'" onClick={onRun} disabled={runDisabled} loading={busy && !submitting && sqlBusy !== 'SUBMIT'} startIcon={<PlayIcon size={18} weight="fill" aria-hidden="true" />}>
            {runLabel}
          </Button>
          <Button variant="primary" title={SUBMIT_HINT} aria-keyshortcuts="Control+Enter Meta+Enter" onClick={onSubmit} disabled={busy || customWaiting} loading={submitting || sqlBusy === 'SUBMIT'}>
            {submitLabel}
          </Button>
        </div>
      ) : null}
    </header>
  );
}
