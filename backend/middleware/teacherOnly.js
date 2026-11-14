/**
 * Lets only teachers through. Use after `auth`:
 *
 *   router.use(auth, teacherOnly);
 *
 * For what a teacher does as a teacher (a mentor's own students). Admins have their own routes.
 */
const { isTeacher } = require("../utils/userHelpers");

module.exports = (req, res, next) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: "Access denied. Teachers only." });
  }
  next();
};
