import axios from "axios";

/**
 * API client for compiler service endpoints
 */
const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token"); // For authenticated requests

const compilerApi = {
  /**
   * Execute code with custom input (RUN mode)
   * @param {string} language - The programming language
   * @param {string} source_code - The code to execute
   * @param {string} input - Input to provide to the program
   * @returns {Promise<Object>} Execution result
   */
  runCode: async (language, source_code, input = "") => {
    try {
      const response = await axios.post(
        `${apiUrl}/compiler/run`,
        { language, source_code, input },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
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
   * Submit code against test cases (SUBMIT mode)
   * @param {string} language - The programming language
   * @param {string} source_code - The code to execute
   * @param {Array} testCases - Array of test cases { input, output }
   * @param {Object} options - Additional options like time_limit, memory_limit
   * @returns {Promise<Object>} Test results
   */
  submitCode: async (language, source_code, testCases, options = {}) => {
    try {
      const response = await axios.post(
        `${apiUrl}/compiler/submit`,
        { language, source_code, testCases, options },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error submitting code:", error);
      throw new Error(
        error.response?.data?.error || error.message || "Failed to submit code"
      );
    }
  },

  /**
   * Submit code against test cases using combined stdin (online-judge style)
   * @param {string} language - The programming language
   * @param {string} source_code - The code to execute
   * @param {Array} testCases - Array of test cases { input, output }
   * @param {Object} options - Additional options like time_limit, memory_limit
   * @returns {Promise<Object>} Test results
   */
  submitCodeCombined: async (
    language,
    source_code,
    testCases,
    options = {}
  ) => {
    try {
      const response = await axios.post(
        `${apiUrl}/compiler/submit-combined`,
        { language, source_code, testCases, options },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
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

  // Legacy methods for backward compatibility
  /**
   * Execute code using the backend compiler service
   * @deprecated Use runCode instead
   */
  executeCode: async (language, version = null, code, stdin = "") => {
    console.warn("executeCode is deprecated, use runCode instead");
    return compilerApi.runCode(language, code, stdin);
  },

  /**
   * Run code against test cases
   * @deprecated Use submitCode instead
   */
  runTestCases: async (
    language,
    version,
    code,
    testCases,
    isSubmission = false
  ) => {
    console.warn("runTestCases is deprecated, use submitCode instead");

    // Convert old format to new format
    const formattedTestCases = testCases.map((tc) => ({
      input: tc.input,
      output: tc.output || tc.expectedOutput,
    }));

    // If it's a submission, run against all test cases
    // If it's a run, filter to only visible test cases
    const relevantTestCases = isSubmission
      ? formattedTestCases.filter((tc) => tc.hidden !== false) // All or hidden only
      : formattedTestCases.filter((tc) => tc.hidden !== true); // Visible only

    const result = await compilerApi.submitCode(
      language,
      code,
      relevantTestCases
    );

    // Convert response format for backward compatibility
    if (result.success) {
      return result.results.map((r) => ({
        passed: r.status === "passed",
        actual: r.got,
        expected: r.expected,
        error: r.error || "",
        executionTime: r.time * 1000 || 0, // Convert to ms
        memoryUsed: r.memory || 0,
        testCaseId: r.case,
        hidden: false, // Default for backward compatibility
        input: testCases[r.case - 1]?.input || "",
      }));
    } else {
      throw new Error(result.error || "Test execution failed");
    }
  },

  /**
   * Simple execution of code without special processing
   * @deprecated Use runCode instead
   */
  simpleExecution: async (language, version = null, code, stdin = "") => {
    console.warn("simpleExecution is deprecated, use runCode instead");
    return compilerApi.runCode(language, code, stdin);
  },
};

export default compilerApi;
