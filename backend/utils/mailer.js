const nodemailer = require("nodemailer");

/**
 * Mailer utility for CodeStats.
 *
 * SMTP credentials are read from environment variables so no secrets live in
 * the codebase. For the SCOPE Club Google Workspace account, generate an
 * "App password" and set it as MAIL_PASS.
 *
 * Required env vars:
 *   MAIL_HOST  - SMTP host (default: smtp.gmail.com)
 *   MAIL_PORT  - SMTP port (default: 465)
 *   MAIL_USER  - the authenticating email account (e.g. scopeclub@mlrinstitutions.ac.in)
 *   MAIL_PASS  - the app password for that account
 *   MAIL_TO    - where contact notes are delivered (default: scopeclub@mlrinstitutions.ac.in)
 */

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.MAIL_PORT || "465", 10);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Mail is not configured. Set MAIL_USER and MAIL_PASS environment variables."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: { user, pass },
  });

  return cachedTransporter;
}

/**
 * Send an email.
 * @param {Object} opts
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {string} [opts.replyTo]
 * @param {string} [opts.to] - overrides the default MAIL_TO recipient
 */
async function sendMail({ subject, text, html, replyTo, to }) {
  const transporter = getTransporter();
  const from = process.env.MAIL_USER;
  const recipient =
    to || process.env.MAIL_TO || "scopeclub@mlrinstitutions.ac.in";

  return transporter.sendMail({
    from: `"CodeStats" <${from}>`,
    to: recipient,
    subject,
    text,
    html,
    replyTo,
  });
}

module.exports = { sendMail, getTransporter };
