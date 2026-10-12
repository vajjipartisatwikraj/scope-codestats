/**
 * Turns the speech judge's detailed result for one question into the compact
 * `analysis` object stored with the section and shown on the results page.
 *
 * The judge returns a lot (model internals, every phoneme step, raw numbers).
 * This keeps only what the page draws, in 0..100 scores and plain structures,
 * and leaves out anything the judge did not measure.
 */

const { isNumber, pct, plural, round2 } = require("./common");
const { alignWords } = require("./alignWords");
const { buildPronunciation } = require("./pronunciationReport");
const { buildFluency } = require("./fluencyReport");
const { buildLanguage } = require("./languageReport");
const { buildFeedback } = require("./feedback");
const { questionSkills } = require("./skills");
const { buildTextAnalysis, TEXT_ONLY_TYPES } = require("./textAnswerReport");

const ANALYSIS_VERSION = 1;
const TEXT_MATCH_TYPES = ["READING", "REPEAT", "JUMBLED"];

function transcriptionNote(counts) {
  const parts = [];
  if (counts.substitutions) parts.push(`${plural(counts.substitutions, "word")} substituted`);
  if (counts.missing) parts.push(`${plural(counts.missing, "word")} missing`);
  if (counts.extra) parts.push(`${plural(counts.extra, "extra word")}`);
  return parts.length ? parts.slice(0, 2).join(", ") : "All words correct";
}

/** The sentence-versus-speech comparison, for question types that have a target sentence. */
function buildTranscription({ sectionType, question, evaluation, raw, answer }) {
  const transcript = evaluation.transcription?.text || "";
  const comparison = evaluation.text_comparison;

  if (!TEXT_MATCH_TYPES.includes(sectionType) || !comparison) {
    return transcript ? { text: transcript } : null;
  }

  // On-screen jumbled answers have no recording; the heard text is what was submitted.
  const heard = transcript || answer?.text || "";
  const aligned = alignWords(question.text, heard);
  const errors = aligned.counts.substitutions + aligned.counts.missing + aligned.counts.extra;

  return {
    text: heard,
    score: pct(raw.word_accuracy ?? comparison.word_accuracy),
    rows: aligned.rows,
    counts: aligned.counts,
    expectedCount: aligned.expectedCount,
    errorCount: errors,
    summary: `Transcription score is 100% minus the word error rate (${plural(errors, "error")} in ${plural(
      aligned.expectedCount,
      "word"
    )}).`,
    note: transcriptionNote(aligned.counts),
  };
}

/** The three headline numbers shown as rings and as columns of the question list. */
function buildRings({ sectionType, transcription, pronunciation, fluency, language, raw }) {
  const rings = [];

  if (TEXT_MATCH_TYPES.includes(sectionType) && transcription?.rows) {
    const label = sectionType === "JUMBLED" ? "Accuracy" : "Transcription";
    rings.push({ key: "transcription", label, score: transcription.score, note: transcription.note });
  }
  if (sectionType === "JUMBLED" && isNumber(raw.order_correctness)) {
    rings.push({ key: "order", label: "Word order", score: pct(raw.order_correctness), note: "" });
  }
  if (pronunciation) {
    rings.push({ key: "pronunciation", label: "Pronunciation", score: pronunciation.score, note: pronunciation.note });
  }
  if (language) {
    rings.push({ key: "language", label: "Language", score: language.score, note: `${language.dimensions.length} criteria scored` });
  }
  if (fluency && fluency.score !== null) {
    rings.push({ key: "fluency", label: "Fluency", score: fluency.score, note: fluency.note });
  }
  if (!pronunciation && !language && isNumber(raw.prosody)) {
    rings.push({ key: "prosody", label: "Delivery", score: pct(raw.prosody), note: "" });
  }
  return rings.slice(0, 3);
}

/**
 * @param {object} p
 * @param {string} p.sectionType
 * @param {object} p.question      the test's question ({ _id, text })
 * @param {object} p.judged        the judge's per-question result, with `detail`
 * @param {object} [p.answer]      the stored answer ({ kind, text, durationS }); audio is not used
 * @returns {object|null} null when the judge sent no detail
 */
function buildQuestionAnalysis({ sectionType, question, judged, answer }) {
  // Typed and chosen answers have no audio to analyse; they get their own breakdown.
  if (TEXT_ONLY_TYPES.includes(sectionType)) return buildTextAnalysis({ sectionType, question, judged, answer });

  const detail = judged?.detail;
  const evaluation = detail?.evaluation;
  if (!evaluation) return null;

  const raw = detail.raw_metrics || {};
  const acoustic = evaluation.acoustic || null;

  const transcription = buildTranscription({ sectionType, question, evaluation, raw, answer });
  const pronunciation = buildPronunciation(evaluation.gopt);
  const language = buildLanguage(evaluation.language);
  const fluency = buildFluency(acoustic, evaluation.transcription?.word_timestamps, raw.fluency);

  const rings = buildRings({ sectionType, transcription, pronunciation, fluency, language, raw });

  const tabs = ["overview"];
  if (transcription) tabs.push("transcription");
  if (pronunciation) tabs.push("pronunciation");
  if (language) tabs.push("language");
  if (fluency) tabs.push("fluency");

  return {
    version: ANALYSIS_VERSION,
    durationS: round2(acoustic?.original_duration_s ?? answer?.durationS ?? 0),
    rings,
    tabs,
    transcription,
    pronunciation,
    fluency,
    language,
    feedback: buildFeedback({ transcription, pronunciation, fluency, language }),
    skills: questionSkills(sectionType, raw, acoustic),
  };
}

module.exports = { buildQuestionAnalysis };
