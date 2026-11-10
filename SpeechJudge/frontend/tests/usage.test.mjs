// Usage tab: renders the numbers the backend returns (stubbed fetch, jsdom), charts, tables, and the off / error states.
//   node usage.test.mjs
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { buildUsageView, barChart, duration, bucketLabel, bytes } = await import('../usage.js');
const text = (el) => el.textContent.replace(/\s+/g, ' ');
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

// ---- helpers --------------------------------------------------------------------------------------
assert.equal(duration(0), '0 s');
assert.equal(duration(59.6), '1 min 0 s');
assert.equal(duration(3725), '1 h 2 min 5 s');
assert.equal(duration(undefined), '–');
assert.equal(bytes(0), '0 B');
assert.equal(bytes(1023), '1023 B');
assert.equal(bytes(1536), '1.50 KB');
assert.equal(bytes(7.6 * 1024 * 1024), '7.60 MB');
assert.equal(bytes(15 * 1024 ** 3), '15.0 GB');
assert.equal(bytes(null), '–');
assert.ok(bucketLabel('2026-10-11T14:05:00Z', 'minute').length > 0);

const pts = [0, 1, 2, 3].map((i) => ({ bucket: `2026-10-11T0${i}:00:00Z`, ok: i, bad: i % 2 }));
const chart = barChart({ title: 'Calls per hour', points: pts, interval: 'hour',
  series: [{ label: 'OK', cls: 'fill-good', value: (p) => p.ok }, { label: 'Errors', cls: 'fill-low', value: (p) => p.bad }] });
assert.equal(chart.querySelectorAll('rect').length, 3 + 2, 'one rect per non-zero segment');
assert.match(chart.querySelector('svg').getAttribute('aria-label'), /total 8, peak 4/);
assert.match(chart.querySelector('title').textContent, /OK: 0/);
const empty = barChart({ title: 'Nothing', points: [], interval: 'hour', series: [{ label: 'x', cls: 'a', value: () => 0 }] });
assert.equal(empty.querySelectorAll('rect').length, 0);

// ---- a stubbed backend ------------------------------------------------------------------------------
const summary = {
  window: { from: 'a', to: 'b' },
  api: { requests: 1234, errors: 61, server_errors: 4, unauthorized: 7, rate_limited: 0, error_rate: 0.0494, avg_ms: 85.2, max_ms: 4200, request_bytes: 10,
    by_status_class: { '2xx': 1173, '3xx': 0, '4xx': 57, '5xx': 4 }, by_category: { evaluation: 900, jobs: 334 } },
  evaluations: { runs: 400, completed: 380, low_audio_quality: 12, failed_attempts: 8, avg_score: 0.8123, avg_ms: 2750, max_ms: 9000, mocked: 0,
    by_source: { sync: 100, async: 50, section: 250 }, avg_stage_ms: { stt: 1500, pronunciation: 900, acoustic: 20, language: 2100 } },
  whisper: { evaluations: 321, audio_seconds: 3725, avg_audio_seconds: 11.6 },
  pronunciation: { evaluations: 200, audio_seconds: 2000 },
  gemini: { calls: 150, prompt_tokens: 60000, output_tokens: 30000, thinking_tokens: 10000, total_tokens: 100000 },
};
const points = Array.from({ length: 24 }, (_, i) => ({
  bucket: new Date(Date.UTC(2026, 9, 10, i)).toISOString().replace('.000Z', 'Z'), api_requests: i * 10, api_errors: i % 3, api_server_errors: 0,
  evaluations: i * 2, failed_attempts: i % 2, whisper_evaluations: i, whisper_audio_seconds: i * 30, pronunciation_evaluations: i,
  gemini_calls: i, gemini_tokens: i * 500, avg_evaluation_ms: 2000 }));
const routes = [
  { method: 'POST', route: '/api/v1/evaluate/section', category: 'evaluation', hits: 250, errors: 3, server_errors: 0, avg_ms: 120, max_ms: 900, p95_ms: 300, last_seen: '2026-10-11T10:00:00Z' },
  { method: 'GET', route: '/api/v1/jobs/{job_id}', category: 'jobs', hits: 700, errors: 50, server_errors: 4, avg_ms: 5, max_ms: 60, p95_ms: null, last_seen: '2026-10-11T10:00:01Z' },
  { method: 'GET', route: '/api/v1/ready', category: 'monitoring', hits: 5000, errors: 0, server_errors: 0, avg_ms: 1, max_ms: 3, p95_ms: 2, last_seen: '2026-10-11T10:00:02Z' }];
