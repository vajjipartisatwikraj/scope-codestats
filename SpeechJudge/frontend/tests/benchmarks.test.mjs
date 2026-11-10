// The Benchmarks tab against a fake backend (no server needed):  node benchmarks.test.mjs
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;

// ---- fake backend ---------------------------------------------------------------------------
const state = { enabled: true, startStatus: 202, runPolls: 0, started: [] };
const results = {
  gpu: { name: 'NVIDIA GeForce RTX 5070', vram_gb: 12 },
  components: {
    whisper: { sequential_10_audio_seconds: 12.5, batch_10_audio_seconds: 4.1, speedup: 3.05,
      batch_gpu: { gpu_util_avg_percent: 71, gpu_util_peak_percent: 98, vram_peak_mb: 6120 } },
    phoneme: { sequential_10_audio_seconds: 0, batch_10_audio_seconds: 0 },
  },
  sections: {
    reading: { questions: 10, total_seconds: 6.2, average_question_seconds: 0.62, server_processing_seconds: 5.9, status: 'ok' },
    repeat: { questions: 10, total_seconds: 0, average_question_seconds: 0 },
    jumbled: { questions: 10, total_seconds: 0, average_question_seconds: 0 },
    question_answer: { questions: 10, status: 'failed', error: 'job FAILED: boom', total_seconds: null },
    story_telling: { questions: 10, total_seconds: 0, average_question_seconds: 0 },
  },
  students: { students: 10, students_ok: 9, students_failed: 1, questions_per_student: 10, questions_total: 100, section: 'reading',
    wall_seconds: 48.5, questions_per_minute: 111.34, average_question_seconds: 0.485, audio_seconds_total: 1035,
    student_seconds: { min: 20.1, median: 35.2, p95: 48.5, max: 48.5, mean: 34.9 },
    queue_wait_seconds_avg: 12.3, queue_wait_seconds_max: 30.1, server_processing_seconds_avg: 17.8,
    gpu_util_avg_percent: 64, gpu_util_peak_percent: 99, vram_peak_mb: 7400, status: 'partial', errors: ['submit rejected: HTTP 429 Server busy'] },
};
const reply = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

globalThis.fetch = async (url, opts = {}) => {
  if (url === '/api/v1/benchmarks') {
    return reply(200, { enabled: state.enabled, benchmarks: [], sections: [], current: null, results: state.enabled ? results : {} });
  }
  if (url === '/api/v1/benchmarks/run') {
    state.started.push(JSON.parse(opts.body));
    if (state.startStatus !== 202) return reply(state.startStatus, { detail: 'A benchmark is already running (whisper); wait for it to finish', errors: [] });
    return reply(202, { run_id: 'R1', benchmark: 'section', section: 'repeat', repeat: 1, status: 'running', exit_code: null, elapsed_s: 0, log: ['starting'] });
  }
  if (url === '/api/v1/benchmarks/runs/R1') {
    state.runPolls += 1;
    return reply(200, { run_id: 'R1', benchmark: 'section', section: 'repeat', repeat: 1, status: 'completed', exit_code: 0,
      elapsed_s: 3, log: ['=== repeat ===', 'run 1/1: 3.00 s total'] });
  }
  if (url === '/api/v1/benchmarks/results') return reply(200, results);
  throw new Error(`unexpected request ${url}`);
};

const { buildBenchmarkView } = await import('../benchmarks.js');
const text = (el) => el.textContent.replace(/\s+/g, ' ');
const rows = (el) => [...el.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent).join('|'));
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const buttonByLabel = (root, label) => [...root.querySelectorAll('button')].find((b) => b.textContent === label);

// 1) disabled on the server -> explanation, run buttons inactive
state.enabled = false;
let view = buildBenchmarkView();
await tick();
assert.match(text(view), /Benchmarks are disabled on the server/);
assert.equal(buttonByLabel(view, 'Repeat').disabled, true);
assert.equal(buttonByLabel(view, 'All 5 sections').disabled, true);

