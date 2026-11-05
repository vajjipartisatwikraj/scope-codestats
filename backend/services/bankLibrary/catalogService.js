/**
 * Banks, topics and questions of the bank library: create, read, update, delete and search.
 *
 * Every write goes to S3 first (the bucket is the source of truth) and then to the catalog in
 * MongoDB (models/BankLibraryEntry.js), which is what lists, counts and searches. If the catalog
 * write fails after S3 succeeded, "Rebuild index" brings the two back in step.
 *
 * Who may do what is decided by the routes: admins write, admins and teachers read. What a teacher
 * may SEE is decided here: only published banks.
 */
const mongoose = require("mongoose");
const BankLibraryEntry = require("../../models/BankLibraryEntry");
const { isAdmin } = require("../../utils/userHelpers");
const { checkQuestion, toPortableQuestion } = require("../bulkQuestionUploadService");
const store = require("./s3Store");
const logger = require("../../utils/logger");
const {
  BankLibraryError,
  newId,
  assertId,
  bankPrefix,
  bankInfoKey,
  topicPrefix,
  topicInfoKey,
  questionKey,
  parseKey,
  escapeRegex,
  mapLimit,
  cleanText,
} = require("./common");
const { getConfig } = require("../../config/bankLibrary");

const log = logger.scope("BANK-LIBRARY");

const STATUSES = ["draft", "published"];
const RESOURCE_TYPES = ["video", "document", "tutorial", "article", "other"];
const MAX_BULK_QUESTIONS = 500;
const MAX_LISTED_QUESTIONS = 2000;
const NOTES_LIMIT = 200000;

// ---- Who sees what -----------------------------------------------------------------------------------

/** A teacher sees published banks only; an admin sees all of them */
const canSee = (user, bank) => isAdmin(user) || bank.status === "published";

/** The ids of the banks this user may see, or null for "all of them" */
async function visibleBankIds(user) {
  if (isAdmin(user)) return null;
  return BankLibraryEntry.distinct("uid", { kind: "bank", status: "published" });
}

async function findBank(bankId, user) {
  assertId("bank", bankId);
  const bank = await BankLibraryEntry.findOne({ kind: "bank", uid: bankId }).lean();
  // A draft bank does not exist as far as a teacher can tell
  if (!bank || (user && !canSee(user, bank))) throw new BankLibraryError("Bank not found.", 404, "NOT_FOUND");
  return bank;
}

async function findTopic(bankId, topicId) {
  assertId("topic", topicId);
  const topic = await BankLibraryEntry.findOne({ kind: "topic", uid: topicId, bankId }).lean();
  if (!topic) throw new BankLibraryError("Topic not found.", 404, "NOT_FOUND");
  return topic;
}

async function findQuestion(bankId, topicId, questionId) {
  assertId("question", questionId);
  const question = await BankLibraryEntry.findOne({ kind: "question", uid: questionId, bankId, topicId }).lean();
  if (!question) throw new BankLibraryError("Question not found.", 404, "NOT_FOUND");
  return question;
}

// ---- Shapes sent to the page -------------------------------------------------------------------------

