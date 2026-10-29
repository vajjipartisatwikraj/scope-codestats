/**
 * Submissions controller.
 *
 * Submitting an answer (graded on the server), and reading submissions.
 *
 * Wired to URLs in routes/cohorts/submission.routes.js, which also applies the login and
 * admin checks.
 */
const ActivityHeatmap = require("../../models/ActivityHeatmap");
const Cohort = require("../../models/Cohort");
const Question = require("../../models/Question");
const Submission = require("../../models/Submission");
const UserCohort = require("../../models/UserCohort");
const sqlQuestionService = require("../../services/sqlQuestionService");
const { blockedByExamWindow } = require("../../services/cohorts/examGateService");
const { codeJudge, sqlJudge } = require("../../services/judges");
const { refreshScopeCodestats } = require("../../services/profileSyncService");
const { respondSqlError } = require("./sqlHelpers");
const { toJudgeTestCases, limitsOf, toStudentResult } = require("../../services/cohorts/questionExecution");
const { updateCohortLeaderboard } = require("../../services/cohorts/leaderboardService");
const log = require("../../utils/logger").scope("COHORT-SUBMISSIONS");

// Submit answer to a question
// Auth required, NO rate limiter (validation already happened in frontend)
// This endpoint just saves the submission to database
const submitAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, moduleId, questionId } = req.params;
    const {
      code,
      language,
      selectedOption,
      testCaseResults,
      status,
      isCorrect,
      executionTime,
      memoryUsed,
      submissionType,
    } = req.body;

    log.debug(
      `Processing submission for question ${questionId}, user ${userId}, type: ${submissionType}`
    );

    // Check if user is admin or teacher
    const isAdminOrTeacher =
      req.user.userType === "admin" || req.user.userType === "teacher";

    // PARALLEL BATCH 1: Fetch cohort, question, userCohort, and enforce submission limit simultaneously
    const [cohort, question, enrollmentCheck] = await Promise.all([
      Cohort.findById(cohortId),
      Question.findOne({ _id: questionId, module: moduleId }),
      isAdminOrTeacher
        ? Promise.resolve(null)
        : UserCohort.findOne({ user: userId, cohort: cohortId }),
      Submission.enforceSubmissionLimit(userId, questionId),
    ]);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Block access to unpublished cohorts for regular users
    if (!isAdminOrTeacher && cohort.isDraft) {
      return res.status(403).json({
        message: "This cohort is not published yet",
        error: "COHORT_UNPUBLISHED",
      });
    }

    // Check if the user is eligible for this cohort
    if (!isAdminOrTeacher) {
      if (!enrollmentCheck) {
        log.debug(`User ${userId} is not enrolled in cohort ${cohortId}`);
        return res
          .status(403)
          .json({ message: "Not enrolled in this cohort" });
      }

      // AUTHORITATIVE EXAM CUT-OFF: a submission that arrives after this
      // student's own deadline is rejected and never scored, however long the
      // client page has been open. The enrollment is already loaded, so it is
      // handed straight to the gate.
      if (
        await blockedByExamWindow(res, cohort, {
          isPrivileged: false,
          enrollment: enrollmentCheck,
        })
      ) {
        return;
      }
    } else {
      log.debug(
        `Admin/Teacher ${userId} submitting to cohort ${cohortId} for testing`
      );
    }

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Create a submission based on question type
    let submission;
    let submissionIsCorrect = false;
    let programmingSummary = null; // authoritative pass/total for programming
    let programmingExecution = null; // the test results the browser shows (programming only)

    if (submissionType === "mcq") {
      log.debug("Processing MCQ submission");
      // Check the selected option
      if (!selectedOption) {
        return res.status(400).json({ message: "No option selected" });
      }

      // Find the selected option in the question
      const option = question.options.find(
        (opt) => opt._id.toString() === selectedOption
      );

      if (!option) {
        return res.status(400).json({ message: "Invalid option selected" });
      }

      const isOptionCorrect = option.isCorrect;
      submissionIsCorrect = isOptionCorrect;

      log.debug(
        `📝 MCQ submission - User: ${userId}, Question: ${questionId}, Result: ${
          isOptionCorrect ? "Correct" : "Wrong"
        }`
      );

      // Create submission record
      submission = new Submission({
        user: userId,
        question: questionId,
        module: moduleId,
        cohort: cohortId,
        submissionType: "mcq",
        selectedOption,
        isCorrect: isOptionCorrect,
        // Set proper status based on correctness instead of defaulting to pending
        status: isOptionCorrect ? "accepted" : "wrong_answer",
        score: isOptionCorrect ? question.marks : 0,
      });
    } else if (submissionType === "programming") {
      // Handle programming submission
      if (!code || !language) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["code", "language"],
        });
      }

      if (!question.testCases || question.testCases.length === 0) {
        return res
          .status(400)
          .json({ message: "Question has no test cases" });
      }

      // ─────────────────────────────────────────────────────────────────
      // AUTHORITATIVE GRADING (SECURITY-CRITICAL)
      // Never trust client-sent `isCorrect` / `status` / `testCaseResults`.
      // Re-execute the submitted code against ALL test cases (including
      // hidden ones) on the server and decide correctness here. This is the
      // single source of truth for whether a problem is solved and scored.
      // ─────────────────────────────────────────────────────────────────
      //
      // This is the only run of the code. The same result also feeds the response
      // (see `execution` below), so the browser needs no run of its own.
      const formattedTestCases = toJudgeTestCases(question.testCases);

      const execResult = await codeJudge.submitCombined(
        language,
        code,
        formattedTestCases,
        limitsOf(question),
        "submit"
      );

      // What the student's browser may see: visible test cases only, no hidden inputs.
      // `execResult` itself stays untouched, grading below reads the full result.
      programmingExecution = toStudentResult(execResult, formattedTestCases, "submit");

      const totalCases = execResult?.summary?.total || 0;
      const passedCases = execResult?.summary?.passed || 0;
      // Correct ONLY if execution succeeded and EVERY test case passed.
      const serverIsCorrect =
        execResult?.success === true &&
        totalCases > 0 &&
        passedCases === totalCases;

      const serverExecutionTime = execResult?.execution?.time
        ? Math.round(parseFloat(execResult.execution.time) * 1000)
        : 0;
      const serverMemoryUsed = execResult?.execution?.memory || 0;

      // Derive a valid status enum value from the execution outcome.
      let serverStatus = "wrong_answer";
      if (!execResult?.success) {
        const errText = (execResult?.error || "").toLowerCase();
        if (errText.includes("compilation")) {
          serverStatus = "compilation_error";
        } else if (errText.includes("time limit")) {
          serverStatus = "time_limit_exceeded";
        } else if (errText.includes("memory")) {
          serverStatus = "memory_limit_exceeded";
        } else {
          serverStatus = "runtime_error";
        }
      } else {
        serverStatus = serverIsCorrect ? "accepted" : "wrong_answer";
      }

      // Store per-test-case results (server truth). Do not leak hidden
      // inputs/expected outputs into stored student-visible fields.
      const storedResults = Array.isArray(execResult?.results)
        ? execResult.results.map((r) => ({
            passed: r.status === "passed",
            executionTime: serverExecutionTime,
            memoryUsed: serverMemoryUsed,
            output: "",
            error: r.status === "passed" ? "" : "Test case failed",
          }))
        : [];

      log.debug(
        `📝 Programming submission (server-graded) - User: ${userId}, Question: ${questionId}, Language: ${language}, ${passedCases}/${totalCases} passed → ${
          serverIsCorrect ? "Accepted" : serverStatus
        }`
      );

      // ✅ SCORING TIERS: only award points when the server confirms correct.
      let pointsEarned = 0;
      let tierAchieved = -1;

      if (serverIsCorrect) {
        if (serverExecutionTime > 0) {
          try {
            const scoringResult = question.calculatePoints(
              language,
              serverExecutionTime
            );
            pointsEarned = scoringResult.points;
            tierAchieved = scoringResult.tierIndex;

            log.debug(
              `🏆 Scoring Tiers - Execution: ${serverExecutionTime}ms, Points: ${pointsEarned}, Tier: ${
                tierAchieved >= 0 ? tierAchieved + 1 : "Minimum"
              }`
            );
          } catch (error) {
            log.warn(
              `⚠️ Error calculating tier-based points: ${error.message}, using default full marks`
            );
            pointsEarned = question.marks;
            tierAchieved = -1;
          }
        } else {
          pointsEarned = question.marks;
          tierAchieved = -1;
        }
      }

      // Expose authoritative summary in the response for the frontend.
      programmingSummary = {
        total: totalCases,
        passed: passedCases,
        failed: totalCases - passedCases,
      };

      // Create submission with SERVER-COMPUTED results (client values ignored)
      submission = new Submission({
        user: userId,
        question: questionId,
        module: moduleId,
        cohort: cohortId,
        submissionType: "programming",
        code,
        language,
        status: serverStatus,
        testCaseResults: storedResults,
        executionTime: serverExecutionTime,
        memoryUsed: serverMemoryUsed,
        isCorrect: serverIsCorrect,
        score: pointsEarned,
        pointsEarned: pointsEarned,
        tierAchieved: tierAchieved,
      });

      submissionIsCorrect = serverIsCorrect;
    } else if (submissionType === "sql") {
      // ─────────────────────────────────────────────────────────────────
      // AUTHORITATIVE SQL GRADING (SECURITY-CRITICAL)
      // The verdict comes from the SQLJudge engine, which runs every
      // testcase (visible + hidden) against its own S3-stored expected
      // output. Client-reported correctness and score are ignored.
      //
      // On submit the engine returns an aggregate only (status, passed,
      // total) so hidden testcase data cannot leak, which is why no
      // per-testcase rows are stored for a submission.
      // ─────────────────────────────────────────────────────────────────
      if (!code || typeof code !== "string" || code.trim() === "") {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["code"],
        });
      }

      if (question.type !== "sql" || !question.sqlMeta?.judgeQuestionId) {
        return res
          .status(400)
          .json({ message: "This question is not a published SQL question" });
      }

      let verdict;
      try {
        verdict = await sqlJudge.submit({
          questionId: question.sqlMeta.judgeQuestionId,
          version: question.sqlMeta.judgeVersion || 1,
          sql: code,
        });
      } catch (engineError) {
        return respondSqlError(
          res,
          engineError,
          "Failed to grade the SQL submission"
        );
      }

      const graded = sqlQuestionService.gradeSubmitVerdict(verdict, question);

      log.debug(
        `📝 SQL submission (server-graded) - User: ${userId}, Question: ${questionId}, ` +
          `${graded.passed}/${graded.total} passed → ${
            graded.isCorrect ? "Accepted" : graded.status
          }`
      );

      programmingSummary = {
        total: graded.total,
        passed: graded.passed,
        failed: Math.max(graded.total - graded.passed, 0),
      };

      submission = new Submission({
        user: userId,
        question: questionId,
        module: moduleId,
        cohort: cohortId,
        submissionType: "sql",
        code,
        language: "sql",
        status: graded.status,
        // Per-testcase detail is intentionally withheld by the engine on
        // submit, so only the aggregate is recorded.
        testCaseResults: [],
        executionTime: graded.executionTimeMs,
        memoryUsed: 0,
        isCorrect: graded.isCorrect,
        score: graded.score,
        pointsEarned: graded.score,
        tierAchieved: -1,
        sqlResult: {
          judgeQuestionId: question.sqlMeta.judgeQuestionId,
          judgeVersion: question.sqlMeta.judgeVersion || 1,
          judgeSubmissionId: verdict?.submissionId || null,
          judgeStatus: graded.judgeStatus,
          testCasesPassed: graded.passed,
          testCasesTotal: graded.total,
          failedAt: graded.failedAt,
          errorMessage: graded.errorMessage,
        },
      });

      submissionIsCorrect = graded.isCorrect;
    } else {
      return res.status(400).json({ message: "Invalid submission type" });
    }

    // PARALLEL BATCH 2: Save submission + update question stats simultaneously
    await Promise.all([
      submission.save(),
      Question.updateOne(
        { _id: questionId },
        {
          $inc: {
            "stats.totalSubmissions": 1,
            "stats.acceptedSubmissions": submissionIsCorrect ? 1 : 0,
          },
        }
      ),
    ]);

    // Update user progress (skip for admins/teachers as they don't have UserCohort entries)
    if (!isAdminOrTeacher) {
      // Reuse enrollmentCheck from PARALLEL BATCH 1 instead of querying again
      const userCohort = enrollmentCheck;

      if (userCohort) {
        // Tracks whether THIS submission solved the problem for the first
        // time — used to increment the activity heatmap exactly once per
        // problem (re-solving an already-solved problem does not re-count).
        let newlySolvedProblem = false;

        const questionProgressIndex = userCohort.questionProgress.findIndex(
          (qp) => qp.question.toString() === questionId
        );

        if (questionProgressIndex !== -1) {
          const qp = userCohort.questionProgress[questionProgressIndex];
          qp.attempts += 1;

          // ✅ MAX SCORE OVERRIDE: Only update best score if new score is higher
          if (submissionIsCorrect) {
            const wasSolvedBefore = qp.solved === true;
            if (!wasSolvedBefore) newlySolvedProblem = true;
            qp.solved = true;

            // CRITICAL: Use max score logic - only update if new score is better
            if (submission.score > qp.bestScore) {
              log.debug(
                `📈 Score improved! Previous: ${qp.bestScore}, New: ${submission.score}`
              );
              qp.bestScore = submission.score;
              qp.solvedAt = new Date();
            } else {
              log.debug(
                `📊 Score not improved. Best: ${qp.bestScore}, Current: ${submission.score}`
              );
            }
          } else {
            // Wrong answer - don't update score
            log.debug(
              `❌ Wrong answer - best score remains: ${qp.bestScore}`
            );
          }
        } else {
          // Add new question progress entry
          if (submissionIsCorrect) newlySolvedProblem = true;
          userCohort.questionProgress.push({
            question: questionId,
            attempts: 1,
            solved: submissionIsCorrect,
            bestScore: submissionIsCorrect ? submission.score : 0,
            solvedAt: submissionIsCorrect ? new Date() : null,
          });
        }

        // Update module progress
        const moduleProgressIndex = userCohort.moduleProgress.findIndex(
          (mp) => mp.module.toString() === moduleId
        );

        if (moduleProgressIndex !== -1) {
          const mp = userCohort.moduleProgress[moduleProgressIndex];

          // Calculate how many questions are solved in this module
          const moduleQuestions = await Question.find({ module: moduleId });
          const solvedQuestionIds = userCohort.questionProgress
            .filter((qp) => qp.solved)
            .map((qp) => qp.question.toString());

          const solvedModuleQuestions = moduleQuestions.filter((q) =>
            solvedQuestionIds.includes(q._id.toString())
          );

          // Update module progress
          mp.questionsCompleted = solvedModuleQuestions.length;
          mp.totalQuestions = moduleQuestions.length;

          // Calculate total score from all solved questions in this module
          mp.score = userCohort.questionProgress
            .filter(
              (qp) =>
                moduleQuestions.some(
                  (q) => q._id.toString() === qp.question.toString()
                ) && qp.solved
            )
            .reduce((sum, qp) => sum + qp.bestScore, 0);

          // Check if module is completed
          mp.completed =
            mp.questionsCompleted === mp.totalQuestions &&
            mp.totalQuestions > 0;
          if (mp.completed && !mp.completedAt) {
            mp.completedAt = new Date();
          }
        } else {
          // Add new module progress entry
          const moduleQuestions = await Question.find({ module: moduleId });
          const isModuleCompleted =
            moduleQuestions.length === 1 && submissionIsCorrect;

          userCohort.moduleProgress.push({
            module: moduleId,
            questionsCompleted: submissionIsCorrect ? 1 : 0,
            totalQuestions: moduleQuestions.length,
            score: submissionIsCorrect ? submission.score : 0,
            completed: isModuleCompleted,
            completedAt: isModuleCompleted ? new Date() : null,
          });
        }

        // Calculate total score across all modules
        userCohort.totalScore = userCohort.questionProgress
          .filter((qp) => qp.solved)
          .reduce((sum, qp) => sum + qp.bestScore, 0);

        // IMPORTANT: Save userCohort NOW so the DB has the updated totalScore
        // before we query allActiveUserCohorts below (otherwise the query reads stale data)
        await userCohort.save();

        // Refresh the Scope-CodeStats profile (cohort score, problems solved and the
        // never-decreasing lifetime values). The leaderboard reads it from Profile,
        // so a failure here must not fail the submission.
        await refreshScopeCodestats(userId).catch((err) =>
          log.error(
            `Failed to refresh scopecodestats profile for user ${userId}:`,
            err.message
          )
        );
        // Check if the entire cohort is completed
        // Reuse cohort from PARALLEL BATCH 1 instead of querying DB again
        const cohortModules = cohort.modules || [];
        const completedModules = userCohort.moduleProgress.filter(
          (mp) => mp.completed
        );

        if (
          completedModules.length === cohortModules.length &&
          cohortModules.length > 0
        ) {
          userCohort.status = "completed";
          userCohort.completedAt = new Date();
        }

        await userCohort.save();

        // Fire-and-forget: Update cohort leaderboard rankings in background
        // User doesn't need to wait for all ranks to recalculate
        updateCohortLeaderboard(cohortId).catch((err) =>
          log.error("Background leaderboard update failed:", err)
        );

        // Fire-and-forget: record activity heatmap increment when a problem
        // is solved for the first time (Trigger 1 — in-app submissions).
        if (newlySolvedProblem) {
          ActivityHeatmap.incrementActivity(userId, "cohort", 1).catch((err) =>
            log.error("Heatmap increment (cohort) failed:", err.message)
          );
        }

        log.debug(
          `✅ Submission saved - User: ${userId}, Question: ${questionId}, Score: ${submission.score}`
        );

        // Return the submission result with detailed progress information
        res.json({
          submission,
          isCorrect: submissionIsCorrect,
          summary: programmingSummary,
          ...(programmingExecution && { execution: programmingExecution }),
          userProgress: {
            questionProgress: userCohort.questionProgress.find(
              (qp) => qp.question.toString() === questionId
            ),
            moduleProgress: userCohort.moduleProgress.find(
              (mp) => mp.module.toString() === moduleId
            ),
            totalScore: userCohort.totalScore,
            rank: userCohort.rank,
          },
        });
      } else {
        log.debug(
          `✅ Submission saved - User: ${userId}, Question: ${questionId}, Score: ${submission.score}`
        );
        // Not reachable today (a student without an enrollment is refused earlier), but a
        // request must never be left without an answer.
        res.json({
          submission,
          isCorrect: submissionIsCorrect,
          summary: programmingSummary,
          ...(programmingExecution && { execution: programmingExecution }),
        });
      }
    } else {
      // Admin/Teacher response - no progress tracking
      log.debug(
        `✅ Admin/Teacher submission saved - User: ${userId}, Question: ${questionId}, Score: ${submission.score}`
      );
      res.json({
        submission,
        isCorrect: submissionIsCorrect,
        summary: programmingSummary,
        ...(programmingExecution && { execution: programmingExecution }),
        message: "Submission saved (admin/teacher - no progress tracking)",
      });
    }
  } catch (err) {
    log.error("Error submitting answer:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all users' submissions for a question
// SECURITY: Only show if user has submitted their own solution
const getAllSubmissions = async (req, res) => {
  try {
    const { cohortId, moduleId, questionId } = req.params;
    const userId = req.user.id;

    log.debug(
      `📊 Fetching all submissions for question ${questionId} in cohort ${cohortId}`
    );

    // Check if user is admin or teacher
    const isAdminOrTeacher =
      req.user.userType === "admin" || req.user.userType === "teacher";

    // SECURITY: Regular users must have submitted before viewing others' submissions
    if (!isAdminOrTeacher) {
      // Check if user has an ACCEPTED (correct) submission for this question
      const userSubmission = await Submission.findOne({
        user: userId,
        question: questionId,
        cohort: cohortId,
        status: "accepted", // CRITICAL: Must be accepted, not just any submission
      }).select("_id");

      if (!userSubmission) {
        return res.status(403).json({
          message:
            "You must submit a correct solution before viewing others' submissions.",
          error: "NO_ACCEPTED_SUBMISSION",
        });
      }

      // Verify user is enrolled in this cohort
      const userCohort = await UserCohort.findOne({
        user: userId,
        cohort: cohortId,
      });

      if (!userCohort) {
        log.debug(`❌ User ${userId} not enrolled in cohort ${cohortId}`);
        return res
          .status(403)
          .json({ message: "Not enrolled in this cohort" });
      }
    }

    // Get all submissions for this question in this cohort
    // Limit to last 100 submissions to prevent performance issues
    const submissions = await Submission.find({
      question: questionId,
      cohort: cohortId,
    })
      .select("status score language submittedAt user testCaseResults executionTime memoryUsed code submissionType selectedOption") // Include all necessary fields
      .populate("user", "name username avatar rollNumber email") // Include minimal user details
      .sort({ submittedAt: -1 })
      .limit(100) // Limit to prevent massive data transfer
      .lean(); // Return plain objects for better performance

    log.debug(
      `✅ Found ${submissions.length} submissions for question ${questionId}`
    );
    res.json(submissions);
  } catch (err) {
    log.error("❌ Error fetching all submissions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get user's submission history for a question (loaded on-demand when user clicks Submissions tab)
const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, questionId } = req.params;

    const submissions = await Submission.find({
      user: userId,
      question: questionId,
      cohort: cohortId,
    })
      .select("status score language submittedAt code testCaseResults executionTime memoryUsed createdAt submissionType selectedOption isCorrect")
      .sort({ submittedAt: -1 })
      .limit(20) // Get last 20 submissions
      .lean();

    res.json(submissions);
  } catch (err) {
    log.error("Error fetching submissions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  submitAnswer,
  getAllSubmissions,
  getMySubmissions,
};
