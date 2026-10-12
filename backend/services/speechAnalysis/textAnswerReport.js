/**
 * Breakdown for the answers that are typed or chosen rather than spoken: fill in
 * the blank, multiple choice, and email writing. There is no audio here, so no
 * transcription, pronunciation or fluency; what the judge returns is how the
 * answer was graded (`answer_check`) or the language rubric.
 *
 * The result has the same outer shape as a spoken question's analysis, so the
 * results page can list it with the others. The extra `answer` block describes
 * what the student wrote or picked.
 */

const { pct } = require("./common");
const { buildLanguage } = require("./languageReport");
const { buildFeedback } = require("./feedback");
const { questionSkills } = require("./skills");

const TEXT_ONLY_TYPES = ["FILL_BLANKS", "MCQ", "EMAIL_WRITING"];

const wordsIn = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;

const MCQ_NOTES = { FULL: "All correct", PARTIAL: "Partly correct", NONE: "Incorrect" };

function fillBlanks({ question, evaluation, raw, answer }) {
  const check = evaluation.answer_check || {};
  const correct = Boolean(check.correct);
  const submitted = check.submitted ?? String(answer?.text || "");

  return {
    rings: [{ key: "correctness", label: "Answer", score: pct(raw.answer_correctness), note: correct ? "Correct" : "Incorrect" }],
    tabs: ["overview", "answer"],
    answer: {
      kind: "fill_blank",
      prompt: question.text,
      submitted,
      correct,
      expected: check.expected || question.answerKey || "",
      accepted: check.accepted_answers || question.acceptedAnswers || [],
      matched: check.matched_answer || null,
    },
    feedback: correct
      ? [{ tone: "good", text: "Your answer matched." }]
      : [
          {
            tone: "warn",
            text: submitted
              ? `The expected answer was "${check.expected || question.answerKey}". Spelling and spacing must match; capital letters do not matter.`
              : `No answer was given. The expected answer was "${check.expected || question.answerKey}".`,
          },
        ],
  };
}

function multipleChoice({ question, evaluation, raw }) {
  const check = evaluation.answer_check || {};
  const selected = new Set((check.selected_options || []).map(String));
  const outcome = check.outcome || "NONE";

  const feedback = [];
  if (outcome === "FULL") {
    feedback.push({ tone: "good", text: "You chose the right answer." });
  } else if (outcome === "PARTIAL") {
    feedback.push({ tone: "warn", text: "You found one correct answer, but this question had two. Half marks." });
  } else if ((check.wrong_selected || []).length > 0) {
    feedback.push({ tone: "warn", text: "One of the options you chose was not correct." });
  } else {
    feedback.push({ tone: "warn", text: "No option was chosen." });
  }

  return {
    rings: [{ key: "correctness", label: "Answer", score: pct(raw.correctness), note: MCQ_NOTES[outcome] || "" }],
    tabs: ["overview", "answer"],
    answer: {
      kind: "mcq",
      prompt: question.text,
      outcome,
      options: (question.options || []).map((o) => ({
        id: String(o._id),
        text: o.text,
        isCorrect: Boolean(o.isCorrect),
        selected: selected.has(String(o._id)),
      })),
    },
    feedback,
  };
}

function emailWriting({ question, evaluation, answer }) {
  const language = buildLanguage(evaluation.language);
  const text = String(answer?.text || "");
  const dimension = (key) => language?.dimensions.find((d) => d.key === key);

  const rings = [];
  if (language) rings.push({ key: "language", label: "Writing", score: language.score, note: `${language.dimensions.length} criteria scored` });
  [["structure", "Structure"], ["tone", "Tone"]].forEach(([key, label]) => {
    const d = dimension(key);
    if (d) rings.push({ key, label, score: d.score, note: "" });
  });

  return {
    rings,
    tabs: ["overview", "answer", ...(language ? ["language"] : [])],
    answer: { kind: "email", prompt: question.text, text, words: wordsIn(text) },
    language,
    feedback: buildFeedback({ language }),
  };
}

/**
 * @returns {object|null} null when the judge sent no detail
 */
function buildTextAnalysis({ sectionType, question, judged, answer }) {
  const detail = judged?.detail;
  const evaluation = detail?.evaluation;
  if (!evaluation) return null;

  const raw = detail.raw_metrics || {};
  const parts =
    sectionType === "FILL_BLANKS"
      ? fillBlanks({ question, evaluation, raw, answer })
      : sectionType === "MCQ"
      ? multipleChoice({ question, evaluation, raw })
      : emailWriting({ question, evaluation, answer });

  return {
    version: 1,
    durationS: 0,
    transcription: null,
    pronunciation: null,
    fluency: null,
    language: null,
    ...parts,
    skills: questionSkills(sectionType, raw, null),
  };
}

module.exports = { buildTextAnalysis, TEXT_ONLY_TYPES };
