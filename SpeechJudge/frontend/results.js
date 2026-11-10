import { h, fmt, pct, scoreBand } from './dom.js';

const ACOUSTIC_FIELDS = [
  ['Duration', 'duration_s', 's'], ['Speech time', 'speech_duration_s', 's'],
  ['Silence', 'silence_duration_s', 's'], ['Pauses', 'pause_count', ''],
  ['Pause time', 'pause_duration_s', 's'], ['Pause ratio', 'pause_ratio', ''],
  ['Speech rate', 'speech_rate_wpm', 'wpm'], ['Articulation rate', 'articulation_rate_wpm', 'wpm'],
  ['Rate source', 'rate_source', ''], ['Pitch mean', 'pitch_mean_hz', 'Hz'],
  ['Pitch range', 'pitch_range_hz', 'Hz'], ['Pitch std', 'pitch_std_hz', 'Hz'],
  ['Pitch variation', 'pitch_std_st', 'st'], ['Pitch range (5–95%)', 'pitch_range_st', 'st'],
  ['End-of-sentence pitch', 'terminal_pitch_delta_st', 'st'], ['Syllable loudness var.', 'syllable_energy_std_db', 'dB'],
  ['Hesitation pauses', 'mid_clause_pause_count', ''], ['Sentence-break pauses', 'boundary_pause_count', ''],
  ['Long pauses (≥1 s)', 'long_pause_count', ''], ['Mean run length', 'mean_run_length', 'words'],
  ['Fillers / repeats', 'hesitation_count', ''],
  ['Loudness', 'loudness_lufs', 'LUFS'],
  ['SNR', 'snr_db', 'dB'], ['Clipping', 'clipping_ratio', ''],
  ['Leading silence', 'leading_silence_s', 's'], ['Trailing silence', 'trailing_silence_s', 's'],
  ['Audio quality', 'audio_quality_score', ''],
];

function section(title, ...body) {
  return h('section', { class: 'panel' }, h('h3', {}, title), ...body);
}

function table(headers, rows) {
  return h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, headers.map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}

function bar(value) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  return h('div', { class: `bar ${scoreBand(v)}`, role: 'img', 'aria-label': `${pct(v)}` },
    h('div', { style: { width: `${v * 100}%` } }));
}

function wordList(label, words) {
  return h('div', { class: 'wordlist' }, h('strong', {}, `${label}: `),
    words.length ? words.map((w) => h('span', { class: 'chip bad' }, w)) : h('span', { class: 'muted' }, 'none'));
}

