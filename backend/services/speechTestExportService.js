/**
 * Builds the results workbook of one speech (VocalQ) test for the admin.
 *
 * Five sheets:
 *   Summary          – the test, its window and the headline numbers
 *   Leaderboard      – every eligible student, ranked: details, final score, time and the score of
 *                      every section. Students who never started are listed too.
 *   Section scores   – one row per student and section: status, score, answered, time, submitted
 *   Question scores  – one row per student and question: the score and the judge's reason
 *   Feedback         – what each student said about the test (overall, four parts, comment)
 *
 * The ranking comes from the route (`entries`, the same list the on-screen leaderboard shows), so
 * the workbook and the page always agree. Everything else is read here.
 */

const ExcelJS = require("exceljs");

const SpeechTestAttempt = require("../models/SpeechTestAttempt");
const SpeechTestFeedback = require("../models/SpeechTestFeedback");
const User = require("../models/User");

const BRAND = "FF0585E0";
const HEADER_TEXT = "FFFFFFFF";
const ZEBRA = "FFF4F8FB";
const MUTED = "FF6B7280";
const BORDER = "FFE3E8EF";

const SECTION_TYPE_LABEL = {
  READING: "Reading Aloud",
  REPEAT: "Repeat",
  JUMBLED: "Jumbled Sentence",
  FILL_BLANKS: "Fill in the Blanks",
  MCQ: "Multiple Choice",
  QUESTION_ANSWER: "Question & Answer",
  STORYTELLING: "Storytelling",
  EMAIL_WRITING: "Email Writing",
};

const SECTION_STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  queued: "Waiting for score",
  scoring: "Waiting for score",
  scored: "Scored",
  failed: "Scoring failed",
  unscored: "Not scored",
};

const CRITERIA = [
  { key: "instructions", label: "Clarity of instructions" },
  { key: "accuracy", label: "Test accuracy" },
  { key: "ease", label: "Ease of using the test" },
  { key: "scoring", label: "Scoring" },
];

const typeLabel = (type) => SECTION_TYPE_LABEL[type] || type || "";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { hour12: true, timeZone: "Asia/Kolkata" })
    : "";

/** `12m 05s`, or blank when there is no time. */
const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
};

const numberOrBlank = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const gradYear = (user) => user?.graduatingYear || user?.graduationYear || "";

/** Header style on row `rowNumber`, with a frozen header, filter and zebra rows below it. */
function styleTable(sheet, headerRow, columnCount) {
  const header = sheet.getRow(headerRow);
  header.height = 28;
  header.font = { bold: true, size: 11, color: { argb: HEADER_TEXT } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  for (let c = 1; c <= columnCount; c += 1) {
    const cell = header.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFDDDDDD" } },
      left: { style: "thin", color: { argb: "FFDDDDDD" } },
      bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  }

  for (let r = headerRow + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const even = (r - headerRow) % 2 === 0;
    for (let c = 1; c <= columnCount; c += 1) {
      const cell = row.getCell(c);
      if (even) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      cell.border = {
        top: { style: "hair", color: { argb: BORDER } },
        left: { style: "hair", color: { argb: BORDER } },
        bottom: { style: "hair", color: { argb: BORDER } },
        right: { style: "hair", color: { argb: BORDER } },
      };
      cell.alignment = { vertical: "middle", ...(cell.alignment || {}) };
    }
  }

  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  if (sheet.rowCount > headerRow) {
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columnCount } };
  }
}

/** One text column definition with a width, and optional number format / alignment. */
const col = (header, width, extra = {}) => ({ header, width, ...extra });

/** Adds a sheet from column definitions and rows (arrays in column order). */
function addTable(workbook, name, columns, rows, { tabColor } = {}) {
  const sheet = workbook.addWorksheet(name, tabColor ? { properties: { tabColor: { argb: tabColor } } } : undefined);
  sheet.columns = columns.map((c, i) => ({ header: c.header, key: `c${i}`, width: c.width }));
  rows.forEach((values) => sheet.addRow(values));
  columns.forEach((c, i) => {
    const column = sheet.getColumn(i + 1);
    if (c.numFmt) column.numFmt = c.numFmt;
    if (c.align) column.alignment = { horizontal: c.align, vertical: "middle", wrapText: Boolean(c.wrap) };
    else if (c.wrap) column.alignment = { vertical: "middle", wrapText: true };
  });
  styleTable(sheet, 1, columns.length);
  return sheet;
}

/** Student details shared by several sheets. */
const studentCells = (user) => [
  user?.name || "",
  user?.rollNumber || "",
  user?.email || "",
  user?.department || "",
  user?.section || "",
  gradYear(user),
];

