/**
 * The emails a person gets when an admin changes their role in Manage users:
 *
 *   granted   the new role is higher (student to teacher, student to admin, teacher to admin):
 *             "Teacher access granted", with what they can do now and a sign-in button
 *   revoked   the new role is lower (admin to teacher, admin to student, teacher to student):
 *             "Admin access removed", with what changes and what stays
 *
 *   sendRoleChangeEmail(user, { from, to, adminId })   from and to are "user", "teacher" or "admin"
 *
 * Neither email gives a reason: the Manage users screen does not record one. Sending never throws
 * and is not waited for by the request that caused it. Every attempt is kept in the emails history.
 * Both end with the contact section every email shares (emailLayout.js).
 */
const { brand, appUrl } = require("../../config/email");
const { esc, firstName, istStamp, list, paragraph, renderEmail, section, toPlainText } = require("./emailLayout");
const { sendTrackedInBackground } = require("./emailService");

const LEVEL = { user: 0, teacher: 1, admin: 2 };
/** How each role is named in a sentence, and its title-case name */
const ROLE = {
  user: { noun: "student", title: "Student", a: "a student" },
  teacher: { noun: "teacher", title: "Teacher", a: "a teacher" },
  admin: { noun: "admin", title: "Admin", a: "an admin" },
};

/** What a role can do, as short lines for "What you can do now?" (the teacher request email shares the teacher lines) */
const CAN = {
  teacher: ["Create and manage your own cohorts", "Build question banks and add questions to your cohorts", "Follow how your students are progressing"],
  admin: [
    "Manage users, cohorts and tests across the platform",
    "Run the profile sync and the ranking updates",
    "See performance analytics for every department and year",
  ],
};

/** What changes (and what stays) when a role goes down, keyed by "from to" */
const LOST = {
  "admin teacher": ["Admin tools are no longer available.", "Your teacher tools, such as cohorts, question banks and student progress, stay as they are."],
  "admin user": ["Admin and teacher tools are no longer available.", "You can keep using CodeStats as a student: your dashboard, cohorts, practice arena and tests."],
  "teacher user": ["Teacher tools, such as managing cohorts, are no longer available.", "You can keep using CodeStats as a student: your dashboard, cohorts, practice arena and tests."],
};

const isGrant = (from, to) => LEVEL[to] > LEVEL[from];

function buildRoleChangeEmail({ user, from, to, reference }) {
  const when = istStamp();
  const url = appUrl();
  const grant = isGrant(from, to);
  const role = ROLE[to];
  const was = ROLE[from];
  const cta = url ? { label: grant ? "Sign in to CodeStats" : "Open CodeStats", url: `${url}/login` } : null;
  const subtitle = `Account update, ${when}`;

  let subject;
  let title;
  let preheader;
  let opening;
  let openingText;
  let heading;
  let lines;
  if (grant) {
    subject = `Your ${brand.platform} account now has ${role.noun} access`;
    title = `${role.title} access granted`;
    preheader = `Your account is now ${role.a} account. You have been signed out, so please sign in again to start using your new tools.`;
    opening = `Your ${esc(brand.platform)} account has been upgraded to <strong>${esc(role.a)}</strong> account. You have been signed out, so please sign in again to start using your new tools.`;
    openingText = `Your ${brand.platform} account has been upgraded to ${role.a} account. You have been signed out, so please sign in again to start using your new tools.`;
    heading = "What you can do now?";
    lines = CAN[to];
  } else {
    subject = `Your ${was.noun} access on ${brand.platform} has been removed`;
    title = `${was.title} access removed`;
    preheader = `Your account is now ${role.a} account. Your sign-in stays the same.`;
    opening = `Your ${esc(brand.platform)} account is now <strong>${esc(role.a)}</strong> account. Your sign-in stays the same, but you have been signed out and will need to sign in again. If you think this is a mistake, reach out to us below.`;
    openingText = `Your ${brand.platform} account is now ${role.a} account. Your sign-in stays the same, but you have been signed out and will need to sign in again. If you think this is a mistake, reach out to us below.`;
    heading = "What changes?";
    lines = LOST[`${from} ${to}`] || [];
  }

  const content = [
    paragraph(`Hi ${esc(firstName(user.name))},`),
    paragraph(opening),
    lines.length ? section(heading, list(lines.map(esc))) : "",
  ].join("");
  const html = renderEmail({ preheader, title, subtitle, content, cta, reference, sentAt: when });
  const text = toPlainText({
    title,
    subtitle,
    lines: [`Hi ${firstName(user.name)},`, "", openingText, "", ...(lines.length ? [heading, ...lines.map((line) => `  - ${line}`)] : [])],
    cta,
    reference,
  });
  return { subject, html, text };
}

/** Sends the email for a role change in the background; nothing is sent when the role did not change */
function sendRoleChangeEmail(user, { from = "user", to, adminId } = {}) {
  if (!LEVEL.hasOwnProperty(from) || !LEVEL.hasOwnProperty(to) || from === to) return;
  const grant = isGrant(from, to);
  sendTrackedInBackground({
    type: grant ? "role_granted" : "role_revoked",
    user,
    build: (reference) => buildRoleChangeEmail({ user, from, to, reference }),
    triggeredBy: adminId,
    details: { from, to },
  });
}

module.exports = { buildRoleChangeEmail, sendRoleChangeEmail, CAN };
