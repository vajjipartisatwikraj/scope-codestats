import { formatDateTime } from '../../ui';

/**
 * What the two management screens (alerts and announcements) work out from a notice: its status,
 * the dates in the form, and the checks both forms share. No React and no network in this file.
 *
 *   STATUS_FILTERS            the options of the status dropdown
 *   STATUS_TONES              the badge of each status: { label, tone }
 *   toInput(date), fromInput(text)   a date as the value of a datetime-local field, and back to an ISO string
 *   defaultWindow()           a new notice starts now and runs for a week: { startsAt, endsAt } as field values
 *   windowText(notice)        "17 Nov 2026, 10:00 am to 24 Nov 2026, 10:00 am"
 *   checkWindow(form)         the problems of the start and end fields: { startsAt?, endsAt? }
 *   checkButton(form)         the problems of the button fields: { buttonText?, buttonUrl? }
 *   isLinkValid(text)         an https address or a path inside the app that starts with one "/"
 *   plainTextOf(html)         the text of an HTML string (a card shows it, a check tells empty from written)
 */

export const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Ended' },
  { value: 'off', label: 'Switched off' },
];

export const STATUS_TONES = {
  live: { label: 'Live', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  ended: { label: 'Ended', tone: 'neutral' },
  off: { label: 'Switched off', tone: 'warning' },
};

const pad = (value) => String(value).padStart(2, '0');

/** A Date (or ISO string) as "2026-11-17T10:30", in the browser's time zone, for a datetime-local field */
export function toInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The value of a datetime-local field as an ISO string, or '' when it is empty or not a date */
export function fromInput(text) {
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function defaultWindow() {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { startsAt: toInput(start), endsAt: toInput(end) };
}

export const windowText = (notice) => `${formatDateTime(notice.startsAt)} to ${formatDateTime(notice.endsAt)}`;

export function checkWindow(form) {
  const problems = {};
  if (!form.startsAt) problems.startsAt = 'Choose when it starts.';
  if (!form.endsAt) problems.endsAt = 'Choose when it ends.';
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) problems.endsAt = 'The end must be after the start.';
  return problems;
}

export function isLinkValid(text) {
  const value = String(text || '').trim();
  if (value.startsWith('/')) return !value.startsWith('//');
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (failure) {
    return false;
  }
}

export function checkButton(form) {
  const problems = {};
  const text = String(form.buttonText || '').trim();
  const url = String(form.buttonUrl || '').trim();
  if (text && !url) problems.buttonUrl = 'Add the link the button opens, or clear the button text.';
  else if (url && !text) problems.buttonText = 'Add the text of the button, or clear the link.';
  else if (url && !isLinkValid(url)) problems.buttonUrl = 'Use an https:// address or a path inside the app, such as /dashboard.';
  return problems;
}

export const plainTextOf = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
