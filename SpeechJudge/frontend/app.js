import { h, fmt, pct } from './dom.js';
import { TEST_TYPES, QUESTIONS } from './questions.js';
import { evaluate, getReady } from './api.js';
import { renderResult } from './results.js';
import { createRecorderWidget } from './recorder-widget.js';
import { shuffleWords, samplesToAudio, synthSilence, synthSpeechLike, clipSamples, bytesToBase64 } from './audio.js';
import { buildBenchmarkView } from './benchmarks.js';
import { buildTextTestView } from './text-views.js';
import { buildUsageView } from './usage.js';

const LS = { history: 'sj.history' };

// ---- history -----------------------------------------------------------------------------
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(LS.history) || '[]'); } catch { return []; } };
function addHistory(entry) {
  const list = [entry, ...loadHistory()].slice(0, 100);
  localStorage.setItem(LS.history, JSON.stringify(list));
}

// ---- shared submit logic -----------------------------------------------------------------
let seq = 0;
const newRequestId = (tag) => `UI-${tag}-${Date.now().toString(36)}-${++seq}`;

async function runEvaluation({ typeId, questionText, body, mode, statusEl, resultEl, submitBtn, expected, answerPreview }) {
  submitBtn.disabled = true;
  resultEl.replaceChildren();
  const fullBody = { request_id: newRequestId(typeId), question_type: typeId, ...body };
  const outcome = await evaluate(fullBody, { mode, onProgress: (t) => { statusEl.textContent = t; } })
    .catch((e) => ({ ok: false, error: `Network error: ${e.message || e}`, elapsedMs: 0 }));
  statusEl.textContent = '';
  resultEl.append(renderResult({ outcome, meta: { mode, expected } }));
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const r = outcome.result;
  addHistory({
    t: new Date().toISOString(), type: typeId, question: questionText, mode,
    status: r ? r.status : 'ERROR', score: r ? r.score : null, flags: r ? r.flags : [],
    reason: r ? r.reason : outcome.error, seconds: +(outcome.elapsedMs / 1000).toFixed(1),
    transcript: r?.evaluation?.transcription?.text ?? answerPreview ?? null,
  });
  submitBtn.disabled = false;
  return outcome;
}

// ---- test views --------------------------------------------------------------------------
function speak(text, rate) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  speechSynthesis.speak(u);
}

