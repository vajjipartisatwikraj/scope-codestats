// Audio helpers. Everything sent to the backend is converted to 16 kHz mono 16-bit WAV in the
// browser, so the backend never needs FFmpeg for the test UI (mic recordings are webm/opus and
// uploads can be mp3/m4a/ogg; the browser decodes them for us).

export const TARGET_RATE = 16000;

// ---- pure functions (unit-testable without a browser) ------------------------------------
export function encodeWav(samples, sampleRate = TARGET_RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);              // block align
  view.setUint16(34, 16, true);             // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Deterministic PRNG so synthetic test audio and shuffles are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wordsOf(sentence) {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

// Shuffle words, guaranteeing the result differs from the original order when possible.
export function shuffleWords(sentence, seed = Date.now()) {
  const words = wordsOf(sentence);
  if (words.length < 2) return words;
  const rand = mulberry32(seed);
  for (let attempt = 0; attempt < 20; attempt++) {
    const out = words.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.join(' ') !== words.join(' ')) return out;
  }
  return words.slice().reverse();
}

// Speech-like test signal: 150 Hz harmonics with ~4 Hz syllabic modulation (same idea as the
// backend's test fixtures). NOT real speech; only for exercising the audio quality gate.
export function synthSpeechLike({ seconds = 4, amplitude = 0.3, noise = 0.001, seed = 1 } = {}) {
  const n = Math.floor(seconds * TARGET_RATE);
  const out = new Float32Array(n);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const t = i / TARGET_RATE;
    let carrier = 0;
    for (let k = 1; k <= 5; k++) carrier += Math.sin(2 * Math.PI * 150 * k * t + k) / k;
    const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * 4 * t);
    const gauss = (rand() + rand() + rand() + rand() - 2) * 1.7;
    out[i] = Math.max(-1, Math.min(1, (amplitude * carrier * env) / 2.3 + noise * gauss));
  }
  return out;
}

export function synthSilence(seconds = 3, noise = 0.0005, seed = 2) {
  const n = Math.floor(seconds * TARGET_RATE);
  const out = new Float32Array(n);
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i++) out[i] = noise * (rand() + rand() + rand() + rand() - 2) * 1.7;
  return out;
}

export function clipSamples(samples, gain) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i] * gain));
  return out;
}

// ---- browser-only ------------------------------------------------------------------------
export async function blobToWav16k(blob) {
  const encoded = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(encoded.slice(0));
  } finally {
    ctx.close();
  }
  const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
  const offline = new OfflineAudioContext(1, length, TARGET_RATE); // mixes down + resamples
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return samplesToAudio(rendered.getChannelData(0));
}

export function samplesToAudio(samples) {
  const wav = new Uint8Array(encodeWav(samples, TARGET_RATE));
  return {
    blob: new Blob([wav], { type: 'audio/wav' }),
    base64: bytesToBase64(wav),
    durationS: samples.length / TARGET_RATE,
    bytes: wav.length,
  };
}

export class Recorder {
  constructor(onLevel) {
    this.onLevel = onLevel;
    this.chunks = [];
    this.recorder = null;
    this.stream = null;
    this.raf = 0;
    this.audioCtx = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new Ctx();
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    this.audioCtx.createMediaStreamSource(this.stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v));
      this.onLevel?.(peak);
      this.raf = requestAnimationFrame(tick);
    };
    tick();
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start();
  }

  stop() {
    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        cancelAnimationFrame(this.raf);
        this.onLevel?.(0);
        this.stream.getTracks().forEach((t) => t.stop());
        this.audioCtx?.close();
        resolve(new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' }));
      };
      this.recorder.stop();
    });
  }
}
