// Renders real backend responses with results.js inside jsdom (needs backend + proxy running).
//   npm install   (once, in frontend/tests)   then   node render.test.mjs
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { renderResult } = await import('../results.js');
const { encodeWav, bytesToBase64, synthSilence } = await import('../audio.js');
const base = process.env.UI_URL || 'http://127.0.0.1:8080';

const post = async (body) => {
  const t0 = performance.now();
  const r = await fetch(`${base}/api/v1/evaluate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, result: await r.json(), elapsedMs: performance.now() - t0 };
};
const text = (el) => el.textContent.replace(/\s+/g, ' ');

// 1) UI jumbled, imperfect order -> components + text comparison, no transcript
let o = await post({ request_id: 'R1', question_type: 'JUMBLED', expected_text: 'the cat sat on the mat', question_config: { submitted_text: 'the cat on sat the mat' } });
let el = renderResult({ outcome: o, meta: { mode: 'sync', expected: 'the cat sat on the mat' }, gopt_is_mock: true });
assert.match(text(el), /Score breakdown/);
assert.match(text(el), /Text comparison/);
assert.doesNotMatch(text(el), /What the system heard/);
assert.match(text(el), /75%/);

// 2) Low audio quality -> warning banner, no breakdown
o = await post({ request_id: 'R2', question_type: 'READING', audio: bytesToBase64(new Uint8Array(encodeWav(synthSilence(3)))), expected_text: 'hello there' });
el = renderResult({ outcome: o, meta: { mode: 'sync' }, gopt_is_mock: true });
assert.match(text(el), /LOW_AUDIO_QUALITY/);
assert.match(text(el), /Insufficient speech signal/);
assert.doesNotMatch(text(el), /Score breakdown/);

// 2b) Phoneme pronunciation panel from a real recording (skipped if fixtures are absent)
import { existsSync, readFileSync } from 'node:fs';
const clip = new URL('../../speech-judge/tests/fixtures/audio/heera_mispron.wav', import.meta.url);
if (existsSync(clip)) {
  o = await post({ request_id: 'R2b', question_type: 'READING', audio: readFileSync(clip).toString('base64'),
    expected_text: 'The doctor suggested that the apple is good for your health.' });
  el = renderResult({ outcome: o, meta: { mode: 'sync', expected: 'x' } });
  assert.match(text(el), /Pronunciation \(phoneme analysis/);
  assert.match(text(el), /Weighted phoneme error/);
  assert.match(text(el), /Mistakes/);
  assert.match(text(el), /Hesitation pauses|Pitch variation/);
  assert.doesNotMatch(text(el), /MOCK/);
}

// 3) Error outcome
el = renderResult({ outcome: { ok: false, error: 'HTTP 422: Missing required field(s)' }, meta: { mode: 'sync' } });
assert.match(text(el), /HTTP 422/);
assert.ok(el.querySelector('[role=alert]'));

// 4) Injection safety: markup in backend text must stay inert
const evil = { ok: true, elapsedMs: 10, result: { request_id: 'X', status: 'COMPLETED', question_type: 'READING', score: 0.5, flags: [], reason: null,
  raw_metrics: { a: 0.5 }, evaluation: { transcription: { text: '<img src=x onerror=alert(1)>' }, language: { prompt_version: 'v1', dimensions: { relevance: { score: 0.5, justification: '<script>alert(1)</script>' } } } } } };
el = renderResult({ outcome: evil, meta: { mode: 'sync' } });
assert.equal(el.querySelectorAll('img, script').length, 0);
assert.match(text(el), /<img src=x/);

// 5) Text-only types against the live backend: Fill blanks, MCQ, Email
o = await post({ request_id: 'R5', question_type: 'FILL_BLANKS', question: 'He ____ (watch) movies.', expected_text: 'watches', answer: ' WATCHES ' });
el = renderResult({ outcome: o, meta: { mode: 'sync' } });
assert.match(text(el), /Answer check \(fill in the blank\)/);
assert.match(text(el), /100%/);
assert.match(text(el), /Resultcorrect/);

const opts = (sel) => ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `Option ${id}`, is_correct: id === 'A' || id === 'B', selected: sel.includes(id) }));
o = await post({ request_id: 'R6', question_type: 'MCQ', options: opts('A') });
el = renderResult({ outcome: o, meta: { mode: 'sync' } });
assert.match(text(el), /Answer check \(MCQ\)/);
assert.match(text(el), /PARTIAL/);
assert.match(text(el), /50%/);
o = await post({ request_id: 'R6b', question_type: 'MCQ', options: opts('AB') });
assert.equal(o.result.score, 1);

o = await post({ request_id: 'R7', question_type: 'EMAIL_WRITING', question: 'Write an email to your HR manager requesting leave.', answer: 'Dear HR, I would like to request leave next week. Regards, Ravi' });
el = renderResult({ outcome: o, meta: { mode: 'sync' } });
assert.match(text(el), /Language evaluation/);
assert.match(text(el), /structure/);
assert.match(text(el), /tone/);
assert.doesNotMatch(text(el), /What the system heard|Acoustic analysis/);

console.log('render tests passed');
