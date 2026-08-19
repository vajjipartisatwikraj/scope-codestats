/**
 * Exam-mode verification.
 *
 * Exercises the joining window, per-student attempt clocks, the access decisions
 * built on both, the schema invariants and the sweeper queries — all against a
 * fixed clock. Runs without a database and without the server: the models are
 * only used through `validateSync`, and the sweepers are checked by asserting the
 * predicates their filters express.
 *
 * Usage:  node scripts/exam-mode-check.js
 */

const mongoose = require("mongoose");
const Cohort = require("../models/Cohort");
const {
  EXAM_STATE,
  ATTEMPT_STATE,
  getExamWindow,
  getExamAttempt,
  computeAttemptDeadline,
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
const MIN = 60 * 1000;

const practice = { _id: "c-practice", mode: "practice", isActive: true };

/** Shared-clock exams: no duration, everyone stops at examEndTime. */
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

/** Timed exam: live 6PM–10PM equivalent, each student gets 120 minutes. */
const timedExam = {
  _id: "c-timed",
  mode: "exam",
  isActive: true,
  examStartTime: minutes(-60),
  examEndTime: minutes(180),
  examDurationMinutes: 120,
};
/** Same exam, joining window already closed. */
const timedExamClosed = {
  _id: "c-timed-closed",
  mode: "exam",
  isActive: true,
  examStartTime: minutes(-300),
  examEndTime: minutes(-30),
  examDurationMinutes: 120,
};

console.log("\nJoining window states");
check("practice cohort is never time-boxed", getExamWindow(practice, NOW).state === EXAM_STATE.PRACTICE);
check("future exam reports not_started", getExamWindow(beforeExam, NOW).state === EXAM_STATE.NOT_STARTED);
check("current exam reports open", getExamWindow(openExam, NOW).state === EXAM_STATE.OPEN);
check("past exam reports ended", getExamWindow(endedExam, NOW).state === EXAM_STATE.ENDED);
check("incomplete window reports misconfigured", getExamWindow(brokenExam, NOW).state === EXAM_STATE.MISCONFIGURED);
check("duration is reported when configured", getExamWindow(timedExam, NOW).durationMinutes === 120);
check("duration is null on a shared-clock exam", getExamWindow(openExam, NOW).durationMinutes === null);

console.log("\nBoundaries");
const exactStart = { ...openExam, examStartTime: NOW, examEndTime: minutes(60) };
const exactEnd = { ...openExam, examStartTime: minutes(-60), examEndTime: NOW };
check("start instant is inside the window", getExamWindow(exactStart, NOW).state === EXAM_STATE.OPEN);
check("end instant is outside the window", getExamWindow(exactEnd, NOW).state === EXAM_STATE.ENDED);
check(
  "one ms before the end is still open",
  getExamWindow({ ...exactEnd, examEndTime: new Date(NOW.getTime() + 1) }, NOW).state === EXAM_STATE.OPEN
);

console.log("\nDeadline computation");
check(
  "no duration means the deadline is the window end",
  computeAttemptDeadline(openExam, minutes(-10)).getTime() === minutes(30).getTime()
);
check(
  "a duration means start plus duration",
  computeAttemptDeadline(timedExam, NOW).getTime() === minutes(120).getTime()
);
check(
  "a late start still gets the full duration, past the window end",
  computeAttemptDeadline(timedExam, minutes(150)).getTime() === minutes(270).getTime(),
  "expected 150 + 120 = 270"
);
check("a cohort with no end time has no deadline", computeAttemptDeadline(brokenExam, NOW) === null);

console.log("\nAttempt states");
const noEnrollment = null;
const notStarted = { examAttemptStartedAt: null, examSubmittedAt: null };
const running = {
  examAttemptStartedAt: minutes(-30),
  examDeadlineAt: minutes(90),
  examSubmittedAt: null,
};
const expired = {
  examAttemptStartedAt: minutes(-180),
  examDeadlineAt: minutes(-60),
  examSubmittedAt: null,
};
const submittedManually = {
  examAttemptStartedAt: minutes(-90),
  examDeadlineAt: minutes(30),
  examSubmittedAt: minutes(-10),
  examSubmitReason: "manual",
};
const submittedOnTime = {
  examAttemptStartedAt: minutes(-180),
  examDeadlineAt: minutes(-60),
  examSubmittedAt: minutes(-60),
  examSubmitReason: "time_up",
};

check(
  "practice cohort has no attempt",
  getExamAttempt(practice, noEnrollment, NOW).attemptState === ATTEMPT_STATE.NONE
);
check(
  "unstarted attempt inside the window reports not_started",
  getExamAttempt(timedExam, notStarted, NOW).attemptState === ATTEMPT_STATE.NOT_STARTED
);
check(
  "running attempt reports in_progress",
  getExamAttempt(timedExam, running, NOW).attemptState === ATTEMPT_STATE.IN_PROGRESS
);
check(
  "attempt past its deadline reports time_up",
  getExamAttempt(timedExam, expired, NOW).attemptState === ATTEMPT_STATE.TIME_UP
);
check(
  "submitted attempt reports submitted",
  getExamAttempt(timedExam, submittedManually, NOW).attemptState === ATTEMPT_STATE.SUBMITTED
);

console.log("\nPersonal countdown");
const runningAttempt = getExamAttempt(timedExam, running, NOW);
check("remaining time follows the personal deadline", runningAttempt.msRemaining === 90 * MIN, runningAttempt.msRemaining);
check("the personal deadline is echoed", runningAttempt.deadlineAt === minutes(90).toISOString());
check("attempt start is echoed", runningAttempt.attemptStartedAt === minutes(-30).toISOString());
check("expired attempt reports zero remaining", getExamAttempt(timedExam, expired, NOW).msRemaining === 0);
check(
  "an unstarted attempt previews the full duration",
  getExamAttempt(timedExam, notStarted, NOW).msRemaining === 120 * MIN
);
check(
  "an unstarted attempt previews the deadline it would get",
  getExamAttempt(timedExam, notStarted, NOW).previewDeadlineAt === minutes(120).toISOString()
);
check(
  "a stored deadline wins over a recomputed one, so editing the duration cannot move it",
  getExamAttempt(
    { ...timedExam, examDurationMinutes: 10 },
    running,
    NOW
  ).deadlineAt === minutes(90).toISOString()
);

console.log("\nThe headline rule: attempts outlive the joining window");
const startedLate = {
  // Began 30 minutes before the window shut, with 120 minutes of their own.
  examAttemptStartedAt: minutes(-60),
  examDeadlineAt: minutes(60),
  examSubmittedAt: null,
};
const lateAttempt = getExamAttempt(timedExamClosed, startedLate, NOW);
check("the joining window has closed", lateAttempt.state === EXAM_STATE.ENDED);
check("but the attempt is still in progress", lateAttempt.attemptState === ATTEMPT_STATE.IN_PROGRESS);
check("and may continue", lateAttempt.canContinue === true);
check("while nobody new may start", lateAttempt.canStart === false);
check(
  "so the request is allowed through",
  getExamAccessDenial(timedExamClosed, { enrollment: startedLate, now: NOW }) === null
);
check(
  "whereas someone who never started is refused",
  getExamAccessDenial(timedExamClosed, { enrollment: notStarted, now: NOW })?.body.reason === "exam_ended"
);

console.log("\nStudent access");
check("practice is open", isExamAccessOpen(practice, noEnrollment, NOW));
check("running exam is open to a fresh start", isExamAccessOpen(openExam, notStarted, NOW));
check("future exam is closed", !isExamAccessOpen(beforeExam, notStarted, NOW));
check("past exam is closed to a fresh start", !isExamAccessOpen(endedExam, notStarted, NOW));
check("misconfigured exam is closed, never open", !isExamAccessOpen(brokenExam, notStarted, NOW));
check("an expired attempt is closed", !isExamAccessOpen(timedExam, expired, NOW));
check("a running attempt is open", isExamAccessOpen(timedExamClosed, startedLate, NOW));

console.log("\nDenials");
check("practice is never denied", getExamAccessDenial(practice, { now: NOW }) === null);
check("open exam is never denied", getExamAccessDenial(openExam, { enrollment: notStarted, now: NOW }) === null);

const beforeDenial = getExamAccessDenial(beforeExam, { enrollment: notStarted, now: NOW });
check("future exam denied with exam_not_started", beforeDenial?.body.reason === "exam_not_started", beforeDenial?.body.reason);
check("future exam denial is a 403", beforeDenial?.status === 403, beforeDenial?.status);
check("denial carries the window for the client", beforeDenial?.body.exam?.startsAt === minutes(30).toISOString());

const endedDenial = getExamAccessDenial(endedExam, { enrollment: notStarted, now: NOW });
check("past exam denied with exam_ended", endedDenial?.body.reason === "exam_ended", endedDenial?.body.reason);
check("past exam denial exposes EXAM_ENDED", endedDenial?.body.error === "EXAM_ENDED");

const timeUpDenial = getExamAccessDenial(timedExam, { enrollment: expired, now: NOW });
check("expired attempt denied with exam_time_up", timeUpDenial?.body.reason === "exam_time_up", timeUpDenial?.body.reason);
check("expired attempt exposes EXAM_TIME_UP", timeUpDenial?.body.error === "EXAM_TIME_UP");

const submittedDenial = getExamAccessDenial(timedExam, { enrollment: submittedManually, now: NOW });
check("manual submit denied with exam_submitted", submittedDenial?.body.reason === "exam_submitted", submittedDenial?.body.reason);

const autoSubmittedDenial = getExamAccessDenial(timedExam, { enrollment: submittedOnTime, now: NOW });
check(
  "auto submit is reported as time up, not as a manual end",
  autoSubmittedDenial?.body.reason === "exam_time_up",
  autoSubmittedDenial?.body.reason
);

const brokenDenial = getExamAccessDenial(brokenExam, { enrollment: notStarted, now: NOW });
check("misconfigured exam is denied", brokenDenial?.body.reason === "exam_misconfigured", brokenDenial?.body.reason);

console.log("\nPrivilege and enrolment exceptions");
check("admins bypass a future exam", getExamAccessDenial(beforeExam, { isPrivileged: true, now: NOW }) === null);
check("admins bypass an ended exam", getExamAccessDenial(endedExam, { isPrivileged: true, now: NOW }) === null);
check(
  "admins bypass an expired attempt",
  getExamAccessDenial(timedExam, { enrollment: expired, isPrivileged: true, now: NOW }) === null
);
check(
  "allowBeforeStart lets enrolment through before the exam opens",
  getExamAccessDenial(beforeExam, { enrollment: notStarted, allowBeforeStart: true, now: NOW }) === null
);
check(
  "allowBeforeStart still refuses an ended exam",
  getExamAccessDenial(endedExam, { enrollment: notStarted, allowBeforeStart: true, now: NOW })?.body.reason === "exam_ended"
);
check(
  "allowBeforeStart still refuses a finished exam",
  getExamAccessDenial(openExam, { enrollment: submittedManually, allowBeforeStart: true, now: NOW })?.body.reason === "exam_submitted"
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
check("duration defaults to null", practiceDoc.examDurationMinutes === null);

const missingTimes = new Cohort({ ...baseDoc, mode: "exam" });
check("exam without times is rejected", Boolean(missingTimes.validateSync()));

const invertedWindow = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(120),
  examEndTime: minutes(60),
});
check("exam with end before start is rejected", Boolean(invertedWindow.validateSync()));

