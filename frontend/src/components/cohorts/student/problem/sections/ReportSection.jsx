import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowClockwise';
import { BugIcon } from '@phosphor-icons/react/dist/csr/Bug';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/csr/PaperPlaneTilt';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, SelectField, Skeleton, TextField, formatDateTime } from '../../../../ui';
import SectionFrame from '../shared/SectionFrame';
import useReports from '../hooks/useReports';
import { REPORT_STATUSES, REPORT_TYPES, reportStatusOf, reportTypeLabel } from '../model/reports';
import { MAX_CHARACTERS, MAX_WORDS, wordCount, withinLimits } from '../model/textLimits';
import './sections.css';

/** The form to report an issue (students only) */
function ReportForm({ sending, onSend }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!type || !description.trim()) {
      toast.error('Choose the kind of issue and describe it');
      return;
    }
    if (!withinLimits(description)) {
      toast.error(`The description is over ${MAX_WORDS} words or ${MAX_CHARACTERS} characters`);
      return;
    }
    if (await onSend(type, description)) {
      setType('');
      setDescription('');
    }
  };
  return (
    <form className="ps-stack" onSubmit={submit}>
      <SelectField label="Kind of issue" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="">Choose one</option>
        {REPORT_TYPES.map((entry) => (
          <option key={entry.value} value={entry.value}>{entry.label}</option>
        ))}
      </SelectField>
      <TextField
        multiline
        rows={5}
        label="What is wrong?"
        value={description}
        placeholder="Describe the issue"
        onChange={(event) => withinLimits(event.target.value) && setDescription(event.target.value)}
        hint={`${description.length} of ${MAX_CHARACTERS} characters, ${wordCount(description)} of ${MAX_WORDS} words`}
      />
      <div className="ps-actions">
        <Button type="submit" variant="primary" loading={sending} disabled={!type || !description.trim()} startIcon={<PaperPlaneTiltIcon size={18} weight="regular" aria-hidden="true" />}>
          Submit report
        </Button>
      </div>
    </form>
  );
}

/** Staff answer a report: a status and a reply */
function ReplyForm({ report, updating, onSave, onCancel }) {
  const [status, setStatus] = useState(report.status || 'pending');
  const [reply, setReply] = useState(report.adminResponse || '');
  return (
    <form
      className="ps-reply"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(status, reply);
      }}
    >
      <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value)} options={REPORT_STATUSES.map((entry) => ({ value: entry.value, label: entry.label }))} />
      <TextField multiline rows={3} label="Reply to the student" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write your reply" />
      <div className="ps-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={updating} disabled={!reply.trim() && status === report.status}>
          Save reply
        </Button>
      </div>
    </form>
  );
}

/** One report: its kind and status, the text, when it was sent, the staff reply */
function ReportItem({ report, staff, replying, updating, onReply, onSave, onCancel, onDelete }) {
  const status = reportStatusOf(report.status);
  return (
    <li className="ps-report">
      <div className="ps-report__head">
        <h3 className="ps-report__title">{reportTypeLabel(report.reportType)}</h3>
        {staff && report.user ? <Badge tone="neutral">{report.user.name || report.user.email}</Badge> : null}
        <Badge tone={status.tone}>{status.label}</Badge>
        {staff ? (
          <IconButton label={replying ? 'Close the reply form' : 'Reply to this report'} size="sm" tone="plain" onClick={onReply}>
            {replying ? <XIcon size={18} weight="regular" aria-hidden="true" /> : <PencilSimpleIcon size={18} weight="regular" aria-hidden="true" />}
          </IconButton>
        ) : (
          <IconButton label="Delete this report" size="sm" tone="danger" onClick={onDelete}>
            <TrashIcon size={18} weight="regular" aria-hidden="true" />
          </IconButton>
        )}
      </div>
      <p className="ps-report__text">{report.description}</p>
      <p className="ps-muted">{formatDateTime(report.createdAt)}</p>
      {report.adminResponse ? (
        <div className="ps-report__reply">
          <p className="ps-block__label">Reply from your teacher</p>
          <p>{report.adminResponse}</p>
        </div>
      ) : null}
      {staff && replying ? <ReplyForm report={report} updating={updating} onSave={onSave} onCancel={onCancel} /> : null}
    </li>
  );
}

/**
 * The Report section. A student reports a problem with the question (wrong test case, wrong
 * statement, wrong constraints, a technical fault) and follows the answer. Staff see every report
 * and answer them.
 *
 *   ids      { cohortId, moduleId, questionId }
 *   staff    the viewer is an admin or a teacher
 *   embedded inside the statement pane (a phone)
 */
export default function ReportSection({ ids, staff, embedded }) {
  const { reports, loading, sending, updating, reload, send, remove, respond } = useReports({ ids });
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const save = async (report, status, reply) => {
    if (!reply.trim() && !status) {
      toast.error('Write a reply or change the status');
      return;
    }
    if (await respond(report._id, status, reply)) setReplyingTo(null);
  };

  return (
    <SectionFrame label="Report" lead={<h2 className="ps-pane__title">{staff ? 'Reports on this question' : 'Report an issue'}</h2>} embedded={embedded}>
      <div className="ps-stack ps-stack--loose">
        {staff ? null : <ReportForm sending={sending} onSend={send} />}

        <section aria-label="Reports">
          <div className="ps-report-list__head">
            <h3 className="ps-subtitle">{staff ? 'All reports' : 'Your reports'} ({reports.length})</h3>
            <IconButton label="Refresh the reports" size="sm" tone="plain" onClick={reload} disabled={loading}>
              <ArrowClockwiseIcon size={18} weight="regular" aria-hidden="true" />
            </IconButton>
          </div>
          {loading && reports.length === 0 ? (
            <Skeleton height={96} />
          ) : reports.length === 0 ? (
            <EmptyState compact icon={<BugIcon size={28} weight="regular" />} title="No reports yet" text={staff ? 'Nothing has been reported on this question.' : 'If something looks wrong in this question, tell us above.'} />
          ) : (
            <ul className="ps-report-list">
              {reports.map((report) => (
                <ReportItem
                  key={report._id}
                  report={report}
                  staff={staff}
                  replying={replyingTo === report._id}
                  updating={updating}
                  onReply={() => setReplyingTo((current) => (current === report._id ? null : report._id))}
                  onSave={(status, reply) => save(report, status, reply)}
                  onCancel={() => setReplyingTo(null)}
                  onDelete={() => setDeleting(report)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this report?"
        description="This cannot be undone."
        confirmLabel="Delete report"
        danger
        onConfirm={async () => {
          await remove(deleting._id);
          setDeleting(null);
        }}
      />
    </SectionFrame>
  );
}
