/**
 * The access list: the addresses allowed to sign in when LOGIN_MODE=allowlist
 * (config/loginAccess.js). Two halves live here:
 *
 *   1. The sign-in rules, used by passport, the auth middleware and the sockets:
 *      canCreateAccount(email) and canAccess(user).
 *   2. What an admin does with the list: list, add, add many (CSV), change the role, remove,
 *      and add every existing account in one go (the first switch to allowlist mode).
 *
 * Lookups are cached for a few seconds, because the auth middleware asks on every request.
 * Every change clears the cache of the server that made it; with several server processes
 * another process sees the change within CACHE_TTL_MS.
 */
const mongoose = require("mongoose");
const AllowedEmail = require("../models/AllowedEmail");
const User = require("../models/User");
const TtlCache = require("../utils/TtlCache");
const escapeRegex = require("../utils/escapeRegex");
const { ServiceError } = require("../utils/ServiceError");
const { loginMode, isInstitutionEmail, isValidEmail, normalizeEmail } = require("../config/loginAccess");
const log = require("../utils/logger").scope("ACCESS-LIST");

const CACHE_TTL_MS = 15 * 1000;
const MAX_BULK_ROWS = 5000;
const MAX_PAGE_SIZE = 100;
const MAX_REPORTED_INVALID = 50;
const MAX_NOTE = 200;

const cache = new TtlCache({ ttlMs: CACHE_TTL_MS, maxEntries: 5000 });

const isId = (value) => mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(String(value));

// ─── Sign-in rules ──────────────────────────────────────────────────────────

/** The access list entry of an address (lean { email, role }), or null. Cached. */
function getEntry(email) {
  const key = normalizeEmail(email);
  if (!key) return Promise.resolve(null);
  return cache.get(key, () => AllowedEmail.findOne({ email: key }).select("email role").lean());
}

/**
 * May this address create a new account?
 *   domain     only a college address
 *   allowlist  only an address on the list; `entry.role` says if it is a teacher
 *
 * @returns {Promise<{allowed: boolean, reason?: string, entry?: {role: string}|null}>}
 *   `reason` is the code the sign-in page maps to a sentence.
 */
async function canCreateAccount(email) {
  if (loginMode() === "domain") {
    return isInstitutionEmail(email) ? { allowed: true, entry: null } : { allowed: false, reason: "domain-not-allowed" };
  }
  const entry = await getEntry(email);
  return entry ? { allowed: true, entry } : { allowed: false, reason: "not-allowed" };
}

/**
 * May this existing account use the app?
 *   domain     always (accounts are not checked again, as before the list existed)
 *   allowlist  admins always; everyone else only while their address is on the list
 *
 * @param {{email: string, userType?: string}} user
 */
async function canAccess(user) {
  if (loginMode() === "domain") return true;
  if (!user) return false;
  if (user.userType === "admin") return true;
  return Boolean(await getEntry(user.email));
}

// ─── Reading the list ───────────────────────────────────────────────────────

async function counts() {
  const [students, teachers] = await Promise.all([
    AllowedEmail.countDocuments({ role: "student" }),
    AllowedEmail.countDocuments({ role: "teacher" }),
  ]);
  return { total: students + teachers, students, teachers };
}

/**
 * One page of the list, newest first, with who has already signed in.
 * @param {{search?: string, role?: string, page?: number, pageSize?: number}} query
 */
async function list({ search, role, page, pageSize } = {}) {
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), MAX_PAGE_SIZE);
  const current = Math.max(parseInt(page, 10) || 1, 1);

  const filter = {};
  if (role === "student" || role === "teacher") filter.role = role;
  const text = typeof search === "string" ? search.trim().slice(0, 100) : "";
  if (text) {
    const pattern = new RegExp(escapeRegex(text), "i");
    filter.$or = [{ email: pattern }, { note: pattern }];
  }

  const [rows, matching, totals] = await Promise.all([
    AllowedEmail.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((current - 1) * size)
      .limit(size)
      .populate("addedBy", "name email")
      .lean(),
    AllowedEmail.countDocuments(filter),
    counts(),
  ]);

  const accounts = await User.find({ email: { $in: rows.map((row) => row.email) } })
    .select("email name lastLoginAt")
    .lean();
  const accountOf = new Map(accounts.map((account) => [account.email, account]));

  return {
    entries: rows.map((row) => {
      const account = accountOf.get(row.email);
      return {
        _id: row._id,
        email: row.email,
        role: row.role,
        note: row.note,
        source: row.source,
        createdAt: row.createdAt,
        addedBy: row.addedBy ? { name: row.addedBy.name, email: row.addedBy.email } : null,
        // Whether the person has an account yet, and when they last signed in
        account: account ? { name: account.name, lastLoginAt: account.lastLoginAt || null } : null,
      };
    }),
    total: matching,
    page: current,
    pageSize: size,
    counts: totals,
  };
}

// ─── Changing the list ──────────────────────────────────────────────────────

/** Someone the admin lists as a teacher who already has a student account becomes a teacher. */
async function promoteTeachers(emails) {
  if (emails.length === 0) return 0;
  const result = await User.updateMany({ email: { $in: emails }, userType: "user" }, { $set: { userType: "teacher" } });
  return result.modifiedCount || 0;
}

/** Turns one submitted row into { email, role, note }, or { reason } when it cannot be used. */
function cleanRow(row) {
  const source = typeof row === "string" ? { email: row } : row && typeof row === "object" ? row : {};
  const email = normalizeEmail(source.email);
  if (!email) return { reason: "No email address" };
  if (!isValidEmail(email)) return { value: email, reason: "Not a valid email address" };

  const requested = typeof source.role === "string" ? source.role.trim().toLowerCase() : "";
  if (requested === "admin") return { value: email, reason: "Admins cannot be added to the list" };
  if (requested && !["student", "teacher"].includes(requested)) {
    return { value: email, reason: `Unknown role "${requested.slice(0, 20)}", use student or teacher` };
  }

  return {
    email,
    role: requested === "teacher" ? "teacher" : "student",
    note: typeof source.note === "string" ? source.note.trim().slice(0, MAX_NOTE) : "",
  };
}

