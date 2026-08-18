/**
 * Exam proctoring verification.
 *
 * Checks the CohortProctor schema behaviour and the Excel workbook builder
 * against a synthetic report. Runs without a database and without the server.
 *
 * Usage:  node scripts/exam-proctor-check.js
 */

const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const CohortProctor = require("../models/CohortProctor");
const {
  buildExamReportWorkbook,
  buildExportFilename,
} = require("../services/examReportExcelService");

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${label}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${label}${detail === undefined ? "" : ` -> ${detail}`}`);
  }
}

const oid = () => new mongoose.Types.ObjectId();

async function main() {
  console.log("\nProctor document");

  const cohortId = oid();
  const userA = oid();
  const userB = oid();
  const record = new CohortProctor({
    cohort: cohortId,
    examStartTime: new Date("2026-08-18T09:00:00Z"),
    examEndTime: new Date("2026-08-18T11:00:00Z"),
    totalEligibleUsers: 3,
  });

  check("document validates", !record.validateSync());
  check("participants start empty", record.participants.length === 0);

  const first = record.ensureParticipant(userA);
  const again = record.ensureParticipant(userA);
  check("ensureParticipant creates a row", record.participants.length === 1);
  check("ensureParticipant is idempotent", first === again);
  check("counters default to zero", first.tabSwitchCount === 0 && first.fullscreenExitCount === 0);

  first.startedAt = new Date("2026-08-18T09:05:00Z");
  first.submittedAt = new Date("2026-08-18T09:50:00Z");
  first.tabSwitchCount = 3;
  first.fullscreenExitCount = 2;
  first.totalScore = 120;

  const second = record.ensureParticipant(userB);
  second.startedAt = new Date("2026-08-18T09:02:00Z");
  second.tabSwitchCount = 1;
  second.totalScore = 80;

  record.recomputeTotals();

  console.log("\nRoll-up");
  check("attended counts only started rows", record.attendedCount === 2, record.attendedCount);
  check("not attended derives from eligible count", record.notAttendedCount === 1, record.notAttendedCount);
  check("submitted counts only finished rows", record.submittedCount === 1, record.submittedCount);
  check("marks are summed", record.totalMarksAchieved === 200, record.totalMarksAchieved);
  check("tab switches are summed", record.totalTabSwitches === 4, record.totalTabSwitches);
  check("fullscreen exits are summed", record.totalFullscreenExits === 2, record.totalFullscreenExits);
  check("recalculation is timestamped", record.lastRecalculatedAt instanceof Date);

  console.log("\nValidation rules");
  const badEvent = new CohortProctor({ cohort: oid() });
  badEvent.ensureParticipant(userA).violations.push({ type: "screenshot" });
  check("unknown violation type is rejected", Boolean(badEvent.validateSync()));

  const goodEvent = new CohortProctor({ cohort: oid() });
  goodEvent.ensureParticipant(userA).violations.push({ type: "tab_switch" });
  check("known violation type validates", !goodEvent.validateSync());

  const negative = new CohortProctor({ cohort: oid() });
  negative.ensureParticipant(userA).tabSwitchCount = -1;
  check("negative counters are rejected", Boolean(negative.validateSync()));

  check("violation log cap is exported", CohortProctor.MAX_VIOLATION_LOG > 0);
  check(
    "tracked event types cover tab switch and fullscreen exit",
    CohortProctor.VIOLATION_TYPES.includes("tab_switch") &&
      CohortProctor.VIOLATION_TYPES.includes("fullscreen_exit")
  );

  console.log("\nWorkbook");

  // Synthetic report shaped exactly like buildExamReport's output.
  const moduleId = oid().toString();
  const questionId = oid().toString();
  const report = {
    summary: {
      cohortId: cohortId.toString(),
      cohortTitle: "Mid Semester Test",
      mode: "exam",
      examStartTime: new Date("2026-08-18T09:00:00Z"),
      examEndTime: new Date("2026-08-18T11:00:00Z"),
      totalEligibleUsers: 2,
      attendedCount: 1,
      notAttendedCount: 1,
      submittedCount: 1,
      totalMarksPossible: 150,
      totalMarksAchieved: 120,
      averageScore: 120,
      highestScore: 120,
      totalTabSwitches: 3,
      totalFullscreenExits: 2,
      generatedAt: new Date(),
    },
    students: [
      {
        userId: userA.toString(),
        name: "Present Student",
        email: "present@example.com",
        rollNumber: "R001",
        department: "CSE",
        section: "E",
        attended: true,
        rank: 1,
        startedAt: new Date("2026-08-18T09:05:00Z"),
        submittedAt: new Date("2026-08-18T09:50:00Z"),
        timeTakenMs: 45 * 60 * 1000,
        totalScore: 120,
        questionsSolved: 1,
        tabSwitchCount: 3,
        fullscreenExitCount: 2,
        windowBlurCount: 1,
        copyCount: 0,
        pasteCount: 0,
        violationCount: 6,
        moduleScores: [
          { moduleId, title: "Arrays", score: 120, questionsCompleted: 1, totalQuestions: 1 },
        ],
        questionScores: [{ questionId, score: 120, solved: true }],
      },
      {
        userId: userB.toString(),
        name: "Absent Student",
        email: "absent@example.com",
        rollNumber: "R002",
        department: "CSE",
        section: "E",
        attended: false,
        rank: null,
        startedAt: null,
        submittedAt: null,
        timeTakenMs: null,
        totalScore: 0,
        questionsSolved: 0,
        tabSwitchCount: 0,
        fullscreenExitCount: 0,
        windowBlurCount: 0,
        copyCount: 0,
        pasteCount: 0,
        violationCount: 0,
        moduleScores: [
          { moduleId, title: "Arrays", score: 0, questionsCompleted: 0, totalQuestions: 1 },
        ],
        questionScores: [{ questionId, score: 0, solved: false }],
      },
    ],
    modules: [
      {
        moduleId,
        title: "Arrays",
        totalQuestions: 1,
        maxMarks: 150,
        averageScore: 120,
        highestScore: 120,
        solvedTotal: 1,
      },
    ],
    questions: [
      {
        questionId,
        title: "Two Sum",
        type: "programming",
        difficultyLevel: "easy",
        maxMarks: 150,
        moduleTitle: "Arrays",
        solvedCount: 1,
        attemptCount: 4,
        averageScore: 120,
      },
    ],
    questionsMeta: [
      { questionId, title: "Two Sum", moduleTitle: "Arrays", maxMarks: 150 },
    ],
  };

  const buffer = await buildExamReportWorkbook(report);
  check("workbook is produced", buffer && buffer.byteLength > 0, buffer?.byteLength);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const names = workbook.worksheets.map((s) => s.name);
  check(
    "all five sheets exist",
    ["Summary", "Student Results", "Module Scores", "Question Scores", "Question Analysis"].every(
      (n) => names.includes(n)
    ),
    names.join(", ")
  );

  const students = workbook.getWorksheet("Student Results");
  check("student sheet has a header plus one row per student", students.rowCount === 3, students.rowCount);
  check("header row is frozen", students.views?.[0]?.state === "frozen");
  check("autofilter is set", Boolean(students.autoFilter));

  const firstRow = students.getRow(2);
  check("rank is written", firstRow.getCell(1).value === 1, firstRow.getCell(1).value);
  check("attendance is written", firstRow.getCell(7).value === "Yes", firstRow.getCell(7).value);
  check("score is written", firstRow.getCell(8).value === 120, firstRow.getCell(8).value);
  check("time taken is humanised", String(firstRow.getCell(12).value).includes("45m"), firstRow.getCell(12).value);
  check("tab switches are written", firstRow.getCell(13).value === 3, firstRow.getCell(13).value);
  check("fullscreen exits are written", firstRow.getCell(14).value === 2, firstRow.getCell(14).value);

  const absentRow = students.getRow(3);
  check("absent student has no rank", absentRow.getCell(1).value === "—", absentRow.getCell(1).value);
  check("absent student shows a dash for time", absentRow.getCell(12).value === "—", absentRow.getCell(12).value);

  const analysis = workbook.getWorksheet("Question Analysis");
  check("question analysis lists the question", analysis.getRow(2).getCell(2).value === "Two Sum");
  check("solved count is written", analysis.getRow(2).getCell(6).value === 1);
  check("solve rate is a percentage", analysis.getRow(2).getCell(7).value === "100%", analysis.getRow(2).getCell(7).value);
  check("attempts are written", analysis.getRow(2).getCell(8).value === 4);

  const moduleSheet = workbook.getWorksheet("Module Scores");
  check(
    "module sheet ends with an averages row",
    moduleSheet.getRow(moduleSheet.rowCount).getCell(1).value === "Average (attended)"
  );

  const filename = buildExportFilename(report);
  check("filename is slugified", /^Mid-Semester-Test-results-\d{4}-\d{2}-\d{2}\.xlsx$/.test(filename), filename);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