function buildTestView(type) {
  const bank = QUESTIONS[type.id];
  let index = 0;
  let jumbleMode = 'ui'; // JUMBLED only: 'ui' | 'speech'
  let pool = [];         // [{id, word}]
  let answer = [];       // ids in chosen order
  let showRepeatText = false;

  const root = h('div', { class: 'view' });
  const recorder = createRecorderWidget({ onChange: () => updateSubmit() });
  const statusEl = h('div', { class: 'run-status', role: 'status', 'aria-live': 'polite' });
  const resultEl = h('div', {});
  const defaultMode = type.id === 'QUESTION_ANSWER' || type.id === 'STORYTELLING' ? 'async' : 'sync';
  let mode = defaultMode;
  const submitBtn = h('button', { type: 'button', class: 'btn primary big' }, 'Submit for evaluation');

  const questionSelect = h('select', { id: `q-${type.id}`, onchange: (e) => { index = +e.target.value; renderPrompt(); } },
    bank.map((q, i) => h('option', { value: i }, `${i + 1}. [${q.level}] ${q.text.length > 70 ? q.text.slice(0, 67) + '…' : q.text}`)));
  const randomBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    index = Math.floor(Math.random() * bank.length); questionSelect.value = String(index); renderPrompt(); } }, 'Random');

  const modeSelect = h('select', { id: `mode-${type.id}`, onchange: (e) => { mode = e.target.value; } },
    h('option', { value: 'sync', selected: defaultMode === 'sync' }, 'Synchronous (/evaluate)'),
    h('option', { value: 'async', selected: defaultMode === 'async' }, 'Asynchronous (/evaluate/async + poll)'));

  const promptBox = h('div', { class: 'prompt-box' });
  const responseBox = h('div', { class: 'response-box' });

  const q = () => bank[index];

  function resetJumble() {
    pool = shuffleWords(q().text).map((word, i) => ({ id: i, word }));
    answer = [];
  }

  function renderPrompt() {
    resultEl.replaceChildren();
    statusEl.textContent = '';
    recorder.clear();
    if (type.id === 'JUMBLED') resetJumble();
    promptBox.replaceChildren(...promptContent());
    responseBox.replaceChildren(...responseContent());
    updateSubmit();
  }

  function promptContent() {
    const item = q();
    switch (type.id) {
      case 'READING':
        return [h('p', { class: 'prompt-label' }, 'Read this sentence aloud:'), h('p', { class: 'prompt-text' }, item.text)];
      case 'REPEAT':
        return [
          h('p', { class: 'prompt-label' }, 'Listen, then repeat the sentence exactly:'),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn', onclick: () => speak(item.text, 0.95) }, '▶ Play sentence'),
            h('button', { type: 'button', class: 'btn', onclick: () => speak(item.text, 0.7) }, '▶ Play slowly'),
            h('label', { class: 'inline' },
              h('input', { type: 'checkbox', checked: showRepeatText, onchange: (e) => { showRepeatText = e.target.checked; renderPrompt(); } }),
              ' Show text')),
          showRepeatText ? h('p', { class: 'prompt-text' }, item.text) : h('p', { class: 'muted' }, 'Text hidden (uses your browser’s text-to-speech voice).'),
        ];
      case 'JUMBLED':
        return [
          h('p', { class: 'prompt-label' }, 'Put these words in the correct order:'),
          h('fieldset', { class: 'mode-switch' }, h('legend', {}, 'Answer mode'),
            radio('jm', 'ui', 'Arrange words on screen (no audio)', jumbleMode === 'ui', () => { jumbleMode = 'ui'; renderPrompt(); }),
            radio('jm', 'speech', 'Say the sentence aloud (audio)', jumbleMode === 'speech', () => { jumbleMode = 'speech'; renderPrompt(); })),
        ];
      default:
        return [h('p', { class: 'prompt-label' }, type.id === 'STORYTELLING' ? 'Story topic:' : 'Question:'),
          h('p', { class: 'prompt-text' }, item.text),
          h('p', { class: 'muted' }, type.id === 'STORYTELLING' ? 'Aim for roughly 30–60 seconds.' : 'Aim for roughly 15–30 seconds.')];
    }
  }

  function responseContent() {
    if (type.id === 'JUMBLED') {
      const chips = h('div', { class: 'chips', 'aria-label': 'Scrambled words' },
        pool.map((p) => h('button', {
          type: 'button', class: 'chip word', disabled: jumbleMode === 'ui' ? answer.includes(p.id) : true,
          onclick: () => { answer.push(p.id); renderResponseOnly(); } }, p.word)));
      if (jumbleMode === 'speech') return [chips, recorder.el];
      const line = h('div', { class: 'answer-line', 'aria-label': 'Your sentence' },
        answer.length ? answer.map((id, pos) => h('button', {
          type: 'button', class: 'chip word chosen', title: 'Click to remove',
          onclick: () => { answer.splice(pos, 1); renderResponseOnly(); } }, pool[id].word))
          : h('span', { class: 'muted' }, 'Click the words above in order…'));
      return [chips, line, h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: () => { answer = []; renderResponseOnly(); } }, 'Clear'),
        h('button', { type: 'button', class: 'btn', onclick: () => { resetJumble(); renderResponseOnly(); } }, 'Reshuffle'))];
    }
    return [recorder.el];
  }

  function renderResponseOnly() {
    responseBox.replaceChildren(...responseContent());
    updateSubmit();
  }

  function updateSubmit() {
    let ready;
    if (type.id === 'JUMBLED' && jumbleMode === 'ui') ready = answer.length === pool.length && pool.length > 0;
    else ready = !!recorder.getAudio();
    submitBtn.disabled = !ready;
    submitBtn.title = ready ? '' : (type.id === 'JUMBLED' && jumbleMode === 'ui' ? 'Place all words first' : 'Record or upload audio first');
  }

  function buildBody() {
    const item = q();
    const audio = recorder.getAudio();
    switch (type.id) {
      case 'READING': case 'REPEAT':
        return { audio: audio.base64, expected_text: item.text };
      case 'JUMBLED':
        return jumbleMode === 'ui'
          ? { expected_text: item.text, question_config: { submitted_text: answer.map((id) => pool[id].word).join(' ') } }
          : { audio: audio.base64, expected_text: item.text };
      default:
        return { audio: audio.base64, question: item.text };
    }
  }

  submitBtn.addEventListener('click', () => {
    const item = q();
    const expected = ['READING', 'REPEAT', 'JUMBLED'].includes(type.id) ? item.text : null;
    runEvaluation({ typeId: type.id, questionText: item.text, body: buildBody(), mode, statusEl, resultEl, submitBtn, expected });
  });

  root.append(
    h('p', { class: 'muted' }, type.hint),
    h('div', { class: 'row wrap' },
      h('label', { for: `q-${type.id}` }, 'Question'), questionSelect, randomBtn,
      h('label', { for: `mode-${type.id}` }, 'Mode'), modeSelect),
    h('section', { class: 'panel' }, promptBox),
    h('section', { class: 'panel' }, h('h3', {}, 'Your response'), responseBox),
    h('div', { class: 'row' }, submitBtn, statusEl),
    resultEl);
  renderPrompt();
  return root;
}

