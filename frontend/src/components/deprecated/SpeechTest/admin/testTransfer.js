/**
 * Moving a test between places as plain data: export to a JSON file, import
 * from one, and duplicate. A transferred test carries only what defines the
 * exam (details, schedule, sections and their questions). It never carries ids,
 * eligible students, attempts, scores or feedback.
 */

const FORMAT = "speech-test";
const VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fields a question has beyond its text, by section type. */
const QUESTION_EXTRAS = {
  REPEAT: (q) => ({ accent: q.accent, gender: q.gender }),
  JUMBLED: (q) => ({ jumbledMode: q.jumbledMode }),
  FILL_BLANKS: (q) => ({ answerKey: q.answerKey || "", acceptedAnswers: q.acceptedAnswers || [] }),
  MCQ: (q) => ({ options: (q.options || []).map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect) })) }),
};

const cleanSection = (section) => ({
  title: section.title,
  type: section.type,
  instructions: section.instructions || "",
  timeLimitMinutes: section.timeLimitMinutes,
  questions: (section.questions || []).map((q) => ({
    text: q.text,
    ...(QUESTION_EXTRAS[section.type]?.(q) || {}),
  })),
});

/** A server test (or the same shape read from a file) without ids or people. */
export const toTransferTest = (test) => ({
  title: test.title,
  description: test.description || "",
  instructions: test.instructions || "",
  startTime: test.startTime,
  endTime: test.endTime,
  sections: (test.sections || []).map(cleanSection),
});

const isValidDate = (value) => value && !Number.isNaN(new Date(value).getTime());

/**
 * Keeps the schedule when it is still usable. Otherwise (missing, or already
 * over) the test starts at the next full hour and runs for a week, so it can
 * be created now and adjusted in the editor.
 */
const withUsableWindow = (test) => {
  if (isValidDate(test.startTime) && isValidDate(test.endTime) && new Date(test.endTime) > new Date()) {
    return test;
  }
  const start = new Date(Math.ceil(Date.now() / 3600000) * 3600000);
  return { ...test, startTime: start.toISOString(), endTime: new Date(start.getTime() + 7 * DAY_MS).toISOString() };
};

/** Request body for creating a copy of `test`. */
export const toDuplicatePayload = (test) =>
  withUsableWindow({ ...toTransferTest(test), title: `${test.title} (Copy)`.slice(0, 150) });

/** Request body for creating a test from a parsed export file. */
export const fromImportData = (data) => {
  const test = data?.test || data;
  if (!test || typeof test.title !== "string" || !test.title.trim() || !Array.isArray(test.sections)) {
    throw new Error("This file is not a speech test export. It needs a title and a list of sections.");
  }
  return withUsableWindow(toTransferTest(test));
};

/** Reads a chosen `.json` file into a request body; throws a readable Error. */
export const readImportFile = async (file) => {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  return fromImportData(data);
};

/** Downloads the test as `<title>.json`. */
export const downloadTestFile = (test) => {
  const file = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), test: toTransferTest(test) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const name = String(test.title || "speech-test").trim().replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "speech-test";

  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
