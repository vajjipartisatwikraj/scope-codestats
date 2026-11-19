/**
 * Reading the emails history (admin page "Emails history"): a page of sent emails with filters, and
 * one email with its body for the preview. Nothing here changes a record.
 */
const EmailHistory = require("../../models/EmailHistory");
const escapeRegex = require("../../utils/escapeRegex");
const { ServiceError } = require("../../utils/ServiceError");
const { referenceOf } = require("./emailService");

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 80;
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

/** The fields a list row needs: no body */
const summaryOf = (email) => ({
  _id: email._id,
  type: email.type,
  to: email.to,
  recipientName: email.recipientName,
  subject: email.subject,
  status: email.status,
  error: email.error || "",
  sentAt: email.sentAt || null,
  createdAt: email.createdAt,
  sentBy: email.triggeredBy ? { _id: email.triggeredBy._id, name: email.triggeredBy.name } : null,
  reference: referenceOf(email._id),
});

/**
 * A page of emails, newest first.
 *
 * @param {object} options
 * @param {string} [options.status]  sending | sent | failed
 * @param {string} [options.type]    one of EmailHistory.TYPES
 * @param {string} [options.search]  matched (literally, any case) against the address, the name and the subject
 * @param {number} [options.page]    1-based
 * @param {number} [options.limit]
 */
async function listEmails({ status, type, search = "", page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit, 10) || DEFAULT_PAGE_SIZE));
  const filter = {};
  if (EmailHistory.STATUSES.includes(status)) filter.status = status;
  if (EmailHistory.TYPES.includes(type)) filter.type = type;
  const term = String(search || "").trim().slice(0, MAX_SEARCH_LENGTH);
  if (term) {
    const pattern = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ to: pattern }, { recipientName: pattern }, { subject: pattern }];
  }

  const [emails, total, counts] = await Promise.all([
    EmailHistory.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate("triggeredBy", "name")
      .lean(),
    EmailHistory.countDocuments(filter),
    // The figures at the top of the page count everything, whatever the filters say
    EmailHistory.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(counts.map((row) => [row._id, row.count]));
  return {
    emails: emails.map(summaryOf),
    total,
    page: pageNumber,
    limit: pageSize,
    totals: { sent: byStatus.sent || 0, failed: byStatus.failed || 0, sending: byStatus.sending || 0 },
  };
}

/** One email with its body and the facts of the event */
async function getEmail(emailId) {
  if (!isObjectId(emailId)) throw new ServiceError(404, "Email not found");
  const email = await EmailHistory.findById(emailId).select("+html").populate("triggeredBy", "name").lean();
  if (!email) throw new ServiceError(404, "Email not found");
  return {
    ...summaryOf(email),
    messageId: email.messageId || "",
    details: email.details || {},
    html: email.html || "",
  };
}

module.exports = { listEmails, getEmail };
