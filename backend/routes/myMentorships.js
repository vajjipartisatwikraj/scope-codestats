/**
 * /api/my-mentorships
 *
 * A teacher's own mentorships and students. The teacher is the signed-in user: nothing in the URL
 * or body names a teacher, so one teacher can never read or change another teacher's roster. Admins
 * manage rosters through routes/mentorships.js.
 */
const express = require("express");
const auth = require("../middleware/auth");
const teacherOnly = require("../middleware/teacherOnly");
const { teacher } = require("../controllers/mentorshipController");

const router = express.Router();

router.use(auth, teacherOnly);

// The mentorships this teacher may mentor in, with how many students they hold in each
router.get("/", teacher.listMine);
// Their students in one mentorship
router.get("/:typeId/students", teacher.getRoster);
// Add students: { rollNumbers: [] }
router.post("/:typeId/students", teacher.addStudents);
// Remove students: { studentIds: [] }
router.delete("/:typeId/students", teacher.removeStudents);

module.exports = router;