const validTimedExam = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(300),
  examDurationMinutes: 120,
});
check("well-formed timed exam validates", !validTimedExam.validateSync());

const zeroDuration = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(300),
  examDurationMinutes: 0,
});
check("zero duration is rejected", Boolean(zeroDuration.validateSync()));

const fractionalDuration = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(300),
  examDurationMinutes: 12.5,
});
check("fractional duration is rejected", Boolean(fractionalDuration.validateSync()));

const hugeDuration = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(300),
  examDurationMinutes: 2000,
});
check("duration beyond 24 hours is rejected", Boolean(hugeDuration.validateSync()));

const demoted = new Cohort({
  ...baseDoc,
  mode: "exam",
  examStartTime: minutes(60),
  examEndTime: minutes(120),
  examDurationMinutes: 30,
});
demoted.mode = "practice";
demoted.validateSync();
check(
  "switching back to practice clears the window and the duration",
  demoted.examStartTime === null &&
    demoted.examEndTime === null &&
    demoted.examDurationMinutes === null
);

const badMode = new Cohort({ ...baseDoc, mode: "quiz" });
check("unknown mode is rejected by the enum", Boolean(badMode.validateSync()));

console.log("\nSweeper targeting");

// Auto-submit: started, not submitted, deadline passed.
const autoSubmitMatches = (enrollment) =>
  Boolean(enrollment.examAttemptStartedAt) &&
  !enrollment.examSubmittedAt &&
  Boolean(enrollment.examDeadlineAt) &&
  new Date(enrollment.examDeadlineAt) <= NOW;

