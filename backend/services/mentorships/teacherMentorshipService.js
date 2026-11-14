/**
 * What a teacher sees of mentorships: the ones they may mentor in, each with how many students they
 * hold. Opening a roster and changing it is rosterService.js, called with the teacher's own id.
 */
const mongoose = require("mongoose");
const Mentor = require("../../models/Mentor");
const MentorType = require("../../models/MentorType");

/** The mentorships this teacher is eligible for, newest start first, with their own student count. */
async function listMine(teacherId) {
  const types = await MentorType.find({ eligibleTeachers: teacherId }).sort({ startsAt: -1, createdAt: -1 }).lean();
  const rosters = await Mentor.aggregate([
    { $match: { teacher: new mongoose.Types.ObjectId(String(teacherId)), mentorType: { $in: types.map((type) => type._id) } } },
    { $project: { mentorType: 1, students: { $size: "$students" } } },
  ]);
  const held = new Map(rosters.map((roster) => [String(roster.mentorType), roster.students]));

  return types.map((type) => ({
    _id: type._id,
    name: type.name,
    description: type.description,
    startsAt: type.startsAt,
    studentCount: held.get(String(type._id)) || 0,
  }));
}

module.exports = { listMine };
