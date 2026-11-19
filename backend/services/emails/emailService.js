/**
 * Sending an email and keeping a record of it. Every email the platform sends to a person goes through
 * sendTracked: the record (collection emailsHistory, models/EmailHistory.js) is written first with the
 * status "sending", then the mail server is asked, then the record becomes "sent" (with the message
 * id) or "failed" (with the reason). A failure never throws: the caller carries on with what it was
 * doing (the removal, the role change) and reports the status.
 */
const mongoose = require("mongoose");
const EmailHistory = require("../../models/EmailHistory");
const { supportEmail } = require("../../config/email");
const { sendMail } = require("../../utils/mailer");
const log = require("../../utils/logger").scope("EMAIL");

const MAX_ERROR_LENGTH = 300;

/** The short code a person can quote: the last 8 characters of the record's id */
const referenceOf = (id) => String(id).slice(-8).toUpperCase();

/**
 * @param {object} options
 * @param {string} options.type  one of EmailHistory.TYPES
 * @param {{_id: any, name: string, email: string}} options.user  who the email is for
 * @param {(reference: string) => {subject: string, html: string, text: string}} options.build
 *   makes the email once the reference is known
 * @param {any} [options.triggeredBy]  the admin whose action caused it
 * @param {object} [options.details]   facts for the detail panel of the history page
 * @returns {Promise<{id: string, status: "sent"|"failed", to: string, error?: string}>}
 */
async function sendTracked({ type, user, build, triggeredBy, details = {} }) {
  const id = new mongoose.Types.ObjectId();
  const reference = referenceOf(id);
  const { subject, html, text } = build(reference);
  const to = String(user.email || "").trim().toLowerCase();

  const record = await EmailHistory.create({
    _id: id,
    type,
    to: to || "(no address)",
    recipient: user._id,
    recipientName: user.name || "",
    subject,
    html,
    status: "sending",
    triggeredBy,
    details: { ...details, reference },
  });

  if (!to) {
    await EmailHistory.updateOne({ _id: record._id }, { $set: { status: "failed", error: "The account has no email address" } });
    return { id: String(record._id), status: "failed", to, error: "The account has no email address" };
  }

  try {
    const info = await sendMail({ to, subject, html, text, replyTo: supportEmail() });
    await EmailHistory.updateOne({ _id: record._id }, { $set: { status: "sent", sentAt: new Date(), messageId: info?.messageId || "" } });
    return { id: String(record._id), status: "sent", to };
  } catch (err) {
    const error = String(err?.message || "The email could not be sent").slice(0, MAX_ERROR_LENGTH);
    await EmailHistory.updateOne({ _id: record._id }, { $set: { status: "failed", error } });
    log.warn(`email ${reference} to the account ${String(user._id).slice(-6)} failed: ${error}`);
    return { id: String(record._id), status: "failed", to, error };
  }
}

/**
 * sendTracked without waiting for it: for the emails an action sends on the side (a request received,
 * a role changed), so a slow or broken mail server never holds up or undoes that action. The result
 * is in the emails history either way.
 */
function sendTrackedInBackground(options) {
  sendTracked(options).catch((err) => log.warn(`${options.type} email was not sent: ${err?.message || err}`));
}

module.exports = { sendTracked, sendTrackedInBackground, referenceOf };
