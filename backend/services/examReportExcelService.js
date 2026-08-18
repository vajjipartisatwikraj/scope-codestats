/**
 * Builds the exam result workbook for an exam-mode cohort.
 *
 * Five sheets:
 *   Summary          – exam metadata and headline numbers
 *   Student Results  – one row per eligible student: rank, score, timing, proctoring
 *   Module Scores    – per-student score in every module
 *   Question Scores  – per-student score in every question
 *   Question Analysis– how many students solved each question, averages
 *
 * Everything comes from `cohortProctorService.buildExamReport`, so the workbook
 * and the on-screen summary always agree.
 */

const ExcelJS = require("exceljs");

const BRAND = "FF0088CC";
const HEADER_TEXT = "FFFFFFFF";
const ZEBRA = "FFF4F8FB";
const WARN = "FFFFF3CD";
const DANGER = "FFFDE7E9";
const MUTED = "FF6B7280";

/** `1h 04m 12s`, or a dash when the student never finished. */
const formatDuration = (ms) => {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "—";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { hour12: true }) : "—";

/** Applies the shared header style to row 1 of a sheet. */
const styleHeader = (sheet, columnCount) => {
  const header = sheet.getRow(1);
  header.height = 24;
  header.font = { bold: true, size: 11, color: { argb: HEADER_TEXT } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  for (let i = 1; i <= columnCount; i += 1) {
    const cell = header.getCell(i);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFDDDDDD" } },
      left: { style: "thin", color: { argb: "FFDDDDDD" } },
      bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnCount },
  };
};

/** Light zebra striping plus thin gridlines over the data rows. */
const styleBody = (sheet, columnCount, startRow = 2) => {
  for (let r = startRow; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const even = (r - startRow) % 2 === 1;

    for (let c = 1; c <= columnCount; c += 1) {
      const cell = row.getCell(c);
      if (even) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      }
      cell.border = {
        top: { style: "hair", color: { argb: "FFE3E8EF" } },
        left: { style: "hair", color: { argb: "FFE3E8EF" } },
        bottom: { style: "hair", color: { argb: "FFE3E8EF" } },
        right: { style: "hair", color: { argb: "FFE3E8EF" } },
      };
      cell.alignment = { vertical: "middle", ...(cell.alignment || {}) };
    }
  }
};

function addSummarySheet(workbook, report) {
  const { summary } = report;
  const sheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: BRAND } },
  });

  sheet.columns = [
    { key: "label", width: 34 },
    { key: "value", width: 46 },
  ];

  const title = sheet.addRow([`${summary.cohortTitle} — Exam Report`]);
  title.font = { bold: true, size: 16, color: { argb: BRAND } };
  sheet.mergeCells(`A${title.number}:B${title.number}`);
  title.height = 28;

  const generated = sheet.addRow([
    `Generated ${formatDateTime(summary.generatedAt)}`,
  ]);
  generated.font = { italic: true, size: 10, color: { argb: MUTED } };
  sheet.mergeCells(`A${generated.number}:B${generated.number}`);
  sheet.addRow([]);

  const section = (label) => {
    const row = sheet.addRow([label]);
    row.font = { bold: true, size: 12, color: { argb: "FF111827" } };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FB" },
    };
    sheet.mergeCells(`A${row.number}:B${row.number}`);
  };

  const pair = (label, value) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
    row.getCell(2).alignment = { horizontal: "left" };
  };

  section("Schedule");
  pair("Exam start", formatDateTime(summary.examStartTime));
  pair("Exam end", formatDateTime(summary.examEndTime));
  pair(
    "Scheduled duration",
    summary.examStartTime && summary.examEndTime
      ? formatDuration(
          new Date(summary.examEndTime).getTime() -
            new Date(summary.examStartTime).getTime()
        )
      : "—"
  );
  sheet.addRow([]);

  section("Attendance");
  pair("Eligible students", summary.totalEligibleUsers);
  pair("Attended", summary.attendedCount);
  pair("Did not attend", summary.notAttendedCount);
  pair("Ended the test themselves", summary.submittedCount);
  sheet.addRow([]);

  section("Scores");
  pair("Total marks possible", summary.totalMarksPossible);
  pair("Total marks achieved", summary.totalMarksAchieved);
  pair("Average score (attended)", summary.averageScore);
  pair("Highest score", summary.highestScore);
  sheet.addRow([]);

  section("Proctoring");
  pair("Total tab switches", summary.totalTabSwitches);
  pair("Total fullscreen exits", summary.totalFullscreenExits);

  return sheet;
}

