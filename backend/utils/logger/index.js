/**
 * Backend logging. See .kiro/skills/logs-enhancer/SKILL.md for the rules.
 *
 *   const logger = require("../utils/logger");
 *   logger.info("TAG", "message");
 *   const log = logger.scope("TAG");      // log.debug / log.warn / log.error
 *   app.use(logger.responseMeter());      // before compression(): measures what is sent
 *   app.use(logger.requestLogger());      // one block per request, after compression()
 */
const logger = require("./logger");
const { requestLogger, responseMeter, errorCapture } = require("./requestLogger");

module.exports = logger;
module.exports.requestLogger = requestLogger;
module.exports.responseMeter = responseMeter;
module.exports.errorCapture = errorCapture;
