/**
 * SQL question authoring and grading orchestration.
 *
 * Responsibilities
 *   - validate the admin-supplied SQL question payload before anything runs
 *   - drive the three authoring actions against SQLJudge:
 *       generateOutputs  -> execute the solution, return generated expected rows
 *       validateTestcases-> re-execute and diff against the supplied expected rows
 *       publish          -> write the question to S3 (engine regenerates expected)
 *   - translate a SQLJudge verdict into our Submission shape and score
 *
 * Testcase data lives in SQLJudge's private S3 bucket, never in MongoDB. Only
 * identifiers, object keys and display-safe assets are stored locally.
 */

const sqlJudge = require("./sqlJudgeClient");

const MAX_TESTCASES = 50;
const MAX_SQL_LENGTH = 200000;
const JUDGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,64}$/;
const TESTCASE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,64}$/;

const DIFFICULTY_TO_JUDGE = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };

const DEFAULT_BOILERPLATE_SQL = "-- Write your query below.\nSELECT\n";

/**
 * Partial credit is deliberately off by default: SQLJudge stops at the first
 * failing testcase, so `passed` is "how far it got", not "how much is right".
 * Awarding a fraction of it would reward ordering luck rather than correctness.
 */
const PARTIAL_SCORING = String(process.env.SQL_PARTIAL_SCORING || "false") === "true";

