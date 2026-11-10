// Fill blanks, MCQ and Email writing in the test console: question banks, the request each view builds,
// and how their results render. Runs in jsdom without a backend:  node text_types.test.mjs
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const ev = (name) => new dom.window.Event(name, { bubbles: true });

const { TEST_TYPES, QUESTIONS } = await import('../questions.js');
const { buildTextTestView, OPTION_IDS } = await import('../text-views.js');
const { renderResult } = await import('../results.js');
const text = (el) => el.textContent.replace(/\s+/g, ' ');

// ---- 1) question banks follow the backend rules -------------------------------------------------
const textTypes = TEST_TYPES.filter((t) => t.kind === 'text').map((t) => t.id);
assert.deepEqual(textTypes, ['FILL_BLANKS', 'MCQ', 'EMAIL_WRITING']);
for (const q of QUESTIONS.FILL_BLANKS) {
  assert.ok(q.text.includes('____') && q.answer.trim(), `fill blank item: ${q.text}`);
}
for (const q of QUESTIONS.MCQ) {
  assert.ok(q.options.length >= 2 && q.options.length <= 6, `2-6 options: ${q.text}`);
  const correct = q.options.filter((o) => o.correct).length;
  assert.ok(correct >= 1 && correct <= 2, `1-2 correct options: ${q.text}`);
  assert.ok(q.options.length <= OPTION_IDS.length && q.passage, 'ids available and a passage to play');
}
assert.ok(QUESTIONS.MCQ.some((q) => q.options.filter((o) => o.correct).length === 2), 'a two-answer MCQ exists');
assert.ok(QUESTIONS.MCQ.some((q) => q.options.length === 2) && QUESTIONS.MCQ.some((q) => q.options.length === 6));
for (const q of QUESTIONS.EMAIL_WRITING) assert.ok(q.text.toLowerCase().includes('email'));

// ---- 2) each view builds the right request -------------------------------------------------------
const calls = [];
const spoken = [];
const deps = { runEvaluation: (args) => { calls.push(args); }, speak: (t, r) => spoken.push([t, r]) };
const submit = (view) => [...view.querySelectorAll('button')].find((b) => b.textContent === 'Submit for evaluation');
const pick = (view, selector, value) => { const s = view.querySelector(selector); s.value = String(value); s.dispatchEvent(ev('change')); };

// Fill blanks (also: Enter in the box submits; the blank can be sent empty)
let view = buildTextTestView(TEST_TYPES.find((t) => t.id === 'FILL_BLANKS'), deps);
assert.equal(view.querySelector('#mode-FILL_BLANKS').value, 'sync');
const input = view.querySelector('input.blank-input');
input.value = '  Watches ';
input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
let c = calls.pop();
assert.equal(c.typeId, 'FILL_BLANKS');
assert.deepEqual(c.body, { question: QUESTIONS.FILL_BLANKS[0].text, expected_text: 'watches', answer: '  Watches ' });
input.value = '';
submit(view).click();
assert.equal(calls.pop().body.answer, '', 'an empty blank is still sent (scores 0)');
assert.equal(c.body.accepted_answers, undefined, 'no accepted_answers key when the item has none');
// an item with extra accepted answers sends them too and tells the tester
const withAlt = QUESTIONS.FILL_BLANKS.findIndex((q) => q.alternatives?.length);
pick(view, '#q-FILL_BLANKS', withAlt);
assert.match(text(view.querySelector('.prompt-box')), /accepted answers are/);
view.querySelector('input.blank-input').value = 'sleeping';
submit(view).click();
c = calls.pop();
assert.equal(c.body.expected_text, QUESTIONS.FILL_BLANKS[withAlt].answer);
assert.deepEqual(c.body.accepted_answers, QUESTIONS.FILL_BLANKS[withAlt].alternatives);

