/**
 * What the profile page knows about a student's profile: the lists a form offers, the rules a value
 * must follow, and how a form's draft becomes the body the server expects. Plain functions, no React,
 * so every part of the page (the section cards, the editors, the setup steps) reads and checks the
 * data the same way. The rules mirror the server's (backend/controllers/profileController.js,
 * backend/services/achievementService.js, backend/models/Profile.js); the server stays the authority.
 */
import { departmentOptions, educationLevels, LEVEL_WITHOUT_STREAM, LEVEL_WITH_DEPARTMENT_STREAM, scoreLimits, scoreTypes } from '../../constants/profileOptions';
import { DESCRIPTION_LIMITS, asEditablePoints, countWords, getPointError, normalizeDescriptionPoints, validateDescriptionPoints } from '../../utils/descriptionPoints';
import { asEditableEducation, getScoreError } from '../../utils/education';
import { linkedinHref, safeUrl } from '../publicProfile/profileModel';

export { DESCRIPTION_LIMITS, asEditablePoints, countWords, getPointError, normalizeDescriptionPoints };
export { departmentOptions, educationLevels, scoreTypes, LEVEL_WITHOUT_STREAM, LEVEL_WITH_DEPARTMENT_STREAM };

// ---- Lists a form offers ----------------------------------------------------------------------

export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export const departmentLabel = (code) => {
  const found = departmentOptions.find((option) => option.value === code);
  return found ? found.label : code || '';
};

/** Quick names for a new skill set */
export const SKILL_SET_IDEAS = ['Languages', 'Frameworks', 'Databases', 'Tools'];

// ---- Coding platforms -------------------------------------------------------------------------

const SAFE_NAME = /^[A-Za-z0-9._-]{1,64}$/;
const GITHUB_NAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|_|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * The five platforms a student can link. `color` is a data-series token, the same hue as on the
 * dashboard and the public profile.
 */
export const PLATFORMS = [
  { key: 'leetcode', name: 'LeetCode', color: 'var(--ds-series-amber)', pattern: SAFE_NAME, example: 'for example, vajji_satwik' },
  { key: 'codeforces', name: 'Codeforces', color: 'var(--ds-series-blue)', pattern: SAFE_NAME, example: 'your handle, for example, Benq' },
  { key: 'codechef', name: 'CodeChef', color: 'var(--ds-series-coral)', pattern: SAFE_NAME, example: 'for example, potato167' },
  { key: 'hackerrank', name: 'HackerRank', color: 'var(--ds-series-green)', pattern: SAFE_NAME, example: 'for example, satwikrajv' },
  { key: 'github', name: 'GitHub', color: 'var(--ds-series-slate)', pattern: GITHUB_NAME, example: 'for example, octocat' },
];

export const platformByKey = (key) => PLATFORMS.find((platform) => platform.key === key);

/** The username from what the student typed or pasted: "https://leetcode.com/u/name/" becomes "name" */
export function usernameFrom(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const looksLikeLink = /^(https?:\/\/|www\.)/i.test(text) || /^[\w-]+(\.[\w-]+)+\//.test(text);
  if (!looksLikeLink) return text.replace(/^@/, '');
  try {
    const url = new URL(/^https?:/i.test(text) ? text : `https://${text}`);
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((part) => ['u', 'user', 'users', 'profile'].includes(part.toLowerCase()));
    const name = marker >= 0 ? parts[marker + 1] : parts[0];
    return name ? decodeURIComponent(name) : '';
  } catch {
    return text;
  }
}

/** A sentence about a username that cannot be right, or '' when it is fine (or empty) */
export function platformError(platform, raw) {
  const name = usernameFrom(raw);
  if (!name) return '';
  return platform.pattern.test(name) ? '' : `That does not look like a ${platform.name} username. Use letters, numbers, dots, dashes or underscores.`;
}

// ---- The profile at a glance ------------------------------------------------------------------

/**
 * Public profile address. New accounts have a stored username (the part of the email before the
 * "@", with a number added when another domain already has it), passed as `stored`. Older accounts
 * have none and keep using the part of the email before the "@".
 */
export const usernameOfEmail = (email, stored) =>
  stored || (typeof email === 'string' && email.includes('@') ? email.split('@')[0] : '');

