const mongoose = require("mongoose");
const Question = require("../models/Question");
const Module = require("../models/Module");
const UserCohort = require("../models/UserCohort");

const MAX_FILES = 25;
const MAX_QUESTIONS = 100;
const SUPPORTED_LANGUAGES = ["c", "cpp", "java", "python", "javascript"];
const DIFFICULTIES = ["easy", "medium", "hard"];

class BulkQuestionUploadError extends Error {
  constructor(message, details = {}, status = 400, code = "BULK_VALIDATION_FAILED") {
    super(message);
    this.name = "BulkQuestionUploadError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toResponse() {
    return { message: this.message, code: this.code, ...this.details };
  }
}

class TransactionsUnavailableError extends Error {
  constructor(cause) {
    super("Atomic bulk upload requires MongoDB transaction support. Configure a replica set or sharded cluster and try again.");
    this.name = "TransactionsUnavailableError";
    this.status = 503;
    this.code = "TRANSACTIONS_UNAVAILABLE";
    this.cause = cause;
  }
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

function issue(path, message) {
  return { path, message };
}
function validationError(item, issues) {
  return new BulkQuestionUploadError("Bulk question validation failed", {
    file: item.file,
    questionIndex: item.questionIndex,
    title: isNonEmptyString(item.question?.title) ? item.question.title.trim() : null,
    issues,
  });
}

function normalizeFileName(name, index, legacy) {
  if (legacy) return "questions";
  if (!isNonEmptyString(name)) return `file-${index + 1}`;
  return name.trim();
}

function normalizePayload(payload) {
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const legacy = !hasOwn(body, "files") && hasOwn(body, "questions");
  const files = legacy ? [{ name: "questions", questions: body.questions }] : body.files;

  if (!Array.isArray(files) || files.length === 0) {
    throw new BulkQuestionUploadError("Request body must contain a non-empty 'files' array or legacy 'questions' array", {
      file: null,
      questionIndex: null,
      title: null,
      issues: [issue("files", "A non-empty files array is required")],
    });
  }
  if (files.length > MAX_FILES) {
    throw new BulkQuestionUploadError(`Bulk upload supports at most ${MAX_FILES} files`, {
      file: null,
      questionIndex: null,
      title: null,
      issues: [issue("files", `Received ${files.length} files; maximum is ${MAX_FILES}`)],
    });
  }

  const items = [];
  files.forEach((file, fileIndex) => {
    const normalizedName = normalizeFileName(file?.name, fileIndex, legacy);
    if (!file || typeof file !== "object" || Array.isArray(file) || !Array.isArray(file.questions)) {
      throw new BulkQuestionUploadError("Bulk question validation failed", {
        file: normalizedName,
        questionIndex: null,
        title: null,
        issues: [issue("questions", "Each file must contain a questions array")],
      });
    }
    if (file.questions.length === 0) {
      throw new BulkQuestionUploadError("Bulk question validation failed", {
        file: normalizedName,
        questionIndex: null,
        title: null,
        issues: [issue("questions", "Each file must contain at least one question")],
      });
    }
    file.questions.forEach((question, questionIndex) => {
      items.push({
        file: normalizedName,
        fileIndex: fileIndex + 1,
        questionIndex: questionIndex + 1,
        question,
      });
    });
  });

  if (items.length > MAX_QUESTIONS) {
    throw new BulkQuestionUploadError(`Bulk upload supports at most ${MAX_QUESTIONS} total questions`, {
      file: null,
      questionIndex: null,
      title: null,
      issues: [issue("questions", `Received ${items.length} questions; maximum is ${MAX_QUESTIONS}`)],
    });
  }
  return items;
}
function validateCommonFields(question) {
  const issues = [];
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    return [issue("question", "Question must be an object")];
  }
  if (!isNonEmptyString(question.title)) issues.push(issue("title", "Title must be a non-empty string"));
  if (!isNonEmptyString(question.description)) issues.push(issue("description", "Description must be a non-empty string"));
  if (question.type === "sql") {
    // SQL questions cannot be bulk created: publishing each one executes its
    // reference solution against every seed and writes assets to S3, which is
    // driven by the dedicated SQL authoring flow instead.
    issues.push(
      issue(
        "type",
        "SQL questions must be created through the SQL question form, not bulk upload"
      )
    );
  } else if (!["mcq", "programming"].includes(question.type)) {
    issues.push(issue("type", "Type must be 'mcq' or 'programming'"));
  }
  if (hasOwn(question, "difficultyLevel") && !DIFFICULTIES.includes(question.difficultyLevel)) {
    issues.push(issue("difficultyLevel", "Difficulty must be 'easy', 'medium', or 'hard'"));
  }
  const marks = hasOwn(question, "marks") ? question.marks : 10;
  if (!isFiniteNumber(marks) || marks <= 0) issues.push(issue("marks", "Marks must be a positive number"));
  return issues;
}

