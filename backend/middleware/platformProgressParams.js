/**
 * Validates the parameters of the platform progress routes and puts the clean values on
 * `req.progress`:
 *
 *   platformProgressParams   :platform path parameter + ?days=   ->  { platform, days }
 *   platformProgressParams.rangeOnly   ?days= only               ->  { days }
 *
 * Anything else is refused with a 400 before it reaches a controller, so controllers and
 * services never see a platform name or a range they do not support.
 */
const {
  PROGRESS_PLATFORMS,
  RANGE_OPTIONS,
  DEFAULT_RANGE_DAYS,
} = require("../config/platformProgress");

/** The ?days= value, or an error message. */
function readDays(query) {
  if (query.days === undefined) return { days: DEFAULT_RANGE_DAYS };
  const days = Number(query.days);
  if (!Number.isInteger(days) || !RANGE_OPTIONS.includes(days)) {
    return { error: `Invalid range. "days" must be one of: ${RANGE_OPTIONS.join(", ")}.` };
  }
  return { days };
}

function platformProgressParams(req, res, next) {
  const { platform } = req.params;
  if (!PROGRESS_PLATFORMS.includes(platform)) {
    return res.status(400).json({
      message: `Unknown platform. Use one of: ${PROGRESS_PLATFORMS.join(", ")}.`,
    });
  }

  const { days, error } = readDays(req.query);
  if (error) return res.status(400).json({ message: error });

  req.progress = { platform, days };
  next();
}

function rangeOnly(req, res, next) {
  const { days, error } = readDays(req.query);
  if (error) return res.status(400).json({ message: error });
  req.progress = { days };
  next();
}

module.exports = platformProgressParams;
module.exports.rangeOnly = rangeOnly;
