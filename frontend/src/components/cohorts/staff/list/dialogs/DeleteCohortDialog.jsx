import React from 'react';
import { Button, Dialog, Notice, Skeleton } from '../../../../ui';
import './dialogs.css';

/**
 * Asks before a cohort is deleted, and says what it would take with it. The facts come from the
 * server (GET .../deletion-impact):
 *   - user groups still attached block the delete; "Detach groups" opens them
 *   - the last cohort of a family of clones takes its modules, questions and progress with it
 *   - otherwise only the cohort and its progress go, and the modules stay with the related cohorts
 *
 *   cohort, impact, checking   the cohort, the server's answer (null until it comes) and whether it is on its way
 *   deleting                   the delete is running
 *   onClose, onConfirm, onDetach   the actions
 */
export default function DeleteCohortDialog({ cohort, impact, checking, deleting, onClose, onConfirm, onDetach }) {
  const blocked = impact?.canDelete === false;
  const last = Boolean(impact?.isLastCohort);

  let facts = <Notice tone="info">This deletes the cohort and the progress students made in it.</Notice>;
  if (checking) {
    facts = <Skeleton height={96} />;
  } else if (impact && last) {
    facts = (
      <Notice tone="warning" title="This is the last cohort in its group">
        <p>Deleting it permanently removes:</p>
        <ul>
          <li>
            <strong>{impact.modulesCount}</strong> modules
          </li>
          <li>
            <strong>{impact.questionsCount}</strong> questions
          </li>
          <li>
            <strong>{impact.userProgressCount}</strong> user progress records
          </li>
        </ul>
        <p>
          <strong>This cannot be undone.</strong>
        </p>
      </Notice>
    );
  } else if (impact) {
    facts = (
      <Notice tone="success" title="Safe to delete: related cohorts exist">
        <p>
          It has <strong>{impact.relatedCohortsCount}</strong> related cohort(s):
        </p>
        <ul>
          {impact.relatedCohorts.slice(0, 3).map((related) => (
            <li key={related.id}>{related.title}</li>
          ))}
          {impact.relatedCohortsCount > 3 ? <li>and {impact.relatedCohortsCount - 3} more</li> : null}
        </ul>
        <p>
          This removes the cohort and <strong>{impact.userProgressCount}</strong> user progress records. The modules and questions stay for the other cohorts.
        </p>
      </Notice>
    );
  }

  return (
    <Dialog
      open={Boolean(cohort)}
      onClose={onClose}
      busy={deleting}
      title="Delete this cohort?"
      description={cohort ? `\u201c${cohort.title}\u201d will be deleted.` : ''}
      actions={
        <>
          <Button onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting} disabled={checking || blocked}>
            {last ? 'Delete everything' : 'Delete cohort'}
          </Button>
        </>
      }
    >
      <div className="cmd">
        {impact?.userGroups?.length > 0 ? (
          <Notice
            tone="warning"
            title="Detach the user groups first"
            action={
              <Button variant="ghost" size="sm" onClick={onDetach}>
                Detach groups
              </Button>
            }
          >
            It cannot be deleted while these user groups are attached: {impact.userGroups.map((group) => group.name).join(', ')}.
          </Notice>
        ) : null}
        {facts}
      </div>
    </Dialog>
  );
}
