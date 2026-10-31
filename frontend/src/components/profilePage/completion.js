/**
 * How complete a profile is, and what to do next. Worked out on the page from the profile and the
 * portfolio, so it always agrees with what the student sees. Every part has a weight; the weights add
 * up to 100. A part can be partly done (three of five platforms linked is three fifths of its weight).
 *
 * `completionOf` returns
 *   percent   0 to 100, a whole number
 *   steps     every part: { key, title, hint, minutes, weight, earned, done, detail }
 *   next      the parts still to do, the biggest gain first (the basics always first)
 */
import { PHONE, PLATFORMS } from './profileModel';

const hasText = (value, min = 1) => typeof value === 'string' && value.trim().length >= min;

export function completionOf(profile, achievements = []) {
  const linked = PLATFORMS.filter((platform) => hasText(profile.profiles?.[platform.key]?.username)).length;
  const skills = (profile.skills || []).reduce((sum, set) => sum + (set.skills || []).length, 0);
  const education = (profile.education || []).filter((entry) => entry && entry.level).length;
  const links = [hasText(profile.linkedinUrl), hasText(profile.resumeLink)].filter(Boolean).length;
  // A section belongs to the college's own students; someone outside it gives their college name instead
  const placeDone = profile.institutional === false ? hasText(profile.collegeName) : Boolean(profile.section);
  const basicsDone = [hasText(profile.name), hasText(profile.rollNumber), Boolean(profile.department), placeDone, PHONE.test(profile.phone || '')];
  const basicsCount = basicsDone.filter(Boolean).length;

  const part = (key, title, hint, minutes, weight, fraction, detail) => {
    const share = Math.max(0, Math.min(1, fraction));
    return { key, title, hint, minutes, weight, earned: weight * share, done: share >= 1, detail };
  };

  const steps = [
    part('basics', 'Add your personal details', 'Your name, department, section and mobile number. Your number stays private.', 2, 30, basicsCount / basicsDone.length, `${basicsCount} of ${basicsDone.length} filled in`),
    part('platforms', 'Link your coding platforms', 'Your score and rank come from the platforms you link. Each one adds to your total.', 3, 25, linked / PLATFORMS.length, `${linked} of ${PLATFORMS.length} linked`),
    part('about', 'Write a short bio', 'Two or three sentences on what you build and what you are learning.', 2, 10, hasText(profile.about, 40) ? 1 : hasText(profile.about) ? 0.5 : 0, hasText(profile.about) ? 'Add a little more detail' : 'Not written yet'),
    part('skills', 'List your skills', 'Group them into sets, like Languages and Tools. Three or more is a good start.', 2, 10, skills / 3, skills === 0 ? 'None added yet' : `${skills} added`),
    part('education', 'Add your education', 'Your college, and your school or intermediate if you like. Scores are optional.', 3, 10, education / 2, education === 0 ? 'None added yet' : `${education} added`),
    part('portfolio', 'Add a project, internship or certificate', 'Show what you have built or earned. One is enough to begin.', 4, 5, achievements.length > 0 ? 1 : 0, achievements.length === 0 ? 'Nothing added yet' : `${achievements.length} added`),
    part('interests', 'Choose your interests', 'The areas you want to grow in, like Web Development or Competitive Programming.', 1, 5, (profile.interests || []).length > 0 ? 1 : 0, (profile.interests || []).length === 0 ? 'None chosen yet' : `${profile.interests.length} chosen`),
    part('links', 'Add your LinkedIn and resume', 'So people can reach you and read more about you.', 1, 5, links / 2, links === 0 ? 'No links yet' : `${links} of 2 added`),
  ];

  const percent = Math.round(steps.reduce((sum, step) => sum + step.earned, 0));
  const next = steps
    .filter((step) => !step.done)
    .sort((a, b) => (a.key === 'basics' ? -1 : b.key === 'basics' ? 1 : b.weight - b.earned - (a.weight - a.earned)));

  return { percent, steps, next };
}

/** "3 steps left, about 7 minutes" */
export function leftText(next) {
  if (next.length === 0) return 'Nothing left to add';
  const minutes = next.reduce((sum, step) => sum + step.minutes, 0);
  return `${next.length} ${next.length === 1 ? 'step' : 'steps'} left, about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/** A sentence for the headline of the completion tile, by how far along they are */
export function encouragement(percent) {
  if (percent >= 100) return 'Your profile is complete';
  if (percent >= 80) return 'Almost there';
  if (percent >= 50) return 'Good progress';
  if (percent >= 20) return 'A good start';
  return 'Let\u2019s get started';
}
