/**
 * Input rules for opportunities created or edited by an admin.
 * Used by controllers/opportunityController.
 */
const REQUIRED_FIELDS = ["title", "description", "link", "deadline", "organizer", "status"];

/**
 * Turns a request body into the fields to store, so nothing else (savedBy,
 * registeredStudents, createdBy) can be set by the client.
 *
 * Creating keeps every field the admin sent. Updating changes the required
 * fields always, and an optional field only when a value was sent, so an edit
 * form that leaves a field blank does not wipe what is stored.
 *
 * @returns {{error: {message: string, required: string[]}} | {fields: object}}
 */
function parseOpportunityInput(body, { forUpdate = false } = {}) {
  if (REQUIRED_FIELDS.some((field) => !body[field])) {
    return { error: { message: "Missing required fields", required: REQUIRED_FIELDS } };
  }

  const {
    title, description, link, deadline, organizer, status, category, difficulty,
    registrationOpen, location, tags, prize, eligibility, applicationLink, image,
    organizerProfileUrl, organizerImageUrl,
  } = body;

  if (!forUpdate) {
    return {
      fields: {
        title, description, link, deadline, organizer, status, category, difficulty,
        registrationOpen, location, prize, eligibility, applicationLink,
        tags: Array.isArray(tags) ? tags : [],
        image: image || "",
        organizerProfileUrl: organizerProfileUrl || "",
        organizerImageUrl: organizerImageUrl || "",
      },
    };
  }

  const fields = {
    title, description, link, deadline, organizer, status,
    applicationLink: applicationLink || link,
  };
  if (category) fields.category = category;
  if (difficulty) fields.difficulty = difficulty;
  if (registrationOpen !== undefined) fields.registrationOpen = registrationOpen;
  if (location) fields.location = location;
  if (tags) fields.tags = Array.isArray(tags) ? tags : [];
  if (prize) fields.prize = prize;
  if (eligibility) fields.eligibility = eligibility;
  if (image) fields.image = image;
  if (organizerProfileUrl !== undefined) fields.organizerProfileUrl = organizerProfileUrl;
  if (organizerImageUrl !== undefined) fields.organizerImageUrl = organizerImageUrl;
  return { fields };
}

module.exports = { parseOpportunityInput };
