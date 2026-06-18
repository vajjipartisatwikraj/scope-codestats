const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  submissionRateLimiter,
  runCodeRateLimiter,
} = require("../middleware/redisRateLimiter");
const Course = require("../models/Course");
const User = require("../models/User");
const {
  runCode,
  submitCode,
  submitCodeCombined,
} = require("../services/simpleCodeExecutionService");

// @route   GET /api/courses
// @desc    Get all courses
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/courses/saved
// @desc    Get user's saved courses
// @access  Private
router.get("/saved", auth, async (req, res) => {
  try {
    const courses = await Course.find({ savedBy: req.user.id });
    res.json(courses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Course not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/courses/:id/save
// @desc    Save a course
// @access  Private
router.post("/:id/save", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    // Check if already saved
    if (course.savedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: "Course already saved" });
    }

    course.savedBy.push(req.user.id);
    await course.save();

    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Course not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/courses/:id/save
// @desc    Unsave a course
// @access  Private
router.delete("/:id/save", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    // Check if not saved
    if (!course.savedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: "Course not saved" });
    }

    course.savedBy = course.savedBy.filter(
      (id) => id.toString() !== req.user.id
    );
    await course.save();

    res.json(course);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Course not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private
router.post("/:id/enroll", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    // Check if already enrolled
    if (
      course.registeredStudents.some(
        (student) => student.student.toString() === req.user.id
      )
    ) {
      return res.status(400).json({ msg: "Already enrolled in this course" });
    }

    course.registeredStudents.push({
      student: req.user.id,
      progress: 0,
      completedResources: [],
      startDate: Date.now(),
      lastAccessed: Date.now(),
    });

    // Increment student count
    course.students = course.students + 1;

    await course.save();

    // Make sure we include all fields, especially courseLink in the response
    const populatedCourse = await Course.findById(req.params.id).select(
      "+courseLink +title +description"
    );

    // Log the course data to verify courseLink is present
    console.log("Enrollment successful, course data:", {
      id: populatedCourse._id,
      title: populatedCourse.title,
      hasCourseLink: !!populatedCourse.courseLink,
      courseLink: populatedCourse.courseLink,
    });

    res.json(populatedCourse);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Course not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/courses/debug/count
// @desc    Get count of courses in the database
// @access  Public
router.get("/debug/count", async (req, res) => {
  try {
    const count = await Course.countDocuments();
    const courses = await Course.find().select("title").limit(5);
    res.json({
      count,
      message: `Found ${count} courses in the database`,
      sampleCourses: courses,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Code Execution Endpoints
// (Moved from compiler.js for consolidation)

/**
 * POST /api/courses/run-code
 * Simple code execution for testing with custom input
 * Rate limited: 2-second cooldown per user/IP
 */
router.post("/run-code", runCodeRateLimiter, async (req, res) => {
  try {
    const { language, source_code, input } = req.body;

    console.log(`🏃 RUN CODE request - Language: ${language}`);

    if (!language || !source_code) {
      return res.status(400).json({
        success: false,
        error: "language and source_code are required",
      });
    }

    const result = await runCode(language, source_code, input || "");
    res.json(result);
  } catch (error) {
    console.error("❌ Run code endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/courses/submit-code
 * Code execution against test cases
 * Rate limited: 5-second cooldown per user/IP
 */
router.post("/submit-code", submissionRateLimiter, async (req, res) => {
  try {
    const { language, source_code, testCases, options } = req.body;

    console.log(
      `📝 SUBMIT CODE request - Language: ${language}, Test cases: ${
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
    console.error("❌ Submit code endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/courses/submit-code-combined
 * Code execution against test cases using combined stdin (online-judge style)
 * Rate limited: 5-second cooldown per user/IP
 */
router.post(
  "/submit-code-combined",
  submissionRateLimiter,
  async (req, res) => {
    try {
      const { language, source_code, testCases, options } = req.body;

      console.log(
        `📝 SUBMIT-CODE-COMBINED request - Language: ${language}, Test cases: ${
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
      console.error("❌ Submit-code-combined endpoint error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;
