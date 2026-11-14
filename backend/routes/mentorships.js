/**
 * /api/mentorships
 *
 * Mentorships and their rosters, for admins. Admins create a mentorship, choose which teachers may
 * mentor in it, and can read and change any teacher's roster (students are added by roll number).
 * Teachers use routes/myMentorships.js. This file only wires URLs to controllers/mentorshipController
 * and applies the login and admin checks.
 */
const express = require("express");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { admin } = require("../controllers/mentorshipController");

const router = express.Router();

router.use(auth, adminOnly);

// All mentorships, with teacher and student counts
router.get("/", admin.listMentorships);
// Create: { name, description?, startsAt? }
router.post("/", admin.createMentorship);
// The teachers an admin can choose from (before /:typeId, so "teachers" is not read as an id)
router.get("/teachers", admin.listTeachers);
// One mentorship with its teachers and how many students each holds
router.get("/:typeId", admin.getMentorship);
// Change the name, description or start date
router.put("/:typeId", admin.updateMentorship);
// Delete. Refused while any teacher holds students
router.delete("/:typeId", admin.deleteMentorship);
// Choose the teachers who may mentor: { teacherIds: [] }. Refused for a teacher who still holds students
router.put("/:typeId/teachers", admin.setTeachers);
// One teacher's roster: the students they hold in this mentorship
router.get("/:typeId/teachers/:teacherId/students", admin.getRoster);
// Add students: { rollNumbers: [] }. Students who already have a mentor here are reported, not moved
router.post("/:typeId/teachers/:teacherId/students", admin.addStudents);
// Remove students: { studentIds: [] }
router.delete("/:typeId/teachers/:teacherId/students", admin.removeStudents);

module.exports = router;
