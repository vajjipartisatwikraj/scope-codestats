const mongoose = require("mongoose");

/**
 * EmailHistory: one document for every email the platform sends to a person (collection
 * `emailsHistory`). It is written before the email is handed to the mail server, with the status
 * "sending", and then marked "sent" (with the mail server's message id) or "failed" (with the reason).
 * Admins read it on the Emails history page.
 *
 *   type          what the email was about (see TYPES)
 *   to            the address it was sent to
 *   recipient     the account it was for, and `recipientName` as it was at the time
 *   subject       the subject line
 *   html          the body as sent, for the preview on the admin page (not read in lists)
 *   status        sending | sent | failed
 *   error         why it failed, in a sentence
 *   messageId     the id the mail server gave it
 *   sentAt        when the mail server accepted it
 *   triggeredBy   the admin whose action caused it
 *   details       facts about the event, for the detail panel (for example the platform removed)
 */
const TYPES = ["account_removed", "platform_removed", "teacher_request_received", "teacher_request_approved", "role_granted", "role_revoked"];
const STATUSES = ["sending", "sent", "failed"];

const emailHistorySchema = new mongoose.Schema(
  {
    type: { type: String, enum: TYPES, required: true },
    to: { type: String, required: true, trim: true, lowercase: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipientName: { type: String, trim: true, default: "" },
    subject: { type: String, required: true, trim: true },
    html: { type: String, select: false },
    status: { type: String, enum: STATUSES, default: "sending" },
    error: { type: String, default: "" },
    messageId: { type: String, default: "" },
    sentAt: Date,
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "emailsHistory" }
);

// The page lists newest first and filters by status or type
emailHistorySchema.index({ createdAt: -1 });
emailHistorySchema.index({ status: 1, createdAt: -1 });
emailHistorySchema.index({ type: 1, createdAt: -1 });
emailHistorySchema.index({ recipient: 1, createdAt: -1 });

const EmailHistory = mongoose.model("EmailHistory", emailHistorySchema);
EmailHistory.TYPES = TYPES;
EmailHistory.STATUSES = STATUSES;

module.exports = EmailHistory;
