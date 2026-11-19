/**
 * Changing a person's role (student, teacher or admin), the one place that knows everything a role
 * change means:
 *
 *   - the new `userType` is saved, and a student is a student in both fields: someone who came in
 *     through the teacher sign-in page has the sign-up intent "teacher", which would send them back to
 *     the teacher access page (and keep them out of the student rankings)
 *   - every session of the person ends (services/sessionService.js), so the new role starts from a
 *     new sign-in
 *   - the person gets the "access granted" or "access removed" email, unless `notify` is false
 *
 * Used by PUT /api/admin/change-user-type (Manage users) and POST /api/users/set-user-type. The
 * routes check who may do it and that the role really changes.
 */
const { endSessions } = require("./sessionService");
const { sendRoleChangeEmail } = require("./emails/roleChangeEmails");

/**
 * @param {import("mongoose").Document} user  the person, loaded from the database
 * @param {"user"|"teacher"|"admin"} newUserType
 * @param {{adminId: any, notify?: boolean}} options
 * @returns {Promise<string>} the role they had before
 */
async function changeUserRole(user, newUserType, { adminId, notify = true }) {
  const previous = user.userType || "user";
  user.userType = newUserType;
  if (newUserType === "user") user.signupIntent = "student";
  await user.save();
  await endSessions(user._id, "role_changed");
  if (notify) sendRoleChangeEmail(user, { from: previous, to: newUserType, adminId });
  return previous;
}

module.exports = { changeUserRole };