const types = [{ question_type: 'READING', runs: 100, completed: 90, low_audio_quality: 5, failed_attempts: 5, avg_score: 0.77, avg_ms: 3000,
  whisper_evaluations: 95, whisper_audio_seconds: 1000, gemini_calls: 0, gemini_tokens: 0 },
{ question_type: 'EMAIL_WRITING', runs: 10, completed: 10, low_audio_quality: 0, failed_attempts: 0, avg_score: null, avg_ms: 4000,
  whisper_evaluations: 0, whisper_audio_seconds: 0, gemini_calls: 12, gemini_tokens: 9000 }];

const storage = {
  backend: 'postgresql', database: 'speechjudge', database_bytes: 8 * 1024 * 1024, tables_bytes: 2 * 1024 * 1024, retention_days: 90,
  tables: [
    { name: 'api_requests', rows: 4000, table_bytes: 600 * 1024, index_bytes: 400 * 1024, total_bytes: 1024 * 1024, oldest: '2026-10-01T00:00:00Z', newest: '2026-10-11T10:00:00Z' },
    { name: 'evaluations', rows: 1000, table_bytes: 700 * 1024, index_bytes: 300 * 1024, total_bytes: 1000 * 1024, oldest: '2026-10-02T00:00:00Z', newest: '2026-10-11T10:00:00Z' },
    { name: 'metrics_schema', rows: null, table_bytes: 8192, index_bytes: 16384, total_bytes: 24576, oldest: null, newest: null }] };

const calls = [];
let mode = 'on';
globalThis.fetch = async (url) => {
  calls.push(url);
  const u = new URL(url, 'http://x');
  const reply = (status, data) => ({ status, ok: status < 400, json: async () => data });
  if (mode === 'down') throw new Error('connect ECONNREFUSED');
  const name = u.pathname.split('/').pop();
  if (name === 'status') return reply(200, mode === 'off' ? { enabled: false } : { enabled: true, backend: 'postgresql', queued: 0, written: 5400, dropped: 2, last_error: null, retention_days: 90 });
  if (mode === 'dbdown') return reply(503, { detail: 'The usage database is unavailable', errors: [] });
  if (name === 'summary') return reply(200, summary);
  if (name === 'timeseries') return reply(200, { window: {}, interval: 'hour', points });
  if (name === 'storage') return reply(200, mode === 'nostats' ? { ...storage, tables_bytes: null, tables: storage.tables.map((x) => ({ ...x, table_bytes: null, index_bytes: null, total_bytes: null })), backend: 'sqlite' } : storage);
  if (name === 'routes') return reply(200, { window: {}, routes });
  if (name === 'question-types') return reply(200, { window: {}, question_types: types });
  if (name === 'recent' && u.searchParams.get('kind') === 'evaluations') {
    return reply(200, { kind: 'evaluations', rows: [{ ts: '2026-10-11T10:00:00Z', question_type: 'READING', source: 'section', status: 'COMPLETED', score: 0.9,
      total_ms: 2500, audio_seconds: 9.5, whisper_audio_seconds: 9.5, gemini_tokens: 0, mocked: false, flags: ['CLIPPING'], error_stage: null }] });
  }
  if (name === 'recent') {
    return reply(200, { kind: 'requests', rows: [{ ts: '2026-10-11T10:00:00Z', method: 'POST', route: '/api/v1/evaluate', category: 'evaluation', status_code: 429,
      duration_ms: 3.2, client: 'cred:ab12cd34', request_bytes: 2048, node: 'n' }] });
  }
  return reply(404, { detail: 'nope' });
};