/**
 * Adds addresses. Ones already on the list are left as they are.
 *
 * @param {Array<string|{email: string, role?: string, note?: string}>} rows
 * @param {{adminId: string, source?: "manual"|"csv"|"existing-accounts"}} options
 * @returns {Promise<{added: number, alreadyListed: number, invalidCount: number, invalid: Array}>}
 */
async function addMany(rows, { adminId, source = "manual" }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ServiceError(400, "Add at least one email address");
  }
  if (rows.length > MAX_BULK_ROWS) {
    throw new ServiceError(413, `Add at most ${MAX_BULK_ROWS} addresses at a time`);
  }

  const invalid = [];
  const unique = new Map();
  rows.forEach((row) => {
    const cleaned = cleanRow(row);
    if (cleaned.reason) {
      invalid.push({ value: cleaned.value || "", reason: cleaned.reason });
      return;
    }
    // The same address twice in one upload: the first row wins
    if (!unique.has(cleaned.email)) unique.set(cleaned.email, cleaned);
  });

  const accepted = [...unique.values()];
  let added = 0;
  let addedTeachers = [];

  if (accepted.length > 0) {
    const result = await AllowedEmail.bulkWrite(
      accepted.map((row) => ({
        updateOne: {
          filter: { email: row.email },
          update: { $setOnInsert: { role: row.role, note: row.note, source, addedBy: adminId || null } },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    added = result.upsertedCount || 0;
    const insertedAt = Object.keys(result.upsertedIds || {}).map(Number);
    addedTeachers = insertedAt.map((index) => accepted[index]).filter((row) => row.role === "teacher").map((row) => row.email);
    cache.clear();
    await promoteTeachers(addedTeachers);
  }

  log.debug(`Access list: ${added} added by ${adminId || "system"} (${source}), ${invalid.length} rejected`);
  return {
    added,
    alreadyListed: accepted.length - added,
    invalidCount: invalid.length,
    invalid: invalid.slice(0, MAX_REPORTED_INVALID),
  };
}

/** Change an entry between student and teacher. */
async function setRole(id, role) {
  if (!isId(id)) throw new ServiceError(404, "That address is not on the list");
  if (!["student", "teacher"].includes(role)) throw new ServiceError(400, "The role must be student or teacher");

  const entry = await AllowedEmail.findByIdAndUpdate(id, { $set: { role } }, { new: true }).lean();
  if (!entry) throw new ServiceError(404, "That address is not on the list");

  cache.clear();
  // Listing someone as a teacher makes an existing student account a teacher straight away.
  // Going back to student never changes an account: use Manage users for that.
  if (role === "teacher") await promoteTeachers([entry.email]);
  return { _id: entry._id, email: entry.email, role: entry.role };
}

/**
 * Take addresses off the list. Their accounts keep their data, but the people are blocked from
 * the next request on (middleware/auth.js), and `userIds` lets the caller close their sockets.
 *
 * @param {string[]} ids
 * @returns {Promise<{removed: number, userIds: string[]}>}
 */
async function remove(ids) {
  const wanted = (Array.isArray(ids) ? ids : []).filter(isId);
  if (wanted.length === 0) throw new ServiceError(400, "Choose at least one address to remove");

  const entries = await AllowedEmail.find({ _id: { $in: wanted } }).select("email").lean();
  if (entries.length === 0) throw new ServiceError(404, "Those addresses are not on the list");

  await AllowedEmail.deleteMany({ _id: { $in: entries.map((entry) => entry._id) } });
  cache.clear();

  // Admins are never blocked by the list, so their sockets stay
  const accounts = await User.find({ email: { $in: entries.map((entry) => entry.email) }, userType: { $ne: "admin" } })
    .select("_id")
    .lean();

  log.debug(`Access list: ${entries.length} removed`);
  return { removed: entries.length, userIds: accounts.map((account) => String(account._id)) };
}

/**
 * Puts every existing student and teacher account on the list. Run once when switching a
 * running site to allowlist mode, so nobody is locked out on the day. Admins are skipped
 * (they are never checked).
 */
async function importExistingAccounts({ adminId }) {
  const BATCH = 1000;
  let added = 0;
  let alreadyListed = 0;
  let batch = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const result = await AllowedEmail.bulkWrite(
      batch.map((row) => ({
        updateOne: {
          filter: { email: row.email },
          update: { $setOnInsert: { role: row.role, source: "existing-accounts", note: "", addedBy: adminId || null } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    added += result.upsertedCount || 0;
    alreadyListed += batch.length - (result.upsertedCount || 0);
    batch = [];
  };

  const cursor = User.find({ userType: { $in: ["user", "teacher"] } })
    .select("email userType")
    .lean()
    .cursor();

  for await (const account of cursor) {
    const email = normalizeEmail(account.email);
    if (!isValidEmail(email)) continue;
    batch.push({ email, role: account.userType === "teacher" ? "teacher" : "student" });
    if (batch.length >= BATCH) await flush();
  }
  await flush();

  cache.clear();
  log.debug(`Access list: ${added} existing accounts added by ${adminId || "system"}`);
  return { added, alreadyListed };
}

module.exports = {
  CACHE_TTL_MS,
  MAX_BULK_ROWS,
  getEntry,
  canCreateAccount,
  canAccess,
  list,
  addMany,
  setRole,
  remove,
  importExistingAccounts,
};
