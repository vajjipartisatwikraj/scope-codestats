/**
 * What every part of the bank library shares: its error type, how ids are made and checked, and the
 * S3 key of every file.
 *
 * Layout of the bucket (under BANK_LIBRARY_S3_PREFIX, if one is set):
 *
 *   banks/<bankId>/bankInfo.json
 *   banks/<bankId>/topics/<topicId>/topicInfo.json
 *   banks/<bankId>/topics/<topicId>/questions/<questionId>.json
 *   trash/<time>/banks/...            deleted things, kept until the bucket's lifecycle rule removes them
 *
 * The folders are named by id and never by title, so a bank or topic can be renamed (the name is
 * inside its info file) without moving a single object. Titles typed by a person never reach a key,
 * and an id from a request is checked with `assertId` before it is used in one.
 */
const crypto = require("crypto");
const { getConfig } = require("../../config/bankLibrary");

class BankLibraryError extends Error {
  constructor(message, status = 400, code = "BANK_LIBRARY_ERROR", details = undefined) {
    super(message);
    this.name = "BankLibraryError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toResponse() {
    return { message: this.message, code: this.code, ...(this.details ? { details: this.details } : {}) };
  }
}

// ---- Ids -------------------------------------------------------------------------------------------

const KINDS = { bank: "bank", topic: "topic", question: "q" };
const ID_PATTERN = {
  bank: /^bank_[a-f0-9]{12}$/,
  topic: /^topic_[a-f0-9]{12}$/,
  question: /^q_[a-f0-9]{12}$/,
};

/** A new id such as bank_3fa91c07d2b4 */
const newId = (kind) => `${KINDS[kind]}_${crypto.randomBytes(6).toString("hex")}`;

const isId = (kind, value) => typeof value === "string" && ID_PATTERN[kind].test(value);

/** Returns the id when it is well formed, else answers 400. Run it on every id that came from a request. */
function assertId(kind, value) {
  if (!isId(kind, value)) throw new BankLibraryError(`Invalid ${kind} id`, 400, "INVALID_ID");
  return value;
}

// ---- Keys ------------------------------------------------------------------------------------------

const root = () => getConfig().prefix;

const bankPrefix = (bankId) => `${root()}banks/${assertId("bank", bankId)}/`;
const bankInfoKey = (bankId) => `${bankPrefix(bankId)}bankInfo.json`;
const topicPrefix = (bankId, topicId) => `${bankPrefix(bankId)}topics/${assertId("topic", topicId)}/`;
const topicInfoKey = (bankId, topicId) => `${topicPrefix(bankId, topicId)}topicInfo.json`;
const questionsPrefix = (bankId, topicId) => `${topicPrefix(bankId, topicId)}questions/`;
const questionKey = (bankId, topicId, questionId) => `${questionsPrefix(bankId, topicId)}${assertId("question", questionId)}.json`;

/** Where the objects of everything under `prefix` go when they are deleted */
function trashKeyFor(key, stamp) {
  const base = root();
  const relative = key.startsWith(base) ? key.slice(base.length) : key;
  return `${base}trash/${stamp}/${relative}`;
}

/** Reads the kind and ids back out of a key found while listing the bucket; null for anything else */
function parseKey(key) {
  const relative = key.startsWith(root()) ? key.slice(root().length) : key;
  let match = /^banks\/(bank_[a-f0-9]{12})\/bankInfo\.json$/.exec(relative);
  if (match) return { kind: "bank", bankId: match[1] };
  match = /^banks\/(bank_[a-f0-9]{12})\/topics\/(topic_[a-f0-9]{12})\/topicInfo\.json$/.exec(relative);
  if (match) return { kind: "topic", bankId: match[1], topicId: match[2] };
  match = /^banks\/(bank_[a-f0-9]{12})\/topics\/(topic_[a-f0-9]{12})\/questions\/(q_[a-f0-9]{12})\.json$/.exec(relative);
  if (match) return { kind: "question", bankId: match[1], topicId: match[2], questionId: match[3] };
  return null;
}

// ---- Small helpers ---------------------------------------------------------------------------------

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Runs `worker(item)` for every item, `limit` at a time, and returns the results in order */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(lanes);
  return results;
}

const cleanText = (value, max = 200) => String(value ?? "").trim().slice(0, max);

module.exports = {
  BankLibraryError,
  newId,
  isId,
  assertId,
  bankPrefix,
  bankInfoKey,
  topicPrefix,
  topicInfoKey,
  questionsPrefix,
  questionKey,
  trashKeyFor,
  parseKey,
  escapeRegex,
  mapLimit,
  cleanText,
};
