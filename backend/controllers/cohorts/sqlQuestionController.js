/**
 * SQL questions controller.
 *
 * SQL questions: authoring them against the SQLJudge engine, and solving them.
 *
 * Wired to URLs in routes/cohorts/sqlQuestion.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Question = require("../../models/Question");
const UserCohort = require("../../models/UserCohort");
const cascadeService = require("../../services/cohortCascadeService");
const sqlQuestionService = require("../../services/sqlQuestionService");
const { blockedByExamWindow } = require("../../services/cohorts/examGateService");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const { resolveModuleContext, respondSqlError } = require("./sqlHelpers");
const { sqlJudge } = require("../../services/judges");
const log = require("../../utils/logger").scope("COHORT-SQL");

/**
 * ADMIN — Generate Outputs.
 * Executes the reference solution against every seed and returns the generated
 * expected output per testcase. Nothing is written to S3.
 */
const generateOutputs = async (req, res) => {
  try {
    const context = await resolveModuleContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }

    const input = sqlQuestionService.parseSqlQuestionPayload(req.body);
    const generated = await sqlQuestionService.generateOutputs(input);

    res.json({
      message: `Generated expected output for ${generated.testcases.length} testcase(s)`,
      judgeQuestionId: input.judgeQuestionId,
      judgeVersion: input.judgeVersion,
      ...generated,
    });
  } catch (err) {
    respondSqlError(res, err, "Failed to generate expected outputs");
  }
};

/**
 * ADMIN — Validate testcases.
 * Optional for SQL questions: publishing regenerates expected output from the
 * solution anyway. Useful to check hand-written expected rows before publishing.
 */
const validateTestcases = async (req, res) => {
  try {
    const context = await resolveModuleContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }

    const input = sqlQuestionService.parseSqlQuestionPayload(req.body);
    const validation = await sqlQuestionService.validateTestcases(input);

    res.json({
      message: validation.valid
        ? "All testcases match the reference solution output"
        : "One or more testcases do not match the reference solution output",
      judgeQuestionId: input.judgeQuestionId,
      judgeVersion: input.judgeVersion,
      ...validation,
    });
  } catch (err) {
    respondSqlError(res, err, "Failed to validate testcases");
  }
};

/**
 * ADMIN — Submit (publish).
 *
 * Publishes the question to S3 through the engine, then creates the Question in
 * MongoDB and wires it into every related cohort exactly like the single-create
 * route does.
 *
 * Ordering note: S3 is written first because the engine has no delete endpoint,
 * so a local failure afterwards leaves a reusable published version rather than
 * a Question row pointing at assets that do not exist. The republish path is an
 * explicit `overwrite` flag.
 */