function validateMcq(question) {
  const issues = [];
  if (!Array.isArray(question.options) || question.options.length < 2) {
    return [issue("options", "MCQ questions must have at least two options")];
  }
  question.options.forEach((option, index) => {
    if (!option || typeof option !== "object" || !isNonEmptyString(option.text)) {
      issues.push(issue(`options.${index}.text`, "Option text must be a non-empty string"));
    }
    if (!option || typeof option.isCorrect !== "boolean") {
      issues.push(issue(`options.${index}.isCorrect`, "isCorrect must be a boolean"));
    }
  });
  if (!question.options.some((option) => option?.isCorrect === true)) {
    issues.push(issue("options", "MCQ questions must have at least one correct option"));
  }
  return issues;
}

function validateScoring(language, languageIndex, marks) {
  const issues = [];
  const prefix = `languages.${languageIndex}`;
  if (hasOwn(language, "minimumPoints")) {
    if (!isFiniteNumber(language.minimumPoints) || language.minimumPoints < 0 || language.minimumPoints > marks) {
      issues.push(issue(`${prefix}.minimumPoints`, "Minimum points must be between 0 and the question marks"));
    }
  }
  if (!hasOwn(language, "scoringTiers")) return issues;
  if (!Array.isArray(language.scoringTiers)) {
    issues.push(issue(`${prefix}.scoringTiers`, "Scoring tiers must be an array when provided"));
    return issues;
  }
  language.scoringTiers.forEach((tier, tierIndex) => {
    if (!tier || !isFiniteNumber(tier.maxTime) || tier.maxTime <= 0) {
      issues.push(issue(`${prefix}.scoringTiers.${tierIndex}.maxTime`, "maxTime must be a positive number"));
    }
    if (!tier || !isFiniteNumber(tier.points) || tier.points < 0 || tier.points > marks) {
      issues.push(issue(`${prefix}.scoringTiers.${tierIndex}.points`, "Points must be between 0 and the question marks"));
    }
    if (tierIndex > 0) {
      const previous = language.scoringTiers[tierIndex - 1];
      if (previous && isFiniteNumber(previous.maxTime) && isFiniteNumber(tier?.maxTime) && previous.maxTime >= tier.maxTime) {
        issues.push(issue(`${prefix}.scoringTiers.${tierIndex}.maxTime`, "Tier maxTime values must increase"));
      }
      if (previous && isFiniteNumber(previous.points) && isFiniteNumber(tier?.points) && previous.points <= tier.points) {
        issues.push(issue(`${prefix}.scoringTiers.${tierIndex}.points`, "Tier points must decrease"));
      }
    }
  });
  return issues;
}
function validateProgramming(question) {
  const issues = [];
  const marks = hasOwn(question, "marks") ? question.marks : 10;
  if (!Array.isArray(question.languages) || question.languages.length === 0) {
    issues.push(issue("languages", "Programming questions must have at least one language"));
  } else {
    question.languages.forEach((language, index) => {
      if (!language || typeof language !== "object") {
        issues.push(issue(`languages.${index}`, "Language must be an object"));
        return;
      }
      if (!SUPPORTED_LANGUAGES.includes(language.name)) {
        issues.push(issue(`languages.${index}.name`, `Language must be one of: ${SUPPORTED_LANGUAGES.join(", ")}`));
      }
      if (!isNonEmptyString(language.boilerplateCode)) {
        issues.push(issue(`languages.${index}.boilerplateCode`, "boilerplateCode must be a non-empty string"));
      }
      if (!isNonEmptyString(language.solutionCode)) {
        issues.push(issue(`languages.${index}.solutionCode`, "solutionCode must be a non-empty string"));
      }
      issues.push(...validateScoring(language, index, marks));
    });
  }
  if (!SUPPORTED_LANGUAGES.includes(question.defaultLanguage)) {
    issues.push(issue("defaultLanguage", "defaultLanguage must be a supported language"));
  } else if (!question.languages?.some((language) => language?.name === question.defaultLanguage)) {
    issues.push(issue("defaultLanguage", "defaultLanguage must be present in languages"));
  }
  if (!Array.isArray(question.testCases) || question.testCases.length === 0) {
    issues.push(issue("testCases", "Programming questions must have at least one test case"));
  } else {
    question.testCases.forEach((testCase, index) => {
      if (!testCase || typeof testCase.input !== "string") issues.push(issue(`testCases.${index}.input`, "Test case input must be a string"));
      if (!testCase || typeof testCase.output !== "string") issues.push(issue(`testCases.${index}.output`, "Test case output must be a string"));
    });
  }
  const constraints = question.constraints || { timeLimit: 2000, memoryLimit: 256 };
  if (!constraints || typeof constraints !== "object") {
    issues.push(issue("constraints", "Constraints must be an object"));
  } else {
    if (!isFiniteNumber(constraints.timeLimit) || constraints.timeLimit <= 0) issues.push(issue("constraints.timeLimit", "timeLimit must be a positive number"));
    if (!isFiniteNumber(constraints.memoryLimit) || constraints.memoryLimit <= 0) issues.push(issue("constraints.memoryLimit", "memoryLimit must be a positive number"));
  }
  return issues;
}