// MCQ: a two-answer question, the student ticks only the first correct option
view = buildTextTestView(TEST_TYPES.find((t) => t.id === 'MCQ'), deps);
assert.equal(view.querySelector('#mode-MCQ').value, 'sync');
view.querySelector('.prompt-box button').click();
assert.deepEqual(spoken.pop(), [QUESTIONS.MCQ[0].passage, 0.95], 'Play audio speaks the passage');
const twoAnswer = QUESTIONS.MCQ.findIndex((q) => q.options.filter((o) => o.correct).length === 2 && q.options.length === 4);
pick(view, '#q-MCQ', twoAnswer);
assert.match(text(view.querySelector('.prompt-box')), /the 2 correct options/);
const boxes = [...view.querySelectorAll('input[type=checkbox][value]')];
assert.equal(boxes.length, 4);
boxes[0].checked = true; boxes[0].dispatchEvent(ev('change'));
submit(view).click();
c = calls.pop();
assert.equal(c.typeId, 'MCQ');
assert.deepEqual(c.body.options.map((o) => o.id), ['A', 'B', 'C', 'D']);
assert.deepEqual(c.body.options.map((o) => o.selected), [true, false, false, false]);
assert.deepEqual(c.body.options.map((o) => o.is_correct), QUESTIONS.MCQ[twoAnswer].options.map((o) => o.correct));
assert.equal(c.answerPreview, 'selected: A');
// switching question clears the ticks; nothing selected is a valid submission
pick(view, '#q-MCQ', 0);
submit(view).click();
assert.ok(calls.pop().body.options.every((o) => o.selected === false));
// 6-option question renders six boxes
pick(view, '#q-MCQ', QUESTIONS.MCQ.findIndex((q) => q.options.length === 6));
assert.equal(view.querySelectorAll('input[type=checkbox][value]').length, 6);

// Email: async by default, word counter, request shape
view = buildTextTestView(TEST_TYPES.find((t) => t.id === 'EMAIL_WRITING'), deps);
assert.equal(view.querySelector('#mode-EMAIL_WRITING').value, 'async');
const area = view.querySelector('textarea.email-input');
area.value = 'Dear HR, I would like two days of leave. Regards, Ravi';
area.dispatchEvent(ev('input'));
assert.match(text(view), /11 words/);
submit(view).click();
c = calls.pop();
assert.equal(c.mode, 'async');
assert.deepEqual(c.body, { question: QUESTIONS.EMAIL_WRITING[0].text, answer: area.value });

// ---- 3) results render --------------------------------------------------------------------------
const base = { request_id: 'X', status: 'COMPLETED', flags: [], reason: null };
const outcome = (question_type, score, evaluation, raw_metrics) => ({
  ok: true, elapsedMs: 5, result: { ...base, question_type, score, raw_metrics, evaluation } });

let el = renderResult({ meta: { mode: 'sync' }, outcome: outcome('FILL_BLANKS', 1, {
  answer_check: { correct: true, expected: 'watches', submitted: 'WATCHES', normalized_expected: 'watches', normalized_submitted: 'watches' },
  score_components: [{ metric: 'answer_correctness', value: 1, weight: 1, weighted_value: 1 }] }, { answer_correctness: 1 }) });
assert.match(text(el), /Answer check \(fill in the blank\)/);
assert.match(text(el), /Resultcorrect/);
assert.match(text(el), /SubmittedWATCHES/);
assert.doesNotMatch(text(el), /What the system heard|Acoustic/);

el = renderResult({ meta: { mode: 'sync' }, outcome: outcome('FILL_BLANKS', 0, {
  answer_check: { correct: false, expected: 'watches', submitted: '', normalized_expected: 'watches', normalized_submitted: '' } }, { answer_correctness: 0 }) });
assert.match(text(el), /Resultincorrect/);
assert.match(text(el), /\(empty\)/);

el = renderResult({ meta: { mode: 'sync' }, outcome: outcome('FILL_BLANKS', 1, {
  answer_check: { correct: true, matched_answer: 'watching', expected: 'is watching', accepted_answers: ['watching', 'be watching'],
    submitted: 'Watching', normalized_expected: 'is watching', normalized_submitted: 'watching' } }, { answer_correctness: 1 }) });
assert.match(text(el), /Matched answerwatching/);
assert.match(text(el), /Also acceptedwatching \| be watching/);

el = renderResult({ meta: { mode: 'sync' }, outcome: outcome('MCQ', 0.5, {
  answer_check: { outcome: 'PARTIAL', credit: 0.5, correct_options: ['A', 'C'], selected_options: ['A'], correct_selected: ['A'], wrong_selected: [], missed: ['C'] } },
  { correctness: 0.5 }) });
assert.match(text(el), /Answer check \(MCQ\)/);
assert.match(text(el), /PARTIAL/);
assert.match(text(el), /Correct options: AC/);       // two separate chips, adjacent in textContent
assert.match(text(el), /Missed: C/);
assert.match(text(el), /Wrong picks: none/);

el = renderResult({ meta: { mode: 'async' }, outcome: outcome('EMAIL_WRITING', 0.8, {
  language: { prompt_version: 'v1', dimensions: {
    relevance: { score: 0.9, justification: 'Addresses the leave request.' }, tone: { score: 0.7, justification: '<b>polite</b>' } } } },
  { relevance: 0.9, tone: 0.7 }) });
assert.match(text(el), /Language evaluation \(Gemini/);
assert.match(text(el), /Addresses the leave request/);
assert.equal(el.querySelectorAll('b').length, 0, 'justifications stay inert text');

console.log('text question type tests passed');
