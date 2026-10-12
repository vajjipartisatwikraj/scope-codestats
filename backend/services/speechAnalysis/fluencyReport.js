/**
 * Fluency tab: a timeline of speech and silence plus a grid of delivery
 * measurements, each judged against a plain target.
 *
 * Source: the judge's `acoustic` block (signal analysis) and the word
 * timestamps from `transcription`. A measurement the judge did not produce is
 * left out rather than shown as zero.
 */

const { isNumber, pct, round1, round2 } = require("./common");

const PAUSE_S = 0.25;
const IDEAL_WPM = [110, 150];
const IDEAL_SPEAKING = [3.5, 5];
const IDEAL_ARTICULATION = [4, 6];

/** One measurement tile. `good` decides the colour; `label` is the badge text. */
const tile = (key, label, value, unit, ideal, good, badge, note) => ({
  key,
  label,
  value,
  unit,
  ideal,
  tone: good ? "good" : "warn",
  badge,
  note: good ? "" : note,
});

/** In-range check for a [low, high] target, returning the badge and note to use. */
function rangeVerdict(value, [low, high], names) {
  if (value < low) return { good: false, badge: names.low, note: names.lowNote };
  if (value > high) return { good: false, badge: names.high, note: names.highNote };
  return { good: true, badge: "Good", note: "" };
}

function buildTiles(acoustic, hasWordTiming) {
  const tiles = [];
  const syllables = acoustic.syllable_count_estimate;
  const speechSpan = acoustic.speech_span_s;
  const speechTime = acoustic.speech_duration_s;

  if (isNumber(acoustic.speech_rate_wpm)) {
    const wpm = Math.round(acoustic.speech_rate_wpm);
    const v = rangeVerdict(wpm, IDEAL_WPM, {
      low: "Slow",
      high: "Fast",
      lowNote: "Speaking pace was slow",
      highNote: "Speaking pace was fast",
    });
    tiles.push(tile("wpm", "Words per minute", wpm, "", "Ideal 110 to 150", v.good, v.badge, v.note));
  }

  if (isNumber(syllables) && speechSpan > 0) {
    const value = round1(syllables / speechSpan);
    const v = rangeVerdict(value, IDEAL_SPEAKING, {
      low: "Slow",
      high: "Fast",
      lowNote: "Speaking speed was low",
      highNote: "Speaking speed was high",
    });
    tiles.push(tile("speaking", "Speaking speed", value, "syl/s", "Ideal 3.5 to 5", v.good, v.badge, v.note));
  }

  if (isNumber(syllables) && speechTime > 0) {
    const value = round1(syllables / speechTime);
    const v = rangeVerdict(value, IDEAL_ARTICULATION, {
      low: "Slow",
      high: "Fast",
      lowNote: "Articulation was slow",
      highNote: "Articulation was fast",
    });
    tiles.push(tile("articulation", "Articulation rate", value, "syl/s", "Ideal 4 to 6", v.good, v.badge, v.note));
  }

  if (isNumber(acoustic.pause_count)) {
    tiles.push(
      tile("pauses", "Pauses", acoustic.pause_count, "", "Ideal under 3", acoustic.pause_count < 3, "Many", "There were several pauses")
    );
  }
  if (isNumber(acoustic.pause_max_s)) {
    const value = round2(acoustic.pause_max_s);
    tiles.push(tile("longest", "Longest pause", value, "s", "Under 0.5 s", value < 0.5, "Long", "A pause was too long"));
  }
  if (isNumber(acoustic.leading_silence_s)) {
    const value = round2(acoustic.leading_silence_s);
    tiles.push(tile("start", "Start pause", value, "s", "Under 0.5 s", value < 0.5, "Long", "Start pause was long"));
  }
  if (isNumber(acoustic.trailing_silence_s)) {
    const value = round2(acoustic.trailing_silence_s);
    tiles.push(tile("trailing", "Trailing pause", value, "s", "Under 0.5 s", value < 0.5, "Long", "Ending pause was long"));
  }
  if (hasWordTiming && isNumber(acoustic.hesitation_count)) {
    tiles.push(
      tile("fillers", "Filler words", acoustic.hesitation_count, "", "Under 2", acoustic.hesitation_count < 2, "Many", "Filler words were used")
    );
  }
  if (isNumber(acoustic.pitch_std_hz)) {
    const value = Math.round(acoustic.pitch_std_hz);
    tiles.push(tile("pitch", "Pitch variation", value, "Hz", "Over 15 Hz", value >= 15, "Flat", "Pitch was fairly flat"));
  }
  if (isNumber(acoustic.snr_db)) {
    const value = Math.round(acoustic.snr_db);
    tiles.push(tile("noise", "Signal clarity", value, "dB", "Above 20 dB", value >= 20, "Noisy", "Background noise was noticeable"));
  }

  return tiles;
}

/**
 * Speech and silence along the recording: the pause before the first word, each
 * run of speech, each pause inside it, and the silence after the last word.
 */
function buildTimeline(acoustic, wordTimestamps) {
  const total = acoustic.duration_s;
  if (!isNumber(total) || total <= 0) return null;

  const words = (wordTimestamps || []).filter((w) => isNumber(w.start) && isNumber(w.end));
  const segments = [];
  const push = (type, from, to) => {
    const length = round2(to - from);
    if (length > 0.02) segments.push({ type, seconds: length });
  };

  if (words.length === 0) {
    // No word timing: fall back to the totals.
    push("start", 0, acoustic.leading_silence_s || 0);
    push("speech", 0, acoustic.speech_span_s || 0);
    push("end", 0, acoustic.trailing_silence_s || 0);
    return segments.length ? { totalS: round2(total), segments } : null;
  }

  push("start", 0, words[0].start);
  let runStart = words[0].start;
  for (let i = 1; i < words.length; i += 1) {
    if (words[i].start - words[i - 1].end >= PAUSE_S) {
      push("speech", runStart, words[i - 1].end);
      push("pause", words[i - 1].end, words[i].start);
      runStart = words[i].start;
    }
  }
  const last = words[words.length - 1].end;
  push("speech", runStart, last);
  push("end", last, total);

  return { totalS: round2(total), segments };
}

/**
 * @param {object} acoustic       judge `evaluation.acoustic`
 * @param {Array}  wordTimestamps judge `evaluation.transcription.word_timestamps`
 * @param {number|null} score     fluency raw metric, 0..1
 */
function buildFluency(acoustic, wordTimestamps, score) {
  if (!acoustic) return null;

  const hasWordTiming = Array.isArray(wordTimestamps) && wordTimestamps.length >= 4;
  const tiles = buildTiles(acoustic, hasWordTiming);
  if (tiles.length === 0) return null;

  const firstProblem = tiles.find((t) => t.tone === "warn");
  return {
    score: isNumber(score) ? pct(score) : null,
    note: firstProblem ? firstProblem.note : "Pace and pauses look good",
    timeline: buildTimeline(acoustic, wordTimestamps),
    tiles,
  };
}

/**
 * 0..100 pace score: full marks inside the ideal range, falling away as the
 * speaking rate drifts out of it. Used for the "Pace" axis of the skill profile.
 */
function paceScore(acoustic) {
  if (!isNumber(acoustic?.speech_rate_wpm)) return null;
  const wpm = acoustic.speech_rate_wpm;
  const [low, high] = IDEAL_WPM;
  const distance = wpm < low ? low - wpm : wpm > high ? wpm - high : 0;
  return Math.max(0, Math.round(100 - distance * 1.5));
}

module.exports = { buildFluency, paceScore };
