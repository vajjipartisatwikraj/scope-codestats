// Test views for the text-only question types: Fill blanks, MCQ and Email writing.
// No audio: the answer is typed or selected. The caller injects `runEvaluation` (submit + render + history)
// and `speak` (browser text-to-speech, used to "play" the MCQ audio), which keeps this module easy to test.
import { h } from './dom.js';
import { QUESTIONS } from './questions.js';

export const OPTION_IDS = 'ABCDEF';
const shorten = (s, n = 70) => (s.length > n ? `${s.slice(0, n - 3)}…` : s);
const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function buildTextTestView(type, { runEvaluation, speak }) {
  const bank = QUESTIONS[type.id];
  const isFill = type.id === 'FILL_BLANKS';
  const isMcq = type.id === 'MCQ';
  const defaultMode = type.id === 'EMAIL_WRITING' ? 'async' : 'sync';   // the email is rated by the model
  let index = 0;
  let mode = defaultMode;
  let showPassage = false;
  const picked = new Set();     // MCQ: indexes of the options the student ticked
  let field = null;             // the text input / textarea

  const root = h('div', { class: 'view' });
  const statusEl = h('div', { class: 'run-status', role: 'status', 'aria-live': 'polite' });
  const resultEl = h('div', {});
  const submitBtn = h('button', { type: 'button', class: 'btn primary big' }, 'Submit for evaluation');
  const promptBox = h('div', { class: 'prompt-box' });
  const responseBox = h('div', { class: 'response-box' });
  const item = () => bank[index];

  const questionSelect = h('select', { id: `q-${type.id}`, onchange: (e) => { index = +e.target.value; renderAll(); } },
    bank.map((q, i) => h('option', { value: i }, `${i + 1}. [${q.level}] ${shorten(q.text)}`)));
  const randomBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
    index = Math.floor(Math.random() * bank.length); questionSelect.value = String(index); renderAll(); } }, 'Random');
  const modeSelect = h('select', { id: `mode-${type.id}`, onchange: (e) => { mode = e.target.value; } },
    h('option', { value: 'sync', selected: defaultMode === 'sync' }, 'Synchronous (/evaluate)'),
    h('option', { value: 'async', selected: defaultMode === 'async' }, 'Asynchronous (/evaluate/async + poll)'));

  // ---- what the student sees ------------------------------------------------------------
  function promptContent() {
    const q = item();
    if (isFill) {
      return [h('p', { class: 'prompt-label' }, 'Fill in the blank with the correct form:'),
        h('p', { class: 'prompt-text' }, q.text),
        h('p', { class: 'muted' }, 'Upper / lower case and extra spaces do not matter. The spelling must be exact.'),
        q.alternatives?.length
          ? h('p', { class: 'muted small' }, `Test console only: accepted answers are “${[q.answer, ...q.alternatives].join('”, “')}”.`)
          : null];
    }
    if (isMcq) {
      const correct = q.options.filter((o) => o.correct).length;
      return [
        h('p', { class: 'prompt-label' }, 'Listen (or read), then answer the question:'),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn', onclick: () => speak(q.passage, 0.95) }, '▶ Play audio'),
          h('label', { class: 'inline' },
            h('input', { type: 'checkbox', checked: showPassage, onchange: (e) => { showPassage = e.target.checked; promptBox.replaceChildren(...promptContent()); } }),
            ' Show text')),
        showPassage ? h('p', { class: 'passage' }, q.passage) : h('p', { class: 'muted' }, 'Text hidden (uses your browser’s text-to-speech voice).'),
        h('p', { class: 'prompt-text' }, q.text),
        h('p', { class: 'muted' }, `Select ${correct === 1 ? 'the 1 correct option' : `the ${correct} correct options`}.`)];
    }
    return [h('p', { class: 'prompt-label' }, 'Write an email for this task:'),
      h('p', { class: 'prompt-text' }, q.text),
      h('p', { class: 'muted' }, 'Aim for roughly 80–150 words, with a greeting, clear paragraphs and a closing.')];
  }

  function responseContent() {
    const q = item();
    if (isFill) {
      field = h('input', { type: 'text', id: `answer-${type.id}`, class: 'blank-input', autocomplete: 'off', spellcheck: false,
        'aria-label': 'Your answer', placeholder: 'Type your answer',
        onkeydown: (e) => { if (e.key === 'Enter') submitBtn.click(); } });
      return [field];
    }
    if (isMcq) {
      field = null;
      return [h('fieldset', { class: 'mcq-options' }, h('legend', {}, 'Options'),
        q.options.map((o, i) => h('label', { class: 'mcq-option' },
          h('input', { type: 'checkbox', value: OPTION_IDS[i], checked: picked.has(i),
            onchange: (e) => { if (e.target.checked) picked.add(i); else picked.delete(i); } }),
          ` ${OPTION_IDS[i]}. ${o.text}`)))];
    }
    const counter = h('span', { class: 'muted small', 'aria-live': 'polite' }, '0 words');
    field = h('textarea', { id: `answer-${type.id}`, class: 'email-input', rows: 12, spellcheck: true,
      'aria-label': 'Your email', placeholder: 'Subject: …\n\nDear …,\n\n…',
      oninput: () => { counter.textContent = `${wordCount(field.value)} words`; } });
    return [field, counter];
  }

  function renderAll() {
    resultEl.replaceChildren();
    statusEl.textContent = '';
    picked.clear();
    promptBox.replaceChildren(...promptContent());
    responseBox.replaceChildren(...responseContent());
  }

  // ---- what is sent -----------------------------------------------------------------------
  function buildBody() {
    const q = item();
    if (isFill) {
      const body = { question: q.text, expected_text: q.answer, answer: field.value };
      if (q.alternatives?.length) body.accepted_answers = q.alternatives;
      return body;
    }
    if (isMcq) {
      return { question: q.text, options: q.options.map((o, i) => (
        { id: OPTION_IDS[i], text: o.text, is_correct: o.correct, selected: picked.has(i) })) };
    }
    return { question: q.text, answer: field.value };
  }

  function preview() {
    if (isMcq) return `selected: ${[...picked].sort().map((i) => OPTION_IDS[i]).join(', ') || 'nothing'}`;
    return field.value.length > 80 ? `${field.value.slice(0, 77)}…` : field.value;
  }

  submitBtn.addEventListener('click', () => {
    runEvaluation({ typeId: type.id, questionText: item().text, body: buildBody(), mode, statusEl, resultEl,
      submitBtn, expected: null, answerPreview: preview() });
  });

  root.append(
    h('p', { class: 'muted' }, type.hint),
    h('div', { class: 'row wrap' },
      h('label', { for: `q-${type.id}` }, 'Question'), questionSelect, randomBtn,
      h('label', { for: `mode-${type.id}` }, 'Mode'), modeSelect),
    h('section', { class: 'panel' }, promptBox),
    h('section', { class: 'panel' }, h('h3', {}, 'Your answer'), responseBox),
    h('div', { class: 'row' }, submitBtn, statusEl),
    resultEl);
  renderAll();
  return root;
}
