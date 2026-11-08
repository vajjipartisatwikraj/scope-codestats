import brand from '../../brand';

/**
 * Everything a landing page shows that is a choice, not code: the words of the hero and the addresses of the
 * background videos. The pages read it from here, so nothing of it is written into a component.
 *
 * Where each value comes from, first one found wins:
 *   1. the build's environment (frontend/.env, read when the app is built), for the videos:
 *        VITE_LANDING_HERO_VIDEO, VITE_LANDING_LEADERBOARD_VIDEO, VITE_LANDING_CTA_VIDEO
 *   2. the institution's brand.json (src/brand/institutions/<name>/brand.json), under "landing":
 *        "hero":  { "eyebrow", "titleTop", "titleAccent", "lead", "loginLabel" }
 *        "media": { "hero", "leaderboard", "cta" }          (addresses of .mp4 files)
 *   3. the defaults below.
 *
 * In the hero texts {codeStats} is replaced by the name of CodeStats, and {institution}, {institutionFull},
 * {platform}, {club}, {clubShort} and {builder} by the names of the build (src/brand/fill.mjs).
 * A video address left empty means "no video there": the section simply has no moving background.
 */

const env = import.meta.env;

const DEFAULTS = {
  hero: {
    eyebrow: '{codeStats} at {institution}',
    titleTop: 'Sharpen every',
    titleAccent: 'line of code.',
    lead:
      'Transform everyday practice into measurable technical growth. {codeStats} provides a streamlined environment to complete coding assessments, participate in targeted cohorts, and leverage data-driven insights to continuously elevate your engineering skills.',
    loginLabel: 'Login',
  },
  media: {
    hero: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
    leaderboard: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4',
    cta: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4',
  },
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');
/** The first of these that is a non-empty string, or '' when every one is empty; an empty string in the brand file turns a thing off */
const pick = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') return value.trim();
  }
  return '';
};

const words = (value) => brand.fill(text(value).replace(/\{codeStats\}/g, brand.codeStats.name));

const landing = (brand.institution && brand.institution.landing) || {};
const heroOverrides = landing.hero || {};
const mediaOverrides = landing.media || {};

const hero = {
  eyebrow: words(heroOverrides.eyebrow ?? DEFAULTS.hero.eyebrow),
  titleTop: words(heroOverrides.titleTop ?? DEFAULTS.hero.titleTop),
  titleAccent: words(heroOverrides.titleAccent ?? DEFAULTS.hero.titleAccent),
  lead: words(heroOverrides.lead ?? DEFAULTS.hero.lead),
  loginLabel: words(heroOverrides.loginLabel ?? DEFAULTS.hero.loginLabel),
};

const media = {
  hero: pick(env.VITE_LANDING_HERO_VIDEO, mediaOverrides.hero, DEFAULTS.media.hero),
  leaderboard: pick(env.VITE_LANDING_LEADERBOARD_VIDEO, mediaOverrides.leaderboard, DEFAULTS.media.leaderboard),
  cta: pick(env.VITE_LANDING_CTA_VIDEO, mediaOverrides.cta, DEFAULTS.media.cta),
};

const landingConfig = { hero, media };
export default landingConfig;
