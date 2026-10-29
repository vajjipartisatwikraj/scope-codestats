import {
  aboutDraft,
  aboutPayload,
  basicsDraft,
  basicsPayload,
  graduationYearFromRoll,
  interestsDraft,
  interestsPayload,
  linksDraft,
  linksPayload,
  platformsDraft,
  platformsPayload,
  skillsDraft,
  skillsPayload,
  usernameFrom,
  validateBasics,
  validateLinks,
  validatePlatforms,
  validateSkills,
} from '../profileModel';

/**
 * The first-time setup, as four steps. Only the first two are required: they are what the leaderboard
 * and the score need. The last two are optional and say so, so nobody feels stuck.
 *
 * Each step has
 *   key, label      the pill in the stepper
 *   title, why      the heading and one sentence on why it is asked
 *   required        the step must be valid before Continue
 *   validate(draft) errors for the step
 *   payload(draft)  the part of the profile this step saves
 */
export const SETUP_STEPS = [
  {
    key: 'basics',
    label: 'About you',
    title: 'Tell us about you',
    why: 'We use this to place you in the right department and batch on the leaderboard.',
    required: true,
    validate: (draft) => validateBasics(draft, { checkRoll: true }),
    payload: (draft) => basicsPayload(draft, { includeRoll: true }),
  },
  {
    key: 'platforms',
    label: 'Coding platforms',
    title: 'Link your coding platforms',
    why: 'Your score and rank come from the platforms you practise on. Add all five so your total is complete. We only read public stats.',
    required: true,
    validate: (draft) => validatePlatforms(draft, { requireAll: true }),
    payload: platformsPayload,
  },
  {
    key: 'skills',
    label: 'Skills and interests',
    title: 'Show what you know',
    why: 'Optional. Add what you can, or skip it and come back later. You can change everything from your profile page.',
    required: false,
    validate: validateSkills,
    payload: (draft) => ({ ...skillsPayload(draft), ...interestsPayload(draft) }),
  },
  {
    key: 'finish',
    label: 'Bio and links',
    title: 'Make it yours',
    why: 'Optional. A short bio and your links make your public profile feel like you.',
    required: false,
    validate: validateLinks,
    payload: (draft) => ({ ...aboutPayload(draft), ...linksPayload(draft) }),
  },
];

/** One draft for the whole setup, so a step can go back and the forms share their parts */
export const setupDraft = (profile) => ({
  ...basicsDraft(profile),
  ...platformsDraft(profile),
  ...skillsDraft(profile),
  ...interestsDraft(profile),
  ...linksDraft(profile),
  ...aboutDraft(profile),
});

/** The body that finishes the setup: everything the steps collected, in the shape the server reads */
export function setupFinalPayload(draft) {
  const year = graduationYearFromRoll(draft.rollNumber);
  return {
    ...basicsPayload(draft, { includeRoll: true }),
    ...platformsPayload(draft),
    ...skillsPayload(draft),
    ...interestsPayload(draft),
    ...aboutPayload(draft),
    ...linksPayload(draft),
    githubUrl: usernameFrom(draft.github),
    graduatingYear: year,
  };
}

/** The draft as a profile, so the same completion calculation can run while the student types */
export const draftAsProfile = (draft, profile) => ({
  ...profile,
  name: draft.name,
  rollNumber: draft.rollNumber,
  department: draft.department,
  section: draft.section,
  phone: draft.phone,
  about: draft.about,
  linkedinUrl: draft.linkedinUrl,
  resumeLink: draft.resumeLink,
  interests: draft.interests,
  skills: draft.skills,
  profiles: Object.fromEntries(Object.keys(platformsDraft({})).map((key) => [key, { username: usernameFrom(draft[key]) }])),
});
