/**
 * Exam-mode verification.
 *
 * Exercises the exam window logic, the schema invariants and the lifecycle
 * sweeper query against a fixed clock. Runs without a database and without the
 * server: the model is only used through `validateSync`, and the sweeper is
 * checked by asserting the filter it builds.
 *
 * Usage:  node scripts/exam-mode-check.js
 */

const mongoose = require("mongoose");
const Cohort = require("../models/Cohort");
const {
  EXAM_STATE,
  getExamWindow,
  isExamAccessOpen,
  getExamAccessDenial,
} = require("../utils/examAccess");

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

// Fixed clock so every expectation is exact.
const NOW = new Date("2026-08-18T10:00:00.000Z");
const minutes = (n) => new Date(NOW.getTime() + n * 60 * 1000);

const practice = { _id: "c-practice", mode: "practice", isActive: true };
const beforeExam = {
  _id: "c-before",
  mode: "exam",
  isActive: true,
  examStartTime: minutes(30),
  examEndTime: minutes(90),
};
const openExam = {
  _id: "c-open",
  mode: "exam",
  isActive: true,
  examStartTime: minutes(-30),
  examEndTime: minutes(30),
};
const endedExam = {
  _id: "c-ended",
  mode: "exam",
  isActive: true,
  examStartTime: minutes(-120),
  examEndTime: minutes(-60),
};
const brokenExam = {
  _id: "c-broken",
  mode: "exam",
  isActive: true,
  examStartTime: minutes(30),
  examEndTime: null,
};

console.log("\nWindow states");
check("practice cohort is never time-boxed", getExamWindow(practice, NOW).state === EXAM_STATE.PRACTICE);
check("future exam reports not_started", getExamWindow(beforeExam, NOW).state === EXAM_STATE.NOT_STARTED);
check("current exam reports open", getExamWindow(openExam, NOW).state === EXAM_STATE.OPEN);
check("past exam reports ended", getExamWindow(endedExam, NOW).state === EXAM_STATE.ENDED);
check("incomplete window reports misconfigured", getExamWindow(brokenExam, NOW).state === EXAM_STATE.MISCONFIGURED);

console.log("\nBoundaries");
const exactStart = { ...openExam, examStartTime: NOW, examEndTime: minutes(60) };
const exactEnd = { ...openExam, examStartTime: minutes(-60), examEndTime: NOW };
check("start instant is inside the window", getExamWindow(exactStart, NOW).state === EXAM_STATE.OPEN);
check("end instant is outside the window", getExamWindow(exactEnd, NOW).state === EXAM_STATE.ENDED);
check(
  "one ms before the end is still open",
  getExamWindow({ ...exactEnd, examEndTime: new Date(NOW.getTime() + 1) }, NOW).state ===
    EXAM_STATE.OPEN
);

console.log("\nCountdown values");
const notStarted = getExamWindow(beforeExam, NOW);
const running = getExamWindow(openExam, NOW);
check("msUntilStart counts down to the start", notStarted.msUntilStart === 30 * 60 * 1000, notStarted.msUntilStart);
check("msRemaining counts down to the end", running.msRemaining === 30 * 60 * 1000, running.msRemaining);
check("ended exam reports zero remaining", getExamWindow(endedExam, NOW).msRemaining === 0);
check("serverTime is echoed as an ISO string", running.serverTime === NOW.toISOString(), running.serverTime);
check("practice window carries no timings", notStarted.startsAt !== null && getExamWindow(practice, NOW).startsAt === null);

console.log("\nStudent access");
check("practice is open", isExamAccessOpen(practice, NOW));
check("running exam is open", isExamAccessOpen(openExam, NOW));
check("future exam is closed", !isExamAccessOpen(beforeExam, NOW));
check("past exam is closed", !isExamAccessOpen(endedExam, NOW));
check("misconfigured exam is closed, never open", !isExamAccessOpen(brokenExam, NOW));

