/**
 * Who a staff member is looking at when they filter by mentorship and mentor.
 *
 *   mentorship   one mentorship id, or "all"
 *   mentor       one teacher id, or "all" (admins only; a teacher is always looking at themselves)
 *
 * An admin on "all" and "all" looks at everybody, so there is no student list to narrow to. Every
 * other combination narrows to the students on the matching rosters. A teacher on "all" sees the
 * students of all of their own rosters.
 *
 * Used by the speech test progress and export, so both answer the same question the same way.
 */
const Mentor = require("../../models/Mentor");
const MentorType = require("../../models/MentorType");
const User = require("../../models/User");
const { isObjectId } = require("./mentorshipShared");

const idOrNull = (value) => (isObjectId(value) ? String(value) : null);

/** The mentorships and, for an admin, the mentors a filter can offer. */
async function filterOptions({ admin, userId, typeId }) {
  const types = await MentorType.find(admin ? {} : { eligibleTeachers: userId })
    .select("name eligibleTeachers")
    .sort({ name: 1 })
    .lean();
  const mentorships = types.map((type) => ({ _id: type._id, name: type.name }));
  if (!admin) return { mentorships, mentors: [] };

  const pool = typeId ? types.filter((type) => String(type._id) === typeId) : types;
  const teacherIds = [...new Set(pool.flatMap((type) => type.eligibleTeachers.map(String)))];
  const mentors = await User.find({ _id: { $in: teacherIds } })
    .select("name")
    .sort({ name: 1 })
    .lean();
  return { mentorships, mentors: mentors.map((mentor) => ({ _id: mentor._id, name: mentor.name })) };
}

/**
 * @param {{ id: string, userType: string }} user  the signed-in staff member (req.user)
 * @param {{ mentorship?: string, mentor?: string }} query  the filters; both missing means no filter
 * @returns {Promise<{
 *   scoped: boolean,            false when nobody is filtered out
 *   studentIds: Set<string>|null,  the students in view, or null for everybody
 *   mentorsByStudent: Map<string, Array<{ name: string, email: string, mentorship: string }>>,
 *   rosters: Array<{ teacher: object, students: string[] }>,  the rosters in view
 *   typeId: string|null,        the one mentorship chosen, if any
 *   options: { mentorships: Array, mentors: Array }
 * }>}
 */
async function resolveMentorScope(user, query = {}) {
  const admin = user.userType === "admin";
  const asked = query.mentorship !== undefined || query.mentor !== undefined;
  const typeId = idOrNull(query.mentorship);
  const teacherId = admin ? idOrNull(query.mentor) : asked ? String(user.id) : null;

  const filter = { "students.0": { $exists: true } };
  if (typeId) filter.mentorType = typeId;
  if (teacherId) filter.teacher = teacherId;

  const [rosters, options] = await Promise.all([
    Mentor.find(filter).select("teacher mentorType students").populate("teacher", "name email").populate("mentorType", "name").lean(),
    filterOptions({ admin, userId: user.id, typeId }),
  ]);

  const mentorsByStudent = new Map();
  rosters.forEach((roster) => {
    if (!roster.teacher || !roster.mentorType) return;
    const mentor = { name: roster.teacher.name, email: roster.teacher.email, mentorship: roster.mentorType.name };
    roster.students.forEach((studentId) => {
      const key = String(studentId);
      mentorsByStudent.set(key, [...(mentorsByStudent.get(key) || []), mentor]);
    });
  });

  const scoped = asked && (Boolean(typeId) || Boolean(teacherId));
  return {
    scoped,
    studentIds: scoped ? new Set(mentorsByStudent.keys()) : null,
    mentorsByStudent,
    rosters: rosters
      .filter((roster) => roster.teacher && roster.mentorType)
      .map((roster) => ({ teacher: roster.teacher, mentorship: roster.mentorType.name, students: roster.students.map(String) })),
    typeId,
    options,
  };
}

module.exports = { resolveMentorScope };
