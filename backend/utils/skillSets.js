// Helpers for the grouped skills format stored on User.skills:
// [{ name: "Languages", skills: ["Java", "Python"] }]

/**
 * Capitalises a word only when the user typed it entirely in lowercase.
 * Any existing capital means the casing is deliberate - acronyms and brand
 * names like "SAP ABAP", "ReactJS", "OData V4" or "(DDIC)" must survive
 * unchanged, otherwise every save mangles them a little more.
 */
const formatWord = (word) =>
  /[A-Z]/.test(word) ? word : word.replace(/[a-z]/, (char) => char.toUpperCase());

// "  java   script " -> "Java Script"; "SAP ABAP" -> "SAP ABAP"
const formatSkillLabel = (value) =>
  String(value === undefined || value === null ? "" : value)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(formatWord)
    .join(" ");

// Accepts the grouped format or the legacy flat array of strings and returns a
// clean [{ name, skills }] array with formatted, de-duplicated values.
const normalizeSkillSets = (input) => {
  if (!Array.isArray(input)) return [];

  const groups = [];
  const groupsByName = new Map();

  const addGroup = (rawName, rawSkills) => {
    const name = formatSkillLabel(rawName);
    if (!name) return;

    const skills = (Array.isArray(rawSkills) ? rawSkills : [])
      .map(formatSkillLabel)
      .filter(Boolean);

    const existing = groupsByName.get(name);
    if (existing) {
      existing.skills.push(...skills);
      return;
    }

    const group = { name, skills };
    groupsByName.set(name, group);
    groups.push(group);
  };

  // Legacy data: skills used to be a flat array of strings.
  const legacySkills = input.filter((item) => typeof item === "string");
  if (legacySkills.length > 0) addGroup("Skills", legacySkills);

  input
    .filter((item) => item && typeof item === "object")
    .forEach((item) => addGroup(item.name, item.skills));

  return groups
    .map((group) => ({ name: group.name, skills: [...new Set(group.skills)] }))
    .filter((group) => group.skills.length > 0);
};

module.exports = { formatSkillLabel, normalizeSkillSets };
