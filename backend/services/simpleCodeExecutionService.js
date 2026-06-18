/**
 * Simple Code Execution Service
 *
 * Based on the working online-judge backend implementation
 * Clean, simple, and effective Judge0 API integration
 */
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
// Judge0 Self-hosted API configuration
const JUDGE0_API_URL = process.env.JUDGE0_HOST;
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN;
const JUDGE0_AUTH_HEADER = process.env.JUDGE0_AUTH_HEADER;

// Auth headers for Judge0 self-hosted server
// JUDGE0_AUTH_HEADER is the custom header NAME (replaces default X-Auth-Token)
// JUDGE0_AUTH_TOKEN is the authentication token VALUE
const JUDGE0_HEADERS = {
  "Content-Type": "application/json",
  [JUDGE0_AUTH_HEADER]: JUDGE0_AUTH_TOKEN,
};

// Language mapping for Judge0
const LANGUAGE_IDS = {
  c: 50, // C (GCC 9.2.0)
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1)
  python: 71, // Python (3.8.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
};

/**
 * Simple run execution - for testing code with custom input
 * @param {string} language - Programming language
 * @param {string} source_code - Code to execute
 * @param {string} input - Standard input
 * @returns {Object} - Execution result
 */
async function runCode(language, source_code, input = "") {
  try {
    console.log(`🏃 Run Code - Language: ${language}`);

    if (!source_code) {
      throw new Error("source_code is required");
    }

    const language_id = LANGUAGE_IDS[language];
    if (!language_id) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Encode source code and stdin as base64 to handle special characters
    const sourceCodeBase64 = Buffer.from(source_code).toString('base64');
    const stdinBase64 = Buffer.from(input).toString('base64');

    // Submit to Judge0
    const submitRes = await axios.post(`${JUDGE0_API_URL}/submissions?base64_encoded=true`, {
      source_code: sourceCodeBase64,
      language_id,
      stdin: stdinBase64,
      base64_encoded: true,
    }, { headers: JUDGE0_HEADERS });

    const token = submitRes.data.token;

    // Fast polling with 200ms delays
    for (let i = 0; i < 25; i++) {
      // 25 attempts × 200ms = 5 seconds max
      await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay

      const result = await axios.get(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`, { headers: JUDGE0_HEADERS });
      const data = result.data;

      // Check if complete (not In Queue=1 or Processing=2)
      if (data.status?.id !== 1 && data.status?.id !== 2) {
        const success = data.status?.id === 3;
        
        // Decode base64 outputs
        const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf-8') : "";
        const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf-8') : "";
        const compile_output = data.compile_output ? Buffer.from(data.compile_output, 'base64').toString('utf-8') : "";
        
        console.log(
          `✅ Run ${success ? "successful" : "failed"}: ${
            data.status?.description
          }`
        );
        return {
          success,
          result: {
            status: data.status?.description || "Unknown",
            output: stdout,
            error: stderr || compile_output,
            time: data.time,
            memory: data.memory,
          },
        };
      }
    }

    console.log("⏰ Execution timeout");
    throw new Error("Timeout after 5 seconds");
  } catch (error) {
    console.error("❌ Run error:", error.message);
    return {
      success: false,
      result: {
        status: "Error",
        output: "",
        error: error.message,
        time: 0,
        memory: 0,
      },
    };
  }
}

/**
 * Submit execution - for running code against test cases
 * @param {string} language - Programming language
 * @param {string} source_code - Code to execute
 * @param {Array} testCases - Array of test cases [{input, output}]
 * @param {Object} options - Additional options (time_limit, memory_limit)
 * @returns {Object} - Test results
 */
async function submitCode(language, source_code, testCases, options = {}) {
  try {
    console.log(
      `📝 Submit - Language: ${language}, Test cases: ${testCases?.length || 0}`
    );

    if (!source_code) {
      throw new Error("source_code is required");
    }

    if (!testCases || testCases.length === 0) {
      throw new Error("Test cases are required");
    }

    const language_id = LANGUAGE_IDS[language];
    if (!language_id) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Use provided options or defaults
    const timeLimit = options.time_limit || 2; // Default 2 seconds
    const memoryLimit = options.memory_limit || 128000; // Default 128MB in KB

    console.log(
      `⚙️ Using execution limits - CPU Time: ${timeLimit}s, Memory: ${memoryLimit}KB`
    );

    const results = [];

    // Process each test case individually for better error handling
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        // Submit to Judge0
        const judge0Request = {
          source_code: Buffer.from(source_code).toString('base64'),
          language_id,
          stdin: Buffer.from(testCase.input || "").toString('base64'),
          cpu_time_limit: timeLimit,
          memory_limit: memoryLimit,
          base64_encoded: true,
        };

        const response = await axios.post(
          `${JUDGE0_API_URL}/submissions?base64_encoded=true`,
          judge0Request,
          { headers: JUDGE0_HEADERS }
        );
        const token = response.data.token;

        // Poll for results
        let result = null;
        for (let j = 0; j < 10; j++) {
          // 10 attempts × 1s = 10 seconds max
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

          const pollResponse = await axios.get(
            `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
            { headers: JUDGE0_HEADERS }
          );
          result = pollResponse.data;

          // Check if execution is complete
          if (
            result.status &&
            result.status.id !== 1 &&
            result.status.id !== 2
          ) {
            break;
          }
        }

        if (!result || result.status?.id === 1 || result.status?.id === 2) {
          // Still processing - timeout
          results.push({
            case: i + 1,
            expected: testCase.output || testCase.expectedOutput || "",
            got: "",
            status: "timeout",
            error: "Execution timeout",
            time: 0,
            memory: 0,
          });
          continue;
        }

        // Process the result - handle multi-line outputs
        const actualOutputRaw = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8').trim() : "";
        const expectedOutputRaw = (
          testCase.output ||
          testCase.expectedOutput ||
          ""
        ).trim();

        // Normalize line endings and trim each line for comparison
        const actualOutput = actualOutputRaw
          .split("\n")
          .map((line) => line.trim())
          .join("\n");
        const expectedOutput = expectedOutputRaw
          .split("\n")
          .map((line) => line.trim())
          .join("\n");

        const status =
          result.status?.id === 3 && actualOutput === expectedOutput
            ? "passed"
            : "failed";

        let errorMessage = "";
        if (result.status?.id !== 3) {
          // Execution error - decode base64 outputs
          const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : "";
          const compile_output = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : "";
          
          if (result.status?.id === 6) {
            // Compilation Error - show full details
            const compileError = compile_output || stderr || "Unknown compilation error";
            errorMessage = `Compilation Error:\n${compileError}`;
          } else if (result.status?.id === 5) {
            errorMessage = "Time Limit Exceeded";
          } else if (result.status?.id === 7) {
            // Runtime Error (SIGSEGV) - show stderr
            const runtimeError = stderr || "Segmentation Fault";
            errorMessage = `Runtime Error (SIGSEGV):\n${runtimeError}`;
          } else if (result.status?.id === 10) {
            // Runtime Error (NZEC) - show stderr for Python exceptions, etc.
            const runtimeError = stderr || "Non-Zero Exit Code";
            errorMessage = `Runtime Error (NZEC):\n${runtimeError}`;
          } else if (stderr) {
            // Show stderr for any runtime error
            errorMessage = `Runtime Error:\n${stderr}`;
          } else {
            errorMessage = result.status?.description || "Execution Error";
          }
        } else if (status === "failed") {
          errorMessage = `Expected:\n${expectedOutput}\n\nGot:\n${actualOutput}`;
        }

        results.push({
          case: i + 1,
          expected: expectedOutput,
          got: actualOutput,
          status: status,
          error: errorMessage,
          time: result.time || 0,
          memory: result.memory || 0,
        });
      } catch (testError) {
        console.error(`❌ Test case ${i + 1} error:`, testError.message);
        results.push({
          case: i + 1,
          expected: testCase.output || testCase.expectedOutput || "",
          got: "",
          status: "error",
          error: `Execution failed: ${testError.message}`,
          time: 0,
          memory: 0,
        });
      }
    }

    const passedCount = results.filter((r) => r.status === "passed").length;
    console.log(
      `✅ Result: ${passedCount}/${results.length} test cases passed`
    );

    return {
      success: true,
      mode: "submit",
      results,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
      },
    };
  } catch (error) {
    console.error("❌ Submit error:", error.message);

    return {
      success: false,
      error: error.message,
      results: [],
    };
  }
}

