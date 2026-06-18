const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const PAQuestion = require("../models/PAQuestion");
const PATest = require("../models/PATest");
const PASubmission = require("../models/PASubmission");
const QuestionBank = require("../models/QuestionBank");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const {
  checkDailyTestLimit,
  incrementDailyTestCount,
  getRemainingTests,
} = require("../middleware/practiceArenaLimiter");

// ==== ADMIN ROUTES ====

// Get all practice arena questions (admin only) - with pagination, filters, and search
router.get("/questions", auth, adminAuth, async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 0; // 0-indexed
    const limit = parseInt(req.query.limit) || 10;
    const skip = page * limit;

    // Extract filter parameters
    const {
      difficulty,
      type,
      questionBank,
      tag,
      search,
      sortBy,
      sortDirection,
    } = req.query;

    // Build query
    const query = {};

    if (difficulty) {
      query.difficultyLevel = difficulty;
    }

    if (type) {
      query.type = type;
    }

    if (questionBank) {
      query.questionBank = questionBank;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { tags: searchRegex },
        { questionBank: searchRegex },
      ];
    }

    // Build sort
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortDirection === "desc" ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    // Get total count for pagination
    const totalCount = await PAQuestion.countDocuments(query);

    // Fetch paginated questions with only necessary fields for table display
    const questions = await PAQuestion.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(
        "title questionBank tags type difficultyLevel marks createdBy createdAt updatedAt encryptedEditor"
      )
      .populate("createdBy", "name email")
      .lean();

    res.status(200).json({
      questions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching practice arena questions:", error);
    res
      .status(500)
      .json({ message: "Error fetching questions", error: error.message });
  }
});

// Search for questions (admin only) - IMPORTANT: This route must come before the /questions/:id route
router.get("/questions/search", auth, adminAuth, async (req, res) => {
  try {
    const searchQuery = req.query.q;

    if (!searchQuery) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Create a regex search query that's case-insensitive
    const searchRegex = new RegExp(searchQuery, "i");

    // Search in title, tags, and questionBank only - not description
    const questions = await PAQuestion.find({
      $or: [
        { title: searchRegex },
        { tags: searchRegex },
        { questionBank: searchRegex },
      ],
    })
      .select("title questionBank tags type difficultyLevel marks createdBy")
      .sort({ updatedAt: -1 })
      .limit(20) // Limit results to prevent performance issues
      .populate("createdBy", "name email")
      .lean();

    res.status(200).json(questions);
  } catch (error) {
    console.error("Error searching practice arena questions:", error);
    res
      .status(500)
      .json({ message: "Error searching questions", error: error.message });
  }
});

