/**
 * Sample VocalQ usage, for looking at the Monitoring page while the speech judge is not available.
 *
 * Switched on with SPEECHJUDGE_MOCK=true (services/monitoring/vocalqMetricsService.js). It builds
 * the same reports SpeechJudge's /api/v1/metrics API sends (status, summary, timeseries,
 * question-types, storage) and its /ready answer, in the same shape and units, so the page and the
 * service cannot tell the difference. Nothing here is real: the page labels it as sample data.
 *
 * The time series is made first, with a school-day rhythm (busy mornings and afternoons, quiet
 * nights and Sundays), and every total is the sum of its points, so the figures agree with each
 * other the way real ones do. The numbers are stable: a bucket always gets the same values.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const IST_OFFSET = 330 * 60 * 1000;

const RANGE_MS = { "1h": HOUR, "6h": 6 * HOUR, "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY, "90d": 90 * DAY };
const STEP_MS = { minute: 60 * 1000, hour: HOUR, day: DAY };

/** The same choice the judge makes: minutes up to 2 hours, hours up to 8 days, then days. */
const intervalFor = (spanMs) => (spanMs <= 2 * HOUR ? "minute" : spanMs <= 8 * DAY ? "hour" : "day");

const floorTo = (ms, interval) => Math.floor(ms / STEP_MS[interval]) * STEP_MS[interval];
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, ".000Z").replace(".000Z", "Z");

/** A small seeded random generator (mulberry32): the same seed always gives the same numbers. */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How busy a moment is, from 0 (night) to 1 (a class taking a test), in IST. */
function busyness(ms) {
  const local = new Date(ms + IST_OFFSET);
  const hour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const weekday = local.getUTCDay(); // 0 = Sunday
  const daytime = hour >= 8 && hour <= 21 ? Math.sin(((hour - 8) / 13) * Math.PI) : 0.04;
  const lunchDip = hour >= 12.5 && hour <= 13.5 ? 0.6 : 1;
  const week = weekday === 0 ? 0.12 : weekday === 6 ? 0.45 : 1;
  return daytime * lunchDip * week;
}

/** Evaluations at the busiest moment of one bucket, by bucket size. */
const PEAK_EVALUATIONS = { minute: 7, hour: 110, day: 900 };

function makePoints(startMs, endMs, interval) {
  const step = STEP_MS[interval];
  const points = [];
  for (let t = floorTo(startMs, interval); t <= endMs; t += step) {
    const rnd = random(Math.floor(t / 60000) * 31 + 7);
    // A day bucket averages the whole day; hours and minutes follow the clock
    const raw = interval === "day" ? 0.2 + 0.5 * busyness(t + 12 * HOUR) : busyness(t + step / 2);
    const level = Math.max(raw, 0.09); // even a quiet night has a few recordings
    const burst = rnd() > 0.93 ? 1.8 : 1; // now and then a whole class submits together
    const evaluations = Math.round(PEAK_EVALUATIONS[interval] * level * burst * (0.7 + rnd() * 0.6));
    const failed = evaluations ? Math.round(evaluations * (rnd() > 0.7 ? 0.04 : 0.008) + (rnd() > 0.985 ? 2 : 0)) : 0;
    const whisperEvaluations = Math.max(0, evaluations - Math.round(evaluations * 0.05));
    const apiRequests = Math.round(evaluations * (4.2 + rnd() * 1.2) + (interval === "day" ? 60 : interval === "hour" ? 3 : 0));
    const apiErrors = Math.round(apiRequests * (0.012 + rnd() * 0.02));
    const geminiCalls = Math.round(evaluations * (0.52 + rnd() * 0.1));
    points.push({
      bucket: iso(t),
      api_requests: apiRequests,
      api_errors: apiErrors,
      api_server_errors: apiErrors > 3 && rnd() > 0.6 ? Math.round(apiErrors * 0.25) : 0,
      evaluations,
      failed_attempts: failed,
      whisper_evaluations: whisperEvaluations,
      whisper_audio_seconds: Math.round(whisperEvaluations * (8 + rnd() * 9) * 100) / 100,
      pronunciation_evaluations: Math.round(evaluations * 0.78),
      gemini_calls: geminiCalls,
      gemini_tokens: Math.round(geminiCalls * (1500 + rnd() * 900)),
      avg_evaluation_ms: evaluations ? Math.round((1500 + rnd() * 900) * 10) / 10 : null,
    });
  }
  return points;
}

