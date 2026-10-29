/**
 * Controllers (request handlers). Each one is wired to URLs in routes/.
 *
 *   profileController      - the signed-in user's profile page and platform profiles
 *   leaderboardController  - leaderboard, export, top users, public top 10
 *   userController         - user view pages, public profile, profile pictures, staff user tools
 *   achievementController  - internships, projects, certifications, admin export
 *   courseController       - courses: browse, save, enroll; admin management
 *   opportunityController  - opportunities: browse, save; admin management
 *   codeExecutionController - run code and run against test cases (served under /api/courses)
 *   heatmapController      - the activity heatmap
 *   dailyCronController    - admin control of the nightly profile sync
 */
module.exports = {
  profileController: require("./profileController"),
  leaderboardController: require("./leaderboardController"),
  userController: require("./userController"),
  achievementController: require("./achievementController"),
  courseController: require("./courseController"),
  opportunityController: require("./opportunityController"),
  codeExecutionController: require("./codeExecutionController"),
  cohorts: require("./cohorts"), // eleven controllers, one per area of routes/cohorts/
  heatmapController: require("./heatmapController"),
  dailyCronController: require("./dailyCronController"),
};
