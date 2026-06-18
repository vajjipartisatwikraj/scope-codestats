import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Dialog,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Alert,
  IconButton,
  Avatar,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FlagIcon from "@mui/icons-material/Flag";
import TimerIcon from "@mui/icons-material/Timer";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SchoolIcon from "@mui/icons-material/School";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import QuizIcon from "@mui/icons-material/Quiz";
import CodeIcon from "@mui/icons-material/Code";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";

// Direct code execution API calls to backend simpleCodeExecutionService
const codeExecutionApi = {
  runCode: async (language, source_code, input = "") => {
    try {
      const response = await axios.post(
        `${apiUrl}/courses/run-code`,
        { language, source_code, input },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error running code:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Failed to run code"
      );
    }
  },

  // New secure endpoint that fetches test cases from database
  // This prevents hidden test cases from being exposed to frontend
  executeWithQuestion: async (
    language,
    source_code,
    questionId,
    mode,
    options = {}
  ) => {
    try {
      const response = await axios.post(
        `${apiUrl}/compiler/execute-with-question`,
        { language, source_code, questionId, mode, options },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error executing code with question:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Failed to execute code"
      );
    }
  },
};

// Import the components used in the cohort problem solving interface
import TestCasesPanel from "../cohort/TestCasesPanel";
import CodeEditorPanel from "../cohort/CodeEditorPanel";
import SidebarNavigation from "../cohort/SidebarNavigation";

