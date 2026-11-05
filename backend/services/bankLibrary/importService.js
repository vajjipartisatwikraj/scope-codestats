/**
 * Imports from the bank library into a cohort. This is the part of the library that touches cohort
 * data, so it is written to be safe to stop, to repeat and to run on a big bank:
 *
 *   - It runs in the background. `startImport` plans the work, saves a BankLibraryImportJob and
 *     answers at once; the page reads the job again every second or two for progress.
 *   - The plan is saved with the job (which topic goes into which module, and the question ids), so
 *     the work is the same however many times it is resumed.
 *   - Questions are read from S3 a few at a time and written to the database in chunks (default 50,
 *     never more than 100). Every chunk is atomic (transaction or compensating rollback, the same
 *     code as the cohort's bulk upload). The job is saved after every chunk.
 *   - A question that is already in the target module (it was imported there before) is left out and
 *     counted as "already there". That is what makes Retry safe: it finds what the failed run wrote.
 *   - A bad question (missing in S3, or invalid) is counted and reported; it does not stop the rest.
 *     A broken database or bucket does stop the job, with what was done kept and Retry available.
 *
 * What an import makes: for a whole bank (or chosen topics) one new module per topic, in the order of
 * the topics; for a selection, questions added to one existing module. Imports are copies. Importing
 * the same bank or topic again makes new modules; importing the same question into a module that
 * already has it does nothing.
 */
const mongoose = require("mongoose");
const Cohort = require("../../models/Cohort");
const Module = require("../../models/Module");
const Question = require("../../models/Question");
const BankLibraryEntry = require("../../models/BankLibraryEntry");
const BankLibraryImportJob = require("../../models/BankLibraryImportJob");
const cascadeService = require("../cohortCascadeService");
const { checkQuestion, persistBulkQuestions } = require("../bulkQuestionUploadService");
const { getConfig } = require("../../config/bankLibrary");
const logger = require("../../utils/logger");
const store = require("./s3Store");
const catalog = require("./catalogService");
const { BankLibraryError, assertId, questionKey, topicInfoKey, mapLimit, cleanText } = require("./common");

const log = logger.scope("BANK-LIBRARY");

const ACTIVE = ["queued", "running"];
const RETRYABLE = ["failed", "partial", "interrupted", "cancelled"];
const MAX_FAILURES_KEPT = 20;

// ---- Starting an import ------------------------------------------------------------------------------

const uniqueIds = (kind, list) => {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) throw new BankLibraryError(`${kind}Ids must be a list.`, 400, "VALIDATION_FAILED");
  return [...new Set(list.map((id) => assertId(kind, id)))];
};

/**
 * Plans an import and starts it. Resolves with the job as the page shows it.
 *
 *   cohortId            the cohort that receives the content
 *   bankId              the bank it comes from (a teacher can only use published banks)
 *   topicIds            the topics to bring in; none means every topic of the bank
 *   questionIds         single questions to bring in (only with moduleId)
 *   moduleId            an existing module of the cohort to add to. Without it every topic becomes a new module.
 */
