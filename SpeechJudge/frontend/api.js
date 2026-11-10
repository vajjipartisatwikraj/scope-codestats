// Thin client for the Speech Judge API (via the local proxy, which adds the credential).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  return { status: res.status, ok: res.ok, data };
}

// ---- benchmarks (run on the server; see backend benchmarks/ and SJ_BENCHMARKS_ENABLED) -----------
export const getBenchmarks = () => call('GET', '/api/v1/benchmarks');
export const startBenchmark = (body) => call('POST', '/api/v1/benchmarks/run', body);
export const getBenchmarkRun = (runId) => call('GET', `/api/v1/benchmarks/runs/${encodeURIComponent(runId)}`);
// ---- usage monitoring (database-backed, see backend app/api/metrics.py) --------------------------------
export const getUsage = (name, params = {}) => call('GET', `/api/v1/metrics/${name}?${new URLSearchParams(params)}`);

export const getBenchmarkResults = () => call('GET', '/api/v1/benchmarks/results');

export async function getReady() {
  try {
    const r = await call('GET', '/api/v1/ready');
    return { reachable: r.status === 200 || r.status === 503, ...r.data };
  } catch {
    return { reachable: false };
  }
}

export function errorText(r) {
  const d = r.data || {};
  const extra = (d.errors || []).length ? ` (${d.errors.join('; ')})` : '';
  return `HTTP ${r.status}: ${d.detail || 'request failed'}${extra}`;
}

// Returns { ok, result, error, httpStatus, jobId, elapsedMs }
//   result = EvaluationResult JSON when the service produced one (including FAILED /
//   LOW_AUDIO_QUALITY statuses); error = transport/validation problem text otherwise.
export async function evaluate(body, { mode = 'sync', onProgress } = {}) {
  const t0 = performance.now();
  const done = (extra) => ({ elapsedMs: performance.now() - t0, ...extra });

  if (mode === 'sync') {
    onProgress?.('Evaluating (sync)…');
    const r = await call('POST', '/api/v1/evaluate', body);
    if (!r.ok) return done({ ok: false, error: errorText(r), httpStatus: r.status });
    return done({ ok: true, result: r.data, httpStatus: r.status });
  }

  onProgress?.('Submitting job…');
  const sub = await call('POST', '/api/v1/evaluate/async', body);
  if (sub.status !== 202) return done({ ok: false, error: errorText(sub), httpStatus: sub.status });
  const jobId = sub.data.job_id;
  for (;;) {
    await sleep(1000);
    const j = await call('GET', `/api/v1/jobs/${jobId}`);
    if (!j.ok) return done({ ok: false, error: errorText(j), httpStatus: j.status, jobId });
    const secs = Math.round((performance.now() - t0) / 1000);
    onProgress?.(`Job ${j.data.status.toLowerCase()}… ${secs}s`);
    if (j.data.status === 'COMPLETED') return done({ ok: true, result: j.data.result, httpStatus: 200, jobId });
    if (j.data.status === 'FAILED') {
      return done({ ok: false, error: `Job failed: ${j.data.reason || 'unknown reason'}`, httpStatus: 200, jobId });
    }
  }
}