function radio(name, value, label, checked, onchange) {
  return h('label', { class: 'inline' }, h('input', { type: 'radio', name, value, checked, onchange }), ` ${label}`);
}

// ---- edge-case / quality-gate tests ------------------------------------------------------
const GATE_SENTENCE = QUESTIONS.READING[0].text;
const wavBody = (samples) => ({ audio: samplesToAudio(samples).base64, expected_text: GATE_SENTENCE });

const GATE_CASES = [
  { name: 'Silence (3 s)', type: 'READING', expect: 'LOW_AUDIO_QUALITY · “Insufficient speech signal”',
    body: () => wavBody(synthSilence(3)), check: (o) => o.result?.status === 'LOW_AUDIO_QUALITY' && o.result.reason === 'Insufficient speech signal' },
  { name: 'Too short (0.4 s)', type: 'READING', expect: 'LOW_AUDIO_QUALITY · “Audio too short”',
    body: () => wavBody(synthSpeechLike({ seconds: 0.4 })), check: (o) => o.result?.status === 'LOW_AUDIO_QUALITY' && o.result.reason === 'Audio too short' },
  { name: 'Heavily clipped signal', type: 'READING', expect: 'COMPLETED with flag CLIPPING',
    body: () => wavBody(clipSamples(synthSpeechLike({ seconds: 3 }), 8)), check: (o) => o.result?.status === 'COMPLETED' && o.result.flags.includes('CLIPPING') },
  { name: 'Noisy signal (~6 dB SNR)', type: 'READING', expect: 'COMPLETED with flag EXCESSIVE_NOISE',
    body: () => wavBody(synthSpeechLike({ seconds: 4, noise: 0.04 })), check: (o) => o.result?.status === 'COMPLETED' && o.result.flags.includes('EXCESSIVE_NOISE') },
  { name: 'Tone passes the gate (not speech)', type: 'READING', expect: 'COMPLETED (gate passes; transcript likely empty or junk)',
    body: () => wavBody(synthSpeechLike({ seconds: 4 })), check: (o) => o.result?.status === 'COMPLETED' },
  { name: 'Undecodable audio bytes', type: 'READING', expect: 'HTTP 422',
    body: () => ({ audio: bytesToBase64(new TextEncoder().encode('this is not audio')), expected_text: GATE_SENTENCE }), check: (o) => o.httpStatus === 422 },
  { name: 'Missing audio (READING)', type: 'READING', expect: 'HTTP 422 naming “audio”',
    body: () => ({ expected_text: GATE_SENTENCE }), check: (o) => o.httpStatus === 422 && /audio/.test(o.error || '') },
  { name: 'Missing question (Q&A)', type: 'QUESTION_ANSWER', expect: 'HTTP 422 naming “question”',
    body: () => ({ audio: samplesToAudio(synthSpeechLike({ seconds: 2 })).base64 }), check: (o) => o.httpStatus === 422 && /question/.test(o.error || '') },
  { name: 'Jumbled without any input', type: 'JUMBLED', expect: 'HTTP 422 (needs audio or submitted_text)',
    body: () => ({ expected_text: 'the cat sat' }), check: (o) => o.httpStatus === 422 },
  { name: 'Unknown question type', type: 'NOT_A_TYPE', expect: 'HTTP 422',
    body: () => ({ expected_text: 'x' }), check: (o) => o.httpStatus === 422 },
  { name: 'Jumbled UI: perfect order', type: 'JUMBLED', expect: 'score 100%',
    body: () => ({ expected_text: 'the cat sat on the mat', question_config: { submitted_text: 'the cat sat on the mat' } }), check: (o) => o.result?.score != null && o.result.score > 0.999 },
  { name: 'Jumbled UI: wrong order', type: 'JUMBLED', expect: 'score below 100%',
    body: () => ({ expected_text: 'the cat sat on the mat', question_config: { submitted_text: 'mat the on sat cat the' } }), check: (o) => o.result?.score != null && o.result.score < 0.9 },
  // ---- text-only types (no audio, no model except the email rating) ----
  { name: 'Fill blanks: case and spacing ignored', type: 'FILL_BLANKS', expect: 'score 100%',
    body: () => ({ expected_text: 'has been watching', answer: '  HAS   been Watching ' }), check: (o) => o.result?.score === 1 },
  { name: 'Fill blanks: any accepted answer is right', type: 'FILL_BLANKS', expect: 'score 100% (matches “watching”)',
    body: () => ({ expected_text: 'is watching', accepted_answers: ['watching', 'be watching'], answer: ' Watching ' }),
    check: (o) => o.result?.score === 1 && o.result.evaluation.answer_check.matched_answer === 'watching' },
  { name: 'Fill blanks: not in the accepted list', type: 'FILL_BLANKS', expect: 'score 0%',
    body: () => ({ expected_text: 'is watching', accepted_answers: ['watching'], answer: 'watches' }), check: (o) => o.result?.score === 0 },
  { name: 'Fill blanks: empty accepted answer', type: 'FILL_BLANKS', expect: 'HTTP 422 naming accepted_answers',
    body: () => ({ expected_text: 'x', accepted_answers: [''], answer: 'x' }), check: (o) => o.httpStatus === 422 && /accepted_answers/.test(o.error || '') },
  { name: 'Fill blanks: misspelled', type: 'FILL_BLANKS', expect: 'score 0%',
    body: () => ({ expected_text: 'watches', answer: 'watchs' }), check: (o) => o.result?.score === 0 },
  { name: 'Fill blanks: left empty', type: 'FILL_BLANKS', expect: 'score 0% with flag EMPTY_ANSWER',
    body: () => ({ expected_text: 'watches', answer: '' }), check: (o) => o.result?.score === 0 && o.result.flags.includes('EMPTY_ANSWER') },
  { name: 'Fill blanks: answer field missing', type: 'FILL_BLANKS', expect: 'HTTP 422 naming “answer”',
    body: () => ({ expected_text: 'watches' }), check: (o) => o.httpStatus === 422 && /answer/.test(o.error || '') },
  { name: 'MCQ: exactly the correct options', type: 'MCQ', expect: 'score 100% (outcome FULL)',
    body: () => ({ options: mcqOptions('AB', 'AB') }), check: (o) => o.result?.score === 1 && o.result.evaluation.answer_check.outcome === 'FULL' },
  { name: 'MCQ: only one of two correct options', type: 'MCQ', expect: 'score 50% (outcome PARTIAL)',
    body: () => ({ options: mcqOptions('AB', 'A') }), check: (o) => o.result?.score === 0.5 && o.result.evaluation.answer_check.outcome === 'PARTIAL' },
  { name: 'MCQ: a correct and a wrong option', type: 'MCQ', expect: 'score 0% (no partial credit with a wrong pick)',
    body: () => ({ options: mcqOptions('AB', 'AC') }), check: (o) => o.result?.score === 0 },
  { name: 'MCQ: nothing selected', type: 'MCQ', expect: 'score 0%',
    body: () => ({ options: mcqOptions('A', '') }), check: (o) => o.result?.score === 0 },
  { name: 'MCQ: 7 options', type: 'MCQ', expect: 'HTTP 422 (2 to 6 options)',
    body: () => ({ options: mcqOptions('A', 'A', 7) }), check: (o) => o.httpStatus === 422 },
  { name: 'MCQ: 3 correct options', type: 'MCQ', expect: 'HTTP 422 (at most 2 correct)',
    body: () => ({ options: mcqOptions('ABC', 'A') }), check: (o) => o.httpStatus === 422 },
  { name: 'Email: empty', type: 'EMAIL_WRITING', expect: 'score 0% with flag EMPTY_ANSWER (model not called)',
    body: () => ({ question: 'Write an email to your HR manager.', answer: '' }), check: (o) => o.result?.score === 0 && o.result.flags.includes('EMPTY_ANSWER') },
  { name: 'Email: question missing', type: 'EMAIL_WRITING', expect: 'HTTP 422 naming “question”',
    body: () => ({ answer: 'Dear HR, ...' }), check: (o) => o.httpStatus === 422 && /question/.test(o.error || '') },
];

