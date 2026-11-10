/**
 * Authoring rules for speech tests: cleaning the author's payload, deciding whether a test is
 * complete enough to publish, and checking that edits to a started test only add things.
 *
 * Failures are thrown as ServiceError so a controller can pass them straight to the response.
 */
const SpeechTest = require("../models/SpeechTest");
const { ServiceError } = require("../utils/ServiceError");
const { isValidId } = require("./speechTestState");

const SECTION_TYPES = SpeechTest.SECTION_TYPES;
const ACCENTS = ["en-IN", "en-US", "en-GB", "en-AU"];

const wordCount = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;

/** Cleans one question of a section of the given type. */
function normalizeQuestion(sectionType, q, label, qIndex) {
  const where = `${label}, question ${qIndex + 1}`;
  const text = String(q?.text || "").trim();
  if (!text) throw new ServiceError(400, `${where}: text is required`);
  if (text.length > 1000) throw new ServiceError(400, `${where}: text is too long`);

  const question = { text };
  if (isValidId(q._id)) question._id = q._id;

  if (sectionType === "REPEAT") {
    question.accent = ACCENTS.includes(q.accent) ? q.accent : "en-IN";
    question.gender = q.gender === "male" ? "male" : "female";
  }

  if (sectionType === "JUMBLED") {
    question.jumbledMode = q.jumbledMode === "audio" ? "audio" : "ui";
  }

  if (sectionType === "FILL_BLANKS") {
    question.answerKey = String(q.answerKey || "").trim().slice(0, 500);
    // Other correct answers: trimmed, no blanks, no repeats (the main answer included).
    const seen = new Set([question.answerKey.toLowerCase()]);
    question.acceptedAnswers = (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [])
      .map((a) => String(a || "").trim().slice(0, 500))
      .filter((a) => {
        if (!a || seen.has(a.toLowerCase())) return false;
        seen.add(a.toLowerCase());
        return true;
      });
    if (question.acceptedAnswers.length > 20) {
      throw new ServiceError(400, `${where}: at most 20 other accepted answers`);
    }
  }

  if (sectionType === "MCQ") {
    const rawOptions = Array.isArray(q.options) ? q.options : [];
    if (rawOptions.length > 6) throw new ServiceError(400, `${where}: at most 6 options`);
    question.options = rawOptions
      .map((o) => ({
        ...(isValidId(o?._id) ? { _id: o._id } : {}),
        text: String(o?.text || "").trim().slice(0, 300),
        isCorrect: Boolean(o?.isCorrect),
      }))
      .filter((o) => o.text);
  }

  return question;
}

/**
 * Cleans the author's payload into schema-ready sections. Lenient on purpose:
 * a draft may be saved half-finished. Completeness is checked on publish.
 */
function normalizeSections(rawSections) {
  if (!Array.isArray(rawSections)) return [];
  if (rawSections.length > 20) throw new ServiceError(400, "A test can have at most 20 sections");

  return rawSections.map((raw, sIndex) => {
    const label = `Section ${sIndex + 1}`;
    if (!SECTION_TYPES.includes(raw?.type)) {
      throw new ServiceError(400, `${label}: choose a valid section type`);
    }

    const timeLimit = Number(raw.timeLimitMinutes);
    if (!Number.isFinite(timeLimit) || timeLimit < 1 || timeLimit > 120) {
      throw new ServiceError(400, `${label}: time limit must be between 1 and 120 minutes`);
    }

    const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
    if (rawQuestions.length > 50) {
      throw new ServiceError(400, `${label}: at most 50 questions per section`);
    }

    return {
      ...(isValidId(raw._id) ? { _id: raw._id } : {}),
      title: String(raw.title || "").trim() || `Section ${sIndex + 1}`,
      type: raw.type,
      instructions: String(raw.instructions || "").trim(),
      timeLimitMinutes: timeLimit,
      questions: rawQuestions.map((q, qIndex) => normalizeQuestion(raw.type, q, label, qIndex)),
    };
  });
}

/** Everything that must be true before students may see the test. */
function publishProblems(test) {
  const problems = [];
  if (test.sections.length === 0) problems.push("Add at least one section");

  test.sections.forEach((section, sIndex) => {
    const label = `Section ${sIndex + 1} (${section.title})`;
    if (section.questions.length === 0) problems.push(`${label}: add at least one question`);

    section.questions.forEach((question, qIndex) => {
      const qLabel = `${label}, question ${qIndex + 1}`;
      if (section.type === "JUMBLED" && wordCount(question.text) < 3) {
        problems.push(`${qLabel}: a jumbled sentence needs at least 3 words`);
      }

      if (section.type === "FILL_BLANKS" && !String(question.answerKey || "").trim()) {
        problems.push(`${qLabel}: enter the correct answer`);
      }

      if (section.type === "MCQ") {
        const options = question.options || [];
        const correct = options.filter((o) => o.isCorrect).length;
        if (options.length < 2 || options.length > 6) {
          problems.push(`${qLabel}: a multiple-choice question needs 2 to 6 options`);
        }
        if (correct < 1 || correct > 2) {
          problems.push(`${qLabel}: mark 1 or 2 options as correct`);
        }
      }
    });
  });

  if (new Date(test.endTime) <= new Date()) problems.push("The end time is already in the past");
  return problems;
}

/** A comparable fingerprint of what students are tested on. */
function sectionsSignature(sections) {
  return JSON.stringify(
    (sections || []).map((s) => ({
      id: String(s._id || ""),
      type: s.type,
      title: s.title,
      limit: s.timeLimitMinutes,
      instructions: s.instructions || "",
      questions: (s.questions || []).map((q) => ({
        id: String(q._id || ""),
        text: q.text,
        mode: q.jumbledMode || "",
        accent: q.accent || "",
        gender: q.gender || "",
        key: q.answerKey || "",
        accepted: q.acceptedAnswers || [],
        options: (q.options || []).map((o) => ({
          id: String(o._id || ""),
          text: o.text,
          correct: Boolean(o.isCorrect),
        })),
      })),
    }))
  );
}

/**
 * True when `next` is `current` plus new sections and/or new questions added at
 * the end. Anything students may already have answered must stay untouched.
 */
function onlyAppends(next, current) {
  if (next.length < current.length) return false;
  const head = next.slice(0, current.length).map((section, i) => ({
    ...section,
    questions: section.questions.slice(0, current[i].questions.length),
  }));
  return sectionsSignature(head) === sectionsSignature(current);
}

/** Start and end of the window from the request body, falling back to the stored test. */
function parseTimes(body, existing = {}) {
  const startTime = body.startTime ? new Date(body.startTime) : existing.startTime;
  const endTime = body.endTime ? new Date(body.endTime) : existing.endTime;
  if (!startTime || Number.isNaN(new Date(startTime).getTime())) {
    throw new ServiceError(400, "A valid start time is required");
  }
  if (!endTime || Number.isNaN(new Date(endTime).getTime())) {
    throw new ServiceError(400, "A valid end time is required");
  }
  if (new Date(endTime) <= new Date(startTime)) {
    throw new ServiceError(400, "End time must be after the start time");
  }
  return { startTime, endTime };
}

module.exports = {
  normalizeSections,
  publishProblems,
  onlyAppends,
  parseTimes,
};