async function startImport({ user, cohortId, bankId, topicIds, questionIds, moduleId }) {
  if (!mongoose.Types.ObjectId.isValid(cohortId)) throw new BankLibraryError("Invalid cohort.", 400, "VALIDATION_FAILED");
  const bank = await catalog.findBank(bankId, user);
  const wantedTopics = uniqueIds("topic", topicIds);
  const wantedQuestions = uniqueIds("question", questionIds);

  const cohort = await Cohort.findById(cohortId).select("title modules").lean();
  if (!cohort) throw new BankLibraryError("Cohort not found.", 404, "NOT_FOUND");

  if (moduleId) {
    if (!mongoose.Types.ObjectId.isValid(moduleId) || !(cohort.modules || []).some((id) => String(id) === String(moduleId))) {
      throw new BankLibraryError("That module is not in this cohort.", 404, "NOT_FOUND");
    }
    if (wantedTopics.length === 0 && wantedQuestions.length === 0) {
      throw new BankLibraryError("Choose the topics or questions to import.", 400, "VALIDATION_FAILED");
    }
  } else if (wantedQuestions.length > 0) {
    throw new BankLibraryError("Choose the module that should receive single questions.", 400, "VALIDATION_FAILED");
  }

  const busy = await BankLibraryImportJob.exists({ cohort: cohortId, status: { $in: ACTIVE } });
  if (busy) throw new BankLibraryError("An import is already running for this cohort. Wait for it to finish.", 409, "IMPORT_RUNNING");

  // ---- The plan
  // No module and no chosen topics means the whole bank. With a module, only what was chosen comes in.
  const topicFilter = { kind: "topic", bankId: bank.uid };
  if (wantedTopics.length > 0) topicFilter.uid = { $in: wantedTopics };
  const topics = !moduleId || wantedTopics.length > 0 ? await BankLibraryEntry.find(topicFilter).sort({ order: 1, name: 1 }).lean() : [];
  if (wantedTopics.length > 0 && topics.length !== wantedTopics.length) {
    throw new BankLibraryError("Some of the chosen topics are no longer in the library.", 400, "VALIDATION_FAILED");
  }
  if (!moduleId && topics.length === 0) throw new BankLibraryError("This bank has no topics yet.", 400, "VALIDATION_FAILED");

  const steps = [];
  const topicQuestions = async (topicIds_) => {
    const rows = await BankLibraryEntry.find({ kind: "question", bankId: bank.uid, topicId: { $in: topicIds_ } })
      .sort({ order: 1, name: 1 })
      .select("uid topicId")
      .lean();
    const byTopic = {};
    rows.forEach((row) => {
      (byTopic[row.topicId] = byTopic[row.topicId] || []).push(row.uid);
    });
    return byTopic;
  };

  const inTopics = await topicQuestions(topics.map((topic) => topic.uid));
  topics.forEach((topic) => {
    const ids = inTopics[topic.uid] || [];
    steps.push({
      topicId: topic.uid,
      topicName: topic.name,
      createModule: !moduleId,
      module: moduleId || null,
      questionIds: ids,
      // A topic with no questions makes no module
      status: ids.length > 0 ? "pending" : "skipped",
    });
  });

  if (wantedQuestions.length > 0) {
    const picked = await BankLibraryEntry.find({ kind: "question", bankId: bank.uid, uid: { $in: wantedQuestions } })
      .sort({ order: 1, name: 1 })
      .select("uid topicId")
      .lean();
    if (picked.length !== wantedQuestions.length) throw new BankLibraryError("Some of the chosen questions are no longer in the library.", 400, "VALIDATION_FAILED");
    const covered = new Set(topics.map((topic) => topic.uid));
    const groups = new Map();
    picked.forEach((row) => {
      if (covered.has(row.topicId)) return; // the whole topic is already being imported
      groups.set(row.topicId, [...(groups.get(row.topicId) || []), row.uid]);
    });
    if (groups.size > 0) {
      const names = await BankLibraryEntry.find({ kind: "topic", uid: { $in: [...groups.keys()] } }).select("uid name").lean();
      const nameOf = Object.fromEntries(names.map((row) => [row.uid, row.name]));
      groups.forEach((ids, topicId) => {
        steps.push({ topicId, topicName: nameOf[topicId] || "Questions", createModule: false, module: moduleId, questionIds: ids, status: "pending" });
      });
    }
  }

  const total = steps.reduce((sum, step) => sum + (step.status === "skipped" ? 0 : step.questionIds.length), 0);
  const config = getConfig();
  if (total === 0) throw new BankLibraryError("There are no questions to import.", 400, "VALIDATION_FAILED");
  if (total > config.importMaxQuestions) {
    throw new BankLibraryError(`That is ${total} questions. One import can bring in at most ${config.importMaxQuestions}; import in parts.`, 400, "VALIDATION_FAILED");
  }

  const job = await BankLibraryImportJob.create({
    cohort: cohortId,
    createdBy: user.id,
    bankId: bank.uid,
    bankName: bank.name,
    kind: moduleId ? "selection" : "bank",
    targetModule: moduleId || null,
    steps,
    progress: { total, imported: 0, skipped: 0, failed: 0, stepsDone: 0, stepsTotal: steps.filter((step) => step.status !== "skipped").length },
  });

  log.info(`import ${job.id} queued | ${total} questions in ${job.progress.stepsTotal} step(s) | bank=${bank.uid}`);
  enqueue(job.id);
  return toClient(job);
}

// ---- The queue -----------------------------------------------------------------------------------------

const waiting = [];
let running = 0;

function enqueue(jobId) {
  waiting.push(String(jobId));
  pump();
}