export function renderResult({ outcome, meta }) {
  const root = h('div', { class: 'result', 'aria-live': 'polite' });

  if (!outcome.ok || !outcome.result) {
    root.append(h('div', { class: 'banner error', role: 'alert' }, outcome.error || 'No result'));
    return root;
  }
  const r = outcome.result;
  const ev = r.evaluation || {};
  const band = scoreBand(r.score);

  // Header
  root.append(h('div', { class: 'result-head' },
    h('div', { class: `score-big ${band}` },
      h('span', { class: 'score-num' }, r.score == null ? '—' : pct(r.score)),
      h('span', { class: 'score-sub' }, r.score == null ? 'no score' : `${fmt(r.score, 3)} / 1`)),
    h('div', { class: 'result-meta' },
      h('span', { class: `badge status-${r.status}` }, r.status),
      (r.flags || []).map((f) => h('span', { class: 'badge flag' }, f)),
      h('span', { class: 'muted' }, `${(outcome.elapsedMs / 1000).toFixed(1)}s · ${meta.mode} · ${r.request_id}`))));

  if (r.reason) root.append(h('div', { class: `banner ${r.status === 'FAILED' ? 'error' : 'warn'}`, role: 'alert' }, `Reason: ${r.reason}`));
  if (r.status === 'LOW_AUDIO_QUALITY') {
    root.append(h('p', { class: 'muted' }, 'The audio quality gate stopped processing before any model ran, so no transcript or score exists.'));
  }

  // Score components
  if (ev.score_components) {
    root.append(section('Score breakdown',
      table(['Metric', 'Value', 'Weight', 'Contribution', ''],
        ev.score_components.map((c) => [c.metric, fmt(c.value), fmt(c.weight), fmt(c.weighted_value, 3), bar(c.value)]))));
  }

  // Fill blanks / MCQ: how the answer was graded
  if (ev.answer_check) root.append(renderAnswerCheck(ev.answer_check));

  // Transcript + text comparison
  if (ev.transcription) {
    const t = ev.transcription;
    const kids = [h('p', { class: 'transcript' }, t.text ? `“${t.text}”` : h('em', {}, '(empty transcript)'))];
    if (meta.expected) kids.unshift(h('p', { class: 'muted' }, 'Expected: ', h('span', { class: 'expected' }, meta.expected)));
    root.append(section('What the system heard (Whisper)', ...kids));
  }
  if (ev.text_comparison) {
    const c = ev.text_comparison;
    root.append(section('Text comparison',
      h('div', { class: 'kv-grid' },
        kv('Word accuracy', pct(c.word_accuracy)), kv('WER', fmt(c.wer)),
        kv('Order correctness', pct(c.order_correctness)),
        kv('Expected words', c.expected_word_count), kv('Heard words', c.hypothesis_word_count),
        kv('Subs / Del / Ins', `${c.substitutions} / ${c.deletions} / ${c.insertions}`)),
      wordList('Missing', c.missing_words || []),
      wordList('Extra', c.extra_words || []),
      h('div', { class: 'wordlist' }, h('strong', {}, 'Substituted: '),
        (c.substituted_words || []).length
          ? c.substituted_words.map((s) => h('span', { class: 'chip bad' }, `${s.expected} → ${s.spoken}`))
          : h('span', { class: 'muted' }, 'none'))));
  }

  // Language
  if (ev.language) {
    const dims = Object.entries(ev.language.dimensions || {});
    root.append(section(`Language evaluation (Gemini · prompt ${ev.language.prompt_version})`,
      table(['Dimension', 'Score', '', 'Justification'],
        dims.map(([k, v]) => [k, fmt(v.score), bar(v.score), v.justification]))));
  }

  // Pronunciation (phoneme analysis, GOPT, or mock placeholder)
  if (ev.gopt) root.append(renderPronunciation(ev.gopt));

  // Acoustic
  if (ev.acoustic) {
    const a = ev.acoustic;
    const items = ACOUSTIC_FIELDS.filter(([, k]) => a[k] !== undefined && a[k] !== null)
      .map(([label, k, unit]) => kv(label, typeof a[k] === 'number' ? `${Number.isInteger(a[k]) ? a[k] : fmt(a[k])}${unit ? ' ' + unit : ''}` : a[k]));
    root.append(section('Acoustic analysis', h('div', { class: 'kv-grid' }, items)));
  }

  // Raw metrics + JSON
  if (r.raw_metrics) {
    root.append(section('Raw metrics (0–1, before weighting)',
      h('div', { class: 'kv-grid' }, Object.entries(r.raw_metrics).map(([k, v]) => kv(k, fmt(v))))));
  }
  root.append(h('details', {}, h('summary', {}, 'Raw JSON response'),
    h('pre', { class: 'json' }, JSON.stringify(r, null, 2))));
  return root;
}

const OUTCOME_LABEL = { FULL: 'all correct options, nothing else', PARTIAL: 'some of the correct options, no wrong one', NONE: 'no credit' };

function chips(items, cls = '') {
  return items.length ? items.map((x) => h('span', { class: `chip ${cls}`.trim() }, x)) : h('span', { class: 'muted' }, 'none');
}

