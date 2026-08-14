#!/usr/bin/env node
/**
 * Verifies the SQL question integration against the live SQLJudge engine.
 *
 * Covers the pieces that do not need a database: engine reachability, the
 * question payload validator, the "Generate Outputs" and "Validate testcases"
 * authoring actions, the run/submit grading calls, and the verdict-to-score
 * mapping used when recording a submission.
 *
 * Usage:  node scripts/sql-judge-check.js
 * Publishing is only attempted when SQLJUDGE_ADMIN_TOKEN is configured.
 */

// Load backend/.env the same way the server does, so the engine URL and admin
// token are picked up when this script is run directly.
require("dotenv").config({
  path: require("node:path").resolve(__dirname, "..", ".env"),
});

const sqlJudge = require("../services/sqlJudgeClient");
const service = require("../services/sqlQuestionService");

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

const SAMPLE = {
  title: "Integration Probe Department Salary",
  description: "<p>Return the average salary per department.</p>",
  difficultyLevel: "medium",
  marks: 10,
  judgeQuestionId: "question-101",
  judgeVersion: 1,
  schemaSql:
    "CREATE TABLE employees (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL, department VARCHAR(50) NOT NULL, salary DECIMAL(10,2) NOT NULL);",
  solutionSql:
    "SELECT department, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY department;",
  testcases: [
    {
      id: "tc-01",
      visible: true,
      seedSql:
        "INSERT INTO employees (id, name, department, salary) VALUES (1,'Rahul','IT',60000),(2,'Priya','IT',70000),(3,'Arjun','HR',50000);",
    },
    {
      id: "tc-02",
      visible: false,
      seedSql:
        "INSERT INTO employees (id, name, department, salary) VALUES (1,'Solo','OPS',42000);",
    },
  ],
};

const CORRECT_SQL =
  "SELECT department, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department ORDER BY department;";
// Fails only on the hidden testcases: the visible seeds happen to average to
// values that already have two decimal places.
const WRONG_SQL =
  "SELECT department, AVG(salary) AS avg_salary FROM employees GROUP BY department ORDER BY department;";
// Fails immediately on the first visible testcase: the column is misnamed.
const VISIBLY_WRONG_SQL =
  "SELECT department, ROUND(AVG(salary), 2) AS average_salary FROM employees GROUP BY department ORDER BY department;";