// ---- monitoring on ------------------------------------------------------------------------------------
let view = buildUsageView({ autoRefresh: false });
document.body.append(view);
await tick(100);
let t = text(view);
assert.match(t, /API calls1,234/);
assert.match(t, /61 errors \(5%\)/);
assert.match(t, /Whisper evaluations321/);
assert.match(t, /Audio transcribed1 h 2 min 5 s/);
assert.match(t, /Gemini tokens100,000/);
assert.match(t, /in 60,000 · out 30,000 · thinking 10,000/);
assert.match(t, /Sync \/ async \/ section100 \/ 50 \/ 250/);
assert.match(t, /Average score81%/);
assert.match(t, /Database size8\.00 MBPostgreSQL · speechjudge/);
assert.match(t, /Usage tables2\.00 MB25% of the database/);
assert.match(t, /Rows stored5,000older rows are deleted after 90 days/);
assert.match(t, /api_requests4,000600 KB400 KB1\.00 MB50%/, 'per-table size, data, indexes, share');
assert.match(t, /evaluations1,000700 KB300 KB1000 KB49%/);
assert.match(t, /metrics_schema–8\.00 KB16\.0 KB24\.0 KB1%/);
assert.match(t, /Database size.*Table.*Rows.*Data.*Indexes.*Total/);
assert.match(t, /Database: postgresql · events written 5,400 · waiting 0 · dropped 2/);
assert.equal(view.querySelectorAll('figure.chart').length, 4);
assert.equal(view.querySelectorAll('svg.chart-svg').length, 4);
assert.match(t, /API calls per hour/);
assert.match(t, /Audio transcribed by Whisper \(minutes\) per hour/);
assert.match(t, /Time series as a table/);
assert.match(t, /\/api\/v1\/evaluate\/section/);
assert.match(t, /\/api\/v1\/jobs\/\{job_id\}/);
assert.doesNotMatch(t, /\/api\/v1\/ready/, 'monitoring routes are hidden until asked for');
assert.match(t, /READING.*EMAIL_WRITING/);
assert.match(t, /EMAIL_WRITING101000.4\.00 s/, 'no score shows a dash');          // cells are adjacent in textContent
assert.match(t, /429/);
assert.match(t, /cred:ab12cd34/);

// the controls change what is requested
calls.length = 0;
const select = view.querySelector('#usage-range');
select.value = '7d';
select.dispatchEvent(new dom.window.Event('change'));
await tick(100);
assert.ok(calls.some((u) => u.includes('/summary') && u.includes('range=7d')), calls.join('\n'));
assert.ok(calls.some((u) => u.includes('/timeseries') && u.includes('include_monitoring=false')));
calls.length = 0;
const boxes = view.querySelectorAll('input[type=checkbox]');
boxes[0].checked = true; boxes[0].dispatchEvent(new dom.window.Event('change'));     // include monitoring calls
await tick(100);
assert.ok(calls.some((u) => u.includes('/summary') && u.includes('include_monitoring=true')));
assert.match(text(view), /\/api\/v1\/ready/);
boxes[1].checked = true; boxes[1].dispatchEvent(new dom.window.Event('change'));     // exclude mock traffic
await tick(100);
assert.ok(calls.some((u) => u.includes('/question-types') && u.includes('exclude_mocked=true')));

// latest evaluations
const recent = view.querySelector('#usage-recent');
recent.value = 'evaluations';
recent.dispatchEvent(new dom.window.Event('change'));
await tick(100);
assert.match(text(view), /READINGsectionCOMPLETED90%2\.50 s9\.5 s9\.5 s0CLIPPING/);
view.stop();

// SQLite without per-table statistics: dashes, not crashes
mode = 'nostats';
view = buildUsageView({ autoRefresh: false });
await tick(100);
assert.match(text(view), /Database size8\.00 MBsqlite · speechjudge/);
assert.match(text(view), /Usage tables–data \+ indexes/);
assert.match(text(view), /api_requests4,000–––/);
assert.equal(view.querySelector('.banner.error'), null);
view.stop();

// ---- monitoring off / backend down / database down -----------------------------------------------------
mode = 'off';
view = buildUsageView({ autoRefresh: false });
await tick(60);
assert.match(text(view), /Usage monitoring is off on this server\. Set SJ_DATABASE_URL/);
assert.equal(view.querySelectorAll('figure.chart').length, 0);

mode = 'down';
view = buildUsageView({ autoRefresh: false });
await tick(60);
assert.match(text(view), /Backend unreachable/);

mode = 'dbdown';
view = buildUsageView({ autoRefresh: false });
await tick(60);
assert.match(text(view), /The usage database is unavailable/);
assert.ok(view.querySelector('.banner.error'));

console.log('usage tab tests passed');
