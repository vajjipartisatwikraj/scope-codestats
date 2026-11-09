/**
 * Pure helpers of the results table: filtering, sorting and the figures of the summary tiles.
 * The rows are the `entries` of the leaderboard / results API; the server already ranks them
 * (finished attempts by score, then time) and puts attempts still in progress last.
 */

/** Distinct, non-empty values of one field of the students, for a filter select. */
export const uniqueValues = (entries, pick) => [...new Set(entries.map((entry) => pick(entry.user)).filter(Boolean))];

/** The same filters as before: search (name, roll number, email) and department, section and year. */
export const filterEntries = (entries, { search, department, section, year }) => {
  const term = search.trim().toLowerCase();
  return entries.filter(({ user }) => {
    const matchesSearch =
      !term ||
      user.name?.toLowerCase().includes(term) ||
      user.rollNumber?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term);
    return (
      matchesSearch &&
      (!department || user.department === department) &&
      (!section || user.section === section) &&
      (!year || String(user.graduatingYear) === year)
    );
  });
};

/** The value a column sorts by. null means "no value": those rows always go last. */
export const sortValue = (entry, key) => {
  const finished = entry.status === "completed";
  switch (key) {
    case "rank":
      return entry.rank || null;
    case "name":
      return entry.user.name ? entry.user.name.toLowerCase() : null;
    case "roll":
      return entry.user.rollNumber ? String(entry.user.rollNumber).toLowerCase() : null;
    case "department":
      return entry.user.department ? String(entry.user.department).toLowerCase() : null;
    case "section":
      return entry.user.section ? String(entry.user.section).toLowerCase() : null;
    case "year":
      return Number(entry.user.graduatingYear) || null;
    case "time":
      return entry.totalTimeUsedSeconds || null;
    case "score":
      return finished && typeof entry.finalScore === "number" ? entry.finalScore : null;
    default:
      if (key.startsWith("section:")) {
        const id = key.slice("section:".length);
        const found = (entry.sectionScores || []).find((s) => String(s.sectionId) === id);
        return typeof found?.score === "number" ? found.score : null;
      }
      return null;
  }
};

/** The direction a column starts with: scores high to low, everything else low to high. */
export const firstDirection = (key) => (key === "score" || key.startsWith("section:") ? "desc" : "asc");

/** A stable sort: equal rows keep the server's order. */
export const sortEntries = (entries, sort) => {
  const factor = sort.dir === "desc" ? -1 : 1;
  return entries
    .map((entry, index) => ({ entry, index, value: sortValue(entry, sort.key) }))
    .sort((a, b) => {
      const aEmpty = a.value === null;
      const bEmpty = b.value === null;
      if (aEmpty || bEmpty) return aEmpty && bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      const order = typeof a.value === "string" ? a.value.localeCompare(b.value, "en", { numeric: true }) : a.value - b.value;
      return order !== 0 ? order * factor : a.index - b.index;
    })
    .map((item) => item.entry);
};

/** The score of one section of an entry, found by section id (the API lists them in section order). */
export const sectionScoreOf = (entry, section, index) => {
  const list = entry.sectionScores || [];
  const found = list.find((s) => String(s.sectionId) === String(section._id)) || list[index];
  return found ? found.score : null;
};