// Get a specific practice arena question by ID (admin only)
router.get("/questions/:id", auth, adminAuth, async (req, res) => {
  try {
    const question = await PAQuestion.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json(question);
  } catch (error) {
    console.error(
      `Error fetching practice arena question ${req.params.id}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error fetching question", error: error.message });
  }
});

// Create a new practice arena question (admin only)
router.post("/questions", auth, adminAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      difficultyLevel,
      marks,
      questionBank,
      options,
      languages,
      defaultLanguage,
      testCases,
      examples,
      constraints,
      hints,
      tags,
      companies,
      editorial,
      fillInTheBlank,
      encryptionSettings,
    } = req.body;

    // Check if a question bank with this name already exists
    let existingBank = await QuestionBank.findOne({
      name: { $regex: new RegExp(`^${questionBank.trim()}$`, "i") },
    });

    // If bank doesn't exist, create it
    if (!existingBank) {
      const newBank = new QuestionBank({
        name: questionBank.trim(),
        isVisible: true, // Default to visible
        createdBy: req.user.id,
      });
      await newBank.save();
    }

    // Create a new question
    const question = new PAQuestion({
      title,
      description,
      type,
      difficultyLevel,
      marks,
      questionBank: questionBank.trim(),
      createdBy: req.user.id,
    });

    // Add type-specific fields
    if (type === "mcq" && options) {
      question.options = options;
    } else if (type === "programming") {
      if (languages) question.languages = languages;
      if (defaultLanguage) question.defaultLanguage = defaultLanguage;
      if (testCases) question.testCases = testCases;
      if (examples) question.examples = examples;
      if (constraints) question.constraints = constraints;

      // Add Fill in the Blank and encryption settings
      if (fillInTheBlank !== undefined)
        question.fillInTheBlank = fillInTheBlank;
      if (encryptionSettings) question.encryptionSettings = encryptionSettings;
    }

    // Add additional fields
    if (hints) question.hints = hints;
    if (tags) question.tags = tags;
    if (companies) question.companies = companies;
    if (editorial) question.editorial = editorial;

    await question.save();

    res.status(201).json({
      message: "Practice arena question created successfully",
      question,
    });
  } catch (error) {
    console.error("Error creating practice arena question:", error);
    res
      .status(500)
      .json({ message: "Error creating question", error: error.message });
  }
});

// Update a practice arena question (admin only)
router.put("/questions/:id", auth, adminAuth, async (req, res) => {
  try {
    const questionId = req.params.id;
    const updates = req.body;

    // Find the question first
    const question = await PAQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Update all provided fields
    for (const [key, value] of Object.entries(updates)) {
      if (key !== "_id" && key !== "createdBy" && key !== "createdAt") {
        question[key] = value;
      }
    }

    await question.save();

    res.status(200).json({
      message: "Practice arena question updated successfully",
      question,
    });
  } catch (error) {
    console.error(
      `❌ Error updating practice arena question ${req.params.id}:`,
      error
    );
    console.error("Full error stack:", error.stack);
    console.error("Validation errors:", error.errors);
    res.status(500).json({
      message: "Error updating question",
      error: error.message,
      validationErrors: error.errors,
    });
  }
});

// Delete a practice arena question (admin only)
router.delete("/questions/:id", auth, adminAuth, async (req, res) => {
  try {
    const questionId = req.params.id;

    const result = await PAQuestion.findByIdAndDelete(questionId);

    if (!result) {
      return res.status(404).json({ message: "Question not found" });
    }

    res
      .status(200)
      .json({ message: "Practice arena question deleted successfully" });
  } catch (error) {
    console.error(
      `Error deleting practice arena question ${req.params.id}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error deleting question", error: error.message });
  }
});

// ==== USER ROUTES ====

// Get available subjects (unique question banks)
router.get("/subjects", auth, async (req, res) => {
  try {
    // Get only visible question banks
    const visibleBanks = await QuestionBank.find({ isVisible: true }).select(
      "name"
    );
    const subjects = visibleBanks.map((bank) => bank.name);
    res.status(200).json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res
      .status(500)
      .json({ message: "Error fetching subjects", error: error.message });
  }
});

// Get available topics (unique tags)
router.get("/topics", auth, async (req, res) => {
  try {
    const topics = await PAQuestion.distinct("tags");
    res.status(200).json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    res
      .status(500)
      .json({ message: "Error fetching topics", error: error.message });
  }
});

// Admin endpoint: Get all question banks (including hidden ones)
router.get("/question-banks", auth, adminAuth, async (req, res) => {
  try {
    const banks = await QuestionBank.find().sort({ createdAt: -1 });

    // Get question count for each bank
    const banksWithCount = await Promise.all(
      banks.map(async (bank) => {
        const count = await PAQuestion.countDocuments({
          questionBank: bank.name,
        });
        return {
          _id: bank._id,
          name: bank.name,
          description: bank.description,
          isVisible: bank.isVisible,
          questionCount: count,
          createdAt: bank.createdAt,
          updatedAt: bank.updatedAt,
        };
      })
    );

    res.status(200).json(banksWithCount);
  } catch (error) {
    console.error("Error fetching question banks:", error);
    res
      .status(500)
      .json({ message: "Error fetching question banks", error: error.message });
  }
});

// Admin endpoint: Toggle question bank visibility
router.patch(
  "/question-banks/:id/visibility",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;

      const bank = await QuestionBank.findByIdAndUpdate(
        id,
        { isVisible },
        { new: true }
      );

      if (!bank) {
        return res.status(404).json({ message: "Question bank not found" });
      }

      res.status(200).json({
        message: `Question bank "${bank.name}" is now ${
          isVisible ? "visible" : "hidden"
        }`,
        bank,
      });
    } catch (error) {
      console.error("Error updating question bank visibility:", error);
      res.status(500).json({
        message: "Error updating question bank visibility",
        error: error.message,
      });
    }
  }
);

