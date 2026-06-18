/**
 * Judge0 Server Test Script
 * Tests connectivity, authentication, and code execution
 * 
 * Usage: node scripts/testJudge0.js
 */
const axios = require("axios");
const path = require("path");
const envPath = path.resolve(__dirname, "../.env");
const result = require("dotenv").config({ path: envPath });
if (result.error) {
  console.error("Failed to load .env:", result.error.message);
  process.exit(1);
}
// Manually apply parsed values (dotenv won't override existing env vars)
Object.assign(process.env, result.parsed);

const JUDGE0_API_URL = process.env.JUDGE0_HOST;
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN;
const JUDGE0_AUTH_HEADER = process.env.JUDGE0_AUTH_HEADER;

// JUDGE0_AUTH_HEADER is the custom header NAME, JUDGE0_AUTH_TOKEN is the VALUE
const headers = {
  "Content-Type": "application/json",
  [JUDGE0_AUTH_HEADER]: JUDGE0_AUTH_TOKEN,
};

const PASS = "\x1b[32m✔ PASS\x1b[0m";
const FAIL = "\x1b[31m✘ FAIL\x1b[0m";
const INFO = "\x1b[36mℹ\x1b[0m";

async function testHealth() {
  console.log("\n─── Test 1: Health Check ───");
  try {
    const res = await axios.get(`${JUDGE0_API_URL}/about`, { headers, timeout: 10000 });
    console.log(`${PASS} Server is reachable`);
    console.log(`${INFO} Version: ${res.data.version || "unknown"}`);
    return true;
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      console.log(`${FAIL} Cannot reach Judge0 at ${JUDGE0_API_URL}`);
    } else if (err.response?.status === 401 || err.response?.status === 403) {
      console.log(`${FAIL} Auth rejected (${err.response.status}) — check JUDGE0_AUTH_TOKEN / JUDGE0_AUTH_HEADER`);
    } else {
      console.log(`${FAIL} ${err.message}`);
    }
    return false;
  }
}

async function testLanguages() {
  console.log("\n─── Test 2: Fetch Languages ───");
  try {
    const res = await axios.get(`${JUDGE0_API_URL}/languages`, { headers, timeout: 10000 });
    console.log(`${PASS} Languages endpoint OK — ${res.data.length} languages available`);
    return true;
  } catch (err) {
    console.log(`${FAIL} ${err.response?.status || err.code}: ${err.message}`);
    return false;
  }
}

async function testExecution(label, languageId, sourceCode, expectedOutput) {
  console.log(`\n─── Test: ${label} ───`);
  try {
    const encoded = Buffer.from(sourceCode).toString("base64");

    // 1. Submit
    const submitRes = await axios.post(
      `${JUDGE0_API_URL}/submissions?base64_encoded=true`,
      {
        source_code: encoded,
        language_id: languageId,
        stdin: "",
        base64_encoded: true,
      },
      { headers, timeout: 15000 }
    );

    const token = submitRes.data.token;
    if (!token) {
      console.log(`${FAIL} No token returned from submission`);
      return false;
    }
    console.log(`${INFO} Token: ${token}`);

    // 2. Poll
    let result = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await axios.get(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
        { headers, timeout: 10000 }
      );
      result = poll.data;
      if (result.status?.id > 2) break; // done
    }

    if (!result || result.status?.id <= 2) {
      console.log(`${FAIL} Timed out waiting for result`);
      return false;
    }

    const stdout = result.stdout
      ? Buffer.from(result.stdout, "base64").toString("utf-8").trim()
      : "";
    const stderr = result.stderr
      ? Buffer.from(result.stderr, "base64").toString("utf-8").trim()
      : "";

    if (result.status.id === 3 && stdout === expectedOutput) {
      console.log(`${PASS} Output: "${stdout}" | Time: ${result.time}s | Memory: ${result.memory}KB`);
      return true;
    } else {
      console.log(`${FAIL} Status: ${result.status.description}`);
      if (stdout) console.log(`${INFO} stdout: ${stdout}`);
      if (stderr) console.log(`${INFO} stderr: ${stderr}`);
      if (result.compile_output) {
        const co = Buffer.from(result.compile_output, "base64").toString("utf-8").trim();
        if (co) console.log(`${INFO} compile_output: ${co}`);
      }
      return false;
    }
  } catch (err) {
    console.log(`${FAIL} ${err.response?.status || err.code}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║     Judge0 Server Test Suite         ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`${INFO} Host : ${JUDGE0_API_URL}`);
  console.log(`${INFO} Token: ${JUDGE0_AUTH_TOKEN ? JUDGE0_AUTH_TOKEN.slice(0, 6) + "..." : "NOT SET"}`);
  console.log(`${INFO} Auth : ${JUDGE0_AUTH_HEADER ? JUDGE0_AUTH_HEADER.slice(0, 6) + "..." : "NOT SET"}`);

  let passed = 0;
  let total = 0;

  // 1. Health
  total++;
  if (await testHealth()) passed++;
  else { console.log("\n⛔ Server unreachable — skipping remaining tests."); process.exit(1); }

  // 2. Languages
  total++;
  if (await testLanguages()) passed++;

  // 3. Python (with delays between tests to let sandbox boxes free up)
  total++;
  if (await testExecution("Python 3 — Hello World", 71, `print("Hello Judge0")`, "Hello Judge0")) passed++;
  await new Promise(r => setTimeout(r, 3000));

  // 4. C++
  total++;
  if (await testExecution("C++ — Addition", 54,
`#include <iostream>
using namespace std;
int main() {
    cout << 2 + 3 << endl;
    return 0;
}`,
    "5"
  )) passed++;
  await new Promise(r => setTimeout(r, 3000));

  // 5. Java
  total++;
  if (await testExecution("Java — Greeting", 62,
`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java");
    }
}`,
    "Hello from Java"
  )) passed++;
  await new Promise(r => setTimeout(r, 3000));

  // 6. JavaScript (Node)
  total++;
  if (await testExecution("JavaScript — Array sum", 63,
`const arr = [1, 2, 3, 4, 5];
const sum = arr.reduce((a, b) => a + b, 0);
console.log(sum);`,
    "15"
  )) passed++;

  // Summary
  console.log("\n══════════════════════════════════════");
  const color = passed === total ? "\x1b[32m" : "\x1b[33m";
  console.log(`${color}Result: ${passed}/${total} tests passed\x1b[0m`);
  process.exit(passed === total ? 0 : 1);
}

main();
