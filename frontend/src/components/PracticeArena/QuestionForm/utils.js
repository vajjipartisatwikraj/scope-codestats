import { toast } from "react-toastify";
import axios from "../../../utils/axiosConfig";
import { apiUrl } from "../../../config/apiConfig";
import { FILL_IN_BLANK_MARKERS } from "./constants";

// Get token for code execution requests
const getAuthToken = () => localStorage.getItem("token");

/**
 * Parse Fill in the Blank markers from code
 * Returns array of editable regions with start/end line numbers
 */
export const parseFillInBlankRegions = (code) => {
  if (!code) return [];

  const lines = code.split("\n");
  const regions = [];
  let inEditableRegion = false;
  let currentRegion = null;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
      if (inEditableRegion) {
        // Nested START marker - skip
      }
      inEditableRegion = true;
      currentRegion = {
        startLine: index + 1, // Line after START marker
        endLine: null,
        startMarkerLine: index,
      };
    } else if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
      if (!inEditableRegion) {
        // END marker without START - skip
      } else {
        currentRegion.endLine = index - 1; // Line before END marker
        currentRegion.endMarkerLine = index;
        regions.push(currentRegion);
        inEditableRegion = false;
        currentRegion = null;
      }
    }
  });

  if (inEditableRegion) {
    // Unclosed START marker - ignored
  }

  return regions;
};

/**
 * Extract boilerplate code (removes solution between markers)
 */
export const extractBoilerplateFromSolution = (solutionCode) => {
  if (!solutionCode) return "";

  const lines = solutionCode.split("\n");
  const result = [];
  let inEditableRegion = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
      result.push(line); // Keep the START marker
      inEditableRegion = true;
    } else if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
      result.push(line); // Keep the END marker
      inEditableRegion = false;
    } else if (inEditableRegion) {
      // Replace solution code with blank lines or placeholder
      const indent = line.match(/^\s*/)[0]; // Preserve indentation
      result.push(`${indent}// Your code here`);
    } else {
      result.push(line); // Keep non-editable code
    }
  });

  return result.join("\n");
};

/**
 * Validate Fill in the Blank markers
 */
export const validateFillInBlankMarkers = (code) => {
  const errors = [];
  const lines = code.split("\n");
  let startCount = 0;
  let endCount = 0;
  let inRegion = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
      startCount++;
      if (inRegion) {
        errors.push(`Nested START marker at line ${index + 1}`);
      }
      inRegion = true;
    } else if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
      endCount++;
      if (!inRegion) {
        errors.push(`END marker without START at line ${index + 1}`);
      }
      inRegion = false;
    }
  });

  if (inRegion) {
    errors.push("Unclosed START marker detected");
  }

  if (startCount !== endCount) {
    errors.push(`Mismatched markers: ${startCount} START, ${endCount} END`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    regions: errors.length === 0 ? parseFillInBlankRegions(code) : [],
  };
};

/**
 * Direct code execution API calls to backend simpleCodeExecutionService
 */
export const codeExecutionApi = {
  /**
   * Execute code with custom input (RUN mode)
   */
  runCode: async (language, source_code, input = "") => {
    try {
      const response = await axios.post(
        `${apiUrl}/courses/run-code`,
        { language, source_code, input },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
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

  /**
   * Submit code against test cases using combined stdin (online-judge style)
   */
  submitCodeCombined: async (
    language,
    source_code,
    testCases,
    options = {}
  ) => {
    try {
      const response = await axios.post(
        `${apiUrl}/courses/submit-code-combined`,
        { language, source_code, testCases, options },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting code (combined):", error);
      throw new Error(
        error.response?.data?.error || error.message || "Failed to submit code"
      );
    }
  },
};

// Format execution time
export const formatTime = (ms) => {
  if (ms < 1) return "< 1 ms";
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

// Format memory usage
export const formatMemory = (kb) => {
  if (!kb) return "N/A";
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

// Simple execution to validate all test cases using combined submit approach
export const simpleValidateAllTestCases = async (
  formData,
  setIsRunningTest,
  setTestCaseResults
) => {
  if (formData.testCases.length === 0) {
    toast.error("No test cases to validate");
    return [];
  }

  // Get the solution code from the default language
  const defaultLang = formData.languages.find(
    (lang) => lang.name === formData.defaultLanguage
  );
  if (!defaultLang || !defaultLang.solutionCode) {
    toast.error(
      "Please provide a solution code in the Languages tab before validating test cases"
    );
    return [];
  }

  setIsRunningTest(true);
  setTestCaseResults([]);

  try {
    // Prepare test cases for combined submission
    const testCasesForSubmit = formData.testCases.map((tc) => ({
      input: tc.input || "",
      output: tc.output || "",
      expectedOutput: tc.output || "", // For backward compatibility
    }));

    // Use the combined submit API (online-judge style)
    const result = await codeExecutionApi.submitCodeCombined(
      defaultLang.name,
      defaultLang.solutionCode,
      testCasesForSubmit,
      {
        time_limit: (formData.constraints?.timeLimit || 1000) / 1000, // Convert ms to seconds
        memory_limit: (formData.constraints?.memoryLimit || 256) * 1024, // Convert MB to KB
      }
    );

    if (!result.success) {
      toast.error(
        "Test case validation failed: " + (result.error || "Unknown error")
      );
      return [];
    }

    // Convert the results to the format expected by the UI
    const newResults = result.results.map((testResult, index) => ({
      index: index,
      passed: testResult.status === "passed",
      expected: testResult.expected,
      actual: testResult.got,
      error: testResult.error || "",
      executionTime: (testResult.time || 0) * 1000, // Convert to ms
      memoryUsed: testResult.memory || 0,
      testCase: formData.testCases[index],
    }));

    // Set the results state
    setTestCaseResults(newResults);

    const passedCount = newResults.filter((r) => r.passed).length;

    if (passedCount === newResults.length) {
      toast.success("All test cases passed! This solution is valid.");
    } else {
      toast.error(
        `${passedCount}/${newResults.length} test cases passed. See details below.`
      );
    }

    return newResults;
  } catch (error) {
    console.error("Error validating test cases:", error);
    toast.error(
      "Failed to validate test cases: " + (error.message || "Unknown error")
    );
    return [];
  } finally {
    setIsRunningTest(false);
  }
};