const publishSqlQuestion = async (req, res) => {
  try {
    const context = await resolveModuleContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }
    const { module } = context;

    const input = sqlQuestionService.parseSqlQuestionPayload(req.body);
    const relatedCohorts = await cascadeService.getRelatedCohorts(req.params.cohortId);

    if (req.query.preview === "true") {
      return res.json({
        action: "create_sql_question",
        affectedCohorts: relatedCohorts,
        module: { _id: module._id, title: module.title },
        questionData: {
          title: input.title,
          type: "sql",
          difficultyLevel: input.difficultyLevel,
          marks: input.marks,
          judgeQuestionId: input.judgeQuestionId,
          judgeVersion: input.judgeVersion,
          visibleTestcases: input.testcases.filter((tc) => tc.visible).length,
          hiddenTestcases: input.testcases.filter((tc) => !tc.visible).length,
        },
      });
    }

    // 1) Publish to S3. The engine regenerates expected output itself.
    const published = await sqlQuestionService.publishToJudge(input);

    // 2) Read back the published question so stored columns match the engine.
    let expectedColumns = published?.outputColumns || [];
    if (expectedColumns.length === 0) {
      try {
        const fetched = await sqlJudge.getQuestion(
          input.judgeQuestionId,
          input.judgeVersion
        );
        expectedColumns = fetched?.question?.outputFormat?.columns || [];
      } catch (readError) {
        log.warn(
          "⚠️ Published SQL question could not be read back for output columns:",
          readError.message
        );
      }
    }

    // 3) Persist locally using the same shape as other question types.
    const questionData = sqlQuestionService.buildQuestionDocument(input, published, {
      moduleId: module._id,
      createdBy: req.user.id,
      expectedColumns,
    });

    let question;
    try {
      question = new Question(questionData);
      await question.save();

      module.questions.push(question._id);
      await module.save();
    } catch (persistError) {
      log.error(
        `❌ SQL question published to S3 but could not be saved locally. ` +
          `Republish with overwrite:true after fixing the cause. ` +
          `questionId=${input.judgeQuestionId} version=${input.judgeVersion}`,
        persistError
      );
      return res.status(500).json({
        message:
          "The question was published to S3 but could not be saved. Retry with overwrite enabled.",
        code: "SQL_QUESTION_PERSIST_FAILED",
        judgeQuestionId: input.judgeQuestionId,
        judgeVersion: input.judgeVersion,
        error: persistError.message,
      });
    }

    // 4) Mirror progress bookkeeping for every related cohort.
    const relatedCohortIds = relatedCohorts.map((c) => c._id);
    const userCohorts = await UserCohort.find({
      cohort: { $in: relatedCohortIds },
    });

    for (const userCohort of userCohorts) {
      const moduleProgressIndex = userCohort.moduleProgress.findIndex(
        (mp) => mp.module.toString() === module._id.toString()
      );
      if (moduleProgressIndex !== -1) {
        userCohort.moduleProgress[moduleProgressIndex].totalQuestions += 1;
        userCohort.questionProgress.push({
          question: question._id,
          attempts: 0,
          solved: false,
          bestScore: 0,
        });
        await userCohort.save();
      }
    }

    log.debug(
      `✅ SQL question "${input.title}" published (${input.judgeQuestionId} v${input.judgeVersion}) ` +
        `and added to ${relatedCohorts.length} cohort(s)`
    );

    res.status(201).json({
      message: `SQL question created and added to ${relatedCohorts.length} cohort(s)`,
      question,
      affectedCohorts: relatedCohorts,
      publish: {
        judgeQuestionId: input.judgeQuestionId,
        judgeVersion: input.judgeVersion,
        objects: published?.objects ?? null,
        visible: input.testcases.filter((tc) => tc.visible).length,
        hidden: input.testcases.filter((tc) => !tc.visible).length,
        outputColumns: expectedColumns,
      },
    });
  } catch (err) {
    respondSqlError(res, err, "Failed to create the SQL question");
  }
};

/**
 * USER — SQL question context.
 *
 * Returns the schema, the starting query and the visible testcases (seed plus
 * expected rows) so the solving screen can render real tables. Hidden testcases
 * are never included.
 */
