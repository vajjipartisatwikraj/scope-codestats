// Run: node frontend/tests/audio.test.mjs   (pure-function checks; no browser needed)
import assert from 'node:assert/strict';
import { encodeWav, shuffleWords, synthSilence, synthSpeechLike, clipSamples, bytesToBase64, TARGET_RATE } from '../audio.js';

// WAV header + size
const wav = new Uint8Array(encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]), TARGET_RATE));
const dv = new DataView(wav.buffer);
assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
assert.equal(dv.getUint32(24, true), 16000);
assert.equal(dv.getUint16(22, true), 1);
assert.equal(dv.getUint16(34, true), 16);
assert.equal(wav.length, 44 + 10);
assert.equal(dv.getInt16(44 + 6, true), 32767);   // +1.0 -> max
assert.equal(dv.getInt16(44 + 8, true), -32768);  // -1.0 -> min

// shuffle: same multiset, different order, deterministic per seed
const s = 'the quick brown fox jumps over the lazy dog';
const a = shuffleWords(s, 7), b = shuffleWords(s, 7);
assert.deepEqual(a, b);
assert.notEqual(a.join(' '), s);
assert.deepEqual([...a].sort(), s.split(' ').sort());

// synthetic signals
assert.equal(synthSilence(1).length, 16000);
const sp = synthSpeechLike({ seconds: 1 });
assert.equal(sp.length, 16000);
assert.ok(Math.max(...sp) <= 1 && Math.min(...sp) >= -1);
const clipped = clipSamples(sp, 8);
assert.ok(clipped.filter((v) => Math.abs(v) >= 0.999).length / clipped.length > 0.05);

// base64 round trip
assert.equal(Buffer.from(bytesToBase64(wav), 'base64').length, wav.length);

// --- optional: send gate scenarios through the proxy (needs backend + proxy running) ---
const base = process.env.UI_URL || 'http://127.0.0.1:8080';
const post = async (body) => {
  const r = await fetch(`${base}/api/v1/evaluate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};
const mk = (samples) => bytesToBase64(new Uint8Array(encodeWav(samples)));
const text = 'The weather is beautiful today.';
try {
  await fetch(`${base}/api/v1/health`);
} catch {
  console.log('unit checks passed; proxy not running, skipping live checks');
  process.exit(0);
}
let r = await post({ request_id: 'N1', question_type: 'READING', audio: mk(synthSilence(3)), expected_text: text });
assert.equal(r.data.reason, 'Insufficient speech signal');
r = await post({ request_id: 'N2', question_type: 'READING', audio: mk(synthSpeechLike({ seconds: 0.4 })), expected_text: text });
assert.equal(r.data.reason, 'Audio too short');
r = await post({ request_id: 'N3', question_type: 'READING', audio: mk(clipSamples(synthSpeechLike({ seconds: 3 }), 8)), expected_text: text });
assert.ok(r.data.flags.includes('CLIPPING'), JSON.stringify(r.data.flags));
r = await post({ request_id: 'N4', question_type: 'READING', audio: mk(synthSpeechLike({ seconds: 4, noise: 0.04 })), expected_text: text });
assert.ok(r.data.flags.includes('EXCESSIVE_NOISE'), JSON.stringify(r.data.flags));
r = await post({ request_id: 'N5', question_type: 'READING', expected_text: text });
assert.equal(r.status, 422);
r = await post({ request_id: 'N6', question_type: 'JUMBLED', expected_text: 'the cat sat on the mat', question_config: { submitted_text: 'the cat sat on the mat' } });
assert.ok(r.data.score > 0.999);
console.log('all unit and live gate checks passed');