function pump() {
  while (running < getConfig().importJobs && waiting.length > 0) {
    const jobId = waiting.shift();
    running += 1;
    runJob(jobId)
      .catch((error) => log.error(`import ${jobId} crashed:`, error))
      .finally(() => {
        running -= 1;
        pump();
      });
  }
}

// ---- Running a job -------------------------------------------------------------------------------------

const isCancelled = async (jobId) => Boolean(await BankLibraryImportJob.exists({ _id: jobId, cancelRequested: true }));

function recomputeProgress(job) {
  const progress = { total: 0, imported: 0, skipped: 0, failed: 0, stepsDone: 0, stepsTotal: 0 };
  job.steps.forEach((step) => {
    if (step.status === "skipped") return;
    progress.total += step.questionIds.length;
    progress.imported += step.imported;
    progress.skipped += step.skipped;
    progress.failed += step.failed;
    progress.stepsTotal += 1;
    if (["done", "partial", "failed"].includes(step.status)) progress.stepsDone += 1;
  });
  job.progress = progress;
}

const finished = (progress) => progress.imported + progress.skipped + progress.failed;

async function runJob(jobId) {
  const job = await BankLibraryImportJob.findById(jobId);
  if (!job || job.status !== "queued") return;

  job.status = "running";
  job.startedAt = job.startedAt || new Date();
  job.finishedAt = undefined;
  job.error = undefined;
  await job.save();

  const jlog = logger.job(`bank-import ${job.id.slice(-6)}`, { total: job.progress.total });
  let cancelled = false;

  try {
    for (let index = 0; index < job.steps.length; index += 1) {
      const step = job.steps[index];
      if (["done", "skipped"].includes(step.status)) continue;
      if (await isCancelled(job._id)) {
        cancelled = true;
        break;
      }
      const outcome = await runStep(job, step, jlog);
      if (outcome === "cancelled") {
        cancelled = true;
        break;
      }
    }

    recomputeProgress(job);
    job.finishedAt = new Date();
    if (cancelled) {
      job.status = "cancelled";
      jlog.cancel();
    } else {
      const problems = job.steps.some((step) => ["partial", "failed"].includes(step.status));
      job.status = !problems ? "done" : job.progress.imported + job.progress.skipped > 0 ? "partial" : "failed";
      jlog.complete();
    }
    await job.save();
  } catch (error) {
    // Something that is not about one question: the database or the bucket is not working
    jlog.error(error);
    job.steps.forEach((step) => {
      if (step.status === "running") {
        step.status = "failed";
        step.error = error instanceof BankLibraryError ? error.message : "The import stopped because of a server error.";
      }
    });
    recomputeProgress(job);
    job.status = "failed";
    job.error = error instanceof BankLibraryError ? error.message : "The import stopped because of a server error. What was imported is kept; retry to continue.";
    job.finishedAt = new Date();
    await job.save().catch((saveError) => log.error("could not save the failed import:", saveError));
  }
}

/** The module for a topic: made now, or the one an earlier attempt of this job already made */
async function moduleForStep(job, step) {
  if (step.module) return step.module;

  const info = (await store.tryGetJson(topicInfoKey(job.bankId, step.topicId))) || {};
  const name = cleanText(info.name || step.topicName, 200) || "Imported topic";

  const cohort = await Cohort.findById(job.cohort).select("modules").lean();
  const last = await Module.findOne({ _id: { $in: cohort?.modules || [] } }).sort({ order: -1 }).select("order").lean();
  const related = await cascadeService.getRelatedCohorts(job.cohort);
  const relatedIds = related.map((entry) => entry._id);

  const module = await Module.create({
    title: name,
    description: cleanText(info.description, 1000) || name,
    order: last ? (last.order || 0) + 1 : 0,
    videoResource: info.videoResource || undefined,
    documentationUrl: info.documentationUrl || undefined,
    resources: Array.isArray(info.resources) ? info.resources.filter((resource) => resource?.title && resource?.url) : [],
    cohort: job.cohort,
    importedFrom: { bankId: job.bankId, topicId: step.topicId, job: job._id },
  });

  const update = await Cohort.updateMany({ _id: { $in: relatedIds } }, { $addToSet: { modules: module._id } });
  if (update.matchedCount !== relatedIds.length) {
    await Promise.allSettled([Cohort.updateMany({ _id: { $in: relatedIds } }, { $pull: { modules: module._id } }), Module.deleteOne({ _id: module._id })]);
    throw new Error("One or more related cohorts no longer exist");
  }

  step.module = module._id;
  await job.save(); // so a retry finds the module
  return module._id;
}