function addStudentSheet(workbook, report) {
  const sheet = workbook.addWorksheet("Student Results");

  sheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Name", key: "name", width: 26 },
    { header: "Roll Number", key: "rollNumber", width: 16 },
    { header: "Email", key: "email", width: 30 },
    { header: "Department", key: "department", width: 14 },
    { header: "Section", key: "section", width: 10 },
    { header: "Attended", key: "attended", width: 11 },
    { header: "Total Score", key: "totalScore", width: 12 },
    { header: "Questions Solved", key: "questionsSolved", width: 17 },
    { header: "Started At", key: "startedAt", width: 21 },
    { header: "Submitted At", key: "submittedAt", width: 21 },
    { header: "Time Taken", key: "timeTaken", width: 15 },
    { header: "Tab Switches", key: "tabSwitchCount", width: 14 },
    { header: "Fullscreen Exits", key: "fullscreenExitCount", width: 16 },
    { header: "Window Blurs", key: "windowBlurCount", width: 14 },
  ];

  report.students.forEach((student) => {
    sheet.addRow({
      rank: student.rank ?? "—",
      name: student.name,
      rollNumber: student.rollNumber || "—",
      email: student.email,
      department: student.department || "—",
      section: student.section || "—",
      attended: student.attended ? "Yes" : "No",
      totalScore: student.totalScore,
      questionsSolved: student.questionsSolved,
      startedAt: formatDateTime(student.startedAt),
      submittedAt: formatDateTime(student.submittedAt),
      timeTaken: formatDuration(student.timeTakenMs),
      tabSwitchCount: student.tabSwitchCount,
      fullscreenExitCount: student.fullscreenExitCount,
      windowBlurCount: student.windowBlurCount,
    });
  });

  styleHeader(sheet, sheet.columns.length);
  styleBody(sheet, sheet.columns.length);

  // Highlight absentees and flag anyone with integrity events.
  report.students.forEach((student, index) => {
    const row = sheet.getRow(index + 2);

    if (!student.attended) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DANGER } };
        cell.font = { color: { argb: MUTED } };
      });
      return;
    }

    const flagged = student.tabSwitchCount + student.fullscreenExitCount;
    if (flagged > 0) {
      [13, 14].forEach((columnIndex) => {
        const cell = row.getCell(columnIndex);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: flagged >= 5 ? DANGER : WARN },
        };
        cell.font = { bold: true };
      });
    }
  });

  return sheet;
}

function addModuleScoreSheet(workbook, report) {
  const sheet = workbook.addWorksheet("Module Scores");

  const columns = [
    { header: "Name", key: "name", width: 26 },
    { header: "Roll Number", key: "rollNumber", width: 16 },
  ];

  report.modules.forEach((module, index) => {
    columns.push({
      header: `${module.title} (/${module.maxMarks})`,
      key: `m${index}`,
      width: Math.max(16, Math.min(module.title.length + 8, 34)),
    });
  });
  columns.push({ header: "Total", key: "total", width: 12 });

  sheet.columns = columns;

  report.students.forEach((student) => {
    const row = { name: student.name, rollNumber: student.rollNumber || "—" };
    report.modules.forEach((module, index) => {
      row[`m${index}`] =
        student.moduleScores.find((m) => m.moduleId === module.moduleId)?.score ?? 0;
    });
    row.total = student.totalScore;
    sheet.addRow(row);
  });

  styleHeader(sheet, columns.length);
  styleBody(sheet, columns.length);

  const totalColumn = sheet.getColumn(columns.length);
  totalColumn.font = { bold: true };

  // Module averages, as a closing row.
  const averages = { name: "Average (attended)", rollNumber: "" };
  report.modules.forEach((module, index) => {
    averages[`m${index}`] = module.averageScore;
  });
  averages.total = report.summary.averageScore;

  const averageRow = sheet.addRow(averages);
  averageRow.font = { bold: true, color: { argb: BRAND } };
  averageRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FB" } };
  });

  return sheet;
}

