import { h, fmt } from './dom.js';
import { Recorder, blobToWav16k } from './audio.js';

// Record from the microphone or upload a file. Always produces 16 kHz mono WAV (see audio.js).
export function createRecorderWidget({ onChange } = {}) {
  let audio = null;        // { blob, base64, durationS, bytes }
  let recorder = null;
  let timer = 0;
  let startedAt = 0;

  const status = h('div', { class: 'rec-status', role: 'status', 'aria-live': 'polite' }, 'No audio yet.');
  const level = h('div', { class: 'level', 'aria-hidden': 'true' }, h('div'));
  const clock = h('span', { class: 'clock' }, '0:00');
  const player = h('audio', { controls: true, class: 'player', hidden: true });
  const recBtn = h('button', { type: 'button', class: 'btn primary' }, '● Record');
  const fileInput = h('input', { type: 'file', accept: 'audio/*', hidden: true });
  const uploadBtn = h('button', { type: 'button', class: 'btn' }, 'Upload audio file');
  const clearBtn = h('button', { type: 'button', class: 'btn ghost' }, 'Clear');

  const setAudio = (a, label) => {
    audio = a;
    if (player.src) URL.revokeObjectURL(player.src);
    if (a) {
      player.src = URL.createObjectURL(a.blob);
      player.hidden = false;
      status.textContent = `${label}: ${fmt(a.durationS, 1)} s, ${(a.bytes / 1024).toFixed(0)} KB (16 kHz mono WAV)`;
    } else {
      player.removeAttribute('src');
      player.hidden = true;
      status.textContent = 'No audio yet.';
    }
    onChange?.(audio);
  };

  const setLevel = (peak) => { level.firstChild.style.width = `${Math.min(100, peak * 140)}%`; };

  async function toggleRecord() {
    if (recorder) {
      clearInterval(timer);
      recBtn.disabled = true;
      status.textContent = 'Processing recording…';
      try {
        const blob = await recorder.stop();
        recorder = null;
        setAudio(await blobToWav16k(blob), 'Recorded');
      } catch (e) {
        setAudio(null);
        status.textContent = `Could not process the recording: ${e.message || e}`;
      }
      recBtn.textContent = '● Record';
      recBtn.classList.add('primary');
      recBtn.classList.remove('recording');
      recBtn.disabled = false;
      return;
    }
    try {
      recorder = new Recorder(setLevel);
      await recorder.start();
    } catch (e) {
      recorder = null;
      status.textContent = `Microphone unavailable: ${e.message || e}. Allow mic access or use Upload.`;
      return;
    }
    setAudio(null);
    startedAt = performance.now();
    status.textContent = 'Recording… speak now.';
    recBtn.textContent = '■ Stop';
    recBtn.classList.add('recording');
    timer = setInterval(() => {
      const s = Math.floor((performance.now() - startedAt) / 1000);
      clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 250);
  }

  recBtn.addEventListener('click', toggleRecord);
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    status.textContent = `Converting ${file.name}…`;
    try {
      setAudio(await blobToWav16k(file), `Loaded ${file.name}`);
    } catch (e) {
      setAudio(null);
      status.textContent = `This browser could not decode ${file.name}. Try WAV or MP3.`;
    }
  });
  clearBtn.addEventListener('click', () => { setAudio(null); clock.textContent = '0:00'; });

  const el = h('div', { class: 'recorder' },
    h('div', { class: 'rec-row' }, recBtn, clock, level, uploadBtn, clearBtn, fileInput),
    status, player);

  return { el, getAudio: () => audio, clear: () => setAudio(null), setExternal: (a, label) => setAudio(a, label) };
}
