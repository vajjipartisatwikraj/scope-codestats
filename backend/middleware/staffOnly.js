/**
 * Lets only admins and teachers through. Use after `auth`:
 *
 *   router.get("/search", auth, staffOnly("Access denied. Admin or Teacher only."), handler);
 *
 * The message is passed in because the routes that use it answer with
 * different wording and the frontend shows that wording.
 */
const { isAdminOrTeacher } = require("../utils/userHelpers");

const staffOnly =
  (message = "Access denied. Admin or Teacher only.") =>
  (req, res, next) => {
    if (!isAdminOrTeacher(req.user)) return res.status(403).json({ message });
    next();
  };

module.exports = staffOnly;
