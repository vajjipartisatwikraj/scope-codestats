/**
 * Lets only admins through; teachers are refused. Use after `auth`:
 *
 *   router.get("/", auth, adminOnly, handler);
 *
 * `adminAuth` admits teachers as well. Use this one for actions that decide who becomes
 * a teacher, so a teacher can never approve other teachers.
 */
const { isAdmin } = require("../utils/userHelpers");

module.exports = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  next();
};