(async () => {
  console.log(`\nSQL engine: ${sqlJudge.BASE_URL}`);
  console.log(`Admin token configured: ${sqlJudge.isAdminConfigured()}\n`);

  console.log("Engine reachability");
  let health = null;
  try {
    health = await sqlJudge.health();
  } catch (err) {
    check("GET /health", false, err.message);
  }
  check("engine reports UP", health?.status === "UP", health?.status);
  check("question storage configured", health?.storage?.bucket === "configured");

  console.log("\nPayload validation");
  const parsed = service.parseSqlQuestionPayload(SAMPLE);
  check("valid payload parses", parsed.judgeQuestionId === "question-101");
  check("visible/hidden split preserved", parsed.testcases.filter((t) => t.visible).length === 1);

  const rejects = [
    ["missing title", { ...SAMPLE, title: "" }],
    ["missing schema", { ...SAMPLE, schemaSql: "" }],
    ["missing solution", { ...SAMPLE, solutionSql: "" }],
    ["no testcases", { ...SAMPLE, testcases: [] }],
    ["all testcases hidden", {
      ...SAMPLE,
      testcases: SAMPLE.testcases.map((tc) => ({ ...tc, visible: false })),
    }],
    ["duplicate testcase ids", {
      ...SAMPLE,
      testcases: [SAMPLE.testcases[0], { ...SAMPLE.testcases[1], id: "tc-01" }],
    }],
    ["bad difficulty", { ...SAMPLE, difficultyLevel: "impossible" }],
  ];
  for (const [name, payload] of rejects) {
    let threw = false;
    try {
      service.parseSqlQuestionPayload(payload);
    } catch (err) {
      threw = err instanceof service.SqlQuestionError;
    }
    check(`rejects ${name}`, threw);
  }

  console.log("\nUser grading: POST /run (visible testcases)");
  const run = await sqlJudge.run({
    questionId: "question-101",
    version: 1,
    sql: CORRECT_SQL,
  });
  check("run passes with the reference query", run.status === "PASSED", run.status);
  check("run returns per-testcase detail", Array.isArray(run.testcases) && run.testcases.length > 0);
  check(
    "run testcases carry actual rows",
    Boolean(run.testcases?.[0]?.actual?.columns?.length)
  );

  const runWrong = await sqlJudge.run({
    questionId: "question-101",
    version: 1,
    sql: VISIBLY_WRONG_SQL,
  });
  check("misnamed column fails the run", runWrong.status === "FAILED", runWrong.status);
  const failedCase = runWrong.testcases?.find((tc) => tc.status === "FAILED");
  check("failing run explains the mismatch", Boolean(failedCase?.mismatch));
  check(
    "mismatch identifies the column name",
    failedCase?.mismatch?.type === "COLUMN_NAME",
    failedCase?.mismatch?.type
  );
  check("failing run exposes expected rows for visible cases", Boolean(failedCase?.expected));

  const runHiddenOnly = await sqlJudge.run({
    questionId: "question-101",
    version: 1,
    sql: WRONG_SQL,
  });
  check(
    "query that only fails hidden cases passes the run",
    runHiddenOnly.status === "PASSED",
    runHiddenOnly.status
  );

  const runError = await sqlJudge.run({
    questionId: "question-101",
    version: 1,
    sql: "SELECT * FROM does_not_exist;",
  });
  check("invalid SQL reports ERROR", runError.status === "ERROR", runError.status);
  check("invalid SQL returns a message", Boolean(runError.error));

  console.log("\nUser grading: POST /submit (all testcases)");
  const submitOk = await sqlJudge.submit({
    questionId: "question-101",
    version: 1,
    sql: CORRECT_SQL,
  });
  check("correct submission passes", submitOk.status === "PASSED", submitOk.status);
  check("submission reports totals", submitOk.total > 0 && submitOk.passed === submitOk.total);
  check("submission withholds testcase detail", submitOk.testcases === undefined);

  const submitBad = await sqlJudge.submit({
    questionId: "question-101",
    version: 1,
    sql: WRONG_SQL,
  });
  check("wrong submission fails", submitBad.status === "FAILED", submitBad.status);
  check("failed submission leaks no rows", submitBad.testcases === undefined);

  console.log("\nScoring");
  const question = { marks: 20 };
  const gradedPass = service.gradeSubmitVerdict(submitOk, question);
  check("full marks on all-pass", gradedPass.isCorrect && gradedPass.score === 20);
  check("accepted status mapped", gradedPass.status === "accepted", gradedPass.status);

  const gradedFail = service.gradeSubmitVerdict(submitBad, question);
  check("partial pass scores zero by default", !gradedFail.isCorrect && gradedFail.score === 0);
  check("wrong_answer status mapped", gradedFail.status === "wrong_answer", gradedFail.status);

  const gradedError = service.gradeSubmitVerdict(
    { status: "ERROR", passed: 0, total: 10, error: "boom" },
    question
  );
  check("sql error maps to sql_error", gradedError.status === "sql_error", gradedError.status);

  const gradedTimeout = service.gradeSubmitVerdict(
    { status: "TIMEOUT", passed: 1, total: 10 },
    question
  );
  check(
    "timeout maps to time_limit_exceeded",
    gradedTimeout.status === "time_limit_exceeded",
    gradedTimeout.status
  );

  console.log("\nAdmin authoring");
  if (!sqlJudge.isAdminConfigured()) {
    console.log("  [SKIP] SQLJUDGE_ADMIN_TOKEN not set: authoring actions not exercised");
  } else {
    try {
      await sqlJudge.adminPing();
      check("admin token accepted", true);
    } catch (err) {
      check("admin token accepted", false, err.message);
    }

    try {
      const generated = await service.generateOutputs(parsed);
      check(
        "generate outputs returns expected rows per testcase",
        generated.testcases.length === parsed.testcases.length &&
          generated.testcases.every((tc) => tc.expected?.columns?.length)
      );
      check(
        "generated columns match the solution",
        generated.outputColumns.join(",") === "department,avg_salary",
        generated.outputColumns.join(",")
      );

      const validation = await service.validateTestcases({
        ...parsed,
        testcases: parsed.testcases.map((tc, i) => ({
          ...tc,
          expected: generated.testcases[i].expected,
        })),
      });
      check("validate accepts solution-generated output", validation.valid);

      const tampered = await service.validateTestcases({
        ...parsed,
        testcases: parsed.testcases.map((tc, i) => ({
          ...tc,
          expected:
            i === 0
              ? { columns: ["department", "avg_salary"], rows: [["ZZZ", 1]] }
              : generated.testcases[i].expected,
        })),
      });
      check("validate rejects tampered output", tampered.valid === false);
    } catch (err) {
      check("authoring actions succeed", false, err.message);
    }
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error("\nCheck run failed:", err);
  process.exit(1);
});
