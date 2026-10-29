/**
 * Running a stored programming question on CodeJudge (Judge0), and deciding what the
 * student's browser may see of the outcome.
 *
 * Used by every route that grades a student's code against a question's test cases:
 *   POST /api/cohorts/.../questions/:q/submit   (grades once, saves, and returns what to display)
 *   POST /api/compiler/execute-with-question    (runs without saving: Run in cohorts, tests in practice arena)
 *
 * The test cases always come from the database. The browser never sends them, so hidden
 * test cases are never exposed.
 */

const DEFAULT_TIME_LIMIT_MS = 2000;
const DEFAULT_MEMORY_LIMIT_KB = 128000;

/** Test cases in the shape CodeJudge expects. `hidden` is kept so results can be filtered later. */
function toJudgeTestCases(testCases) {
  return testCases.map((tc) => ({
    input: tc.input || "",
    output: tc.output || "",
    expectedOutput: tc.output || "",
    hidden: tc.hidden || false,
  }));
}

/**
 * Time limit (seconds) and memory limit (KB) from the question's constraints.
 * The question stores the time in milliseconds and the memory in MB; Judge0 wants seconds and KB.
 */
function limitsOf(question) {
  const timeLimitMs = question.constraints?.timeLimit || DEFAULT_TIME_LIMIT_MS;
  const memoryLimitKB = question.constraints?.memoryLimit
    ? question.constraints.memoryLimit * 1024
    : DEFAULT_MEMORY_LIMIT_KB;
  return { time_limit: timeLimitMs / 1000, memory_limit: memoryLimitKB };
}

/**
 * The part of a CodeJudge result a student may see. Returns a new object; the result that was
 * passed in is left as it is, because the server still grades from the full one.
 *
 * run:    every executed test case, with its input (a run only executes the visible ones).
 * submit: only the visible test cases, without their input, plus `hasHiddenTestCases`. The
 *         summary still counts every test case, so the student sees "7/10 passed" without
 *         learning what the hidden ones are.
 *
 * @param {object} result          what CodeJudge returned
 * @param {Array}  judgeTestCases  the list that was executed (from toJudgeTestCases), in order
 * @param {"run"|"submit"} mode
 */
function toStudentResult(result, judgeTestCases, mode) {
  result = result || {};
  if (mode === "run") {
    if (!Array.isArray(result.results)) return { ...result };
    return {
      ...result,
      results: result.results.map((r, index) => ({
        ...r,
        hidden: false,
        input: judgeTestCases[index]?.input || "",
      })),
    };
  }

  const visible = (result.results || []).filter((r, index) => !judgeTestCases[index]?.hidden);
  return {
    ...result,
    results: visible.map((r) => ({ ...r, hidden: false, input: "" })),
    hasHiddenTestCases: judgeTestCases.some((tc) => tc.hidden),
  };
}

module.exports = { toJudgeTestCases, limitsOf, toStudentResult };
