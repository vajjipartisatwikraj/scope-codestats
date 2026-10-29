/**
 * Helpers shared by the SQL question and submission controllers.
 */
const Cohort = require("../../models/Cohort");
const Module = require("../../models/Module");
const sqlQuestionService = require("../../services/sqlQuestionService");
const { sqlJudge } = require("../../services/judges");
const log = require("../../utils/logger").scope("COHORT-SQL");

// SQL QUESTIONS (external SQLJudge execution engine)
/**
 * SQL questions differ from programming questions in one important way: their
 * testcases (seed data and expected rows) live in the SQLJudge private S3
 * bucket, not in MongoDB. We store the engine identifiers, the S3 object keys
 * and the display-safe assets, and every execution is proxied through these
 * routes so cohort authorisation is always applied first.
 */
/**
 * Shared cohort/module resolution used by the SQL routes.
 */
async function resolveModuleContext(req) {
  const cohort = await Cohort.findById(req.params.cohortId);
  if (!cohort) {
    return { error: { status: 404, body: { message: "Cohort not found" } } };
  }

  const moduleIsInCohort = cohort.modules.some(
    (modId) => modId.toString() === req.params.moduleId
  );
  if (!moduleIsInCohort) {
    return {
      error: {
        status: 404,
        body: {
          message: "Module not found in this cohort",
          reason: "module_not_in_cohort",
        },
      },
    };
  }

  const module = await Module.findById(req.params.moduleId);
  if (!module) {
    return { error: { status: 404, body: { message: "Module not found" } } };
  }

  return { cohort, module };
}

/**
 * Uniform error mapping for SQL engine and validation failures.
 */
function respondSqlError(res, err, fallbackMessage) {
  if (
    err instanceof sqlQuestionService.SqlQuestionError ||
    err instanceof sqlJudge.SqlJudgeError
  ) {
    return res.status(err.status || 400).json({
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }
  log.error(`❌ ${fallbackMessage}:`, err);
  return res.status(500).json({ message: fallbackMessage, error: err.message });
}

module.exports = {
  resolveModuleContext,
  respondSqlError,
};