class SqlQuestionError extends Error {
  constructor(message, { status = 400, code = "SQL_QUESTION_INVALID", details = null } = {}) {
    super(message);
    this.name = "SqlQuestionError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeSql(value, field, { required = true } = {}) {
  if (!isNonEmptyString(value)) {
    if (required) throw new SqlQuestionError(`"${field}" is required`);
    return "";
  }
  if (value.length > MAX_SQL_LENGTH) {
    throw new SqlQuestionError(`"${field}" exceeds ${MAX_SQL_LENGTH} characters`);
  }
  return value.replace(/\r\n/g, "\n");
}

/**
 * Validates and normalises the admin payload for a SQL question.
 *
 * Accepts the JSON shape the admin uploads: question metadata plus schemaSql,
 * solutionSql and a list of testcases each carrying its own seedSql and a
 * visible/hidden flag.
 */
function parseSqlQuestionPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SqlQuestionError("Request body must be a JSON object");
  }

  const title = body.title;
  if (!isNonEmptyString(title)) throw new SqlQuestionError('"title" is required');

  const description = body.description;
  if (!isNonEmptyString(description)) {
    throw new SqlQuestionError('"description" is required');
  }

  const difficultyLevel = String(body.difficultyLevel || "medium").toLowerCase();
  if (!DIFFICULTY_TO_JUDGE[difficultyLevel]) {
    throw new SqlQuestionError('"difficultyLevel" must be easy, medium or hard');
  }

  const marks = body.marks === undefined || body.marks === null ? 10 : Number(body.marks);
  if (!Number.isFinite(marks) || marks < 0) {
    throw new SqlQuestionError('"marks" must be a non-negative number');
  }

  // The engine identifier defaults to a slug of the title but stays overridable,
  // because S3 question paths are immutable once published.
  const judgeQuestionId = isNonEmptyString(body.judgeQuestionId)
    ? body.judgeQuestionId.trim()
    : slugify(title);
  if (!JUDGE_ID_PATTERN.test(judgeQuestionId)) {
    throw new SqlQuestionError(
      '"judgeQuestionId" must match [A-Za-z0-9][A-Za-z0-9._-]{0,64}',
      { details: { judgeQuestionId } }
    );
  }

  const rawVersion = body.judgeVersion ?? body.version ?? 1;
  const judgeVersion = Number(
    typeof rawVersion === "string" ? rawVersion.replace(/^v/i, "") : rawVersion
  );
  if (!Number.isInteger(judgeVersion) || judgeVersion < 1) {
    throw new SqlQuestionError('"judgeVersion" must be a positive integer');
  }

  const schemaSql = normalizeSql(body.schemaSql ?? body.schema, "schemaSql");
  const solutionSql = normalizeSql(body.solutionSql ?? body.solution, "solutionSql");

  const rawTestcases = Array.isArray(body.testcases) ? body.testcases : [];
  if (rawTestcases.length === 0) {
    throw new SqlQuestionError("At least one testcase is required");
  }
  if (rawTestcases.length > MAX_TESTCASES) {
    throw new SqlQuestionError(
      `A SQL question supports at most ${MAX_TESTCASES} testcases; received ${rawTestcases.length}`
    );
  }

  const seenIds = new Set();
  const testcases = rawTestcases.map((tc, index) => {
    const id = isNonEmptyString(tc?.id)
      ? tc.id.trim()
      : `tc-${String(index + 1).padStart(2, "0")}`;
    if (!TESTCASE_ID_PATTERN.test(id)) {
      throw new SqlQuestionError(`Testcase ${index + 1} has an invalid id "${id}"`);
    }
    if (seenIds.has(id)) {
      throw new SqlQuestionError(`Duplicate testcase id "${id}"`);
    }
    seenIds.add(id);

    const seedSql = normalizeSql(tc?.seedSql ?? tc?.seed, `testcases[${index}].seedSql`);
    // Visible unless explicitly marked hidden, matching how admins author them.
    const visible = tc?.visible === undefined ? !tc?.hidden : Boolean(tc.visible);

    return {
      id,
      seedSql,
      visible,
      // Only used by the validate action; publishing regenerates expected output.
      expected: tc?.expected ?? null,
    };
  });

  if (!testcases.some((tc) => tc.visible)) {
    throw new SqlQuestionError(
      "At least one testcase must be visible so students can see an example"
    );
  }

  const constraints = Array.isArray(body.constraints)
    ? body.constraints.filter(isNonEmptyString).map((line) => line.trim())
    : isNonEmptyString(body.constraints)
    ? String(body.constraints)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return {
    title: title.trim(),
    description,
    difficultyLevel,
    marks,
    judgeQuestionId,
    judgeVersion,
    slug: isNonEmptyString(body.slug) ? slugify(body.slug) : slugify(title),
    schemaSql,
    solutionSql,
    boilerplateSql: isNonEmptyString(body.boilerplateSql)
      ? body.boilerplateSql
      : DEFAULT_BOILERPLATE_SQL,
    testcases,
    constraints,
    hints: Array.isArray(body.hints) ? body.hints.filter(isNonEmptyString) : [],
    tags: Array.isArray(body.tags) ? body.tags.filter(isNonEmptyString) : [],
    companies: Array.isArray(body.companies)
      ? body.companies.filter(isNonEmptyString)
      : [],
    editorial: typeof body.editorial === "string" ? body.editorial : "",
    overwrite: body.overwrite === true,
  };
}

/**
 * Authoring action 1 — Generate Outputs.
 *
 * Runs the reference solution against every seed in a real container and returns
 * the generated expected output per testcase. Nothing is written to S3.
 */
async function generateOutputs(input) {
  const response = await sqlJudge.previewQuestion({
    schemaSql: input.schemaSql,
    solutionSql: input.solutionSql,
    testcases: input.testcases.map((tc) => ({ id: tc.id, seedSql: tc.seedSql })),
  });

  const byId = new Map(
    (response?.testcases || []).map((tc) => [tc.id, tc.expected ?? null])
  );

  return {
    executionTimeMs: response?.executionTimeMs ?? null,
    outputColumns: response?.outputColumns || [],
    testcases: input.testcases.map((tc) => ({
      id: tc.id,
      visible: tc.visible,
      seedSql: tc.seedSql,
      expected: byId.get(tc.id) ?? null,
    })),
  };
}

