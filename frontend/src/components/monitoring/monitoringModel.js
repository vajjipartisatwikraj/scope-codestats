/**
 * Pure helpers of the Monitoring page: ranges, number and time formats, status codes, sorting and
 * searching of the tables. No React in here.
 */

export const API_RANGES = [
  { key: '1h', label: '1 hour' },
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

/** The ranges SpeechJudge's usage reports accept. */
export const VOCALQ_RANGES = [
  { key: '1h', label: '1 hour' },
  { key: '6h', label: '6 hours' },
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

/** Length of the time steps SpeechJudge groups its time series by. */
export const INTERVAL_MS = { minute: 60 * 1000, hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000 };

export const DB_RANGES = [
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '1y', label: '1 year' },
  { key: 'all', label: 'All time' },
];

const dash = '\u2013';

// ---- Numbers -----------------------------------------------------------------------------------

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** 1536 -> "1.5 KB", 4_700_000_000 -> "4.4 GB". A missing value is an en dash. */
export function formatBytes(value) {
  const bytes = Number(value);
  if (value === null || value === undefined || !Number.isFinite(bytes)) return dash;
  if (bytes === 0) return '0 B';
  const sign = bytes < 0 ? '\u2212' : '';
  let size = Math.abs(bytes);
  let unit = 0;
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${sign}${size.toFixed(digits).replace(/\.?0+$/, '')} ${UNITS[unit]}`;
}

/** 340 -> "340 ms", 1240 -> "1.24 s". A missing value is an en dash. */
export function formatMs(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return dash;
  const ms = Number(value);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 2).replace(/\.?0+$/, '')} s`;
}

/** part of whole as "98.4%"; "0%" without a whole. */
export function formatPercent(part, whole) {
  if (!whole) return '0%';
  const share = (part / whole) * 100;
  if (share > 0 && share < 0.1) return '<0.1%';
  if (share >= 99.95 && part < whole) return '99.9%';
  // Whole numbers in the middle, one decimal near the ends where 99.6% and 99% differ
  return `${share >= 10 && share < 90 ? Math.round(share) : Math.round(share * 10) / 10}%`;
}

/** 3725 -> "1 h 2 min", 305 -> "5 min 5 s", 42 -> "42 s". The two biggest units only. */
export function formatDuration(seconds) {
  const value = Number(seconds);
  if (seconds === null || seconds === undefined || !Number.isFinite(value)) return dash;
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `${hours} h ${minutes} min`;
  if (minutes) return `${minutes} min ${rest} s`;
  return `${rest} s`;
}

/** A score from 0 to 1 as "82%" or "82.4%". A missing score is an en dash. */
export function formatScore(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return dash;
  return `${Math.round(Number(score) * 1000) / 10}%`;
}

/** "QUESTION_ANSWER" -> "Question answer" */
export function humanize(code) {
  const words = String(code || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : dash;
}

// ---- Time ---------------------------------------------------------------------------------------

const IST = 'Asia/Kolkata';
const lower = (text) => text.replace(/\bAM\b/, 'am').replace(/\bPM\b/, 'pm');
const formatter = (options) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...options });

const CLOCK = formatter({ hour: 'numeric', minute: '2-digit', hour12: true });
const HOUR = formatter({ hour: 'numeric', hour12: true });
const DAY_HOUR = formatter({ day: 'numeric', month: 'short', hour: 'numeric', hour12: true });
const DAY = formatter({ day: 'numeric', month: 'short' });
const DAY_YEAR = formatter({ day: 'numeric', month: 'short', year: 'numeric' });

const HOUR_MS = 3600 * 1000;

/**
 * How to write a moment on a chart for a timeline whose points are `stepMs` apart.
 * @returns {{axis: (ms: number) => string, full: (ms: number) => string}}
 */
export function timeLabels(stepMs, windowMs) {
  if (stepMs < HOUR_MS) {
    return { axis: (ms) => lower(CLOCK.format(ms)), full: (ms) => lower(`${DAY.format(ms)}, ${CLOCK.format(ms)}`) };
  }
  if (stepMs < 24 * HOUR_MS) {
    const sameDay = windowMs !== null && windowMs <= 25 * HOUR_MS;
    return {
      axis: (ms) => lower(sameDay ? HOUR.format(ms) : DAY_HOUR.format(ms)),
      full: (ms) => lower(DAY_HOUR.format(ms)),
    };
  }
  return { axis: (ms) => DAY.format(ms), full: (ms) => DAY_YEAR.format(ms) };
}

/** "10 Nov 2026" for a "YYYY-MM-DD" day key. */
export const formatDayKey = (key) => (key ? DAY_YEAR.format(new Date(`${key}T12:00:00+05:30`)) : dash);
/** "10 Nov" for a "YYYY-MM-DD" day key. */
export const formatDayKeyShort = (key) => (key ? DAY.format(new Date(`${key}T12:00:00+05:30`)) : dash);
/** "5:10 pm" */
export const formatClock = (value) => lower(CLOCK.format(new Date(value)));

