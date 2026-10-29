/**
 * The student-facing handlers that courses and opportunities have in common.
 *
 * Both are catalogues that an admin fills and students browse, bookmark ("save")
 * and read one by one. Instead of two copies of the same code, each controller
 * asks for its set here:
 *
 *   const catalog = createCatalogHandlers(Course, {
 *     noun: "Course", plural: "courses", log,
 *   });
 *
 * Handlers: list, listSaved, getOne, save, unsave.
 * They answer the way the frontend already expects: `{ msg }` for a missing or
 * invalid request, plain text "Server Error" for a failure.
 */
const mongoose = require("mongoose");

function createCatalogHandlers(Model, { noun, plural, log }) {
  const notFound = (res) => res.status(404).json({ msg: `${noun} not found` });

  const serverError = (res, action, err) => {
    log.error(`${action}:`, err);
    res.status(500).send("Server Error");
  };

  // A malformed id is simply an item that does not exist.
  const findItem = (id) => (mongoose.isValidObjectId(id) ? Model.findById(id) : null);

  return {
    /** GET /: everything, newest first. */
    list: async (req, res) => {
      try {
        res.json(await Model.find().sort({ createdAt: -1 }));
      } catch (err) {
        serverError(res, `Error fetching ${plural}`, err);
      }
    },

    /** GET /saved: what the signed-in student has saved. */
    listSaved: async (req, res) => {
      try {
        res.json(await Model.find({ savedBy: req.user.id }));
      } catch (err) {
        serverError(res, `Error fetching saved ${plural}`, err);
      }
    },

    /** GET /:id */
    getOne: async (req, res) => {
      try {
        const item = await findItem(req.params.id);
        if (!item) return notFound(res);
        res.json(item);
      } catch (err) {
        serverError(res, `Error fetching ${noun.toLowerCase()}`, err);
      }
    },

    /** POST /:id/save */
    save: async (req, res) => {
      try {
        const item = await findItem(req.params.id);
        if (!item) return notFound(res);

        if (item.savedBy.includes(req.user.id)) {
          return res.status(400).json({ msg: `${noun} already saved` });
        }

        item.savedBy.push(req.user.id);
        await item.save();
        res.json(item);
      } catch (err) {
        serverError(res, `Error saving ${noun.toLowerCase()}`, err);
      }
    },

    /** DELETE /:id/save */
    unsave: async (req, res) => {
      try {
        const item = await findItem(req.params.id);
        if (!item) return notFound(res);

        if (!item.savedBy.includes(req.user.id)) {
          return res.status(400).json({ msg: `${noun} not saved` });
        }

        item.savedBy = item.savedBy.filter((id) => id.toString() !== req.user.id);
        await item.save();
        res.json(item);
      } catch (err) {
        serverError(res, `Error unsaving ${noun.toLowerCase()}`, err);
      }
    },
  };
}

module.exports = createCatalogHandlers;