const bankSummary = (entry, counts = {}) => ({
  id: entry.uid,
  name: entry.name,
  description: entry.description || "",
  status: entry.status,
  tags: entry.tags || [],
  topicCount: counts.topics || 0,
  questionCount: counts.questions || 0,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const topicSummary = (entry, counts = {}) => ({
  id: entry.uid,
  bankId: entry.bankId,
  name: entry.name,
  description: entry.description || "",
  order: entry.order || 0,
  questionCount: counts.questions || 0,
  updatedAt: entry.updatedAt,
});

const questionSummary = (entry) => ({
  id: entry.uid,
  bankId: entry.bankId,
  topicId: entry.topicId,
  title: entry.name,
  type: entry.type,
  difficultyLevel: entry.difficultyLevel,
  marks: entry.marks,
  tags: entry.tags || [],
  order: entry.order || 0,
  updatedAt: entry.updatedAt,
});

/** { bankId: { topics, questions } } for these banks */
async function countsByBank(bankIds) {
  const rows = await BankLibraryEntry.aggregate([
    { $match: { kind: { $in: ["topic", "question"] }, bankId: { $in: bankIds } } },
    { $group: { _id: { bankId: "$bankId", kind: "$kind" }, count: { $sum: 1 } } },
  ]);
  const counts = {};
  rows.forEach((row) => {
    counts[row._id.bankId] = counts[row._id.bankId] || { topics: 0, questions: 0 };
    counts[row._id.bankId][row._id.kind === "topic" ? "topics" : "questions"] = row.count;
  });
  return counts;
}

/** { topicId: { questions } } for the topics of a bank */
async function countsByTopic(bankId) {
  const rows = await BankLibraryEntry.aggregate([
    { $match: { kind: "question", bankId } },
    { $group: { _id: "$topicId", count: { $sum: 1 } } },
  ]);
  const counts = {};
  rows.forEach((row) => {
    counts[row._id] = { questions: row.count };
  });
  return counts;
}

// ---- Input checks ------------------------------------------------------------------------------------

function fail(message, details) {
  throw new BankLibraryError(message, 400, "VALIDATION_FAILED", details);
}

function readTags(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail("Tags must be a list.");
  return [...new Set(value.map((tag) => cleanText(tag, 40)).filter(Boolean))].slice(0, 10);
}

function readBankInput(input = {}, { partial = false } = {}) {
  const out = {};
  if (!partial || input.name !== undefined) {
    out.name = cleanText(input.name, 120);
    if (out.name.length < 2) fail("A bank needs a name of at least two characters.");
  }
  if (input.description !== undefined) out.description = cleanText(input.description, 1000);
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) fail("Status must be draft or published.");
    out.status = input.status;
  }
  const tags = readTags(input.tags);
  if (tags) out.tags = tags;
  return out;
}

function readTopicInput(input = {}, { partial = false } = {}) {
  const out = {};
  if (!partial || input.name !== undefined) {
    out.name = cleanText(input.name, 120);
    if (out.name.length < 2) fail("A topic needs a name of at least two characters.");
  }
  if (input.description !== undefined) out.description = cleanText(input.description, 1000);
  if (input.videoResource !== undefined) out.videoResource = cleanText(input.videoResource, 500);
  if (input.documentationUrl !== undefined) {
    const notes = String(input.documentationUrl || "");
    if (notes.length > NOTES_LIMIT) fail("The notes are too long.");
    out.documentationUrl = notes;
  }
  if (input.resources !== undefined) {
    if (!Array.isArray(input.resources) || input.resources.length > 30) fail("Resources must be a list of at most 30.");
    out.resources = input.resources.map((resource) => {
      const title = cleanText(resource?.title, 200);
      const url = cleanText(resource?.url, 500);
      if (!title || !url) fail("Every resource needs a title and a link.");
      return { title, url, type: RESOURCE_TYPES.includes(resource?.type) ? resource.type : "article" };
    });
  }
  if (input.order !== undefined) {
    const order = Number(input.order);
    if (!Number.isFinite(order)) fail("Order must be a number.");
    out.order = order;
  }
  return out;
}

/** Answers 400 with the problems found when the question is not a valid cohort question */
async function validateLibraryQuestion(question) {
  const { issues } = await checkQuestion(question, { moduleId: new mongoose.Types.ObjectId(), createdBy: new mongoose.Types.ObjectId() });
  if (issues.length > 0) {
    throw new BankLibraryError("The question is not valid.", 400, "QUESTION_INVALID", { issues: issues.slice(0, 10) });
  }
}

// ---- Entries (the catalog) ---------------------------------------------------------------------------

