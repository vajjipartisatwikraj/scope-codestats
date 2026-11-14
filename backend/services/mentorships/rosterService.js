/**
 * The roster of one teacher in one mentorship: reading it, adding students from roll numbers, and
 * removing students. Admins and teachers use the same functions; the controllers decide whose
 * roster a request may touch (an admin names the teacher, a teacher can only name themselves).
 *
 * Rules:
 *   - the teacher must be eligible for the mentorship (MentorType.eligibleTeachers);
 *   - in one mentorship a student is in at most one roster. A student who is already held by another
 *     mentor is not added; the answer says who holds them. The unique index on Mentor is the final
 *     guard if two teachers add the same student at the same moment;
 *   - roll numbers without an account yet are not stored. The answer lists them so they can be added
 *     again after the student registers.
 */
const Mentor = require("../../models/Mentor");
const User = require("../../models/User");
const { normalizeRollNumbers, resolveMembers } = require("../userGroups/rollNumberService");
const { ServiceError } = require("../../utils/ServiceError");
const log = require("../../utils/logger").scope("MENTORSHIPS");
const { getTypeOrFail, summaryOf } = require("./mentorshipService");
const { MAX_ROSTER_SIZE, STUDENT_FIELDS, assertObjectId, cleanIdList, shortId } = require("./mentorshipShared");

const DUPLICATE_KEY = 11000;

/** The mentorship, and a 403 unless this teacher may mentor in it. */
async function loadEligibleType(typeId, teacherId) {
  const type = await getTypeOrFail(typeId);
  assertObjectId(teacherId, "Teacher not found");
  if (!type.eligibleTeachers.some((id) => String(id) === String(teacherId))) {
    throw new ServiceError(403, "That teacher is not a mentor of this mentorship");
  }
  return type;
}

/** The students of a roster, as accounts. A student whose account was deleted is simply absent. */
async function studentsOf(studentIds) {
  if (studentIds.length === 0) return [];
  return User.find({ _id: { $in: studentIds } }).select(STUDENT_FIELDS).sort({ rollNumber: 1 }).lean();
}

/** The mentorship, the teacher and the students in their roster. */
async function getRoster(typeId, teacherId) {
  const type = await loadEligibleType(typeId, teacherId);
  const [teacher, roster] = await Promise.all([
    User.findById(teacherId).select("name email department").lean(),
    Mentor.findOne({ mentorType: type._id, teacher: teacherId }).select("students").lean(),
  ]);
  const students = await studentsOf(roster ? roster.students : []);
  return { mentorship: summaryOf(type, { studentCount: students.length }), teacher, students };
}

/**
 * Which of these students are held by another mentor of the mentorship.
 * @returns {Promise<Map<string, string>>} student id -> the holder's name
 */
async function holdersOf(typeId, teacherId, studentIds) {
  const rosters = await Mentor.find({ mentorType: typeId, teacher: { $ne: teacherId }, students: { $in: studentIds } })
    .select("teacher students")
    .populate("teacher", "name")
    .lean();
  const wanted = new Set(studentIds.map(String));
  const holders = new Map();
  rosters.forEach((roster) => {
    roster.students.forEach((id) => {
      if (wanted.has(String(id))) holders.set(String(id), roster.teacher?.name || "another mentor");
    });
  });
  return holders;
}

/**
 * Add students by roll number.
 * @returns {Promise<{added, alreadyInRoster, conflicts, notFound, blankRows, duplicatesInFile}>}
 */
async function addStudents(typeId, teacherId, rollNumbers) {
  const type = await loadEligibleType(typeId, teacherId);

  const normalized = normalizeRollNumbers(rollNumbers ?? []);
  if (normalized.rollNumbers.length === 0) throw new ServiceError(400, "Add at least one roll number");

  const { users, unmatched } = await resolveMembers(normalized.rollNumbers);
  const ids = users.map((user) => user._id);

  const current = await Mentor.findOne({ mentorType: type._id, teacher: teacherId }).select("students").lean();
  const mine = new Set((current ? current.students : []).map(String));
  const holders = ids.length ? await holdersOf(type._id, teacherId, ids) : new Map();

  const alreadyInRoster = users.filter((user) => mine.has(user._id));
  const conflicts = users
    .filter((user) => holders.has(user._id))
    .map((user) => ({ rollNumber: user.rollNumber, name: user.name, heldBy: holders.get(user._id) }));
  const fresh = users.filter((user) => !mine.has(user._id) && !holders.has(user._id));

  if (mine.size + fresh.length > MAX_ROSTER_SIZE) {
    throw new ServiceError(400, `A mentor can hold at most ${MAX_ROSTER_SIZE} students in one mentorship`);
  }

  if (fresh.length > 0) {
    try {
      await Mentor.updateOne(
        { mentorType: type._id, teacher: teacherId },
        { $addToSet: { students: { $each: fresh.map((user) => user._id) } } },
        { upsert: true }
      );
    } catch (err) {
      if (err.code === DUPLICATE_KEY) {
        throw new ServiceError(409, "Another mentor added one of these students a moment ago. Upload again to see who holds them.", {
          reason: "student_taken",
        });
      }
      throw err;
    }
  }

  log.info(
    `students added | mentorship=${shortId(type._id)} mentor=${shortId(teacherId)} added=${fresh.length} conflicts=${conflicts.length} notFound=${unmatched.length}`
  );
  return {
    added: fresh.length,
    alreadyInRoster: alreadyInRoster.length,
    conflicts,
    notFound: unmatched,
    blankRows: normalized.blankRows,
    duplicatesInFile: normalized.duplicates,
  };
}

/** Remove students (by account id) from the roster. */
async function removeStudents(typeId, teacherId, studentIds) {
  const type = await loadEligibleType(typeId, teacherId);
  const ids = cleanIdList(studentIds ?? [], { label: "The list of students", max: MAX_ROSTER_SIZE });
  if (ids.length === 0) throw new ServiceError(400, "Choose at least one student to remove");

  const before = await Mentor.findOneAndUpdate(
    { mentorType: type._id, teacher: teacherId },
    { $pull: { students: { $in: ids } } },
    { new: false }
  )
    .select("students")
    .lean();

  const wanted = new Set(ids);
  const removed = before ? before.students.filter((id) => wanted.has(String(id))).length : 0;
  log.info(`students removed | mentorship=${shortId(type._id)} mentor=${shortId(teacherId)} removed=${removed}`);
  return { removed };
}

module.exports = { getRoster, addStudents, removeStudents };
