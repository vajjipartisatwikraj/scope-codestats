/**
 * The in-page search of the speech test lists (the student list and the staff list).
 *
 * A test matches when the text appears in its title, its description or the name of one of its
 * sections, ignoring case. This is the same rule the server applies for the navbar search
 * (backend/services/speechTestSearch.js), so a test found in one place is found in the other.
 */

/** The text to look for: trimmed and lower-cased. An empty string means "no search". */
export const normalizeQuery = (text) => String(text || '').trim().toLowerCase();

/**
 * @param {{title?: string, description?: string, sections?: Array<{title?: string}>}} test
 * @param {string} query  already passed through normalizeQuery
 */
export const testMatchesQuery = (test, query) => {
  if (!query) return true;
  const haystack = [test.title, test.description, ...(test.sections || []).map((section) => section.title)]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return haystack.includes(query);
};