function upsertEntry(uid, fields, userId) {
  const update = { $set: { ...fields, ...(userId ? { updatedBy: userId } : {}) } };
  if (userId) update.$setOnInsert = { createdBy: userId };
  return BankLibraryEntry.findOneAndUpdate({ uid }, update, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
}

const entryOfQuestion = (document, bankId, topicId, key) => ({
  kind: "question",
  bankId,
  topicId,
  name: document.title,
  order: document.order || 0,
  type: document.type,
  difficultyLevel: document.difficultyLevel || "medium",
  marks: document.marks,
  tags: document.tags || [],
  s3Key: key,
});

async function nextOrder(filter) {
  const last = await BankLibraryEntry.findOne(filter).sort({ order: -1 }).select("order").lean();
  return last ? (last.order || 0) + 1 : 0;
}

// ---- Banks -------------------------------------------------------------------------------------------

async function listBanks({ user, search, status }) {
  const filter = { kind: "bank" };
  if (!isAdmin(user)) filter.status = "published";
  else if (STATUSES.includes(status)) filter.status = status;
  if (search && String(search).trim()) {
    const term = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: term }, { description: term }, { tags: term }];
  }
  const banks = await BankLibraryEntry.find(filter).sort({ name: 1 }).collation({ locale: "en", strength: 2 }).lean();
  const counts = await countsByBank(banks.map((bank) => bank.uid));
  return banks.map((bank) => bankSummary(bank, counts[bank.uid]));
}

async function getBank(bankId, user) {
  const bank = await findBank(bankId, user);
  const [topics, bankCounts, topicCounts] = await Promise.all([
    BankLibraryEntry.find({ kind: "topic", bankId }).sort({ order: 1, name: 1 }).lean(),
    countsByBank([bankId]),
    countsByTopic(bankId),
  ]);
  return {
    ...bankSummary(bank, bankCounts[bankId]),
    topics: topics.map((topic) => topicSummary(topic, topicCounts[topic.uid])),
  };
}

async function assertBankNameFree(name, exceptId) {
  const clash = await BankLibraryEntry.findOne({ kind: "bank", name }).collation({ locale: "en", strength: 2 }).select("uid").lean();
  if (clash && clash.uid !== exceptId) throw new BankLibraryError("A bank with this name already exists.", 409, "NAME_TAKEN");
}

async function createBank(input, user) {
  const data = readBankInput(input);
  await assertBankNameFree(data.name);
  const id = newId("bank");
  const now = new Date().toISOString();
  const info = {
    id,
    name: data.name,
    description: data.description || "",
    status: data.status || "draft",
    tags: data.tags || [],
    createdBy: String(user.id),
    createdAt: now,
    updatedAt: now,
  };
  const key = bankInfoKey(id);
  await store.putJson(key, info);
  const entry = await upsertEntry(id, { kind: "bank", name: info.name, description: info.description, status: info.status, tags: info.tags, s3Key: key }, user.id);
  return bankSummary(entry);
}

async function updateBank(bankId, input, user) {
  const current = await findBank(bankId);
  const data = readBankInput(input, { partial: true });
  if (data.name) await assertBankNameFree(data.name, bankId);

  const key = bankInfoKey(bankId);
  const info = (await store.tryGetJson(key)) || { id: bankId, createdAt: current.createdAt };
  const next = { ...info, ...data, id: bankId, updatedAt: new Date().toISOString() };
  await store.putJson(key, next);
  const entry = await upsertEntry(bankId, { kind: "bank", name: next.name, description: next.description || "", status: next.status || "draft", tags: next.tags || [], s3Key: key }, user.id);
  const counts = await countsByBank([bankId]);
  return bankSummary(entry, counts[bankId]);
}

async function deleteBank(bankId) {
  await findBank(bankId);
  const moved = await store.moveToTrash({ prefix: bankPrefix(bankId) });
  await BankLibraryEntry.deleteMany({ $or: [{ uid: bankId }, { bankId }] });
  log.info(`bank ${bankId} moved to the trash (${moved} files)`);
  return { deleted: true, files: moved };
}

// ---- Topics ------------------------------------------------------------------------------------------

/** The whole topic, as the edit form needs it (read from S3: it holds the notes and resources) */
async function getTopic(bankId, topicId, user) {
  await findBank(bankId, user);
  const entry = await findTopic(bankId, topicId);
  const info = (await store.tryGetJson(topicInfoKey(bankId, topicId))) || {};
  const counts = await countsByTopic(bankId);
  return {
    ...topicSummary(entry, counts[topicId]),
    videoResource: info.videoResource || "",
    documentationUrl: info.documentationUrl || "",
    resources: info.resources || [],
  };
}

