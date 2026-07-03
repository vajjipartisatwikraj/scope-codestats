import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Chip,
  Tab,
  Tabs,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Alert,
  Tooltip,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  alpha,
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  FormHelperText,
  Radio,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import CodeIcon from "@mui/icons-material/Code";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme as useAppTheme } from "../../contexts/ThemeContext";
import { formatTime, formatMemory } from "../../utils/formatting";
import Notes from "./Notes";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import TestCasesPanel from "./TestCasesPanel";
import CodeEditorPanel from "./CodeEditorPanel";
import SidebarNavigation from "./SidebarNavigation";
import SubmissionsPanel from "./SubmissionsPanel";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import QuestionReport from "./QuestionReport";
import LockIcon from "@mui/icons-material/Lock";

// Platform-aware modifier label for keyboard-shortcut hints
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD_KEY = IS_MAC ? "⌘" : "Ctrl";

// Direct code execution API calls to backend simpleCodeExecutionService
const codeExecutionApi = {
  // Secure endpoint that fetches test cases from database
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
        `${import.meta.env.VITE_API_URL}/compiler/execute-with-question`,
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

  // Simple code execution with custom stdin input (no test case comparison)
  runWithCustomInput: async (language, source_code, input) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/compiler/run`,
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
      console.error("Error running code with custom input:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Failed to run code"
      );
    }
  },
};

// Tab panel component with lazy loading optimization
function TabPanel(props) {
  const {
    children,
    value,
    index,
    loadOnce = false,
    hasLoaded = false,
    ...other
  } = props;

  // For lazy loading: only render children if tab is active OR if it should persist after first load
  const shouldRender = loadOnce ? hasLoaded : value === index;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`problem-tabpanel-${index}`}
      aria-labelledby={`problem-tab-${index}`}
      {...other}
      style={{ height: "100%", display: value === index ? "block" : "none" }}
    >
      {shouldRender && <Box sx={{ height: "100%" }}>{children}</Box>}
    </div>
  );
}

// IMPORTANT: Defined outside the component so the reference is stable across renders.
// If defined inside, a new object is created on every render (including every keystroke),
// causing unnecessary re-renders of child components like CodeEditorPanel.
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

const CohortProblem = () => {
  const { cohortId, moduleId, questionId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { user } = useAuth();
  const { darkMode } = useAppTheme();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [question, setQuestion] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [lastSubmittedCode, setLastSubmittedCode] = useState(""); // Track last submitted code
  const [isQuestionSolved, setIsQuestionSolved] = useState(false); // Track if question is already solved
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [testResultsSummary, setTestResultsSummary] = useState(null); // Summary from backend
  const [submissions, setSubmissions] = useState([]);
  const [allUsersSubmissions, setAllUsersSubmissions] = useState([]);
  const [languageAnchorEl, setLanguageAnchorEl] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const resizerRef = useRef(null);
  const [testCasesPanelHeight, setTestCasesPanelHeight] = useState(50);
  const [isResizingTestPanel, setIsResizingTestPanel] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const testPanelResizerRef = useRef(null);
  const codeEditorRef = useRef(null); // Ref for CodeEditorPanel

  // Custom Input state
  const [activeInputTab, setActiveInputTab] = useState(0); // 0 = Test Cases, 1 = Custom Input
  const [customInput, setCustomInput] = useState("");
  const [customOutput, setCustomOutput] = useState(null); // { output, error, time, memory, status }

  // Test panel mode: "testrun" (parsed test cases + submit enabled) or
  // "debug" (raw stdin + custom input, submit disabled)
  const [panelMode, setPanelMode] = useState("testrun");

  // Fold/unfold state for the right side: null (both expanded), "editor"
  // (editor folded → header only), or "test" (test panel folded → header only)
  const [collapsedPanel, setCollapsedPanel] = useState(null);

  const toggleEditorCollapse = () =>
    setCollapsedPanel((prev) => (prev === "editor" ? null : "editor"));
  const toggleTestCollapse = () =>
    setCollapsedPanel((prev) => (prev === "test" ? null : "test"));

  // Fold/unfold state for the left problem-description panel (horizontal collapse)
  const [descCollapsed, setDescCollapsed] = useState(false);

  // Problem List overlay — expands the blue sidebar into a panel with the
  // module's question list (rendered inside SidebarNavigation).
  const [problemListOpen, setProblemListOpen] = useState(false);

  // Cooldown to prevent rapid repeated Run/Submit (shared across run & submit)
  const lastExecRef = useRef(0);
  const EXEC_COOLDOWN_MS = 3000;
  const canExecuteNow = () => {
    const now = Date.now();
    if (now - lastExecRef.current < EXEC_COOLDOWN_MS) {
      toast.warn("Please wait before your next run/submit", {
        position: "top-center",
        autoClose: 1800,
        hideProgressBar: true,
        toastId: "exec-cooldown", // reuse one toast so spamming shows only one
      });
      return false;
    }
    lastExecRef.current = now;
    return true;
  };

  // Keyboard shortcuts — refs hold the latest handlers/state so the listener
  // can be registered once. Run = Ctrl/Cmd + '   Submit = Ctrl/Cmd + Enter
  const runCodeRef = useRef(null);
  const submitSolutionRef = useRef(null);
  const shortcutStateRef = useRef({});

  useEffect(() => {
    const handleKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const s = shortcutStateRef.current;
      if (s.questionType !== "programming") return;

      // Submit: Ctrl/Cmd + Enter
      if (e.key === "Enter") {
        e.preventDefault();
        if (!s.running && !s.submitting && s.activeInputTab !== 1) {
          submitSolutionRef.current && submitSolutionRef.current();
        }
        return;
      }
      // Run: Ctrl/Cmd + '
      if (e.key === "'") {
        e.preventDefault();
        if (!s.running && !s.submitting) {
          runCodeRef.current && runCodeRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Toggle between Debug and Test Run modes.
  const handlePanelModeChange = (mode) => {
    setPanelMode(mode);
    // The Custom Input tab only exists in Debug mode, so when returning to
    // Test Run mode make sure the Test Cases tab (index 0) is active.
    if (mode === "testrun") {
      setActiveInputTab(0);
    }
  };

  // Add state for MCQ
  const [selectedMcqOption, setSelectedMcqOption] = useState(null);
  const [mcqSubmissionResult, setMcqSubmissionResult] = useState(null);

  // Add state for editorial loading
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [editorialAccessDenied, setEditorialAccessDenied] = useState(false);

  // Track which tabs have been loaded to avoid redundant API calls
  const [loadedTabs, setLoadedTabs] = useState({
    0: true, // Problem tab - always loaded first
    1: false, // Editorial
    2: false, // Submissions
    3: false, // Report
    4: false, // Notes
  });

  // Reset MCQ state when question changes
  useEffect(() => {
    setSelectedMcqOption(null);
    setMcqSubmissionResult(null);
    setOutput("");
    setTestResults([]);
    setActiveTab(0); // Reset to Problem tab
  }, [questionId]);

  // Fetch question details on component mount
  useEffect(() => {
    fetchQuestionDetails();
    // REMOVED: fetchAllSubmissions() - now lazy loaded only when Submissions tab is opened

    // Simplified session storage restoration - only for emergency page refresh scenarios
    const savedState = sessionStorage.getItem("cohortProblem_state");
    if (savedState && savedState !== "undefined") {
      try {
        const parsedState = JSON.parse(savedState);

        // Only restore if it's the same question and we have submission data
        if (
          parsedState.questionId === questionId &&
          parsedState.cohortId === cohortId &&
          parsedState.moduleId === moduleId &&
          parsedState.code &&
          parsedState.submission
        ) {
          // Restore essential state
          if (parsedState.code) {
            setCode(parsedState.code);
            setLastSubmittedCode(parsedState.code);
          }
          if (parsedState.language) {
            setLanguage(parsedState.language);
          }
          if (parsedState.testResults) {
            setTestResults(parsedState.testResults);
          }
        }

        // Clean up after restoration to prevent interference
        sessionStorage.removeItem("cohortProblem_state");
      } catch (error) {
        console.error("Error restoring submission state:", error);
        sessionStorage.removeItem("cohortProblem_state");
      }
    }
  }, [cohortId, moduleId, questionId, token]);

  // Handle language changes - load code for selected language
  useEffect(() => {
    if (!question || !language) return;

    // Find submission for this language
    const submissionForLang = submissions.find(s => s.language === language);
    
    if (submissionForLang && submissionForLang.code) {
      // Load previous submission for this language
      setCode(submissionForLang.code);
    } else {
      // No submission for this language - load boilerplate
      const langInfo = question.languages?.find(l => l.name === language);
      setCode(langInfo?.boilerplateCode || LANGUAGES[language]?.defaultCode || '');
    }
  }, [language, question, submissions, isQuestionSolved]);

  // Fetch question details
  const fetchQuestionDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Get the question data object
      const questionData = response.data;
      setQuestion(questionData);

      // Store all submissions
      const allSubmissions = (questionData.submissions && Array.isArray(questionData.submissions))
        ? questionData.submissions
        : [];
      setSubmissions(allSubmissions);

      // Check if question is solved
      const hasAcceptedSubmission = allSubmissions.some(
        (sub) => sub.status === "accepted"
      );
      setIsQuestionSolved(hasAcceptedSubmission);

      // For MCQ questions: if already solved, pre-populate the selected option and lock the UI
      if (questionData.type === "mcq" && hasAcceptedSubmission) {
        const acceptedSub = allSubmissions.find(
          (sub) => sub.status === "accepted"
        );
        if (acceptedSub?.selectedOption && questionData.options) {
          // Find the option text by matching the selectedOption ObjectId
          const matchedOption = questionData.options.find(
            (opt) => opt._id === acceptedSub.selectedOption || opt._id?.toString() === acceptedSub.selectedOption?.toString()
          );
          if (matchedOption) {
            setSelectedMcqOption(matchedOption.text);
            setMcqSubmissionResult({
              isCorrect: true,
              feedback: "Correct answer! 🎉",
              selectedOption: matchedOption.text,
            });
          }
        }
      }

      // Always load based on default language and submissions
      const defaultLang = questionData.defaultLanguage || 'cpp';
      setLanguage(defaultLang);

      // Find submission for default language
      const submissionForLang = allSubmissions.find(s => s.language === defaultLang);

      if (submissionForLang && submissionForLang.code) {
        setCode(submissionForLang.code);
      } else {
        const langInfo = questionData.languages?.find(l => l.name === defaultLang);
        setCode(langInfo?.boilerplateCode || LANGUAGES[defaultLang]?.defaultCode || '');
      }
    } catch (error) {
      console.error("❌ Error fetching question details:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);

      // Check for unpublished cohort error
      if (
        error.response?.status === 403 &&
        error.response?.data?.error === "COHORT_UNPUBLISHED"
      ) {
        toast.error("This cohort is not published yet");
        navigate(`/cohorts`);
        return;
      }

      toast.error("Failed to fetch question details");
      navigate(`/cohorts/${cohortId}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's submission history (loaded when Submissions tab is clicked)
  const fetchMySubmissions = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/questions/${questionId}/submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSubmissions(response.data || []);
    } catch (error) {
      console.error("❌ Error fetching my submissions:", error);
      setSubmissions([]);
    }
  };

  // Add a new function to fetch all users' submissions
  const fetchAllSubmissions = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/all-submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setAllUsersSubmissions(response.data || []);
    } catch (error) {
      console.error("❌ Error fetching all users submissions:", error);

      // Check if access is denied due to no accepted submission
      if (
        error.response?.status === 403 &&
        error.response?.data?.error === "NO_ACCEPTED_SUBMISSION"
      ) {
        toast.info(
          "Solve the question correctly first to view others' submissions"
        );
      }

      setAllUsersSubmissions([]);
    }
  };

  // Fetch editorial (lazy loaded when Editorial tab is opened)
  const fetchEditorial = async () => {
    setEditorialLoading(true);
    setEditorialAccessDenied(false);

    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/questions/${questionId}/editorial`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update the question object with the editorial
      setQuestion((prev) => ({
        ...prev,
        editorial: response.data.editorial,
      }));
      setEditorialAccessDenied(false);
    } catch (error) {
      console.error("❌ Error fetching editorial:", error);

      // Check if access is denied due to no accepted submission
      if (
        error.response?.status === 403 &&
        error.response?.data?.error === "NO_ACCEPTED_SUBMISSION"
      ) {
        toast.info("Solve the question correctly first to view the editorial");
        setEditorialAccessDenied(true);
        setQuestion((prev) => ({
          ...prev,
          editorial: "", // Clear editorial
        }));
      }
    } finally {
      setEditorialLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);

    // Lazy load data only when tab is first opened
    if (!loadedTabs[newValue]) {
      switch (newValue) {
        case 1: // Editorial tab
          fetchEditorial(); // Load editorial when tab is opened
          break;

        case 2: // Submissions tab
          fetchMySubmissions(); // Load user's own submissions when tab is opened
          // All users' submissions will be loaded when "All Users" sub-tab is clicked in SubmissionsPanel
          break;

        case 3: // Report tab
          break;

        case 4: // Notes tab
          break;

        default:
          break;
      }

      // Mark this tab as loaded
      setLoadedTabs((prev) => ({ ...prev, [newValue]: true }));
    }
  };

  // Handle language change
  const handleLanguageClick = (event) => {
    setLanguageAnchorEl(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageAnchorEl(null);
  };

  const selectLanguage = (lang) => {
    setLanguage(lang);
    handleLanguageMenuClose();
  };

  // Enhanced function to run against test cases
  const runTestCases = async (submitSolution = false) => {
    if (!question || !question.testCases || question.testCases.length === 0) {
      toast.error("No test cases available for this question");
      return null;
    }

    // Get code for submission (removes markers if Fill in the Blank mode)
    let codeToSubmit = code;
    if (
      question?.fillInTheBlank &&
      codeEditorRef.current?.getCodeForSubmission
    ) {
      codeToSubmit = codeEditorRef.current.getCodeForSubmission();
    }

    setRunning(true);
    setOutput("");
    setTestResults([]); // Clear previous results

    try {
      if (submitSolution) {
        // SUBMIT MODE: Use secure endpoint that fetches ALL test cases from database
        // This prevents hidden test cases from being exposed to frontend
        // Call new secure endpoint - no test cases sent from frontend!
        // Backend will use question's constraints (timeLimit, memoryLimit)
        const result = await codeExecutionApi.executeWithQuestion(
          language,
          codeToSubmit, // Use cleaned code
          questionId,
          "submit", // This tells backend to execute ALL test cases (including hidden)
          {} // Empty options - let backend use question's constraints
        );

        // Check for compilation or runtime errors in multiple ways:
        // 1. Backend returns success: false with error message
        // 2. Backend returns success: true but all results have status: 'error'
        // 3. Backend returns execution.status with "Compilation Error"

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
          const isRuntimeError = errorMsg
            .toLowerCase()
            .includes("runtime");

          // Create error results based on what backend returned
          // Backend will return results with hidden flag set properly
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
              : []; // Empty array if no results available

          setTestResults(errorResults);
          setRunning(false);
          return errorResults;
        }

        // Extract execution time and memory from the result (only when successful)
        // Backend returns: { execution: { time: "0.336", memory: 40204 }, results: [...] }
        const executionTimeInMs = result.execution?.time
          ? Math.round(parseFloat(result.execution.time) * 1000) // Convert seconds to milliseconds
          : 0;
        const memoryUsedInKB = result.execution?.memory || 0;

        // Convert results to match the expected format
        // Backend now includes the 'hidden' flag in each result
        const processedResults = result.results.map((testResult, index) => {
          return {
            testCaseId: `test-case-${index}`,
            input: testResult.input || "",
            expectedOutput: testResult.expected || "",
            actualOutput: testResult.got || "",
            passed: testResult.status === "passed",
            hidden: testResult.hidden || false, // Backend provides hidden flag
            executionTime: executionTimeInMs, // Use extracted execution time
            memoryUsed: memoryUsedInKB, // Use extracted memory
            error: testResult.error || "", // Include error field for TLE/MLE/Runtime errors
            _isSubmission: true,
          };
        });

        // Set ALL results for internal processing, but TestCasesPanel will filter
        setTestResults(processedResults);
        
        // Store summary data if available (for submit mode)
        if (result.summary) {
          setTestResultsSummary(result.summary);
        }

        setRunning(false);
        return processedResults;
      } else {
        // RUN MODE: Use secure endpoint that fetches only VISIBLE test cases from database
        // Call new secure endpoint - backend will fetch and execute only visible test cases
        // Backend will use question's constraints (timeLimit, memoryLimit)
        const result = await codeExecutionApi.executeWithQuestion(
          language,
          codeToSubmit, // Use cleaned code
          questionId,
          "run", // This tells backend to execute ONLY visible test cases
          {} // Empty options - let backend use question's constraints
        );

        // Check if there's a compilation error or execution failure
        const hasRunCompilationError = !result.success ||
          result.execution?.status?.toLowerCase().includes("compilation");
        const hasRunRuntimeError = result.execution?.status?.toLowerCase().includes("runtime") ||
          (result.results && result.results.length > 0 && result.results.every(
            r => r.status === 'error' && r.error?.toLowerCase().includes('runtime')
          ));

        if (hasRunCompilationError || hasRunRuntimeError) {
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
          return errorResults;
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

        setRunning(false);
        return processedResults;
      }
    } catch (error) {
      console.error("Test execution error:", error);

      // Check for unpublished cohort error
      if (
        error.response?.status === 403 &&
        error.response?.data?.error === "COHORT_UNPUBLISHED"
      ) {
        toast.error("This cohort is not published yet");
        setRunning(false);
        navigate(`/cohorts`);
        return null;
      }

      setRunning(false);
      return null;
    }
  };

  // Handle selecting an MCQ option
  const handleSelectMcqOption = (optionId) => {
    setSelectedMcqOption(optionId);
    setMcqSubmissionResult(null); // Clear previous result when selecting a new option
  };

  // Get question completion status based on submissions
  const getQuestionStatus = () => {
    if (!submissions || submissions.length === 0) {
      return "not_attempted";
    }

    // Check if any submission is accepted
    const hasAcceptedSubmission = submissions.some(
      (submission) => submission.status === "accepted"
    );

    if (hasAcceptedSubmission) {
      return "completed";
    }

    // If there are submissions but none are accepted, it's attempted
    return "attempted";
  };

  // Render status icon based on question completion
  const renderStatusIcon = () => {
    const status = getQuestionStatus();

    switch (status) {
      case "completed":
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "#4caf50",
                fontWeight: "medium",
                fontSize: "0.9rem",
              }}
            >
              Solved
            </Typography>
            <CheckIcon
              sx={{
                color: "#4caf50",
                fontSize: "1.2rem",
              }}
            />
          </Box>
        );
      case "attempted":
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "#ff9800",
                fontWeight: "medium",
                fontSize: "0.9rem",
              }}
            >
              Attempted
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  // Handle running code - executes only unhidden test cases
  const handleRunCode = async () => {
    if (!canExecuteNow()) return;
    // If Custom Input tab is active, run with custom input instead
    if (activeInputTab === 1) {
      await handleRunCustomInput();
      return;
    }
    await runTestCases(false); // false = run mode (only visible test cases)
  };

  // Handle running code with custom input — calls /compiler/run endpoint
  // Returns raw stdout/stderr without parsing against expected outputs
  const handleRunCustomInput = async () => {
    if (!customInput.trim()) {
      toast.error("Please enter custom input");
      return;
    }

    // Get code for submission (removes markers if Fill in the Blank mode)
    let codeToSubmit = code;
    if (question?.fillInTheBlank && codeEditorRef.current?.getCodeForSubmission) {
      codeToSubmit = codeEditorRef.current.getCodeForSubmission();
    }

    setRunning(true);
    setCustomOutput(null); // Clear previous output

    try {
      const result = await codeExecutionApi.runWithCustomInput(
        language,
        codeToSubmit,
        customInput
      );

      if (result.success) {
        setCustomOutput({
          output: result.result.output || "",
          error: null,
          time: result.result.time,
          memory: result.result.memory,
          status: result.result.status,
        });
      } else {
        // Execution finished but with error (compilation error, runtime error, etc.)
        const errorMsg = result.result?.error || result.result?.status || "Execution failed";
        setCustomOutput({
          output: "",
          error: errorMsg,
          time: result.result?.time,
          memory: result.result?.memory,
          status: result.result?.status || "Error",
        });
      }
    } catch (error) {
      console.error("Custom input execution error:", error);
      setCustomOutput({
        output: "",
        error: error.message || "Execution failed",
        time: null,
        memory: null,
        status: "Error",
      });
    } finally {
      setRunning(false);
    }
  };

  // Handle submitting solution - executes ALL test cases
  const handleSubmitSolution = async () => {
    if (question.type === "mcq") {
      await handleSubmitMcqAnswer();
    } else if (question.type === "programming") {
      if (!canExecuteNow()) return;
      // Always open the submission view in the test-case panel: force Test Run
      // mode and the Test Cases tab so the submit animation and performance
      // summary are shown (even if the user submitted from Debug mode).
      handlePanelModeChange("testrun");
      setActiveInputTab(0);
      setSubmitting(true);

      try {
        // Run ALL test cases to get results
        const testResults = await runTestCases(true); // true = submit mode (all test cases)

        if (!testResults) {
          setSubmitting(false);
          return;
        }

        // Code execution done — clear the submitting state so the button resets
        // and the rocket animation can transition to success/failure.
        // The backend save below is just bookkeeping.
        setSubmitting(false);

        // Check if all tests passed
        const allPassed =
          testResults.length > 0 && testResults.every((r) => r.passed === true);

        // Calculate overall execution time and memory usage
        const maxExecutionTime =
          testResults.length > 0
            ? Math.max(
                ...testResults.map((r) =>
                  typeof r.executionTime === "number" ? r.executionTime : 0
                )
              )
            : 0;
        const maxMemoryUsed =
          testResults.length > 0
            ? Math.max(
                ...testResults.map((r) =>
                  typeof r.memoryUsed === "number" ? r.memoryUsed : 0
                )
              )
            : 0;

        // Prepare submission data for backend
        const submission = {
          code,
          language,
          submissionType: "programming",
          testCaseResults: testResults.map((r) => ({
            // Don't send testCaseId - it's not needed and causes validation errors
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

        // Submit to backend
        const response = await axios.post(
          `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/submit`,
          submission,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Update submissions state directly instead of refetching everything
        // Backend returns { submission, isCorrect, userProgress }
        const newSubmission = response.data.submission;

        if (newSubmission) {
          // Add the new submission to the existing submissions array
          setSubmissions((prevSubmissions) => [
            newSubmission,
            ...prevSubmissions,
          ]);

          // Update both code state and lastSubmittedCode to show submitted code
          setLastSubmittedCode(code);

          // If this submission was accepted, mark question as solved
          if (newSubmission.status === "accepted") {
            setIsQuestionSolved(true);
          }

          // Toast already shown by runTestCases, no extra toast needed here

        } else {
          toast.error("Failed to save submission");
        }
      } catch (error) {
        console.error("Submission error:", error);

        // Check for unpublished cohort error
        if (
          error.response?.status === 403 &&
          error.response?.data?.error === "COHORT_UNPUBLISHED"
        ) {
          toast.error("This cohort is not published yet");
          setSubmitting(false);
          navigate(`/cohorts`);
          return;
        }

        toast.error("Submission failed");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Handle submitting MCQ answer
  const handleSubmitMcqAnswer = async () => {
    if (!selectedMcqOption) {
      toast.warn("Please select an answer first");
      return;
    }

    setSubmitting(true);
    try {
      // Find the option object with the matching text
      const selectedOption = question.options.find(
        (opt) => opt.text === selectedMcqOption
      );

      if (!selectedOption) {
        toast.error("Invalid option selected");
        setSubmitting(false);
        return;
      }

      // Prepare submission data
      const submission = {
        submissionType: "mcq",
        selectedOption: selectedOption._id,
        isCorrect: selectedOption.isCorrect,
      };

      // Submit to backend
      const response = await axios.post(
        `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions/${questionId}/submit`,
        submission,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Save result for displaying feedback
      setMcqSubmissionResult({
        isCorrect: selectedOption.isCorrect,
        feedback: selectedOption.isCorrect
          ? "Correct answer! 🎉"
          : "Incorrect answer",
        selectedOption: selectedOption.text,
      });

      // Update submissions state directly
      // Backend returns { submission, isCorrect, userProgress }
      const newSubmission = response.data.submission;
      if (newSubmission) {
        setSubmissions((prevSubmissions) => [
          newSubmission,
          ...prevSubmissions,
        ]);

        // If MCQ answer was correct, mark question as solved
        if (selectedOption.isCorrect) {
          setIsQuestionSolved(true);
        }
      }

      // Show success/failure toast
      if (selectedOption.isCorrect) {
        toast.success("Correct answer! 🎉");
      } else {
        toast.warn("Incorrect answer");
      }

      // Don't call these methods that cause page refresh
      // fetchQuestionDetails();
      // fetchAllSubmissions();
    } catch (error) {
      // Check for unpublished cohort error
      if (
        error.response?.status === 403 &&
        error.response?.data?.error === "COHORT_UNPUBLISHED"
      ) {
        toast.error("This cohort is not published yet");
        setSubmitting(false);
        navigate(`/cohorts`);
        return;
      }

      toast.error(
        "Failed to submit answer: " + (error.message || "Unknown error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Keep track of test case runs and submissions in the useEffect
  useEffect(() => {
    // When testResults change, log debug information
    if (testResults && testResults.length > 0) {
      const isSubmission = testResults.some(
        (r) => r._isSubmission === true || r.hidden === true
      );
    }
  }, [testResults]);

  // Navigate back to cohort page
  const handleBack = () => {
    navigate(`/cohorts/${cohortId}`);
  };

  // Add drag handling functions
  const startResize = (e) => {
    setIsResizing(true);
    setResizeStartX(e.clientX);
  };

  const stopResize = () => {
    setIsResizing(false);
  };

  const resize = (e) => {
    if (!isResizing) return;

    const containerWidth = document.body.clientWidth;
    const delta = e.clientX - resizeStartX;
    const deltaPercent = (delta / containerWidth) * 100;

    const newLeftWidth = Math.min(
      Math.max(20, leftPanelWidth + deltaPercent),
      80
    );
    setLeftPanelWidth(newLeftWidth);
    setResizeStartX(e.clientX);
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

  // Add event listeners for mouse movements (for both resizers)
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    }

    if (isResizingTestPanel) {
      document.addEventListener("mousemove", resizeTestPanel);
      document.addEventListener("mouseup", stopTestPanelResize);
    }

    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
      document.removeEventListener("mousemove", resizeTestPanel);
      document.removeEventListener("mouseup", stopTestPanelResize);
    };
  }, [
    isResizing,
    resize,
    stopResize,
    leftPanelWidth,
    resizeStartX,
    isResizingTestPanel,
    resizeTestPanel,
    stopTestPanelResize,
    testCasesPanelHeight,
    resizeStartY,
  ]);

  // Add a quick collapse/expand function
  const togglePanelSize = () => {
    if (leftPanelWidth > 25) {
      // If panel is expanded, collapse it
      setLeftPanelWidth(15);
    } else {
      // If panel is collapsed, expand it
      setLeftPanelWidth(50);
    }
  };

  // Add a double-click handler for the left panel resizer
  const handleLeftResizerDoubleClick = () => {
    togglePanelSize();
  };

  // Check language display and dropdown based on question type
  const renderLanguageSelector = () => {
    if (!question) return null;

    // For MCQ questions, don't show language selector
    if (question.type === "mcq") {
      return (
        <Button
          variant="outlined"
          size="small"
          disabled={true}
          sx={{
            height: 36,
            borderRadius: "4px",
            color: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
            borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            textTransform: "none",
            px: 2,
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.02)",
          }}
        >
          MCQ Question
        </Button>
      );
    }

    return (
      <>
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          sx={{
            height: 36,
            borderRadius: "4px",
            color: darkMode ? "#fff" : "#000",
            borderColor: darkMode
              ? "rgba(255,255,255,0.3)"
              : "rgba(0,0,0,0.23)",
            textTransform: "none",
            px: 2,
            backgroundColor: darkMode
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.02)",
            "&:hover": {
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            },
          }}
          onClick={handleLanguageClick}
        >
          {language?.toUpperCase() || "CPP"}
        </Button>

        <Menu
          anchorEl={languageAnchorEl}
          open={Boolean(languageAnchorEl)}
          onClose={handleLanguageMenuClose}
        >
          {Object.keys(LANGUAGES).map((lang) => (
            <MenuItem
              key={lang}
              onClick={() => selectLanguage(lang)}
              selected={language === lang}
            >
              {LANGUAGES[lang].name}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  };

  const handleFormatCode = () => {
    // TODO: Implement code formatting
    toast.info("Code formatting not implemented yet");
  };

  const renderMcqOptions = () => {
    if (!question || question.type !== "mcq") return null;
    const isSubmitted = !!mcqSubmissionResult;
    const isAlreadySolved = isQuestionSolved && isSubmitted;
    const correctOption = question.options.find((opt) => opt.isCorrect);

    return (
      <Box
        sx={{
          maxWidth: "90%",
          width: "800px",
          mx: "auto",
          mt: 4,
          mb: 4,
        }}
      >
        <FormControl component="fieldset" fullWidth>
          <FormLabel
            component="legend"
            sx={{
              fontSize: "1.25rem",
              mb: 3,
              color: isAlreadySolved
                ? "#4caf50"
                : darkMode ? "#fff" : "#222",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {isAlreadySolved
              ? "You've already answered this correctly \u2714"
              : "Select the correct answer:"}
          </FormLabel>

          <RadioGroup
            name="mcqOption"
            value={selectedMcqOption || ""}
            onChange={(e) => handleSelectMcqOption(e.target.value)}
          >
            {question.options.map((option, idx) => {
              const isSelected = selectedMcqOption === option.text;
              const isCorrectOption = option.isCorrect === true;
              const showCorrect = isSubmitted && isCorrectOption;
              const showIncorrect =
                isSubmitted && isSelected && !isCorrectOption;

              return (
                <Box
                  key={idx}
                  sx={{
                    mb: 2.5,
                    borderRadius: 2,
                    overflow: "hidden",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Paper
                    elevation={isSelected ? 4 : 1}
                    sx={{
                      border: "1px solid",
                      borderColor: showCorrect
                        ? "#4caf50"
                        : showIncorrect
                        ? "#f44336"
                        : isSelected
                        ? darkMode
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.1)"
                        : "transparent",
                      borderRadius: 2,
                      transition: "all 0.2s",
                      bgcolor: showCorrect
                        ? darkMode
                          ? "rgba(76,175,80,0.15)"
                          : "rgba(76,175,80,0.08)"
                        : showIncorrect
                        ? darkMode
                          ? "rgba(244,67,54,0.15)"
                          : "rgba(244,67,54,0.08)"
                        : darkMode
                        ? "rgba(255,255,255,0.05)"
                        : "#fff",
                      "&:hover": {
                        bgcolor: isSubmitted
                          ? undefined
                          : darkMode
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.03)",
                        borderColor: isSubmitted
                          ? undefined
                          : theme.palette.primary.main,
                      },
                    }}
                  >
                    <FormControlLabel
                      value={option.text}
                      control={
                        <Radio
                          color={
                            showCorrect
                              ? "success"
                              : showIncorrect
                              ? "error"
                              : "primary"
                          }
                          disabled={isSubmitted}
                          sx={{ ml: 2 }}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            fontWeight: isSelected ? 600 : 400,
                            color: darkMode ? "#fff" : "#222",
                            fontSize: "1rem",
                            ml: 0.5,
                            display: "flex",
                            alignItems: "center",
                            "& svg": {
                              ml: 1,
                              fontSize: "1.2rem",
                            },
                          }}
                        >
                          {option.text}
                          {showCorrect && <CheckIcon color="success" />}
                          {showIncorrect && <CloseIcon color="error" />}
                        </Typography>
                      }
                      sx={{
                        py: 0.8,
                        px: 1,
                        m: 0,
                        width: "100%",
                      }}
                    />
                  </Paper>
                </Box>
              );
            })}
          </RadioGroup>

          {isSubmitted && (
            <Alert
              severity={mcqSubmissionResult?.isCorrect ? "success" : "error"}
              sx={{ mt: 2, mb: 3 }}
            >
              <Typography variant="body1" fontWeight={500}>
                {mcqSubmissionResult?.isCorrect
                  ? "Correct! 🎉"
                  : `Incorrect. The correct answer is: ${correctOption?.text}`}
              </Typography>
            </Alert>
          )}

          {!isAlreadySolved && (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitted || !selectedMcqOption || submitting}
                onClick={handleSubmitMcqAnswer}
                sx={{
                  minWidth: 180,
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: "0 4px 10px rgba(0, 136, 204, 0.3)",
                }}
              >
                {submitting
                  ? "Submitting..."
                  : isSubmitted
                  ? "Submitted"
                  : "Submit"}
              </Button>
            </Box>
          )}
        </FormControl>
      </Box>
    );
  };

  // Keep shortcut refs pointing at the latest handlers/state each render
  runCodeRef.current = handleRunCode;
  submitSolutionRef.current = handleSubmitSolution;
  shortcutStateRef.current = {
    running,
    submitting,
    activeInputTab,
    questionType: question?.type,
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        zIndex: 1200,
        m: 0,
        p: 0,
        bgcolor: darkMode ? "#0e1117" : "#f5f7fa",
        display: "flex",
      }}
    >
      {/* Add Sidebar Navigation */}
      <SidebarNavigation
        darkMode={darkMode}
        problemListOpen={problemListOpen}
        onCloseProblemList={() => setProblemListOpen(false)}
      />


      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          height: "100%",
          ml: "60px", // Updated from 90px to match the new sidebar width
          width: "calc(100% - 80px)", // Updated from 90px to match the new sidebar width
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Navigation Bar */}
        <Box
          sx={{
            borderBottom: "1px solid #232528",
            bgcolor: darkMode ? "#0A0C10" : "#FFFFFF",
            minHeight: "48px",
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 0.5,
            backgroundImage: darkMode
              ? "linear-gradient(to right, rgba(10, 12, 16, 0.7), rgba(8, 9, 12, 0.7))"
              : "linear-gradient(to right, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.9))",
          }}
        >
          {/* Problem/Editorial/Submissions/Report/Notes switcher moved into the
              left description panel and rendered as buttons (see below). */}

          {/* Problem List button — opens the module's problem list overlay */}
          <Button
            onClick={() => setProblemListOpen(true)}
            startIcon={<FormatListBulletedIcon sx={{ fontSize: 18 }} />}
            endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}
            sx={{
              height: 36,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              borderRadius: "8px",
              px: 1.5,
              color: darkMode ? "#fff" : "#0f172a",
              "&:hover": {
                bgcolor: darkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              },
            }}
          >
            Problem List
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Removed language selector */}

            {/* Add Run and Submit buttons to top navigation - only for programming questions */}
            {question?.type === "programming" && (
              <>
                <Tooltip title={`Run Code (${MOD_KEY} + ')`} arrow>
                  <span>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleRunCode}
                      disabled={running || submitting || (activeInputTab === 1 && !customInput.trim())}
                      startIcon={<PlayArrowIcon />}
                      sx={{
                        height: 36,
                        textTransform: "none",
                        borderRadius: "4px",
                        px: 2,
                        bgcolor: darkMode
                          ? "rgba(0, 136, 204, 0.05)"
                          : "rgba(0, 136, 204, 0.02)",
                      }}
                    >
                      {running ? "Running..." : "Run Code"}
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip title={`Submit (${MOD_KEY} + Enter)`} arrow>
                  <span>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSubmitSolution}
                      disabled={running || submitting || activeInputTab === 1}
                      sx={{
                        height: 36,
                        textTransform: "none",
                        borderRadius: "4px",
                        px: 2,
                        backgroundColor: activeInputTab === 1 ? (darkMode ? "#333" : "#ccc") : "#01780F",
                        "&:hover": {
                          backgroundColor: activeInputTab === 1 ? (darkMode ? "#333" : "#ccc") : "#015c0c",
                        },
                      }}
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexGrow: 1,
              overflow: "hidden",
              height: "calc(100vh - 48px)",
              width: "100%",
              m: 0,
              p: 0,
            }}
          >
            {question ? (
              <>
                {/* Problem Description Panel */}
                <Box
                  sx={{
                    width: descCollapsed ? "48px" : `${leftPanelWidth}%`,
                    flexShrink: 0,
                    height: "calc(100% - 16px)",
                    border: "1px solid",
                    borderColor: darkMode
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.12)",
                    borderRadius: "12px",
                    overflow: descCollapsed ? "hidden" : "auto",
                    bgcolor: darkMode ? "#0A0A0A" : "#FFFFFF",
                    p: 0,
                    my: 1,
                    ml: 1,
                    mr: 0.25,
                    transition: isResizing ? "none" : "width 0.1s ease",
                    "&::-webkit-scrollbar": {
                      width: "8px",
                      height: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: darkMode
                        ? "rgba(0, 0, 0, 0.1)"
                        : "rgba(0, 0, 0, 0.05)",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: darkMode
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                      borderRadius: "4px",
                      border: "2px solid",
                      borderColor: darkMode ? "#0a0b0f" : "#ffffff",
                    },
                  }}
                >
                  {/* Collapsed strip — just an unfold button */}
                  {descCollapsed && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        pt: 1,
                      }}
                    >
                      <Button
                        onClick={() => setDescCollapsed(false)}
                        aria-label="Unfold description"
                        sx={{
                          minWidth: "auto",
                          p: 0.5,
                          color: darkMode ? "#aaa" : "#555",
                          "&:hover": {
                            bgcolor: "transparent",
                            color: darkMode ? "#fff" : "#000",
                          },
                        }}
                      >
                        <KeyboardArrowDownIcon
                          sx={{ fontSize: "1.3rem", transform: "rotate(-90deg)" }}
                        />
                      </Button>
                    </Box>
                  )}

                  {!descCollapsed && (
                    <>
                  {/* Section switcher — buttons separated by | */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      px: 2,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                      position: "sticky",
                      top: 0,
                      zIndex: 5,
                      bgcolor: darkMode ? "#0A0A0A" : "#FFFFFF",
                    }}
                  >
                    {[
                      { label: "Problem" },
                      { label: "Editorial" },
                      { label: "Submissions" },
                      { label: "Report" },
                      { label: "Notes" },
                    ].map((t, i) => (
                      <React.Fragment key={t.label}>
                        {i > 0 && (
                          <Box
                            component="span"
                            sx={{
                              mx: 0.5,
                              color: darkMode
                                ? "rgba(255,255,255,0.25)"
                                : "rgba(0,0,0,0.25)",
                              userSelect: "none",
                            }}
                          >
                            |
                          </Box>
                        )}
                        <Button
                          onClick={() => handleTabChange(null, i)}
                          startIcon={t.icon || null}
                          disableRipple
                          sx={{
                            minWidth: "auto",
                            textTransform: "none",
                            fontSize: "0.875rem",
                            fontWeight: activeTab === i ? 700 : 500,
                            px: 1,
                            py: 0.25,
                            borderRadius: "4px",
                            color:
                              activeTab === i
                                ? darkMode
                                  ? "#fff"
                                  : theme.palette.primary.main
                                : darkMode
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(0,0,0,0.6)",
                            "& .MuiButton-startIcon": { mr: 0.5 },
                            "&:hover": {
                              bgcolor: "transparent",
                              color: darkMode ? "#fff" : theme.palette.primary.main,
                            },
                          }}
                        >
                          {t.label}
                        </Button>
                      </React.Fragment>
                    ))}
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                      onClick={() => setDescCollapsed(true)}
                      aria-label="Fold description"
                      sx={{
                        minWidth: "auto",
                        p: 0.5,
                        color: darkMode ? "#aaa" : "#555",
                        "&:hover": {
                          bgcolor: "transparent",
                          color: darkMode ? "#fff" : "#000",
                        },
                      }}
                    >
                      <KeyboardArrowDownIcon
                        sx={{ fontSize: "1.3rem", transform: "rotate(90deg)" }}
                      />
                    </Button>
                  </Box>

                  {/* Problem Title and Difficulty */}
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: "1px solid",
                      borderColor: darkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: "bold",
                          color: darkMode ? "#fff" : "#000",
                        }}
                      >
                        {question.title}
                      </Typography>
                      {renderStatusIcon()}
                    </Box>

                    {/* Statistics bar similar to the image */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        mt: 1.5,
                        color: darkMode
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.6)",
                        fontSize: "0.75rem",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: "medium",
                            fontSize: "0.75rem",
                            color: darkMode
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          Difficulty:
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            color:
                              question.difficultyLevel === "easy"
                                ? "#4caf50"
                                : question.difficultyLevel === "medium"
                                ? "#ff9800"
                                : "#f44336",
                          }}
                        >
                          {question.difficultyLevel
                            ? question.difficultyLevel.charAt(0).toUpperCase() +
                              question.difficultyLevel.slice(1)
                            : "Medium"}
                        </Typography>
                      </Box>

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: "medium",
                            fontSize: "0.75rem",
                            color: darkMode
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          Accuracy:
                        </Typography>
                        <Typography
                          component="span"
                          sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                        >
                          {question.stats &&
                          typeof question.stats.acceptanceRate === "number"
                            ? Math.round(question.stats.acceptanceRate)
                            : "35"}
                          %
                        </Typography>
                      </Box>

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: "medium",
                            fontSize: "0.75rem",
                            color: darkMode
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          Submissions:
                        </Typography>
                        <Typography
                          component="span"
                          sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                        >
                          {question.stats &&
                          typeof question.stats.totalSubmissions === "number"
                            ? question.stats.totalSubmissions
                            : "324K+"}
                        </Typography>
                      </Box>

                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: "medium",
                            fontSize: "0.75rem",
                            color: darkMode
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          Points:
                        </Typography>
                        <Typography
                          component="span"
                          sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                        >
                          {typeof question.marks === "number"
                            ? question.marks
                            : "4"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Problem Description - removed company and tag chips */}
                  <Box sx={{ p: 2 }}>
                    <Box
                      className="question-description"
                      sx={{
                        color: darkMode
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(0,0,0,0.85)",
                        lineHeight: 1.6,
                        fontSize: "15px",
                        mb: 3,
                        "& code": {
                          backgroundColor: darkMode
                            ? "rgba(0, 136, 204, 0.1)"
                            : "rgba(10, 102, 194, 0.08)",
                          color: darkMode ? "#0088cc" : "#0a66c2",
                          padding: "2px px",
                          borderRadius: "6px",
                          fontFamily:
                            '"Consolas", "Monaco", "Courier New", monospace',
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
                          fontFamily:
                            '"Consolas", "Monaco", "Courier New", monospace',
                        },
                        "& img": {
                          maxWidth: "100%",
                          height: "auto",
                          borderRadius: "8px",
                          margin: "16px 0",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        },
                        "& ul": {
                          margin: "16px 0",
                          paddingLeft: "24px",
                          listStyleType: "disc",
                          listStylePosition: "outside",
                        },
                        "& ol": {
                          margin: "16px 0",
                          paddingLeft: "24px",
                          listStyleType: "decimal",
                          listStylePosition: "outside",
                        },
                        "& li": {
                          margin: "8px 0",
                          display: "list-item",
                        },
                        "& blockquote": {
                          borderLeft: `4px solid ${theme.palette.primary.main}`,
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
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                          borderRadius: "8px",
                          padding: "0",
                          margin: "16px 0",
                          overflow: "hidden",
                          "& p:first-of-type": {
                            backgroundColor: darkMode
                              ? "rgba(0, 136, 204, 0.1)"
                              : "rgba(10, 102, 194, 0.08)",
                            padding: "12px 16px",
                            margin: "0",
                            fontWeight: "600",
                            fontSize: "0.9rem",
                            color: darkMode ? "#0088cc" : "#0a66c2",
                            borderBottom: `1px solid ${
                              darkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.1)"
                            }`,
                          },
                          "& ul": {
                            padding: "12px 16px 12px 40px",
                            margin: "0",
                          },
                        },
                        "& .warning": {
                          backgroundColor: darkMode
                            ? "rgba(255,152,0,0.1)"
                            : "#fff3e0",
                          border: `1px solid ${theme.palette.warning.main}`,
                          padding: "16px",
                          borderRadius: "8px",
                          margin: "16px 0",
                        },
                        "& h1, & h2, & h3, & h4, & h5, & h6": {
                          color: theme.palette.primary.main,
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
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                          borderRadius: "8px",
                          padding: "0",
                          margin: "0px 0",
                          overflow: "hidden",
                          fontFamily:
                            '"Consolas", "Monaco", "Courier New", monospace',
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
                          },
                          "& .label:first-of-type": {
                            borderRight: `1px solid ${
                              darkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.1)"
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
                              darkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.1)"
                            }`,
                          },
                        },
                        "& p:has(+ .example)": {
                          marginBottom: "15px",
                        },
                        "& table": {
                          width: "100%",
                          borderCollapse: "collapse",
                          margin: "10px 0",
                          fontFamily: "inherit",
                          border: `1px solid ${
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
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
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                        },
                        "& table thead th:not(:last-child)": {
                          borderRight: `1px solid ${
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                        },
                        "& table thead th:first-of-type": {
                          borderTopLeftRadius: "7px",
                        },
                        "& table thead th:last-child": {
                          borderTopRightRadius: "7px",
                        },
                        "& table tbody td": {
                          backgroundColor: "transparent",
                          padding: "12px 16px",
                          fontSize: "0.9rem",
                          color: darkMode
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(0,0,0,0.8)",
                          border: "none",
                        },
                        "& table tbody td:not(:last-child)": {
                          borderRight: `1px solid ${
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                        },
                        "& table tbody tr:not(:last-child) td": {
                          borderBottom: `1px solid ${
                            darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)"
                          }`,
                        },
                        "& table tbody tr:last-child td:first-of-type": {
                          borderBottomLeftRadius: "7px",
                        },
                        "& table tbody tr:last-child td:last-child": {
                          borderBottomRightRadius: "7px",
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: question.description }}
                    />

                    {/* Hints section */}
                    {question.hints && question.hints.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 2,
                            color: darkMode ? "#fff" : "#000",
                            fontWeight: 600,
                            fontSize: "1.1rem",
                          }}
                        >
                          <LightbulbOutlinedIcon
                            sx={{ mr: 1, color: "#FFD700" }}
                          />
                          Hints:
                        </Typography>

                        {question.hints.map((hint, index) => (
                          <Accordion
                            key={index}
                            sx={{
                              mb: 1,
                              bgcolor: darkMode
                                ? "rgba(255, 215, 0, 0.05)"
                                : "rgba(255, 215, 0, 0.1)",
                              border: "0px solid",
                              borderColor: "#FFD700",
                              borderRadius: "4px",
                              "&:before": {
                                display: "none",
                              },
                              "& .MuiAccordionSummary-root": {
                                minHeight: "48px",
                                "&.Mui-expanded": {
                                  minHeight: "48px",
                                },
                              },
                            }}
                          >
                            <AccordionSummary
                              expandIcon={
                                <ExpandMoreIcon sx={{ color: "#FFD700" }} />
                              }
                              sx={{
                                flexDirection: "row",
                                "& .MuiAccordionSummary-content": {
                                  margin: "12px 0",
                                },
                              }}
                            >
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <LightbulbIcon
                                  sx={{
                                    mr: 1,
                                    color: "#FFD700",
                                    fontSize: "1.1rem",
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontWeight: "medium",
                                    color: darkMode ? "#FFD700" : "#B8860B",
                                  }}
                                >
                                  Hint {index + 1}
                                </Typography>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails
                              sx={{
                                pt: 0,
                                pb: 2,
                                px: 3,
                              }}
                            >
                              <Typography
                                sx={{
                                  color: darkMode
                                    ? "rgba(255,255,255,0.85)"
                                    : "rgba(0,0,0,0.85)",
                                }}
                              >
                                {hint}
                              </Typography>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    )}

                    {/* Tags and Companies Dropdown */}
                    <Box sx={{ mb: 3 }}>
                      {/* Topics Dropdown - Heading */}

                      {/* Topics Accordion */}
                      <Accordion
                        sx={{
                          mb: 1,
                          bgcolor: darkMode
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                          border: "0px solid",
                          borderColor: darkMode
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                          borderRadius: "4px",
                          "&:before": {
                            display: "none",
                          },
                          "& .MuiAccordionSummary-root": {
                            minHeight: "48px",
                            "&.Mui-expanded": {
                              minHeight: "48px",
                            },
                          },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            flexDirection: "row",
                            "& .MuiAccordionSummary-content": {
                              margin: "12px 0",
                            },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CategoryIcon sx={{ mr: 1, fontSize: "1.1rem" }} />
                            <Typography
                              sx={{
                                fontWeight: "medium",
                                color: darkMode
                                  ? "rgba(255,255,255,0.9)"
                                  : "rgba(0,0,0,0.9)",
                              }}
                            >
                              Topics
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 2, px: 3 }}>
                          {/* Topic Tags */}
                          {question.tags && question.tags.length > 0 ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.7,
                              }}
                            >
                              {question.tags.map((tag, index) => (
                                <Chip
                                  key={index}
                                  label={tag}
                                  size="small"
                                  sx={{
                                    height: "24px",
                                    fontSize: "0.75rem",
                                    bgcolor: darkMode
                                      ? "rgba(255,255,255,0.08)"
                                      : "rgba(0,0,0,0.05)",
                                    color: darkMode
                                      ? "rgba(255,255,255,0.9)"
                                      : "rgba(0,0,0,0.8)",
                                    border: "1px solid",
                                    borderColor: darkMode
                                      ? "rgba(255,255,255,0.15)"
                                      : "rgba(0,0,0,0.15)",
                                    mb: 0.5,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                color: darkMode
                                  ? "rgba(255,255,255,0.5)"
                                  : "rgba(0,0,0,0.5)",
                              }}
                            >
                              No topics available for this question.
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>

                      {/* Companies Dropdown */}
                      <Accordion
                        sx={{
                          mb: 1,
                          bgcolor: darkMode
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                          border: "0px solid",
                          borderColor: darkMode
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                          borderRadius: "4px",
                          "&:before": {
                            display: "none",
                          },
                          "& .MuiAccordionSummary-root": {
                            minHeight: "48px",
                            "&.Mui-expanded": {
                              minHeight: "48px",
                            },
                          },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            flexDirection: "row",
                            "& .MuiAccordionSummary-content": {
                              margin: "12px 0",
                            },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <BusinessIcon sx={{ mr: 1, fontSize: "1.1rem" }} />
                            <Typography
                              sx={{
                                fontWeight: "medium",
                                color: darkMode
                                  ? "rgba(255,255,255,0.9)"
                                  : "rgba(0,0,0,0.9)",
                              }}
                            >
                              Companies
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 2, px: 3 }}>
                          {/* Company Tags */}
                          {question.companies &&
                          question.companies.length > 0 ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.7,
                              }}
                            >
                              {question.companies.map((company, index) => (
                                <Chip
                                  key={index}
                                  label={company}
                                  size="small"
                                  sx={{
                                    height: "24px",
                                    fontSize: "0.75rem",
                                    bgcolor: darkMode
                                      ? "rgba(255,255,255,0.08)"
                                      : "rgba(0,0,0,0.05)",
                                    color: darkMode
                                      ? "rgba(255,255,255,0.9)"
                                      : "rgba(0,0,0,0.8)",
                                    border: "1px solid",
                                    borderColor: darkMode
                                      ? "rgba(255,255,255,0.15)"
                                      : "rgba(0,0,0,0.15)",
                                    mb: 0.5,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                color: darkMode
                                  ? "rgba(255,255,255,0.5)"
                                  : "rgba(0,0,0,0.5)",
                              }}
                            >
                              No company tags available for this question.
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  </Box>
                    </>
                  )}
                </Box>

                {/* Resizer (invisible but still draggable) */}
                <Box
                  ref={resizerRef}
                  sx={{
                    width: "4px",
                    height: "100%",
                    bgcolor: "transparent",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "col-resize",
                    border: "none",
                    zIndex: 10,
                    "&:hover": {
                      bgcolor: "transparent",
                    },
                  }}
                  onMouseDown={startResize}
                  onDoubleClick={handleLeftResizerDoubleClick}
                />

                {/* Code Editor Panel */}
                <Box
                  sx={{
                    flexGrow: 1,
                    width: `${100 - leftPanelWidth}%`,
                    height: "calc(100% - 16px)",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "transparent",
                    overflow: "hidden",
                    my: 1,
                    ml: 0.25,
                    mr: 1,
                    p: 0,
                    transition: isResizing ? "none" : "width 0.1s ease",
                  }}
                >
                  <TabPanel
                    value={activeTab}
                    index={0}
                    loadOnce={true}
                    hasLoaded={loadedTabs[0]}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        overflow: "hidden",
                        m: 0,
                        p: 0,
                        gap: 1, // consistent gap between editor and test panels (incl. folded state)
                      }}
                    >
                      {question?.type === "mcq" ? (
                        // Render MCQ options
                        renderMcqOptions()
                      ) : (
                        // Render programming editor
                        <>
                          {/* Editor wrapper — flex height driven by fold state */}
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              minHeight: 0,
                              overflow: "hidden",
                              flex:
                                collapsedPanel === "editor"
                                  ? "0 0 auto"
                                  : collapsedPanel === "test"
                                  ? "1 1 auto"
                                  : `${100 - testCasesPanelHeight} 1 0`,
                            }}
                          >
                          <CodeEditorPanel
                            ref={codeEditorRef}
                            code={code}
                            language={language}
                            darkMode={darkMode}
                            onChange={setCode}
                            testCasesPanelHeight={testCasesPanelHeight}
                            LANGUAGES={LANGUAGES}
                            onLanguageChange={selectLanguage}
                            availableLanguages={question.languages || []}
                            encryptedEditorEnabled={question?.encryptedEditor || false} // Enable encryption only if question has it enabled
                            questionId={question?._id}
                            encryptionSettings={
                              question?.encryptionSettings || {}
                            }
                            fillInTheBlankEnabled={
                              question?.fillInTheBlank || false
                            }
                            fillHeight
                            collapsed={collapsedPanel === "editor"}
                            onToggleCollapse={toggleEditorCollapse}
                          />
                          </Box>

                          {question &&
                            question.testCases &&
                            question.testCases.length > 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  minHeight: 0,
                                  overflow: "hidden",
                                  flex:
                                    collapsedPanel === "test"
                                      ? "0 0 auto"
                                      : collapsedPanel === "editor"
                                      ? "1 1 auto"
                                      : `${testCasesPanelHeight} 1 0`,
                                }}
                              >
                              <TestCasesPanel
                                question={question}
                                testResults={testResults}
                                testResultsSummary={testResultsSummary}
                                darkMode={darkMode}
                                testCasesPanelHeight={testCasesPanelHeight}
                                testPanelResizerRef={testPanelResizerRef}
                                startTestPanelResize={startTestPanelResize}
                                isResizingTestPanel={isResizingTestPanel}
                                output={output}
                                isSubmission={testResults?.some(
                                  (r) => r._isSubmission === true
                                )}
                                submitting={submitting}
                                activeInputTab={activeInputTab}
                                onInputTabChange={setActiveInputTab}
                                customInput={customInput}
                                onCustomInputChange={setCustomInput}
                                customOutput={customOutput}
                                running={running}
                                panelMode={panelMode}
                                onPanelModeChange={handlePanelModeChange}
                                fillHeight
                                collapsed={collapsedPanel === "test"}
                                onToggleCollapse={toggleTestCollapse}
                                showResizer={collapsedPanel === null}
                              />
                              </Box>
                            )}
                        </>
                      )}
                    </Box>
                  </TabPanel>

                  {/* Editorial tab - lazy loaded */}
                  <TabPanel
                    value={activeTab}
                    index={1}
                    loadOnce={true}
                    hasLoaded={loadedTabs[1]}
                  >
                    <Box
                      sx={{
                        p: 3,
                        height: "100%",
                        overflow: "auto",
                        "&::-webkit-scrollbar": {
                          width: "8px",
                        },
                        "&::-webkit-scrollbar-track": {
                          backgroundColor: darkMode
                            ? "rgba(0, 0, 0, 0.1)"
                            : "rgba(0, 0, 0, 0.05)",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: darkMode
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                          borderRadius: "4px",
                        },
                      }}
                    >
                      {/* Show loading state while fetching editorial */}
                      {editorialLoading ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            gap: 2,
                          }}
                        >
                          <CircularProgress size={40} />
                          <Typography variant="body2" color="text.secondary">
                            Loading editorial...
                          </Typography>
                        </Box>
                      ) : editorialAccessDenied ? (
                        /* Show access denied message if user hasn't solved the question */
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            color: "text.secondary",
                            gap: 2,
                          }}
                        >
                          <LockIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                          <Typography variant="h6" gutterBottom>
                            Editorial Locked
                          </Typography>
                          <Typography
                            variant="body2"
                            textAlign="center"
                            sx={{ maxWidth: 400 }}
                          >
                            Solve the question correctly to unlock the editorial
                          </Typography>
                        </Box>
                      ) : question?.editorial && question.editorial.trim() ? (
                        /* Show editorial content if available and access is granted */
                        <Box
                          className="editorial-content"
                          sx={{
                            color: darkMode
                              ? "rgba(255,255,255,0.85)"
                              : "rgba(0,0,0,0.85)",
                            lineHeight: 1.7,
                            fontSize: "0.875rem",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            "& h1": {
                              fontSize: "1.75rem",
                              fontWeight: "bold",
                              marginTop: "1.5em",
                              marginBottom: "0.75em",
                              paddingBottom: "0.5em",
                              borderBottom: "2px solid",
                              borderColor: theme.palette.primary.main,
                              color: theme.palette.primary.main,
                            },
                            "& h2": {
                              fontSize: "1.35rem",
                              fontWeight: "bold",
                              marginTop: "1.5em",
                              marginBottom: "0.75em",
                              color: theme.palette.primary.main,
                            },
                            "& h3": {
                              fontSize: "1.15rem",
                              fontWeight: "600",
                              marginTop: "1.25em",
                              marginBottom: "0.5em",
                              color: theme.palette.primary.main,
                            },
                            "& h4, & h5, & h6": {
                              fontSize: "1rem",
                              fontWeight: "600",
                              marginTop: "1em",
                              marginBottom: "0.5em",
                              color: theme.palette.primary.main,
                            },
                            "& p": {
                              marginBottom: "0.875rem",
                              lineHeight: 1.7,
                              wordWrap: "break-word",
                            },
                            "& code": {
                              backgroundColor: darkMode
                                ? "rgba(0, 136, 204, 0.1)"
                                : "rgba(10, 102, 194, 0.08)",
                              color: darkMode ? "#0088cc" : "#0a66c2",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontFamily:
                                '"Consolas", "Monaco", "Courier New", monospace',
                              fontSize: "0.85em",
                              fontWeight: "500",
                              border: darkMode
                                ? "1px solid rgba(0, 136, 204, 0.3)"
                                : "1px solid rgba(10, 102, 194, 0.2)",
                              wordBreak: "break-word",
                            },
                            "& pre": {
                              backgroundColor: "transparent",
                              padding: "12px 16px",
                              borderRadius: "8px",
                              overflow: "auto",
                              border: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                              margin: "12px 0",
                              fontFamily:
                                '"Consolas", "Monaco", "Courier New", monospace',
                              "& code": {
                                backgroundColor: "transparent",
                                border: "none",
                                padding: 0,
                                fontSize: "0.85rem",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                color: darkMode
                                  ? "rgba(255,255,255,0.85)"
                                  : "rgba(0,0,0,0.8)",
                              },
                            },
                            "& table": {
                              width: "100%",
                              borderCollapse: "collapse",
                              margin: "10px 0",
                              fontFamily: "inherit",
                              border: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
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
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                            },
                            "& table thead th:not(:last-child)": {
                              borderRight: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                            },
                            "& table thead th:first-of-type": {
                              borderTopLeftRadius: "7px",
                            },
                            "& table thead th:last-child": {
                              borderTopRightRadius: "7px",
                            },
                            "& table tbody td": {
                              backgroundColor: "transparent",
                              padding: "12px 16px",
                              fontSize: "0.9rem",
                              color: darkMode
                                ? "rgba(255,255,255,0.85)"
                                : "rgba(0,0,0,0.8)",
                              border: "none",
                            },
                            "& table tbody td:not(:last-child)": {
                              borderRight: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                            },
                            "& table tbody tr:not(:last-child) td": {
                              borderBottom: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                            },
                            "& table tbody tr:last-child td:first-of-type": {
                              borderBottomLeftRadius: "7px",
                            },
                            "& table tbody tr:last-child td:last-child": {
                              borderBottomRightRadius: "7px",
                            },
                            "& img": {
                              maxWidth: "100%",
                              height: "auto",
                              display: "block",
                              margin: "12px 0",
                              borderRadius: "8px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            },
                            "& ul, & ol": {
                              margin: "12px 0",
                              paddingLeft: "24px",
                              wordWrap: "break-word",
                            },
                            "& li": {
                              margin: "6px 0",
                              wordWrap: "break-word",
                            },
                            "& blockquote": {
                              borderLeft: `4px solid ${theme.palette.primary.main}`,
                              paddingLeft: "16px",
                              margin: "12px 0",
                              fontStyle: "italic",
                              backgroundColor: darkMode
                                ? "rgba(255,255,255,0.05)"
                                : "#f8f9fa",
                              padding: "12px 12px 12px 16px",
                              borderRadius: "0 8px 8px 0",
                            },
                            "& a": {
                              color: theme.palette.primary.main,
                              textDecoration: "none",
                              wordBreak: "break-word",
                              "&:hover": {
                                textDecoration: "underline",
                              },
                            },
                            "& hr": {
                              margin: "16px 0",
                              border: "none",
                              borderTop: `1px solid ${
                                darkMode ? "rgba(255,255,255,0.2)" : "#e0e0e0"
                              }`,
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
                            "& .note": {
                              backgroundColor: "transparent",
                              border: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                              borderRadius: "8px",
                              padding: "0",
                              margin: "16px 0",
                              overflow: "hidden",
                              "& p:first-of-type": {
                                backgroundColor: darkMode
                                  ? "rgba(0, 136, 204, 0.1)"
                                  : "rgba(10, 102, 194, 0.08)",
                                padding: "12px 16px",
                                margin: "0",
                                fontWeight: "600",
                                fontSize: "0.9rem",
                                color: darkMode ? "#0088cc" : "#0a66c2",
                                borderBottom: `1px solid ${
                                  darkMode
                                    ? "rgba(255,255,255,0.1)"
                                    : "rgba(0,0,0,0.1)"
                                }`,
                              },
                              "& ul": {
                                padding: "12px 16px 12px 40px",
                                margin: "0",
                              },
                            },
                            "& .highlight": {
                              backgroundColor: darkMode
                                ? "rgba(255,235,59,0.3)"
                                : "#fff3cd",
                              padding: "2px 4px",
                              borderRadius: "4px",
                            },
                            "& .warning": {
                              backgroundColor: darkMode
                                ? "rgba(255,152,0,0.1)"
                                : "#fff3e0",
                              border: `1px solid ${theme.palette.warning.main}`,
                              padding: "16px",
                              borderRadius: "8px",
                              margin: "16px 0",
                            },
                            "& .example": {
                              backgroundColor: "transparent",
                              border: `1px solid ${
                                darkMode
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.1)"
                              }`,
                              borderRadius: "8px",
                              padding: "0",
                              margin: "16px 0",
                              overflow: "hidden",
                              fontFamily:
                                '"Consolas", "Monaco", "Courier New", monospace',
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
                              },
                              "& .label:first-of-type": {
                                borderRight: `1px solid ${
                                  darkMode
                                    ? "rgba(255,255,255,0.1)"
                                    : "rgba(0,0,0,0.1)"
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
                                  darkMode
                                    ? "rgba(255,255,255,0.1)"
                                    : "rgba(0,0,0,0.1)"
                                }`,
                              },
                            },
                            "& p:has(+ .example)": {
                              marginBottom: "32px",
                            },
                          }}
                          dangerouslySetInnerHTML={{
                            __html: question.editorial,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            color: "text.secondary",
                          }}
                        >
                          <Typography variant="h6" gutterBottom>
                            No Editorial Available
                          </Typography>
                          <Typography variant="body2">
                            The editorial for this question hasn't been added
                            yet.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TabPanel>

                  {/* Submissions tab - lazy loaded */}
                  <TabPanel
                    value={activeTab}
                    index={2}
                    loadOnce={true}
                    hasLoaded={loadedTabs[2]}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {(() => {
                        // Check if we have the necessary data
                        if (!submissions || !allUsersSubmissions) {
                          return (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "100%",
                                flexDirection: "column",
                                gap: 2,
                              }}
                            >
                              <CircularProgress size={40} />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Loading submissions...
                              </Typography>
                            </Box>
                          );
                        }

                        return (
                          <SubmissionsPanel
                            submissions={submissions || []}
                            allUsersSubmissions={allUsersSubmissions || []}
                            darkMode={darkMode}
                            formatTime={formatTime}
                            formatMemory={formatMemory}
                            user={user}
                            onLoadAllUsersSubmissions={fetchAllSubmissions}
                            questionType={question?.type}
                            questionOptions={question?.options}
                          />
                        );
                      })()}
                    </Box>
                  </TabPanel>

                  {/* Report tab - lazy loaded */}
                  <TabPanel
                    value={activeTab}
                    index={3}
                    loadOnce={true}
                    hasLoaded={loadedTabs[3]}
                  >
                    <QuestionReport
                      cohortId={cohortId}
                      moduleId={moduleId}
                      questionId={questionId}
                      darkMode={darkMode}
                    />
                  </TabPanel>

                  {/* Notes tab - lazy loaded */}
                  <TabPanel
                    value={activeTab}
                    index={4}
                    loadOnce={true}
                    hasLoaded={loadedTabs[4]}
                  >
                    <Box sx={{ p: 3, height: "100%" }}>
                      <Notes
                        cohortId={cohortId}
                        moduleId={moduleId}
                        questionId={questionId}
                      />
                    </Box>
                  </TabPanel>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography variant="h6" color="textSecondary">
                  No question data available
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Question ID: {questionId}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const CohortProblemComponent = CohortProblem;
export default CohortProblemComponent;