/** Canonical form so 65000.00, "65000.00" and 65000 compare equal. */
function canonicalCell(value) {
  if (value === null || value === undefined) return "\u0000null";
  if (typeof value === "boolean") return value ? "1" : "0";
  const text = String(value).trim();
  if (/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text)) {
    const negative = text.startsWith("-");
    const [intPart = "", fracPart = ""] = text.replace(/^[+-]/, "").split(".");
    const normalizedInt = intPart.replace(/^0+(?=\d)/, "") || "0";
    const normalizedFrac = fracPart.replace(/0+$/, "");
    const magnitude = normalizedFrac ? `${normalizedInt}.${normalizedFrac}` : normalizedInt;
    return magnitude === "0" ? "0" : `${negative ? "-" : ""}${magnitude}`;
  }
  return text;
}

function diffExpected(supplied, generated) {
  if (!supplied) return { match: false, reason: "No expected output was supplied" };

  const suppliedColumns = supplied.columns || [];
  const generatedColumns = generated?.columns || [];
  if (suppliedColumns.length !== generatedColumns.length) {
    return {
      match: false,
      reason: `Expected ${generatedColumns.length} column(s), supplied ${suppliedColumns.length}`,
    };
  }
  for (let i = 0; i < generatedColumns.length; i += 1) {
    if (String(suppliedColumns[i]) !== String(generatedColumns[i])) {
      return {
        match: false,
        reason: `Column ${i + 1} should be "${generatedColumns[i]}" but was "${suppliedColumns[i]}"`,
      };
    }
  }

  const suppliedRows = supplied.rows || [];
  const generatedRows = generated?.rows || [];
  if (suppliedRows.length !== generatedRows.length) {
    return {
      match: false,
      reason: `Expected ${generatedRows.length} row(s), supplied ${suppliedRows.length}`,
    };
  }
  for (let r = 0; r < generatedRows.length; r += 1) {
    for (let c = 0; c < generatedColumns.length; c += 1) {
      if (
        canonicalCell((suppliedRows[r] || [])[c]) !==
        canonicalCell((generatedRows[r] || [])[c])
      ) {
        return {
          match: false,
          reason: `Row ${r + 1}, column "${generatedColumns[c]}" does not match the solution output`,
        };
      }
    }
  }
  return { match: true, reason: null };
}

/**
 * Authoring action 2 — Validate testcases.
 *
 * Optional for SQL questions, because publishing regenerates expected output
 * from the solution anyway. Useful when an admin has supplied expected rows by
 * hand and wants them checked before publishing.
 */
async function validateTestcases(input) {
  const generated = await generateOutputs(input);
  const generatedById = new Map(generated.testcases.map((tc) => [tc.id, tc.expected]));

  const results = input.testcases.map((tc) => {
    const expected = generatedById.get(tc.id) ?? null;
    const { match, reason } = tc.expected
      ? diffExpected(tc.expected, expected)
      : { match: true, reason: "No expected output supplied; solution output will be used" };
    return {
      id: tc.id,
      visible: tc.visible,
      valid: match,
      reason,
      expected,
    };
  });

  return {
    valid: results.every((r) => r.valid),
    outputColumns: generated.outputColumns,
    executionTimeMs: generated.executionTimeMs,
    testcases: results,
  };
}

/**
 * Authoring action 3 — Publish.
 *
 * Writes the question to the S3 bucket through the engine. The engine
 * regenerates expected output from the solution, so what is graded against can
 * never drift from what was authored.
 */
