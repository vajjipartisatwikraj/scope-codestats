import { SECTION_TYPE_META } from "../speechTestMeta";

/** Form state of the test editor, and its conversion to and from the API shape. */

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

/** First problem in the form worth stopping a save for, or null. */
export const validateForm = (form) => {
  if (!form.title.trim()) return "Give the test a title";
  if (!form.startTime || !form.endTime) return "Set the start and end time";
  if (form.endTime <= form.startTime) return "The end time must be after the start time";
  for (const [i, section] of form.sections.entries()) {
    const limit = Number(section.timeLimitMinutes);
    if (!Number.isFinite(limit) || limit < 1 || limit > 120) {
      return `Section ${i + 1}: time limit must be 1 to 120 minutes`;
    }
    if (section.questions.some((q) => !q.text.trim())) {
      return `Section ${i + 1}: every question needs text`;
    }
  }
  return null;
};
