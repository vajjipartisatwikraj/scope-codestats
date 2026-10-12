/**
 * Builds the payload for a student's section results page: who took the test,
 * how the section went, the question-by-question breakdown, and how the
 * student's skills compare with the rest of the batch.
 *
 * Read-only. The breakdown itself is produced when the section is scored (see
 * services/speechAnalysis); this only gathers it with the context around it.
 */

const SpeechTestAttempt = require("../models/SpeechTestAttempt");
const { axesFor, averageSkills } = require("./speechAnalysis/skills");

const round1 = (n) => Math.round(n * 10) / 10;

/** Skill averages and score over every student who has had this section scored. */
async function batchFigures(testId, sectionId) {
  const rows = await SpeechTestAttempt.aggregate([
    { $match: { test: testId } },
    { $unwind: "$sections" },
    { $match: { "sections.sectionId": sectionId, "sections.status": "scored" } },
    { $project: { _id: 0, score: "$sections.score", skills: "$sections.skills" } },
  ]);

  if (rows.length === 0) return { students: 0, averageScore: null, skills: {} };

  const scores = rows.map((r) => r.score).filter((s) => typeof s === "number");
  return {
    students: rows.length,
    averageScore: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    skills: averageSkills(rows.map((r) => r.skills).filter(Boolean)),
  };
}

/** "CSE-E · Batch 2026", with whatever parts the profile has. */
function classLabel(user) {
  const branch = [user.department, user.section].filter(Boolean).join("-");
  const batch = user.graduatingYear ? `Batch ${user.graduatingYear}` : "";
  return [branch, batch].filter(Boolean).join(" · ");
}

/**
 * @param {object} p
 * @param {object} p.test            SpeechTest document
 * @param {object} p.section         the test's section
 * @param {object} p.attempt         the student's SpeechTestAttempt
 * @param {object} p.attemptSection  that attempt's state for the section (must be scored)
 * @param {object} p.user            User document
 */
async function buildSectionReport({ test, section, attempt, attemptSection, user }) {
  const resultByQuestion = new Map(
    (attemptSection.results || []).map((r) => [String(r.questionId), r])
  );

  const questions = section.questions.map((question, index) => {
    const result = resultByQuestion.get(String(question._id));
    const answered = Boolean(result) && result.status !== "ANSWER_MISSING";
    return {
      questionId: question._id,
      number: index + 1,
      text: question.text,
      answered,
      status: result?.status || "ANSWER_MISSING",
      score: result?.score ?? 0,
      reason: result?.reason || "",
      flags: result?.flags || [],
      analysis: result?.analysis || null,
    };
  });

  const batch = await batchFigures(test._id, section._id);

  return {
    test: { title: test.title, startTime: test.startTime, endTime: test.endTime },
    student: {
      name: user.name,
      rollNumber: user.rollNumber,
      className: classLabel(user),
    },
    section: {
      sectionId: section._id,
      title: section.title,
      type: section.type,
      position: test.sections.findIndex((s) => String(s._id) === String(section._id)) + 1,
      totalSections: test.sections.length,
      timeLimitMinutes: section.timeLimitMinutes,
      timeUsedSeconds: attemptSection.timeUsedSeconds || 0,
      submittedAt: attemptSection.submittedAt,
      autoSubmitted: Boolean(attemptSection.autoSubmitted),
      score: attemptSection.score,
      questionCount: questions.length,
      answeredCount: questions.filter((q) => q.answered).length,
    },
    attemptStartedAt: attempt.startedAt,
    questions,
    skills: {
      axes: axesFor(section.type),
      you: attemptSection.skills || {},
      batch: batch.students > 1 ? batch.skills : null,
    },
    batch: { students: batch.students, averageScore: batch.averageScore },
  };
}

module.exports = { buildSectionReport };