function addQuestionScoreSheet(workbook, report) {
  const sheet = workbook.addWorksheet("Question Scores");

  const columns = [
    { header: "Name", key: "name", width: 26 },
    { header: "Roll Number", key: "rollNumber", width: 16 },
  ];

  report.questionsMeta.forEach((question, index) => {
    columns.push({
      header: `${question.moduleTitle} — ${question.title} (/${question.maxMarks})`,
      key: `q${index}`,
      width: 26,
    });
  });
  columns.push({ header: "Total", key: "total", width: 12 });

  sheet.columns = columns;

  report.students.forEach((student) => {
    const row = { name: student.name, rollNumber: student.rollNumber || "—" };
    report.questionsMeta.forEach((question, index) => {
      row[`q${index}`] =
        student.questionScores.find((q) => q.questionId === question.questionId)
          ?.score ?? 0;
    });
    row.total = student.totalScore;
    sheet.addRow(row);
  });

  styleHeader(sheet, columns.length);
  styleBody(sheet, columns.length);
  sheet.getColumn(columns.length).font = { bold: true };

  return sheet;
}

function addQuestionAnalysisSheet(workbook, report) {
  const sheet = workbook.addWorksheet("Question Analysis");
  const attended = report.summary.attendedCount || 0;

  sheet.columns = [
    { header: "Module", key: "moduleTitle", width: 24 },
    { header: "Question", key: "title", width: 38 },
    { header: "Type", key: "type", width: 12 },
    { header: "Difficulty", key: "difficultyLevel", width: 12 },
    { header: "Max Marks", key: "maxMarks", width: 11 },
    { header: "Students Solved", key: "solvedCount", width: 16 },
    { header: "Solve Rate", key: "solveRate", width: 12 },
    { header: "Total Attempts", key: "attemptCount", width: 14 },
    { header: "Average Score", key: "averageScore", width: 14 },
  ];

  report.questions.forEach((question) => {
    sheet.addRow({
      moduleTitle: question.moduleTitle,
      title: question.title,
      type: (question.type || "").toUpperCase(),
      difficultyLevel: question.difficultyLevel || "—",
      maxMarks: question.maxMarks,
      solvedCount: question.solvedCount,
      solveRate: attended
        ? `${Math.round((question.solvedCount / attended) * 100)}%`
        : "—",
      attemptCount: question.attemptCount,
      averageScore: question.averageScore,
    });
  });

  styleHeader(sheet, sheet.columns.length);
  styleBody(sheet, sheet.columns.length);

  // Colour the solve rate so weak questions stand out.
  report.questions.forEach((question, index) => {
    if (!attended) return;
    const rate = question.solvedCount / attended;
    const cell = sheet.getRow(index + 2).getCell(7);
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: rate >= 0.6 ? "FFE7F6E7" : rate >= 0.3 ? WARN : DANGER },
    };
  });

  return sheet;
}

/**
 * @param {object} report output of cohortProctorService.buildExamReport
 * @returns {Promise<Buffer>} xlsx file contents
 */
async function buildExamReportWorkbook(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codestats";
  workbook.created = new Date();

  addSummarySheet(workbook, report);
  addStudentSheet(workbook, report);
  if (report.modules.length > 0) addModuleScoreSheet(workbook, report);
  if (report.questionsMeta.length > 0) addQuestionScoreSheet(workbook, report);
  if (report.questions.length > 0) addQuestionAnalysisSheet(workbook, report);

  return workbook.xlsx.writeBuffer();
}

/** Safe, descriptive download filename. */
function buildExportFilename(report) {
  const slug = (report.summary.cohortTitle || "exam")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slug || "exam"}-results-${stamp}.xlsx`;
}

module.exports = { buildExamReportWorkbook, buildExportFilename };
