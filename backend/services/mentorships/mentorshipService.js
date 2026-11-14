/**
 * Mentorships (MentorType): what admins create and manage. A mentorship has a name, a description, a
 * start date and the teachers who may mentor in it. The students each teacher holds are in
 * rosterService.js.
 *
 * Rules: a name is unique ignoring case; a teacher who still holds students cannot be taken off a
 * mentorship; a mentorship with students cannot be deleted.
 */
const Mentor = require("../../models/Mentor");
const MentorType = require("../../models/MentorType");
const User = require("../../models/User");
const { ServiceError } = require("../../utils/ServiceError");
const log = require("../../utils/logger").scope("MENTORSHIPS");
const { assertObjectId, cleanIdList, cleanText, shortId } = require("./mentorshipShared");

const DUPLICATE_KEY = 11000;
const MAX_TEACHERS = 200;
const TEACHER_FIELDS = "name email department";

/** The mentorship as the screens show it. */
const summaryOf = (type, { studentCount = 0 } = {}) => ({
  _id: type._id,
  name: type.name,
  description: type.description,
  startsAt: type.startsAt,
  teacherCount: type.eligibleTeachers.length,
  studentCount,
  createdAt: type.createdAt,
});

/** How many students each mentorship holds in total, as a Map of type id -> count. */
async function studentCounts(typeIds) {
  const rows = await Mentor.aggregate([
    { $match: { mentorType: { $in: typeIds } } },
    { $group: { _id: "$mentorType", students: { $sum: { $size: "$students" } } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.students]));
}

async function getTypeOrFail(typeId) {
  assertObjectId(typeId, "Mentorship not found");
  const type = await MentorType.findById(typeId);
  if (!type) throw new ServiceError(404, "Mentorship not found");
  return type;
}

/** Save, turning a duplicate name into a readable error. */
async function saveType(type) {
  try {
    return await type.save();
  } catch (err) {
    if (err.code === DUPLICATE_KEY) {
      throw new ServiceError(409, `A mentorship named "${type.name}" already exists`, { reason: "duplicate_name" });
    }
    throw err;
  }
}

function cleanStart(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ServiceError(400, "The start date is not valid");
  return date;
}

/** All mentorships, newest start first, with how many teachers and students each has. */
async function listTypes() {
  const types = await MentorType.find().sort({ startsAt: -1, createdAt: -1 }).lean();
  const counts = await studentCounts(types.map((type) => type._id));
  return types.map((type) => summaryOf(type, { studentCount: counts.get(String(type._id)) || 0 }));
}

/** One mentorship with its teachers and how many students each of them holds. */
async function getTypeDetails(typeId) {
  const type = await getTypeOrFail(typeId);
  const [teachers, rosters] = await Promise.all([
    User.find({ _id: { $in: type.eligibleTeachers } }).select(TEACHER_FIELDS).sort({ name: 1 }).lean(),
    Mentor.aggregate([
      { $match: { mentorType: type._id } },
      { $project: { teacher: 1, students: { $size: "$students" } } },
    ]),
  ]);
  const held = new Map(rosters.map((roster) => [String(roster.teacher), roster.students]));
  const studentCount = [...held.values()].reduce((sum, count) => sum + count, 0);

  return {
    mentorship: summaryOf(type, { studentCount }),
    mentors: teachers.map((teacher) => ({ ...teacher, studentCount: held.get(String(teacher._id)) || 0 })),
  };
}

async function createType({ name, description, startsAt, userId }) {
  const type = await saveType(
    new MentorType({
      name: cleanText(name, { label: "A name", max: 100, required: true }),
      description: cleanText(description, { label: "The description", max: 500 }),
      startsAt: cleanStart(startsAt),
      createdBy: userId,
    })
  );
  log.info(`mentorship created | mentorship=${shortId(type._id)} by=${shortId(userId)}`);
  return { mentorship: summaryOf(type) };
}

async function updateType(typeId, { name, description, startsAt }) {
  const type = await getTypeOrFail(typeId);
  if (name !== undefined) type.name = cleanText(name, { label: "A name", max: 100, required: true });
  if (description !== undefined) type.description = cleanText(description, { label: "The description", max: 500 });
  const start = cleanStart(startsAt);
  if (start) type.startsAt = start;
  await saveType(type);
  log.info(`mentorship updated | mentorship=${shortId(type._id)}`);
  const counts = await studentCounts([type._id]);
  return { mentorship: summaryOf(type, { studentCount: counts.get(String(type._id)) || 0 }) };
}

/** The teachers an admin can choose from. */
function listTeacherCandidates() {
  return User.find({ userType: "teacher" }).select(TEACHER_FIELDS).sort({ name: 1 }).lean();
}

/**
 * Replace the teachers who may mentor in this mentorship. A teacher who is taken off while still
 * holding students is refused (409, with who), so no student is dropped without an admin seeing it.
 * A taken-off teacher with an empty roster loses the empty roster.
 */
async function setEligibleTeachers(typeId, teacherIds) {
  const type = await getTypeOrFail(typeId);
  const ids = cleanIdList(teacherIds ?? [], { label: "The list of teachers", max: MAX_TEACHERS });

  const teachers = await User.find({ _id: { $in: ids }, userType: "teacher" }).select("_id").lean();
  if (teachers.length !== ids.length) {
    throw new ServiceError(400, "Only teacher accounts can mentor. One of the chosen accounts is not a teacher.");
  }

  const keep = new Set(ids);
  const removed = type.eligibleTeachers.map(String).filter((id) => !keep.has(id));
  if (removed.length > 0) {
    const holding = await Mentor.find({ mentorType: type._id, teacher: { $in: removed }, "students.0": { $exists: true } })
      .populate("teacher", "name")
      .lean();
    if (holding.length > 0) {
      throw new ServiceError(409, "Some teachers still hold students. Remove those students first.", {
        reason: "teachers_hold_students",
        teachers: holding.map((roster) => ({ _id: roster.teacher._id, name: roster.teacher.name, studentCount: roster.students.length })),
      });
    }
    await Mentor.deleteMany({ mentorType: type._id, teacher: { $in: removed } });
  }

  type.eligibleTeachers = ids;
  await type.save();
  log.info(`mentorship teachers set | mentorship=${shortId(type._id)} teachers=${ids.length} removed=${removed.length}`);
  return getTypeDetails(type._id);
}

async function deleteType(typeId) {
  const type = await getTypeOrFail(typeId);
  const held = await studentCounts([type._id]);
  if ((held.get(String(type._id)) || 0) > 0) {
    throw new ServiceError(409, `"${type.name}" still has students. Remove them from every mentor first.`, { reason: "has_students" });
  }
  await Mentor.deleteMany({ mentorType: type._id });
  await type.deleteOne();
  log.info(`mentorship deleted | mentorship=${shortId(type._id)}`);
  return { message: `Mentorship "${type.name}" deleted` };
}

module.exports = {
  summaryOf,
  studentCounts,
  getTypeOrFail,
  listTypes,
  getTypeDetails,
  createType,
  updateType,
  listTeacherCandidates,
  setEligibleTeachers,
  deleteType,
};
