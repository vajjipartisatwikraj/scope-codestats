/**
 * The two execution engines this backend talks to.
 *
 *   codeJudge  Judge0, for programming questions   (services/judges/codeJudge.js)
 *   sqlJudge   SQLJudge, for SQL questions         (services/judges/sqlJudge.js)
 *
 * Only these two modules know the engine addresses and tokens. Controllers and
 * other services call them and never contact an engine themselves.
 */
module.exports = {
  codeJudge: require("./codeJudge"),
  sqlJudge: require("./sqlJudge"),
};
