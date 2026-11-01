import React from 'react';
import { Badge, Button, Dialog, Notice, pluralize } from '../../../../ui';
import { sharedActionInfo } from '../model/staffContent';
import './dialogs.css';

/**
 * The warning in front of a change to content that cohorts share (modules and questions are
 * referenced by every cohort cloned from one another, so one edit reaches them all). It says what
 * will happen, how serious it is, and lists the cohorts it reaches. Proceed goes on; Cancel stops.
 * While the change is being made the buttons wait.
 *
 *   dialog   what useSharedConfirm returns as `dialog`: { request, onProceed, onCancel }
 */
export default function SharedContentDialog({ dialog }) {
  const { request, onProceed, onCancel } = dialog;
  const cohorts = request?.affectedCohorts || [];
  const info = request ? sharedActionInfo(request.action, cohorts.length, request.details) : null;
  const subject = request?.details?.moduleName ? `Module: ${request.details.moduleName}` : request?.details?.questionTitle ? `Question: ${request.details.questionTitle}` : null;

  return (
    <Dialog
      open={Boolean(request)}
      onClose={onCancel}
      busy={Boolean(request?.busy)}
      size="lg"
      title={info?.title || ''}
      description={info?.description}
      actions={
        <>
          <Button onClick={onCancel} disabled={request?.busy}>
            Cancel
          </Button>
          <Button variant={info?.tone === 'danger' ? 'danger' : 'primary'} onClick={onProceed} loading={Boolean(request?.busy)}>
            Proceed
          </Button>
        </>
      }
    >
      {info ? (
        <div className="cad-shared">
          <Notice tone={info.tone}>{info.warning}</Notice>
          {subject ? <p className="cad-shared__subject">{subject}</p> : null}
          <div className="cad-shared__head">
            <h3 className="cad-shared__title">Cohorts reached</h3>
            <Badge tone={info.tone === 'danger' ? 'danger' : info.tone === 'warning' ? 'warning' : 'info'}>{pluralize(cohorts.length, 'cohort')}</Badge>
          </div>
          {cohorts.length === 0 ? (
            <p className="cad-shared__none">The server named no other cohorts.</p>
          ) : (
            <ul className="cad-shared__list">
              {cohorts.map((cohort, index) => (
                <li key={cohort._id || index}>
                  <span className="cad-shared__name">{cohort.title}</span>
                  <span className="cad-shared__id">{cohort._id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