/**
 * Submit execution with combined test cases - follows online-judge pattern
 * @param {string} language - Programming language
 * @param {string} source_code - Code to execute
 * @param {Array} testCases - Array of test cases [{input, output}]
 * @param {Object} options - Additional options (time_limit, memory_limit)
 * @param {string} mode - Execution mode: "run" or "submit"
 * @returns {Object} - Test results
 */
async function submitCodeCombined(
  language,
  source_code,
  testCases,
  options = {},
  mode = "submit"
) {
  try {
    console.log(
      `📝 Submit Code - Language: ${language}, Test cases: ${
        testCases?.length || 0
      }, Mode: ${mode}`
    );

    if (!source_code) {
      throw new Error("source_code is required");
    }

    if (!testCases || testCases.length === 0) {
      throw new Error("Test cases are required");
    }

    const language_id = LANGUAGE_IDS[language];
    if (!language_id) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Use provided options or defaults
    const timeLimit = options.time_limit || 3; // Default 3 seconds
    const memoryLimit = options.memory_limit || 262144; // Default 256MB in KB

    console.log(
      `⚙️ Using execution limits - CPU Time: ${timeLimit}s, Memory: ${memoryLimit}KB (${
        memoryLimit / 1024
      }MB)`
    );

    // Create combined stdin like online-judge
    const totalCases = testCases.length;
    const testCaseInputs = testCases.map((tc) => tc.input || "");
    const combinedStdin = `${totalCases}\n${testCaseInputs.join("\n")}`;

    // Encode source code and stdin as base64 to handle special characters
    const sourceCodeBase64 = Buffer.from(source_code).toString('base64');
    const stdinBase64 = Buffer.from(combinedStdin).toString('base64');

    // Submit to Judge0 with combined input
    const judge0Request = {
      source_code: sourceCodeBase64,
      language_id,
      stdin: stdinBase64,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit,
      base64_encoded: true, // Tell Judge0 that we're sending base64
    };

    console.log('📤 Judge0 Request:', {
      language_id,
      stdin_length: combinedStdin.length,
      code_length: source_code.length,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit,
      code_preview: source_code.substring(0, 200)
    });

    const response = await axios.post(
      `${JUDGE0_API_URL}/submissions?base64_encoded=true`,
      judge0Request,
      { headers: JUDGE0_HEADERS }
    );
    const token = response.data.token;

    console.log('✅ Submission created, token:', token);

    // Poll for results
    let result = null;
    for (let i = 0; i < 10; i++) {
      // 10 attempts × 1s = 10 seconds max
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

      const pollResponse = await axios.get(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
        { headers: JUDGE0_HEADERS }
      );
      result = pollResponse.data;

      // Check if execution is complete
      if (result.status && result.status.id !== 1 && result.status.id !== 2) {
        break;
      }
    }

    // If still processing after polling
    if (!result || result.status?.id === 1 || result.status?.id === 2) {
      console.log("⏰ Execution timeout");
      throw new Error("Execution timeout - submission took too long");
    }

    // If execution failed
    if (result.status?.id !== 3) {
      console.log(
        `❌ Execution failed: ${result.status?.description || "Unknown error"}`
      );

      // Decode base64 outputs first
      const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : "";
      const compile_output = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : "";

      let errorMessage = result.status?.description || "Execution failed";

      // Handle specific error types
      if (result.status?.id === 5) {
        errorMessage = "Time Limit Exceeded";
      } else if (result.status?.id === 6) {
        // Compilation Error - show detailed error message
        const compileError = compile_output || stderr || "Compilation Error";
        errorMessage = `Compilation Error:\n${compileError}`;
      } else if (result.status?.id === 7) {
        // Runtime Error (SIGSEGV) - show stderr if available
        const runtimeError = stderr || "Segmentation Fault";
        errorMessage = `Runtime Error (SIGSEGV):\n${runtimeError}`;
      } else if (result.status?.id === 8) {
        // Runtime Error (SIGFPE) - show stderr if available
        const runtimeError = stderr || "Floating Point Exception";
        errorMessage = `Runtime Error (SIGFPE):\n${runtimeError}`;
      } else if (result.status?.id === 9) {
        // Runtime Error (SIGABRT) - show stderr if available
        const runtimeError = stderr || "Aborted";
        errorMessage = `Runtime Error (SIGABRT):\n${runtimeError}`;
      } else if (result.status?.id === 10) {
        // Runtime Error (NZEC) - Non-zero exit code, show stderr
        const runtimeError = stderr || "Non-Zero Exit Code";
        errorMessage = `Runtime Error (NZEC):\n${runtimeError}`;
      } else if (result.status?.id === 11) {
        // Runtime Error (Other) - show stderr if available
        const runtimeError = stderr || "Runtime Error";
        errorMessage = `Runtime Error:\n${runtimeError}`;
      } else if (result.status?.id === 12) {
        errorMessage = "Runtime Error (Internal Error)";
      } else if (result.status?.id === 13) {
        errorMessage = "Runtime Error (Exec Format Error)";
      } else if (stderr) {
        // For any other error with stderr, show it
        errorMessage = stderr;
      } else if (compile_output) {
        // Show compilation output if available
        errorMessage = `Compilation Error:\n${compile_output}`;
      }

      // Return error for all test cases
      const results = testCases.map((testCase, index) => ({
        case: index + 1,
        expected: testCase.output || testCase.expectedOutput || "",
        got: "",
        status: "error",
        error: errorMessage,
        time: result.time || 0,
        memory: result.memory || 0,
      }));

      return {
        success: false,
        error: errorMessage,
        results,
        summary: {
          total: results.length,
          passed: 0,
          failed: results.length,
        },
      };
    }

    // Parse output and match with expected results
    // Decode base64 output
    const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : "";

    // Split output into lines and remove empty lines
    const outputLines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results = [];
    let currentLineIndex = 0; // Track current position in output

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const expectedOutput = (
        testCase.output ||
        testCase.expectedOutput ||
        ""
      ).trim();

      // Count how many lines this test case's expected output has
      const expectedLines = expectedOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const numExpectedLines = expectedLines.length;

      // Extract exactly that many lines from actual output
      const actualLines = [];
      for (let j = 0; j < numExpectedLines; j++) {
        if (currentLineIndex < outputLines.length) {
          const line = outputLines[currentLineIndex];
          actualLines.push(line);
          currentLineIndex++;
        }
      }

      // Compare outputs
      const actualOutput = actualLines.join("\n");
      const expectedOutputClean = expectedLines.join("\n");
      const status = actualOutput === expectedOutputClean ? "passed" : "failed";

      results.push({
        case: i + 1,
        expected: expectedOutputClean,
        got: actualOutput,
        status: status,
        error:
          status === "failed"
            ? `Expected:\n${expectedOutputClean}\n\nGot:\n${actualOutput}`
            : "",
        time: result.time || 0,
        memory: result.memory || 0,
      });
    }

    const passedCount = results.filter((r) => r.status === "passed").length;
    console.log(
      `✅ Result: ${passedCount}/${results.length} test cases passed`
    );

    return {
      success: true,
      mode: mode, // Use the passed mode parameter instead of hardcoded "submit"
      results,
      execution: {
        time: result.time,
        memory: result.memory,
        status: result.status?.description,
      },
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
      },
    };
  } catch (error) {
    console.error("❌ Submit error:", error.message);
    if (error.response) {
      console.error("❌ Judge0 Error Response:", {
        status: error.response.status,
        data: error.response.data
      });
    }

    return {
      success: false,
      error: error.message,
      results: [],
    };
  }
}

module.exports = {
  runCode,
  submitCode,
  submitCodeCombined,
};