const sum = (points, read) => points.reduce((total, point) => total + (read(point) || 0), 0);
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Splits `total` into whole parts by `weights` so the parts add up to exactly `total`. */
function split(total, weights) {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

// Per question type: share of runs, average score, average time (ms), seconds of audio per run,
// and whether its answers get written feedback from the language model
const TYPES = [
  { type: "READING", share: 26, score: 0.78, ms: 1650, audio: 11, feedback: 0 },
  { type: "REPEAT", share: 22, score: 0.71, ms: 1400, audio: 6, feedback: 0 },
  { type: "JUMBLED", share: 14, score: 0.69, ms: 1900, audio: 9, feedback: 0.2 },
  { type: "QUESTION_ANSWER", share: 20, score: 0.66, ms: 2700, audio: 17, feedback: 1 },
  { type: "STORYTELLING", share: 18, score: 0.62, ms: 3400, audio: 38, feedback: 1 },
];

function makeQuestionTypes(summary) {
  const { evaluations: e, whisper: w, gemini: g } = summary;
  const runs = split(e.runs, TYPES.map((t) => t.share));
  const failed = split(e.failed_attempts, runs);
  const rejected = split(e.low_audio_quality, runs);
  const audio = split(Math.round(w.audio_seconds), TYPES.map((t, i) => runs[i] * t.audio));
  const calls = split(g.calls, TYPES.map((t, i) => runs[i] * t.feedback + 0.001));
  const tokens = split(g.total_tokens, calls.map((count) => count + 0.001));
  return TYPES.map((t, i) => ({
    question_type: t.type,
    runs: runs[i],
    completed: Math.max(0, runs[i] - failed[i] - rejected[i]),
    low_audio_quality: rejected[i],
    failed_attempts: failed[i],
    avg_score: runs[i] ? round(t.score, 4) : null,
    avg_ms: runs[i] ? t.ms : 0,
    whisper_evaluations: Math.round(runs[i] * 0.95),
    whisper_audio_seconds: audio[i],
    gemini_calls: calls[i],
    gemini_tokens: tokens[i],
  }));
}

function makeSummary(points, start, end) {
  const requests = sum(points, (p) => p.api_requests);
  const errors = sum(points, (p) => p.api_errors);
  const serverErrors = sum(points, (p) => p.api_server_errors);
  const runs = sum(points, (p) => p.evaluations);
  const failed = sum(points, (p) => p.failed_attempts);
  const lowAudio = Math.round(runs * 0.04);
  const audioSeconds = sum(points, (p) => p.whisper_audio_seconds);
  const whisperRuns = sum(points, (p) => p.whisper_evaluations);
  const geminiTokens = sum(points, (p) => p.gemini_tokens);
  const [viaSync, viaAsync, viaSection] = split(runs, [6, 9, 85]);

  return {
    window: { from: iso(start), to: iso(end) },
    api: {
      requests,
      errors,
      server_errors: serverErrors,
      unauthorized: Math.round(errors * 0.3),
      rate_limited: Math.round(errors * 0.04),
      error_rate: requests ? round(errors / requests, 4) : 0,
      avg_ms: 41.6,
      max_ms: 4230.2,
      request_bytes: requests * 1180,
      by_status_class: { "2xx": requests - errors, "3xx": 0, "4xx": errors - serverErrors, "5xx": serverErrors },
      by_category: {}, // filled in from the routes (buildSampleReports)
    },
    evaluations: {
      runs,
      completed: Math.max(0, runs - failed - lowAudio),
      low_audio_quality: lowAudio,
      failed_attempts: failed,
      avg_score: runs ? 0.7 : null,
      avg_ms: 2140.6,
      max_ms: 9860.4,
      mocked: 0,
      by_source: { sync: viaSync, async: viaAsync, section: viaSection },
      avg_stage_ms: { stt: 410.3, pronunciation: 372.8, acoustic: 118.5, language: 905.2 },
    },
    whisper: {
      evaluations: whisperRuns,
      audio_seconds: round(audioSeconds, 2),
      avg_audio_seconds: whisperRuns ? round(audioSeconds / whisperRuns, 2) : 0,
    },
    pronunciation: {
      evaluations: sum(points, (p) => p.pronunciation_evaluations),
      audio_seconds: round(audioSeconds * 0.8, 2),
    },
    gemini: {
      calls: sum(points, (p) => p.gemini_calls),
      prompt_tokens: Math.round(geminiTokens * 0.62),
      output_tokens: Math.round(geminiTokens * 0.18),
      thinking_tokens: geminiTokens - Math.round(geminiTokens * 0.62) - Math.round(geminiTokens * 0.18),
      total_tokens: geminiTokens,
    },
  };
}

function makeRoutes(summary, now) {
  const { requests, errors, server_errors: serverErrors } = summary.api;
  const hits = {
    section: Math.round(requests * 0.14),
    evaluate: Math.round(requests * 0.05),
    async: Math.round(requests * 0.03),
    unmatched: Math.round(requests * 0.004),
  };
  hits.jobs = requests - hits.section - hits.evaluate - hits.async - hits.unmatched;

  // Server errors belong to the section upload; the other errors are spread over the rest
  const clientErrors = errors - serverErrors;
  const fails = {
    section: serverErrors + Math.round(clientErrors * 0.15),
    evaluate: Math.round(clientErrors * 0.4),
    async: Math.round(clientErrors * 0.05),
    unmatched: Math.min(hits.unmatched, Math.round(clientErrors * 0.3)),
  };
  fails.jobs = Math.max(0, errors - fails.section - fails.evaluate - fails.async - fails.unmatched);

  const row = (method, route, category, key, avg, p95, max, secondsAgo) => ({
    method,
    route,
    category,
    hits: hits[key],
    errors: fails[key],
    server_errors: key === "section" ? serverErrors : 0,
    avg_ms: avg,
    max_ms: max,
    last_seen: iso(now - secondsAgo * 1000),
    p95_ms: p95,
  });
  return [
    row("GET", "/api/v1/jobs/{job_id}", "jobs", "jobs", 11.4, 28.1, 492.3, 4),
    row("POST", "/api/v1/evaluate/section", "evaluation", "section", 343.2, 1250.6, 2980.4, 31),
    row("POST", "/api/v1/evaluate", "evaluation", "evaluate", 640.8, 1890.2, 3120.9, 190),
    row("POST", "/api/v1/evaluate/async", "evaluation", "async", 121.5, 410.7, 880.1, 760),
    row("GET", "(unmatched)", "other", "unmatched", 4.8, 26.4, 33.0, 5400),
  ].filter((entry) => entry.hits > 0);
}
function makeStorage(now) {
  const kept = 90; // days the sample judge keeps its events
  const apiRows = 412_800;
  const evalRows = 61_950;
  const apiData = apiRows * 118;
  const evalData = evalRows * 264;
  const table = (name, rows, data, indexes) => ({
    name,
    table_bytes: data,
    index_bytes: indexes,
    total_bytes: data + indexes,
    rows,
    oldest: iso(now - kept * DAY),
    newest: iso(now),
  });
  const tables = [
    table("api_requests", apiRows, apiData, Math.round(apiData * 0.55)),
    table("evaluations", evalRows, evalData, Math.round(evalData * 0.42)),
    { name: "metrics_schema", table_bytes: 8192, index_bytes: 0, total_bytes: 8192, rows: null, oldest: null, newest: null },
  ];
  const tablesBytes = tables.reduce((total, t) => total + t.total_bytes, 0);
  return {
    backend: "postgresql",
    database: "speechjudge_usage",
    database_bytes: tablesBytes + 9_700_000, // the engine's own catalogs
    tables_bytes: tablesBytes,
    tables,
    retention_days: kept,
  };
}

/**
 * Everything the service asks the judge for, as sample data.
 * @param {string} range one of 1h, 6h, 24h, 7d, 30d, 90d
 * @param {number} [now] the moment to end at (ms), for repeatable output
 */
function buildSampleReports(range, now = Date.now()) {
  const span = RANGE_MS[range] || RANGE_MS["24h"];
  const start = now - span;
  const interval = intervalFor(span);
  const points = makePoints(start, now, interval);
  const summary = makeSummary(points, start, now);
  const routes = makeRoutes(summary, now);
  // Calls by kind, from the routes, plus the health and metrics calls the summary leaves out
  const byCategory = {};
  routes.forEach((entry) => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + entry.hits;
  });
  summary.api.by_category = { ...byCategory, monitoring: Math.round(summary.api.requests * 0.02) };

  return {
    ready: { ready: true, status: "ready", whisper: true, gopt: true, gemini: true, acoustic: true, mocked: [] },
    status: {
      enabled: true,
      backend: "postgresql",
      queued: 0,
      written: 482_300,
      dropped: 0,
      last_error: null,
      retention_days: 90,
    },
    summary,
    timeseries: { window: { from: iso(start), to: iso(now) }, interval, points },
    routes: { window: summary.window, routes },
    questionTypes: { question_types: makeQuestionTypes(summary) },
    storage: makeStorage(now),
  };
}

module.exports = { buildSampleReports };