/** "23r21a05y9" starts with the year they joined: 2000 + 23 + 4 */
export function graduationYearFromRoll(rollNumber) {
  const code = String(rollNumber || '').trim().slice(0, 2);
  return /^\d{2}$/.test(code) ? 2000 + parseInt(code, 10) + 4 : null;
}

/** The server accepts graduating years 2024 to 2030 */
export const batchError = (rollNumber) => {
  const year = graduationYearFromRoll(rollNumber);
  if (year === null) return 'We could not read your batch from this roll number. Check that it starts with two digits, like 23.';
  if (year < 2024 || year > 2030) return `This roll number gives a batch of ${year}, which CodeStats does not support. Check it and try again.`;
  return '';
};

// ---- Draft and payload of each section --------------------------------------------------------

export const PHONE = /^\d{10}$/;

/**
 * `external` is true for someone who signed in with an address that is not a college address
 * (the server runs with LOGIN_MODE=allowlist). Their roll number cannot be read from the address,
 * so they type their own roll number or ID, department, graduating year and college, and the
 * section is optional.
 */
export const basicsDraft = (profile) => ({
  name: profile.name || '',
  rollNumber: profile.rollNumber || '',
  department: profile.department || '',
  section: profile.section || '',
  phone: profile.phone || '',
  external: profile.institutional === false,
  collegeName: profile.collegeName || '',
  graduationYear: profile.graduationYear ? String(profile.graduationYear) : '',
});

/** The year a person types, as a whole number, or NaN */
const typedYear = (value) => (/^\d{4}$/.test(String(value).trim()) ? Number(value) : NaN);

/** @returns {Object<string,string>} field -> sentence; empty when everything is fine */
export function validateBasics(draft, { checkRoll = false } = {}) {
  const errors = {};
  if (!draft.name.trim()) errors.name = 'Enter your full name, as you want it to appear on your profile.';
  if (checkRoll) {
    if (!draft.rollNumber.trim()) errors.rollNumber = draft.external ? 'Enter your roll number or student ID.' : 'Enter your roll number.';
    else if (draft.external) {
      if (draft.rollNumber.trim().length > 40) errors.rollNumber = 'Use at most 40 characters.';
    } else {
      const problem = batchError(draft.rollNumber);
      if (problem) errors.rollNumber = problem;
    }
  }
  if (draft.external) {
    if (!draft.collegeName.trim()) errors.collegeName = 'Enter the name of your college.';
    if (!draft.department.trim()) errors.department = 'Enter your department, like Computer Science.';
    else if (draft.department.trim().length > 60) errors.department = 'Use at most 60 characters.';
    const year = typedYear(draft.graduationYear);
    if (!(year >= 2000 && year <= 2100)) errors.graduationYear = 'Enter the year you graduate, like 2028.';
  } else {
    if (!draft.department) errors.department = 'Choose your department.';
    if (!draft.section) errors.section = 'Choose your section.';
  }
  if (!PHONE.test(draft.phone)) errors.phone = 'Enter a 10-digit mobile number, like 9876543210. Only you see it.';
  return errors;
}

export const basicsPayload = (draft, { includeRoll = false } = {}) => ({
  name: draft.name.trim(),
  department: draft.external ? draft.department.trim() : draft.department,
  // A section is optional for someone outside the college, and the server rejects an empty one
  ...(draft.section ? { section: draft.section } : {}),
  phone: draft.phone,
  ...(draft.external ? { collegeName: draft.collegeName.trim(), graduationYear: typedYear(draft.graduationYear) } : {}),
  ...(includeRoll ? { rollNumber: draft.rollNumber.trim(), ...(draft.external ? {} : { graduationYear: graduationYearFromRoll(draft.rollNumber) }) } : {}),
});

export const platformsDraft = (profile) =>
  Object.fromEntries(PLATFORMS.map((platform) => [platform.key, profile.profiles?.[platform.key]?.username || '']));

export function validatePlatforms(draft, { requireAll = false } = {}) {
  const errors = {};
  PLATFORMS.forEach((platform) => {
    const raw = draft[platform.key] || '';
    if (!usernameFrom(raw)) {
      if (requireAll) errors[platform.key] = `Enter your ${platform.name} username so your score includes it.`;
      return;
    }
    const problem = platformError(platform, raw);
    if (problem) errors[platform.key] = problem;
  });
  return errors;
}

