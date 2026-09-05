/**
 * Builds a canonical "profile snapshot" from a user's saved profile so the
 * resume editor can prefill itself.
 *
 * The snapshot is keyed by the field keys the resume templates declare (see
 * backend/resumeTemplates). A template field may set `importKey` if its key
 * differs from the snapshot key.
 */
const { normalizeEducation } = require("./education");
const { normalizeSkillSets } = require("./skillSets");
const { normalizeDescriptionPoints } = require("./descriptionPoints");

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2023-09" or a Date -> "Sep 2023"
const monthYear = (value) => {
  if (!value) return "";

  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const month = MONTHS[Number(match[2]) - 1];
    return month ? `${month} ${match[1]}` : match[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

// An open-ended range reads as "Present", matching the resume convention
const dateRange = (startDate, endDate) => {
  const start = monthYear(startDate);
  const end = monthYear(endDate);
  if (!start && !end) return "";
  if (!start) return end;
  return `${start} - ${end || "Present"}`;
};

// ALL CAPS names look shouted on a resume, so title case them
const displayName = (name) => {
  const text = String(name || "").trim();
  if (!text || /[a-z]/.test(text)) return text;
  return text
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_match, space, char) => space + char.toUpperCase());
};

const asUrl = (value, prefix) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^https?:\/\//i.test(text) ? text : `${prefix}${text}`;
};

const platformUsername = (profiles, platform) => {
  const entry = profiles?.[platform];
  if (!entry) return "";
  return String(typeof entry === "object" ? entry.username || "" : entry).trim();
};

// Contact line: phone, email, then whichever profile links exist
const buildContact = (user) => {
  const github = platformUsername(user.profiles, "github");
  const leetcode = platformUsername(user.profiles, "leetcode");

  return [
    { text: user.mobileNumber || user.phone || "", url: "" },
    {
      text: user.email || "",
      url: user.email ? `mailto:${user.email}` : "",
    },
    {
      text: "LinkedIn",
      url: asUrl(user.linkedinUrl, "https://linkedin.com/in/"),
    },
    { text: "GitHub", url: asUrl(github, "https://github.com/") },
    { text: "LeetCode", url: leetcode ? `https://leetcode.com/u/${leetcode}/` : "" },
  ].filter((item) => item.text && (item.url || !item.text.match(/^(LinkedIn|GitHub|LeetCode)$/)));
};

const buildEducation = (user) =>
  normalizeEducation(user.education).map((entry) => ({
    institution: entry.name,
    dateRange: dateRange(entry.startDate, entry.endDate),
    degree: entry.stream ? `${entry.level} - ${entry.stream}` : entry.level,
    score:
      entry.score === null || entry.score === undefined
        ? ""
        : `${entry.scoreType}: ${entry.score}`,
  }));

const buildSkills = (user) =>
  normalizeSkillSets(user.skills).map((group) => ({
    category: group.name,
    items: group.skills.join(", "),
  }));

const byRecency = (a, b) =>
  new Date(b.startDate || b.issuedDate || b.createdAt || 0) -
  new Date(a.startDate || a.issuedDate || a.createdAt || 0);

const buildExperience = (achievements) =>
  achievements
    .filter((item) => item.type === "internship")
    .sort(byRecency)
    .map((item) => ({
      organization: item.title || "",
      role: item.role || "",
      dateRange: dateRange(item.startDate, item.endDate),
      points: normalizeDescriptionPoints(item.description),
    }));

const buildProjects = (achievements) =>
  achievements
    .filter((item) => item.type === "project")
    .sort(byRecency)
    .map((item) => ({
      title: item.title || "",
      techStack: (item.tags || []).join(", "),
      liveUrl: asUrl(item.domainLink, "https://"),
      githubUrl: String(item.link || "").trim(),
      points: normalizeDescriptionPoints(item.description),
    }));

const buildCertifications = (achievements) =>
  achievements
    .filter((item) => item.type === "certification")
    .sort(byRecency)
    .map((item) => ({
      name: item.title || "",
      issuer: item.issuer || "",
      credentialUrl: String(item.link || "").trim(),
      issuedDate: monthYear(item.issuedDate) ? `Issued ${monthYear(item.issuedDate)}` : "",
    }));

const buildProfileSnapshot = (user, achievements = []) => ({
  fullName: displayName(user.name),
  contact: buildContact(user),
  overview: user.about || "",
  education: buildEducation(user),
  skills: buildSkills(user),
  experience: buildExperience(achievements),
  projects: buildProjects(achievements),
  certifications: buildCertifications(achievements),
});

module.exports = { buildProfileSnapshot };