function renderAnswerCheck(a) {
  if (a.outcome) {                       // MCQ
    return section('Answer check (MCQ)',
      h('div', { class: 'kv-grid' }, kv('Outcome', `${a.outcome} · ${OUTCOME_LABEL[a.outcome] || ''}`), kv('Credit', pct(a.credit))),
      h('div', { class: 'wordlist' }, h('strong', {}, 'Correct options: '), chips(a.correct_options || [])),
      h('div', { class: 'wordlist' }, h('strong', {}, 'Selected: '), chips(a.selected_options || [])),
      h('div', { class: 'wordlist' }, h('strong', {}, 'Wrong picks: '), chips(a.wrong_selected || [], 'bad')),
      h('div', { class: 'wordlist' }, h('strong', {}, 'Missed: '), chips(a.missed || [], 'bad')));
  }
  return section('Answer check (fill in the blank)',   // FILL_BLANKS
    h('div', { class: 'kv-grid' },
      kv('Result', a.correct ? 'correct' : 'incorrect'), kv('Expected', a.expected), kv('Submitted', a.submitted || '(empty)'),
      a.correct ? kv('Matched answer', a.matched_answer) : null,
      (a.accepted_answers || []).length ? kv('Also accepted', a.accepted_answers.join(' | ')) : null,
      kv('Compared as', `${a.normalized_submitted || '(empty)'}  vs  ${a.normalized_expected}`)));
}

const ERROR_LABEL = { substitution: 'wrong sound', near: 'close', deletion: 'missing', insertion: 'extra' };

function renderPronunciation(g) {
  const method = g.method || 'gopt';
  const title = method === 'phoneme_ctc'
    ? `Pronunciation (phoneme analysis · ${g.details?.accent_profile || 'accent profile'})`
    : method === 'mock' ? 'Pronunciation (MOCK)' : 'Pronunciation (GOPT)';
  const parts = [];
  if (method === 'mock') {
    parts.push(h('div', { class: 'banner warn' }, 'Pronunciation is mocked: these values are fixed placeholders, not real scores.'));
  }
  const grid = [kv('Pronunciation', pct(g.pronunciation)), kv('Completeness', pct(g.completeness))];
  if (g.fluency != null) grid.push(kv('Fluency (GOPT)', pct(g.fluency)));
  if (g.prosody != null) grid.push(kv('Prosody (GOPT)', pct(g.prosody)));
  if (g.details?.weighted_per != null) {
    grid.push(kv('Weighted phoneme error', pct(g.details.weighted_per)), kv('Raw phoneme error', pct(g.details.raw_per)));
  }
  parts.push(h('div', { class: 'kv-grid' }, grid));

  if (method === 'phoneme_ctc') {
    parts.push(h('p', { class: 'muted small' }, 'Sounds the student is expected to make vs sounds the recogniser heard. Differences typical of Indian English (e.g. th→t, v/w) are tolerated and not counted as errors.'));
    parts.push(h('p', { class: 'ipa' }, h('strong', {}, 'Expected: '), g.details.expected_phonemes));
    parts.push(h('p', { class: 'ipa' }, h('strong', {}, 'Heard:    '), g.details.heard_phonemes));
    parts.push(table(['Word', 'Score', '', 'Mistakes'],
      (g.words || []).map((w) => [
        w.word, pct(w.accuracy), bar(w.accuracy),
        w.errors.length ? w.errors.map((e) => h('span', { class: `chip ${e.type === 'near' ? '' : 'bad'}`, title: ERROR_LABEL[e.type] || e.type },
          `${e.expected ?? '∅'} → ${e.heard ?? '∅'}`)) : h('span', { class: 'muted' }, 'none'),
      ])));
  } else if ((g.words || []).length && method === 'gopt') {
    parts.push(table(['Word', 'Accuracy'], g.words.map((w) => [w.word, pct(w.accuracy)])));
  }
  return section(title, ...parts);
}

function kv(k, v) {
  return h('div', { class: 'kv' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, String(v)));
}