// Get daily test limit status
router.get("/daily-limit", auth, async (req, res) => {
  try {
    const limitInfo = await getRemainingTests(req.user.id);
    res.status(200).json(limitInfo);
  } catch (error) {
    console.error("Error fetching daily limit:", error);
    res
      .status(500)
      .json({ message: "Error fetching daily limit", error: error.message });
  }
});

// Create a new practice test
router.post("/tests", auth, async (req, res) => {
  try {
    const { subject, topics, difficulty, questionTypes, timeLimit, title } =
      req.body;

    // Validate required fields
    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }

    if (
      !questionTypes ||
      (!questionTypes.mcq?.count && !questionTypes.programming?.count)
    ) {
      return res
        .status(400)
        .json({ message: "At least one question type count must be provided" });
    }

    // Calculate how many questions we need
    const mcqCount = questionTypes.mcq?.count || 0;
    const programmingCount = questionTypes.programming?.count || 0;

    // Build query to find eligible questions
    const baseQuery = {
      questionBank: subject,
    };

    // Add difficulty if specified
    if (difficulty && difficulty !== "mixed") {
      baseQuery.difficultyLevel = difficulty;
    }

    // Add topics if specified
    if (topics && topics.length > 0) {
      baseQuery.tags = { $in: topics };
    }

    // Fetch MCQ questions if needed
    let mcqQuestions = [];
    if (mcqCount > 0) {
      mcqQuestions = await PAQuestion.aggregate([
        { $match: { ...baseQuery, type: "mcq" } },
        { $sample: { size: mcqCount } },
      ]);
    }

    // Fetch programming questions if needed
    let programmingQuestions = [];
    if (programmingCount > 0) {
      programmingQuestions = await PAQuestion.aggregate([
        { $match: { ...baseQuery, type: "programming" } },
        { $sample: { size: programmingCount } },
      ]);
    }

    // Combine all selected questions
    const selectedQuestions = [...mcqQuestions, ...programmingQuestions];

    // If we couldn't find enough questions, return an error
    if (selectedQuestions.length < mcqCount + programmingCount) {
      return res.status(400).json({
        message: "Not enough questions available with the selected criteria",
        available: selectedQuestions.length,
        requested: mcqCount + programmingCount,
      });
    }

    // Calculate max possible score
    const maxPossibleScore = selectedQuestions.reduce(
      (total, q) => total + q.marks,
      0
    );

    // Create a new test
    const test = new PATest({
      user: req.user.id,
      title: title || "Practice Test",
      parameters: {
        subject,
        topics: topics || [],
        difficulty: difficulty || "mixed",
        questionTypes: {
          mcq: { count: mcqCount },
          programming: { count: programmingCount },
        },
        timeLimit: timeLimit || 60, // default 60 minutes
      },
      questions: selectedQuestions.map((q) => q._id),
      maxPossibleScore,
      status: "created",
    });

    await test.save();

    // Implement rolling window: Keep only the 5 most recent tests per user
    // Delete older tests if user has more than 5
    const userTests = await PATest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("_id createdAt");

    if (userTests.length > 5) {
      // Keep the 5 most recent, delete the rest
      const testsToDelete = userTests.slice(5).map((t) => t._id);

      // Delete the old tests and their associated submissions
      await PATest.deleteMany({ _id: { $in: testsToDelete } });
      await PASubmission.deleteMany({ test: { $in: testsToDelete } });
    }

    res.status(201).json({
      message: "Practice test created successfully",
      test: {
        _id: test._id,
        title: test.title,
        parameters: test.parameters,
        questionCount: selectedQuestions.length,
        status: test.status,
        maxPossibleScore,
      },
    });
  } catch (error) {
    console.error("Error creating practice test:", error);
    res
      .status(500)
      .json({ message: "Error creating test", error: error.message });
  }
});

