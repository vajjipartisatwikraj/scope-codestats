/**
 * Controllers of the speech (communication) test routes (routes/speechTests.js).
 *
 *   adminTestController      - author, schedule, publish and delete a test
 *   adminResultsController   - results, Excel export, delete a submission
 *   studentTestController    - test list and overview, start/end, feedback, section results, ranking
 *   studentSectionController - open, submit and retry one section
 *   studentAnswerController  - save an answer, microphone check
 *
 * The user groups attached to a test are handled by ../speechTestUserGroupController.
 */
module.exports = {
  adminTestController: require("./adminTestController"),
  adminResultsController: require("./adminResultsController"),
  studentTestController: require("./studentTestController"),
  studentSectionController: require("./studentSectionController"),
  studentAnswerController: require("./studentAnswerController"),
  userGroupController: require("../speechTestUserGroupController"),
};