/** Removes a module this job made when nothing ended up in it */
async function dropEmptyModule(job, step) {
  if (!step.createModule || !step.module) return;
  const related = await cascadeService.getRelatedCohorts(job.cohort);
  await Promise.allSettled([
    Cohort.updateMany({ _id: { $in: related.map((entry) => entry._id) } }, { $pull: { modules: step.module } }),
    Module.deleteOne({ _id: step.module }),
  ]);
  step.module = null;
}

function noteFailure(step, jlog, questionId, title, reason) {
  step.failed += 1;
  if (step.failures.length < MAX_FAILURES_KEPT) step.failures.push({ questionId, title: cleanText(title, 120), reason: cleanText(reason, 200) });
  jlog.fail(questionId, new Error(reason));
}

/**
 * Brings one step's questions into its module. Returns "cancelled" when the job was cancelled,
 * otherwise nothing. Throws when the database or the bucket fails (the job stops).
 */
async function runStep(job, step, jlog) {
  const config = getConfig();
  step.status = "running";
  step.error = undefined;
  step.imported = 0;
  step.skipped = 0;
  step.failed = 0;
  step.failures = [];
  await job.save();

  const moduleId = await moduleForStep(job, step);
  const related = await cascadeService.getRelatedCohorts(job.cohort);
  const relatedCohortIds = related.map((entry) => entry._id);

  // What is already in the module: questions this job wrote before a stop count as done, questions
  // that were there before it count as "already there"
  const present = await Question.aggregate([
    { $match: { module: moduleId, "importedFrom.questionId": { $in: step.questionIds } } },
    { $project: { _id: 0, questionId: "$importedFrom.questionId", job: "$importedFrom.job" } },
  ]);
  const presentBy = new Map(present.map((row) => [row.questionId, row]));
  const todo = [];
  step.questionIds.forEach((questionId) => {
    const row = presentBy.get(questionId);
    if (!row) todo.push(questionId);
    else if (String(row.job) === String(job._id)) step.imported += 1;
    else step.skipped += 1;
  });

  for (let start = 0; start < todo.length; start += config.importChunk) {
    if (await isCancelled(job._id)) {
      step.status = "pending";
      await settle(job, jlog);
      return "cancelled";
    }
    const batch = todo.slice(start, start + config.importChunk);

    const fetched = await mapLimit(batch, config.fetchConcurrency, async (questionId) => {
      try {
        return { questionId, source: await store.getJson(questionKey(job.bankId, step.topicId, questionId)) };
      } catch (error) {
        // Missing from the bucket is this question's problem; anything else is the bucket's
        if (error instanceof BankLibraryError && error.status === 404) return { questionId, missing: true };
        throw error;
      }
    });

    const documents = [];
    for (const item of fetched) {
      if (item.missing) {
        noteFailure(step, jlog, item.questionId, item.questionId, "It is no longer in the library");
        continue;
      }
      const { issues, document } = await checkQuestion(item.source, { moduleId, createdBy: job.createdBy });
      if (issues.length > 0) {
        const first = issues[0];
        noteFailure(step, jlog, item.questionId, item.source?.title, `${first.path}: ${first.message}`);
        continue;
      }
      document.importedFrom = { bankId: job.bankId, topicId: step.topicId, questionId: item.questionId, job: job._id };
      documents.push(document);
    }

    if (documents.length > 0) {
      await persistBulkQuestions({ documents, moduleId, relatedCohortIds });
      step.imported += documents.length;
    }
    await settle(job, jlog);
  }

  const gotSomething = step.imported + step.skipped > 0;
  step.status = step.failed === 0 ? "done" : gotSomething ? "partial" : "failed";
  if (!gotSomething) await dropEmptyModule(job, step);
  await settle(job, jlog);
}

/** Saves the job with fresh totals and reports the progress */
async function settle(job, jlog) {
  recomputeProgress(job);
  await job.save();
  jlog.progress(finished(job.progress));
}

// ---- Reading, cancelling, retrying -----------------------------------------------------------------------