// 2) enabled -> results table, three model buttons, five sections + all
state.enabled = true;
view = buildBenchmarkView();
await tick();
const t = text(view);
assert.match(t, /NVIDIA GeForce RTX 5070 · 12 GB/);
const r = rows(view);
assert.ok(r.includes('Whisper|12.50|4.10|3.05×|71 % avg / 98 % peak|6,120 MB'), r.join('\n'));
assert.ok(r.includes('Phoneme|–|–|–|–|–'), 'zero values mean "not measured yet"');
assert.ok(r.includes('Reading|10|6.20|0.620|5.90|measured'));
assert.ok(r.includes('Q&A|10|–|–|–|failed: job FAILED: boom'));
for (const label of ['Reading', 'Repeat', 'Jumbled', 'Q&A', 'Story Telling', 'All 5 sections', 'Whisper', 'Phoneme']) {
  const b = buttonByLabel(view, label);
  assert.ok(b, `button ${label}`);
  assert.equal(b.disabled, false, `${label} enabled`);
}

// 2b) multi-student results and the confirmation before the heavy test
assert.match(text(view), /Multiple students at once \(Read aloud, 10 questions each\)/);
for (const expect of [/Students9 ok \/ 1 failed of 10/, /Answers in total100/, /Audio sent1035 s/, /Wall time \(all done\)48\.50 s/,
  /Answers per minute111\.3/, /Student wait: fastest20\.10 s/, /Student wait: median35\.20 s/, /Student wait: p95/, /Student wait: slowest48\.50 s/,
  /Queue wait \(avg \/ max\)12\.30 \/ 30\.10 s/, /Worker time per section \(avg\)17\.80 s/, /GPU utilisation64 % avg \/ 99 % peak/,
  /VRAM peak7,400 MB/, /partial: submit rejected: HTTP 429 Server busy/]) assert.match(text(view), expect);
assert.ok(view.querySelector('#bench-students'), 'a students selector');
assert.deepEqual([...view.querySelectorAll('#bench-students option')].map((o) => o.value), ['5', '10', '20', '50']);
assert.equal(view.querySelector('#bench-students').value, '10');
assert.match(text(view), /Heavy: run it on the GPU server only/);
const heavy = buttonByLabel(view, 'Run multi-student test');
assert.ok(heavy && heavy.disabled === false);
const asked = [];
globalThis.confirm = (msg) => { asked.push(msg); return false; };
heavy.click();
await tick();
assert.equal(asked.length, 1);
assert.match(asked[0], /10 students x 10 questions \(100 answers\)/);
assert.equal(state.started.length, 0, 'declining the confirmation starts nothing');
globalThis.confirm = () => true;
view.querySelector('#bench-students').value = '20';
heavy.click();
await tick();
assert.deepEqual(state.started.at(-1), { benchmark: 'students', students: 20, repeat: 1 });
await tick(2300);                                          // let that run finish before the next step
delete globalThis.confirm;

// 3) start a section benchmark: POST body, running state, buttons locked, then completion after one poll
view.querySelector('#bench-repeat').value = '3';
buttonByLabel(view, 'Repeat').click();
await tick();
assert.deepEqual(state.started.at(-1), { benchmark: 'section', section: 'repeat', repeat: 3 });
assert.match(text(view), /running/);
assert.match(text(view), /Section benchmark: all sections|Section benchmark: Repeat/);
assert.equal(buttonByLabel(view, 'Whisper').disabled, true);
await tick(2300);
assert.ok(state.runPolls >= 1);
assert.match(text(view), /completed/);
assert.match(view.querySelector('pre[aria-label="Benchmark log"]').textContent, /run 1\/1: 3\.00 s total/);
assert.equal(buttonByLabel(view, 'Whisper').disabled, false);

// 4) another run in progress -> the server's message is shown, buttons stay usable
state.startStatus = 409;
buttonByLabel(view, 'Whisper').click();
await tick();
assert.match(text(view), /already running/);
assert.equal(buttonByLabel(view, 'Whisper').disabled, false);
assert.deepEqual(state.started.at(-1), { benchmark: 'whisper', repeat: 3 });

// 5) backend text can never inject markup
results.gpu.name = '<img src=x onerror=alert(1)>';
buttonByLabel(view, 'Refresh').click();
await tick();
assert.equal(view.querySelectorAll('img').length, 0);
assert.match(text(view), /<img src=x/);

console.log('benchmark tab tests passed');
process.exit(0);