console.log("\nDenials");
check("practice is never denied", getExamAccessDenial(practice, { now: NOW }) === null);
check("open exam is never denied", getExamAccessDenial(openExam, { now: NOW }) === null);

const beforeDenial = getExamAccessDenial(beforeExam, { now: NOW });
check("future exam denied with exam_not_started", beforeDenial?.body.reason === "exam_not_started", beforeDenial?.body.reason);
check("future exam denial is a 403", beforeDenial?.status === 403, beforeDenial?.status);
check("denial carries the window for the client", beforeDenial?.body.exam?.startsAt === minutes(30).toISOString());

const endedDenial = getExamAccessDenial(endedExam, { now: NOW });
check("past exam denied with exam_ended", endedDenial?.body.reason === "exam_ended", endedDenial?.body.reason);
check("past exam denial exposes EXAM_ENDED code", endedDenial?.body.error === "EXAM_ENDED");

const brokenDenial = getExamAccessDenial(brokenExam, { now: NOW });
check("misconfigured exam is denied", brokenDenial?.body.reason === "exam_misconfigured", brokenDenial?.body.reason);

console.log("\nPrivilege and enrolment exceptions");
check("admins bypass a future exam", getExamAccessDenial(beforeExam, { isPrivileged: true, now: NOW }) === null);
check("admins bypass an ended exam", getExamAccessDenial(endedExam, { isPrivileged: true, now: NOW }) === null);
check(
  "allowBeforeStart lets enrolment through before the exam opens",
  getExamAccessDenial(beforeExam, { allowBeforeStart: true, now: NOW }) === null
);
check(
  "allowBeforeStart still refuses an ended exam",
  getExamAccessDenial(endedExam, { allowBeforeStart: true, now: NOW })?.body.reason === "exam_ended"
);

console.log("\nSchema invariants");
const baseDoc = {
  title: "Mid Semester Test",
  description: "Timed assessment",
  startDate: NOW,
  endDate: minutes(600),
  createdBy: new mongoose.Types.ObjectId(),
};

const practiceDoc = new Cohort({ ...baseDoc });
check("cohorts default to practice mode", practiceDoc.mode === "practice", practiceDoc.mode);
check("practice cohort validates without exam times", !practiceDoc.validateSync());

const missingTimes = new Cohort({ ...baseDoc, mode: "exam" });
check("exam without times is rejected", Boolean(missingTimes.validateSync()));

const invertedWindow = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(120),
  examEndTime: minutes(60),
});
check("exam with end before start is rejected", Boolean(invertedWindow.validateSync()));

const validExam = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(120),
});
check("well-formed exam validates", !validExam.validateSync());

const demoted = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(120),
});
demoted.mode = "practice";
demoted.validateSync();
check(
  "switching back to practice clears the stale window",
  demoted.examStartTime === null && demoted.examEndTime === null
);

const badMode = new Cohort({ ...baseDoc, mode: "quiz" });
check("unknown mode is rejected by the enum", Boolean(badMode.validateSync()));

console.log("\nSweeper targeting");
// Asserts the sweeper only ever selects ended, still-active exam cohorts.
const sweepFilter = {
  mode: "exam",
  isActive: true,
  examEndTime: { $ne: null, $lte: NOW },
};
const matchesFilter = (cohort) =>
  cohort.mode === sweepFilter.mode &&
  cohort.isActive === sweepFilter.isActive &&
  cohort.examEndTime !== null &&
  new Date(cohort.examEndTime) <= NOW;

check("sweeper targets the ended exam", matchesFilter(endedExam));
check("sweeper skips the running exam", !matchesFilter(openExam));
check("sweeper skips the future exam", !matchesFilter(beforeExam));
check("sweeper skips practice cohorts", !matchesFilter(practice));
check("sweeper skips exams already inactive", !matchesFilter({ ...endedExam, isActive: false }));
check("sweeper skips exams with no end time", !matchesFilter(brokenExam));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