async function publishToJudge(input) {
  const response = await sqlJudge.publishQuestion({
    questionId: input.judgeQuestionId,
    version: input.judgeVersion,
    title: input.title,
    slug: input.slug,
    // The engine stores its own copy of the prompt; ours stays the rich HTML.
    description: stripHtml(input.description),
    difficulty: DIFFICULTY_TO_JUDGE[input.difficultyLevel],
    score: input.marks,
    constraints: input.constraints,
    schemaSql: input.schemaSql,
    solutionSql: input.solutionSql,
    testcases: input.testcases.map((tc) => ({
      id: tc.id,
      seedSql: tc.seedSql,
      visible: tc.visible,
    })),
    overwrite: input.overwrite,
  });

  return response;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds the Mongo question payload for a published SQL question. Mirrors the
 * programming-question field set so lists, filters and exports behave the same.
 */
function buildQuestionDocument(input, published, { moduleId, createdBy, expectedColumns }) {
  const privateBase = `private/questions/${input.judgeQuestionId}/v${input.judgeVersion}`;
  const publicBase = `public/questions/${input.judgeQuestionId}/v${input.judgeVersion}`;

  return {
    title: input.title,
    description: input.description,
    type: "sql",
    difficultyLevel: input.difficultyLevel,
    marks: input.marks,
    module: moduleId,
    hints: input.hints,
    tags: input.tags,
    companies: input.companies,
    editorial: input.editorial,
    createdBy,
    sqlMeta: {
      judgeQuestionId: input.judgeQuestionId,
      judgeVersion: input.judgeVersion,
      database: { type: "MYSQL", version: "8.4" },
      schemaSql: input.schemaSql,
      boilerplateSql: input.boilerplateSql,
      solutionSql: input.solutionSql,
      expectedColumns: expectedColumns || [],
      testcases: input.testcases.map((tc) => ({
        id: tc.id,
        hidden: !tc.visible,
        // Visible testcases exist under both prefixes; the private copy is the
        // one the judge grades against.
        seedKey: `${privateBase}/testcases/${tc.id}/seed.sql`,
        expectedKey: `${privateBase}/testcases/${tc.id}/expected.json`,
      })),
      visibleTestcaseCount: input.testcases.filter((tc) => tc.visible).length,
      hiddenTestcaseCount: input.testcases.filter((tc) => !tc.visible).length,
      totalTestcaseCount: input.testcases.length,
      s3Keys: {
        question: `${publicBase}/question.json`,
        config: `${privateBase}/question-config.json`,
        schema: `${privateBase}/schema.sql`,
        solution: `${privateBase}/solution.sql`,
      },
      publishedAt: new Date(),
      publishedBy: createdBy,
      ...(published?.objects ? {} : {}),
    },
  };
}

/** Maps a SQLJudge verdict onto our Submission status enum. */
function mapJudgeStatus(judgeStatus, isCorrect) {
  switch (judgeStatus) {
    case "PASSED":
      return isCorrect ? "accepted" : "wrong_answer";
    case "FAILED":
      return "wrong_answer";
    case "TIMEOUT":
      return "time_limit_exceeded";
    case "ERROR":
      return "sql_error";
    case "CANCELLED":
      return "runtime_error";
    default:
      return "wrong_answer";
  }
}

/**
 * Turns a SQLJudge submit verdict into the values stored on a Submission.
 *
 * The engine reports `passed` and `total` but never a score, so scoring is
 * decided here. Correct means the engine returned PASSED with every testcase
 * passing; anything else scores zero unless partial scoring is enabled.
 */
function gradeSubmitVerdict(verdict, question) {
  const total = Number(verdict?.total) || 0;
  const passed = Number(verdict?.passed) || 0;
  const judgeStatus = verdict?.status || "ERROR";

  const isCorrect = judgeStatus === "PASSED" && total > 0 && passed === total;

  let score = 0;
  if (isCorrect) {
    score = question.marks;
  } else if (PARTIAL_SCORING && total > 0 && passed > 0) {
    score = Math.floor((passed / total) * question.marks);
  }

  return {
    isCorrect,
    score,
    status: mapJudgeStatus(judgeStatus, isCorrect),
    passed,
    total,
    judgeStatus,
    executionTimeMs: Number(verdict?.executionTimeMs) || 0,
    failedAt: verdict?.failedAt || null,
    errorMessage: verdict?.error || null,
  };
}

module.exports = {
  SqlQuestionError,
  DEFAULT_BOILERPLATE_SQL,
  PARTIAL_SCORING,
  parseSqlQuestionPayload,
  generateOutputs,
  validateTestcases,
  publishToJudge,
  buildQuestionDocument,
  gradeSubmitVerdict,
  mapJudgeStatus,
  slugify,
  stripHtml,
};
