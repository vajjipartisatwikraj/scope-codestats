// Helpers for the grouped skills shape: [{ name: "Languages", skills: ["Java"] }]

/**
 * Capitalises a word only when the user typed it entirely in lowercase.
 * Any existing capital means the casing is deliberate - acronyms and brand
 * names like "SAP ABAP", "ReactJS", "OData V4" or "(DDIC)" must survive
 * unchanged, otherwise every save mangles them a little more.
 */
const formatWord = (word) =>
  /[A-Z]/.test(word) ? word : word.replace(/[a-z]/, (char) => char.toUpperCase());

// "  java   script " -> "Java Script"; "SAP ABAP" -> "SAP ABAP"
export const formatSkillLabel = (value) =>
  String(value === undefined || value === null ? "" : value)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(formatWord)
    .join(" ");

// Accepts the grouped shape or the legacy flat array of strings and always
// returns [{ name, skills }] so components can render one way.
export const normalizeSkillSets = (input) => {
  if (!Array.isArray(input)) return [];

  const legacySkills = input.filter((item) => typeof item === "string");
  const sets = input
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      name: formatSkillLabel(item.name),
      skills: (Array.isArray(item.skills) ? item.skills : [])
        .map(formatSkillLabel)
        .filter(Boolean),
    }));

  if (legacySkills.length > 0) {
    sets.unshift({
      name: "Skills",
      skills: legacySkills.map(formatSkillLabel).filter(Boolean),
    });
  }

  return sets.filter((set) => set.name || set.skills.length > 0);
};

// Flattens every set into a single list of skill names.
export const flattenSkillSets = (input) =>
  normalizeSkillSets(input).flatMap((set) => set.skills);