// Start a practice test - with daily limit check
router.put("/tests/:id/start", auth, checkDailyTestLimit, async (req, res) => {
  try {
    const testId = req.params.id;

    // Find the test and verify ownership
    const test = await PATest.findOne({ _id: testId, user: req.user.id });

    if (!test) {
      return res
        .status(404)
        .json({ message: "Test not found or unauthorized" });
    }

    if (test.status !== "created") {
      return res.status(400).json({
        message: `Cannot start test in ${test.status} status. Only 'created' tests can be started.`,
      });
    }

    // Update test status and start time
    test.status = "started";
    test.startTime = new Date();
    test.serverStartTime = test.startTime; // Server-authoritative start time

    await test.save();

    // Start timer service for this test
    const paTimerService = req.app.locals.paTimerService;
    if (paTimerService) {
      await paTimerService.startTimer(test._id, req.user.id);
    }

    // Increment the daily test counter
    const limitInfo = await incrementDailyTestCount(req.user.id);

    // Populate the questions
    await test.populate("questions");

    // Remove solution code and hidden test cases from response for security
    const sanitizedQuestions = test.questions.map((q) => {
      const sanitized = q.toObject();

      // Remove solutions for programming questions
      if (sanitized.type === "programming" && sanitized.languages) {
        sanitized.languages = sanitized.languages.map((lang) => {
          return {
            ...lang,
            solutionCode: undefined,
          };
        });
      }

      return sanitized;
    });

    // Get current server time for synchronization
    const serverCurrentTime = new Date();
    const timeRemainingSeconds = test.parameters.timeLimit * 60; // Full time since just started

    res.status(200).json({
      message: "Practice test started successfully",
      test: {
        _id: test._id,
        title: test.title,
        parameters: test.parameters,
        questions: sanitizedQuestions,
        status: test.status,
        startTime: test.startTime,
        serverStartTime: test.serverStartTime,
        serverCurrentTime: serverCurrentTime,
        timeRemainingSeconds: timeRemainingSeconds,
        maxPossibleScore: test.maxPossibleScore,
      },
      timerSync: {
        serverStartTime: test.serverStartTime.toISOString(),
        serverCurrentTime: serverCurrentTime.toISOString(),
        timeRemainingSeconds: timeRemainingSeconds,
        timeLimitMinutes: test.parameters.timeLimit,
      },
      dailyLimit: {
        testsStartedToday: limitInfo.testsStartedToday,
        remainingTests: limitInfo.remainingTests,
      },
    });
  } catch (error) {
    console.error("Error starting practice test:", error);
    res
      .status(500)
      .json({ message: "Error starting test", error: error.message });
  }
});

