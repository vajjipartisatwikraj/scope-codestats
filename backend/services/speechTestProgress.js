/**
 * How the students of a speech test are doing, for the people who mentor them.
 *
 * `loadProgress` takes the whole ranking of a test and narrows it to the students in view (all of
 * them, one mentorship, one mentor; see services/mentorships/mentorScopeService.js). The ranks are
 * worked out again inside that group, so a mentor's leaderboard starts at 1. The on-screen progress
 * page and the Excel export both read it, which keeps them in agreement.
 */
const User = require("../models/User");
const { resolveMentorScope } = require("./mentorships/mentorScopeService");
const { assignRanks, buildLeaderboard } = require("./speechTestLeaderboard");

const STUDENT_FIELDS = "name rollNumber email department section graduatingYear graduationYear profilePicture mobileNumber";

const round1 = (value) => Math.round(value * 10) / 10;
const average = (scores) => (scores.length ? round1(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null);
const scoresOf = (entries) => entries.filter((entry) => entry.status === "completed" && typeof entry.finalScore === "number").map((entry) => entry.finalScore);

/** The user fields of a leaderboard entry, for a student who never started. */
const plainStudent = (user) => ({
  _id: user._id,
  name: user.name,
  rollNumber: user.rollNumber,
  email: user.email,
  department: user.department,
  section: user.section,
  graduatingYear: user.graduatingYear || user.graduationYear,
  profilePicture: user.profilePicture,
  mobileNumber: user.mobileNumber,
});

/** The headline numbers of a group of students. */
function statsOf(entries, notStartedCount) {
  const scores = scoresOf(entries);
  const finished = entries.filter((entry) => entry.status === "completed").length;
  return {
    total: entries.length + notStartedCount,
    notStarted: notStartedCount,
    inProgress: entries.length - finished,
    finished,
    averageScore: average(scores),
    topScore: scores.length ? Math.max(...scores) : null,
  };
}

/** One row for each mentor of the chosen mentorship: how their students did in this test. */
function mentorRowsOf(rosters, entries, eligible) {
  const entryByStudent = new Map(entries.map((entry) => [String(entry.user._id), entry]));
  return rosters
    .map((roster) => {
      const students = roster.students.filter((id) => eligible.has(id) || entryByStudent.has(id));
      const theirs = students.map((id) => entryByStudent.get(id)).filter(Boolean);
      const finished = theirs.filter((entry) => entry.status === "completed");
      const scores = scoresOf(theirs);
      return {
        mentor: roster.teacher.name,
        email: roster.teacher.email,
        assigned: students.length,
        participated: theirs.length,
        finished: finished.length,
        notStarted: students.length - theirs.length,
        averageScore: average(scores),
        topScore: scores.length ? Math.max(...scores) : null,
      };
    })
    .sort((a, b) => a.mentor.localeCompare(b.mentor));
}

/** A sentence for the workbook: which students it covers. */
function labelOf(scope, user, query) {
  if (!scope.scoped) return "All students";
  const mentorship = scope.typeId ? scope.options.mentorships.find((item) => String(item._id) === scope.typeId)?.name : "All mentorships";
  const mentor = user.userType === "admin" ? scope.options.mentors.find((item) => String(item._id) === String(query.mentor))?.name || "All mentors" : "Your students";
  return `${mentorship || "All mentorships"} \u00b7 ${mentor}`;
}

/**
 * @param {object} test   a SpeechTest (needs sections and eligibleUsers)
 * @param {{ id: string, userType: string }} user  the signed-in staff member
 * @param {{ mentorship?: string, mentor?: string }} query  the filters, see resolveMentorScope
 * @returns {Promise<{ entries: Array, notStarted: Array, stats: object, filters: object,
 *   mentorRows: Array|null, label: string, studentIds: Set<string>|null }>}
 */
async function loadProgress(test, user, query = {}) {
  const scope = await resolveMentorScope(user, query);
  const inView = (id) => !scope.studentIds || scope.studentIds.has(String(id));
  const mentorsOf = (id) => scope.mentorsByStudent.get(String(id)) || [];

  const board = await buildLeaderboard(test, { includeInProgress: true });
  const inScope = board.filter((entry) => inView(entry.user._id));
  // The students' own leaderboard never carries a phone number, so it is added here, for staff only
  const phones = new Map(
    (await User.find({ _id: { $in: inScope.map((entry) => entry.user._id) } }).select("mobileNumber").lean()).map((student) => [String(student._id), student.mobileNumber])
  );
  const entries = assignRanks(inScope).map((entry) => ({
    ...entry,
    user: { ...entry.user, mobileNumber: phones.get(String(entry.user._id)) },
    mentors: mentorsOf(entry.user._id),
  }));

  const started = new Set(entries.map((entry) => String(entry.user._id)));
  const waitingIds = (test.eligibleUsers || []).map(String).filter((id) => inView(id) && !started.has(id));
  const waiting = waitingIds.length
    ? await User.find({ _id: { $in: waitingIds }, userType: { $nin: ["admin", "teacher"] } })
        .select(STUDENT_FIELDS)
        .sort({ rollNumber: 1 })
        .lean()
    : [];
  const notStarted = waiting.map((student) => ({ ...plainStudent(student), mentors: mentorsOf(student._id) }));

  const eligible = new Set((test.eligibleUsers || []).map(String));
  return {
    entries,
    notStarted,
    stats: statsOf(entries, notStarted.length),
    filters: scope.options,
    mentorRows: scope.typeId ? mentorRowsOf(scope.rosters, entries, eligible) : null,
    label: labelOf(scope, user, query),
    studentIds: scope.studentIds,
  };
}

module.exports = { loadProgress };