check("auto-submit targets the expired attempt", autoSubmitMatches(expired));
check("auto-submit skips a running attempt", !autoSubmitMatches(running));
check("auto-submit skips an unstarted attempt", !autoSubmitMatches(notStarted));
check("auto-submit skips an already submitted attempt", !autoSubmitMatches(submittedOnTime));

// Cohort archiving: window closed, and no attempt still running.
const archiveCandidate = (cohort) =>
  cohort.mode === "exam" &&
  cohort.isActive === true &&
  Boolean(cohort.examEndTime) &&
  new Date(cohort.examEndTime) <= NOW;

const attemptKeepsCohortAlive = (enrollment) =>
  Boolean(enrollment.examAttemptStartedAt) &&
  !enrollment.examSubmittedAt &&
  Boolean(enrollment.examDeadlineAt) &&
  new Date(enrollment.examDeadlineAt) > NOW;

check("archiving considers the closed exam", archiveCandidate(endedExam));
check("archiving skips the running exam", !archiveCandidate(openExam));
check("archiving skips practice cohorts", !archiveCandidate(practice));
check("archiving skips exams already inactive", !archiveCandidate({ ...endedExam, isActive: false }));
check(
  "a late attempt keeps its cohort out of the archive",
  archiveCandidate(timedExamClosed) && attemptKeepsCohortAlive(startedLate)
);
check("an expired attempt does not keep a cohort alive", !attemptKeepsCohortAlive(expired));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
