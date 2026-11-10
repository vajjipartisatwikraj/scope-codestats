// "Benchmarks" tab: start the GPU benchmark scripts on the server and watch them.
//
// Nothing runs in the browser. Each button asks the backend (POST /api/v1/benchmarks/run) to start one
// of its own scripts (benchmarks/*.py); this tab polls the run, shows the log and reads
// benchmarks/benchmark_results.json. The backend needs SJ_BENCHMARKS_ENABLED=true.
import { h, fmt } from './dom.js';
import { errorText, getBenchmarkResults, getBenchmarkRun, getBenchmarks, startBenchmark } from './api.js';

const SECTIONS = [
  ['reading', 'Reading'], ['repeat', 'Repeat'], ['jumbled', 'Jumbled'],
  ['question_answer', 'Q&A'], ['story_telling', 'Story Telling'],
];
const COMPONENTS = [
  ['whisper', 'Whisper', '10 files one by one vs one batch of 10'],
  ['phoneme', 'Phoneme', '10 files one by one vs one batch of 10'],
];
const POLL_MS = 2000;
const STUDENT_COUNTS = [5, 10, 20, 50];

const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, String(v ?? '–')));
const positive = (n) => (typeof n === 'number' && n > 0 ? n : null);   // 0 = "not measured yet" in the template
const num = (n, d = 2) => (positive(n) == null ? '–' : fmt(n, d));

