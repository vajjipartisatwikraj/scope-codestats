import React from 'react';
import { Badge, DetailPanel, formatDateTime, formatNumber } from '../ui';
import { StatusBadge } from './EmailList';
import { platformName } from '../StudentDashboard/dashboardModel';
import { typeLabel } from './emailFormat';


const HISTORY_LABELS = [
  ['snapshots', 'Daily progress records'],
  ['scoreHistory', 'Score and rank records'],
  ['heatmapDays', 'Days of the activity heatmap'],
];

/** What the email said was removed, as lists of plain lines */
function Removed({ details }) {
  const platforms = details.platforms || [];
  const history = HISTORY_LABELS.filter(([key]) => (details.deleted?.[key] || 0) > 0);
  if (platforms.length === 0 && history.length === 0) return null;
  return (
    <div className="eh-removed">
      {platforms.length > 0 ? (
        <ul className="eh-removed__list" aria-label="Platforms removed">
          {platforms.map((platform) => (
            <li key={platform.key}>
              <strong>{platformName(platform.key)}</strong>
              {platform.username ? <span className="ui-muted"> {platform.username}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {history.length > 0 ? (
        <ul className="eh-removed__list" aria-label="History deleted">
          {history.map(([key, label]) => (
            <li key={key}>
              {label}: <span className="eh-num">{formatNumber(details.deleted[key])}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * One email in full, in the kit's detail panel (it only shows, so its header is the plain one): the
 * status and kind, who it went to and when, the reason when it failed, what a removal email covered, and
 * the email itself as the student saw it. The body is shown in a sandboxed frame, so nothing in it
 * can run or reach the page.
 *
 *   email     an email of GET /admin/emails-history/:id (with `html`), or null when closed
 *   onClose()
 */
export default function EmailDetail({ email, onClose }) {
  const open = Boolean(email);
  const details = email?.details || {};
  const sections = [];

  if (email?.status === 'failed') {
    sections.push({ key: 'error', title: 'Why it failed', content: <p className="eh-error">{email.error || 'The mail server did not say why.'}</p> });
  }
  if (email && (details.platforms?.length || details.deleted)) {
    sections.push({ key: 'removed', title: 'What the email covers', content: <Removed details={details} /> });
  }
  if (email?.html) {
    sections.push({
      key: 'preview',
      title: 'The email',
      content: <iframe className="eh-frame" title={`Preview of: ${email.subject}`} sandbox="" srcDoc={email.html} />,
    });
  }

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      width="lg"
      title={email?.subject || 'Email'}
      subtitle={email ? `To ${email.recipientName || 'unknown'} (${email.to})` : undefined}
      badges={
        email ? (
          <>
            <StatusBadge status={email.status} />
            <Badge tone="neutral">{typeLabel(email.type)}</Badge>
          </>
        ) : null
      }
      facts={
        email
          ? [
              { label: 'Sent to', value: email.to },
              { label: email.status === 'sent' ? 'Sent' : 'Tried', value: formatDateTime(email.sentAt || email.createdAt) },
              { label: 'Sent by', value: email.sentBy ? email.sentBy.name : 'System' },
              { label: 'Reference', value: email.reference },
              { label: 'Message id', value: email.messageId || null },
            ]
          : []
      }
      sections={sections}
    />
  );
}