async function assertTopicNameFree(bankId, name, exceptId) {
  const clash = await BankLibraryEntry.findOne({ kind: "topic", bankId, name }).collation({ locale: "en", strength: 2 }).select("uid").lean();
  if (clash && clash.uid !== exceptId) throw new BankLibraryError("This bank already has a topic with this name.", 409, "NAME_TAKEN");
}

async function createTopic(bankId, input, user) {
  await findBank(bankId);
  const data = readTopicInput(input);
  await assertTopicNameFree(bankId, data.name);

  const id = newId("topic");
  const order = data.order ?? (await nextOrder({ kind: "topic", bankId }));
  const now = new Date().toISOString();
  const info = {
    id,
    bankId,
    name: data.name,
    description: data.description || "",
    order,
    videoResource: data.videoResource || "",
    documentationUrl: data.documentationUrl || "",
    resources: data.resources || [],
    createdAt: now,
    updatedAt: now,
  };
  const key = topicInfoKey(bankId, id);
  await store.putJson(key, info);
  const entry = await upsertEntry(id, { kind: "topic", bankId, name: info.name, description: info.description, order, s3Key: key }, user.id);
  return topicSummary(entry);
}

async function updateTopic(bankId, topicId, input, user) {
  await findBank(bankId);
  const current = await findTopic(bankId, topicId);
  const data = readTopicInput(input, { partial: true });
  if (data.name) await assertTopicNameFree(bankId, data.name, topicId);

  const key = topicInfoKey(bankId, topicId);
  const info = (await store.tryGetJson(key)) || { id: topicId, bankId, createdAt: current.createdAt };
  const next = { ...info, ...data, id: topicId, bankId, updatedAt: new Date().toISOString() };
  await store.putJson(key, next);
  const entry = await upsertEntry(topicId, { kind: "topic", bankId, name: next.name, description: next.description || "", order: next.order || 0, s3Key: key }, user.id);
  const counts = await countsByTopic(bankId);
  return topicSummary(entry, counts[topicId]);
}

async function deleteTopic(bankId, topicId) {
  await findBank(bankId);
  await findTopic(bankId, topicId);
  const moved = await store.moveToTrash({ prefix: topicPrefix(bankId, topicId) });
  await BankLibraryEntry.deleteMany({ $or: [{ uid: topicId }, { topicId }] });
  log.info(`topic ${topicId} moved to the trash (${moved} files)`);
  return { deleted: true, files: moved };
}

// ---- Questions ---------------------------------------------------------------------------------------

async function listQuestions(bankId, topicId, { user, search, difficulty, type }) {
  await findBank(bankId, user);
  await findTopic(bankId, topicId);
  const filter = { kind: "question", bankId, topicId };
  if (["easy", "medium", "hard"].includes(difficulty)) filter.difficultyLevel = difficulty;
  if (["mcq", "programming"].includes(type)) filter.type = type;
  if (search && String(search).trim()) {
    const term = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ name: term }, { tags: term }];
  }
  const entries = await BankLibraryEntry.find(filter).sort({ order: 1, name: 1 }).limit(MAX_LISTED_QUESTIONS).lean();
  return entries.map(questionSummary);
}

/** The whole question as stored: what the cohort question form fills itself from */
async function getQuestion(bankId, topicId, questionId, user) {
  await findBank(bankId, user);
  await findQuestion(bankId, topicId, questionId);
  const document = await store.getJson(questionKey(bankId, topicId, questionId));
  return document;
}

async function createQuestion(bankId, topicId, input, user) {
  await findBank(bankId);
  await findTopic(bankId, topicId);
  await validateLibraryQuestion(input);

  const id = newId("question");
  const order = await nextOrder({ kind: "question", bankId, topicId });
  const document = { id, order, ...toPortableQuestion(input) };
  const key = questionKey(bankId, topicId, id);
  await store.putJson(key, document);
  const entry = await upsertEntry(id, entryOfQuestion(document, bankId, topicId, key), user.id);
  return questionSummary(entry);
}

async function updateQuestion(bankId, topicId, questionId, input, user) {
  await findBank(bankId);
  await findTopic(bankId, topicId);
  const current = await findQuestion(bankId, topicId, questionId);
  await validateLibraryQuestion(input);

  const document = { id: questionId, order: current.order || 0, ...toPortableQuestion(input) };
  const key = questionKey(bankId, topicId, questionId);
  await store.putJson(key, document);
  const entry = await upsertEntry(questionId, entryOfQuestion(document, bankId, topicId, key), user.id);
  return questionSummary(entry);
}