function mcqOptions(correct, selected, count = 4) {
  return Array.from({ length: count }, (_, i) => {
    const id = 'ABCDEFG'[i];
    return { id, text: `Option ${id}`, is_correct: correct.includes(id), selected: selected.includes(id) };
  });
}

function buildGateView() {
  const rows = h('tbody', {});
  const cells = GATE_CASES.map((c) => {
    const result = h('td', {}, '—');
    const detail = h('td', { class: 'muted' }, '');
    const btn = h('button', { type: 'button', class: 'btn small' }, 'Run');
    const run = async () => {
      btn.disabled = true;
      result.textContent = '…';
      const outcome = await evaluate({ request_id: newRequestId('GATE'), question_type: c.type, ...c.body() }, { mode: 'sync' })
        .catch((e) => ({ ok: false, error: String(e), elapsedMs: 0 }));
      const pass = !!c.check(outcome);
      result.replaceChildren(h('span', { class: `badge ${pass ? 'pass' : 'fail'}` }, pass ? '✓ as expected' : '✗ unexpected'));
      const r = outcome.result;
      detail.textContent = r ? `${r.status}${r.reason ? ' · ' + r.reason : ''}${r.flags?.length ? ' · flags: ' + r.flags.join(',') : ''}${r.score != null ? ' · score ' + pct(r.score) : ''}`
        : (outcome.error || '');
      btn.disabled = false;
      return pass;
    };
    btn.addEventListener('click', run);
    rows.append(h('tr', {}, h('td', {}, c.name), h('td', { class: 'muted' }, c.expect), h('td', {}, btn), result, detail));
    return run;
  });
  const summary = h('p', { role: 'status', 'aria-live': 'polite' });
  const runAll = h('button', { type: 'button', class: 'btn primary', onclick: async (e) => {
    e.target.disabled = true;
    let passed = 0;
    for (const run of cells) { if (await run()) passed++; }
    summary.textContent = `${passed} / ${cells.length} behaved as expected.`;
    e.target.disabled = false;
  } }, 'Run all');
  return h('div', { class: 'view' },
    h('p', { class: 'muted' }, 'Synthetic signals and malformed requests that exercise the audio quality gate and request validation. “Expected” describes the correct backend behaviour.'),
    h('div', { class: 'row' }, runAll, summary),
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Case', 'Expected', '', 'Result', 'Actual'].map((x) => h('th', { scope: 'col' }, x)))), rows)));
}

// ---- history view ------------------------------------------------------------------------
function buildHistoryView() {
  const list = loadHistory();
  const typeLabel = (id) => TEST_TYPES.find((t) => t.id === id)?.label || id;
  const clear = h('button', { type: 'button', class: 'btn', onclick: () => { localStorage.removeItem(LS.history); show('HISTORY'); } }, 'Clear history');
  const exportBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'speech-judge-history.json' });
    a.click(); URL.revokeObjectURL(a.href);
  } }, 'Export JSON');
  return h('div', { class: 'view' },
    h('div', { class: 'row' }, exportBtn, clear, h('span', { class: 'muted' }, `${list.length} run(s) stored in this browser (audio is not stored).`)),
    list.length === 0 ? h('p', { class: 'muted' }, 'Nothing yet. Run a test first.') :
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Time', 'Type', 'Question', 'Mode', 'Status', 'Score', 'Flags', 'Time (s)', 'Heard / reason'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', {}, list.map((e) => h('tr', {},
          h('td', {}, new Date(e.t).toLocaleTimeString()), h('td', {}, typeLabel(e.type)),
          h('td', {}, e.question), h('td', {}, e.mode), h('td', {}, e.status),
          h('td', {}, e.score == null ? '–' : pct(e.score)), h('td', {}, (e.flags || []).join(', ')),
          h('td', {}, fmt(e.seconds, 1)), h('td', { class: 'muted' }, e.transcript || e.reason || '')))))));
}