const getSqlContext = async (req, res) => {
  try {
    const { cohortId, moduleId, questionId } = req.params;
    const isPrivileged = isAdminOrTeacher(req.user);

    const [cohort, question, enrollment] = await Promise.all([
      Cohort.findById(cohortId),
      Question.findOne({ _id: questionId, module: moduleId }),
      isPrivileged
        ? Promise.resolve(null)
        : UserCohort.findOne({ user: req.user.id, cohort: cohortId }),
    ]);

    if (!cohort) return res.status(404).json({ message: "Cohort not found" });
    if (!isPrivileged && cohort.isDraft) {
      return res.status(403).json({
        message: "This cohort is not published yet",
        error: "COHORT_UNPUBLISHED",
      });
    }
    if (!isPrivileged && !enrollment) {
      return res.status(403).json({ message: "Not enrolled in this cohort" });
    }
    if (await blockedByExamWindow(res, cohort, { isPrivileged, userId: req.user.id }))
      return;
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (question.type !== "sql") {
      return res.status(400).json({ message: "This question is not a SQL question" });
    }

    const meta = question.sqlMeta || {};
    let engineQuestion = null;
    let visibleTestcases = [];

    try {
      const fetched = await sqlJudge.getQuestion(
        meta.judgeQuestionId,
        meta.judgeVersion || 1
      );
      engineQuestion = fetched?.question || null;
      visibleTestcases = (fetched?.testcases || []).map((tc) => ({
        id: tc.id,
        seedSql: tc.seedSql || "",
        expected: tc.expected || null,
      }));
    } catch (err) {
      // The question is still solvable without the sample tables, so degrade
      // instead of failing the whole screen.
      log.warn(
        `⚠️ Could not load SQL context for ${meta.judgeQuestionId}: ${err.message}`
      );
    }

    res.json({
      questionId: question._id,
      judgeQuestionId: meta.judgeQuestionId,
      judgeVersion: meta.judgeVersion,
      database: meta.database || { type: "MYSQL", version: "8.4" },
      schemaSql: meta.schemaSql || "",
      boilerplateSql: meta.boilerplateSql || sqlQuestionService.DEFAULT_BOILERPLATE_SQL,
      expectedColumns: meta.expectedColumns || [],
      constraints: engineQuestion?.constraints || [],
      outputFormat: engineQuestion?.outputFormat || null,
      visibleTestcaseCount: meta.visibleTestcaseCount || visibleTestcases.length,
      hiddenTestcaseCount: meta.hiddenTestcaseCount || 0,
      totalTestcaseCount: meta.totalTestcaseCount || 0,
      testcases: visibleTestcases,
    });
  } catch (err) {
    respondSqlError(res, err, "Failed to load SQL question context");
  }
};

/**
 * USER — Run.
 *
 * Grades against the visible testcases only and returns per-testcase detail:
 * actual rows, expected rows and the mismatch explanation. A run is practice,
 * so it is never recorded as a submission and never affects progress.
 */
const runSqlQuery = async (req, res) => {
  try {
    const { cohortId, moduleId, questionId } = req.params;
    const { sql } = req.body || {};
    const isPrivileged = isAdminOrTeacher(req.user);

    if (typeof sql !== "string" || sql.trim() === "") {
      return res.status(400).json({ message: "SQL query is required" });
    }

    const [cohort, question, enrollment] = await Promise.all([
      Cohort.findById(cohortId),
      Question.findOne({ _id: questionId, module: moduleId }),
      isPrivileged
        ? Promise.resolve(null)
        : UserCohort.findOne({ user: req.user.id, cohort: cohortId }),
    ]);

    if (!cohort) return res.status(404).json({ message: "Cohort not found" });
    if (!isPrivileged && cohort.isDraft) {
      return res.status(403).json({
        message: "This cohort is not published yet",
        error: "COHORT_UNPUBLISHED",
      });
    }
    if (!isPrivileged && !enrollment) {
      return res.status(403).json({ message: "Not enrolled in this cohort" });
    }
    if (await blockedByExamWindow(res, cohort, { isPrivileged, userId: req.user.id }))
      return;
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (question.type !== "sql") {
      return res.status(400).json({ message: "This question is not a SQL question" });
    }

    const meta = question.sqlMeta || {};
    const verdict = await sqlJudge.run({
      questionId: meta.judgeQuestionId,
      version: meta.judgeVersion || 1,
      sql,
    });

    res.json({
      mode: "RUN",
      status: verdict.status,
      passed: verdict.passed ?? 0,
      total: verdict.total ?? 0,
      executionTimeMs: verdict.executionTimeMs ?? 0,
      ...(verdict.error ? { error: verdict.error } : {}),
      ...(verdict.failedAt ? { failedAt: verdict.failedAt } : {}),
      testcases: verdict.testcases || [],
    });
  } catch (err) {
    respondSqlError(res, err, "Failed to run the SQL query");
  }
};

module.exports = {
  generateOutputs,
  validateTestcases,
  publishSqlQuestion,
  getSqlContext,
  runSqlQuery,
};
