/**
 * Code execution endpoints for programming code, wired by three route files:
 *
 *   routes/compiler.js                /api/compiler/run, /submit, /submit-combined
 *   routes/cohorts/question.routes.js /api/cohorts/submit-code-combined (question editor)
 *   routes/practiceArena.js           /api/practice-arena/run-code, /submit-code-combined
 *
 *   runCode              one program with custom input
 *   submitCode           a program against test cases
 *   submitCodeCombined   a program against test cases, online-judge style (all input on stdin)
 *
 * The work itself is done by the CodeJudge service (services/judges/codeJudge),
 * which talks to Judge0. Login, staff checks and rate limits are applied in the
 * route files.
 */
const { codeJudge } = require("../services/judges");
const log = require("../utils/logger").scope("CODE-EXECUTION");

const badRequest = (res, error) => res.status(400).json({ success: false, error });

const failure = (res, label, error) => {
  log.error(`${label}:`, error);
  res.status(500).json({ success: false, error: error.message });
};

/** POST .../run-code or /run { language, source_code, input? } */
const runCode = async (req, res) => {
  try {
    const { language, source_code, input } = req.body;
    if (!language || !source_code) return badRequest(res, "language and source_code are required");

    res.json(await codeJudge.run(language, source_code, input || ""));
  } catch (error) {
    failure(res, "Run code endpoint error", error);
  }
};

/** Builds the handler of a "run against test cases" endpoint. */
const testCaseHandler = (run, label) => async (req, res) => {
  try {
    const { language, source_code, testCases, options } = req.body;
    if (!language || !source_code) return badRequest(res, "language and source_code are required");
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return badRequest(res, "testCases array is required and must not be empty");
    }

    res.json(await run(language, source_code, testCases, options || {}));
  } catch (error) {
    failure(res, label, error);
  }
};

/** POST /api/compiler/submit { language, source_code, testCases, options? } */
const submitCode = testCaseHandler(codeJudge.submit, "Submit code endpoint error");

/** POST .../submit-code-combined or /submit-combined { language, source_code, testCases, options? } */
const submitCodeCombined = testCaseHandler(codeJudge.submitCombined, "Submit-code-combined endpoint error");

module.exports = { runCode, submitCode, submitCodeCombined };
