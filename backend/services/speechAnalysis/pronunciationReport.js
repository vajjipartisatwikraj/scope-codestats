/**
 * Pronunciation tab: for each expected word, the sounds it should contain, the
 * sounds the recogniser heard, and how closely they matched.
 *
 * Source: the judge's `gopt` block (phoneme model). Only built when that block
 * has per-word results.
 */

const { pct, plural, round1 } = require("./common");

/** Splits "k æ t" into tokens and flags the ones named in `errors` (each used once). */
function flagUnits(text, errors, side) {
  const pending = errors.map((e) => e[side]).filter(Boolean);
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((symbol) => {
      const at = pending.indexOf(symbol);
      if (at >= 0) pending.splice(at, 1);
      return { symbol, wrong: at >= 0 };
    });
}

const levelOf = (accuracy) => (accuracy >= 90 ? "good" : accuracy >= 70 ? "warn" : "poor");

function buildPronunciation(gopt) {
  const words = Array.isArray(gopt?.words) ? gopt.words : [];
  if (words.length === 0) return null;

  const rows = words.map((word) => {
    const errors = Array.isArray(word.errors) ? word.errors : [];
    const accuracy = pct(word.accuracy);
    return {
      word: word.word,
      accuracy,
      level: levelOf(accuracy),
      expectedUnits: flagUnits(word.expected, errors, "expected"),
      heardUnits: flagUnits(word.heard, errors, "heard"),
      errorCount: errors.length,
    };
  });

  const average = rows.reduce((sum, row) => sum + row.accuracy, 0) / rows.length;
  const soundsToImprove = rows.reduce((sum, row) => sum + row.errorCount, 0);

  return {
    score: pct(gopt.pronunciation),
    averageMatch: round1(average),
    soundsToImprove,
    note: soundsToImprove === 0 ? "All sounds matched" : `${plural(soundsToImprove, "sound")} to improve`,
    words: rows,
  };
}

module.exports = { buildPronunciation };
