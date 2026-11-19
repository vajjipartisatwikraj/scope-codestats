/**
 * What the Emails history page works out from an email of GET /admin/emails-history: the words for
 * its status and its type, and the dropdown options. No React and no network in this file.
 *
 *   STATUS         status -> { label, tone }
 *   STATUS_FILTERS, TYPE_FILTERS   the options of the two dropdowns
 *   typeLabel(type)  "Coding accounts removed", "Teacher request received", ...
 */

export const STATUS = {
  sent: { label: 'Sent', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  sending: { label: 'Sending', tone: 'info' },
};

export const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'sending', label: 'Sending' },
];

const TYPE_LABELS = {
  account_removed: 'Coding accounts removed',
  platform_removed: 'One platform removed',
  teacher_request_received: 'Teacher request received',
  teacher_request_approved: 'Teacher request accepted',
  role_granted: 'Access granted',
  role_revoked: 'Access removed',
};

export const TYPE_FILTERS = [{ value: 'all', label: 'All emails' }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];

export const typeLabel = (type) => TYPE_LABELS[type] || 'Email';
