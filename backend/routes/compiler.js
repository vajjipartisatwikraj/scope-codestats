const express = require("express");
const router = express.Router();
const {
  submissionRateLimiter,
  runCodeRateLimiter,
} = require("../middleware/redisRateLimiter");
const {
  runCode,
  submitCode,
  submitCodeCombined,
} = require("../services/simpleCodeExecutionService");
const Question = require("../models/Question");
const PAQuestion = require("../models/PAQuestion");
const PATest = require("../models/PATest");
const Module = require("../models/Module");
const Cohort = require("../models/Cohort");
const auth = require("../middleware/auth");

/**
 * POST /api/compiler/run
 * Simple code execution for testing with custom input
 * Rate limited: 2-second cooldown per user/IP
 *
 * Body:
 * {
 *   "language": "python",
 *   "source_code": "print('Hello World')",
 *   "input": "optional input"
 * }
 */
router.post("/run", runCodeRateLimiter, async (req, res) => {
  try {
    const { language, source_code, input } = req.body;

    console.log(`🏃 RUN request - Language: ${language}`);

    if (!language || !source_code) {
      return res.status(400).json({
        success: false,
        error: "language and source_code are required",
      });
    }

    const result = await runCode(language, source_code, input || "");
    res.json(result);
  } catch (error) {
    console.error("❌ Run endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/compiler/submit
 * Code execution against test cases
 *
 * Body:
 * {
 *   "language": "python",
 *   "source_code": "x = int(input())\nprint(x * 2)",
 *   "testCases": [
 *     {"input": "5", "output": "10"},
 *     {"input": "3", "output": "6"}
 *   ],
 *   "options": {
 *     "time_limit": 2,
 *     "memory_limit": 128000
 *   }
 * }
 * Rate limited: 5-second cooldown per user/IP
 */
router.post("/submit", submissionRateLimiter, async (req, res) => {
  try {
    const { language, source_code, testCases, options } = req.body;

    console.log(
      `📝 SUBMIT request - Language: ${language}, Test cases: ${
        testCases?.length || 0
      }`
    );

    if (!language || !source_code) {
      return res.status(400).json({
        success: false,
        error: "language and source_code are required",
      });
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "testCases array is required and must not be empty",
      });
    }

    const result = await submitCode(
      language,
      source_code,
      testCases,
      options || {}
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Submit endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/compiler/submit-combined
 * Code execution against test cases using combined stdin (online-judge style)
 *
 * Body:
 * {
 *   "language": "java",
 *   "source_code": "...",
 *   "testCases": [
 *     {"input": "5", "output": "10"},
 *     {"input": "3", "output": "6"}
 *   ],
 *   "options": {
 *     "time_limit": 3,
 *     "memory_limit": 262144
 *   }
 * }
 * Rate limited: 5-second cooldown per user/IP
 */
router.post("/submit-combined", submissionRateLimiter, async (req, res) => {
  try {
    const { language, source_code, testCases, options } = req.body;

    console.log(
      `📝 SUBMIT-COMBINED request - Language: ${language}, Test cases: ${
        testCases?.length || 0
      }`
    );

    if (!language || !source_code) {
      return res.status(400).json({
        success: false,
        error: "language and source_code are required",
      });
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "testCases array is required and must not be empty",
      });
    }

    const result = await submitCodeCombined(
      language,
      source_code,
      testCases,
      options || {}
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Submit-combined endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

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

      console.log(
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
        console.log(`❌ Question not found with ID: ${questionId}`);
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
          console.log(
            `🚫 SECURITY: User ${req.user.id} attempted to access PA question ${questionId} without active test`
          );
          return res.status(403).json({
            success: false,
            error:
              "Access denied. You must have an active practice test containing this question.",
          });
        }

        console.log(
          `✅ SECURITY: User ${req.user.id} has active test ${activeTest._id} containing question ${questionId}`
        );
      } else {
        // For cohort questions, verify user has access to the cohort
        // First, find the module containing this question
        const module = await Module.findOne({ _id: question.module });

        if (!module) {
          console.log(
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
          console.log(
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
            console.log(
              `🚫 SECURITY: User ${req.user.id} attempted to access question ${questionId} without enrollment in any cohort containing this module`
            );
            return res.status(403).json({
              success: false,
              error:
                "Access denied. You must be enrolled in a cohort containing this question.",
            });
          }

          console.log(
            `✅ SECURITY: User ${req.user.id} has access to question ${questionId} via cohort ${userCohort._id} (${userCohort.title})`
          );
        } else {
          console.log(
            `✅ SECURITY: Admin/Teacher ${req.user.id} has access to question ${questionId}`
          );
        }
      }

      console.log(
        `✅ Question found: ${question.title} (Type: ${question.type})`
      );

      // Extract time and memory limits from question constraints
      // timeLimit is stored in milliseconds, Judge0 expects seconds
      const timeLimitMs = question.constraints?.timeLimit || 2000; // Default 2000ms = 2s
      const timeLimit = timeLimitMs / 1000; // Convert milliseconds to seconds

      const memoryLimit = question.constraints?.memoryLimit
        ? question.constraints.memoryLimit * 1024 // Convert MB to KB
        : 128000; // Default 128MB in KB

      console.log(
        `⚙️ Execution limits - Time: ${timeLimitMs}ms (${timeLimit}s), Memory: ${memoryLimit}KB (${
          memoryLimit / 1024
        }MB)`
      );

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
        console.log(
          `📊 RUN mode: Executing ${testCasesToExecute.length} visible test cases`
        );
      } else {
        // SUBMIT mode: Execute ALL test cases (including hidden)
        testCasesToExecute = question.testCases;
        console.log(
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
      const formattedTestCases = testCasesToExecute.map((tc) => ({
        input: tc.input || "",
        output: tc.output || "",
        expectedOutput: tc.output || "",
        hidden: tc.hidden || false, // Preserve hidden flag for result filtering
      }));

      // Merge question constraints with provided options (options take precedence)
      const executionOptions = {
        time_limit: options?.time_limit || timeLimit,
        memory_limit: options?.memory_limit || memoryLimit,
      };

      console.log(`🚀 Executing with options:`, executionOptions);

      // Execute code with the fetched test cases
      const result = await submitCodeCombined(
        language,
        source_code,
        formattedTestCases,
        executionOptions,
        mode // Pass mode to the service
      );

      // Filter response based on mode to prevent leaking hidden test case data
      if (mode === "run") {
        // RUN mode: Show all details for visible test cases
        if (result.results && Array.isArray(result.results)) {
          result.results = result.results.map((r, index) => ({
            ...r,
            hidden: false,
            input: formattedTestCases[index]?.input || "",
          }));
        }
      } else {
        // SUBMIT mode: Only send summary and performance stats, hide all test case details
        const visibleResults = result.results?.filter((r, index) => !formattedTestCases[index]?.hidden) || [];
        
        // Only include visible test case details
        result.results = visibleResults.map((r, index) => {
          const originalIndex = result.results.findIndex((res, idx) => !formattedTestCases[idx]?.hidden && result.results.filter((_, i) => !formattedTestCases[i]?.hidden).indexOf(res) === index);
          return {
            ...r,
            hidden: false,
            input: "", // Don't show input in submit mode
          };
        });
        
        // Add flag to indicate there are hidden test cases
        result.hasHiddenTestCases = formattedTestCases.some(tc => tc.hidden);
      }

      // Log summary only (no test case details)
      if (result.summary) {
        console.log(
          `✅ Execution completed (${mode} mode): ${result.summary.passed}/${result.summary.total} passed`
        );
      } else {
        console.log(
          `✅ Code execution completed: ${result.success ? "Success" : "Failed"}`
        );
      }
      
      res.json(result);
    } catch (error) {
      console.error("❌ Execute-with-question endpoint error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;
