const express = require("express");
const router = express.Router();
const {
  submissionRateLimiter,
  runCodeRateLimiter,
} = require("../middleware/redisRateLimiter");
const { codeJudge } = require("../services/judges");
const { toJudgeTestCases, limitsOf, toStudentResult } = require("../services/cohorts/questionExecution");
const codeExecutionController = require("../controllers/codeExecutionController");
const Question = require("../models/Question");
const PAQuestion = require("../models/PAQuestion");
const PATest = require("../models/PATest");
const Module = require("../models/Module");
const Cohort = require("../models/Cohort");
const auth = require("../middleware/auth");
const log = require("../utils/logger").scope("COMPILER");

// ─── Open code execution ────────────────────────────────────────────────────
// The handlers are shared (controllers/codeExecutionController). Rate limited per
// user: a 2 second cooldown for run and 5 seconds for submissions.
//
//   POST /api/compiler/run              { language, source_code, input? }
//   POST /api/compiler/submit           { language, source_code, testCases, options? }
//   POST /api/compiler/submit-combined  same, with all input on stdin (online-judge style)

router.post("/run", auth, runCodeRateLimiter, codeExecutionController.runCode);
router.post("/submit", auth, submissionRateLimiter, codeExecutionController.submitCode);
router.post("/submit-combined", auth, submissionRateLimiter, codeExecutionController.submitCodeCombined);

// ─── Code execution against a stored question ───────────────────────────────

/**
 * POST /api/compiler/execute-with-question
 * SECURE endpoint that fetches test cases from database instead of accepting from frontend
 * This prevents students from seeing hidden test cases
 *
 * Body:
 * {
 *   "language": "python",
 *   "source_code": "x = int(input())\nprint(x * 2)",
 *   "questionId": "60f7b3b3b3b3b3b3b3b3b3b3",
 *   "mode": "run" | "submit",  // run: only visible test cases, submit: all test cases
 *   "options": {
 *     "time_limit": 3,
 *     "memory_limit": 262144
 *   }
 * }
 * Rate limited: 5-second cooldown per user/IP
 */
