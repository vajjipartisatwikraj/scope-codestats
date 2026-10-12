/**
 * The "skill profile": a handful of 0..100 numbers per question that can be
 * averaged over a section and compared with the rest of the batch.
 */

const { clamp01, pct } = require("./common");
const { labelOf } = require("./languageReport");
const { paceScore } = require("./fluencyReport");

const READ_AXES = ["pronunciation", "fluency", "accuracy", "completeness", "pace"];
const AXES_BY_TYPE = {
  READING: READ_AXES,
  REPEAT: READ_AXES,
  JUMBLED: ["accuracy", "order", "fluency", "pace"],
  QUESTION_ANSWER: ["relevance", "grammar", "vocabulary", "coherence", "content", "completeness", "fluency"],
  STORYTELLING: ["topic_relevance", "content", "coherence", "grammar", "vocabulary", "logical_flow", "fluency"],
  FILL_BLANKS: ["correctness"],
  MCQ: ["correctness"],
  EMAIL_WRITING: ["relevance", "structure", "tone", "grammar", "vocabulary", "coherence", "completeness"],
};

const AXIS_LABELS = { correctness: "Correctness", accuracy: "Accuracy", order: "Word order", fluency: "Fluency", pace: "Pace", pronunciation: "Pronunciation", completeness: "Completeness" };

const axesFor = (sectionType) =>
  (AXES_BY_TYPE[sectionType] || READ_AXES).map((key) => ({ key, label: AXIS_LABELS[key] || labelOf(key) }));

/** Per-question skill values (0..100, or absent when the judge did not measure them). */
function questionSkills(sectionType, raw, acoustic) {
  const values = {
    pronunciation: raw.pronunciation,
    fluency: raw.fluency,
    accuracy: raw.word_accuracy,
    order: raw.order_correctness,
    completeness: raw.completeness,
    // Fill in the blank reports `answer_correctness`, multiple choice `correctness`.
    correctness: raw.correctness ?? raw.answer_correctness,
  };
  // Open-ended rubric lines come through as raw metrics under their own names.
  (AXES_BY_TYPE[sectionType] || []).forEach((key) => {
    if (values[key] === undefined && raw[key] !== undefined) values[key] = raw[key];
  });

  const skills = {};
  (AXES_BY_TYPE[sectionType] || READ_AXES).forEach((key) => {
    if (typeof values[key] === "number") skills[key] = pct(clamp01(values[key]));
  });

  const pace = paceScore(acoustic);
  if (pace !== null && (AXES_BY_TYPE[sectionType] || READ_AXES).includes("pace")) skills.pace = pace;
  return skills;
}

/** Mean of each axis over the questions that have it. Returns {} when none do. */
function averageSkills(skillList) {
  const sums = {};
  skillList.forEach((skills) => {
    Object.entries(skills || {}).forEach(([key, value]) => {
      sums[key] = sums[key] || { total: 0, n: 0 };
      sums[key].total += value;
      sums[key].n += 1;
    });
  });
  const mean = {};
  Object.entries(sums).forEach(([key, { total, n }]) => {
    mean[key] = Math.round(total / n);
  });
  return mean;
}

module.exports = { axesFor, questionSkills, averageSkills };