// ---- shell -------------------------------------------------------------------------------
const tabs = [...TEST_TYPES.map((t) => ({ id: t.id, label: t.label })), { id: 'GATE', label: 'Edge cases' },
  { id: 'BENCH', label: 'Benchmarks' }, { id: 'USAGE', label: 'Usage' }, { id: 'HISTORY', label: 'History' }];
const views = {};   // keep test views alive between tab switches so recordings/results persist
let current = null;

function show(id) {
  current = id;
  if (id === 'HISTORY') views[id] = buildHistoryView();           // always fresh
  else if (!views[id]) {
    const type = TEST_TYPES.find((t) => t.id === id);
    views[id] = id === 'GATE' ? buildGateView() : id === 'BENCH' ? buildBenchmarkView() : id === 'USAGE' ? buildUsageView()
      : type.kind === 'text' ? buildTextTestView(type, { runEvaluation, speak })
        : buildTestView(type);
  } else views[id].refresh?.();                                     // e.g. the Usage tab reloads when shown again
  document.getElementById('content').replaceChildren(views[id]);
  document.querySelectorAll('[role=tab]').forEach((b) => {
    const on = b.dataset.id === id;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

function buildChrome() {
  const nav = document.getElementById('tabs');
  tabs.forEach((t) => nav.append(h('button', { type: 'button', role: 'tab', class: 'tab', dataset: { id: t.id }, onclick: () => show(t.id) }, t.label)));
  nav.addEventListener('keydown', (e) => {
    const i = tabs.findIndex((t) => t.id === current);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      show(next.id);
      nav.querySelector(`[data-id=${next.id}]`).focus();
    }
  });
}

async function pollReady() {
  const el = document.getElementById('ready');
  const r = await getReady();
  if (!r.reachable) {
    el.replaceChildren(h('span', { class: 'badge fail' }, 'Backend unreachable'));
  } else {
    const names = ['whisper', 'gopt', 'gemini', 'acoustic'];
    el.replaceChildren(h('span', { class: `badge ${r.status === 'ready' ? 'pass' : 'warn'}` }, r.status === 'ready' ? 'Backend ready' : 'Loading…'),
      names.map((n) => h('span', { class: `badge ${r[n] ? 'pass' : 'fail'}`, title: `${n} ${r[n] ? 'loaded' : 'not loaded'}` }, n)));
  }
  setTimeout(pollReady, 5000);
}

buildChrome();
const fromHash = decodeURIComponent(location.hash.slice(1));      // e.g. http://127.0.0.1:8080/#USAGE
show(tabs.some((t) => t.id === fromHash) ? fromHash : 'READING');
pollReady();
