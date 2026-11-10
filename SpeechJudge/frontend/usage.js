// "Usage" tab: API calls, evaluations, Whisper audio and Gemini tokens over time, read from the backend's
// usage database (GET /api/v1/metrics/*). Nothing is computed in the browser except formatting.
import { h, fmt, pct } from './dom.js';
import { errorText, getUsage } from './api.js';

const RANGES = [['1h', 'Last hour'], ['6h', 'Last 6 hours'], ['24h', 'Last 24 hours'], ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'], ['90d', 'Last 90 days']];
const REFRESH_MS = 30000;
const SVG_NS = 'http://www.w3.org/2000/svg';

const int = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('en-US') : '–');
const ms = (n) => (typeof n === 'number' ? (n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${n.toFixed(0)} ms`) : '–');

/** 1536 -> "1.50 KB" (1024 based, like PostgreSQL's pg_size_pretty) */
export function bytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '–';
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
}

/** 3725 -> "1 h 2 min 5 s" */
export function duration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '–';
  const total = Math.round(seconds);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh) return `${hh} h ${mm} min ${ss} s`;
  if (mm) return `${mm} min ${ss} s`;
  return `${ss} s`;
}

const svg = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
};

/** Label for an ISO bucket start: time of day for minutes / hours, date for days. */
export function bucketLabel(iso, interval) {
  const d = new Date(iso);
  if (interval === 'day') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (interval === 'hour') return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Stacked bar chart as inline SVG. series = [{ label, cls, value: (point) => number }], bottom to top.
 */
export function barChart({ title, points, interval, series, format = int }) {
  const W = 640; const H = 170; const left = 46; const bottom = 24; const top = 8;
  const plotW = W - left - 6; const plotH = H - bottom - top;
  const totals = points.map((p) => series.reduce((s, x) => s + (x.value(p) || 0), 0));
  const max = Math.max(...totals, 0);
  const slot = points.length ? plotW / points.length : plotW;
  const barW = Math.max(1, slot - (slot > 6 ? 2 : 0));
  const summary = `${title}: total ${format(totals.reduce((a, b) => a + b, 0))}, peak ${format(max)} per ${interval}`;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': summary, preserveAspectRatio: 'none' });
  // grid + y labels
  for (const f of [0, 0.5, 1]) {
    const y = top + plotH - plotH * f;
    root.append(svg('line', { x1: left, x2: W - 6, y1: y, y2: y, class: 'chart-grid' }),
      svg('text', { x: left - 4, y: y + 3, class: 'chart-axis', 'text-anchor': 'end' }, max ? format(max * f) : (f === 0 ? '0' : '')));
  }
  points.forEach((p, i) => {
    let y = top + plotH;
    const tip = [`${bucketLabel(p.bucket, interval)}`, ...series.map((s) => `${s.label}: ${format(s.value(p) || 0)}`)].join('\n');
    const g = svg('g', { class: 'chart-bar' }, svg('title', {}, tip));
    for (const s of series) {
      const v = s.value(p) || 0;
      const hgt = max ? (v / max) * plotH : 0;
      if (hgt <= 0) continue;
      y -= hgt;
      g.append(svg('rect', { x: left + i * slot, y, width: barW, height: hgt, class: s.cls }));
    }
    root.append(g);
  });
  // x labels: first, middle, last
  [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => points.length && a.indexOf(v) === i)
    .forEach((i, k, arr) => root.append(svg('text', {
      x: left + i * slot + (k === 0 ? 0 : k === arr.length - 1 ? barW : barW / 2), y: H - 6, class: 'chart-axis',
      'text-anchor': k === 0 ? 'start' : k === arr.length - 1 ? 'end' : 'middle',
    }, bucketLabel(points[i].bucket, interval))));
  const legend = h('div', { class: 'chart-legend' }, series.map((s) => h('span', {}, h('i', { class: `swatch ${s.cls}` }), ` ${s.label}`)));
  return h('figure', { class: 'chart' }, h('figcaption', {}, title), root, legend);
}

function card(label, value, sub) {
  return h('div', { class: 'stat' }, h('span', { class: 'k' }, label), h('span', { class: 'big' }, value),
    sub ? h('span', { class: 'sub' }, sub) : null);
}

function table(headers, rows, empty = 'Nothing in this window.') {
  if (!rows.length) return h('p', { class: 'muted' }, empty);
  return h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, headers.map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '–');

export function buildUsageView({ autoRefresh = true } = {}) {
  const state = { range: '24h', includeMonitoring: false, excludeMocked: false, recentKind: 'requests', timer: null };

  const banner = h('div', { role: 'status', 'aria-live': 'polite' });
  const stamp = h('span', { class: 'muted small' }, '');
  const cards = h('div', { class: 'stats' });
  const charts = h('div', { class: 'charts' });
  const routesBox = h('div', {});
  const typesBox = h('div', {});
  const recentBox = h('div', {});
  const dataBox = h('div', {});
  const storageBox = h('div', {});
  const writerBox = h('p', { class: 'muted small' }, '');

  const rangeSelect = h('select', { id: 'usage-range', onchange: (e) => { state.range = e.target.value; load(); } },
    RANGES.map(([v, label]) => h('option', { value: v, selected: v === state.range }, label)));
  const monitoring = h('input', { type: 'checkbox', onchange: (e) => { state.includeMonitoring = e.target.checked; load(); } });
  const mocked = h('input', { type: 'checkbox', onchange: (e) => { state.excludeMocked = e.target.checked; load(); } });
  const auto = h('input', { type: 'checkbox', checked: autoRefresh, onchange: schedule });
  const recentSelect = h('select', { id: 'usage-recent', onchange: (e) => { state.recentKind = e.target.value; loadRecent(); } },
    h('option', { value: 'requests' }, 'API calls'), h('option', { value: 'evaluations' }, 'Evaluations'));

  const params = () => ({ range: state.range, include_monitoring: state.includeMonitoring, exclude_mocked: state.excludeMocked });
  const fail = (text) => banner.replaceChildren(h('div', { class: 'banner error' }, text));

  async function load() {
    banner.replaceChildren();
    let status;
    try { status = await getUsage('status'); } catch (e) { fail(`Backend unreachable: ${e.message || e}`); return; }
    if (!status.ok) { fail(errorText(status)); return; }
    if (!status.data.enabled) {
      cards.replaceChildren(); charts.replaceChildren();
      for (const box of [routesBox, typesBox, recentBox, dataBox, storageBox]) box.replaceChildren();
      banner.replaceChildren(h('div', { class: 'banner warn' },
        'Usage monitoring is off on this server. Set SJ_DATABASE_URL (PostgreSQL) in the backend .env and restart the API and worker.'));
      writerBox.textContent = '';
      return;
    }
    const w = status.data;
    writerBox.textContent = `Database: ${w.backend} · events written ${int(w.written)} · waiting ${int(w.queued)} · dropped ${int(w.dropped)}`
      + (w.last_error ? ` · last error: ${w.last_error}` : '') + ` · rows kept ${w.retention_days ? `${w.retention_days} days` : 'forever'}`;
    const [sum, ts, routes, types, storage] = await Promise.all([
      getUsage('summary', params()), getUsage('timeseries', params()),
      getUsage('routes', { range: state.range, include_monitoring: true }),
      getUsage('question-types', { range: state.range, exclude_mocked: state.excludeMocked }),
      getUsage('storage')]);
    const bad = [sum, ts, routes, types].find((r) => !r.ok);
    if (bad) { fail(errorText(bad)); return; }
    renderSummary(sum.data);
    renderCharts(ts.data);
    renderRoutes(routes.data.routes);
    renderTypes(types.data.question_types);
    if (storage.ok) renderStorage(storage.data);
    else {        // an older backend has no /metrics/storage: keep everything else on screen
      storageBox.replaceChildren(h('div', { class: 'banner warn' }, storage.status === 404
        ? 'Database size is not available: this backend is older than the console. Restart the API (and worker) to load the new version.'
        : `Database size is not available: ${errorText(storage)}`));
    }
    await loadRecent();
    stamp.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  }

  function renderSummary(s) {
    const a = s.api; const e = s.evaluations; const g = s.gemini;
    cards.replaceChildren(
      card('API calls', int(a.requests), `${int(a.errors)} errors (${pct(a.error_rate)}) · ${int(a.server_errors)} server · ${int(a.unauthorized)} unauthorized`),
      card('API latency', ms(a.avg_ms), `slowest ${ms(a.max_ms)}`),
      card('Evaluations', int(e.completed + e.low_audio_quality), `${int(e.completed)} scored · ${int(e.low_audio_quality)} audio rejected · ${int(e.failed_attempts)} failed attempts`),
      card('Sync / async / section', `${int(e.by_source.sync)} / ${int(e.by_source.async)} / ${int(e.by_source.section)}`, 'evaluation runs by entry point'),
      card('Whisper evaluations', int(s.whisper.evaluations), 'questions whose audio was transcribed'),
      card('Audio transcribed', duration(s.whisper.audio_seconds), `${fmt(s.whisper.audio_seconds, 1)} s · avg ${fmt(s.whisper.avg_audio_seconds, 1)} s each`),
      card('Pronunciation checks', int(s.pronunciation.evaluations), `${duration(s.pronunciation.audio_seconds)} of audio`),
      card('Gemini calls', int(g.calls), 'incl. retries'),
      card('Gemini tokens', int(g.total_tokens), `in ${int(g.prompt_tokens)} · out ${int(g.output_tokens)} · thinking ${int(g.thinking_tokens)}`),
      card('Avg evaluation time', ms(e.avg_ms), `stt ${ms(e.avg_stage_ms.stt)} · pron. ${ms(e.avg_stage_ms.pronunciation)} · gemini ${ms(e.avg_stage_ms.language)}`),
      card('Average score', e.avg_score == null ? '–' : pct(e.avg_score), 'of scored evaluations'),
      card('Mock traffic', int(e.mocked), 'runs that used a placeholder service'));
  }

  function renderCharts(t) {
    const { points, interval } = t;
    charts.replaceChildren(
      barChart({ title: `API calls per ${interval}`, points, interval, series: [
        { label: 'OK', cls: 'fill-good', value: (p) => p.api_requests - p.api_errors },
        { label: 'Errors (4xx / 5xx)', cls: 'fill-low', value: (p) => p.api_errors }] }),
      barChart({ title: `Evaluations per ${interval}`, points, interval, series: [
        { label: 'Finished', cls: 'fill-accent', value: (p) => p.evaluations - p.failed_attempts },
        { label: 'Failed attempts', cls: 'fill-low', value: (p) => p.failed_attempts }] }),
      barChart({ title: `Audio transcribed by Whisper (minutes) per ${interval}`, points, interval,
        series: [{ label: 'Minutes', cls: 'fill-accent', value: (p) => p.whisper_audio_seconds / 60 }], format: (n) => fmt(n, 1) }),
      barChart({ title: `Gemini tokens per ${interval}`, points, interval,
        series: [{ label: 'Tokens', cls: 'fill-mid', value: (p) => p.gemini_tokens }] }));
    dataBox.replaceChildren(h('details', {}, h('summary', {}, 'Time series as a table'),
      table(['Time', 'API calls', 'Errors', 'Evaluations', 'Failed attempts', 'Whisper evals', 'Audio (s)', 'Gemini calls', 'Gemini tokens', 'Avg eval'],
        points.map((p) => [bucketLabel(p.bucket, interval), int(p.api_requests), int(p.api_errors), int(p.evaluations),
          int(p.failed_attempts), int(p.whisper_evaluations), fmt(p.whisper_audio_seconds, 1), int(p.gemini_calls),
          int(p.gemini_tokens), ms(p.avg_evaluation_ms)]))));
  }

  function renderRoutes(rows) {
    const shown = state.includeMonitoring ? rows : rows.filter((r) => r.category !== 'monitoring');
    routesBox.replaceChildren(table(['Method', 'Route', 'Kind', 'Calls', 'Errors', '5xx', 'Avg', 'p95', 'Slowest', 'Last call'],
      shown.map((r) => [r.method, r.route, r.category, int(r.hits), int(r.errors), int(r.server_errors), ms(r.avg_ms),
        r.p95_ms == null ? '–' : ms(r.p95_ms), ms(r.max_ms), when(r.last_seen)]), 'No API calls in this window.'));
  }

  function renderTypes(rows) {
    typesBox.replaceChildren(table(['Question type', 'Runs', 'Scored', 'Audio rejected', 'Failed attempts', 'Avg score', 'Avg time',
      'Whisper evals', 'Audio transcribed', 'Gemini calls', 'Gemini tokens'],
    rows.map((r) => [r.question_type, int(r.runs), int(r.completed), int(r.low_audio_quality), int(r.failed_attempts),
      r.avg_score == null ? '–' : pct(r.avg_score), ms(r.avg_ms), int(r.whisper_evaluations), duration(r.whisper_audio_seconds),
      int(r.gemini_calls), int(r.gemini_tokens)]), 'No evaluations in this window.'));
  }

  function renderStorage(s) {
    const events = s.tables.filter((x) => x.rows != null);
    const rows = events.reduce((sum, x) => sum + x.rows, 0);
    const share = s.tables_bytes != null && s.database_bytes ? s.tables_bytes / s.database_bytes : null;
    storageBox.replaceChildren(
      h('div', { class: 'stats' },
        card('Database size', bytes(s.database_bytes), `${s.backend === 'postgresql' ? 'PostgreSQL' : s.backend} · ${s.database}`),
        card('Usage tables', bytes(s.tables_bytes), share == null ? 'data + indexes' : `${pct(share)} of the database (the rest is the engine's own catalogs)`),
        card('Rows stored', int(rows), s.retention_days ? `older rows are deleted after ${s.retention_days} days` : 'rows are kept forever'),
        card('Average row', rows && s.tables_bytes != null ? bytes(s.tables_bytes / rows) : '–', 'data + indexes per event row')),
      table(['Table', 'Rows', 'Data', 'Indexes', 'Total', 'Share of tables', 'Per row', 'Oldest row', 'Newest row'],
        s.tables.map((x) => [x.name, x.rows == null ? '–' : int(x.rows), bytes(x.table_bytes), bytes(x.index_bytes), bytes(x.total_bytes),
          x.total_bytes != null && s.tables_bytes ? pct(x.total_bytes / s.tables_bytes) : '–',
          x.rows && x.total_bytes != null ? bytes(x.total_bytes / x.rows) : '–', when(x.oldest), when(x.newest)]),
        'No usage tables yet: they are created when the first event is written.'));
  }

  async function loadRecent() {
    const r = await getUsage('recent', { kind: state.recentKind, limit: 50, include_monitoring: state.includeMonitoring, exclude_mocked: state.excludeMocked });
    if (!r.ok) { recentBox.replaceChildren(h('div', { class: 'banner error' }, errorText(r))); return; }
    recentBox.replaceChildren(state.recentKind === 'requests'
      ? table(['Time', 'Method', 'Route', 'Status', 'Time taken', 'Caller', 'Body'],
        r.data.rows.map((x) => [when(x.ts), x.method, x.route, h('span', { class: `badge ${x.status_code < 400 ? 'pass' : 'fail'}` }, x.status_code),
          ms(x.duration_ms), x.client || '–', x.request_bytes == null ? '–' : `${int(x.request_bytes)} B`]))
      : table(['Time', 'Type', 'Entry', 'Status', 'Score', 'Time taken', 'Audio', 'Whisper audio', 'Gemini tokens', 'Flags / stage'],
        r.data.rows.map((x) => [when(x.ts), x.question_type, x.source, x.status, x.score == null ? '–' : pct(x.score), ms(x.total_ms),
          x.audio_seconds == null ? '–' : `${fmt(x.audio_seconds, 1)} s`, `${fmt(x.whisper_audio_seconds, 1)} s`, int(x.gemini_tokens),
          [x.mocked ? 'MOCK' : null, ...x.flags, x.error_stage ? `failed at ${x.error_stage}` : null].filter(Boolean).join(', ')])));
  }

  function schedule() {
    clearInterval(state.timer);
    state.timer = null;
    if (auto.checked) state.timer = setInterval(() => { if (document.body.contains(root)) load(); }, REFRESH_MS);
  }

  const root = h('div', { class: 'view' },
    h('p', { class: 'muted' }, 'Every API call and every evaluation the backend handled, stored in its database. Times are shown in your local time zone.'),
    h('div', { class: 'row wrap' },
      h('label', { for: 'usage-range' }, 'Period'), rangeSelect,
      h('label', { class: 'inline' }, monitoring, ' Include health / ready / metrics calls'),
      h('label', { class: 'inline' }, mocked, ' Exclude mock traffic'),
      h('label', { class: 'inline' }, auto, ' Refresh every 30 s'),
      h('button', { type: 'button', class: 'btn', onclick: load }, 'Refresh'), stamp),
    banner, cards, charts, dataBox,
    h('section', { class: 'panel' }, h('h3', {}, 'Database size'), storageBox),
    h('section', { class: 'panel' }, h('h3', {}, 'API calls by route'), routesBox),
    h('section', { class: 'panel' }, h('h3', {}, 'Evaluations by question type'), typesBox),
    h('section', { class: 'panel' },
      h('div', { class: 'row' }, h('h3', {}, 'Latest'), recentSelect), recentBox),
    writerBox);
  load().then(schedule);
  root.refresh = load;                      // called when the tab is shown again
  root.stop = () => clearInterval(state.timer);
  return root;
}