const PATestView = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { darkMode } = useTheme();

  // Test state
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submissions, setSubmissions] = useState([]);

  // Timer state - SERVER SYNCHRONIZED
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [serverStartTime, setServerStartTime] = useState(null);
  const [lastServerSync, setLastServerSync] = useState(null);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  // UI state
  const [startDialog, setStartDialog] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [dailyLimit, setDailyLimit] = useState({
    testsStartedToday: 0,
    remainingTests: 3,
    dailyLimit: 3,
  });
  const [timeUntilReset, setTimeUntilReset] = useState("");

  // Fullscreen state
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [isInFullscreen, setIsInFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Code editor state (for programming questions)
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [testResults, setTestResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  // MCQ state
  const [selectedMcqOption, setSelectedMcqOption] = useState(null);

  // Test cases panel state for resizing
  const [testCasesPanelHeight, setTestCasesPanelHeight] = useState(50);
  const [isResizingTestPanel, setIsResizingTestPanel] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const testPanelResizerRef = useRef(null);

  // Add horizontal resizer state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const horizontalResizerRef = useRef(null);

  // Add state for output
  const [output, setOutput] = useState("");

  // Add a state to track if we're in submission mode to prevent overwriting results
  const [isInSubmissionMode, setIsInSubmissionMode] = useState(false);

  // Store backend summary for accurate test case counts (includes hidden test cases)
  const [testResultsSummary, setTestResultsSummary] = useState(null);

  // Constants for editor
  const LANGUAGES = {
    c: {
      extension: "c",
      name: "C",
      defaultCode:
        "#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}",
      version: "10.2.0",
    },
    cpp: {
      extension: "cpp",
      name: "C++",
      defaultCode:
        "#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}",
      version: "10.2.0",
    },
    java: {
      extension: "java",
      name: "Java",
      defaultCode:
        "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
      version: "15.0.2",
    },
    python: {
      extension: "py",
      name: "Python",
      defaultCode: "# Your code here",
      version: "3.10.0",
    },
    javascript: {
      extension: "js",
      name: "JavaScript",
      defaultCode: "// Your code here",
      version: "18.15.0",
    },
  };

  // Fetch daily limit information
  const fetchDailyLimit = async () => {
    try {
      const response = await axios.get(`${apiUrl}/practice-arena/daily-limit`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setDailyLimit(response.data);
    } catch (error) {
      console.error("Error fetching daily limit:", error);
    }
  };

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      setLoading(true);

      try {
        const response = await axios.get(
          `${apiUrl}/practice-arena/tests/${testId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const testData = response.data;
        setTest(testData);

        // Initialize questions
        if (testData.questions) {
          setQuestions(testData.questions);
        }

        // Initialize submissions
        if (testData.submissions && Array.isArray(testData.submissions)) {
          setSubmissions(testData.submissions);

          // If test is in progress, start with the first unanswered/incorrect question
          if (
            testData.status === "started" &&
            testData.questions &&
            testData.questions.length > 0
          ) {
            const firstUnansweredIndex = testData.questions.findIndex((q) => {
              const sub = testData.submissions.find(
                (s) => s.question._id === q._id || s.question === q._id
              );
              return !sub || !sub.isCorrect;
            });

            if (firstUnansweredIndex !== -1) {
              setCurrentQuestionIndex(firstUnansweredIndex);
            }
          }
        }

        // Set timer if test is in progress
        if (testData.status === "started" && testData.startTime) {
          const elapsedTime = Math.floor(
            (new Date() - new Date(testData.startTime)) / 1000
          );
          const totalTime = testData.parameters.timeLimit * 60;
          const remaining = Math.max(0, totalTime - elapsedTime);

          setTimeRemaining(remaining);
          setTimerActive(true);
        } else if (testData.status === "created") {
          // Set initial time for a new test
          setTimeRemaining(testData.parameters.timeLimit * 60);
          // Don't show dialog yet - let user enter fullscreen first
          // Dialog will show after entering fullscreen
        } else if (testData.status === "completed") {
          navigate(`/practice-arena/tests/${testId}/results`);
          return;
        }
      } catch (error) {
        console.error("Error fetching test:", error);
        toast.error("Failed to load test data");
        navigate("/practice-arena");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
    fetchDailyLimit();

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testId, token, navigate]);

  // Timer effect to update countdown to midnight IST
  useEffect(() => {
    const updateTimer = () => {
      // Get current time in IST
      const now = new Date();
      const istTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );

      // Calculate next midnight IST
      const nextMidnight = new Date(istTime);
      nextMidnight.setHours(24, 0, 0, 0);

      // Calculate difference
      const diff = nextMidnight - istTime;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeUntilReset("Resetting...");
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fullscreen enforcement for Practice Arena tests
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsInFullscreen(inFullscreen);

      // If user exits fullscreen and test is active (not completed)
      if (!inFullscreen && timerActive) {
        // Show blocking warning - DO NOT pause timer, it keeps running
        setFullscreenWarning(true);
      } else if (inFullscreen && fullscreenWarning) {
        // User re-entered fullscreen, close warning (timer was never paused)
        setFullscreenWarning(false);
      }
    };

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Initial check
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [timerActive, fullscreenWarning]);

  // Modify the useEffect that initializes the current question to preserve submission results
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];

      // Set up for MCQ question
      if (currentQuestion.type === "mcq") {
        // Check if we have a previous submission
        const submission = submissions.find(
          (s) =>
            s.question._id === currentQuestion._id ||
            s.question === currentQuestion._id
        );
        if (submission && submission.selectedOption) {
          setSelectedMcqOption(submission.selectedOption);
        } else {
          setSelectedMcqOption(null);
        }
      }
      // Set up for programming question
      else if (currentQuestion.type === "programming") {
        // Check if we just navigated to this question for the first time
        const isFirstVisit = !questions[currentQuestionIndex]._hasBeenVisited;

        // Mark as visited so we don't reset the language on subsequent renders
        if (!questions[currentQuestionIndex]._hasBeenVisited) {
          questions[currentQuestionIndex]._hasBeenVisited = true;

          // Only set language from default on first visit
          if (currentQuestion.defaultLanguage) {
            setLanguage(currentQuestion.defaultLanguage);
          }
        }

        // Always load boilerplate code - never pre-fill with previous submissions
        // Submissions are stored for results analysis only, not for the code editor
        const langInfo = currentQuestion.languages?.find(
          (l) => l.name === language
        );
        if (langInfo && langInfo.boilerplateCode) {
          setCode(langInfo.boilerplateCode);
        } else {
          setCode(LANGUAGES[language]?.defaultCode || "// Your code here");
        }

        // Reset test results when switching questions (not in submission mode)
        if (!isInSubmissionMode) {
          setTestResults([]);
          setTestResultsSummary(null);
        }
      }
    }
  }, [currentQuestionIndex, questions, language]);

  // Set up timer
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time's up
            clearInterval(timerRef.current);
            endTest(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive]);

  // Format time for display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start the test
  const startTest = async () => {
    try {
      const response = await axios.put(
        `${apiUrl}/practice-arena/tests/${testId}/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update test data with received questions
      const testData = response.data.test;
      setTest((prevTest) => ({ ...prevTest, ...testData }));
      setQuestions(testData.questions || []);

      // Start timer
      setTimeRemaining(testData.parameters.timeLimit * 60);
      setTimerActive(true);

      setStartDialog(false);

      // Show daily limit info if returned
      if (response.data.dailyLimit) {
        const { remainingTests } = response.data.dailyLimit;
        if (remainingTests === 0) {
          toast.warning(
            "You have used all 3 tests for today. Limit resets at midnight IST."
          );
        } else if (remainingTests === 1) {
          toast.info(`You have ${remainingTests} test remaining for today.`);
        }
      }
    } catch (error) {
      console.error("Error starting test:", error);

      // Handle daily limit exceeded error
      if (error.response?.status === 429) {
        const errorMsg =
          error.response.data?.message || "Daily test limit exceeded";
        const resetTime = error.response.data?.resetTime;

        if (resetTime) {
          toast.error(
            `${errorMsg}. Resets at ${new Date(resetTime).toLocaleTimeString(
              "en-IN",
              { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }
            )} IST`,
            {
              autoClose: 6000,
            }
          );
        } else {
          toast.error(errorMsg);
        }

        // Close dialog and navigate back
        setStartDialog(false);
        setTimeout(() => navigate("/practice-arena"), 2000);
      } else {
        toast.error("Failed to start the test");
      }
    }
  };

  // Modify the handleSubmitAnswer function to preserve submission mode
  const handleSubmitAnswer = async () => {
    if (!questions[currentQuestionIndex]) return;

    const currentQuestion = questions[currentQuestionIndex];
    setSubmitting(true);

    try {
      if (currentQuestion.type === "mcq") {
        if (!selectedMcqOption) {
          toast.error("Please select an option");
          setSubmitting(false);
          return;
        }

        // Create the submission object
        const submission = {
          questionId: currentQuestion._id,
          submissionType: "mcq",
          selectedOption: selectedMcqOption,
        };

        // Submit to server to save
        await submitToServer(submission);
      } else if (currentQuestion.type === "programming") {
        // Check if code is empty
        if (!code.trim()) {
          toast.error("Please write your code before submitting");
          setSubmitting(false);
          return;
        }

        if (
          !currentQuestion.testCases ||
          currentQuestion.testCases.length === 0
        ) {
          toast.error("No test cases available for this question");
          setSubmitting(false);
          return;
        }

        setRunning(true);
        setOutput("");
        setTestResults([]);
        setTestResultsSummary(null);
        setIsInSubmissionMode(true);

        try {
          // SUBMIT MODE: Use secure endpoint that fetches ALL test cases from database
          const result = await codeExecutionApi.executeWithQuestion(
            language,
            code,
            currentQuestion._id,
            "submit", // This tells backend to execute ALL test cases (including hidden)
            {
              time_limit: 3,
              memory_limit: 262144,
            }
          );

          // Check for compilation or runtime errors
          const hasCompilationError =
            !result.success ||
            result.execution?.status?.toLowerCase().includes("compilation") ||
            (result.results &&
              result.results.length > 0 &&
              result.results.every(
                (r) =>
                  r.status === "error" &&
                  r.error?.toLowerCase().includes("compilation")
              ));

          const hasRuntimeError =
            result.execution?.status?.toLowerCase().includes("runtime") ||
            (result.results &&
              result.results.length > 0 &&
              result.results.every(
                (r) =>
                  r.status === "error" &&
                  r.error?.toLowerCase().includes("runtime")
              ));

          if (!result.success || hasCompilationError || hasRuntimeError) {
            // Get error message from various sources
            const errorMsg =
              result.error ||
              result.execution?.status ||
              result.results?.[0]?.error ||
              "Unknown error";
            const isCompilationError = errorMsg
              .toLowerCase()
              .includes("compilation");

            // Create error results based on what backend returned
            const errorResults =
              result.results && result.results.length > 0
                ? result.results.map((testResult, index) => ({
                    testCaseId: `test-case-${index}`,
                    input: testResult.input || "",
                    expectedOutput: testResult.expected || "",
                    actualOutput: "",
                    passed: false,
                    hidden: testResult.hidden || false,
                    executionTime: 0,
                    memoryUsed: 0,
                    error: isCompilationError
                      ? `Compilation Error:\n${errorMsg}`
                      : errorMsg,
                    _isSubmission: true,
                  }))
                : [];

            setTestResults(errorResults);
            setRunning(false);
            setSubmitting(false);
            setIsInSubmissionMode(false);

            // Still submit the failed submission to server
            const submission = {
              questionId: currentQuestion._id,
              submissionType: "programming",
              code,
              language,
              testCaseResults: errorResults.map((r) => ({
                passed: false,
                executionTime: 0,
                memoryUsed: 0,
                output: "",
                error: errorMsg,
              })),
              status: "compilation_error",
              isCorrect: false,
            };

            await submitToServer(submission);
            return;
          }

          // Extract execution time and memory from the result (only when successful)
          const executionTimeInMs = result.execution?.time
            ? Math.round(parseFloat(result.execution.time) * 1000)
            : 0;
          const memoryUsedInKB = result.execution?.memory || 0;

          // Convert results to match the expected format
          const processedResults = result.results.map((testResult, index) => {
            return {
              testCaseId: `test-case-${index}`,
              input: testResult.input || "",
              expectedOutput: testResult.expected || "",
              actualOutput: testResult.got || "",
              passed: testResult.status === "passed",
              hidden: testResult.hidden || false,
              executionTime: executionTimeInMs,
              memoryUsed: memoryUsedInKB,
              error: testResult.error || "",
              _isSubmission: true,
            };
          });

          // Set ALL results for internal processing
          setTestResults(processedResults);

          // Store the backend summary for accurate total test case counts (includes hidden)
          if (result.summary) {
            setTestResultsSummary(result.summary);
          }

          // Use backend summary for accurate pass/total counts (includes hidden test cases)
          const passedTests = result.summary?.passed ?? processedResults.filter((r) => r.passed === true).length;
          const totalTests = result.summary?.total ?? processedResults.length;
          const allPassed = passedTests === totalTests;

          // Calculate overall execution time and memory usage
          const maxExecutionTime =
            processedResults.length > 0
              ? Math.max(
                  ...processedResults.map((r) =>
                    typeof r.executionTime === "number" ? r.executionTime : 0
                  )
                )
              : 0;
          const maxMemoryUsed =
            processedResults.length > 0
              ? Math.max(
                  ...processedResults.map((r) =>
                    typeof r.memoryUsed === "number" ? r.memoryUsed : 0
                  )
                )
              : 0;

          // Create programming submission
          const submission = {
            questionId: currentQuestion._id,
            submissionType: "programming",
            code,
            language,
            testCaseResults: processedResults.map((r) => ({
              passed: !!r.passed,
              executionTime:
                typeof r.executionTime === "number" ? r.executionTime : 0,
              memoryUsed: typeof r.memoryUsed === "number" ? r.memoryUsed : 0,
              output: typeof r.actualOutput === "string" ? r.actualOutput : "",
              error: typeof r.error === "string" ? r.error : "",
            })),
            status: allPassed ? "accepted" : "wrong_answer",
            isCorrect: allPassed,
            executionTime: maxExecutionTime,
            memoryUsed: maxMemoryUsed,
          };

          // Submit to server to save
          await submitToServer(submission);

          // Show success/failure toast
          if (allPassed) {
            toast.success("Solution accepted! All test cases passed.");
          } else {
            const failedTests = totalTests - passedTests;
            toast.warn(
              `Solution submitted but failed ${failedTests} out of ${totalTests} test cases.`
            );
          }
        } catch (error) {
          console.error("Error running test cases:", error);
          toast.error(
            "Failed to run test cases: " + (error.message || "Unknown error")
          );
          setSubmitting(false);
          setRunning(false);
          setIsInSubmissionMode(false);
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer");
      setSubmitting(false);
      setIsInSubmissionMode(false);
    }
  };

  // Submit to server to save submission
  const submitToServer = async (submission) => {
    try {
      const response = await axios.post(
        `${apiUrl}/practice-arena/tests/${testId}/submit`,
        submission,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update local submissions state with server response
      if (response.data && response.data.submission) {
        const newSubmission = response.data.submission;

        // Add the new submission to the existing submissions array
        setSubmissions((prevSubmissions) => [newSubmission, ...prevSubmissions]);
      } else {
        console.error("❌ Invalid response from server:", response.data);
        toast.error("Failed to save submission");
      }
    } catch (error) {
      console.error("Error saving submission:", error);
      toast.error("Failed to save your submission");
    } finally {
      setSubmitting(false);
      setRunning(false);
      // Keep testResults and isInSubmissionMode for display
    }
  };

  // End the test
  const endTest = async (isTimeout = false) => {
    setTimerActive(false);

    if (isTimeout) {
      toast.warning("Time's up! Your test is being submitted automatically.");
    }

    try {
      // The server already has all our submissions, so we just need to mark the test as completed
      const response = await axios.put(
        `${apiUrl}/practice-arena/tests/${testId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Navigate to detailed results page
      setEndDialog(false);
      navigate(`/practice-arena/tests/${testId}/results`);
    } catch (error) {
      console.error("Error ending test:", error);
      toast.error("Failed to end the test");
    }
  };

  // Modify the navigateToQuestion function to preserve submission mode when navigating
  const navigateToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      // Preserve submission mode and results when navigating between questions
      const preserveSubmissionMode = isInSubmissionMode;
      const preserveTestResults = [...testResults];

      // First set the new index
      setCurrentQuestionIndex(index);

      // If we were in submission mode, make sure it's preserved
      if (preserveSubmissionMode) {
        // Use a timeout to ensure the state changes in the right order
        setTimeout(() => {
          setIsInSubmissionMode(true);
          setTestResults(preserveTestResults);
        }, 50);
      }
    }
  };

  // Handle MCQ option selection
  const handleSelectMcqOption = (optionId) => {
    setSelectedMcqOption(optionId);
  };

  // Handle running code for programming questions
  const handleRunCode = async () => {
    if (
      !questions[currentQuestionIndex] ||
      questions[currentQuestionIndex].type !== "programming"
    ) {
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];

    if (
      !currentQuestion ||
      !currentQuestion.testCases ||
      currentQuestion.testCases.length === 0
    ) {
      toast.error("No test cases available for this question");
      return;
    }

    setRunning(true);
    setOutput("");
    setTestResults([]); // Clear previous results
    setTestResultsSummary(null); // Clear previous summary

    try {
      // RUN MODE: Use secure endpoint that fetches only VISIBLE test cases from database
      const result = await codeExecutionApi.executeWithQuestion(
        language,
        code,
        currentQuestion._id,
        "run", // This tells backend to execute ONLY visible test cases
        {
          time_limit: 3,
          memory_limit: 262144,
        }
      );

      // Check if there's a compilation error or execution failure
      if (
        !result.success ||
        result.execution?.status?.toLowerCase().includes("compilation")
      ) {
        const errorMsg =
          result.error || result.execution?.status || "Execution failed";

        // Create error results from backend response
        const errorResults =
          result.results && result.results.length > 0
            ? result.results.map((testResult, index) => ({
                testCaseId: `test-case-${index}`,
                input: testResult.input || "",
                expectedOutput: testResult.expected || "",
                actualOutput: "",
                passed: false,
                hidden: false, // RUN mode only has visible test cases
                executionTime: 0,
                memoryUsed: 0,
                error: `Compilation Error:\n${errorMsg}`,
                _isSubmission: false,
              }))
            : [];

        setTestResults(errorResults);
        setOutput(errorMsg);
        setRunning(false);
        return;
      }

      // Extract execution time and memory
      const executionTimeInMs = result.execution?.time
        ? Math.round(parseFloat(result.execution.time) * 1000)
        : 0;
      const memoryUsedInKB = result.execution?.memory || 0;

      // Process results
      const processedResults = result.results.map((testResult, index) => {
        return {
          testCaseId: `test-case-${index}`,
          input: testResult.input || "",
          expectedOutput: testResult.expected || "",
          actualOutput: testResult.got || "",
          passed: testResult.status === "passed",
          hidden: false, // RUN mode only has visible test cases
          executionTime: executionTimeInMs,
          memoryUsed: memoryUsedInKB,
          error: testResult.error || "",
          _isSubmission: false,
        };
      });

      // Set test results for display in TestCasesPanel
      setTestResults(processedResults);

      const passedTests = processedResults.filter(
        (r) => r.passed === true
      ).length;
      if (
        passedTests === processedResults.length &&
        processedResults.length > 0
      ) {
        toast.success(
          `All ${processedResults.length} visible test cases passed!`
        );
      } else if (processedResults.length > 0) {
        toast.warn(
          `${passedTests}/${processedResults.length} visible test cases passed`
        );
      }

      setRunning(false);
    } catch (error) {
      console.error("Test execution error:", error);
      toast.error(
        "Failed to execute code: " + (error.message || "Unknown error")
      );
      setRunning(false);
    }
  };

  // Add drag handling functions for test panel height
  const startTestPanelResize = (e) => {
    setIsResizingTestPanel(true);
    setResizeStartY(e.clientY);
  };

  const stopTestPanelResize = () => {
    setIsResizingTestPanel(false);
  };

  const resizeTestPanel = (e) => {
    if (!isResizingTestPanel) return;

    const containerHeight = document.body.clientHeight - 48; // Accounting for header
    const delta = resizeStartY - e.clientY;
    const deltaPercent = (delta / containerHeight) * 100;

    // Increase panel height when dragging up, decrease when dragging down
    // Ensure we have enough space for tabs (min 20%)
    const newHeight = Math.min(
      Math.max(20, testCasesPanelHeight + deltaPercent),
      70
    );
    setTestCasesPanelHeight(newHeight);
    setResizeStartY(e.clientY);
  };

  // Add horizontal resizing functions
  const startHorizontalResize = (e) => {
    setIsResizingHorizontal(true);
    setResizeStartX(e.clientX);
  };

  const stopHorizontalResize = () => {
    setIsResizingHorizontal(false);
  };

  const resizeHorizontal = (e) => {
    if (!isResizingHorizontal) return;

    const containerWidth = document.body.clientWidth;
    const delta = e.clientX - resizeStartX;
    const deltaPercent = (delta / containerWidth) * 100;

    // Ensure we keep reasonable minimum widths for both panels
    const newLeftWidth = Math.min(
      Math.max(30, leftPanelWidth + deltaPercent),
      70
    );
    setLeftPanelWidth(newLeftWidth);
    setResizeStartX(e.clientX);
  };

  // Add event listeners for mouse movements (for both resizers)
  useEffect(() => {
    if (isResizingTestPanel) {
      document.addEventListener("mousemove", resizeTestPanel);
      document.addEventListener("mouseup", stopTestPanelResize);
    }

    if (isResizingHorizontal) {
      document.addEventListener("mousemove", resizeHorizontal);
      document.addEventListener("mouseup", stopHorizontalResize);
    }

    return () => {
      document.removeEventListener("mousemove", resizeTestPanel);
      document.removeEventListener("mouseup", stopTestPanelResize);
      document.removeEventListener("mousemove", resizeHorizontal);
      document.removeEventListener("mouseup", stopHorizontalResize);
    };
  }, [
    isResizingTestPanel,
    resizeTestPanel,
    stopTestPanelResize,
    testCasesPanelHeight,
    resizeStartY,
    isResizingHorizontal,
    resizeHorizontal,
    stopHorizontalResize,
    leftPanelWidth,
    resizeStartX,
  ]);

  // Handle language changes
  const handleLanguageChange = (newLanguage) => {
    // Only proceed if it's actually a different language
    if (newLanguage !== language) {
      // Update the language state
      setLanguage(newLanguage);

      // If we have a current question, check for language-specific boilerplate code
      if (questions.length > 0 && currentQuestionIndex < questions.length) {
        const currentQuestion = questions[currentQuestionIndex];

        // Always load boilerplate code on language change - never pre-fill with previous submissions
        const langInfo = currentQuestion.languages?.find(
          (l) => l.name === newLanguage
        );
        if (langInfo && langInfo.boilerplateCode) {
          setCode(langInfo.boilerplateCode);
        } else {
          setCode(LANGUAGES[newLanguage]?.defaultCode || "// Your code here");
        }

        // Reset test results when changing language
        if (!isInSubmissionMode) {
          setTestResults([]);
          setOutput("");
        }
      }
    }
  };

  // Render the current question
  const renderCurrentQuestion = () => {
    if (
      loading ||
      !questions.length ||
      currentQuestionIndex >= questions.length
    ) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const hasSubmission = submissions.find(
      (s) =>
        s.question._id === currentQuestion._id ||
        s.question === currentQuestion._id
    );

    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Question Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            height: "calc(100% - 60px)",
            overflow: "hidden",
          }}
        >
          {/* Description Panel */}
          <Box
            sx={{
              width: `${leftPanelWidth}%`,
              height: "100%",
              overflow: "auto",
              p: 2,
              borderRight: "1px solid",
              borderColor: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
              Question {currentQuestionIndex + 1}: {currentQuestion.title}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
              <Chip
                label={currentQuestion.difficultyLevel}
                color={
                  currentQuestion.difficultyLevel === "easy"
                    ? "success"
                    : currentQuestion.difficultyLevel === "medium"
                    ? "warning"
                    : "error"
                }
                size="small"
              />
              <Chip
                label={`${currentQuestion.marks} pt${
                  currentQuestion.marks !== 1 ? "s" : ""
                }`}
                color="primary"
                size="small"
              />
            </Box>

            <Box
              className="question-description"
              sx={{
                mb: 3,
                color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
                lineHeight: 1.6,
                fontSize: "15px",
                "& code": {
                  backgroundColor: darkMode
                    ? "rgba(0, 136, 204, 0.1)"
                    : "rgba(10, 102, 194, 0.08)",
                  color: darkMode ? "#0088cc" : "#0a66c2",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                  fontSize: "0.9em",
                  fontWeight: "800",
                  border: darkMode
                    ? "1px solid rgba(0, 136, 204, 0.3)"
                    : "1px solid rgba(10, 102, 194, 0.2)",
                  boxShadow: darkMode
                    ? "0 1px 3px rgba(0, 136, 204, 0.1)"
                    : "0 1px 2px rgba(10, 102, 194, 0.1)",
                  display: "inline-block",
                  lineHeight: "1.5",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: darkMode
                      ? "rgba(0, 136, 204, 0.15)"
                      : "rgba(10, 102, 194, 0.12)",
                    transform: "translateY(-1px)",
                    boxShadow: darkMode
                      ? "0 2px 6px rgba(0, 136, 204, 0.2)"
                      : "0 2px 4px rgba(10, 102, 194, 0.15)",
                  },
                },
                "& pre": {
                  backgroundColor: darkMode
                    ? "rgba(255,255,255,0.05)"
                    : "#f5f5f5",
                  padding: "16px",
                  borderRadius: "8px",
                  overflow: "auto",
                  border: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.2)" : "#e0e0e0"
                  }`,
                  margin: "16px 0",
                  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                },
                "& img": {
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  margin: "16px 0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                },
                "& ul, & ol": {
                  margin: "16px 0",
                  paddingLeft: "24px",
                },
                "& li": {
                  margin: "8px 0",
                },
                "& blockquote": {
                  borderLeft: `4px solid ${darkMode ? "#0088cc" : "#0a66c2"}`,
                  paddingLeft: "16px",
                  margin: "16px 0",
                  fontStyle: "italic",
                  backgroundColor: darkMode
                    ? "rgba(255,255,255,0.05)"
                    : "#f8f9fa",
                  padding: "16px",
                  borderRadius: "0 8px 8px 0",
                },
                "& .highlight": {
                  backgroundColor: darkMode
                    ? "rgba(255,235,59,0.3)"
                    : "#fff3cd",
                  padding: "2px 4px",
                  borderRadius: "4px",
                },
                "& .note": {
                  backgroundColor: "transparent",
                  border: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                  borderRadius: "8px",
                  padding: "0",
                  margin: "16px 0",
                  overflow: "hidden",
                  "& p:first-child": {
                    backgroundColor: darkMode
                      ? "rgba(0, 136, 204, 0.1)"
                      : "rgba(10, 102, 194, 0.08)",
                    padding: "12px 16px",
                    margin: "0",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    color: darkMode ? "#0088cc" : "#0a66c2",
                    borderBottom: `1px solid ${
                      darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }`,
                  },
                  "& ul": {
                    padding: "12px 16px 12px 40px",
                    margin: "0",
                  },
                },
                "& .warning": {
                  backgroundColor: darkMode ? "rgba(255,152,0,0.1)" : "#fff3e0",
                  border: `1px solid ${darkMode ? "#ff9800" : "#f57c00"}`,
                  padding: "16px",
                  borderRadius: "8px",
                  margin: "16px 0",
                },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  color: darkMode ? "#0088cc" : "#0a66c2",
                  marginTop: "1.5em",
                  marginBottom: "0.5em",
                },
                "& p": {
                  margin: "8px 0",
                },
                "& strong": {
                  fontWeight: "bold",
                  color: darkMode
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(0,0,0,0.9)",
                },
                "& em": {
                  fontStyle: "italic",
                },
                "& hr": {
                  margin: "24px 0",
                  border: "none",
                  borderTop: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.2)" : "#e0e0e0"
                  }`,
                },
                "& .example": {
                  backgroundColor: "transparent",
                  border: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                  borderRadius: "8px",
                  padding: "0",
                  margin: "16px 0",
                  overflow: "hidden",
                  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                  "& > div": {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0",
                  },
                  "& .input-output-row": {
                    display: "contents",
                  },
                  "& .label": {
                    backgroundColor: darkMode
                      ? "rgba(0, 136, 204, 0.1)"
                      : "rgba(10, 102, 194, 0.08)",
                    padding: "12px 16px",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    color: darkMode ? "#0088cc" : "#0a66c2",
                    borderBottom: `1px solid ${
                      darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }`,
                  },
                  "& .label:first-of-type": {
                    borderRight: `1px solid ${
                      darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }`,
                  },
                  "& .value": {
                    backgroundColor: "transparent",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    color: darkMode
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(0,0,0,0.8)",
                    fontFamily:
                      '"Consolas", "Monaco", "Courier New", monospace',
                  },
                  "& .value:first-of-type": {
                    borderRight: `1px solid ${
                      darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }`,
                  },
                },
                "& table": {
                  width: "100%",
                  borderCollapse: "collapse",
                  margin: "10px 0",
                  fontFamily: "inherit",
                  border: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                  borderRadius: "8px",
                },
                "& table thead th": {
                  backgroundColor: darkMode
                    ? "rgba(0, 136, 204, 0.1)"
                    : "rgba(10, 102, 194, 0.08)",
                  padding: "12px 16px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  color: darkMode ? "#0088cc" : "#0a66c2",
                  textAlign: "left",
                  border: "none",
                  borderBottom: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }`,
                },
                "& table tbody td": {
                  backgroundColor: "transparent",
                  padding: "12px 16px",
                  fontSize: "0.9rem",
                  color: darkMode
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(0,0,0,0.8)",
                  border: "none",
                  borderBottom: `1px solid ${
                    darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                  }`,
                },
              }}
              dangerouslySetInnerHTML={{ __html: currentQuestion.description }}
            />

            {/* Examples */}
            {currentQuestion.examples &&
              currentQuestion.examples.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Examples:
                  </Typography>
                  {currentQuestion.examples.map((example, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: darkMode ? "#121620" : "#F5F7FA",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Example {index + 1}:
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", mb: 1 }}
                        >
                          <strong>Input:</strong> {example.input}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", mb: 1 }}
                        >
                          <strong>Output:</strong> {example.output}
                        </Typography>
                        {example.explanation && (
                          <Typography
                            variant="body2"
                            sx={{ color: darkMode ? "#E0E0E0" : "#616161" }}
                          >
                            <strong>Explanation:</strong> {example.explanation}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
          </Box>

          {/* Horizontal Resizer */}
          <Box
            ref={horizontalResizerRef}
            sx={{
              width: "5px",
              height: "100%",
              bgcolor: darkMode
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
              cursor: "col-resize",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
              zIndex: 10,
              transition: isResizingHorizontal
                ? "none"
                : "background-color 0.2s",
            }}
            onMouseDown={startHorizontalResize}
          />

          {/* Answer Panel */}
          <Box
            sx={{
              width: `calc(100% - ${leftPanelWidth}% - 5px)`,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {currentQuestion.type === "mcq" ? (
              /* MCQ Options */
              <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
                <Typography variant="h6" gutterBottom>
                  Select the correct answer:
                </Typography>

                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedMcqOption === option._id;

                  // Check if there's a submission for this question
                  const currentSubmission = submissions.find(
                    (s) =>
                      s.question._id === currentQuestion._id ||
                      s.question === currentQuestion._id
                  );

                  const isSubmitted = !!currentSubmission;
                  const isCorrectOption = option.isCorrect;
                  const isUserAnswer =
                    currentSubmission?.selectedOption === option._id;

                  // Additional styling for selected option
                  let optionStyle = {
                    border: "1px solid",
                    borderColor: isSelected
                      ? "primary.main"
                      : darkMode
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.1)",
                    p: 2,
                    mb: 2,
                    borderRadius: 1,
                    cursor: isSubmitted ? "default" : "pointer",
                    bgcolor: isSelected
                      ? darkMode
                        ? "rgba(25, 118, 210, 0.1)"
                        : "rgba(25, 118, 210, 0.05)"
                      : "transparent",
                    "&:hover": isSubmitted
                      ? {}
                      : {
                          bgcolor: isSelected
                            ? darkMode
                              ? "rgba(25, 118, 210, 0.15)"
                              : "rgba(25, 118, 210, 0.1)"
                            : darkMode
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.02)",
                        },
                  };

                  // After submission, show correct/incorrect styling
                  if (isSubmitted) {
                    if (isCorrectOption) {
                      // Correct answer - always show green
                      optionStyle = {
                        ...optionStyle,
                        borderColor: "#4caf50",
                        bgcolor: darkMode
                          ? "rgba(76, 175, 80, 0.15)"
                          : "rgba(76, 175, 80, 0.1)",
                      };
                    } else if (isUserAnswer && !isCorrectOption) {
                      // User's wrong answer - show red
                      optionStyle = {
                        ...optionStyle,
                        borderColor: "#f44336",
                        bgcolor: darkMode
                          ? "rgba(244, 67, 54, 0.15)"
                          : "rgba(244, 67, 54, 0.1)",
                      };
                    }
                  }

                  return (
                    <Box
                      key={option._id}
                      sx={optionStyle}
                      onClick={() =>
                        !isSubmitted && handleSelectMcqOption(option._id)
                      }
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body1">
                          {String.fromCharCode(65 + index)}. {option.text}
                        </Typography>
                        {isSubmitted && isCorrectOption && (
                          <CheckCircleIcon sx={{ color: "#4caf50", ml: 2 }} />
                        )}
                        {isSubmitted && isUserAnswer && !isCorrectOption && (
                          <CancelIcon sx={{ color: "#f44336", ml: 2 }} />
                        )}
                      </Box>
                    </Box>
                  );
                })}

                {(() => {
                  const currentSubmission = submissions.find(
                    (s) =>
                      s.question._id === currentQuestion._id ||
                      s.question === currentQuestion._id
                  );
                  const isSubmitted = !!currentSubmission;

                  return (
                    <Box sx={{ mt: 3 }}>
                      {isSubmitted && (
                        <Alert
                          severity={
                            currentSubmission.isCorrect ? "success" : "error"
                          }
                          sx={{ mb: 2 }}
                        >
                          {currentSubmission.isCorrect
                            ? `Correct! You earned ${currentSubmission.score} points.`
                            : "Incorrect answer. The correct answer is highlighted above."}
                        </Alert>
                      )}
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Button
                          variant="contained"
                          color={isSubmitted ? "success" : "primary"}
                          disabled={
                            !selectedMcqOption || submitting || isSubmitted
                          }
                          onClick={handleSubmitAnswer}
                          sx={{ px: 4, py: 1 }}
                        >
                          {submitting
                            ? "Submitting..."
                            : isSubmitted
                            ? "Already Submitted"
                            : "Submit Answer"}
                        </Button>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>
            ) : (
              /* Programming Question */
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Code Editor Header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1,
                    borderBottom: "1px solid",
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography variant="subtitle1">Code Editor</Typography>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleRunCode}
                      disabled={running || submitting}
                      startIcon={<PlayArrowIcon />}
                    >
                      Run
                    </Button>

                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSubmitAnswer}
                      disabled={running || submitting}
                      color="primary"
                    >
                      Submit
                    </Button>
                  </Box>
                </Box>

                {/* Code Editor Panel and Test Cases Panel Section */}
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <CodeEditorPanel
                    code={code}
                    language={language}
                    darkMode={darkMode}
                    onChange={setCode}
                    testCasesPanelHeight={testCasesPanelHeight}
                    LANGUAGES={LANGUAGES}
                    onLanguageChange={handleLanguageChange}
                    availableLanguages={currentQuestion?.languages || []}
                    encryptedEditorEnabled={true}
                    fillInTheBlankEnabled={
                      currentQuestion?.fillInTheBlank || false
                    }
                    questionId={currentQuestion?._id}
                    encryptionSettings={
                      currentQuestion?.encryptionSettings || {}
                    }
                    portalContainer={containerRef.current}
                  />

                  {/* Test Cases Panel - Always visible */}
                  <TestCasesPanel
                    question={currentQuestion}
                    testResults={testResults}
                    darkMode={darkMode}
                    testCasesPanelHeight={testCasesPanelHeight}
                    testPanelResizerRef={testPanelResizerRef}
                    startTestPanelResize={startTestPanelResize}
                    isResizingTestPanel={isResizingTestPanel}
                    output={output}
                    isSubmission={
                      isInSubmissionMode &&
                      testResults?.some((r) => r._isSubmission === true)
                    }
                    testResultsSummary={testResultsSummary}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // Check if all questions have been answered correctly
  const areAllQuestionsCompleted = () => {
    if (!questions.length || !submissions.length) return false;

    // Check if all questions have submissions and they are correct
    return questions.every((question) => {
      const submission = submissions.find(
        (s) => s.question._id === question._id || s.question === question._id
      );
      return submission && submission.isCorrect;
    });
  };

  // Render test interface
  return (
    <Box
      ref={containerRef}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        bgcolor: darkMode ? "#0e1117" : "#f5f7fa",
        display: "flex",
        zIndex: 1200,
      }}
    >
      {/* Sidebar Navigation - Hidden for Practice Arena tests */}

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Show Fullscreen Prompt if not in fullscreen */}
        {!isInFullscreen ? (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              bgcolor: darkMode ? "#0d1117" : "#f0f4f8",
            }}
          >
            <Box
              sx={{
                textAlign: "center",
                maxWidth: "480px",
                p: 5,
                bgcolor: darkMode ? "#161b22" : "#fff",
                borderRadius: "16px",
                boxShadow: darkMode
                  ? "0 8px 32px rgba(0, 0, 0, 0.4)"
                  : "0 8px 32px rgba(0, 0, 0, 0.08)",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "16px",
                  bgcolor: darkMode ? "rgba(0,136,204,0.12)" : "rgba(0,136,204,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <Box sx={{ fontSize: "32px" }}>🖥️</Box>
              </Box>
              <Typography
                sx={{
                  mb: 1.5,
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  color: darkMode ? "#fff" : "#1a1a2e",
                }}
              >
                Fullscreen Required
              </Typography>
              <Typography
                sx={{
                  mb: 1,
                  color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                Practice Arena tests must be taken in fullscreen mode for the
                best experience and to maintain test integrity.
              </Typography>
              <Typography
                sx={{
                  mb: 3.5,
                  color: darkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
                  fontSize: "0.85rem",
                }}
              >
                Click the button below to enter fullscreen and begin your test.
              </Typography>
              <Button
                onClick={() => {
                  if (containerRef.current) {
                    containerRef.current
                      .requestFullscreen()
                      .then(() => {
                        setIsInFullscreen(true);
                        toast.success("Fullscreen mode activated!");

                        // Show start dialog for new tests after entering fullscreen
                        if (test?.status === "created") {
                          setTimeout(() => {
                            setStartDialog(true);
                          }, 300); // Small delay for smoother UX
                        }
                      })
                      .catch((err) => {
                        console.error("Error entering fullscreen:", err);
                        toast.error(
                          "Please allow fullscreen to take this test"
                        );
                      });
                  }
                }}
                variant="contained"
                size="large"
                sx={{
                  px: 5,
                  py: 1.5,
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  bgcolor: "#0088CC",
                  boxShadow: "0 4px 14px rgba(0,136,204,0.3)",
                  "&:hover": {
                    bgcolor: "#006da3",
                    boxShadow: "0 6px 20px rgba(0,136,204,0.4)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Enter Fullscreen & Start Test
              </Button>
              <Typography
                sx={{
                  display: "block",
                  mt: 2.5,
                  fontSize: "0.8rem",
                  color: darkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                }}
              >
                Press F11 or click the button above
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            {/* Fullscreen Blocking Overlay - shown when user exits during test */}
            {fullscreenWarning && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: darkMode ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.85)",
                  zIndex: 9999,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  sx={{
                    textAlign: "center",
                    maxWidth: "480px",
                    p: 5,
                    bgcolor: darkMode ? "#161b22" : "#fff",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                    border: `1px solid ${darkMode ? "rgba(244,67,54,0.3)" : "rgba(244,67,54,0.2)"}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "16px",
                      bgcolor: "rgba(244,67,54,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Box sx={{ fontSize: "32px" }}>⚠️</Box>
                  </Box>
                  <Typography
                    sx={{
                      mb: 1.5,
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      color: "#f44336",
                    }}
                  >
                    Fullscreen Required
                  </Typography>
                  <Typography
                    sx={{
                      mb: 1,
                      color: darkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                      fontWeight: 500,
                    }}
                  >
                    You exited fullscreen mode.{" "}
                    <strong style={{ color: "#f44336" }}>
                      Your timer is still running!
                    </strong>
                  </Typography>
                  <Typography
                    sx={{
                      mb: 1,
                      color: darkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)",
                      fontSize: "0.9rem",
                      lineHeight: 1.6,
                    }}
                  >
                    You cannot interact with the test until you return to
                    fullscreen, but the timer continues to count down.
                  </Typography>
                  <Typography
                    sx={{
                      mb: 3.5,
                      color: darkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Click the button below immediately to resume your test.
                  </Typography>
                  <Button
                    onClick={() => {
                      if (containerRef.current && !document.fullscreenElement) {
                        containerRef.current
                          .requestFullscreen()
                          .then(() => {
                            setFullscreenWarning(false);
                          })
                          .catch((err) => {
                            console.error("Error entering fullscreen:", err);
                            toast.error(
                              "Please allow fullscreen to continue the test"
                            );
                          });
                      }
                    }}
                    variant="contained"
                    size="large"
                    sx={{
                      px: 5,
                      py: 1.5,
                      borderRadius: "10px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      textTransform: "none",
                      bgcolor: "#f44336",
                      boxShadow: "0 4px 14px rgba(244,67,54,0.3)",
                      "&:hover": {
                        bgcolor: "#d32f2f",
                        boxShadow: "0 6px 20px rgba(244,67,54,0.4)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Resume Test in Fullscreen
                  </Button>
                </Box>
              </Box>
            )}

            {/* Top Bar with Timer and Navigation */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1,
                borderBottom: "1px solid",
                borderColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
                bgcolor: darkMode ? "#1a1a1a" : "#ffffff",
              }}
            >
              {/* Left Side: Back button and Test Info */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <IconButton
                  onClick={() => navigate("/practice-arena")}
                  size="small"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="subtitle1" sx={{ ml: 1 }}>
                  {test?.title || "Practice Test"}
                </Typography>
              </Box>

              {/* Center: Question Navigation */}
              <Box sx={{ display: "flex", gap: 1 }}>
                {questions.map((question, index) => {
                    // Determine if this question has been answered correctly
                    const submission = submissions.find(
                      (s) =>
                        s.question._id === question._id ||
                        s.question === question._id
                    );
                    const isCompleted = submission && submission.isCorrect;

                    return (
                      <Button
                        key={index}
                        variant={
                          currentQuestionIndex === index
                            ? "contained"
                            : "outlined"
                        }
                        size="small"
                        onClick={() => navigateToQuestion(index)}
                        sx={{
                          minWidth: "36px",
                          height: "36px",
                          p: 0,
                          borderRadius: "50%",
                          bgcolor:
                            isCompleted && currentQuestionIndex !== index
                              ? darkMode
                                ? "rgba(46, 125, 50, 0.2)"
                                : "rgba(46, 125, 50, 0.1)"
                              : undefined,
                          borderColor:
                            isCompleted && currentQuestionIndex !== index
                              ? "#2e7d32"
                              : undefined,
                          color:
                            isCompleted && currentQuestionIndex !== index
                              ? "#2e7d32"
                              : undefined,
                        }}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
              </Box>

              {/* Right Side: Timer and End Button */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {timerActive && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: "36px",
                      p: "6px 12px",
                      borderRadius: 1,
                      mr: 2,
                      bgcolor:
                        timeRemaining < 300 ? "error.main" : "primary.main",
                      color: "white",
                    }}
                  >
                    <TimerIcon sx={{ mr: 0.5, fontSize: "20px" }} />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "bold", fontFamily: "monospace" }}
                    >
                      {formatTime(timeRemaining)}
                    </Typography>
                  </Box>
                )}

                <Button
                    variant="contained"
                    color={areAllQuestionsCompleted() ? "success" : "error"}
                    onClick={() => setEndDialog(true)}
                    sx={{
                      position: "relative",
                      height: "36px",
                      p: "6px 12px",
                      textTransform: "none",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                    startIcon={<FlagIcon sx={{ fontSize: "20px" }} />}
                  >
                    End Test
                    {areAllQuestionsCompleted() && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          bgcolor: "success.main",
                          border: "2px solid",
                          borderColor: darkMode ? "#1a1a1a" : "#ffffff",
                        }}
                      />
                    )}
                  </Button>
              </Box>
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flex: 1, overflow: "auto" }}>
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "80vh",
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                renderCurrentQuestion()
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Start Test Dialog */}
      <Dialog
        open={startDialog}
        aria-labelledby="start-test-dialog-title"
        maxWidth="sm"
        fullWidth
        container={() => containerRef.current}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
            background: darkMode
              ? "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            pb: 2,
            borderBottom: "1px solid",
            borderColor: darkMode
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
            background: darkMode
              ? "rgba(0, 136, 204, 0.1)"
              : "rgba(0, 136, 204, 0.05)",
          }}
        >
          <IconButton
            aria-label="close"
            onClick={() => navigate("/practice-arena")}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: darkMode
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(0, 0, 0, 0.5)",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", p: 3 }}>
            <Avatar
              sx={{
                bgcolor: "#0088CC",
                width: 48,
                height: 48,
                mr: 2,
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <AssignmentIcon fontSize="large" />
            </Avatar>
            <Typography
              variant="h5"
              component="h2"
              fontWeight="700"
              id="start-test-dialog-title"
            >
              Start Practice Test
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ px: 3, py: 4 }}>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              fontWeight: 500,
              color: darkMode
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(0, 0, 0, 0.8)",
            }}
          >
            You are about to start a practice test with the following
            parameters:
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              background: darkMode
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              border: "1px solid",
              borderColor: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <SchoolIcon sx={{ color: "#0088CC", mr: 1.5 }} />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Subject
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {test?.parameters?.subject || "Not specified"}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <SignalCellularAltIcon sx={{ color: "#0088CC", mr: 1.5 }} />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Difficulty
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 600, textTransform: "capitalize" }}
                    >
                      {test?.parameters?.difficulty || "Mixed"}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <QuizIcon sx={{ color: "#0088CC", mr: 1.5 }} />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Questions
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {test?.questions?.length || 0} total
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ ml: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 1,
                      color: darkMode
                        ? "rgba(255, 255, 255, 0.8)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        bgcolor: "rgba(0, 136, 204, 0.15)",
                        border: "1px solid",
                        borderColor: "rgba(0, 136, 204, 0.6)",
                        mr: 1.5,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <CodeIcon
                        sx={{ fontSize: "0.9rem", mr: 0.8, color: "#0088CC" }}
                      />
                      {test?.parameters?.questionTypes?.programming?.count || 0}{" "}
                      Programming
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: darkMode
                        ? "rgba(255, 255, 255, 0.8)"
                        : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        bgcolor: "rgba(0, 136, 204, 0.15)",
                        border: "1px solid",
                        borderColor: "rgba(0, 136, 204, 0.6)",
                        mr: 1.5,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <QuizIcon
                        sx={{ fontSize: "0.9rem", mr: 0.8, color: "#0088CC" }}
                      />
                      {test?.parameters?.questionTypes?.mcq?.count || 0} MCQ
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <ScheduleIcon sx={{ color: "#0088CC", mr: 1.5 }} />
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Time Limit
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {test?.parameters?.timeLimit || 60} minutes
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Alert
            severity="info"
            variant="outlined"
            icon={<TimerIcon fontSize="inherit" />}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
              background: darkMode
                ? "rgba(5, 133, 224, 0.1)"
                : "rgba(0, 0, 0, 0.02)",
              "& .MuiAlert-icon": {
                alignItems: "center",
                color: "#0585E0",
              },
              "& .MuiAlert-message": {
                color: darkMode
                  ? "rgba(255, 255, 255, 0.9)"
                  : "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            <Typography variant="body2">
              Once you start, the timer will begin counting down. You can submit
              answers for each question and navigate between questions freely.
            </Typography>
          </Alert>

          {/* Daily Limit Warning */}
          {dailyLimit.remainingTests <= 1 && (
            <Alert
              severity={dailyLimit.remainingTests === 0 ? "error" : "warning"}
              icon={<AccessTimeIcon />}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" fontWeight="600">
                {dailyLimit.remainingTests === 0
                  ? "⚠️ You have reached your daily limit of 3 tests!"
                  : "⚠️ This is your last test for today!"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Tests started today: {dailyLimit.testsStartedToday}/
                {dailyLimit.dailyLimit}.
              </Typography>
              {dailyLimit.remainingTests === 0 && (
                <Typography
                  variant="body2"
                  sx={{ mt: 0.5, fontWeight: "bold", color: "primary.main" }}
                >
                  🔄 Lives refill in: {timeUntilReset}
                </Typography>
              )}
              {dailyLimit.remainingTests === 1 && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Next reset: midnight IST (12:00 AM) - {timeUntilReset}{" "}
                  remaining
                </Typography>
              )}
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: "space-between",
            bgcolor: darkMode ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
          }}
        >
          <Button
            onClick={() => navigate("/practice-arena")}
            sx={{
              color: darkMode
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(0, 0, 0, 0.6)",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={startTest}
            variant="contained"
            sx={{
              bgcolor: "#0088CC",
              "&:hover": {
                bgcolor: "rgba(0, 136, 204, 0.9)",
              },
              px: 3,
              py: 1,
              borderRadius: 1.5,
            }}
            startIcon={<PlayArrowIcon />}
          >
            Start Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Test Dialog */}
      <Dialog
        open={endDialog}
        onClose={() => setEndDialog(false)}
        aria-labelledid="end-test-dialog-title"
        maxWidth="sm"
        fullWidth
        container={() => containerRef.current}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
            background: darkMode
              ? "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            pb: 2,
            borderBottom: "1px solid",
            borderColor: darkMode
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
            background: areAllQuestionsCompleted()
              ? darkMode
                ? "rgba(46, 125, 50, 0.1)"
                : "rgba(46, 125, 50, 0.05)"
              : darkMode
              ? "rgba(211, 47, 47, 0.1)"
              : "rgba(211, 47, 47, 0.05)",
          }}
        >
          <IconButton
            aria-label="close"
            onClick={() => setEndDialog(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: darkMode
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(0, 0, 0, 0.5)",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", p: 3 }}>
            <Avatar
              sx={{
                bgcolor: areAllQuestionsCompleted() ? "#4caf50" : "#f44336",
                width: 48,
                height: 48,
                mr: 2,
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <FlagIcon fontSize="large" />
            </Avatar>
            <Typography
              variant="h5"
              component="h2"
              fontWeight="700"
              id="end-test-dialog-title"
            >
              End Test{areAllQuestionsCompleted() ? " - Complete!" : ""}
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ px: 3, py: 4 }}>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              fontWeight: 500,
              color: darkMode
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(0, 0, 0, 0.8)",
            }}
          >
            Are you sure you want to end this test? Your current progress will
            be saved, but the test will be marked as completed and you won't be
            able to continue.
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              background: darkMode
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              border: "1px solid",
              borderColor: darkMode
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Test Summary
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mt: 2,
                mb: 3,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  display: "inline-flex",
                  mx: "auto",
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={
                    (new Set(
                      submissions
                        .filter((s) => s.isCorrect)
                        .map((s) => s.question._id || s.question)
                    ).size /
                      questions.length) *
                    100
                  }
                  size={120}
                  thickness={4}
                  sx={{
                    color: areAllQuestionsCompleted() ? "#4caf50" : "#0088CC",
                    circle: {
                      strokeLinecap: "round",
                    },
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: "absolute",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="h4"
                    component="div"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    {`${
                      new Set(
                        submissions
                          .filter((s) => s.isCorrect)
                          .map((s) => s.question._id || s.question)
                      ).size
                    }/${questions.length}`}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Typography
              variant="body2"
              align="center"
              sx={{
                mb: 1,
                color: areAllQuestionsCompleted()
                  ? "#4caf50"
                  : darkMode
                  ? "rgba(255, 255, 255, 0.7)"
                  : "rgba(0, 0, 0, 0.6)",
                fontWeight: 600,
              }}
            >
              {areAllQuestionsCompleted()
                ? "All questions completed!"
                : `${
                    new Set(
                      submissions
                        .filter((s) => s.isCorrect)
                        .map((s) => s.question._id || s.question)
                    ).size
                  } of ${questions.length} questions completed`}
            </Typography>
          </Paper>

          {!areAllQuestionsCompleted() && (
            <Alert
              severity="info"
              variant="outlined"
              icon={<QuizIcon fontSize="inherit" />}
              sx={{
                borderRadius: 2,
                mb: 2,
                "& .MuiAlert-icon": {
                  alignItems: "center",
                  color: "#0088CC",
                },
                "& .MuiAlert-message": {
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <Typography variant="body2">
                You still have some unanswered or incorrect questions. You can
                continue working on them before ending the test.
              </Typography>
            </Alert>
          )}

          {areAllQuestionsCompleted() && (
            <Alert
              severity="success"
              variant="outlined"
              icon={<CheckCircleIcon fontSize="inherit" />}
              sx={{
                borderRadius: 2,
                mb: 2,
                "& .MuiAlert-icon": {
                  alignItems: "center",
                  color: "#4caf50",
                },
                "& .MuiAlert-message": {
                  color: darkMode
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <Typography variant="body2" fontWeight="500">
                Congratulations! You've correctly answered all questions.
              </Typography>
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: "space-between",
            bgcolor: darkMode ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
          }}
        >
          <Button
            onClick={() => setEndDialog(false)}
            sx={{
              color: darkMode
                ? "rgba(255, 255, 255, 0.7)"
                : "rgba(0, 0, 0, 0.6)",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
              },
            }}
          >
            Continue Test
          </Button>
          <Button
            onClick={() => endTest(false)}
            variant="contained"
            color={areAllQuestionsCompleted() ? "success" : "error"}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 1.5,
            }}
            startIcon={<FlagIcon />}
          >
            End Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PATestView;