const STUDENT_COLUMNS = [
  col("Name", 26),
  col("Roll no", 16),
  col("Email", 30),
  col("Dept", 10, { align: "center" }),
  col("Class section", 13, { align: "center" }),
  col("Graduating year", 15, { align: "center" }),
];

/**
 * @param {object} args
 * @param {object} args.test     the SpeechTest document (sections with questions, eligibleUsers)
 * @param {Array}  args.entries  the ranked list the leaderboard shows, in-progress attempts included
 * @returns {Promise<Buffer>} the .xlsx file
 */
async function buildSpeechTestWorkbook({ test, entries }) {
  const attemptIds = entries.map((entry) => entry.attemptId);
  const attemptsById = new Map(
    (await SpeechTestAttempt.find({ _id: { $in: attemptIds } }).lean()).map((attempt) => [String(attempt._id), attempt])
  );

  // Eligible students who never started: still part of "all students"
  const withAttempt = new Set(entries.map((entry) => String(entry.user._id)));
  const notStartedIds = (test.eligibleUsers || []).filter((id) => !withAttempt.has(String(id)));
  const notStarted = notStartedIds.length
    ? await User.find({ _id: { $in: notStartedIds }, userType: { $nin: ["admin", "teacher"] } })
        .select("name rollNumber email department section graduatingYear graduationYear")
        .sort({ rollNumber: 1 })
        .lean()
    : [];

  const feedback = await SpeechTestFeedback.find({ test: test._id })
    .sort({ createdAt: 1 })
    .populate("user", "name rollNumber email department section graduatingYear graduationYear")
    .lean();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VocalQ";
  workbook.created = new Date();

  const sections = test.sections || [];
  const finished = entries.filter((entry) => entry.status === "completed");
  const scores = finished.map((entry) => entry.finalScore).filter((s) => typeof s === "number");
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // ---- Summary --------------------------------------------------------------------------------
  const summary = workbook.addWorksheet("Summary", { properties: { tabColor: { argb: BRAND } } });
  summary.columns = [{ width: 34 }, { width: 48 }];
  const title = summary.addRow([`${test.title} — VocalQ results`]);
  title.font = { bold: true, size: 16, color: { argb: BRAND } };
  title.height = 28;
  summary.mergeCells(`A${title.number}:B${title.number}`);
  const generated = summary.addRow([`Generated ${formatDateTime(new Date())}`]);
  generated.font = { italic: true, size: 10, color: { argb: MUTED } };
  summary.mergeCells(`A${generated.number}:B${generated.number}`);
  summary.addRow([]);

  const facts = [
    ["Test", test.title],
    ["Available from", formatDateTime(test.startTime)],
    ["Available until", formatDateTime(test.endTime)],
    ["Sections", sections.length],
    ["Questions", sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)],
    ["Eligible students", entries.length + notStarted.length],
    ["Finished the test", finished.length],
    ["Still in progress", entries.length - finished.length],
    ["Not started", notStarted.length],
    ["Average final score", average === null ? "" : Math.round(average * 10) / 10],
    ["Top final score", scores.length ? Math.max(...scores) : ""],
    ["Feedback received", feedback.filter((f) => f.status === "submitted").length],
    ["Feedback skipped", feedback.filter((f) => f.status === "skipped").length],
  ];
  facts.forEach(([label, value]) => {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: "left" };
  });

  // ---- Leaderboard ----------------------------------------------------------------------------
  const leaderboardColumns = [
    col("Rank", 8, { align: "center" }),
    ...STUDENT_COLUMNS,
    col("Status", 14, { align: "center" }),
    col("Final score", 13, { numFmt: "0.0", align: "center" }),
    col("Time spent", 14, { align: "center" }),
    col("Time spent (seconds)", 14, { numFmt: "0", align: "center" }),
    col("Completed at", 22),
    col("Sections scored", 14, { align: "center" }),
    ...sections.map((section, index) =>
      col(`${index + 1}. ${section.title || typeLabel(section.type)}\n(${typeLabel(section.type)})`, 18, { numFmt: "0.0", align: "center" })
    ),
  ];
  const leaderboardRows = entries.map((entry) => {
    const sectionScores = new Map((entry.sectionScores || []).map((s) => [String(s.sectionId), s]));
    const scored = (entry.sectionScores || []).filter((s) => s.status === "scored").length;
    return [
      entry.rank ?? "",
      ...studentCells(entry.user),
      entry.status === "completed" ? "Completed" : "In progress",
      numberOrBlank(entry.finalScore),
      formatDuration(entry.totalTimeUsedSeconds),
      numberOrBlank(entry.totalTimeUsedSeconds),
      formatDateTime(entry.completedAt),
      `${scored} of ${sections.length}`,
      ...sections.map((section) => numberOrBlank(sectionScores.get(String(section._id))?.score)),
    ];
  });
  notStarted.forEach((user) => {
    leaderboardRows.push([
      "",
      ...studentCells(user),
      "Not started",
      null,
      "",
      null,
      "",
      `0 of ${sections.length}`,
      ...sections.map(() => null),
    ]);
  });
  addTable(workbook, "Leaderboard", leaderboardColumns, leaderboardRows);

  // ---- Section scores (student × section) ----------------------------------------------------------
  const sectionColumns = [
    col("Rank", 8, { align: "center" }),
    ...STUDENT_COLUMNS,
    col("Test section", 28),
    col("Type", 18),
    col("Status", 18, { align: "center" }),
    col("Score", 10, { numFmt: "0.0", align: "center" }),
    col("Questions answered", 14, { align: "center" }),
    col("Questions", 11, { align: "center" }),
    col("Time used", 13, { align: "center" }),
    col("Time used (seconds)", 13, { numFmt: "0", align: "center" }),
    col("Submitted at", 22),
    col("Auto-submitted", 14, { align: "center" }),
  ];
  const sectionRows = [];
  entries.forEach((entry) => {
    const attempt = attemptsById.get(String(entry.attemptId));
    sections.forEach((section, index) => {
      const state = (attempt?.sections || []).find((s) => String(s.sectionId) === String(section._id)) || {};
      sectionRows.push([
        entry.rank ?? "",
        ...studentCells(entry.user),
        `${index + 1}. ${section.title || ""}`.trim(),
        typeLabel(section.type),
        SECTION_STATUS_LABEL[state.status] || "Not started",
        numberOrBlank(state.score),
        state.status === "scored" ? state.questionsAnswered ?? 0 : "",
        section.questions?.length || 0,
        formatDuration(state.timeUsedSeconds),
        numberOrBlank(state.timeUsedSeconds),
        formatDateTime(state.submittedAt),
        state.submittedAt ? (state.autoSubmitted ? "Yes" : "No") : "",
      ]);
    });
  });
  addTable(workbook, "Section scores", sectionColumns, sectionRows);

  // ---- Question scores (student × question) ----------------------------------------------------------
  const questionColumns = [
    col("Rank", 8, { align: "center" }),
    ...STUDENT_COLUMNS,
    col("Test section", 28),
    col("Type", 18),
    col("Question no", 11, { align: "center" }),
    col("Question", 60, { wrap: true }),
    col("Result", 18, { align: "center" }),
    col("Score", 10, { numFmt: "0.0", align: "center" }),
    col("Reason", 50, { wrap: true }),
  ];
  const questionRows = [];
  entries.forEach((entry) => {
    const attempt = attemptsById.get(String(entry.attemptId));
    sections.forEach((section, sectionIndex) => {
      const state = (attempt?.sections || []).find((s) => String(s.sectionId) === String(section._id));
      if (!state || state.status !== "scored") return;
      const results = new Map((state.results || []).map((r) => [String(r.questionId), r]));
      (section.questions || []).forEach((question, questionIndex) => {
        const result = results.get(String(question._id));
        questionRows.push([
          entry.rank ?? "",
          ...studentCells(entry.user),
          `${sectionIndex + 1}. ${section.title || ""}`.trim(),
          typeLabel(section.type),
          questionIndex + 1,
          question.text || "",
          !result || result.status === "ANSWER_MISSING" ? "Not answered" : "Answered",
          numberOrBlank(result?.score) ?? 0,
          result?.reason || "",
        ]);
      });
    });
  });
  addTable(workbook, "Question scores", questionColumns, questionRows);

  // ---- Feedback -----------------------------------------------------------------------------------------
  const feedbackColumns = [
    ...STUDENT_COLUMNS,
    col("Status", 12, { align: "center" }),
    col("Overall rating (1-5)", 14, { align: "center" }),
    ...CRITERIA.map((c) => col(`${c.label} (1-5)`, 16, { align: "center" })),
    col("Suggestions", 60, { wrap: true }),
    col("Sent at", 22),
  ];
  const feedbackRows = feedback.map((item) => [
    ...studentCells(item.user),
    item.status === "submitted" ? "Submitted" : "Skipped",
    numberOrBlank(item.rating),
    ...CRITERIA.map((c) => numberOrBlank(item.ratings?.[c.key])),
    item.comment || "",
    formatDateTime(item.createdAt),
  ]);
  addTable(workbook, "Feedback", feedbackColumns, feedbackRows);

  return workbook.xlsx.writeBuffer();
}

/** A file name that is safe in a header and on every file system. */
function exportFileName(test, now = new Date()) {
  const base =
    String(test.title || "vocalq-test")
      .normalize("NFKD")
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "vocalq-test";
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `${base}-results-${stamp}.xlsx`;
}

module.exports = { buildSpeechTestWorkbook, exportFileName };
