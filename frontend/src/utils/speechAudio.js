/**
 * Browser audio helpers for speech tests.
 *
 * Whatever the browser records (usually webm/opus) is converted here to 16 kHz
 * mono 16-bit WAV before it leaves the page. That is the format SpeechJudge
 * decodes without FFmpeg, and it is what the server validates on upload.
 */

export const TARGET_RATE = 16000;

/** Encodes mono float samples as a 16-bit PCM WAV. */
export function encodeWav(samples, sampleRate = TARGET_RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/**
 * Decodes a recorded blob and resamples it to 16 kHz mono WAV.
 * @returns {Promise<{blob: Blob, durationS: number, bytes: number}>}
 */
export async function blobToWav16k(blob) {
  const encoded = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  let decoded;
  try {
    decoded = await ctx.decodeAudioData(encoded.slice(0));
  } finally {
    ctx.close();
  }

  const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
  const offline = new OfflineAudioContext(1, length, TARGET_RATE); // mixes down and resamples
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const samples = rendered.getChannelData(0);
  const wav = new Uint8Array(encodeWav(samples, TARGET_RATE));
  return {
    blob: new Blob([wav], { type: "audio/wav" }),
    durationS: samples.length / TARGET_RATE,
    bytes: wav.length,
  };
}

/** Microphone recorder with a live level callback. */
export class MicRecorder {
  constructor(onLevel) {
    this.onLevel = onLevel;
    this.chunks = [];
    this.recorder = null;
    this.stream = null;
    this.raf = 0;
    this.audioCtx = null;
    this.analyser = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.chunks = [];

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioCtx();
    // Some browsers start the context suspended until it is resumed.
    if (this.audioCtx.state === "suspended") await this.audioCtx.resume();

    // Exposed so a visualiser (AudioWaveform) can read the live signal itself.
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.audioCtx.createMediaStreamSource(this.stream).connect(this.analyser);

    // Optional simple peak callback, for callers that just want a number.
    if (this.onLevel) {
      const buf = new Float32Array(this.analyser.fftSize);
      const tick = () => {
        this.analyser.getFloatTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v));
        this.onLevel(peak);
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    }

    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  /** Stops and resolves with the raw recording. Safe to call twice. */
  stop() {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        this.release();
        resolve(null);
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType || "audio/webm" });
        this.release();
        resolve(blob);
      };
      this.recorder.stop();
    });
  }

  /** Frees the microphone without producing a recording. */
  release() {
    cancelAnimationFrame(this.raf);
    this.onLevel?.(0);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioCtx?.close();
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
  }
}