/** Kilobytes (the unit Judge0 uses for memory, stack and file limits) as "125 MB". */
export const formatKilobytes = (kilobytes) =>
  kilobytes === null || kilobytes === undefined || !Number.isFinite(Number(kilobytes)) ? dash : formatBytes(Number(kilobytes) * 1024);

/** 5 -> "5 s", 0.5 -> "0.5 s". A missing value is an en dash. */
export function formatSeconds(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return dash;
  return `${Math.round(Number(seconds) * 100) / 100} s`;
}

/** "3.7Gi" -> "3.7 GiB", "0B" -> "0 B", "512M" -> "512 MB": the sizes `free -h` prints. */
export function humanSize(text) {
  const match = String(text || '').trim().match(/^([\d.]+)\s*([KMGTP]?)(i?)B?$/i);
  if (!match) return text ? String(text) : dash;
  const [, amount, letter, binary] = match;
  return `${amount} ${letter.toUpperCase()}${letter && binary ? 'i' : ''}B`;
}

// ---- Judge0 ------------------------------------------------------------------------------------------

/** The colour of a Judge0 submission status (its ids are fixed): green for accepted, red for errors. */
export function judge0StatusColor(id) {
  if (id === 3) return 'var(--ds-series-teal)'; // Accepted
  if (id === 4) return 'var(--ds-series-amber)'; // Wrong Answer
  if (id === 5) return 'var(--ds-series-violet)'; // Time Limit Exceeded
  if (id === 6) return 'var(--ds-series-sky)'; // Compilation Error
  if (id >= 7 && id <= 12) return 'var(--ds-series-coral)'; // Runtime errors
  if (id === 13) return 'var(--ds-series-rose)'; // Internal Error: Judge0's own failure
  if (id === 14) return 'var(--ds-series-slate)'; // Exec Format Error
  return 'var(--ds-series-blue)'; // In queue, processing
}
// ---- Status codes ----------------------------------------------------------------------------------

const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No content',
  301: 'Moved',
  302: 'Redirect',
  304: 'Not modified',
  400: 'Bad request',
  401: 'Not signed in',
  403: 'Forbidden',
  404: 'Not found',
  405: 'Method not allowed',
  409: 'Conflict',
  413: 'Too large',
  422: 'Invalid',
  429: 'Too many requests',
  500: 'Server error',
  502: 'Bad gateway',
  503: 'Unavailable',
  504: 'Timeout',
};

/** { tone, text, label } of a status code: 2xx success, 3xx info, 4xx warning, 5xx danger. */
export function statusInfo(status) {
  const family = Math.floor(status / 100);
  const tone = family === 5 ? 'danger' : family === 4 ? 'warning' : family === 3 ? 'info' : 'success';
  const text = STATUS_TEXT[status] || (family === 5 ? 'Server error' : family === 4 ? 'Client error' : family === 3 ? 'Redirect' : 'OK');
  return { tone, text, label: `${status} ${text}` };
}

export const KIND_LABEL = {
  json: 'Data (JSON)',
  file: 'Files and downloads',
  html: 'Web pages (HTML)',
  image: 'Images',
  text: 'Plain text',
  empty: 'No content',
};

/** The three groups the status mix chart shows. */
export const STATUS_GROUPS = [
  { key: 'success', label: 'Successful', color: 'var(--ds-series-teal)' },
  { key: 'client', label: 'Client errors (4xx)', color: 'var(--ds-series-amber)' },
  { key: 'server', label: 'Server errors (5xx)', color: 'var(--ds-series-coral)' },
];

// ---- Tables ---------------------------------------------------------------------------------------------

/** Rows sorted by `sort` = { key, dir }, using one getter per column; text sorts alphabetically. */
export function sortRows(rows, sort, getters) {
  const get = getters[sort.key];
  if (!get) return rows;
  const direction = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = get(a);
    const right = get(b);
    // A missing figure always sorts last
    if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === 'string') return left.localeCompare(right) * direction;
    return (left - right) * direction;
  });
}

/** The next sort when a header is pressed: the same column flips, a new one starts at `firstDir`. */
export function nextSort(current, key, firstDir = 'desc') {
  if (current.key === key) return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' };
  return { key, dir: key === 'name' || key === 'route' ? 'asc' : firstDir };
}

/** Rows whose text contains every word of the query. */
export function searchRows(rows, query, textOf) {
  const words = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((row) => {
    const text = textOf(row).toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** The last 6 characters of an id, the way the server log shows a user. */
export const shortId = (id) => (id ? String(id).slice(-6) : dash);