router.post(
  "/execute-with-question",
  auth,
  submissionRateLimiter,
  async (req, res) => {
    try {
      const { language, source_code, questionId, mode, options } = req.body;

      log.debug(
        `🔒 SECURE EXECUTE request - Language: ${language}, Question: ${questionId}, Mode: ${mode}`
      );

      if (!language || !source_code) {
        return res.status(400).json({
          success: false,
          error: "language and source_code are required",
        });
      }

      if (!questionId) {
        return res.status(400).json({
          success: false,
          error: "questionId is required",
        });
      }

      if (!mode || !["run", "submit"].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: 'mode must be either "run" or "submit"',
        });
      }

      // Fetch question from database
      // Try both Question (cohorts) and PAQuestion (practice arena) models
      let question = await Question.findById(questionId);
      let isPracticeArena = false;

      if (!question) {
        // Try PAQuestion model if Question not found
        question = await PAQuestion.findById(questionId);
        isPracticeArena = true;
      }

      if (!question) {
        log.debug(`❌ Question not found with ID: ${questionId}`);
        return res.status(404).json({
          success: false,
          error: "Question not found",
        });
      }

      // SECURITY: Verify user has access to this question
      if (isPracticeArena) {
        // For practice arena questions, verify user has an active test containing this question
        const activeTest = await PATest.findOne({
          user: req.user.id,
          questions: questionId,
          status: "started",
        });

        if (!activeTest) {
          log.debug(
            `🚫 SECURITY: User ${req.user.id} attempted to access PA question ${questionId} without active test`
          );
          return res.status(403).json({
            success: false,
            error:
              "Access denied. You must have an active practice test containing this question.",
          });
        }

        log.debug(
          `✅ SECURITY: User ${req.user.id} has active test ${activeTest._id} containing question ${questionId}`
        );
      } else {
        // For cohort questions, verify user has access to the cohort
        // First, find the module containing this question
        const module = await Module.findOne({ _id: question.module });

        if (!module) {
          log.debug(
            `🚫 SECURITY: Module not found for question ${questionId}`
          );
          return res.status(404).json({
            success: false,
            error: "Module not found for this question",
          });
        }

        // ✅ CASCADE FIX: Find ANY cohort that contains this module (handles deleted original cohorts)
        // Instead of using module.cohort (which may point to deleted cohort),
        // find all cohorts containing this module
        const cohortsWithModule = await Cohort.find({
          modules: module._id,
          isActive: true,
          isDraft: false,
        });

        if (!cohortsWithModule || cohortsWithModule.length === 0) {
          log.debug(
            `🚫 SECURITY: No active cohorts found containing module ${module._id}`
          );
          return res.status(404).json({
            success: false,
            error: "No active cohort found for this question",
          });
        }

        // Check if user is admin/teacher or enrolled in ANY of these cohorts
        const isAdmin =
          req.user.userType === "admin" || req.user.userType === "teacher";

        if (!isAdmin) {
          // Find a cohort where user is eligible
          const userCohort = cohortsWithModule.find((cohort) =>
            cohort.eligibleUsers.some(
              (id) => id.toString() === req.user.id.toString()
            )
          );

          if (!userCohort) {
            log.debug(
              `🚫 SECURITY: User ${req.user.id} attempted to access question ${questionId} without enrollment in any cohort containing this module`
            );
            return res.status(403).json({
              success: false,
              error:
                "Access denied. You must be enrolled in a cohort containing this question.",
            });
          }

          log.debug(
            `✅ SECURITY: User ${req.user.id} has access to question ${questionId} via cohort ${userCohort._id} (${userCohort.title})`
          );
        } else {
          log.debug(
            `✅ SECURITY: Admin/Teacher ${req.user.id} has access to question ${questionId}`
          );
        }
      }

      log.debug(
        `✅ Question found: ${question.title} (Type: ${question.type})`
      );

      // Time and memory limits come from the question's constraints
      const limits = limitsOf(question);
      log.debug(`Execution limits - Time: ${limits.time_limit}s, Memory: ${limits.memory_limit}KB`);

      if (!question.testCases || question.testCases.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Question has no test cases",
        });
      }

      // Filter test cases based on mode
      let testCasesToExecute;

      if (mode === "run") {
        // RUN mode: Only execute visible test cases
        testCasesToExecute = question.testCases.filter((tc) => !tc.hidden);
        log.debug(
          `📊 RUN mode: Executing ${testCasesToExecute.length} visible test cases`
        );
      } else {
        // SUBMIT mode: Execute ALL test cases (including hidden)
        testCasesToExecute = question.testCases;
        log.debug(
          `📊 SUBMIT mode: Executing ${
            testCasesToExecute.length
          } total test cases (${
            question.testCases.filter((tc) => tc.hidden).length
          } hidden)`
        );
      }

      if (testCasesToExecute.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            mode === "run"
              ? "No visible test cases available"
              : "No test cases available",
        });
      }

      // Format test cases for execution
      const formattedTestCases = toJudgeTestCases(testCasesToExecute);

      // Merge question constraints with provided options (options take precedence)
      const executionOptions = {
        time_limit: options?.time_limit || limits.time_limit,
        memory_limit: options?.memory_limit || limits.memory_limit,
      };

      log.debug(`🚀 Executing with options:`, executionOptions);

      // Execute code with the fetched test cases
      const result = await codeJudge.submitCombined(
        language,
        source_code,
        formattedTestCases,
        executionOptions,
        mode // Pass mode to the service
      );

      // Only what a student may see: no hidden test cases and no hidden inputs
      const response = toStudentResult(result, formattedTestCases, mode);

      // Log summary only (no test case details)
      if (result.summary) {
        log.debug(
          `✅ Execution completed (${mode} mode): ${result.summary.passed}/${result.summary.total} passed`
        );
      } else {
        log.debug(
          `✅ Code execution completed: ${result.success ? "Success" : "Failed"}`
        );
      }
      
      res.json(response);
    } catch (error) {
      log.error("❌ Execute-with-question endpoint error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;