function mapQuestion(question, moduleId, createdBy) {
  question = question && typeof question === "object" && !Array.isArray(question)
    ? question
    : {};
  const data = {
    title: question.title,
    description: question.description,
    type: question.type,
    difficultyLevel: hasOwn(question, "difficultyLevel") ? question.difficultyLevel : "medium",
    marks: hasOwn(question, "marks") ? question.marks : 10,
    module: moduleId,
    hints: hasOwn(question, "hints") ? question.hints : [],
    tags: hasOwn(question, "tags") ? question.tags : [],
    companies: hasOwn(question, "companies") ? question.companies : [],
    editorial: hasOwn(question, "editorial") ? question.editorial : "",
    createdBy,
  };

  if (hasOwn(question, "stats")) data.stats = question.stats;
  if (question.type === "mcq") {
    data.options = Array.isArray(question.options)
      ? question.options.map((option) => ({
          text: option?.text,
          isCorrect: option?.isCorrect,
        }))
      : [];
  } else if (question.type === "programming") {
    data.languages = Array.isArray(question.languages)
      ? question.languages.map((language) => ({
          name: language?.name,
          ...(hasOwn(language || {}, "version") && { version: language.version }),
          boilerplateCode: language?.boilerplateCode,
          solutionCode: language?.solutionCode,
          ...(Array.isArray(language?.scoringTiers) && {
            scoringTiers: language.scoringTiers.map((tier) => ({
              maxTime: tier?.maxTime,
              points: tier?.points,
            })),
          }),
          ...(hasOwn(language || {}, "minimumPoints") && { minimumPoints: language.minimumPoints }),
        }))
      : [];
    data.defaultLanguage = question.defaultLanguage;
    data.testCases = Array.isArray(question.testCases)
      ? question.testCases.map((testCase) => ({
          input: testCase?.input,
          output: testCase?.output,
          ...(hasOwn(testCase || {}, "hidden") && { hidden: testCase.hidden }),
          ...(hasOwn(testCase || {}, "explanation") && { explanation: testCase.explanation }),
        }))
      : [];
    data.constraints = question.constraints && typeof question.constraints === "object"
      ? question.constraints
      : { timeLimit: 2000, memoryLimit: 256 };
    if (hasOwn(question, "fillInTheBlank")) data.fillInTheBlank = question.fillInTheBlank;
    if (hasOwn(question, "encryptedEditor")) data.encryptedEditor = question.encryptedEditor;
    if (hasOwn(question, "encryptionSettings")) data.encryptionSettings = question.encryptionSettings;
  }
  return data;
}
function mongooseIssues(error) {
  if (!error?.errors) return [issue("question", error.message || "Question is invalid")];
  return Object.keys(error.errors)
    .sort()
    .map((path) => issue(path, error.errors[path].message));
}

async function prepareBulkQuestionUpload(payload, { moduleId, createdBy }) {
  const items = normalizePayload(payload);
  const documents = [];

  for (const item of items) {
    const commonIssues = validateCommonFields(item.question);
    const typeIssues = item.question?.type === "mcq"
      ? validateMcq(item.question)
      : item.question?.type === "programming"
        ? validateProgramming(item.question)
        : [];
    const issues = [...commonIssues, ...typeIssues];

    // Always exercise the model's complete validation for this item as part of
    // preflight, even when explicit domain checks have already found issues.
    const document = new Question(mapQuestion(item.question, moduleId, createdBy));
    try {
      await document.validate();
    } catch (error) {
      for (const modelIssue of mongooseIssues(error)) {
        if (!issues.some((existing) => existing.path === modelIssue.path && existing.message === modelIssue.message)) {
          issues.push(modelIssue);
        }
      }
    }
    if (issues.length > 0) throw validationError(item, issues);
    documents.push(document);
  }

  return {
    documents,
    questionCount: documents.length,
    fileCount: new Set(items.map((item) => item.fileIndex)).size,
  };
}

