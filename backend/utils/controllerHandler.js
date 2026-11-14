/**
 * The wrapper every controller action needs: run a service call, send its result, or send the error
 * it raised.
 *
 *   const handle = createHandler(require("../utils/logger").scope("MENTORSHIPS"));
 *   const listThings = handle("listing things", () => thingService.list());
 *   const createThing = handle("creating a thing", (req) => thingService.create(req.body), 201);
 *
 * A ServiceError is answered as it describes; anything else is logged once through `log` and answered
 * with 500 (see respondWithError). `work` receives the request and returns the JSON body.
 */
const { respondWithError } = require("./ServiceError");

const createHandler = (log) => (action, work, successStatus = 200) => async (req, res) => {
  try {
    res.status(successStatus).json(await work(req));
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

module.exports = { createHandler };