function toClient(job) {
  const progress = {
    total: job.progress?.total || 0,
    imported: job.progress?.imported || 0,
    skipped: job.progress?.skipped || 0,
    failed: job.progress?.failed || 0,
    stepsDone: job.progress?.stepsDone || 0,
    stepsTotal: job.progress?.stepsTotal || 0,
  };
  const percent = job.status === "done" ? 100 : progress.total > 0 ? Math.min(100, Math.floor((finished(progress) / progress.total) * 100)) : 0;
  return {
    id: String(job._id),
    cohortId: String(job.cohort),
    bankId: job.bankId,
    bankName: job.bankName,
    kind: job.kind,
    status: job.status,
    active: ACTIVE.includes(job.status),
    canRetry: RETRYABLE.includes(job.status),
    error: job.error || null,
    progress: { ...progress, percent },
    steps: job.steps.map((step) => ({
      topicId: step.topicId,
      topicName: step.topicName,
      status: step.status,
      total: step.questionIds.length,
      imported: step.imported,
      skipped: step.skipped,
      failed: step.failed,
      failures: (step.failures || []).map((failure) => ({ questionId: failure.questionId, title: failure.title, reason: failure.reason })),
      error: step.error || null,
      moduleId: step.module ? String(step.module) : null,
    })),
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    finishedAt: job.finishedAt || null,
  };
}

async function getJob(jobId) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw new BankLibraryError("Import not found.", 404, "NOT_FOUND");
  const job = await BankLibraryImportJob.findById(jobId);
  if (!job) throw new BankLibraryError("Import not found.", 404, "NOT_FOUND");
  return toClient(job);
}

/** The latest imports of a cohort, newest first (the cohort page uses it to pick up a running import after a reload) */
async function listJobs(cohortId, limit = 5) {
  if (!mongoose.Types.ObjectId.isValid(cohortId)) throw new BankLibraryError("Invalid cohort.", 400, "VALIDATION_FAILED");
  const jobs = await BankLibraryImportJob.find({ cohort: cohortId }).sort({ createdAt: -1 }).limit(limit);
  return jobs.map(toClient);
}

async function cancelJob(jobId) {
  const current = await getJob(jobId);
  if (!current.active) throw new BankLibraryError("This import is not running.", 409, "NOT_ACTIVE");

  // Waiting in the queue: it never started, so it can be closed at once
  const queued = await BankLibraryImportJob.findOneAndUpdate(
    { _id: jobId, status: "queued" },
    { $set: { status: "cancelled", cancelRequested: true, finishedAt: new Date() } },
    { new: true }
  );
  if (queued) {
    const at = waiting.indexOf(String(jobId));
    if (at >= 0) waiting.splice(at, 1);
    return toClient(queued);
  }
  // Running: it stops after the batch it is on
  await BankLibraryImportJob.updateOne({ _id: jobId, status: "running" }, { $set: { cancelRequested: true } });
  return getJob(jobId);
}

async function retryJob(jobId) {
  const job = await BankLibraryImportJob.findById(mongoose.Types.ObjectId.isValid(jobId) ? jobId : null);
  if (!job) throw new BankLibraryError("Import not found.", 404, "NOT_FOUND");
  if (!RETRYABLE.includes(job.status)) throw new BankLibraryError("Only an import that stopped can be retried.", 409, "NOT_RETRYABLE");
  const busy = await BankLibraryImportJob.exists({ cohort: job.cohort, status: { $in: ACTIVE }, _id: { $ne: job._id } });
  if (busy) throw new BankLibraryError("Another import is running for this cohort. Wait for it to finish.", 409, "IMPORT_RUNNING");

  job.steps.forEach((step) => {
    if (!["done", "skipped"].includes(step.status)) step.status = "pending";
  });
  job.status = "queued";
  job.cancelRequested = false;
  job.error = undefined;
  job.finishedAt = undefined;
  await job.save();
  enqueue(job.id);
  return toClient(job);
}

/**
 * Called once when the server starts. A job that was queued or running when the process stopped
 * can never finish by itself, so it is closed as "interrupted" and can be retried.
 */
async function recoverInterrupted() {
  const result = await BankLibraryImportJob.updateMany(
    { status: { $in: ACTIVE } },
    {
      $set: {
        status: "interrupted",
        error: "The server restarted during the import. Retry to carry on where it stopped.",
        finishedAt: new Date(),
        "steps.$[running].status": "pending",
      },
    },
    { arrayFilters: [{ "running.status": "running" }] }
  );
  if (result.modifiedCount > 0) log.warn(`${result.modifiedCount} import(s) were interrupted by a restart`);
  return result.modifiedCount;
}

module.exports = { startImport, getJob, listJobs, cancelJob, retryJob, recoverInterrupted };