// Submit answer for a test question
// Auth required, NO rate limiter (validation already happened in frontend)
// This endpoint just saves the submission to database
router.post("/tests/:id/submit", auth, async (req, res) => {
  try {
    const testId = req.params.id;
    const {
      questionId,
      submissionType,
      selectedOption,
      code,
      language,
      testCaseResults,
      executionTime,
      memoryUsed,
    } = req.body;

    // Find the test and verify ownership
    const test = await PATest.findOne({ _id: testId, user: req.user.id });

    if (!test) {
      return res
        .status(404)
        .json({ message: "Test not found or unauthorized" });
    }

    if (test.status !== "started") {
      return res.status(400).json({
        message: `Cannot submit answers for test in ${test.status} status. Only 'started' tests accept submissions.`,
      });
    }

    // Verify the question belongs to this test
    if (!test.questions.some((q) => q.toString() === questionId)) {
      return res
        .status(400)
        .json({ message: "Question is not part of this test" });
    }

    // Get the question details
    const question = await PAQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Calculate submission details based on question type
    let isCorrect = false;
    let score = 0;
    let status = "pending";
    let testCasesPassed = 0;
    const timeTaken = Math.floor((new Date() - test.startTime) / 1000); // in seconds

    if (submissionType === "mcq") {
      // Verify the selected option is valid
      const selectedOptionObj = question.options.find(
        (opt) => opt._id.toString() === selectedOption
      );

      if (!selectedOptionObj) {
        return res.status(400).json({ message: "Invalid option selected" });
      }

      isCorrect = selectedOptionObj.isCorrect;
      status = isCorrect ? "accepted" : "wrong_answer";
      score = isCorrect ? question.marks : 0;
    } else if (submissionType === "programming") {
      // For programming submissions, calculate correctness based on test case results
      if (!testCaseResults || !Array.isArray(testCaseResults)) {
        return res.status(400).json({
          message: "Test case results are required for programming submissions",
        });
      }

      // Calculate if all test cases passed
      testCasesPassed = testCaseResults.filter(
        (result) => result.passed
      ).length;
      const totalTestCases = testCaseResults.length;
      isCorrect = testCasesPassed === totalTestCases && totalTestCases > 0;
      status = isCorrect ? "accepted" : "wrong_answer";

      // ✅ SCORING TIERS: Calculate points based on execution time if all tests passed
      if (isCorrect && executionTime && executionTime > 0 && language) {
        try {
          // Use Question model's calculatePoints method to get tier-based scoring
          const scoringResult = question.calculatePoints(
            language,
            executionTime
          );
          score = scoringResult.points;

        } catch (error) {
          // Fallback to full marks if scoring tiers not configured or error
          score = question.marks;
        }
      } else if (!isCorrect) {
        // For failed submissions, give 0 points (no partial credit for Practice Arena)
        score = 0;
      } else {
        // If no execution time provided, use full marks as fallback
        score = isCorrect ? question.marks : 0;
      }
    }

    // ✅ SCORING TIERS: Calculate tier-based points and get tier index
    let pointsEarned = score;
    let tierAchieved = -1;

    if (
      submissionType === "programming" &&
      isCorrect &&
      executionTime &&
      executionTime > 0 &&
      language
    ) {
      try {
        const scoringResult = question.calculatePoints(language, executionTime);
        pointsEarned = scoringResult.points;
        tierAchieved = scoringResult.tierIndex;
      } catch (error) {
        // Already handled above, just use the score variable
        pointsEarned = score;
        tierAchieved = -1;
      }
    }

    // Find existing submission or create new one
    let submission = await PASubmission.findOne({
      test: testId,
      question: questionId,
      user: req.user.id,
    });

    if (submission) {
      // ✅ MAX SCORE OVERRIDE: Update existing submission only if new score is better
      submission.submissionType = submissionType;

      if (submissionType === "mcq") {
        submission.selectedOption = selectedOption;
        submission.isCorrect = isCorrect;
        submission.status = status;
        submission.score = score; // MCQ always overwrites
        submission.pointsEarned = score;
      } else if (submissionType === "programming") {
        submission.code = code;
        submission.language = language;
        submission.testCaseResults = testCaseResults;
        submission.testCasesPassed = testCasesPassed;
        submission.totalTestCases = testCaseResults.length;
        submission.isCorrect = isCorrect;
        submission.status = status;

        // CRITICAL: Only update score if new score is higher (MAX override)
        if (pointsEarned > submission.score) {
          submission.score = pointsEarned;
          submission.pointsEarned = pointsEarned;
          submission.tierAchieved = tierAchieved;
        } else {
          // Keep existing score, but update other fields
        }
      }

      submission.timeTaken = timeTaken;
      submission.submittedAt = new Date();
    } else {
      // Create new submission
      submission = new PASubmission({
        user: req.user.id,
        test: testId,
        question: questionId,
        submissionType,
        selectedOption: submissionType === "mcq" ? selectedOption : undefined,
        code: submissionType === "programming" ? code : undefined,
        language: submissionType === "programming" ? language : undefined,
        testCaseResults:
          submissionType === "programming" ? testCaseResults : undefined,
        testCasesPassed: testCasesPassed,
        totalTestCases:
          submissionType === "programming" ? testCaseResults.length : 0,
        isCorrect,
        status,
        score: pointsEarned,
        pointsEarned: pointsEarned,
        tierAchieved: tierAchieved,
        timeTaken,
        submittedAt: new Date(),
      });
    }

    await submission.save();

    // Update stats for the question (use updateOne to avoid triggering validation on entire document)
    await PAQuestion.updateOne(
      { _id: questionId },
      {
        $inc: {
          "stats.totalSubmissions": 1,
          "stats.acceptedSubmissions": isCorrect ? 1 : 0,
        },
      }
    );

    res.status(200).json({
      message: "Submission recorded successfully",
      submission: {
        ...submission.toObject(),
        question: questionId, // To maintain previous API response format
      },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res
      .status(500)
      .json({ message: "Error submitting answer", error: error.message });
  }
});

// End a test (manually or due to time expiration)
router.put("/tests/:id/end", auth, async (req, res) => {
  try {
    const testId = req.params.id;

    // Find the test and verify ownership
    const test = await PATest.findOne({ _id: testId, user: req.user.id });

    if (!test) {
      return res
        .status(404)
        .json({ message: "Test not found or unauthorized" });
    }

    if (test.status !== "started") {
      return res.status(400).json({
        message: `Cannot end test in ${test.status} status. Only 'started' tests can be ended.`,
      });
    }

    // Get all submissions for this test
    const submissions = await PASubmission.find({
      test: testId,
      user: req.user.id,
    });

    // Calculate total score
    const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);

    // Mark test as completed
    test.status = "completed";
    test.endTime = new Date();
    test.totalTimeTaken = Math.floor((test.endTime - test.startTime) / 1000);
    test.totalScore = totalScore;
    test.timeRemainingSeconds = 0; // Timer expired

    await test.save();

    // Stop timer monitoring
    const paTimerService = req.app.locals.paTimerService;
    if (paTimerService) {
      paTimerService.stopTimer(testId);
    }

    res.status(200).json({
      message: "Practice test ended successfully",
      test: {
        _id: test._id,
        title: test.title,
        status: test.status,
        startTime: test.startTime,
        endTime: test.endTime,
        totalTimeTaken: test.totalTimeTaken,
        submissions: submissions.length,
        totalQuestions: test.questions.length,
        totalScore: test.totalScore,
        maxPossibleScore: test.maxPossibleScore,
      },
    });
  } catch (error) {
    console.error("Error ending practice test:", error);
    res
      .status(500)
      .json({ message: "Error ending test", error: error.message });
  }
});

// Get all tests for a user - include submission counts
router.get("/tests", auth, async (req, res) => {
  try {
    // Fetch only basic test information without questions
    const tests = await PATest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select(
        "title parameters status startTime endTime completedAt totalTimeTaken finalScore totalScore maxPossibleScore createdAt updatedAt"
      )
      .lean();

    // Check and auto-complete expired tests
    const now = Date.now();
    const updatePromises = tests.map(async (test) => {
      if (test.status === "started" && test.startTime) {
        const timeLimit = test.parameters.timeLimit * 60 * 1000; // Convert minutes to milliseconds
        const elapsedTime = now - new Date(test.startTime).getTime();

        if (elapsedTime >= timeLimit) {
          // Time has expired - auto-complete the test
          const endTime = new Date(test.startTime.getTime() + timeLimit);
          const totalTimeTaken = Math.floor(timeLimit / 1000); // Convert to seconds

          // Calculate final score from existing submissions
          const submissions = await PASubmission.find({
            test: test._id,
            user: req.user.id,
          });

          const finalScore = submissions.reduce((total, sub) => {
            return total + (sub.pointsAwarded || 0);
          }, 0);

          // Update the test
          await PATest.findByIdAndUpdate(test._id, {
            status: "completed",
            endTime: endTime,
            completedAt: endTime,
            totalTimeTaken: totalTimeTaken,
            finalScore: finalScore,
            totalScore: finalScore,
          });

          // Update the test object for response
          test.status = "completed";
          test.endTime = endTime;
          test.completedAt = endTime;
          test.totalTimeTaken = totalTimeTaken;
          test.finalScore = finalScore;
          test.totalScore = finalScore;

        }
      }
    });

    await Promise.all(updatePromises);

    // Return basic test information only - no submission counts
    // Submission details will be loaded when user clicks "View Results"
    res.status(200).json(tests);
  } catch (error) {
    console.error("Error fetching user tests:", error);
    res
      .status(500)
      .json({ message: "Error fetching tests", error: error.message });
  }
});

// Get a specific test by ID with submissions
router.get("/tests/:id", auth, async (req, res) => {
  try {
    const testId = req.params.id;

    // Find the test and verify ownership
    const test = await PATest.findOne({
      _id: testId,
      user: req.user.id,
    })
      .populate("questions")
      .lean();

    if (!test) {
      return res
        .status(404)
        .json({ message: "Test not found or unauthorized" });
    }

    // Check if test time has expired and auto-complete it
    if (test.status === "started" && test.startTime) {
      const timeLimit = test.parameters.timeLimit * 60 * 1000; // Convert minutes to milliseconds
      const elapsedTime = Date.now() - new Date(test.startTime).getTime();

      if (elapsedTime >= timeLimit) {
        // Time has expired - auto-complete the test
        const endTime = new Date(test.startTime.getTime() + timeLimit);
        const totalTimeTaken = Math.floor(timeLimit / 1000); // Convert to seconds

        // Calculate final score from existing submissions
        const submissions = await PASubmission.find({
          test: testId,
          user: req.user.id,
        });

        const finalScore = submissions.reduce((total, sub) => {
          return total + (sub.pointsAwarded || 0);
        }, 0);

        // Update in database
        await PATest.findByIdAndUpdate(testId, {
          status: "completed",
          endTime: endTime,
          completedAt: endTime,
          totalTimeTaken: totalTimeTaken,
          finalScore: finalScore,
          totalScore: finalScore,
        });

        // Update test object for response
        test.status = "completed";
        test.endTime = endTime;
        test.completedAt = endTime;
        test.totalTimeTaken = totalTimeTaken;
        test.finalScore = finalScore;
        test.totalScore = finalScore;

      }
    }

    // SECURITY: Sanitize questions to remove solution code and editorial for active tests
    // Only show full solutions and editorial after test is completed
    if (test.status === "started" || test.status === "created") {
      test.questions = test.questions.map((q) => {
        // Remove editorial for all question types until test is completed
        const sanitizedQuestion = {
          ...q,
          editorial: undefined, // Hide editorial until test is completed
        };

        // Remove solutions for programming questions
        if (q.type === "programming" && q.languages) {
          sanitizedQuestion.languages = q.languages.map((lang) => ({
            ...lang,
            solutionCode: undefined,
          }));
        }

        return sanitizedQuestion;
      });
    }

    // Get all submissions for this test with populated question details
    const submissions = await PASubmission.find({
      test: testId,
      user: req.user.id,
    })
      .populate("question")
      .lean();

    // Calculate current time remaining for active tests
    let timerSync = null;
    if (test.status === "started") {
      const paTimerService = req.app.locals.paTimerService;
      if (paTimerService) {
        timerSync = await paTimerService.getTimerState(testId);
      }
    }

    // Add submissions and timer sync to the response
    const testWithSubmissions = {
      ...test,
      submissions,
      timerSync,
    };

    res.status(200).json(testWithSubmissions);
  } catch (error) {
    console.error("Error fetching test details:", error);
    res
      .status(500)
      .json({ message: "Error fetching test details", error: error.message });
  }
});

module.exports = router;
