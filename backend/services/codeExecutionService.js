/**
 * Code Execution Service
 *
 * This service handles code execution using self-hosted Judge0 API
 * Simplified for basic run vs submit functionality
 */
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Judge0 Self-hosted API configuration
const JUDGE0_API_URL = process.env.JUDGE0_HOST || "http://15.206.122.199:2358";

// JUDGE0_AUTH_HEADER is the custom header NAME, JUDGE0_AUTH_TOKEN is the VALUE
const JUDGE0_API_HEADERS = {
  "Content-Type": "application/json",
  [process.env.JUDGE0_AUTH_HEADER]: process.env.JUDGE0_AUTH_TOKEN,
};

class CodeExecutionService {
  /**
   * Execute code using the Judge0 CE API
   * @param {string} language - Programming language
   * @param {string} code - Code to execute
   * @param {string} stdin - Standard input for the code
   * @param {Object} options - Execution options (time_limit, memory_limit)
   * @returns {Object} - Execution results
   */
  async executeCode(language, code, stdin = "", options = {}) {
    try {
      console.log(
        `Executing ${language} code with self-hosted Judge0 API at ${JUDGE0_API_URL}`
      );

      // Map internal language names to Judge0 language IDs
      const languageIds = {
        c: 50, // C (GCC 9.2.0)
        cpp: 54, // C++ (GCC 9.2.0)
        java: 62, // Java (OpenJDK 13.0.1)
        python: 71, // Python (3.8.1)
        javascript: 63, // JavaScript (Node.js 12.14.0)
      };

      const languageId = languageIds[language];
      if (!languageId) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Use provided options or defaults
      const timeLimit = options.time_limit || 2; // Default 2 seconds
      const memoryLimit = options.memory_limit || 128000; // Default 128MB in KB
      const wallTimeLimit = timeLimit * 2.5 || 5; // Wall time is usually 2.5x CPU time

      console.log(
        `⚙️ Using execution limits - CPU Time: ${timeLimit}s, Memory: ${memoryLimit}KB, Wall Time: ${wallTimeLimit}s`
      );

      // Create submission payload
      const payload = {
        source_code: code,
        language_id: languageId,
        stdin: stdin || "",
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit,
        wall_time_limit: wallTimeLimit,
      };

      // Submit code for execution
      const createResponse = await axios.post(
        `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
        payload,
        {
          headers: JUDGE0_API_HEADERS,
          timeout: 30000, // 30 second timeout for self-hosted server
        }
      );

      const result = createResponse.data;

      if (!result || result.status?.id <= 2) {
        if (result.token) {
          return await this.getSubmissionResult(result.token);
        }
        throw new Error(
          result.status?.description ||
            "Execution failed or was queued without wait."
        );
      }

      // Format the response to match expected structure
      const formattedResult = {
        language: language,
        version: this.getLanguageVersion(language),
        run: {
          stdout: result.stdout || "",
          stderr: result.stderr || "",
          output: result.stdout || result.stderr || "",
          code: result.exit_code || 0,
          signal: result.exit_signal,
          time: parseFloat(result.time) || 0,
          memory: parseInt(result.memory) || 0,
        },
        compile: {
          stdout: result.compile_output || "",
          stderr: result.status?.id === 6 ? result.compile_output : "",
          code: result.status?.id === 6 ? 1 : 0,
          signal: null,
        },
        status: result.status,
      };

      console.log(
        `Execution completed. Time: ${formattedResult.run.time}s, Memory: ${formattedResult.run.memory}KB`
      );

      return formattedResult;
    } catch (error) {
      console.error("Error executing code:", error);

      return {
        compile: {
          stderr: error.message || "Failed to execute code",
          stdout: "",
          code: 1,
          signal: null,
        },
        run: {
          stderr: error.message || "Failed to execute code",
          stdout: "",
          output: "",
          code: 1,
          time: 0,
          memory: 0,
          signal: null,
        },
        status: {
          id: 13,
          description: "Internal Error",
        },
      };
    }
  }

  /**
   * Get submission result by token
   * @param {string} token - Submission token
   * @returns {Object} - Execution results
   */
  async getSubmissionResult(token) {
    try {
      const response = await axios.get(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
        {
          headers: JUDGE0_API_HEADERS,
          timeout: 30000, // 30 second timeout for self-hosted server
        }
      );

      const result = response.data;

      return {
        language: "unknown",
        version: "unknown",
        run: {
          stdout: result.stdout || "",
          stderr: result.stderr || "",
          output: result.stdout || result.stderr || "",
          code: result.exit_code || 0,
          signal: result.exit_signal,
          time: parseFloat(result.time) || 0,
          memory: parseInt(result.memory) || 0,
        },
        compile: {
          stdout: result.compile_output || "",
          stderr: result.status?.id === 6 ? result.compile_output : "",
          code: result.status?.id === 6 ? 1 : 0,
          signal: null,
        },
        status: result.status,
      };
    } catch (error) {
      console.error("Error fetching submission result:", error);
      throw error;
    }
  }

  /**
   * Get language version
   * @param {string} language - Programming language
   * @returns {string} - Language version
   */
  getLanguageVersion(language) {
    const versions = {
      c: "GCC 9.2.0",
      cpp: "GCC 9.2.0",
      java: "OpenJDK 13.0.1",
      python: "3.8.1",
      javascript: "Node.js 12.14.0",
    };
    return versions[language] || "Unknown";
  }

  /**
   * Run code against test cases (simplified)
   * @param {string} language - Programming language
   * @param {string} code - Code to execute
   * @param {Array} testCases - Array of test cases
   * @param {boolean} isSubmission - Whether this is a submission (true) or run (false)
   * @param {Object} options - Execution options (time_limit, memory_limit)
   * @returns {Promise<Array>} - Test results
   */
  async runTestCases(
    language,
    code,
    testCases,
    isSubmission = false,
    options = {}
  ) {
    const languageIds = {
      c: 50,
      cpp: 54,
      java: 62,
      python: 71,
      javascript: 63,
    };
    const languageId = languageIds[language];

    if (!languageId) {
      return [
        {
          passed: false,
          actual: "",
          expected: "",
          error: `Unsupported language: ${language}`,
          executionTime: 0,
          memoryUsed: 0,
        },
      ];
    }

    console.log(
      `Running test cases for ${language}. Submission mode: ${isSubmission}`
    );

    // Filter test cases based on mode
    const relevantTestCases = isSubmission
      ? testCases.filter((tc) => tc.hidden) // Only hidden test cases for submission
      : testCases.filter((tc) => !tc.hidden); // Only non-hidden test cases for run

    if (relevantTestCases.length === 0) {
      return [];
    }

    // Use provided options or defaults
    const timeLimit = options.time_limit || 2; // Default 2 seconds
    const memoryLimit = options.memory_limit || 128000; // Default 128MB in KB
    const wallTimeLimit = timeLimit * 2.5 || 5; // Wall time is usually 2.5x CPU time

    // Execute each test case individually for better error handling
    const results = [];

    for (const testCase of relevantTestCases) {
      try {
        // Submit code for execution with individual test case input
        const payload = {
          source_code: code,
          language_id: languageId,
          stdin: testCase.input || "",
          cpu_time_limit: timeLimit,
          memory_limit: memoryLimit,
          wall_time_limit: wallTimeLimit,
        };

        const response = await axios.post(
          `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
          payload,
          {
            headers: JUDGE0_API_HEADERS,
            timeout: 30000, // 30 second timeout for self-hosted server
          }
        );

        const result = response.data;
        const stdout = result.stdout || "";
        const stderr = result.stderr || "";

        // Handle multi-line outputs - normalize line endings and trim each line
        const actualOutputRaw = stdout.trim();
        const expectedOutputRaw = (testCase.output || "").trim();

        const actualOutput = actualOutputRaw
          .split("\n")
          .map((line) => line.trim())
          .join("\n");
        const expectedOutput = expectedOutputRaw
          .split("\n")
          .map((line) => line.trim())
          .join("\n");

        // Determine if test passed based on status and output comparison
        let passed = false;
        let errorMessage = "";

        if (result.status?.id === 3) {
          // Accepted - check if output matches
          passed = actualOutput === expectedOutput;
          if (!passed) {
            errorMessage = `Expected:\n${expectedOutput}\n\nGot:\n${actualOutput}`;
          }
        } else if (result.status?.id === 6) {
          // Compilation Error
          errorMessage = `Compilation Error: ${
            result.compile_output || "Unknown compilation error"
          }`;
        } else if (result.status?.id === 5) {
          // Time Limit Exceeded
          errorMessage = "Time Limit Exceeded";
        } else if (result.status?.id === 7) {
          // Runtime Error (NZEC)
          errorMessage = `Runtime Error (NZEC): ${
            stderr || "Non-zero exit code"
          }`;
        } else if (result.status?.id === 4) {
          // Wrong Answer
          errorMessage = `Wrong Answer:\nExpected:\n${expectedOutput}\n\nGot:\n${actualOutput}`;
        } else {
          // Other errors
          errorMessage = result.status?.description || "Execution Error";
        }

        results.push({
          passed: passed,
          actual: actualOutput,
          expected: expectedOutput,
          error: errorMessage,
          executionTime: parseFloat(result.time) * 1000 || 0, // Convert to ms
          memoryUsed: parseInt(result.memory) || 0,
          testCaseId: testCase._id,
          hidden: testCase.hidden,
          input: testCase.input,
        });

        console.log(
          `Test case result: ${passed ? "PASSED" : "FAILED"} - ${
            errorMessage || "Output matches"
          }`
        );
      } catch (error) {
        console.error("Error executing test case:", error);
        results.push({
          passed: false,
          actual: "",
          expected: testCase.output || "",
          error: `Execution failed: ${error.message}`,
          executionTime: 0,
          memoryUsed: 0,
          testCaseId: testCase._id,
          hidden: testCase.hidden,
          input: testCase.input,
        });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    console.log(
      `Test execution completed. ${passedCount}/${results.length} passed`
    );
    return results;
  }
}

module.exports = new CodeExecutionService();
