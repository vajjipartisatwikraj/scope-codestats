/**
 * Mentorships controller. Two sets of actions share the same roster work:
 *
 *   admin    create and manage mentorships, choose their teachers, and manage any teacher's roster
 *            (routes/mentorships.js, admins only)
 *   teacher  list their own mentorships and manage their own roster (routes/myMentorships.js,
 *            teachers only). The teacher is always the signed-in user, never taken from the request,
 *            so a teacher cannot reach another teacher's students.
 *
 * The rules live in services/mentorships/.
 */
const mentorshipService = require("../services/mentorships/mentorshipService");
const rosterService = require("../services/mentorships/rosterService");
const teacherMentorshipService = require("../services/mentorships/teacherMentorshipService");
const { createHandler } = require("../utils/controllerHandler");
const log = require("../utils/logger").scope("MENTORSHIPS");

const handle = createHandler(log);

/** The three roster actions, for whichever teacher `teacherIdOf(req)` names. */
const rosterActions = (teacherIdOf) => ({
  getRoster: handle("reading a roster", (req) => rosterService.getRoster(req.params.typeId, teacherIdOf(req))),
  addStudents: handle("adding students to a roster", (req) =>
    rosterService.addStudents(req.params.typeId, teacherIdOf(req), req.body?.rollNumbers)
  ),
  removeStudents: handle("removing students from a roster", (req) =>
    rosterService.removeStudents(req.params.typeId, teacherIdOf(req), req.body?.studentIds)
  ),
});

const admin = {
  listMentorships: handle("listing mentorships", () => mentorshipService.listTypes().then((mentorships) => ({ mentorships }))),
  getMentorship: handle("reading a mentorship", (req) => mentorshipService.getTypeDetails(req.params.typeId)),
  createMentorship: handle(
    "creating a mentorship",
    (req) =>
      mentorshipService.createType({
        name: req.body?.name,
        description: req.body?.description,
        startsAt: req.body?.startsAt,
        userId: req.user.id,
      }),
    201
  ),
  updateMentorship: handle("updating a mentorship", (req) =>
    mentorshipService.updateType(req.params.typeId, {
      name: req.body?.name,
      description: req.body?.description,
      startsAt: req.body?.startsAt,
    })
  ),
  deleteMentorship: handle("deleting a mentorship", (req) => mentorshipService.deleteType(req.params.typeId)),
  listTeachers: handle("listing teachers", () => mentorshipService.listTeacherCandidates().then((teachers) => ({ teachers }))),
  setTeachers: handle("choosing the teachers of a mentorship", (req) =>
    mentorshipService.setEligibleTeachers(req.params.typeId, req.body?.teacherIds)
  ),
  ...rosterActions((req) => req.params.teacherId),
};

const teacher = {
  listMine: handle("listing a teacher's mentorships", (req) => teacherMentorshipService.listMine(req.user.id).then((mentorships) => ({ mentorships }))),
  ...rosterActions((req) => req.user.id),
};

module.exports = { admin, teacher };