const { isTransactionsUnavailableError } = require("../utils/mongoTransaction");

function buildQuestionProgress(questionIds) {
  return questionIds.map((question) => ({
    question,
    attempts: 0,
    solved: false,
    bestScore: 0,
  }));
}

async function applyBulkWrites({ documents, moduleId, relatedCohortIds, session = null }) {
  const questionIds = documents.map((document) => document._id);
  const sessionOptions = session ? { session } : {};

  await Question.insertMany(documents, { ...sessionOptions, ordered: true });

  const moduleResult = await Module.updateOne(
    { _id: moduleId },
    { $addToSet: { questions: { $each: questionIds } } },
    sessionOptions
  );
  if (moduleResult.matchedCount !== 1) {
    throw new BulkQuestionUploadError("Module no longer exists", {}, 404, "MODULE_NOT_FOUND");
  }

  await UserCohort.updateMany(
    {
      cohort: { $in: relatedCohortIds },
      "moduleProgress.module": moduleId,
    },
    {
      $inc: { "moduleProgress.$[progress].totalQuestions": questionIds.length },
      $addToSet: { questionProgress: { $each: buildQuestionProgress(questionIds) } },
      $set: { updatedAt: new Date() },
    },
    {
      ...sessionOptions,
      arrayFilters: [{ "progress.module": moduleId }],
    }
  );

  return questionIds;
}

async function rollbackStandaloneBulk({ questionIds, moduleId, relatedCohortIds }) {
  const remainingQuestionCount = await Question.countDocuments({
    module: moduleId,
    _id: { $nin: questionIds },
  });

  const results = await Promise.allSettled([
    Module.updateOne(
      { _id: moduleId },
      { $pull: { questions: { $in: questionIds } } }
    ),
    UserCohort.updateMany(
      {
        cohort: { $in: relatedCohortIds },
        "moduleProgress.module": moduleId,
      },
      {
        $pull: { questionProgress: { question: { $in: questionIds } } },
        $set: {
          "moduleProgress.$[progress].totalQuestions": remainingQuestionCount,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "progress.module": moduleId }] }
    ),
    Question.deleteMany({ _id: { $in: questionIds } }),
  ]);

  return results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);
}

async function persistBulkWithoutTransaction({ documents, moduleId, relatedCohortIds }) {
  const questionIds = documents.map((document) => document._id);
  try {
    await applyBulkWrites({ documents, moduleId, relatedCohortIds });
    return { created: questionIds.length, persistenceMode: "compensating" };
  } catch (error) {
    const compensationFailures = await rollbackStandaloneBulk({
      questionIds,
      moduleId,
      relatedCohortIds,
    });
    if (compensationFailures.length > 0) {
      error.compensationFailed = true;
      console.error(
        "CRITICAL: Bulk upload compensation was incomplete:",
        compensationFailures
      );
    }
    throw error;
  }
}

async function persistBulkQuestions({ documents, moduleId, relatedCohortIds }) {
  const session = await mongoose.startSession();
  let requiresStandaloneFallback = false;

  try {
    session.startTransaction();
    const questionIds = await applyBulkWrites({
      documents,
      moduleId,
      relatedCohortIds,
      session,
    });
    await session.commitTransaction();
    return { created: questionIds.length, persistenceMode: "transaction" };
  } catch (error) {
    const transactionsUnavailable = isTransactionsUnavailableError(error);
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Error aborting bulk upload transaction:", abortError);
      }
    }
    if (!transactionsUnavailable) throw error;
    requiresStandaloneFallback = true;
  } finally {
    await session.endSession();
  }

  if (requiresStandaloneFallback) {
    console.warn(
      "MongoDB transactions are unavailable; bulk upload is using compensating rollback protection."
    );
    return persistBulkWithoutTransaction({ documents, moduleId, relatedCohortIds });
  }

  throw new TransactionsUnavailableError();
}

module.exports = {
  BulkQuestionUploadError,
  TransactionsUnavailableError,
  prepareBulkQuestionUpload,
  persistBulkQuestions,
};
