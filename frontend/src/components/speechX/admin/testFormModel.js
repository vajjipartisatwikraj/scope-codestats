import { SECTION_TYPE_META } from "../shared/speechTestMeta";

/**
 * Form state of the test editor, and its conversion to and from the API shape.
 *
 * Copied from SpeechTest/admin/testFormModel.js. Same state shape, same payload, same validation
 * messages in the same order. Added: `findProblems`, which lists every problem (with the step and
 * the field it belongs to) so the editor can show them inline; `validateForm` still returns only the
 * first message, as before.
 */

let keySeed = 0;
/** Stable React keys for rows that have no server id yet. */
export const nextKey = () => {
  keySeed += 1;
  return `k${keySeed}`;
};

const blankOption = () => ({ key: nextKey(), text: "", isCorrect: false });

export const blankQuestion = (type) => ({
  key: nextKey(),
  text: "",
  accent: "en-IN",
  gender: "female",
  jumbledMode: "ui",
  answerKey: "",
  acceptedAnswers: [],
  // A new multiple-choice question starts with four empty options.
  options: type === "MCQ" ? [blankOption(), blankOption(), blankOption(), blankOption()] : [],
});

export const blankSection = (type) => ({
  key: nextKey(),
  title: SECTION_TYPE_META[type].label,
  type,
  instructions: "",
  timeLimitMinutes: 10,
  questions: [],
});

export const emptyForm = () => ({
  title: "",
  description: "",
  instructions: "",
  startTime: null,
  endTime: null,
  isPublished: false,
  sections: [],
});

/** Server test -> editable form state. Rows that came from the server keep their `_id`. */
export const fromServer = (test) => ({
  title: test.title || "",
  description: test.description || "",
  instructions: test.instructions || "",
  startTime: test.startTime ? new Date(test.startTime) : null,
  endTime: test.endTime ? new Date(test.endTime) : null,
  isPublished: Boolean(test.isPublished),
  sections: (test.sections || []).map((section) => ({
    key: nextKey(),
    _id: section._id,
    title: section.title,
    type: section.type,
    instructions: section.instructions || "",
    timeLimitMinutes: section.timeLimitMinutes,
    questions: section.questions.map((q) => ({
      key: nextKey(),
      _id: q._id,
      text: q.text,
      accent: q.accent || "en-IN",
      gender: q.gender || "female",
      jumbledMode: q.jumbledMode || "ui",
      answerKey: q.answerKey || "",
      acceptedAnswers: q.acceptedAnswers || [],
      options: (q.options || []).map((o) => ({
        key: nextKey(),
        _id: o._id,
        text: o.text,
        isCorrect: Boolean(o.isCorrect),
      })),
    })),
  })),
});

/** Editable form state -> request body. */
export const toPayload = (form) => ({
  title: form.title.trim(),
  description: form.description.trim(),
  instructions: form.instructions.trim(),
  startTime: form.startTime?.toISOString(),
  endTime: form.endTime?.toISOString(),
  sections: form.sections.map((section) => ({
    _id: section._id,
    title: section.title,
    type: section.type,
    instructions: section.instructions,
    timeLimitMinutes: Number(section.timeLimitMinutes),
    questions: section.questions.map((q) => ({
      _id: q._id,
      text: q.text,
      accent: q.accent,
      gender: q.gender,
      jumbledMode: q.jumbledMode,
      answerKey: q.answerKey,
      acceptedAnswers: q.acceptedAnswers,
      options: (q.options || []).map((o) => ({ _id: o._id, text: o.text, isCorrect: o.isCorrect })),
    })),
  })),
});

/**
 * Every problem in the form worth stopping a save for, in the order the old editor checked them
 * (title, schedule, then each section's time limit and question texts).
 *
 * Each problem: { message, step ('details' | 'schedule' | 'questions'), field, sectionKey?,
 * sectionIndex?, questionKey? } where `field` is 'title' | 'start' | 'end' | 'limit' | 'text'.
 * For 'text', `questionKey` is the first question of the section that is still empty.
 */
export const findProblems = (form) => {
  const problems = [];
  if (!form.title.trim()) problems.push({ message: "Give the test a title", step: "details", field: "title" });
  if (!form.startTime || !form.endTime) {
    problems.push({
      message: "Set the start and end time",
      step: "schedule",
      field: form.startTime ? "end" : "start",
    });
  } else if (form.endTime <= form.startTime) {
    problems.push({ message: "The end time must be after the start time", step: "schedule", field: "end" });
  }
  form.sections.forEach((section, i) => {
    const limit = Number(section.timeLimitMinutes);
    if (!Number.isFinite(limit) || limit < 1 || limit > 120) {
      problems.push({
        message: `Section ${i + 1}: time limit must be 1 to 120 minutes`,
        step: "questions",
        field: "limit",
        sectionKey: section.key,
        sectionIndex: i,
      });
    }
    const blank = section.questions.find((q) => !q.text.trim());
    if (blank) {
      problems.push({
        message: `Section ${i + 1}: every question needs text`,
        step: "questions",
        field: "text",
        sectionKey: section.key,
        sectionIndex: i,
        questionKey: blank.key,
      });
    }
  });
  return problems;
};

/** First problem in the form worth stopping a save for, or null. */
export const validateForm = (form) => findProblems(form)[0]?.message ?? null;