async function deleteQuestion(bankId, topicId, questionId) {
  await findBank(bankId);
  await findTopic(bankId, topicId);
  await findQuestion(bankId, topicId, questionId);
  await store.moveToTrash({ key: questionKey(bankId, topicId, questionId) });
  await BankLibraryEntry.deleteOne({ uid: questionId });
  return { deleted: true };
}

/** The questions of an upload in either shape the cohort upload accepts: { files: [{ questions }] } or { questions } */
function questionsOfUpload(payload) {
  const files = Array.isArray(payload?.files) ? payload.files : Array.isArray(payload?.questions) ? [{ questions: payload.questions }] : null;
  if (!files) fail("Send { files: [{ name, questions: [...] }] } or { questions: [...] }.");
  return files.flatMap((file) => (Array.isArray(file?.questions) ? file.questions : []));
}

/** Adds many questions at once. All of them are checked first; nothing is saved if one is wrong. */
async function bulkCreateQuestions(bankId, topicId, payload, user) {
  await findBank(bankId);
  await findTopic(bankId, topicId);
  const questions = questionsOfUpload(payload);
  if (questions.length === 0) fail("The upload has no questions.");
  if (questions.length > MAX_BULK_QUESTIONS) fail(`At most ${MAX_BULK_QUESTIONS} questions can be uploaded at once.`);

  const problems = [];
  for (let index = 0; index < questions.length; index += 1) {
    const { issues } = await checkQuestion(questions[index], { moduleId: new mongoose.Types.ObjectId(), createdBy: new mongoose.Types.ObjectId() });
    if (issues.length > 0) problems.push({ questionIndex: index + 1, title: cleanText(questions[index]?.title, 80) || null, issues: issues.slice(0, 5) });
    if (problems.length >= 10) break;
  }
  if (problems.length > 0) {
    throw new BankLibraryError("Some questions are not valid, so none were added.", 400, "QUESTION_INVALID", { problems });
  }

  let order = await nextOrder({ kind: "question", bankId, topicId });
  const prepared = questions.map((question) => {
    const id = newId("question");
    const document = { id, order: order++, ...toPortableQuestion(question) };
    return { id, document, key: questionKey(bankId, topicId, id) };
  });

  await mapLimit(prepared, getConfig().fetchConcurrency, (item) => store.putJson(item.key, item.document));
  await BankLibraryEntry.bulkWrite(
    prepared.map((item) => ({
      updateOne: {
        filter: { uid: item.id },
        update: { $set: { ...entryOfQuestion(item.document, bankId, topicId, item.key), updatedBy: user.id }, $setOnInsert: { createdBy: user.id } },
        upsert: true,
      },
    }))
  );
  return { created: prepared.length };
}

// ---- Search ------------------------------------------------------------------------------------------

/** Banks, topics and questions whose name or tags match; each group is short (this feeds a search box) */
async function search(term, user) {
  const text = String(term || "").trim();
  if (text.length < 2) return { banks: [], topics: [], questions: [] };
  const regex = new RegExp(escapeRegex(text), "i");
  const visible = await visibleBankIds(user);
  const scope = visible ? { bankId: { $in: visible } } : {};

  const [banks, topics, questions] = await Promise.all([
    BankLibraryEntry.find({ kind: "bank", ...(visible ? { uid: { $in: visible } } : {}), $or: [{ name: regex }, { tags: regex }] }).sort({ name: 1 }).limit(8).lean(),
    BankLibraryEntry.find({ kind: "topic", ...scope, name: regex }).sort({ name: 1 }).limit(10).lean(),
    BankLibraryEntry.find({ kind: "question", ...scope, $or: [{ name: regex }, { tags: regex }] }).sort({ name: 1 }).limit(15).lean(),
  ]);

  const names = await BankLibraryEntry.find({
    $or: [
      { kind: "bank", uid: { $in: [...new Set([...topics, ...questions].map((entry) => entry.bankId))] } },
      { kind: "topic", uid: { $in: [...new Set(questions.map((entry) => entry.topicId))] } },
    ],
  })
    .select("uid name")
    .lean();
  const nameOf = Object.fromEntries(names.map((entry) => [entry.uid, entry.name]));

  return {
    banks: banks.map((bank) => bankSummary(bank)),
    topics: topics.map((topic) => ({ ...topicSummary(topic), bankName: nameOf[topic.bankId] || "" })),
    questions: questions.map((question) => ({ ...questionSummary(question), bankName: nameOf[question.bankId] || "", topicName: nameOf[question.topicId] || "" })),
  };
}

