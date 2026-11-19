/**
 * The two emails of a teacher access request, and the functions that send them:
 *
 *   sendRequestReceived(user, request)        when someone asks for teacher access: "we have it, we
 *                                             will write when it is accepted"
 *   sendRequestApproved(user, { adminId })    when an admin accepts it: "you are in", with a sign-in
 *                                             button
 *
 * Both end with the contact section every email shares (emailLayout.js). Sending never throws and is not waited for by the request
 * that caused it, so a slow or broken mail server cannot hold up or undo a request. Every attempt
 * is kept in the emails history. A rejection sends no email (it shows as a notification in the app).
 * See emailLayout.js for the frame and the look.
 */
const { brand, appUrl } = require("../../config/email");
const { esc, firstName, istStamp, list, paragraph, renderEmail, rows, section, toPlainText } = require("./emailLayout");
const { sendTrackedInBackground } = require("./emailService");
const { CAN } = require("./roleChangeEmails");

function buildRequestReceivedEmail({ user, request = {}, reference }) {
  const when = istStamp(request.createdAt ? new Date(request.createdAt) : new Date());
  const subject = `Your teacher access request has been submitted`;
  const title = "Request submitted";
  const subtitle = `Teacher access, ${when}`;
  const preheader = "Thank you for applying. We are reviewing your details and will email you as soon as your access is ready.";
  const details = [
    { label: "Name", value: user.name || "-" },
    { label: "Email", value: user.email || "-" },
    ...(request.note ? [{ label: "Department and designation", value: request.note }] : []),
  ];
  const content = [
    paragraph(`Hi ${esc(firstName(user.name))},`),
    paragraph(
      `Thank you for requesting teacher access on ${esc(brand.platform)}. We are reviewing your details and will email you as soon as your access is ready.`
    ),
    section("What did we receive?", rows(details)),
  ].join("");
  const html = renderEmail({ preheader, title, subtitle, content, reference, sentAt: when });
  const text = toPlainText({
    title,
    subtitle,
    lines: [
      `Hi ${firstName(user.name)},`,
      "",
      `Thank you for requesting teacher access on ${brand.platform}. We are reviewing your details and will email you as soon as your access is ready.`,
      "",
      "What did we receive?",
      ...details.map((row) => `  ${row.label}: ${row.value}`),
    ],
    reference,
  });
  return { subject, html, text };
}

function buildRequestApprovedEmail({ user, reference }) {
  const when = istStamp();
  const url = appUrl();
  const subject = `Your teacher access on ${brand.platform} is ready`;
  const title = "Your access is ready";
  const subtitle = `Teacher access, ${when}`;
  const preheader = `You are approved. Sign in to start teaching on ${brand.platform}.`;
  const can = CAN.teacher;
  const content = [
    paragraph(`Hi ${esc(firstName(user.name))},`),
    paragraph(
      `Good news, your request for teacher access on ${esc(brand.platform)} is approved. Sign in with <strong>${esc(user.email || "")}</strong> to start using your teacher tools.`
    ),
    section("What you can do now?", list(can.map(esc))),
  ].join("");
  const cta = url ? { label: "Sign in to CodeStats", url: `${url}/teacher-login` } : null;
  const html = renderEmail({ preheader, title, subtitle, content, cta, reference, sentAt: when });
  const text = toPlainText({
    title,
    subtitle,
    lines: [
      `Hi ${firstName(user.name)},`,
      "",
      `Good news, your request for teacher access on ${brand.platform} is approved. Sign in with ${user.email || ""} to start using your teacher tools.`,
      "",
      "What you can do now?",
      ...can.map((line) => `  - ${line}`),
    ],
    cta,
    reference,
  });
  return { subject, html, text };
}

function sendRequestReceived(user, request) {
  sendTrackedInBackground({
    type: "teacher_request_received",
    user,
    build: (reference) => buildRequestReceivedEmail({ user, request, reference }),
    details: { requestId: request?._id ? String(request._id) : undefined },
  });
}

function sendRequestApproved(user, { adminId, requestId } = {}) {
  sendTrackedInBackground({
    type: "teacher_request_approved",
    user,
    build: (reference) => buildRequestApprovedEmail({ user, reference }),
    triggeredBy: adminId,
    details: { requestId: requestId ? String(requestId) : undefined },
  });
}

module.exports = { buildRequestReceivedEmail, buildRequestApprovedEmail, sendRequestReceived, sendRequestApproved };
