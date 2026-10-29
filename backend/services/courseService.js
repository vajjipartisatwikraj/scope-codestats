/**
 * Input rules for courses created or edited by an admin.
 * Used by controllers/courseController.
 */
const REQUIRED_FIELDS = ["title", "description", "courseLink"];
const EDITABLE_FIELDS = [
  "title",
  "description",
  "courseLink",
  "image",
  "instructor",
  "level",
  "category",
  "duration",
  "topics",
  "prerequisites",
  "resources",
  "isActive",
];

/**
 * Takes the editable fields from a request body, so nothing else (savedBy,
 * registeredStudents, createdBy) can be set by the client.
 * @returns {{error: {message: string, required: string[]}} | {fields: object}}
 */
function parseCourseInput(body) {
  if (REQUIRED_FIELDS.some((field) => !body[field])) {
    return { error: { message: "Missing required fields", required: REQUIRED_FIELDS } };
  }
  const fields = {};
  for (const field of EDITABLE_FIELDS) fields[field] = body[field];
  return { fields };
}

module.exports = { parseCourseInput };