/** The server ignores a blank username, so only the ones with a value are sent */
export const platformsPayload = (draft) => ({
  profiles: Object.fromEntries(PLATFORMS.map((platform) => [platform.key, usernameFrom(draft[platform.key])]).filter(([, name]) => name)),
});

export const aboutDraft = (profile) => ({ about: profile.about || '' });
export const aboutPayload = (draft) => ({ about: draft.about.trim() });

export const linksDraft = (profile) => ({ linkedinUrl: profile.linkedinUrl || '', resumeLink: profile.resumeLink || '' });

export function validateLinks(draft) {
  const errors = {};
  if (draft.linkedinUrl.trim() && !linkedinHref(draft.linkedinUrl)) errors.linkedinUrl = 'Enter your LinkedIn profile link or just your profile name.';
  if (draft.resumeLink.trim() && !safeUrl(withProtocol(draft.resumeLink))) errors.resumeLink = 'Enter a full link, like https://drive.google.com/file/d/your-resume.';
  return errors;
}

export const withProtocol = (value) => (/^https?:\/\//i.test(String(value).trim()) ? String(value).trim() : `https://${String(value).trim()}`);

export const linksPayload = (draft) => ({
  linkedinUrl: draft.linkedinUrl.trim(),
  resumeLink: draft.resumeLink.trim() ? withProtocol(draft.resumeLink) : '',
});

export const interestsDraft = (profile) => ({ interests: Array.isArray(profile.interests) ? profile.interests : [] });
export const interestsPayload = (draft) => ({ interests: draft.interests.map((item) => item.trim()).filter(Boolean) });

export const skillsDraft = (profile) => ({
  skills: (Array.isArray(profile.skills) ? profile.skills : []).map((set) => ({ name: set.name || '', skills: [...(set.skills || [])] })),
});

export function validateSkills(draft) {
  const errors = {};
  draft.skills.forEach((set, index) => {
    if (set.skills.length > 0 && !set.name.trim()) errors[`set-${index}`] = 'Give this set a name, like Languages or Tools.';
  });
  return errors;
}

/** A set needs a name and at least one skill; the server drops the rest */
export const skillsPayload = (draft) => ({
  skills: draft.skills.map((set) => ({ name: set.name.trim(), skills: set.skills })).filter((set) => set.name && set.skills.length > 0),
});

export const emptyEducation = () => ({
  level: '',
  name: '',
  stream: '',
  startDate: '',
  endDate: '',
  scoreType: 'CGPA',
  score: '',
});

export const educationDraft = (profile) => ({ education: asEditableEducation(profile.education) });

/** One error object per entry: { level, date, score } with the sentences that apply */
export function validateEducationEntries(entries) {
  return entries.map((entry) => {
    const errors = {};
    if (!entry.level) errors.level = 'Choose a level.';
    if (entry.startDate && entry.endDate && entry.startDate >= entry.endDate) errors.date = 'The start month must come before the end month.';
    const scoreProblem = getScoreError(entry.scoreType, entry.score);
    if (scoreProblem) errors.score = scoreProblem;
    return errors;
  });
}

/** The shape EducationForm reads its errors in: { entries: [{ level, date, score }, ...] } */
export const validateEducationDraft = (draft) => ({ entries: validateEducationEntries(draft.education) });

export const educationPayload = (draft) => ({ education: draft.education });

export { scoreLimits };

// ---- Portfolio (achievements) -----------------------------------------------------------------

export const ACHIEVEMENT_TYPES = [
  { key: 'project', label: 'Projects', single: 'Project', limited: true, titleLabel: 'Project name', titleHint: 'The name people will see, for example, CodeStats leaderboard.' },
  { key: 'internship', label: 'Internships', single: 'Internship', limited: true, titleLabel: 'Internship title', titleHint: 'Your role and the company, for example, Backend intern at Acme.' },
  { key: 'certification', label: 'Certifications', single: 'Certification', limited: false, titleLabel: 'Certificate name', titleHint: 'Start typing to see recognized certificates you can pick.' },
  { key: 'achievement', label: 'Achievements', single: 'Achievement', limited: false, titleLabel: 'Achievement', titleHint: 'For example, Winner, Smart India Hackathon 2025.' },
];

export const MAX_ITEMS_PER_TYPE = 5;

export const typeInfo = (key) => ACHIEVEMENT_TYPES.find((type) => type.key === key) || ACHIEVEMENT_TYPES[3];

/** The value of a date input (YYYY-MM-DD) from a stored date */
export const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export function emptyAchievement(type = 'project') {
  return {
    type,
    title: '',
    description: Array(DESCRIPTION_LIMITS.minPoints).fill(''),
    tags: [],
    link: '',
    domainLink: '',
    role: '',
    startDate: '',
    endDate: '',
    issuer: '',
    issuedDate: '',
    expiryDate: '',
  };
}

export function achievementDraft(achievement) {
  if (!achievement) return emptyAchievement();
  const points = asEditablePoints(achievement.description);
  return {
    type: achievement.type,
    title: achievement.title || '',
    description: points.length >= DESCRIPTION_LIMITS.minPoints ? points : [...points, ...Array(DESCRIPTION_LIMITS.minPoints - points.length).fill('')],
    tags: Array.isArray(achievement.tags) ? achievement.tags : [],
    link: achievement.link || '',
    domainLink: achievement.domainLink || '',
    role: achievement.role || '',
    startDate: toDateInput(achievement.startDate),
    endDate: toDateInput(achievement.endDate),
    issuer: achievement.issuer || '',
    issuedDate: toDateInput(achievement.issuedDate),
    expiryDate: toDateInput(achievement.expiryDate),
  };
}

/** Errors by field; `description` is one sentence, `points` is an error per point */
export function validateAchievement(draft) {
  const errors = {};
  if (!draft.title.trim()) errors.title = 'Give it a title.';

  const filled = normalizeDescriptionPoints(draft.description);
  const overall = validateDescriptionPoints(filled);
  if (overall) {
    errors.description = overall.startsWith('Point') ? 'Fix the points marked below.' : `${overall}. Describe what you did and what came out of it.`;
    errors.points = draft.description.map((point) => (point.trim() ? getPointError(point) || '' : ''));
  }

  if (draft.type === 'internship' && draft.startDate && draft.endDate && draft.startDate >= draft.endDate) errors.endDate = 'The end date must come after the start date.';
  if (draft.type === 'certification' && draft.issuedDate && draft.expiryDate && draft.issuedDate >= draft.expiryDate) errors.expiryDate = 'The expiry date must come after the issue date.';
  if (draft.link.trim() && !safeUrl(withProtocol(draft.link))) errors.link = 'Enter a full link, like https://github.com/you/project.';
  return errors;
}

/** Only the fields that belong to the type are sent, so switching type leaves nothing behind */
export function achievementPayload(draft) {
  const body = {
    type: draft.type,
    title: draft.title.trim(),
    description: normalizeDescriptionPoints(draft.description),
    tags: draft.tags,
    link: draft.link.trim() ? withProtocol(draft.link) : '',
    domainLink: draft.domainLink.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, ''),
  };
  if (draft.type === 'internship') Object.assign(body, { role: draft.role.trim(), startDate: draft.startDate, endDate: draft.endDate });
  if (draft.type === 'certification') Object.assign(body, { issuer: draft.issuer.trim(), issuedDate: draft.issuedDate, expiryDate: draft.expiryDate });
  return body;
}

// ---- Words and dates --------------------------------------------------------------------------

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
export const monthYear = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : MONTH_YEAR.format(date);
};

export const rangeText = (start, end) => {
  const from = monthYear(start);
  const to = monthYear(end);
  if (from && to) return from === to ? from : `${from} to ${to}`;
  if (from) return `From ${from}`;
  return to;
};

/** A message from a failed request, with the server's own words when it has them */
export function requestError(error, fallback) {
  const data = error?.response?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).find((value) => typeof value === 'string');
    if (first) return first;
  }
  if (typeof data?.message === 'string' && data.message && data.message !== 'Server error') return data.message;
  if (error?.request && !error?.response) return 'We could not reach the server. Check your connection and try again.';
  return fallback;
}