// ---- Rebuilding the catalog from the bucket ----------------------------------------------------------------

const validObjectId = (value) => (mongoose.Types.ObjectId.isValid(value) ? value : undefined);

/**
 * Reads the bucket and makes the catalog match it: adds what is missing, refreshes what changed and
 * drops what is no longer there. For use after files were changed outside the app, or restored from
 * the trash.
 */
async function reindex() {
  const objects = await store.listObjects(`${getConfig().prefix}banks/`);
  const parsed = objects.map((object) => ({ ...object, ...parseKey(object.key) })).filter((object) => object.kind);

  const read = await mapLimit(parsed, getConfig().fetchConcurrency, async (object) => {
    try {
      return { object, document: await store.getJson(object.key) };
    } catch (error) {
      log.warn(`reindex: could not read ${object.key}`);
      return { object, document: null };
    }
  });

  const banks = new Map();
  const topics = new Map();
  const entries = [];
  let unreadable = 0;

  read.forEach(({ object, document }) => {
    if (!document) {
      unreadable += 1;
      return;
    }
    if (object.kind === "bank") {
      banks.set(object.bankId, document);
      entries.push({
        uid: object.bankId,
        fields: { kind: "bank", name: cleanText(document.name, 120) || object.bankId, description: cleanText(document.description, 1000), status: STATUSES.includes(document.status) ? document.status : "draft", tags: document.tags || [], s3Key: object.key },
        createdBy: validObjectId(document.createdBy),
      });
    } else if (object.kind === "topic") {
      topics.set(object.topicId, document);
      entries.push({
        uid: object.topicId,
        fields: { kind: "topic", bankId: object.bankId, name: cleanText(document.name, 120) || object.topicId, description: cleanText(document.description, 1000), order: Number(document.order) || 0, s3Key: object.key },
      });
    }
  });
  read.forEach(({ object, document }) => {
    if (!document || object.kind !== "question") return;
    if (!banks.has(object.bankId) || !topics.has(object.topicId)) {
      unreadable += 1; // a question whose bank or topic file is missing is left out
      return;
    }
    entries.push({ uid: object.questionId, fields: entryOfQuestion({ ...document, title: document.title || object.questionId }, object.bankId, object.topicId, object.key) });
  });

  // A topic whose bank is gone does not belong in the catalog either
  const kept = entries.filter((entry) => entry.fields.kind !== "topic" || banks.has(entry.fields.bankId));

  if (kept.length > 0) {
    await BankLibraryEntry.bulkWrite(
      kept.map((entry) => ({
        updateOne: {
          filter: { uid: entry.uid },
          update: { $set: entry.fields, ...(entry.createdBy ? { $setOnInsert: { createdBy: entry.createdBy } } : {}) },
          upsert: true,
        },
      }))
    );
  }
  const removed = await BankLibraryEntry.deleteMany({ uid: { $nin: kept.map((entry) => entry.uid) } });

  const summary = {
    banks: kept.filter((entry) => entry.fields.kind === "bank").length,
    topics: kept.filter((entry) => entry.fields.kind === "topic").length,
    questions: kept.filter((entry) => entry.fields.kind === "question").length,
    removed: removed.deletedCount || 0,
    unreadable,
  };
  log.info(`index rebuilt: ${summary.banks} banks, ${summary.topics} topics, ${summary.questions} questions, ${summary.removed} removed`);
  return summary;
}

module.exports = {
  listBanks,
  getBank,
  createBank,
  updateBank,
  deleteBank,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
  search,
  reindex,
  // used by the import
  findBank,
  visibleBankIds,
};