export function buildBenchmarkView() {
  let enabled = false;       // set by the server's answer; run buttons stay disabled until it says yes
  let runId = null;
  let timer = null;

  const banner = h('div', { role: 'status', 'aria-live': 'polite' });
  const repeatSelect = h('select', { id: 'bench-repeat' },
    [1, 2, 3, 5].map((n) => h('option', { value: n }, n === 1 ? '1 run' : `${n} runs (median)`)));
  const runStatus = h('div', { class: 'row', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'muted' }, 'No run yet.'));
  const logBox = h('pre', { class: 'json', 'aria-label': 'Benchmark log', tabindex: '0' }, '');
  const resultsBox = h('div', {});
  const studentsSelect = h('select', { id: 'bench-students' },
    STUDENT_COUNTS.map((n) => h('option', { value: n, selected: n === 10 }, `${n} students`)));

  const runButtons = [];
  const runButton = (label, onclick, extra = {}) => {
    const b = h('button', { type: 'button', class: 'btn', disabled: true, onclick, ...extra }, label);
    runButtons.push(b);
    return b;
  };
  const setBusy = (busy) => runButtons.forEach((b) => { b.disabled = busy || !enabled; });
  const showError = (text) => banner.replaceChildren(h('div', { class: 'banner error' }, text));

  // ---- starting a run -----------------------------------------------------------------------
  async function start(body) {
    setBusy(true);
    banner.replaceChildren();
    let r;
    try {
      r = await startBenchmark({ ...body, repeat: Number(repeatSelect.value) });
    } catch (e) {
      showError(`Network error: ${e.message || e}`);
      setBusy(false);
      return;
    }
    if (r.status !== 202) {
      showError(errorText(r));
      setBusy(false);
      return;
    }
    follow(r.data);
  }

  // ---- following a run ----------------------------------------------------------------------
  function follow(run) {
    runId = run.run_id;
    show(run);
    clearTimeout(timer);
    if (run.status === 'running') {
      setBusy(true);
      timer = setTimeout(poll, POLL_MS);
    } else {
      setBusy(false);
    }
  }

  async function poll() {
    let r;
    try { r = await getBenchmarkRun(runId); } catch { timer = setTimeout(poll, POLL_MS * 2); return; }
    if (r.status !== 200) { showError(errorText(r)); setBusy(false); return; }
    show(r.data);
    if (r.data.status === 'running') { timer = setTimeout(poll, POLL_MS); return; }
    setBusy(false);
    refreshResults();
  }

  function describe(run) {
    if (run.benchmark === 'students') return 'Multi-student benchmark: Read aloud, all students at once';
    if (run.benchmark === 'section') {
      const name = run.section === 'all' ? 'all sections' : (SECTIONS.find(([id]) => id === run.section)?.[1] || run.section);
      return `Section benchmark: ${name}`;
    }
    return `${COMPONENTS.find(([id]) => id === run.benchmark)?.[1] || run.benchmark} benchmark`;
  }

  function show(run) {
    const cls = run.status === 'completed' ? 'pass' : run.status === 'failed' ? 'fail' : 'warn';
    runStatus.replaceChildren(
      h('span', { class: `badge ${cls}` }, run.status),
      h('strong', {}, describe(run)),
      h('span', { class: 'muted' }, `${run.repeat} run${run.repeat > 1 ? 's' : ''} · ${fmt(run.elapsed_s, 0)} s`
        + (run.exit_code != null && run.exit_code !== 0 ? ` · exit code ${run.exit_code}` : '')));
    logBox.textContent = (run.log || []).join('\n');
    logBox.scrollTop = logBox.scrollHeight;
  }

  // ---- results ------------------------------------------------------------------------------
  const table = (head, rows) => h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, head.map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));

  function renderResults(data) {
    const gpu = data.gpu || {};
    const comp = data.components || {};
    const sections = data.sections || {};
    const gpuCell = (g) => (g && g.gpu_util_avg_percent != null
      ? `${fmt(g.gpu_util_avg_percent, 0)} % avg / ${fmt(g.gpu_util_peak_percent, 0)} % peak` : '–');
    const vramCell = (g) => (g && g.vram_peak_mb != null ? `${Number(g.vram_peak_mb).toLocaleString()} MB` : '–');

    const w = comp.whisper || {};
    const p = comp.phoneme || {};
    const componentRows = [
      ['Whisper', num(w.sequential_10_audio_seconds), num(w.batch_10_audio_seconds),
        w.speedup ? `${fmt(w.speedup, 2)}×` : '–', gpuCell(w.batch_gpu), vramCell(w.batch_gpu)],
      ['Phoneme', num(p.sequential_10_audio_seconds), num(p.batch_10_audio_seconds),
        p.speedup ? `${fmt(p.speedup, 2)}×` : '–', gpuCell(p.batch_gpu), vramCell(p.batch_gpu)],
    ];
    const sectionRows = SECTIONS.map(([id, label]) => {
      const s = sections[id] || {};
      const state = s.status === 'failed' ? `failed: ${s.error || ''}` : (positive(s.total_seconds) ? 'measured' : 'not run');
      return [label, s.questions ?? '–', num(s.total_seconds), num(s.average_question_seconds, 3),
        num(s.server_processing_seconds), state];
    });

    const st = data.students || {};
    const measured = positive(st.wall_seconds) != null;
    const sw = st.student_seconds || {};
    const studentCells = measured ? [
      kv('Students', `${st.students_ok ?? '–'} ok / ${st.students_failed ?? 0} failed of ${st.students}`),
      kv('Questions each', st.questions_per_student), kv('Answers in total', st.questions_total),
      kv('Audio sent', st.audio_seconds_total ? `${fmt(st.audio_seconds_total, 0)} s` : '–'),
      kv('Wall time (all done)', `${num(st.wall_seconds)} s`),
      kv('Answers per minute', num(st.questions_per_minute, 1)),
      kv('Average per answer', `${num(st.average_question_seconds, 3)} s`),
      kv('Student wait: fastest', `${num(sw.min)} s`), kv('Student wait: median', `${num(sw.median)} s`),
      kv('Student wait: p95', `${num(sw.p95)} s`), kv('Student wait: slowest', `${num(sw.max)} s`),
      kv('Queue wait (avg / max)', `${num(st.queue_wait_seconds_avg)} / ${num(st.queue_wait_seconds_max)} s`),
      kv('Worker time per section (avg)', `${num(st.server_processing_seconds_avg)} s`),
      kv('GPU utilisation', gpuCell(st)), kv('VRAM peak', vramCell(st)),
      kv('State', st.status === 'ok' ? 'ok' : `${st.status || 'unknown'}${(st.errors || []).length ? `: ${st.errors.join(' | ')}` : ''}`),
    ] : [];

    resultsBox.replaceChildren(
      h('p', { class: 'muted' }, `GPU: ${gpu.name || 'unknown'}${gpu.vram_gb ? ` · ${gpu.vram_gb} GB` : ''}`
        + (data.updated_at ? ` · updated ${new Date(data.updated_at).toLocaleString()}` : '')),
      h('h3', {}, 'Models (seconds)'),
      table(['Model', 'One by one', 'One batch of 10', 'Speed-up', 'GPU utilisation', 'VRAM peak'], componentRows),
      h('h3', {}, 'Sections through POST /evaluate/section (10 questions each)'),
      table(['Section', 'Questions', 'Total (s)', 'Average per question (s)', 'Server processing (s)', 'State'], sectionRows),
      h('h3', {}, 'Multiple students at once (Read aloud, 10 questions each)'),
      measured ? h('div', { class: 'kv-grid' }, studentCells) : h('p', { class: 'muted' }, 'Not run yet.'),
      h('details', {}, h('summary', {}, 'Raw benchmark_results.json'), h('pre', { class: 'json' }, JSON.stringify(data, null, 2))));
  }

  async function refreshResults() {
    try {
      const r = await getBenchmarkResults();
      if (r.ok) renderResults(r.data);
      else showError(errorText(r));
    } catch (e) { showError(`Network error: ${e.message || e}`); }
  }

  // ---- layout -------------------------------------------------------------------------------
  const root = h('div', { class: 'view' },
    h('p', { class: 'muted' }, 'Runs the benchmark scripts on the backend server (its GPU) and shows the numbers saved in '
      + 'benchmarks/benchmark_results.json. One run at a time.'),
    banner,
    h('section', { class: 'panel' },
      h('h3', {}, 'Section benchmarks (real pipeline)'),
      h('p', { class: 'muted' }, 'Sends 10 questions (about 10 s of audio each) to POST /api/v1/evaluate/section, waits for the job and times it: '
        + 'queue, Whisper, phoneme, acoustic, Gemini and scoring. Needs the API, the worker and Redis running with all models loaded.'),
      h('div', { class: 'row wrap' }, h('label', { for: 'bench-repeat' }, 'Repeat'), repeatSelect),
      h('div', { class: 'row wrap' },
        SECTIONS.map(([id, label]) => runButton(label, () => start({ benchmark: 'section', section: id }),
          { title: `10 ${label} questions through /evaluate/section` })),
        runButton('All 5 sections', () => start({ benchmark: 'section', section: 'all' }), { class: 'btn primary' }))),
    h('section', { class: 'panel' },
      h('h3', {}, 'Multiple students at once (load test)'),
      h('p', { class: 'muted' }, 'Every student submits a Read aloud section (10 answers of about 10 s each) at the same moment, so 10 students '
        + 'put 100 answers (about 1000 s of audio) on the server together. Measures the wall time, answers per minute, how long each '
        + 'student waits (fastest, median, slowest) and how long sections queue.'),
      h('div', { class: 'banner warn' }, 'Heavy: run it on the GPU server only. On a CPU machine it can take hours and exhaust memory.'),
      h('div', { class: 'row wrap' }, h('label', { for: 'bench-students' }, 'Students'), studentsSelect,
        runButton('Run multi-student test', () => {
          const n = Number(studentsSelect.value);
          const ok = typeof confirm !== 'function'
            || confirm(`Send ${n} students x 10 questions (${n * 10} answers) to the server's models at once?\n\nOnly do this on the GPU server.`);
          if (ok) start({ benchmark: 'students', students: n });
        }, { class: 'btn primary', title: 'N simultaneous Read aloud sections of 10 x 10 s answers' }))),
    h('section', { class: 'panel' },
      h('h3', {}, 'Model benchmarks'),
      h('p', { class: 'muted' }, 'Whisper and the phoneme model: 10 audio files one by one vs one batch of 10. '
        + 'Each loads its own copy of the model on the GPU; if VRAM is tight, stop the worker first.'),
      h('div', { class: 'row wrap' },
        COMPONENTS.map(([id, label, hint]) => runButton(label, () => start({ benchmark: id }), { title: hint })))),
    h('section', { class: 'panel' }, h('h3', {}, 'Current run'), runStatus, logBox),
    h('section', { class: 'panel' },
      h('div', { class: 'row' }, h('h3', {}, 'Results'),
        h('button', { type: 'button', class: 'btn small', onclick: refreshResults }, 'Refresh')),
      resultsBox));

  // ---- initial state: is it enabled? is a run already going? ---------------------------------
  (async () => {
    let r;
    try { r = await getBenchmarks(); } catch (e) { showError(`Backend unreachable: ${e.message || e}`); return; }
    if (!r.ok) { showError(errorText(r)); return; }
    enabled = !!r.data.enabled;
    if (!enabled) {
      showError('Benchmarks are disabled on the server. Set SJ_BENCHMARKS_ENABLED=true in the backend .env and restart the API.');
      return;
    }
    renderResults(r.data.results || {});
    if (r.data.current) follow(r.data.current); else setBusy(false);
  })();

  return root;
}
